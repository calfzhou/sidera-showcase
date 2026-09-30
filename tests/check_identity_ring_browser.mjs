// Painted-pixel regression: transparent logos must not expose a rainbow disk.
// Isolated repository harness only; no provider requests or source-art changes.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay,key}=b;
 const opaque='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" fill="#73868c"/></svg>');
 const cases=[['svg','/images/sidera-parallax-circle.svg'],['png','/images/sidera-parallax-32.png'],['opaque',opaque]];
 async function pixels(selector){
  const r=await e(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
  const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}});
  return e(`(async()=>{const i=new Image();i.src='data:image/png;base64,${data}';await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const data=[...ctx.getImageData(0,0,i.width,i.height).data];ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(document.querySelector(${JSON.stringify(selector)}+' img'),2,2,44,44);return {width:i.width,height:i.height,data,logo:[...ctx.getImageData(0,0,i.width,i.height).data]}})()`);
 }
 function checkPixels(before,after,label){
  assert.equal(before.width,48);assert.equal(before.height,48);
  let innerMax=0,ringChanged=0,interiorSamples=0;
  for(let y=0;y<48;y++)for(let x=0;x<48;x++){
   const radius=Math.hypot(x+.5-24,y+.5-24),offset=(y*48+x)*4;
   const delta=Math.max(...[0,1,2].map(c=>Math.abs(before.data[offset+c]-after.data[offset+c])));
   // Animated compositing can rasterize artwork edges differently. Compare
   // genuinely transparent/solid interiors, not partially antialiased contours.
   const alpha=before.logo[offset+3];
   if(radius<20&&(alpha===0||alpha===255)){
    let uniform=true;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(before.logo[((y+dy)*48+x+dx)*4+3]!==alpha)uniform=false;
    if(uniform){interiorSamples++;innerMax=Math.max(innerMax,delta);}
   }
   if(radius>22.5&&radius<23.5&&delta>20)ringChanged++;
  }
  assert(interiorSamples>200,`${label}: insufficient interior samples`);
  assert(innerMax<=2,`${label}: hover changed interior pixels by ${innerMax} (rainbow plate)`);
  assert(ringChanged>40,`${label}: missing visible thin rainbow ring (${ringChanged} pixels)`);
 }
 for(const [width,mode] of [[1440,'dark'],[390,'light']]){
  await v(width,844);await n('/notes/');await e(`Sidera.setColorMode('${mode}')`);await delay(450);
  const selector=(width===390?'.mobile-brand':'.left-region')+' .identity-avatar';
  for(const [kind,src] of cases){
   await e(`(async()=>{const i=document.querySelector(${JSON.stringify(selector)}+' img');i.src=${JSON.stringify(src)};await i.decode();document.activeElement.blur()})()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-10,y:700});await delay(260);
   const before=await pixels(selector);
   const r=await e(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().toJSON()`);
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+24,y:r.y+24});await delay(260);
   checkPixels(before,await pixels(selector),`${mode}/${kind}/hover`);
   if(kind==='svg')await b.screenshot(`ring-${mode}`);
   // Focus activates the same masked layer without changing native target behavior.
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:width-10,y:700});
   await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await key('Tab','Tab',9);
   await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await delay(260);
   checkPixels(before,await pixels(selector),`${mode}/${kind}/focus`);
  }
 }
 // Static reduced-motion and scriptless rendering retain the hollow ring.
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(1440,900);await n('/notes/',false);
 const selector='.left-region .identity-avatar';
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1400,y:700});await delay(260);const before=await pixels(selector);
 const r=await e(`document.querySelector('${selector}').getBoundingClientRect().toJSON()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+24,y:r.y+24});await delay(260);
 checkPixels(before,await pixels(selector),'reduced-motion/no-JS');
 assert.equal(await e(`getComputedStyle(document.querySelector('${selector}'),'::before').animationName`),'none');
 await e(`document.querySelector('${selector}').focus()`);await key('Enter','Enter',13);await delay(200);assert.equal(await e('location.pathname'),'/');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 assert(b.requests.every(u=>u.startsWith(b.origin+'/')||u.startsWith('data:image/')));
 console.log('PASS painted hollow ring: transparent SVG/PNG and opaque image, dark/light, desktop/mobile, hover/keyboard focus, reduced motion/no-JS/native home; interior pixels unchanged');
});
