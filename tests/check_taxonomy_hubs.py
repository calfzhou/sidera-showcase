"""All tags/categories are term indexes by default across presets and plain scopes."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build,local_links
from check_organization import all_articles
from check_shell import nodes
from check_docs import write

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    def check(label,extra=''):
        write(source,'hubs.toml',extra)
        return build(source,run,label,flags=('--config','hugo.toml,hubs.toml','--printI18nWarnings'))
    def index(out,scope,tax):
        d=nodes(out,f'/{scope}/{tax}/');assert not d.all(id='articles')
        found=d.all(**{'data-taxonomy-index':tax});assert len(found)==1
        return found[0]
    baseline=check('baseline');local_links(baseline)
    for scope in ['journal','notes','handbook']:
        for tax in ['tags','categories']:index(baseline,scope,tax)
    assert 'taxonomy-directory' in index(baseline,'notes','tags').attrs['class']
    assert not index(baseline,'handbook','tags').all(**{'class':'taxonomy-entry'}) # No invented doc tags.
    assert set(all_articles(baseline,'/notes/tags/tools/python/'))=={'/notes/package-management/','/notes/python-environments/'}
    # The same native metadata works for blog, notes, docs and a scope without a preset.
    write(source,'content/unclassified/_index.md','---\ntitle: Unclassified\n---\n')
    for scope in ['journal','notes','handbook','unclassified']:
        write(source,f'content/{scope}/hub-probe.md','---\ntitle: Hub probe\nslug: hub-probe\ndate: 2026-06-01\ntags: [shared/root, zebra]\ncategories: [practice/examples]\n---\nScoped test content.\n')
        write(source,f'content/{scope}/separate/_index.md','---\ntitle: Independent child scope\nparams:\n  scope_root: true\n---\n')
        write(source,f'content/{scope}/separate/isolated.md','---\ntitle: Isolated\ntags: [separate-only]\ncategories: [separate-only]\n---\n')
    for label,config,prefix in [('populated','',''),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",'/_chinese'),('subpath',"baseURL='https://example.org/preview/'\n",'/preview')]:
        out=check(label,config);local_links(out,prefix)
        for scope in ['journal','notes','handbook','unclassified']:
            target=f'/{scope}/hub-probe/' if scope!='journal' else '/journal/2026/06/01/hub-probe/'
            for tax,key in [('tags','shared/root'),('categories','practice/examples')]:
                idx=index(out,scope,tax)
                assert idx.all(href=f'{prefix}/{scope}/{tax}/{key}/')
                assert not idx.all(href=f'{prefix}/{scope}/{tax}/separate-only/')
                assert all_articles(out,f'/{scope}/{tax}/{key}/')==[prefix+target]
                entry=next(n for n in idx.all() if n.attrs.get('data-term-count')=='1' and n.all(href=f'{prefix}/{scope}/{tax}/{key}/'))
                assert entry
            tags=index(out,scope,'tags');assert ('taxonomy-directory' in tags.attrs['class'])==(scope=='notes')
        assert index(out,'notes','tags').all(href=prefix+'/notes/tags/shared/') # Hierarchical implicit parent remains a term.
    paged=check('paged',"[params]\ntaxonomy_page_size=1\n")
    for scope in ['journal','notes','handbook','unclassified']:
        assert nodes(paged,f'/{scope}/tags/').all(**{'data-page-link':'next'})
        assert not nodes(paged,f'/{scope}/tags/page/2/').all(id='articles')
    # An explicit owner choice can retain the old all-content view; defaults elsewhere do not change.
    p=source/'content/notes/_index.md';p.write_text(p.read_text().replace('params:\n','params:\n  taxonomy_hubs: list\n',1))
    out=check('list-opt-in');assert nodes(out,'/notes/tags/').all(id='articles');index(out,'handbook','tags')
    print('PASS shared default taxonomy indexes: live/empty and populated blog/notes/docs/plain, exact scoped membership, hierarchy/counts, explicit list, pagination, EN/ZH/subpath; retained',run)
if __name__=='__main__':main()
