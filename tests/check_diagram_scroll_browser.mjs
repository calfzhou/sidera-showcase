// Real wheel input, not synthetic wheel listeners. One local browser; HTTPS blocked.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay,key}=b;
 const wait=async x=>{for(let i=0;i<400;i++){if(await e(x))return;await delay(50);}assert.fail(x)};
 const ready=async selector=>{await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(100);await wait(`document.querySelector(${JSON.stringify(selector)}).dataset.state==='ready'`)};
 const state=selector=>e(`(()=>{const v=document.querySelector(${JSON.stringify(selector)}),r=v.getBoundingClientRect(),i=v.querySelector('img').getBoundingClientRect();return {page:scrollY,top:v.scrollTop,h:v.clientHeight,sh:v.scrollHeight,x:Math.max(r.left+8,i.left+8),y:Math.max(r.top+8,Math.min(i.top+20,r.bottom-8))}})()`);
 const wheel=async(selector,delta)=>{const p=await state(selector);await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:p.x,y:p.y,deltaX:0,deltaY:delta});await delay(300);return state(selector)};
 const reset=async selector=>{await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(700)};
 await v(1400,900);await n('/handbook/reference/diagrams/');
 for(const kind of ['mermaid','drawio']){
  const figure=`[data-sidera-diagram="${kind}"]`,view=figure+' .diagram-view';
  await ready(figure);await reset(view);const before=await state(view);const after=await wheel(view,180);
  assert(after.page>before.page+100,JSON.stringify({kind,before,after}));
  assert.equal(after.top,before.top,'A fitting diagram must not wobble instead of page scrolling');
  await reset(view);const up=await state(view),back=await wheel(view,-100);
  assert(back.page<up.page-10,JSON.stringify({kind,up,back}));
  // A one-pixel clipping edge must not trap an ongoing wheel sequence at its boundary.
  await e(`document.querySelector(${JSON.stringify(view)}).style.maxHeight=(document.querySelector(${JSON.stringify(view)}).querySelector('img').getBoundingClientRect().height-1)+'px'`);
  await reset(view);const small=await state(view);await wheel(view,100);const chained=await wheel(view,100);
  assert(chained.page>small.page+50,JSON.stringify({kind,small,chained}));
  await e(`document.querySelector(${JSON.stringify(view)}).style.maxHeight=''`);
 }
 // A tall, zoomed diagram still scrolls locally, then hands off at either edge.
 await e(`document.querySelector('.content-folding').open=true`);
 const fig='.content-folding [data-sidera-diagram="mermaid"]',view=fig+' .diagram-view';
 await ready(fig);
 await e(`for(let i=0;i<6;i++)document.querySelector('${fig} [data-diagram-action="in"]').click()`);await reset(view);
 let before=await state(view);assert(before.sh>before.h+200);
 let after=await wheel(view,120);assert(after.top>before.top+80);assert(Math.abs(after.page-before.page)<2);
 await e(`document.querySelector('${view}').scrollTop=100000`);await reset(view);
 before=await state(view);after=await wheel(view,150);assert(after.page>before.page+100);
 await e(`document.querySelector('${view}').scrollTop=0`);await reset(view);
 before=await state(view);after=await wheel(view,-100);assert(after.page<before.page-10);
 // Modal keeps its original scroll containment and locked background.
 await e(`document.querySelector('${fig} [data-diagram-action="expand"]').click();for(let i=0;i<3;i++)document.querySelector('.diagram-dialog [data-diagram-action="in"]').click()`);await delay(200);
 const modal='.diagram-dialog .diagram-view';before=await state(modal);after=await wheel(modal,150);
 assert(after.top>before.top);assert.equal(after.page,before.page);
 await e(`document.querySelector('${modal}').scrollTop=100000`);await delay(700);
 before=await state(modal);after=await wheel(modal,150);assert.equal(after.page,before.page);
 await key('Escape','Escape',27);await delay(100);
 assert(!await e(`document.documentElement.classList.contains('diagram-modal-open')`));
 assert.equal(b.errors.length,0);
 console.log('PASS wheel chaining: fitting Mermaid/drawio, both directions, one-pixel edge, real tall overflow/boundaries; modal background remains locked');
});
