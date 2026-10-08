"""Compact native author names before dates, without default footer attribution."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build,local_links
from check_shell import nodes
from check_docs import write

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 write(source,'content/authors/second/_index.md','---\ntitle: Second Writer\nslug: second\nparams:\n  avatar: images/sidera-parallax-circle.svg\n---\n')
 for name,authors,dates,extra in [('single','[rowan]',True,''),('multiple','[second, second, rowan]',True,''),('none','[]',True,''),('only-authors','[rowan]',False,''),('empty','[]',False,''),('hidden','[rowan]',True,'params:\n  show_authors: false\n')]:
  write(source,f'content/notes/author-{name}.md','---\ntitle: Author '+name+'\nauthors: '+authors+'\n'+('publishDate: 2025-01-01\nlastmod: 2025-04-01\n' if dates else '')+extra+'---\nA small attribution example.\n')
 def check(label,extra=''):
  write(source,'authors.toml',extra)
  return build(source,run,label,flags=('--config','hugo.toml,authors.toml','--printI18nWarnings'))
 for label,config,prefix in [('baseline','',''),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview')]:
  out=check(label,config);local_links(out,prefix)
  for name in ['single','multiple','none','only-authors','empty','hidden']:
   d=nodes(out,'/notes/author-'+name+'/');authors=d.all(id='header-assigned-authors');separators=d.all(**{'class':'date-separator author-date-separator'})
   assert not d.all(**{'data-footer-item':'authors'})
   if name in ['none','empty','hidden']:assert not authors and not separators
   else:
    assert len(authors)==1 and not any(n.tag=='img' for n in authors[0].all())
    assert [n.attrs['href'] for n in authors[0].all() if n.tag=='a']==([prefix+'/authors/second/',prefix+'/authors/rowan/'] if name=='multiple' else [prefix+'/authors/rowan/'])
    assert bool(separators)==(name!='only-authors')
   if name=='empty':assert not d.all(**{'class':'article-dates'})
  for path in ['/journal/2026/04/10/beginning/','/notes/package-management/']:
   d=nodes(out,path);assert d.all(id='header-assigned-authors') and not d.all(**{'data-footer-item':'authors'})
 out=check('explicit-footer',"[cascade.params]\narticle_footer=['authors']\n")
 assert nodes(out,'/notes/author-single/').all(id='footer-assigned-authors') # Optional explicit configuration still works.
 out=check('scoped-links',"[params.taxonomy_links]\nauthors='section'\n")
 assert nodes(out,'/notes/author-single/').all(id='header-assigned-authors')[0].all(href='/notes/authors/rowan/')
 print('PASS header authors: native single/multiple/dedup/order links, no avatar/default footer, separator only with dates, hidden/no-author/no-date, explicit footer compatibility, EN/ZH/subpath/scoped URLs; retained',run)
if __name__=='__main__':main()
