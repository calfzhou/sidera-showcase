// Repository-local UI, mocked badges; no real provider, user browser or clipboard.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay,key}=b;
 const wait=async expr=>{for(let i=0;i<400;i++){if(await e(expr))return;await delay(50);}assert.fail(expr)};
 b.on('Fetch.requestPaused',async p=>{
  if(p.request.url.startsWith(b.origin+'/'))return call('Fetch.continueRequest',{requestId:p.requestId});
  if(p.request.url.startsWith('https://img.shields.io/'))return call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><rect width="80" height="20" fill="gray"/></svg>').toString('base64')});
  return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
 });
 await call('Network.setBlockedURLs',{urls:[]});await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]});
 for(const [width,mode] of [[1440,'dark'],[390,'light']]){
  await v(width,960);await n('/notes/');await e(`Sidera.setColorMode('${mode}')`);await delay(450);
  if(width===390){await e(`document.querySelector('[data-region=left]').click()`);await delay(350);}
  assert(await e(`[...document.querySelectorAll('svg.icon')].every(s=>!s.hasAttribute('width')&&!s.hasAttribute('height')&&s.getAttribute('aria-hidden')==='true'&&s.getAttribute('focusable')==='false')`));
  const menu=await e(`['/journal/','/notes/','/handbook/'].map(h=>document.querySelector('.native-menu a[href="'+h+'"] svg').innerHTML)`);
  assert.equal(new Set(menu).size,3);
  const metrics=await e(`(()=>{const link=document.querySelector('.native-menu a[href="/journal/"]');link.style.setProperty('--icon-size','31px');link.style.setProperty('--icon-color','rgb(120, 40, 150)');const s=getComputedStyle(link.querySelector('svg'));return [s.width,s.height,s.color]})()`);
  assert.deepEqual(metrics,['31px','31px','rgb(120, 40, 150)']);
  await e(`document.querySelector('.native-menu a[href="/journal/"]').removeAttribute('style')`);
  await b.screenshot('icons-'+mode);
 }
 // Same custom key/whole-entry override in real consumers, including empty opt-out.
 await v(1440,960);await n('/_custom/icon-probe/');
 assert(await e(`document.querySelector('.identity-text')&&document.querySelector('.content-link-card circle[r="7"]')`));
 assert.equal(await e(`document.querySelectorAll('.content-link-card')[1].querySelectorAll('svg').length`),0);
 assert.equal(await e(`document.querySelectorAll('.story-ornament svg').length`),2);
 await wait(`!!document.querySelector('a[href="https://example.invalid/"] .external-link-marker svg')`);
 await e(`(()=>{const i=document.querySelector('#search-input');i.value='reading';i.dispatchEvent(new Event('input'))})()`);
 await wait(`!!document.querySelector('.search-results a')`);
 assert(await e(`!!document.querySelector('.search-section-marker svg')`));
 // All operation fallbacks stay visible, localized and within the viewport.
 for(const [prefix,width] of [['/_off',1440],['/_zh-off',390]]){
  await v(width,960);await n(prefix+'/notes/');
  if(width===390){await e(`document.querySelector('[data-region=left]').click()`);await delay(300);}
  await e(`(()=>{const i=document.querySelector('#search-input');i.value='reading';i.dispatchEvent(new Event('input'))})()`);await wait(`!!document.querySelector('.search-results a')`);
  assert.equal(await e(`document.querySelectorAll('svg').length`),0);
  assert(await e(`(()=>{const b=document.querySelector('.search-clear');return b.textContent.trim()&&b.getBoundingClientRect().width>10})()`));
  await n(prefix+'/handbook/reference/content-components/');
  assert.equal(await e('document.querySelectorAll("svg").length'),0);
  await e(`document.querySelector('#fold-comparison summary').focus()`);await key('Enter','Enter',13);
  assert(await e(`document.querySelector('#fold-comparison').open`));
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  await n(prefix+'/handbook/reference/diagrams/');
  await e(`document.querySelector('[data-sidera-diagram=mermaid]').scrollIntoView({block:'center',behavior:'instant'})`);
  await wait(`document.querySelector('[data-sidera-diagram=mermaid]').dataset.state==='ready'`);
  await e(`document.querySelector('[data-diagram-action=expand]').focus()`);await key('Enter','Enter',13);await delay(150);
  assert(await e(`document.querySelector('.diagram-dialog').open`));
  assert.equal(await e('document.querySelectorAll("svg").length'),0);
  assert(await e(`(()=>{const b=document.querySelector('.diagram-close');return b.textContent.trim()&&b.scrollWidth<=b.clientWidth+1})()`));
  assert(await e(`[...document.querySelectorAll('.diagram-dialog .diagram-action')].filter(x=>x.getClientRects().length).every(x=>x.scrollWidth<=x.clientWidth+1)`));
  if(width===390)await b.screenshot('icons-off-mobile');
  await key('Escape','Escape',27);assert(!await e(`document.querySelector('.diagram-dialog').open`));
 }
 // Native no-JS disclosure still works without graphic indicators.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/_off/handbook/reference/content-components/',false);
 await e(`document.querySelector('#fold-comparison summary').focus()`);await key('Enter','Enter',13);
 assert(await e(`document.querySelector('#fold-comparison').open`));assert.equal(await e('document.querySelectorAll("svg").length'),0);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 console.log('PASS named Solar inline UI, distinct identities, parent size/color, custom overrides/empty, dynamic search/external icons; EN/ZH/mobile/noJS/icons-off disclosures and diagram modal text controls');
},{'/_custom':'custom-public','/_off':'off-public','/_zh-off':'zh-off-public'});
