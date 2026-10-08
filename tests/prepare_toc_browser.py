"""Isolated native heading fixture for TOC visual/interaction checks."""
from pathlib import Path
import os,sys
sys.dont_write_bytecode=True
from check_tag_routes import copy_showcase,build
from check_docs import write

def prepare(run):
    run.mkdir(parents=True,exist_ok=False);source=copy_showcase(run,'live')
    headings=[(1,'Tool notes'),(2,'uv'),(3,'Installation'),(4,'Installing Python'),(5,'Selecting an interpreter'),(6,'Confirming the environment'),(3,'Running scripts'),(3,'Using tools'),(3,'Working on projects'),(2,'Python version management across several projects'),(3,'Installation checklist'),(3,'Usage'),(3,'Plugins'),(2,'Virtual environments and reproducible local development'),(3,'Automatically activate or deactivate virtual environments'),(2,'Package management'),(3,'Adding dependencies'),(3,'Keeping a lockfile'),(2,'Review and cleanup')]
    text='---\ntitle: Working with Python tools\nparams:\n  right: [toc]\n---\n'
    for depth,title in headings:text+='\n'+'#'*depth+' '+title+'\n\n'+('A small, explicit setup is easier to revisit. Keep the environment local, record what changed, and verify the result before moving on.\n\n'*4)
    write(source,'content/notes/toc-sample/index.md',text)
    build(source,run,'baseline',flags=('--config','hugo.toml','--printI18nWarnings'))
    write(source,'chinese.toml',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    build(source,run,'chinese',flags=('--config','hugo.toml,chinese.toml','--printI18nWarnings'))
    write(source,'content/notes/toc-sample/index.md',text.replace('right: [toc]','right: [toc, {component: toc, config: {icons: false}}]'))
    build(source,run,'repeated',flags=('--config','hugo.toml','--printI18nWarnings'))
    print(run)
if __name__=='__main__':prepare(Path(os.environ['SIDERA_CHECK_DIR']).resolve())
