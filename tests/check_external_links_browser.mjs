import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b,rows=[];
 for(const prefix of ['', '/_chinese'])for(const mode of ['dark','light'])for(const width of [1440,320]){
  await v(width,1000);await n(prefix+'/link-check/');await e(`Sidera.setColorMode('${mode}')`);
  const state=await e(`(()=>{const body=document.querySelector('article .prose');return {overflow:document.documentElement.scrollWidth>innerWidth,links:[...body.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),marker:!!a.querySelector('.external-link-marker'),text:a.textContent,target:a.getAttribute('target'),rel:a.getAttribute('rel')})),suffixes:[...body.querySelectorAll('.external-link-marker')].map(m=>({text:m.textContent,svg:!!m.querySelector("svg.icon"),hidden:m.getAttribute('aria-hidden'),size:parseFloat(getComputedStyle(m).fontSize)/parseFloat(getComputedStyle(m.parentElement).fontSize),label:m.nextElementSibling.textContent}))}})()`);
  assert(!state.overflow);assert.equal(state.suffixes.length,7,JSON.stringify(state));
  const plainLabel=prefix?'（外部链接）':'(external link)';
  assert(state.suffixes.every(x=>x.hidden==='true'&&x.svg&&x.text==='\u2060\u202f'&&Math.abs(x.size-.7)<.01&&x.label.trim()===plainLabel));
  for(const link of state.links){
   assert.equal(link.target,null);assert.equal(link.rel,null);
   if(link.href.startsWith('mailto:')||link.href.startsWith('tel:')||link.href.startsWith('#')||link.href.startsWith('../')||link.href==='/handbook/'||link.href===b.origin+'/handbook/'||link.href.endsWith('/image/'))assert(!link.marker,JSON.stringify(link));
  }
  assert(state.links.find(x=>x.href==='https://external.example/reference?q=1&x=2#part').marker);
  assert(state.links.find(x=>x.href==='//external.example/guide/').marker);
  assert(!await e(`document.querySelector('.site-footer .external-link-marker,.article-header .external-link-marker,[data-toc] .external-link-marker,.left-region .external-link-marker')`));
  const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(x=>x.role?.value==='link'&&x.name?.value===`External documentation ${plainLabel}`));
  rows.push({prefix,mode,width,count:state.suffixes.length});
 }
 // The URL standard, not string prefixes, supplies origin identity (scheme/host/port).
 assert(await e(`new URL('https://EXAMPLE.org:443/a').origin===new URL('https://example.org/b').origin`));
 await v(390,1000);await n('/link-check/');
 const selector='.prose a[href^="https://external.example/reference"]';
 await e(`document.querySelector('${selector}').scrollIntoView({behavior:'instant'})`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(200);
 assert.equal(await e(`getComputedStyle(document.querySelector('${selector} .external-link-marker')).opacity`),'0.65');
 const pt=await e(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return{x:r.x+5,y:r.y+5}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pt});await delay(200);
 assert.equal(await e(`getComputedStyle(document.querySelector('${selector} .external-link-marker')).opacity`),'1');
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await e(`document.querySelector('${selector}').focus()`);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 assert.equal(await e(`getComputedStyle(document.activeElement.querySelector('.external-link-marker')).opacity`),'1');
 assert.equal(await e(`document.activeElement.getAttribute('title')`),'Original title');
 // Check the real inline wrapping boundary, not a no-wrap whole-link substitute.
 for(const width of [320,345,390,768]){
  await v(width,1000);
  const wrap=await e(`(()=>{const a=document.querySelector('a[href="https://external.example/wrap/"]'),text=a.firstChild,r=document.createRange();r.setStart(text,text.textContent.lastIndexOf(' ')+1);r.setEnd(text,text.length);const word=r.getBoundingClientRect(),marker=a.querySelector('.external-link-marker').getBoundingClientRect();return {difference:Math.abs(word.top-marker.top),height:word.height,markerRight:marker.right}})()`);
  assert(wrap.difference<wrap.height/2,JSON.stringify(wrap));assert(wrap.markerRight<=width);
 }
 await e(`document.querySelector('.prose a[href="/handbook/"]').focus()`);await key('Enter','Enter',13);await delay(100);assert.equal(await e('location.pathname'),'/handbook/');
 // A hostile site translation remains text-only after client-side insertion.
 await n('/_override/link-check/');assert(!await e(`document.querySelector('.prose img[src="x"]')`));assert(await e(`document.querySelector('.external-link-marker + .visually-hidden').textContent.includes('<img src=x onerror=alert(1)>')`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/link-check/',false);
 assert(!await e(`document.querySelector('.external-link-marker')`));
 await e(`document.querySelector('.prose a[href="/handbook/"]').focus()`);await key('Enter','Enter',13);await delay(100);assert.equal(await e('location.pathname'),'/handbook/');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await v(1050,700);await n('/handbook/reference/markdown/');await e(`Sidera.setColorMode('dark');document.querySelector('.prose').scrollIntoView({behavior:'instant'})`);
 const rect=await e(`(()=>{const r=document.querySelector('.prose').getBoundingClientRect();return{x:r.x,y:r.y+scrollY,width:r.width,height:300}})()`);
 const img=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...rect,scale:1}});
 await writeFile(b.run+'/external-links.png',Buffer.from(img.data,'base64'));
 await writeFile(b.run+'/external-browser.json',JSON.stringify({browser:b.version.Browser,rows},null,2));
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')),'Decoration must not fetch link targets');
 console.log('PASS external text suffixes: origin rules, internal/mail/tel/image exclusions, native attributes, EN/ZH/AX, wrapping, hover/focus, safe override and no-JS links');
},{'/_chinese':'chinese-public','/_override':'override-public'});
