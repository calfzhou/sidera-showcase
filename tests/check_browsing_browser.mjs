// Collection navigation and taxonomy/archive presentation on the isolated repository harness.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const routes=['/chronicle/','/chronicle/categories/','/chronicle/tags/','/chronicle/categories/learning/','/chronicle/archives/','/chronicle/archives/page/2/','/tree-scope/tags/'];
 for(const [width,palette,prefix] of [[1440,'dark',''],[390,'light',''],[390,'dark','/_chinese']]){
  await v(width,900);await n(prefix+'/chronicle/');await e(`Sidera.setColorMode('${palette}')`);
  for(const route of routes){
   await n(prefix+route);
   assert(await e('document.documentElement.scrollWidth<=innerWidth'));
   assert.equal(await e(`document.querySelectorAll('.collection-nav-tabs').length`),1);
   assert.equal(await e(`document.querySelectorAll('.pagination').length`),route==='/chronicle/categories/'||route==='/tree-scope/tags/'?0:1);
   assert(await e(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size})()`));
  }
 }
 // Archive years follow the site's UI/heading typography, not its code font.
 await v(1440,960);await n('/chronicle/archives/');
 assert.equal(await e(`getComputedStyle(document.querySelector('.archive-year h2')).fontFamily`),await e(`getComputedStyle(document.body).fontFamily`));
 await e(`document.documentElement.style.setProperty('--ui','Arial, sans-serif')`);
 assert.equal(await e(`getComputedStyle(document.querySelector('.archive-year h2')).fontFamily`),'Arial, sans-serif');
 await e(`const style=document.createElement('style');style.textContent='h2 { font-family: Georgia, serif; }';document.head.append(style)`);
 assert.equal(await e(`getComputedStyle(document.querySelector('.archive-year h2')).fontFamily`),'Georgia, serif');
 assert.equal(await e(`getComputedStyle(document.querySelector('.archive-year h2')).fontSize`),'20px');
 assert.equal(await e(`getComputedStyle(document.querySelector('.archive-year h2')).fontWeight`),'700');
 await v(1440,600);await n('/chronicle/');
 const current='.collection-nav-tabs a[aria-current]';
 assert.notEqual(await e(`getComputedStyle(document.querySelector('${current}')).backgroundColor`),'rgba(0, 0, 0, 0)');
 const category='.collection-nav-tabs a[href="/chronicle/categories/"]';
 await e(`document.querySelector('${category}').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/chronicle/categories/');
 assert.equal(await e(`document.querySelector('${current}').textContent`),'Categories');
 assert(await e(`document.querySelector('.taxonomy-directory .taxonomy-branches')!==null`));
 assert(!await e(`document.querySelector('.taxonomy-directory a').querySelector('svg').outerHTML.includes('onload')`));
 await e(`document.querySelector('.taxonomy-entry[href="/chronicle/categories/learning/tools/"]').focus()`);await key('Enter','Enter',13);await delay(120);
 assert.equal(await e('location.pathname'),'/chronicle/categories/learning/tools/');
 assert.equal(await e(`document.querySelector('${current}').getAttribute('aria-current')`),'location');
 // The bar pins on real page scroll, changing only its surface, never intercepting links.
 await n('/chronicle/');await e('window.scrollTo({top:260,behavior:"instant"})');await delay(100);
 assert(await e(`document.querySelector('.top-region').classList.contains('is-stuck')`));
 assert(await e(`Math.abs(document.querySelector('.top-region').getBoundingClientRect().top-32)<2`));
 // Horizontal overflow is confined to the bar; focus brings the last tab into view.
 await v(320,700);await n('/chronicle/');
 await e(`document.querySelector('.collection-nav-tabs a:last-child').focus()`);await delay(100);
 assert(await e(`(()=>{const nav=document.querySelector('.collection-nav-tabs').getBoundingClientRect(),a=document.activeElement.getBoundingClientRect();return a.right<=nav.right+1&&a.left>=nav.left-1})()`));
 await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/chronicle/archives/');
 await e(`document.querySelector('[data-page-link="next"]').click()`);await delay(120);assert.equal(await e('location.pathname'),'/chronicle/archives/page/2/');
 assert.equal(await e(`document.querySelector('${current}').textContent`),'Archive');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/chronicle/tags/',false);
 assert(await e(`document.querySelector('.taxonomy-cloud a')&&document.querySelector('.collection-nav-tabs a[aria-current]').textContent==='Tags'`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 await writeFile(resolve(b.run,'browser-results.json'),JSON.stringify({browser:b.version.Browser,checks:['all tab destinations/current states','wide tree and flat chips','hierarchical tags retained','native term and archive/pager links','one or zero paginator UI','sticky state','small-screen focus/overflow','EN/ZH light/dark/no-JS']},null,2));
 console.log('PASS collection browsing runtime and responsive states');
},{'/_chinese':'chinese-public'});
