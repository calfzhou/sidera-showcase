// Isolated social footer/three-way preference runtime; no external destinations are opened.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const palette=()=>e('getComputedStyle(document.documentElement).colorScheme');
 const choice=()=>e('document.documentElement.dataset.appearanceMode');
 const os=async mode=>{await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode}]});await delay(80);};
 const clear=()=>e(`localStorage.removeItem('sidera-appearance')`);
 await v(1440,960);await n('/');
 for(const system of ['dark','light']){
  await clear();await os(system);await n('/_auto/about/');assert.equal(await choice(),'auto');assert.equal(await palette(),system);
  await clear();await n('/_light/about/');assert.equal(await choice(),'light');assert.equal(await palette(),'light');
  await clear();await n('/about/');assert.equal(await choice(),'dark');assert.equal(await palette(),'dark');
 }
 // True keyboard activation follows dark -> light -> auto -> dark, saving the choice.
 await clear();await os('light');await n('/about/');await e(`document.querySelector('[data-appearance-cycle]').focus()`);
 for(const mode of ['light','auto','dark']){
  await key('Enter','Enter',13);assert.equal(await choice(),mode);assert.equal(await e(`localStorage.getItem('sidera-appearance')`),mode);
  assert(await e(`document.querySelector('[data-appearance-cycle]').getAttribute('aria-label')===document.querySelector('[data-appearance-cycle]').title`));
 }
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='button'&&n.name?.value==='Appearance: Dark. Switch to Light.'));
 // Stored preference beats a different owner's default, even with no switch in the menu.
 await n('/_light/about/');assert.equal(await choice(),'dark');await n('/_plain/about/');assert.equal(await e(`document.querySelectorAll('[data-appearance-cycle]').length`),0);assert.equal(await palette(),'dark');
 await e(`Sidera.setAppearance('auto')`);await os('dark');assert.equal(await palette(),'dark');await os('light');assert.equal(await palette(),'light');
 await n('/_plain/notes/');assert.equal(await choice(),'auto');assert.equal(await palette(),'light');
 // Former stored system choices migrate once; arbitrary invalid records fall back to the owner.
 await e(`localStorage.setItem('sidera-appearance','system')`);await n('/about/');assert.equal(await choice(),'auto');assert.equal(await e(`localStorage.getItem('sidera-appearance')`),'auto');
 await e(`localStorage.setItem('sidera-appearance','nonsense')`);await n('/_auto/about/');assert.equal(await choice(),'auto');
 await clear();await n('/about/');
 const footer=await e(`document.querySelector('.left-region .sidebar-footer').getBoundingClientRect().toJSON()`);
 await e(`document.querySelector('.site-menu').scrollTop=10000;window.scrollTo({top:300,behavior:'instant'})`);await delay(80);
 const moved=await e(`document.querySelector('.left-region .sidebar-footer').getBoundingClientRect().toJSON()`);assert(Math.abs(footer.bottom-moved.bottom)<1);
 await e('window.scrollTo({top:0,behavior:"instant"})');
 const r=await e(`(()=>{const r=document.querySelector('.left-region .sidebar-footer').getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}})()`);
 const image=await call('Page.captureScreenshot',{format:'png',clip:{...r,scale:2}});await writeFile(resolve(b.run,'social-footer.png'),Buffer.from(image.data,'base64'));
 const link='.social-links a';const box=await e(`document.querySelector('${link}').getBoundingClientRect().toJSON()`);
 assert.equal(await e(`getComputedStyle(document.querySelector('${link}')).filter`),'grayscale(1)');
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x+18,y:box.y+18});await delay(220);assert.equal(await e(`getComputedStyle(document.querySelector('${link}')).filter`),'none');
 // All compact/narrow/social configurations remain reachable and stay within the viewport.
 for(const [prefix,width] of [['',390],['/_compact',1440],['/_off',390],['/_six',390],['/_text',390],['/_chinese',390]]){
  await v(width,844);await n(prefix+'/about/');
  if(width===390&&prefix!=='/_compact'){await e(`document.querySelector('[data-region="left"]').click()`);await delay(420);}
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert(await e(`[...document.querySelectorAll('.social-links img')].every(i=>i.complete&&i.naturalWidth>0)`));
  if(prefix==='/_off')assert.equal(await e(`document.querySelectorAll('.social-links').length`),0);
  if(prefix==='/_six')assert.equal(await e(`document.querySelectorAll('.social-links a').length`),6);
  if(prefix==='/_chinese')assert(await e(`document.querySelector('[data-appearance-cycle]').title.includes('外观')`));
 }
 // Without JS, CSS honors owner/OS defaults and only real social links remain visible.
 await call('Emulation.setScriptExecutionDisabled',{value:true});await os('light');await n('/_auto/about/',false);assert.equal(await palette(),'light');assert(await e(`[...document.querySelectorAll('[data-appearance-cycle]')].every(b=>b.hidden)`));
 await os('dark');assert.equal(await palette(),'dark');await n('/_light/about/',false);assert.equal(await palette(),'light');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 const script=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})`});
 await os('light');await n('/_auto/about/');assert.equal(await choice(),'auto');assert.equal(await palette(),'light');await e(`Sidera.cycleAppearance()`);assert.equal(await palette(),'dark');
 await n('/_auto/about/');assert.equal(await choice(),'auto');await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:script.identifier});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS social footer and appearance: owner/default auto, cycle, persistence/migration, absent control, system following, pinned/local assets, responsive/keyboard/AX, no JS and denied storage');
},{'/_auto':'default-auto-public','/_light':'default-light-public','/_plain':'no-button-public','/_off':'off-public','/_compact':'compact-public','/_six':'six-public','/_text':'icons-off-public','/_chinese':'chinese-public'});
