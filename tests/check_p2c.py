"""P2-C native localization, complete P1 contracts in both UIs, bilingual isolation.
Only installed Hugo/Python; optional installed Node/Chrome via the existing harness.
Outputs stay beneath a new SIDERA_CHECK_DIR (or timestamped .checks directory).
"""
from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import json
import os
import re
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
from check_p1a import ROOT, THEME, Page, check_baseline, COLLECTIONS, snapshot
from check_p1b import FIELD, LAB, View, build, copy_site, html, tag_checks, local_links
from check_p1c import baseline_checks, check_list

FIXTURES = ROOT / 'tests/fixtures/i18n'
HOSTILE = 'A <img src=x onerror=alert(1)> & "quoted" \'name\' $1'


def configure(source, name):
    (source / 'locale.toml').write_text((FIXTURES / (name + '.toml')).read_text())
    return ('--config', 'hugo.toml,locale.toml')


def translated_fixture(source):
    """Small actual filename-translation fixture, not wholesale body translation."""
    c = source / 'content'
    for rel in ['_index.md', 'about.md', 'field-notes/_index.md', 'lab-notes/_index.md']:
        f = c / rel
        text = f.read_text()
        if rel == 'field-notes/_index.md':
            text = text.replace("title = 'Field notes'", 'title = ' + json.dumps(HOSTILE))
            text = text.replace('page_size = 2', 'page_size = 1')
        f.with_suffix('.zh.md').write_text(text)
    # Same logical alpha path, different tags, dates and pin; catches cross-site caches.
    for owner, names in [('field-notes', ['alpha', 'zh-only']), ('lab-notes', ['alpha'])]:
        for name in names:
            f = c / owner / name / 'index.zh.md'
            f.parent.mkdir(parents=True, exist_ok=True)
            tags = ['science/local'] if name == 'alpha' else ['中文/专属']
            f.write_text('+++\ntitle = "Chinese fixture ' + name + '"\n'
                         'date = 2024-02-03T09:00:00+08:00\n'
                         'lastmod = 2024-04-05T09:00:00+08:00\n'
                         'tags = ' + json.dumps(tags, ensure_ascii=False) + '\n[params]\n'
                         'pinned = ' + ('true' if name == 'zh-only' else 'false') + '\n+++\n'
                         'Synthetic Chinese-language page; authored text stays untouched.\n\n'
                         '## Reading\n\n普通中文与 English prose。\n')
    # Chinese-only leaf: default-language Markdown resource must NOT become an EN note.
    (c / 'field-notes/zh-only/resource.md').write_text('+++\ntags=["resource-leak"]\n+++\nResource.\n')
    # A translated nested owner must not leak into its outer collection.
    f = c / 'lab-notes/annex/_index.zh.md'; f.parent.mkdir(parents=True)
    f.write_text('+++\ntitle="Nested Chinese notebook"\npreset="notes"\n[params]\nscope_root=true\n\n+++\n')
    (f.parent / 'only.zh.md').write_text('---\ntitle: Nested note\ntags: [science/local]\n---\n')
    # English explicit language suffix exercises both explicit and default filenames.
    f = c / 'field-notes/beta/index.md'
    f.rename(f.with_suffix('.en.md'))


