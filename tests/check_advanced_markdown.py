"""P3-B native delivery and explicit grammar-gap controls; not full B acceptance."""
from pathlib import Path
import json, os, re, subprocess, sys, tempfile
sys.dont_write_bytecode = True
from check_p1b import ROOT, copy_showcase, build, html, local_links
from check_p2f import nodes
from check_p2w import write

ROUTE = '/handbook/reference/advanced-markdown/'
TARGET = '/journal/2026/04/14/connect-the-useful-parts/#give-a-link-a-reason'

def body(out, route=ROUTE):
    return nodes(out, route).all(**{'class': 'prose'})[0]

def main():
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='p3b-', dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True, exist_ok=True)
    source = copy_showcase(run, 'live')
    passed, rejected = [], []
    def check(label, flags=(), diagnostic=None):
        out = build(source, run, label, diagnostic, ('--printI18nWarnings', *flags))
        (rejected if diagnostic else passed).append(label)
        return out
    def verify(out, prefix='', chinese=False):
        p = body(out)
        assert len([n for n in p.all() if n.tag == 'math']) == 5
        assert len(p.all(**{'class': 'math-display'})) == 3
        assert len([n for n in p.all() if n.tag == 'aside']) == 5
        assert p.all(**{'aria-label': '说明' if chinese else 'Note'})
        assert p.all(href=prefix+TARGET)
        assert body(out, '/notes/reading-list/').all(href=prefix+TARGET)
        assert '$5 and $10' in p.words() and '$x_1$' in p.words()
        assert '[!tip] Goal' in p.words()
        assert len([n for n in p.all() if n.tag == 'blockquote']) == 2
        images = [n for n in p.all() if n.tag == 'img']
        assert len(images) == 2 and all(n.attrs['alt'] == 'Two connected steps' for n in images)
        assert all(n.attrs['width'] == '120' for n in images) and images[1].attrs['height'] == '60'
        assert all(n.attrs['src'] == prefix+'/handbook/reference/markdown/sample.svg' for n in images)
        assert not [n for n in p.all() if n.tag == 'figcaption']
        assert any(n.tag == 'annotation' and '\\min\\{h_i,h_j\\}' in n.words() for n in p.all())
        assert not re.search(r'<(?:script|link)[^>]+(?:katex|mathjax|cdn)', html(out, ROUTE).read_text(), re.I)
        assert not (out/'sidera').exists()
        local_links(out, prefix.rstrip('/'))
    baseline = check('baseline'); verify(baseline)
    explicit = check('explicit', ('--config','hugo.toml')); verify(explicit)
    zh = check('chinese', ('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'))
    verify(zh, '/_chinese', True)
    cfg = json.loads(subprocess.check_output(['hugo','config','--source',str(source),'--format','json'], text=True, timeout=20))
    assert cfg['markup']['goldmark']['extensions']['passthrough']['enable']
    assert not cfg['markup']['goldmark'].get('renderer', {}).get('unsafe', False)
    # Explicit native opt-out: delimiters remain ordinary text; no client fallback.
    write(source, 'disabled.toml', '[markup.goldmark.extensions.passthrough]\nenable=false\n')
    disabled = check('disabled', ('--config','hugo.toml,disabled.toml'))
    assert not any(n.tag == 'math' for n in body(disabled).all())
    # Precise native parser controls. These are proposals, NOT converted live sources.
    write(source, 'native.toml', '[markup.goldmark.parser]\nwrapStandAloneImageWithinParagraph=false\n[markup.goldmark.parser.attribute]\nblock=true\n')
    write(source, 'content/native-probe/index.md', r'''---
title: Native grammar boundary
---
![inline attr|120](../handbook/reference/markdown/sample.svg){.invert-when-dark} {.no-caption}

![native attr](../handbook/reference/markdown/sample.svg)
{.invert-when-dark .no-caption #native-image width=120 height=60 onclick="oops"}

Paragraph.
{.native-block #native-block}

**strong**{.red} [link](../journal/connect-the-useful-parts/index.md){#inline-link}

:::invert-when-dark
![container](../handbook/reference/markdown/sample.svg)
:::

![hostile](javascript:alert%281%29 "&quot; onerror=&quot;oops")

![|120](../handbook/reference/markdown/sample.svg?size=1#view)

![label|120x60][picture]

[picture]: ../handbook/reference/markdown/sample.svg "&quot; onerror=&quot;oops"

> [!note]
> [Query link](../journal/connect-the-useful-parts/index.md?from=callout#give-a-link-a-reason)

`![literal|120](sample.svg)`

> [!unknown]
> Ordinary quote.
''')
    native = check('native', ('--config','hugo.toml,native.toml'))
    p = body(native, '/native-probe/')
    assert p.all(id='native-image')[0].attrs['width'] == '120'
    assert p.all(id='native-block') and not p.all(id='inline-link')
    assert '{.invert-when-dark}' in p.words() and ':::invert-when-dark' in p.words()
    assert '[!unknown]' in p.words()
    assert p.all(src='/handbook/reference/markdown/sample.svg?size=1#view')[0].attrs['alt'] == ''
    assert p.all(href='/journal/2026/04/14/connect-the-useful-parts/?from=callout#give-a-link-a-reason')
    assert any(n.tag == 'img' and n.attrs.get('title') == '\" onerror=\"oops' for n in p.all())
    assert '![literal|120](sample.svg)' in p.words()
    assert not any('onclick' in n.attrs or 'onerror' in n.attrs or n.attrs.get('src','').startswith('javascript:') for n in p.all())
    write(source, 'content/image-attributes.md', '---\ntitle: Image attributes\n---\n![test](/asset.svg)\n{style="color:red"}\n')
    check('unsupported-image-attribute', ('--config','hugo.toml,native.toml'), diagnostic='Sidera image: unsupported attribute')
    write(source, 'content/image-attributes.md', '---\ntitle: Image attributes\n---\n![test](/asset.svg)\n{width=0}\n')
    check('invalid-image-size', ('--config','hugo.toml,native.toml'), diagnostic='must be a positive integer')
    write(source, 'content/image-attributes.md', '---\ntitle: Image attributes\n---\nNo attribute probe in subsequent builds.\n')
    # Invalid TeX fails rather than publishing missing or fake fallback math.
    write(source, 'content/bad-math.md', '---\ntitle: Bad math\n---\n$\\frac{1}{$\n')
    check('malformed', diagnostic='Sidera math:')
    write(source, 'content/bad-math.md', '---\ntitle: Bad math\n---\n$\\notACommand$\n')
    check('unknown-command', diagnostic='Sidera math:')
    write(source, 'content/bad-math.md', '---\ntitle: Unsafe math\n---\n$\\href{javascript:alert(1)}{unsafe}$\n')
    safe = check('untrusted-tex')
    assert not any(n.tag == 'a' for n in body(safe, '/bad-math/').all())
    write(source, 'content/bad-math.md', '---\ntitle: Valid again\n---\n$1+1$\n')
    # Native site overrides must win; do not force useEmbedded=always.
    write(source, 'layouts/_markup/render-image.html', '<img data-site-image="true" src="{{ .Destination }}" alt="{{ .PlainText }}">')
    write(source, 'layouts/_markup/render-passthrough.html', '<code data-site-math="true">{{ .Inner }}</code>')
    write(source, 'layouts/_markup/render-blockquote-alert.html', '<aside data-site-alert="true">{{ .Text }}</aside>')
    override = check('site-hooks')
    p = body(override)
    assert p.all(**{'data-site-image':'true'}) and p.all(**{'data-site-math':'true'}) and p.all(**{'data-site-alert':'true'})
    (run/'results.json').write_text(json.dumps({'passed':passed,'expected_rejections':rejected,'boundary':'native attrs are test-only; containers/figures pending approval'}, indent=2))
    print('PASS P3-B native subset and grammar boundaries; retained', run)

if __name__ == '__main__': main()
