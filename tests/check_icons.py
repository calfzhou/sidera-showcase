"""Native inline registry, provenance, overrides, geometry safety and icons-off.
No Solar sibling dependency, installs or remote calls. One current-source copy.
"""
from pathlib import Path
import hashlib,json,os,re,sys
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_showcase,build
from check_p2f import nodes
from check_p2w import write

def svg_shapes(node):
    return [[x.tag,x.attrs] for x in node.all() if x.tag in ('path','circle','rect','g','ellipse','line','polygon','polyline')]

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    s=copy_showcase(run,'site');passed=[];rejected=[]
    cfg=s/'hugo.toml';cfg.write_text(cfg.read_text().replace('comments = true','comments = false'))
    def check(name,overlay='',diagnostic=None):
        write(s,'icons-test.toml',overlay)
        out=build(s,run,name,diagnostic,('--config','hugo.toml,icons-test.toml','--printI18nWarnings'))
        (rejected if diagnostic else passed).append(name);return out
    # A native data-driven catalogue in the test hook, not a public theme gallery.
    write(s,'layouts/_partials/sidera/head-extra.html',(s/'layouts/_partials/sidera/head-extra.html').read_text()+'''\n<script type="application/json" id="icon-data">{{ dict "icons" (partialCached "sidera/icons.html" site "icons") "sources" hugo.Data.sidera.icon_sources | jsonify | safeJS }}</script>''')
    out=check('baseline');d=nodes(out,'/')
    data=json.loads(d.all(id='icon-data')[0].words());assert len(data['sources'])==44
    for key,meta in data['sources'].items():
        assert meta['solar_name'] and meta['style'] in ('BoldDuotone','Linear') and meta['revision'] and meta['license']=='CC-BY-4.0'
        assert hashlib.sha256(data['icons'][key].strip().encode()).hexdigest()==meta['normalized_sha256'],key
        assert not re.search(r'<svg[^>]+(?:width|height)=',data['icons'][key])
    assert len({data['icons'][k] for k in ['blog','notebook','docs','page']})==4
    assert data['sources']['star']['solar_name']=='star' and data['sources']['about']['solar_name']=='user-circle'
    assert not any(p.name in ('email.svg','code.svg') for p in out.rglob('*.svg'))
    assert not re.search(r'<svg[^>]+(?:width|height)=',(out/'notes/index.html').read_text())
    # Same override on menus, section identity, tags, and cards. Context is still native.
    custom='<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.5"/></svg>'
    original=(s/'data/icons.yaml').read_text()
    write(s,'data/icons.yaml',original+'\nhome: '+json.dumps(custom)+'\nscience: '+json.dumps(custom)+'\n')
    note=s/'content/notes/_index.md';old=note.read_text();note.write_text(old.replace('  list_header:', '  icon: science\n  list_header:',1).replace('reading','science'))
    write(s,'content/icon-probe/index.md','''---
title: Registry probe
type: story
params:
  icon: science
---
## Section
### Story ornament

[External](https://example.invalid/)

{{< link href="/" text="Custom card" icon="science" >}}
{{< link href="/" text="No card icon" icon="" >}}
''')
    note.write_text(note.read_text().replace('  page_size:', '  right: [{component: taxonomies, config: {tag_icons: {"practice/notes": science}}}, {component: taxonomies, config: {icons: false}}]\n  page_size:',1))
    out=check('custom',"baseURL='https://example.org/_custom/'\n[[menus.primary]]\nname='Science'\npageRef='/icon-probe'\n[menus.primary.params]\nicon='science'\n");data=json.loads(nodes(out,'/').all(id='icon-data')[0].words());assert data['icons']['home']==custom and data['icons']['science']==custom
    for route in ['/','/notes/','/icon-probe/']:
        assert nodes(out,route).all(r='7'),route
    cards=nodes(out,'/icon-probe/').all(**{'class':'content-link-card'});assert cards[0].all(r='7') and not any(n.tag=='svg' for n in cards[1].all())
    menu=nodes(out,'/').all(**{'class':'native-menu'})[0]
    science_link=[a for a in menu.all() if a.tag=='a' and a.words().strip()=='Science'][0]
    assert science_link.all(r='7')
    note_dom=nodes(out,'/notes/')
    assert note_dom.all(**{'data-instance':'right-taxonomies-1'})[0].all(r='7')
    assert not any(n.tag=='svg' for n in note_dom.all(**{'data-instance':'right-taxonomies-2'})[0].all())
    # Current actual root index/term/card/footers all honor the local tag choice.
    for route in ['/notes/','/notes/tags/practice/notes/','/notes/reading-list/']:
        assert nodes(out,route).all(r='7'),route
    for name,overlay,prefix in [('off',"baseURL='https://example.org/_off/'\n[cascade.params]\nicons=false\n",'/_off'),('zh-off',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_zh-off/'\n[cascade.params]\nicons=false\n",'/_zh-off')]:
        out=check(name,overlay)
        for route in ['/notes/','/handbook/','/icon-probe/','/handbook/reference/content-components/','/handbook/reference/diagrams/','/journal/2026/04/12/a-walk-without-a-checklist/']:
            d=nodes(out,route);assert not any(n.tag=='svg' for n in d.all()),(name,route)
        nav=nodes(out,'/notes/').all(**{'class':'pagination'})[0]
        assert nav.all(**{'data-page-link':'next'})[0].words().strip() in ('Next','下一页')
        assert nodes(out,'/notes/').all(**{'class':'search-clear'})[0].words().strip()
        diag=nodes(out,'/handbook/reference/diagrams/')
        assert all(n.words().strip() for n in diag.all(**{'class':'diagram-action'}))
    # Definition validation occurs even if unused and icons are disabled.
    bad={
      'script':'<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
      'event':'<svg viewBox="0 0 24 24" onload="alert(1)"><path d="M1 1"/></svg>',
      'foreign':'<svg viewBox="0 0 24 24"><foreignObject/></svg>',
      'image':'<svg viewBox="0 0 24 24"><image href="https://example.invalid/x"/></svg>',
      'paint':'<svg viewBox="0 0 24 24"><path fill="red" d="M1 1"/></svg>',
      'style':'<svg viewBox="0 0 24 24" style="color:red"><path d="M1 1"/></svg>',
      'size':'<svg viewBox="0 0 24 24" width="20"><path d="M1 1"/></svg>',
      'id':'<svg viewBox="0 0 24 24" id="same"><path d="M1 1"/></svg>',
      'unbalanced':'<svg viewBox="0 0 24 24"><g><path d="M1 1"/></svg>',
      'entity':'<svg viewBox="0 0 24 24"><path fill="&#35;fff" d="M1 1"/></svg>',
      'duplicate':'<svg viewBox="0 0 24 24" fill="none" fill="currentColor"></svg>',
      'viewbox':'<svg><path d="M1 1"/></svg>',
      'type':False,
    }
    for name,value in bad.items():
        write(s,'data/icons.yaml',original+'\nbad: '+json.dumps(value)+'\n')
        check('reject-'+name,'[cascade.params]\nicons=false\n', 'Sidera icon')
    write(s,'data/icons.yaml','[]\n');check('reject-registry',diagnostic='data/icons.yaml must be a map')
    write(s,'data/icons.yaml',original);note.write_text(old)
    # The former image path spelling is not guessed or fetched.
    write(s,'content/icon-probe/index.md','---\ntitle: Bad icon\n---\n{{< link href="/" text="Bad" icon="unknown.svg" >}}')
    check('reject-name',diagnostic='unknown icon')
    write(s,'content/icon-probe/index.md','---\ntitle: Probe\n---\nGood.')
    # Site override on a native preset and per-instance map works without theme edits.
    write(s,'data/icons.yaml',original+'\nscience: '+json.dumps(custom)+'\n')
    write(s,'content/preset/research/_index.md','---\ntitle: Research\nparams:\n  defaults:\n    params:\n      icon: science\n---\n')
    write(s,'content/research/_index.md','---\ntitle: Research\npreset: research\n---\n')
    out=check('preset');assert nodes(out,'/').all(r='7')
    (run/'results.json').write_text(json.dumps({'builds':passed,'rejections':rejected,'builtins':44},indent=2))
    print('PASS icons',len(passed),'builds /',len(rejected),'expected rejections;',run)
if __name__=='__main__':main()
