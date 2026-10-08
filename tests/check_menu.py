"""Focused native-menu color contract and retained safe/configurable variants."""
from pathlib import Path
import json, os, sys, tempfile
sys.dont_write_bytecode=True
from check_organization import ROOT
from check_tag_routes import copy_showcase, build, html
from check_shell import nodes
from check_docs import write

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='menu-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True)
    source=copy_showcase(run,'live')
    cfg=source/'hugo.toml';original=cfg.read_text()
    def check(label,extra='',diagnostic=None):
        write(source,'probe.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,probe.toml','--printI18nWarnings'))
    out=check('baseline');raw=html(out,'/journal/').read_text()
    assert 'style="--menu-accent: #ffbd2b"' in raw and 'ZgotmplZ' not in raw
    off=check('icons-off','[cascade.params]\nicons=false\n')
    assert not any(n.tag=='svg' for n in nodes(off,'/notes/').all())
    check('fallback',"[params]\nmenu='missing'\n")
    check('right-menu',"[cascade.params]\nleft=['profile']\nright=['menu']\n")
    check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    # Per-entry, no ancestor color inheritance; native two-level menus remain native.
    nested=original.replace("name = 'Journal'\npageRef = '/journal'", "identifier = 'journal'\nname = 'Journal'\npageRef = '/journal'")
    nested+='''\n[[menus.primary]]
name='Beginning'
pageRef='/journal/beginning'
parent='journal'
[menus.primary.params]
color='#39c'
[[menus.primary]]
name='Returning'
pageRef='/journal/returning'
parent='journal'
'''
    cfg.write_text(nested);check('nested');cfg.write_text(original)
    for value in ['','#abc','#abcd','#12345678']:
        cfg.write_text(original.replace("color = '#ffbd2b'",'color = '+json.dumps(value)))
        check('valid-'+(value[1:] or 'empty'))
    for index,value in enumerate([True,27,['#fff'],'red','#12','var(--text)','#fff; background:url(https://example.org/x)','" onmouseover="alert(1)']):
        cfg.write_text(original.replace("color = '#ffbd2b'",'color = '+json.dumps(value)))
        check('invalid-'+str(index),'[cascade.params]\nicons=false\n','params.color')
    cfg.write_text(original)
    (run/'results.json').write_text(json.dumps({'builds':10,'expected_rejections':8,'checks':['hex lengths/empty','types and CSS injection rejection','icons-off','fallback','right region','Chinese subpath','native nested entries']},indent=2))
    print('PASS menu configuration; retained',run)
if __name__=='__main__':main()
