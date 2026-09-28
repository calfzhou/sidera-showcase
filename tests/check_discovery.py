"""P3-E native lifecycle/publication/graph/index checks. Tiny source, sequential builds.
No reference modification, dependency installation, network or raw-Markdown indexing.
"""
from pathlib import Path
import json, os, re, subprocess, sys, hashlib
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
THEME=ROOT/'themes/sidera'
RUN=Path(os.environ['SIDERA_CHECK_DIR']).resolve()
SOURCE=RUN/'source'

def write(name,text):
    p=SOURCE/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)

def build(name,extra=(),expect=None,workers=2):
    dest=RUN/name
    result=subprocess.run(['hugo','--source',str(SOURCE),'--themesDir',str(ROOT/'themes'),'--destination',str(dest),'--cacheDir',str(RUN/'cache'),'--panicOnWarning',*extra],capture_output=True,text=True,env={**os.environ,'GOMAXPROCS':str(workers)},timeout=60)
    (RUN/(name+'.log')).write_text(result.stdout+result.stderr)
    if expect:
        assert result.returncode and expect in result.stdout+result.stderr,result.stdout+result.stderr
    else:assert result.returncode==0,result.stdout+result.stderr
    return dest

def index(dest,lang='en'):
    html=(dest/('index.html' if lang=='en' else 'zh/index.html')).read_text()
    url=re.search(r'data-index="([^"]+)"',html)[1]
    file=dest/url.removeprefix('/preview/').lstrip('/')
    data=json.loads(file.read_text())
    return {d['url']:d for d in data['documents']},file

def edges(dest,path,kind):
    html=(dest/path/'index.html').read_text()
    match=re.search(r'<ul[^>]*data-content-relations="'+kind+r'"[^>]*>(.*?)</ul>',html,re.S)
    return re.findall(r'href="([^"]+)"',match[1]) if match else []

