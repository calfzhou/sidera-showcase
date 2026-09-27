// One isolated browser, bounded sources, mocked Shields; no external media/editor.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runBrowser} from './browser.mjs';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const route='/handbook/reference/diagrams/';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,call,viewport:v,delay,key}=b;
 const calls=[];let failBadges=false,failLibrary=false;
 async function intercept(p,sid){
  if(failLibrary&&p.request.url.includes('/vendor/mermaid-'))return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'},sid);
  if(p.request.url.startsWith(b.origin+'/')) return call('Fetch.continueRequest',{requestId:p.requestId},sid);
  if(p.request.url.startsWith('https://img.shields.io/')){
   calls.push(p.request.url);
   if(failBadges) return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'},sid);
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20"><rect width="90" height="20" fill="#333"/><text x="6" y="14" font-size="11" fill="white">mock badge</text></svg>';
   return call('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from(svg).toString('base64')},sid);
  }
  if(/^https?:/.test(p.request.url)){calls.push('BLOCKED '+p.request.url);return call('Fetch.failRequest',{requestId:p.requestId,errorReason:'BlockedByClient'},sid);}
  return call('Fetch.continueRequest',{requestId:p.requestId},sid);
 }
 b.on('Fetch.requestPaused',intercept);
 b.on('Target.attachedToTarget',async p=>{
  await call('Network.enable',{},p.sessionId);await call('Runtime.enable',{},p.sessionId);
  await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]},p.sessionId);
  await call('Runtime.runIfWaitingForDebugger',{},p.sessionId);
 });
 await call('Network.setBlockedURLs',{urls:[]});
 await call('Fetch.enable',{patterns:[{urlPattern:'http*'}]});
 await call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
 const wait=async expression=>{for(let i=0;i<400;i++){if(await e(expression))return;await delay(50);}assert.fail('Timeout: '+expression+' '+JSON.stringify(await e(`[...document.querySelectorAll('[data-sidera-diagram]')].map(f=>({kind:f.dataset.sideraDiagram,state:f.dataset.state,y:f.getBoundingClientRect().top,h:f.getBoundingClientRect().height}))`)));};
 const render=async selector=>{
  await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);
  await delay(100);await wait(`document.querySelector(${JSON.stringify(selector)}).dataset.state==='ready'`);
 };
 for(const [prefix,palette,width] of [['','light',1200],['/_chinese','dark',390]]){
  await v(width,900);await n(prefix+route);await e(`Sidera.setColorMode('${palette}')`);
  await render('[data-sidera-diagram="mermaid"]');
  await render('[data-sidera-diagram="drawio"]');
  assert(await e(`[...document.querySelectorAll('.diagram-view img')].every(i=>i.complete&&i.naturalWidth>20&&i.naturalHeight>20)`));
  assert.equal(await e(`document.querySelectorAll('.diagram-renderer').length`),2);
  assert(await e(`[...document.querySelectorAll('.diagram-renderer')].every(i=>i.getAttribute('sandbox')==='allow-scripts')`));
  assert.equal(await e(`document.querySelector('.content-folding [data-sidera-diagram]').dataset.state`),'idle');
  await e(`document.querySelector('.content-folding>summary').focus()`);await key('Enter','Enter',13);
  await render('.content-folding [data-sidera-diagram="mermaid"]');
  await render('.content-folding [data-sidera-diagram="drawio"]');
  const src=await e(`document.querySelector('.content-folding [data-sidera-diagram="drawio"] img').src`);
  assert.equal(await e(`getComputedStyle(document.querySelector('.content-folding [data-sidera-diagram="drawio"]')).backgroundColor`),'rgb(255, 255, 255)');
  assert.equal(await e(`getComputedStyle(document.querySelector('.content-folding [data-sidera-diagram="drawio"] figcaption')).color`),'rgb(23, 25, 27)');
  await e(`Sidera.setColorMode('${palette==='dark'?'light':'dark'}')`);await delay(500);
  assert.equal(await e(`document.querySelector('.content-folding [data-sidera-diagram="drawio"] img').src`),src,'explicit inversion keeps fixed renderer palette');
  if(prefix){await e(`Sidera.setColorMode('dark')`);await render('.content-folding [data-sidera-diagram="drawio"]');await b.screenshot('diagrams-inverted-grid');}
  // Native buttons, local keyboard scroll and expansion; no image-wide page overflow.
  const group='[data-sidera-diagram="drawio"]';await render(group);
  assert(await e(`fetch(document.querySelector('${group} img').src).then(r=>r.text()).then(svg=>svg.includes('color-scheme: '+document.documentElement.dataset.colorScheme+';'))`),'drawio export must preserve its native light-dark palette context');
  await e(`document.querySelector('${group} [data-diagram-action="in"]').focus()`);await key('Enter','Enter',13);
  assert(await e(`document.querySelector('${group} img').width>document.querySelector('${group} .diagram-view').clientWidth`));
  await e(`document.querySelector('${group} .diagram-view').focus()`);await key('ArrowRight','ArrowRight',39);await delay(150);
  assert(await e(`document.querySelector('${group} .diagram-view').scrollLeft>0`),JSON.stringify(await e(`(()=>{const v=document.querySelector('${group} .diagram-view');return {w:v.clientWidth,s:v.scrollWidth,left:v.scrollLeft,active:document.activeElement.className,state:v.closest('figure').dataset.state}})()`)));
  await e(`document.querySelector('${group} [data-diagram-action="fit"]').click();document.querySelector('${group} [data-diagram-action="expand"]').click()`);
  assert(await e(`document.querySelector('.diagram-dialog').open`));await key('Escape','Escape',27);await delay(80);assert(!await e(`document.querySelector('.diagram-dialog').open`));
  await v(320,900);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  await e(`document.querySelector('.github-badges').scrollIntoView({behavior:'instant',block:'center'})`);
  await wait(`document.querySelector('.github-badges').dataset.state==='ready'`);
  assert(await e(`[...document.querySelectorAll('.badge-images img')].every(i=>i.referrerPolicy==='no-referrer'&&i.complete)`));
 }
 // Relevant Summary/Content and disabled/code-only hosts use actual shell detection.
 for(const p of ['host-content','host-summary']){
  await n('/preview/'+p+'/');await render('[data-sidera-diagram="mermaid"]');
  assert(await e(`document.querySelector('[data-sidera-diagrams-script]')!==null`));
 }
 for(const p of ['plain','disabled','code','host-plain']){
  const before=b.requests.length;await n('/preview/'+p+'/');
  assert(!await e(`document.querySelector('[data-sidera-diagrams-script],[data-sidera-badges-script],.diagram-renderer')`));
  assert(!b.requests.slice(before).some(u=>u.includes('/vendor/mermaid')||u.includes('/vendor/drawio')||u.includes('img.shields.io')));
 }
 // File bytes/URL remain the native source of truth at dates/base path/language.
 const url='/preview/dated/2026/demo/shape%20%E6%96%87%E4%BB%B6.drawio';
 assert.deepEqual(Buffer.from(await (await fetch(b.origin+url)).arrayBuffer()),await readFile(resolve(root,'content/handbook/reference/diagrams/flow.drawio')));
 await n('/preview/zh/dated/2026/demo/');await render('[data-sidera-diagram="mermaid"]');
 assert(await e(`document.querySelector('.diagram-status').textContent.includes('图表已就绪')`));
 assert.equal(await e(`document.querySelector('.diagram-download').getAttribute('href')`),url);
 // System changes and the opposite explicit author inversion remain distinct.
 await n(route);await render('[data-sidera-diagram="mermaid"]');await e(`Sidera.setColorMode('auto')`);
 for(const palette of ['dark','light']){
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:palette}]});
  await wait(`document.documentElement.dataset.colorScheme==='${palette}'`);await render('[data-sidera-diagram="mermaid"]');
  assert.equal(await e(`document.documentElement.dataset.colorScheme`),palette);
 }
 await e(`document.querySelector('[data-sidera-diagram]').classList.add('invert-when-light');Sidera.setColorMode('dark')`);
 await render('[data-sidera-diagram="mermaid"]');
 assert.equal(await e(`getComputedStyle(document.querySelector('[data-sidera-diagram]')).colorScheme`),'light');
 // Real touch zoom activation; native touch scrolling remains browser-owned.
 await v(390,850);await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 const point=await e(`(()=>{const b=document.querySelector('[data-diagram-action="in"]');b.scrollIntoView({behavior:'instant',block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,h:r.height}})()`);
 assert(point.h>=44);await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert(await e(`document.querySelector('.diagram-view').scrollWidth>document.querySelector('.diagram-view').clientWidth`));
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 // One bad diagram gets an observable source fallback, while its sibling works.
 await n('/preview/failure/');await e(`document.querySelector('#broken').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('#broken').dataset.state==='error'`);await render('#healthy');
 assert(await e(`document.querySelector('#broken .diagram-source').open`));
 // A missing vendor script also fails honestly without an uncaught exception.
 failLibrary=true;await n(route);await e(`document.querySelector('[data-sidera-diagram="mermaid"]').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('[data-sidera-diagram="mermaid"]').dataset.state==='error'`);
 await render('[data-sidera-diagram="drawio"]');failLibrary=false;
 // Verify audited actual diagrams locally in the already-owned opaque services.
 // Read source in memory only: no original files copied into the site or screenshots.
 await n(route);await v(1200,900);await render('[data-sidera-diagram="mermaid"]');await render('[data-sidera-diagram="drawio"]');
 let id=0;
 const probe=async(kind,source)=>e(`new Promise(resolve=>{const request=${JSON.stringify('probe-'+(++id))};const frame=[...document.querySelectorAll('.diagram-renderer')].find(f=>f.src.includes(${JSON.stringify(kind==='mermaid'?'mermaid-':'drawio-')}));const timer=setTimeout(()=>{removeEventListener('message',listener);resolve({timeout:true})},10000);function listener(event){if(event.source===frame.contentWindow&&event.data?.request===request){clearTimeout(timer);removeEventListener('message',listener);resolve({error:!!event.data.error,svg:typeof event.data.svg==='string'&&event.data.svg.includes('<svg')})}}addEventListener('message',listener);frame.contentWindow.postMessage({type:'render',request,source:${JSON.stringify(source)},palette:'light'},'*')})`);
 const original=resolve(root,'../gocalf.com-hugo');let mermaids=0;
 for(const name of ['git-cheats','pgp','the-nand-game','the-nand-game-optional-levels']){
  const text=await readFile(resolve(original,'source/notes',name,'index.md'),'utf8');
  for(const match of text.matchAll(/^```mermaid\s*\n([\s\S]*?)^```\s*$/gm)){
   const result=await probe('mermaid',match[1]);assert.deepEqual(result,{error:false,svg:true},name);mermaids++;
  }
 }
 assert.equal(mermaids,30);
 const files=execFileSync('git',['-C',original,'ls-files','source'],{encoding:'utf8',timeout:10000}).trim().split('\n').filter(p=>p.endsWith('.drawio'));assert.equal(files.length,40);
 for(const file of files)assert.deepEqual(await probe('drawio',await readFile(resolve(original,file),'utf8')),{error:false,svg:true},file);
 // Bad input doesn't poison a later valid diagram; callbacks/config/remote assets inert.
 for(const text of ['flowchart ???','%%{init: {securityLevel:"loose"}}%%\nflowchart LR\nA-->B','sequenceDiagram\nA->>B: Unused'])assert((await probe('mermaid',text)).error);
 assert.deepEqual(await probe('mermaid','flowchart LR\nA-->B'),{error:false,svg:true});
 await probe('mermaid','flowchart LR\nA["<img src=https://blocked.example.invalid/x onerror=alert(1)>"]');
 for(const text of ['<mxfile><diagram>compressed input not supported</diagram></mxfile>','<!DOCTYPE x><mxfile/>'])assert((await probe('drawio',text)).error);
 assert.deepEqual(await probe('drawio',await readFile(resolve(root,'content/handbook/reference/diagrams/flow.drawio'),'utf8')),{error:false,svg:true});
 const xml=await readFile(resolve(root,'content/handbook/reference/diagrams/flow.drawio'),'utf8');
 assert((await probe('drawio',xml.replace('x="30"','x="1e100"'))).error);
 await probe('drawio',xml.replace('Read source','&lt;span style=&quot;background-image:url(https://blocked.example.invalid/pixel)&quot;&gt;Safe&lt;/span&gt;'));

 // Automatic image failure, not a consent prompt; no fabricated metric values.
 failBadges=true;await n(route);await e(`document.querySelector('.github-badges').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('.github-badges').dataset.state==='error'`);
 assert(await e(`[...document.querySelectorAll('.badge-failed')].every(e=>!e.hidden)`));
 assert.equal(await e(`document.querySelector('.badge-repo').href`),'https://github.com/mermaid-js/mermaid');
 failBadges=false;
 // No JS keeps escaped sources/downloads; badges stay ordinary native images.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert(await e(`[...document.querySelectorAll('.diagram-source')].every(d=>d.open)`));
 assert(!await e(`document.querySelector('.diagram-renderer')`));
 assert(await e(`document.querySelector('.diagram-download').getAttribute('download')!==null`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Two captures, synthetic diagrams only.
 await v(1100,850);await n(route);await e(`Sidera.setColorMode('light')`);await render('[data-sidera-diagram="drawio"]');await b.screenshot('diagrams-light');
 await v(390,850);await n('/_chinese'+route);await e(`Sidera.setColorMode('dark')`);await render('[data-sidera-diagram="mermaid"]');await e(`document.querySelectorAll('[data-sidera-diagram="mermaid"]')[1].scrollIntoView({behavior:'instant',block:'center'})`);await wait(`document.querySelectorAll('[data-sidera-diagram="mermaid"]')[1].dataset.state==='ready'`);await render('[data-sidera-diagram="mermaid"]');await b.screenshot('diagrams-mobile');
 assert(!calls.some(u=>u.startsWith('BLOCKED ')),calls.filter(u=>u.startsWith('BLOCKED ')));
 assert.equal(b.errors.length,0,JSON.stringify(b.errors).slice(0,1500));
 console.log('PASS: actual 30 Mermaid + 40 drawio sources locally rendered; synthetic EN/ZH/palettes/fold/grid/zoom/no-JS/bytes/summary/code isolation; badges mocked; no hosted renderer/editor calls');
},{'/_chinese':'chinese-public','/preview':'checks/fixture-public'});
