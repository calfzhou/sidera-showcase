"""Focused G footer/cover/config/safety regression. One isolated source, no dependencies."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode = True
from check_p1a import ROOT, check_baseline
from check_p1b import build, copy_site, html
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p2g-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True)
    source=copy_site(run,'source'); passed=[]; rejected=[]
    def check(label,config='',diagnostic=None,flags=()):
        write(source,'g.toml',config)
        out=build(source,run,label,diagnostic,('--config','hugo.toml,g.toml','--printI18nWarnings',*flags))
        (rejected if diagnostic else passed).append(label);return out
    def items(out,route,region):
        footer=next((n for n in nodes(out,route).all() if n.attrs.get('class')==region),None)
        return [n.attrs['data-footer-item'] for n in footer.children if 'data-footer-item' in n.attrs] if footer else []
    alpha='/field-notes/alpha/'
    baseline=check('baseline');check_baseline(baseline)
    assert items(baseline,alpha,'article-footer')==['terms','meta','series']
    assert items(baseline,'/','site-footer')==['credit']
    assert not items(baseline,'/about/','article-footer')
    # Use native separate config files, not duplicate TOML tables.
    write(source,'full.toml',(ROOT/'examples/full-shell.toml').read_text())
    write(source,'components.toml',(ROOT/'examples/components.toml').read_text())
    flags=('--config','hugo.toml,full.toml,components.toml,g.toml')
    # Long ordinary content for TOC scrolling; authors/series come from existing native fixtures.
    with (source/'content/field-notes/alpha/index.md').open('a') as f:
        for i in range(1,5):f.write('\n## Observation '+str(i)+'\n\n'+('A synthetic reading paragraph for scrolling and native heading navigation.\n\n'*8))
    # Real native author portrait in a term's own resource context, including scoped author links.
    author=source/'content/authors/demo-researcher/_index.md'
    author.write_text(author.read_text().replace('\n+++\n','\n[params]\navatar="images/sidera-mark.svg"\n+++\n'))
    full=check('components',flags=flags)
    assert items(full,alpha,'article-footer')==['terms','meta','series','text','links']
    assert items(full,alpha,'site-footer')==['links','text','credit']
    cover=[n for n in nodes(full,'/field-notes/').all() if n.tag=='img' and n.attrs.get('alt')=='Two connected sample nodes'];assert len(cover)==1
    assert cover[0].attrs['src']=='/field-notes/alpha/sample.svg'
    assert 'article-footer' not in html(full,'/guidebook/page/2/').read_text()
    assert any(n.tag=='img' and n.attrs.get('alt')=='' for n in nodes(full,alpha).all(id='assigned-authors')[0].all())
    assert nodes(full,'/field-notes/').all(**{'aria-current':'page'})
    assert 'javascript:' not in html(full,alpha).read_text()
    icons_off=check('icons-off','[cascade.params]\nicons=false\n',flags=flags)
    assert not any(n.tag=='svg' for n in nodes(icons_off,'/field-notes/').all())
    assert 'Pinned' in html(icons_off,'/field-notes/').read_text()
    # Native override hooks, ordering, header term duplication and no duplicate IDs.
    for region in ('article','site'):
        write(source,'layouts/_partials/sidera/'+region+'-footer-extra.html','<p data-extra="{{ .Region }}">{{ .Page.Title }} · {{ with .Owner }}{{ .Title }}{{ end }}</p>')
    reordered=check('reordered',"""[cascade.params]
article_footer=['links','authors','terms','text','meta','series']
site_footer=['text','credit','links']
terms_in_header=true
""",flags=flags)
    assert items(reordered,alpha,'article-footer')==['links','authors','terms','text','meta','series']
    assert items(reordered,alpha,'site-footer')==['text','credit','links']
    d=nodes(reordered,alpha);ids=[n.attrs['id'] for n in d.all() if 'id' in n.attrs];assert len(ids)==len(set(ids))
    assert len(d.all(**{'data-extra':'article-footer'}))==1
    assert [n.attrs['href'] for n in d.all(id='footer-assigned-authors')[0].all() if n.tag=='a']==['/authors/demo-researcher/']
    empty=check('empty',"""[cascade.params]
