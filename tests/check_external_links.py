"""External suffix inputs; native link rendering, URL/resource safety and i18n remain intact."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_p1b import build,copy_showcase,local_links
from check_p2f import nodes
from check_p2w import write

FIXTURE='''---
title: Link destinations
---
## Text links

[External documentation](https://external.example/reference?q=1&x=2#part "Original title") and [Internal handbook](/handbook/).

[Relative](../handbook/) · [Fragment](#text-links) · [Protocol relative](//external.example/guide/) · [Mail](mailto:reader@example.org) · [Phone](tel:+123456789)

[Uppercase](HTTPS://EXTERNAL.EXAMPLE:443/guide/) · [Formatted **external**](https://external.example/formatted/) · [Anchor](#text-links)

[![Image-only external](sample.svg)](https://external.example/image/) · [A labelled ![image](sample.svg) link](https://external.example/image-text/)

A wrapping [link with several words and a final label](https://external.example/wrap/) must keep its marker attached.

[Unsafe](javascript:alert%281%29)
'''

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live')
 # F1 viewport loading is verified separately with provider mocks.
 config=source/'hugo.toml';config.write_text(config.read_text().replace('comments = true','comments = false'))
 port=os.environ.get('SIDERA_HTTP_PORT','14462')
 write(source,'content/link-check/index.md',FIXTURE+f'\n[Same-origin absolute](http://127.0.0.1:{port}/handbook/) · [Different port](http://127.0.0.1:{int(port)+20}/handbook/)\n')
 (source/'content/link-check/sample.svg').write_bytes((source/'content/handbook/reference/markdown/sample.svg').read_bytes())
 write(source,'links.toml','[params]\nfooter_text="[Footer external](https://external.example/footer/)"\n')
 for label,configs,prefix in [('baseline','hugo.toml,links.toml',''),('chinese','hugo.toml,links.toml,examples/chinese.toml','/_chinese')]:
  out=build(source,run,label,flags=('--config',configs,'--baseURL','https://example.org'+prefix+'/','--printI18nWarnings'))
  d=nodes(out,'/link-check/');body=d.all(**{'class':'prose'})[0]
  assert body.attrs['data-external-link-label']==('(external link)' if not prefix else '（外部链接）')
  assert not d.all(**{'class':'external-link-marker'}), 'Progressive decoration, not a second link renderer'
  assert body.all(href='https://external.example/reference?q=1&x=2#part')[0].attrs['title']=='Original title'
  assert body.all(href='../handbook/') and body.all(href='#text-links')
  assert not any(n.attrs.get('target') or n.attrs.get('href','').startswith('javascript:') for n in body.all())
  assert not any('data-external-link-label' in n.attrs for n in d.all(**{'class':'site-footer'})[0].all())
  assert (out/'link-check/sample.svg').read_bytes()==(source/'content/link-check/sample.svg').read_bytes()
 # Native site translation overrides are serialized safely, never evaluated as HTML.
 write(source,'i18n/en.toml',(source/'i18n/en.toml').read_text()+'\n[external_link_suffix]\nother = "<img src=x onerror=alert(1)> & external"\n' if (source/'i18n/en.toml').exists() else '[external_link_suffix]\nother = "<img src=x onerror=alert(1)> & external"\n')
 out=build(source,run,'override',flags=('--printI18nWarnings',))
 body=nodes(out,'/link-check/').all(**{'class':'prose'})[0]
 assert body.attrs['data-external-link-label']=='<img src=x onerror=alert(1)> & external'
 assert not body.all(src='x')
 print('PASS three external-link input/translation builds; native destinations/escaping/resources retained',run)
if __name__=='__main__':main()
