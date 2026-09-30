"""Pinned native social menus and owner/visitor appearance defaults."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT, THEME
from check_p1b import copy_showcase, build, html, local_links
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='social-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live');config=source/'hugo.toml'
    # F1 lifecycle is verified separately with mocked provider responses.
    config.write_text(config.read_text().replace('comments = true','comments = false'))
    original=config.read_text()
    def check(label,extra='',diagnostic=None):
        write(source,'social-check.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,social-check.toml','--printI18nWarnings'))
    baseline=check('baseline');local_links(baseline)
    d=nodes(baseline,'/about/');buttons=[n for n in d.all() if 'data-color-mode-cycle' in n.attrs]
    assert len(buttons)==1 and 'hidden' in buttons[0].attrs
    assert 'onclick=' not in html(baseline,'/about/').read_text()
    assert d.all(src='/icons/email.svg') and d.all(src='/icons/code.svg')
    assert 'data-color-mode-default="dark"' in html(baseline,'/').read_text()
    # No owner setting means auto, independently from whether a switch is exposed.
    config.write_text(original.replace("color_mode = 'dark'\n",''));check('default-auto');config.write_text(original)
    check('default-light',"[params]\ncolor_mode='light'\n")
    check('default-auto-owner',"[params]\ncolor_mode='auto'\n")
    check('no-button',"[params]\nsocial_menu='plain-social'\n[[menus.plain-social]]\nname='Email'\nurl='mailto:hello@example.org'\n[menus.plain-social.params]\nimage='icons/email.svg'\n")
    off=check('off',"[params]\nleft_footer=false\n")
    assert not any('data-color-mode-cycle' in n.attrs for n in nodes(off,'/about/').all())
    compact=check('compact',"[cascade.params]\nleft=false\nright=false\n")
    assert any('data-color-mode-cycle' in n.attrs for n in nodes(compact,'/about/').all())
    icons=check('icons-off',"[cascade.params]\nicons=false\n")
    assert 'Email' in html(icons,'/about/').read_text() and 'Code' in html(icons,'/about/').read_text()
    social=nodes(icons,'/about/').all(**{'class':'social-links'})[0]
    assert not any(n.tag in ('svg','img') for n in social.all())
    six="[params]\nsocial_menu='six'\n"+''.join(f"[[menus.six]]\nname='Link {i}'\nurl='https://example.org/{i}'\n[menus.six.params]\nicon='link'\n" for i in range(6))
    check('six',six)
    check('seven',six+"[[menus.six]]\nname='Seventh'\nurl='https://example.org/7'\n",'at most 6')
    check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    prefix=check('subpath',"baseURL='https://example.org/preview/'\n");local_links(prefix,'/preview')
    for label,extra,diag in [
      ('bad-default',"[params]\ncolor_mode='system'\n",'params.color_mode'),
      ('bad-default-type',"[params]\ncolor_mode=true\n",'params.color_mode'),
      ('bad-action',"onclick='alert(1)'",'onclick accepts only'),
      ('bad-type','onclick=true','params.onclick must be a string'),
      ('image-remote',"image='https://example.org/x.svg'",'local resource/path'),
      ('image-missing',"image='missing.svg'",'missing local image'),
    ]:
        if label.startswith('bad-default'):check(label,extra,diag)
        else:
            # For image cases a URL is legitimate; action cases intentionally have none.
            url="url='https://example.org/'\n" if label.startswith('image') else ''
            check(label,"[params]\nsocial_menu='bad'\n[[menus.bad]]\nname='Bad'\n"+url+"[menus.bad.params]\n"+extra+'\n',diag)
    check('url-and-action',"[params]\nsocial_menu='bad'\n[[menus.bad]]\nname='Bad'\nurl='https://example.org/'\n[menus.bad.params]\nonclick='Sidera.cycleColorMode()'\n",'not both')
    check('unsafe-url',"[params]\nsocial_menu='bad'\n[[menus.bad]]\nname='Bad'\nurl='javascript:alert(1)'\n",'unsafe URL')
    check('no-destination',"[params]\nsocial_menu='bad'\n[[menus.bad]]\nname='Bad'\n",'requires a destination')
    check('old-config',"[params]\nappearance='light'\n",'renamed to params.color_mode')
    check('old-action',"[params]\nsocial_menu='old'\n[[menus.old]]\nname='Old action'\n[menus.old.params]\nonclick='Sidera.cycleAppearance()'\n",'onclick accepts only Sidera.cycleColorMode()')
    check('old-icon',"[params]\nsocial_menu='old'\n[[menus.old]]\nname='Old icon'\nurl='https://example.org/'\n[menus.old.params]\nicon='appearance'\n",'renamed to color-mode')
    write(source,'content/invalid-social.md',"---\ntitle: Bad\nparams:\n  color_mode: light\n---\n")
    check('page-default',diagnostic='site/language params.color_mode')
    (run/'results.json').write_text(json.dumps({'checks':'site default auto/overrides, optional switch, native local images/URLs, compact/no-icons, six-entry bound, EN/ZH/subpath, strict action/default/image safety'},indent=2))
    print('PASS social/color-mode config; retained',run)
if __name__=='__main__':main()
