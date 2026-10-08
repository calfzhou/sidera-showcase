"""C2 native container/leaf composition. No Hexo parser, code execution or network."""
from pathlib import Path
import json,os,sys,tempfile
sys.dont_write_bytecode=True
from check_tag_routes import translate_menu_targets, ROOT,copy_showcase,build
from check_docs import write
from check_shell import nodes
from check_snippets import Codes
ROUTE='/handbook/reference/content-components/'
def cls(node,name): return [n for n in node.all() if name in n.attrs.get('class','').split()]
def main():
 run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='composition-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
 s=copy_showcase(run,'live');passed=[];rejected=[]
 def check(label,diagnostic=None,flags=()):
  out=build(s,run,label,diagnostic,('--printI18nWarnings',*flags));(rejected if diagnostic else passed).append(label);return out
 def live(out,prefix=''):
  d=nodes(out,ROUTE);fold=d.all(id='fold-comparison')[0];assert fold.tag=='details' and 'open' not in fold.attrs
  assert d.all(id='fold-code')[0].attrs.get('open') is None and 'open' in d.all(id='fold-code')[0].attrs
  cells=cls(fold,'content-cell');assert len(cells)==2
  assert [x.words() for x in cls(cells[0],'content-link-title')]==['Read the connected article']
  assert [x.words() for x in cls(cells[1],'content-link-title')]==['Open the harmless file','Keep two cards in one cell']
  assert 'no-caption' in cells[1].attrs['class']
  assert len(cls(fold,'markdown-alert-tip'))==1
  assert cls(fold,'content-kbd')[0].words()=='Enter'
  codes=Codes(out/ROUTE.strip('/')/'index.html').blocks[1:]
  original=(s/'content/handbook/reference/content-components/example.txt').read_bytes()
  assert [c['source'] for c in codes]==[original.decode(),'No included code is executed.\n',original.decode(),'Only this value']
  # Codes parser also sees the exact-copy component's data attribute; no source download there.
  for c in codes[:3]:
   assert c['text']==c['source']
   assert c['urls']==[prefix+ROUTE+'example.txt']
  ids=[n.attrs['id'] for n in d.all() if n.attrs.get('id','').startswith(('snippet-','folding-'))];assert len(ids)==len(set(ids))
  assert 'data-sidera-math' in (out/ROUTE.strip('/')/'index.html').read_text()
  assert any(n.tag=='blockquote' and 'Fieldbook example' in n.words() and any(c.tag=='em' and c.words()=='Notes on writing' for c in n.all()) for n in d.all())
  assert 'data-sidera-container=' not in (out/ROUTE.strip('/')/'index.html').read_text()
 out=build(ROOT,run,'normal',flags=('--baseURL','https://example.org/','--printI18nWarnings',));passed.append('normal');live(out)
 # Two siblings with the SAME local shortcode ordinal must retain independent output,
 # source selection, IDs and cell attrs. Cover all leaf types and exact inline text.
 fixture=r'''---
title: Native composition
---
{{% block id="outer-group" %}}
## Native outer heading
{{< folding title="An **inline** label" id="test-fold" >}}
{{< grid columns=2 >}}
{{< cell id="first-cell" >}}
### First cell heading
A{{< u text="aa" >}}bcc|{{< mark text="✓ & <tag> $not_math$" color="green" >}}end|{{< kbd text="`" >}}.
{{< snippet src="sample.py" from=1 to=1 options="linenos=inline,anchorlinenos=true" >}}
{{< link href="../journal/connect-the-useful-parts/index.md?probe=1#give-a-link-a-reason" text="First card" >}}
{{< /cell >}}
{{< cell id="second-cell" class="no-caption" >}}
### Second cell heading
{{< snippet src="sample.py" from=2 to=2 options="linenos=table,anchorlinenos=true" >}}
{{< link href="../notes/reading-list/index.md" text="Second card" >}}
> ![Quoted image|96](sample.svg "Quoted caption suppressed by cell")
> {.invert-when-dark}
{{< /cell >}}
{{< /grid >}}
{{< box title="Nested box" color="red" >}}
{{< copy text="  COPY & <value>  " prefix="Not copied" >}}
{{< quot text="A standalone thought" ornament=false >}}
{{< snippet src="labels.py" scope="shared" >}}
{{< /box >}}
{{< block class="invert-when-dark" id="marked-group" >}}
![Marked image|64](sample.svg)
{.invert-when-light}
{{< /block >}}
{{< /folding >}}
{{% /block %}}

{{% folding title="Empty fold" open=false %}}{{% /folding %}}

{{% grid columns=5 id="five-grid" %}}
{{< cell >}}
![One of five columns|96](sample.svg)
{{< /cell >}}
{{% /grid %}}

{{% grid id="default-grid" %}}
{{< cell >}}Default minimum width{{< /cell >}}
{{% /grid %}}
'''
 write(s,'content/composition/index.md',fixture);write(s,'content/composition/sample.py','first = "<script>not code execution</script>"\r\nsecond = 2\n')
 write(s,'content/composition/sample.svg',(s/'content/handbook/reference/content-components/signal.svg').read_text())
 out=check('baseline');live(out);d=nodes(out,'/composition/');first=d.all(id='first-cell')[0];second=d.all(id='second-cell')[0]
 assert cls(first,'content-link-title')[0].words()=='First card' and cls(second,'content-link-title')[0].words()=='Second card'
 assert first.all(href='/journal/2026/04/14/connect-the-useful-parts/?probe=1#give-a-link-a-reason')
 assert d.all(href='#first-cell-heading') and d.all(href='#second-cell-heading')
 assert cls(first,'content-mark')[0].words()=='✓ & <tag> $not_math$'
 assert not any(n.tag=='script' for n in first.all())
 codes=Codes(out/'composition/index.html').blocks
 assert codes[0]['source']=='first = "<script>not code execution</script>"\r\n' and codes[1]['source']=='second = 2\n'
 assert codes[2]['source']=='  COPY & <value>  '
 assert codes[3]['source']==(s/'assets/snippets/labels.py').read_text()
 assert (out/'composition/sample.py').read_bytes()==(s/'content/composition/sample.py').read_bytes()
 allids=[n.attrs['id'] for n in d.all() if 'id' in n.attrs];assert len(allids)==len(set(allids)),allids
 # Conditional math from folding summary ONLY, body ONLY and embedded Hugo Summary.
 write(s,'content/fold-summary.md','---\ntitle: Fold summary math\n---\n{{% folding title="Only $x^2$ here" %}}\nPlain body.\n{{% /folding %}}\n\n<!--more-->\n\nAfter summary.\n')
 write(s,'content/fold-body.md','---\ntitle: Fold body math\n---\n{{% box %}}\n$y_2$\n{{% /box %}}')
 write(s,'content/fold-host.md','---\ntitle: Summary host\nlayout: fold-host\n---\n')
 write(s,'layouts/fold-host.html','{{ define "main" }}{{ $child := site.GetPage "/fold-summary" }}{{ partial "sidera/shell.html" (dict "Page" . "Content" $child.Summary) }}{{ end }}')
 out=check('math-summary')
 for name in ['fold-summary','fold-body','fold-host']: assert 'data-sidera-math' in (out/name/'index.html').read_text()
 assert 'data-sidera-math' not in (out/'composition/index.html').read_text()
 out=check('chinese',flags=('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'));live(out,'/_chinese')
 assert '下载完整源码' in (out/'composition/index.html').read_text()
 # Native filename locales keep distinct page-scoped bridges and native resources.
 translate_menu_targets(s)
 write(s,'locales.toml',"defaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
 write(s,'content/about.zh.md','---\ntitle: About\n---\nLocale test.\n')
 write(s,'content/composition/index.zh.md',fixture.replace('First card','第一张卡片').replace('Second card','第二张卡片'))
 out=check('languages',flags=('--config','hugo.toml,locales.toml','--baseURL','https://example.org/preview/'))
 assert cls(nodes(out,'/zh/composition/').all(id='first-cell')[0],'content-link-title')[0].words()=='第一张卡片'
 assert cls(nodes(out,'/en/composition/').all(id='first-cell')[0],'content-link-title')[0].words()=='First card'
 # Opt-in mounted docs and native dated bundle resource/source context.
 write(s,'themes/sidera/docs/content/composed/index.md','---\ntitle: Mounted fold\n---\n{{% folding title="Mounted" %}}\n{{< snippet src="local.txt" >}}\n[Authoring](../authoring/_index.md)\n{{% /folding %}}')
 write(s,'themes/sidera/docs/content/composed/local.txt','MOUNTED\n')
 write(s,'content/journal/composed/index.md','---\ntitle: Dated fold\ndate: 2026-04-21\n---\n{{% box %}}\n{{< snippet src="local.txt" >}}\n{{% /box %}}')
 write(s,'content/journal/composed/local.txt','DATED\n')
 out=check('docs',flags=('--config','hugo.toml,manual-on.toml','--baseURL','https://example.org/preview/'))
 assert nodes(out,'/sidera/composed/').all(href='/preview/sidera/authoring/')
 assert Codes(out/'sidera/composed/index.html').blocks[0]['urls']==['/preview/sidera/composed/local.txt']
 assert Codes(out/'journal/2026/04/21/composed/index.html').blocks[0]['urls']==['/preview/journal/2026/04/21/composed/local.txt']
 # Valid supported combinations plus strict diagnostics for wrong notation/structure.
 bad=[('root-standard','{{< folding title="Wrong" >}}Text{{< /folding >}}','was not consumed'),
 ('nested-percent','{{% block %}}{{% folding title="Wrong" %}}**Text**{{% /folding %}}{{% /block %}}','Raw HTML omitted'),
 ('missing-title','{{% folding %}}Text{{% /folding %}}','nonblank title'),
 ('bad-open','{{% folding title="x" open="false" %}}Text{{% /folding %}}','open must be a boolean'),
 ('bad-color','{{% box color="url(x)" %}}Text{{% /box %}}','color must be'),
 ('bad-child','{{% box child="iframe" %}}Text{{% /box %}}','child must be'),
 ('class-injection','{{% block class="x;color:red" %}}Text{{% /block %}}','invalid class'),
 ('style','{{% folding title="x" style="color:red" %}}Text{{% /folding %}}','unsupported parameter'),
 ('title-block','{{% folding title="# Heading" %}}Text{{% /folding %}}','inline Markdown only'),
 ('title-raw','{{% folding title="<img src=x onerror=bad()>" %}}Text{{% /folding %}}','Raw HTML omitted'),
 ('body-raw','{{% folding title="x" %}}<script>bad()</script>{{% /folding %}}','Raw HTML omitted'),
 ('grid-empty','{{% grid %}}{{% /grid %}}','at least one cell'),
 ('grid-stray','{{% grid %}}Stray text{{< cell >}}Cell{{< /cell >}}{{% /grid %}}','only cell children'),
 ('grid-leaf','{{% grid %}}{{< link text="x" href="/" >}}{{% /grid %}}','requires cell children'),
 ('cell-orphan','{{% cell %}}Text{{% /cell %}}','grid parent'),
 ('grid-columns','{{% grid columns=7 %}}{{< cell >}}Text{{< /cell >}}{{% /grid %}}','columns must be'),
 ('grid-zero','{{% grid min_width=0 %}}{{< cell >}}Text{{< /cell >}}{{% /grid %}}','positive integer'),
 ('grid-width','{{% grid min_width=800 %}}{{< cell >}}Text{{< /cell >}}{{% /grid %}}','min_width must be'),
 ('grid-both','{{% grid columns=2 min_width=150 %}}{{< cell >}}Text{{< /cell >}}{{% /grid %}}','not both'),
 ('forged-leaf','> X\n{data-sidera-leaf="sidera-math"}','invalid native key'),
 ('missing-leaf','> X\n{data-sidera-leaf="sidera-leaf-u-9999"}','unknown native leaf'),
 ('forged-inline','[X](sidera-inline:sidera-math)','invalid native key'),
 ('missing-container','> X\n{data-sidera-container="sidera-container-block-9999"}','unknown native node'),
 ('snippet-traversal','{{% box %}}{{< snippet src="../secret.py" >}}{{% /box %}}','invalid resource path')]
 for name,content,diagnostic in bad:
  write(s,'content/composition-negative.md','---\ntitle: Negative\n---\n'+content+'\n');check(name,diagnostic)
 write(s,'content/composition-negative.md','---\ntitle: Repaired\n---\nSafe.\n')
 write(s,'attrs-off.toml','[markup.goldmark.parser.attribute]\nblock=false\n');check('attrs-disabled','was not consumed',('--config','hugo.toml,attrs-off.toml'))
 write(s,'always.toml',"[markup.goldmark.renderHooks.link]\nuseEmbedded='always'\n");check('bridge-bypassed','was not consumed',('--config','hugo.toml,always.toml'))
 # A cooperating site hook preserves inline slots and owns ordinary links.
 write(s,'layouts/_markup/render-link.html','{{ if hasPrefix .Destination "sidera-inline:" }}{{ partial "components/render-leaf.html" (dict "context" . "key" (strings.TrimPrefix "sidera-inline:" .Destination)) }}{{ else }}<a data-site-link="true" href="{{ partial "links/destination.html" . }}">{{ .Text }}</a>{{ end }}')
 out=check('site-hook');assert nodes(out,'/composition/').all(**{'data-site-link':'true'}) and cls(nodes(out,'/composition/'),'content-u')
 (run/'results.json').write_text(json.dumps({'passed':passed,'rejected':rejected},indent=2));print('PASS C2 native composition',len(passed),'builds /',len(rejected),'rejections; retained',run)
if __name__=='__main__':main()
