"""Lightweight P3-D checks: one tiny source tree, active native theme, reused cache.
No whole-site copies, parallel builds, dependency installation or external requests.
"""
from pathlib import Path
import hashlib,json,os,re,subprocess,sys
sys.dont_write_bytecode=True
from check_shell import DOM
ROOT=Path(__file__).resolve().parents[1]
THEME=ROOT/'themes/sidera'
RUN=Path(os.environ['SIDERA_CHECK_DIR']).resolve()
SOURCE=RUN/'source'

def write(path,text):
    p=SOURCE/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)

def main():
    RUN.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(exist_ok=True)
    config="""baseURL='https://example.org/preview/'
theme='sidera'
defaultContentLanguage='en'
[taxonomies]
_merge='shallow'
[permalinks.term]
_merge='shallow'
[markup.tableOfContents]
_merge='shallow'
[markup.goldmark.parser]
_merge='deep'
[markup.goldmark.parser.attribute]
_merge='shallow'
[markup.goldmark.extensions.passthrough]
_merge='deep'
[permalinks.page]
posts='/dated/:year/:slugorcontentbasename/'
[languages.en]
locale='en-US'
[languages.zh]
locale='zh-CN'
"""
    write(Path('hugo.toml'),config)
    override=SOURCE/'assets/vendor/mermaid-11.17.2/mermaid.min.js'
    if override.exists():override.write_bytes((THEME/'assets/vendor/mermaid-11.17.2/mermaid.min.js').read_bytes())
    source=(ROOT/'content/handbook/reference/diagrams/flow.drawio').read_text()
    page='''---
title: Diagram integration
date: 2026-04-10
---
{{% block id="group" %}}
## Inside the group
```mermaid {caption="Safe <title>"}
flowchart LR
  A[Read] --> j@{ shape: f-circ } --> B[Render]
```
{{< folding title="Hidden diagrams" id="hidden-diagrams" >}}
{{< grid columns=2 >}}
{{< cell >}}
{{< diagramsnet src="shape 文件.drawio" caption="Local shape" >}}
{{< /cell >}}
{{< cell >}}
```mermaid
flowchart BT
  A & B --> C
```
{{< /cell >}}
{{< /grid >}}
{{< /folding >}}
{{< box >}}
{{< snippet src="sample.txt" >}}
$x^2$ and [source link](../target/index.md#target).
{{< badge_github user="mermaid-js" repo="mermaid" branch="feature/test" release=true >}}
{{< /box >}}
{{% /block %}}

<!--more-->

Ordinary code:
```text
<figure class="content-diagram" data-sidera-diagram="mermaid">
flowchart LR
```
'''
    write(Path('content/posts/demo/index.md'),page)
    write(Path('content/posts/demo/index.zh.md'),page.replace('Diagram integration','图表集成').replace('Safe <title>','安全 <标题>'))
    write(Path('content/posts/demo/shape 文件.drawio'),source)
    write(Path('content/posts/demo/sample.txt'),'flowchart LR\n<figure class="content-diagram" data-sidera-diagram="mermaid">\n')
    write(Path('content/posts/target/index.md'),'---\ntitle: Target\ndate: 2026-04-09\n---\n## Target\n')
    write(Path('content/drawio-error/index.md'),'---\ntitle: Drawio failure\n---\n{{< diagramsnet src="invalid.drawio" >}}')
    write(Path('content/drawio-error/invalid.drawio'),'<mxfile><diagram>Invalid model</diagram></mxfile>')
    write(Path('content/failure.md'),'---\ntitle: Independent failures\n---\n```mermaid {id="broken"}\nflowchart ???\n```\n\n```mermaid {id="healthy"}\nflowchart LR\nA-->B\n```\n')
    write(Path('content/plain.md'),'---\ntitle: Plain\n---\nNo dependencies.\n')
    write(Path('content/disabled/index.md'),'''---
title: Disabled
---
```text
flowchart LR
A --> B
```
[Download diagram](local.drawio)
{{< badge_github user="mermaid-js" repo="mermaid" disabled=true >}}
''')
    write(Path('content/disabled/local.drawio'),source)
    write(Path('content/code.md'),'---\ntitle: Source-like code\n---\n```html\n<figure class="content-diagram" data-sidera-diagram="mermaid"></figure>\n<div class="github-badges" data-sidera-badges></div>\n```\n')
    for mode in ['Content','Summary','Plain']:
        write(Path('content/host-'+mode.lower()+'.md'),'---\ntitle: Host\nlayout: host-'+mode.lower()+'\n---\n')
        field='$child.'+mode if mode!='Plain' else '($child.Summary | plainify)'
        write(Path('layouts/host-'+mode.lower()+'.html'),'{{ define "main" }}{{ $child := site.GetPage "/posts/demo" }}{{ partial "sidera/shell.html" (dict "Page" . "Content" '+field+') }}{{ end }}')
    passed=[];rejected=[]
    def build(label,diagnostic=None,extra=(),owner=SOURCE):
        # Reuse one output for negatives, keep the successful fixture for browser checks.
        dest=RUN/('negative-public' if diagnostic else label+'-public')
        cmd=['hugo','--source',str(owner),'--themesDir',str(ROOT/'themes'),'--destination',str(dest),'--cacheDir',str(RUN/'cache'),'--panicOnWarning','--printI18nWarnings',*extra]
        r=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=35,env={**os.environ,'GOMAXPROCS':'2','HUGO_NUMWORKERMULTIPLIER':'1'})
        (RUN/(label+'.log')).write_text(r.stdout)
        if diagnostic:assert r.returncode and diagnostic in r.stdout,(label,r.stdout);rejected.append(label)
        else:assert not r.returncode,(label,r.stdout);passed.append(label)
        return dest
    out=build('fixture')
    html=(out/'dated/2026/demo/index.html').read_text();dom=DOM(out/'dated/2026/demo/index.html').root
    assert 'data-sidera-diagrams-script' in html and 'data-sidera-badges-script' in html and 'data-sidera-math' in html
    assert '<iframe' not in html and 'flowchart LR' in html
    assert dom.all(href='/preview/dated/2026/target/#target')
    assert dom.all(href='/preview/dated/2026/demo/shape%20%E6%96%87%E4%BB%B6.drawio')
    assert (out/'dated/2026/demo/shape 文件.drawio').read_text()==source
    assert json.loads(dom.all(**{'data-sidera-diagram':'drawio'})[0].attrs['data-diagram-source'])==source
    bare=dom.all(**{'data-sidera-diagram':'mermaid'})[1]
    assert not any(n.tag=='figcaption' for n in bare.all()) and bare.attrs['data-diagram-label']=='Mermaid diagram'
    assert len([n for group in dom.all(**{'class':'badge-images'}) for n in group.all() if n.tag=='img'])==6
    assert '/feature%2Ftest?label=' in html
    from check_snippets import Codes
    original=(SOURCE/'content/posts/demo/sample.txt').read_text()
    snippet=next(b for b in Codes(out/'dated/2026/demo/index.html').blocks if b.get('source') is not None)
    assert snippet['source']==original and snippet['text']==original
    assert (out/'dated/2026/demo/sample.txt').read_text()==original
    assert '<math' in html and 'class="katex"' in html
    for route in ['plain','disabled','code','host-plain']:
        text=(out/route/'index.html').read_text();assert 'data-sidera-diagrams-script' not in text and 'data-sidera-badges-script' not in text,route
    for route in ['host-content','host-summary']:
        text=(out/route/'index.html').read_text();assert 'data-sidera-diagrams-script' in text and 'data-sidera-badges-script' in text,route
    assert '图表' in (out/'zh/dated/2026/demo/index.html').read_text()
    for name in ['mermaid-11.17.2','drawio-31.5.2']:
        kind='mermaid' if name.startswith('mermaid') else 'drawio'
        url=next(n.attrs['data-'+kind] for n in dom.all() if 'data-sidera-diagrams-script' in n.attrs)
        frame=(out/url.removeprefix('/preview/')).read_text()
        assert "connect-src 'none'" in frame and "frame-src 'none'" in frame and "'unsafe-eval'" not in frame
        manifest=json.loads((THEME/'assets/vendor'/name/'provenance.json').read_text())
        for file,sha in manifest['files'].items():assert hashlib.sha256((THEME/'assets/vendor'/name/file).read_bytes()).hexdigest()==sha
    # Real opt-in theme docs plus a harmless mounted diagram leaf; no theme copy/edit.
    write(Path('mounted-diagram/index.md'),'---\ntitle: Mounted diagram\n---\n{{< diagramsnet src="local.drawio" >}}')
    write(Path('mounted-diagram/local.drawio'),source)
    # The accepted model's bundled-doc source loader expects the standard in-site
    # theme path. Exercise that real contract, not an arbitrary external themesDir.
    docs_config=RUN/'root-docs.toml'
    docs_config.write_text("[[module.mounts]]\nsource='content'\ntarget='content'\n[[module.mounts]]\nsource='themes/sidera/docs/content'\ntarget='content/sidera'\n[[module.mounts]]\nsource="+json.dumps(str(SOURCE/'mounted-diagram'))+"\ntarget='content/sidera/diagrams'\n")
    docs=build('docs',extra=('--config','hugo.toml,'+str(docs_config),'--baseURL','https://example.org/preview/'),owner=ROOT)
    assert DOM(docs/'sidera/diagrams/index.html').root.all(href='/preview/sidera/diagrams/local.drawio')
    assert (docs/'sidera/diagrams/local.drawio').read_text()==source
    bad=[('drawio-missing' ,'{{< diagramsnet src="missing.drawio" >}}','missing page resource'),
         ('drawio-traversal','{{< diagramsnet src="../file.drawio" >}}','exact local'),
         ('drawio-remote','{{< diagramsnet src="https://example.org/x.drawio" >}}','exact local'),
         ('drawio-encoded','{{< diagramsnet src="%2e/file.drawio" >}}','exact local'),
         ('drawio-options','{{< diagramsnet src="local.drawio" edit="https://example.org" >}}','unsupported parameter'),
         ('drawio-disabled-removed','{{< diagramsnet src="local.drawio" disabled=true >}}','unsupported parameter'),
         ('drawio-title-removed','{{< diagramsnet src="local.drawio" title="Old" >}}','unsupported parameter'),
         ('mermaid-title-removed','```mermaid {title="Old"}\nflowchart LR\nA-->B\n```','unsupported attribute'),
         ('drawio-caption','{{< diagramsnet src="local.drawio" caption="" >}}','caption must be'),
         ('mermaid-disabled-removed','```mermaid {disabled=true}\nflowchart LR\nA-->B\n```','unsupported attribute'),
         ('mermaid-options','```mermaid {linenos=true}\nflowchart LR\nA-->B\n```','highlight options'),
         ('mermaid-attr','```mermaid {caption=""}\nflowchart LR\nA-->B\n```','caption must be'),
         ('mermaid-class','```mermaid {class="x;url(y)"}\nflowchart LR\nA-->B\n```','invalid class'),
         ('badge-user','{{< badge_github user="bad/host" repo="x" >}}','invalid GitHub'),
         ('badge-branch','{{< badge_github user="a" repo="b" branch="../x" >}}','invalid branch'),
         ('badge-type','{{< badge_github user="a" repo="b" release="true" >}}','must be boolean'),
         ('forged-leaf','> X\n{data-sidera-leaf="sidera-math"}','invalid native key'),
         ('missing-leaf','> X\n{data-sidera-leaf="sidera-leaf-badge_github-999"}','unknown native leaf'),
         ('raw-html','<script>alert(1)</script>','Raw HTML omitted')]
    for label,body,diagnostic in bad:
        write(Path('content/negative/index.md'),'---\ntitle: Negative\n---\n'+body+'\n');write(Path('content/negative/local.drawio'),source);build(label,diagnostic)
    write(Path('content/negative/index.md'),'---\ntitle: Safe\n---\nSafe.\n')
    # Site override proves integrity enforcement without mutating the active theme.
    write(Path('assets/vendor/mermaid-11.17.2/mermaid.min.js'),'bad bundled asset')
    build('integrity','integrity mismatch')
    # Restore the single-file override to verified bytes, leaving a reusable tiny preview.
    (SOURCE/'assets/vendor/mermaid-11.17.2/mermaid.min.js').write_bytes((THEME/'assets/vendor/mermaid-11.17.2/mermaid.min.js').read_bytes())
    (RUN/'results.json').write_text(json.dumps({'passed':passed,'expected_rejections':rejected,'one_source_tree':True,'workers':2},indent=2))
    print('PASS tiny integration + mounted-docs builds,',len(rejected),'expected rejections; no copies of the theme/site;',RUN,flush=True)
if __name__=='__main__':main()
