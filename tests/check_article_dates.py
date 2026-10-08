"""Native header dates: page priority, visibility opt-out, missing values and no default footer repeat."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build,local_links
from check_shell import nodes
from check_docs import write

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    def check(label,extra=''):
        write(source,'dates.toml',extra)
        return build(source,run,label,flags=('--config','hugo.toml,dates.toml','--printI18nWarnings'))
    def times(out,route):
        d=nodes(out,route);row=d.all(**{'class':'article-dates'})
        assert not any(n.tag=='time' for f in d.all(**{'class':'article-footer'}) for n in f.all())
        return [n for n in row[0].all() if n.tag=='time'] if row else []
    write(source,'content/date-probe/_index.md','---\ntitle: Date examples\npreset: blog\n---\n')
    both='publishDate: 2025-04-26\nlastmod: 2026-06-14\n'
    for name,fields in [('both',both),('same','publishDate: 2025-04-26\nlastmod: 2025-04-26\n'),('updated-only','lastmod: 2026-06-14\n'),('published-only','publishDate: 2025-04-26\n'),('none',''),('hidden',both+'params:\n  show_updated: false\n')]:
        write(source,f'content/date-probe/{name}.md','---\ntitle: Date '+name+'\n'+fields+'---\n\n## Example\n\nA dated article.\n')
    baseline=check('baseline');local_links(baseline)
    assert [t.attrs['class'] for t in times(baseline,'/date-probe/both/')]==['published','updated']
    assert [t.attrs['datetime'] for t in times(baseline,'/date-probe/both/')]==['2025-04-26T00:00:00+08:00','2026-06-14T00:00:00+08:00']
    assert [t.attrs['class'] for t in times(baseline,'/notes/package-management/')]==['updated','published']
    assert len(times(baseline,'/date-probe/same/'))==2
    assert len(times(baseline,'/date-probe/hidden/'))==1
    assert not times(baseline,'/date-probe/none/')
    for label,extra in [('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n"),('title',"[cascade.params]\nlist_order='title'\n"),('modified',"[cascade.params]\nlist_order='modification'\n")]:
        out=check(label,extra)
        expected=['published','updated'] # Sort changes do not change the page's primary_date.
        assert [t.attrs['class'] for t in times(out,'/date-probe/both/')]==expected
        assert not any('Modified' in t.words() or '修改' in t.words() for t in times(out,'/notes/package-management/'))
    missing=check('missing',"[frontmatter]\nlastmod=['lastmod']\npublishDate=['publishDate']\ndate=['date']\n")
    for name,kind in [('updated-only','updated'),('published-only','published')]:
        assert [t.attrs['class'] for t in times(missing,'/date-probe/'+name+'/')]==[kind]
        row=nodes(missing,'/date-probe/'+name+'/').all(**{'class':'article-dates'})[0]
        assert 'tabindex' not in row.attrs and not row.all(**{'class':'date-secondary'})
    explicit=check('explicit-footer',"[cascade.params]\narticle_footer=['meta']\n")
    assert nodes(explicit,'/date-probe/both/').all(**{'class':'article-footer'}) # Owner opt-in is still supported.
    print('PASS article dates: page priority independent of sort, native timestamps, equal/missing dates, show_updated false, EN/ZH, default footer omission and explicit meta opt-in; retained',run)
if __name__=='__main__':main()
