"""Bounded P1-D observations, not a production acceptance suite.
Only synthetic copies are mutated. Removal moves generated fixtures outside content.
Retains logs, snapshots, diffs and JSON under ignored .checks/; stdlib only.
"""
from pathlib import Path
import json
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen
from urllib.error import HTTPError

sys.dont_write_bytecode = True
from check_p1b import ROOT, View, html, build, copy_site, write_note
from check_p1a import POC, Page, all_articles, snapshot


def wait_until(predicate, seconds=15):
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        if predicate():
            return
        time.sleep(.15)
    raise AssertionError('Timed out waiting for isolated server')


def free_port():
    for port in range(14347, 14363):
        with socket.socket() as sock:
            try:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind(('127.0.0.1', port))
                return port
            except OSError:
                pass
    raise AssertionError('No explicit test port available; no existing server touched')


def watcher(run, operation, fast=False):
    label = operation + ('-fast' if fast else '-full')
    case = run / label
    case.mkdir()
    source = copy_site(case, 'watch')
    note = source / 'content/field-notes/watcher/index.md'
    write_note(source, 'field-notes/watcher/index.md', ['watcher/old'], 'date = 2024-01-01T00:00:00+08:00')
    # Unique instance identity, checked over HTTP before any mutation.
    home = source / 'content/_index.md'
    home.write_text(home.read_text() + '\nP1D-' + case.name + '\n')
    port = free_port()
    out = case / 'incremental-public'
    log = case / 'server.log'
    common = ['--source', str(source), '--cacheDir', str(case / 'server-cache'),
              '--baseURL', f'http://127.0.0.1:{port}/', '--environment', 'development',
              '--panicOnWarning', '--printPathWarnings']
    cmd = ['hugo', 'server', *common, '--destination', str(out),
           '--bind', '127.0.0.1', '--port', str(port), '--disableLiveReload', '--noHTTPCache']
    if not fast:
        cmd += ['--disableFastRender']
    (case / 'command.json').write_text(json.dumps(cmd, indent=2))
    with log.open('w') as stream:
        proc = subprocess.Popen(cmd, stdout=stream, stderr=subprocess.STDOUT)
        try:
            def ready():
                assert proc.poll() is None, log.read_text()
                if 'Web Server is available' not in log.read_text():
                    return False
                try:
                    with urlopen(f'http://127.0.0.1:{port}/', timeout=2) as response:
                        return ('P1D-' + case.name).encode() in response.read()
                except OSError:
                    return False
            wait_until(ready)
            baseline = len(log.read_text())
            if operation == 'add-note':
                write_note(source, 'field-notes/watcher-added/index.md', ['watcher/new'])
            elif operation == 'change-tag':
                note.write_text(note.read_text().replace('watcher/old', 'watcher/new'))
            elif operation == 'rename-note':
                note.parent.rename(note.parent.with_name('watcher-renamed'))
            elif operation == 'remove-note':
                note.parent.rename(case / 'removed-synthetic-note')
            elif operation == 'add-tag':
                note.write_text(note.read_text().replace('["watcher/old"]', '["watcher/old", "watcher/new"]'))
            elif operation == 'remove-tag':
                note.write_text(note.read_text().replace('["watcher/old"]', '[]'))
            elif operation == 'change-count':
                write_note(source, 'field-notes/watcher-added/index.md', ['watcher/old'])
            else:
                raise AssertionError(operation)
            wait_until(lambda: 'Total in' in log.read_text()[baseline:])
            # Let coalesced filesystem events settle, then capture served and disk output.
            time.sleep(1)
            assert proc.poll() is None, log.read_text()
            with urlopen(f'http://127.0.0.1:{port}/field-notes/tags/', timeout=3) as response:
                (case / 'served-hub.html').write_bytes(response.read())
            shutil.copytree(out, case / 'incremental-snapshot')
            served = {}
            for route in ('/field-notes/watcher/', '/field-notes/tags/watcher/old/', '/field-notes/tags/watcher/new/'):
                try:
                    with urlopen(f'http://127.0.0.1:{port}' + route, timeout=3) as response:
                        served[route] = response.status
                except HTTPError as error:
                    served[route] = error.code
            (case / 'served-status.json').write_text(json.dumps(served, indent=2))
            if operation == 'change-tag' and not fast:
                start = len(log.read_text())
                adapter = source / POC / 'content/_content.gotmpl'
                adapter.write_text(adapter.read_text() + '\n{{/* synthetic invalidation control */}}\n')
                wait_until(lambda: 'Total in' in log.read_text()[start:])
                time.sleep(1)
                shutil.copytree(out, case / 'adapter-touch-snapshot')
                (case / 'adapter-touch.log').write_text(log.read_text()[start:])
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=5)
    fresh = build(source, case, 'fresh', flags=('--baseURL', f'http://127.0.0.1:{port}/', '--environment', 'development'))
    expected_tree = {
        'add-note': {'watcher': 2, 'watcher/old': 1, 'watcher/new': 1},
        'change-tag': {'watcher': 1, 'watcher/new': 1},
        'rename-note': {'watcher': 1, 'watcher/old': 1},
        'remove-note': {},
        'add-tag': {'watcher': 1, 'watcher/old': 1, 'watcher/new': 1},
        'remove-tag': {},
        'change-count': {'watcher': 2, 'watcher/old': 2},
    }[operation]
    fresh_tree = View(html(fresh, '/field-notes/tags/')).tree
    assert {k: v for k, v in fresh_tree.items() if k.startswith('watcher')} == expected_tree
    expected_size = 7 if operation in ('add-note', 'change-count') else 5 if operation == 'remove-note' else 6
    assert len(all_articles(fresh, '/field-notes/tags/')) == expected_size
    before, after = snapshot(case / 'incremental-snapshot'), snapshot(fresh)
    result = {'operation': operation, 'fast_render': fast, 'port': port, 'server_stopped': proc.poll() is not None,
              'missing': sorted(set(after) - set(before)), 'stale': sorted(set(before) - set(after)),
              'changed': sorted(p for p in set(before) & set(after) if before[p] != after[p]),
              'server_errors': [line for line in log.read_text().splitlines() if 'ERROR' in line]}
    recovery = case / 'adapter-touch-snapshot'
    if recovery.exists():
        recovered = snapshot(recovery)
        result['adapter_touch'] = {'missing': sorted(set(after) - set(recovered)),
                                  'stale': sorted(set(recovered) - set(after)),
                                  'changed': sorted(p for p in set(after) & set(recovered) if after[p] != recovered[p])}
    for name, dest in [('incremental', case / 'incremental-snapshot'), ('fresh', fresh)]:
        result[name + '_tree'] = View(html(dest, '/field-notes/tags/')).tree
        result[name + '_articles'] = all_articles(dest, '/field-notes/tags/')
    result['parity'] = not any(result[k] for k in ('missing', 'stale', 'changed', 'server_errors'))
    (case / 'comparison.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print('OBSERVED watcher', label, 'parity=', result['parity'], flush=True)
    return result


def eligibility(run):
    source = copy_site(run, 'eligibility')
    settings = {
        'draft': 'draft = true',
        'future': 'publishDate = 2099-01-01T00:00:00+08:00',
        'expired': 'expiryDate = 2000-01-01T00:00:00+08:00',
        'headless': 'headless = true',
        'unlisted': '[build]\nlist = "never"',
        'render-never': '[build]\nrender = "never"',
        'render-link': '[build]\nrender = "link"',
        'local': '[build]\nlist = "local"',
    }
    for key, extra in settings.items():
        write_note(source, 'field-notes/eligibility-' + key + '/index.md', ['eligibility/' + key],
                   'date = 2024-01-01T00:00:00+08:00\n' + extra)
    write_note(source, 'field-notes/hidden/storage-note.md', ['eligibility/cascade-draft'])
    section = source / 'content/field-notes/hidden/_index.md'
    section.write_text('+++\ntitle = "Hidden storage"\n[cascade]\ndraft = true\n+++\n')
    results = {}
    for label, flags in [('normal', ()), ('preview', ('--buildDrafts', '--buildFuture', '--buildExpired'))]:
        out = build(source, run, 'eligibility-' + label, flags=flags)
        result = {}
        for key in settings:
            route = '/field-notes/eligibility-' + key + '/'
            tag = html(out, '/field-notes/tags/eligibility/' + key + '/')
            result[key] = {'article_published': html(out, route).exists(),
                           'tag_published': tag.exists(), 'count': View(tag).count,
                           'linked': route in all_articles(out, '/field-notes/tags/'),
                           'tag_article_links': all_articles(out, '/field-notes/tags/eligibility/' + key + '/')}
        result['cascade-draft'] = {'article_published': html(out, '/field-notes/hidden/storage-note/').exists(),
                                   'tag_published': html(out, '/field-notes/tags/eligibility/cascade-draft/').exists(),
                                   'count': View(html(out, '/field-notes/tags/eligibility/cascade-draft/')).count}
        results[label] = result
    (run / 'eligibility.json').write_text(json.dumps(results, indent=2))
    return results


def legacy_dates(run):
    source = copy_site(run, 'legacy-dates')
    note = source / 'content/field-notes/legacy-date.md'
    note.write_text('---\ntitle: Legacy date probe\ndate: 2024-01-02 09:30:00\nupdated: 2024-03-04 11:15:00\n---\nSynthetic.\n')
    before = build(source, run, 'legacy-before')
    old = Page(html(before, '/field-notes/legacy-date/')).times
    config = source / 'hugo.toml'
    config.write_text(config.read_text().replace("lastmod = ['lastmod', 'modified',", "lastmod = ['lastmod', 'modified', 'updated',"))
    after = build(source, run, 'legacy-native-alias')
    new = Page(html(after, '/field-notes/legacy-date/')).times
    assert old['updated'] == '2024-01-02T09:30:00+08:00', old
    assert new['updated'] == '2024-03-04T11:15:00+08:00', new
    assert old['published'] == new['published'] == '2024-01-02T09:30:00+08:00'
    result = {'current_policy': old, 'scratch_updated_alias': new}
    (run / 'legacy-dates.json').write_text(json.dumps(result, indent=2))
    return result


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='p1d-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    result = {'legacy_dates': legacy_dates(run), 'eligibility': eligibility(run), 'watchers': []}
    for operation in ('add-note', 'change-tag', 'rename-note', 'remove-note', 'add-tag', 'remove-tag', 'change-count'):
        result['watchers'].append(watcher(run, operation))
    result['watchers'].append(watcher(run, 'change-tag', fast=True))
    (run / 'results.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print('P1-D observation run complete; mismatches are findings, NOT acceptance passes.')


if __name__ == '__main__':
    main()
