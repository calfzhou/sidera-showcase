// Source-led date reveal, using only the isolated repository-local browser.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const visible=()=>e(`getComputedStyle(document.querySelector('.date-secondary')).visibility`);
 await v(1440,960);await n('/date-probe/both/');
 assert(await e(`matchMedia('(hover: hover)').matches`),'Desktop harness must provide hover');
 for(const [path,first] of [['/date-probe/both/','published'],['/notes/package-management/','updated'],['/_chinese/date-probe/both/','published']]){
  await n(path);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
  assert.equal(await visible(),'hidden');assert.equal(await e(`document.querySelector('.date-primary time').className`),first);
  assert.equal(await e(`document.querySelectorAll('.article-footer time').length`),0);
  const before=await e(`document.querySelector('.prose').getBoundingClientRect().top`);
  const rect=await e(`document.querySelector('.article-dates').getBoundingClientRect().toJSON()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+15,y:rect.y+rect.height/2});await delay(50);assert.equal(await visible(),'visible');
  assert.equal(await e(`document.querySelector('.prose').getBoundingClientRect().top`),before);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});assert.equal(await visible(),'hidden');
  await e(`document.querySelector('.article-dates').focus()`);assert.equal(await visible(),'visible');
  assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
  const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.name?.value?.includes(path.startsWith('/_chinese')?'更新于':'Updated')));
  for(let i=0;i<5 && await e(`document.querySelector('.article-dates').contains(document.activeElement)`);i++)await key('Tab','Tab',9);assert.equal(await visible(),'hidden');
 }
 async function capture(path,name){await n(path);await e(`Sidera.setColorMode('dark')`);const row=await e(`document.querySelector('.article-dates').getBoundingClientRect().toJSON()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:row.x+12,y:row.y+row.height/2});await delay(240);const r=await e(`(()=>{const r=document.querySelector('.article-header').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);const {data}=await call('Page.captureScreenshot',{format:'png',clip:{...r,scale:1},captureBeyondViewport:true});await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));}
 await capture('/date-probe/both/','published-first');await capture('/notes/package-management/','updated-first');
 await v(320,844);await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await n('/notes/package-management/');
 assert(await e(`matchMedia('(hover: none)').matches`),'Touch fallback media must be exercised');assert.equal(await visible(),'visible');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/_chinese/date-probe/both/',false);assert.equal(await visible(),'visible');
 await call('Emulation.setScriptExecutionDisabled',{value:false});await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await v(1440,960);await n('/date-probe/hidden/');assert.equal(await e(`document.querySelectorAll('.article-dates time').length`),1);assert(!await e(`document.querySelector('.article-dates').hasAttribute('tabindex')`));
 await n('/date-probe/none/');assert.equal(await e(`document.querySelectorAll('.article-dates').length`),0);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS article dates: hover/focus without reflow, source order, Updated wording, no footer repeat, equal/missing/disabled, EN/ZH, touch/mobile/no-JS and native timestamps');
},{'/_chinese':'chinese-public'});
