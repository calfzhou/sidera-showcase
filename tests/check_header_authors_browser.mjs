import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese']]){
  await v(width,1000);
  for(const name of ['single','multiple','none','only-authors','empty','hidden']){
   await n(prefix+'/notes/author-'+name+'/');await e(`Sidera.setColorMode('${mode}')`);await delay(180);
   const state=await e(`(()=>{const authors=document.querySelector('.header-authors'),row=document.querySelector('.article-dates'),sep=document.querySelector('.author-date-separator');return{text:authors?.textContent,names:authors?.querySelectorAll('a').length,images:authors?.querySelectorAll('img').length,sep:!!sep,footer:document.querySelectorAll('.article-footer [data-footer-item=authors]').length,overflow:document.documentElement.scrollWidth>innerWidth,first:row?.firstElementChild.className,aligned:!authors||!sep||Math.abs(authors.getBoundingClientRect().top-sep.getBoundingClientRect().top)<2}})()`);
   assert.equal(state.footer,0);assert(!state.overflow);if(width===1440)assert(state.aligned);
   if(['none','empty','hidden'].includes(name)){assert(!state.text&&!state.sep)}
   else{assert.equal(state.text,name==='multiple'?'Second Writer, Rowan':'Rowan');assert.equal(state.names,name==='multiple'?2:1);assert.equal(state.images,0);assert.equal(state.first,'header-authors');assert.equal(state.sep,name!=='only-authors');}
  }
 }
 await v(1440,960);await n('/notes/author-multiple/');await e(`document.querySelector('.header-authors a').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');assert.equal(await e(`getComputedStyle(document.querySelector('.date-secondary')).visibility`),'visible');
 await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/authors/second/');
 for(const [route,name] of [['/notes/package-management/','single-author'],['/notes/author-multiple/','multiple-authors']]){
  await n(route);await e(`Sidera.setColorMode('dark')`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(230);
  const rect=await e(`(()=>{const r=document.querySelector('.article-header').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
  const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:1}});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));
 }
 await v(320,960);await n('/notes/author-multiple/');await e(`document.querySelector('.header-authors a').textContent='A very long author display name that must wrap without expanding the article'`);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/author-multiple/',false);assert.equal(await e(`document.querySelector('.header-authors').textContent`),'Second Writer, Rowan');await e(`document.querySelector('.header-authors a:last-child').focus()`);await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/authors/rowan/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS compact header names/comma/separator alignment, no portraits/default footer card, absent/hidden/no-date states, native author links and retained date reveal, EN/ZH/palettes/mobile/no-JS');
},{'/_chinese':'chinese-public'});
