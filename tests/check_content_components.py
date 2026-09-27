"""Independent C2 primitive regressions; check_composition covers containers."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode = True
from check_p1b import ROOT, copy_showcase, build
from check_p2f import nodes
from check_p2w import write

ROUTE='/handbook/reference/content-components/'
VALUE='AAAA BBBB CCCC DDDD  EEEE FFFF 0000 1111'
def body(out,route=ROUTE): return nodes(out,route).all(**{'class':'prose'})[0]
def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='content-components-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live');passed=[];rejected=[]
    def check(label,diagnostic=None,flags=()):
        out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(label);return out
    def verify(out,prefix=''):
        d=body(out)
        assert [x.words() for x in d.all(**{'class':'content-kbd'})][:4]==['Ctrl','`','⌘ Cmd','F4']
        assert [x.words() for x in d.all(**{'class':'content-mark'})]==['✓','✗','?']
        assert d.all(**{'class':'content-u'})[0].words()=='aa'
        quotes=d.all(**{'class':'content-quot'});assert len(quotes)==2
        assert len(quotes[0].all(**{'aria-hidden':'true'}))==2 and not quotes[1].all(**{'aria-hidden':'true'})
        assert not any(n.tag.startswith('h') and n.tag in ('h1','h2','h3','h4','h5','h6') for q in quotes for n in q.all())
        a=d.all(**{'class':'content-link-card'});assert len(a)==5
        assert a[0].attrs['href']==prefix+'/journal/2026/04/14/connect-the-useful-parts/?from=components#give-a-link-a-reason'
        assert a[1].attrs['href']==prefix+ROUTE+'example.txt'
        assert (out/ROUTE.strip('/')/'example.txt').read_bytes()==(source/'content/handbook/reference/content-components/example.txt').read_bytes()
        copy=d.all(**{'class':'content-copy'})[0];assert json.loads(copy.attrs['data-code-source'])==VALUE
        assert copy.all(**{'class':'copy-prefix'})[0].words()=='Example fingerprint'
        assert 'hidden' in copy.all(**{'class':'code-copy'})[0].attrs
        assert copy.all(**{'class':'code-copy-fallback'})[0].attrs['aria-label']
        assert not d.all(**{'class':'content-emoji'})
        assert '<u class="content-u">aa</u>bcc.' in (out/ROUTE.strip('/')/'index.html').read_text()
        assert nodes(out,ROUTE).all(href='#inside-the-existing-top-level-block')
        assert nodes(out,ROUTE).all(**{'data-sidera-math':''}) or 'data-sidera-math' in (out/ROUTE.strip('/')/'index.html').read_text()
        assert not (out/'sidera').exists()
    out=build(ROOT,run,'normal',flags=('--printI18nWarnings',));passed.append('normal');verify(out)
    out=check('baseline');verify(out)
    out=check('chinese',flags=('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'));verify(out,'/_chinese')
    assert body(out).all(**{'class':'content-copy'})[0].all(**{'class':'code-copy'})[0].attrs['aria-label']=='复制文本'
    # An explicit plain-content test page must not acquire math assets just from component use.
    text='''---
title: Component safety
---
## A real heading

Inline:A{{< u text="aa" >}}bcc|B{{< kbd text="Ctrl" >}}+K|C{{< mark text="✓" >}}done.

Spaced: A {{< u text="aa" >}} bcc.

{{< kbd text="<script>bad()</script> & `" >}}
{{< mark text="<&>" color="red" >}}
{{< u text="3, -2, 3" >}}
{{< quot text="<img src=x onerror=bad()>" >}}
{{< copy prefix="<script>label</script>" text="  α & <tag>  β  " >}}
{{< link href="../handbook/reference/content-components/example.txt" text="<script>title</script>" >}}
{{< link href="https://example.org/deliberately-long-destination-path/with-many-words" text="A deliberately long label that remains readable at a narrow mobile viewport without clipping or becoming a horizontal page scroll" >}}
'''
    write(source,'content/component-safety.md',text)
    out=check('safety');d=body(out,'/component-safety/')
    assert not any(x.tag=='script' for x in d.all()) and not d.all(src='x')
    assert '<script>bad()</script> & `' in d.words()
    rendered=(out/'component-safety/index.html').read_text()
    assert 'Inline:A<u class="content-u">aa</u>bcc|B<kbd class="content-kbd">Ctrl</kbd>+K|C<mark class="content-mark" data-color="yellow">✓</mark>done.' in rendered
    assert 'Spaced: A <u class="content-u">aa</u> bcc.' in rendered
    assert json.loads(d.all(**{'class':'content-copy'})[0].attrs['data-code-source'])=='  α & <tag>  β  '
    assert 'data-sidera-math' not in (out/'component-safety/index.html').read_text()
    # Real authored Chinese + native language filenames and subpath, not just a UI overlay.
    write(source,'locales.toml',"defaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(source,'content/component-safety.zh.md',text.replace('Component safety','组件检查').replace('A real heading','真实标题').replace('3, -2, 3','所选文字'))
    write(source,'content/about.zh.md','---\ntitle: About\n---\nLocale probe.\n')
    out=check('languages',flags=('--config','hugo.toml,locales.toml','--baseURL','https://example.org/preview/'))
    assert body(out,'/zh/component-safety/').all(**{'class':'content-u'})[-1].words()=='所选文字'
    assert body(out,'/en/component-safety/').all(**{'class':'content-u'})[-1].words()=='3, -2, 3'
    # Existing documentation remains default-off and can still be mounted explicitly.
    out=check('docs',flags=('--config','hugo.toml,docs-on.toml'))
    assert (out/'sidera').is_dir()
    # Unknown args/types/protocols/paths fail with useful source position; no guards weakened.
    bad=[('unknown','{{< kbd text="x" onclick="bad()" >}}','unsupported parameter'),
         ('type','{{< kbd text=42 >}}','must be a string'),
         ('empty','{{< copy text=" " >}}','must be nonblank'),
         ('color','{{< mark text="x" color="url(bad)" >}}','color must be'),
         ('ornament','{{< quot text="x" ornament="false" >}}','must be a boolean'),
         ('positional','{{< kbd Ctrl >}}','requires named'),
         ('script-url','{{< link text="x" href="javascript:alert(1)" >}}','unsafe URL'),
         ('protocol-relative','{{< link text="x" href="//bad.test/x" >}}','unsafe URL'),
         ('missing-source','{{< link text="x" href="missing.md" >}}','Sidera link source'),
         ('missing-icon','{{< link text="x" href="/" icon="missing.png" >}}','missing local image'),
         ('encoded-icon','{{< link text="x" href="/" icon="%2e%2e/private.svg" >}}','invalid local image'),
         ('traversal-icon','{{< link href="/" text="x" icon="../private.svg" >}}','invalid local image'),
         ('raw-svg','{{< link href="/" text="x" icon="<svg onload=bad()>" >}}','unsupported image extension'),
         ('retired-emoji','{{< emoji src="signal.svg" alt="x" >}}','failed to extract shortcode'),
         ('unsupported-parent','{{< unsupported >}}{{< copy text="x" >}}{{< /unsupported >}}','unsupported parent'),
         ('markdown-notation','{{% quot text="x" %}}','Raw HTML omitted'),
         ('raw-html','<script>bad()</script>','Raw HTML omitted')]
    write(source,'layouts/_shortcodes/unsupported.html','{{ .Inner }}')
    for label,content,diagnostic in bad:
        write(source,'content/negative.md','---\ntitle: Negative\n---\n'+content+'\n');check(label,diagnostic)
    write(source,'content/negative.md','---\ntitle: Repaired\n---\nNo unsafe input.\n')
    # Project shortcode and resolver overrides; old Markdown hook precedence remains native.
    write(source,'layouts/_shortcodes/kbd.html','{{ $html := printf `<kbd data-site-kbd="true">%s</kbd>` (htmlEscape (.Get "text")) | safeHTML }}{{ partial "components/leaf.html" (dict "shortcode" . "html" $html "inline" true) | safeHTML }}')
    write(source,'layouts/_partials/links/destination.html','{{ return "/site-destination/" }}')
    write(source,'i18n/en.toml','[content_copy_success]\nother = "<img src=x onerror=bad()> & copied"\n')
    out=check('overrides');d=body(out)
    assert d.all(**{'data-site-kbd':'true'})
    assert all(a.attrs['href']=='/site-destination/' for a in d.all(**{'class':'content-link-card'}))
    assert d.all(**{'class':'content-copy'})[0].all(**{'class':'code-copy'})[0].attrs['data-success']=='<img src=x onerror=bad()> & copied'
    (run/'results.json').write_text(json.dumps({'passed':passed,'expected_rejections':rejected,'container_composition':'covered by check_composition.py','retired':['emoji','timeline','enhanced images']},indent=2))
    print('PASS independent C2 primitives; container checks are separate; retained',run)
if __name__=='__main__':main()
