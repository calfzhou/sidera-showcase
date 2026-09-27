import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport,call,key}=b;const route='/handbook/reference/advanced-markdown/';
 for(const [width,palette,prefix] of [[1440,'dark',''],[390,'light',''],[320,'dark','/_chinese'],[1440,'light','/_chinese']]){
  await viewport(width,1000);await n(prefix+route);await e(`document.documentElement.dataset.colorScheme=${JSON.stringify(palette)}`);
  const r=await e(`(()=>{const p=document.querySelector('.prose');const f=s=>getComputedStyle(p.querySelector(s)).filter;const box=p.querySelector('.fbox');const sep=p.querySelector('.vertical-separator');return {
   math:p.querySelectorAll('math').length,alerts:p.querySelectorAll('aside').length,figures:p.querySelectorAll('figcaption').length,
   overflow:document.documentElement.scrollWidth>innerWidth,sw:document.documentElement.scrollWidth,
   image:f('#adaptive-image'),block:f('#palette-block'),plain:f('#plain-image'),paragraph:f('#adaptive-paragraph'),caption:f('.md-figure figcaption'),
   images:[...p.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().width<=120.1),
   box:box.getBoundingClientRect().width>0&&parseFloat(getComputedStyle(box).borderTopWidth)>0,
   rule:sep.getBoundingClientRect().height>0&&parseFloat(getComputedStyle(sep).borderRightWidth)>0,
   cancel:p.querySelectorAll('.katex-html svg line').length,
   wide:p.querySelectorAll('.math-display')[2].scrollWidth>p.querySelectorAll('.math-display')[2].clientWidth,
   fonts:[...document.fonts].filter(f=>f.family.startsWith('KaTeX')&&f.status==='loaded').length,
   resources:performance.getEntriesByType('resource').filter(x=>x.name.includes('/vendor/katex')).map(x=>x.name),
   toc:!!document.querySelector('[data-toc] a[href="#inside-a-general-block"]')};})()`);
  assert.equal(r.math,5);assert.equal(r.alerts,6);assert.equal(r.figures,3);assert(!r.overflow,JSON.stringify(r));assert(r.images&&r.box&&r.rule&&r.cancel>=2&&r.fonts>0&&r.toc,JSON.stringify(r));
  assert.equal(await e(`(()=>{const i=document.getElementById('adaptive-image');i.classList.add('invert-when-light');const value=getComputedStyle(i).filter;i.classList.remove('invert-when-light');return value})()`),'invert(1) hue-rotate(180deg)');
  assert.equal(r.plain,'none');assert.equal(r.caption,'none');
  assert.equal(r.image,palette==='dark'?'invert(1) hue-rotate(180deg)':'none');assert.equal(r.block,r.image);
  assert.equal(r.paragraph,palette==='light'?'invert(1) hue-rotate(180deg)':'none');
  if(width<400){assert(r.wide);await e(`document.querySelectorAll('.math-display')[2].focus()`);await key('ArrowRight','ArrowRight',39);await b.delay(200);assert(await e(`document.querySelectorAll('.math-display')[2].scrollLeft>0`));}
  await e(`document.getElementById('inline-and-display-equations').scrollIntoView({behavior:'instant'})`);await b.delay(80);
  if(width===390)await b.screenshot('math-mobile-light');
  if(width===1440&&palette==='dark'){await b.screenshot('math-desktop-dark');await e(`document.getElementById('images-and-native-attributes').scrollIntoView({behavior:'instant'})`);await b.screenshot('images-desktop-dark');}
  const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(x=>/math/i.test(x.role?.value||'')));
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await viewport(390);await n(route,false);
 await e(`document.fonts.ready`);assert(await e(`document.querySelector('.fbox').getBoundingClientRect().width>0`));
 await e(`document.querySelector('#adaptive-block a[href*="from=block"]').focus()`);await key('Enter','Enter',13);await b.delay(400);
 assert(await e(`location.pathname==='/journal/2026/04/14/connect-the-useful-parts/'&&location.hash==='#give-a-link-a-reason'`));
 await n('/_native/native-probe/',false);
 assert.equal(await e(`getComputedStyle(document.querySelector('#tight-list figcaption')).display`),'none');
 // No-JS auto palette uses native CSS variables, not an appearance script.
 await n(route,false);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await e(`document.documentElement.dataset.colorScheme='auto'`);assert.equal(await e(`getComputedStyle(document.getElementById('adaptive-image')).filter`),'none');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});assert.match(await e(`getComputedStyle(document.getElementById('adaptive-image')).filter`),/invert/);
 // Failure is honest: with the stylesheet unavailable, MathML/TeX remains in DOM;
 // no fake rendered fallback or remote retry is installed.
 await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Network.setBlockedURLs',{urls:['*vendor/katex*']});await n(route,false);
 assert.equal(await e(`document.querySelectorAll('math').length`),5);
 assert(await e(`document.querySelector('annotation').textContent.includes('area_')`));
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')),'No remote resource requests');
 console.log('PASS full B visuals/structure: palettes, EN/ZH, 320/390/1440, local fonts, decorated formulas, AX, keyboard/no-JS, source links and resource-failure boundary');
},{'/_chinese':'chinese-public','/_native':'native-public'});
