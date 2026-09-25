// Whole-site normal composition and actual interactions; isolated installed Chrome only.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const routes=['/','/notes/','/notes/page/2/','/notes/tags/','/notes/tags/tools/python/','/tags/','/tags/tools/python/','/authors/','/authors/rowan/','/series/making-notes/','/journal/series/making-notes/','/preset/notes/','/handbook/','/handbook/start/','/about/','/notes/package-management/'];
 const results=[];
 for(const [width,prefix,mode] of [[1440,'','dark'],[390,'','light'],[320,'/_chinese','dark']]) {
  await v(width,960);await n(prefix+'/');
  await e(`Sidera.setAppearance('${mode}')`);
  for(const route of routes){
   await n(prefix+route);
   const state=await e(`({overflow:document.documentElement.scrollWidth>innerWidth,headings:document.querySelectorAll('h1').length,images:[...document.images].every(i=>i.naturalWidth>0),ids:[...document.querySelectorAll('[id]')].map(i=>i.id),mode:document.documentElement.dataset.appearance})`);
   assert(!state.overflow&&state.images&&state.headings===1,JSON.stringify({route,width,state}));assert.equal(new Set(state.ids).size,state.ids.length);assert.equal(state.mode,mode);results.push({route,width,mode});
  }
 }
 await v(1440,960);await n('/notes/');await e(`Sidera.setAppearance('dark')`);
 const box=await e(`(()=>{const r=document.querySelector('.article-card').getBoundingClientRect();return{x:r.x+80,y:r.y+40}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1200,y:20});await delay(50);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...box});await delay(400);
 assert.equal(await e(`getComputedStyle(document.querySelector('.card-title')).backgroundSize`),'100% 10px');
 assert.notEqual(await e(`getComputedStyle(document.querySelector('.article-card')).transform`),'none');
 assert.equal(await e(`getComputedStyle(document.querySelector('.article-card'),'::before').opacity`),'0.6');
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:900});await delay(300);await b.screenshot('normal-list');
 await e(`document.querySelector('.card-title').focus()`);assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
 // Metadata links are not swallowed by the stretched title or hover layer.
 await e(`document.querySelector('.term-badge').focus()`);await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/notes/tags/design/interface/');
 await n('/notes/package-management/');await b.screenshot('normal-reading');
 await e(`document.querySelector('[data-toc] a[href="#make-updates-deliberate"]').focus()`);await key('Enter','Enter',13);
 for(let i=0;i<80 && !await e(`document.querySelector('[data-toc] a[aria-current]')?.hash==='#make-updates-deliberate'`);i++)await delay(30);
 assert.equal(await e(`document.querySelector('[data-toc] a[aria-current]').hash`),'#make-updates-deliberate');
 assert.equal(await e(`getComputedStyle(document.querySelector('.left-region')).position`),'sticky');
 await e(`document.querySelector('.article-footer').scrollIntoView({behavior:'instant',block:'center'})`);await delay(120);await b.screenshot('normal-footer');
 // Actual drawer render, keyboard dismissal/focus return, independent tree targets.
 await v(390,844);await n('/notes/package-management/');
 await e(`document.querySelector('[data-region="left"]').focus()`);await key('Enter','Enter',13);await delay(420);
 assert(await e(`document.querySelector('#left-region').matches(':popover-open') && document.querySelector('#left-region').getBoundingClientRect().x>=0`));
 const summary='.tree-branch>summary';await e(`document.querySelector('${summary}').focus()`);const opened=await e('document.activeElement.parentElement.open');await key('Enter','Enter',13);assert.equal(await e('document.activeElement.parentElement.open'),!opened);
 await key('Escape','Escape',27);await delay(50);assert(await e(`!document.querySelector('#left-region').matches(':popover-open') && document.activeElement.matches('[data-region="left"]')`));
 await e(`document.querySelector('[data-region="right"]').click()`);await delay(420);await b.screenshot('mobile-toc');
 await e(`document.querySelector('[data-toc] a[href="#revisit-the-setup"]').click()`);await delay(100);
 assert(await e(`!document.querySelector('#right-region').matches(':popover-open') && location.hash==='#revisit-the-setup'`));
 await e(`document.querySelector('[data-region="left"]').click()`);await delay(50);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:360,y:200,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:360,y:200,button:'left',clickCount:1});await delay(50);
 assert(await e(`!document.querySelector('#left-region').matches(':popover-open')`));
 // All breakpoint edges, including a right rail with left disabled and icons-off text buttons.
 for(const width of [320,667,668,768,1180,1181]){
  await v(width,900);await n('/notes/package-management/');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert.equal(await e(`document.querySelector('#left-region').hasAttribute('popover')`),width<=667);assert.equal(await e(`document.querySelector('#right-region').hasAttribute('popover')`),width<=1180);
 }
 for(const prefix of ['/_widgets','/_compact','/_icons-off','/_right-only']){await v(390);await n(prefix+'/notes/package-management/');assert(await e('document.documentElement.scrollWidth<=innerWidth'));}
 await v(1440);await n('/notes/');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...box});await delay(60);assert.equal(await e(`getComputedStyle(document.querySelector('.article-card')).transform`),'none');
 await v(390);await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/package-management/',false);
 assert(await e(`document.querySelector('.site-menu').open && document.querySelector('.context-menu').open && !document.querySelector('#left-region').hasAttribute('popover') && [...document.querySelectorAll('[data-appearance-cycle]')].every(b=>b.hidden)`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 await writeFile(resolve(b.run,'browser-results.json'),JSON.stringify({browser:b.version.Browser,node:process.version,views:results,checks:['hover spotlight/tilt','keyboard title/independent term','TOC scroll current','sticky rail','drawer Escape/focus/light-dismiss','tree disclosure','all breakpoints','icons-off/widgets/compact','reduced motion','no JS']},null,2));
 console.log('PASS P2-GR normal composition, 48 views and targeted interactions');
},{'/_chinese':'chinese-public','/_widgets':'widgets-public','/_compact':'compact-public','/_icons-off':'icons-off-public','/_right-only':'right-only-public'});
