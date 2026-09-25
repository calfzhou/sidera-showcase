// Multiple identical component kinds must remain independent native controls and links.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const route='/field-notes/alpha/';
 for(const width of [1440,390]){
  await v(width,900);await n(route);
  assert(await e(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size && document.documentElement.scrollWidth<=innerWidth})()`));
  if(width===390){await e(`document.querySelector('[data-region="left"]').click()`);await delay(430);}
  const toc1='[data-instance="left-toc-1"] details',toc2='[data-instance="left-toc-2"] details';
  await e(`document.querySelector('${toc2} summary').focus()`);await key('Enter','Enter',13);
  assert(await e(`document.querySelector('${toc1}').open && !document.querySelector('${toc2}').open`));
  await key('Enter','Enter',13);
  const branch1='[data-instance="left-taxonomies-1"] [data-tag="science"] > details';
  const branch2='[data-instance="left-taxonomies-2"] [data-tag="science"] > details';
  await e(`document.querySelector('${branch2} summary').focus()`);await key('Enter','Enter',13);
  assert(await e(`document.querySelector('${branch1}').open && !document.querySelector('${branch2}').open`));
  // Real anchor navigation in the second TOC; all four TOCs update to the same heading.
  await e(`document.querySelector('[data-instance="left-toc-2"] a[href="#second-heading"]').focus()`);await key('Enter','Enter',13);
  for(let i=0;i<80&&!await e(`location.hash==='#second-heading' && [...document.querySelectorAll('[data-toc] a[aria-current]')].length===4 && [...document.querySelectorAll('[data-toc] a[aria-current]')].every(a=>a.hash==='#second-heading')`);i++)await delay(30);
  assert.equal(await e('location.hash'),'#second-heading');
  assert(await e(`[...document.querySelectorAll('[data-toc] a[aria-current]')].every(a=>a.hash==='#second-heading')`));
  assert(await e(`[...document.querySelectorAll('[data-toc]')].every(t=>document.getElementById(t.getAttribute('aria-labelledby'))?.tagName==='SUMMARY')`));
 }
 await v(1440,960);await n(route);
 assert.equal(await e(`document.querySelector('[data-instance="left-text-1"]').textContent.trim()`),'Base text');
 assert.equal(await e(`document.querySelector('[data-instance="left-text-2"]').textContent.trim()`),'Instance text');
 assert.equal(await e(`document.querySelector('[data-instance="left-recent-2"] ul').children.length`),2);
 assert.equal(await e(`document.querySelector('[data-instance="left-recent-3"] ul').children.length`),1);
 assert(await e(`JSON.stringify(JSON.parse(document.querySelector('#base-before').textContent))===JSON.stringify(JSON.parse(document.querySelector('#base-after').textContent))`));
 // Distinct native menu destinations are still independently keyboard reachable.
 await e(`document.querySelector('[data-instance="left-menu-2"] a').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/journal/');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert.equal(await e(`document.querySelectorAll('[data-toc]').length`),4);assert(await e(`document.querySelector('[data-instance="left-links-2"] a').getAttribute('href')==='/journal/'`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 await writeFile(resolve(b.run,'browser-results.json'),JSON.stringify({checks:['unique IDs','independent repeated TOC/tree controls','native second-TOC heading navigation and four current markers','correct ARIA references','isolated text/recent/menu config','no cached-settings mutation','mobile/no-JS'],browser:b.version.Browser},null,2));
 console.log('PASS repeated component runtime: independent controls/config, correct native links and ARIA/current state, both widths and no JS');
});
