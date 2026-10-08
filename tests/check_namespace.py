"""Public params + private generated metadata regression (historical suite name)."""
from pathlib import Path
import json, os, re, sys, tempfile
sys.dont_write_bytecode=True
from check_organization import ROOT, THEME, Page
from check_tag_routes import copy_site,build,html
from check_docs import write,replace
from check_shell import nodes

def main():
    (ROOT/'.checks').mkdir(exist_ok=True)
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='parameters-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True);print('Retained run:',run)
    public='collection|list_order|page_size|byline|show_updated|pinned|children|icon'
    for root in ['layouts','content']:
        for p in (ROOT/THEME/root).rglob('*'):
            if p.is_file(): assert not re.search(r'\b(?:Params|params)\.sidera\.('+public+r')\b',p.read_text()),p
    source=copy_site(run,'scopes');cfg=source/'hugo.toml'
    cfg.write_text(cfg.read_text()+'''\n[params]
site_owned='Not a Sidera option'
byline='Site author'
show_updated=true
[[menus.primary]]
name='Native about'
pageRef='/about'
weight=3
[menus.primary.params]
icon='star'
''')
    replace(source,'content/about.md',"title = 'About this proof'", "title = 'About this proof'\ndate=2024-01-02T00:00:00Z\nlastmod=2024-02-03T00:00:00Z\ntags=['Native assignment']\n[params]\nsite_owned='Page value'\n[params.sidera]\nbyline='Obsolete namespace value'\nshow_updated=false")
    replace(source,'content/field-notes/beta/index.md',"byline = 'Visiting naturalist'", "byline = ''")
    write(source,'layouts/_partials/sidera/head-extra.html','''<meta name="namespace-probe" content="{{ .Page.Site.Params.site_owned }}|{{ .Page.Params.site_owned }}|{{ .Page.Params.tags }}">
<template id="expected-menu-icon">{{ partial "sidera/icon.html" "star" }}</template>
{{ if .Page.Params.sidera.tag_view }}<meta name="generated-namespace" content="{{ .Page.Params.sidera.tag_key }}|{{ isset .Page.Params "tag_view" }}">{{ end }}''')
    out=build(source,run,'scopes',flags=('--printI18nWarnings',))
    assert Page(html(out,'/about/')).byline=='Site author' and Page(html(out,'/about/')).updated
    assert Page(html(out,'/field-notes/alpha/')).byline=='Field team'
    assert Page(html(out,'/field-notes/beta/')).byline=='' and not Page(html(out,'/field-notes/beta/')).updated
    assert 'Not a Sidera option|Page value|[Native assignment]' in html(out,'/about/').read_text()
    doc=nodes(out,'/about/')
    menu=next(n for n in doc.all() if n.attrs.get('class')=='native-menu')
    actual=next(n for n in menu.all() if n.tag=='a' and n.attrs.get('href')=='/about/')
    shape=lambda node:[(n.tag,n.attrs) for n in node.all() if n.tag in ('svg','g','path','circle','rect')]
    expected=shape(doc.all(id='expected-menu-icon')[0]);assert expected and shape(actual)==expected
    assert 'content="science/quantum|false"' in html(out,'/field-notes/tags/science/quantum/').read_text()
    replace(source,'content/about.md',"[params]\nsite_owned", "[params]\nbyline=''\nshow_updated=false\nright=[]\nsite_owned")
    out=build(source,run,'page-off')
    assert Page(html(out,'/about/')).byline=='' and not Page(html(out,'/about/')).updated
    assert 'right-region' not in html(out,'/about/').read_text()
    replace(source,'content/about.md',"show_updated=false\nright=[]", "show_updated='yes'\nright=[]")
    build(source,run,'invalid-update','show_updated must be boolean')
    replace(source,'content/about.md',"show_updated='yes'\nright=[]", "show_updated=false\nright=[]")
    replace(source,'content/about.md',"[params]\nbyline=''", "[params]\nbyline=7")
    build(source,run,'invalid-byline','byline must be a string')
    (run/'results.json').write_text(json.dumps({'strict_builds':2,'intended_rejections':2,'public_params':True,'native_fields_preserved':True,'old_namespace_not_read':True,'private_generated_namespace_retained':True},indent=2))
    print('PASS public params: 2 strict builds, 2 rejections; native fields, metadata, private params and menu icon')
if __name__=='__main__':main()
