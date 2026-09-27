"""Cold/default Hugo preview, native media delivery and live removal of player JS.
Reuses the owned, bounded server harness; never accesses a user's running preview.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import json, os, sys, tempfile, time
sys.dont_write_bytecode = True
from check_p1b import ROOT, copy_showcase
from check_block_preview import server, PORT
from check_p2f import DOM
ROUTE='/handbook/reference/video/'

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='video-preview-',dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True,exist_ok=True);s=copy_showcase(run,'live')
    def fetch(disabled=False):
        end=time.monotonic()+15
        while time.monotonic()<end:
            with urlopen(f'http://127.0.0.1:{PORT}{ROUTE}',timeout=2) as response: text=response.read().decode()
            if (('data-sidera-video-script' not in text) if disabled else ('data-sidera-video-script' in text)):
                p=run/('disabled.html' if disabled else 'cold.html');p.write_text(text)
                d=DOM(p).root;videos=[n for n in d.all() if n.tag=='video']
                if disabled: assert not videos and d.all(**{'data-state':'disabled'})
                else: assert len(videos)==2 and all('src' not in v.attrs for v in videos)
                return
            time.sleep(.1)
        raise AssertionError('Live video state did not update')
    with server(s,run,'cold'):
        fetch()
        url=f'http://127.0.0.1:{PORT}{ROUTE}motion.mp4'
        with urlopen(Request(url,headers={'Range':'bytes=0-31'}),timeout=2) as r:
            assert r.status==206 and r.headers['Content-Type'].startswith('video/mp4')
            assert r.read()==(s/'content/handbook/reference/video/motion.mp4').read_bytes()[:32]
        (s/'content/handbook/reference/video/index.md').write_text('---\ntitle: Disabled preview\n---\n{{< video src="motion.mp4" disabled=true >}}\n')
        fetch(True)
    (run/'results.json').write_text(json.dumps({'cold_default_preview':'pass','native_media_mime_and_range':'pass','live_disabled_removes_controller':'pass','owned_port':PORT},indent=2))
    print('PASS video cold preview, native range/MIME, live disabled state; owned server stopped; retained',run)
if __name__=='__main__':main()
