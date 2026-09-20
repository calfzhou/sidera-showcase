"""Native docs tree/mount proof; only installed Hugo and Python stdlib.
Retains isolated source variants, strict logs and browser inputs under .checks.
"""
from html.parser import HTMLParser
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile
sys.dont_write_bytecode = True
from check_p1a import ROOT, THEME, DOC_ROUTES, check_baseline, snapshot, Page
from check_p1b import build, copy_site, html, tag_checks, FIELD, LAB
from check_p1c import baseline_checks
from check_poc_theme import missing_targets

class Docs(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.tree = []
        self.states = {}
        self.children = []
        self.next = None
        self.in_children = False
        self.feed(file.read_text())
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'ul' and a.get('id') == 'doc-children': self.in_children = True
        if tag == 'a':
            if 'data-doc-path' in a:
                self.tree.append(a['href'])
                self.states[a['href']] = a.get('aria-current')
            if self.in_children: self.children.append(a['href'])
            if a.get('data-page-link') == 'next': self.next = a['href']
    def handle_endtag(self, tag):
        if tag == 'ul': self.in_children = False

def sequence(out, route, expected, size, prefix=''):
    all_links, pages = [], []
    first_tree = None
    while route:
        d = Docs(html(out, route.removeprefix(prefix)))
        if first_tree is None: first_tree = d.tree
        assert d.tree == first_tree, ('Tree changed on later pager', route)
        assert len(d.children) <= size
        all_links += d.children
        pages.append(route)
        route = d.next
        assert route not in pages
    assert all_links == [prefix+x for x in expected], (all_links, expected)
    assert len(pages) == max(1, (len(expected)+size-1)//size)

def write(source, path, text):
    f = source / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(text)

def replace(source, path, old, new):
    p = source / path
    s = p.read_text()
    assert old in s, (path, old)
    p.write_text(s.replace(old, new))

def branch(source, path, title='Probe', fm='', body='Synthetic document body.'):
    write(source, 'content/'+path+'/_index.md', f'+++\ntitle="{title}"\n{fm}\n+++\n{body}\n')

ROOT_ORDER = ['getting-started','reference','about','faq','supplies','wrap-up']
TREE = ['getting-started','getting-started/setup','getting-started/practice','getting-started/review',
        'reference','reference/glossary','about','faq','supplies','wrap-up']

def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p2w-', dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True, exist_ok=True)
    print('Retained run:', run, flush=True)
    successful, rejected = [], []
    def check(source, label, diagnostic=None, flags=()):
        out = build(source, run, label, diagnostic=diagnostic, flags=('--printI18nWarnings', *flags))
        (rejected if diagnostic else successful).append(label)
        return out
    baseline = check(ROOT, 'baseline')
    check_baseline(baseline); baseline_checks(baseline)
    assert not missing_targets(baseline)
    sequence(baseline, '/guidebook/', ['/guidebook/'+n+'/' for n in ROOT_ORDER], 2)
    sequence(baseline, '/guidebook/getting-started/', ['/guidebook/getting-started/'+n+'/' for n in ['setup','practice','review']], 2)
    sequence(baseline, '/sidera/', ['/sidera/authoring/','/sidera/publishing/'], 1)
    for route in ['/guidebook/', '/guidebook/page/2/', '/guidebook/reference/glossary/']:
        d = Docs(html(baseline, route))
        assert d.tree == ['/guidebook/'+n+'/' for n in TREE]
    d = Docs(html(baseline, '/guidebook/getting-started/setup/'))
    assert d.states['/guidebook/getting-started/setup/'] == 'page'
    assert d.states['/guidebook/getting-started/'] == 'location'
    assert d.states['/guidebook/reference/'] is None
    assert not d.children
    assert not Docs(html(baseline, '/guidebook/reference/')).children
    assert 'This site-owned demo' in html(baseline,'/guidebook/').read_text()
    assert 'This site-owned demo' not in html(baseline,'/guidebook/page/2/').read_text()
    assert 'Read the full document' in html(baseline,'/guidebook/page/2/').read_text()
    assert 'id="TableOfContents"' not in html(baseline,'/guidebook/page/2/').read_text()
    assert (baseline/'sidera/nodes.svg').read_bytes() == (ROOT/THEME/'docs/content/nodes.svg').read_bytes()
    assert not (ROOT/'content/sidera').exists(), 'Theme docs must not be copied into site'
    again = check(ROOT, 'repeat'); assert snapshot(baseline) == snapshot(again)

    off = copy_site(run, 'off')
    # Omit the opt-in completely, independently of navigation or draft metadata.
    config = off/'hugo.toml'; config.write_text(config.read_text().split('# Consumer opt-in only;')[0])
    out = check(off, 'off')
    assert not (out/'sidera').exists()
    assert not any('/sidera/' in p.read_text() for p in out.rglob('*.html'))
    assert '/sidera/' not in (out/'sitemap.xml').read_text()
    assert html(out,'/guidebook/').exists() and html(out,'/field-notes/tags/science/').exists()
    write(off, 'layouts/home.html', '{{ define "main" }}{{ range site.Pages }}<p data-native-path="{{ .Path }}">{{ .Path }}</p>{{ end }}{{ end }}')
    native_off = check(off, 'off-pages')
    assert 'data-native-path="/sidera' not in html(native_off,'/').read_text()
    assert '/guidebook/reference/glossary' in html(native_off,'/').read_text()
    # User-facing override file really omits the optional array entry too.
    override_off = copy_site(run, 'off-config')
    shutil.copy2(ROOT/'docs-off.toml', override_off/'docs-off.toml')
    out = check(override_off, 'off-config', flags=('--config','hugo.toml,docs-off.toml'))
    assert not (out/'sidera').exists()

    alt = copy_site(run, 'alternate')
    replace(alt, 'hugo.toml', "target = 'content/sidera'", "target = 'content/manuals/theme'")
    out = check(alt, 'alternate', flags=('--baseURL','https://example.org/preview/'))
    assert not (out/'sidera').exists()
    assert not missing_targets_with_prefix(out, '/preview')
    for relative in ['', 'authoring/', 'authoring/example/', 'publishing/', 'page/2/']:
        text = html(out,'/manuals/theme/'+relative).read_text()
        assert '/preview/manuals/theme/' in text and '/sidera/' not in text
    assert (out/'manuals/theme/nodes.svg').read_bytes() == (baseline/'sidera/nodes.svg').read_bytes()
    assert html(out,'/field-notes/tags/science/').exists()

    edges = copy_site(run, 'edges')
    replace(edges,'content/guidebook/_index.md', "collection = 'docs'", "collection = 'wiki'")
    for n in ['field-notes','lab-notes']:
        replace(edges,f'content/{n}/_index.md', "collection = 'notebook'", "collection = 'notes'")
    branch(edges,'guidebook/getting-started/setup/new-child','New child')
    branch(edges,'guidebook/a-tie','Same','weight=999')
    branch(edges,'guidebook/z-tie','Same','weight=-999')
    branch(edges,'guidebook/another','Independent docs',"[params]\ncollection='docs'")
    branch(edges,'guidebook/another/only','Independent child')
    branch(edges,'guidebook/hidden','Unpublished valid document','draft=true')
    # Native GetPage sees the draft, but it is absent from native .Pages.
    replace(edges,'content/guidebook/_index.md', "order = ['getting-started', 'reference']", "order = ['hidden', 'getting-started', 'reference']")
    out = check(edges,'edges')
    sequence(out,'/guidebook/', ['/guidebook/'+n+'/' for n in ROOT_ORDER[:5]+['a-tie','z-tie','wrap-up']],2)
    assert not html(out,'/guidebook/hidden/').exists()
    assert '/guidebook/another/only/' not in Docs(html(out,'/guidebook/')).tree
    assert Docs(html(out,'/guidebook/another/')).children == ['/guidebook/another/only/']
    assert Docs(html(out,'/guidebook/getting-started/setup/')).children == ['/guidebook/getting-started/setup/new-child/']
    assert Page(html(out,'/guidebook/getting-started/setup/')).article == Page(html(baseline,'/guidebook/getting-started/setup/')).article
    tag_checks(out,'field-notes',FIELD,['alpha','beta','gamma','delta','epsilon'])
    tag_checks(out,'lab-notes',LAB,['alpha','beta','gamma','delta','storage/epsilon'])
    assert not (out/'guidebook/tags').exists()

    defaults = copy_site(run,'defaults')
    replace(defaults,'content/guidebook/_index.md', "order = ['getting-started', 'reference']", 'order = []')
    out = check(defaults,'empty-order')
    sequence(out,'/guidebook/', ['/guidebook/'+n+'/' for n in ['about','faq','supplies','getting-started','reference','wrap-up']],2)
    # Cascaded order is deliberately ignored, while native fallback defaults apply.
    replace(defaults,'content/guidebook/_index.md','[cascade.params.children]',"[cascade.params.children]\norder=['not-a-child']")
    out = check(defaults,'cascade-order-ignored')
    assert Docs(html(out,'/guidebook/reference/')).tree == [
        '/guidebook/'+n+'/' for n in ['about','faq','supplies','getting-started','getting-started/setup','getting-started/practice','getting-started/review','reference','reference/glossary','wrap-up']]
    branch(defaults,'guidebook/empty','Empty document','[params.children]\nlist=false')
    out = check(defaults,'empty-disabled'); assert not Docs(html(out,'/guidebook/empty/')).children

    publication = copy_site(run,'native-eligibility')
    for name,fm in [('draft','draft=true'),('future','publishDate=2099-01-01T00:00:00Z'),
                    ('expired','expiryDate=2000-01-01T00:00:00Z'),
                    ('unlisted',"[build]\nlist='never'"),('headless',"[build]\nrender='never'")]:
        branch(publication,'guidebook/'+name,name,fm)
    replace(publication,'content/guidebook/_index.md', "order = ['getting-started', 'reference']",
            "order=['draft','future','expired','unlisted','headless','getting-started','reference']")
    out = check(publication,'native-eligibility')
    sequence(out,'/guidebook/', ['/guidebook/'+n+'/' for n in ROOT_ORDER],2)
    assert html(out,'/guidebook/unlisted/').exists()
    for name in ['draft','future','expired','headless']:
        assert not html(out,'/guidebook/'+name+'/').exists()
    # Invalid referenced drafts are validated even during a normal publication build.
    replace(publication,'content/guidebook/draft/_index.md','draft=true',"draft=true\n[params.children]\norder=['typo']")
    check(publication,'referenced-invalid-draft','P2W unknown children.order')

    mixed = copy_site(run,'mixed')
    write(mixed,'content/guidebook/leaf.md', '+++\ntitle="Regular leaf"\nslug="leaf-url"\n+++\nAn ordinary leaf document.\n')
    replace(mixed,'content/guidebook/_index.md', "order = ['getting-started', 'reference']", "order=['leaf','getting-started','reference']")
    write(mixed,'content/yaml-manual/_index.md', '---\ntitle: YAML manual\nparams:\n  collection: docs\n  children:\n    order: [z]\n    sort: name\n---\nA separate authored YAML collection.\n')
    for name in ['a','m','z']: branch(mixed,'yaml-manual/'+name,name)
    out = check(mixed,'mixed-slug')
    sequence(out,'/yaml-manual/', ['/yaml-manual/'+n+'/' for n in ['z','a','m']],10)
    sequence(out,'/guidebook/', ['/guidebook/leaf-url/']+['/guidebook/'+n+'/' for n in ROOT_ORDER],2)
    assert Page(html(out,'/guidebook/leaf-url/')).article['data-collection']=='/guidebook/'
    replace(mixed,'content/guidebook/_index.md', "order=['leaf','getting-started','reference']", "order=['leaf-url']")
    check(mixed,'slug-not-identity','P2W unknown children.order')
    nonchild = copy_site(run,'nonchild')
    branch(nonchild,'guidebook/independent','Independent',"[params]\ncollection='docs'")
    replace(nonchild,'content/guidebook/_index.md', "order = ['getting-started', 'reference']", "order=['independent']")
    check(nonchild,'nonchild','P2W children.order target is not a direct child')
    scalar = copy_site(run,'scalar-settings')
    branch(scalar,'guidebook/bad','Bad',"[params]\nchildren=false")
    check(scalar,'scalar-settings','P2W children must be a table')

    # Native same-source-path override is deliberate and tested, not an accidental mask.
    override = copy_site(run,'override')
    write(override,'content/sidera/authoring/_index.md','+++\ntitle="Site-authored override"\n+++\nIntentional site override body.\n')
    out = check(override,'override')
    assert 'Intentional site override body' in html(out,'/sidera/authoring/').read_text()
    assert 'Use a branch bundle' not in html(out,'/sidera/authoring/').read_text()
    assert html(out,'/sidera/authoring/example/').exists()
    collision = copy_site(run,'collision')
    branch(collision,'collision','Route collision',"url='/sidera/authoring/'")
    check(collision,'route-collision','Duplicate target paths')
    ambiguous = copy_site(run,'ambiguous')
    write(ambiguous,'content/guidebook/about.md','+++\ntitle="Duplicate logical child"\n+++\nAmbiguous.\n')
    check(ambiguous,'ambiguous','P2W ambiguous docs node')

    invalid = [
        ("order = ['getting-started', 'reference']", "order=['about','about']", 'duplicate children.order'),
        ("order = ['getting-started', 'reference']", "order=['typo']", 'unknown children.order'),
        ("order = ['getting-started', 'reference']", "order=['getting-started/setup']", 'children.order requires direct-child logical names'),
        ("order = ['getting-started', 'reference']", "order=['../about']", 'children.order requires direct-child logical names'),
        ("order = ['getting-started', 'reference']", "order=['About the workshop']", 'unknown children.order'),
        ("order = ['getting-started', 'reference']", "order='about'", 'children.order must be an array'),
        ("order = ['getting-started', 'reference']", "order=[3]", 'children.order requires direct-child logical names'),
        ("order = ['getting-started', 'reference']", "order=['about.md']", 'children.order target is not a direct child'),
        ("order = ['getting-started', 'reference']", "order=[]\nunknown=true", 'unknown children setting'),
        ("sort = 'title'", "sort = ''", 'children.sort must be title or name'),
        ("page_size = 2", "page_size = 0", 'children.page_size must be a positive integer'),
        ("page_size = 2", "page_size = false", 'children.page_size must be a positive integer'),
        ("page_size = 2", "page_size = 2\nlist='false'", 'children.list must be boolean'),
    ]
    for i,(old,new,message) in enumerate(invalid):
        source = copy_site(run,'invalid-'+str(i)); replace(source,'content/guidebook/_index.md',old,new)
        check(source,'invalid-'+str(i),'P2W '+message)
    bad = copy_site(run,'grouping')
    write(bad,'content/guidebook/no-branch/deep.md','+++\ntitle="Accidental flattening"\n+++\nBody\n')
    check(bad,'grouping','P2W docs require a branch')
    draft = copy_site(run,'draft-validation')
    branch(draft,'guidebook/draft','Invalid draft',"draft=true\n[params.children]\npage_size=0")
    check(draft,'draft-validation','P2W children.page_size',flags=('--buildDrafts','--buildFuture','--buildExpired'))

    bilingual = copy_site(run,'bilingual')
    write(bilingual,'locale.toml', "defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\nweight=1\n[languages.zh]\nlocale='zh-CN'\nweight=2\n")
    docs = bilingual/THEME/'docs/content'
    (docs/'_index.zh.md').write_text('+++\ntitle="Sidera 文档示例"\n[params]\ncollection="docs"\n[params.children]\norder=["publishing","authoring"]\n+++\n这是一份手工编写的文档示例。\n\n[编写文档]({{< relref "./authoring" >}})\n\n![节点](nodes.svg)\n')
    (docs/'authoring/_index.zh.md').write_text('+++\ntitle="编写文档"\n+++\n文档可以同时拥有正文和子文档。\n\n[返回目录]({{< relref ".." >}})\n')
    # publishing exists only in EN, is a valid ordered reference but absent from ZH list.
    out = check(bilingual,'bilingual',flags=('--config','hugo.toml,locale.toml','--baseURL','https://example.org/preview/'))
    assert Docs(html(out,'/zh/sidera/')).children == ['/preview/zh/sidera/authoring/']
    assert not html(out,'/zh/sidera/publishing/').exists()
    assert '这是一份手工编写' in html(out,'/zh/sidera/').read_text()
    assert '文档目录' in html(out,'/zh/sidera/authoring/').read_text()
    assert not missing_targets_with_prefix(out,'/preview')
    assert html(out,'/en/field-notes/tags/science/').exists()
    # New docs assets/links and UI under a Chinese-only site, no duplicated source bodies.
    chinese = copy_site(run,'chinese')
    write(chinese,'locale.toml', "defaultContentLanguage='zh'\nlocale='zh-CN'\n")
    out = check(chinese,'chinese-preview',flags=('--config','hugo.toml,locale.toml','--baseURL','https://example.org/_chinese/'))
    assert '子文档' in html(out,'/guidebook/').read_text()
    assert 'This site-owned demo' in html(out,'/guidebook/').read_text()
    assert not missing_targets_with_prefix(out,'/_chinese')
    results = {'successful_builds':successful,'expected_rejections':rejected,'hugo':subprocess.check_output(['hugo','version'],text=True,timeout=10).strip()}
    (run/'results.json').write_text(json.dumps(results,indent=2))
    print(f'PASS P2-W: {len(successful)} builds, {len(rejected)} expected rejections. Browser inputs: {run}')

def missing_targets_with_prefix(out, prefix):
    # Reuse complete link scan; do not weaken original no-prefix link checks.
    from check_poc_theme import Scan
    from urllib.parse import urljoin,urlparse,unquote
    missing=[]
    for file in out.rglob('*.html'):
        route=prefix+'/'+file.relative_to(out).as_posix().removesuffix('index.html')
        for link in Scan(file).targets:
            url=urlparse(urljoin('https://example.org'+route,link))
            if url.netloc!='example.org' or url.scheme not in ('http','https'): continue
            assert url.path.startswith(prefix+'/'), (file,link)
            target=out/unquote(url.path[len(prefix):]).lstrip('/')
            if url.path.endswith('/'): target/='index.html'
            if not target.is_file(): missing.append((str(file),link))
    return missing

if __name__=='__main__': main()
