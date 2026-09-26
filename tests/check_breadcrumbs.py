"""Shared header ancestry, native URLs and scope boundaries; isolated strict builds."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase,build,local_links
from check_p2f import nodes
from check_p2w import write

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 write(source,'content/notes/nested/_index.md','---\ntitle: Independent\nparams:\n  scope_root: true\n---\n')
 write(source,'content/notes/nested/branch/_index.md','---\ntitle: Branch\n---\n')
 write(source,'content/notes/nested/branch/leaf.md','---\ntitle: Leaf\n---\n')
 cases={
 '/notes/package-management/':['/','/notes/','/notes/package-management/'],
 '/journal/2026/04/10/beginning/':['/','/journal/','/journal/2026/04/10/beginning/'],
 '/handbook/':['/','/handbook/'],
 '/handbook/workflows/writing/outline/':['/','/handbook/','/handbook/workflows/','/handbook/workflows/writing/','/handbook/workflows/writing/outline/'],
 '/about/':['/','/about/'],
 '/notes/nested/branch/leaf/':['/','/notes/nested/','/notes/nested/branch/','/notes/nested/branch/leaf/'],
 '/notes/nested/branch/':['/','/notes/nested/','/notes/nested/branch/'],
 }
 for label,config,prefix,home in [('baseline','','','Home'),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese','首页'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview','Home')]:
  write(source,'breadcrumbs.toml',config)
  out=build(source,run,label,flags=('--config','hugo.toml,breadcrumbs.toml','--printI18nWarnings'));local_links(out,prefix)
  for route,expected in cases.items():
   nav=nodes(out,route).all(**{'class':'page-breadcrumbs'});assert len(nav)==1,route
   links=[n for n in nav[0].all() if n.tag=='a']
   assert [n.attrs['href'] for n in links]==[prefix+p for p in expected[:-1]],route
   assert links[0].words()==home
   assert all(n.attrs['href'] != prefix+route for n in links)
   assert not nav[0].words().rstrip().endswith('/')
   assert [n.attrs['href'] for n in links if n.attrs.get('aria-current')=='page']==[]
   assert len(nav[0].all(**{'class':'breadcrumb-separator'}))==len(expected)-2
  # Consolidated taxonomy trail, with native hub/term links and no repeated second row.
  route='/notes/tags/tools/'
  d=nodes(out,route);nav=d.all(**{'class':'page-breadcrumbs'})[0]
  assert [n.attrs['href'] for n in nav.all() if n.tag=='a']==[prefix+p for p in ['/','/notes/','/notes/tags/']]
  assert not d.all(**{'class':'breadcrumbs'})
  assert not nodes(out,'/notes/').all(**{'class':'page-breadcrumbs'}) # list_header=false stays honored.
 print('PASS breadcrumbs: article/docs/section/standalone/scoped taxonomy, nested roots, dated URLs, no current/self link or trailing separator, EN/ZH/subpath and local links; retained',run)
if __name__=='__main__':main()
