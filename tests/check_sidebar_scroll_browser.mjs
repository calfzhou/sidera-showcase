// Normal Fieldbook build: hidden rail chrome must not disable native scrolling.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const left='.left-region .site-menu',toc='.right-region [data-toc]';
 const top=s=>e(`document.querySelector(${JSON.stringify(s)}).scrollTop`);
 const box=s=>e(`document.querySelector(${JSON.stringify(s)}).getBoundingClientRect().toJSON()`);
 const hidden=async s=>{
  assert.equal(await e(`getComputedStyle(document.querySelector(${JSON.stringify(s)})).scrollbarWidth`),'none');
  assert.equal(await e(`getComputedStyle(document.querySelector(${JSON.stringify(s)}),'::-webkit-scrollbar').display`),'none');
 };
 const wheel=async s=>{
  const r=await box(s),before=await top(s);
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:r.x+r.width/2,y:r.y+r.height/2,deltaY:100,deltaX:0});await delay(200);
  assert(await top(s)>before,`${s} wheel scroll`);
 };
 // A short viewport makes both real sidebar scrollports overflow without synthetic DOM.
 await v(1440,320);await n('/notes/package-management/');
 for(const s of ['.left-region',left,'.right-region',toc])await hidden(s);
 assert(await e(`document.querySelector('${left}').scrollHeight>document.querySelector('${left}').clientHeight`));
 assert(await e(`document.querySelector('.right-region').scrollHeight>document.querySelector('.right-region').clientHeight`));
 assert.notEqual(await e(`getComputedStyle(document.documentElement).scrollbarWidth`),'none');
 assert.equal(await e(`getComputedStyle(document.documentElement,'::-webkit-scrollbar').width`),'8px');
 await wheel(left);
 await e(`document.querySelector('${left} a').focus();document.querySelector('${left}').scrollTop=0`);
 await key('ArrowDown','ArrowDown',40);await delay(200);assert(await top(left)>0,'keyboard scrolling');
 await e(`document.querySelector('${left} [data-recent] li:last-child a').focus()`);
 assert(await e(`(()=>{const link=document.activeElement.getBoundingClientRect(),port=document.querySelector('${left}').getBoundingClientRect();return link.top>=port.top&&link.bottom<=port.bottom})()`),'focus reveals offscreen navigation');
 // The TOC has its own bounded scrollport; the surrounding right rail also scrolls.
 await v(1440,260);await n('/notes/package-management/');await wheel(toc);
 await e(`document.querySelector('.right-region .toc-top').focus()`);assert(await top('.right-region')>0,'right-rail focus reveal');
 // A compact visual check at an ordinary short desktop height.
 await v(1440,620);await n('/journal/');await wheel(left);
 const r=await box('.left-region');const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1.5}});
 await writeFile(resolve(b.run,'sidebar-scroll.png'),Buffer.from(data,'base64'));
 // Drawer outer ports and nested menu ports use the same hidden chrome; touch still scrolls.
 await v(390,540);await n('/notes/package-management/');await e(`document.querySelector('[data-region="left"]').click()`);await delay(430);
 await hidden('.left-region');await hidden(left);await wheel(left);
 await e(`document.querySelector('${left}').scrollTop=0`);
 await call('Emulation.setTouchEmulationEnabled',{enabled:true});
 const t=await box(left);await call('Input.synthesizeScrollGesture',{x:t.x+t.width/2,y:t.bottom-20,yDistance:-100,gestureSourceType:'touch',speed:300});await delay(250);
 assert(await top(left)>0,'emulated touch scroll');
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});await key('Escape','Escape',27);
 await e(`document.querySelector('[data-region="right"]').click()`);await delay(430);await hidden('.right-region');await hidden(toc);
 await v(1440,320);await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/package-management/',false);await hidden(left);await wheel(left);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS hidden sidebar/drawer/TOC scrollbars; native wheel, keyboard, focus reveal, emulated touch and no-JS scrolling; document scrollbar retained');
});
