// Native article terms, source-led centered pills; no external browser destinations.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese'],[390,'light','/preview']]){
  await v(width,960);await n(prefix+'/notes/tag-pills/');await e(`Sidera.setColorMode('${mode}')`);await delay(220);
  const state=await e(`(()=>{const row=document.getElementById('assigned-tags'),links=[...row.querySelectorAll('a')],r=row.getBoundingClientRect(),a=links[0].getBoundingClientRect(),z=links.at(-1).getBoundingClientRect();return{justify:getComputedStyle(row).justifyContent,center:Math.abs((a.left+z.right)/2-(r.left+r.right)/2),radius:getComputedStyle(links[0]).borderRadius,font:getComputedStyle(links[0]).fontSize,icon:getComputedStyle(links[0].querySelector('svg')).opacity,hub:document.querySelectorAll('.article-tag-hub').length,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
  assert.equal(state.justify,'center');assert(state.center<1);assert.equal(state.radius,'999px');assert.equal(state.font,'13px');assert.equal(state.icon,'0.4');assert.equal(state.hub,0);assert(!state.overflow);
 }
 await v(1440,960);await n('/notes/tag-pills/');await e(`Sidera.setColorMode('dark');document.getElementById('assigned-tags').scrollIntoView({block:'center',behavior:'instant'})`);await delay(220);
 const link='#assigned-tags a[href="/notes/tags/it/font/"]';const r=await e(`document.querySelector('${link}').getBoundingClientRect().toJSON()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+r.width/2,y:r.y+r.height/2});await delay(220);
 assert.equal(await e(`getComputedStyle(document.querySelector('${link} svg')).opacity`),'1');
 assert(await e(`getComputedStyle(document.querySelector('${link} svg')).color!==getComputedStyle(document.querySelector('${link}')).color`));
 const rect=await e(`(()=>{const r=document.getElementById('assigned-tags').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:2}});await writeFile(resolve(b.run,'article-tags.png'),Buffer.from(data,'base64'));
 await e(`document.querySelector('${link}').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');await key('Enter','Enter',13);await delay(140);
 assert.equal(await e('location.pathname'),'/notes/tags/it/font/');assert(await e(`!!document.querySelector('#articles .card-title')`));
 await n('/_off/notes/tag-pills/');assert.equal(await e(`document.querySelectorAll('#assigned-tags svg').length`),0);
 await n('/_repeat/notes/tag-pills/');assert.equal(await e(`document.querySelectorAll('[id$="assigned-tags"]').length`),3);
 await v(320,960);await n('/_long/notes/tag-pills/');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await e(`document.documentElement.style.fontSize='36px'`);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/tag-pills/',false);await e(`document.querySelector('#assigned-tags a').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/notes/tags/calf/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS centered article pills, rounded/muted/hover glyph, no hub links, native keyboard destinations, long labels, icons-off/repeats, EN/ZH/palettes/subpath/mobile/no-JS');
},{'/_chinese':'chinese-public','/_off':'icons-off-public','/_repeat':'repeated-public','/_long':'long-public'});
