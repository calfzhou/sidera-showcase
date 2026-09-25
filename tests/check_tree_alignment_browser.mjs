// Root showcase: wrapped tree rows retain native details/link semantics without measurement JS.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,key,call,delay}=b;
 const cases=[
  ['/handbook/workflows/research/sources/','.docs-navigation a[data-doc-path="/handbook/workflows/research"]',false],
  ['/notes/tags/practice/notes/','.left-region [data-tag="practice"] > .tree-row a',true],
  ['/journal/categories/notebook/practice/','.left-region [data-category="notebook"] > .tree-row a',true]
 ];
 let samples=0;
 for(const width of [1440,390])for(const [route,selector,hasCount] of cases){
  await v(width,960);await n(route);
  if(width===390){await e(`document.querySelector('[data-region="left"]').click()`);await delay(430);}
  for(const text of ['Short title','Researching a question','A much longer collection title with enough words to wrap across several lines']){
   await e(`(()=>{const a=document.querySelector(${JSON.stringify(selector)});${hasCount?"a.querySelector('span').textContent":"a.textContent"}=${JSON.stringify(text)};})()`);
   for(const open of [false,true]){
    await e(`document.querySelector(${JSON.stringify(selector)}).closest('li').querySelector(':scope > details').open=${open}`);
    await delay(30);
    const m=await e(`(()=>{const a=document.querySelector(${JSON.stringify(selector)}),li=a.closest('li'),d=li.querySelector(':scope > details'),s=d.querySelector('summary'),g=s.querySelector('span');const r=a.getBoundingClientRect(),sr=s.getBoundingClientRect(),gr=g.getBoundingClientRect();return{row:r.height,summary:sr.height,delta:Math.abs(r.y+r.height/2-gr.y-gr.height/2),children:d.querySelector('ul').getBoundingClientRect().height,nowrap:getComputedStyle(a).whiteSpace,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    assert(m.delta<1&&Math.abs(m.row-m.summary)<1&&!m.overflow,JSON.stringify({width,route,text,open,m}));
    assert.equal(m.nowrap,'normal');assert.equal(m.children>0,open);
    if(text.startsWith('A much'))assert(m.row>60,'Expected multiple actual rendered lines');
    samples++;
   }
  }
  // Native keyboard toggle remains exposed in the accessibility tree and changes only its branch.
  await e(`document.querySelector(${JSON.stringify(selector)}).closest('li').querySelector(':scope > details > summary').focus()`);
  await key('Enter','Enter',13);
  assert(!await e(`document.activeElement.parentElement.open`));
  const ax=await call('Accessibility.getFullAXTree');
  assert(ax.nodes.some(node=>node.role?.value==='DisclosureTriangle'&&node.properties?.some(p=>p.name==='expanded'&&p.value.value===false)));
  await key('Enter','Enter',13);
  // Taxonomy counts keep a common right edge, despite the new layout and wrapping.
  if(hasCount){
   const positions=await e(`(()=>{const nav=document.querySelector(${JSON.stringify(selector)}).closest('.tag-navigation');return [...nav.querySelectorAll('.tree-row small')].filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect().right)})()`);
   assert(Math.max(...positions)-Math.min(...positions)<1,JSON.stringify(positions));
  }
 }
 await v(1440,960);await n(cases[0][0]);
 const selector=cases[0][1];
 // Existing two-line title, default site font, real parent link; retain a small visual evidence crop.
 const r=await e(`(()=>{const r=document.querySelector('.docs-navigation').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{...r,scale:2}});await writeFile(resolve(b.run,'centered-tree.png'),Buffer.from(data,'base64'));
 await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/handbook/workflows/research/');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(cases[0][0],false);
 await e(`document.querySelector('.docs-navigation').style.fontSize='24px'`);
 assert(await e(`(()=>{const a=document.querySelector(${JSON.stringify(selector)}),s=a.closest('li').querySelector(':scope > details > summary');const r=a.getBoundingClientRect(),t=s.getBoundingClientRect();return r.height>60&&Math.abs(r.y+r.height/2-t.y-t.height/2)<1})()`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log(`PASS ${samples} rendered tree alignment states: page/tag/category; short/wrapped/long; collapsed/expanded; desktop/mobile; counts, keyboard/AX, parent links and no-JS enlarged text`);
});
