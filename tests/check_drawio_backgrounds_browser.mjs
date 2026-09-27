// One isolated browser; test generated SVG alpha and source colors, no external media.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runBrowser} from './browser.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,delay}=b;
 const wait=async x=>{for(let i=0;i<400;i++){if(await e(x))return;await delay(50);}assert.fail(x)};
 await v(1200,900);await n('/handbook/reference/diagrams/');
 await e(`document.querySelector('[data-sidera-diagram="drawio"]').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('[data-sidera-diagram="drawio"]').dataset.state==='ready'`);
 // The live demonstration retains the actual source bytes and a transparent SVG canvas.
 const live=await e(`fetch(document.querySelector('[data-sidera-diagram="drawio"] img').src).then(r=>r.text()).then(s=>{const svg=new DOMParser().parseFromString(s,'image/svg+xml').documentElement;return {bg:svg.style.backgroundColor,rect:[...svg.children].some(n=>n.localName==='rect'&&n.getAttribute('width')==='100%')}})`);
 assert(!live.rect);assert.equal(live.bg,'transparent');
 assert.equal(await (await fetch(b.origin+'/handbook/reference/diagrams/flow.drawio')).text(),await readFile(resolve(root,'content/handbook/reference/diagrams/flow.drawio'),'utf8'));
 let id=0;
 const probe=async(background,palette)=>{
  const attr=background===null?'':` background="${background}"`;
  const source=`<mxfile><diagram><mxGraphModel${attr}><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="shape" value="" style="fillColor=#ff0000;strokeColor=#0000ff;html=0;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="80" height="50" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>`;
  const request='background-'+(++id);
  return e(`(async()=>{
   const frame=[...document.querySelectorAll('.diagram-renderer')].find(f=>f.src.includes('drawio-'));
   const result=await new Promise(resolve=>{const timer=setTimeout(()=>{removeEventListener('message',listener);resolve({error:true})},15000);function listener(event){if(event.source===frame.contentWindow&&event.data?.request===${JSON.stringify(request)}){clearTimeout(timer);removeEventListener('message',listener);resolve(event.data)}}addEventListener('message',listener);frame.contentWindow.postMessage({type:'render',request:${JSON.stringify(request)},source:${JSON.stringify(source)},palette:${JSON.stringify(palette)}},'*')});
   if(result.error)return {error:true};
   const svg=new DOMParser().parseFromString(result.svg,'image/svg+xml').documentElement;
   const url=URL.createObjectURL(new Blob([result.svg],{type:'image/svg+xml'}));
   try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {corner:[...ctx.getImageData(0,0,1,1).data],shape:[...ctx.getImageData(25,25,1,1).data],backgroundRect:[...svg.children].some(n=>n.localName==='rect'&&n.getAttribute('width')==='100%'),fill:svg.querySelector('[data-cell-id="shape"] rect').getAttribute('fill'),stroke:svg.querySelector('[data-cell-id="shape"] rect').getAttribute('stroke'),scheme:svg.style.colorScheme}}finally{URL.revokeObjectURL(url)}
  })()`);
 };
 const results=[];
 for(const palette of ['light','dark']){
  for(const background of [null,'','#ffffff','#dceeff','none','transparent',null]){
   const r=await probe(background,palette);assert(!r.error,JSON.stringify({background,palette,r}));
   const clear=background===null||background===''||background==='none'||background==='transparent';
   assert.equal(r.backgroundRect,!clear);assert.equal(r.corner[3],clear?0:255);
   assert.equal(r.shape[3],255,'Canvas transparency must not erase shape fills');
   assert.equal(r.fill,'#ff0000');assert.equal(r.stroke,'#0000ff');assert.equal(r.scheme,palette);
   if(background==='#ffffff')assert.deepEqual(r.corner,palette==='light'?[255,255,255,255]:[18,18,18,255]);
   if(background==='#dceeff'&&palette==='light')assert.deepEqual(r.corner,[220,238,255,255]);
   results.push({palette,background,corner:r.corner});
  }
 }
 assert.notDeepEqual(results.find(r=>r.palette==='dark'&&r.background==='#dceeff').corner,[220,238,255,255],'Explicit colors retain native dark adaptation');
 // Inspect actual transparency over the page, in both palettes; img/context-menu model stays.
 await e(`Sidera.setColorMode('light')`);await delay(300);await wait(`document.querySelector('[data-sidera-diagram="drawio"]').dataset.state==='ready'`);
 await b.screenshot('drawio-transparent');
 await e(`Sidera.setColorMode('dark')`);await delay(300);await wait(`document.querySelector('[data-sidera-diagram="drawio"]').dataset.state==='ready'`);
 assert(await e(`document.querySelector('[data-sidera-diagram="drawio"] img').src.startsWith('blob:')`));
 assert.equal(b.errors.length,0);
 console.log('PASS 14 sequential exports: missing/empty/none/transparent alpha, explicit white/color with theme adaptation, unchanged fill/stroke, no background state leakage, native source bytes, SVG img retained');
});
