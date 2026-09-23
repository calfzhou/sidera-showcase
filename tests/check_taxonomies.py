"""Shared native metadata, hierarchy/flat membership, scoped views and unchanged moves."""
from pathlib import Path
import os,sys,tempfile,json,shutil,re
sys.dont_write_bytecode=True
from check_p1a import ROOT,THEME,Page,all_articles
from check_p1b import copy_site,build,html,local_links
from check_p2w import write,replace
from check_p2f import nodes

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='taxonomies-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True);print('Retained run:',run,flush=True)
    passed=[];rejected=[]
    def check(source,name,diagnostic=None,flags=()):
        out=build(source,run,name,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(name);return out
    def members(out,route):return all_articles(out,route)
    base=copy_site(run,'shared')
    cfg=base/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[params]\ntaxonomy_hierarchy=['tags','categories']\n")
    # Terms overlap across kinds, including a native body-bearing docs branch.
    out=check(base,'shared');local_links(out)
    science={'/field-notes/alpha/','/field-notes/beta/','/lab-notes/alpha/','/lab-notes/beta/','/guidebook/getting-started/setup/'}
    assert set(members(out,'/tags/science/'))==science
    assert len(members(out,'/tags/science/'))==len(science) # no native parent duplicate .Pages
    experiments={'/journal/2024/01/01/first-signal/','/dispatches/second-signal/','/field-notes/alpha/','/guidebook/getting-started/setup/'}
    assert set(members(out,'/categories/learning/'))==experiments
    assert set(members(out,'/guidebook/categories/learning/'))=={'/guidebook/getting-started/setup/'}
    assert set(members(out,'/field-notes/categories/learning/'))=={'/field-notes/alpha/'}
    assert '/categories/' in html(out,'/').read_text()
    # A literal parent plus descendant on the same Page is counted once in hierarchy.
    write(base,'content/field-notes/parent.md','+++\ntitle="Parent and child"\ntags=["science","science/quantum"]\ncategories=["learning", "learning/experiments"]\n+++\nParent and child assignments.')
    # Native authored empty term and native Page.GetTerms, no theme-specific assignments.
    write(base,'content/categories/empty/_index.md','+++\ntitle="Empty category"\nslug="empty"\n+++\nAn intentionally empty native term.')
    write(base,'layouts/_partials/sidera/head-extra.html','{{ range .Page.GetTerms "tags" }}<meta name="native-tag" content="{{ .RelPermalink }}">{{ end }}')
    config=base/'hugo.toml';config.write_text(config.read_text()+"taxonomy_page_size=2\n")
    out=check(base,'parent-paged');local_links(out)
    assert set(members(out,'/tags/science/'))==science|{'/field-notes/parent/'}
    assert len(members(out,'/tags/science/'))==6
    assert Page(html(out,'/tags/science/')).pagination==(1,3)
    assert 'name="native-tag"' in html(out,'/guidebook/getting-started/setup/').read_text()
    assert Page(html(out,'/categories/empty/')).total==0
    assert not Page(html(out,'/categories/empty/')).pager
    remapped=copy_site(run,'remapped')
    cfg=remapped/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[params]\ntaxonomy_hierarchy=['tags','categories']\n")
    replace(remapped, 'hugo.toml', "[permalinks.term]\n_merge = 'shallow'", "[permalinks.term]\n_merge = 'shallow'\ntags = '/topics/:slug/'\ncategories = '/subjects/:slug/'")
    cfg=remapped/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[permalinks.taxonomy]\ntags='/topics/'\ncategories='/subjects/'\n")
    out=check(remapped,'remapped');local_links(out)
    assert set(members(out,'/topics/science/'))==science
    assert set(members(out,'/subjects/learning/'))==experiments
    assert (out/'topics/u-e9878fe5ad90/index.html').exists()
    assert '/topics/' in html(out,'/field-notes/tags/').read_text()
    # Flat interpretation uses exact assignments even when native parent .Pages is recursive.
    config.write_text(config.read_text().replace("taxonomy_hierarchy=['tags','categories']", "taxonomy_hierarchy=[]"))
    replace(base,'content/field-notes/_index.md',"taxonomy_hierarchy = ['tags', 'categories']",'taxonomy_hierarchy=[]')
    out=check(base,'flat')
    assert members(out,'/tags/science/')==['/field-notes/parent/']
    assert members(out,'/categories/learning/')==['/field-notes/parent/']
    assert set(members(out,'/tags/science/quantum/'))=={'/field-notes/beta/','/guidebook/getting-started/setup/','/field-notes/parent/'}
    assert not any(n.attrs.get('class')=='tree-branch' for n in nodes(out,'/field-notes/tags/science/').all())
    # Collection hierarchy overrides site choice independently for tags and categories.
    replace(base,'content/field-notes/_index.md','taxonomy_hierarchy=[]',"taxonomy_hierarchy=['tags']")
    out=check(base,'owner-hierarchy')
    assert set(members(out,'/field-notes/tags/science/'))=={'/field-notes/alpha/','/field-notes/beta/','/field-notes/parent/'}
    assert members(out,'/field-notes/categories/learning/')==['/field-notes/parent/']
    assert members(out,'/tags/science/')==['/field-notes/parent/']
    # Restore site hierarchy; move one actual bundle between all three collections.
    moving=copy_site(run,'moving');cfg=moving/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[params]\ntaxonomy_hierarchy=['tags','categories']\n");bundle=moving/'content/field-notes/traveller';bundle.mkdir()
    document='+++\ntitle="Travelling page"\ndate=2024-03-04T10:00:00Z\ntags=["movement/shared"]\ncategories=["practice/examples"]\n[params]\npinned=true\nshow_updated=false\n+++\n![Local image](sample.svg)\n\n## Unchanged content\n\nOne source document.'
    (bundle/'index.md').write_text(document);shutil.copy2(ROOT/'content/field-notes/alpha/sample.svg',bundle/'sample.svg')
    old=None
    for owner,route in [('field-notes','/field-notes/traveller/'),('journal','/journal/2024/03/04/traveller/'),('guidebook','/guidebook/traveller/')]:
        dest=moving/'content'/owner/'traveller'
        if bundle!=dest:bundle.rename(dest);bundle=dest
        out=check(moving,'move-'+owner);local_links(out)
        assert (bundle/'index.md').read_text()==document
        p=Page(html(out,route));assert p.article['data-collection']=='/'+owner+'/' and not p.updated
        assert members(out,'/tags/movement/')==[route]
        assert members(out,'/categories/practice/')==[route]
        assert members(out,'/'+owner+'/tags/movement/')==[route]
        assert (out/route.strip('/')/'sample.svg').read_bytes()==(bundle/'sample.svg').read_bytes()
        if old:assert not html(out,old).exists()
        old=route
    # Subpath and bilingual native/canonical URL integration with hierarchy ancestors.
    out=check(moving,'subpath',flags=('--baseURL','https://example.org/preview/'))
    local_links(out,'/preview');assert members(out,'/tags/movement/')==['/preview/guidebook/traveller/']
    write(moving,'locale.toml',"defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(moving,'content/guidebook/_index.zh.md','+++\ntitle="手册"\npreset="docs"\n[params]\nscope_root=true\n\n+++\n中文文档。')
    write(moving,'content/guidebook/traveller/index.zh.md',document.replace('Travelling page','移动文档'))
    out=check(moving,'bilingual',flags=('--config','hugo.toml,locale.toml','--baseURL','https://example.org/preview/'))
    local_links(out,'/preview')
    assert members(out,'/zh/tags/movement/')==['/preview/zh/guidebook/traveller/']
    assert members(out,'/en/tags/movement/')==['/preview/en/guidebook/traveller/']
    assert '<h1>标签</h1>' in html(out,'/zh/tags/').read_text()
    # Invalid taxonomy inputs are equally invalid in every collection (including drafts).
    for owner in ['field-notes','journal','guidebook']:
        bad=copy_site(run,'bad-'+owner)
        write(bad,'content/'+owner+'/invalid.md','+++\ntitle="Invalid"\ndraft=true\ncategories=["bad//category"]\n+++\nUnpublished.')
        check(bad,'bad-'+owner,'malformed tag segment')
    for name,value in [('hierarchy',"taxonomy_hierarchy=['unknown']"),('duplicate',"taxonomy_hierarchy=['tags','tags']"),('size','taxonomy_page_size=0')]:
        bad=copy_site(run,'bad-'+name);cfg=bad/'hugo.toml';cfg.write_text(cfg.read_text()+'\n[params]\n'+value+'\n')
        check(bad,'bad-'+name,'Sidera')
    (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected,'unchanged_front_matter_moves':3,'native_assignment_source':True},indent=2))
    print(f'PASS taxonomies: {len(passed)} strict builds, {len(rejected)} rejections; native global/scoped hierarchies and unchanged moves')
if __name__=='__main__':main()
