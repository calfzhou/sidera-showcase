"""Ordinary Markdown: one live specimen, native body/anchor/resource/option contracts."""
from pathlib import Path
import json, os, sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase, build, local_links, html
from check_p2f import nodes
from check_p2w import write

ROUTE='/handbook/reference/markdown/'

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 specimen=source/'content/handbook/reference/markdown'
 passed=[]
 def check(label,flags=(),diagnostic=None):
  out=build(source,run,label,diagnostic,('--printI18nWarnings',*flags));passed.append(label);return out
 def body_check(out,route,prefix=''):
  d=nodes(out,route);body=d.all(**{'class':'prose'})[0]
  tags=[n.tag for n in body.all()]
  assert all(t in tags for t in ['h2','h3','h4','h5','h6','em','strong','del','ul','ol','blockquote','pre','table','img','figure','figcaption','hr','sup'])
  assert len([n for n in body.all() if n.tag=='input' and 'disabled' in n.attrs])==4
  assert len([n for n in body.all() if n.attrs.get('role')=='doc-backlink'])==2
  assert body.all(id='fn:1') and body.all(id='fnref:1') and body.all(id='fnref1:1')
  assert body.all(**{'class':'line hl'}), 'Native hl_lines must survive render hook'
  assert body.all(**{'class':'language-python','data-lang':'python'})
  assert body.all(href=prefix+'/handbook/') and body.all(href=prefix+'/handbook/reference/')
  images=[n for n in body.all() if n.tag=='img'];assert len(images)==3
  assert all(n.attrs.get('alt') for n in images)
  assert [n.attrs['src'] for n in images]==['sample.svg',prefix+route+'sample.svg','sample.svg']
  assert any(n.attrs.get('width')=='120' and n.attrs.get('height')=='60' for n in images)
  assert (html(out,route).parent/'sample.svg').read_bytes()==(specimen/'sample.svg').read_bytes()
  ids=[n.attrs['id'] for n in d.all() if n.attrs.get('id')];assert len(ids)==len(set(ids))
  for a in d.all():
   if a.tag=='a' and a.attrs.get('href','').startswith('#'):assert a.attrs['href'][1:] in ids
  assert len(d.all(**{'class':'article-end'}))==1
  return body
 baseline=check('baseline');local_links(baseline);body_check(baseline,ROUTE)
 zh=check('chinese',('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/_chinese/'));local_links(zh,'/_chinese');body_check(zh,ROUTE,'/_chinese')
 # Reuse the exact specimen in two temporary contexts; no second live showcase.
 text=(specimen/'index.md').read_text();body=text.split('---',2)[2]
 write(source,'content/markdown-check/index.md','---\ntitle: Standalone body\n---\n'+body)
 (source/'content/markdown-check/sample.svg').write_bytes((specimen/'sample.svg').read_bytes())
 parent=source/'content/handbook/reference/_index.md';parent.write_text('---\ntitle: Reference desk\nparams:\n  children:\n    order: [frontmatter, markdown]\n    page_size: 1\n---\n'+body)
 (parent.parent/'sample.svg').write_bytes((specimen/'sample.svg').read_bytes())
 # Native fence attributes/options plus plain/inline-numbered code and a large image.
 extra='''
# Native body heading

## 中文标题

```python {#native-code .example linenos=inline linenostart=20 hl_lines=[2] anchorlinenos=true lineanchors="specimen" onclick="alert(1)"}
value = "<&>"
print(value)
```

```
plain <script> is text, not markup
```

- [x] A loose task with a paragraph.

  The continuation belongs to the same task.

- [ ] Another loose task.

![A wide local diagram](wide.svg)
'''
 write(source,'content/markdown-check/index.md','---\ntitle: Standalone body\n---\n'+body+extra)
 write(source,'content/markdown-check/wide.svg',(specimen/'sample.svg').read_text().replace('width="160" height="80"','width="1200" height="600"'))
 contexts=check('contexts',('--baseURL','https://example.org/preview/'));local_links(contexts,'/preview')
 body_check(contexts,'/handbook/reference/','/preview')
 d=nodes(contexts,'/markdown-check/');p=d.all(**{'class':'prose'})[0]
 assert p.all(id='native-body-heading') and p.all(id='中文标题')
 assert p.all(id='native-code') and p.all(id='specimen-20') and p.all(id='specimen-21')
 assert len(p.all(**{'class':'line hl'}))==2
 assert not any(n.tag=='script' or 'onclick' in n.attrs for n in p.all())
 assert 'plain <script> is text' in p.words()
 assert not nodes(contexts,'/handbook/reference/page/2/').all(**{'class':'prose'})
 assert not nodes(contexts,'/handbook/reference/page/2/').all(**{'class':'article-end'})
 # Strict build must still reject raw HTML; normal Markdown unsafe URLs stay sanitized.
 write(source,'content/markdown-safety.md','---\ntitle: Safety\n---\n[Unsafe](javascript:alert%281%29)\n\n`<script>`\n')
 safe=check('safe');p=nodes(safe,'/markdown-safety/').all(**{'class':'prose'})[0]
 assert not any(n.attrs.get('href','').startswith('javascript:') for n in p.all())
 write(source,'content/markdown-safety.md','---\ntitle: Safety\n---\n<script>alert(1)</script>\n')
 check('unsafe',diagnostic='Raw HTML omitted')
 (run/'results.json').write_text(json.dumps({'passed':passed,'strict_builds':4,'expected_rejections':1,'specimen':ROUTE,'native_options_anchors_resources_security':True},indent=2))
 print('PASS ordinary Markdown semantic/context/resource/security checks; retained',run)
if __name__=='__main__':main()
