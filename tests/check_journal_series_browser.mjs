// Inspect the normal Journal's interleaved series, without changing theme behavior.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,key,delay,call}=b;
 const third='/journal/2026/04/14/connect-the-useful-parts/';
 const fourth='/journal/2026/04/17/review-without-rewriting/';
 for(const [width,prefix] of [[1440,''],[390,''],[320,'/_chinese']]){
  await v(width,1000);await n(prefix+'/journal/');
  assert.equal(await e(`document.querySelectorAll('#articles > li').length`),9);
  assert.equal(await e(`document.querySelector('#articles .card-title').getAttribute('href')`),prefix+'/journal/2026/04/16/a-small-maintenance-window/');
  assert.equal(await e(`document.querySelectorAll('#articles .pin-label').length`),1);
  for(const [term,count] of [['making-notes',4],['quiet-software',3]]){
   await n(prefix+'/journal/series/'+term+'/');assert.equal(await e(`document.querySelectorAll('#articles > li').length`),count);
   assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  }
  await n(prefix+third);
  assert.equal(await e(`document.querySelector('[data-series-next]').getAttribute('href')`),prefix+fourth);
  assert.equal(await e(`document.querySelector('[data-navigation=next]').getAttribute('href')`),prefix+'/journal/2026/04/13/start-with-the-default/');
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  for(const route of ['/journal/2026/04/12/a-walk-without-a-checklist/','/journal/2026/04/16/a-small-maintenance-window/']){
   await n(prefix+route);assert.equal(await e(`document.querySelectorAll('.series-navigation').length`),0);
   assert(await e(`!!document.querySelector('.page-navigation')`));
  }
 }
 await n(third);await e(`document.querySelector('[data-series-next]').focus()`);await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),fourth);
 assert.equal(await e(`document.querySelectorAll('[data-series-next]').length`),0);
 await e(`document.querySelector('[data-series-previous]').focus()`);await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),third);
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/journal/series/',false);
 await e(`document.querySelector('a[href="/journal/series/quiet-software/"]').focus()`);await key('Enter','Enter',13);await delay(120);
 assert.equal(await e('location.pathname'),'/journal/series/quiet-software/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS Journal: nine mixed posts, two ordered series, pinned/non-series states, separate series/collection neighbors, EN/ZH/mobile and native keyboard/no-JS links');
},{'/_chinese':'chinese-prefixed-public'});
