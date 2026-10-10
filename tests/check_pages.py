"""Inspect the real production Pages artifact, not a rewritten root-host fixture.
Usage: python3 tests/check_pages.py /absolute/build/public
Standard library only; no network calls or content execution.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json
import re
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://calfzhou.github.io/sidera-showcase/'
PREFIX = '/sidera-showcase/'


class DOM(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.nodes = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.nodes.append((tag, dict(attrs)))


def main():
    out = Path(sys.argv[1]).resolve()
    config = tomllib.loads((ROOT / 'hugo.toml').read_text())
    assert config['baseURL'] == BASE
    assert config['params']['giscus']['repo'] == 'calfzhou/sidera-showcase'
    assert not (out / 'CNAME').exists()
    assert not (ROOT / 'content/sidera').exists(), 'Manual must remain theme-owned'
    assert config['module']['mounts'] == [
        {'source': 'content', 'target': 'content'},
        {'source': 'themes/sidera/docs/content', 'target': 'content/sidera'},
    ]
    assert config['params']['giscus']['strict'] is True
    assert (out / '404.html').is_file()
    forbidden = {'.git', '.checks', '__pycache__', 'tests', 'fixtures', 'node_modules',
                 '.obsidian', '_templates', 'AGENTS.md', 'CLAUDE.md', 'README.md',
                 'hugo.toml', '.gitmodules', '.hugo_build.lock', 'CNAME'}
    for file in out.rglob('*'):
        assert not set(file.relative_to(out).parts) & forbidden, file
    for route in ('field-notes', 'lab-notes', 'dispatches', 'guidebook', 'posts'):
        assert not (out / route).exists(), f'Test/starter source leaked: {route}'

    doms = {p: DOM(p.read_text()) for p in out.rglob('*.html')}
    checked = 0
    fragments = 0

    def target(url, page_url, fragment=False):
        nonlocal checked, fragments
        parsed = urlsplit(urljoin(page_url, url))
        if parsed.scheme not in ('http', 'https') or parsed.netloc != urlsplit(BASE).netloc:
            return None
        path = unquote(parsed.path)
        assert path.startswith(PREFIX), (page_url, url, 'outside project prefix')
        dest = out / path[len(PREFIX):]
        if path.endswith('/'):
            dest /= 'index.html'
        assert dest.is_file(), (page_url, url, 'missing file')
        checked += 1
        if fragment and parsed.fragment and dest.suffix == '.html':
            ids = {a.get('id') for _, a in doms[dest].nodes}
            # Highlight navigation relies on native IDs; non-HTML fragments are opaque.
            assert unquote(parsed.fragment) in ids, (page_url, url, 'missing anchor')
            fragments += 1
        return dest

    for file, dom in doms.items():
        route = BASE + file.relative_to(out).as_posix().removesuffix('index.html')
        text = file.read_text()
        assert 'fixture/comments' not in text and 'gocalf.com/discussions' not in text
        for tag, attrs in dom.nodes:
            for key in ('href', 'src', 'poster', 'data-index', 'data-worker', 'data-mermaid', 'data-drawio', 'data-frame'):
                if attrs.get(key):
                    target(attrs[key], route, fragment=(tag == 'a' and key == 'href'))
            if 'srcset' in attrs:
                for candidate in attrs['srcset'].split(','):
                    target(candidate.strip().split()[0], route)
    # CSS font/image references are relative to each fingerprinted stylesheet.
    for file in out.rglob('*.css'):
        for url in re.findall(r'url\(\s*[\'"]?([^\s\)\'"]+)', file.read_text()):
            if not url.startswith(('data:', '#')):
                target(url, BASE + file.relative_to(out).as_posix())

    home = doms[out / 'index.html']
    hrefs = {a.get('href') for _, a in home.nodes}
    for route in ('journal/', 'notes/', 'handbook/', 'sidera/', 'about/'):
        assert PREFIX + route in hrefs, route
    search = next(a for _, a in home.nodes if 'data-sidera-search' in a)
    index = json.loads(target(search['data-index'], BASE).read_text())
    # Current Sidera bundles search-core + search on the page; it has no Worker.
    script = target(search['src'], BASE)
    assert script.suffix == '.js'
    if search.get('data-worker'):
        target(search['data-worker'], BASE)
    docs = index['documents']
    assert len(docs) == 61, len(docs)
    assert sum(d['url'].startswith(PREFIX + 'sidera/') for d in docs) == 25
    for doc in docs:
        target(doc['url'], BASE)
        for section in doc['sections']:
            if section['id']:
                target(doc['url'] + '#' + section['id'], BASE, fragment=True)
        assert not any(part in doc['url'] for part in ('/tests/', '/fixtures/', '/preset/', '/archives/'))

    theme = ROOT / 'themes/sidera'
    manual_sources = list((theme / 'docs/content').rglob('*.md'))
    assert len(manual_sources) == 25
    for source in manual_sources:
        rel = source.relative_to(theme / 'docs/content')
        route = rel.parent if source.stem in ('index', '_index') else rel.with_suffix('')
        file = out / 'sidera' / route / 'index.html'
        text = file.read_text()
        nodes = doms[file].nodes
        assert 'ai-label' in text and ('AI-generated' in text or 'AI 生成' in text)
        assert 'Original Sidera documentation:' in text and 'MIT' in text
        assert not any('data-sidera-giscus' in a for _, a in nodes)
        assert not any('/authors/' in a.get('href', '') for _, a in nodes), file
    for name, source in [('sidera-mit.txt', 'LICENSE'), ('sidera-third-party.txt', 'THIRD-PARTY-NOTICES.md')]:
        assert (out / 'licenses' / name).read_bytes() == (theme / source).read_bytes()

    article = out / 'journal/2026/04/14/connect-the-useful-parts/index.html'
    attrs = [a for _, a in doms[article].nodes]
    assert any(a.get('href') == PREFIX + 'authors/rowan/' for a in attrs)
    assert any(a.get('href') == PREFIX + 'journal/series/making-notes/' for a in attrs)
    giscus = next(a for a in attrs if 'data-sidera-giscus' in a)
    assert giscus['data-repo'] == 'calfzhou/sidera-showcase'
    assert giscus['data-term'] == 'sidera-showcase/journal/2026/04/14/connect-the-useful-parts/'
    assert giscus['data-repo-id'] == config['params']['giscus']['repo_id']
    assert giscus['data-category-id'] == config['params']['giscus']['category_id']
    assert any(a.get('href') == PREFIX for _, a in doms[out / '404.html'].nodes)

    chart = doms[out / 'handbook/reference/charts/index.html']
    assert sum('data-sidera-chart' in a for _, a in chart.nodes) == 8
    controller = next(a for _, a in chart.nodes if 'data-sidera-charts-script' in a)
    assert controller['data-frame'].startswith(PREFIX + 'charts/')
    assert 'data-sidera-charts-script' not in (out / 'sidera/authoring/charts/index.html').read_text()

    # Representative public attachments are intentional, byte-preserved resources.
    for route in ('notes/code-inclusion/pairs.py', 'handbook/reference/diagrams/flow.drawio',
                  'handbook/reference/video/motion.mp4',
                  'handbook/reference/charts/charts/monthly.json',
                  'handbook/reference/charts/charts/scatter.json',
                  'handbook/reference/charts/data/monthly.json'):
        assert (out / route).read_bytes() == (ROOT / 'content' / route).read_bytes()
    print(f'PASS Pages artifact: {len(doms)} HTML files, {checked} local references, '
          f'{fragments} fragments, {len(docs)} search documents, 25 manual nodes; '
          'native authors/series, comments isolation, licenses, resources and 404')


if __name__ == '__main__':
    main()
