// Real menu geometry and state colors in an isolated installed Chrome instance.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay,key}=b;
 const menu='.left-region [data-component="menu"]';
 const journal=menu+' a[href="/journal/"]',notes=menu+' a[href="/notes/"]',home=menu+' a[href="/"]';
 const style=(s,key,pseudo='')=>e(`getComputedStyle(document.querySelector(${JSON.stringify(s)}),${JSON.stringify(pseudo)})[${JSON.stringify(key)}]`);
 const move=async s=>{const r=await e(`document.querySelector(${JSON.stringify(s)}).getBoundingClientRect().toJSON()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:r.x+60,y:r.y+20});await delay(240);};
 await v(1440,960);await n('/journal/');
 assert.equal(await style(journal+' .icon','width'),'27px');assert.equal(await style(journal+' .icon','height'),'27px');
 assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');
 assert.equal(await style(journal,'width','::after'),'8px');assert.equal(await style(journal,'height','::after'),'8px');
 assert((await style(journal,'backgroundImage','::after')).includes('255, 189, 43'));
 assert.equal(await e(`(()=>{const a=[...document.querySelectorAll('${menu} .native-menu>ul>li>a')];return a[1].getBoundingClientRect().top-a[0].getBoundingClientRect().bottom})()`),4);
 assert.equal(await e(`document.querySelectorAll('.site-footer .icon').length`),0);
 const resting=await style(notes+' .icon','color');assert.notEqual(resting,'rgb(61, 197, 80)');
 await move(notes);assert.equal(await style(notes+' .icon','color'),'rgb(61, 197, 80)');
 assert.notEqual(await style(notes+' span','color'),'rgb(61, 197, 80)');assert.equal(await style(notes,'content','::after'),'none');
 assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');
 const box=await e(`document.querySelector('${menu}').getBoundingClientRect().toJSON()`);
 const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:2}});
 await writeFile(resolve(b.run,'menu-colors.png'),Buffer.from(data,'base64'));
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:500});await e(`document.querySelector(${JSON.stringify(notes)}).focus()`);await delay(240);
 assert.equal(await style(notes+' .icon','color'),'rgb(61, 197, 80)');assert.notEqual(await style(notes,'outlineStyle'),'none');
 await key('Enter','Enter',13);await delay(120);assert.equal(await e('location.pathname'),'/notes/');
 await n('/journal/2026/04/10/beginning/');assert.equal(await e(`document.querySelector(${JSON.stringify(journal)}).getAttribute('aria-current')`),'location');
 assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');assert.equal(await style(journal,'width','::after'),'8px');
 await move(home);const defaultColor=await style(home+' .icon','color');assert.notEqual(defaultColor,resting);assert.notEqual(defaultColor,'rgb(255, 189, 43)');
 await n('/_nested/journal/2026/04/11/returning/');
 assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');
 const returning=menu+' a[href="/journal/2026/04/11/returning/"]',beginning=menu+' a[href="/journal/2026/04/10/beginning/"]';
 assert.equal(await style(returning+' .icon','color'),defaultColor); // no parent-to-child accent leak
 await move(beginning);assert.equal(await style(beginning+' .icon','color'),'rgb(51, 153, 204)');
 await n('/_fallback/notes/');const collection=menu+' .collection-nav a[href="/notes/"]';
 assert.equal(await style(collection+' .icon','width'),'27px');assert.equal(await style(collection,'width','::after'),'8px');
 assert.equal(await e(`(()=>{const a=document.querySelector('${menu} .home-link').getBoundingClientRect(),b=document.querySelector('${menu} .collection-nav a').getBoundingClientRect();return b.top-a.bottom})()`),4);
 await n('/_right/journal/');assert.equal(await style('.right-region [data-component="menu"] a[href="/journal/"] .icon','width'),'27px');
 await n('/_chinese/journal/');assert.equal(await style(menu+' a[href="/_chinese/journal/"] .icon','color'),'rgb(255, 189, 43)');
 for(const palette of ['dark','light']){
  await v(390,844);await n('/journal/');await e(`Sidera.setColorMode('${palette}');document.querySelector('[data-region="left"]').click()`);await delay(430);
  assert.equal(await style(journal+' .icon','width'),'27px');assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 }
 await n('/_off/journal/');await e(`document.querySelector('[data-region="left"]').click()`);await delay(430);
 assert.equal(await e(`document.querySelectorAll('${menu} .icon').length`),0);assert.equal(await style(journal,'width','::after'),'8px');
 await v(1440);await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/journal/',false);
 assert.equal(await style(journal+' .icon','color'),'rgb(255, 189, 43)');await move(notes);assert.equal(await style(notes+' .icon','color'),'rgb(61, 197, 80)');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS main menu: 27px icons / 4px gaps / 8px dots; real hover/focus/current/ancestor colors, neutral labels, per-entry isolation, native navigation, mobile/palettes/no-JS/icons-off, text-only site footer');
},{'/_nested':'nested-public','/_fallback':'fallback-public','/_right':'right-menu-public','/_chinese':'chinese-public','/_off':'icons-off-public'});
