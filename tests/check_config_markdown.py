"""F2 configured Markdown: small native fixtures, no server/network/dependencies.
Run with SIDERA_CHECK_DIR pointing to a fresh ignored .checks/ directory.
"""
from pathlib import Path
import json, os, re, subprocess, sys
sys.dont_write_bytecode = True
from check_p2f import nodes
from check_p1a import ROOT

RUN = Path(os.environ['SIDERA_CHECK_DIR']).resolve()
SOURCE = RUN / 'source'
VALUES = {
    'test.text': 'A ](https://injected.invalid/) <img src=x> &copy; *bold* `code` $1 \\ 连接 {site.title}',
    'test.url': 'https://example.org/a_(b)?x=1&y=2',
    'test.source': '/journal/target/index.md#destination',
    'test.empty': '',
    'test.collision': '{test.text}',
    'test.canary': 'FooterOnlyCanary',
}

def write(path, text):
    p = SOURCE / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def build(label, diagnostic=None):
    out = RUN / label
    p = subprocess.run(['hugo', '--source', str(SOURCE), '--themesDir', str(ROOT/'themes'),
        '--destination', str(out), '--cacheDir', str(RUN/'cache'), '--panicOnWarning',
        '--printI18nWarnings', '--printPathWarnings'], capture_output=True, text=True,
        env={**os.environ, 'GOMAXPROCS':'2'}, timeout=60)
    log = p.stdout+p.stderr
    (RUN/(label+'.log')).write_text(log)
    if diagnostic: assert p.returncode and diagnostic in log, log
    else: assert p.returncode == 0 and 'WARN' not in log, log
    print('PASS', label, '(expected rejection)' if diagnostic else '')
    return out