def main():
    RUN.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(exist_ok=True)
    config="""baseURL='https://example.org/preview/'
theme='sidera'
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
link_heading_checks=true
[languages.en]
locale='en-US'
[languages.zh]
locale='zh-CN'
"""
    write('hugo.toml',config)
    write('content/_index.md','---\ntitle: Home\n---\nPublic home text.')
    write('content/_index.zh.md','---\ntitle: 首页\n---\n中文首页。')
    write('content/notes/_index.md','---\ntitle: Notes\n---\nNotes introduction.')
    write('content/notes/_index.zh.md','---\ntitle: 笔记\n---\n笔记介绍。')
    write('content/notes/independent/_index.md','---\ntitle: Separate root\nparams:\n  scope_root: true\n---\nIndependent source.')
    write('content/notes/independent/leaf.md','---\ntitle: Separate leaf\n---\nBoundaryneedle.')
    write('content/journal/_index.md','---\ntitle: Journal\n---\nJournal.')
    write('content/journal/b/index.md','''---
title: Dated target
date: 2026-04-14
params:
  search: false
---
Intro marginalia.

## Native destination {#keep-native}

Café 连接笔记 a+b[0] café. Literal `<img src=x onerror=alert(1)>`.

[Cycle](../../notes/a/index.md#native-source)
[Same page](index.md?repeat=1#keep-native)

{{% folding title="A hidden phrase in a label" %}}
### Hidden heading
Hiddenbody needle.
{{% /folding %}}
''')
    write('content/notes/a/index.md','''---
title: Source note
params:
  references: ['[Authored only](../../../manual.md)']
---
## Native source

[Direct](../../journal/b/index.md?x=1#keep-native)
[Reference][ref] [Duplicate](../../journal/b/index.md#keep-native)
[Self](index.md#native-source) [Fragment](#native-source)
[Resource](file.txt) [External](https://external.invalid/)
[Native URL](/preview/journal/2026/04/14/b/)
[Same origin](https://example.org/preview/journal/2026/04/14/b/?q=x#keep-native)
[Link only](../../link-only.md) [Unlisted](../../unlisted.md)
[Opt-out](../../opt-out.md)

[ref]: ../../journal/b/index.md

{{% folding title="Composition" %}}
{{< link href="../../journal/b/index.md#keep-native" text="Card content" >}}
{{< snippet src="file.txt" options="linenos=table" >}}
{{< mark text="AuthoredMarkCanary" >}}
Math $x^2$.
{{% /folding %}}

```python {linenos=table}
def fenced_needle():
    return "<b>literal</b>"
```
''')
    # Correct native source-relative manual footer path (not body graph input).
    p=SOURCE/'content/notes/a/index.md';p.write_text(p.read_text().replace('../../../manual.md','../../manual.md'))
    write('content/notes/a/file.txt','snippet_unique = "<tag> & café"\n')
    write('content/notes/a/index.zh.md','---\ntitle: 中文原文\n---\n## 中文标题\n连接笔记。\n[英文来源](index.md#native-source)\n')
    write('content/manual.md','---\ntitle: Manual reference only\nparams:\n  references: ["Footer $e^2$"]\n---\nManualbody.')
    write('content/custom.md','---\ntitle: Custom destination\nurl: /custom-place/\n---\n[Note](notes/a/index.md#native-source)')
    write('content/opt-out.md','---\ntitle: Opt out\nparams:\n  search_index: false\n  link_graph: false\n---\nOptoutCanary. [Note](notes/a/index.md#native-source)')
    variants={
      'draft':'draft: true', 'future':'publishDate: 2999-01-01', 'expired':'expiryDate: 2000-01-01',
      'headless':'headless: true','never':'build:\n  render: never','link-only':'build:\n  render: link',
      'unlisted':'build:\n  list: never','local-list':'build:\n  list: local'}
    for name,fm in variants.items():write('content/'+name+'.md',f'---\ntitle: {name}\n{fm}\n---\nPublicationCanary{name}.')
    normal=build('native-public')
    docs,file=index(normal);zh,_=index(normal,'zh')
    text=file.read_text()
    assert len(docs)==9, list(docs)
    assert len(zh)==3, list(zh)
    assert all('PublicationCanary' not in s and 'OptoutCanary' not in s and 'AuthoredMarkCanary' not in s for s in (text,))
    assert not any('zh/' in url for url in docs)
    assert docs['/preview/notes/independent/leaf/']['scope']=='/preview/notes/independent/'
    assert docs['/preview/notes/a/']['scope']=='/preview/notes/'
    assert docs['/preview/custom-place/']['scope']==''
    a='/preview/notes/a/';b='/preview/journal/2026/04/14/b/'
    assert edges(normal,'notes/a','outgoing')==[b]
    assert edges(normal,'notes/a','backlinks')==['/preview/custom-place/',b,'/preview/zh/notes/a/']
    assert edges(normal,'journal/2026/04/14/b','outgoing')==[a]
    assert edges(normal,'journal/2026/04/14/b','backlinks')==[a]
    assert 'id="search-input"' not in (normal/'journal/2026/04/14/b/index.html').read_text()
    assert 'data-sidera-search' in (normal/'journal/2026/04/14/b/index.html').read_text(), 'hidden input must not break an indexed destination highlight'
    assert edges(normal,'unlisted','backlinks')==[]
    assert edges(normal,'manual','backlinks')==[]
    assert 'data-sidera-math' in (normal/'manual/index.html').read_text(),'Authored footer math must precede deferred resource detection'
    assert 'snippet_unique = "<tag> & café"' in text.replace('\\"','"') or any('snippet_unique' in s['text'] for s in docs[a]['sections'])
    assert all('sidera-inline:' not in s['text'] and 'SIDERA' not in s['text'] for d in docs.values() for s in d['sections'])
    repeat=build('repeat-public',workers=1)
    assert file.read_bytes()==index(repeat)[1].read_bytes(),'deterministic worker/order repeat'
    for path in ('notes/a','journal/2026/04/14/b'):
        for kind in ('outgoing','backlinks'):assert edges(normal,path,kind)==edges(repeat,path,kind)
    allstates=build('allstates-public',['--buildDrafts','--buildFuture','--buildExpired'])
    private,privatefile=index(allstates)
    assert all('/preview/'+name+'/' in private for name in ('draft','future','expired'))
    assert 'PublicationCanarydraft' in privatefile.read_text(),'private all-states explicitly publishes drafts'
    # native route changes, same .md link source and graph identity
    write('route.toml',"[permalinks.page]\njournal='/articles/:slugorcontentbasename/'\n")
    routes=build('routes-public',['--config','hugo.toml,route.toml'])
    assert edges(routes,'notes/a','outgoing')==['/preview/articles/b/']
    assert '/preview/articles/b/' in index(routes)[0]
    # changed body/native content-addressed resource; clearing/removing link changes both directions.
    original=(SOURCE/'content/journal/b/index.md').read_text()
    write('content/journal/b/index.md',original.replace('Intro marginalia.','FreshnessCanary.').replace('[Cycle](../../notes/a/index.md#native-source)','No cycle now.'))
    fresh=build('fresh-public'); freshdocs,freshfile=index(fresh)
    assert freshfile.name!=file.name and freshfile.read_bytes()!=file.read_bytes() and 'FreshnessCanary' in freshfile.read_text()
    assert b not in edges(fresh,'notes/a','backlinks')
    assert edges(fresh,'journal/2026/04/14/b','outgoing')==[]
    write('content/journal/b/index.md',original)
    # opt out of the UI globally: no public search resource or dead input.
    write('disabled.toml','[params]\nsearch=false\n')
    disabled=build('disabled-public',['--config','hugo.toml,disabled.toml'])
    assert not list(disabled.glob('search/*.json'))
    assert 'id="search-input"' not in (disabled/'notes/a/index.html').read_text()
    # Configurable/repeated graph components preserve empty and identity semantics.
    write('footer.toml',"[params]\narticle_footer=['outgoing','outgoing','backlinks']\n")
    footer=build('footer-public',['--config','hugo.toml,footer.toml'])
    rendered=(footer/'notes/a/index.html').read_text()
    assert rendered.count('data-content-relations="outgoing"')==2
    assert 'article-footer-outgoing-1-heading' in rendered and 'article-footer-outgoing-2-heading' in rendered
    assert '<footer class="article-footer"' not in (footer/'manual/index.html').read_text()
    # Same logical path, different language settings must not share cached policy.
    note=(SOURCE/'content/notes/a/index.md').read_text()
    write('content/notes/a/index.md',note.replace('params:\n','params:\n  search_index: false\n  link_graph: false\n'))
    language=build('language-policy-public')
    assert a not in index(language)[0]
    assert '/preview/zh/notes/a/' in index(language,'zh')[0]
    assert edges(language,'journal/2026/04/14/b','backlinks')==[]
    write('content/notes/a/index.md',note)
    # Invalid excluded metadata remains diagnosed, rather than using privacy to waive validation.
    for key in ('search','search_index','link_graph'):
        write('content/draft.md',f'---\ntitle: Draft\ndraft: true\nparams:\n  {key}: wrong\n---\nPrivate.')
        build('invalid-'+key,expect=key+' must be boolean')
    write('content/draft.md','---\ntitle: Draft\ndraft: true\n---\nPublicationCanarydraft.')
    print('PASS 8 builds / 3 rejections: native publication/language/baseURL/scope/graph cycles/manual separation, deterministic workers, body refresh and disable')
    print(RUN)

if __name__=='__main__':main()
