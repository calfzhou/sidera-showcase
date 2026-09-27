"""Cold native preview with the tiny P3-D fixture, no retained/user-owned server."""
from pathlib import Path
import json,os,re,socket,subprocess,sys,time
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]
RUN=Path(os.environ['SIDERA_CHECK_DIR']).resolve()
PORT=int(os.environ.get('SIDERA_HTTP_PORT','14492'))

def main():
    source=RUN/'source';assert (source/'hugo.toml').exists()
    with socket.socket() as s:s.bind(('127.0.0.1',PORT))
    route=f'http://127.0.0.1:{PORT}/preview/dated/2026/demo/'
    cmd=['hugo','server','--source',str(source),'--themesDir',str(ROOT/'themes'),'--bind','127.0.0.1','--port',str(PORT),'--baseURL',f'http://127.0.0.1:{PORT}/preview/','--cacheDir',str(RUN/'cache'),'--destination',str(RUN/'server-public')]
    with (RUN/'preview.log').open('w') as log:
        p=subprocess.Popen(cmd,stdout=log,stderr=log,env={**os.environ,'GOMAXPROCS':'2','HUGO_NUMWORKERMULTIPLIER':'1'})
        def page(expect):
            deadline=time.monotonic()+20
            while time.monotonic()<deadline:
                assert p.poll() is None,'Own server exited'
                try:
                    with urlopen(route,timeout=2) as r:text=r.read().decode()
                    if expect(text):return text
                except OSError:pass
                time.sleep(.2)
            raise AssertionError('Preview did not reach expected state')
        file=source/'content/posts/demo/index.md';before=file.read_text()
        try:
            text=page(lambda t:'data-sidera-diagrams-script' in t)
            assert 'data-sidera-badges-script' in text and 'data-sidera-math' in text
            frame=re.search(r'data-mermaid="([^"]+)"',text)[1]
            with urlopen(f'http://127.0.0.1:{PORT}'+frame,timeout=2) as r:
                assert b"connect-src 'none'" in r.read()
            file.write_text('---\ntitle: Plain preview\ndate: 2026-04-10\n---\nPlain preview marker.\n')
            text=page(lambda t:'Plain preview marker.' in t and 'data-sidera-diagrams-script' not in t)
            assert 'data-sidera-badges-script' not in text
        finally:
            p.terminate()
            try:p.wait(timeout=5)
            except subprocess.TimeoutExpired:p.kill();p.wait(timeout=3)
            file.write_text(before)
    with socket.socket() as s:s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind(('127.0.0.1',PORT))
    (RUN/'preview-results.json').write_text(json.dumps({'cold_default_preview':'pass','live_plain_removes_diagrams_and_badges':'pass','owned_port_released':PORT},indent=2))
    print('PASS cold preview and live plain-page asset removal; owned server stopped')
if __name__=='__main__':main()
