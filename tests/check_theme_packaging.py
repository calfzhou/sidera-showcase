"""Active-theme packaging invariants, native overrides and effective local edits.
Also verifies the Sidera submodule handoff and local theme edits.
No downloads; only synthetic .checks copies are modified.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import shutil
import os
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urljoin, urlparse

sys.dont_write_bytecode = True
from check_organization import ORGANIZATION, ROOT, THEME, COLLECTIONS, article_route, check_baseline, snapshot
from check_tag_routes import build, copy_site as copy_fixture, html, http_smoke, tag_checks, FIELD, LAB
from check_ordering import baseline_checks


def copy_site(run, label):
    return copy_fixture(run, label)


class Scan(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.main = False
        self.h2 = False
        self.titles = []
        self.dates = []
        self.targets = []
        self.empty_anchors = 0
        self.feed(file.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'main':
            self.main = True
        if self.main and tag == 'h2':
            self.h2 = True
        if self.main and tag == 'time':
            self.dates.append(attrs.get('datetime'))
        if tag == 'a' and not attrs.get('href'):
            self.empty_anchors += 1
        if self.main and self.h2 and tag == 'a' and attrs.get('href'):
            self.titles.append(attrs['href'])
        for attr in ('href', 'src'):
            if attrs.get(attr):
                self.targets.append(attrs[attr])

    def handle_endtag(self, tag):
        if tag == 'main':
            self.main = False
        if tag == 'h2':
            self.h2 = False


def missing_targets(out):
    missing = []
    for file in out.rglob('*.html'):
        route = '/' + file.relative_to(out).as_posix().removesuffix('index.html')
        for link in Scan(file).targets:
            url = urlparse(urljoin('https://example.org' + route, link))
            if url.netloc != 'example.org' or url.scheme not in ('http', 'https'):
                continue
            path = out / unquote(url.path).lstrip('/')
            if url.path.endswith('/'):
                path /= 'index.html'
            if not path.is_file():
                missing.append({'page': route, 'link': link, 'resolved': url.path})
    return missing


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='theme-packaging-', dir=ROOT / '.checks'))
    run.mkdir(parents=True, exist_ok=True)
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    assert not (ORGANIZATION / 'layouts').exists(), 'Fixture templates would mask theme coverage'
    assert not (ROOT / 'content/_content.gotmpl').exists()
    baseline_source = copy_site(run, 'baseline')
    baseline = build(baseline_source, run, 'sidera')
    check_baseline(baseline)

    # Retain every active-theme semantic assertion from the former comparison.
    baseline_checks(baseline)
    tag_checks(baseline, 'field-notes', FIELD, COLLECTIONS['field-notes'][2])
    tag_checks(baseline, 'lab-notes', LAB, COLLECTIONS['lab-notes'][2])

    # A theme working-tree edit must affect output without Git commit/push.
    edited = copy_site(run, 'local-theme-edit')
    template = edited / THEME / 'layouts/_partials/article.html'
    template.write_text(template.read_text().replace('data-renderer="shared-article"',
                                                    'data-renderer="local-theme-edit"'))
    edited_out = build(edited, run, 'local-theme-edit')
    assert 'data-renderer="local-theme-edit"' in html(edited_out, '/about/').read_text()
    assert 'data-renderer="shared-article"' in html(baseline, '/about/').read_text()

    # Reconstruct the previous in-place layout in a COPY, retaining all files.
    inline = copy_site(run, 'in-place')
    (inline / THEME / 'layouts').rename(inline / 'layouts')
    shutil.copytree(inline / THEME / 'content', inline / 'content', dirs_exist_ok=True)
    (inline / THEME / 'data').rename(inline / 'data')
    # Active theme assets now participate in the packaging equivalence check too.
    (inline / THEME / 'assets').rename(inline / 'assets')
    (inline / THEME / 'i18n').rename(inline / 'i18n')
    config = inline / 'hugo.toml'
    config.write_text(config.read_text().replace("theme = 'sidera'\n", ''))
    previous = build(inline, run, 'in-place', flags=('--config', 'themes/sidera/hugo.toml,hugo.toml'))
    def markup(source, flags=()):
        result = subprocess.check_output(['hugo','config','--source',str(source),'--format','json',*flags], text=True, timeout=20)
        return json.loads(result)['markup']
    assert markup(baseline_source) == markup(inline, ('--config','themes/sidera/hugo.toml,hugo.toml'))
    assert snapshot(baseline) == snapshot(previous), 'Packaging changed published bytes'

    # An optional site template overrides the corresponding theme template.
    override = copy_site(run, 'override')
    (override / 'layouts').mkdir()
    (override / 'layouts/_partials').mkdir()
    template = (override / THEME / 'layouts/_partials/article.html').read_text()
    (override / 'layouts/_partials/article.html').write_text(template.replace('data-renderer="shared-article"', 'data-renderer="site-override"'))
    custom = build(override, run, 'override')
    assert 'data-renderer="site-override"' in html(custom, '/field-notes/alpha/').read_text()
    assert snapshot(override / THEME) == snapshot(ROOT / THEME)

    results = {'packaging_byte_identical': True, 'active_functional_invariants': True,
               'local_theme_edits_effective': True, 'optional_site_override': True}
    http_smoke(baseline, run, routes=['/', '/about/', '/field-notes/alpha/', '/lab-notes/storage/epsilon/'])
    (run / 'results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print('PASS Sidera functional invariants, local theme edits, packaging, optional override.')


if __name__ == '__main__':
    main()
