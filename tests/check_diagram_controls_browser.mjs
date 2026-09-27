// UI refinement: one browser, synthetic diagrams only; no external requests.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
const route='/handbook/reference/diagrams/';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const wait=async x=>{for(let i=0;i<400;i++){if(await e(x))return;await delay(50);}assert.fail('Timeout: '+x)};
 const ready=async selector=>{await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'center'})`);await delay(100);await wait(`document.querySelector(${JSON.stringify(selector)}).dataset.state==='ready'`);};
 const first='[data-sidera-diagram="mermaid"]';
 await v(1200,900);await n(route);await e(`Sidera.setColorMode('dark')`);await ready(first);
 assert(await e(`document.querySelector('.diagram-status').classList.contains('visually-hidden')`));
 assert.equal(await e(`getComputedStyle(document.querySelector('.diagram-view')).borderWidth`),'0px');
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});
 await e('document.activeElement.blur()');await delay(200);
 assert.equal(await e(`getComputedStyle(document.querySelector('.diagram-tools')).opacity`),'0');
 const pt=await e(`(()=>{const r=document.querySelector('.diagram-view').getBoundingClientRect();return {x:r.x+8,y:r.y+8}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...pt});await delay(200);
 assert.equal(await e(`getComputedStyle(document.querySelector('.diagram-tools')).opacity`),'1');
 assert(await e(`[...document.querySelectorAll('.diagram-tools button')].every(b=>!b.textContent.trim()&&b.title&&b.getAttribute('aria-label'))`));
 assert.equal(await e(`document.querySelector('.diagram-action').getBoundingClientRect().width`),28);
 // Keyboard focus reveals toolbar; source is a toolbar button, not persistent prose.
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:2,y:2});
 await e(`document.querySelector('[data-diagram-action="source"]').focus()`);await delay(200);
 assert.equal(await e(`getComputedStyle(document.querySelector('.diagram-tools')).opacity`),'1');
 await key('Enter','Enter',13);
 assert(await e(`document.querySelector('.diagram-source').open&&document.querySelector('[data-diagram-action="source"]').getAttribute('aria-expanded')==='true'`));
 await key('Enter','Enter',13);
 assert(!await e(`document.querySelector('.diagram-source').open`));
 // Near-fullscreen native modal, larger image, no second renderer, focus containment.
 const old=await e(`({width:document.querySelector('.diagram-view img').width,frames:document.querySelectorAll('.diagram-renderer').length,scroll:scrollY})`);
 await e(`document.querySelector('[data-diagram-action="expand"]').focus()`);await key('Enter','Enter',13);await delay(150);
 assert(await e(`document.querySelector('.diagram-dialog').open&&document.querySelector('.diagram-dialog').getBoundingClientRect().width>=innerWidth*.9`));
 assert(await e(`document.querySelector('.diagram-dialog').getBoundingClientRect().height>=innerHeight*.9`));
 assert(await e(`document.querySelector('.diagram-dialog img').width>${old.width}`));
 assert.equal(await e(`document.querySelectorAll('.diagram-renderer').length`),old.frames);
 for(let i=0;i<12;i++){await key('Tab','Tab',9);assert(await e(`document.querySelector('.diagram-dialog').contains(document.activeElement)`));}
 await e(`document.querySelector('.diagram-dialog [data-diagram-action="source"]').click()`);
 assert(await e(`document.querySelector('.diagram-dialog .diagram-source').open`));
 await e(`Sidera.setColorMode('light')`);await delay(600);
 assert(await e(`document.querySelector('.diagram-dialog .diagram-source').open`),'palette changes preserve source disclosure');
 await b.screenshot('diagram-popup-source');
 await key('Escape','Escape',27);await delay(100);
 assert(!await e(`document.querySelector('.diagram-dialog').open`));
 assert(await e(`document.activeElement.matches('[data-diagram-action="expand"]')`));
 assert(await e(`!document.documentElement.classList.contains('diagram-modal-open')&&Math.abs(scrollY-${old.scroll})<4`));
 // Drawio has no visible XML, just a real download action. XML remains inert data.
 await ready('[data-sidera-diagram="drawio"]');
 assert(!await e(`document.querySelector('[data-sidera-diagram="drawio"] .diagram-source,[data-sidera-diagram="drawio"] [data-diagram-action="source"]')`));
 assert(await e(`JSON.parse(document.querySelector('[data-sidera-diagram="drawio"]').dataset.diagramSource).includes('<mxfile')`));
 assert(await e(`document.querySelector('[data-sidera-diagram="drawio"] .diagram-tools .diagram-download').hasAttribute('download')`));
 // Inverted canvas keeps its single author filter after moving to the top layer.
 await e(`document.querySelector('.content-folding').open=true;Sidera.setColorMode('dark')`);
 await ready('.content-folding [data-sidera-diagram="drawio"]');
 await e(`document.querySelector('.content-folding [data-sidera-diagram="drawio"] [data-diagram-action="expand"]').click()`);await delay(150);
 assert.equal(await e(`document.querySelector('.diagram-dialog .diagram-canvas').style.filter`),'invert(1) hue-rotate(180deg)');
 await e(`Sidera.setColorMode('light')`);await delay(200);
 assert.equal(await e(`document.querySelector('.diagram-dialog .diagram-canvas').style.filter`),'');
 await e(`document.querySelector('.diagram-close').click()`);await delay(100);
 assert.equal(await e(`document.querySelector('.content-folding [data-sidera-diagram="drawio"] .diagram-canvas').style.filter`),'');
 // Backdrop closing also returns to the original control.
 await e(`document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="expand"]').click()`);await delay(100);
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:1,y:1,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:1,y:1,button:'left',clickCount:1});await delay(100);
 assert(!await e(`document.querySelector('.diagram-dialog').open`));
 // Failure retains a visible error/download, not a raw XML viewer.
 await n('/preview/drawio-error/');await e(`document.querySelector('[data-sidera-diagram]').scrollIntoView({behavior:'instant'})`);
 await wait(`document.querySelector('[data-sidera-diagram]').dataset.state==='error'`);
 assert(!await e(`document.querySelector('.diagram-status').classList.contains('visually-hidden')`));
 assert(!await e(`document.querySelector('.content-diagram pre,.content-diagram details')`));
 assert(await e(`document.querySelector('.diagram-download').getBoundingClientRect().width>0`));
 // Chinese + touch: controls stay exposed with usable targets and a working modal.
 await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(390,850);await n('/_chinese'+route);await ready(first);
 assert.equal(await e(`getComputedStyle(document.querySelector('.diagram-tools')).opacity`),'1');
 assert.equal(await e(`document.querySelector('.diagram-action').getBoundingClientRect().width`),44);
 const tap=await e(`(()=>{const b=document.querySelector('[data-diagram-action="expand"]');b.scrollIntoView({behavior:'instant',block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[tap]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(200);
 assert(await e(`document.querySelector('.diagram-dialog').open`));
 assert.equal(await e(`document.querySelector('.diagram-close').title`),'关闭图表');
 assert(await e(`document.querySelector('.diagram-dialog').scrollWidth<=document.querySelector('.diagram-dialog').clientWidth`));
 await b.screenshot('diagram-popup-mobile');
 await e(`document.querySelector('.diagram-close').click()`);await delay(100);
 await call('Emulation.setTouchEmulationEnabled',{enabled:false});
 // No JS: Mermaid source remains accessible; drawio offers download, never raw XML.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);
 assert(await e(`[...document.querySelectorAll('.diagram-source')].every(d=>d.open)`));
 assert(!await e(`document.querySelector('[data-sidera-diagram="drawio"] pre')`));
 assert(await e(`document.querySelector('[data-sidera-diagram="drawio"] .diagram-download').getBoundingClientRect().width>0`));
 assert(!await e(`document.querySelector('.diagram-dialog')`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors).slice(0,1000));
 console.log('PASS diagram refinement: quiet unframed view, hover/focus/touch icons, source/download, modal fit/focus/Escape/return/inversion/locales/no-JS');
},{'/_chinese':'chinese-public','/preview':'checks/fixture-public'});
