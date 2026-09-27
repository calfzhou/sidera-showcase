// Local isolated Chrome; clipboard writes mocked, no external navigation.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
const route='/handbook/reference/content-components/';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{(window.testCopies??=[]).push(text)}}})`});
 const until=async expression=>{for(let i=0;i<50;i++){if(await e(expression))return;await delay(40);}assert.fail(expression);};
 for(const [prefix,mode,width] of [['','dark',1440],['','light',390],['/_chinese','dark',390],['/_chinese','light',1440]]){
  await v(width,1000);await n(prefix+route);await e(`Sidera.setColorMode('${mode}')`);
  assert(!await e(`document.querySelector('#fold-comparison').open`));
  assert(await e(`document.querySelector('#fold-code').open`));
  await e(`document.querySelector('#fold-comparison > summary').focus()`);await key('Enter','Enter',13);
  await until(`document.querySelector('#fold-comparison').open`);
  assert(await e(`document.activeElement.matches('#fold-comparison > summary:focus-visible')`));
  await key(' ','Space',32);await until(`!document.querySelector('#fold-comparison').open`);await key('Enter','Enter',13);await until(`document.querySelector('#fold-comparison').open`);
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  assert(await e(`document.querySelector('#fold-comparison > summary .katex')&&document.querySelector('link[data-sidera-math]')`));
  const cells=await e(`(()=>{const c=[...document.querySelectorAll('#fold-comparison .content-cell')];return c.map(x=>({cards:x.querySelectorAll('.content-link-card').length,width:x.getBoundingClientRect().width,caption:[...x.querySelectorAll('figcaption')].map(n=>getComputedStyle(n).display)}))})()`);
  assert.equal(cells.length,2);assert.equal(cells[0].cards,1);assert.equal(cells[1].cards,2);assert(cells.every(c=>c.width>0));assert.notEqual(cells[0].caption[0],'none');assert.equal(cells[1].caption[0],'none');
  await e(`document.querySelector('#fold-comparison .code-copy').focus()`);await key('Enter','Enter',13);await delay(80);
  assert.equal(await e(`window.testCopies[0]`),'No included code is executed.\n');
  assert.equal(await e(`document.querySelector('#fold-comparison .code-copy').textContent`),prefix?'已复制':'Copied');
  await e(`document.querySelector('#fold-code .code-copy').click()`);await delay(80);
  assert.equal(await e(`window.testCopies[1]`),'Only this harmless text is copied.\nNo included code is executed.\n');
 }
 // Native link activation inside the actual open fold + grid + cell.
 await n(route);await e(`document.querySelector('#fold-comparison > summary').focus()`);await key('Enter','Enter',13);
 await e(`document.querySelector('#fold-comparison .content-link-card').focus()`);await key('Enter','Enter',13);
 await until(`location.pathname==='/journal/2026/04/14/connect-the-useful-parts/'&&location.hash==='#give-a-link-a-reason'`);
 // Repeated local ordinals in siblings must retain exact independent CRLF source.
 await v(390,900);await n('/composition/');await e(`document.querySelector('#test-fold > summary').focus()`);await key('Enter','Enter',13);
 assert(await e(`(()=>{const g=document.querySelector('#five-grid'),c=g.firstElementChild;return Math.abs(c.getBoundingClientRect().width-(g.getBoundingClientRect().width-64)/5)<1})()`));
 for(const [id,text] of [['first-cell','first = "<script>not code execution</script>"\r\n'],['second-cell','second = 2\n']]){
  await e(`document.querySelector('#${id} .code-copy').click()`);await delay(70);assert.equal(await e(`window.testCopies.at(-1)`),text);
 }
 assert(await e(`[...document.querySelectorAll('#first-cell p')].some(x=>x.textContent==='Aaabcc|✓ & <tag> $not_math$end|\u0060.')`));
 const url=await e(`document.querySelector('#first-cell .code-source a').getAttribute('href')`);assert.equal(await (await fetch(b.origin+url)).text(),'first = "<script>not code execution</script>"\r\nsecond = 2\n');
 await e(`Sidera.setColorMode('dark');document.querySelector('#marked-group img').classList.add('invert-when-dark')`);
 assert(await e(`getComputedStyle(document.querySelector('#marked-group')).filter!=='none'&&getComputedStyle(document.querySelector('#marked-group img')).filter!=='none'`),'Explicit nested filters still compound');
 await e(`document.querySelector('#first-cell .code-copy').focus()`);await key('Tab','Tab',9);await key('ArrowRight','ArrowRight',39);await delay(150);
 assert(await e(`document.activeElement.scrollLeft>0||document.activeElement.closest('.highlight')?.scrollLeft>0`),'Nested code scrolls locally with keyboard');
 // Browser viewport stress: fixed columns and responsive minimum preserve authored semantics.
 for(const width of [320,390,780]){await v(width,1000);await n(route);await e(`document.querySelector('#fold-comparison').open=true`);assert(await e(`document.documentElement.scrollWidth<=innerWidth`));}
 // Clipboard denial inside a fold keeps it open, selects only the displayed source.
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
 const denied=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}})`});
 await n(route);await e(`document.querySelector('#fold-comparison > summary').focus()`);await key('Enter','Enter',13);await e(`document.querySelector('#fold-comparison .code-copy').click()`);await delay(100);
 assert(await e(`(()=>{const d=document.querySelector('#fold-comparison'),t=d.querySelector('textarea');return d.open&&!t.hidden&&t.value===${JSON.stringify('No included code is executed.\n')}&&document.activeElement===t&&t.selectionStart===0&&t.selectionEnd===t.value.length&&!d.querySelector('.is-copied')})()`));
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:denied.identifier});
 // A real touch tap on the native summary, not only a narrow desktop viewport.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(390,900);await n(route);
 await e(`document.querySelector('#fold-comparison > summary').scrollIntoView({block:'center',behavior:'instant'})`);
 const touch=await e(`(()=>{const r=document.querySelector('#fold-comparison > summary').getBoundingClientRect();return {x:r.x+25,y:r.y+r.height/2}})()`);
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...touch,id:0}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await until(`document.querySelector('#fold-comparison').open`);
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 // No JS: native disclosure and links still work; copy is honestly hidden.
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 await e(`document.querySelector('#fold-comparison > summary').focus()`);await key('Enter','Enter',13);await until(`document.querySelector('#fold-comparison').open`);
 assert(await e(`[...document.querySelectorAll('.code-copy')].every(x=>x.hidden)`));assert(await e(`document.querySelector('#fold-comparison .code-block .lntd:last-child code').textContent.includes('No included code')`));
 await e(`document.querySelector('#fold-comparison .content-link-card').focus()`);await key('Enter','Enter',13);await until(`location.pathname==='/journal/2026/04/14/connect-the-useful-parts/'`);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Two inspected reference-led views, not a screenshot gallery.
 await v(1100,900);await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('#fold-comparison').open=true;document.querySelector('#fold-comparison').scrollIntoView({behavior:'instant'})`);await b.screenshot('composition-dark');
 await v(390,900);await n(route);await e(`Sidera.setColorMode('light');document.querySelector('#fold-code').scrollIntoView({behavior:'instant'})`);await b.screenshot('composition-mobile');
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS native folding keyboard/no-JS, nested code exact mocked copy/download/failure, grid/links/captions/filters, EN/ZH/palettes/responsive/no external requests');
},{'/_chinese':'chinese-public'});
