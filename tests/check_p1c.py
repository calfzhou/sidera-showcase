"""P1-C integration proof. Explicit sequences; stdlib, isolated bounded builds."""
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
from check_p1a import ORGANIZATION, ROOT, THEME, Page, article_route, all_articles, pagers, snapshot
from check_p1b import (FIELD, LAB, View, build, copy_site, html, local_links,
                       tag_checks, write_note, http_smoke)

# Full list and independent recent-update expectations; never read source dates
# or repeat template sorting in the checker to obtain these expectations.
MAIN = {
    'journal': ['second-signal', '2024/archive-signal', 'first-signal'],
    'dispatches': ['third-signal', 'second-signal', 'first-signal'],
    'field-notes': ['alpha', 'beta', 'gamma', 'epsilon', 'delta'],
    'lab-notes': ['gamma', 'alpha', 'beta', 'delta', 'storage/epsilon'],
}
RECENT = {
    'journal': ['first-signal', '2024/archive-signal', 'second-signal'],
    'dispatches': ['third-signal', 'second-signal', 'first-signal'],
    'field-notes': ['beta', 'gamma', 'alpha', 'epsilon', 'delta'],
    'lab-notes': ['alpha', 'beta', 'gamma', 'storage/epsilon', 'delta'],
}
POLICY = {'journal': ('publication', 2), 'dispatches': ('publication', 2),
          'field-notes': ('modification', 2), 'lab-notes': ('title', 3)}


