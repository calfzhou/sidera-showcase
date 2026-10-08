"""Prepare root/tree browser checks with one live site and explicit organization test input."""
from pathlib import Path
import os, sys
sys.dont_write_bytecode=True
from check_organization import ROOT
from check_tag_routes import copy_showcase, copy_site, build

def prepare(run):
    run.mkdir(parents=True,exist_ok=False)
    live=copy_showcase(run,'live')
    build(live,run,'baseline',flags=('--printI18nWarnings',))
    build(live,run,'widgets',flags=('--config','hugo.toml,examples/widgets.toml','--baseURL','https://example.org/_widgets/','--printI18nWarnings'))
    fixture=copy_site(run,'organization')
    build(fixture,run,'generic',flags=('--baseURL','https://example.org/_generic/','--printI18nWarnings'))
    print(run)
if __name__=='__main__':prepare(Path(os.environ['SIDERA_CHECK_DIR']).resolve())
