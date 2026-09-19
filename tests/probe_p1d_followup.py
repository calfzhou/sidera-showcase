"""Quick P1-D follow-up: scratch-only resource dependencies and publication isolation.
Reuses the bounded watcher harness. Findings, not a proposed runtime patch.
"""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
from unittest.mock import patch

sys.dont_write_bytecode = True
import check_p1d
from check_p1a import Page, check_baseline, snapshot
from check_p1b import ROOT, build, copy_site, write_note, html, View


def resource_site(run, label, match=False):
    source = copy_site(run, label)
    config = source / 'hugo.toml'
    config.write_text(config.read_text() + '''
[[module.mounts]]
source = 'content'
target = 'content'
[[module.mounts]]
source = 'content'
target = 'assets/p1d-content'
''')
    fm = source / 'layouts/_partials/tags/frontmatter.html'
    fm.write_text(fm.read_text().replace('os.ReadFile .',
        '(resources.Get (replaceRE "^content/" "p1d-content/" .)).Content'))
    if match:
        adapter = source / 'content/_content.gotmpl'
        adapter.write_text('{{ range resources.Match "p1d-content/**.md" }}{{ $read := .Content }}{{ end }}\n' + adapter.read_text())
    return source


def publication(run):
    source = copy_site(run, 'publication')
    baseline = build(source, run, 'baseline')
    for key, extra in {
        'draft': 'draft = true',
        'future': 'publishDate = 2099-01-01T00:00:00+08:00',
        'expired': 'expiryDate = 2000-01-01T00:00:00+08:00',
        'headless': 'headless = true',
    }.items():
        write_note(source, 'field-notes/excluded-' + key + '/index.md',
                   ['science/quantum/basics', 'excluded/' + key], extra)
    out = build(source, run, 'valid-excluded')
    check_baseline(out)
    before, after = snapshot(baseline), snapshot(out)
    article_files = [p for p in baseline.rglob('*.html') if Page(p).article]
    assert len(article_files) == 17
    assert all(p.read_bytes() == (out / p.relative_to(baseline)).read_bytes() for p in article_files)
    changed = sorted(p for p in before if before[p] != after.get(p))
    assert changed == ['index.html', 'sitemap.xml'], changed
    assert ''.join((baseline / 'index.html').read_text().split()) == ''.join((out / 'index.html').read_text().split())
    for key in ('draft', 'future', 'expired', 'headless'):
        assert not html(out, '/field-notes/excluded-' + key + '/').exists()
        assert View(html(out, '/field-notes/tags/excluded/' + key + '/')).count == 0
    results = {'valid_excluded': {'build': 'pass', 'unchanged_articles': 17,
                                 'changed_existing_files': changed,
                                 'new_files': sorted(set(after) - set(before))}}
    # Syntactically valid but conflicting unpublished vocabulary is not harmless.
    for label, tags, diagnostic in (
        ('draft-collision', ['field-work/private'], 'P1B tag slug collision'),
        ('draft-malformed', ['bad//tag'], 'P1B malformed tag segment'),
    ):
        case = copy_site(run, label)
        write_note(case, 'field-notes/unpublished/index.md', tags, 'draft = true')
        build(case, run, label, diagnostic=diagnostic)
        results[label] = {'build': 'fails', 'expected_diagnostic': diagnostic}
    return results


def main():
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='p1d-followup-', dir=ROOT / '.checks'))
    print('Retained run:', run, flush=True)
    (run / 'version.txt').write_text(subprocess.check_output(['hugo', 'version'], text=True, timeout=10))
    result = {'publication': publication(run), 'watcher_candidates': {}}
    for mode, matched, operations in (
        ('resource-get', False, ('change-tag', 'add-note')),
        ('resource-match', True, ('add-note', 'remove-tag')),
    ):
        case = run / mode
        case.mkdir()
        def prepare(parent, label):
            return resource_site(parent, label, match=matched)
        with patch.object(check_p1d, 'copy_site', prepare):
            result['watcher_candidates'][mode] = [check_p1d.watcher(case, op) for op in operations]
    (run / 'results.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
    print('Follow-up observations retained; no runtime changes adopted.')


if __name__ == '__main__':
    main()
