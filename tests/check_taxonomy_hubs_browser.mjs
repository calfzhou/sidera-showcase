// Shared term-index rendering; repository-local fixture data only.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[390,'light',''],[320,'dark','/_chinese'],[390,'light','/preview']]){
  await v(width,960);
  for(const scope of ['journal','notes','handbook','unclassified'])for(const taxonomy of ['tags','categories']){
   await n(prefix+'/'+scope+'/'+taxonomy+'/');await e(`Sidera.setColorMode('${mode}')`);
   const state=await e(`(()=>{const index=document.querySelector('[data-taxonomy-index]');return{overflow:document.documentElement.scrollWidth>innerWidth,heads:document.querySelectorAll('h1').length,articles:!!document.querySelector('#articles'),index:index.dataset.taxonomyIndex,links:[...index.querySelectorAll('a')].map(a=>a.getAttribute('href')),directory:index.classList.contains('taxonomy-directory'),counts:[...index.querySelectorAll('small')].every(n=>n.textContent.trim().startsWith('('))}})()`);
   assert(!state.overflow&&!state.articles&&state.counts);assert.equal(state.heads,1);assert.equal(state.index,taxonomy);assert(state.links.every(href=>href.startsWith(prefix+'/'+scope+'/'+taxonomy+'/')));assert.equal(state.directory,taxonomy==='categories'||scope==='notes');
  }
 }
 await v(1440,960);await n('/handbook/tags/');
 await e(`document.querySelector('[data-taxonomy-index] a[href="/handbook/tags/shared/root/"]').focus()`);await delay(200);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/handbook/tags/shared/root/');
 assert.equal(await e(`document.querySelector('#articles .card-title').getAttribute('href')`),'/handbook/hub-probe/');
 await n('/notes/tags/shared/');assert.equal(await e(`document.querySelectorAll('#articles .card-title').length`),1);
 // Current live Notes screenshot has no injected content; docs without assignments stay empty.
 await n('/_live/notes/tags/');await e(`Sidera.setColorMode('dark')`);await delay(240);
 const rect=await e(`(()=>{const r=document.querySelector('[data-tag-view]').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{...rect,scale:1},captureBeyondViewport:true});await writeFile(resolve(b.run,'notes-all-tags.png'),Buffer.from(data,'base64'));
 await n('/_live/handbook/tags/');assert.equal(await e(`document.querySelectorAll('[data-taxonomy-index] a').length`),0);assert(!await e(`!!document.querySelector('#articles')`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(390,960);await n('/handbook/categories/',false);
 assert(await e(`!!document.querySelector('[data-taxonomy-index=categories]')&&!document.querySelector('#articles')`));
 await e(`document.querySelector('[data-taxonomy-index] a').focus()`);await key('Enter','Enter',13);await delay(150);assert(await e(`!!document.querySelector('#articles')`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS term hubs: shared renderer across blog/notes/docs/plain, hierarchy/counts/native links, live empty docs, keyboard/mobile, EN/ZH/subpath, no JS');
},{'/_live':'baseline-public','/_chinese':'chinese-public','/preview':'subpath-public','':'populated-public'});