left=false
right=[]
article_footer=[]
site_footer=false
""",flags=flags)
    assert not items(empty,alpha,'article-footer') and not items(empty,alpha,'site-footer')
    assert 'data-extra=' not in html(empty,alpha).read_text()
    # Inapplicable items do not emit a footer, its border, or spacing.
    quiet=check('quiet',"""[cascade.params]
article_footer=['text','links']
article_text=''
article_links_menu='missing'
site_footer=['text','links']
footer_text=''
footer_menu='missing'
""")
    assert 'data-extra="article-footer"' in html(quiet,alpha).read_text()
    # With enabled regions an explicit hook can supply content; remove only our test overrides by overwriting empty.
    for region in ('article','site'):write(source,'layouts/_partials/sidera/'+region+'-footer-extra.html','')
    quiet=check('quiet-no-hook',"""[params]
article_footer=['text','links']
article_text=''
article_links_menu='missing'
site_footer=['text','links']
footer_text=''
footer_menu='missing'
""")
    assert not items(quiet,alpha,'article-footer') and not items(quiet,alpha,'site-footer')
    # New presentation fields use three-target preset fallback; native values still win.
    write(source,'content/preset/closing/_index.md',"""+++
title='Closing'
[params.defaults.params]
site_footer=['text']
footer_text='Section closing'
[params.defaults.cascade.params]
article_footer=['text']
article_text='Preset closing'
+++
""")
    write(source,'content/closing/_index.md',"+++\ntitle='Closing'\npreset='closing'\n+++\n")
    write(source,'content/closing/a.md',"+++\ntitle='A'\n+++\nBody")
    write(source,'content/closing/b.md',"+++\ntitle='B'\n[params]\narticle_text='Native closing'\n+++\nBody")
    preset=check('preset');assert 'Section closing' in html(preset,'/closing/').read_text()
    assert 'Preset closing' in html(preset,'/closing/a/').read_text()
    assert 'Native closing' in html(preset,'/closing/b/').read_text()
    zh=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\n",flags=(*flags,'--baseURL','https://example.org/_chinese/'))
    assert 'aria-label="文章页脚"' in html(zh,alpha).read_text()
    assert '返回顶部' in html(zh,alpha).read_text()
    # Invalid types/defaults, missing/unsafe covers, duplicate items, menu safety, unused preset maps.
    for label,config,diagnostic in [
      ('footer-raw-html','[params]\narticle_text="<script>alert(1)</script>"','Raw HTML omitted'),
      ('footer-type','[params]\nsite_footer=true','accepts false or an array'),
      ('footer-duplicate','[params]\narticle_footer=["terms","terms"]','duplicate article_footer'),
      ('footer-item','[params]\nsite_footer=["share"]','invalid site_footer'),
      ('footer-text-type','[params]\narticle_text=9','article_text must be a string'),
      ('header-type','[params]\nterms_in_header="yes"','terms_in_header must be boolean'),
      ('footer-url','[params]\nfooter_menu="unsafe"\n[[menus.unsafe]]\nname="Bad"\nurl="javascript:alert(1)"','unsafe URL'),
    ]:check(label,config,diagnostic)
    draft=source/'content/g-invalid.md'
    for label,value,diagnostic in [('cover-type','"x"','cover must be an image/alt map'),('cover-alt','{image="x.svg"}','requires explicit cover.alt'),('cover-field','{image="x.svg",alt=4}','cover accepts only image/alt strings')]:
        draft.write_text('+++\ntitle="Invalid"\ndraft=true\n[params]\ncover='+value+'\n+++\n');check(label,'',diagnostic)
    draft.write_text('+++\ntitle="Cover"\n[params]\ncover={image="https://example.org/x.svg",alt="x"}\n+++\n');check('cover-url','','image must be a local resource/path')
    draft.write_text('+++\ntitle="Cover"\n[params]\ncover={image="missing.svg",alt="x"}\n+++\n');check('cover-missing','','missing local image')
    draft.write_text('+++\ntitle="Cover"\ndraft=true\n+++\n')
    write(source,'content/preset/unused/_index.md','+++\ntitle="Unused"\n[params.defaults.params]\narticle_footer=["search"]\n+++\n');check('unused-preset','','invalid article_footer')
    (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected},indent=2))
    print('PASS G configuration:',len(passed),'builds,',len(rejected),'expected rejections; retained',run)
if __name__=='__main__':main()
