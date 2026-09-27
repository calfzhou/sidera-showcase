// Local isolated Chrome only. Clipboard writes are mocked, including exact CRLF.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,key,call,delay}=b;
 let mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{(window.testCopies??=[]).push(text)}}})`});
 const source=await readFile(new URL('../content/notes/code-inclusion/pairs.py',import.meta.url),'utf8');
 const selected=source.split(/(?<=\n)/).slice(3,8).join('');
 for(const [prefix,mode,width] of [['','dark',1440],['','light',390],['/_chinese','dark',390]]){
  await v(width,950);await n(prefix+'/notes/code-inclusion/');await e(`Sidera.setColorMode('${mode}')`);
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert.equal(await e(`document.querySelectorAll('[data-code-source].copy-ready').length`),3);
  for(let i=0;i<2;i++){
   await e(`document.querySelectorAll('[data-code-source] .code-copy')[${i}].focus()`);await key('Enter','Enter',13);await delay(100);
   assert.equal(await e(`window.testCopies[${i}]`),i?selected:source);
   assert.equal(await e(`document.querySelectorAll('[data-code-source] .code-copy')[${i}].textContent`),prefix?'已复制':'Copied');
  }
  assert(await e(`document.querySelector('#sidera-toast').textContent.includes(${JSON.stringify(prefix?'代码已复制':'Code copied')})`));
  // Title is outside the scrollport; no metadata/language/copy overlap.
  assert(await e(`(()=>{const b=document.querySelector('[data-code-source]'),t=b.querySelector('.code-source').getBoundingClientRect(),c=b.querySelector('.code-toolbar').getBoundingClientRect(),l=b.querySelector('.line').getBoundingClientRect();return t.bottom<=c.top&&c.bottom<=l.top+1})()`));
  const download=await e(`document.querySelector('[data-code-source] .code-source a').getAttribute('href')`);
  assert.equal(await (await fetch(b.origin+download)).text(),source);
 }
 await n('/snippet-check/');
 const payloads=await e(`[...document.querySelectorAll('[data-code-source]')].map(b=>JSON.parse(b.dataset.codeSource))`);
 assert(payloads.some(s=>s.includes('\r\n')));
 for(let i=0;i<payloads.length;i++){
  await e(`document.querySelectorAll('[data-code-source] .code-copy')[${i}].click()`);await delay(50);
  assert.equal(await e(`window.testCopies[${i}]`),payloads[i]);
 }
 // Keyboard local scroll on literal angle brackets/fences/shortcode-looking source.
 await v(320,900);await e(`document.querySelectorAll('[data-code-source]')[4].scrollIntoView({block:'center',behavior:'instant'});document.querySelectorAll('[data-code-source] .code-copy')[4].focus()`);
 await key('Tab','Tab',9);
 assert(await e(`document.activeElement.matches('pre')&&document.activeElement.matches(':focus-visible')`));
 await key('ArrowRight','ArrowRight',39);await delay(200);
 assert(await e(`document.activeElement.scrollLeft>0||document.activeElement.closest('.highlight').scrollLeft>0`));
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 for(const value of ["{writeText:async()=>{throw new Error('denied')}}",'undefined']){
  mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:${value}})`});
  await n('/snippet-check/');await e(`document.querySelectorAll('[data-code-source] .code-copy')[5].click()`);await delay(100);
  const f=await e(`(()=>{const b=document.querySelectorAll('[data-code-source]')[5],t=b.querySelector('textarea');return {value:t.value,expected:JSON.parse(b.dataset.codeSource),selected:t.selectionEnd===t.value.length&&t.selectionStart===0,focus:document.activeElement===t,hidden:t.hidden,copied:b.classList.contains('is-copied')}})()`);
  // Native textarea line endings are normalized; the full-source download is lossless.
  assert.equal(f.value,f.expected.replaceAll('\r\n','\n'));assert(f.selected&&f.focus&&!f.hidden&&!f.copied);
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/code-inclusion/',false);
 assert(await e(`[...document.querySelectorAll('[data-code-source] .code-copy')].every(b=>b.hidden)`));
 assert.equal(await e(`document.querySelector('[data-code-source] code').textContent`),source);
 assert(await e(`document.querySelector('[data-code-source] .code-source a').hasAttribute('download')`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await v(1150,900);await n('/notes/code-inclusion/');await e(`Sidera.setColorMode('dark');document.querySelector('[data-code-source]').scrollIntoView({block:'start',behavior:'instant'})`);await b.screenshot('inclusion-desktop');
 await v(390,850);await e(`Sidera.setColorMode('light');document.querySelectorAll('[data-code-source]')[1].scrollIntoView({block:'center',behavior:'instant'})`);await b.screenshot('inclusion-mobile');
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS inclusion palette/mobile/keyboard/no-JS, exact mocked copy including CRLF, manual failure/missing API, native full downloads; own instances stopped by harness');
},{'/_chinese':'chinese-public'});
