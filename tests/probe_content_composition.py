"""Native lifecycle control behind C2's approved convention; no live theme edits.
This small raw-node experiment is not the production bridge implementation.
"""
from pathlib import Path
import json, os, subprocess, sys, tempfile
sys.dont_write_bytecode=True
from check_p1a import ROOT

def main():
    run=Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='composition-',dir=ROOT/'.checks')).resolve();run.mkdir(parents=True,exist_ok=True)
    source=run/'source';sc=source/'layouts/_shortcodes';sc.mkdir(parents=True);(source/'content').mkdir()
    (source/'hugo.toml').write_text('baseURL="https://example.org/"\ndisableKinds=["home","taxonomy","term","rss","sitemap"]\n[markup.goldmark.parser.attribute]\nblock=true\n[markup.tableOfContents]\nstartLevel=1\nendLevel=6\n')
    (source/'layouts/page.html').write_text('{{ .TableOfContents }}\n{{ .Content }}')
    marker='{{- $body := printf "\\n\\n> %s\\n{.probe}\\n\\n" (replace (strings.TrimSpace .Inner) "\\n" "\\n> ") -}}'
    (sc/'frame.md').write_text('{{ $_hugo_config := `{ "version": 2 }` }}'+marker+'{{ $body }}')
    (sc/'slot.md').write_text('{{ $_hugo_config := `{ "version": 2 }` }}'+marker+'{{ $body }}')
    # Deliberately output native Markdown, not HTML, from the standard child.
    # It is allowed only inside the Markdown root. The final safe Markdown pass
    # still rejects raw HTML written by the author. No raw-source regex parser.
    (sc/'slot.html').write_text('{{ if not .Parent }}{{ errorf "slot requires frame parent" }}{{ end }}'+marker+'{{ $body | safeHTML }}')
    (sc/'leaf.html').write_text('<div class="html-leaf">Generated HTML leaf</div>')
    cases={
      'nested-percent':('{{% frame %}}\n## Outer\n{{% slot %}}\n### Nested\n**Native text**\n{{% /slot %}}\n{{% /frame %}}',False),
      'mixed-native-nodes':('{{% frame %}}\n## Outer\n{{< slot >}}\n### Nested\n**Native text**\n{{< slot >}}\n#### Third\n[Native link](/target/)\n{{< /slot >}}\n{{< /slot >}}\n{{% /frame %}}',True),
      'mixed-raw-html':('{{% frame %}}\n{{< slot >}}\n<script>bad()</script>\n{{< /slot >}}\n{{% /frame %}}',False),
      'mixed-html-leaf':('{{% frame %}}\n{{< slot >}}\n### Nested\n{{< leaf >}}\n{{< /slot >}}\n{{% /frame %}}',False),
    }
    results={}
    for name,(body,success) in cases.items():
      (source/'content/probe.md').write_text('---\ntitle: Native lifecycle probe\n---\n'+body+'\n')
      (run/f'{name}.md').write_text(body+'\n')
      out=run/name
      proc=subprocess.run(['hugo','--source',str(source),'--destination',str(out),'--cacheDir',str(run/'cache'),'--panicOnWarning'],text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=20)
      (run/f'{name}.log').write_text(proc.stdout)
      assert (proc.returncode==0)==success,(name,proc.stdout)
      if success:
        html=(out/'probe/index.html').read_text()
        assert all(f'href="#{id}"' in html and f'id="{id}"' in html for id in ['outer','nested','third'])
        assert '<strong>Native text</strong>' in html and '<a href="/target/">Native link</a>' in html
        assert html.count('<blockquote class="probe">')==3
      else: assert 'Raw HTML omitted' in proc.stdout,(name,proc.stdout)
      results[name]='one safe native Markdown pass + all headings in TOC' if success else 'strict raw-HTML rejection (expected native limitation)'
      print('PASS evidence:',name,results[name])
    (run/'results.json').write_text(json.dumps(results,indent=2));print('Retained native composition decision evidence:',run)
if __name__=='__main__': main()
