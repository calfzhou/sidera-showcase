// Local integration views of the approved runtime assets; no design or live providers.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 await v(1440,960);await n('/notes/');
 for(const mode of ['dark','light']){
  await e(`Sidera.setColorMode('${mode}')`);
  const result=await e(`(()=>{const i=document.querySelector('.identity-image');const s=getComputedStyle(i);return{ready:i.complete&&i.naturalWidth===128,width:i.width,filter:s.filter,background:s.backgroundColor,radius:s.borderRadius,src:i.getAttribute('src'),icons:[...document.querySelectorAll('link[rel=icon]')].map(l=>[l.type,l.sizes.value,l.getAttribute('href')])}})()`);
  assert(result.ready&&result.width===44);assert.equal(result.filter,'none');
  assert.equal(result.src,'/images/sidera-parallax-circle.svg');assert.equal(result.icons[1][2],'/images/sidera-parallax-square.svg');
 }
 await e(`Sidera.setColorMode('dark')`);await delay(450);await b.screenshot('identity-desktop-dark');
 await e(`document.querySelector('.identity-avatar').focus()`);await key('Enter','Enter',13);await delay(200);assert.equal(await e('location.pathname'),'/');
 await v(390,844);await n('/notes/');await e(`Sidera.setColorMode('light')`);await delay(450);await b.screenshot('identity-mobile-light');
 // Native browser rasterization at small sizes, both masks and palettes. Temporary
 // QA DOM only; no SVG rewriting, path substitution, inversion or deployed gallery.
 await v(1100,620);await n('/');
 await e(`(()=>{document.body.innerHTML='';document.body.style.cssText='margin:0;padding:16px;background:#ddd;font:14px system-ui';for(const bg of ['#f9fafb','#1c1f21','#808080']){const row=document.createElement('section');row.style.cssText='display:flex;align-items:center;gap:24px;height:170px;padding:12px;background:'+bg+';color:'+(bg==='#f9fafb'?'#111':'white');const label=document.createElement('span');label.textContent=bg;row.append(label);for(const [file,mask] of [['circle.svg','50%'],['square.svg','22%'],['32.png','0']]){const group=document.createElement('div');group.style.cssText='display:flex;align-items:center;gap:16px';for(const size of [16,24,32,44]){const cell=document.createElement('div');const img=document.createElement('img');img.src='/images/sidera-parallax-'+file;img.width=size;img.height=size;img.style.cssText='background:transparent;border-radius:'+mask;cell.append(img,document.createElement('br'),document.createTextNode(size+'px'));group.append(cell)}row.append(group)}document.body.append(row)}})()`);
 await e(`Promise.all([...document.images].map(i=>i.decode()))`);
 assert(await e(`[...document.images].every(i=>i.complete&&getComputedStyle(i).filter==='none')`));
 await b.screenshot('logo-size-mask-check');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/',false);
 assert(await e(`[...document.querySelectorAll('.identity-image')].every(i=>i.complete&&i.naturalWidth===128)`));
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 console.log('PASS runtime native logo/favicon resources, dark/light circle avatar, home keyboard navigation, mobile/no-JS; inspected small/masked assets without recoloring');
});
