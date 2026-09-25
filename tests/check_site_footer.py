"""Site sitemap defaults differ from sidebar/article navigation, without losing native links."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_showcase, build, local_links
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='site-footer-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    def check(label,extra='',diagnostic=None):
        write(source,'footer-check.toml',extra)
        return build(source,run,label,diagnostic,flags=('--config','hugo.toml,footer-check.toml','--printI18nWarnings'))
    def footer(out,route):return nodes(out,route).all(**{'class':'site-footer'})[0]
    baseline=out=check('baseline');local_links(out)
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
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    # Native translated credit supports Markdown, not arbitrary trusted HTML by default.
    def credit(out):
        return next(n for n in footer(out,'/about/').all() if 'theme-credit' in n.attrs.get('class','').split())
    assert credit(out).words().strip() == '由 Hugo · Sidera 构建'
    assert credit(baseline).words().strip() == 'Built with Hugo · Sidera'
    def translation(locale,text):
        write(source,'i18n/'+locale+'.toml','[built_with]\nother = '+json.dumps(text,ensure_ascii=False)+'\n')
    translation('en','Built with [Hugo](https://gohugo.io/) · **Sidera**\n\n[About](/about/) and `code`.')
    out=check('credit-markdown');local_links(out)
    c=credit(out)
    assert c.tag=='div' and len([n for n in c.children if n.tag=='p'])==2
    assert c.all(href='https://gohugo.io/') and c.all(href='/about/')
    assert any(n.tag=='strong' and n.words()=='Sidera' for n in c.all())
    assert any(n.tag=='code' and n.words()=='code' for n in c.all())
    translation('zh-CN','由 [Hugo](https://gohugo.io/) · **Sidera** 构建')
    out=check('credit-chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\n")
    assert '由 ' in credit(out).words() and credit(out).all(href='https://gohugo.io/')
    translation('en','Credit <span class="owner-credit">trusted HTML</span>')
    check('credit-html-rejected',diagnostic='Raw HTML omitted')
    out=check('credit-html-opt-in',"[markup.goldmark.renderer]\nunsafe=true\n")
    assert credit(out).all(**{'class':'owner-credit'})
    print('PASS site-footer defaults, native/config behavior and Markdown credit; retained',run)
if __name__=='__main__':main()
