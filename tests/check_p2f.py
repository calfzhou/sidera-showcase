"""P2-F native shell configurations and safety. No third-party dependencies.
Set SIDERA_CHECK_DIR to a fresh directory; outputs never touch the real public/.
"""
from pathlib import Path
from html.parser import HTMLParser
import json, os, re, shutil, sys, tempfile
sys.dont_write_bytecode = True
from check_p1a import ROOT, THEME, snapshot
from check_p1b import build, copy_site, html
from check_p2w import write, replace
from prepare_scoped_example import apply as apply_scoped

class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children, self.text = tag, dict(attrs), [], ''
    def all(self, **attrs):
        return [n for c in self.children for n in [c, *c.all()] if all(n.attrs.get(k)==v for k,v in attrs.items())]
    def words(self): return self.text + ''.join(c.words() for c in self.children)
class DOM(HTMLParser):
    def __init__(self, file):
        super().__init__(); self.root=Node(); self.stack=[self.root]; self.feed(file.read_text())
    def handle_starttag(self,tag,attrs):
        n=Node(tag,attrs); self.stack[-1].children.append(n)
        if tag not in ('meta','link','img','input','br','hr','source','wbr'): self.stack.append(n)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: self.stack=self.stack[:i]; break
    def handle_data(self,text): self.stack[-1].text+=text

def nodes(out, route='/'): return DOM(html(out,route)).root

def region(out, route, side):
    dom=nodes(out,route)
    return next((n for n in dom.all() if side+'-region' in n.attrs.get('class','').split()),None)

def components(out, route, side):
    r=region(out,route,side)
    return [n.attrs['data-component'] for n in r.all() if 'data-component' in n.attrs] if r else []

