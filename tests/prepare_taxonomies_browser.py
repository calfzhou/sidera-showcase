"""Isolated native taxonomy browser matrix; no new content in the live showcase."""
from pathlib import Path
import os,sys,json
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_site,build
from check_p2w import write
from check_p2c import configure

def prepare(run):
    run.mkdir(parents=True,exist_ok=False)
    s=copy_site(run,'source')
    cfg=s/'hugo.toml';cfg.write_text(cfg.read_text()+"\n[params.sidera]\ntaxonomy_page_size=2\n")
    write(s,'content/categories/empty/_index.md','+++\ntitle="Empty category"\nslug="empty"\n+++\nAn authored empty term.')
    build(s,run,'baseline',flags=('--printI18nWarnings',))
    build(s,run,'subpath',flags=('--baseURL','https://example.org/preview/','--printI18nWarnings'))
    flags=configure(s,'chinese')
    build(s,run,'chinese-preview',flags=flags+('--baseURL','https://example.org/_chinese/','--printI18nWarnings'))
    cfg.write_text(cfg.read_text()+"taxonomy_hierarchy=[]\n")
    build(s,run,'stress',flags=('--baseURL','https://example.org/_stress/','--printI18nWarnings'))
    (run/'build-results.json').write_text(json.dumps({'strict_builds':4,'same_theme':True},indent=2))
if __name__=='__main__':prepare(Path(os.environ['SIDERA_CHECK_DIR']).resolve())