def main():
    RUN.mkdir(parents=True, exist_ok=False)
    write('hugo.toml', '''baseURL='https://example.org/preview/'
theme='sidera'
title='English site'
defaultContentLanguage='en'
disableKinds=['RSS']
[taxonomies]
_merge='shallow'
[permalinks.term]
_merge='shallow'
[markup.tableOfContents]
_merge='shallow'
[markup.goldmark.parser]
_merge='deep'
[markup.goldmark.parser.attribute]
_merge='shallow'
[markup.goldmark.extensions.passthrough]
_merge='deep'
[permalinks.page]
journal='/journal/:year/:month/:day/:slugorcontentbasename/'
[params]
footer_text='Site **{site.title}** / {page.title}. [Home]({url:showcase.home}) {test.canary}'
text='Base {page.title}'
article_text='Article {page.title}'
article_end_text='End {page.title}'
license='License {page.title} (authored notice, no license grant).'
references=['Reference {page.title}: [Target]({url:test.source})']
[params.profile]
title='Plain {page.title}'
text='Profile {page.title}'
[params.widgets.custom]
component='text'
[params.widgets.custom.config]
text='Widget {page.title} / {test.instance}'
[cascade.params]
left=['text', 'custom', {widget='custom',config={text='Override {page.title} / {test.instance}'}}, 'profile']
right=false
article_footer=['text','license','references','outgoing','backlinks']
[languages.en]
locale='en-US'
[languages.zh]
locale='zh-CN'
title='中文站点'
''')
    for lang, suffix, title in [('en','','Home'),('zh','.zh','首页')]:
        write('content/_index'+suffix+'.md', f'---\ntitle: {title}\n---\nHome body.')
        write('content/notes/_index'+suffix+'.md', '---\ntitle: Notes\npreset: notes\n---\n')
    write('content/journal/_index.md','---\ntitle: Journal\npreset: blog\n---\n')
    write('content/journal/target/index.md','---\ntitle: Target\ndate: 2026-04-14\n---\n## Destination\n\nTarget body.')
    for slug, title, suffix in [('a','Alpha',''),('b','Beta',''),('a','中文原文','.zh')]:
        write(f'content/notes/{slug}/index{suffix}.md', f'''---
title: {title}
---
Body {{page.title}} stays literal. `{{site.title}}` and $x^2$.

{{{{< kbd text="{{page.title}}" >}}}}
''')
    write('content/notes/clear.md','''---
title: Cleared
params:
  article_end_text: ''
  article_footer: false
  site_footer: []
  left: [{component: text, config: {text: ''}}]
---
Plain body, no math.
''')
    write('content/notes/plain.md','---\ntitle: Plain\n---\nPlain body.\n')
    write('data/test.json', json.dumps(VALUES, ensure_ascii=False))
    # Reuse the committed demonstration; add test-only explicitly selected values.
    demo = (ROOT/'layouts/_partials/config-markdown/values.html').read_text()
    write('layouts/_partials/config-markdown/values.html', demo.replace(
        '{{- return (dict "showcase.home" .Page.Site.Home.Permalink) -}}',
        '{{- return (merge hugo.Data.test (dict "showcase.home" .Page.Site.Home.Permalink "test.instance" (.Instance | default "end"))) -}}'))
    cases = {
        'repeat': '{page.title} / {page.title}',
        'absent': '{test.empty} {author.name} {unknown.value}',
        'literal': r'\{page.title} &#123;site.title&#125; {ordinary} \\{page.title}',
        'single': '{test.collision}',
        'attack': '**{test.text}** [{test.text}]({url:test.url})',
        'code': '`{page.title}` ``a `{page.title}` b``\n\n~~~text\n{page.title}\n~~~\n\n````text\n```\n{page.title}\n```\n````\n\n    {page.title}\n\nAfter {page.title}',
        'math': '$\\text{ {page.title} }$ and $$\\text{ {page.title} }$$ then {page.title}',
        'no_token': '**Keep** [Target](../../journal/target/index.md#destination) &amp; `a{b}`',
        'image': '![Kept](pixel.svg)\n{.no-caption}',
    }
    write('data/cases.json', json.dumps(cases))
    write('content/notes/a/pixel.svg','<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8"/></svg>')
    write('layouts/_partials/sidera/site-footer-extra.html', '''{{ if eq .Page.Path "/notes/a" }}
{{ $ctx := . }}{{ $results := dict }}
{{ range $key, $text := hugo.Data.cases }}
  {{ $context := merge $ctx (dict "Text" $text) }}
  {{ $raw := partial "config-markdown/interpolate.html" $context }}
  {{ $rendered := partial "config-markdown/render.html" $context }}
  {{ $direct := "" }}{{ if in (slice "no_token" "image") $key }}{{ $direct = $ctx.Page.RenderString (dict "display" "block") $text }}{{ end }}
  {{ $results = merge $results (dict $key (dict "raw" $raw "rendered" $rendered "direct" $direct)) }}
{{ end }}
<script id="config-probe" type="application/json">{{ $results | jsonify | safeJS }}</script>
{{ end }}''')
    # Native i18n Markdown must never enter the interpolation helper.
    write('i18n/en.toml','[built_with]\nother="Translation {site.title}"\n[license_default]\nother="Neutral {page.title}"\n')
    out = build('baseline')
    for route, title, site_title, home in [('/notes/a/','Alpha','English site','https://example.org/preview/'),
            ('/notes/b/','Beta','English site','https://example.org/preview/'),
            ('/zh/notes/a/','中文原文','中文站点','https://example.org/preview/zh/')]:
        d = nodes(out, route)
        def instance(name): return d.all(**{'data-instance':name})[0]
        for name, text in [('left-text-1',f'Base {title}'), ('left-text-2',f'Widget {title} / left-text-2'),
                ('left-text-3',f'Override {title} / left-text-3'), ('article-footer-text-1',f'Article {title}')]:
            assert instance(name).words().strip()==text, (route,name,instance(name).words())
        assert f'Profile {title}' in instance('left-profile-1').words()
        assert 'Plain {page.title}' in instance('left-profile-1').words()
        assert f'License {title}' in instance('article-footer-license-1').words()
        assert f'Reference {title}' in instance('article-footer-references-1').words()
        assert instance('article-footer-references-1').all(href='/preview/journal/2026/04/14/target/#destination')
        footer=instance('site-footer-text-1')
        assert site_title in footer.words() and title in footer.words() and footer.all(href=home)
        assert d.all(**{'class':'article-end'})[0].words().strip()==f'End {title}'
        assert 'Body {page.title} stays literal.' in d.words()
        assert any(n.tag=='kbd' and n.words()=='{page.title}' for n in d.all())
        # Footer links alone must not manufacture body graph edges.
        assert not d.all(**{'data-content-relations':'outgoing'})
    d=nodes(out,'/notes/a/')
    assert 'Translation {site.title}' in d.words()
    probe=json.loads(d.all(id='config-probe')[0].words())
    assert probe['repeat']['rendered']=='<p>Alpha / Alpha</p>\n'
    assert probe['absent']['raw']==cases['absent']
    assert '{test.text}' in probe['single']['rendered'] and 'injected' not in probe['single']['rendered']
    assert r'\{page.title}' in probe['literal']['raw'] and '\\\\Alpha' in probe['literal']['raw']
    assert probe['code']['raw']==cases['code'].replace('After {page.title}','After Alpha')
    assert probe['math']['raw']==cases['math'].replace('then {page.title}','then Alpha')
    for key in ('no_token','image'):
        assert probe[key]['raw']==cases[key] and probe[key]['rendered']==probe[key]['direct']
    attack=probe['attack']['rendered']
    assert attack.count('<a ')==1 and '<img ' not in attack and '<code>' not in attack and '<em>' not in attack,attack
    assert 'href="https://example.org/a_%28b%29?x=1&amp;y=2"' in attack,attack
    assert '<strong>A ](https://injected.invalid/)' in attack and '&lt;img src=x&gt;' in attack,attack
    assert '&amp;copy;' in attack and '{site.title}' in attack and '$1' in attack,attack
    assert '<figure' not in probe['image']['rendered']
    clear=nodes(out,'/notes/clear/')
    assert not clear.all(**{'class':'article-end'}) and not clear.all(**{'data-instance':'site-footer-text-1'})
    plain=(out/'notes/plain/index.html').read_text()
    assert not re.search(r'<link[^>]+katex', plain)
    # Search uses eligible BODY text only, not site/footer/profile/probe text.
    home=(out/'index.html').read_text()
    index_url=re.search(r'data-index="([^"]+)"',home)[1]
    payload=json.loads((out/index_url.removeprefix('/preview/')).read_text())
    assert 'FooterOnlyCanary' not in json.dumps(payload)
    assert '{page.title}' in json.dumps(payload)
    # Same authored string evaluated from a selecting preset and descendant defaults.
    write('content/preset/custom/_index.md','''---
title: Custom
params:
  defaults:
    params:
      footer_text: 'Selected {page.title}'
    cascade:
      params:
        footer_text: 'Descendant {page.title}'
---
''')
    write('content/scoped/_index.md','---\ntitle: Scoped\npreset: custom\n---\n')
    write('content/scoped/child.md','---\ntitle: Child\n---\n')
    write('content/scoped/local.md',"---\ntitle: Local\nparams:\n  footer_text: 'Local {page.title}'\n  license: true\n---\n")
    out=build('preset')
    for route,text in [('/scoped/','Selected Scoped'),('/scoped/child/','Descendant Child'),('/scoped/local/','Local Local')]:
        assert nodes(out,route).all(**{'data-instance':'site-footer-text-1'})[0].words().strip()==text
    assert 'Neutral {page.title}' in nodes(out,'/scoped/local/').words()
    # A bad URL is not accepted because Markdown/html-template escaping might save it.
    for label, value in [('scheme','javascript:alert(1)'),('relative-host','//evil.invalid/'),
                         ('breakout','https://example.org/\" title=\"bad'),('control','https://example.org/\n'),('angle','https://example.org/<img>')]:
        write('data/test.json',json.dumps({**VALUES,'test.url':value}))
        build(label,'invalid URL token' if label=='angle' else 'unsafe URL')
    write('data/test.json',json.dumps({**VALUES,'test.url':''}))
    build('missing-url','requires a nonempty value')
    write('data/test.json',json.dumps({**VALUES,'test.text':{'secret':'not-a-string'}}))
    build('type','values must be strings')
    write('data/test.json',json.dumps({**VALUES,'site.title':'shadow'}))
    build('shadow','must not replace built-in')
    write('layouts/_partials/config-markdown/values.html','{{ return (slice \"invalid\") }}')
    build('return-type','values partial must return a string map')
    print('PASS F2 surfaces, native extension, repeated/missing/literal/single-pass/code/math/text/URL safety; page/instance/locale/preset/cascade isolation, source/resources/assets/i18n/body-index/graph exclusions. Retained:',RUN)

if __name__=='__main__': main()
