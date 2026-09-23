"""P2-M: capability-first scopes, three preset targets, native authors/scoped series."""
from pathlib import Path
import json, os, re, sys, tempfile, shutil
sys.dont_write_bytecode=True
from check_p1a import ROOT, THEME, Page, all_articles
from check_p1b import build, copy_site, html, local_links
from check_p2w import write, replace
from check_p2f import nodes


def branch(source,path,fm='',body='Synthetic branch.'):
    write(source,'content/'+path+'/_index.md','+++\ntitle="'+path+'"\n'+fm+'\n+++\n'+body)


def leaf(source,path,fm='',body='Synthetic article.'):
    write(source,'content/'+path+'.md','+++\ntitle="'+path+'"\n'+fm+'\n+++\n'+body)


def add_probe(source):
    # Keep Page objects out of JSON; preserve empty/false values in the settings map.
    write(source,'layouts/_partials/sidera/head-extra.html','''{{ $owner := "" }}{{ with .Owner }}{{ $owner = .Path }}{{ end }}<script id="model-probe" type="application/json">{{ dict "params" .Page.Params "settings" .Settings "preset" (.Page.GetTerms "preset" | len) "owner" $owner | jsonify | safeJS }}</script>''')


def probe(out,route):
    return json.loads(re.search(r'<script id="model-probe" type="application/json">(.*?)</script>',html(out,route).read_text(),re.S)[1])


