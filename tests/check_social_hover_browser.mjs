// Narrow footer-presentation check using a fresh owned Chrome/HTTP instance.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const red='rgb(244, 67, 54)';
 for(const [mode,width,prefix] of [['dark',1440,''],['light',1440,''],['light',390,''],['dark',1440,'/_compact']]){
  await v(width,844);await n(prefix+(prefix?'/about/':'/notes/'));await e(`Sidera.setColorMode('${mode}')`);await delay(250);
  if(width===390){await e(`document.querySelector('[data-region=left]').click()`);await delay(300);}
  const footer=prefix?' .compact-header .sidebar-footer':'.left-region .sidebar-footer';
  const count=await e(`document.querySelectorAll('${footer} .social-link').length`);assert.equal(count,3);
  for(let i=0;i<count;i++){
   const selector=`${footer} .social-link:nth-child(${i+1})`;
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-5,y:10});await e('document.activeElement.blur()');await delay(250);
   const baseline=await e(`getComputedStyle(document.querySelector('${selector} svg')).color`);assert.notEqual(baseline,red);
   const point=await e(`(()=>{const a=document.querySelector('${selector}');a.scrollIntoView({block:'nearest'});const r=a.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(250);
   assert.deepEqual(await e(`(()=>{const a=document.querySelector('${selector}');return[getComputedStyle(a).color,getComputedStyle(a.querySelector('svg')).color]})()`),[red,red]);
   assert(await e(`[...document.querySelectorAll('${footer} .social-link')].filter((a,j)=>j!==${i}).every(a=>getComputedStyle(a.querySelector('svg')).color!==${JSON.stringify(red)})`));
   if(width===1440&&mode==='dark'&&!prefix&&i===0){
    const r=await e(`document.querySelector('${footer}').getBoundingClientRect().toJSON()`);
    const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:2}});
    await writeFile(resolve(b.run,'footer-hover-red.png'),Buffer.from(data,'base64'));
   }
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-5,y:10});await delay(250);
   assert.equal(await e(`getComputedStyle(document.querySelector('${selector} svg')).color`),baseline);
   await key('Tab','Tab',9);await e(`document.querySelector('${selector}').focus()`);await delay(250);
   assert(await e(`document.querySelector('${selector}').matches(':focus-visible')`));
   assert.equal(await e(`getComputedStyle(document.querySelector('${selector} svg')).color`),red);
  }
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(1440,844);await n('/notes/',false);
 const selector='.left-region .sidebar-footer .social-link';
 await key('Tab','Tab',9);await e(`document.querySelector('${selector}').focus()`);await delay(250);
 assert.equal(await e(`getComputedStyle(document.querySelector('${selector} svg')).color`),red);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS footer red hover/focus: all three controls, dark/light, reset/sibling isolation, mobile/compact and no-JS; inherited SVG paint');
},{'/_compact':'compact-public'});
