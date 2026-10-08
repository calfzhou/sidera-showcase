"""Per-instance component contract across sidebars and both footer regions."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_organization import ROOT
from check_tag_routes import build, copy_site, html, local_links
from check_shell import nodes
from check_docs import write, replace

CONFIG='''[params]
text='Base text'
links_menu='primary'
article_text='Base article text'
footer_text='Base footer text'
footer_menu='primary'
[params.profile]
title='Base profile'
text='Base profile body'
image='images/sidera-parallax-circle.svg'
menu='primary'
[params.tag_icons]
science='star'
[[menus.primary]]
name='About'
pageRef='/about'
[[menus.secondary]]
name='Journal'
pageRef='/journal'
[cascade.params]
terms_in_header=true
left=[
 'menu', {component='menu',config={menu='secondary',icons=false}},
 'collections', {component='collections',config={icons=false}},
 'taxonomies', {component='taxonomies',config={taxonomies=['tags'],icons=false,tag_icons={}}},
 'site-taxonomies', {component='site-taxonomies',config={taxonomies=['authors'],icons=false}},
 'page-tree', 'page-tree',
 'toc', {component='toc',config={icons=false}},
 'recent', {component='recent',config={order='publication',count=2,sections=true}}, {component='recent',config={count=1}},
 'profile', {component='profile',config={title='Instance profile',text='**Local profile**',image='',menu='',icons=false}},
 'text', {component='text',config={text='Instance text'}}, {component='text',config={text=''}},
 'links', {component='links',config={menu='secondary',icons=false}}
]
right=['toc','toc','taxonomies','taxonomies']
article_footer=['terms','terms','authors',{component='authors',config={show=false}},'authors','series','series','meta',{component='meta',config={show=false}},'text',{component='text',config={text='Instance closing'}},'links',{component='links',config={menu='secondary',icons=false}}]
site_footer=['links',{component='links',config={menu='secondary',icons=false}},'text',{component='text',config={text='Instance footer'}},{component='text',config={text=''}},'credit','credit']
'''

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='instances-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_site(run,'source')
    write(source,'layouts/_partials/sidera/head-extra.html','<script id="base-before" type="application/json">{{ .Settings | jsonify | safeJS }}</script>')
    write(source,'layouts/_partials/sidera/left-extra.html','<script id="base-after" type="application/json">{{ .Settings | jsonify | safeJS }}</script>')
    with (source/'content/field-notes/alpha/index.md').open('a') as f:f.write('\n## First heading\n\nA body.\n\n## Second heading\n\nMore body.\n')
    def check(label,config=CONFIG,diagnostic=None,flags=()):
        write(source,'instances.toml',config)
        return build(source,run,label,diagnostic,('--config','hugo.toml,instances.toml','--printI18nWarnings',*flags))
    def instance(doc,name):return doc.all(**{'data-instance':name})[0]
    out=check('baseline');local_links(out)
    for route in ['/field-notes/alpha/','/guidebook/getting-started/setup/','/about/']:
        d=nodes(out,route);ids=[x.attrs['id'] for x in d.all() if 'id' in x.attrs];assert len(ids)==len(set(ids)),route
        assert json.loads(d.all(id='base-before')[0].words())==json.loads(d.all(id='base-after')[0].words())
    d=nodes(out,'/field-notes/alpha/')
    for name in ['menu','links']:
        first,second=instance(d,'left-'+name+'-1'),instance(d,'left-'+name+'-2')
        assert first.all(href='/about/') and second.all(href='/journal/')
        assert not any(x.tag=='svg' for x in second.all()) and any(x.tag=='svg' for x in first.all())
    assert len(instance(d,'left-recent-2').all(**{'data-recent':'publication'})[0].children)==2
    assert len(instance(d,'left-recent-3').all(**{'data-recent':'modification'})[0].children)==1
    assert len(instance(d,'left-recent-1').all(**{'data-recent':'modification'})[0].children)==5
    assert instance(d,'left-profile-1').all(src='/images/sidera-parallax-circle.svg')
    second=instance(d,'left-profile-2');assert 'Instance profile' in second.words() and 'Local profile' in second.words()
    assert not any(x.tag in ('img','a') for x in second.all())
    assert 'Base profile' not in second.words()
    assert instance(d,'left-text-1').words().strip()=='Base text'
    assert instance(d,'left-text-2').words().strip()=='Instance text'
    assert not d.all(**{'data-instance':'left-text-3'})
    assert not any(x.tag=='svg' for x in instance(d,'left-taxonomies-2').all())
    assert not instance(d,'left-taxonomies-2').all(**{'aria-label':'Categories'})
    assert instance(d,'left-site-taxonomies-2').all(href='/authors/')
    assert not any(x.tag=='svg' for x in instance(d,'left-collections-2').all())
    assert not any(x.tag=='svg' for x in instance(d,'left-toc-2').all())
    assert len([x for x in d.all() if 'data-toc' in x.attrs])==4
    assert d.all(id='assigned-tags') and d.all(id='terms-2-assigned-tags') and d.all(id='header-assigned-tags')
    assert not d.all(**{'data-instance':'article-footer-authors-2'})
    assert d.all(id='footer-assigned-authors') and d.all(id='footer-authors-3-assigned-authors')
    assert 'Base article text' in instance(d,'article-footer-text-1').words()
    assert 'Instance closing' in instance(d,'article-footer-text-2').words()
    assert not d.all(**{'data-instance':'article-footer-meta-2'})
    assert 'Base footer text' in instance(d,'site-footer-text-1').words()
    assert 'Instance footer' in instance(d,'site-footer-text-2').words()
    assert not d.all(**{'data-instance':'site-footer-text-3'})
    assert not any(x.tag=='svg' for x in instance(d,'site-footer-links-2').all())
    # Whole-map clearing must not deep-merge inherited tag icon mappings back in.
    write(source,'layouts/_partials/sidera/components/taxonomies.html','<script data-icons="{{ .Instance }}" type="application/json">{{ .Settings.tag_icons | jsonify | safeJS }}</script>')
    probe=check('map-clear');d=nodes(probe,'/field-notes/alpha/')
    assert json.loads(d.all(**{'data-icons':'left-taxonomies-1'})[0].words())=={'science':'star'}
    assert json.loads(d.all(**{'data-icons':'left-taxonomies-2'})[0].words())=={}
    # Restore only this task's test override, preserving the original trusted theme partial.
    write(source,'layouts/_partials/sidera/components/taxonomies.html',(ROOT/'themes/sidera/layouts/_partials/sidera/components/taxonomies.html').read_text())
    # Real native/preset layer resolution still selects entire region arrays before local config.
    write(source,'content/preset/instance-preset/_index.md',"+++\ntitle='Instance preset'\n[params]\nleft=[{component='text',config={text='Term instance'}}]\n[params.defaults.params]\nleft=[{component='text',config={text='Section instance'}}]\n[params.defaults.cascade.params]\nleft=[{component='text',config={text='Descendant instance'}}]\n+++\n")
    write(source,'content/instance-owner/_index.md',"+++\ntitle='Instance owner'\npreset='instance-preset'\n+++\n")
    write(source,'content/instance-owner/a.md',"+++\ntitle='A'\n+++\n")
    write(source,'content/instance-owner/b.md',"+++\ntitle='B'\n[params]\nleft=[{component='text',config={text='Page instance'}}]\n+++\n")
    out=check('precedence', '')
    for route,label in [('/preset/instance-preset/','Term'),('/instance-owner/','Section'),('/instance-owner/a/','Descendant'),('/instance-owner/b/','Page')]:
        assert instance(nodes(out,route),'left-text-1').words().strip()==label+' instance'
    replace(source,'content/instance-owner/_index.md','\n+++\n',"\n[cascade.params]\nleft=[{component='text',config={text='Native cascade instance'}}]\n+++\n")
    out=check('native-cascade','');assert instance(nodes(out,'/instance-owner/a/'),'left-text-1').words().strip()=='Native cascade instance'
    check('chinese',CONFIG+"\n[languages.zh]\nlocale='zh-CN'\n",flags=('--baseURL','https://example.org/_chinese/'))
    # YAML native positive integers can be uint64; TOML examples alone don't cover them.
    write(source,'content/yaml-instances/_index.md',"---\ntitle: YAML instances\nparams:\n  recent_count: 8\n  left:\n    - component: recent\n      config: {count: 5, order: publication}\n    - component: recent\n      config: {count: 8}\n---\n")
    write(source,'content/yaml-instances/a.md',"---\ntitle: YAML entry\ndate: 2024-01-01\n---\n")
    out=check('yaml-count','');d=nodes(out,'/yaml-instances/')
    assert instance(d,'left-recent-1') and instance(d,'left-recent-2')
    # Invalid shape/options are rejected even in unused presets and excluded raw sources.
    invalid=[('config=[]','config must be a map'),('component=9','component must be a name'),('component="unknown"','invalid left item'),('component="recent-published"','invalid left item'),('component="recent",config={order="title"}','config.order'),('component="recent",config={count=0}','config.count'),('component="recent",config={count=2.5}','config.count'),('component="recent",config={sections="yes"}','must be boolean'),('component="text",config={count=2}','unknown text config'),('component="text",config={text=9}','must be a string'),('component="profile",config={image="https://example.org/x.png"}','local image path'),('component="taxonomies",config={taxonomies="tags"}','must be an array'),('component="taxonomies",config={taxonomies=["bad"]}','config.taxonomies'),('component="taxonomies",config={tag_icons={x="<svg/>"}}','unknown icon'),('component="menu",config={icons=0}','must be boolean'),('component="recent",id="authored"','unknown component instance field'),('component="recent",config={scope_root=true}','unknown recent config')]
    for i,(fragment,message) in enumerate(invalid):
        if fragment.startswith('config='):fragment='component="recent",'+fragment
        check('invalid-'+str(i),'[params]\nleft=[{'+fragment+'}]\n',message)
    check('unsafe-markdown','[params]\nleft=[{component="text",config={text="<script>alert(1)</script>"}}]\n','Raw HTML omitted')
    check('missing-image','[params]\nleft=[{component="profile",config={image="missing.png"}}]\n','missing local image')
    check('unsafe-instance-menu','[params]\nleft=[{component="links",config={menu="unsafe"}}]\n[[menus.unsafe]]\nname="Unsafe"\nurl="javascript:alert(1)"\n','unsafe URL')
    write(source,'content/preset/unused/_index.md',"+++\ntitle='Unused'\n[params.defaults.params]\nleft=[{component='recent',config={count=0}}]\n+++\n")
    check('invalid-unused-preset','','config.count')
    write(source,'content/preset/unused/_index.md',"+++\ntitle='Unused'\n[params.defaults.params]\nleft=[]\n+++\n")
    write(source,'content/invalid-draft.md',"+++\ntitle='Draft'\ndraft=true\n[params]\nright=[{component='recent',config={count=0}}]\n+++\n")
    check('invalid-draft','','config.count')
    (run/'results.json').write_text(json.dumps({'checks':'All fixed components/footers repeat, independent options, empty/false/maps, IDs, no mutation, native and preset precedence, localized source, malformed/unsafe/unused/draft validation','builds':6,'rejections':len(invalid)+5},indent=2))
    print('PASS component instances; retained',run)
if __name__=='__main__':main()
