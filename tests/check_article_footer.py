"""Native boxed footer: Markdown, authors, opt-in URLs, share encoding and local Hugo QR."""
from pathlib import Path
from urllib.parse import urlsplit,parse_qs,unquote
import json,os,sys
sys.dont_write_bytecode=True
from check_p1a import ROOT
from check_p1b import copy_showcase,build,local_links
from check_p2f import nodes
from check_p2w import write

def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    source=copy_showcase(run,'live')
    def check(label,extra='',diagnostic=None):
        write(source,'footer.toml',extra)
        return build(source,run,label,diagnostic,('--config','hugo.toml,footer.toml','--printI18nWarnings'))
    def footer(out,route='/notes/package-management/'):
        return nodes(out,route).all(**{'class':'article-footer'})[0]
    def item(d,name):return d.all(**{'data-footer-item':name})
    baseline=check('baseline');local_links(baseline)
    f=footer(baseline);box=f.all(**{'class':'article-footer-box'})[0]
    assert [n.attrs['data-footer-item'] for n in box.children]==['references','outgoing','license','share']
    assert item(f,'outgoing')[0].all(href='/notes/python-environments/')
    assert item(f,'terms') and item(f,'terms')[0] not in box.all()
    assert 'All rights reserved unless otherwise stated.' in item(f,'license')[0].words()
    assert item(f,'references')[0].all(href='https://realpython.com/intro-to-pyenv/')
    assert not item(f,'authors')
    assert nodes(baseline,'/notes/package-management/').all(id='header-assigned-authors')[0].all(href='/authors/rowan/')
    assert not any(n.tag=='img' for n in nodes(baseline,'/notes/package-management/').all(id='header-assigned-authors')[0].all())
    assert not item(footer(baseline,'/notes/color/'),'references')
    assert not footer(baseline).all(**{'class':'footer-meta'})
    # Explicit site opt-in retains the optional footer-author/edit component.
    config=source/'hugo.toml'
    config.write_text(config.read_text().replace('[params]\n',"[params]\narticle_footer=['terms','references','license','authors','share','series','text','links']\n",1))
    # Source-local metadata, hostile title encoding, portrait and an explicit edit destination.
    title='Quoted "title" & question? #fragment 中文'
    fm='''---
title: '''+json.dumps(title,ensure_ascii=False)+'''
date: 2025-01-01
authors: [rowan]
tags: [footer-test]
params:
  references:
    - "**Reference** [site](https://example.net/ref?q=1&b=2)"
    - "An explanatory `code` note."
  license: "Custom **license** [details](https://example.net/license)."
  share: [wechat, link, email, weibo]
  edit_url: https://github.com/example/repo/edit/main/content/notes/footer-probe.md
---
## A footer example

Ordinary test content.
'''
    write(source,'content/notes/footer-probe.md',fm)
    write(source,'content/authors/rowan/_index.md','---\ntitle: Rowan\nparams:\n  avatar: images/sidera-mark.svg\n---\n')
    full=check('full');local_links(full);route='/notes/footer-probe/';d=footer(full,route)
    share=item(d,'share')[0];u='https://example.org'+route
    assert share.all(**{'data-share-url':u})
    assert d.all(href='https://github.com/example/repo/edit/main/content/notes/footer-probe.md')
    assert any(n.tag=='img' and n.attrs.get('alt')=='' for n in item(d,'authors')[0].all())
    for a in share.all():
        href=a.attrs.get('href','')
        if href.startswith(('mailto:','https://service.weibo.com/')):
            q=parse_qs(urlsplit(href).query)
            assert q.get('body',q.get('url'))==[u]
            assert q.get('subject',q.get('title'))==[title+' - Fieldbook']
    qr=next(n for n in share.all() if n.tag=='img')
    assert qr.attrs['src'].startswith('/images/qr/') and (full/qr.attrs['src'].lstrip('/')).is_file()
    assert qr.attrs['width']==qr.attrs['height'] and 'height' in qr.attrs
    (run/'qr-check.json').write_text(json.dumps({'file':str(full/qr.attrs['src'].lstrip('/')),'url':u}))
    repeated=check('repeated',"[cascade.params]\narticle_footer=['references','license','authors','share','share','authors','terms','share']\n")
    d=footer(repeated,route);ids=[n.attrs['id'] for n in nodes(repeated,route).all() if 'id' in n.attrs]
    assert len(ids)==len(set(ids));assert len(item(d,'share'))==3
    assert len(d.all(**{'class':'article-footer-box'}))==2 # Preserve configured order around terms.
    text=check('text-icons',"[cascade.params]\nicons=false\n")
    assert not any(n.tag=='svg' for n in footer(text,route).all())
    assert 'Share to WeChat' in footer(text,route).words()
    # Collection native cascade, then page-local override, with empty/false stopping fallback.
    notes=source/'content/notes/_index.md';original=notes.read_text()
    notes.write_text(original.replace('cascade:\n  params:\n','cascade:\n  params:\n    license: false\n    share: []\n'))
    out=check('collection-off');assert not item(footer(out),'license') and not item(footer(out),'share')
    assert item(footer(out,route),'license') and item(footer(out,route),'share')
    notes.write_text(original)
    out=check('no-box',"[cascade.params]\narticle_footer=['references','authors']\nshow_authors=false\nreferences=[]\n")
    assert not nodes(out,'/about/').all(**{'class':'article-footer'})
    probe=source/'content/notes/footer-probe.md'
    probe.write_text(fm.replace('  license: "Custom **license** [details](https://example.net/license)."','  license: false').replace('  share: [wechat, link, email, weibo]','  share: false').replace('  edit_url: https://github.com/example/repo/edit/main/content/notes/footer-probe.md','  show_authors: false'))
    out=check('page-off');d=footer(out,route)
    assert not item(d,'license') and not item(d,'share') and not item(d,'authors')
    assert item(d,'references')
    probe.write_text(fm)
    # Safe inherited disable for pages with no explicit share override: no QR assets at all.
    out=check('no-qr',"[cascade.params]\narticle_footer=['license']\n")
    assert not (out/'images/qr').exists()
    out=check('chinese',"defaultContentLanguage='zh'\nlocale='zh-CN'\nbaseURL='https://example.org/_chinese/'\n")
    assert '参考资料' in footer(out,route).words() and '许可协议' in footer(out,route).words()
    assert footer(out,route).all(**{'data-share-url':'https://example.org/_chinese'+route})
    local_links(out,'/_chinese')
    out=check('subpath',"baseURL='https://example.org/preview/'\n");local_links(out,'/preview')
    assert footer(out,route).all(**{'data-share-url':'https://example.org/preview'+route})
    # Inline instances and named widgets use the same validated shallow options.
    out=check('widgets',"[params.widgets.footer-note]\ncomponent='license'\n[params.widgets.footer-note.config]\ntext='**Widget license**'\n[cascade.params]\narticle_footer=['footer-note',{component='share',config={targets=['email'],icons=false}},{component='references',config={entries=['Inline reference']}},{component='authors',config={edit_url='/about/'}}]\n")
    d=footer(out,route);assert 'Widget license' in d.words() and 'Inline reference' in d.words()
    assert not any(n.tag=='img' for n in item(d,'share')[0].all())
    for label,extra,diagnostic in [
      ('references-type','[params]\nreferences="bad"','references must be an array'),
      ('reference-entry','[params]\nreferences=[1]','references entries'),
      ('license-type','[params]\nlicense=[]','license must be'),
      ('share-type','[params]\nshare=true','share must be'),
      ('share-unknown',"[params]\nshare=['unknown']",'invalid/duplicate share'),
      ('share-duplicate',"[params]\nshare=['link','link']",'invalid/duplicate share'),
      ('edit-unsafe',"[params]\nedit_url='javascript:alert(1)'",'unsafe URL'),
      ('instance-unsafe',"[cascade.params]\narticle_footer=[{component='authors',config={edit_url='javascript:alert(1)'}}]",'unsafe URL'),
      ('bad-region',"[params]\nleft=['share']",'invalid left'),
      ('bad-widget',"[params.widgets.bad]\ncomponent='share'\n[params.widgets.bad.config]\ntargets=['bad']",'invalid/duplicate share'),
      ('raw-reference',"[cascade.params]\nreferences=['<script>alert(1)</script>']",'Raw HTML omitted'),
      ('raw-license',"[cascade.params]\nlicense='<script>alert(1)</script>'",'Raw HTML omitted')]:check(label,extra,diagnostic)
    write(source,'content/notes/footer-bad.md','---\ntitle: Draft\ndraft: true\nparams:\n  references: [5]\n---\n')
    check('bad-draft',diagnostic='references entries')
    write(source,'content/notes/footer-bad.md','---\ntitle: Draft\ndraft: true\nreferences: []\n---\n')
    check('bad-placement',diagnostic='references belongs under params')
    write(source,'content/notes/footer-bad.md','---\ntitle: Draft\ndraft: true\n---\n')
    write(source,'content/preset/footer-unused/_index.md','---\ntitle: Unused\nparams:\n  defaults:\n    params:\n      share: [bad]\n---\n')
    check('bad-unused',diagnostic='invalid/duplicate share')
    print('PASS article footer: Markdown/defaults/native authors/edit, compact header authors/explicit footer authors, local QR, URL encoding, overrides/empty/repeats/widgets, EN/ZH/subpath and strict validation; retained',run)
if __name__=='__main__':main()
