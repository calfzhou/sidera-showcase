"""P1-B: real generated routes, independent membership expectations, strict builds.
No third-party packages. All copies, probes, logs and outputs stay in .checks/.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
from urllib.request import urlopen
from urllib.parse import quote
import shutil
import subprocess
import tempfile
import sys
from urllib.parse import unquote, urljoin, urlparse

sys.dont_write_bytecode = True

from check_p1a import ROOT, THEME, Page, check_baseline, same_links, snapshot, pagers, all_articles


class View(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.owner = None
        self.key = None
        self.count = None
        self.tree = {}
        self.tree_links = {}
        self.pending_tag = None
        self.nav = {}
        self.current_nav = None
        self.chinese = False
        self.full_tree = False
        self.feed(file.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.chinese = a.get("lang") == "zh-CN"
        if tag == 'section' and 'data-tag-view' in a:
            self.key, self.owner = a['data-tag-view'], a['data-collection']
        if 'data-note-count' in a:
            self.count = int(a['data-note-count'])
        if 'data-tag' in a:
            assert a['data-tag'] not in self.tree, a
            self.tree[a['data-tag']] = int(a['data-count'])
            self.pending_tag = a['data-tag']
        if tag == 'nav':
            if a.get('data-tree-scope') == 'owner': self.full_tree = True
            self.current_nav = a.get('aria-label')
            if self.current_nav == 'Notes tags':
                self.current_nav = 'Notebook tags'
            if self.chinese:
                # Presentation-only mapping; full existing link/count assertions remain.
                self.current_nav = {'所属合集': 'Collection', '笔记标签': 'Notebook tags', '笔记本标签': 'Notebook tags',
                                    '标签层级路径': 'Tag ancestors'}.get(self.current_nav, self.current_nav)
            self.nav[self.current_nav] = []
        if tag == 'a' and self.pending_tag:
            self.tree_links[self.pending_tag] = unquote(a['href'])
            self.pending_tag = None
        if tag == 'a' and self.current_nav:
            self.nav[self.current_nav].append(unquote(a['href']))

    def handle_endtag(self, tag):
        if tag == 'nav':
            self.current_nav = None


def html(out, route):
    return out / route.strip('/') / 'index.html'


def build(source, run, label, diagnostic=None, flags=()):
    out = run / (label + '-public')
    cmd = ['hugo', '--source', str(source), '--destination', str(out),
           '--cacheDir', str(run / (label + '-cache')), '--panicOnWarning',
           '--printPathWarnings', *flags]
    result = subprocess.run(cmd, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=60)
    (run / (label + '.log')).write_text(result.stdout)
    if diagnostic:
        assert result.returncode != 0, (label, 'invalid input unexpectedly built')
        assert diagnostic in result.stdout, (label, result.stdout)
    else:
        assert result.returncode == 0, (label, result.stdout)
        assert 'WARN' not in result.stdout and 'ERROR' not in result.stdout, result.stdout
    print('PASS', label, '(expected rejection)' if diagnostic else '')
    return out


def copy_site(run, label):
    dest = run / (label + '-source')
    dest.mkdir()
    shutil.copy2(ROOT / 'hugo.toml', dest / 'hugo.toml')
    for directory in ('content', 'themes'):
        shutil.copytree(ROOT / directory, dest / directory, ignore=shutil.ignore_patterns(".git"))
    return dest


def write_note(source, path, tags, extra=''):
    file = source / 'content' / path
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text('+++\ntitle = "Edge note"\n' + extra + '\n[params]\ntags = '
                    + json.dumps(tags, ensure_ascii=False) + '\n+++\nSynthetic edge.\n')


FIELD = {
    'science': ['alpha', 'beta'],
    'science/quantum': ['alpha', 'beta'],
    'science/quantum/basics': ['alpha', 'beta'],
    'science/quantum/experiments': ['alpha'],
    'shared': ['gamma'], 'math': ['epsilon'], 'math/graphs': ['epsilon'],
    'u-e9878fe5ad90': ['epsilon'], 'u-e9878fe5ad90/u-e59fbae7a180': ['epsilon'],
    'field-work': ['epsilon'], 'field-work/lab': ['epsilon'],
}
LAB = {
    'science': ['alpha', 'beta'], 'science/quantum': ['alpha', 'beta'],
    'science/quantum/basics': ['alpha'], 'science/quantum/experiments': ['beta'],
    'shared': ['alpha', 'gamma'], 'math': ['storage/epsilon'],
    'math/graphs': ['storage/epsilon'],
}


def tag_checks(out, owner, expected, all_notes):
    root = '/' + owner + '/'
    hub = root + 'tags/'
    tree = View(html(out, hub))
    assert hub in View(html(out, root)).nav['Notebook tags']
    segment_labels = {'field-work': 'field work', 'u-e9878fe5ad90': '量子',
                      'u-e59fbae7a180': '基础', 'u-636166c3a9': 'café',
                      'u-63616665cc81': 'cafe\u0301'}
    labels = {s: '/'.join(segment_labels.get(p, p) for p in s.split('/')) for s in expected}
    assert tree.tree == {labels[s]: len(notes) for s, notes in expected.items()}, tree.tree
    for slug, notes in {'': all_notes, **expected}.items():
        route = hub + (slug + '/' if slug else '')
        same_links(all_articles(out, route), [root + n + "/" for n in notes])
        for pager_route, p in pagers(out, route):
            v = View(html(out, pager_route))
            assert v.owner == root and v.key == labels.get(slug, ''), (route, v.owner, v.key)
            assert v.count == len(notes), (route, v.count, notes)
            same_links(v.nav['Collection'], [root])
            ancestors = [hub]
            pieces = slug.split('/') if slug else []
            ancestors += [hub + '/'.join(pieces[:i]) + '/' for i in range(1, len(pieces) + 1)]
            assert v.nav['Tag ancestors'] == ancestors, (route, v.nav)
            descendants = {labels[s]: len(ns) for s, ns in expected.items()
                           if v.full_tree or (s != slug and (not slug or s.startswith(slug + '/')))}
            assert v.tree == descendants, (route, v.tree, descendants)
            assert v.tree_links == {labels[s]: hub + s + '/' for s in expected
                                    if labels[s] in descendants}, (route, v.tree_links)
        # Follow every list -> article -> collection/hub navigation edge.
        for note in notes:
            a = html(out, root + note + '/')
            same_links(Page(a).collection_links, [root])
            assert View(a).nav['Notebook tags'] == [hub]
            for direct in Page(a).links['assigned-tags']:
                direct = unquote(direct)
                assert direct.startswith(hub), (note, direct)
                assert root + note + '/' in all_articles(out, direct)
    if 'delta' in all_notes:
        assert Page(html(out, root + 'delta/')).links['assigned-tags'] == []


def local_links(out, prefix=""):
    for file in out.rglob('*.html'):
        route = prefix + '/' + file.relative_to(out).as_posix().removesuffix('index.html')
        for link in Page(file).assets:
            target = urlparse(urljoin('https://example.org' + route, link))
            if target.netloc != 'example.org':
                continue
            assert target.path.startswith(prefix + '/'), (file, link)
            path = out / unquote(target.path[len(prefix):]).lstrip('/')
            if target.path.endswith('/'):
                path /= 'index.html'
            assert path.is_file(), (file, link, path)


def http_smoke(out, run, routes=None):
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    # Binding claims the explicit port atomically; never attach to an existing server.
    server = None
    for port in (14237, 14238, 14239):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), partial(QuietHandler, directory=str(out)))
            break
        except OSError:
            continue
    assert server, 'No isolated preview port available'
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    checked = []
    try:
        for route in routes or ['/', '/field-notes/', '/field-notes/tags/',
                      '/field-notes/tags/science/quantum/basics/',
                      '/field-notes/tags/u-e9878fe5ad90/u-e59fbae7a180/', '/field-notes/alpha/',
                      '/lab-notes/alpha/', '/lab-notes/tags/science/quantum/basics/',
                      '/journal/page/2/', '/field-notes/page/3/',
                      '/field-notes/tags/page/2/', '/lab-notes/page/2/']:
            with urlopen(f'http://127.0.0.1:{port}' + quote(route), timeout=5) as response:
                assert response.status == 200
                assert response.read() == html(out, route).read_bytes()
            checked.append(route)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (run / 'http-preview.txt').write_text(f'PASS isolated 127.0.0.1:{port}; stopped after check\n' + '\n'.join(checked) + '\n')
    print('PASS HTTP preview on explicit port', port, '(stopped)')


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='p1b-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    baseline = build(ROOT, run, 'baseline')
    check_baseline(baseline)
    tag_checks(baseline, 'field-notes', FIELD, ['alpha', 'beta', 'gamma', 'delta', 'epsilon'])
    tag_checks(baseline, 'lab-notes', LAB, ['alpha', 'beta', 'gamma', 'delta', 'storage/epsilon'])
    local_links(baseline)
    for owner, direct in {
        'field-notes': {'alpha': ['science/quantum/basics', 'science/quantum/experiments'],
                        'beta': ['science/quantum', 'science/quantum/basics'],
                        'gamma': ['shared'], 'delta': [],
                        'epsilon': ['math/graphs', 'u-e9878fe5ad90/u-e59fbae7a180', 'field-work/lab']},
        'lab-notes': {'alpha': ['science/quantum/basics', 'shared'],
                      'beta': ['science/quantum/experiments'], 'gamma': ['shared'],
                      'delta': [], 'storage/epsilon': ['math/graphs']},
    }.items():
        for note, tags in direct.items():
            actual = Page(html(baseline, owner + '/' + note)).links['assigned-tags']
            same_links([unquote(a) for a in actual], [f'/{owner}/tags/{t}/' for t in tags])
    for owner, target in [('field-notes', 'lab-notes'), ('lab-notes', 'field-notes')]:
        note = Page(html(baseline, owner + '/alpha'))
        assert f'../../{target}/alpha/' in note.assets
        same_links(Page(html(baseline, target + '/alpha')).collection_links, [f'/{target}/'])
    assert not (baseline / 'tags').exists() and not (baseline / 'journal/tags').exists()
    expected_routes = {f'{owner}/tags/{slug + "/" if slug else ""}index.html'
                       for owner, terms in [('field-notes', FIELD), ('lab-notes', LAB)]
                       for slug in ['', *terms]}
    expected_routes.update({'field-notes/tags/page/2/index.html',
                            'field-notes/tags/page/3/index.html',
                            'lab-notes/tags/page/2/index.html'})
    actual_routes = {p.relative_to(baseline).as_posix() for p in baseline.rglob('*.html')
                     if View(p).owner is not None}
    assert actual_routes == expected_routes, (actual_routes, expected_routes)
    second = build(ROOT, run, 'determinism')
    assert snapshot(baseline) == snapshot(second), 'Outputs differ between fresh builds'
    http_smoke(baseline, run)
    subpath = build(ROOT, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    local_links(subpath, '/preview')
    view = View(html(subpath, '/field-notes/tags/science/quantum/basics/'))
    assert view.owner == '/preview/field-notes/'
    assert view.nav['Collection'] == ['/preview/field-notes/']
    assert view.nav['Tag ancestors'] == ['/preview/field-notes/tags/' + p for p in
        ['', 'science/', 'science/quantum/', 'science/quantum/basics/']]


    source = copy_site(run, 'positive')
    shutil.copytree(ROOT / 'tests/fixtures/annex', source / 'content/lab-notes/annex')
    file = source / 'content/lab-notes/annex/storage/probe/index.md'
    file.write_text(file.read_text().replace('\n+++\nA content', '\n[params]\ntags = ["science/quantum/basics", "shared"]\n+++\nA content'))
    # Namespace separation: ordinary article/section names can equal tag labels.
    write_note(source, 'field-notes/science/index.md', ['science', 'tags', 'shared/basics'])
    write_note(source, 'field-notes/storage/tags/index.md', ['shared/basics'])
    (source / 'content/field-notes/storage/_index.md').write_text('+++\ntitle = "Storage"\n+++\n')
    (source / 'content/field-notes/alpha/resource-note.md').write_text('+++\n[params]\ntags = ["resource/only"]\n+++\nLeaf resource, not a note.\n')
    # A YAML note exercises the other native metadata syntax, including whitespace normalization.
    (source / 'content/field-notes/yaml.md').write_text('---\ntitle: YAML edge\nparams:\n  tags: [" FIELD WORK / lab "]\n---\nSynthetic.\n')
    write_note(source, 'field-notes/unicode.md', ['café', 'cafe\u0301'])
    positive = build(source, run, 'positive')
    ext = {k: list(v) for k, v in FIELD.items()}
    ext['science'].append('science')
    ext.update({'u-636166c3a9': ['unicode'], 'u-63616665cc81': ['unicode']})
    ext.update({'tags': ['science'], 'shared/basics': ['science', 'storage/tags']})
    ext['shared'] += ['science', 'storage/tags']
    ext['field-work'].append('yaml'); ext['field-work/lab'].append('yaml')
    tag_checks(positive, 'field-notes', ext,
               ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'science', 'storage/tags', 'yaml', 'unicode'])
    tag_checks(positive, 'lab-notes', LAB, ['alpha', 'beta', 'gamma', 'delta', 'storage/epsilon'])
    annex = {k: ['storage/probe'] for k in ['science', 'science/quantum', 'science/quantum/basics', 'shared']}
    tag_checks(positive, 'lab-notes/annex', annex, ['storage/probe'])
    local_links(positive)
    assert not (positive / 'field-notes/tags/resource').exists()
    assert snapshot(source / THEME / 'layouts') == snapshot(ROOT / THEME / 'layouts')
    assert (source / 'hugo.toml').read_bytes() == (ROOT / 'hugo.toml').read_bytes()

    # Document, rather than hide, the route-inventory/publication boundary.
    source = copy_site(run, 'draft-boundary')
    write_note(source, 'field-notes/draft.md', ['draft-only'], 'draft = true')
    draft = build(source, run, 'draft-boundary')
    assert not html(draft, '/field-notes/draft/').exists()
    assert View(html(draft, '/field-notes/tags/draft-only/')).count == 0
    assert 'draft-only' not in View(html(draft, '/field-notes/tags/')).tree
    with_draft = build(source, run, 'draft-enabled', flags=('--buildDrafts',))
    assert View(html(with_draft, '/field-notes/tags/draft-only/')).count == 1
    assert Page(html(with_draft, '/field-notes/tags/draft-only/')).links['articles'] == ['/field-notes/draft/']

    negatives = {
        'empty': ([''], 'malformed tag segment'),
        'leading-slash': (['/science'], 'malformed tag segment'),
        'trailing-slash': (['science/'], 'malformed tag segment'),
        'empty-segment': (['science//basics'], 'malformed tag segment'),
        'dot': (['science/../basics'], 'malformed tag segment'),
        'backslash': (['science\\basics'], 'malformed tag segment'),
        'control': (['science\tbasics'], 'malformed tag segment'),
        'punctuation-only': (['!!!'], 'empty or reserved tag slug'),
        'reserved-pagination': (['science/page'], 'empty or reserved tag slug'),
        'space-hyphen-collision': (['a b', 'a-b'], 'tag slug collision'),
        'unicode-encoding-collision': (['量子', 'u-e9878fe5ad90'], 'tag slug collision'),
        'punctuation-collision': (['C++', 'C#'], 'tag slug collision'),
        'ancestor-collision': (['a b/one', 'a-b/two'], 'tag slug collision'),
        'wrong-type': ('science', 'tags must be an array'),
        'non-string': ([42], 'tag must be a string'),
    }
    for label, (tags, diagnostic) in negatives.items():
        source = copy_site(run, label)
        write_note(source, 'field-notes/invalid.md', tags)
        build(source, run, label, 'P1B ' + diagnostic)
    for label, path in [('article-conflict', 'field-notes/tags/index.md'),
                        ('section-conflict', 'field-notes/tags/_index.md'),
                        ('case-source-conflict', 'field-notes/Tags.md'),
                        ('page-source-conflict', 'field-notes/page/index.md')]:
        source = copy_site(run, label)
        write_note(source, path, [])
        build(source, run, label, 'P1B reserved notebook source namespace')
    for label, extra, diagnostic in [
        ('url-conflict', 'url = "/field-notes/tags/science/"', 'reserved notebook route namespace'),
        ('alias-conflict', 'aliases = ["/field-notes/tags/science/"]', 'alias in reserved notebook route namespace'),
        ('relative-alias-conflict', 'aliases = ["../field-notes/tags/unclaimed/"]', 'alias in reserved notebook route namespace'),
        ('slug-conflict', 'slug = "tags"', 'reserved notebook route namespace'),
        ('page-url-conflict', 'url = "/field-notes/page/2/"', 'reserved notebook route namespace'),
    ]:
        source = copy_site(run, label)
        write_note(source, 'lab-notes/conflict.md', [], extra)
        build(source, run, label, 'P1B ' + diagnostic)

    source = copy_site(run, 'static-conflict')
    conflict = source / 'static/field-notes/tags/science/index.html'
    conflict.parent.mkdir(parents=True)
    conflict.write_text('Must not overwrite a tag view')
    build(source, run, 'static-conflict', 'P1B reserved notebook static namespace')

    source = copy_site(run, 'owner-route')
    root = source / 'content/field-notes/_index.md'
    root.write_text(root.read_text().replace("title = 'Field notes'", "title = 'Field notes'\nurl = '/elsewhere/'"))
    build(source, run, 'owner-route', 'P1B notebook route must follow its content path')
    source = copy_site(run, 'unsupported-frontmatter')
    (source / 'content/field-notes/json.md').write_text('{"title": "JSON note", "params": {"tags": ["new"]}}\nBody')
    build(source, run, 'unsupported-frontmatter', 'P1B discovery requires TOML or YAML front matter')

    # Reproduce the adapter lifecycle constraint without relying on prose alone.
    source = copy_site(run, 'lifecycle')
    (source / 'content/_content.gotmpl').write_text('{{ $pages := .Site.Pages }}')
    build(source, run, 'lifecycle', 'this method cannot be called before the site is fully initialized')
    summary = 'PASS P1-B: routes, membership/counts, ancestor/tree links, collection context, isolation, Unicode, normalization, collisions, deterministic output, and adapter lifecycle rejection. P1-03/04 are checked separately by check_p1c.py.\n'
    (run / 'result.txt').write_text(summary)
    print(summary, end='')


if __name__ == '__main__':
    main()