def bilingual_checks(out, prefix=''):
    baseline_checks(out, prefix)
    # baseline_checks validates all local links, including Chinese routes.
    zh = prefix + '/zh'
    for owner, names, size in [('field-notes', ['zh-only', 'alpha'], 1), ('lab-notes', ['alpha'], 3),
                               ('lab-notes/annex', ['only'], 10)]:
        order = 'title' if owner == 'lab-notes' else 'modification'
        routes = [f'{zh}/{owner}/{n}/' for n in names]
        for view in ['', 'tags/']:
            check_list(out, f'/zh/{owner}/' + view,
                       [f'/zh/{owner}/{n}/' for n in names], order, size, prefix=prefix)
        # Exact language-local shared tag membership and ancestry.
        for term in ['science', 'science/local']:
            path = f'/zh/{owner}/tags/{term}/'
            v = View(html(out, path))
            member = 'only' if owner.endswith('annex') else 'alpha'
            assert v.count == 1 and v.owner == f'{zh}/{owner}/'
            assert v.nav['Collection'] == [f'{zh}/{owner}/']
            assert v.nav['Tag ancestors'] == [f'{zh}/{owner}/tags/'] + [
                f'{zh}/{owner}/tags/{"/".join(term.split("/")[:i])}/' for i in range(1, len(term.split('/'))+1)]
            check_list(out, path, [f'/zh/{owner}/{member}/'], order, size, prefix=prefix)
        assert not html(out, f'/zh/{owner}/tags/science/quantum/').exists()
    assert not html(out, '/field-notes/zh-only/').exists()
    assert not html(out, '/field-notes/tags/science/local/').exists()
    assert not html(out, '/field-notes/tags/resource-leak/').exists()
    assert not html(out, '/zh/field-notes/tags/resource-leak/').exists()
    assert not html(out, '/zh/field-notes/beta/').exists() # No manufactured translation.
    v = View(html(out, '/zh/field-notes/tags/'))
    assert v.tree == {'science': 1, 'science/local': 1, '中文': 1, '中文/专属': 1}, v.tree
    a = Page(html(out, '/zh/field-notes/alpha/'))
    assert a.article['data-collection'] == zh + '/field-notes/'
    assert a.byline == 'Field team' and a.updated
    assert a.times['published'] == '2024-02-03T09:00:00+08:00'
    assert a.times['updated'] == '2024-04-05T09:00:00+08:00'
    raw = html(out, '/zh/field-notes/alpha/').read_text()
    assert '<img src=x' not in raw and HOSTILE in unescape(raw)
    assert '浏览「' + HOSTILE + '」的全部标签' in unescape(raw)
    assert '<html lang="zh-CN">' in raw and '发表于 2024年2月3日' in raw
    assert '<h1>标签</h1>' in html(out, '/zh/field-notes/tags/').read_text()
    assert '<h1>Tags</h1>' in html(out, '/field-notes/tags/').read_text()


class Messages(HTMLParser):
    def __init__(self, file):
        super().__init__(); self.messages = {}; self.current = None; self.injected = []
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'data-key' in a:
            self.current = (a['data-key'], a['data-count']); self.messages[self.current] = ''
        if tag == 'img': self.injected.append(a)
    def handle_data(self, data):
        if self.current: self.messages[self.current] += data
    def handle_endtag(self, tag):
        if tag == 'p': self.current = None


def catalog_probe(source):
    layout = source / 'layouts/home.html'; layout.parent.mkdir(exist_ok=True)
    layout.write_text('''{{ define "main" }}
{{ $catalog := transform.Unmarshal (os.ReadFile "themes/sidera/i18n/en.toml") }}
{{ range $count := slice 0 1 2 12345 }}
  {{ range $key, $message := $catalog }}
    <p data-key="{{ $key }}" data-count="{{ $count }}">{{ T $key (dict "count" $count "number" (lang.FormatNumber 0 $count) "title" $.Site.Params.probe "tag" $.Site.Params.probe "date" (time.Format ":date_medium" (time.AsTime "2024-02-03")) "current" (lang.FormatNumber 0 1234) "total" (lang.FormatNumber 0 12345)) }}</p>
  {{ end }}
{{ end }}
{{ end }}
''')
    with (source / 'hugo.toml').open('a') as f:
        f.write('\n[params]\nprobe = ' + json.dumps(HOSTILE) + '\n')


