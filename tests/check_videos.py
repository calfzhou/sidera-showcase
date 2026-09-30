"""Scoped MP4/native resource/one-pass composition checks. No media/network fetch."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode = True
from check_p1b import ROOT, build, copy_showcase, html
from check_p2f import nodes
from check_p2w import write

ROUTE = '/handbook/reference/video/'
def players(out, route=ROUTE):
    return [n for n in nodes(out, route).all() if n.tag == 'video']
def script(out, route):
    return [n for n in nodes(out, route).all() if 'data-sidera-video-script' in n.attrs]
def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='videos-', dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True, exist_ok=True)
    s = copy_showcase(run, 'live'); passed = []; rejected = []
    # F1 is not the subject of this media-only no-network browser fixture.
    config=s/'hugo.toml';config.write_text(config.read_text().replace('comments = true','comments = false'))
    def check(label, diagnostic=None, flags=()):
        out = build(s, run, label, diagnostic, ('--printI18nWarnings', *flags))
        (rejected if diagnostic else passed).append(label)
        return out
    clip = (s/'content/handbook/reference/video/motion.mp4').read_bytes()
    def live(out, prefix=''):
        ps = players(out); assert len(ps) == 2
        for p in ps:
            assert 'src' not in p.attrs and not p.all() and p.attrs['preload'] == 'none'
            assert 'hidden' in p.attrs and 'controls' in p.attrs and 'playsinline' in p.attrs
            assert 'autoplay' not in p.attrs and 'loop' not in p.attrs
            assert p.attrs['data-video-src'] == prefix+ROUTE+'motion.mp4'
        assert len(script(out, ROUTE)) == 1
        assert (out/ROUTE.strip('/')/'motion.mp4').read_bytes() == clip
        assert nodes(out, ROUTE).all(**{'data-state':'disabled'})
        assert not script(out, '/') and not script(out, '/notes/reading-list/')
        assert not script(out, '/handbook/reference/') and not (out/'sidera').exists()
        assert 'data-sidera-leaf=' not in html(out, ROUTE).read_text()
    out = build(ROOT, run, 'normal', flags=('--printI18nWarnings',)); passed.append('normal'); live(out)
    # Build fixtures remain harmless: no real provider/media calls even in browser tests.
    write(s, 'content/video-probe/index.md', '''---
title: Video checks
---
{{% block class="invert-when-dark" id="video-inversion" %}}
{{< video src="space 测试.mp4" title="<&> $literal$" width=480 >}}
{{% /block %}}
{{% folding title="Hidden" id="hidden-video" %}}
{{< grid columns=2 >}}
{{< cell >}}{{< video src="space 测试.mp4" width=320 >}}{{< /cell >}}
{{< cell >}}[Source](space%20测试.mp4) and $x^2$.{{< /cell >}}
{{< /grid >}}
{{% /folding %}}
{{% box %}}{{< video src="https://video.example.invalid/clip.mp4?label=a&value=%22%3Ctag%3E" title="Remote test, mocked only" >}}{{% /box %}}
''')
    (s/'content/video-probe/space 测试.mp4').write_bytes(clip)
    write(s, 'content/video-disabled/index.md', '---\ntitle: Disabled\n---\n{{< video src="clip.mp4" disabled=true >}}')
    (s/'content/video-disabled/clip.mp4').write_bytes(clip)
    write(s, 'content/video-code.md', '''---
title: Source is not a player
---
```html
<figure class="content-video" data-sidera-video><video></video></figure>
```
''')
    write(s, 'content/video-child/index.md', '''---
title: Child video
---
{{< video src="clip.mp4" >}}

<!--more-->

After summary.
''')
    (s/'content/video-child/clip.mp4').write_bytes(clip)
    for mode in ['summary','content','plain']:
        write(s, f'content/video-{mode}-host.md', f'---\ntitle: Host {mode}\nlayout: video-{mode}-host\n---\n')
        expression = '$child.Summary' if mode == 'summary' else '$child.Content'
        if mode == 'plain': expression = '($child.Summary | plainify)'
        write(s, f'layouts/video-{mode}-host.html', '{{ define "main" }}{{ $child := site.GetPage "/video-child" }}{{ partial "sidera/shell.html" (dict "Page" . "Content" '+expression+') }}{{ end }}')
    out = check('baseline'); live(out)
    assert players(out, '/video-probe/')[0].attrs['aria-label'] == '<&> $literal$'
    assert players(out, '/video-probe/')[0].attrs['data-video-src'] == '/video-probe/space%20%E6%B5%8B%E8%AF%95.mp4'
    assert players(out, '/video-probe/')[-1].attrs['data-video-src'] == 'https://video.example.invalid/clip.mp4?label=a&value=%22%3Ctag%3E'
    assert not nodes(out, '/video-probe/').all(src='x')
    for route in ['/video-summary-host/','/video-content-host/']: assert len(script(out, route)) == 1 and len(players(out, route)) == 1
    for route in ['/video-plain-host/','/video-disabled/','/video-code/']: assert not script(out, route) and not players(out, route)
    assert 'data-sidera-math' in html(out, '/video-probe/').read_text()
    out = check('chinese', flags=('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/')); live(out, '/_chinese')
    assert nodes(out, ROUTE).all(**{'class':'video-load'})[0].words() == '加载视频'
    assert nodes(out, '/video-disabled/').all(**{'class':'video-status'})[0].words().startswith('嵌入播放已禁用')
    write(s, 'locales.toml', "defaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(s, 'content/about.zh.md', '---\ntitle: About\n---\nLocale probe.\n')
    write(s, 'content/video-child/index.zh.md', '---\ntitle: 本地视频\n---\n{{< video src="clip.mp4" title="中文示例" >}}')
    out = check('languages', flags=('--config','hugo.toml,locales.toml','--baseURL','https://example.org/preview/'))
    assert players(out, '/zh/video-child/')[0].attrs['aria-label'] == '中文示例'
    # Native shared-resource ownership, not a guessed language prefix.
    assert players(out, '/zh/video-child/')[0].attrs['data-video-src'] == players(out, '/en/video-child/')[0].attrs['data-video-src']
    assert players(out, '/zh/video-child/')[0].attrs['data-video-src'].startswith('/preview/en/')
    write(s, 'themes/sidera/docs/content/video/index.md', '---\ntitle: Mounted video\n---\n{{< video src="clip.mp4" >}}')
    (s/'themes/sidera/docs/content/video/clip.mp4').write_bytes(clip)
    write(s, 'content/journal/video/index.md', '---\ntitle: Dated video\ndate: 2026-04-21\n---\n{{< video src="clip.mp4" >}}')
    (s/'content/journal/video/clip.mp4').write_bytes(clip)
    out = check('docs', flags=('--config','hugo.toml,docs-on.toml','--baseURL','https://example.org/preview/'))
    assert players(out, '/sidera/video/')[0].attrs['data-video-src'] == '/preview/sidera/video/clip.mp4'
    assert players(out, '/journal/2026/04/21/video/')[0].attrs['data-video-src'] == '/preview/journal/2026/04/21/video/clip.mp4'
    assert (out/'sidera/video/clip.mp4').read_bytes() == clip
    # Required defaults, invalid args and resource boundary; disabled does not mask mistakes.
    bad = [
        ('positional','{{< video clip.mp4 >}}','requires named'),
        ('missing','{{< video src="missing.mp4" >}}','not found'),
        ('disabled-missing','{{< video src="missing.mp4" disabled=true >}}','not found'),
        ('src-type','{{< video src=42 >}}','src must be a string'),
        ('title-type','{{< video src="clip.mp4" title=42 >}}','title must be a string'),
        ('title-empty','{{< video src="clip.mp4" title=" " >}}','title must be nonblank'),
        ('width-css','{{< video src="clip.mp4" width="480px;color:red" >}}','width must be'),
        ('width-zero','{{< video src="clip.mp4" width=0 >}}','width must be'),
        ('width-limit','{{< video src="clip.mp4" width=8193 >}}','width must be'),
        ('disabled-type','{{< video src="clip.mp4" disabled="false" >}}','disabled must be a boolean'),
        ('autoplay','{{< video src="clip.mp4" autoplay=true >}}','unsupported parameter'),
        ('traversal','{{< video src="../clip.mp4" >}}','invalid page resource path'),
        ('absolute','{{< video src="/clip.mp4" >}}','invalid page resource path'),
        ('encoded','{{< video src="%2e%2e/clip.mp4" >}}','invalid page resource path'),
        ('glob','{{< video src="*.mp4" >}}','invalid page resource path'),
        ('query-local','{{< video src="clip.mp4?a=1" >}}','invalid page resource path'),
        ('wrong-type','{{< video src="clip.webm" >}}','only MP4'),
        ('script-url','{{< video src="javascript:alert(1)" >}}','invalid page resource path'),
        ('protocol-relative','{{< video src="//example.org/x.mp4" >}}','invalid page resource path'),
        ('credentials','{{< video src="https://user:pass@example.org/x.mp4" >}}','without credentials'),
        ('remote-page','{{< video src="https://example.org/watch?v=1" >}}','MP4 URL'),
        ('url-space','{{< video src="https://example.org/bad name.mp4" >}}','unsafe URL'),
        ('raw-html','<video src="clip.mp4" autoplay></video>','Raw HTML omitted'),
        ('wrong-notation','{{% video src="clip.mp4" %}}','Raw HTML omitted'),
        ('wrong-parent','{{< unsupported >}}{{< video src="clip.mp4" >}}{{< /unsupported >}}','unsupported parent'),
    ]
    write(s, 'layouts/_shortcodes/unsupported.html','{{ .Inner }}')
    write(s, 'content/video-negative/index.md','---\ntitle: Negative\n---\n')
    (s/'content/video-negative/clip.mp4').write_bytes(clip)
    for name, content, diagnostic in bad:
        write(s, 'content/video-negative/index.md','---\ntitle: Negative\n---\n'+content+'\n')
        check(name, diagnostic)
    write(s, 'content/video-negative/index.md', '---\ntitle: Repaired\n---\nSafe.')
    # Native site override can preserve the bridge and use its own i18n safely.
    write(s, 'i18n/en.toml','[video_ready]\nother = "<img src=x onerror=bad()> & ready"\n')
    write(s, 'layouts/_shortcodes/video.html','{{ $h := partial "components/video.html" . }}{{ partial "components/leaf.html" (dict "shortcode" . "html" $h "inline" false) | safeHTML }}')
    out = check('overrides')
    assert nodes(out, ROUTE).all(**{'class':'video-status'})[0].attrs['data-ready'] == '<img src=x onerror=bad()> & ready'
    assert not nodes(out, ROUTE).all(src='x')
    # No fallback to site-wide assets; native symlink files/directories remain excluded.
    (s/'content/video-negative/link.mp4').symlink_to(s/'content/video-negative/clip.mp4')
    (s/'content/video-negative/linked-dir').symlink_to(s/'content/video-child', target_is_directory=True)
    for name, path in [('symlink-file','link.mp4'),('symlink-directory','linked-dir/clip.mp4')]:
        write(s, 'content/video-negative/index.md', '---\ntitle: Negative\n---\n{{< video src="'+path+'" >}}')
        check(name, 'not found')
    (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected}, indent=2))
    print('PASS video', len(passed), 'builds /', len(rejected), 'expected rejections; retained', run)
if __name__ == '__main__': main()
