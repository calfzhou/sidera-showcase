// Native browser/OS selection throughout the site; no theme-colored pseudo-element override.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';
const css=await readFile(new URL('../themes/sidera/assets/css/sidera.css',import.meta.url),'utf8');
assert(!/::(?:-moz-)?selection\b/.test(css),'Do not replace native selection colors globally or within prose');
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,delay}=b,rows=[];
 for(const mode of ['dark','light'])for(const width of [1440,390]){
  await v(width,1000);await n('/handbook/reference/markdown/');await e(`Sidera.setColorMode('${mode}')`);await call('Page.bringToFront');
  for(const selector of [width===1440?'.left-region .brand':'.mobile-brand .brand',...(width===1440?['.left-region .native-menu a']:[]),'.article-header h1','.prose > p','.prose .lntd:last-child code','.site-footer .authored-text']){
   const result=await e(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center',behavior:'instant'});const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);return {selected:s.toString(),hasFocus:document.hasFocus(),background:getComputedStyle(el,'::selection').backgroundColor,normal:getComputedStyle(el).color}})()`);
   assert(result.selected.trim(),selector);assert(result.hasFocus);assert.equal(result.background,'rgba(0, 0, 0, 0)');
   rows.push({mode,width,selector,native:true});
  }
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 }
 // Programmatic selection in the existing manual-copy field is native too (no clipboard use).
 await v(390,1000);await n('/handbook/reference/markdown/');
 await e(`(()=>{const t=document.querySelector('.code-copy-fallback');t.hidden=false;t.value='Native field selection';t.focus();t.select()})()`);
 assert(await e(`(()=>{const t=document.activeElement;return t.selectionStart===0&&t.selectionEnd===t.value.length&&getComputedStyle(t,'::selection').backgroundColor==='rgba(0, 0, 0, 0)'})()`));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/about/',false);
 assert(await e(`(()=>{const p=document.querySelector('.prose p'),r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);return !!getSelection().toString()})()`));
 await call('Emulation.setScriptExecutionDisabled',{value:false});
 await v(1050,720);await n('/handbook/reference/markdown/');await call('Page.bringToFront');
 await e(`Sidera.setColorMode('dark');(()=>{const p=document.querySelector('.prose > p');p.scrollIntoView({block:'center',behavior:'instant'});const r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r)})()`);await delay(100);
 const rect=await e(`(()=>{const p=document.querySelector('.prose > p'),r=p.getBoundingClientRect();return{x:r.x-4,y:r.y+scrollY-4,width:r.width+8,height:r.height+8}})()`);
 const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...rect,scale:1}});await writeFile(b.run+'/native-selection.png',Buffer.from(image.data,'base64'));
 await writeFile(b.run+'/selection-checks.json',JSON.stringify({browser:b.version.Browser,rows},null,2));
 assert.equal(b.errors.length,0);assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 console.log('PASS native site-wide selection: identity/header/prose/code/footer, both palettes/widths, form field and no-JS; no author color overrides');
});
