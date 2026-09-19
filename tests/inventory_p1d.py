"""Read-only, bounded lexical inventory of tracked reference content (not a converter).
No note bodies or raw front matter are retained. Counts are syntax candidates, not
claims of rendered Hexo behavior. YAML shape inspection is intentionally narrow.
"""
from collections import Counter, defaultdict
from pathlib import Path
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT.parent / 'gocalf.com-hugo'
GROUPS = ('_posts', 'notes', 'coding', 'about', 'pgp')


def visible_source(body):
    lines, fence = [], None
    for line in body.splitlines():
        match = re.match(r'^\s*(`{3,}|~{3,})', line)
        if match:
            marker = match[1]
            if fence is None:
                fence = marker
            elif marker[0] == fence[0] and len(marker) >= len(fence):
                fence = None
            continue
        if fence is None:
            lines.append(re.sub(r'(`+).*?\1', '', line))
    return '\n'.join(lines)


def main():
    tracked = subprocess.check_output(['git', '-C', str(SITE), 'ls-files', 'source'], text=True, timeout=10).splitlines()
    counts, fields, forms, flags, tags = Counter(), Counter(), Counter(), Counter(), Counter()
    capabilities = defaultdict(list)
    date_shapes, dates = Counter(), defaultdict(list)
    unexpected, missing, mismatch = [], [], []
    for name in tracked:
        if not name.endswith('.md') or name.split('/')[1] not in GROUPS:
            continue
        group = name.split('/')[1]
        counts[group] += 1
        text = (SITE / name).read_text()
        match = re.match(r'\A---\s*\n(.*?)\n---', text, re.S)
        if not match:
            forms['other'] += 1
            unexpected.append(name)
            continue
        forms['YAML'] += 1
        fm, body = match[1], text[match.end():]
        blocks = re.findall(r'^([\w-]+):([^\n]*(?:\n(?![\w-]+:)[^\n]*)*)', fm, re.M)
        metadata = dict(blocks)
        fields.update(metadata.keys())
        for key in ('draft', 'published', 'expiryDate', 'publishDate', 'build', 'headless', 'lang', 'language', 'pin', 'sticky', 'url', 'permalink', 'slug'):
            if key in metadata:
                flags[key + ': ' + metadata[key].strip()] += 1
        if 'notebook' in metadata and metadata['notebook'].strip() != group:
            mismatch.append(name)
        if 'tags' in metadata:
            raw = metadata['tags']
            values = re.findall(r'^\s*-\s+([^\n]+)', raw, re.M)
            # Existing tracked inputs are literal block sequences, possibly empty.
            if raw.strip() and not values:
                unexpected.append(name + ': tags shape')
            tags.update(v.strip().strip('"\'') for v in values)
        for key in ('date', 'updated'):
            value = metadata.get(key, '').strip()
            if not value:
                missing.append(name + ': ' + key)
            else:
                date_shapes[key + ':' + ('local-second' if re.fullmatch(r'\d{4}-\d\d-\d\d \d\d:\d\d:\d\d', value) else 'other')] += 1
                dates[key].append(value)
        body = visible_source(body)
        for tag in re.findall(r'{%\s*(\w+)', body):
            if not tag.startswith('end'):
                capabilities['tag:' + tag].append(name)
        patterns = {
            'relative-md-link': r'\]\((?!\w+://)[^)\s]+\.md(?:#[^)]*)?\)',
            'md-fragment-link': r'\]\((?!\w+://)[^)\s]+\.md#[^)]*\)',
            'markdown-image': r'!\[[^\]]*\]\(',
            'alert': r'(?i)^\s*>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]',
            'markdown-attrs': r'\{(?:[.#][\w-]|(?:width|height)=)',
            'obsidian-image-size': r'!\[[^\]]*\|\d+(?:x\d+)?\]',
            'invert-container': r'^:::\s*invert-when-',
            'raw-html': r'<(?:iframe|video|audio|div|table|script)\b',
        }
        for key, pattern in patterns.items():
            capabilities[key].extend([name] * len(re.findall(pattern, body, re.M)))
        for key in ('katex', 'mermaid', 'animcube3', 'animcube4', 'animcube6', 'animcube7'):
            if metadata.get(key, '').strip() == 'true':
                capabilities['enabled:' + key].append(name)
    data = {
        'baseline': subprocess.check_output(['git', '-C', str(SITE), 'rev-parse', 'HEAD'], text=True, timeout=10).strip(),
        'scope': 'tracked Markdown in _posts, notes, coding, about, pgp; excludes templates, consistency report, deferred wiki; no Hexo execution',
        'counts': dict(counts), 'frontmatter_forms': dict(forms), 'frontmatter_keys': dict(fields),
        'special_flags': dict(flags), 'notebook_directory_mismatches': mismatch,
        'date_shapes': dict(date_shapes), 'date_ranges': {k: [min(v), max(v)] for k, v in dates.items()},
        'missing_dates': missing, 'tag_assignment_count': sum(tags.values()), 'tag_vocabulary': sorted(tags),
        'unexpected_shapes': unexpected,
        'capabilities': {k: {'occurrences': len(v), 'files': len(set(v)), 'examples': list(dict.fromkeys(v))[:2]} for k, v in sorted(capabilities.items())},
        'tracked_source_asset_extensions': dict(Counter(Path(p).suffix for p in tracked if not p.endswith('.md'))),
        'other_tracked_markdown_groups': dict(Counter(p.split('/')[1] for p in tracked if p.endswith('.md') and p.split('/')[1] not in GROUPS)),
    }
    (ROOT / '.checks').mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='p1d-inventory-', dir=ROOT / '.checks'))
    (run / 'inventory.json').write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print('Retained aggregate inventory:', run / 'inventory.json')
    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
