// Scoped widgets remain native links: inspect actual one-line truncation and both live orders.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const prefix='.left-region', pub=prefix+' [data-recent="publication"]',updates=prefix+' #recent-updates';
 for(const [width,palette,path] of [[1440,'dark','/signals/'],[1440,'light','/_chinese/signals/'],[390,'dark','/_chinese/signals/']]){
  await v(width,960);await n(path);await e(`Sidera.setAppearance('${palette}')`);
  if(width<668){await e(`document.querySelector('[data-region="left"]').click()`);await delay(430);}
  const state=await e(`(()=>{const panels=[...document.querySelectorAll('.recent-panel')];const a=document.querySelector('${pub} a');const style=getComputedStyle(a);return {headings:panels.map(p=>p.querySelector('h2').textContent),extra:panels.some(p=>p.querySelector('p,time,span')),titles:panels.every(p=>[...p.querySelectorAll('a')].every(a=>a.title===a.textContent)),overflow:a.scrollWidth>a.clientWidth,ellipsis:style.textOverflow,nowrap:style.whiteSpace,height:a.getBoundingClientRect().height,ids:[...document.querySelectorAll('[id]')].map(n=>n.id),width:document.documentElement.scrollWidth}})()`);
  const labels=path.startsWith('/_chinese')?['最近更新','最近发布','最近发布','最近更新']:['Recent updates','Recently published','Recently published','Recent updates'];
  assert.deepEqual(state.headings,labels);assert(!state.extra&&state.titles&&state.overflow,JSON.stringify(state));assert.equal(state.ellipsis,'ellipsis');assert.equal(state.nowrap,'nowrap');assert(state.height<=32);assert.equal(new Set(state.ids).size,state.ids.length);assert(state.width<=width);
  const labelsTree=await e(`[...document.querySelectorAll('.left-region [data-component="taxonomies"] .nav-heading')].map(e=>e.textContent)`);
  assert.deepEqual(labelsTree,path.startsWith('/_chinese')?['标签','分类']:['Tags','Categories']);
 }
 await v(1440,960);await n('/signals/');
 // Whole row is a hover target with the full authored title attached, not clipped tooltip text.
 const a=pub+' a[href="/signals/e/"]';await e(`document.querySelector('${a}').scrollIntoView({block:'center',behavior:'instant'})`);
 const p=await e(`(()=>{const r=document.querySelector('${a}').getBoundingClientRect();return {x:r.x+r.width-3,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await delay(220);
 assert(await e(`document.querySelector('${a}').matches(':hover') && document.querySelector('${a}').title.includes('<sample> & "quoted"')`));
 assert.notEqual(await e(`getComputedStyle(document.querySelector('${a}')).backgroundImage`),'none');
 await e(`document.querySelector('${a}').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');await key('Enter','Enter',13);await delay(100);assert.equal(await e('location.pathname'),'/signals/e/');
 await n('/signals/');const current=await e(`document.querySelector('${pub} a').getAttribute('href')`);
 await e(`document.querySelector('[data-page-link="next"]').click()`);await delay(150);assert.equal(await e(`document.querySelector('${pub} a').getAttribute('href')`),current);
 assert.equal(await e(`document.querySelector('${updates} a').getAttribute('href')`),'/signals/c/');
 // The same renderer/tooltip remains useful without JavaScript.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/signals/',false);assert(await e(`document.querySelector('${pub} a').title===document.querySelector('${pub} a').textContent`));await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Normal, realistic live configuration: notebook chooses publication, docs choose both.
 await n('/_normal/notes/');assert.equal(await e(`document.querySelector('.left-region .recent-panel h2').textContent`),'Recently published');
 await e(`document.querySelector('.left-region .recent-panel').scrollIntoView({behavior:'instant',block:'center'})`);await delay(60);
 const r=await e(`(()=>{const r=document.querySelector('.left-region .recent-panel').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:2}});await writeFile(resolve(b.run,'recent-published.png'),Buffer.from(data,'base64'));
 await n('/_normal/handbook/');assert.deepEqual(await e(`[...document.querySelectorAll('.left-region .recent-panel h2')].map(e=>e.textContent)`),['Recent updates','Recently published']);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS recent UI: compact single-line rows, ellipsis/full native title attributes, hover/focus links, EN/ZH headings, both orders/regions, pager independence, mobile/palettes/no-JS, normal notebook/docs choices');
},{'/_chinese':'chinese-public','/_normal':'normal-public'});
