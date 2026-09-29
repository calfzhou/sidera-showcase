// Controlled local responses ONLY. Never fetch Giscus/GitHub or submit comments.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
 const {evaluate:e,navigate:n,call,delay,viewport,screenshot}=b;
 const host='document.querySelector("[data-sidera-giscus]")';
 const route='/journal/2026/04/14/connect-the-useful-parts/';
 let mode='pending',clients=0,frames=0; const captured=[],pending=[];
 // The mock models only the inspected client dataset -> iframe and message contract.
 const client=`(()=>{const s=document.currentScript;window.mockConfig={...s.dataset};window.mockBacklink=document.querySelector('meta[name="giscus:backlink"]').content;const f=document.createElement('iframe');f.className='giscus-frame';f.src='https://giscus.app/'+s.dataset.lang+'/widget?term='+encodeURIComponent(s.dataset.term);document.querySelector('.giscus').append(f);})()`;
 const widget=()=>`<!doctype html><html><head><meta charset="utf-8"></head><body style="font:16px system-ui;background:#eee;color:#222"><p>Isolated Giscus fixture — no GitHub requests</p><p>No discussion has been submitted.</p><script>
 addEventListener('message',e=>{if(e.data?.giscus?.setConfig)parent.postMessage({mockTheme:e.data.giscus.setConfig.theme},'*')});
 setTimeout(()=>parent.postMessage({giscus:${mode==='empty'?"{error:'Discussion not found'}":mode==='error'?"{error:'Repository is unavailable'}":"{resizeHeight:160}"}},'*'),200);
 </script></body></html>`;
 b.on('Fetch.requestPaused',async p=>{
  if(p.request.url.startsWith(b.origin+'/'))return call('Fetch.continueRequest',{requestId:p.requestId});
  captured.push(p.request.url);
  let body,type;
  if(p.request.url==='https://giscus.app/client.js'){
   clients++;
   if(mode==='pending'){pending.push(p);return;}
   if(mode==='blocked')return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
   body=mode==='silent'?'/* script insertion is not readiness */':client;type='application/javascript';
  }else if(p.request.url.startsWith('https://giscus.app/')&&p.request.url.includes('/widget?')){
   frames++;body=widget();type='text/html';
  }else return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'});
  await call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:type},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')});
 });
 await call('Network.setBlockedURLs',{urls:[]}); await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]});
 const wait=async expr=>{for(let i=0;i<100;i++){if(await e(expr))return;await delay(50);}assert.fail(expr)};
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.mockThemes=[];addEventListener('message',e=>{if(e.data?.mockTheme)mockThemes.push(e.data.mockTheme)});`});
 await viewport(1440,900);await n(route+'?kw=marginalia&utm_source=fixture#give-a-link-a-reason');
 assert.equal(clients,0);assert.equal(frames,0);
 assert(await e(`${host}.dataset.state==='idle' && !${host}.querySelector('button')`));
 assert(await e(`document.querySelector('.toc-comments').previousElementSibling.classList.contains('toc-top')`));
 assert(!await e(`document.querySelector('.article-end') || ${host}.querySelector('a') || document.querySelector('.article-comments h2')`));
 // Keyboard jump is a native anchor; entering the viewport triggers exactly one load.
 await e(`document.querySelector('.toc-comments').focus()`);await b.key('Enter','Enter',13);
 await wait(`${host}.dataset.state==='loading'`);
 assert(await e(`${host}.querySelector('[role="status"]').classList.contains('visually-hidden')`));
 assert.equal(await e('location.hash'),'#sidera-comments');
 await wait(`document.activeElement===document.getElementById('sidera-comments')`);
 for(let i=0;i<50&&!pending.length;i++)await delay(20);
 assert.equal(pending.length,1);mode='opened';
 await call('Fetch.fulfillRequest',{requestId:pending.shift().requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/javascript'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(client).toString('base64')});
 await wait(`${host}.dataset.state==='opened'`);
 assert.equal(clients,1);assert.equal(frames,1);
 assert.equal(await e('mockConfig.term'),route.slice(1));assert.equal(await e('mockConfig.mapping'),'specific');
 assert.equal(await e('mockBacklink'),'https://example.org'+route);assert.equal(await e('mockConfig.lang'),'en');assert.equal(await e('mockConfig.strict'),'1');
 assert.equal(await e('mockConfig.reactionsEnabled'),'1');
 assert.equal(await e('mockConfig.theme'),'dark');
 assert(await e(`document.querySelector('[data-search-mark]')!==null`));
 await e(`window.originalFrame=document.querySelector('iframe.giscus-frame');document.getElementById('main').scrollIntoView({behavior:'instant'});`);
 const src=await e(`[...document.scripts].find(s=>s.src.includes('/js/giscus.')).src`);
 await e(`(async()=>{const s=document.createElement('script');s.src=${JSON.stringify(src)};document.body.append(s);await new Promise(r=>setTimeout(r,100));})()`);
 assert.equal(clients,1);assert.equal(frames,1);
 // Both origin and source must match. Hostile messages cannot change theme-owned state.
 await e(`dispatchEvent(new MessageEvent('message',{origin:'https://evil.invalid',source:originalFrame.contentWindow,data:{giscus:{error:'bad'}}}));dispatchEvent(new MessageEvent('message',{origin:'https://giscus.app',source:window,data:{giscus:{error:'bad'}}}));`);
 assert.equal(await e(`${host}.dataset.state`),'opened');
 for(const palette of ['light','dark']){
  await e(`Sidera.setColorMode('${palette}')`);await wait(`mockThemes.at(-1)==='${palette}'`);
  assert(await e(`originalFrame===document.querySelector('iframe.giscus-frame')`));
 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await e(`Sidera.setColorMode('auto')`);await wait(`mockThemes.at(-1)==='light'`);
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await wait(`mockThemes.at(-1)==='dark'`);
 assert.equal(clients,1);assert.equal(frames,1);
 assert(await e(`document.querySelector('iframe.giscus-frame').title==='Comments' && document.querySelector('iframe.giscus-frame').referrerPolicy==='no-referrer'`));
 await e(`${host}.scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('comments-mock-dark');
 assert(await e(`${host}.querySelector('[role="status"]').textContent===''`));
 // Empty provider state stays quiet; it never implies a posted test discussion.
 mode='empty';await n('/_chinese/'+route.slice(1)+'?kw='+encodeURIComponent('连接')+'#heading');await e(`document.getElementById('sidera-comments').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`${host}.dataset.state==='empty'`);
 assert.equal(await e('mockConfig.lang'),'zh-CN');assert.equal(await e('mockConfig.term'),'_chinese'+route);
 assert.equal(await e(`document.querySelector('iframe.giscus-frame').title`),'评论');
 await viewport(390,850);await e(`Sidera.setColorMode('light');${host}.scrollIntoView({block:'center',behavior:'instant'})`);await delay(200);
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));await screenshot('comments-mock-chinese');
 // Verified provider error wins even if subsequent resize events arrive.
 mode='error';await n(route);await e(`document.getElementById('sidera-comments').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`${host}.dataset.state==='unavailable'`);
 await e(`dispatchEvent(new MessageEvent('message',{origin:'https://giscus.app',source:document.querySelector('iframe').contentWindow,data:{giscus:{resizeHeight:200}}}));`);
 assert.equal(await e(`${host}.dataset.state`),'unavailable');
 mode='blocked';await n(route);await e(`document.getElementById('sidera-comments').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`${host}.dataset.state==='unavailable'`);
 assert.equal(await e('document.querySelectorAll("iframe.giscus-frame").length'),0);
 // Real bounded deadline; shortened only by a local fixture timer interceptor.
 mode='silent';const timerHook=await call('Page.addScriptToEvaluateOnNewDocument',{source:`const realTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>realTimeout(fn,ms===15000?100:ms,...args);`});
 await n(route);await e(`document.getElementById('sidera-comments').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`${host}.dataset.state==='unavailable'`);
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:timerHook.identifier});
 const before=clients;
 for(const path of ['/','/journal/','/notes/page/2/','/disabled'+route]){await n(path);assert(!await e(`!!${host}`));}
 await n('/unconfigured'+route);assert(await e(`document.querySelector('.article-comments').textContent.includes('not configured')`));assert(!await e(`!!${host}`));assert.equal(clients,before);await e(`document.querySelector('.article-comments').scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('comments-unconfigured');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert(!await e(`${host}.querySelector('button')`));assert(await e(`${host}.textContent.includes('require JavaScript')`));assert.equal(clients,before);await e(`document.querySelector('.article-comments').scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('comments-nojs');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Native mobile drawer link dismisses the drawer and reaches the real comment target.
 mode='opened';await viewport(390,850);await n(route);
 await e(`document.querySelector('[data-region="right"]').click()`);
 await wait(`document.querySelector('#right-region').matches(':popover-open')`);
 await e(`document.querySelector('.toc-comments').focus()`);await b.key('Enter','Enter',13);
 await wait(`${host}.dataset.state==='opened'`);
 assert(await e(`!document.querySelector('#right-region').matches(':popover-open') && location.hash==='#sidera-comments'`));
 assert.equal(await e('document.querySelectorAll("iframe.giscus-frame").length'),1);
 // A section already visible at navigation (native fragment) loads without any click.
 await n(route+'#sidera-comments');await wait(`${host}.dataset.state==='opened'`);
 // Progressive fallback when IntersectionObserver is absent is immediate and still bounded.
 const observerHook=await call('Page.addScriptToEvaluateOnNewDocument',{source:'delete window.IntersectionObserver;'});
 await n(route);await wait(`${host}.dataset.state==='opened'`);
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:observerHook.identifier});
 assert(await e(`${host}.querySelector('[role="status"]').textContent==='' && !document.querySelector('.comments-load')`));
 assert(captured.every(url=>url.startsWith('https://giscus.app/')));assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 console.log('PASS mocked Giscus: viewport auto-load/native desktop+mobile jump/noJS/disabled/unconfigured/fallback, bounded repeat initialization, origin+source checks, error/empty/timeout, canonical kw/hash mappings, EN/ZH/mobile/manual+OS palette updates. No live provider traffic.');
}, {'/_chinese':'chinese-public','/unconfigured':'unconfigured-public','/disabled':'disabled-public'});
