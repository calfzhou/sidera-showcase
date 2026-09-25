"""Corrective presentation: normal live site, optional regions, boolean and i18n checks."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_showcase, build, html, local_links
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p2gr-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    def check(label,extra='',diagnostic=None):
        write(source,'probe.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,probe.toml','--printI18nWarnings'))
    baseline=check('baseline');local_links(baseline)
    raw=html(baseline,'/notes/').read_text()
    assert 'class="view-header"' not in raw and 'class="visually-hidden">Notes</h1>' in raw
    assert 'data-total="6"' in raw and 'data-toc' not in raw and 'data-page-link="next"' in raw
    assert 'class="view-header"' in html(baseline,'/notes/tags/tools/').read_text()
    assert not (baseline/'sidera/index.html').exists()
    assert 'Solar icons by 480 Design' in raw
    assert 'data-toc' in html(baseline,'/notes/package-management/').read_text()
    # Real local page setting beats Site fallback, including false; true restores native body TOC.
    fallback=check('site-fallback','[params]\nlist_header=true\n')
    assert 'class="view-header"' not in html(fallback,'/notes/').read_text()
    page=source/'content/notes/_index.md';original=page.read_text()
    page.write_text(original.replace('list_header: false','list_header: true')+'\n## A visible introduction\n\nA normal section body.\n')
    shown=check('header-on','[params]\nlist_header=false\n')
    assert 'A visible introduction' in html(shown,'/notes/').read_text() and 'data-toc' in html(shown,'/notes/').read_text()
    page.write_text(original+'\n## A deliberately hidden introduction\n\nHidden by an explicit setting.\n')
    hidden=check('header-off')
    assert 'data-toc' not in html(hidden,'/notes/').read_text()
    page.write_text(original)
    check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    check('widgets',(source/'examples/widgets.toml').read_text())
    check('right-only','[cascade.params]\nleft=false\nright=["toc","profile"]\n')
    check('compact','[cascade.params]\nleft=false\nright=false\narticle_footer=false\nsite_footer=["text"]\n')
    off=check('icons-off','[cascade.params]\nicons=false\n')
    assert not any(n.tag=='svg' for n in nodes(off,'/notes/').all())
    assert 'Pinned' in html(off,'/notes/').read_text()
    check('invalid-header','[params]\nlist_header="hidden"\n','list_header')
    # Invalid values in unused preset maps also diagnose (same model validator).
    write(source,'content/preset/unused/_index.md','---\ntitle: Unused\nparams:\n  defaults:\n    params:\n      list_header: hidden\n---\n')
    check('invalid-preset-header',diagnostic='list_header')
    (run/'results.json').write_text(json.dumps({'checks':'normal source, header precedence/TOC, taxonomy title, counts/pager, no-docs, EN/ZH, compact/widgets/icons-off, invalid public and unused-preset boolean','builds':9,'rejections':2},indent=2))
    print('PASS P2-GR configuration; retained',run)
if __name__=='__main__':main()
