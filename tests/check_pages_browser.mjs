// Real production artifact at its project prefix; isolated local harness only.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
const prefix='/sidera-showcase';
await runBrowser(async b => {
  const {evaluate:e, navigate:n, viewport:v, call, delay, key}=b;
  const wait=async expr=>{for(let i=0;i<350;i++){if(await e(expr))return;await delay(50);}assert.fail(expr);};
  const results=[];
  await v(1440,960);await n(prefix+'/notes/reading-list/');
  const sourceLink=await e(`Array.from(document.querySelectorAll('.prose a')).find(a=>a.textContent==='Give a link a reason').getAttribute('href')`);
  const article=prefix+'/journal/2026/04/14/connect-the-useful-parts/';
  assert.equal(sourceLink,article+'#give-a-link-a-reason');
  // Search is page-local JS + a local JSON index (no Worker in this theme revision).
  await e(`(()=>{const i=document.querySelector('#search-input');i.focus();i.value='Give a link a reason';i.dispatchEvent(new Event('input'));document.querySelector('.search-scope').click();})()`);
  await wait(`!!document.querySelector('.search-results a[href^="${article}"]')`);
  await e(`document.querySelector('.search-results a[href^="${article}"]').focus()`);await key('Enter','Enter',13);
  await wait(`location.pathname==='${article}'&&location.hash==='#give-a-link-a-reason'&&!!document.querySelector(':target [data-search-mark]')`);
  results.push('prefixed source link and real search-to-heading navigation/highlight');
  // Verify no provider action; external network remains blocked by the harness.
  assert.equal(await e(`document.querySelector('[data-sidera-giscus]').dataset.repo`),'calfzhou/sidera-showcase');
  for(const width of [1440,390]){
    await v(width,900);await n(prefix+'/sidera/');
    assert(await e(`document.documentElement.scrollWidth<=innerWidth&&!!document.querySelector('.ai-label')&&!document.querySelector('[data-sidera-giscus]')`));
    assert(await e(`[...document.images].filter(i=>i.loading!=='lazy').every(i=>i.complete&&i.naturalWidth>0)`));
  }
  await b.screenshot('manual-mobile');
  results.push('manual desktop/mobile, AI/no-comments boundary and loaded branding');
  await v(1440,960);await n(prefix+'/handbook/reference/diagrams/');
  for(const kind of ['mermaid','drawio']){
    await e(`document.querySelector('[data-sidera-diagram="${kind}"]').scrollIntoView({block:'center'})`);
    await wait(`document.querySelector('[data-sidera-diagram="${kind}"]').dataset.state==='ready'`);
  }
  assert(await e(`[...document.querySelectorAll('.diagram-renderer')].length===2&&[...document.querySelectorAll('.diagram-renderer')].every(f=>new URL(f.src).pathname.startsWith('${prefix}/diagrams/')&&f.getAttribute('sandbox')==='allow-scripts')`));
  results.push('both local sandboxed diagram renderers under project prefix');
  const missing=await e(`fetch('${prefix}/missing-test-page/').then(async r=>({status:r.status,text:await r.text()}))`);
  assert.equal(missing.status,404);assert(missing.text.includes('class="not-found-home"'));
  await n(prefix+'/404.html');assert.equal(await e(`document.querySelector('.not-found-home').getAttribute('href')`),prefix+'/');
  await call('Emulation.setScriptExecutionDisabled',{value:true});await n(prefix+'/sidera/',false);
  assert(await e(`document.querySelector('#search-input').disabled&&!!document.querySelector('.search-fallback')`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  results.push('custom 404 with HTTP 404, prefixed recovery, no-JS manual/navigation');
  await call('Network.setBlockedURLs',{urls:['https://*','*search/*.json']});await n(prefix+'/notes/reading-list/');
  await e(`(()=>{const i=document.querySelector('#search-input');i.focus();i.value='reading';i.dispatchEvent(new Event('input'));})()`);
  await wait(`document.querySelector('.search-status').textContent.includes('unavailable')`);
  await call('Network.setBlockedURLs',{urls:['https://*']});
  await e(`document.querySelector('#search-input').blur();document.querySelector('#search-input').focus()`);
  await wait(`!!document.querySelector('.search-results a')`);
  results.push('visible search failure and recovery after retry');
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert(b.requests.filter(u=>u.startsWith(b.origin+'/')).every(u=>new URL(u).pathname.startsWith(prefix+'/')));
  await writeFile(resolve(b.run,'pages-browser-results.json'),JSON.stringify({results,errors:b.errors,ports:[b.port,b.debugPort]},null,2)+'\n');
  console.log('PASS '+results.join('; '));
}, {[prefix]:'public'});
