import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b,rows=[];
 await call('Emulation.setFocusEmulationEnabled',{enabled:true});
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const selectors=['.prose .highlight:has(.lntable)','.prose .highlight > pre','.prose table:not(.lntable)'];
 for(const mode of ['dark','light'])for(const width of [1440,390]){
  await v(width,1000);await n('/handbook/reference/markdown/');await e(`Sidera.setColorMode('${mode}')`);await call('Page.bringToFront');
  for(const selector of selectors){
   await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
   const rest=await e(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});return {width:s.clientWidth,scroll:s.scrollWidth,thickness:s.offsetHeight-s.clientHeight,track:getComputedStyle(s,'::-webkit-scrollbar-track-piece').backgroundColor,thumb:getComputedStyle(s,'::-webkit-scrollbar-thumb').backgroundColor,size:getComputedStyle(s,'::-webkit-scrollbar').height,radius:getComputedStyle(s,'::-webkit-scrollbar-thumb').borderRadius,standard:getComputedStyle(s).scrollbarWidth}})()`);
   assert(rest.scroll>rest.width);assert.equal(rest.size,'4px');assert.equal(rest.thickness,4);assert.equal(rest.radius,'12px');assert.equal(rest.track,'rgba(0, 0, 0, 0)');assert.equal(rest.thumb,'rgba(0, 0, 0, 0)');assert.equal(rest.standard,'auto');
   const pt=await e(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+8,y:r.y+8}})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pt});await delay(80);
   assert(await e(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).getPropertyValue('--scrollbar-thumb').includes('20%')`));
   assert.notEqual(await e(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}),'::-webkit-scrollbar-thumb').backgroundColor`),'rgba(0, 0, 0, 0)');
   await e(`(()=>{const s=document.querySelector(${JSON.stringify(selector)});s.scrollLeft=0;(s.querySelector('.lntd:last-child pre')||s).focus({preventScroll:true})})()`);
   await delay(100);
   for(let i=0;i<4;i++)await key('ArrowRight','ArrowRight',39);await delay(100);
   for(let i=0;i<20 && !await e(`document.querySelector(${JSON.stringify(selector)}).scrollLeft>0`);i++)await delay(50);
   assert(await e(`document.querySelector(${JSON.stringify(selector)}).scrollLeft>0`),await e(`JSON.stringify({selector:${JSON.stringify(selector)},width:innerWidth,focus:document.activeElement.tagName,hasFocus:document.hasFocus(),outer:document.activeElement.outerHTML.slice(0,120),scroll:document.querySelector(${JSON.stringify(selector)}).scrollLeft})`));
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});assert(await e(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}),'::-webkit-scrollbar-thumb').backgroundColor.includes('/ 0.2')`),'Keyboard focus keeps the scrollbar discoverable');
   await e('document.activeElement.blur()');rows.push({mode,width,selector,...rest});
  }
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert.equal(await e(`getComputedStyle(document.querySelector('.left-region')).scrollbarWidth`),'none');
  assert.equal(await e(`getComputedStyle(document.querySelector('[data-toc]')).scrollbarWidth`),'none');
  assert.equal(await e(`getComputedStyle(document.documentElement,'::-webkit-scrollbar').width`),'8px');
 }
 // Vertical native overflow in the existing manual-copy field uses the same narrow track.
 await e(`(()=>{const t=document.querySelector('.code-copy-fallback');t.hidden=false;t.value='A long manual-copy field\\n'.repeat(80);t.focus({preventScroll:true});t.scrollTop=100})()`);
 assert(await e(`(()=>{const t=document.querySelector('.code-copy-fallback');return t.scrollTop===100&&Math.abs(t.offsetWidth-t.clientWidth-6)<1&&getComputedStyle(t,'::-webkit-scrollbar').width==='4px'})()`));
 // Native scrolling works without JS; touch thumbs are not hover-dependent.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(390,1000);await n('/handbook/reference/markdown/');
 assert(await e(`getComputedStyle(document.querySelector('.highlight'),'::-webkit-scrollbar-thumb').backgroundColor.includes('/ 0.2')`));
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/handbook/reference/markdown/',false);
 await e(`document.querySelector('.highlight').scrollLeft=120`);assert(await e(`document.querySelector('.highlight').scrollLeft===120`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Opt out of custom colors/geometry in forced-colors mode.
 await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
 assert.equal(await e(`getComputedStyle(document.querySelector('.highlight'),'::-webkit-scrollbar').height`),'auto');
 await call('Emulation.setEmulatedMedia',{features:[]});
 await v(1050,720);await n('/handbook/reference/markdown/');await e(`Sidera.setColorMode('dark');document.querySelector('.code-block').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('.highlight').scrollLeft=250`);
 const rect=await e(`(()=>{const r=document.querySelector('.highlight').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+20,y:rect.y+40});await delay(100);
 // Beyond-viewport captures suppress scrollbar painting; capture the visible viewport state.
 const img=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,y:rect.y+await e('scrollY'),scale:1}});await writeFile(b.run+'/content-scrollbar.png',Buffer.from(img.data,'base64'));
 await writeFile(b.run+'/scrollbar-checks.json',JSON.stringify({browser:b.version.Browser,rows},null,2));
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS content scrollbar geometry/colors/hover/keyboard/native scrolling, palettes/mobile/touch/no-JS/forced-colors; document and hidden rails unchanged');
});
