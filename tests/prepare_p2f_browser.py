"""Fresh same-theme visual/configuration matrix, for check_p2f_browser.mjs."""
from pathlib import Path
import os, sys, json, shutil
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import build, copy_site
from check_p2w import write,replace
from check_p2c import configure
from prepare_scoped_example import apply as apply_scoped

def prepare(run):
    run.mkdir(parents=True,exist_ok=False)
    source=copy_site(run,'visual')
    body=(ROOT/'tests/fixtures/visual/shell-reading.md').read_text()
    titles=['Designing a calm writing environment','Choosing names that remain meaningful','A repeatable process for publishing Markdown','Making room for unfinished ideas','Reading source code without losing context','What changes when a note becomes a reference','A practical guide to working with local files','Keeping a small archive useful over time']
    for owner in ['field-notes','journal']:
        replace(source,'content/'+owner+'/_index.md','page_size = 2','page_size = 8')
        for i,title in enumerate(titles):
            write(source,f'content/{owner}/shell-{i+1}/index.md',f'+++\ntitle={json.dumps(title)}\ndate="2024-04-{8-i:02d}"\nlastmod="2024-04-{8-i:02d}"\ntags=["practice/writing", "systems/tools"]\n+++\n\n'+body)
    # Baseline remains the actual defaults; the longer synthetic articles supply comparison density.
    build(source,run,'baseline')
    for variant,configs in [('full',['full-shell']),('two',['full-shell','two-regions']),('compact',['compact']),('empty',['empty-regions']),('scoped',['full-shell','scoped'])]:
        for name in configs: write(source,name+'.toml',(ROOT/'examples'/f'{name}.toml').read_text())
        variant_source=source
        if variant=='scoped':
            variant_source=run/'scoped-source';shutil.copytree(source,variant_source)
            apply_scoped(variant_source)
            configs=['full-shell']
        build(variant_source,run,variant,flags=('--config',','.join(['hugo.toml']+[c+'.toml' for c in configs]),'--baseURL',f'https://example.org/_{variant}/'))
    flags=configure(source,'chinese')
    build(source,run,'chinese-preview',flags=flags+('--baseURL','https://example.org/_chinese/'))
    (run/'build-results.json').write_text(json.dumps({'strict_builds':7,'synthetic_density_articles':16,'theme_edits_between_variants':False},indent=2))
if __name__=='__main__': prepare(Path(os.environ['SIDERA_CHECK_DIR']).resolve())
