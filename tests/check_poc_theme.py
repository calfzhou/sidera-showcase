"""Active-theme packaging invariants and historical bundled-skeleton comparison.
Also verifies the Sidera submodule handoff and local theme edits.
No downloads; only synthetic .checks copies are modified.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urljoin, urlparse

sys.dont_write_bytecode = True
from check_p1a import ROOT, THEME, COLLECTIONS, article_route, check_baseline, snapshot
from check_p1b import build, copy_site, html, http_smoke, tag_checks, FIELD, LAB
from check_p1c import baseline_checks


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


def skeleton_checks(out, samples):
    article_routes = ['/about/'] + [article_route(owner, name)
        for owner, (_, _, names) in COLLECTIONS.items() for name in names]
    for route in article_routes:
        file = html(out, route)
        assert file.is_file(), route
        if route != '/about/':
            assert 'This is the synthetic <strong>' in file.read_text(), route
    for name in ('sample.py', 'sample.svg'):
        assert (out / 'field-notes/alpha' / name).read_bytes() == (ROOT / 'content/field-notes/alpha' / name).read_bytes()
    assert not (out / 'field-notes/tags').exists()
    assert not (out / 'field-notes/page').exists()
    assert not (out / 'field-notes/alpha/resource-note/index.html').exists()
    home = Scan(html(out, '/'))
    expected = article_routes + ([f'/posts/post-{i}/' for i in range(1, 4)] if samples else [])
    assert set(home.titles) == set(expected), home.titles
    lab = Scan(html(out, '/lab-notes/'))
    assert '/lab-notes/storage/' in lab.titles
    assert '/lab-notes/storage/epsilon/' not in lab.titles
    field = Scan(html(out, '/field-notes/'))
    assert field.titles[0] == '/field-notes/epsilon/', field.titles
    assert 'Field team' not in html(out, '/field-notes/alpha/').read_text()
    assert Scan(html(out, '/about/')).dates[0].startswith('0001-01-01')
    missing = missing_targets(out)
    # Bundle-relative links survive on article pages, but not necessarily in excerpts.
    assert not [m for m in missing if m['page'] in article_routes]
    assert any(m['page'] == '/field-notes/' and m['resolved'] == '/field-notes/sample.svg' for m in missing)
    return {'article_routes_preserved': len(article_routes), 'home_article_count': len(home.titles),
            'field_list': field.titles, 'lab_list': lab.titles,
            'about_date': Scan(html(out, '/about/')).dates,
            'missing_local_targets': missing, 'home_anchors_without_href': home.empty_anchors}


def original_scope(source):
    """Omit ONLY new P2-W inputs for frozen themes; preserve their exact P1 proof."""
    for file in (source/'content').rglob('*.md'):
        text=file.read_text().replace('[params.sidera]', '[params]').replace('[cascade.params.sidera]', '[cascade.params]')
        # Frozen discovery reads raw params.tags, unlike current native input.
        tags=re.search(r'^tags\s*=.*$',text,re.M)
        if tags:
            text=text[:tags.start()]+text[tags.end()+1:]
            if '[params]\n' in text: text=text.replace('[params]\n','[params]\n'+tags[0]+'\n',1)
            else: text=text.replace('\n+++\n','\n[params]\n'+tags[0]+'\n+++\n',1)
        # Historic root defaults were native cascade. Do not alter frozen theme readers.
        if file.name=='_index.md':
            fields=re.findall(r"^(?:byline|show_updated) = [^\n]+\n",text,re.M)
            if fields:
                text=re.sub(r"^(?:byline|show_updated) = [^\n]+\n",'',text,flags=re.M)
                text=text.replace('\n+++\n',"\n[cascade.target]\nkind='page'\n[cascade.params]\n"+''.join(fields)+'+++\n',1)
        file.write_text(text)
    config = source / 'hugo.toml'
    text = config.read_text().split('# Consumer opt-in only;')[0].replace("disableKinds = ['RSS']", "disableKinds = ['taxonomy', 'term', 'RSS']")
    config.write_text(text + "\n[[module.mounts]]\nsource='content'\ntarget='content'\nfiles=['! guidebook/**']\n")


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='poc-theme-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    assert not (ROOT / 'layouts').exists(), 'Site templates would mask theme coverage'
    assert not (ROOT / 'content/_content.gotmpl').exists()
    skeleton_before = snapshot(ROOT / 'themes/skeleton')
    baseline = build(ROOT, run, 'poc')
    check_baseline(baseline)

    # D-015: visual-byte equality was a one-time seed check (bd5dd82).
    # Preserve the untouched PoC as evidence; compare behavior, not its old UI.
    poc_before = snapshot(ROOT / 'themes/poc')
    legacy_source = copy_site(run, 'legacy-poc')
    original_scope(legacy_source)
    legacy = build(legacy_source, run, 'legacy-poc', flags=('--theme', 'poc'))
    for output in (baseline, legacy):
        check_baseline(output, docs=(output == baseline))
        baseline_checks(output)  # exact ordering/pager chains, policies, local targets
        tag_checks(output, 'field-notes', FIELD, COLLECTIONS['field-notes'][2])
        tag_checks(output, 'lab-notes', LAB, COLLECTIONS['lab-notes'][2])
    assert {p for p in snapshot(baseline) if p.endswith('.html') and not p.startswith(('guidebook/', 'sidera/', 'tags/', 'categories/')) and not any(p.startswith(o+'/categories/') for o in COLLECTIONS) and not p.startswith(('journal/tags/', 'dispatches/tags/'))} == {
        p for p in snapshot(legacy) if p.endswith('.html')}, 'Theme changed HTML routes'

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
    (inline / THEME / 'content/_content.gotmpl').rename(inline / 'content/_content.gotmpl')
    # Active theme assets now participate in the packaging equivalence check too.
    (inline / THEME / 'assets').rename(inline / 'assets')
    (inline / THEME / 'i18n').rename(inline / 'i18n')
    config = inline / 'hugo.toml'
    config.write_text(config.read_text().replace("theme = 'sidera'\n", ''))
    previous = build(inline, run, 'in-place')
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

    stock = copy_site(run, 'skeleton-stock')
    original_scope(stock)
    stock_out = build(stock, run, 'skeleton-stock', flags=('--theme', 'skeleton'))
    results = {'packaging_byte_identical': True, 'retained_poc_functional_invariants': True,
               'seed_visual_equality': 'retired intentionally in P2-A; historical bd5dd82 evidence retained',
               'local_theme_edits_effective': True, 'optional_site_override': True,
               'skeleton_stock': skeleton_checks(stock_out, samples=True)}

    # Park starter demo content outside this scratch source; never delete it or edit the original theme.
    clean = copy_site(run, 'skeleton-content-only')
    (clean / 'themes/skeleton/content').rename(run / 'retained-skeleton-demo-content')
    original_scope(clean)
    clean_out = build(clean, run, 'skeleton-content-only', flags=('--theme', 'skeleton'))
    results['skeleton_content_only'] = skeleton_checks(clean_out, samples=False)

    # Config-only contrast: skeleton supports native GLOBAL tags, not notebook unions.
    config = clean / 'hugo.toml'
    config.write_text(config.read_text().replace("disableKinds = ['taxonomy', 'term', 'RSS']", "disableKinds = ['RSS']"))
    native = build(clean, run, 'skeleton-native-tags', flags=('--theme', 'skeleton'))
    basics = Scan(html(native, '/tags/science/quantum/basics/')).titles
    assert set(basics) == {'/field-notes/alpha/', '/field-notes/beta/', '/lab-notes/alpha/'}, basics
    assert not html(native, '/tags/science/').exists(), 'Unexpected automatic ancestor term'
    assert not (native / 'field-notes/tags').exists()
    results['native_tags'] = {'basics_members': basics, 'implicit_science_ancestor': False}
    http_smoke(clean_out, run, routes=['/', '/about/', '/field-notes/alpha/', '/lab-notes/storage/epsilon/'])
    assert snapshot(ROOT / 'themes/skeleton') == skeleton_before
    assert snapshot(ROOT / 'themes/poc') == poc_before
    (run / 'results.json').write_text(json.dumps(results, indent=2, ensure_ascii=False))
    print('PASS Sidera/PoC functional invariants, local theme edits, packaging, optional override and measured skeleton gaps.')


if __name__ == '__main__':
    main()
