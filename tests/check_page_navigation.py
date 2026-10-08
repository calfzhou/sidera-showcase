"""Collection-owned adjacency: same native list/tree, no paginator or referrer state."""
from pathlib import Path
import os,sys,json
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build,local_links,html
from check_organization import all_articles
from check_shell import nodes
from check_docs import write

def nav(out,route):
    d=nodes(out,route);found=d.all(**{'class':'page-navigation'})
    assert len(found)<=1,route
    return {a.attrs['data-navigation']:a.attrs['href'] for a in found[0].all() if 'data-navigation' in a.attrs} if found else {}

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    language_config=''
    def check(label,extra='',diagnostic=None,flags=()):
        write(source,'navigation.toml',language_config+extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,navigation.toml','--printI18nWarnings',*flags))
    def expect(out,route,links,prefix=''):
        assert nav(out,route)=={k:prefix+v for k,v in links.items()},(route,nav(out,route),links)
    baseline=check('baseline');local_links(baseline)
    for owner in ['journal','notes']:
        routes=all_articles(baseline,'/'+owner+'/')
        for i,route in enumerate(routes):
            links={}
            if i:links['previous']=routes[i-1]
            if i+1<len(routes):links['next']=routes[i+1]
            expect(baseline,route,links)
    assert nodes(baseline,'/journal/2026/04/10/beginning/').all(**{'class':'series-navigation'})
    expect(baseline,'/handbook/',{})
    expect(baseline,'/handbook/start/',{'parent':'/handbook/','next':'/handbook/workflows/'})
    expect(baseline,'/handbook/workflows/',{'parent':'/handbook/','previous':'/handbook/start/','next':'/handbook/review/'})
    expect(baseline,'/handbook/workflows/writing/',{'parent':'/handbook/workflows/','next':'/handbook/workflows/research/'})
    for route in ['/about/','/notes/tags/','/notes/tags/tools/python/','/journal/archives/','/authors/rowan/','/notes/page/2/']:expect(baseline,route,{})
    # Cross all modes with all presets and no preset: the preset is not a capability gate.
    roots=[]
    for preset in ['blog','notes','docs','plain']:
      for mode in ['list','siblings','sequential']:
        root=preset+'-'+mode;roots.append((root,preset,mode))
        write(source,f'content/{root}/_index.md',f'''---
title: {root}
'''+('preset: '+preset+'\n' if preset!='plain' else '')+f'''params:
  navigation_mode: {mode}
  list_mode: recursive
  list_order: publication
  page_size: 1
  children:
    order: [a, b, c]
---
A real collection overview.
''')
        write(source,f'content/{root}/a/_index.md','---\ntitle: Chapter A\nparams:\n  children:\n    order: [a2, a1]\n    page_size: 1\n---\nA body-bearing chapter.\n')
        for name,date,pin in [('a/a1','2025-01-01',False),('a/a2','2025-01-02',False),('b','2025-01-03',True),('c','2025-01-04',False)]:
            write(source,f'content/{root}/{name}.md',f'---\ntitle: {name}\ndate: {date}\nparams:\n  pinned: {str(pin).lower()}\n---\nA page.\n')
        for name,field in [('draft','draft: true'),('future','date: 2099-01-01'),('unlisted','build:\n  list: never\n  render: always')]:
            write(source,f'content/{root}/{name}.md',f'---\ntitle: {name}\n{field}\n---\n')
        write(source,f'content/{root}/independent/_index.md','---\ntitle: Separate scope\npreset: docs\nparams:\n  scope_root: true\n  navigation_mode: sequential\n---\nIndependent root.\n')
        write(source,f'content/{root}/independent/only.md','---\ntitle: Only child\n---\n')
    def verify(out,prefix=''):
      for root,preset,mode in roots:
        base='/'+root+'/'
        if mode=='list':sequence=['b','c','a/a2','a/a1']
        elif mode=='sequential':sequence=['','a','a/a2','a/a1','b','c']
        else:sequence=[]
        route=lambda part:base+(part+'/' if part else '')
        if sequence:
          for i,part in enumerate(sequence):
            links={}
            if part and mode!='list':links['parent']=base+('a/' if '/' in part else '')
            if i:links['previous']=route(sequence[i-1])
            if i+1<len(sequence):links['next']=route(sequence[i+1])
            expect(out,route(part),links,prefix)
        else:
          expect(out,base,{})
          for group,parent in [(['a','b','c'],base),(['a/a2','a/a1'],base+'a/')]:
            for i,part in enumerate(group):
              links={'parent':parent}
              if i:links['previous']=route(group[i-1])
              if i+1<len(group):links['next']=route(group[i+1])
              expect(out,route(part),links,prefix)
        expect(out,base+'independent/',{'next':base+'independent/only/'},prefix)
        expect(out,base+'independent/only/',{'parent':base+'independent/','previous':base+'independent/'},prefix)
        # List paging never creates another reading-navigation instance or narrows adjacency.
        expect(out,base+'page/2/',{})
        assert all_articles(out,prefix+base,prefix)==[prefix+route(p) for p in ['b','c','a/a2','a/a1']]
        expect(out,base+'tags/',{})
    write(source,'content/navigation-fallback/_index.md','---\ntitle: Plain fallback\n---\n')
    write(source,'content/navigation-fallback/a.md','---\ntitle: A\n---\n')
    out=check('matrix');verify(out);local_links(out);expect(out,'/navigation-fallback/',{})
    expect(out,'/navigation-fallback/a/',{})
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n");verify(out,'/_chinese');local_links(out,'/_chinese')
    out=check('subpath',"baseURL='https://example.org/preview/'\n");verify(out,'/preview');local_links(out,'/preview')
    # Site-level fallback is available for plain roots; presets retain normal precedence.
    out=check('site',"[params]\nnavigation_mode='sequential'\n")
    expect(out,'/handbook/start/',{'parent':'/handbook/','next':'/handbook/workflows/'})
    expect(out,'/navigation-fallback/',{'next':'/navigation-fallback/a/'})
    # Read the mode only from the root even if a nested section selects another preset.
    root=source/'content/notes-sequential/_index.md';saved=root.read_text()
    chapter=source/'content/notes-sequential/a/_index.md';chapter.write_text(chapter.read_text().replace('title: Chapter A','title: Chapter A\npreset: docs'))
    out=check('mixed');expect(out,'/notes-sequential/a/a1/',{'parent':'/notes-sequential/a/','previous':'/notes-sequential/a/a2/','next':'/notes-sequential/b/'})
    # Title/date/primary-date changes affect only the policy that owns them.
    root.write_text(saved.replace('navigation_mode: sequential','navigation_mode: list').replace('list_order: publication','list_order: title'))
    out=check('title');expect(out,'/notes-sequential/a/a1/',{'previous':'/notes-sequential/b/','next':'/notes-sequential/a/a2/'})
    root.write_text(saved)
    # Docs list mode uses its actual ordered immediate-child list, not a second date sort.
    handbook=source/'content/handbook/_index.md';hs=handbook.read_text();handbook.write_text(hs.replace('params:\n','params:\n  navigation_mode: list\n',1))
    out=check('children-list');expect(out,'/handbook/workflows/',{'previous':'/handbook/start/','next':'/handbook/review/'})
    expect(out,'/handbook/workflows/writing/',{})
    handbook.write_text(hs.replace('params:\n','params:\n  navigation_mode: sequential\n',1))
    out=check('live-sequential');expect(out,'/handbook/review/',{'parent':'/handbook/','previous':'/handbook/workflows/research/evaluate/','next':'/handbook/reference/'})
    # Later docs child pagers omit reading navigation, even though page 1 contains it.
    handbook.write_text(hs.replace('params:\n','params:\n  navigation_mode: sequential\n',1).replace('  children:\n','  children:\n    page_size: 1\n',1))
    out=check('child-pagers');expect(out,'/handbook/page/2/',{});assert nav(out,'/handbook/').get('next')
    handbook.write_text(handbook.read_text().replace('    page_size: 1','    page_size: 1\n    list: false'))
    out=check('hidden-children');assert nav(out,'/handbook/').get('next') # Hiding child cards never hides the tree sequence.
    handbook.write_text(hs)
    out=check('included-states',flags=('--buildDrafts','--buildFuture'))
    expect(out,'/blog-list/b/',{'next':'/blog-list/future/'})
    assert '/blog-sequential/draft/' in nav(out,'/blog-sequential/c/').values()
    # Existing scoped-route validation rejects non-rendered roots before publishing blank links.
    fallback=source/'content/navigation-fallback/_index.md';fallback_text=fallback.read_text()
    fallback.write_text(fallback_text.replace('title: Plain fallback','title: Plain fallback\nbuild:\n  render: never\nparams:\n  navigation_mode: sequential'))
    check('nonrendered-root',diagnostic='scoped route must follow its content path')
    fallback.write_text(fallback_text)
    # Actual bilingual Pages, with an untranslated child excluded from the Chinese sequence.
    for name,text in [('_index','title: 目录\nparams:\n  navigation_mode: sequential\n  children:\n    order: [a, b]\n'),('a/_index','title: 甲\n'),('a/a2','title: 乙\n'),('b','title: 丙\n')]:
        write(source,f'content/plain-sequential/{name}.zh.md','---\n'+text+'---\n中文正文。\n')
    write(source,'content/about.zh.md',(source/'content/about.md').read_text())
    language_config="defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n"
    out=check('bilingual')
    expect(out,'/zh/plain-sequential/a/a2/',{'parent':'/zh/plain-sequential/a/','previous':'/zh/plain-sequential/a/','next':'/zh/plain-sequential/b/'})
    expect(out,'/en/plain-sequential/a/a2/',{'parent':'/en/plain-sequential/a/','previous':'/en/plain-sequential/a/','next':'/en/plain-sequential/a/a1/'})
    local_links(out)
    write(source,'content/navigation-invalid.md','---\ntitle: Invalid placement\ndraft: true\nnavigation_mode: list\n---\n')
    check('bad-placement',diagnostic='navigation_mode belongs under params')
    write(source,'content/navigation-invalid.md','---\ntitle: Valid draft\ndraft: true\n---\n')
    for label,value in [('enum' ,"'depth'"),('type','false'),('empty',"''")]:check('bad-'+label,'[params]\nnavigation_mode='+value+'\n','navigation_mode must be')
    write(source,'content/navigation-invalid.md','---\ntitle: Invalid draft\ndraft: true\nparams:\n  navigation_mode: list\n---\n')
    check('bad-page',diagnostic='navigation_mode belongs on a collection root')
    write(source,'content/navigation-invalid.md','---\ntitle: Draft\ndraft: true\n---\n')
    write(source,'content/plain-sequential/bad/_index.md','---\ntitle: Nested\nparams:\n  navigation_mode: list\n---\n')
    check('bad-nonroot',diagnostic='navigation_mode belongs on a collection root')
    write(source,'content/plain-sequential/bad/_index.md','---\ntitle: Nested\n---\n')
    check('bad-cascade',"[cascade.params]\nnavigation_mode='list'\n",'navigation_mode belongs on a collection root')
    write(source,'content/preset/unused-navigation/_index.md','---\ntitle: Unused\nparams:\n  defaults:\n    params:\n      navigation_mode: bad\n---\n')
    check('bad-unused',diagnostic='navigation_mode must be')
    write(source,'content/preset/unused-navigation/_index.md','---\ntitle: Unused\nparams:\n  defaults:\n    cascade:\n      params:\n        navigation_mode: list\n---\n')
    check('bad-preset-cascade',diagnostic='not cascade')
    print('PASS navigation: exact list/pinned/sibling/preorder targets, cross-presets/plain scopes, root-only policy, independent boundaries, canonical pagers, language/subpath and validation; retained',run)
if __name__=='__main__':main()
