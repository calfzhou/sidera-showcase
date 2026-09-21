"""Namespace, native-field boundaries and metadata fallback regression."""
from pathlib import Path
import json, os, re, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, THEME, Page
from check_p1b import copy_site,build,html
from check_p2w import write,replace

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='namespace-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True);print('Retained run:',run)
    keys='collection|list_order|page_size|byline|show_updated|pinned|children|tag_view|tag_key|tag_slug|icon'
    for root in ['layouts','content']:
        for p in (ROOT/THEME/root).rglob('*'):
            if p.is_file(): assert not re.search(r'\b(?:Params|params)\.('+keys+r')\b',p.read_text()),p
    source=copy_site(run,'scopes')
    cfg=source/'hugo.toml'
    cfg.write_text(cfg.read_text()+'''\n[params]
site_owned='Not a Sidera option'
[params.sidera]
byline='Site author'
show_updated=true
[[menus.primary]]
name='Native about'
pageRef='/about'
weight=3
[menus.primary.params.sidera]
icon='star'
''')
    replace(source,'content/about.md',"title = 'About this proof'", "title = 'About this proof'\ndate=2024-01-02T00:00:00Z\nlastmod=2024-02-03T00:00:00Z\ntags=['Native assignment']\n[params]\nsite_owned='Page value'\nbyline='Obsolete flat value'\nshow_updated=false")
    replace(source,'content/field-notes/beta/index.md',"byline = 'Visiting naturalist'", "byline = ''")
    write(source,'layouts/_partials/sidera/head-extra.html','''<meta name="namespace-probe" content="{{ .Page.Site.Params.site_owned }}|{{ .Page.Params.site_owned }}|{{ .Page.Params.tags }}">
{{ if .Page.Params.sidera.tag_view }}<meta name="generated-namespace" content="{{ .Page.Params.sidera.tag_key }}|{{ isset .Page.Params "tag_view" }}">{{ end }}''')
    out=build(source,run,'scopes',flags=('--printI18nWarnings',))
    assert Page(html(out,'/about/')).byline=='Site author' and Page(html(out,'/about/')).updated
    assert Page(html(out,'/field-notes/alpha/')).byline=='Field team'
    assert Page(html(out,'/field-notes/beta/')).byline=='' and not Page(html(out,'/field-notes/beta/')).updated
    assert 'Not a Sidera option|Page value|[Native assignment]' in html(out,'/about/').read_text()
    assert 'M12 1v22' in html(out,'/about/').read_text() # native menu's namespaced star icon
    assert 'content="science/quantum|false"' in html(out,'/field-notes/tags/science/quantum/').read_text()
    # All new settings coexist in ONE TOML table; no required repeated metadata.
    replace(source,'content/about.md',"show_updated=false\n+++", "show_updated=false\n[params.sidera]\nbyline=''\nshow_updated=false\nright=[]\n+++")
    out=build(source,run,'page-off')
    assert Page(html(out,'/about/')).byline=='' and not Page(html(out,'/about/')).updated
    assert 'right-region' not in html(out,'/about/').read_text()
    replace(source,'content/about.md',"show_updated=false\nright=[]", "show_updated='yes'\nright=[]")
    build(source,run,'invalid-update','show_updated must be boolean')
    replace(source,'content/about.md',"show_updated='yes'\nright=[]", "show_updated=false\nright=[]\n")
    replace(source,'content/about.md',"[params.sidera]\nbyline=''", "[params.sidera]\nbyline=7")
    build(source,run,'invalid-byline','byline must be a string')
    (run/'results.json').write_text(json.dumps({'strict_builds':2,'intended_rejections':2,'namespace_audit':True,'native_fields_preserved':True,'flat_custom_fields_not_read':True},indent=2))
    print('PASS namespace: 2 strict builds, 2 rejections; native fields, scoped metadata, generated params and menu icon')
if __name__=='__main__':main()
