// Isolated footer interactions. Clipboard is mocked; no share provider or repository is opened.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 let clipboard=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopied=text}}})`});
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[320,'light','/_chinese'],[390,'light','/preview']]){
  await v(width,960);await n(prefix+'/notes/footer-probe/');await e(`Sidera.setColorMode('${mode}')`);await delay(220);
  const state=await e(`(()=>{const f=document.querySelector('.article-footer-box');return{items:[...f.querySelectorAll('[data-footer-item]')].map(n=>n.dataset.footerItem),headerAuthors:!!document.querySelector('.article-header .author-attribution'),headingSize:getComputedStyle(f.querySelector('h2')).fontSize,border:getComputedStyle(f).borderTopWidth,overflow:document.documentElement.scrollWidth>innerWidth,blank: [...document.querySelectorAll('.article-footer-box')].some(b=>!b.textContent.trim()),qr:f.querySelector('.share-qr').open,hiddenCopy:f.querySelector('[data-share-copy]').hidden}})()`);
  assert.deepEqual(state.items,['references','license','authors','share']);assert(!state.headerAuthors&&!state.overflow&&!state.blank&&!state.qr&&!state.hiddenCopy);assert.equal(state.headingSize,'20px');assert.equal(state.border,'1px');
  await e(`document.querySelector('.share-qr summary').focus()`);await key('Enter','Enter',13);await delay(100);
  assert(await e(`document.querySelector('.share-qr').open`));
  await e(`document.querySelector('.share-qr img').decode()`);
  const qr=await e(`(()=>{const i=document.querySelector('.share-qr img');return {loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute('src'),width:i.getBoundingClientRect().width,ancestorWidth:i.parentElement.getBoundingClientRect().width}})()`);
  assert(qr.loaded&&qr.src.startsWith(prefix+'/images/qr/')&&qr.width<=qr.ancestorWidth);
  assert(await e(`(()=>{const panel=document.querySelector('.share-qr-panel').getBoundingClientRect();return [...document.querySelectorAll('.share-action')].filter(a=>!a.hidden).every(a=>a.getBoundingClientRect().bottom<=panel.top)})()`),'QR must sit below all share controls, not between them');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  await key('Enter','Enter',13);assert(!await e(`document.querySelector('.share-qr').open`));
  await e(`document.querySelector('[data-share-copy]').focus()`);await key('Enter','Enter',13);await delay(100);
  assert.equal(await e('window.testCopied'),'https://example.org'+prefix+'/notes/footer-probe/');
  assert(await e(`document.querySelector('#sidera-toast').textContent.includes(${JSON.stringify(prefix==='/_chinese'?'已复制':'copied')})`));
 }
 await v(1440,1100);await n('/notes/package-management/');await e(`Sidera.setColorMode('dark');document.querySelector('.article-footer-box').scrollIntoView({block:'center',behavior:'instant'})`);await delay(240);
 const rect=await e(`(()=>{const r=document.querySelector('.article-footer-box').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:1}});await writeFile(resolve(b.run,'article-footer.png'),Buffer.from(data,'base64'));
 await n('/notes/footer-probe/');await e(`document.querySelector('.share-qr summary').click();document.querySelector('.article-footer-box').scrollIntoView({block:'center',behavior:'instant'})`);await e(`document.querySelector('.share-qr img').decode()`);await delay(100);
 const qrRect=await e(`(()=>{const r=document.querySelector('.article-footer-box').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const qrCapture=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...qrRect,scale:1}});await writeFile(resolve(b.run,'article-footer-qr.png'),Buffer.from(qrCapture.data,'base64'));
 await n('/_repeated/notes/footer-probe/');assert.equal(await e(`document.querySelectorAll('.share-qr').length`),3);
 await e(`document.querySelectorAll('.share-qr summary')[1].click()`);assert.deepEqual(await e(`[...document.querySelectorAll('.share-qr')].map(d=>d.open)`),[false,true,false]);
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='DisclosureTriangle'&&n.name?.value==='Share to WeChat'));
 await n('/_text/notes/footer-probe/');assert.equal(await e(`document.querySelectorAll('.article-footer svg').length`),0);assert(await e(`document.querySelector('.share-qr summary').textContent.includes('WeChat')`));
 // Denied clipboard provides a selected read-only URL, not a false success message.
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:clipboard.identifier});
 clipboard=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}})`});
 await n('/notes/footer-probe/');await e(`document.querySelector('[data-share-copy]').click()`);await delay(100);
 assert(await e(`(()=>{const input=document.querySelector('.share-copy-fallback input');return !input.parentElement.parentElement.hidden&&document.activeElement===input&&input.selectionStart===0&&input.selectionEnd===input.value.length})()`));
 assert(await e(`document.querySelector('#sidera-toast').textContent.includes('Could not copy')`));
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:clipboard.identifier});
 // Missing clipboard and no-JS preserve native URL, QR disclosure, email and provider links.
 clipboard=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})`});
 await n('/notes/footer-probe/');assert(await e(`document.querySelector('[data-share-copy]').hidden&&!document.querySelector('.share-link-fallback').hidden`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await v(390,960);await n('/notes/footer-probe/',false);
 await e(`document.querySelector('.share-qr summary').focus()`);await key('Enter','Enter',13);assert(await e(`document.querySelector('.share-qr').open`));
 assert(await e(`!document.querySelector('.share-link-fallback').hidden&&document.querySelector('[data-share-copy]').hidden`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')),JSON.stringify(b.requests.filter(u=>!u.startsWith(b.origin+'/'))));
 console.log('PASS article footer: source-led box, no header authors, native edit/share URLs, local QR disclosure, repeated independence, safe clipboard success/failure/fallback, EN/ZH/palettes/mobile/keyboard/AX/no-JS and no external requests');
},{'/_chinese':'chinese-public','/preview':'subpath-public','/_repeated':'repeated-public','/_text':'text-icons-public','':'full-public'});
