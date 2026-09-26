"""Theme-owned native TOC depth, narrow config import and real-root heading coverage."""
from pathlib import Path
import json,os,subprocess,sys
sys.dont_write_bytecode=True
from check_p1b import build
from check_p2f import nodes
from check_p2w import write
from prepare_toc_browser import prepare

def links(out,route):
 d=nodes(out,route);toc=next(n for n in d.all() if 'data-toc' in n.attrs)
 return toc,[n.attrs['href'] for n in toc.all() if n.tag=='a']

def config(source):
 return json.loads(subprocess.check_output(['hugo','config','--source',str(source),'--format','json'],text=True,timeout=20))

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();prepare(run);source=run/'live-source'
 for output in ['baseline-public','chinese-public','repeated-public']:
  toc,targets=links(run/output,'/notes/toc-sample/')
  assert len(targets)==19 and '#tool-notes' in targets and '#confirming-the-environment' in targets
  toc,targets=links(run/output,'/handbook/reference/markdown/')
  assert '#a-smaller-detail' in targets and '#a-qualification' in targets and '#the-final-level' in targets
  assert toc.children[0].children[0].children[0].tag=='a', 'No indentation for a phantom H1 parent'
 original=config(source)['markup'];assert original['tableofcontents']['startlevel']==1 and original['tableofcontents']['endlevel']==6
 # No direct toc.toml override is allowed to mask the theme-default test again.
 assert not (source/'toc.toml').exists()
 write(source,'content/toc-deep.md','---\ntitle: Deep start\n---\n### Starts at three\n\n#### Four\n\n###### Six\n')
 write(source,'content/toc-mixed.md','---\ntitle: Mixed roots\n---\n## Before one\n\n# Real one\n\n## After one\n')
 write(source,'toc-options.toml','[markup.tableOfContents]\nstartLevel=2\nendLevel=4\nordered=true\n')
 out=build(source,run,'override',flags=('--config','hugo.toml,toc-options.toml','--printI18nWarnings'))
 toc,targets=links(out,'/notes/toc-sample/');assert toc.children[0].tag=='ol'
 assert '#uv' in targets and '#installing-python' in targets and '#tool-notes' not in targets and '#confirming-the-environment' not in targets
 toc,targets=links(out,'/toc-deep/');assert toc.children[0].children[0].children[0].tag=='a' and targets==['#starts-at-three','#four']
 # Default deep starts normalize only leading empty ancestors; mixed real roots retain links.
 out=build(source,run,'edge-defaults',flags=('--printI18nWarnings',))
 toc,targets=links(out,'/toc-deep/');assert targets==['#starts-at-three','#four','#six'] and toc.children[0].children[0].children[0].tag=='a'
 assert links(out,'/toc-mixed/')[1]==['#before-one','#real-one','#after-one']
 # The import is limited to tableOfContents, not all markup or unsafe HTML.
 p=source/'hugo.toml';p.write_text(p.read_text().replace("[markup.tableOfContents]\n_merge = 'shallow'\n",''))
 without=config(source)['markup'];assert without['tableofcontents']['startlevel']==2 and without['tableofcontents']['endlevel']==3
 assert {k:v for k,v in original.items() if k!='tableofcontents'}=={k:v for k,v in without.items() if k!='tableofcontents'}
 out=build(source,run,'without-import',flags=('--printI18nWarnings',));assert '#the-final-level' not in links(out,'/handbook/reference/markdown/')[1]
 write(source,'content/unsafe-toc.md','---\ntitle: Safety\n---\n<script>alert(1)</script>\n')
 build(source,run,'safe-markup',diagnostic='Raw HTML omitted')
 print('PASS native H1–H6 defaults, normal root, explicit bounds/list type, deep/mixed starts, narrow import and safe markup; retained',run)
if __name__=='__main__':main()
