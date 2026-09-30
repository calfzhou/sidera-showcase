"""Ordinary Markdown: one live specimen, native body/anchor/resource/option contracts."""
from pathlib import Path
from urllib.parse import unquote
import hashlib, json, os, re, sys
sys.dont_write_bytecode=True
from check_p1b import copy_showcase, build, local_links, html
from check_p2f import nodes
from check_p2w import write

ROUTE='/handbook/reference/markdown/'

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 # F1's normal showcase deliberately has no final contact text and enables comments.
 # This isolated body test explicitly exercises the optional end slot, without live Giscus.
 config=source/'hugo.toml'
 config.write_text(config.read_text().replace('comments = true','comments = false')+"\n[cascade.params]\narticle_end_text='A test-only final note.'\n")
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
  assert [n.attrs['src'] for n in images]==[prefix+route+'sample.svg']*3
  assert any(n.attrs.get('width')=='120' and n.attrs.get('height')=='60' for n in images)
  assert (html(out,route).parent/'sample.svg').read_bytes()==(specimen/'sample.svg').read_bytes()
  ids=[n.attrs['id'] for n in d.all() if n.attrs.get('id')];assert len(ids)==len(set(ids))
  for a in d.all():
   if a.tag=='a' and a.attrs.get('href','').startswith('#'):assert unquote(a.attrs['href'][1:]) in ids
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
def metadata():
 """Story/AI follow-up only; outputs stay in the supplied isolated run directory."""
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 write(source,'metadata.toml',"[params]\ncomments=false\n")
 def check(label,extra='',diagnostic=None):
  write(source,'metadata-extra.toml',extra)
  return build(source,run,label,diagnostic,('--config','hugo.toml,metadata.toml,metadata-extra.toml','--printI18nWarnings'))
 # Native cascade sets type independently of preset/list mode; local type and empty
 # disclosure override it. The same ordinary Markdown tests rich-body inheritance.
 write(source,'content/metadata/_index.md',"---\ntitle: Story context\ncascade:\n  type: story\n  params:\n    ai_label: reviewed\n---\n")
 body=(source/'content/handbook/reference/markdown/index.md').read_text().split('---',2)[2]
 for slug,fields in [('story',''),('plain','type: tech\nparams:\n  ai_label: \"\"\n'),('manual','params:\n  ai_label: manual\n')]:
  write(source,f'content/metadata/{slug}/index.md','---\ntitle: Metadata '+slug+'\n'+fields+'---\n'+body)
  (source/f'content/metadata/{slug}/sample.svg').write_bytes((source/'content/handbook/reference/markdown/sample.svg').read_bytes())
 write(source,'content/metadata/nested/_index.md','---\ntitle: Nested reset\ncascade:\n  type: tech\n  params:\n    ai_label: \"\"\n---\n')
 write(source,'content/metadata/nested/leaf.md','---\ntitle: Nested leaf\n---\nNo disclosure.\n')
 # One custom preset's two targets verify normal presentation fallback (not native type).
 write(source,'content/preset/disclosure/_index.md','---\ntitle: Disclosure defaults\nparams:\n  defaults:\n    params:\n      list_mode: children\n      ai_label: manual\n    cascade:\n      params:\n        ai_label: generated\n---\n')
 write(source,'content/disclosure/_index.md','---\ntitle: Disclosure section\npreset: disclosure\n---\nA section body.\n')
 write(source,'content/disclosure/child.md','---\ntitle: Disclosure child\n---\nA child body.\n')
 def article(out,route):return nodes(out,route).all(**{'data-renderer':'shared-article'})[0]
 def label(out,route):return [n.words() for n in nodes(out,route).all(**{'class':'ai-label'})]
 for name,config,labels in [('baseline','',['Written entirely by a human','AI-reviewed','AI-polished','AI-generated']),('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n",['本文完全由人类完成','已 AI 审核','已 AI 润色','由 AI 生成'])]:
  out=check(name,config)
  for route in ['/journal/2026/04/12/a-walk-without-a-checklist/','/handbook/workflows/writing/','/handbook/workflows/writing/outline/','/metadata/story/']:
   assert 'data-story' in article(out,route).attrs,route
  for route in [ROUTE,'/journal/2026/04/10/beginning/','/metadata/plain/','/metadata/nested/leaf/']:
   assert 'data-story' not in article(out,route).attrs,route
  for route in ['/journal/','/notes/','/metadata/']:
   assert not nodes(out,route).all(**{'class':'ai-label'})
  # Exact geometry of the four Stellar 1.44.0 Solar shields (canonical path attrs).
  icon_hashes = {'manual': '228678c588d52dc57f8c284a520212fe979f054f9cc22085f00e0c3658019822', 'reviewed': '1a9bf6b648a20edf689720565371de300514a619f1beea88d8ee79c58b9778a6', 'polished': '6c41115c1dba4c493480ae93ed838666db477e9aa1d9ad887b0c51ae7bf21170', 'generated': '544c50c614edde3e92e3410a18294c1cf99f39eb33ecc470a5815eba477063d3'}
  for key,route in [('manual','/metadata/manual/'),('reviewed','/metadata/story/'),('polished','/journal/2026/04/12/a-walk-without-a-checklist/'),('generated','/journal/2026/04/10/beginning/')]:
   badge=nodes(out,route).all(**{'data-ai-label':key})[0]
   icons=[x for x in badge.all() if x.tag=='svg'];assert len(icons)==1
   assert icons[0].attrs=={'class':'icon','viewbox':'0 0 24 24','aria-hidden':'true','focusable':'false'}
   paths=[x.attrs for x in icons[0].all() if x.tag=='path']
   assert hashlib.sha256(json.dumps(paths,sort_keys=True,separators=(',',':')).encode()).hexdigest()==icon_hashes[key]
  assert label(out,'/metadata/manual/')==labels[:1]
  assert label(out,'/metadata/story/')==labels[1:2]
  assert label(out,'/journal/2026/04/12/a-walk-without-a-checklist/')==labels[2:3]
  assert label(out,'/journal/2026/04/10/beginning/')==labels[3:4]
  assert label(out,'/disclosure/')==labels[:1]
  assert label(out,'/disclosure/child/')==labels[3:4]
  for route in ['/metadata/plain/','/metadata/nested/leaf/',ROUTE]:assert not label(out,route)
  story=article(out,'/metadata/story/');plain=article(out,'/metadata/plain/')
  assert story.attrs['data-collection']==('/_chinese' if name=='chinese' else '')+'/metadata/'
  assert [x.attrs['id'] for x in story.all() if x.tag.startswith('h') and 'id' in x.attrs]==[x.attrs['id'] for x in plain.all() if x.tag.startswith('h') and 'id' in x.attrs]
  assert story.all(id='code-and-data') and story.all(id='fn:1')
  prefix='/_chinese/' if name=='chinese' else '/'
  home=html(out,'/').read_text();uri=re.search(r'data-index="([^"]+)"',home)[1]
  payload=(out/uri.removeprefix(prefix)).read_text()
  assert all(text not in payload for text in labels)
  assert nodes(out,'/handbook/workflows/writing/outline/').all(href=prefix+'handbook/workflows/writing/')
 out=check('icons-off',"[cascade.params]\nicons=false\n")
 badge=nodes(out,'/metadata/story/').all(**{'class':'ai-label'})[0]
 assert badge.words()=='AI-reviewed' and not any(x.tag=='svg' for x in badge.all())
 # No dates/authors needed; site/language fallback and explicit local clears remain meaningful.
 out=check('site-default',"[params]\nai_label='polished'\n")
 assert label(out,'/about/')==['AI-polished'] and not label(out,'/metadata/plain/')
 assert label(out,'/metadata/story/')==['AI-reviewed']
 for key,front,diagnostic in [
  ('invalid',"params:\n  ai_label: invented\n",'ai_label must be'),
  ('bool',"params:\n  ai_label: false\n",'ai_label must be'),
  ('wrong-level',"ai_label: generated\n",'ai_label belongs under params'),
  ('draft',"draft: true\nparams:\n  ai_label: '<script>'\n",'ai_label must be'),
  ('cascade',"cascade:\n  params:\n    ai_label: [generated]\n",'ai_label must be')]:
  write(source,'content/metadata/invalid.md','---\ntitle: Invalid disclosure\n'+front+'---\n')
  check(key,diagnostic=diagnostic)
 # Replace the owned invalid probe with valid metadata; no unrelated source deletion.
 write(source,'content/metadata/invalid.md','---\ntitle: Valid disclosure\n---\n')
 check('invalid-site',"[params]\nai_label='unknown'\n",'ai_label must be')
 write(source,'content/preset/disclosure/_index.md','---\ntitle: Invalid preset\nparams:\n  defaults:\n    params:\n      ai_label: false\n---\n')
 check('invalid-preset',diagnostic='ai_label must be')
 print('PASS story/AI: 4 builds / 7 expected rejections; exact shield paths and icon opt-out; native type/cascade/local reset, all labels EN/ZH, presets/site/default/empty/drafts, body index and native IDs/routes preserved; retained',run)

if __name__=='__main__':
 if '--metadata' in sys.argv:metadata()
 else:main()
