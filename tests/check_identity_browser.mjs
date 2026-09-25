// Identity hit areas and live CSS states, using only the repo's isolated Chrome harness.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const header='.left-region .site-heading';
 const avatar=header+' .identity-avatar', text=header+' .identity-text';
 const rect=s=>e(`document.querySelector(${JSON.stringify(s)}).getBoundingClientRect().toJSON()`);
 const hover=async(x,y)=>{await call('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});await delay(250);};
 const css=(s,p,pseudo='')=>e(`getComputedStyle(document.querySelector(${JSON.stringify(s)}),${JSON.stringify(pseudo)})[${JSON.stringify(p)}]`);
 const capture=async name=>{
   const r=await rect(header);const {data}=await call('Page.captureScreenshot',{format:'png',clip:{x:r.x-16,y:r.y-18,width:r.width+32,height:r.height+42,scale:2}});
   await writeFile(resolve(b.run,name+'.png'),Buffer.from(data,'base64'));
 };
 await v(1440,960);await n('/notes/');await hover(1100,500);
 assert.equal(await css(avatar,'opacity','::before'),'0');
 assert.equal(await css(text+' .subtitle-normal','opacity'),'1');assert.equal(await css(text+' .subtitle-hover','opacity'),'0');
 const a=await rect(avatar),t=await rect(text);
 assert(await e(`document.elementFromPoint(${a.x+1},${a.y+a.height/2}).closest('a')?.classList.contains('identity-avatar')`));
 assert(!await e(`document.elementFromPoint(${a.x+1},${a.y+1}).closest('a')?.classList.contains('identity-avatar')`));
 await hover(a.x+a.width/2,a.y+a.height/2);
 assert.equal(await css(avatar,'opacity','::before'),'1');assert.equal(await css(avatar,'animationDuration','::before'),'4s');
 const angle=await css(avatar,'transform','::before');await delay(180);assert.notEqual(await css(avatar,'transform','::before'),angle);
 assert.equal(await css(text+' .subtitle-normal','opacity'),'1');await capture('identity-avatar-hover');
 // Hover empty box space, not a text glyph: title/subtitle are one link and one trigger.
 await hover(t.right-2,t.y+3);
 assert.equal(await css(text,'textDecorationLine'),'none');assert.equal(await css(text+' .brand','textDecorationLine'),'none');
 assert.equal(await css(text+' .subtitle-normal','opacity'),'0');assert.equal(await css(text+' .subtitle-hover','opacity'),'1');
 assert.deepEqual(await rect(text),t);await capture('identity-subtitle-hover');
 await hover(1100,500);await e(`document.querySelector(${JSON.stringify(text)}).focus()`);await delay(250);
 assert.equal(await css(text+' .subtitle-hover','opacity'),'1');assert.notEqual(await css(text,'outlineStyle'),'none');
 await e(`document.querySelector(${JSON.stringify(avatar)}).focus()`);await delay(250);assert.equal(await css(avatar,'opacity','::before'),'1');
 // Each requested area really navigates home when clicked, including box whitespace.
 for(const target of ['circle','title','subtitle']){
  await n('/notes/');const r=await rect(target==='circle'?avatar:text);
  const p={x:target==='circle'?r.x+1:r.right-2,y:target==='circle'?r.y+r.height/2:target==='title'?r.y+2:r.bottom-2};
  await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});
  for(let i=0;i<60&&await e('location.pathname')!=='/';i++)await delay(25);assert.equal(await e('location.pathname'),'/');
 }
 for(const [width,prefix,selector] of [[390,'','.mobile-brand .identity-text'],[1440,'/_compact','.compact-header .identity-text'],[1440,'/_chinese',text]]){
  await v(width,844);await n(prefix+'/notes/');await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await key('Enter','Enter',13);await delay(100);
  assert.equal(await e('location.pathname'),prefix==='/_chinese'?'/_chinese/':'/');assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 }
 await v(1440);await n('/notes/');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const r=await rect(avatar);await hover(r.x+24,r.y+24);assert.equal(await css(avatar,'animationName','::before'),'none');assert.equal(await css(avatar,'opacity','::before'),'1');
 const tx=await rect(text);await hover(tx.right-2,tx.y+2);assert.equal(await css(text+' .subtitle-hover','opacity'),'1');assert.equal(await css(text+' .subtitle-hover','transform'),'none');assert.equal(await css(text+' .subtitle-hover','transitionDuration'),'0s');
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/',false);await hover(tx.right-2,tx.y+2);assert.equal(await css(text+' .subtitle-hover','opacity'),'1');
 await call('Emulation.setScriptExecutionDisabled',{value:false});await n('/_plain/notes/');const plain=await rect(text);await hover(plain.right-2,plain.y+2);assert.equal(await css(text+' .subtitle-normal','opacity'),'1');
 await n('/_empty/notes/');assert.equal(await e(`document.querySelectorAll('.identity-avatar').length`),0);
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS identity: circular and full-box home targets, underline-free flip/ring hover, keyboard, mobile/compact/Chinese URL, plain/empty, reduced motion and no JS');
},{'/_compact':'compact-public','/_chinese':'chinese-public','/_plain':'plain-public','/_empty':'empty-public'});
