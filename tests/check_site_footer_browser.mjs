import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 for(const [width,mode,prefix] of [[1440,'dark',''],[1440,'light',''],[390,'dark',''],[390,'light','/_chinese']]){
  await v(width,960);await n(prefix+'/about/');await e(`Sidera.setColorMode('${mode}')`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await delay(200);
  for(const route of ['/about/','/notes/package-management/']){
   await n(prefix+route);
   const state=await e(`(()=>{const f=document.querySelector('.site-footer'),a=f.querySelector('.native-menu a[aria-current]'),other=[...f.querySelectorAll('.native-menu a')].find(a=>!a.hasAttribute('aria-current'));return {icons:f.querySelectorAll('svg').length,current:getComputedStyle(a).color,other:getComputedStyle(other).color,bg:getComputedStyle(a).backgroundColor,shadow:getComputedStyle(a).boxShadow,border:getComputedStyle(f).borderTopWidth,weight:getComputedStyle(f.querySelector('.menu-group')).fontWeight,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
   assert.equal(state.icons,0);assert.equal(state.current,state.other);assert.equal(state.bg,'rgba(0, 0, 0, 0)');assert.equal(state.shadow,'none');assert.equal(state.border,'1px');assert.equal(state.weight,'500');assert(!state.overflow);
  }
 }
 await v(1440,960);await n('/about/');await e(`Sidera.setColorMode('dark');document.querySelector('.site-footer').scrollIntoView({behavior:'instant',block:'center'})`);await delay(150);
 const r=await e(`(()=>{const r=document.querySelector('.site-footer').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{...r,scale:2}});await writeFile(resolve(b.run,'site-footer.png'),Buffer.from(data,'base64'));
 const target='.site-footer .native-menu a[href="/notes/"]';
 await e(`document.querySelector('${target}').focus()`);await delay(220);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 assert.notEqual(await e('getComputedStyle(document.activeElement).backgroundColor'),'rgba(0, 0, 0, 0)');
 await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/notes/');
 // Sidebar selection remains colored; the footer does not borrow that navigation emphasis.
 assert(await e(`document.querySelector('.left-region .native-menu a[aria-current] .icon')!==null`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/about/',false);assert.equal(await e(`document.querySelectorAll('.site-footer .icon').length`),0);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Markdown credit keeps compact typography and native keyboard links at both widths.
 for(const [prefix,width] of [['/_credit',1440],['/_credit',390],['/_credit-zh',390]]){
  await v(width,960);await n(prefix+'/about/');
  const state=await e(`(()=>{const c=document.querySelector('.theme-credit');return{size:getComputedStyle(c).fontSize,links:c.querySelectorAll('a').length,strong:c.querySelector('strong')?.textContent,margin:getComputedStyle(c.lastElementChild).marginBottom,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
  assert.equal(state.size,'12px');assert.equal(state.strong,'Sidera');assert(state.links>0);assert.equal(state.margin,'0px');assert(!state.overflow);
 }
 await n('/_credit/about/');await e(`document.querySelector('.theme-credit a[href="/about/"]').focus()`);await delay(220);
 assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/about/');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/_credit/about/',false);
 assert.equal(await e(`document.querySelectorAll('.theme-credit a').length`),2);
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS site sitemap: no default icons/current emphasis; source-like divider/columns/type; hover/focus/native links; desktop/mobile, light/dark, Chinese and no JS; Markdown credit links/type/keyboard');
},{'/_chinese':'chinese-public','/_credit':'credit-markdown-public','/_credit-zh':'credit-chinese-public'});
