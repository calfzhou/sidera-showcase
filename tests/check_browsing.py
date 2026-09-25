"""Stellar collection browsing: real scoped tabs, taxonomy indexes and publication archives."""
from pathlib import Path
import json, os, re, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, Page
from check_p1b import build, copy_site, html, local_links
from check_p1c import baseline_checks
from check_p2f import nodes
from check_p2w import write, replace

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='browsing-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_site(run,'source')
    def branch(path,extra=''):
        write(source,'content/'+path+'/_index.md','+++\ntitle='+json.dumps(path)+'\n'+extra+'\n+++\n')
    branch('chronicle',"preset='blog'\n[params]\npage_size=2\ntaxonomy_page_size=2\ntaxonomy_hierarchy=['categories']\nlist_header=false")
    entries={
     'new':('Newest','2025-03-01','2025-03-01',False,['daily','work'],['learning/tools']),
     'late-update':('Older publication','2024-06-01','2026-01-01',False,['daily'],['learning/notes']),
     'pin':('Pinned oldest','2023-01-01','2025-01-01',True,['other'],['misc']),
     'ancient':('Ancient but dated','0001-02-01','0001-02-01',False,[],[]),
     'undated':('Undated','','',False,[],[]),
    }
    for key,(title,date,updated,pin,tags,cats) in entries.items():
        fm='title='+json.dumps(title)+'\ntags='+json.dumps(tags)+'\ncategories='+json.dumps(cats)+'\n'
        if date:fm+='date='+date+'\nlastmod='+updated+'\n'
        write(source,'content/chronicle/'+key+'.md','+++\n'+fm+'[params]\npinned='+str(pin).lower()+'\n+++\nA synthetic article.\n')
    branch('chronicle/annex','[params]\nscope_root=true')
    write(source,'content/chronicle/annex/separate.md','+++\ntitle="Independent scope"\ndate=2025-10-01\ntags=["annex-only"]\ncategories=["annex-only"]\n+++\n')
    write(source,'content/chronicle/future.md','+++\ntitle="Future"\ndate=2099-01-01\n+++\n')
    branch('bare',"preset='blog'")
    write(source,'content/bare/a.md','+++\ntitle="No classification"\ndate=2024-01-01\n+++\n')
    # An unclassified scope opts into identical browsing capabilities, with nested tags retained.
    branch('tree-scope',"[params]\ntop=[{component='collection-nav',config={items=['tags','recent','archive']}}]\ntaxonomy_hubs='index'\ntaxonomy_hierarchy=['tags']\nlist_order='modification'")
    write(source,'content/tree-scope/a.md','+++\ntitle="Nested tags"\ndate=2024-01-01\ntags=["tree/branch/leaf"]\n+++\n')
    # A small native proof avoids relying on generated HTML counts as a membership oracle.
    write(source,'layouts/_partials/sidera/head-extra.html','<script id="listed-probe" type="application/json">{{ $paths := slice }}{{ range .Page.Site.Pages }}{{ $paths = $paths | append .Path }}{{ end }}{{ $paths | jsonify | safeJS }}</script>')
    def check(label,extra='',diagnostic=None):
        write(source,'browsing.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,browsing.toml','--printI18nWarnings'))
    def tabs(out,route):
        nav=[n for n in nodes(out,route).all() if 'data-collection-nav' in n.attrs]
        return [a for a in nav[0].all() if a.tag=='a'] if nav else []
    def archive(out,route):
        found=[]
        while True:
            d=nodes(out,route);found.extend(a.attrs['href'] for a in d.all() if 'data-archive-article' in a.attrs)
            next=d.all(**{'data-page-link':'next'})
            if not next:return found
            route=next[0].attrs['href']
    out=check('baseline');local_links(out);baseline_checks(out)
    assert [a.words() for a in tabs(out,'/chronicle/')]==['All posts','Categories','Tags','Archive']
    assert [a.words() for a in tabs(out,'/bare/')]==['All posts','Archive']
    assert [a.words() for a in tabs(out,'/tree-scope/')]==['Tags','All posts','Archive']
    assert not tabs(out,'/chronicle/new/') and not tabs(out,'/about/')
    for path,current in [('','/chronicle/'),('categories/','/chronicle/categories/'),('tags/','/chronicle/tags/'),('archives/','/chronicle/archives/')]:
        assert [a.attrs['href'] for a in tabs(out,'/chronicle/'+path) if a.attrs.get('aria-current')]==[current]
    assert [a.attrs.get('aria-current') for a in tabs(out,'/chronicle/categories/learning/') if a.attrs['href'].endswith('/categories/')]==['location']
    assert archive(out,'/chronicle/archives/')==['/chronicle/'+p+'/' for p in ['new','late-update','pin','ancient','undated']]
    assert 'Undated' in html(out,'/chronicle/archives/page/3/').read_text()
    # The archive is real output/GetPage navigation, but excluded by native build.list=never.
    listed=json.loads(nodes(out,'/chronicle/').all(id='listed-probe')[0].words())
    assert not any(p.endswith('/archives') for p in listed)
    assert Page(html(out,'/chronicle/')).total==5
    assert '<h2>0001</h2>' in html(out,'/chronicle/archives/page/2/').read_text()
    assert not any('/archives/' in a.attrs.get('href','') for a in nodes(out,'/chronicle/').all() if a.tag=='a' and a.attrs.get('title'))
    assert Page(html(out,'/guidebook/')).total is None
    assert nodes(out,'/chronicle/categories/').all(**{'data-taxonomy-index':'categories'})
    assert 'taxonomy-branches' in html(out,'/chronicle/categories/').read_text()
    assert 'taxonomy-cloud' in html(out,'/chronicle/tags/').read_text()
    assert 'taxonomy-directory' in html(out,'/tree-scope/tags/').read_text()
    assert '/tree-scope/tags/tree/branch/leaf/' in html(out,'/tree-scope/tags/').read_text()
    assert 'annex-only' not in nodes(out,'/chronicle/categories/').all(**{'data-taxonomy-index':'categories'})[0].words()
    assert nodes(out,'/chronicle/categories/').all(**{'data-term-count':'2'}) # complete ancestor union
    assert 'All categories' in html(out,'/chronicle/').read_text()
    assert nodes(out,'/chronicle/tags/').all(**{'data-page-link':'next'}) # root taxonomy pagination
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    assert [a.words() for a in tabs(out,'/chronicle/')]==['全部文章','分类','标签','归档']
    assert tabs(out,'/chronicle/')[3].attrs['href']=='/_chinese/chronicle/archives/'
    assert '所有分类' in html(out,'/chronicle/').read_text()
    # The owner tab describes all posts, not whichever sort order the owner selects.
    for order in ['publication','modification','title']:
        ordered=check('label-'+order,"[cascade.params]\nlist_order='"+order+"'\n")
        assert tabs(ordered,'/chronicle/')[0].words()=='All posts'
        assert nodes(ordered,'/chronicle/').all(**{'data-list-order':order})
        assert tabs(ordered,'/chronicle/')[0].attrs['href']=='/chronicle/'
    out=check('off',"[cascade.params]\ntop=false\n")
    assert not tabs(out,'/chronicle/') and html(out,'/chronicle/archives/').exists()
    out=check('repeated',"[cascade.params]\ntop=[{component='collection-nav',config={items=['archive','recent']}},{component='collection-nav',config={items=['tags']}}]\n")
    assert len(nodes(out,'/chronicle/').all(**{'data-component':'collection-nav'}))==2
    out=check('icons-off',"[cascade.params]\nicons=false\n")
    assert not any(n.tag=='svg' for n in nodes(out,'/chronicle/categories/').all())
    for label,config,diagnostic in [('bad-mode',"[params]\ntaxonomy_hubs='bad'\n",'taxonomy_hubs'),('bad-items',"[params]\ntop=[{component='collection-nav',config={items='tags'}}]\n",'config.items'),('duplicate-items',"[params]\ntop=[{component='collection-nav',config={items=['tags','tags']}}]\n",'invalid/duplicate'),('later-series',"[params]\ntop=[{component='collection-nav',config={items=['series']}}]\n",'invalid/duplicate')]:check(label,config,diagnostic)
    # Collisions must diagnose before authored content can be shadowed by generated archive output.
    for label,path,fm in [('source','chronicle/archives.md',''),('url','chronicle/collision.md',"url='/chronicle/archives/'"),('alias','chronicle/collision.md',"aliases=['/chronicle/archives/']"),('private','chronicle/collision.md','[params.sidera]\narchive_view=true')]:
        write(source,'content/'+path,'+++\ntitle="Collision"\n'+fm+'\n+++\n')
        check('collision-'+label,diagnostic='reserved')
        # Retire only our temporary test input by making it an excluded ordinary valid draft.
        if label=='source':
            (source/'content'/path).rename(source/'content/chronicle/retired-probe.md')
            write(source,'content/chronicle/retired-probe.md','+++\ntitle="Retired probe"\ndraft=true\n+++\n')
        else:write(source,'content/'+path,'+++\ntitle="Retired probe"\ndraft=true\n+++\n')
    guide=source/'content/guidebook/_index.md';original=guide.read_text()
    altered=re.sub(r'order\s*=\s*\[[^\]]*\]',"order=['archives']",original,count=1);assert altered!=original;guide.write_text(altered)
    check('archive-not-doc-child',diagnostic='not a direct child')
    guide.write_text(original)
    static=source/'static/chronicle/archives';static.mkdir(parents=True);(static/'index.html').write_text('collision')
    check('static-collision',diagnostic='reserved scoped static namespace')
    (run/'results.json').write_text(json.dumps({'checks':['real scoped tabs','conditional vocabularies','flat/hierarchical indexes','archive native membership/order/pagers/zero dates','independent scope exclusion','not listed as content','EN/ZH/subpath','top instances/disable','private/source/url/alias/static collision rejection']},indent=2))
    print('PASS collection browsing; retained',run)
if __name__=='__main__':main()