def main():
    (ROOT/'.checks').mkdir(exist_ok=True)
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='model-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    print('Retained run:',run,flush=True);passed=[];rejected=[]
    def check(source,label,diagnostic=None,flags=()):
        out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(label)
        if not diagnostic:local_links(out,'/preview' if '--baseURL' in flags else '')
        return out
    source=copy_site(run,'model');add_probe(source)
    cfg=source/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[params]\nbyline='Site credit'\n")
    # No classification marker required for either a top-level or nested scope.
    branch(source,'free',"[params]\nlist_mode='children'\nleft=['page-tree','taxonomies']\nbyline='Section only'\ntaxonomy_hierarchy=['tags']")
    leaf(source,'automatic/a','tags=["shared/deep"]')
    branch(source,'recursive','[params]\nscope_root=false','## Section heading\n\nNative section prose.')
    branch(source,'free/chapter');leaf(source,'free/chapter/a','tags=["shared/deep"]')
    branch(source,'free/styled','preset="docs"\n[params]\nscope_root=false')
    leaf(source,'free/styled/a','tags=["shared/deep"]')
    branch(source,'free/independent',"[params]\nscope_root=true\nlist_order='modification'\ntaxonomy_hierarchy=['tags']\nleft=['menu','taxonomies','recent']")
    leaf(source,'free/independent/a','tags=["shared/deep"]')
    # One custom term provides term UI, selecting-section and descendant defaults.
    branch(source,'preset/field-guide','''slug='field-guide'
[params]
left=['text']
text='Term UI only'
[params.defaults.params]
left=['text']
text='Section default'
list_mode='children'
[params.defaults.cascade.params]
left=['text']
text='Descendant default'
byline='Preset credit'
right=[]''')
    branch(source,'fourth','preset="field-guide"\n[params]\nproject_ticket="Unrelated user metadata"', '## Real heading\n\nBody-bearing section.')
    leaf(source,'fourth/a')
    branch(source,'fourth/nested','preset="notes"')
    leaf(source,'fourth/nested/a')
    leaf(source,'fourth/empty',"[params]\nleft=[]\nright=false\nbyline=''\nshow_updated=false\nprofile={}")
    branch(source,'fourth/clear','preset=[]');leaf(source,'fourth/clear/a')
    out=check(source,'scopes-and-presets')
    assert probe(out,'/automatic/a/')['owner']=='/automatic'
    assert probe(out,'/recursive/')['owner']=='/recursive' and 'data-toc' in html(out,'/recursive/').read_text()
    assert probe(out,'/free/')['owner']=='/free' and probe(out,'/free/')['preset']==0
    assert probe(out,'/free/styled/a/')['owner']=='/free'
    assert probe(out,'/free/styled/')['settings']['list_mode']=='children'
    assert probe(out,'/free/independent/a/')['owner']=='/free/independent'
    assert probe(out,'/free/chapter/a/')['settings']['byline']=='Site credit'
    assert set(all_articles(out,'/free/tags/shared/'))=={'/free/chapter/a/','/free/styled/a/'}
    assert all_articles(out,'/free/independent/tags/shared/')==['/free/independent/a/']
    assert probe(out,'/preset/field-guide/')['settings']['text']=='Term UI only'
    assert probe(out,'/fourth/')['settings']['text']=='Section default'
    assert probe(out,'/fourth/a/')['settings']['text']=='Descendant default'
    assert probe(out,'/fourth/a/')['preset']==0
    assert probe(out,'/fourth/nested/a/')['owner']=='/fourth'
    assert probe(out,'/fourth/nested/a/')['settings']['left']==['menu','taxonomies','recent']
    assert probe(out,'/fourth/nested/a/')['settings']['byline']=='Preset credit'
    assert probe(out,'/fourth/clear/a/')['settings']['byline']=='Site credit'
    empty=probe(out,'/fourth/empty/')['settings'];assert empty['left']==[] and empty['right']==[] and empty['byline']=='' and empty['show_updated'] is False and empty['profile']=={}
    assert probe(out,'/fourth/')['params']['project_ticket']=='Unrelated user metadata'
    assert 'data-toc' in html(out,'/fourth/').read_text()
    assert set(all_articles(out,'/preset/field-guide/'))=={'/fourth/'}
    # A native cascade is real Page.Params, not reordered against preset fallback.
    replace(source,'content/fourth/_index.md','\n+++\n',"\n[cascade.target]\nkind='page'\n[cascade.params]\nbyline='Native cascade'\nleft=['text']\n[cascade.params.profile]\ntitle='Cascade title'\ntext='Cascade text'\n+++\n")
    replace(source,'content/fourth/a.md','\n+++\n',"\n[params]\nprofile={text='Local map'}\n+++\n")
    out=check(source,'native-cascade')
    assert probe(out,'/fourth/a/')['settings']['byline']=='Native cascade'
    assert probe(out,'/fourth/a/')['settings']['profile']=={'text':'Local map'}
    assert probe(out,'/fourth/nested/a/')['settings']['left']==['text']
    assert probe(out,'/fourth/clear/a/')['settings']['byline']=='Native cascade'
    # Native authors are shared; the same series term has independent scoped sequences.
    for name,title in [('alice','Alice Example'),('bob','Bob Example')]:
        branch(source,'authors/'+name, f'slug="{name}"',title+' biography.')
        replace(source,'content/authors/'+name+'/_index.md',f'title="authors/{name}"',f'title="{title}"')
    branch(source,'series/shared',"slug='shared'\n[params]\nseries_order='publication'")
    for root in ['one','two']:
        branch(source,root,"[params]\npage_size=1\nleft=['menu','taxonomies']\ntaxonomy_navigation=['authors','series','preset']")
    leaf(source,'one/a','date=2024-01-01T00:00:00Z\nauthors=["bob","alice"]\nseries="shared"\nseries_weight=20')
    leaf(source,'one/b','date=2024-02-01T00:00:00Z\nauthors=["alice"]\nseries="shared"\nseries_weight=10\n[params]\npinned=true')
    leaf(source,'two/a','date=2024-01-15T00:00:00Z\nauthors=["alice"]\nseries="shared"')
    replace(source,'content/authors/alice/_index.md','\n+++\n',"\n[params]\navatar='portrait.svg'\n+++\n")
    shutil.copy2(ROOT/'content/field-notes/alpha/sample.svg', source/'content/authors/alice/portrait.svg')
    out=check(source,'baseline')
    assert set(all_articles(out,'/authors/alice/'))=={'/one/a/','/one/b/','/two/a/'}
    assert '/authors/alice/portrait.svg' in html(out,'/authors/alice/').read_text()
    assert set(all_articles(out,'/one/authors/alice/'))=={'/one/a/','/one/b/'}
    assert set(all_articles(out,'/series/shared/'))=={'/one/a/','/one/b/','/two/a/'}
    assert all_articles(out,'/one/series/shared/')==['/one/a/','/one/b/']
    assert all_articles(out,'/two/series/shared/')==['/two/a/']
    article=nodes(out,'/one/a/');authors=next(n for n in article.all() if n.attrs.get('id')=='assigned-authors')
    assert [n.attrs['href'] for n in authors.all() if n.tag=='a']==['/authors/bob/','/authors/alice/']
    assert [n.attrs['href'] for n in article.all() if 'data-series-next' in n.attrs]==['/one/b/']
    assert not any('data-series-next' in n.attrs for n in nodes(out,'/two/a/').all())
    assert '/one/series/shared/' in html(out,'/one/series/').read_text()
    assert 'data-tree-scope="global"' in html(out,'/one/').read_text()
    assert '>Authors</a>' in html(out,'/one/').read_text() and '>Series</a>' in html(out,'/one/').read_text()
    replace(source,'content/series/shared/_index.md',"series_order='publication'","series_order='weight'")
    replace(source,'content/one/a.md','\n+++\n',"\n[params]\nshow_authors=false\ntaxonomy_links={series='global'}\n+++\n")
    out=check(source,'weighted-hidden-authors')
    assert all_articles(out,'/one/series/shared/')==['/one/b/','/one/a/']
    assert 'id="assigned-authors"' not in html(out,'/one/a/').read_text()
    assert '/series/shared/' in html(out,'/one/a/').read_text()
    assert '/one/b/' in html(out,'/one/a/').read_text()
    assert set(all_articles(out,'/authors/alice/'))=={'/one/a/','/one/b/','/two/a/'}
    out=check(source,'subpath',flags=('--baseURL','https://example.org/preview/'))
    assert all_articles(out,'/preview/one/series/shared/','/preview')==['/preview/one/b/','/preview/one/a/']
    write(source,'locale.toml',"defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(source,'content/one/_index.zh.md','+++\ntitle="中文分区"\npreset="notes"\n[params]\npage_size=1\n+++\n')
    write(source,'content/one/a.zh.md','+++\ntitle="中文第一篇"\ndate=2024-01-01T00:00:00Z\nauthors=["alice"]\nseries="shared"\n+++\n中文正文。')
    write(source,'content/one/b.zh.md','+++\ntitle="中文第二篇"\ndate=2024-02-01T00:00:00Z\nauthors=["alice"]\nseries="shared"\n+++\n中文正文。')
    write(source,'content/authors/alice/_index.zh.md','+++\ntitle="示例作者"\nslug="alice"\n+++\n中文作者介绍。')
    write(source,'content/series/shared/_index.zh.md','+++\ntitle="共享专栏"\nslug="shared"\n[params]\nseries_order="publication"\n+++\n')
    out=check(source,'bilingual',flags=('--config','hugo.toml,locale.toml','--baseURL','https://example.org/preview/'))
    assert all_articles(out,'/preview/zh/one/series/shared/','/preview')==['/preview/zh/one/a/','/preview/zh/one/b/']
    assert all_articles(out,'/preview/en/one/series/shared/','/preview')==['/preview/en/one/b/','/preview/en/one/a/']
    assert '示例作者' in html(out,'/zh/one/a/').read_text() and '专栏下一篇' in html(out,'/zh/one/a/').read_text()
    # Raw structural validation also covers unpublished supported local source.
    invalid=[
        ('top-custom','free/bad.md','left=[]','belongs under params'),
        ('scope-type','free/bad/_index.md','[params]\nscope_root="yes"','scope_root'),
        ('scope-on-page','free/bad.md','[params]\nscope_root=true','scope_root'),
        ('multiple-presets','free/bad/_index.md','preset=["blog","notes"]','one preset'),
        ('unknown-preset','free/bad/_index.md','preset="missing"','requires params.defaults'),
        ('preset-on-page','free/bad.md','preset="notes"','preset belongs'),
        ('cascade-preset','free/bad/_index.md','[cascade]\npreset="notes"','must not be cascaded'),
        ('cascade-scope','free/bad/_index.md','[cascade.params]\nscope_root=true','must not be cascaded'),
        ('multiple-series','free/bad.md','draft=true\nseries=["a","b"]','one series'),
        ('bad-authors','free/bad.md','draft=true\nauthors=[["a"]]','invalid term'),
        ('nested-native','free/bad.md','[params]\nauthors=["alice"]','must be authored at top level'),
        ('private-metadata','free/bad.md','draft=true\n[params.sidera]\ntag_view=true','reserved generated metadata'),
        ('bad-weight','free/bad.md','draft=true\nseries_weight="1"','series_weight'),
        ('bad-defaults','preset/bad/_index.md','[params]\ndefaults=false','defaults must be a map'),
        ('unused-default-type','preset/bad/_index.md','[params.defaults.params]\nshow_updated="yes"','show_updated must be boolean'),
        ('default-key','preset/bad/_index.md','[params.defaults.params]\nunknown=true','unknown preset parameter'),
        ('default-native','preset/bad/_index.md','[params.defaults.params]\nauthors=["alice"]','unknown preset parameter'),
        ('default-order','preset/bad/_index.md','[params.defaults.params.children]\norder=["a"]','parent-local'),
        ('default-shape','preset/bad/_index.md','[params.defaults.cascade]\nparams=false','defaults must be a map'),
        ('bad-series-order','series/bad/_index.md','[params]\nseries_order="random"','series_order'),
    ]
    for label,path,fm,diagnostic in invalid:
        bad=copy_site(run,label);write(bad,'content/'+path,'+++\ntitle="Bad"\n'+fm+'\n+++\n')
        check(bad,label,diagnostic)
    (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected,'scopes_independent_of_preset':True,'three_targets':True,'native_cascade_preserved':True,'shared_native_authors_series':True,'browser_command':'node tests/check_model_browser.mjs '+str(run)},indent=2))
    print('PASS model:',len(passed),'strict builds,',len(rejected),'expected rejections')


if __name__=='__main__':main()
