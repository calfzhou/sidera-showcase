"""Site sitemap defaults differ from sidebar/article navigation, without losing native links."""
from pathlib import Path
import os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_showcase, build, local_links
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='site-footer-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    def check(label,extra=''):
        write(source,'footer-check.toml',extra)
        return build(source,run,label,flags=('--config','hugo.toml,footer-check.toml','--printI18nWarnings'))
    def footer(out,route):return nodes(out,route).all(**{'class':'site-footer'})[0]
    out=check('baseline');local_links(out)
    for route in ['/about/','/notes/package-management/']:
        f=footer(out,route)
        assert not any(n.tag=='svg' for n in f.all())
        assert f.all(**{'aria-current':'page' if route=='/about/' else 'location'})
    # Surface default remains a default: existing explicit instance/widget icon choices still work.
    out=check('icon-opt-in',"[cascade.params]\nsite_footer=[{component='links',config={icons=true}}]\n")
    assert any(n.tag=='svg' for n in footer(out,'/about/').all())
    out=check('article-links',"[cascade.params]\narticle_footer=[{component='links',config={menu='primary'}}]\n")
    assert any(n.tag=='svg' for n in nodes(out,'/about/').all(**{'class':'article-footer'})[0].all())
    out=check('hidden',"[cascade.params]\nsite_footer=false\n")
    assert not nodes(out,'/about/').all(**{'class':'site-footer'})
    check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    print('PASS site-footer defaults and native/config behavior; retained',run)
if __name__=='__main__':main()
