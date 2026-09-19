"""P2-A fresh builds + isolated Chrome checks. No downloads or third-party packages.
Node >=22 (native WebSocket) and an installed Chrome are test-only prerequisites.
Set SIDERA_CHECK_DIR to a new output directory if desired; default is timestamped.
"""
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
from urllib.parse import unquote

sys.dont_write_bytecode = True
from check_p1a import ROOT, THEME
from check_p1b import build, copy_site


class Assets(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.assets = []
        self.feed(file.read_text())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and a.get('rel') == 'stylesheet':
            self.assets.append((a['href'], a.get('integrity')))
        if tag == 'script' and a.get('src'):
            self.assets.append((a['src'], a.get('integrity')))


def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR', ROOT / '.checks' /
               ('frontend-design_' + datetime.now().strftime('%Y%m%d_%H%M%S')))).resolve()
    run.mkdir(parents=True, exist_ok=False)
    print('Retained run:', run, flush=True)
    source = copy_site(run, 'baseline')
    baseline = build(source, run, 'baseline')
    stress = copy_site(run, 'stress')
    bundle = stress / 'content/field-notes/visual-stress'
    bundle.mkdir()
    shutil.copy2(ROOT / 'tests/fixtures/visual/article.md', bundle / 'index.md')
    for name in ('sample.py', 'sample.svg'):
        shutil.copy2(ROOT / 'content/field-notes/alpha' / name, bundle / name)
    stress_out = build(stress, run, 'stress')
    subpath = build(source, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    count = 0
    for out, prefix in ((baseline, ''), (stress_out, ''), (subpath, '/preview')):
        for file in out.rglob('*.html'):
            assets = Assets(file).assets
            assert len(assets) == 2, (file, assets)
            for url, integrity in assets:
                assert url.startswith(prefix + '/'), (file, url)
                assert (out / unquote(url[len(prefix):]).lstrip('/')).is_file(), url
                assert integrity and integrity.startswith('sha256-'), integrity
                count += 1
    command = [os.environ.get('NODE_BIN', 'node'), str(ROOT / 'tests/check_p2a_browser.mjs'), str(run)]
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=150)
    (run / 'browser.log').write_text(result.stdout)
    print(result.stdout)
    assert result.returncode == 0, 'Browser check failed; see browser.log'
    (run / 'build-results.json').write_text(json.dumps({
        'hugo': subprocess.check_output(['hugo', 'version'], text=True, timeout=10).strip(),
        'strict_builds': 3, 'fingerprinted_asset_references_checked': count,
        'theme_source': str(ROOT / THEME), 'browser': 'browser-results.json'
    }, indent=2))
    print('PASS P2-A fresh builds, native assets/subpaths and rendered browser checks')


if __name__ == '__main__':
    main()
