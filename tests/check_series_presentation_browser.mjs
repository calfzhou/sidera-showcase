// Native card badge + series disclosure: separate from the collection's reading controls.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const route='/journal/2026/04/14/connect-the-useful-parts/';
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese'],[390,'light','/preview']]){
  await v(width,1000);await n(prefix+'/journal/');await e(`Sidera.setColorMode('${mode}')`);await delay(220);
  assert.equal(await e(`document.querySelectorAll('#articles .card-series').length`),7);
  const badge=await e(`(()=>{const card=[...document.querySelectorAll('#articles .article-card')].find(c=>c.querySelector('.card-title').getAttribute('href')===${JSON.stringify(prefix+route)});const a=card.querySelector('.card-series');return{position:a.dataset.seriesPosition,total:a.dataset.seriesTotal,label:a.getAttribute('aria-label')}})()`);
  assert.equal(badge.position,'3');assert.equal(badge.total,'4');assert(badge.label.includes(prefix==='/_chinese'?'第 3 篇':'Part 3 of 4'));
  await n(prefix+route);
  const state=await e(`(()=>{const nav=document.querySelector('.series-navigation'),details=nav.querySelector('details');return{position:nav.dataset.seriesPosition,total:nav.dataset.seriesTotal,open:details.open,count:details.querySelectorAll('li').length,current:details.querySelector('[aria-current]').getAttribute('href'),overflow:document.documentElement.scrollWidth>innerWidth,mainNext:document.querySelector('[data-navigation=next]').getAttribute('href'),seriesNext:nav.querySelector('[data-series-next]').getAttribute('href')}})()`);
  assert.equal(state.position,'3');assert.equal(state.total,'4');assert(state.open&&!state.overflow);assert.equal(state.count,4);assert.equal(state.current,prefix+route);assert.notEqual(state.mainNext,state.seriesNext);
 }
 await v(1440,1100);await n('/journal/');await e(`Sidera.setColorMode('dark')`);
 const cardSelector=`[...document.querySelectorAll('.article-card')].find(c=>c.querySelector('.card-title').getAttribute('href')==='${route}')`;
 await e(`${cardSelector}.scrollIntoView({block:'center',behavior:'instant'})`);await delay(240);
 async function capture(expression,name){const rect=await e(`(()=>{const r=(${expression}).getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:1}});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));}
 await capture(cardSelector,'series-card');
 // A real pointer click on the badge must not be captured by the card's title overlay.
 const hit=await e(`${cardSelector}.querySelector('.card-series').getBoundingClientRect().toJSON()`);
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:hit.x+15,y:hit.y+hit.height/2,button:'left',clickCount:1});
 await delay(150);assert.equal(await e('location.pathname'),'/journal/series/making-notes/');
 await n(route);await e(`document.querySelector('.series-navigation').scrollIntoView({block:'center',behavior:'instant'})`);await delay(220);await capture(`document.querySelector('.series-navigation')`,'series-outline');
 await e(`document.querySelector('.series-outline summary').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);assert(!await e(`document.querySelector('.series-outline').open`));
 await key('Enter','Enter',13);assert(await e(`document.querySelector('.series-outline').open`));
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='DisclosureTriangle'&&n.name?.value==='Part 3 of 4'));
 await e(`document.querySelector('[data-series-next]').focus()`);await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/journal/2026/04/17/review-without-rewriting/');
 assert.equal(await e(`document.querySelectorAll('[data-series-next]').length`),0);
 await n('/_repeat'+route);await e(`document.querySelector('.series-outline summary').click()`);assert.deepEqual(await e(`[...document.querySelectorAll('.series-outline')].map(d=>d.open)`),[false,true]);
 await v(320,960);await n(route);await e(`document.querySelector('.series-title').textContent='An unusually long series title that needs to wrap without widening the reading column';document.querySelector('.series-outline li a').textContent='A very long chapter title with no missing content or horizontal overflow'`);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);await e(`document.querySelector('.series-outline summary').focus()`);await key('Enter','Enter',13);assert(!await e(`document.querySelector('.series-outline').open`));
 await key('Enter','Enter',13);await e(`document.querySelector('.series-outline a').focus()`);await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/journal/2026/04/10/beginning/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS series UI: real badge target, scoped positions/counts/current chapter, native outline/keyboard/AX/repeats, distinct series/general neighbors, EN/ZH/palettes/mobile/no-JS');
},{'/_chinese':'chinese-public','/preview':'subpath-public','/_repeat':'repeated-public'});
