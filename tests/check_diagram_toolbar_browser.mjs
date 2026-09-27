// Toolbar floats above desktop diagrams without a reserved row; touch/modal stay clear.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const wait=async x=>{for(let i=0;i<400;i++){if(await e(x))return;await delay(50);}assert.fail(x)};
 const ready=async selector=>{await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(100);await wait(`document.querySelector(${JSON.stringify(selector)}).dataset.state==='ready'`)};
 const geometry=selector=>e(`(()=>{const f=document.querySelector(${JSON.stringify(selector)}),c=f.querySelector('.diagram-canvas'),t=c.querySelector('.diagram-tools'),v=c.querySelector('.diagram-view'),i=v.querySelector('img'),r=t.getBoundingClientRect(),vr=v.getBoundingClientRect(),ir=i.getBoundingClientRect(),cr=c.getBoundingClientRect();return {toolbarBottom:r.bottom,toolbarLeft:r.left,toolbarRight:r.right,imageTop:ir.top,viewTop:vr.top,canvasTop:cr.top,canvasLeft:cr.left,canvasRight:cr.right,domOrder:c.firstElementChild===t,opacity:getComputedStyle(t).opacity}})()`);
 for(const width of [1400,390]){
  await v(width,900);await n('/handbook/reference/diagrams/');await e(`Sidera.setColorMode('${width===1400?'dark':'light'}')`);
  for(const kind of ['mermaid','drawio']){
   const selector=`[data-sidera-diagram="${kind}"]`;await ready(selector);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await e('document.activeElement.blur()');await delay(200);
   const hidden=await geometry(selector);assert.equal(hidden.opacity,'0');
   await e(`document.querySelector(${JSON.stringify(selector)}).querySelector('[data-diagram-action="in"]').focus()`);await wait(`getComputedStyle(document.querySelector(${JSON.stringify(selector)}).querySelector('.diagram-tools')).opacity==='1'`);
   const shown=await geometry(selector);assert.equal(shown.opacity,'1',JSON.stringify({width,kind,shown,focus:await e(`({active:document.activeElement.outerHTML.slice(0,180),focused:document.querySelector(${JSON.stringify(selector)}).querySelector('.diagram-canvas').matches(':focus-within'),state:document.querySelector(${JSON.stringify(selector)}).dataset.state})`)}));assert(shown.domOrder);
   assert(shown.toolbarBottom<=shown.imageTop-3);assert(shown.toolbarLeft>=shown.canvasLeft-.5&&shown.toolbarRight<=shown.canvasRight+.5);
   assert.equal(shown.imageTop,hidden.imageTop,'Reveal must not move the image');assert(Math.abs(shown.viewTop-shown.canvasTop)<1,'No reserved desktop row');
   // Crossing the gap onto the floating panel must not dismiss it.
   const bridge=await e(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).querySelector('.diagram-tools').getBoundingClientRect();return {x:r.left+r.width/2,y:r.bottom+2,top:r.top+r.height/2}})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:bridge.x,y:shown.imageTop+2});
   await e('document.activeElement.blur()');await delay(180);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:bridge.x,y:bridge.y});await delay(180);
   assert.equal((await geometry(selector)).opacity,'1');
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:bridge.x,y:bridge.top});await delay(180);
   assert.equal((await geometry(selector)).opacity,'1');
   await e(`document.querySelector(${JSON.stringify(selector)}).querySelector('[data-diagram-action="in"]').focus()`);
   await key('Enter','Enter',13);await delay(100);const zoomed=await geometry(selector);assert(zoomed.toolbarBottom<=zoomed.imageTop-3);
   await e(`document.querySelector(${JSON.stringify(selector)}).querySelector('[data-diagram-action="fit"]').click()`);
  }
 }
 // A floating toolbar must remain hit-testable in an inverted desktop grid.
 await v(1200,900);await n('/handbook/reference/diagrams/');await e(`document.querySelector('.content-folding').open=true;Sidera.setColorMode('dark')`);
 await ready('.content-folding [data-sidera-diagram="drawio"]');
 await e(`document.querySelector('.content-folding [data-sidera-diagram="drawio"] [data-diagram-action="in"]').focus()`);
 await wait(`getComputedStyle(document.querySelector('.content-folding [data-sidera-diagram="drawio"] .diagram-tools')).opacity==='1'`);
 assert(await e(`(()=>{const t=document.querySelector('.content-folding [data-sidera-diagram="drawio"] .diagram-tools'),r=t.getBoundingClientRect();return document.elementFromPoint(r.left+10,r.top+10)?.closest('.diagram-tools')===t})()`));
 // Touch controls are also ABOVE, always visible and clear of the graphic.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(320,850);await n('/handbook/reference/diagrams/');await ready('[data-sidera-diagram="mermaid"]');
 let g=await geometry('[data-sidera-diagram="mermaid"]');assert.equal(g.opacity,'1');assert(g.toolbarBottom<=g.imageTop-3);
 await e(`document.querySelector('.content-folding').open=true`);
 const nested='.content-folding [data-sidera-diagram="drawio"]';await ready(nested);g=await geometry(nested);
 assert(g.toolbarBottom<=g.imageTop-3&&g.toolbarLeft>=g.canvasLeft-.5&&g.toolbarRight<=g.canvasRight+.5);
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await e(`document.querySelector('${nested} [data-diagram-action="expand"]').click()`);await delay(150);
 assert(await e(`(()=>{const d=document.querySelector('dialog'),t=d.querySelector('.diagram-tools').getBoundingClientRect(),v=d.querySelector('.diagram-view').getBoundingClientRect();return d.open&&t.bottom<=v.top&&t.left>=d.getBoundingClientRect().left})()`));
 await key('Escape','Escape',27);await delay(100);
 assert(await e(`document.activeElement.matches('[data-diagram-action="expand"]')`));
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await v(1200,850);await n('/handbook/reference/diagrams/');await ready('[data-sidera-diagram="mermaid"]');
 await e(`document.querySelector('[data-diagram-action="in"]').focus()`);await delay(200);await b.screenshot('toolbar-above');
 assert.equal(b.errors.length,0);
 console.log('PASS floating toolbar above image: original desktop spacing, no hover reflow, continuous hover/hit testing, narrow cells, touch/modal rows and focus return');
});
