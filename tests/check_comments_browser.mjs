// Controlled local responses ONLY. Never fetch Giscus/GitHub or submit comments.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
 const {evaluate:e,navigate:n,call,delay,viewport,screenshot}=b;
 const host='document.querySelector("[data-sidera-giscus]")';
 const route='/journal/2026/04/14/connect-the-useful-parts/';
 let mode='pending',clients=0,frames=0; const captured=[],pending=[],themeRequests=[];
 // The mock models only the inspected client dataset -> iframe and message contract.
 const client=`(()=>{const s=document.currentScript;window.mockConfig={...s.dataset};window.mockBacklink=document.querySelector('meta[name="giscus:backlink"]').content;const f=document.createElement('iframe');f.className='giscus-frame';f.src='https://giscus.app/'+s.dataset.lang+'/widget?term='+encodeURIComponent(s.dataset.term)+'&theme='+encodeURIComponent(s.dataset.theme);document.querySelector('.giscus').append(f);})()`;
 // Model the official stylesheet-URL contract; never run/fetch the live provider here.
 const widget=()=>`<!doctype html><html><head><meta charset="utf-8"></head><body><main><p>Isolated Giscus fixture — no GitHub requests</p><a href="#">Fixture link</a><textarea aria-label="Fixture input">No discussion submitted.</textarea><button>Fixture control</button></main><script>
 let currentTheme;
 function applyTheme(theme){
  if(theme===currentTheme)return;currentTheme=theme;
  const link=document.createElement('link');link.rel='stylesheet';link.crossOrigin='anonymous';link.href=theme;
  link.onload=()=>{
   for(const old of document.querySelectorAll('link[data-theme]'))old.remove();link.dataset.theme='true';
   const main=document.querySelector('main'),styles=getComputedStyle(main);
   parent.postMessage({mockTheme:theme,mockStyles:{font:getComputedStyle(document.body).fontFamily,text:styles.color,canvas:styles.backgroundColor,link:getComputedStyle(document.querySelector('a')).color}},'*');
  };
  document.head.append(link);
 }
 addEventListener('message',e=>{if(e.data?.giscus?.setConfig)applyTheme(e.data.giscus.setConfig.theme)});
 applyTheme(new URL(location.href).searchParams.get('theme'));
 setTimeout(()=>parent.postMessage({giscus:${mode==='empty'?"{error:'Discussion not found'}":mode==='error'?"{error:'Repository is unavailable'}":"{resizeHeight:160}"}},'*'),200);
 </script></body></html>`;
 // Stylesheets belong to the cross-origin child target. Pause that target before
 // execution and install the same allowlisted fixture interceptor; no live CSS.
 b.on('Target.attachedToTarget',async p=>{
  await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]},p.sessionId);
  await call('Runtime.enable',{},p.sessionId);
  await call('Network.enable',{},p.sessionId);
  await call('Runtime.runIfWaitingForDebugger',{},p.sessionId);
 });
 b.on('Fetch.requestPaused',async (p,session)=>{
  if(p.request.url.startsWith(b.origin+'/'))return call('Fetch.continueRequest',{requestId:p.requestId},session);
  captured.push(p.request.url);
  let body,type;
  if(p.request.url==='https://giscus.app/client.js'){
   clients++;
   if(mode==='pending'){pending.push(p);return;}
   if(mode==='blocked')return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'},session);
   body=mode==='silent'?'/* script insertion is not readiness */':client;type='application/javascript';
  }else if(/^https:\/\/giscus.app\/themes\/(light|dark)\.css$/.test(p.request.url)){
   themeRequests.push(p.request.url);type='text/css';
   // Minimal owned fixture for provider variable consumers; not vendored Giscus CSS.
   body='body{margin:0;font-family:system-ui}main{color:var(--color-fg-default);background:var(--color-canvas-default)}a{color:var(--color-accent-fg)}textarea,button{font:inherit;color:inherit}textarea{background:var(--color-canvas-inset);border:1px solid var(--color-border-default)}button{background:var(--color-btn-primary-bg);color:var(--color-btn-primary-text)}';
  }else if(p.request.url.startsWith('https://giscus.app/')&&p.request.url.includes('/widget?')){
   frames++;body=widget();type='text/html';
  }else return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'},session);
  await call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:type},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from(body).toString('base64')},session);
 });
 await call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
 await call('Network.setBlockedURLs',{urls:[]}); await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]});
 const wait=async expr=>{for(let i=0;i<100;i++){if(await e(expr))return;await delay(50);}assert.fail(expr)};
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.mockThemes=[];addEventListener('message',e=>{if(e.data?.mockTheme){mockThemes.push(e.data.mockTheme);window.mockStyles=e.data.mockStyles;}});`});
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
 assert.equal(await e('mockConfig.theme'),await e(`${host}.dataset.themeDark`));
 assert(await e(`document.querySelector('[data-search-mark]')!==null`));
 await e(`window.originalFrame=document.querySelector('iframe.giscus-frame');document.getElementById('main').scrollIntoView({behavior:'instant'});`);
 const src=await e(`[...document.scripts].find(s=>s.src.includes('/js/giscus.')).src`);
 await e(`(async()=>{const s=document.createElement('script');s.src=${JSON.stringify(src)};document.body.append(s);await new Promise(r=>setTimeout(r,100));})()`);
 assert.equal(clients,1);assert.equal(frames,1);
 // Both origin and source must match. Hostile messages cannot change theme-owned state.
 await e(`dispatchEvent(new MessageEvent('message',{origin:'https://evil.invalid',source:originalFrame.contentWindow,data:{giscus:{error:'bad'}}}));dispatchEvent(new MessageEvent('message',{origin:'https://giscus.app',source:window,data:{giscus:{error:'bad'}}}));`);
 assert.equal(await e(`${host}.dataset.state`),'opened');
 for(const palette of ['light','dark']){
  await e(`Sidera.setColorMode('${palette}')`);await wait(`mockThemes.at(-1)===${host}.dataset['theme'+${JSON.stringify(palette[0].toUpperCase()+palette.slice(1))}]`);
  assert(await e(`originalFrame===document.querySelector('iframe.giscus-frame')`));
  const expected=await e(`(()=>{const root=getComputedStyle(document.documentElement);const a=document.createElement('a');a.href='#';document.body.append(a);const link=getComputedStyle(a).color;a.remove();return {font:root.fontFamily,text:root.color,canvas:root.backgroundColor,link};})()`);
  const actual=await e('mockStyles');
  // Font family identifiers are case-insensitive; Hugo's CSS minifier normalizes them.
  actual.font=actual.font.toLowerCase();expected.font=expected.font.toLowerCase();
  assert.deepEqual(actual,expected,'iframe font/text/canvas/link match actual Sidera palette');

 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
 await e(`Sidera.setColorMode('auto')`);await wait(`mockThemes.at(-1)===${host}.dataset.themeLight`);
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await wait(`mockThemes.at(-1)===${host}.dataset.themeDark`);
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
 assert(captured.every(url=>url.startsWith('https://giscus.app/')));assert(themeRequests.some(x=>x.endsWith('/light.css'))&&themeRequests.some(x=>x.endsWith('/dark.css')));assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 console.log('PASS mocked Giscus: viewport auto-load/native desktop+mobile jump/noJS/disabled/unconfigured/fallback, bounded repeat initialization, origin+source checks, error/empty/timeout, canonical kw/hash mappings, EN/ZH/mobile/manual+OS palette updates and matching iframe font/colors with mocked base styles. No live provider traffic.');
}, {'/_chinese':'chinese-public','/unconfigured':'unconfigured-public','/disabled':'disabled-public'});
