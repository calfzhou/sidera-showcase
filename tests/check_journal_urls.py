"""Journal publication-date URLs: native configuration only, synthetic copies."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
from check_organization import ORGANIZATION, ROOT, JOURNAL_ROUTES, Page, check_baseline, snapshot
from check_tag_routes import build, copy_site, html, local_links, http_smoke


PATTERN = "[permalinks.page]\njournal = '/journal/:year/:month/:day/:slugorcontentbasename/'\n"


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='journal-urls-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    baseline_source = copy_site(run, 'baseline')
    baseline = build(baseline_source, run, 'baseline')
    check_baseline(baseline)
    for source, route in JOURNAL_ROUTES.items():
        assert html(baseline, route).exists()
        assert not html(baseline, '/journal/' + source + '/').exists(), source
    for route in ('/journal/2024/', '/journal/2024/01/', '/journal/2024/01/01/'):
        assert not html(baseline, route).exists(), 'URL segments must not become sections'

    # Unrelated collections' published bytes are unchanged by the site rule.
    old = copy_site(run, 'without-rule')
    config = old / 'hugo.toml'
    assert PATTERN in config.read_text()
    config.write_text(config.read_text().replace(PATTERN, ''))
    previous = build(old, run, 'without-rule')
    before, after = snapshot(previous), snapshot(baseline)
    native_dependents = {'authors/demo-editor/index.html', 'authors/demo-researcher/index.html', 'series/model-workshop/index.html'}
    # Share QR resources encode native Journal URLs; they are route dependents too.
    native_qr = set()
    for output in (previous, baseline):
        for document in (output / 'journal').rglob('index.html'):
            for url in Page(document).assets:
                if url.startswith('/images/qr/'):
                    file = output / url.lstrip('/')
                    assert file.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
                    native_qr.add(url.lstrip('/'))
    unchanged = [p for p in before if not p.startswith(('journal/', 'tags/', 'categories/')) and p != 'sitemap.xml' and p not in native_dependents and p not in native_qr]
    assert all(after.get(p) == before[p] for p in unchanged)
    assert all(p in before for p in after if not p.startswith(('journal/', 'tags/', 'categories/')) and p != 'sitemap.xml' and p not in native_dependents and p not in native_qr)

    # Global taxonomy results intentionally link the same Journal pages; native
    # dated policy must propagate there instead of retaining stale destinations.
    assert '/journal/2024/01/01/first-signal/' in html(baseline,'/tags/shared/').read_text()
    assert '/journal/first-signal/' in html(previous,'/tags/shared/').read_text()
    for file in native_dependents:
        assert '/journal/2024/01/01/first-signal/' in (baseline/file).read_text()
        assert '/journal/first-signal/' in (previous/file).read_text()
    local_links(baseline); local_links(previous)

    edge = copy_site(run, 'edges')
    content = edge / 'content/journal'
    bundle = content / 'storage/source-name'
    bundle.mkdir(parents=True)
    (bundle / 'index.md').write_text('''+++
title = 'Title is not the URL slug'
slug = 'chosen-slug'
date = 2024-02-03T00:15:00+08:00
lastmod = 2024-09-10T12:00:00+08:00
+++
Synthetic dated bundle. ![Sample](sample.svg) [Download](sample.py).
''')
    for name in ('sample.svg', 'sample.py'):
        shutil.copy2(ORGANIZATION / 'content/field-notes/alpha' / name, bundle / name)
    (content / 'plain-source.md').write_text('''---
title: Title must not replace filename
date: 2024-04-05 00:15:00
---
Synthetic plain Markdown.
''')
    routes = {'bundle': '/journal/2024/02/03/chosen-slug/',
              'plain': '/journal/2024/04/05/plain-source/'}
    out = build(edge, run, 'edges')
    for name, route in routes.items():
        assert html(out, route).exists(), route
        assert Page(html(out, route)).article['data-collection'] == '/journal/'
    assert Page(html(out, routes['bundle'])).times['published'] == '2024-02-03T00:15:00+08:00'
    assert Page(html(out, routes['plain'])).times['published'] == '2024-04-05T00:15:00+08:00'
    for asset in ('sample.svg', 'sample.py'):
        assert (out / routes['bundle'].strip('/') / asset).read_bytes() == (bundle / asset).read_bytes()
    local_links(out)

    # Title and modification-date edits must not move either URL.
    for path in (bundle / 'index.md', content / 'plain-source.md'):
        text = path.read_text().replace('Title', 'Revised title').replace('2024-09-10', '2025-10-11')
        path.write_text(text)
    revised = build(edge, run, 'revised')
    assert set(snapshot(out)) == set(snapshot(revised)), 'Title/update changed a route'
    local_links(revised)
    subpath = build(edge, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    local_links(subpath, '/preview')
    assert '/preview' + routes['bundle'] in html(subpath, '/journal/').read_text()
    http_smoke(revised, run, routes=list(JOURNAL_ROUTES.values()) + list(routes.values()) + ['/journal/', '/journal/page/2/'])
    result = {'baseline_routes': JOURNAL_ROUTES, 'edge_routes': routes,
              'unrelated_files_byte_identical': len(unchanged),
              'checks': ['slug/basename', 'date not lastmod', 'local timezone', 'unchanged source hierarchy',
                         'bundle resources', 'title/update URL stability', 'subpath links', 'HTTP', 'no old-route aliases']}
    (run / 'results.json').write_text(json.dumps(result, indent=2))
    print('PASS Journal dated URLs; all five builds and HTTP checks pass.')


if __name__ == '__main__':
    main()
