"""Named widget definitions reuse built-ins without copying config or shared state."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, THEME
from check_p1b import copy_showcase, build, html, local_links
from check_p2f import nodes
from check_p2w import write, replace

CONFIG='''[params.widgets.notice]
component='text'
[params.widgets.notice.config]
title='Reusable notice'
text='**Shared** body. [About](/about/).'
[params.widgets.navigation]
component='links'
[params.widgets.navigation.config]
menu='primary'
icons=false
[params.widgets.topics]
component='taxonomies'
[params.widgets.topics.config]
taxonomies=['tags']
icons=false
tag_icons={design='star'}
[params.widgets.outline]
component='toc'
[params.widgets.author-card]
component='profile'
[params.widgets.author-card.config]
title='Named profile'
text='Shared profile text'
image='images/sidera-mark.svg'
[params.widgets.closing]
component='authors'
[params.widgets.closing.config]
show=true
[cascade.params]
right=['recent-updates','recent-published',{widget='recent-published',config={count=1}},'notice',{widget='notice',config={title='',text='Local body'}},'notice','navigation',{widget='navigation',config={menu='footer',icons=true}},'outline','outline','topics',{widget='topics',config={tag_icons={},icons=true}},'author-card',{widget='author-card',config={image='',menu='',text='Local profile text'}}]
article_footer=['closing','closing','notice',{widget='notice',config={text='Local closing body'}},'navigation']
site_footer=['notice',{widget='notice',config={title='Footer notice'}},'navigation','credit']
'''

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='widgets-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    write(source,'layouts/_partials/sidera/head-extra.html','<script id="widgets-before" type="application/json">{{ site.Params.widgets | jsonify | safeJS }}</script>')
    write(source,'layouts/_partials/sidera/site-footer-extra.html','<script id="widgets-after" type="application/json">{{ site.Params.widgets | jsonify | safeJS }}</script>')
    def check(label,extra='',diagnostic=None):
        write(source,'widgets.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,widgets.toml','--printI18nWarnings'))
    def instance(d,name):return d.all(**{'data-instance':name})[0]
    baseline=check('baseline');local_links(baseline)
    home=nodes(baseline,'/');assert instance(home,'left-text-1').all(**{'class':'nav-heading'})[0].words()=='Welcome'
    assert 'Explore the journal' in instance(home,'left-text-1').words()
    assert nodes(baseline,'/notes/').all(**{'data-recent':'publication'})
    assert len(nodes(baseline,'/handbook/').all(**{'data-component':'recent'}))==2
    out=check('instances',CONFIG);local_links(out);route='/notes/package-management/';d=nodes(out,route)
    # Counters use the resolved built-in kind, so names/inline/repeats never collide.
    ids=[n.attrs['id'] for n in d.all() if 'id' in n.attrs];assert len(ids)==len(set(ids))
    assert d.all(id='TableOfContents-right') and d.all(id='TableOfContents-right-2')
    assert d.all(id='tags-tree-right') and d.all(id='tags-tree-right-2')
    assert d.all(id='footer-assigned-authors') and d.all(id='footer-authors-2-assigned-authors')
    assert len(instance(d,'right-recent-3').all(**{'data-recent':'publication'})[0].children)==1
    assert len(instance(d,'right-recent-2').all(**{'data-recent':'publication'})[0].children)==5
    assert 'Reusable notice' in instance(d,'right-text-1').words()
    assert not instance(d,'right-text-2').all(**{'class':'nav-heading'})
    assert 'Local body' in instance(d,'right-text-2').words()
    assert instance(d,'right-text-3').words()==instance(d,'right-text-1').words() and 'Shared' in instance(d,'right-text-3').words()
    assert not any(n.tag=='svg' for n in instance(d,'right-links-1').all())
    assert any(n.tag=='svg' for n in instance(d,'right-links-2').all())
    assert instance(d,'right-profile-1').all(src='/images/sidera-mark.svg')
    assert not any(n.tag in ('img','a') for n in instance(d,'right-profile-2').all())
    assert 'Shared profile text' in instance(d,'right-profile-1').words()
    assert 'Local closing body' in instance(d,'article-footer-text-2').words()
    assert json.loads(d.all(id='widgets-before')[0].words())==json.loads(d.all(id='widgets-after')[0].words())
    # Observe effective option maps through a trusted test override, not via CSS inference.
    write(source,'layouts/_partials/sidera/components/taxonomies.html','<script data-option-probe="{{ .Instance }}" type="application/json">{{ .Settings.tag_icons | jsonify | safeJS }}</script>')
    probe=check('shallow-options',CONFIG);pd=nodes(probe,route)
    assert json.loads(pd.all(**{'data-option-probe':'right-taxonomies-1'})[0].words())=={'design':'star'}
    assert json.loads(pd.all(**{'data-option-probe':'right-taxonomies-2'})[0].words())=={}
    write(source,'layouts/_partials/sidera/components/taxonomies.html',(ROOT/THEME/'layouts/_partials/sidera/components/taxonomies.html').read_text())
    # Native config merging allows changing one predefined option without duplicating its component/order.
    merged=check('predefined-override','[params.widgets.recent-published.config]\ncount=2\n')
    assert len(nodes(merged,'/notes/').all(**{'data-recent':'publication'})[0].children)==2
    cfg=json.loads(nodes(merged,'/').all(id='widgets-before')[0].words())['recent-published']
    assert cfg['component']=='recent' and cfg['config']=={'order':'publication','count':2}
    escaped=check('escaped',"[params.widgets.welcome.config]\ntitle='<img src=x onerror=alert(1)>'\ntext='Literal `<img src=x>` in code.'\n")
    assert not nodes(escaped,'/').all(src='x')
    assert '<img src=x onerror=alert(1)>' in nodes(escaped,'/').all(**{'class':'nav-heading'})[-1].words()
    # Effective native language params supply translations; template caches stay per language.
    zh=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\n[params.widgets.welcome.config]\ntitle='Welcome in another locale'\n")
    assert '最近发布' in html(zh,'/notes/').read_text()
    write(source,'content/about.zh.md','---\ntitle: Chinese About\n---\nA translated page.\n')
    multi=check('bilingual',"defaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n[languages.zh.params.widgets.welcome.config]\ntitle='Locale-specific welcome'\n")
    assert 'Locale-specific welcome' in instance(nodes(multi,'/zh/about/'),'left-text-1').words()
    assert 'Locale-specific welcome' not in instance(nodes(multi,'/en/about/'),'left-text-1').words()
    bad=[
     ('wrong-registry','[params]\nwidgets="bad"\n','params.widgets must be'),
     ('wrong-definition','[params.widgets]\nbad="text"\n','component/config map'),
     ('missing-component','[params.widgets.bad.config]\ntext="Hello"\n','component must be a name'),
     ('component-shadow','[params.widgets.recent]\ncomponent="recent"\n','cannot shadow'),
     ('chain','[params.widgets.bad]\ncomponent="recent-published"\n','invalid widget-definition'),
     ('unsafe-layout','[params.widgets.bad]\ncomponent="../../bad"\n','invalid widget-definition'),
     ('layout-not-api','[params.widgets.bad]\nlayout="text"\n','unknown component instance field'),
     ('unused-invalid','[params.widgets.bad]\ncomponent="recent"\n[params.widgets.bad.config]\ncount=0\n','config.count'),
     ('unknown-name','[params]\nright=["missing-widget"]\n','invalid right item'),
     ('both-selectors','[params]\nright=[{component="text",widget="welcome"}]\n','either widget or component'),
     ('wrong-region','[params]\nsite_footer=["recent-published"]\n','invalid site-footer'),
     ('unsafe-text','[params.widgets.welcome.config]\ntext="<script>alert(1)</script>"\n','Raw HTML omitted'),
     ('unsafe-image','[params.widgets.bad]\ncomponent="profile"\n[params.widgets.bad.config]\nimage="https://example.org/x.png"\n','local image path'),
     ('bad-override','[params]\nright=[{widget="recent-published",config={count=0}}]\n','config.count'),
    ]
    for label,config,diagnostic in bad:check(label,config,diagnostic)
    write(source,'content/invalid-draft.md','---\ntitle: Invalid draft\ndraft: true\nparams:\n  right: [missing-widget]\n---\n')
    check('unknown-in-draft',diagnostic='invalid right item')
    write(source,'content/invalid-draft.md','---\ntitle: Invalid draft\ndraft: true\nparams:\n  widgets: {}\n---\n')
    check('page-definitions',diagnostic='site/language params.widgets')
    (run/'results.json').write_text(json.dumps({'checks':'named/predefined widgets; shared definitions and local overrides; shallow maps/empty values; IDs/regions; no mutation; native config/language merging; unused/unsafe/collision/draft validation'},indent=2))
    print('PASS reusable widgets; retained',run)
if __name__=='__main__':main()
