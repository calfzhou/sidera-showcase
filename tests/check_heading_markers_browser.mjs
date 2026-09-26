import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const prefix of ['', '/_chinese'])for(const mode of ['dark','light'])for(const width of [1440,390,320]){
  await v(width,1000);await n(prefix+'/heading-markers/');await e(`Sidera.setColorMode('${mode}')`);
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  for(const level of [2,3,4,5]){
   const s=await e(`(()=>{const h=document.querySelector('.prose h${level}'),a=h.querySelector('.heading-anchor'),r=a.getBoundingClientRect(),t=h.querySelector('.heading-text').getBoundingClientRect(),cs=getComputedStyle(a);return {glyph:a.textContent,gap:t.left-r.right,width:r.width,height:r.height,bodyFont:parseFloat(getComputedStyle(h).fontSize),size:parseFloat(cs.fontSize),radius:cs.borderRadius,decoration:cs.textDecorationLine,href:a.getAttribute('href')}})()`);
   assert.equal(s.glyph,{2:'#',3:'=',4:'|',5:':'}[level]);assert(Math.abs(s.gap-8)<1);assert.equal(s.radius,'2px');assert.equal(s.decoration,'none');assert.equal(s.size,s.bodyFont/2);assert(s.height>s.width);
  }
  assert(await e(`!document.querySelector('.prose h1 .heading-anchor,.prose h6 .heading-anchor')`));
  assert.equal(await e(`getComputedStyle(document.querySelector('.site-footer .heading-anchor')).display`),'none');
  assert(await e(`(()=>{const a=document.querySelector('.heading-anchor');return a.getAttribute('aria-label').startsWith(${JSON.stringify(prefix?'链接到标题：':'Link to heading: ')})})()`));
 }
 await v(1440,1000);await n('/heading-markers/');
 const selector='.prose h3 .heading-anchor';
 await e(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'})`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(220);
 const rest=await e(`getComputedStyle(document.querySelector('${selector}')).backgroundColor`);
 const pt=await e(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pt});await delay(250);
 const hover=await e(`getComputedStyle(document.querySelector('${selector}')).backgroundColor`);
 assert.notEqual(rest,hover);assert.equal(hover,'rgb(255, 87, 36)');
 await e(`document.querySelector('${selector}').focus()`);await delay(220);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(400);assert.equal(await e('location.hash'),'#third-level');
 // The marker and existing inline link are separate, not nested anchors.
 await e(`document.querySelector('#explicit .heading-text a').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/about/');
 await n('/heading-markers/');await e(`document.querySelector('[data-toc] a[href="#second-level"]').focus()`);await key('Enter','Enter',13);await delay(400);assert.equal(await e('location.hash'),'#second-level');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(320,1000);await n('/_chinese/heading-markers/',false);
 await e(`document.querySelector('#explicit .heading-anchor').focus()`);await key('Enter','Enter',13);await delay(100);assert.equal(await e('location.hash'),'#explicit');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await v(1440,1000);await n('/heading-markers/');await e(`Sidera.setColorMode('dark');document.querySelector('#second-level').scrollIntoView({behavior:'instant'});document.querySelector('#third-level .heading-anchor').focus()`);await delay(200);await b.screenshot('heading-markers');
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS 12 heading states, source glyph/geometry/hover/focus, native marker/inline/TOC links, EN/ZH/no-JS/reduced motion');
},{'/_chinese':'chinese-public'});
