"""One per-page date preference across header/cards, independent of every containing list."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase,build,local_links
from check_p1a import all_articles
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    def check(label,extra='',diagnostic=None):
        write(source,'primary.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,primary.toml','--printI18nWarnings'))
    def first_date(out,route):
        d=nodes(out,route);primary=d.all(**{'class':'date-primary'})
        return next((n for n in primary[0].all() if n.tag=='time'),None) if primary else None
    def cards(out,route):
        result={}
        for card in nodes(out,route).all(**{'class':'article-card'}):
            link=card.all(**{'class':'card-title'})[0].attrs['href']
            dates=card.all(**{'class':'card-date'})
            if dates:result[link]=next((n for n in dates[0].all() if n.tag=='time'),None)
        return result
    def agree(out,list_route,article_route,kind,prefix=''):
        card=cards(out,list_route)[prefix+article_route];head=first_date(out,article_route)
        assert card and head,(list_route,article_route)
        assert card.attrs['datetime']==head.attrs['datetime']
        assert head.attrs['class']==kind and card.attrs['class']==('modified' if kind=='updated' else 'published')
    for scope,preset in [('date-blog','blog'),('date-notes','notes'),('date-docs','docs'),('date-plain','')]:
        preset_line='preset: '+preset+'\n' if preset else ''
        write(source,f'content/{scope}/_index.md',f'---\ntitle: {scope}\n{preset_line}date: 2025-01-01\nlastmod: 2025-06-01\nparams:\n  list_order: publication\n  children:\n    order: [a, z]\ncascade:\n  params:\n    show_updated: true\n---\nExample scope.\n')
        for name,published,updated in [('a','2025-01-01','2025-06-03'),('z','2025-01-03','2025-06-01')]:
            write(source,f'content/{scope}/{name}.md',f'---\ntitle: {name}\npublishDate: {published}\nlastmod: {updated}\ntags: [date-proof]\n---\nA date-priority example.\n')
    baseline=check('baseline');local_links(baseline)
    for scope,kind in [('journal','published'),('notes','updated'),('handbook','updated')]:
        for article,date in cards(baseline,f'/{scope}/').items():
            if date:agree(baseline,f'/{scope}/',article,kind)

    for scope,kind in [('date-blog','published'),('date-notes','updated'),('date-docs','updated'),('date-plain','published')]:
        for name in ['a','z']:
            route=f'/{scope}/{name}/'
            agree(baseline,f'/{scope}/',route,kind);agree(baseline,'/tags/date-proof/',route,kind)
            agree(baseline,f'/{scope}/tags/date-proof/',route,kind)
        if scope!='date-docs':assert all_articles(baseline,f'/{scope}/')==[f'/{scope}/z/',f'/{scope}/a/']
    assert list(cards(baseline,'/date-docs/'))==['/date-docs/a/','/date-docs/z/'] # Manual child order is unchanged.
    assert first_date(baseline,'/date-docs/').attrs['class']=='updated' # Dated preset root as well as descendants.
    order_roots=[source/f'content/{scope}/_index.md' for scope in ['date-notes','date-blog']]
    originals=[p.read_text() for p in order_roots]
    for order in ['modification','title']:
        for p,text in zip(order_roots,originals):p.write_text(text.replace('list_order: publication','list_order: '+order))
        out=check('sort-'+order)
        for scope in ['date-notes','date-blog']:
            assert nodes(out,f'/{scope}/').all(**{'data-list-order':order})
            assert all_articles(out,f'/{scope}/')==[f'/{scope}/a/',f'/{scope}/z/']
        agree(out,'/date-notes/','/date-notes/a/','updated');agree(out,'/date-blog/','/date-blog/a/','published')
    for p,text in zip(order_roots,originals):p.write_text(text)
    out=check('site',"[params]\nprimary_date='updated'\nshow_updated=true\n")
    agree(out,'/date-plain/','/date-plain/a/','updated');agree(out,'/date-blog/','/date-blog/a/','published')
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    agree(out,'/date-docs/','/date-docs/a/','updated','/_chinese');local_links(out,'/_chinese')
    # Real page and cascade overrides use the existing native precedence.
    p=source/'content/date-notes/a.md';original=p.read_text();p.write_text(original.replace('---\nA date-', 'params:\n  primary_date: published\n---\nA date-'))
    out=check('page');agree(out,'/date-notes/','/date-notes/a/','published');agree(out,'/tags/date-proof/','/date-notes/a/','published')
    p.write_text(original)
    root=source/'content/date-notes/_index.md';root_original=root.read_text();root.write_text(root_original.replace('    show_updated: true','    show_updated: true\n    primary_date: published'))
    out=check('cascade');agree(out,'/date-notes/','/date-notes/a/','published');root.write_text(root_original)
    p.write_text(original.replace('---\nA date-', 'params:\n  show_updated: false\n---\nA date-'))
    out=check('hidden');agree(out,'/date-notes/','/date-notes/a/','published');p.write_text(original)
    # No preferred timestamp: both renderers select the same available fallback.
    write(source,'content/date-notes/missing.md','---\ntitle: Missing update\npublishDate: 2025-02-01\n---\n')
    write(source,'content/date-notes/undated.md','---\ntitle: Undated\n---\n')
    out=check('missing',"[frontmatter]\nlastmod=['lastmod']\npublishDate=['publishDate']\ndate=['date']\n")
    agree(out,'/date-notes/','/date-notes/missing/','published');assert not first_date(out,'/date-notes/undated/')
    assert 'Updated: undated' in nodes(out,'/date-notes/').words()
    # Language-level site fallback remains native, with a minimal translated scope.
    write(source,'content/date-plain/_index.zh.md','---\ntitle: 日期示例\n---\n')
    write(source,'content/date-plain/a.zh.md',original)
    write(source,'content/about.zh.md',(source/'content/about.md').read_text())
    multi=check('language',"defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n[languages.zh.params]\nprimary_date='updated'\nshow_updated=true\n")
    assert first_date(multi,'/en/date-plain/a/').attrs['class']=='published'
    assert first_date(multi,'/zh/date-plain/a/').attrs['class']=='updated'
    for label,value in [('enum',"'modification'"),('empty',"''"),('bool','true'),('map','{}')]:
        check('bad-'+label,f'[params]\nprimary_date={value}\n','primary_date must be published or updated')
    write(source,'content/date-notes/bad.md','---\ntitle: Invalid draft\ndraft: true\nparams:\n  primary_date: wrong\n---\n')
    check('bad-draft',diagnostic='primary_date must be published or updated')
    write(source,'content/date-notes/bad.md','---\ntitle: Invalid placement\nprimary_date: updated\n---\n')
    check('bad-placement',diagnostic='primary_date belongs under params')
    write(source,'content/date-notes/bad.md','---\ntitle: Valid isolated draft\ndraft: true\n---\n')
    write(source,'content/preset/unused-date/_index.md','---\ntitle: Unused preset\nparams:\n  defaults:\n    cascade:\n      params:\n        primary_date: wrong\n---\n')
    check('bad-unused-preset',diagnostic='primary_date must be published or updated')
    print('PASS primary_date: shared header/card priority, preset/page/cascade/site/language defaults, independent publication/modification/title/manual ordering, global/scoped views, visibility/missing dates and invalid-input rejection; retained',run)
if __name__=='__main__':main()
