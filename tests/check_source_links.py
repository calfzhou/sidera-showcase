"""P3-A: literal editor paths -> native output URLs; stdlib, fresh isolated builds.
The normal Reading List note is the acceptance example, not a throwaway fixture.
"""
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs
import json, os, subprocess, sys, tempfile
sys.dont_write_bytecode = True
from check_p1a import ROOT
from check_p1b import build, copy_showcase
from check_p2f import nodes
from check_p2w import write

NOTE = 'content/notes/reading-list/index.md'
POST = 'content/journal/connect-the-useful-parts/index.md'
ROUTE = '/journal/2026/04/14/connect-the-useful-parts/'
PROBE = '/notes/link-probe/'


def links(out, route=PROBE):
    return {n.words(): n.attrs for n in nodes(out, route).all(**{'class': 'prose'})[0].all() if n.tag == 'a' and 'heading-anchor' not in n.attrs.get('class', '')}


def target_exists(out, href, prefix=''):
    u = urlsplit(href)
    path = unquote(u.path)
    assert path.startswith(prefix + '/'), href
    path = path[len(prefix):]
    file = out / path.lstrip('/')
    if path.endswith('/'): file /= 'index.html'
    assert file.is_file(), href
    if u.fragment and file.suffix == '.html':
        assert nodes(out, path).all(id=unquote(u.fragment)), href


def acceptance(source, out, prefix='', dated=True):
    note = source / NOTE
    target = source / POST
    authored = '../../journal/connect-the-useful-parts/index.md'
    assert (note.parent / authored).resolve() == target.resolve() and target.is_file()
    text = note.read_text()
    assert f'[Connect the useful parts]({authored})' in text
    assert f'[Give a link a reason]({authored}#give-a-link-a-reason)' in text
    assert f'[context]: {authored}#keep-the-surrounding-sentence' in text
    assert '## Give a link a reason' in target.read_text()
    result = links(out, '/notes/reading-list/')
    destination = prefix + (ROUTE if dated else '/journal/connect-the-useful-parts/')
    for label, suffix in [('Connect the useful parts', ''), ('Give a link a reason', '#give-a-link-a-reason'), ('the surrounding sentence', '#keep-the-surrounding-sentence')]:
        href = result[label]['href']
        assert href == destination + suffix, (label, href)
        target_exists(out, href, prefix)
    assert result['the surrounding sentence']['title'] == 'Keep the reason for the link'
    canonical = nodes(out, destination[len(prefix):]).all(**{'class': 'footer-section article-share'})[0].attrs['data-share-url']
    assert urlsplit(canonical).path == destination
    return {'note': NOTE, 'literal': authored, 'target': POST, 'href': destination, 'canonical': canonical}


