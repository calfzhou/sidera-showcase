"""Badge/outline positions share the publication-ordered native series sequence."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_organization import all_articles
from check_tag_routes import copy_showcase,build,local_links
from check_shell import nodes
from check_docs import write
from check_showcase import JOURNAL,SERIES

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 def check(label,extra='',diagnostic=None,flags=()):
  write(source,'series-check.toml',extra)
  return build(source,run,label,diagnostic,('--config','hugo.toml,series-check.toml','--printI18nWarnings',*flags))
 def outline(out,route):return nodes(out,route).all(**{'class':'series-navigation'})[0]
 def verify(out,prefix=''):
  cards=nodes(out,'/journal/').all(**{'class':'article-card'})
  for name,routes in SERIES.items():
   assert all_articles(out,prefix+'/journal/series/'+name+'/',prefix)==[prefix+r for r in routes]
   assert all_articles(out,prefix+'/series/'+name+'/',prefix)==[prefix+r for r in routes]
   for i,route in enumerate(routes,1):
    nav=outline(out,route);assert nav.attrs['data-series-position']==str(i) and nav.attrs['data-series-total']==str(len(routes))
    ol=next(n for n in nav.all() if n.tag=='ol')
    assert [n.attrs['href'] for n in ol.all() if n.tag=='a']==[prefix+r for r in routes]
    assert [n.attrs['href'] for n in ol.all(**{'aria-current':'page'})]==[prefix+route]
    card=next(c for c in cards if c.all(**{'class':'card-title'})[0].attrs['href']==prefix+route)
    badge=card.all(**{'class':'card-series'})[0]
    assert badge.attrs['href']==prefix+'/journal/series/'+name+'/'
    assert (badge.attrs['data-series-position'],badge.attrs['data-series-total'])==(str(i),str(len(routes)))
  for route in [JOURNAL[0],JOURNAL[6]]:
   assert not nodes(out,route).all(**{'class':'series-navigation'})
   card=next(c for c in cards if c.all(**{'class':'card-title'})[0].attrs['href']==prefix+route)
   assert not card.all(**{'class':'card-series'})
 baseline=check('baseline');verify(baseline);local_links(baseline)
 for label,extra,prefix in [('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview')]:
  out=check(label,extra);verify(out,prefix);local_links(out,prefix)
 # Scope independence, single-member and chronological ties/unknowns; native weights never win.
 for scope in ['sequence-proof','sequence-other']:
  write(source,f'content/{scope}/_index.md','---\ntitle: Series proof\npreset: notes\nparams:\n  page_size: 1\n  list_order: title\n---\n')
 write(source,'content/series/proof/_index.md','---\ntitle: Proof series\nslug: proof\n---\n')
 for slug,title,date,pin,weight in [('z','Same','2025-01-01',False,0),('a','Same','2025-01-01',False,999),('latest','Latest','2025-02-01',True,-9),('undated','Undated','',False,-999)]:
  write(source,f'content/sequence-proof/{slug}.md','---\ntitle: '+title+'\nseries: proof\nseries_weight: '+str(weight)+'\n'+('publishDate: '+date+'\n' if date else '')+'params:\n  pinned: '+str(pin).lower()+'\n---\n')
 write(source,'content/sequence-other/only.md','---\ntitle: Only\npublishDate: 2024-01-01\nseries: proof\n---\n')
 write(source,'content/sequence-proof/draft.md','---\ntitle: Draft\ndraft: true\nseries: proof\n---\n')
 write(source,'content/sequence-proof/future.md','---\ntitle: Future\npublishDate: 2099-01-01\nseries: proof\n---\n')
 out=check('proof')
 expected=['/sequence-proof/a/','/sequence-proof/z/','/sequence-proof/latest/','/sequence-proof/undated/']
 assert all_articles(out,'/sequence-proof/series/proof/')==expected
 assert all_articles(out,'/series/proof/')==['/sequence-other/only/']+expected
 assert outline(out,'/sequence-proof/z/').attrs['data-series-position']=='2'
 assert outline(out,'/sequence-proof/z/').attrs['data-series-total']=='4'
 assert outline(out,'/sequence-other/only/').attrs['data-series-total']=='1'
 assert not outline(out,'/sequence-other/only/').all(**{'class':'series-neighbors'})
 # Entire sequence is available despite article/term pagers; repeated instances have no duplicate IDs.
 out=check('repeated',"[cascade.params]\narticle_footer=['series','series']\n")
 d=nodes(out,JOURNAL[4]);assert len(d.all(**{'class':'series-outline'}))==2
 ids=[n.attrs['id'] for n in d.all() if 'id' in n.attrs];assert len(ids)==len(set(ids))
 out=check('footer-off',"[cascade.params]\narticle_footer=false\n")
 assert not nodes(out,JOURNAL[4]).all(**{'class':'series-navigation'})
 assert nodes(out,'/journal/').all(**{'class':'card-series'})
 write(source,'content/series/proof/_index.md','---\ntitle: Proof series\nslug: proof\nparams:\n  series_order: weight\n---\n')
 check('weight-rejected',diagnostic='series_order must be publication')
 print('PASS series badge/outline: exact pub-date positions, scoped/global sequences, ties/undated/pins/weights, standalone/singleton/repeats, EN/ZH/subpath, footer opt-out and rejected weight ordering; retained',run)
if __name__=='__main__':main()
