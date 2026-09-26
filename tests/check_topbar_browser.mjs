// Local sticky-surface checks: ordinary solid card -> pinned layered glass -> solid reset.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const surface=()=>e(`(()=>{const r=document.querySelector('.top-region'),bar=document.querySelector('.collection-nav-surface'),a=bar.querySelector('[aria-current]'),s=getComputedStyle(bar),before=getComputedStyle(bar,'::before'),after=getComputedStyle(bar,'::after'),rect=bar.getBoundingClientRect();return{stuck:r.classList.contains('is-stuck'),top:r.getBoundingClientRect().top,inset:parseFloat(getComputedStyle(r).top),width:rect.width,height:rect.height,bg:s.backgroundColor,before:before.backdropFilter,after:after.backdropFilter,edge:after.boxShadow,mask:after.maskImage,events:before.pointerEvents,fill:before.backgroundColor,selected:a.textContent,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese']]){
  await v(width,960);await n(prefix+'/journal/');await e(`Sidera.setColorMode('${mode}');window.scrollTo({top:0,behavior:'instant'})`);await delay(150);
  const rest=await surface();assert(!rest.stuck&&!rest.overflow);assert.notEqual(rest.bg,'rgba(0, 0, 0, 0)');assert.equal(rest.before,'none');
  await e(`window.scrollTo({top:1,behavior:'instant'})`);await delay(70);assert(!(await surface()).stuck);
  await e(`window.scrollTo({top:260,behavior:'instant'})`);await delay(150);
  const stuck=await surface();assert(stuck.stuck&&!stuck.overflow);assert(Math.abs(stuck.top-stuck.inset)<=2);assert.equal(stuck.width,rest.width);assert.equal(stuck.height,rest.height);assert.equal(stuck.selected,rest.selected);
  assert.equal(stuck.bg,'rgba(0, 0, 0, 0)');assert(stuck.before.includes('8px'));assert(stuck.after.includes('16px')&&stuck.after.includes('saturate(3)'));assert.notEqual(stuck.edge,'none');assert.notEqual(stuck.mask,'none');assert.equal(stuck.events,'none');
  assert.equal(stuck.fill,mode==='dark'?'rgba(255, 255, 255, 0.2)':'rgba(255, 255, 255, 0.3)');
  // Resize/pageshow hooks recover from stale state without needing another scroll event.
  await e(`document.querySelector('.top-region').classList.remove('is-stuck');window.dispatchEvent(new Event('pageshow'))`);assert((await surface()).stuck);
  await e(`document.querySelector('.top-region').classList.remove('is-stuck');window.visualViewport.dispatchEvent(new Event('resize'))`);assert((await surface()).stuck);
  await e(`window.scrollTo({top:0,behavior:'instant'})`);await delay(100);assert(!(await surface()).stuck);
 }
 await v(1440,900);await n('/journal/');await e(`Sidera.setColorMode('dark')`);await delay(240);
 async function capture(name){const r=await e(`(()=>{const b=document.querySelector('.collection-nav-surface').getBoundingClientRect();return{x:b.x+scrollX-4,y:b.y+scrollY-4,width:b.width+8,height:160}})()`);const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...r,scale:1}});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));}
 await capture('topbar-rest');await e(`window.scrollTo({top:190,behavior:'instant'})`);await delay(180);await capture('topbar-stuck');
 // Both pseudo-layers must be pointer transparent: click a real tab through the glass.
 const box=await e(`document.querySelector('.collection-nav-tabs a[href="/journal/archives/"]').getBoundingClientRect().toJSON()`);
 for(const type of ['mousePressed','mouseReleased'])await call('Input.dispatchMouseEvent',{type,x:box.x+15,y:box.y+box.height/2,button:'left',clickCount:1});
 await delay(150);assert.equal(await e('location.pathname'),'/journal/archives/');
 await v(320,800);await n('/journal/');await e(`window.scrollTo({top:260,behavior:'instant'});document.querySelector('.collection-nav-tabs a:last-child').focus()`);await delay(180);
 assert(await e(`(()=>{const nav=document.querySelector('.collection-nav-tabs'),r=nav.getBoundingClientRect(),a=document.activeElement.getBoundingClientRect();return a.right<=r.right+1&&a.left>=r.left-1&&getComputedStyle(document.activeElement).outlineStyle!=='none'})()`));
 // Scrollable links do not drag the glass background with them.
 assert.equal(await e(`getComputedStyle(document.querySelector('.collection-nav-surface'),'::before').left`),'0px');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await e(`window.scrollTo({top:0,behavior:'instant'})`);await delay(100);assert(!(await surface()).stuck);
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/journal/',false);await e(`window.scrollTo({top:260,behavior:'instant'})`);await delay(80);assert(!(await surface()).stuck);assert.notEqual((await surface()).bg,'rgba(0, 0, 0, 0)');
 await e(`document.querySelector('.collection-nav-tabs a[href="/journal/tags/"]').focus()`);await key('Enter','Enter',13);await delay(140);assert.equal(await e('location.pathname'),'/journal/tags/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS top bar: solid rest/layered pinned glass, threshold/reset/pageshow/viewport, stable geometry, native pointer/keyboard tabs, mobile overflow isolation, palettes/EN/ZH/reduced-motion/no-JS');
},{'/_chinese':'chinese-public'});
