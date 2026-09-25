// Normal example + original generic docs: dots only on main menus, stable tree count column.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,key,call,delay}=b;
 const tree='.left-region [data-component="taxonomies"]';
 const dots=s=>e(`[...document.querySelectorAll(${JSON.stringify(s)})].map(a=>getComputedStyle(a,'::after').content)`);
 const noDots=async s=>{const values=await dots(s);assert(values.length,`missing ${s}`);assert(values.every(v=>v==='none'),JSON.stringify(values));};
 const aligned=async()=>{
  const rows=await e(`[...document.querySelectorAll('${tree} .tree-row small')].filter(e=>e.getClientRects().length).map(e=>({right:e.getBoundingClientRect().right,count:e.textContent,key:e.closest('[data-tag]').dataset.tag}))`);
  assert(rows.length>=5,JSON.stringify(rows));assert(Math.max(...rows.map(r=>r.right))-Math.min(...rows.map(r=>r.right))<1,JSON.stringify(rows));
  assert.equal(rows.find(r=>r.key==='practice').count,'2');assert.equal(rows.find(r=>r.key==='practice/notes').count,'1');assert.equal(rows.find(r=>r.key==='practice/reading').count,'1');
 };
 const tagRoute='/notes/tags/practice/notes/';
 await v(1440,960);await n(tagRoute);
 await noDots(tree+' a[aria-current]');await aligned();
 assert.deepEqual(await dots('.left-region [data-component="menu"] a[aria-current]'),['""']);
 assert.equal(await e(`getComputedStyle(document.querySelector('.left-region [data-component="menu"] a[aria-current]'),'::after').width`),'8px');
 assert(await e(`getComputedStyle(document.querySelector('.left-region [data-component="menu"] a[aria-current]'),'::after').backgroundImage.includes('61, 197, 80')`));
 assert.notEqual(await e(`getComputedStyle(document.querySelector('${tree} a[aria-current="page"]')).backgroundImage`),'none','current highlight retained');
 const summary=tree+' [data-tag="practice"] > details > summary';
 await e(`document.querySelector(${JSON.stringify(summary)}).focus()`);await key('Enter','Enter',13);
 assert.equal(await e(`document.querySelector('${tree} [data-tag="practice"] > details').open`),false);
 await key('Enter','Enter',13);await aligned();
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:900});await e('document.activeElement.blur()');
 const r=await e(`document.querySelector('${tree}').getBoundingClientRect().toJSON()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:2}});
 await writeFile(resolve(b.run,'tag-tree.png'),Buffer.from(data,'base64'));
 // A parent count remains an independent link, not a disclosure click target.
 await e(`document.querySelector('${tree} [data-tag="practice"] > .tree-row a').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/notes/tags/practice/');
 await noDots(tree+' a[aria-current]');
 await n('/notes/tags/');await noDots(tree+' .all-tags[aria-current]');
 await n('/handbook/start/');await noDots('.docs-navigation a[aria-current]');
 // The live handbook's three-level branch opens the active path, not its siblings.
 await n('/handbook/workflows/writing/outline/');
 for(const path of ['/handbook/workflows','/handbook/workflows/writing']){
  assert(await e(`document.querySelector('.docs-navigation a[data-doc-path="${path}"]').closest('li').querySelector(':scope > details').open`));
 }
 const writing='.docs-navigation a[data-doc-path="/handbook/workflows/writing"]';
 const research='.docs-navigation a[data-doc-path="/handbook/workflows/research"]';
 assert(!await e(`document.querySelector('${research}').closest('li').querySelector(':scope > details').open`));
 await e(`document.querySelector('${writing}').closest('li').querySelector(':scope > details > summary').focus()`);await key('Enter','Enter',13);
 assert(!await e(`document.querySelector('${writing}').closest('li').querySelector(':scope > details').open`));
 await e(`document.querySelector('${research}').closest('li').querySelector(':scope > details > summary').focus()`);await key('Enter','Enter',13);
 assert(await e(`document.querySelector('${research}').closest('li').querySelector(':scope > details').open`));
 assert(!await e(`document.querySelector('${writing}').closest('li').querySelector(':scope > details').open`));
 await e(`document.querySelector('${writing}').focus()`);await key('Enter','Enter',13);await delay(150);
 assert.equal(await e('location.pathname'),'/handbook/workflows/writing/');

 // Original nested docs tree still has independently usable body links and disclosures.
 await n('/_generic/guidebook/getting-started/setup/');await noDots('.docs-navigation a[aria-current]');
 assert.deepEqual(await dots('.left-region .collection-nav a[aria-current]'),['""']);
 const parent='.docs-navigation a[data-doc-path="/guidebook/getting-started"]';
 await e(`document.querySelector('${parent}').closest('li').querySelector('summary').focus()`);await key('Enter','Enter',13);await key('Enter','Enter',13);
 await e(`document.querySelector('${parent}').focus()`);await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/_generic/guidebook/getting-started/');
 await n('/_generic/tags/');await noDots('.fallback-menu .taxonomy-navigation a[aria-current]');
 await n('/_widgets'+tagRoute);await noDots('.right-region [data-component="links"] a[aria-current]');
 for(const palette of ['dark','light']){
  await v(390,844);await n(tagRoute);await e(`document.querySelector('#appearance').value='${palette}';document.querySelector('#appearance').dispatchEvent(new Event('change'));document.querySelector('[data-region="left"]').click()`);await delay(430);
  await noDots(tree+' a[aria-current]');await aligned();assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 }
 await v(1440,960);await call('Emulation.setScriptExecutionDisabled',{value:true});await n(tagRoute,false);await aligned();await noDots(tree+' a[aria-current]');await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS tree presentation: no tree/hub/auxiliary dots, main dots retained, branch/leaf/depth count alignment and exact counts, highlight, native parent/disclosure, mobile/palettes/no-JS');
},{'/_generic':'generic-public','/_widgets':'widgets-public'});
