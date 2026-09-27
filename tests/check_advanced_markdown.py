"""P3-B: native syntax, scoped settings, safe containers and pinned local math."""
from pathlib import Path
from urllib.parse import urlparse, unquote
import hashlib, json, os, re, subprocess, sys, tempfile
sys.dont_write_bytecode = True
from check_p1b import ROOT, copy_showcase, build, html, local_links
from check_p2f import nodes
from check_p2w import write
ROUTE = '/handbook/reference/advanced-markdown/'
TARGET = '/journal/2026/04/14/connect-the-useful-parts/#give-a-link-a-reason'
def body(out, route=ROUTE): return nodes(out, route).all(**{'class':'prose'})[0]
def tags(p, tag): return [n for n in p.all() if n.tag == tag]
def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p3b-full-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live');passed=[];rejected=[]
    def check(label,flags=(),diagnostic=None):
        out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(label);return out
    vendor=source/'themes/sidera/assets/vendor/katex-0.18.4';manifest=json.loads((vendor/'provenance.json').read_text())
    for name,digest in manifest['files'].items(): assert hashlib.sha256((vendor/name).read_bytes()).hexdigest()==digest,name
    def verify(out,prefix='',chinese=False):
        p=body(out);assert len(tags(p,'math'))==5 and len(p.all(**{'class':'math-display'}))==3
        assert len(tags(p,'aside'))==6 and p.all(**{'aria-label':'说明' if chinese else 'Note'})
        assert p.all(href=prefix+TARGET) and body(out,'/notes/reading-list/').all(href=prefix+TARGET)
        assert '$5 and $10' in p.words() and '$x_1$' in p.words() and '[!tip] Goal' in p.words()
        assert p.all(id='adaptive-block')[0].tag=='div'
        assert p.all(id='adaptive-block')[0].all(href=prefix+TARGET.replace('/#','/?from=block#'))
        assert nodes(out,ROUTE).all(href='#inside-a-general-block') and p.all(id='inside-a-general-block')
        assert len(tags(p,'img'))==6 and len(tags(p,'figcaption'))==3
        assert p.all(id='adaptive-image')[0].attrs['class']=='invert-when-dark'
        assert p.all(id='plain-image')[0].attrs['alt']=='A plain colored diagram'
        assert all(n.attrs['src']==prefix+'/handbook/reference/markdown/sample.svg' for n in tags(p,'img'))
        assert p.all(id='adaptive-paragraph')[0].tag=='p'
        assert tags(p,'math')[0].all(encoding='application/x-tex')
        assert p.all(**{'class':'katex-html','aria-hidden':'true'})
        assert p.all(**{'class':'katex-stretchy fbox'}) and p.all(**{'class':'vertical-separator'})
        d=nodes(out,ROUTE);css=[n for n in tags(d,'link') if 'data-sidera-math' in n.attrs];assert len(css)==1
        path=unquote(urlparse(css[0].attrs['href']).path).removeprefix(prefix).lstrip('/')
        asset=out/path;assert asset.read_bytes()==(vendor/'katex.min.css').read_bytes()
        for url in re.findall(r'url\(([^)]+)\)',asset.read_text()):
            url=url.strip('"\'');assert not url.startswith(('http','data:'));assert (asset.parent/url).is_file()
        assert not any('data-sidera-math' in n.attrs for n in tags(nodes(out,'/about/'),'link'))
        assert not (out/'sidera').exists();local_links(out,prefix)
    for label,flags,prefix,zh in [('baseline',(),'',False),('explicit',('--config','hugo.toml'),'',False),('chinese',('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'),'/_chinese',True)]: verify(check(label,flags),prefix,zh)
    config=json.loads(subprocess.check_output(['hugo','config','--source',str(source),'--format','json'],text=True,timeout=20))
    assert config['markup']['goldmark']['parser']['attribute']['block']
    assert not config['markup']['goldmark'].get('renderer',{}).get('unsafe',False)
    write(source,'disabled.toml','[markup.goldmark.extensions.passthrough]\nenable=false\n')
    out=check('disabled',('--config','hugo.toml,disabled.toml'));assert not tags(body(out),'math')
    assert not (out/'vendor/katex-0.18.4').exists()
    # All attribute positions are native; incompatible grammar stays explicit.
    write(source,'content/native-probe/index.md',r'''---
title: Native grammar boundary
---
![adjacent|120](../handbook/reference/markdown/sample.svg){.invert-when-dark}

![native](../handbook/reference/markdown/sample.svg)
{.invert-when-light #native-image width=120 height=60 onclick="oops"}

**strong**{.red} [link](../journal/connect-the-useful-parts/index.md){#inline-link}

:::invert-when-dark
ordinary text
:::

![hostile](javascript:alert%281%29 "&quot; onerror=&quot;oops")

![|120](../handbook/reference/markdown/sample.svg?size=1#view)
{.no-caption}

[![linked image](../handbook/reference/markdown/sample.svg "Title")](../journal/connect-the-useful-parts/index.md)

![empty](../handbook/reference/markdown/sample.svg)
{.no-caption}

1. ![List image|120](../handbook/reference/markdown/sample.svg)
   {.no-caption .invert-when-dark #list-image}

2. ![Second image](../handbook/reference/markdown/sample.svg)
   {.no-caption}

> ![Quoted image|120](../handbook/reference/markdown/sample.svg)
> {.invert-when-dark #quoted-image}

{{% block %}}
## Heading in an unstyled group

- A nested ordinary list.
{{% /block %}}

1. ![Single cell](../handbook/reference/markdown/sample.svg)
{.no-caption #tight-list}

`![literal|120](sample.svg)`
''')
    out=check('native');p=body(out,'/native-probe/')
    assert p.all(id='native-image')[0].attrs['width']=='120' and not p.all(id='inline-link')
    assert ':::invert-when-dark' in p.words() and '{.invert-when-dark}' in p.words()
    assert p.all(src='/handbook/reference/markdown/sample.svg?size=1#view')[0].attrs['alt']==''
    assert not any('onclick' in n.attrs or 'onerror' in n.attrs or n.attrs.get('src','').startswith('javascript:') for n in p.all())
    assert not any(a.all(**{'class':'md-figure'}) for a in tags(p,'a'))
    assert p.all(id='list-image')[0].tag=='img' and p.all(id='quoted-image')[0].tag=='img'
    assert p.all(id='heading-in-an-unstyled-group')
    assert p.all(id='tight-list')[0].tag=='ol' and p.all(id='tight-list')[0].all(**{'class':'md-figure'})
    # Policy follows existing model tiers, no new resolver or scope firewall.
    probe='content/caption-probe/index.md'
    for label,params in [('local-off','params:\n  auto_caption: false\n'),('local-on','params:\n  auto_caption: true\n')]:
        write(source,probe,'---\ntitle: Caption probe\n'+params+'---\n![Description](/asset.svg "Caption")\n')
        write(source,'caption.toml','[params]\nauto_caption=false\n')
        out=check(label,('--config','hugo.toml,caption.toml'))
        assert bool(tags(body(out,'/caption-probe/'),'figcaption'))==(label=='local-on')
    write(source,'content/caption-probe/_unused.txt','fixture resource')
    write(source,'content/caption-parent/_index.md','---\ntitle: Caption parent\ncascade:\n  params:\n    auto_caption: false\n---\n')
    write(source,'content/caption-parent/child.md','---\ntitle: Child\n---\n![Description](/asset.svg)\n')
    out=check('cascade');assert not tags(body(out,'/caption-parent/child/'),'figcaption')
    # A native custom preset uses the same bool and honors false.
    write(source,'content/preset/captions/_index.md','---\ntitle: Captions\nparams:\n  defaults:\n    cascade:\n      params:\n        auto_caption: false\n---\n')
    write(source,'content/caption-parent/_index.md','---\ntitle: Caption parent\npreset: captions\n---\n')
    out=check('preset');assert not tags(body(out,'/caption-parent/child/'),'figcaption')
    # Actual rendered content from another Page still loads math CSS in the host.
    write(source,'content/math-host.md','---\ntitle: Embedded math\nlayout: math-host\n---\n')
    write(source,'layouts/math-host.html','{{ define "main" }}{{ $child := site.GetPage "/handbook/reference/advanced-markdown" }}{{ partial "sidera/shell.html" (dict "Page" . "Content" $child.Content) }}{{ end }}')
    write(source,'content/math-summary.md','---\ntitle: Math summary\n---\n$\\boxed{x_1}$ in the summary.\n\n<!--more-->\n\nBody.\n')
    write(source,'content/summary-host.md','---\ntitle: Embedded summary\nlayout: summary-host\n---\n')
    write(source,'layouts/summary-host.html','{{ define "main" }}{{ $child := site.GetPage "/math-summary" }}{{ partial "sidera/shell.html" (dict "Page" . "Content" $child.Summary) }}{{ end }}')
    out=check('embedded')
    for route in ('/math-host/','/summary-host/'):
        assert any('data-sidera-math' in n.attrs for n in tags(nodes(out,route),'link'))
        assert tags(nodes(out,route),'math')
    # An exact manifest asset must be present; rename only this isolated copy.
    font=vendor/'fonts/KaTeX_Main-Regular.woff2';held=font.with_suffix('.held')
    font.rename(held)
    try: check('missing-font',diagnostic='bundled KaTeX 0.18.4 asset missing')
    finally: held.rename(font)
    write(source,'bad-config.toml','[params]\nauto_caption="invalid"\n')
    check('invalid-site-caption',('--config','hugo.toml,bad-config.toml'),diagnostic='auto_caption must be boolean')
    # Negative source/config cases, including an excluded draft.
    cases=[('standard-block','{{< block class="a" >}}Text{{< /block >}}','was not consumed by native Markdown'),('bad-attr','![x](/x.svg)\n{style="color:red"}','Sidera image: unsupported attribute'),('bad-size','![x](/x.svg)\n{width=0}','must be a positive integer'),('bad-math',r'$\frac{1}{$','Sidera math:'),('unknown-math',r'$\notACommand$','Sidera math:'),('bad-block','{{% block onclick="oops" %}}\nText\n{{% /block %}}','unsupported parameter'),('block-injection','{{% block class="x\\\" onclick=bad" %}}\nText\n{{% /block %}}','invalid class'),('nested-block','{{% block class="a" %}}\n{{% block class="b" %}}\n**Nested**\n{{% /block %}}\n{{% /block %}}','Raw HTML omitted'),('raw-block','{{% block class="a" %}}\n<script>bad()</script>\n{{% /block %}}','Raw HTML omitted')]
    for label,text,diagnostic in cases:
        write(source,'content/negative.md','---\ntitle: Negative\n---\n'+text+'\n');check(label,diagnostic=diagnostic)
    write(source,'content/negative.md','---\ntitle: Invalid draft\ndraft: true\nparams:\n  auto_caption: invalid\n---\n')
    check('draft-bool',diagnostic='auto_caption must be boolean')
    write(source,'content/negative.md','---\ntitle: Trust\n---\n$\\href{javascript:alert(1)}{unsafe}$\n')
    out=check('untrusted-tex');assert not tags(body(out,'/negative/'),'a')
    write(source,'layouts/_markup/render-image.html','<img data-site-image="true" src="{{ .Destination }}" alt="{{ .PlainText }}">')
    write(source,'layouts/_markup/render-passthrough.html','<code data-site-math="true">{{ .Inner }}</code>')
    out=check('site-hooks');assert body(out).all(**{'data-site-image':'true'}) and body(out).all(**{'data-site-math':'true'})
    assert not (out/'vendor/katex-0.18.4').exists()
    (run/'results.json').write_text(json.dumps({'passed':passed,'expected_rejections':rejected},indent=2));print('PASS completed B contracts; retained',run)
if __name__=='__main__':main()
