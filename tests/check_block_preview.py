"""Cold preview and template-rename recovery; never attaches to a user's server.
Reproduce the B handoff's block.html -> block.md transition in an isolated copy.
A known stale live lookup is recorded, not certified as working or patched by Sidera.
"""
from contextlib import contextmanager
from pathlib import Path
from urllib.request import urlopen
import json, os, socket, subprocess, sys, tempfile, time
sys.dont_write_bytecode = True
from check_p1b import ROOT, build, copy_showcase, html
from check_p2f import DOM

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
    run = Path(tempfile.mkdtemp(prefix='block-preview-',dir=ROOT/'.checks'))
    source = copy_showcase(run,'live')
    for label, flags in [('production',()),('development',('--environment','development'))]:
        valid(html(build(source,run,label,flags=flags),ROUTE))
    def save(name,text):
        path=run/(name+'.html');path.write_text(text);return path
    with server(source,run,'cold') as fetch:
        valid(save('cold',fetch()))
    # Model only the removed development template in the isolated copy. Its output
    # is HTML-escaped because the template is named .html instead of plain .md.
    template=source/'themes/sidera/layouts/_shortcodes/block.md'
    legacy=template.with_suffix('.html');template.rename(legacy)
    with server(source,run,'rename',('--disableFastRender',)) as fetch:
        before=fetch();save('before-rename',before)
        assert '&gt; ### Inside a general block' in before
        legacy.rename(template)
        # Prove that a source edit is processed, not merely a browser cache hit.
        page=source/'content/handbook/reference/advanced-markdown/index.md'
        marker='Verified post-rename content edit'
        page.write_text(page.read_text().replace('This general block keeps',marker+' keeps'))
        after=fetch(marker);save('after-rename',after)
        stale='&gt; ### Inside a general block' in after
        if not stale: valid(run/'after-rename.html')
    with server(source,run,'restarted',('--disableFastRender',),state='rename') as fetch:
        valid(save('restarted',fetch(marker)))
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(('127.0.0.1', PORT))
    result={'version':subprocess.check_output(['hugo','version'],text=True,timeout=10).strip(),
            'production_and_development':'pass','cold_server':'pass',
            'live_rename_stale_lookup_observed':stale,'post_restart_same_cache':'pass','owned_port_released':PORT}
    (run/'results.json').write_text(json.dumps(result,indent=2)+'\n')
    print('PASS cold build/preview and restart recovery; stale live rename observed:',stale,'; retained',run)
if __name__=='__main__':main()
