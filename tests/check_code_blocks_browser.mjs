// Only mocked clipboard writes; never overwrite the user's real clipboard in tests.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const until=async expression=>{for(let i=0;i<30;i++){if(await e(expression))return;await delay(50);}assert.fail('Timed out: '+expression);};
 let mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{(window.testCopies??=[]).push(text)}}})`});
 const expected=['# Keep the numbers out of the clipboard.\nvalue = "<&> 你好"\nprint(value)','const text = "<script>not executable</script>";\n\tconsole.log(text);','plain <&> text\n\twith a tab','unrecognized syntax stays copyable',''];
 for(const prefix of ['', '/_chinese'])for(const mode of ['dark','light'])for(const width of [1440,390]){
  await v(width,1000);await n(prefix+'/code-check/');await e(`Sidera.setColorMode('${mode}')`);
  assert.equal(await e(`document.querySelectorAll('.code-block.copy-ready').length`),5);
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  const metrics=await e(`(()=>{const b=document.querySelector('.code-block'),pre=b.querySelector('.lntd:last-child pre'),toolbar=b.querySelector('.code-toolbar');return {top:parseFloat(getComputedStyle(pre).paddingTop),bottom:parseFloat(getComputedStyle(pre).paddingBottom),overlap:toolbar.getBoundingClientRect().bottom>pre.querySelector('.line').getBoundingClientRect().top+.5}})()`);
  assert(metrics.top>=30&&metrics.bottom>=30&&!metrics.overlap,JSON.stringify(metrics));
  for(let i=0;i<5;i++){
   await e(`document.querySelectorAll('.code-copy')[${i}].focus()`);await key('Enter','Enter',13);await delay(60);
   assert.equal(await e(`window.testCopies[${i}]`),expected[i]);
   assert.equal(await e(`document.querySelectorAll('.code-copy')[${i}].textContent`),prefix?'已复制':'Copied');
  }
  await until(`document.querySelector('#sidera-toast-status').textContent.includes(${JSON.stringify(prefix?'代码已复制':'Code copied')})`);
 }
 await v(1440,1000);await n('/code-check/');await e(`document.querySelector('.code-block').scrollIntoView({block:'center',behavior:'instant'})`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(100);
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-language')).visibility`),'visible');
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-copy')).opacity`),'0');
 const point=await e(`(()=>{const r=document.querySelector('.lntd:last-child pre').getBoundingClientRect();return{x:r.x+40,y:r.y+45}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(100);
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-copy')).opacity`),'1');
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-language')).visibility`),'hidden');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 assert.equal(await e(`getComputedStyle(document.querySelector('.highlight')).outlineStyle`),'none','Pointer click must not show the old outer ring');
 assert.equal(await e(`getComputedStyle(document.querySelector('.lntd:last-child pre')).outlineStyle`),'none');
 // Real keyboard movement still draws one outer ring, not an inner pre outline.
 await e(`document.querySelector('.code-copy').focus()`);await key('Tab','Tab',9);
 assert(await e(`document.activeElement.matches('pre')&&document.activeElement.matches(':focus-visible')`));
 assert.equal(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
 assert.equal(await e(`getComputedStyle(document.activeElement.closest('.highlight')).outlineWidth`),'2px');
 await e(`document.querySelector('.code-copy').focus()`);await key('Enter','Enter',13);await delay(100);
 assert(await e(`document.activeElement.matches('.code-copy')`),'Copy must retain keyboard focus');
 assert.equal(await e(`document.querySelector('.code-copy').textContent`),'Copied');
 await e(`document.activeElement.blur()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-copy')).opacity`),'1','Success remains visible after leaving the block');
 await delay(3100);assert.equal(await e(`document.querySelector('.code-copy').textContent`),'Copy');
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-language')).visibility`),'visible');
 // Scroll wide code; the corner control must not travel with the code scrollport.
 await n('/handbook/reference/markdown/');await e(`document.querySelector('.code-block').scrollIntoView({behavior:'instant'})`);
 const before=await e(`document.querySelector('.code-toolbar').getBoundingClientRect().right`);
 await e(`document.querySelector('.highlight').scrollLeft=200`);
 assert.equal(await e(`document.querySelector('.code-toolbar').getBoundingClientRect().right`),before);
 assert(await e(`document.querySelector('.highlight').scrollLeft>0`));
 // Toast escaping and independent per-block Copied state.
 await n('/_override/code-check/');await e(`document.querySelector('.code-copy').click()`);await delay(80);
 assert(!await e(`document.querySelector('#sidera-toast img')`));assert(await e(`document.querySelector('#sidera-toast').textContent.includes('<img src=x onerror=alert(1)>')`));
 assert.equal(await e(`document.querySelectorAll('.code-block.is-copied').length`),1);
 // The pre-existing article share action still copies the permalink, not code.
 await n('/code-check/');await e(`document.querySelector('[data-share-copy]').click()`);await delay(80);
 assert.equal(await e('window.testCopies[0]'),'https://example.org/code-check/');
 await e(`document.querySelector('.code-copy').click()`);await delay(80);assert.equal(await e('window.testCopies[1]'),expected[0]);
 // Denied/missing clipboard: selected manual text, no false success.
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 for(const available of [true,false]){
  mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:${available?"{writeText:async()=>{throw new Error('denied')}}":"undefined"}})`});
  await n('/code-check/');await e(`document.querySelectorAll('.code-copy')[1].click()`);await delay(100);
  const fallback=await e(`(()=>{const t=document.querySelectorAll('.code-copy-fallback')[1];return {text:t.value,selected:t.selectionStart===0&&t.selectionEnd===t.value.length,focused:document.activeElement===t,hidden:t.hidden,copied:!!document.querySelector('.code-block.is-copied')}})()`);
  assert.equal(fallback.text,expected[1]);assert(fallback.selected&&fallback.focused&&!fallback.hidden&&!fallback.copied);
  await until(`document.querySelector('#sidera-toast-status').textContent.startsWith('Could not copy.')`);
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 }
 // Touch exposes the language plus action without depending on hover.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(320,1000);await n('/code-check/');
 assert.equal(await e(`getComputedStyle(document.querySelector('.code-copy')).opacity`),'1');assert.equal(await e(`getComputedStyle(document.querySelector('.code-language')).visibility`),'visible');
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/code-check/',false);
 assert(await e(`[...document.querySelectorAll('.code-copy')].every(b=>b.hidden)`));assert.equal(await e(`getComputedStyle(document.querySelector('.code-language')).visibility`),'visible');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // One compact final capture, with the existing site toast rather than an OS notification.
 mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})`});
 await v(1050,820);await n('/handbook/reference/markdown/');await e(`Sidera.setColorMode('dark');document.querySelector('.code-block').scrollIntoView({behavior:'instant'})`);
 await e(`document.querySelector('.code-copy').click()`);await delay(120);await b.screenshot('code-copied');
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS code language/copy/copied/toast, exact rendered text sans numbers, EN/ZH/palettes/mobile, padding/pinned corner, pointer vs keyboard focus, independent states, timed reset, safe failure/manual/no-JS/touch');
},{'/_chinese':'chinese-public','/_override':'override-public'});