def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='source-links-', dir=ROOT / '.checks')).resolve()
    run.mkdir(parents=True, exist_ok=True)
    source = copy_showcase(run, 'live')
    evidence = []
    out = build(source, run, 'baseline')
    evidence.append(acceptance(source, out))
    config = (source / 'hugo.toml').read_text()
    write(source, 'hugo.toml', config.replace("journal = '/journal/:year/:month/:day/:slugorcontentbasename/'", ''))
    out = build(source, run, 'no-permalink')
    evidence.append(acceptance(source, out, dated=False))
    write(source, 'hugo.toml', config)
    out = build(source, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    acceptance(source, out, '/preview')
    out = build(source, run, 'chinese', flags=('--config', 'hugo.toml,examples/chinese.toml'))
    acceptance(source, out)
    out = build(source, run, 'docs-on', flags=('--config', 'hugo.toml,docs-on.toml'))
    assert links(out, '/sidera/')['the authoring example']['href'] == '/sidera/authoring/'
    assert links(out, '/sidera/publishing/')['Return to the documentation root']['href'] == '/sidera/'
    write(source, 'alternate.toml', (source / 'docs-on.toml').read_text().replace('content/sidera', 'content/manual/sidera'))
    out = build(source, run, 'docs-alternate', flags=('--config', 'hugo.toml,alternate.toml'))
    assert links(out, '/manual/sidera/')['the mounting note']['href'] == '/manual/sidera/publishing/'
    assert links(out, '/manual/sidera/authoring/')['Continue to the example']['href'] == '/manual/sidera/authoring/example/'
    assert not (run / 'baseline-public/sidera').exists()

    write(source, 'content/journal/storage/a/plain.md', '---\ntitle: First plain\ndate: 2026-01-02\nslug: first-plain\n---\n## Native heading\n\n[Back](../../../notes/link-probe/index.md#local-heading)\n')
    write(source, 'content/journal/storage/b/plain.md', '---\ntitle: Second plain\ndate: 2026-01-03\nurl: /custom/second/\n---\n## Second heading\n')
    write(source, 'content/journal/storage/中文 名称.md', '---\ntitle: Unicode source\ndate: 2026-01-04\nslug: unicode\n---\n## 中文标题\n')
    write(source, 'content/journal/edge/index.md', '---\ntitle: Bundle with files\ndate: 2026-01-05\nslug: bundle-route\n---\n## Native heading\n')
    write(source, 'content/journal/edge/a file.txt', 'exact cross-bundle file\n')
    write(source, 'content/notes/link-probe/a file.txt', 'exact local file\n')
    write(source, 'assets/a file.txt', 'global must not win over the local file\n')
    write(source, 'assets/guides/readme.md', '# Global Markdown download\n')
    write(source, 'content/journal/edge/resource.md', '---\ntitle: Content resource\n---\nNot an independent Page.\n')
    write(source, 'assets/global.txt', 'exact global file\n')
    write(source, 'static/downloads/public.md', '# Public download, not a Page\n')
    write(source, 'links.toml', '[params]\nlink_heading_checks=true\n[markup.goldmark.parser.attribute]\nblock=true\n')
    body = r'''---
title: Source link checks
---
## Local heading

[Plain A](../../journal/storage/a/plain.md?q=a%20b&literal=%2B#native-heading)
[Plain B][second]

[second]: ../../journal/storage/b/plain.md#second-heading "A title with \"quotes\" & symbols"

[Leaf](../../journal/edge/index.md#native-heading)
[Branch](../../handbook/reference/_index.md)
[Unicode](<../../journal/storage/中文 名称.md#中文标题>)
[Encoded](../../journal/storage/%E4%B8%AD%E6%96%87%20%E5%90%8D%E7%A7%B0.md#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98)
[Local](a%20file.txt?q=1&x=2#download)
[Cross file](../../journal/edge/a%20file.txt?q=1#download)
[Global](/global.txt?x=1#download)
[Global Markdown](/guides/readme.md)
[Public Markdown](/downloads/public.md)
[HTTP](https://external.example/path.md?q=1#part)
[Network](//external.example/path.md)
[Mail](mailto:reader@example.org)
[Tel](tel:+123456789)
[Fragment](#local-heading)
[Web](../color/)
[Site URL](/journal/2026/04/14/connect-the-useful-parts/)
[Missing web](ordinary-web-route/)
[Escaped \[label\] & **bold**](../../journal/edge/index.md "&quot; onmouseover=&quot;never")

Paragraph [with link](../../journal/edge/index.md).
{.link-paragraph onclick="never"}

[Literal title](../../journal/edge/index.md "\&quot; *plain* \\ done")

[Unsafe](javascript:alert%281%29) [Data](data:text/html,bad) [File](file:///etc/passwd)

`[Code](missing-inline.md)`

```markdown
[Fenced](missing-fenced.md)
```
'''
    write(source, 'content/notes/link-probe/index.md', body)
    out = build(source, run, 'edges', flags=('--config', 'hugo.toml,links.toml'))
    result = links(out)
    expected = {
        'Plain A': '/journal/2026/01/02/first-plain/?q=a%20b&literal=%2B#native-heading',
        'Plain B': '/custom/second/#second-heading',
        'Leaf': '/journal/2026/01/05/bundle-route/#native-heading',
        'Branch': '/handbook/reference/',
        'Unicode': '/journal/2026/01/04/unicode/#中文标题',
        'Encoded': '/journal/2026/01/04/unicode/#中文标题',
        'Local': '/notes/link-probe/a file.txt?q=1&x=2#download',
        'Cross file': '/journal/2026/01/05/bundle-route/a file.txt?q=1#download',
        'Global': '/global.txt?x=1#download',
        'Public Markdown': '/downloads/public.md', 'Global Markdown': '/guides/readme.md',
        'HTTP': 'https://external.example/path.md?q=1#part', 'Network': '//external.example/path.md',
        'Mail': 'mailto:reader@example.org', 'Tel': 'tel:+123456789', 'Fragment': '#local-heading',
        'Web': '../color/', 'Site URL': ROUTE, 'Missing web': 'ordinary-web-route/',
    }
    for label, href in expected.items():
        assert unquote(result[label]['href']) == unquote(href), (label, result[label])
        if label in ['Plain A', 'Plain B', 'Leaf', 'Branch', 'Unicode', 'Encoded', 'Local', 'Cross file', 'Global', 'Public Markdown', 'Global Markdown']:
            target_exists(out, result[label]['href'])
    assert (out / 'notes/link-probe/a file.txt').read_text() == 'exact local file\n'
    assert (out / 'journal/2026/01/05/bundle-route/a file.txt').read_text() == 'exact cross-bundle file\n'
    assert parse_qs(urlsplit(result['Plain A']['href']).query) == {'q': ['a b'], 'literal': ['+']}
    assert result['Literal title']['title'] == '&quot; *plain* \\ done'
    assert result['Plain B']['title'] == 'A title with "quotes" & symbols'
    assert result['Escaped [label] & bold']['title'] == '" onmouseover="never'
    assert all(not any(k.startswith('on') for k in n.attrs) for n in nodes(out, PROBE).all())
    assert all(not result[k]['href'].startswith(('javascript:', 'data:', 'file:')) for k in ['Unsafe', 'Data', 'File'])
    assert nodes(out, PROBE).all(**{'class': 'link-paragraph'})
    assert 'missing-inline.md' in (out / 'notes/link-probe/index.html').read_text()
    assert 'missing-fenced.md' in (out / 'notes/link-probe/index.html').read_text()
    assert links(out, '/journal/2026/01/02/first-plain/')['Back']['href'] == '/notes/link-probe/#local-heading'

    # Native control: explicit always is TEST ONLY. It bypasses custom hooks by design.
    # C2 inline leaf rendering also belongs to the theme link hook. This isolated
    # embedded-hook control uses ordinary text instead of that one nested key token;
    # all A source/resource/title/diagnostic assertions remain unchanged. C2 separately
    # verifies an explicit failure when forced embedded hooks bypass native leaf slots.
    components=source/'content/handbook/reference/content-components/index.md'
    component_body=components.read_text()
    components.write_text(component_body.replace('{{< kbd text="Enter" >}}','Enter'))
    write(source, 'embedded.toml', "[markup.goldmark.renderHooks.link]\nuseEmbedded='always'\n")
    write(source, 'content/notes/link-probe/index.md', body + '\n[Logical only](../../journal/storage/a/plain/index.md)\n[Above root](../../../../journal/edge/index.md)\n')
    out = build(source, run, 'embedded-control', flags=('--config', 'hugo.toml,embedded.toml'))
    native = links(out)
    assert native['Plain B']['title'] == r'A title with \"quotes\" & symbols'
    assert native['Tel']['href'] == '#ZgotmplZ'
    assert native['Plain A']['href'] == expected['Plain A']
    assert native['Cross file']['href'] == '../../journal/edge/a%20file.txt?q=1#download'
    assert native['Logical only']['href'] == '/journal/2026/01/02/first-plain/'
    assert native['Above root']['href'] == '/journal/2026/01/05/bundle-route/'
    evidence.append({'native_control': 'always (test only)', 'cross_file': native['Cross file']['href'], 'nonexistent_source_alias': native['Logical only']['href'], 'above_root': native['Above root']['href']})

    components.write_text(component_body)
    write(source, 'content/journal/storage/draft.md', '---\ntitle: Valid draft\ndraft: true\ndate: 2026-01-07\n---\n## Draft heading\n')
    cases = [('missing', 'missing.md', 'unresolved source'),
             ('logical-not-physical', '../../journal/storage/a/plain/index.md', 'unresolved source'),
             ('outside', '../../../../journal/edge/index.md', 'leaves the content root'),
             ('excluded', '../../journal/storage/draft.md', 'source exists locally'),
             ('content-resource', '../../journal/edge/resource.md', 'source exists locally'),
             ('heading', '../../journal/edge/index.md#not-a-heading', 'Sidera link heading')]
    for name, path, diagnostic in cases:
        write(source, 'content/notes/link-probe/index.md', body + f'\n[Diagnostic]({path})\n')
        build(source, run, 'reject-' + name, diagnostic, ('--config', 'hugo.toml,links.toml'))
        log = (run / ('reject-' + name + '.log')).read_text()
        assert 'notes/link-probe/index.md:' in log and path in log
    # Default does not mistake non-heading IDs (e.g. code lines/footnotes) for broken links.
    out = build(source, run, 'heading-check-off')
    assert links(out)['Diagnostic']['href'].endswith('#not-a-heading')
    write(source, 'ignore.toml', "ignoreLogs=['sidera-link-source']\n")
    write(source, 'content/notes/link-probe/index.md', body + '\n[Diagnostic](missing.md)\n')
    out = build(source, run, 'source-warning-opt-out', flags=('--config', 'hugo.toml,ignore.toml'))
    assert links(out)['Diagnostic']['href'] == 'missing.md'
    write(source, 'content/notes/link-probe/index.md', body + '\n[Draft](../../journal/storage/draft.md#draft-heading)\n')
    out = build(source, run, 'all-states', flags=('--config', 'hugo.toml,links.toml', '--buildDrafts', '--buildFuture', '--buildExpired'))
    assert links(out)['Draft']['href'] == '/journal/2026/01/07/draft/#draft-heading'
    # D-013 remains validation, never hidden by link handling.
    write(source, 'content/journal/storage/draft.md', '---\ntitle: Invalid draft\ndraft: true\ntags: [bad//tag]\n---\n')
    build(source, run, 'invalid-draft', 'malformed tag segment')
    write(source, 'content/journal/storage/draft.md', '---\ntitle: Valid draft\ndraft: true\n---\n')
    write(source, 'content/notes/link-probe/index.md', body)
    write(source, 'bilingual.toml', "[languages.en]\nweight=1\nlocale='en-US'\n[languages.zh]\nweight=2\nlocale='zh-CN'\n")
    write(source, 'content/about.zh.md', '---\ntitle: About this example\n---\nSynthetic translation fixture.\n')
    write(source, 'content/journal/edge/index.zh.md', '---\ntitle: Chinese target\ndate: 2026-01-05\nslug: chinese-route\n---\n## 中文标题\n')
    write(source, 'content/notes/link-probe/index.zh.md', '---\ntitle: Chinese note\n---\n[Chinese target](../../journal/edge/index.zh.md#中文标题)\n[English target](../../journal/edge/index.md#native-heading)\n[Shared file](a%20file.txt)\n')
    write(source, 'content/notes/link-probe/index.md', body + '\n[Explicit Chinese](../../journal/edge/index.zh.md#中文标题)\n')
    out = build(source, run, 'bilingual', flags=('--config', 'hugo.toml,links.toml,bilingual.toml'))
    chinese = links(out, '/zh/notes/link-probe/')
    assert chinese['Chinese target']['href'] == '/zh/journal/2026/01/05/chinese-route/#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98'
    assert chinese['English target']['href'] == '/journal/2026/01/05/bundle-route/#native-heading'
    assert links(out)['Explicit Chinese']['href'] == chinese['Chinese target']['href']
    target_exists(out, chinese['Chinese target']['href'])
    target_exists(out, chinese['Shared file']['href'])
    # A disabled filename language is known locally, but never silently linked to English.
    build(source, run, 'disabled-language', 'source exists locally')
    write(source, 'content/notes/link-probe/index.md', body)
    write(source, 'page-config.toml', '[cascade.params]\nlink_heading_checks=true\n')
    build(source, run, 'page-heading-config', 'link_heading_checks belongs in site/language', ('--config', 'hugo.toml,page-config.toml'))
    write(source, 'invalid.toml', '[params]\nlink_heading_checks="yes"\n')
    build(source, run, 'invalid-heading-config', 'link_heading_checks must be boolean', ('--config', 'hugo.toml,invalid.toml'))
    # Native hook override contract: fallback/never/auto keep project hooks; always does not.
    write(source, 'layouts/_markup/render-link.html', '{{ if hasPrefix .Destination "sidera-inline:" }}{{ partial "components/render-leaf.html" (dict "context" . "key" (strings.TrimPrefix "sidera-inline:" .Destination)) }}{{ else }}<a data-site-hook="yes" href="{{ .Destination }}">{{ .Text }}</a>{{ end }}')
    for mode in ['auto', 'fallback', 'never']:
        write(source, 'override.toml', f"[markup.goldmark.renderHooks.link]\nuseEmbedded='{mode}'\n")
        out = build(source, run, 'override-' + mode, flags=('--config', 'hugo.toml,override.toml'))
        assert links(out)['Plain A']['data-site-hook'] == 'yes'
    components.write_text(component_body.replace('{{< kbd text="Enter" >}}','Enter'))
    out = build(source, run, 'override-always', flags=('--config', 'hugo.toml,embedded.toml'))
    assert 'data-site-hook' not in links(out)['Plain A']
    (run / 'evidence.json').write_text(json.dumps(evidence, indent=2, ensure_ascii=False))
    print('PASS editor-native source links, native control/gaps, safety, diagnostics, docs mounts and overrides:', run)


if __name__ == '__main__': main()
