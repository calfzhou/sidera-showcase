// Provider responses are mocked; check theme presentation without contacting Shields.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay}=b;
 let mode='pending';const pending=[];let requests=0;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><rect x="4" y="3" width="92" height="14" rx="5" fill="#087cb9"/><text x="10" y="14" font-size="10" fill="white">mock badge</text></svg>';
 const fulfill=p=>call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from(svg).toString('base64')});
 b.on('Fetch.requestPaused',async p=>{
  if(p.request.url.startsWith('https://img.shields.io/')){
   requests++;if(mode==='pending'){pending.push(p);return;}
   if(mode==='error')return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'});
   return fulfill(p);
  }
  if(p.request.url.startsWith(b.origin+'/'))return call('Fetch.continueRequest',{requestId:p.requestId});
  return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
 });
 await call('Network.setBlockedURLs',{urls:[]});await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]});
 const wait=async x=>{for(let i=0;i<200;i++){if(await e(x))return;await delay(50);}assert.fail(x)};
 await v(1200,900);await n('/handbook/reference/diagrams/');
 await e(`document.querySelector('[data-sidera-badges]').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('[data-sidera-badges]').dataset.state==='loading'`);
 assert(await e(`document.querySelector('[data-sidera-badges] .badge-status').classList.contains('visually-hidden')`));
 mode='ready';while(pending.length)await fulfill(pending.shift());
 await wait(`document.querySelector('[data-sidera-badges]').dataset.state==='ready'`);
 assert(await e(`document.querySelector('[data-sidera-badges] .badge-status').classList.contains('visually-hidden')`));
 assert.equal(await e(`document.querySelector('.badge-repo').href`),'https://github.com/mermaid-js/mermaid');
 const disabled=await e(`(()=>{const g=document.querySelector('.github-badges:not([data-sidera-badges])');return {quiet:g.querySelector('.badge-status').classList.contains('visually-hidden'),images:g.querySelectorAll('img').length,link:!!g.querySelector('.badge-repo')}})()`);
 assert.deepEqual(disabled,{quiet:true,images:0,link:true});
 for(const palette of ['dark','light']){
  await e(`Sidera.setColorMode('${palette}')`);
  assert(await e(`[...document.querySelectorAll('.badge-images img')].every(i=>getComputedStyle(i).backgroundColor==='rgba(0, 0, 0, 0)'&&i.naturalWidth===100&&i.referrerPolicy==='no-referrer')`));
  assert(await e(`document.querySelector('.badge-repo').getBoundingClientRect().height>0`));
 }
 // A rounded SVG with transparent margins is used above: theme must not add a plate.
 await v(390,850);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await e(`document.querySelector('[data-sidera-badges]').scrollIntoView({behavior:'instant',block:'center'})`);await b.screenshot('badges-transparent-quiet');
 mode='error';await n('/handbook/reference/diagrams/');await e(`document.querySelector('[data-sidera-badges]').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('[data-sidera-badges]').dataset.state==='error'`);
 assert(!await e(`document.querySelector('[data-sidera-badges] .badge-status').classList.contains('visually-hidden')`));
 assert(await e(`[...document.querySelectorAll('.badge-failed')].every(x=>!x.hidden)`));
 // A late valid response can recover without leaving an obsolete visible error.
 await e(`document.querySelectorAll('[data-sidera-badges] img').forEach(i=>i.dispatchEvent(new Event('load')))`);
 await wait(`document.querySelector('[data-sidera-badges]').dataset.state==='ready'`);
 assert(await e(`document.querySelector('[data-sidera-badges] .badge-status').classList.contains('visually-hidden')`));
 mode='ready';await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/handbook/reference/diagrams/',false);
 assert(await e(`[...document.querySelectorAll('.badge-status')].every(p=>p.classList.contains('visually-hidden'))`));
 assert(await e(`[...document.querySelectorAll('.badge-repo')].every(a=>a.getBoundingClientRect().height>0)`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert(requests>=6);assert.equal(b.errors.length,0);
 console.log('PASS badge presentation: quiet loading/ready/disabled/no-JS, repo links, transparent CSS in both palettes/mobile, visible errors and quiet recovery; all provider traffic mocked');
});