def settings(source, text):
    with (source/'hugo.toml').open('a') as f: f.write('\n'+text+'\n')

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p2f-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True); print('Retained run:',run,flush=True)
    passed=[]; rejected=[]; theme=snapshot(ROOT/THEME)
    def check(source,label,diagnostic=None,flags=()):
        out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags)); (rejected if diagnostic else passed).append(label); return out
    def source(label,config=''):
        s=copy_site(run,label)
        if config: settings(s,config)
        return s
    baseline=check(source('baseline'),'baseline')
    assert components(baseline,'/','left')==['menu']
    assert not region(baseline,'/','right')
    assert components(baseline,'/about/','left')==['menu']
    assert components(baseline,'/about/','right')==['toc']
    assert components(baseline,'/field-notes/alpha/','left')==['menu','taxonomies','recent']
    assert components(baseline,'/guidebook/','left')==['menu','page-tree','taxonomies']
    assert not region(baseline,'/guidebook/page/2/','right')
    assert not (baseline/'sidera').exists()
    # Complete owner tree; active ancestors open; body-bearing parent link distinct from summary.
    d=nodes(baseline,'/guidebook/getting-started/setup/')
    assert any(n.attrs.get('data-doc-path')=='/guidebook/getting-started' and n.attrs.get('aria-current')=='location' for n in d.all())
    assert any(n.tag=='details' and 'open' in n.attrs and n.attrs.get('class')=='tree-branch' for n in d.all())
    assert all(not n.all(href='/guidebook/getting-started/') for n in d.all() if n.tag=='summary')
    full=source('full',(ROOT/'examples/full-shell.toml').read_text())
    out=check(full,'full')
    menu=next(n for n in nodes(out).all() if n.attrs.get('class')=='native-menu')
    assert [n.attrs['href'] for n in menu.all() if n.tag=='a']==['/','/field-notes/','/journal/','/journal/2024/01/01/first-signal/','/guidebook/','/about/']
    post=nodes(out,'/journal/2024/01/01/first-signal/')
    assert not any(n.attrs.get('href')=='/' and n.attrs.get('aria-current') for n in post.all())
    assert any(n.attrs.get('href')=='/journal/' and n.attrs.get('aria-current')=='location' for n in post.all())
    assert any(n.attrs.get('href')=='/journal/2024/01/01/first-signal/' and n.attrs.get('aria-current')=='page' for n in post.all())
    two=source('two',(ROOT/'examples/full-shell.toml').read_text())
    # Native config tables cannot be redefined in a single TOML file: use layered config, like the documented command.
    write(two,'two.toml',(ROOT/'examples/two-regions.toml').read_text())
    out=check(two,'two',flags=('--config','hugo.toml,two.toml'))
    assert components(out,'/field-notes/','left')==['menu','taxonomies','page-tree']
    assert components(out,'/field-notes/','right')==['recent','profile']
    recent=next(n for n in region(out,'/field-notes/','right').all() if 'data-recent' in n.attrs)
    assert len([n for n in recent.all() if n.tag=='a'])==3
    assert components(out,'/about/','right')==['toc','recent','profile']
    # Per-key Page > owner > site. Complete map/array replacement, false/[]/''.
    scoped=source('scoped',"""[params]
left=['menu','profile']
right=['recent']
recent_count=4
text='Site text'
[params.profile]
title='Site profile'
text='Must not leak through replacement'
""")
    replace(scoped,'content/field-notes/_index.md','[params]',"[params]\nleft=['taxonomies','text']\nright=['recent','profile']\nrecent_count=2\ntext='Owner text'\nprofile={title='Owner profile'}")
    replace(scoped,'content/field-notes/alpha/index.md','[params]',"[params]\nleft=false\nright=['profile','toc']\ntext=''\nprofile={text='Page profile'}")
    replace(scoped,'content/about.md',"title = 'About this proof'", "title = 'About this proof'\n[params]\nleft=[]\nright=false")
    with (scoped/'content/field-notes/alpha/index.md').open('a') as f: f.write('\n## Local heading\n\nA scoped page.\n')
    out=check(scoped,'scoped')
    assert components(out,'/field-notes/','left')==['taxonomies','text']
    assert 'Owner text' in region(out,'/field-notes/','left').words()
    assert 'Must not leak' not in html(out,'/field-notes/').read_text()
    recent=next(n for n in nodes(out,'/field-notes/').all() if 'data-recent' in n.attrs)
    assert len([n for n in recent.all() if n.tag=='a'])==2
    assert not region(out,'/field-notes/alpha/','left')
    assert components(out,'/field-notes/alpha/','right')==['profile','toc']
    assert 'Owner profile' not in html(out,'/field-notes/alpha/').read_text()
    assert not region(out,'/about/','left') and not region(out,'/about/','right')
    assert 'compact-header' in html(out,'/about/').read_text() and 'id="appearance"' in html(out,'/about/').read_text()
    # Literal committed owner/page front-matter example (no cascade emulation).
    example=source('scoped-example',(ROOT/'examples/full-shell.toml').read_text())
    apply_scoped(example)
    out=check(example,'scoped-example')
    assert components(out,'/field-notes/','right')==['recent','profile']
    assert components(out,'/field-notes/alpha/','left')==['taxonomies']
    assert components(out,'/field-notes/alpha/','right')==['text']
    assert not region(out,'/about/','left') and not region(out,'/about/','right')
    # Current native language settings and per-language menus, with both prefixes.
    multi=source('languages')
    write(multi,'locale.toml',"""defaultContentLanguage='en'
defaultContentLanguageInSubdir=true
[languages.en]
locale='en-US'
[languages.en.params]
left=['text']
right=false
text='English shell'
[languages.zh]
locale='zh-CN'
[languages.zh.params]
left=['text']
right=false
text='中文外壳'
""")
    write(multi,'content/about.zh.md','+++\ntitle="关于"\n+++\n中文正文。')
    out=check(multi,'languages',flags=('--config','hugo.toml,locale.toml','--baseURL','https://example.org/preview/'))
    assert 'English shell' in region(out,'/en/about/','left').words()
    assert '中文外壳' in region(out,'/zh/about/','left').words()
    assert 'English shell' not in html(out,'/zh/about/').read_text()
    # Native scalar params cascade independently; a local nested map replaces that map only.
    cascade=source('cascade',"[params]\nleft=['text']\nright=false\ntext='Site text'")
    replace(cascade,'content/field-notes/_index.md','[params]',"[params]\ntext='Owner text'\nright=['recent']")
    replace(cascade,'content/field-notes/_index.md','[cascade.params]',"[cascade.params]\nleft=['profile']\ntext='Cascade text'\n")
    replace(cascade,'content/field-notes/_index.md','\n+++\n',"\n[cascade.params.profile]\ntitle='Cascaded profile'\nmenu='primary'\n+++\n")
    write(cascade,'content/field-notes/no-local.md','+++\ntitle="No local table"\n+++\nA note without local params.')
    replace(cascade,'content/field-notes/alpha/index.md','[params]',"[params]\ntext=''\nprofile={title='Local profile'}")
    out=check(cascade,'cascade')
    assert components(out,'/field-notes/alpha/','left')==['profile']
    assert 'Local profile' in region(out,'/field-notes/alpha/','left').words()
    assert 'Cascaded profile' not in html(out,'/field-notes/alpha/').read_text()
    assert not region(out,'/field-notes/alpha/','right') # no implicit owner params inheritance; TOC has no headings
    assert components(out,'/field-notes/no-local/','left')==['profile'] # no local table, cascade intentionally applies
    # Empty/inapplicable components and deliberately repeated cross-region components.
    empty=source('empty',"[params]\nleft=['text','links','profile','page-tree','taxonomies']\nright=['text','links','profile']\ntext=''\nlinks_menu='missing'\n[params.profile]\nmenu='missing'")
    out=check(empty,'empty'); assert not region(out,'/about/','left') and not region(out,'/about/','right')
    duplicate=source('duplicate',"[params]\nleft=['toc','taxonomies','recent']\nright=['toc','taxonomies','recent']")
    out=check(duplicate,'duplicate')
    for route in ['/field-notes/alpha/','/about/']:
        ids=[n.attrs['id'] for n in nodes(out,route).all() if 'id' in n.attrs]
        assert len(ids)==len(set(ids)),ids
    # Safe authored text, local resource and native heading/external menus.
    safe=source('safe',"""[params]
left=['menu','text','links','profile','collections']
menu='test'
links_menu='links'
text='**Markdown** [bad](javascript:alert(1))'
[params.profile]
title='<img src=x onerror=alert(1)>'
image='images/sidera-mark.svg'
[[menus.test]]
identifier='group'
name='Reading & <topics>'
weight=1
[[menus.test]]
parent='group'
name='Mail'
url='mailto:hello@example.org'
weight=2
[[menus.test]]
parent='group'
name='External'
url='https://example.org/'
weight=1
[[menus.links]]
name='Local'
pageRef='/about'
""")
    out=check(safe,'safe')
    text=html(out,'/about/').read_text()
    assert '<strong>Markdown</strong>' in text and '&lt;img' in text
    assert '<script>alert' not in text and 'href="javascript:' not in text
    assert 'class="menu-group"' in text and 'href="mailto:hello@example.org"' in text
    assert text.index('href="https://example.org/"') < text.index('href="mailto:hello@example.org"')
    # Actual native taxonomy pages only; no G index/term template claim.
    tax=source('taxonomies',"[cascade.params]\nleft=['site-taxonomies']\ntaxonomy_navigation=['categories','tags']")
    out=check(tax,'taxonomies')
    links=[n.attrs['href'] for n in region(out,'/journal/','left').all() if n.tag=='a']
    assert links==['/','/categories/','/tags/'],links
    # Native hooks receive resolved context; disabled region suppresses its hook.
    hook=source('hook',"[params]\nleft=false\nright=['text']")
    for side in ['left','right']:
        write(hook,'layouts/_partials/sidera/'+side+'-extra.html','<p data-hook="{{ .Region }}">{{ .Page.Title }} / {{ with .Owner }}{{ .Title }}{{ end }} / {{ .Settings.recent_count }}</p>')
    out=check(hook,'hook'); assert not region(out,'/','left') and region(out,'/','right')
    assert 'data-hook="right"' in html(out,'/').read_text() and 'data-hook="left"' not in html(out,'/').read_text()
    raw=source('raw-html')
    replace(raw,'content/about.md',"title = 'About this proof'", "title = 'About this proof'\n[params]\nleft=['text']\ntext='<script>alert(1)</script>'")
    check(raw,'raw-html','Raw HTML omitted')
    bad=[("left=true",'not true'),("right='toc'",'must be an array'),("left=[{component='menu',config={unknown=true}}]",'unknown menu config option'),("right=['evil']",'invalid right'),("recent_count=0",'recent_count'),("recent_count=2.5",'recent_count'),("recent_count='5'",'recent_count'),("text=false",'text must be'),("profile='bad'",'profile must be'),("icons='yes'",'icons must be'),("taxonomy_navigation=['other']",'invalid taxonomy_navigation'),("tag_icons={science='<svg/>'}",'unknown icon')]
    for i,(config,diagnostic) in enumerate(bad): check(source('bad'+str(i),'[params]\n'+config),'bad'+str(i),diagnostic)
    for i,url in enumerate(['javascript:alert(1)','data:text/html,hi','java\tscript:alert(1)']):
        check(source('url'+str(i),'[[menus.primary]]\nname="Unsafe"\nurl='+json.dumps(url)),'url'+str(i),'unsafe URL')
    check(source('missing-image',"[params.profile]\nimage='missing.png'"),'missing-image','missing local image')
    check(source('remote-image',"[params.identity]\nimage='https://example.org/x.png'"),'remote-image','local resource/path')
    check(source('missing-page',"[[menus.primary]]\nname='Lost'\npageRef='/does-not-exist'"),'missing-page','unresolved pageRef')
    deep="[[menus.primary]]\nidentifier='a'\nname='A'\n[[menus.primary]]\nidentifier='b'\nparent='a'\nname='B'\n[[menus.primary]]\nparent='b'\nname='C'\npageRef='/about'"
    check(source('deep',deep),'deep','exceeds two levels')
    assert snapshot(ROOT/THEME)==theme
    (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected,'same_theme_source':True},indent=2))
    print(f'PASS P2-F: {len(passed)} builds, {len(rejected)} meaningful rejections')
if __name__=='__main__': main()
