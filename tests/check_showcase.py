"""The one live root showcase: collection coverage, dated URLs, links and config variants."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, ORGANIZATION, THEME, Page, all_articles, snapshot
from check_p1b import build, copy_showcase, copy_site, html, local_links
from check_p2f import nodes
from check_p2w import write

JOURNAL=[
 '/journal/2026/04/16/a-small-maintenance-window/', # Pinned standalone entry.
 '/journal/2026/04/18/make-the-exit-obvious/',
 '/journal/2026/04/17/review-without-rewriting/',
 '/journal/2026/04/15/reveal-one-layer-at-a-time/',
 '/journal/2026/04/14/connect-the-useful-parts/',
 '/journal/2026/04/13/start-with-the-default/',
 '/journal/2026/04/12/a-walk-without-a-checklist/',
 '/journal/2026/04/11/returning/',
 '/journal/2026/04/10/beginning/']
SERIES={
 'making-notes': [JOURNAL[8],JOURNAL[7],JOURNAL[4],JOURNAL[2]],
 'quiet-software': [JOURNAL[5],JOURNAL[3],JOURNAL[1]],
}

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='showcase-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    before=snapshot(ROOT/THEME)
    assert not (ROOT/'examples/notebook').exists(), 'Retired alternate showcase source remains'
    assert (ORGANIZATION/'content/field-notes/alpha/sample.svg').is_file()
    assert not (ORGANIZATION/'themes').exists(), 'Regression fixtures must use the live theme'
    source=copy_showcase(run,'live');passed=[]
    def check(label,configs=(),flags=()):
        out=build(source,run,label,flags=('--config',','.join(['hugo.toml',*configs]),'--printI18nWarnings',*flags))
        passed.append(label);return out
    out=check('baseline');local_links(out)
    for route,identifier,count in [('/journal/','articles','9'),('/notes/','articles','6'),('/handbook/','doc-children','4')]:
        d=nodes(out,route);listing=d.all(id=identifier)[0]
        assert listing.tag=='ul' and listing.attrs.get('aria-label')
        assert listing.attrs.get('data-doc-total' if identifier=='doc-children' else 'data-total')==count
        assert not d.all(**{'class':'list-meta'})
        assert not any(n.tag=='p' and any(k in n.attrs for k in ['data-total','data-list-order','data-doc-total']) for n in d.all())
        if identifier=='doc-children':assert d.all(id='children-heading')
        else:assert listing.attrs.get('aria-description') and listing.attrs.get('data-list-order')

    roots=Page(html(out,'/')).links['collections'];assert set(roots)=={'/journal/','/notes/','/handbook/'}
    for preset,root in [('blog','journal'),('notes','notes'),('docs','handbook')]:
        assert all_articles(out,'/preset/'+preset+'/')==['/'+root+'/']
    assert all_articles(out,'/journal/')==JOURNAL
    for route in JOURNAL:assert html(out,route).exists()
    for old in ['/journal/beginning/','/journal/returning/','/field-notes/','/lab-notes/','/dispatches/','/guidebook/','/sidera/']:
        assert not html(out,old).exists(),old
    assert len(all_articles(out,'/notes/'))==6
    assert set(a.attrs['href'] for a in nodes(out,'/handbook/').all(id='doc-children')[0].all() if a.tag=='a' and 'card-title' in a.attrs.get('class',''))=={'/handbook/start/','/handbook/workflows/','/handbook/review/','/handbook/reference/'}
    # The live handbook has three levels below its root, with exact native parent ordering.
    for route,children in [('/handbook/workflows/',['writing','research']),('/handbook/workflows/writing/',['outline','draft']),('/handbook/workflows/research/',['sources','evaluate']),('/handbook/reference/',['frontmatter','markdown'])]:
        links=[a.attrs['href'] for a in nodes(out,route).all(id='doc-children')[0].all() if a.tag=='a' and 'card-title' in a.attrs.get('class','')]
        assert links==[route+child+'/' for child in children]
    leaf=nodes(out,'/handbook/workflows/writing/outline/')
    for path in ['/handbook/workflows','/handbook/workflows/writing','/handbook/workflows/writing/outline']:
        link=leaf.all(**{'data-doc-path':path})[0]
        assert link.attrs['aria-current']==('page' if path.endswith('/outline') else 'location')
    assert Page(html(out,'/handbook/workflows/writing/outline/')).article['data-collection']=='/handbook/'
    for series,routes in SERIES.items():
        assert all_articles(out,'/journal/series/'+series+'/')==routes
        for i,route in enumerate(routes):
            d=nodes(out,route)
            assert d.all(href='/journal/series/'+series+'/')
            assert [a.attrs['href'] for a in d.all() if 'data-series-previous' in a.attrs]==(routes[i-1:i] if i else [])
            assert [a.attrs['href'] for a in d.all() if 'data-series-next' in a.attrs]==routes[i+1:i+2]
            assert d.all(href='/authors/rowan/')
    assert {n.words() for n in nodes(out,'/journal/series/').all(**{'data-term-count':'4'})}=={'4 pages'}
    assert nodes(out,'/journal/series/').all(**{'data-term-count':'3'})
    for route in [JOURNAL[0],JOURNAL[6]]:assert not nodes(out,route).all(**{'class':'series-navigation'})
    for i,route in enumerate(JOURNAL):
        reading={n.attrs['data-navigation']:n.attrs['href'] for n in nodes(out,route).all() if 'data-navigation' in n.attrs}
        expected={}
        if i:expected['previous']=JOURNAL[i-1]
        if i+1<len(JOURNAL):expected['next']=JOURNAL[i+1]
        assert reading==expected,(route,reading,expected)
    for config in sorted((source/'examples').glob('*.toml')):
        variant=check(config.stem,('examples/'+config.name,));local_links(variant)
        if config.stem=='components':assert any(n.tag=='img' and n.attrs.get('alt')=='Fieldbook mark' for n in nodes(variant,'/notes/').all())
    # Both the normal root and regression inputs retain exact native theme import permission.
    for base in [ROOT,ORGANIZATION]:
        config=(base/'hugo.toml').read_text()
        assert "[taxonomies]\n_merge = 'shallow'" in config
        assert "journal = '/journal/:year/:month/:day/:slugorcontentbasename/'" in config
    prefixed=check('subpath',flags=('--baseURL','https://example.org/preview/'));local_links(prefixed,'/preview')
    assert all_articles(prefixed,'/journal/')==['/preview'+p for p in JOURNAL]
    docs=check('docs-on',('docs-on.toml',));local_links(docs);assert html(docs,'/sidera/').exists()
    off=check('docs-off',('docs-on.toml','docs-off.toml'));assert not html(off,'/sidera/').exists()
    # Historical expectations still refer to their old inputs, never to the promoted live content.
    legacy=copy_site(run,'organization');assert snapshot(legacy/'content')==snapshot(ORGANIZATION/'content')
    assert (legacy/'hugo.toml').read_bytes()==(ORGANIZATION/'hugo.toml').read_bytes()
    assert snapshot(ROOT/THEME)==before
    (run/'results.json').write_text(json.dumps({'passed':passed,'root_collections':roots,'journal_routes':JOURNAL,'fixture_data_isolated':True,'theme_unchanged':True},indent=2))
    print('PASS single root showcase/config variants; retained',run)
if __name__=='__main__':main()
