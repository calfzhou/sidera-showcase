// check_inversion.py fixture; owned Chrome/profile. No provider/network activity.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
const cases=['none','alone','dark','dark-soft','light','light-soft','both','both-soft'];
const full='invert(1) hue-rotate(180deg)',soft='invert(0.93) hue-rotate(180deg)';
const expected=(name,mode)=>name.startsWith('both')||name.startsWith(mode)?(name.endsWith('soft')?soft:full):'none';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,call,viewport:v,key,delay}=b;
 const wait=async expression=>{for(let i=0;i<150;i++){if(await e(expression))return;await delay(50)}assert.fail(expression)};
 const filter=selector=>e(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).filter`);
 const chain=selector=>e(`(()=>{const filters=[];for(let el=document.querySelector(${JSON.stringify(selector)});el;el=el.parentElement){const f=getComputedStyle(el).filter;if(f!=='none')filters.push(f)}return filters.join(' ')||'none'})()`);
 const mode=async value=>{await e(`Sidera.setColorMode('${value}')`);await e(`getComputedStyle(document.body).color`)};
 const openImage=async selector=>{
  const href=await e(`(()=>{const link=document.querySelector(${JSON.stringify(selector)}).closest('a');link.scrollIntoView({block:'center',behavior:'instant'});return link.href})()`);
  await e(`document.querySelector(${JSON.stringify(selector)}).closest('a').click()`);
  await wait(`document.querySelector('.image-dialog')?.open&&!!document.querySelector('.image-viewer-image')?.complete`);
  assert.equal(await e(`document.querySelector('.image-viewer-image').src`),href);
  assert.equal(await e(`document.querySelector('[data-image-action="download"]').href`),href);
 };
 const closeImage=async()=>{await key('Escape','Escape',27);await wait(`!document.querySelector('.image-dialog').open&&!document.querySelector('.image-viewer-image')`)};
 const figure=selector=>selector.startsWith('#mermaid')?selector:selector+' [data-sidera-diagram]';
 const render=async selector=>{const f=figure(selector);await e(`document.querySelector(${JSON.stringify(f)}).scrollIntoView({block:'center',behavior:'instant'})`);await wait(`document.querySelector(${JSON.stringify(f)}).dataset.state==='ready'`);return f};
 const openDiagram=async selector=>{const f=await render(selector);await e(`document.querySelector(${JSON.stringify(f)}).querySelector('[data-diagram-action="expand"]').click()`);await wait(`document.querySelector('.diagram-dialog')?.open`)};
 const closeDiagram=async()=>{await key('Escape','Escape',27);await wait(`!document.querySelector('.diagram-dialog').open&&!document.querySelector('.diagram-dialog > .diagram-canvas')`)};
 const results=[];
 await v(1280,1000);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await n('/preview/inversion/');
 for(const tone of ['light','dark']){
  await mode(tone);
  for(const name of cases){
   const value=expected(name,tone);
   for(const prefix of ['md-','image-','group-'])assert.equal(await filter('#'+prefix+name),value,prefix+name+'/'+tone);
   assert.equal(await filter('#group-image-'+name),'none','Wrapper filters are not inherited onto images');
   assert.equal(await e(`getComputedStyle(document.querySelector('#image-${name}').closest('figure').querySelector('figcaption')).filter`),'none','Image classes do not filter captions');
  }
  assert.equal(await filter('#modifier-parent'),'none');assert.equal(await filter('#not-inherited'),expected('dark',tone));
  assert.equal(await filter('#modifier-child'),'none');assert.equal(await filter('#direction-parent'),expected('dark',tone));
  assert.equal(await filter('#nested-parent'),expected('dark-soft',tone));assert.equal(await filter('#nested-child'),expected('dark',tone));
  results.push(tone+': eight combinations across Markdown, image shortcode and wrapper; caption and modifier isolation');
 }
 // Original-image expansion reads actual computed filters, including marked ancestors.
 for(const selector of ['#image-dark-soft','#image-light-soft','#image-both-soft','#group-image-dark-soft','#group-image-light-soft','#nested-child','#not-inherited','#modifier-child','#image-alone']){
  await mode('dark');await openImage(selector);
  for(const tone of ['dark','light','dark']){
   await mode(tone);const wanted=await chain(selector);
   await wait(`getComputedStyle(document.querySelector('.image-viewer-image')).filter===${JSON.stringify(wanted)}`);
   assert.equal(await filter('.image-dialog'),'none','Viewer controls remain outside image inversion');
  }
  if(selector==='#image-dark-soft')await b.screenshot('invert-soft-image-expanded');
  await closeImage();assert(await e(`document.activeElement===document.querySelector(${JSON.stringify(selector)}).closest('a')`));
 }
 results.push('Expanded images: direct/wrapper/always/standalone/nested cases, live mode changes, original download URL and Escape focus restoration');
 // Both local diagram engines retain fixed-light rendering only for direction markers.
 for(const kind of ['mermaid','drawio']){
  for(const name of ['alone','dark','dark-soft','light-soft','both-soft']){
   const selector='#'+kind+'-'+name;await mode('dark');const f=await render(selector);
   const originalParent=await e(`document.querySelector(${JSON.stringify(f)}).querySelector('.diagram-canvas').parentElement===document.querySelector(${JSON.stringify(f)})`);assert(originalParent);
   if(kind==='drawio'){
    const renderScheme=name==='alone'?'dark':'light';
    await wait(`fetch(document.querySelector(${JSON.stringify(f)}).querySelector('.diagram-view img').src).then(r=>r.text()).then(svg=>new DOMParser().parseFromString(svg,'image/svg+xml').documentElement.style.colorScheme===${JSON.stringify(renderScheme)})`);
   }
   const wanted=await chain(f);
   assert.equal(wanted,expected(name,'dark'));
   await openDiagram(selector);
   for(const tone of ['dark','light','dark']){
    await mode(tone);const now=await chain(f);
    await wait(`getComputedStyle(document.querySelector('.diagram-dialog > .diagram-canvas')).filter===${JSON.stringify(now)}`);
    assert.equal(await filter('.diagram-dialog'),'none');
   }
   if(kind==='drawio'&&name==='dark-soft')await b.screenshot('invert-soft-diagram-expanded');
   await closeDiagram();
   assert.equal(await e(`document.querySelector(${JSON.stringify(f)}).querySelector('.diagram-canvas').style.filter`),'','No duplicate filter after restoring the canvas');
   assert.equal(await chain(f),wanted);
  }
 }
 await mode('dark');await openDiagram('#nested-diagram');assert.equal(await filter('.diagram-dialog > .diagram-canvas'),full+' '+soft);await closeDiagram();
 results.push('Mermaid/drawio: native adaptation for modifier-only; fixed-light rendering for direction markers; modal filtering without double application, including nesting');
 await e(`document.querySelector('#chart-soft').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`document.querySelector('#chart-soft').dataset.state==='ready'`);
 assert.equal(await filter('#chart-soft'),soft);assert.equal(await e(`getComputedStyle(document.querySelector('#chart-soft')).colorScheme`),'light');
 assert.equal(await e(`document.querySelector('#chart-soft iframe').getAttribute('sandbox')`),'allow-scripts');
 // CSS auto, including the pre-controller/no-JS path, uses the same direction rules.
 for(const pref of ['light','dark']){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:pref},{name:'prefers-reduced-motion',value:'reduce'}]});
  await e(`document.documentElement.dataset.colorScheme='auto'`);
  for(const name of cases)assert.equal(await filter('#image-'+name),expected(name,pref),'auto/'+name);
 }
 await v(390,844);await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await mode('dark');await openImage('#image-dark-soft');
 assert.equal(await filter('.image-viewer-image'),soft);assert(await e(`document.querySelector('.image-dialog').getBoundingClientRect().width<=innerWidth`));await closeImage();
 for(const path of ['/preview/zh/inversion/','/off/inversion/']){
  await n(path);await mode('dark');await openImage('#image-dark-soft');assert.equal(await filter('.image-viewer-image'),soft);await closeImage();
  if(path.startsWith('/off'))assert.equal(await e(`document.querySelector('.image-dialog').querySelectorAll('svg').length`),0);
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/preview/inversion/',false);
 for(const pref of ['light','dark']){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:pref}]});await e(`document.documentElement.dataset.colorScheme='auto'`);
  for(const name of cases)assert.equal(await filter('#md-'+name),expected(name,pref),'no-JS/'+name);
 }
 assert.equal(await e(`document.querySelector('.image-dialog')`),null);
 assert(await e(`document.querySelector('#image-dark-soft').closest('a').getAttribute('href').endsWith('/original.svg')`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 results.push('Chart wrapper, CSS auto, no-JS links/filters, mobile expansion, Chinese and icons-off');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(url=>url.startsWith(b.origin+'/')||url.startsWith('blob:'+b.origin+'/')));
 await writeFile(resolve(b.run,'inversion-browser-results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS '+results.join('; '));
},{'/preview':resolve(process.argv[3]||process.argv[2],'baseline-public'),'/off':resolve(process.argv[3]||process.argv[2],'icons-off-public')});
