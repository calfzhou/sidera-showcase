"""Source-led article tag pills without collection-hub links; native targets unchanged."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase,build,local_links
from check_p2f import nodes
from check_p2w import write

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 def check(label,extra=''):
  write(source,'tags-check.toml',extra)
  return build(source,run,label,flags=('--config','hugo.toml,tags-check.toml','--printI18nWarnings'))
 write(source,'content/notes/tag-pills.md','---\ntitle: Tag pill example\ntags: [calf, it/font]\ncategories: [practice]\n---\n## Example\n\nA short article for inspecting tags.\n')
 for label,extra,prefix in [('baseline','',''),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview')]:
  out=check(label,extra);local_links(out,prefix)
  d=nodes(out,'/notes/tag-pills/');tags=d.all(id='assigned-tags')[0];categories=d.all(id='assigned-categories')[0]
  assert not d.all(**{'class':'article-tag-hub'})
  assert [n.attrs['href'] for n in tags.all() if n.tag=='a']==[prefix+'/notes/tags/calf/',prefix+'/notes/tags/it/font/']
  assert categories.all(href=prefix+'/notes/categories/practice/')
  assert len([n for n in tags.all() if n.tag=='svg'])==2
  assert tags.attrs['aria-label']==('标签' if label=='chinese' else 'Tags')
  footer=d.all(**{'class':'article-footer'})[0]
  assert not footer.all(href=prefix+'/notes/tags/') and not footer.all(href=prefix+'/notes/categories/')
  assert d.all(id='left-region')[0].all(href=prefix+'/notes/tags/') # Sidebar still owns hub navigation.
  assert not nodes(out,'/about/').all(id='assigned-tags')
 out=check('icons-off',"[cascade.params]\nicons=false\n")
 assert not any(n.tag=='svg' for n in nodes(out,'/notes/tag-pills/').all(id='assigned-tags')[0].all())
 out=check('repeated',"[cascade.params]\narticle_footer=['terms','terms','license']\nterms_in_header=true\n")
 d=nodes(out,'/notes/tag-pills/');ids=[n.attrs['id'] for n in d.all() if 'id' in n.attrs]
 assert len(ids)==len(set(ids))
 for id in ['assigned-tags','terms-2-assigned-tags','header-assigned-tags']:assert d.all(id=id)
 out=check('global',"[params.taxonomy_links]\ntags='global'\ncategories='global'\n")
 assert nodes(out,'/notes/tag-pills/').all(id='assigned-tags')[0].all(href='/tags/it/font/')
 write(source,'content/notes/tag-pills.md','---\ntitle: Long tags\ntags: ["a-very-long-tag-label-that-must-wrap-instead-of-overflowing-the-reading-column"]\n---\n')
 check('long')
 print('PASS article term pills: native scoped/global links, no hub rows, categories retained, empty/icons-off/repeated/header, EN/ZH/subpath and long labels; retained',run)
if __name__=='__main__':main()
