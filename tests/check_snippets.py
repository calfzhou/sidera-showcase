"""C1 exact source/selection/downloads/native lookup boundaries; stdlib, no execution."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, os, sys, tempfile
sys.dont_write_bytecode = True
from check_tag_routes import translate_menu_targets, ROOT, copy_showcase, build
from check_docs import write

ROUTE = '/notes/code-inclusion/'
class Codes(HTMLParser):
    def __init__(self, file):
        super().__init__(); self.stack=[]; self.blocks=[]; self.current=None
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'data-code-source' in a:
            self.current={'source':json.loads(a['data-code-source']), 'text':'', 'urls':[]}
            self.blocks.append(self.current)
        self.stack.append((tag,a))
        if self.current and tag=='a' and 'download' in a: self.current['urls'].append(a['href'])
        if tag in ('img','meta','link','input','br','hr'): self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                if any('data-code-source' in a for _,a in self.stack[i:]): self.current=None
                self.stack=self.stack[:i];break
    def handle_data(self, text):
        if self.current and any(t=='code' and 'data-lang' in a for t,a in self.stack) and not any(a.get('class') in ('ln','lnt') for _,a in self.stack):
            self.current['text']+=text

def verify(out, route, expected, prefix=''):
    page=out/route.strip('/')/'index.html'; blocks=Codes(page).blocks
    assert len(blocks)==len(expected),(route,len(blocks),len(expected))
    for b,(selected,full) in zip(blocks,expected):
        assert b['source'].encode()==selected,(b['source'],selected)
        assert b['text']==selected.decode().replace('\r\n','\n'),(repr(b['text']),selected)
        assert len(b['urls'])==1
        url=unquote(urlsplit(b['urls'][0]).path)
        assert url.startswith(prefix+'/'),url
        assert (out/url[len(prefix):].lstrip('/')).read_bytes()==full,url
    return page.read_text()

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='snippets-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live'); passed=[];rejected=[]
    def check(label, diagnostic=None, flags=()):
        out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(label);return out
    pair=(source/'content/notes/code-inclusion/pairs.py').read_bytes();shared=(source/'assets/snippets/labels.py').read_bytes()
    live=[(pair,pair),(b''.join(pair.splitlines(keepends=True)[3:8]),pair),(shared,shared)]
    # Actual normal-root build, not solely a copied source or test-only config.
    out=build(ROOT,run,'normal',flags=('--baseURL','https://example.org/','--printI18nWarnings',));passed.append('normal');verify(out,ROUTE,live)
    payloads=[b'',b'x',b'x\n',b'x\n\n',b'\n\t  <script>& ``` {{< nope >}} {{% nope %}}  \n\n',b'\t one  \r\n\r\nlast', '你好 \ufffd\n'.encode(), b'\xef\xbb\xbfx\n', b'a\r\nb\nc\r\n']
    body='---\ntitle: Exact source tests\n---\n\n';expected=[]
    for i,data in enumerate(payloads):
        p=source/f'content/snippet-check/sample{i}.txt';p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
        body+='{{< snippet src="sample%d.txt" >}}\n\n'%i;expected.append((data,data))
    # Both omitted boundaries and inline numbering; selected final unterminated line.
    write(source,'content/snippet-check/three.py','a\nb\nc')
    for args,selected in [('from=2',b'b\nc'),('to=2',b'a\nb\n'),('from=3 to=3',b'c')]:
        body+='{{< snippet src="three.py" '+args+' options="linenos=inline,anchorlinenos=true,hl_lines=1" >}}\n\n';expected.append((selected,b'a\nb\nc'))
    # Unknown/default language, explicit override, spaces/Unicode/subfolder and escaped title.
    write(source,'content/snippet-check/sub/a 你好.unknown','<tag>& no execution\n')
    body+='{{< snippet src="sub/a 你好.unknown" title="A <script> & title" lang="nonesuch" >}}\n\n';expected.append((b'<tag>& no execution\n',)*2)
    body+='{{< snippet src="three.py" lang="text" options="linenos=table,linenostart=20,lineanchors=custom,anchorlinenos=true,hl_lines=2" >}}\n\n';expected.append((b'a\nb\nc',)*2)
    write(source,'content/snippet-check/index.md',body)
    # Extensionless/plain override and literal HTML resource are still escaped data.
    for name,lang in [('README',''),('literal.html','text')]:
        data=b'<script>must not execute</script>\n'
        base=source/('assets/snippets' if name.endswith('.html') else 'content/snippet-check')
        (base/name).write_bytes(data)
        scope=' scope="shared"' if name.endswith('.html') else ''
        body+='{{< snippet src="'+name+'" lang="'+lang+'"'+scope+' >}}\n\n';expected.append((data,data))
    write(source,'content/snippet-check/index.md',body)
    # Unselected global resources must never be unconditionally published.
    write(source,'assets/snippets/unused.py','UNUSED_SHARED_CANARY')
    write(source,'assets/private.py','OUTSIDE_SHARED_CANARY')
    out=check('baseline');page=verify(out,'/snippet-check/',expected);verify(out,ROUTE,live)
    assert 'id="custom-20"' in page and 'class="line hl"' in page
    assert not (out/'snippets/unused.py').exists() and not (out/'private.py').exists()
    assert '<script> & title' not in page and 'A &lt;script&gt; &amp; title' in page
    assert '<code class="language-text"' in page
    assert not (out/'sidera').exists()
    # Real dated owner, language and baseURL resource authority; no URL reconstruction.
    write(source,'content/journal/snippet-route/index.md','---\ntitle: Route probe\ndate: 2026-04-21\n---\n{{< snippet src="source.py" >}}')
    write(source,'content/journal/snippet-route/source.py','dated\n')
    out=check('chinese',flags=('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'))
    verify(out,ROUTE,live,'/_chinese');verify(out,'/journal/2026/04/21/snippet-route/',[(b'dated\n',)*2],'/_chinese')
    assert '下载完整源码' in (out/ROUTE.strip('/')/'index.html').read_text()
    translate_menu_targets(source)
    write(source,'locales.toml',"defaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(source,'content/snippet-check/index.zh.md',body)
    write(source,'content/about.zh.md','---\ntitle: About\n---\nLocale test.')
    out=check('languages',flags=('--config','hugo.toml,locales.toml','--baseURL','https://example.org/preview/'))
    verify(out,'/en/snippet-check/',expected,'/preview');verify(out,'/zh/snippet-check/',expected,'/preview')
    # Opt-in mounted docs use native resources; off keeps original bundled docs absent.
    write(source,'themes/sidera/docs/content/inclusion/index.md','---\ntitle: Mounted inclusion\n---\n{{< snippet src="local.py" >}}')
    write(source,'themes/sidera/docs/content/inclusion/local.py','mounted\n')
    out=check('docs',flags=('--config','hugo.toml,manual-on.toml'))
    verify(out,'/sidera/inclusion/',[(b'mounted\n',)*2])
    # A narrow explicit native mount supports a shared utility without publishing its siblings.
    write(source,'approved-code/mounted.py','shared mount\n')
    write(source,'approved-code/unused.py','UNUSED_MOUNT_CANARY')
    write(source,'mount.toml',"[[module.mounts]]\nsource='assets'\ntarget='assets'\n[[module.mounts]]\nsource='approved-code'\ntarget='assets/snippets/approved'\n")
    write(source,'content/mount-check.md','---\ntitle: Shared mount\n---\n{{< snippet src="approved/mounted.py" scope="shared" >}}')
    out=check('shared-mount',flags=('--config','hugo.toml,mount.toml'));verify(out,'/mount-check/',[(b'shared mount\n',)*2])
    assert not (out/'snippets/approved/unused.py').exists()
    # Keep the mount caller valid in subsequent builds without the opt-in mount.
    write(source,'content/mount-check.md','---\ntitle: Shared mount\n---\nOpt-in native mount tested separately.')
    # Site highlight settings cannot silently change exact source into inline/guessed code.
    write(source,'highlight.toml','[markup.highlight]\nhl_inline=true\nguessSyntax=true\nlineNos=true\nlineNumbersInTable=false\n')
    out=check('native-options',flags=('--config','hugo.toml,highlight.toml'));verify(out,'/snippet-check/',expected)
    # Each rejection is contextual and cannot produce a publishable successful build.
    bad=[('missing','src="missing.py"','not found'),('traversal','src="../private.py"','invalid resource path'),('absolute','src="/etc/passwd"','invalid resource path'),('network','src="https://example.org/a"','invalid resource path'),('windows','src="C:/private.py"','invalid resource path'),('encoded','src="%2e%2e/private.py"','invalid resource path'),('glob','src="*.py"','invalid resource path'),('scope','src="three.py" scope="root"','scope must'),('shared-escape','src="../private.py" scope="shared"','invalid resource path'),('shared-no-fallback','src="private.py" scope="shared"','not found'),('zero','src="three.py" from=0','positive one-based'),('negative','src="three.py" from=-1','positive one-based'),('fraction','src="three.py" to=1.5','positive one-based'),('reverse','src="three.py" from=3 to=2','bounds'),('range','src="three.py" to=4','bounds'),('empty-range','src="sample0.txt" from=1','bounds'),('unknown','src="three.py" nope=true','unsupported parameter'),('title','src="three.py" title=""','title must'),('inject-option','src="three.py" options="code=evil"','unsupported highlight option'),('option-value','src="three.py" options="linenos=oops"','invalid highlight option'),('anchor','src="three.py" options="lineanchors=<script>"','invalid highlight option')]
    for label,args,diagnostic in bad:
        write(source,'content/snippet-check/index.md','---\ntitle: Invalid inclusion\n---\n{{< snippet '+args+' >}}')
        check(label,'Sidera snippet: '+diagnostic if diagnostic in ('unsupported parameter',) else diagnostic)
        assert 'snippet-check/index.md' in (run/(label+'.log')).read_text()
    write(source,'content/snippet-check/child.md','---\ntitle: Content resource\n---\nNot raw code.')
    for label,call,diagnostic in [('content-page','{{< snippet src="child.md" >}}','content Page'),('positional','{{< snippet "three.py" >}}','requires named src'),('invalid-language','{{< snippet src="three.py" lang="<script>" >}}','invalid language')]:
        write(source,'content/snippet-check/index.md','---\ntitle: Invalid shortcode\n---\n'+call);check(label,diagnostic)
    for label,data in [('invalid-utf8' ,b'\xff'),('binary',b'a\x00b'),('bare-cr',b'a\rb')]:
        (source/'content/snippet-check/bad.txt').write_bytes(data)
        write(source,'content/snippet-check/index.md','---\ntitle: Invalid text\n---\n{{< snippet src="bad.txt" >}}');check(label,'must be UTF-8 text')
    # C2 supports standard snippet inside a Markdown container; verify actual text/bytes.
    write(source,'content/snippet-check/index.md','---\ntitle: Supported composition\n---\n{{% block %}}\n{{< snippet src="three.py" >}}\n{{% /block %}}')
    out=check('nested');verify(out,'/snippet-check/',[(b'a\nb\nc',b'a\nb\nc')])
    write(source,'content/snippet-check/index.md','---\ntitle: Unsupported notation\n---\n{{% snippet src="three.py" %}}')
    check('markdown-notation','Raw HTML omitted')
    # Native Hugo excludes file and directory symlinks from resources, even inside approved roots.
    canary=source/'harmless-canary';canary.mkdir();(canary/'secret.py').write_text('SYMLINK_CANARY')
    for label,base,scope,target in [('page-file',source/'content/snippet-check','','secret.py'),('shared-file',source/'assets/snippets',' scope="shared"','secret.py'),('page-dir',source/'content/snippet-check','','dir/secret.py'),('shared-dir',source/'assets/snippets',' scope="shared"','dir/secret.py')]:
        link=base/('dir' if 'dir' in label else 'secret.py');link.symlink_to(canary if 'dir' in label else canary/'secret.py',target_is_directory='dir' in label)
        write(source,'content/snippet-check/index.md','---\ntitle: Symlink rejection\n---\n{{< snippet src="'+target+'"'+scope+' >}}');check(label,'not found')
    # Native project shortcode override remains higher priority than the theme.
    write(source,'content/snippet-check/index.md',body)
    write(source,'layouts/_shortcodes/snippet.html','{{ $html := `<div class="site-snippet-override">Site implementation</div>` | safeHTML }}{{ partial "components/leaf.html" (dict "shortcode" . "html" $html "inline" false) | safeHTML }}')
    out=check('override');assert 'site-snippet-override' in (out/'snippet-check/index.html').read_text()
    (run/'evidence.json').write_text(json.dumps({'passed':passed,'rejected':rejected},indent=2))
    print('PASS',len(passed),'builds +',len(rejected),'expected rejections; retained',run)
if __name__=='__main__':main()
