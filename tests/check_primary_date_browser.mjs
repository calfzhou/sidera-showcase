// Native lists and header dates must describe the same Page, regardless of its list context.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,prefix] of [[1440,''],[390,''],[320,'/_chinese']]){
  await v(width,960);
  for(const [scope,kind] of [['date-blog','published'],['date-notes','modified'],['date-docs','modified'],['date-plain','published']]){
   const article=`${prefix}/${scope}/a/`;
   for(const route of [`/${scope}/`,`/${scope}/tags/date-proof/`,'/tags/date-proof/']){
    await n(prefix+route);
    const card=await e(`(()=>{const c=[...document.querySelectorAll('.article-card')].find(c=>c.querySelector('.card-title').getAttribute('href')===${JSON.stringify(article)});const t=c.querySelector('.card-date time');return{kind:t.className,date:t.dateTime}})()`);
    assert.equal(card.kind,kind);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
    await e(`[...document.querySelectorAll('.card-title')].find(a=>a.getAttribute('href')===${JSON.stringify(article)}).focus()`);await key('Enter','Enter',13);await delay(130);
    assert.equal(await e('location.pathname'),article);
    assert.equal(await e(`document.querySelector('.date-primary time').dateTime`),card.date);
    assert.equal(await e(`document.querySelector('.date-primary time').className`),kind==='modified'?'updated':'published');
   }
  }
 }
 await v(1440,960);await n('/date-docs/a/');await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
 assert.equal(await e(`getComputedStyle(document.querySelector('.date-secondary')).visibility`),'hidden');
 await e(`document.querySelector('.article-dates').focus()`);assert.equal(await e(`getComputedStyle(document.querySelector('.date-secondary')).visibility`),'visible');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/date-notes/',false);
 assert.equal(await e(`document.querySelector('.card-date time').className`),'modified');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS primary_date card→header agreement in collection/scoped/global lists, native keyboard routes, presets, EN/ZH/mobile/no-JS and retained focus reveal');
},{'/_chinese':'chinese-public'});
