"""Cold preview and template-rename recovery; never attaches to a user's server.
C2 replaces B's block.md with block.html for mixed notation. Verify the current
cold server and same-cache restart, not a claim of fixing Hugo's live lookup cache.
"""
from contextlib import contextmanager
from pathlib import Path
from urllib.request import urlopen
import json, os, socket, subprocess, sys, tempfile, time
sys.dont_write_bytecode = True
from check_tag_routes import ROOT, build, copy_showcase, html
from check_shell import DOM

ROUTE = '/handbook/reference/advanced-markdown/'
PORT = int(os.environ.get('SIDERA_HTTP_PORT', '14476'))

def valid(path):
    dom = DOM(path).root
    groups = dom.all(id='adaptive-block')
    assert groups and groups[0].tag == 'div', 'Block node was escaped instead of rendered'
    group = groups[0]
    assert group.all(id='inside-a-general-block')
    assert group.all(href='/journal/2026/04/14/connect-the-useful-parts/?from=block#give-a-link-a-reason')
    assert group.all(**{'class':'markdown-alert markdown-alert-note'})
    assert group.all(**{'class':'md-figure'})
    assert len(dom.all(href='#inside-a-general-block')) == 2, 'Heading and native TOC must both link'
    assert dom.all(id='palette-block')[0].tag == 'div'

@contextmanager
def server(source, run, label, extra=(), state=None):
    state = state or label
    # Fail on an occupied port; neither attach to nor stop an unrelated listener.
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(('127.0.0.1', PORT))
    with (run/(label+'.log')).open('w') as log:
        proc = subprocess.Popen(['hugo','server','--source',str(source),'--bind','127.0.0.1',
            '--port',str(PORT),'--cacheDir',str(run/(state+'-cache')),
            '--destination',str(run/(state+'-output')), *extra], stdout=log, stderr=log)
        def fetch(marker=None):
            deadline = time.monotonic()+20
            while time.monotonic()<deadline:
                if proc.poll() is not None:
                    raise AssertionError((run/(label+'.log')).read_text())
                try:
                    with urlopen(f'http://127.0.0.1:{PORT}{ROUTE}', timeout=1) as response:
                        result = response.read().decode()
                    if marker is None or marker in result: return result
                except (OSError, TimeoutError): pass
                time.sleep(.1)
            raise TimeoutError(f'{label}: preview did not serve expected content')
        try:
            fetch('General Markdown blocks')
            yield fetch
        finally:
            proc.terminate()
            try: proc.wait(timeout=6)
            except subprocess.TimeoutExpired:
                proc.kill(); proc.wait(timeout=3)

def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='block-preview-',dir=ROOT/'.checks'));run.mkdir(parents=True,exist_ok=True)
    source = copy_showcase(run,'live')
    for label, flags in [('production',()),('development',('--environment','development'))]:
        valid(html(build(source,run,label,flags=flags),ROUTE))
    def save(name,text):
        path=run/(name+'.html');path.write_text(text);return path
    with server(source,run,'cold') as fetch:
        valid(save('cold',fetch()))
    # The user runs their own server. Only this isolated process is restarted;
    # keep its cache/output intact, and verify current native-node composition.
    with server(source,run,'restarted',state='cold') as fetch:
        valid(save('restarted',fetch()))
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(('127.0.0.1', PORT))
    result={'version':subprocess.check_output(['hugo','version'],text=True,timeout=10).strip(),
            'production_and_development':'pass','cold_server':'pass',
            'post_restart_same_cache':'pass','owned_port_released':PORT}
    (run/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    print('PASS current cold build/preview and same-cache restart; retained',run)
if __name__=='__main__':main()
