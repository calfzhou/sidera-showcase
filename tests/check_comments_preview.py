"""Normal cold Hugo preview and bounded live opt-out/reenable. No remote requests."""
from pathlib import Path
from urllib.request import urlopen
import os,sys,time,socket
sys.dont_write_bytecode=True
from check_p1b import copy_showcase
from check_block_preview import server,PORT
from check_comments import MOCK,ROUTE
run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
source=copy_showcase(run,'live')
# Only the copied test config receives synthetic provider metadata.
(source/'mock.toml').write_text(MOCK)
p=source/'content/journal/connect-the-useful-parts/index.md';original=p.read_text()
enabled=original.replace('\n---','\nparams:\n  comments: true\n---',1) if '\nparams:\n' not in original else original.replace('\nparams:\n','\nparams:\n  comments: true\n',1)
p.write_text(enabled)
def wait(enabled):
 end=time.monotonic()+15
 while time.monotonic()<end:
  with urlopen(f'http://127.0.0.1:{PORT}{ROUTE}',timeout=2) as r:text=r.read().decode()
  if ('data-sidera-giscus' in text)==enabled and ('/js/giscus.' in text)==enabled:
   assert 'giscus.app/client.js' not in text
   assert ('class="toc-comments"' in text)==enabled
   if enabled:assert 'data-term="'+ROUTE[1:]+'"' in text
   return
  time.sleep(.1)
 raise AssertionError('Comment preview did not update')
try:
 with server(source,run,'cold',extra=('--config','hugo.toml,mock.toml')):
  wait(True)
  p.write_text(enabled.replace('comments: true','comments: false'));wait(False)
  p.write_text(enabled);wait(True)
finally:p.write_text(original)
with socket.socket() as probe:
 probe.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);probe.bind(('127.0.0.1',PORT))
print('PASS comments: cold normal Hugo server, live false/true removes/restores controller, canonical preview term; server stopped')
