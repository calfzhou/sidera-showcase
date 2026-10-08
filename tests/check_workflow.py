"""Guard the small Pages workflow's event/dependency/permission contract; stdlib only.
This is a policy regression, not a replacement for actual GitHub Linux CI.
"""
from pathlib import Path
import configparser
import re

ROOT = Path(__file__).resolve().parents[1]
text = (ROOT / '.github/workflows/pages.yml').read_text()
assert text.count('branches: [main]') == 2
assert 'pull_request_target:' not in text and 'submodule update --remote' not in text
assert 'submodules: recursive' in text and 'persist-credentials: false' in text
assert "HUGO_VERSION: '0.166.0'" in text
assert "HUGO_SHA256: '0e39b901e3f919f1daae05c8ff64f0c14c8a348ef46886d63f8e6d1bb2653885'" in text
assert text.index('sha256sum --check --strict') < text.index('tar -xzf')
assert 'python3 tests/check_pages.py public' in text
assert 'actions/upload-pages-artifact@v3' in text
assert re.search(r'permissions:\n  contents: read\n', text)
build, deploy = text.split('\n  deploy:\n')
assert 'pages: write' not in build and 'id-token: write' not in build
condition = "github.ref == 'refs/heads/main' && (github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && inputs.deploy))"
assert '    if: ' + condition in deploy
assert '    needs: build\n' in deploy and 'always()' not in deploy
assert '      pages: write\n      id-token: write' in deploy
assert '      name: github-pages' in deploy and 'actions/deploy-pages@v4' in deploy
assert '        default: false' in text
# Explicit truth table for the desired semantics, including unsuccessful builds.
cases = 0
for branch in ('main', 'feature/test'):
    for event in ('push', 'pull_request', 'workflow_dispatch'):
        for opt in (False, True):
            for result in ('success', 'failure', 'cancelled', 'skipped'):
                publishes = result == 'success' and branch == 'main' and (event == 'push' or (event == 'workflow_dispatch' and opt))
                if result != 'success' or branch != 'main' or event == 'pull_request':
                    assert not publishes
                cases += 1
modules = configparser.ConfigParser()
modules.read(ROOT / '.gitmodules')
assert modules['submodule "themes/sidera"']['url'] == 'https://github.com/calfzhou/hugo-theme-sidera.git'
print(f'PASS workflow policy and {cases}-case deployment matrix; public exact-pin submodule')