def check_list(out, route, expected, order, size, prefix='', recent=None):
    expected = [prefix + p for p in expected]
    entries = list(pagers(out, prefix + route, prefix))
    # Empty results render the root with PageNumber=1, TotalPages=0.
    count = max(1, (len(expected) + size - 1) // size)
    assert len(entries) == count, (route, len(entries), count)
    def url(n):
        return prefix + route + (f'page/{n}/' if n > 1 else '')
    for n, (actual_route, p) in enumerate(entries, 1):
        assert actual_route == url(n), (actual_route, url(n))
        assert p.pagination == (None if count == 1 and expected else (n, count if expected else 0)), (route, p.pagination)
        assert (p.order, p.size, p.total) == (order, size, len(expected)), route
        assert p.links['articles'] == expected[(n-1)*size:n*size], (actual_route, p.links)
        nav = {}
        if count > 1:
            nav = {'first': url(1), 'last': url(count)}
            if n > 1:
                nav['previous'] = url(n-1)
            if n < count:
                nav['next'] = url(n+1)
        assert p.pager == nav, (actual_route, p.pager, nav)
        if recent is not None:
            assert p.links['recent-updates'] == [prefix + r for r in recent], actual_route
    actual = all_articles(out, prefix + route, prefix)
    assert actual == expected and len(actual) == len(set(actual)), route
    assert not html(out, route + 'page/1/').exists(), 'First page alias disabled'
    assert not html(out, route + f'page/{count+1}/').exists(), 'Unexpected extra pager'


def routes(owner, notes):
    return [article_route(owner, n) for n in notes]


def baseline_checks(out, prefix=''):
    for owner, notes in MAIN.items():
        check_list(out, f'/{owner}/', routes(owner, notes), *POLICY[owner],
                   prefix=prefix, recent=routes(owner, RECENT[owner]))
    for owner, tags in [('field-notes', FIELD), ('lab-notes', LAB)]:
        for tag, members in {'': MAIN[owner], **tags}.items():
            expected = [n for n in MAIN[owner] if n in members]
            check_list(out, f'/{owner}/tags/' + (tag+'/' if tag else ''),
                       routes(owner, expected), *POLICY[owner], prefix=prefix)
    check_list(out, '/lab-notes/storage/', ['/lab-notes/storage/epsilon/'],
               'title', 3, prefix=prefix)
    local_links(out, prefix)


def replace(source, path, old, new):
    f = source / path
    text = f.read_text()
    assert old in text, (path, old)
    f.write_text(text.replace(old, new))


def root(source, owner, kind='blog', params=''):
    f = source / 'content' / owner / '_index.md'
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(f'+++\ntitle = "{owner}"\npreset = "{ {"notebook":"notes","wiki":"docs"}.get(kind,kind) }"\n[params]\nscope_root=true\n{params}\n+++\n')


def date_probe(source):
    root(source, 'dates', params='page_size = 2') # default publication
    # Article-local overrides of list settings are intentionally ignored.
    notes = {
        'a': 'date = 2024-01-01T00:00:00Z\npublishDate = 2024-02-01T00:00:00Z\nlastmod = 2024-03-01T00:00:00Z',
        'b': 'date = 2024-01-15T00:00:00Z',
        'c': 'pubdate = 2024-01-20T00:00:00Z',
        'd': 'modified = 2024-04-01T00:00:00Z',
        'e': '',
        # Same instant as a, different offset; Path breaks equal titles/dates.
        'f': 'date = 2024-02-01T08:00:00+08:00',
        'g': 'published = 2024-01-25T00:00:00Z',
        'h': 'date = 2024-01-01T00:00:00Z\npublishDate = 2024-02-05T00:00:00Z',
    }
    for name, metadata in notes.items():
        write_note(source, f'dates/{name}.md', [], metadata)
    f = source / 'content/dates/e.md'
    f.write_text(f.read_text().replace('[params]', '[params]\nlist_order = "title"\npage_size = 99\npinned = false'))
    # Observe all three native Page values without changing production markup.
    template = source / THEME / 'layouts/_partials/article.html'
    template.write_text(template.read_text().replace('    <h1>', '''    <p data-date="{{ .Date.Format "2006-01-02" }}" data-publication="{{ .PublishDate.Format "2006-01-02" }}" data-modification="{{ .Lastmod.Format "2006-01-02" }}"></p>
    <h1>'''))


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='p1c-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    baseline_source = copy_site(run, 'baseline')
    baseline = build(baseline_source, run, 'baseline')
    baseline_checks(baseline)
    again = build(baseline_source, run, 'determinism')
    assert snapshot(baseline) == snapshot(again)
    subpath = build(baseline_source, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    baseline_checks(subpath, '/preview')

    source = copy_site(run, 'edges')
    # More pins than fit on page 1, equal title + timestamp but different Paths.
    for name, weight in [('a-tie', 999), ('z-tie', -999)]:
        write_note(source, f'field-notes/{name}.md', ['science/quantum/basics'],
                   f'date = 2024-01-02T09:00:00+08:00\nlastmod = 2024-03-03T09:00:00+08:00\nweight = {weight}')
        replace(source, f'content/field-notes/{name}.md', 'title = "Edge note"', 'title = "Beta note"')
        replace(source, f'content/field-notes/{name}.md', '[params]', '[params]\npinned = true')
    replace(source, 'content/field-notes/gamma/index.md', '[params]', '[params]\npinned = true')
    shutil.copytree(ROOT / 'tests/fixtures/annex', source / 'content/lab-notes/annex')
    replace(source, 'content/lab-notes/annex/_index.md', "[params]",
            "[params]\nlist_order = 'publication'\npage_size = 1")
    replace(source, 'content/lab-notes/annex/_index.md', "[cascade.target]", "[[cascade]]\n[cascade.target]")
    replace(source, 'content/lab-notes/annex/_index.md', "\n+++\n", "\n[[cascade]]\n[cascade.target]\nkind='section'\n[cascade.params]\nlist_order='publication'\npage_size=1\n+++\n")
    for name, date in [('a', '02'), ('b', '03')]:
        write_note(source, f'lab-notes/annex/storage/{name}.md', ['science/quantum/basics'],
                   f'date = 2024-01-{date}T09:00:00+08:00\nlastmod = 2024-01-01T09:00:00+08:00')
    root(source, 'empty', 'notebook') # defaults modification / 10; empty hub
    root(source, 'single')
    write_note(source, 'single/only.md', [], 'date = 2024-01-01T00:00:00Z')
    # YAML integer policy, useful title order even on a blog; exact title ties.
    yaml = source / 'content/titles/_index.md'
    yaml.parent.mkdir()
    yaml.write_text('---\ntitle: Titles\npreset: blog\nparams:\n  scope_root: true\n  list_order: title\n  page_size: 1\n---\n')
    for name, title in [('a', 'Same'), ('b', 'Same'), ('z', 'Before')]:
        write_note(source, f'titles/{name}.md', [], 'date = 2024-01-01T00:00:00Z')
        replace(source, f'content/titles/{name}.md', 'Edge note', title)
    date_probe(source)
    edge = build(source, run, 'edges')
    expected = ['a-tie', 'z-tie', 'gamma', 'alpha', 'beta', 'epsilon', 'delta']
    recent = ['a-tie', 'beta', 'z-tie', 'gamma', 'alpha']
    check_list(edge, '/field-notes/', routes('field-notes', expected), 'modification', 2,
               recent=routes('field-notes', recent))
    terms = {k: list(v) for k, v in FIELD.items()}
    for k in ['science', 'science/quantum', 'science/quantum/basics']:
        terms[k] += ['a-tie', 'z-tie']
    tag_checks(edge, 'field-notes', terms, expected)
    for k, members in {'': expected, **terms}.items():
        check_list(edge, '/field-notes/tags/' + (k+'/' if k else ''),
                   routes('field-notes', [n for n in expected if n in members]), 'modification', 2)
    tag_checks(edge, 'lab-notes', LAB, MAIN['lab-notes'])
    check_list(edge, '/lab-notes/', routes('lab-notes', MAIN['lab-notes']), 'title', 3,
               recent=routes('lab-notes', RECENT['lab-notes']))
    annex = ['storage/b', 'storage/a', 'storage/probe']
    for suffix in ['', 'storage/', 'tags/']:
        check_list(edge, '/lab-notes/annex/'+suffix, routes('lab-notes/annex', annex), 'publication', 1)
    for term in ['science', 'science/quantum', 'science/quantum/basics']:
        check_list(edge, '/lab-notes/annex/tags/'+term+'/',
                   routes('lab-notes/annex', annex[:2]), 'publication', 1)
    tag_checks(edge, 'lab-notes/annex', {t: annex[:2] for t in
               ['science', 'science/quantum', 'science/quantum/basics']}, annex)
    for suffix in ['', 'tags/']:
        check_list(edge, '/empty/'+suffix, [], 'modification', 10)
    check_list(edge, '/single/', ['/single/only/'], 'publication', 10, recent=['/single/only/'])
    check_list(edge, '/titles/', routes('titles', ['z', 'a', 'b']), 'title', 1)
    check_list(edge, '/dates/', routes('dates', ['h', 'a', 'f', 'g', 'c', 'b', 'd', 'e']),
               'publication', 2, recent=routes('dates', ['d', 'a', 'h', 'f', 'g']))
    date_values = {'a': ('2024-01-01', '2024-02-01', '2024-03-01'),
                   'b': ('2024-01-15',)*3, 'c': ('2024-01-20',)*3,
                   'd': ('0001-01-01', '0001-01-01', '2024-04-01'),
                   'e': ('0001-01-01',)*3, 'f': ('2024-02-01',)*3, 'g': ('2024-01-25',)*3,
                   'h': ('2024-01-01', '2024-02-05', '2024-02-05')}
    for note, (date, publication, modification) in date_values.items():
        text = html(edge, '/dates/'+note+'/').read_text()
        assert f'data-date="{date}" data-publication="{publication}" data-modification="{modification}"' in text, text
    # Published label follows PublishDate, not the different Date on a.
    assert Page(html(edge, '/dates/a/')).times['published'].startswith('2024-02-01')
    assert 'published' not in Page(html(edge, '/dates/d/')).times
    local_links(edge)
    http_smoke(edge, run, ['/field-notes/page/4/', '/field-notes/tags/page/4/',
                          '/field-notes/tags/science/page/2/',
                          '/field-notes/tags/science/quantum/basics/page/2/',
                          '/lab-notes/annex/storage/page/3/', '/empty/tags/'])
    repeat = build(source, run, 'edges-repeat')
    assert snapshot(edge) == snapshot(repeat)
    edge_subpath = build(source, run, 'edges-subpath', flags=('--baseURL', 'https://example.org/preview/'))
    check_list(edge_subpath, '/field-notes/tags/science/quantum/basics/',
               routes('field-notes', ['a-tie', 'z-tie', 'alpha', 'beta']), 'modification', 2, prefix='/preview')
    local_links(edge_subpath, '/preview')

    # Defaults are owner-local, not inherited from a surrounding collection.
    defaults = copy_site(run, 'defaults')
    for owner, order in [('journal', 'publication'), ('field-notes', 'modification')]:
        replace(defaults, f'content/{owner}/_index.md', f"list_order = '{order}'\npage_size = 2\n", '')
    shutil.copytree(ROOT / 'tests/fixtures/annex', defaults / 'content/lab-notes/annex')
    out = build(defaults, run, 'defaults')
    for owner in ['journal', 'field-notes']:
        check_list(out, '/'+owner+'/', routes(owner, MAIN[owner]), POLICY[owner][0], 10)
    check_list(out, '/lab-notes/annex/', ['/lab-notes/annex/storage/probe/'], 'modification', 10)
    local_links(out)

    negative = [('order', 'list_order', '"random"', 'list_order must be'),
                ('order-type', 'list_order', '42', 'list_order must be'),
                ('zero', 'page_size', '0', 'page_size must be'),
                ('negative', 'page_size', '-1', 'page_size must be'),
                ('fraction', 'page_size', '2.5', 'page_size must be'),
                ('string-size', 'page_size', '"2"', 'page_size must be'),
                ('bool-size', 'page_size', 'true', 'page_size must be')]
    for label, key, value, diagnostic in negative:
        source = copy_site(run, label)
        old = "list_order = 'publication'" if key == 'list_order' else 'page_size = 2'
        replace(source, 'content/journal/_index.md', old, f'{key} = {value}')
        build(source, run, label, ('P1C ' if key=='list_order' else 'Sidera ')+diagnostic)
    source = copy_site(run, 'pin-type')
    replace(source, 'content/journal/second-signal/index.md', 'pinned = true', 'pinned = "true"')
    build(source, run, 'pin-type', 'Sidera pinned must be boolean')
    for label, path, extra, diagnostic in [
        # Journal's dated permalink otherwise moves this source away from /page/2/.
        ('blog-page', 'journal/page/2.md', 'url = "/journal/page/2/"', 'reserved pagination route'),
        ('storage-page', 'lab-notes/storage/page/2.md', '', 'reserved pagination route'),
        ('blog-url', 'journal/conflict.md', 'url = "/dispatches/page/2/"', 'reserved pagination route'),
        ('blog-alias', 'journal/conflict.md', 'aliases = ["/dispatches/page/2/"]', 'alias in reserved pagination route'),
    ]:
        source = copy_site(run, label)
        write_note(source, path, [], extra)
        build(source, run, label, 'P1C '+diagnostic)
    source = copy_site(run, 'blog-static')
    f = source / 'static/journal/page/2/index.html'
    f.parent.mkdir(parents=True)
    f.write_text('Conflict')
    build(source, run, 'blog-static', 'P1C static file in reserved pagination route')

    # Architectural guard: one call per mutually exclusive list/docs renderer; widgets/nav never
    # accidentally seed Hugo's cached first call with a different collection.
    calls = [(p.relative_to(ROOT).as_posix(), line.strip())
             for p in (ROOT/THEME/'layouts').rglob('*.html') for line in p.read_text().splitlines()
             if '{{' in line and '/*' not in line and ('.Paginate ' in line or '.Paginator' in line)]
    assert len(calls) == 6 and {p.split('/_partials/')[-1] for p, _ in calls} == {'lists/render.html', 'docs/render.html', 'taxonomies/index.html', 'views/native-taxonomy.html', 'views/taxonomy-scope.html', 'views/archive.html'}, calls
    summary = ('PASS P1-C: explicit sequences, native date fallback/aliases/offsets, ties, pins once/overflow, '
               'all pager navigation/counts, empty/single/multiple results, independent recent updates/sizes, '
               'nested owners, full tag unions/trees, subpath links, repeat builds and 13 invalid-input rejections.\n')
    (run/'result.txt').write_text(summary)
    print(summary, end='')


if __name__ == '__main__':
    main()
