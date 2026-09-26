import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,key,call,delay}=b;
 const route='/journal/2026/04/14/connect-the-useful-parts/';
 for(const [width,prefix] of [[1440,''],[390,''],[320,'/_chinese']]){
  await v(width,1000);
  for(const page of [route,'/notes/package-management/','/handbook/workflows/']){
   await n(prefix+page);
   const state=await e(`(()=>{const end=document.querySelector('.article-end'),nav=document.querySelector('.page-navigation'),children=document.getElementById('doc-children');return{count:document.querySelectorAll('.article-end').length,last:document.querySelector('main').lastElementChild===end,afterNav:!nav||nav.getBoundingClientRect().bottom<=end.getBoundingClientRect().top,afterChildren:!children||children.getBoundingClientRect().bottom<=end.getBoundingClientRect().top,seriesControls:document.querySelectorAll('.series-neighbors').length,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
   assert.equal(state.count,1);assert(state.last&&state.afterNav&&state.afterChildren&&!state.overflow);assert.equal(state.seriesControls,0);
  }
 }
 await v(1440,1100);await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('.series-navigation').scrollIntoView({block:'start',behavior:'instant'})`);await delay(220);
 const rect=await e(`(()=>{const top=document.querySelector('.series-navigation').getBoundingClientRect(),bottom=document.querySelector('.article-end').getBoundingClientRect();return{x:top.x+scrollX,y:top.y+scrollY,width:top.width,height:bottom.bottom-top.top}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:1}});await writeFile(resolve(b.run,'article-ending.png'),Buffer.from(data,'base64'));
 await e(`document.querySelector('.series-outline summary').focus()`);await key('Enter','Enter',13);assert(!await e(`document.querySelector('.series-outline').open`));
 await key('Enter','Enter',13);await e(`document.querySelector('.series-outline a[href="/journal/2026/04/17/review-without-rewriting/"]').focus()`);await key('Enter','Enter',13);await delay(130);assert.equal(await e('location.pathname'),'/journal/2026/04/17/review-without-rewriting/');
 await e(`document.querySelector('.article-end a').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none'); // Never open mail client.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);assert(await e(`document.querySelector('main').lastElementChild.classList.contains('article-end')`));assert.equal(await e(`document.querySelectorAll('.series-outline li').length`),4);
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS outline-only series, final contact below navigation/docs children, native chapter links and contact focus, desktop/mobile/EN/ZH/no-JS');
},{'/_chinese':'chinese-public'});
