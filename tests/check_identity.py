"""Focused site-identity rendering/config cases; no changes to the real site output."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_organization import ROOT
from check_tag_routes import copy_showcase, build, html
from check_shell import nodes
from check_docs import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='identity-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    def check(label,extra=''):
        write(source,'probe.toml',extra)
        return build(source,run,label,flags=('--config','hugo.toml,probe.toml','--printI18nWarnings'))
    out=check('baseline')
    d=nodes(out,'/notes/')
    assert len(d.all(**{'class':'identity-avatar'}))==2 # desktop rail + mobile header, no duplicate IDs
    assert all(n.attrs['href']=='/' for n in d.all(**{'class':'identity-avatar'})+d.all(**{'class':'identity-text'}))
    assert d.all(**{'class':'subtitle-normal'})[0].words()=='Notes & everyday tools'
    assert d.all(**{'class':'subtitle-hover'})[0].words()=='Small ideas, kept close'
    check('compact','[cascade.params]\nleft=false\nright=false\n')
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    assert all(n.attrs['href']=='/_chinese/' and n.attrs['aria-label']=='概览' for n in nodes(out,'/notes/').all(**{'class':'identity-avatar'}))
    out=check('plain',"[params.identity]\nsubtitle='A single subtitle'\n")
    assert not nodes(out,'/notes/').all(**{'class':'subtitle-hover'})
    out=check('escaped',"[params.identity]\ntitle='<img src=x onerror=alert(1)>'\nsubtitle=' <script>rest</script> | Hover & more | literal ' \n")
    d=nodes(out,'/notes/')
    assert d.all(**{'class':'subtitle-normal'})[0].words()=='<script>rest</script>'
    assert d.all(**{'class':'subtitle-hover'})[0].words()=='Hover & more | literal'
    assert not d.all(src='x') and '<script>rest</script>' not in html(out,'/notes/').read_text()
    out=check('empty',"[params.identity]\nimage=''\ntitle=''\nsubtitle=''\n[cascade.params]\nicons=false\n")
    assert not nodes(out,'/notes/').all(**{'class':'identity-avatar'})
    assert nodes(out,'/notes/').all(**{'class':'identity-text'})[0].words().strip()=='Overview'
    (run/'results.json').write_text(json.dumps({'checks':['native home links','split/plain/empty subtitle','escaping/literal pipes','Chinese subpath','compact/no-image/icons-off'],'builds':6},indent=2))
    print('PASS identity configuration; retained',run)
if __name__=='__main__':main()