def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR', ROOT / '.checks' /
               ('frontend-design_' + datetime.now().strftime('%Y%m%d_%H%M%S')))).resolve()
    run.mkdir(parents=True, exist_ok=False)
    print('Retained run:', run, flush=True)
    en_catalog = (ROOT / THEME / 'i18n/en.toml').read_text()
    zh_catalog = (ROOT / THEME / 'i18n/zh-CN.toml').read_text()
    keys = set(re.findall(r'^\[([^]]+)\]', en_catalog, re.M))
    assert keys == set(re.findall(r'^\[([^]]+)\]', zh_catalog, re.M))
    assert len(keys) == 63, keys # Deliberate UI inventory: update alongside I18N.md.
    assert en_catalog.count('other = ') == zh_catalog.count('other = ') == len(keys)
    # Literal call sites plus the four deliberately native dynamic message groups.
    implementation = '\n'.join(p.read_text() for directory in ['layouts', 'content']
                               for p in (ROOT / THEME / directory).rglob('*') if p.is_file())
    used = set(re.findall(r'\bT "([a-z_]+)"', implementation))
    used.update(['collection_blog', 'collection_notebook', 'collection_docs', 'order_publication', 'order_modification',
                 'order_title', 'date_published', 'date_modified', 'date_updated', 'published_undated',
                 'series_order_publication','series_order_weight', 'modified_undated', 'tags', 'categories', 'authors', 'series', 'preset', 'article_count'])
    assert keys == used, (keys-used, used-keys)
    css = (ROOT / THEME / 'assets/css/sidera.css').read_text()
    assert all(not value.strip(" \"'") for value in re.findall(r'(?:^|[;{])\s*content\s*:\s*([^;}]*)', css)), 'CSS must not generate untranslated text'
    assert 'aria-label=' not in css, 'Styles must not depend on translated labels'
    en = copy_site(run, 'baseline')
    baseline = build(en, run, 'baseline', flags=('--printI18nWarnings',))
    zh = copy_site(run, 'chinese')
    flags = configure(zh, 'chinese')
    chinese = build(zh, run, 'chinese', flags=flags + ('--printI18nWarnings',))
    for out in [baseline, chinese]:
        check_baseline(out); baseline_checks(out)
        tag_checks(out, 'field-notes', FIELD, COLLECTIONS['field-notes'][2])
        tag_checks(out, 'lab-notes', LAB, COLLECTIONS['lab-notes'][2])
    assert set(snapshot(baseline)) == set(snapshot(chinese)) # UI never mutates routes/assets.
    for file in baseline.rglob('*.html'):
        rel = file.relative_to(baseline)
        assert Page(file).times == Page(chinese / rel).times, rel
    multi = copy_site(run, 'bilingual'); flags = configure(multi, 'bilingual'); translated_fixture(multi)
    bilingual = build(multi, run, 'bilingual', flags=flags + ('--printI18nWarnings',))
    bilingual_checks(bilingual)
    subpath = build(multi, run, 'subpath', flags=flags + ('--baseURL', 'https://example.org/preview/', '--printI18nWarnings'))
    bilingual_checks(subpath, '/preview')
    repeated = build(multi, run, 'repeated', flags=flags)
    assert snapshot(bilingual) == snapshot(repeated), 'Language/cache output is nondeterministic'
    # Native default-language prefix as well as the secondary language prefix.
    cfg = multi / 'locale.toml'; original = cfg.read_text()
    cfg.write_text("defaultContentLanguageInSubdir = true\n" + original)
    prefixed = build(multi, run, 'both-prefixed', flags=flags + ('--printI18nWarnings',))
    check_list(prefixed, '/en/field-notes/', ['/en/field-notes/'+n+'/' for n in ['alpha','beta','gamma','epsilon','delta']], 'modification', 2)
    check_list(prefixed, '/zh/field-notes/', ['/zh/field-notes/zh-only/','/zh/field-notes/alpha/'], 'modification', 1)
    assert View(html(prefixed, '/en/field-notes/tags/science/')).count == 2
    assert View(html(prefixed, '/zh/field-notes/tags/science/')).count == 1
    local_links(prefixed)
    cfg.write_text(original)
    # Single-language Chinese uses unchanged content; browser can visit both output sets.
    browser_zh = build(zh, run, 'chinese-preview', flags=configure(zh, 'chinese') + ('--baseURL', 'https://example.org/_chinese/', '--printI18nWarnings'))
    baseline_checks(browser_zh, '/_chinese')
    probes = []
    for lang in ['english', 'chinese']:
        source = copy_site(run, 'catalog-' + lang); catalog_probe(source)
        cfg = configure(source, 'chinese') if lang == 'chinese' else ()
        out = build(source, run, 'catalog-' + lang, flags=cfg + ('--printI18nWarnings',))
        messages = Messages(html(out, '/'))
        assert not messages.injected and len(messages.messages) == len(keys) * 4
        assert all(messages.messages.values())
        for count in [0, 1, 2, 12345]:
            number = f'{count:,}'
            expected = f'{number} 篇文章' if lang == 'chinese' else f'{number} article' + ('' if count == 1 else 's')
            assert messages.messages['article_count', str(count)] == expected
            expected_taxonomy = f'{number} 个页面' if lang == 'chinese' else f'{number} page' + ('' if count == 1 else 's')
            assert messages.messages['taxonomy_count', str(count)] == expected_taxonomy
            assert HOSTILE in messages.messages['all_tags_in', str(count)]
            assert HOSTILE in messages.messages['toggle_branch', str(count)]
        assert messages.messages['page_summary','1'] == ('第 1,234 页，共 12,345 页' if lang == 'chinese' else 'Page 1,234 of 12,345')
        assert messages.messages['date_published','1'] == ('发表于 2024年2月3日' if lang == 'chinese' else 'Published Feb 3, 2024')
        probes.append(messages.messages)
    # Each translated message really differs; no silently English Chinese entries.
    assert all(probes[0][k] != probes[1][k] for k in probes[0])
    override = copy_site(run, 'override'); cfg = configure(override, 'bilingual'); translated_fixture(override)
    (override / 'i18n').mkdir()
    (override / 'i18n/zh-CN.toml').write_text('[appearance]\nother = ' + json.dumps(HOSTILE) + '\n[tags]\nother = "自定义标签"\n')
    out = build(override, run, 'override', flags=cfg + ('--printI18nWarnings',))
    raw = html(out, '/zh/field-notes/tags/').read_text()
    assert HOSTILE in unescape(raw) and '<img src=x' not in raw and '<h1>自定义标签</h1>' in raw
    assert '>Appearance</label>' in html(out, '/field-notes/').read_text()
    # Deliberately omit one scratch translation: native default language fallback.
    f = override / THEME / 'i18n/zh-CN.toml'
    f.write_text(re.sub(r'\[recent_explanation\]\nother = [^\n]+\n', '', f.read_text()))
    fallback = build(override, run, 'fallback', flags=cfg)
    assert 'Across this collection, independent of pins.' in html(fallback, '/zh/field-notes/').read_text()
    # Missing-key diagnostic is expected, NOT a weakened strict production build.
    p = override / 'layouts/home.html'; p.parent.mkdir(exist_ok=True)
    p.write_text('{{ define "main" }}{{ T "p2c_intentionally_missing" }}{{ end }}')
    build(override, run, 'missing-key', diagnostic='p2c_intentionally_missing', flags=cfg + ('--printI18nWarnings',))
    # Chinese-language structural validation is still strict, including drafts.
    for label, metadata, diagnostic in [
        ('draft-invalid', 'draft=true\ntags=["bad//tag"]', 'P1B'),
        ('draft-collision', 'draft=true\ntags=["a b", "a-b"]', 'tag slug collision'),
        ('reserved-source', 'tags=[]', 'reserved scoped source namespace'),
        ('reserved-alias', 'aliases=["/field-notes/tags/science/"]\ntags=[]', 'alias in reserved scoped route namespace'),
        ('reserved-route', 'url="/zh/field-notes/tags/science/"\ntags=[]', 'reserved scoped route namespace'),
    ]:
        s = copy_site(run, label); cfg = configure(s, 'bilingual'); translated_fixture(s)
        name = 'tags' if label == 'reserved-source' else 'invalid'
        (s / f'content/field-notes/{name}.zh.md').write_text('+++\ntitle="Invalid probe"\n' + metadata + '\n+++\n')
        build(s, run, label, diagnostic=diagnostic, flags=cfg)
    if not os.environ.get('SIDERA_SKIP_BROWSER'):
        result = subprocess.run([os.environ.get('NODE_BIN','node'), str(ROOT / 'tests/check_p2c_browser.mjs'), str(run)],
                                text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=240)
        (run / 'browser.log').write_text(result.stdout); print(result.stdout)
        assert result.returncode == 0, 'See browser.log'
    (run / 'results.json').write_text(json.dumps({'keys':len(keys), 'strict_builds':11,
        'expected_rejections':6, 'native_locale':'zh-CN', 'catalog':'zh-CN.toml',
        'bilingual':'filename translations, en/zh; root and /preview; native per-site caches',
        'hugo':subprocess.check_output(['hugo','version'],text=True,timeout=10).strip()},indent=2))
    print('PASS P2-C catalogs, complete baseline contracts in both UIs, bilingual isolation, fallback/overrides')


if __name__ == '__main__': main()
