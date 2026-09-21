"""Prepare an isolated, inspectable owner/page front-matter example, never edit the site.
Usage: python3 tests/prepare_scoped_example.py /absolute/new/output-folder
Then: hugo server --source <output>/example-source --config hugo.toml,full-shell.toml
"""
from pathlib import Path
import sys
sys.dont_write_bytecode = True
from check_p1a import ROOT
from check_p1b import copy_site

def apply(source):
    values = {
        'field-notes/_index.md': "left=['menu','taxonomies']\nright=['recent','profile']\nrecent_count=2\nprofile={title='Field notebook', text='A collection-local profile, replacing the site profile completely.'}\n",
        'field-notes/alpha/index.md': "left=['taxonomies']\nright=['text']\ntext='This page replaces the collection’s right region.'\n",
    }
    for name, settings in values.items():
        p=source/'content'/name
        text=p.read_text(); assert '[params.sidera]' in text
        p.write_text(text.replace('[params.sidera]\n','[params.sidera]\n'+settings,1))
    p=source/'content/about.md'
    p.write_text(p.read_text().replace("title = 'About this proof'", "title = 'About this proof'\n[params.sidera]\nleft=false\nright=[]",1))

if __name__=='__main__':
    run=Path(sys.argv[1]).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_site(run,'example');apply(source)
    (source/'full-shell.toml').write_text((ROOT/'examples/full-shell.toml').read_text())
    print(source)
