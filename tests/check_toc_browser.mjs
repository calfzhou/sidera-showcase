// Actual native TOC structure, source-led geometry and current-heading behavior.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const route='/notes/toc-sample/';
 async function wait(expr){for(let i=0;i<100;i++){if(await e(expr))return;await delay(30);}assert.fail(expr);}
 async function scrollHeading(id){await e(`document.getElementById(${JSON.stringify(id)}).scrollIntoView({behavior:'instant',block:'start'})`);await wait(`document.querySelector('.right-region [data-toc] a[aria-current]')?.hash===${JSON.stringify('#'+id)}`);}
 await v(1440,1000);await n(route);
 const fonts=await e(`(()=>{const a=[...document.querySelectorAll('.right-region [data-toc] a')];return a.slice(0,6).map(x=>({font:getComputedStyle(x).fontSize,padding:getComputedStyle(x).paddingLeft}))})()`);
 assert.deepEqual(fonts.map(f=>f.font),['17px','16px','16px','16px','16px','16px']);
 assert.deepEqual(fonts.map(f=>f.padding),['8px','16px','32px','48px','64px','80px']);
 for(const id of ['tool-notes','uv','installation','installing-python','selecting-an-interpreter','confirming-the-environment']){
  await scrollHeading(id);
  const m=await e(`(()=>{const nav=document.querySelector('.right-region [data-toc]'),a=nav.querySelector('a[aria-current]'),track=nav.parentElement.getBoundingClientRect(),r=a.getBoundingClientRect(),n=nav.getBoundingClientRect(),s=getComputedStyle(a,'::before');return {left:r.left+parseFloat(s.left),track:track.left,viewport:n.left,width:s.width,color:s.backgroundColor,visible:r.top>=n.top-1&&r.bottom<=n.bottom+1}})()`);
  assert(Math.abs(m.left-m.track)<1&&m.left>=m.viewport,'marker must be on track and inside the clip');assert.equal(m.width,'4px');assert(m.visible,JSON.stringify(m));
 }
 await scrollHeading('virtual-environments-and-reproducible-local-development');
 assert(await e(`document.querySelector('.right-region [data-toc] a[aria-current]').clientHeight>35`),'long headings must wrap');
 const active=await e(`document.querySelector('.right-region [data-toc] a[aria-current]').getBoundingClientRect().height`);assert(active>35);
 // Collapse only the list: top link is still visible, label and controls remain native.
 await e(`document.querySelector('.right-region .article-toc > summary').focus()`);await key('Enter','Enter',13);
 assert(await e(`!document.querySelector('.right-region .article-toc').open && document.querySelector('.right-region .toc-top').getClientRects().length>0`));
 await key('Enter','Enter',13);
 await e(`document.querySelector('.right-region .toc-top').focus()`);await key('Enter','Enter',13);await delay(500);assert.equal(await e('location.hash'),'#main');
 // Scroll-current leaves user focus alone; keyboard anchor remains a real URL/history change.
 await e(`document.querySelector('.right-region [data-toc] a[href="#installing-python"]').focus()`);await key('Enter','Enter',13);
 await wait(`location.hash==='#installing-python'&&document.querySelector('.right-region [data-toc] a[aria-current]').hash==='#installing-python'`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:800,y:900});await e('document.activeElement.blur()');await delay(100);
 const rect=await e(`(()=>{const r=document.querySelector('.right-region [data-component="toc"]').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...rect,scale:2}});await writeFile(resolve(b.run,'stellar-toc.png'),Buffer.from(data,'base64'));
 await n('/_repeated'+route);
 assert(await e(`(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size})()`));
 await e(`document.querySelector('[data-instance="right-toc-2"] summary').focus()`);await key('Enter','Enter',13);
 assert(await e(`document.querySelector('[data-instance="right-toc-1"] details').open&&!document.querySelector('[data-instance="right-toc-2"] details').open`));
 assert.equal(await e(`document.querySelectorAll('[data-instance="right-toc-2"] svg').length`),0);
 for(const palette of ['dark','light']){
  await v(390,844);await n('/_chinese'+route);await e(`Sidera.setAppearance('${palette}');document.querySelector('[data-region="right"]').click()`);await delay(430);
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert.equal(await e(`getComputedStyle(document.querySelector('.right-region [data-toc]')).maxHeight`),'none');
  assert.equal(await e(`document.querySelector('.right-region .article-toc > summary').textContent`),'本页目录');
 }
 await v(1440,1000);await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert(await e(`document.querySelector('.right-region .article-toc').open&&document.querySelectorAll('.right-region [data-toc] a').length===19`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS Stellar TOC: hierarchy/spacing, six-depth un-clipped marker, wrapping/current scroll, native anchor/collapse/top link, repeat/icons-off, mobile palettes/Chinese/no-JS');
},{'/_chinese':'chinese-public','/_repeated':'repeated-public'});
