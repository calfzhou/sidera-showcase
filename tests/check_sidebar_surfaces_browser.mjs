// Consumes check_menu.py fixtures. Optional third/fourth args: fixture dir / old CSS.
// Owned browser only; no provider interaction or non-local navigation.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
const fixtures=resolve(process.argv[3]||process.argv[2]);
const beforeCSS=process.argv[4]?await readFile(resolve(process.argv[4]),'utf8'):null;
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key}=b;
 const route='/handbook/reference/sidebar-surfaces/';
 const selected='.left-region [data-component="menu"] a[aria-current]';
 const plain='.left-region [data-component="menu"] a:not([aria-current])';
 const tree='.left-region .tree-row a[aria-current="page"]';
 const recent='.left-region [data-recent] a';
 const social='.left-region .social-link';
 const random='.left-region .random-article';
 const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const a of document.getAnimations())if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()})()`);
 const wait=async expression=>{for(let i=0;i<100;i++){if(await e(expression))return;await b.delay(50)}assert.fail(expression)};
 const style=selector=>e(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(el);return {bg:s.backgroundColor,image:s.backgroundImage,shadow:s.boxShadow,color:s.color,outline:s.outlineStyle,transform:s.transform,filter:s.filter,width:s.width,height:s.height,font:s.fontSize,padding:s.padding,radius:s.borderRadius}})()`);
 const idle=async()=>{await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:800});await e(`document.activeElement.blur()`);await settle()};
 const hover=async selector=>{const point=await e(`(()=>{document.activeElement.blur();const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x+Math.min(15,r.width/2),y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await settle();return point};
 const geometry=()=>e(`Array.from(document.querySelectorAll('.left-region a,.left-region button,.left-region summary,.left-region .icon')).map(el=>{const s=getComputedStyle(el);return [s.width,s.height,s.padding,s.margin,s.fontSize,s.borderRadius]})`);
 const outside=()=>e(`['.right-region','.prose','.site-footer'].map(sel=>{const s=getComputedStyle(document.querySelector(sel));return [s.background,s.color,s.boxShadow,s.fontSize,s.padding,s.width]})`);
 const results=[],states={};
 await v(1440,1000);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await n(route);await wait(`!!document.querySelector('${random}:enabled')`);
 for(const mode of ['light','dark']){
  await e(`Sidera.setColorMode('${mode}')`);await idle();
  const normal=await style(plain),current=await style(selected),g=await geometry(),other=await outside();states[mode]=current;
  assert.equal(normal.bg,'rgba(0, 0, 0, 0)');assert.equal(normal.shadow,'none');
  assert.notEqual(current.bg,normal.bg);assert.equal(current.image,'none');assert.equal(current.shadow,'none');
  assert.equal(await e(`getComputedStyle(document.querySelector('${selected}'),'::after').width`),'8px');
  assert.equal(await e(`getComputedStyle(document.querySelector('${selected} .icon')).width`),'27px');
  await hover(plain);const hovered=await style(plain);assert(hovered.image.startsWith('linear-gradient'));assert.notEqual(hovered.shadow,'none');assert.equal(hovered.transform,'none');
  assert.notEqual(hovered.bg,current.bg,'Hover must differ from persistent selection');
  const point=await hover(selected);const currentHover=await style(selected);assert.notEqual(currentHover.bg,current.bg);assert.equal(currentHover.shadow,'none');
  await e(`document.querySelector('${selected}').addEventListener('click',event=>event.preventDefault(),{once:true})`);
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await settle();
  const pressed=await style(selected);assert.notEqual(pressed.bg,currentHover.bg);assert.equal(pressed.image,'none');assert.equal(pressed.shadow,'none');assert.equal(pressed.transform,'none');
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await idle();
  assert.deepEqual(await geometry(),g,'States cannot move or resize rows/icons');
  for(const selector of [recent,social]){await hover(selector);const item=await style(selector);assert.equal(item.image,'none');assert.equal(item.shadow,'none');assert.equal(item.transform,'none');assert.notEqual(item.bg,'rgba(0, 0, 0, 0)')}
  await idle();const treeCurrent=await style(tree);assert.equal(treeCurrent.shadow,'none');assert.equal(treeCurrent.image,'none');assert.notEqual(treeCurrent.bg,'rgba(0, 0, 0, 0)');
  const randomRest=await style(random);assert.notEqual(randomRest.bg,'rgba(0, 0, 0, 0)');await hover(random);assert.notEqual((await style(random)).bg,randomRest.bg);assert.equal((await style(random)).shadow,'none');
  await e(`document.querySelector('${random}').disabled=true`);await settle();assert.equal((await style(random)).bg,randomRest.bg);await e(`document.querySelector('${random}').disabled=false`);
  await idle();await key('Tab','Tab',9);await e(`document.querySelector('${plain}').focus()`);await settle();assert.notEqual((await style(plain)).outline,'none');
  await idle();assert.deepEqual(await outside(),other);
  if(beforeCSS){
   await e(`window.oldSheet=document.querySelector('link[rel="stylesheet"][href*="/css/sidera."]');oldSheet.disabled=true;window.oldStyle=document.createElement('style');oldStyle.textContent=${JSON.stringify(beforeCSS)};document.head.append(oldStyle)`);await settle();
   assert.deepEqual(await geometry(),g,'Geometry must match pre-change CSS');assert.deepEqual(await outside(),other,'Right rail/prose/site footer unchanged');
   await e(`document.querySelector('.left-region .navigation-content').scrollTop=0;scrollTo(0,0)`);await hover(plain);await b.screenshot('sidebar-before-'+mode);
   await e(`oldStyle.remove();oldSheet.disabled=false`);await settle();
  }
  await e(`document.querySelector('.left-region .navigation-content').scrollTop=0;scrollTo(0,0)`);await hover(plain);await b.screenshot('sidebar-after-'+mode);
  results.push(mode+': resting/hover/selected/selected-hover/pressed/focus distinct; quiet widgets/icons; stable geometry and outside surfaces');
 }
 await idle();
 for(const mode of ['light','dark']){await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode},{name:'prefers-reduced-motion',value:'reduce'}]});await e(`document.documentElement.dataset.colorScheme='auto'`);await settle();assert.equal((await style(selected)).bg,states[mode].bg)}
 await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});await idle();
 assert.equal((await style(selected)).outline,'solid','Forced colors retain the selected-location outline');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 // Actual keyboard disclosure; the link and its separate arrow remain separate.
 const arrow='.left-region .tree-branch > summary';await e(`document.querySelector('${arrow}').scrollIntoView({block:'center'});document.querySelector('${arrow}').focus()`);
 const opened=await e(`document.activeElement.parentElement.open`);await key('Enter','Enter',13);assert.equal(await e(`document.activeElement.parentElement.open`),!opened);await key('Enter','Enter',13);
 await idle();await v(390,844);await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await wait(`document.querySelector('#left-region').getAttribute('popover')==='auto'`);
 if(!await e(`document.querySelector('#left-region').matches(':popover-open')`))await e(`document.querySelector('[data-region="left"]').click()`);
 await wait(`document.querySelector('#left-region').matches(':popover-open')`);
 assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
 assert(await e(`document.querySelector('${plain}').getBoundingClientRect().height>=44 && document.querySelector('${social}').getBoundingClientRect().height>=44 && document.querySelector('${arrow}').getBoundingClientRect().height>=44`));
 await e(`document.querySelector('.left-region .navigation-content').scrollTop=0`);await b.screenshot('sidebar-mobile');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n(route,false);await e(`document.documentElement.dataset.colorScheme='light'`);await settle();assert.equal((await style(selected)).bg,states.light.bg);
 await call('Emulation.setScriptExecutionDisabled',{value:false});await v(1440,1000);
 await n('/_fallback/notes/');assert.equal((await style('.left-region .collection-nav a[aria-current]')).shadow,'none');
 await n('/journal/');await idle();
 const custom=await style('.left-region [data-component="menu"] a[href="/journal/"]');
 const yellow=await e(`(()=>{const p=document.createElement('span');p.style.background='color-mix(in srgb,#ffbd2b 10%,transparent)';document.body.append(p);const c=getComputedStyle(p).backgroundColor;p.remove();return c})()`);
 assert.equal(custom.bg,yellow,'Selected fill respects the entry accent');
 await n('/_off/journal/');assert.equal(await e(`document.querySelectorAll('.left-region [data-component="menu"] svg').length`),0);assert.equal((await style(selected)).shadow,'none');
 await n('/_chinese'+route);await idle();assert.equal((await style(selected)).shadow,'none');
 // Left paint does not turn the right-side main menu into a selected accent panel.
 await n('/_right/journal/');const right=await style('.right-region [data-component="menu"] a[aria-current]');
 if(beforeCSS){await e(`window.oldStyle=document.createElement('style');oldStyle.textContent=${JSON.stringify(beforeCSS)};document.head.append(oldStyle)`);await settle();assert.deepEqual(await style('.right-region [data-component="menu"] a[aria-current]'),right);await e(`oldStyle.remove()`)}
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));
 results.push('auto, native disclosure, mobile/touch targets, no-JS, icons-off, Chinese, fallback and unchanged right-menu styling');
 await writeFile(resolve(b.run,'sidebar-surfaces-results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS '+results.join('; '));
},{'/_fallback':fixtures+'/fallback-public','/_right':fixtures+'/right-menu-public','/_chinese':fixtures+'/chinese-public','/_off':fixtures+'/icons-off-public','':fixtures+'/baseline-public'});
