"""Giscus config/placement/mapping; synthetic IDs exist ONLY in isolated tests."""
from pathlib import Path
import os,sys,re,json,base64
sys.dont_write_bytecode=True
from check_tag_routes import translate_menu_targets, copy_showcase,build,html
from check_shell import nodes
from check_docs import write
ROUTE='/journal/2026/04/14/connect-the-useful-parts/'
MOCK="""[params.giscus]
repo='fixture/comments'
repo_id='R_mock'
category='Announcements'
category_id='DIC_mock'
strict=true
"""
def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live');builds=0;rejections=0
 def check(name,config='',diagnostic=None):
  nonlocal builds,rejections
  write(source,'comments-test.toml',config)
  out=build(source,run,name,diagnostic,('--config','hugo.toml,comments-test.toml','--printI18nWarnings'))
  if diagnostic:rejections+=1
  else:builds+=1
  return out
 out=check('unconfigured',"[params.giscus]\ncategory=''\ncategory_id=''\n")
 for route in [ROUTE,'/notes/reading-list/','/handbook/','/notes/package-management/','/about/']:
  text=html(out,route).read_text();assert 'not configured' in text and 'js/giscus.' not in text and 'https://giscus.app' not in text
 out=check('baseline',MOCK)
 def host(out,route):return [n for n in nodes(out,route).all() if 'data-sidera-giscus' in n.attrs]
 for route in [ROUTE,'/notes/reading-list/','/handbook/','/notes/package-management/','/about/']:
  d=nodes(out,route);h=host(out,route);assert len(h)==1,route
  assert h[0].attrs['data-term']==route[1:]
  assert h[0].attrs['data-lang']=='en'
  for palette in ['light','dark']:
   uri=h[0].attrs['data-theme-'+palette];assert uri.startswith('data:text/css;base64,')
   css=base64.b64decode(uri.split(',',1)[1]).decode()
   assert f'https://giscus.app/themes/{palette}.css' in css
   assert 'lxgw wenkai' in css.lower() and '--color-fg-default:' in css
   assert not any(x in css for x in ['@font-face','javascript:','<script','fixture/comments'])
   assert len(uri)<2048 # Keep provider query payload modest, not a CSS framework.

  main=d.all(id='main')[0];comments=d.all(id='sidera-comments')[0]
  assert main.children[-1] is comments and not d.all(**{'class':'article-end'})
  assert comments.attrs['aria-label']=='Comments' and not [n for n in comments.all() if n.tag in ('h1','h2','h3')]
  assert d.all(href='#sidera-comments')
  assert not comments.all(**{'class':'comments-load'})
  assert not comments.all(href='https://github.com/fixture/comments/discussions')
  assert 'Have a different approach?' not in main.words()
  for element in d.all(**{'class':'page-navigation'})+d.all(id='doc-children'):
   # Navigation / docs children stay before the final comment block.
   assert html(out,route).read_text().index(str(element.attrs.get('id') or 'page-navigation')) < html(out,route).read_text().index('id="sidera-comments"')
  assert len(re.findall(r'src="[^"]*/js/giscus\.',html(out,route).read_text()))==1
  assert not any('data-sidera-giscus' in n.attrs for n in d.all(**{'class':'prose'})[0].all())
 for route in ['/','/journal/','/notes/','/notes/page/2/','/journal/archives/','/journal/tags/','/tags/','/preset/docs/']:
  assert not host(out,route) and not nodes(out,route).all(href='#sidera-comments'),route
 # Comment chrome cannot contaminate generated content, reference edges or snippets.
 index=re.search(r'data-index="([^"]+)"',html(out,'/').read_text())[1]
 data=json.loads((out/index.lstrip('/')).read_text())
 assert not any('giscus.app/client.js' in json.dumps(d['sections']) or 'R_mock' in json.dumps(d) for d in data['documents'])
 out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n"+MOCK)
 h=host(out,ROUTE)[0];assert h.attrs['data-lang']=='zh-CN' and h.attrs['data-term']=='_chinese'+ROUTE
 assert '评论' in html(out,ROUTE).read_text()
 # Native override, with no preset gate, and per-page opt-out above cascade/site.
 p=source/'content/about.md';s=p.read_text();p.write_text(s.replace('\n---', '\nparams:\n  comments: false\n---',1) if '\nparams:\n' not in s else s.replace('\nparams:\n','\nparams:\n  comments: false\n',1))
 p=source/'content/handbook/_index.md';s=p.read_text();p.write_text(s.replace('  children:\n','  children:\n    page_size: 1\n'))
 write(source,'content/nohead.md','---\ntitle: No body headings\nparams:\n  comments: true\n---\nA plain body without a heading.\n')
 out=check('site-enabled','[params]\ncomments=true\n'+MOCK)
 assert host(out,'/notes/package-management/') and not host(out,'/about/')
 assert not host(out,'/handbook/page/2/') and not nodes(out,'/handbook/page/2/').all(href='#sidera-comments')
 assert nodes(out,'/nohead/').all(href='#main') and nodes(out,'/nohead/').all(href='#sidera-comments')
 assert not host(out,'/journal/')
 out=check('disabled','[params]\ncomments=false\n[cascade.params]\ncomments=false\n'+MOCK)
 # Site/cascade false removes the normal pages; an explicit page true still wins.
 assert not host(out,'/notes/package-management/') and not host(out,ROUTE) and host(out,'/nohead/')
 assert not nodes(out,ROUTE).all(href='#sidera-comments')
 # Repeated TOCs share one real target; presentation overrides preserve opt-outs.
 out=check('repeated-toc',MOCK+"[cascade.params]\nright=['toc','toc']\nicons=false\n")
 d=nodes(out,ROUTE);links=d.all(href='#sidera-comments');assert len(links)==2
 assert all(not [n for n in x.all() if n.tag=='svg'] for x in links)
 assert len(d.all(id='sidera-comments'))==1 and len(host(out,ROUTE))==1
 assert d.all(id='toc-heading-right') and d.all(id='toc-heading-right-2')
 # Actual filename language variant and subpath identity, not runtime location.
 write(source,'content/locale-probe.md','---\ntitle: Language probe\nparams:\n  comments: true\n---\nEnglish body.\n')
 write(source,'content/locale-probe.zh.md','---\ntitle: Language probe\nparams:\n  comments: true\n---\nChinese body.\n')
 write(source,'content/about.zh.md',(source/'content/about.md').read_text())
 translate_menu_targets(source)
 out=check('bilingual',"baseURL='https://example.org/preview/'\n[languages.en]\nweight=1\nlocale='en-US'\n[languages.zh]\nweight=2\nlocale='zh-CN'\n"+MOCK)
 assert host(out,'/locale-probe/')[0].attrs['data-term']=='preview/locale-probe/'
 assert host(out,'/zh/locale-probe/')[0].attrs['data-term']=='preview/zh/locale-probe/'
 assert host(out,'/zh/locale-probe/')[0].attrs['data-lang']=='zh-CN'
 # Escaped provider display names remain inert strings.
 out=check('escaped',MOCK.replace("category='Announcements'", "category='A <img src=x onerror=alert(1)>'"))
 assert not [n for n in host(out,ROUTE)[0].all() if n.tag=='img']
 assert host(out,ROUTE)[0].attrs['data-category']=='A <img src=x onerror=alert(1)>'
 # Custom preset selects comments for standalone native members.
 write(source,'content/preset/quiet/_index.md','---\ntitle: Quiet\nparams:\n  defaults:\n    params:\n      list_mode: children\n      comments: true\n    cascade:\n      params:\n        comments: true\n---\n')
 write(source,'content/manual/_index.md','---\ntitle: Manual\npreset: quiet\n---\nManual body.\n')
 write(source,'content/manual/topic.md','---\ntitle: Topic\nurl: /stable/topic.html\n---\nTopic body.\n')
 out=check('preset',MOCK)
 assert host(out,'/manual/')
 text=(out/'stable/topic.html').read_text();assert 'data-term="stable/topic"' in text
 # Safe native override: a site provider partial, not an executable config path.
 write(source,'layouts/_partials/comments/providers/local.html','<aside data-local-comments>{{ .Page.Title }}</aside>')
 out=check('override',"[params]\ncomment_provider='local'\n")
 assert 'data-local-comments' in html(out,ROUTE).read_text() and 'js/giscus.' not in html(out,ROUTE).read_text()
 for name,cfg,diagnostic in [
  ('bool','[params]\ncomments="yes"\n','comments must be boolean'),
  ('provider','[params]\ncomment_provider="../../bad"\n','lowercase provider name'),
  ('missing-provider','[params]\ncomment_provider="missing"\n','no native provider partial'),
  ('unknown',MOCK+'src="https://evil.invalid/x.js"\n','unknown giscus option'),
  ('url',MOCK.replace('fixture/comments','javascript:evil'),'owner/repository'),
  ('dot-repo',MOCK.replace('fixture/comments','fixture/..'),'owner/repository'),
  ('type',MOCK.replace("repo_id='R_mock'",'repo_id=7'),'must be a string'),
  ('id',MOCK.replace('DIC_mock','bad/name'),'node ID'),
  ('position',MOCK+'input_position="side"\n','top or bottom'),
  ('strict',MOCK.replace('strict=true','strict="1"'),'must be boolean'),
  ('cascade','[cascade.params]\ncomment_provider="giscus"\n','site/language params')]:check(name,cfg,diagnostic)
 write(source,'content/bad-draft.md','---\ntitle: Bad\ndraft: true\nparams:\n  comments: yes\n---\n')
 check('bad-draft',MOCK,'comments must be boolean')
 print(f'PASS comments: {builds} builds / {rejections} expected rejections; {run}')
if __name__=='__main__':main()
