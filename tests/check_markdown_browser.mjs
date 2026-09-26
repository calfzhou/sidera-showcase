// Native Markdown in the accepted frame. No external browsing or downloaded dependencies.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
const route='/handbook/reference/markdown/';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b,states=[];
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const prefix of ['', '/_chinese'])for(const mode of ['dark','light'])for(const width of [1440,768,390,320]){
  await v(width,1000);await n(prefix+route);await e(`Sidera.setColorMode('${mode}')`);
  const state=await e(`(()=>{
   const p=document.querySelector('.prose'),r=p.getBoundingClientRect(),style=getComputedStyle(p);
   const boxes=[...p.querySelectorAll('pre,table,.highlight')].filter(x=>x.scrollWidth>x.clientWidth+1 && ['auto','scroll'].includes(getComputedStyle(x).overflowX));
   return {width:innerWidth,mode:document.documentElement.dataset.colorScheme,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,bodyWidth:r.width,size:style.fontSize,line:style.lineHeight,
    scrolls:boxes.map(x=>({tag:x.tagName,class:x.className,width:x.clientWidth,scroll:x.scrollWidth})),
    headingSizes:[...p.querySelectorAll('h2,h3,h4,h5,h6')].slice(3,8).map(x=>parseFloat(getComputedStyle(x).fontSize)),
    images:[...p.querySelectorAll('img')].map(x=>({loaded:x.complete&&x.naturalWidth>0,width:x.width,height:x.height,natural:x.naturalWidth})),
    nestedSizes:[...p.querySelectorAll('li li')].map(x=>getComputedStyle(x).fontSize),
    caption:getComputedStyle(p.querySelector('figcaption h4')).marginTop,
    headerAlign:[...p.querySelectorAll('table:not(.lntable) th')].slice(0,4).map(x=>getComputedStyle(x).textAlign),
    gutter:getComputedStyle(p.querySelector('.lnt')).userSelect,
    lineTops:[...p.querySelectorAll('.lntd:last-child .line')].map(x=>x.getBoundingClientRect().top),
    highlight:getComputedStyle(p.querySelector('.hl')).backgroundColor};
  })()`);
  assert(!state.overflow,JSON.stringify(state));assert.equal(state.size,'18px');assert.equal(state.line,'30.6px');
  assert(state.images.every(x=>x.loaded&&x.width<=state.bodyWidth-36));assert.equal(state.images[1].width,120);assert.equal(state.images[1].height,60);
  assert.equal(state.gutter,'none');assert(parseFloat(state.caption)<8);assert(state.nestedSizes.every(s=>parseFloat(s)>=16));
  assert.deepEqual(state.headerAlign,['left','left','center','right']);assert.notEqual(state.highlight,'rgba(0, 0, 0, 0)');
  assert(state.scrolls.length>=3,JSON.stringify(state));
  const steps=state.lineTops.slice(1).map((y,i)=>y-state.lineTops[i]);assert(steps.every(x=>Math.abs(x-24.48)<1),JSON.stringify(steps));
  states.push(state);
 }
 // Native keyboard scrolling: plain pre, Chroma table ancestor and ordinary table.
 await v(390,1000);await n(route);
 for(const selector of ['.prose .highlight:has(.lntable)','.prose .highlight > pre','.prose table:not(.lntable)']){
  await e(`(()=>{const box=document.querySelector(${JSON.stringify(selector)});box.scrollLeft=0;box.scrollIntoView({behavior:'instant'});(box.querySelector('.lntd:last-child pre')||box).focus()})()`);
  assert(await e(`document.activeElement.matches('pre,table')`),'Native scroll target did not accept focus');
  assert.notEqual(await e(`getComputedStyle(document.activeElement.closest('.highlight') || document.activeElement).outlineStyle`),'none');
  for(let i=0;i<5;i++)await key('ArrowRight','ArrowRight',39);await delay(200);
  assert(await e(`document.querySelector(${JSON.stringify(selector)}).scrollLeft>0`),selector);
 }
 // Native tab order reaches the wide table; no synthetic tabindex or JS scrolling.
 await e(`[...document.querySelectorAll('.prose .highlight')].at(-1).querySelector('pre').focus()`);
 let reached=false;
 for(let i=0;i<10;i++){await key('Tab','Tab',9);if(await e(`document.activeElement.matches('.prose table:not(.lntable)')`)){reached=true;break;}}
 assert(reached,'Wide table must be reachable by Tab');
 // TOC activation and heading offset, then actual footnote and both return links.
 await v(1440,1000);await n(route);
 await e(`document.querySelector('[data-toc] a[href="#closing-observations"]').focus()`);await key('Enter','Enter',13);await delay(150);
 assert.equal(await e('location.hash'),'#closing-observations');
 assert(await e(`(()=>{const r=document.querySelector('#closing-observations').getBoundingClientRect();return r.top>=0&&r.top<100})()`));
 for(const index of [0,1]){
  await e(`document.querySelectorAll('.footnote-ref')[${index}].focus()`);await key('Enter','Enter',13);await delay(100);
  assert.equal(await e('location.hash'),'#fn:1');
  await e(`document.querySelectorAll('.footnote-backref')[${index}].focus()`);await key('Enter','Enter',13);await delay(100);
  assert.equal(await e('location.hash'),index?'#fnref1:1':'#fnref:1');
 }
 await e(`document.querySelector('.prose a[href="/handbook/"]').focus()`);assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(150);assert.equal(await e('location.pathname'),'/handbook/');
 // Body contexts and native heading IDs under a base path.
 for(const path of ['/preview/markdown-check/','/preview/handbook/reference/']){
  await v(320,1000);await n(path);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert.equal(await e(`getComputedStyle(document.querySelector('.prose')).fontSize`),'18px');
 }
 await n('/preview/markdown-check/');assert(await e(`document.querySelector('.prose img[src="wide.svg"]').width<=284`));
 assert(await e(`document.getElementById('中文标题') && document.getElementById('specimen-21')`));
 assert(await e(`(()=>{const input=document.querySelector('.prose li > p > input');return input && getComputedStyle(input.closest('li')).listStyleType==='none'})()`));
 // Touch emulation preserves native scrollports, rather than widening the document.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await n(route);assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 // No-JS, enlarged text, reduced motion: native content/links do not depend on the enhancement.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 await e(`document.documentElement.style.fontSize='27px'`);
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 await e(`document.querySelector('.prose a[href="#code-and-data"]').focus()`);await key('Enter','Enter',13);await delay(100);
 assert.equal(await e('location.hash'),'#code-and-data');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 // Composite actual text/background colors, including translucent panels and highlighted lines.
 const contrasts=[];
 for(const mode of ['dark','light']){
  await v(1440,1000);await n(route);await e(`Sidera.setColorMode('${mode}')`);
  const samples=await e(`(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d');
   const rgba=s=>{c.clearRect(0,0,1,1);c.fillStyle=s;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v)};
   const over=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
   const lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
   const nodes=[...document.querySelectorAll('.prose p,.prose li,.prose a,.prose pre span,.prose figcaption')].filter(x=>x.childNodes.length&&[...x.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
   const samples=nodes.map(x=>{let bg=[255,255,255];const parents=[];for(let a=x;a;a=a.parentElement)parents.unshift(a);for(const a of parents)bg=over(rgba(getComputedStyle(a).backgroundColor),bg);const fg=over(rgba(getComputedStyle(x).color),bg),a=lum(fg),b=lum(bg);return {tag:x.tagName,class:x.className,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}});
   const p=document.querySelector('.prose p'),r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);
   if (!getSelection().toString()) throw new Error('Native text selection is empty');
   // Native browser/OS selection colors are not represented by author pseudo-style colors.
   return samples;
  })()`);
  contrasts.push({mode,min:Math.min(...samples.map(s=>s.ratio)),fail:samples.filter(s=>s.ratio<4.5)});
 }
 await writeFile(b.run+'/body-browser.json',JSON.stringify({browser:b.version.Browser,states,contrasts},null,2));
 assert(contrasts.every(c=>c.min>=4.5),JSON.stringify(contrasts));
 await v(1440,1000);await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('#reading-at-a-comfortable-pace').scrollIntoView({behavior:'instant'})`);await b.screenshot('body-desktop-dark');
 await v(390,1000);await n(route);await e(`Sidera.setColorMode('light');document.querySelector('#images-and-captions').scrollIntoView({behavior:'instant'})`);await b.screenshot('body-mobile-light');
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS 16 body states; native keyboard scroll/TOC/footnotes/links, resources, section/standalone, no-JS enlarged text, contrast; own browser stopped');
},{'/_chinese':'chinese-public','/preview':'contexts-public'});
