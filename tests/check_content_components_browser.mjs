// Repository-local isolated Chrome only. Every clipboard write is mocked.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
const route='/handbook/reference/content-components/';
const value='AAAA BBBB CCCC DDDD  EEEE FFFF 0000 1111';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 let mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{(window.testCopies??=[]).push(text)}}})`});
 for(const [prefix,mode,width] of [['','dark',1440],['','light',390],['/_chinese','dark',390],['/_chinese','light',1440]]){
  await v(width,1000);await n(prefix+route);await e(`Sidera.setColorMode('${mode}')`);
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  assert(!await e(`document.querySelector('.content-emoji')`));
  assert(await e(`[...document.querySelectorAll('.prose p')].some(p=>p.textContent.includes('aabcc.'))`),'u must not insert a space');
  assert.equal(await e(`document.querySelector('.content-copy .copy-value').textContent`),value);
  assert(await e(`(()=>{const c=document.querySelector('.content-copy'),items=['.copy-prefix','.copy-value','.code-copy'].map(s=>c.querySelector(s).getBoundingClientRect());return items.every((a,i)=>items.slice(i+1).every(b=>a.right<=b.left+.5||b.right<=a.left+.5||a.bottom<=b.top+.5||b.bottom<=a.top+.5))})()`),'Copy label/value/button must not overlap');
  await e(`document.querySelector('.content-copy .code-copy').focus()`);await key('Enter','Enter',13);await delay(100);
  assert.equal(await e(`window.testCopies[0]`),value);
  assert.equal(await e(`document.querySelector('.content-copy .code-copy').textContent`),prefix?'已复制':'Copied');
  assert(await e(`document.activeElement.matches('.content-copy .code-copy')&&document.activeElement.matches(':focus-visible')`));
  assert(await e(`document.querySelector('#sidera-toast-status').textContent.includes(${JSON.stringify(prefix?'文本已复制':'Text copied')})`));
  // Existing C1 UI remains independent, exact source excludes all labels/line numbers.
  await e(`document.querySelector('.code-block .code-copy').click()`);await delay(100);
  assert.equal(await e(`window.testCopies[1]`),'Only this harmless text is copied.\nNo included code is executed.\n');
 }
 await v(1440,1000);await n(route);await e(`document.querySelector('.content-copy .code-copy').click()`);await delay(3200);
 assert.equal(await e(`document.querySelector('.content-copy .code-copy').textContent`),'Copy');
 // Actual native card activation, query, heading and resource bytes; never open a remote card.
 await e(`document.querySelector('.content-link-card').focus()`);await key('Enter','Enter',13);
 for(let i=0;i<80;i++){if(await e(`location.hash==='#give-a-link-a-reason'&&document.querySelector(':target')?.id==='give-a-link-a-reason'`))break;assert(i<79);await delay(50);}
 assert.equal(await e('location.pathname'),'/journal/2026/04/14/connect-the-useful-parts/');assert.equal(await e('location.search'),'?from=components');
 const file=await fetch(b.origin+route+'example.txt');assert.equal(await file.text(),'Only this harmless text is copied.\nNo included code is executed.\n');
 // Long content and malformed-looking labels remain text, including clipboard payloads.
 await v(320,1000);await n('/_safety/component-safety/');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 assert(await e(`[...document.querySelectorAll('.prose p')].some(p=>p.textContent==='Inline:Aaabcc|BCtrl+K|C✓done.')`),'Inline shortcode adjacency must be exact');
 assert(await e(`[...document.querySelectorAll('.prose p')].some(p=>p.textContent==='Spaced: A aa bcc.')`),'Authored spaces must remain');
 await e(`document.querySelector('.content-copy .code-copy').click()`);await delay(100);
 assert.equal(await e('window.testCopies[0]'),'  α & <tag>  β  ');assert(!await e(`document.querySelector('.prose script,.prose img[src="x"]')`));
 await n('/_override'+route);await e(`document.querySelector('.content-copy .code-copy').click()`);await delay(100);
 assert(!await e(`document.querySelector('#sidera-toast img')`));assert(await e(`document.querySelector('#sidera-toast').textContent.includes('<img src=x onerror=bad()>')`));
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 for(const available of [true,false]){
  mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:${available?"{writeText:async()=>{throw new Error('denied')}}":"undefined"}})`});
  await n(route);await e(`document.querySelector('.content-copy .code-copy').focus()`);await key('Enter','Enter',13);await delay(100);
  assert(await e(`(()=>{const t=document.querySelector('.content-copy textarea');return !t.hidden&&t.value===${JSON.stringify(value)}&&t.selectionStart===0&&t.selectionEnd===t.value.length&&document.activeElement===t&&!document.querySelector('.content-copy.is-copied')})()`));
  assert(await e(`document.querySelector('#sidera-toast-status').textContent.startsWith('Could not copy.')`));
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 }
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await n(route);
 assert.equal(await e(`getComputedStyle(document.querySelector('.content-copy .code-copy')).opacity`),'1');
 assert(await e(`document.querySelector('.content-copy .code-copy').getBoundingClientRect().height>=44`));
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await n(route);assert.equal(await e(`getComputedStyle(document.querySelector('.content-quot p')).transitionDuration`),'0s');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert(await e(`[...document.querySelectorAll('.code-copy')].every(x=>x.hidden)`));
 assert.equal(await e(`document.querySelector('.content-copy .copy-value').textContent`),value);
 await e(`document.querySelector('.content-link-card').focus()`);await key('Enter','Enter',13);await delay(250);
 assert.equal(await e('location.pathname'),'/journal/2026/04/14/connect-the-useful-parts/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})`});
 await v(1100,850);await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('#a-sentence-worth-pausing-on').scrollIntoView({behavior:'instant'})`);await b.screenshot('components-dark');
 await v(390,850);await n(route);await e(`Sidera.setColorMode('light');document.querySelector('#copy-only-the-value').scrollIntoView({behavior:'instant'});document.querySelector('.content-copy .code-copy').click()`);await delay(150);await b.screenshot('components-copy-mobile');
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS independent C2 primitives: keyboard exact mock-copy/timer/failure, cards/native hrefs, EN/ZH/palettes/mobile/touch/reduced-motion/no-JS; no container-composition claim');
},{'/_chinese':'chinese-public','/_safety':'safety-public','/_override':'overrides-public'});
