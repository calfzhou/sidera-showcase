// Collection reading controls: real local keyboard links, no browser-history/referrer routing.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese'],[390,'light','/preview']]){
  await v(width,1000);
  for(const route of ['/blog-list/c/','/notes-siblings/a/a2/','/docs-sequential/b/','/plain-sequential/','/handbook/workflows/']){
   await n(prefix+route);await e(`Sidera.setColorMode('${mode}')`);await delay(200);
   const state=await e(`(()=>{const nav=document.querySelector('.page-navigation'),a=nav.querySelector('.page-neighbor'),box=document.querySelector('.article-footer-box');return{count:document.querySelectorAll('.page-navigation').length,overflow:document.documentElement.scrollWidth>innerWidth,border:getComputedStyle(a).borderTopStyle,bottom:getComputedStyle(a).borderBottomStyle,size:getComputedStyle(a.querySelector('.neighbor-title')).fontSize,labels:[...nav.querySelectorAll('.neighbor-label')].map(n=>n.textContent),after:!box||!!(box.compareDocumentPosition(nav)&Node.DOCUMENT_POSITION_FOLLOWING),links:[...nav.querySelectorAll('a')].map(a=>a.getAttribute('href'))}})()`);
   assert.equal(state.count,1);assert(!state.overflow&&state.after);assert.equal(state.border,'dashed');assert.equal(state.bottom,'dashed');assert.equal(state.size,'20px');
   assert(state.labels.every(label=>(prefix==='/_chinese'?['上一页','下一页']:['Previous','Next']).includes(label)));
   assert(state.links.every(url=>url.startsWith(prefix+route.split('/').slice(0,2).join('/')+'/')));
  }
 }
 await v(1440,1000);await n('/docs-sequential/b/');await e(`Sidera.setColorMode('dark');document.querySelector('[data-navigation=previous]').focus()`);await delay(220);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(130);assert.equal(await e('location.pathname'),'/docs-sequential/a/a1/');
 await e(`document.querySelector('[data-navigation=next]').focus()`);await key('Enter','Enter',13);await delay(130);assert.equal(await e('location.pathname'),'/docs-sequential/b/');
 await e(`document.querySelector('[data-navigation=parent]').focus()`);await key('Enter','Enter',13);await delay(130);assert.equal(await e('location.pathname'),'/docs-sequential/');assert.equal(await e(`document.querySelectorAll('[data-navigation=parent],[data-navigation=previous]').length`),0);
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='navigation'&&n.name?.value==='Page navigation'));
 // Sparse controls retain the left/right position, no dead placeholders.
 await n('/blog-list/b/');assert.equal(await e(`document.querySelectorAll('[data-navigation=previous]').length`),0);
 assert.equal(await e(`getComputedStyle(document.querySelector('[data-navigation=next]')).gridColumnStart`),'2');
 await n('/notes-siblings/a/a1/');assert.equal(await e(`document.querySelectorAll('[data-navigation=next]').length`),0);
 for(const [route,name] of [['/journal/2026/04/10/beginning/','blog-navigation'],['/handbook/workflows/','sibling-navigation'],['/_sequential/handbook/review/','sequential-navigation']]){
  await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('.page-navigation').scrollIntoView({block:'center',behavior:'instant'})`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(220);
  const r=await e(`(()=>{const r=document.querySelector('.page-navigation').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
  const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...r,scale:1}});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));
 }
 // Native labels/titles wrap instead of expanding the reading column.
 await v(320,1000);await n('/docs-sequential/b/');await e(`document.querySelector('.neighbor-title').textContent='An unusually long page title that must wrap safely across a narrow reading column';document.documentElement.style.fontSize='36px'`);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/blog-list/c/',false);await e(`document.querySelector('[data-navigation=next]').focus()`);await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/blog-list/a/a2/');
 await n('/notes/tags/tools/python/',false);assert.equal(await e(`document.querySelectorAll('.page-navigation').length`),0);
 await n('/_pagers/handbook/page/2/',false);assert.equal(await e(`document.querySelectorAll('.page-navigation').length`),0);
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS reading navigation: list/sibling/sequential targets, canonical-only UI, parent boundaries, reciprocal keyboard links, dashed layout, sparse states, EN/ZH/palettes/mobile/AX/no-JS');
},{'/_chinese':'chinese-public','/preview':'subpath-public','/_sequential':'live-sequential-public','/_pagers':'child-pagers-public','':'matrix-public'});
