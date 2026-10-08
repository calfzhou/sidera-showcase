"""Theme-owned taxonomies/preset Pages, native site overrides and language isolation.
This tests the P2-M packaging prerequisite, not the unshipped parameter resolver.
"""
from pathlib import Path
import json
import os
import re
import sys
import tempfile

sys.dont_write_bytecode = True
from check_organization import ROOT, THEME, Page, all_articles, check_baseline
from check_tag_routes import copy_site, build, html, local_links
from check_docs import write, replace


def probe(out, route='/'):
    match = re.search(r'<script id="theme-defaults-probe" type="application/json">(.*?)</script>', html(out, route).read_text(), re.S)
    assert match, route
    return json.loads(match[1])


def add_probe(source):
    write(source, 'layouts/_partials/sidera/head-extra.html', '''{{- $presets := dict -}}
{{- range slice "blog" "notes" "docs" -}}{{- with $.Page.Site.GetPage (printf "/preset/%s" .) -}}{{- $presets = merge $presets (dict .Data.Term (dict "title" .Title "kind" .Kind "defaults" .Params.defaults)) -}}{{- end -}}{{- end -}}
<script id="theme-defaults-probe" type="application/json">{{ dict "presets" $presets | jsonify | safeJS }}</script>''')


def main():
    (ROOT/'.checks').mkdir(exist_ok=True)
    run = Path(os.environ.get('SIDERA_CHECK_DIR') or tempfile.mkdtemp(prefix='theme-defaults-', dir=ROOT/'.checks')).resolve()
    run.mkdir(parents=True, exist_ok=True)
    print('Retained run:', run, flush=True)
    passed=[]
    def check(source,label,flags=()):
        out=build(source,run,label,flags=('--printI18nWarnings',*flags))
        passed.append(label)
        local_links(out)
        return out
    # Showcase permits import, but owns neither definitions nor bundled preset content.
    config=(ROOT/'hugo.toml').read_text()
    assert re.search(r'\[taxonomies\]\s*_merge\s*=\s*\x27shallow\x27\s*(?:#.*\n\s*)?\[',config)
    assert not (ROOT/'content/preset').exists()
    source=copy_site(run,'baseline');add_probe(source)
    out=check(source,'baseline');check_baseline(out)
    initial=probe(out)['presets']
    assert set(initial)=={'blog','notes','docs'} and all(p['kind']=='term' for p in initial.values())
    assert initial['notes']['defaults']['params']['taxonomy_hierarchy']==['tags']
    assert initial['blog']['defaults']['params']['taxonomy_hierarchy']==[]
    assert initial['blog']['defaults']['params']['list_order']=='publication'
    assert initial['docs']['defaults']['params']['list_mode']=='children'
    assert initial['docs']['defaults']['cascade']['params']['list_mode']=='children'
    assert not (out/'sidera').exists() and not (out/'preset/_index.zh').exists()
    for name in ('authors','series','preset'):assert html(out,'/'+name+'/').exists()
    # Literal native associations coexist with the now-active preset resolver.
    replace(source,'content/journal/first-signal/index.md',"authors = ['demo-editor', 'demo-researcher']",'authors=["alice","bob"]')
    replace(source,'content/journal/first-signal/index.md',"series = 'model-workshop'",'series="learning-hugo"')
    out=check(source,'assignments')
    assert set(all_articles(out,'/preset/blog/'))=={'/journal/','/dispatches/'}
    for route in ('/authors/alice/','/authors/bob/','/series/learning-hugo/'):
        assert all_articles(out,route)==['/journal/2024/01/01/first-signal/']
    # A native site-authored term fully overrides a same-path theme adapter Page.
    write(source,'content/preset/blog/_index.md','''+++
title="Site blog"
slug="blog"
[params.defaults.params]
list_order="title"
+++
Site-owned term content.''')
    out=check(source,'site-term-override')
    override=probe(out)['presets']['blog']
    assert override['title']=='Site blog' and override['defaults']=={'params':{'list_order':'title'}}
    assert 'Site-owned term content.' in html(out,'/preset/blog/').read_text()
    assert set(all_articles(out,'/preset/blog/'))=={'/journal/','/dispatches/'}
    # Site taxonomy addition and fourth user preset need no theme enum change.
    replace(source,'hugo.toml',"[taxonomies]\n_merge = 'shallow'", "[taxonomies]\n_merge = 'shallow'\nsubject = 'subjects'")
    write(source,'content/preset/field-guide/_index.md','''+++
title="Field guide"
slug="field-guide"
[params.defaults.params]
list_order="title"
+++
Custom preset.''')
    replace(source,'content/dispatches/_index.md',"preset = 'blog'",'preset="field-guide"\nsubjects=["research"]')
    out=check(source,'site-extension')
    assert all_articles(out,'/preset/field-guide/')==['/dispatches/']
    assert all_articles(out,'/subjects/research/')==['/dispatches/']
    assert html(out,'/authors/alice/').exists()
    # Site permalink override also wins; definition remains in Sidera.
    replace(source,'hugo.toml',"[permalinks.term]\n_merge = 'shallow'", "[permalinks.term]\n_merge = 'shallow'\npreset = '/styles/:slug/'")
    out=check(source,'site-url-override')
    assert all_articles(out,'/styles/blog/')==['/journal/']
    assert '/styles/blog/' in html(out,'/preset/').read_text()
    # Native per-language adapter avoids unknown suffix files leaking as regular Pages.
    localized=copy_site(run,'languages');add_probe(localized)
    write(localized,'locale.toml',"defaultContentLanguage='zh'\nlocale='zh-CN'\n")
    out=check(localized,'chinese-only',('--config','hugo.toml,locale.toml'))
    check_baseline(out)
    assert probe(out)['presets']['blog']['title']=='博客'
    assert set(probe(out)['presets'])=={'blog','notes','docs'}
    write(localized,'locale.toml',"defaultContentLanguage='en'\ndefaultContentLanguageInSubdir=true\n[languages.en]\nlocale='en-US'\n[languages.zh]\nlocale='zh-CN'\n")
    write(localized,'content/preset/notes/_index.zh.md','''+++
title="本地笔记预设"
slug="notes"
[params.defaults.params]
list_order="title"
+++
站点覆盖。''')
    out=check(localized,'bilingual',('--config','hugo.toml,locale.toml'))
    assert probe(out,'/en/preset/blog/')['presets']['notes']['defaults']==initial['notes']['defaults']
    assert probe(out,'/zh/preset/blog/')['presets']['notes']['defaults']=={'params':{'list_order':'title'}}
    assert probe(out,'/zh/preset/blog/')['presets']['notes']['title']=='本地笔记预设'
    assert not (out/'en/sidera').exists() and not (out/'zh/sidera').exists()
    (run/'results.json').write_text(json.dumps({'successful_builds':len(passed),'passed':passed,'no_showcase_taxonomy_redefinition':True,'preset_resolution_implemented':True},indent=2))
    print('PASS theme defaults:',len(passed),'strict builds; native overrides/additions, fourth preset and EN/ZH isolation')


if __name__=='__main__':main()
