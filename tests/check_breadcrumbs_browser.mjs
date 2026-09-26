import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese']]){
  await v(width,1000);
  for(const route of ['/notes/package-management/','/handbook/','/handbook/workflows/writing/outline/','/about/','/notes/nested/branch/','/notes/tags/tools/']){
   await n(prefix+route);await e(`Sidera.setColorMode('${mode}')`);await delay(200);
   const state=await e(`(()=>{const nav=document.querySelector('.page-breadcrumbs'),header=nav.parentElement,links=[...nav.querySelectorAll('a')],r=nav.getBoundingClientRect(),h=header.getBoundingClientRect();return{inset:r.left-h.left,padding:parseFloat(getComputedStyle(header).paddingLeft),first:links[0].getBoundingClientRect().left-r.left,fonts:[...new Set(links.map(a=>getComputedStyle(a).fontSize))],overflow:document.documentElement.scrollWidth>innerWidth,aligned:[...nav.querySelectorAll('.breadcrumb-step')].every(step=>Math.abs(step.children[0].getBoundingClientRect().top-step.children[1].getBoundingClientRect().top)<1)}})()`);
   assert(Math.abs(state.inset-state.padding)<1,JSON.stringify({route,width,state}));assert.equal(state.first,0);assert.deepEqual(state.fonts,['14px']);assert(state.aligned);assert(!state.overflow);
   assert(await e(`(()=>{const nav=document.querySelector('.page-breadcrumbs');return !nav.querySelector('[aria-current]') && [...nav.querySelectorAll('a')].every(a=>a.pathname!==location.pathname) && !nav.textContent.trim().endsWith('/')})()`));
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
   const rest=await e(`getComputedStyle(document.querySelector('.page-breadcrumbs a')).color`);
   const target=await e(`(()=>{const r=document.querySelector('.page-breadcrumbs a').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',...target});await delay(220);
   assert.notEqual(await e(`getComputedStyle(document.querySelector('.page-breadcrumbs a')).color`),rest);
   assert.equal(await e(`getComputedStyle(document.querySelector('.page-breadcrumbs a')).textDecorationLine`),'underline');
  }
 }
 await v(1440,1000);await n('/notes/package-management/');
 await e(`document.querySelector('.page-breadcrumbs a').focus()`);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/');
 await n('/handbook/workflows/writing/outline/');await e(`document.querySelector('.page-breadcrumbs a[href="/handbook/workflows/writing/"]').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/handbook/workflows/writing/');
 await v(320,1000);await n('/handbook/workflows/writing/outline/');
 await e(`document.querySelector('.page-breadcrumbs .breadcrumb-step:last-child a').textContent='A very long ancestor label with unbrokenLongTextThatMustStillWrapWithoutOverflow'`);
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/about/',false);
 await e(`document.querySelector('.page-breadcrumbs a').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await v(1440,960);await n('/handbook/workflows/writing/outline/');await e(`Sidera.setColorMode('dark')`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(220);await b.screenshot('breadcrumbs-desktop');
 await v(390,960);await n('/handbook/workflows/writing/outline/');await b.screenshot('breadcrumbs-mobile');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS breadcrumb alignment/wrapping, hover/focus/native navigation, EN/ZH/palettes/mobile/no-JS; no external page requests');
},{'/_chinese':'chinese-public'});
