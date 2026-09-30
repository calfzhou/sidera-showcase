// Native pager controls in an isolated local browser; never follow external links.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese'],[390,'light','/preview']]){
  await v(width,960);
  for(const route of ['/pager-single/','/journal/','/handbook/']){
   await n(prefix+route);assert.equal(await e(`document.querySelectorAll('.pagination').length`),0);
  }
  for(const [section,page] of [['pager-demo',1],['pager-demo',2],['pager-demo',6],['pager-long',6],['pager-long',12]]){
   await n(prefix+'/'+section+'/'+(page>1?`page/${page}/`:''));await e(`Sidera.setColorMode('${mode}')`);
   const state=await e(`(()=>{const bar=document.querySelector('.pagination'),visible=[...bar.querySelectorAll('.pagination-pages')].filter(n=>getComputedStyle(n).display!=='none'),pages=visible[0];return{visible:visible.length,current:pages.querySelector('[aria-current]').textContent.trim(),disabled:bar.querySelectorAll('[aria-disabled]').length,dead:[...bar.querySelectorAll('[aria-disabled]')].some(n=>n.hasAttribute('href')||n.hasAttribute('tabindex')),border:getComputedStyle(bar.querySelector('.pagination-previous')).borderRightStyle,overflow:document.documentElement.scrollWidth>innerWidth,innerOverflow:pages.scrollWidth>pages.clientWidth+1,radius:getComputedStyle(bar).borderRadius,height:bar.getBoundingClientRect().height,first:pages.querySelector('[data-page-link=first]').getAttribute('href'),last:pages.querySelector('[data-page-link=last]').getAttribute('href')};})()`);
   const fonts=await e(`[...document.querySelectorAll('.pagination-pages')].filter(p=>getComputedStyle(p).display!=='none').flatMap(p=>[...p.querySelectorAll('.page-number')].map(a=>{const s=getComputedStyle(a);return [s.fontFamily,s.fontSize,s.fontWeight,s.fontStyle].join('|')}))`);
   assert.equal(new Set(fonts).size,1,'Current and other page numbers must share typography');
   assert.equal(state.visible,1);assert.equal(state.current,String(page));assert.equal(state.disabled,page===1||page===(section==='pager-demo'?6:12)?1:0);
   assert(!state.dead&&!state.overflow&&!state.innerOverflow,JSON.stringify({width,page,state}));assert.equal(state.border,'dashed');assert.equal(state.radius,'16px');assert.equal(state.height,45);assert.equal(state.first,prefix+'/'+section+'/');assert(state.last.endsWith(`/page/${section==='pager-demo'?6:12}/`));
  }
 }
 await v(1440,960);await n('/pager-demo/');await e(`Sidera.setColorMode('dark');document.querySelector('.pagination').scrollIntoView({block:'center',behavior:'instant'})`);
 const pill='.pagination-pages[data-radius="2"] a[href="/pager-demo/page/2/"]';
 const rect=await e(`document.querySelector('${pill}').getBoundingClientRect().toJSON()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+rect.width/2,y:rect.y+rect.height/2});await delay(230);
 assert.notEqual(await e(`getComputedStyle(document.querySelector('${pill}')).backgroundColor`),'rgba(0, 0, 0, 0)');
 async function capture(name){const r=await e(`(()=>{const r=document.querySelector('.pagination').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...r,scale:2}});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));}
 await capture('pager-first');
 await e(`document.querySelector('${pill}').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/pager-demo/page/2/');
 await e(`document.querySelector('.pagination').scrollIntoView({block:'center',behavior:'instant'})`);
 const next=await e(`document.querySelector('[data-page-link=next]').getBoundingClientRect().toJSON()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:next.x+20,y:next.y+20});await delay(230);
 assert(await e(`getComputedStyle(document.querySelector('[data-page-link=next] .icon')).color===getComputedStyle(document.querySelector('[data-page-link=next]')).color`));
 await capture('pager-second');
 await e(`document.querySelector('[data-page-link=next]').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/pager-demo/page/3/');
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='link'&&n.name?.value==='Next'));assert(ax.nodes.some(n=>n.role?.value==='navigation'&&n.name?.value==='Pagination'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(320,960);await n('/pager-long/page/6/',false);
 const visible=await e(`(()=>{const p=[...document.querySelectorAll('.pagination-pages')].find(p=>getComputedStyle(p).display!=='none');return{radius:p.dataset.radius,current:p.querySelector('[aria-current]').textContent.trim(),width:p.scrollWidth,client:p.clientWidth}})()`);
 assert.equal(visible.radius,'1');assert.equal(visible.current,'6');assert(visible.width<=visible.client+1);
 await e(`document.querySelector('[data-page-link=previous]').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/pager-long/page/5/');

 // Icons off is a presentation policy, not a navigation opt-out.
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 for(const [prefix,word,width] of [['/_off','Next',390],['/_zh-off','下一页',320]]){
  await v(width,960);await n(prefix+'/pager-demo/page/2/');
  assert.equal(await e(`document.querySelectorAll('.pagination svg').length`),0);
  assert.equal(await e(`document.querySelector('[data-page-link=next]').textContent.trim()`),word);
  assert(await e(`(()=>{const p=document.querySelector('.pagination');return p.getBoundingClientRect().width<=innerWidth && [...p.querySelectorAll('.pagination-arrow')].every(a=>a.scrollWidth<=a.clientWidth+1&&a.getBoundingClientRect().width>=44)})()`));
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await e(`document.querySelector('[data-page-link=next]').focus()`);await key('Enter','Enter',13);await delay(200);
  assert.equal(await e('location.pathname'),prefix+'/pager-demo/page/3/');
  assert(await e(`!!document.querySelector('[aria-current="page"]')`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
 }

 // Reproduce the user's two-page Notes view and keep each number's metrics stable.
 await v(1440,960);const metrics=[];
 for(const [route,name] of [['/notes/','notes-first'],['/notes/page/2/','notes-second']]){
  await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('.pagination').scrollIntoView({block:'center',behavior:'instant'})`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(240);
  metrics.push(await e(`[...document.querySelectorAll('.pagination-pages[data-radius="2"] .page-number')].map(a=>{const s=getComputedStyle(a);return {text:a.textContent,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,width:a.getBoundingClientRect().width}})`));
  await capture(name);
 }
 assert.deepEqual(metrics[0],metrics[1],'Numbers must not change typography or width when current state changes');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS pager: Stellar bar/number/arrow geometry, responsive windows, first/middle/last, palettes, EN/ZH/subpath, native keyboard/AX/no-JS links; uniform selected/unselected font and stable two-page metrics');
},{'/_chinese':'chinese-public','/_off':'icons-off-public','/_zh-off':'chinese-icons-off-public'});
