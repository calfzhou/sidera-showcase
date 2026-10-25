// Real showcase folding chrome; own browser/profile and no provider interaction.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,call,viewport:v,navigate:n,key}=b;
 const selector='#fold-comparison',summary=selector+'>summary';
 const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const a of document.getAnimations())if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()})()`);
 const check=async(open,radius=12,target=selector)=>{
  const result=await e(`(()=>{const d=document.querySelector('${target}'),s=d.querySelector(':scope > summary'),outer=getComputedStyle(d),inner=getComputedStyle(s),r=s.getBoundingClientRect();return {open:d.open,outer:parseFloat(outer.borderTopLeftRadius),border:parseFloat(outer.borderTopWidth),corners:['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k=>parseFloat(inner[k])),overflow:[outer.overflowX,outer.overflowY],clip:inner.clipPath,bg:inner.backgroundColor,outline:inner.outlineStyle,width:r.width,height:r.height}})()`);
  assert.equal(result.open,open);assert.equal(result.outer,radius);assert.equal(result.border,1);
  const inside=Math.max(0,radius-1);assert.deepEqual(result.corners,open?[inside,inside,0,0]:[inside,inside,inside,inside]);
  assert.deepEqual(result.overflow,['visible','visible']);assert.equal(result.clip,'none');return result;
 };
 const hover=async()=>{
  for(let attempt=0;attempt<30;attempt++){
   const p=await e(`(()=>{document.querySelector('${summary}').scrollIntoView({block:'center',behavior:'instant'});const r=document.querySelector('${summary}').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await settle();
   await b.delay(100);
   if(await e(`document.querySelector('${summary}').matches(':hover')&&getComputedStyle(document.querySelector('${summary}')).backgroundColor!=='rgba(0, 0, 0, 0)'`))return;
   await b.delay(50);
  }
  assert.fail('Summary hover did not settle');
 };

 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const results=[];
 for(const width of [1440,390])for(const mode of ['light','dark']){
  await v(width,1000);await n('/sidera-showcase/handbook/reference/content-components/');await e(`Sidera.setColorMode('${mode}')`);await call('Page.bringToFront');await settle();
  const before=await check(false);await hover();const hovered=await check(false);
  assert.notEqual(hovered.bg,'rgba(0, 0, 0, 0)');assert.equal(hovered.width,before.width);assert.equal(hovered.height,before.height);
  if(width===1440){await b.delay(100);const clip=await e(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.x+scrollX-8,y:r.y+scrollY-8,width:r.width+16,height:r.height+16,scale:2}})()`);const image=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});await writeFile(resolve(b.run,'folding-hover-'+mode+'.png'),Buffer.from(image.data,'base64'));}
  await key('Tab','Tab',9);await e(`document.querySelector('${summary}').focus()`);await settle();const focused=await check(false);assert.notEqual(focused.outline,'none');
  await key('Enter','Enter',13);await check(true);await hover();await check(true);
  await check(true,12,'#fold-code'); // A codeblock child uses the same header boundary.
  await e(`document.querySelector('${summary}').focus()`);await key('Enter','Enter',13);await check(false);
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  results.push(mode+' @ '+width+': closed/open hover and focus; inner radius fits outer border; no clipping or size change');
 }
 // A shared component radius remains usable through native summary slot inheritance.
 for(const radius of [24,1,0]){
  await e(`document.querySelector('${selector}').style.setProperty('--container-radius','${radius}px')`);await hover();await check(false,radius);
  await e(`document.querySelector('${selector}').open=true`);await check(true,radius);
  await e(`document.querySelector('${selector}').open=false`);
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/sidera-showcase/handbook/reference/content-components/',false);await hover();await check(false);
 await e(`document.querySelector('${summary}').focus()`);await key('Enter','Enter',13);await check(true);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 results.push('Custom/zero radii, native no-JS disclosure and unclipped focus/content');
 await writeFile(resolve(b.run,'folding-corners-results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS '+results.join('; '));
},{'/sidera-showcase':resolve(process.argv[3]||resolve(process.argv[2],'public'))});
