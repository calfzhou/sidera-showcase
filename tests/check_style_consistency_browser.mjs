// Isolated native fixtures from the theme's check_style_consistency.py.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const contexts=new Map();
 const liveSessions=new Set();
 b.on('Runtime.executionContextCreated',(p,sid)=>{if(p.context.auxData?.isDefault)contexts.set(`${sid}:${p.context.id}`,{sid,id:p.context.id})});
 b.on('Runtime.executionContextDestroyed',(p,sid)=>contexts.delete(`${sid}:${p.executionContextId}`));
 b.on('Runtime.executionContextsCleared',(_,sid)=>{for(const [key,value] of contexts)if(value.sid===sid)contexts.delete(key)});
 b.on('Target.detachedFromTarget',p=>{liveSessions.delete(p.sessionId);for(const [key,value] of contexts)if(value.sid===p.sessionId)contexts.delete(key)});
 b.on('Target.attachedToTarget',async p=>{
  liveSessions.add(p.sessionId);
  try {await call('Runtime.enable',{},p.sessionId);await call('Network.enable',{},p.sessionId);await call('Network.setBlockedURLs',{urls:['https://*']},p.sessionId);await call('Runtime.runIfWaitingForDebugger',{},p.sessionId)}
  catch(error){if(liveSessions.has(p.sessionId)&&!String(error).includes('Session with given id not found'))throw error;} // A navigation can destroy the just-attached test frame.
 });
 await call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
 const frameEval=async expression=>{
  for(const {sid,id} of contexts.values()){
   const r=await call('Runtime.evaluate',{contextId:id,returnByValue:true,awaitPromise:true,expression:`location.pathname.includes('/jsx/frames/')?({found:true,value:(${expression})}):null`},sid);
   if(r.result?.value?.found){assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value.value}
  }
  assert.fail('Sandbox context missing');
 };
 const wait=async expression=>{for(let i=0;i<100;i++){if(await e(expression))return;await delay(50)}assert.fail(expression)};
 const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const a of document.getAnimations())if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()})()`);
 const idle=async()=>{await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await e(`document.activeElement.blur()`);await settle()};
 const hover=async selector=>{const point=await e(`(()=>{document.activeElement.blur();const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x+Math.min(12,r.width/2),y:r.y+Math.min(12,r.height/2)}})()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await settle()};
 const style=selector=>e(`(()=>{const s=getComputedStyle(document.querySelector(${JSON.stringify(selector)}));return {color:s.color,bg:s.backgroundColor,border:s.borderColor,shadow:s.boxShadow,line:s.textDecorationLine,thickness:s.textDecorationThickness,image:s.backgroundImage,opacity:s.opacity}})()`);
 const contrast=selector=>e(`(()=>{
  const el=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
  const rgb=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map(v=>v/255)};
  const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
  const bg=n=>n?over(rgb(getComputedStyle(n).backgroundColor),bg(n.parentElement)):[1,1,1,1];
  const lum=c=>c.slice(0,3).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  const back=bg(el),fore=rgb(s.color);fore[3]*=Number(s.opacity);const border=over(rgb(s.borderTopColor),back);
  return {text:ratio(over(fore,back),back),border:ratio(border,back),outerBorder:ratio(border,bg(el.parentElement))};
 })()`);
 const results=[];
 await v(1440,1100);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const mode of ['light','dark']){
  await n('/preview/probe/');await e(`Sidera.setColorMode('${mode}')`);await idle();
  const samples=[];
  for(const selector of ['.article-toc [data-toc] a:not([aria-current])','.content-link-url','.timeline-label']){const c=await contrast(selector);assert(c.text>=4.5,JSON.stringify({mode,selector,c}));samples.push(c.text)}
  assert.equal((await style('.content-link-url')).opacity,'1');
  assert(await e(`parseFloat(getComputedStyle(document.querySelector('.article-header h1')).fontSize)>parseFloat(getComputedStyle(document.querySelector('.prose h2')).fontSize)`));
  const link='.prose p a[href="#reading"]';const ending='.article-end a';await hover(link);const linkHover=await style(link);await hover(ending);assert.deepEqual(await style(ending),linkHover,'Final article text uses body link styling');
  assert(await e(`!document.querySelector('.article-end').classList.contains('prose')`));
  // Inline emphasis stays in one text flow; only the label and toggle are flex items.
  assert(await e(`Array.from(document.querySelectorAll('.content-folding>summary')).every(s=>s.children.length===2&&s.firstElementChild.classList.contains('folding-title'))`));
  assert(await e(`(()=>{const label=document.querySelectorAll('.folding-title')[1],r=document.createRange();r.selectNode(label.firstChild);return label.querySelector('strong').getBoundingClientRect().left-r.getBoundingClientRect().right<8})()`));
  await e(`document.querySelectorAll('.content-folding>summary')[1].focus()`);await key('Enter','Enter',13);assert(await e(`document.querySelectorAll('.content-folding')[1].open`));await key('Enter','Enter',13);
  await e(`document.querySelector('.content-folding').scrollIntoView({block:'center',behavior:'instant'})`);await b.screenshot('style-content-'+mode);
  await e(`document.querySelector('.content-jsx').scrollIntoView({block:'center',behavior:'instant'})`);await wait(`document.querySelector('.content-jsx').dataset.state==='ready'`);await idle();
  const boundary=await contrast('.jsx-root input');assert(boundary.border>=3&&boundary.outerBorder>=3,JSON.stringify(boundary));
  const disabled='.jsx-root button:disabled';const disabledRest=await style(disabled);await hover(disabled);assert.deepEqual(await style(disabled),disabledRest,'Disabled buttons do not respond visually to hover');
  await hover('.jsx-root button:enabled');const enabledHover=await style('.jsx-root button:enabled');await idle();await key('Tab','Tab',9);await e(`document.querySelector('.jsx-root button:enabled').focus()`);await settle();assert.deepEqual(await style('.jsx-root button:enabled'),enabledHover);
  // New semantic overrides must cross the existing bounded iframe bridge.
  await e(`document.querySelectorAll('.content-jsx')[1].scrollIntoView({block:'center',behavior:'instant'})`);await wait(`document.querySelectorAll('.content-jsx')[1].dataset.state==='ready'`);
  const inputPaint=`(()=>{const s=getComputedStyle(document.querySelector('.jsx-root input'));return [s.color,s.backgroundColor,s.borderColor]})()`;
  assert.deepEqual(await frameEval(inputPaint),await e(inputPaint));
  await e(`document.documentElement.style.setProperty('--control-border','#707c88');document.documentElement.style.setProperty('--secondary-text','#667788');Sidera.setColorMode('${mode==='light'?'dark':'light'}')`);await delay(120);
  assert.deepEqual(await frameEval(`['--control-border','--secondary-text'].map(k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim())`),['#707c88','#667788']);
  await n('/preview/probe/');await e(`Sidera.setColorMode('${mode}')`);await hover('.left-region .social-link');const social=await style('.left-region .social-link');
  await n('/preview/compact/');await hover('.compact-header .social-link');assert.deepEqual(await style('.compact-header .social-link'),social,'Identical social controls across placements');
  await n('/preview/probe/');await hover('.content-link-card');
  const expectedShadow=await e(`(()=>{const p=document.createElement('div');p.style.boxShadow='var(--card-hover-shadow)';document.body.append(p);const s=getComputedStyle(p).boxShadow;p.remove();return s})()`);
  assert.equal((await style('.content-link-card')).shadow,expectedShadow,'Link-card hover uses the shared neutral elevation');
  await n('/preview/notes/');await idle();await hover('.article-card:has(.card-content)');assert.equal((await style('.article-card:has(.card-content)')).shadow,expectedShadow);await idle();const number=await contrast('.pagination .page-number:not([aria-current])');assert(number.text>=4.5);samples.push(number.text);
  await e(`scrollTo({top:400,behavior:'instant'})`);await wait(`document.querySelector('.top-region').classList.contains('is-stuck')`);
  assert.equal(await e(`getComputedStyle(document.querySelector('.collection-nav-surface')).textShadow`),'none');
  assert.equal(await e(`getComputedStyle(document.querySelector('.collection-nav-surface')).backdropFilter`),'blur(8px)');
  assert.equal(await e(`getComputedStyle(document.querySelector('.collection-nav-surface'),'::after').content`),'none');
  await b.screenshot('style-navigation-'+mode);
  await n('/preview/guide/first/');await idle();const neighbor=await contrast('.neighbor-label');assert(neighbor.text>=4.5);samples.push(neighbor.text);
  await n('/preview/probe/');await e(`const i=document.querySelector('#search-input');i.value='reading';i.dispatchEvent(new Event('input',{bubbles:true}))`);await wait(`!!document.querySelector('.search-result-link')`);await idle();const resultRest=await style('.search-result-link');await hover('.search-result-link');const resultHover=await style('.search-result-link');assert.equal(resultHover.line,'none');assert.notEqual(resultHover.bg,resultRest.bg);
  // Homepage standalone destinations are text links, just like body/footer links.
  await n('/preview/probe/');await idle();const bodyRest=await style('.prose p a[href="#reading"]');
  await hover('.prose p a[href="#reading"]');const bodyHover=await style('.prose p a[href="#reading"]');
  await n('/preview/');await idle();const standalone='.standalone-list a[href="/preview/probe/"]';
  assert.deepEqual(await style(standalone),bodyRest,'Standalone links share resting text-link styles');
  await hover(standalone);assert.deepEqual(await style(standalone),bodyHover,'Standalone hover shares the visible highlight');
  assert.notEqual(bodyHover.bg,bodyRest.bg);
  await idle();await key('Tab','Tab',9);await e(`document.querySelector('${standalone}').focus()`);await settle();
  assert.deepEqual(await style(standalone),bodyHover);assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
  await key('Enter','Enter',13);await wait(`location.pathname==='/preview/probe/'`);
  results.push(mode+': secondary text minimum '+Math.min(...samples).toFixed(2)+':1; input border '+Math.min(boundary.border,boundary.outerBorder).toFixed(2)+':1; fold/link/state/compact/header/sandbox checks');
 }
 await v(390,844);await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await n('/preview/probe/?kw=reading');await e(`Sidera.setColorMode('light')`);await settle();
 for(const selector of ['.search-highlight-clear','.code-copy','.share-action','.video-load'])assert(await e(`document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().height>=44`),selector);
 assert(await e(`(()=>{const t=document.querySelectorAll('.folding-title')[2],s=t.closest('summary');return t.getBoundingClientRect().height>parseFloat(getComputedStyle(t).lineHeight)*1.5&&s.lastElementChild.getBoundingClientRect().right<=s.getBoundingClientRect().right})()`));
 // Toolbar space is reserved in initial HTML/CSS, not inserted by readiness.
 assert(await e(`(()=>{const block=document.querySelector('.code-block.copy-ready'),pre=block.querySelector('pre'),before=pre.getBoundingClientRect().height;block.classList.remove('copy-ready');const same=pre.getBoundingClientRect().height===before;block.classList.add('copy-ready');return same})()`));
 // The enlarged mobile copy button must not cover the first code line.
 assert(await e(`(()=>{const copy=document.querySelector('.code-block.copy-ready .code-copy').getBoundingClientRect(),code=document.querySelector('.code-block.copy-ready pre code').getBoundingClientRect();return copy.bottom<=code.top+1})()`));
 await wait(`document.querySelector('#left-region').getAttribute('popover')==='auto'`);await e(`document.querySelector('[data-region="left"]').click()`);await wait(`document.querySelector('#left-region').matches(':popover-open')`);
 assert(await e(`document.querySelector('.left-region .drawer-close').getBoundingClientRect().height>=44`));await e(`document.querySelector('.left-region .drawer-close').click()`);
 assert(await e(`document.documentElement.scrollWidth<=innerWidth`));await b.screenshot('style-mobile');
 await n('/preview/zh/probe/');assert(await e(`document.querySelector('.theme-credit').textContent.includes('构建')`));assert(await e(`document.querySelector('.folding-title strong').textContent==='important'`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/preview/probe/',false);assert(await e(`document.querySelector('.folding-title strong')!==null`));await e(`document.documentElement.style.fontSize='27px'`);assert(await e(`parseFloat(getComputedStyle(document.querySelector('.article-header h1')).fontSize)>parseFloat(getComputedStyle(document.querySelector('.prose h2')).fontSize)&&document.documentElement.scrollWidth<=innerWidth`));await e(`document.querySelector('summary').focus()`); // Native DOM remains available without JS.
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/preview/',false);
 const standalone='.standalone-list a[href="/preview/probe/"]';await idle();const nojsRest=await style(standalone);await hover(standalone);
 assert.equal(nojsRest.thickness,'2px');assert.notEqual((await style(standalone)).bg,nojsRest.bg);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 results.push('Homepage standalone links: body-style parity, hover/focus, keyboard navigation and no-JS; mobile actions, code-toolbar clearance, wrapped titles and EN/ZH');
 await writeFile(resolve(b.run,'style-consistency-results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS '+results.join('; '));
},{'/preview':resolve(process.argv[3]||resolve(process.argv[2],'public'))});
