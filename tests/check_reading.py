"""P2-B builds and browser evidence; only installed Hugo/Python/Node/Chrome."""
from datetime import datetime
from pathlib import Path
import json
import os
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True
from check_organization import ORGANIZATION, ROOT
from check_tag_routes import build, copy_site, html, View
from check_asset_pipeline import Assets


def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR', ROOT / '.checks' /
               ('frontend-design_' + datetime.now().strftime('%Y%m%d_%H%M%S')))).resolve()
    run.mkdir(parents=True, exist_ok=False)
    print('Retained run:', run, flush=True)
    source = copy_site(run, 'baseline')
    baseline = build(source, run, 'baseline')
    stress = copy_site(run, 'stress')
    bundle = stress / 'content/field-notes/reading-sample'
    bundle.mkdir()
    shutil.copy2(ROOT / 'tests/fixtures/visual/reading.md', bundle / 'index.md')
    shutil.copy2(ORGANIZATION / 'content/field-notes/alpha/sample.svg', bundle / 'sample.svg')
    stress_out = build(stress, run, 'stress', flags=('--baseURL', 'https://example.org/_stress/'))
    subpath = build(source, run, 'subpath', flags=('--baseURL', 'https://example.org/preview/'))
    # Full deep-tag union/count/owner is explicit, not inferred from screenshots.
    tag = 'reading/observations/languages/english/cjk/paragraphs/long-labels/final-level'
    for i in range(1, len(tag.split('/')) + 1):
        view = View(html(stress_out, '/field-notes/tags/' + '/'.join(tag.split('/')[:i]) + '/'))
        assert view.count == 1 and view.owner == '/_stress/field-notes/', (view.count, view.owner)
    count = 0
    for out, prefix in ((baseline, ''), (stress_out, '/_stress'), (subpath, '/preview')):
        for file in out.rglob('*.html'):
            assets = Assets(file).assets
            assert len(assets) == 2
            assert file.read_text().index('sidera-appearance') < file.read_text().index('rel="stylesheet"')
            for url, integrity in assets:
                assert url.startswith(prefix + '/') and (out / url[len(prefix):].lstrip('/')).is_file()
                assert integrity.startswith('sha256-')
                count += 1
    result = subprocess.run([os.environ.get('NODE_BIN', 'node'),
                             str(ROOT / 'tests/check_reading_browser.mjs'), str(run)],
                            text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=240)
    (run / 'browser.log').write_text(result.stdout)
    print(result.stdout)
    assert result.returncode == 0, 'See browser.log'
    (run / 'build-results.json').write_text(json.dumps({
        'strict_builds': 3, 'asset_references': count, 'deep_tag_levels': 8,
        'hugo': subprocess.check_output(['hugo', 'version'], text=True, timeout=10).strip()
    }, indent=2))
    print('PASS P2-B appearance, reading and navigation')


if __name__ == '__main__':
    main()
