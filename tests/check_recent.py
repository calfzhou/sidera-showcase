"""Independent instances of one recent component: complete scoped date order, no second paginator or backend."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, all_articles
from check_p1b import build, copy_site, html, local_links
from check_p2f import nodes
from check_p2w import write, replace

TITLE='A very long <sample> & "quoted" title that stays on one line and keeps its full tooltip'

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='recent-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True);source=copy_site(run,'source')
    write(source,'content/signals/_index.md', '''+++
title='Signal notes'
preset='notes'
[params]
page_size=1
left=['menu','taxonomies','recent',{component='recent',config={order='publication'}}]
right=[{component='recent',config={order='publication'}},'recent']
recent_count=10
[cascade.params]
left=['menu','taxonomies','recent',{component='recent',config={order='publication'}}]
right=[{component='recent',config={order='publication'}},'recent']
recent_count=10
+++
''')
    metadata={
        'a':('Alpha','2024-02-01','2024-04-01',False),
        'b':('Beta','2024-03-01','2024-03-01',False),
        'c':('Pinned old note','2024-01-01','2024-05-01',True),
        'd':('Undated','','',False),
        'e':(TITLE,'2024-03-01','2024-03-01',False),
        'f':(TITLE,'2024-03-01','2024-03-01',False),
    }
    for key,(title,date,modified,pin) in metadata.items():
        fm='title='+json.dumps(title)+'\ntags=["shared"]\ncategories=["learning"]\n'
        if date:fm+=f'date={date}\nlastmod={modified}\n'
        write(source,f'content/signals/{key}.md','+++\n'+fm+f'[params]\npinned={str(pin).lower()}\n+++\nA note.\n')
    write(source,'content/signals/chapter/_index.md',"+++\ntitle='Chapter'\ndate=2024-06-01\nlastmod=2024-06-02\n+++\nA maintained branch.\n")
    write(source,'content/signals/annex/_index.md',"+++\ntitle='Independent annex'\n[params]\nscope_root=true\n+++\n")
    write(source,'content/signals/annex/separate.md',"+++\ntitle='Other scope'\ndate=2025-01-01\nlastmod=2025-02-01\n+++\n")
    write(source,'content/empty-recent/_index.md',"+++\ntitle='Empty'\n[params]\nleft=['recent',{component='recent',config={order='publication'}}]\nright=[]\n+++\n")
    write(source,'content/preset/extra/_index.md',"+++\ntitle='Extra'\n[params.defaults.params]\nleft=['recent',{component='recent',config={order='publication'}}]\n+++\n")
    def check(label,extra='',diagnostic=None):
        write(source,'probe.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,probe.toml','--printI18nWarnings'))
    def links(out,route,id):
        ul=nodes(out,route).all(id=id)[0]
        return [a.attrs['href'] for a in ul.all() if a.tag=='a']
    # Date ties sort by Title, then Path (e before f); pins affect neither widget.
    updated=['c','a','e','f','b','d'];published=['e','f','b','a','c','d']
    def expect(out,route,up=updated,pub=published,prefix=''):
        for id,expected in [('recent-updates',up),('recent-published',pub)]:
            for suffix in (['', '-right-2'] if id=='recent-updates' else ['-2', '-right']):
                assert links(out,route,id+suffix)==[prefix+'/signals/'+k+'/' for k in expected],(route,id,suffix)
        d=nodes(out,route);ids=[x.attrs['id'] for x in d.all() if 'id' in x.attrs];assert len(ids)==len(set(ids))
    out=check('baseline');local_links(out)
    for page in ['', 'page/2/', 'page/6/']:expect(out,'/signals/'+page)
    assert all_articles(out,'/signals/')[0]=='/signals/c/' # main list still honors pins
    expect(out,'/signals/tags/shared/')
    d=nodes(out,'/signals/')
    headings=[x.words() for x in d.all() if x.tag=='h2' and x.attrs.get('class')=='nav-heading']
    assert 'Tags' in headings and 'Categories' in headings and not any('Signal notes' in h for h in headings)
    for ul in [x for x in d.all() if 'data-recent' in x.attrs]:
        assert not any(x.tag in ('time','span','p') for x in ul.all())
        for a in [x for x in ul.all() if x.tag=='a']:assert a.attrs['title']==a.words()
    assert any(a.attrs.get('title')==TITLE for a in d.all() if a.tag=='a')
    assert not d.all(src='x') and '<sample>' not in html(out,'/signals/').read_text()
    assert 'recent-panel' not in html(out,'/empty-recent/').read_text()
    assert 'recent-scope' not in html(out,'/signals/').read_text()
    # Main list order doesn't change the two selected widget orders.
    replace(source,'content/signals/_index.md','page_size=1',"page_size=1\nlist_order='title'")
    out=check('title-main');expect(out,'/signals/')
    replace(source,'content/signals/_index.md','recent_count=10','recent_count=10\nrecent_sections=true')
    out=check('sections');expect(out,'/signals/',['chapter']+updated,['chapter']+published)
    replace(source,'content/signals/_index.md','recent_sections=true','recent_sections=false')
    replace(source,'content/signals/_index.md','recent_count=10','recent_count=2')
    out=check('limit');expect(out,'/signals/',updated[:2],published[:2])
    replace(source,'content/signals/_index.md','recent_count=2','recent_count=10')
    out=check('global',"[params]\nleft=['recent',{component='recent',config={order='publication'}}]\nright=[]\nrecent_count=10\n")
    assert links(out,'/','recent-updates')[0]=='/signals/annex/separate/'
    assert links(out,'/','recent-published-2')[0]=='/signals/annex/separate/'
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    expect(out,'/signals/',prefix='/_chinese')
    raw=html(out,'/signals/').read_text();assert '最近更新' in raw and '最近发布' in raw and 'Signal notes ·' not in raw
    out=check('off',"[cascade.params]\nleft=false\nright=[]\n")
    assert 'recent-panel' not in html(out,'/about/').read_text()
    replace(source,'content/preset/extra/_index.md',"left=['recent',{component='recent',config={order='publication'}}]","left=[{component='recent',config={count=0}}]")
    check('invalid-unused-preset',diagnostic='config.count')
    (run/'results.json').write_text(json.dumps({'builds':7,'rejections':1,'checks':['exact date/tie/undated order','pins and pagers independence','nested scope exclusion','optional sections','empty/disabled','shared limit','global scope','plain headings','escaped full-title tooltips','EN/ZH and subpath','both regions unique IDs','unused preset option validation']},indent=2))
    print('PASS recent components; retained',run)
if __name__=='__main__':main()
