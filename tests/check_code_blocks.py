"""Native code options stay intact; toolbar is localized, progressive and outside scrolling."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build
from check_shell import nodes
from check_docs import write

CODE='''---
title: Code block controls
---
## Samples

```python {#numbered linenos=table linenostart=8 hl_lines=[2] anchorlinenos=true lineanchors="table"}
# Keep the numbers out of the clipboard.
value = "<&> 你好"
print(value)
```

```javascript {linenos=inline linenostart=20 hl_lines=[2] anchorlinenos=true lineanchors="inline"}
const text = "<script>not executable</script>";
\tconsole.log(text);
```

```
plain <&> text
\twith a tab
```

```unknown-language
unrecognized syntax stays copyable
```

```text
```

```python {hl_inline=true}
inline_option = 1
```
'''

def main():
 run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
 source=copy_showcase(run,'live');write(source,'content/code-check.md',CODE)
 for name,configs,prefix in [('baseline','hugo.toml',''),('chinese','hugo.toml,examples/chinese.toml','/_chinese')]:
  out=build(source,run,name,flags=('--config',configs,'--baseURL','https://example.org'+prefix+'/','--printI18nWarnings'))
  d=nodes(out,'/code-check/');body=d.all(**{'class':'prose'})[0];blocks=body.all(**{'class':'code-block'})
  assert len(blocks)==5, len(blocks) # hl_inline preserves the native inline output without a toolbar.
  assert [b.all(**{'class':'code-language'})[0].words() for b in blocks]==['python','javascript','Text' if not prefix else '纯文本','unknown-language','text']
  for b in blocks:
   button=b.all(**{'class':'code-copy'})[0];assert button.tag=='button' and button.attrs['type']=='button' and 'hidden' in button.attrs
   assert button.words()==('Copy' if not prefix else '复制')
   fallback=b.all(**{'class':'code-copy-fallback'})[0];assert 'hidden' in fallback.attrs and 'readonly' in fallback.attrs and fallback.attrs['aria-label']
   assert not any(n.tag=='script' for n in b.all())
  assert body.all(id='numbered') and body.all(id='table-8') and body.all(id='inline-20')
  assert len(body.all(**{'class':'line hl'}))==2
  assert not body.all(**{'class':'highlight'})[0].all(**{'class':'code-toolbar'})
  assert '<script>not executable</script>' in body.words()
 # Site-level inline output is native too; do not turn it back into a block.
 write(source,'inline.toml','[markup.highlight]\nhl_inline=true\n')
 out=build(source,run,'inline',flags=('--config','hugo.toml,inline.toml','--printI18nWarnings'))
 assert [b.all(**{'class':'code-language'})[0].words() for b in nodes(out,'/code-check/').all(**{'class':'code-block'})]==['python'] # Native table line numbers still emit a block.
 # Site overrides remain native escaped text, including labels passed to the clipboard handler.
 write(source,'i18n/en.toml',(source/'i18n/en.toml').read_text()+'\n[code_copy_success]\nother = "<img src=x onerror=alert(1)> & copied"\n' if (source/'i18n/en.toml').exists() else '[code_copy_success]\nother = "<img src=x onerror=alert(1)> & copied"\n')
 out=build(source,run,'override',flags=('--printI18nWarnings',));d=nodes(out,'/code-check/')
 assert d.all(**{'class':'code-copy'})[0].attrs['data-success']=='<img src=x onerror=alert(1)> & copied'
 assert not d.all(src='x')
 print('PASS code toolbar/native options/IDs/escaping/EN/ZH/site override; retained',run)
if __name__=='__main__':main()
