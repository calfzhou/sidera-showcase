// Named widgets use the same native components, controls and independent instance contexts.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 await v(1440,960);
 for(const route of ['/','/about/']){
  await n(route);
  assert.equal(await e(`document.querySelector('[data-instance="left-text-1"] h2').textContent`),'Welcome');
  assert(await e(`document.querySelector('[data-instance="left-text-1"] .authored-text').textContent.includes('Explore the journal')`));
 }
 const r=await e(`(()=>{const r=document.querySelector('[data-instance="left-text-1"]').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{...r,scale:2}});await writeFile(resolve(b.run,'welcome-widget.png'),Buffer.from(data,'base64'));
 for(const width of [1440,390]){
  await v(width,960);await n('/_instances/notes/package-management/');
  if(width<1181){await e(`document.querySelector('[data-region="right"]').click()`);await delay(430);}
  assert(await e(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length&&document.documentElement.scrollWidth<=innerWidth})()`));
  assert.equal(await e(`document.querySelector('[data-instance="right-recent-3"] ul').children.length`),1);
  assert.equal(await e(`document.querySelector('[data-instance="right-recent-2"] ul').children.length`),5);
  assert.equal(await e(`document.querySelector('[data-instance="right-text-2"]').textContent.trim()`),'Local body');
  assert(await e(`document.querySelector('[data-instance="right-text-1"]').textContent===document.querySelector('[data-instance="right-text-3"]').textContent`));
  assert(await e(`document.querySelector('[data-instance="right-text-1"] strong')!==null`));
  await e(`document.querySelector('[data-instance="right-toc-2"] summary').focus()`);await key('Enter','Enter',13);
  assert(await e(`document.querySelector('[data-instance="right-toc-1"] details').open&&!document.querySelector('[data-instance="right-toc-2"] details').open`));
  assert(await e(`JSON.stringify(JSON.parse(document.querySelector('#widgets-before').textContent))===JSON.stringify(JSON.parse(document.querySelector('#widgets-after').textContent))`));
 }
 await v(1440);await n('/_bilingual/zh/about/');
 assert.equal(await e(`document.querySelector('[data-instance="left-text-1"] h2').textContent`),'Locale-specific welcome');
 await n('/_bilingual/en/about/');assert.equal(await e(`document.querySelector('[data-instance="left-text-1"] h2').textContent`),'Welcome');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/_instances/notes/package-management/',false);
 assert(await e(`document.querySelectorAll('[data-component="recent"]').length===4`));
 assert(await e(`document.querySelector('[data-instance="right-text-1"] a').getAttribute('href')==='/about/'`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS named widget runtime: reusable content, per-use overrides, repeated IDs/TOCs, per-language cache, mobile and no-JS');
},{'/_instances':'instances-public','/_bilingual':'bilingual-public'});
