"""Native pager URLs/order plus source-led six-page and larger-window fixtures."""
from pathlib import Path
import os, sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase, build, local_links
from check_p1c import check_list
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    for section,count in [('pager-demo',6),('pager-long',12),('pager-single',1),('pager-empty',0)]:
        write(source,f'content/{section}/_index.md',f'---\ntitle: Pager example\nparams:\n  show_list: true\n  page_size: 1\n  list_order: title\n---\n')
        for n in range(1,count+1):
            write(source,f'content/{section}/entry-{n:02}.md',f'---\ntitle: Entry {n:02}\n---\nA small entry for checking native page navigation.\n')
    for label,config,prefix in [('baseline','',''),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview')]:
        write(source,'pager.toml',config)
        out=build(source,run,label,flags=('--config','hugo.toml,pager.toml','--printI18nWarnings'))
        for section,count in [('pager-demo',6),('pager-long',12),('pager-single',1),('pager-empty',0)]:
            check_list(out,f'/{section}/',[f'/{section}/entry-{n:02}/' for n in range(1,count+1)],'title',1,prefix=prefix)
        local_links(out,prefix)
        for number,expected in [(1,['1','2','3','…','6']),(2,['1','2','3','4','…','6']),(6,['1','…','4','5','6'])]:
            route='/pager-demo/'+(f'page/{number}/' if number>1 else '')
            d=nodes(out,route);bar=d.all(**{'class':'pagination'})[0]
            wide=bar.all(**{'data-radius':'2'})[0]
            assert [n.words().strip() for n in wide.children]==expected
            assert len(wide.all(**{'aria-current':'page'}))==1
            assert len(bar.all(**{'aria-disabled':'true'}))==(number in (1,6))
        assert not nodes(out,'/pager-single/').all(**{'data-page-link':'next'})
        assert not nodes(out,'/pager-empty/').all(**{'class':'pagination-pages'})
    print('PASS native pager first/previous/next/last URLs, order, 0/1/6/12 pages, windows/gaps, EN/ZH/subpath; retained',run)
if __name__=='__main__':main()
