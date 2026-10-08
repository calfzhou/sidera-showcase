"""Stellar-like native Markdown heading permalinks; no heading/TOC ID rewriting."""
from pathlib import Path
from urllib.parse import unquote
import os, sys
sys.dont_write_bytecode=True
from check_tag_routes import build,copy_showcase,local_links
from check_shell import nodes
from check_docs import write

SPECIMEN='''---
title: Heading markers
---
# First level

## Second level

A short paragraph separates the headings.

### Third level

#### Fourth level

##### Fifth level

###### Sixth level

## A *formatted* heading with [a real link](/about/) {#explicit .native title="A &quot;quoted&quot; label" lang="en" data-note="a&b" style="color:inherit" onclick="alert(1)"}

## 中文与 English：很长的标题应该自然换行并且保留原生链接和正确的正文对齐 abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789

## Repeated

## Repeated

## Escaped &lt;script&gt; &amp; "+quotes+"
'''

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live');write(source,'content/heading-markers.md',SPECIMEN)
 write(source,'headings.toml','[markup.goldmark.parser.attribute]\ntitle=true\n[params]\nfooter_text="## A footer heading"\n')
 for label,configs,base,prefix,caption in [('baseline','hugo.toml,headings.toml','https://example.org/','','Link to heading: '),('chinese','hugo.toml,headings.toml,examples/chinese.toml','https://example.org/_chinese/','/_chinese','链接到标题：')]:
  out=build(source,run,label,flags=('--config',configs,'--baseURL',base,'--printI18nWarnings'))
  d=nodes(out,'/heading-markers/');p=d.all(**{'class':'prose'})[0]
  for h in [n for n in p.all() if n.tag in ['h1','h2','h3','h4','h5','h6']]:
   anchors=h.all(**{'class':'heading-anchor'})
   if h.tag in ['h1','h6']:assert not anchors
   else:
    assert len(anchors)==1
    a=anchors[0];assert unquote(a.attrs['href'])=='#'+h.attrs['id']
    assert a.words()=={'h2':'#','h3':'=','h4':'|','h5':':'}[h.tag]
    assert a.attrs['aria-label'].startswith(caption) and a.attrs['title']==a.attrs['aria-label']
    assert a.children[0].attrs['aria-hidden']=='true'
  h=p.all(id='explicit')[0];assert h.attrs=={'id':'explicit','class':'native','data-note':'a&b','lang':'en','style':'color:inherit','title':'A &quot;quoted&quot; label'},h.attrs
  assert h.all(href='/about/') and any(x.tag=='em' for x in h.all())
  assert not any(x.tag=='script' or 'onclick' in x.attrs for x in p.all())
  assert p.all(id='repeated') and p.all(id='repeated-1')
  toc=next(n for n in d.all() if 'data-toc' in n.attrs)
  assert toc.all(href='#explicit') and not toc.all(**{'class':'heading-anchor'})
  assert not any(n.tag=='a' and n.all() and any(x.tag=='a' for x in n.all()) for n in p.all())
  # The existing normal specimen's native body IDs remain stable.
  normal=nodes(out,'/handbook/reference/markdown/');assert normal.all(id='code-and-data') and normal.all(id='fn:1')
  if not prefix:local_links(out)
 # Site translation override stays native and escaped.
 write(source,'i18n/en.toml',(source/'i18n/en.toml').read_text()+'\n[heading_permalink]\nother = "Section: {{ .title }}"\n' if (source/'i18n/en.toml').exists() else '[heading_permalink]\nother = "Section: {{ .title }}"\n')
 out=build(source,run,'override',flags=('--config','hugo.toml,headings.toml','--printI18nWarnings'))
 assert nodes(out,'/heading-markers/').all(**{'class':'heading-anchor'})[0].attrs['aria-label']=='Section: Second level'
 print('PASS heading levels, native IDs/attributes/inline markup, escaping, EN/ZH/override labels and TOC; retained',run)
if __name__=='__main__':main()
