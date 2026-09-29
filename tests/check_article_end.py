"""Series outline has no duplicate controls; authored end text follows all article navigation."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase,build,local_links
from check_p2f import nodes
from check_p2w import write

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 write(source,'ending-defaults.toml',"[params]\ncomments=false\n[cascade.params]\narticle_end_text='Have a different approach? [Get in touch](mailto:hello@example.org).'\n")
 def check(label,extra='',diagnostic=None):
  write(source,'ending.toml',extra)
  return build(source,run,label,diagnostic,('--config','hugo.toml,ending-defaults.toml,ending.toml','--printI18nWarnings'))
 route='/journal/2026/04/14/connect-the-useful-parts/'
 for label,extra,prefix in [('baseline','',''),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese')]:
  out=check(label,extra);local_links(out,prefix)
  for page in [route,'/journal/2026/04/12/a-walk-without-a-checklist/','/notes/package-management/','/handbook/','/handbook/workflows/','/about/']:
   d=nodes(out,page);main=d.all(id='main')[0];end=main.all(**{'class':'article-end'})
   assert len(end)==1 and main.children[-1] is end[0],page
   assert end[0].all(href='mailto:hello@example.org')
   assert not any(n.all(href='mailto:hello@example.org') for n in main.all(**{'class':'article-footer'}))
   assert not d.all(**{'class':'series-neighbors'})
  d=nodes(out,route);outline=d.all(**{'class':'series-outline'})[0]
  assert len([n for n in outline.all() if n.tag=='li'])==4
  assert outline.all(**{'aria-current':'page'})
  assert d.all(**{'class':'page-navigation'})
  for page in ['/journal/','/journal/series/making-notes/','/notes/page/2/']:assert not nodes(out,page).all(**{'class':'article-end'})
 p=source/'content/handbook/_index.md';p.write_text(p.read_text().replace('  children:\n','  children:\n    page_size: 1\n'))
 out=check('child-pager');assert not nodes(out,'/handbook/page/2/').all(**{'class':'article-end'})
 out=check('disabled',"[cascade.params]\narticle_end_text=''\n")
 assert not nodes(out,route).all(**{'class':'article-end'})
 out=check('separate',"[cascade.params]\narticle_footer=false\n")
 assert nodes(out,route).all(**{'class':'article-end'}) and nodes(out,route).all(**{'class':'page-navigation'})
 out=check('markdown',"[cascade.params]\narticle_end_text='A **closing** message.'\narticle_text='Existing footer text.'\n")
 d=nodes(out,route);assert any(n.tag=='strong' for n in d.all(**{'class':'article-end'})[0].all())
 assert 'Existing footer text.' in d.all(**{'class':'article-footer'})[0].words()
 check('unsafe',"[cascade.params]\narticle_end_text='<script>alert(1)</script>'\n",'Raw HTML omitted')
 check('bad-type','[cascade.params]\narticle_end_text=true\n','article_end_text must be a string')
 print('PASS outline-only series; canonical final contact after navigation/child lists; no duplicates; native overrides/empty/safe Markdown and unchanged footer text; retained',run)
if __name__=='__main__':main()
