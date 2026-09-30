"""Approved Parallax bytes, native identity/favicon ownership; no design regeneration."""
from pathlib import Path
import hashlib, os, struct, sys
sys.dont_write_bytecode = True
from check_p1a import ROOT
from check_p1b import copy_showcase, copy_site, build
from check_p2f import nodes
from check_p2w import write

HASHES = {'circle':'ebe20ad690732ea31d77b7a7de72308f305b5927ca2c87fb07b7a007a9b85a68',
          'square':'f21dc7afd04c9f4d4873ac39ee03e77d6affc093780d669177636b36e215ec7c'}
def main():
    run=Path(os.environ['SIDERA_CHECK_DIR']).resolve();run.mkdir(parents=True,exist_ok=False)
    assets=ROOT/'themes/sidera/assets/images'
    for variant,digest in HASHES.items():
        assert hashlib.sha256((assets/f'sidera-parallax-{variant}.svg').read_bytes()).hexdigest()==digest
    assert (ROOT/'themes/sidera/THIRD-PARTY-NOTICES.md').read_bytes()==(ROOT/'themes/sidera/assets/licenses/sidera-third-party.txt').read_bytes()
    png=(assets/'sidera-parallax-32.png').read_bytes()
    assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(32,32)
    source=copy_showcase(run,'live')
    for label,flags,prefix in [('baseline',(),''),('chinese',('--config','hugo.toml,examples/chinese.toml','--baseURL','https://example.org/preview/'),'/preview')]:
        out=build(source,run,label,flags=flags)
        d=nodes(out,'/notes/')
        notice=d.all(rel='license')[0].attrs['href']
        assert notice==prefix+'/licenses/sidera-third-party.txt'
        assert (out/notice.removeprefix(prefix).lstrip('/')).read_bytes()==(ROOT/'themes/sidera/THIRD-PARTY-NOTICES.md').read_bytes()
        assert all(n.attrs['src']==prefix+'/images/sidera-parallax-circle.svg' for n in d.all(**{'class':'identity-image'}))
        icons=d.all(rel='icon');assert [(n.attrs['type'],n.attrs['sizes']) for n in icons]==[('image/png','32x32'),('image/svg+xml','any')]
        for n in icons:
            path=n.attrs['href'];assert path.startswith(prefix+'/images/sidera-parallax-')
            assert (out/path.removeprefix(prefix).lstrip('/')).read_bytes()==(assets/Path(path).name).read_bytes()
        assert not (out/'images/sidera-mark.svg').exists(), 'Unused legacy fixture is not auto-published'
    # Site assets shadow the identical virtual path; identity setting remains site owned.
    custom='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><circle cx="22" cy="22" r="10" fill="red"/></svg>'
    write(source,'assets/images/sidera-parallax-circle.svg',custom)
    write(source,'layouts/_partials/sidera/head-extra.html','<link rel="icon" href="{{ "favicon.ico" | relURL }}">')
    (source/'static/favicon.ico').write_bytes(b'site-owned-favicon-test')
    out=build(source,run,'override',flags=('--baseURL','https://example.org/preview/'))
    assert (out/'images/sidera-parallax-circle.svg').read_text()==custom
    assert (out/'favicon.ico').read_bytes()==b'site-owned-favicon-test'
    assert [n.attrs['href'] for n in nodes(out,'/').all(rel='icon')]==['/preview/favicon.ico']
    assert not (out/'images/sidera-parallax-square.svg').exists()
    # Another consuming site receives neither a Sidera avatar nor an imposed favicon.
    other=copy_site(run,'consumer');out=build(other,run,'consumer')
    assert not nodes(out,'/').all(rel='icon') and not nodes(out,'/').all(**{'class':'identity-image'})
    print('PASS approved SVG hashes, 32px fallback, EN/ZH/subpath, no unused publication, site asset/head overrides and theme opt-in; retained',run)
if __name__=='__main__':main()
