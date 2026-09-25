// Removed visual metadata stays available on native lists, not hidden paragraphs.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,prefix] of [[1440,''],[390,''],[390,'/_chinese']]){
  await v(width,960);
  for(const [route,id,total] of [['/journal/','articles','2'],['/notes/','articles','6'],['/notes/page/2/','articles','6'],['/handbook/','doc-children','4']]){
   await n(prefix+route);
   const state=await e(`(()=>{const list=document.getElementById('${id}');return{label:list.getAttribute('aria-label'),count:list.dataset.total||list.dataset.docTotal,rows:document.querySelectorAll('.list-meta,p[data-total],p[data-list-order],p[data-doc-total]').length,items:list.children.length,heading:!!document.getElementById('children-heading'),overflow:document.documentElement.scrollWidth>innerWidth}})()`);
   assert.equal(state.rows,0);assert.equal(state.count,total);assert(state.label&&state.items>0&&!state.overflow);
   if(id==='doc-children')assert(state.heading);
  }
 }
 await n('/handbook/');const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='list'&&n.name?.value==='4 child pages'));
 await e(`document.querySelector('#doc-children a.card-title').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/handbook/start/');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/',false);
 assert.equal(await e(`document.querySelectorAll('.list-meta').length`),0);
 await e(`document.querySelector('[data-page-link=next]').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/notes/page/2/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS no visual post/note metadata or docs count row; retained native lists, accessible counts, docs heading, keyboard/pager/no-JS, EN/ZH and mobile');
},{'/_chinese':'chinese-public'});
