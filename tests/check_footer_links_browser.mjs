// Consumes check_site_footer.py; own browser/profile, no live comments or link visits.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call}=b;
 const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const a of document.getAnimations())if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()})()`);
 const selectors=['.prose p a:not(:has(img))','[data-footer-item="references"] a','[data-footer-item="license"] a','.article-footer [data-footer-item="text"] a:not(:has(img))','.site-footer [data-footer-item="text"] a','.theme-credit a'];
 const style=selector=>e(`(()=>{const s=getComputedStyle(document.querySelector(${JSON.stringify(selector)}));return {color:s.color,background:s.backgroundColor,line:s.textDecorationLine,underline:s.textDecorationColor,thickness:s.textDecorationThickness,offset:Number((parseFloat(s.textUnderlineOffset)/parseFloat(s.fontSize)).toFixed(4)),break:s.boxDecorationBreak}})()`);
 const hover=async selector=>{
  const r=await e(`(()=>{document.activeElement.blur();const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x+Math.min(r.width/2,12),y:r.y+Math.min(r.height/2,8)}})()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...r});await settle();
 };
 const results=[];
 for(const [prefix,language] of [['','en'],['/_chinese','zh']]){
  await v(1440,1100);await n(prefix+'/footer-links/');
  for(const mode of ['light','dark']){
   await e(`Sidera.setColorMode('${mode}');document.activeElement.blur()`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await settle();
   const normal=await style(selectors[0]);assert.equal(normal.line,'underline');assert.equal(normal.thickness,'2px');
   for(const selector of selectors.slice(1))assert.deepEqual(await style(selector),normal,selector+' resting');
   await hover(selectors[0]);const hovered=await style(selectors[0]);assert.equal(hovered.color,normal.color);assert.equal(hovered.underline,hovered.color);assert.notEqual(hovered.background,normal.background);
   for(const selector of selectors.slice(1)){await hover(selector);assert.deepEqual(await style(selector),hovered,selector+' hover');}
   await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});
   for(const selector of selectors){
    await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await settle();
    assert.deepEqual(await style(selector),hovered,selector+' focus');
    assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
   }
   await e(`document.activeElement.blur()`);await settle();
   // Image links retain image behavior, not text underlines or highlight fills.
   for(const selector of ['.prose a:has(img)','.article-footer .authored-text a:has(img)']){
    await hover(selector);const image=await style(selector);assert.equal(image.line,'none');assert.equal(image.background,'rgba(0, 0, 0, 0)');
   }
   // Component-specific feedback must not be overridden by a catch-all footer rule.
   const accent=await e(`(()=>{const span=document.createElement('span');span.style.color='var(--accent)';document.body.append(span);const c=getComputedStyle(span).color;span.remove();return c})()`);
   for(const selector of ['.article-footer .native-menu a','.site-footer .native-menu a','.share-action[href^="mailto:"]']){
    await hover(selector);const control=await style(selector);assert.equal(control.line,'none',selector);assert.equal(control.color,accent,selector);
   }
   assert(await e(`!document.querySelector('.article-footer').classList.contains('prose')&&!document.querySelector('.site-footer').classList.contains('prose')`));
   assert.equal(await e(`getComputedStyle(document.querySelector('.theme-credit')).fontSize`),'12px');
   assert.equal(await e(`getComputedStyle(document.querySelector('.footer-heading')).fontSize`),'20px');
   assert.equal(await e(`document.querySelector('.theme-credit').textContent.trim()`),language==='en'?'Built with Hugo and Sidera.':'由 Hugo 和 Sidera 构建。');
   await e(`document.activeElement.blur();document.querySelector('.site-footer').scrollIntoView({block:'end',behavior:'instant'})`);await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});await settle();
   if(language==='en')await b.screenshot('footer-links-'+mode);
   results.push(language+'/'+mode+': text link parity at rest/hover/focus; image, menu and control exceptions; native credit links and compact type');
  }
  await v(390,844);await e(`document.activeElement.blur()`);await settle();
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  assert(await e(`document.querySelector('.site-footer [data-footer-item="text"] a:last-child').getClientRects().length>1`),'Long links wrap without widening the page');
  await e(`document.querySelector('.article-footer [data-footer-item="text"] a').focus()`);await b.key('Enter','Enter',13);
  assert.equal(await e('location.hash'),'#sample-heading');
 }
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/footer-links/',false);
 assert.equal(await e(`document.querySelectorAll('.theme-credit a').length`),2);
 assert.equal((await style(selectors[1])).line,'underline');
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(url=>url.startsWith(b.origin+'/')));
 await writeFile(resolve(b.run,'footer-links-results.json'),JSON.stringify(results,null,2)+'\n');
 console.log('PASS '+results.join('; ')+'; mobile wrapping, keyboard fragment navigation, no-JS; no external visits');
},{'/_chinese':'chinese-public'});
