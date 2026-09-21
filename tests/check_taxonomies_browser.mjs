import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async ({run,version,errors,requests,origin,call,evaluate,navigate,viewport,key,screenshot,delay})=>{
 const results=[];
 const routes=['/tags/','/tags/science/','/tags/science/page/2/','/categories/','/categories/learning/','/categories/empty/','/journal/categories/learning/','/guidebook/tags/science/','/guidebook/getting-started/setup/'];
 for(const prefix of ['','/_chinese']) for(const mode of ['dark','light']) {
  await navigate(prefix+'/');await evaluate(`localStorage.setItem('sidera-appearance',${JSON.stringify(mode)})`);
  for(const width of [1440,390,320]) for(const route of routes) {
   await viewport(width,900);await navigate(prefix+route);
   const state=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,headings:document.querySelectorAll('h1').length,links:[...document.querySelectorAll('#articles h2 a')].map(a=>a.getAttribute('href')),count:document.querySelector('[data-total]')?.dataset.total,lang:document.documentElement.lang})`);
   assert(!state.overflow && state.headings===1,JSON.stringify({route,width,state}));
   assert.equal(new Set(state.links).size,state.links.length);
   if(route==='/tags/science/') assert.equal(state.count,'5');
   if(route==='/categories/empty/') {assert.equal(state.count,'0');assert.equal(await evaluate(`document.querySelectorAll('[data-page-link]').length`),0);}
   if(prefix && route==='/tags/') assert.equal(await evaluate(`document.querySelector('h1').textContent`),'标签');
   if(prefix && route==='/categories/') assert.equal(await evaluate(`document.querySelector('h1').textContent`),'分类');
   if(width!==320 && ['/tags/','/tags/science/','/categories/learning/','/guidebook/getting-started/setup/'].includes(route)) await screenshot(`${prefix?'zh':'en'}-${mode}-${route.split('/').filter(Boolean).join('-')}-${width}`);
   results.push({prefix,mode,width,route,...state});
  }
 }
 await viewport(1440);await navigate('/tags/');
 // An actual implicit parent is a native Page, not a dead disclosure label.
 await evaluate(`document.querySelector('.taxonomy-index h2 a').focus()`);await key('Enter','Enter',13);
 for(let i=0;i<80 && !await evaluate(`!!document.querySelector('#articles')`);i++)await delay(25);
 assert(await evaluate(`!!document.querySelector('#articles')`));
 await navigate('/tags/science/');await evaluate(`document.querySelector('[data-page-link="next"]').focus()`);await key('Enter','Enter',13);
 for(let i=0;i<80 && !await evaluate(`location.pathname==='/tags/science/page/2/' && document.readyState==='complete'`);i++)await delay(25);
 assert.equal(await evaluate(`document.querySelector('[data-page-number]').dataset.pageNumber`),'2');
 await navigate('/_stress/tags/science/');assert.equal(await evaluate(`document.querySelector('[data-total]').dataset.total`),'0');
 await navigate('/_stress/tags/science/quantum/');assert.equal(await evaluate(`document.querySelector('[data-total]').dataset.total`),'2');
 await navigate('/preview/tags/science/');assert(await evaluate(`[...document.querySelectorAll('#articles h2 a')].every(a=>a.getAttribute('href').startsWith('/preview/'))`));
 await viewport(390);await call('Emulation.setScriptExecutionDisabled',{value:true});await navigate('/categories/learning/',false);
 assert(await evaluate(`document.querySelector('.site-menu').open && document.querySelector('.appearance').hidden && document.querySelectorAll('#articles h2 a').length===2`));
 await screenshot('no-js-category-390');await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(errors.length,0,JSON.stringify(errors));assert(requests.every(u=>u.startsWith(origin+'/')));
 await writeFile(resolve(run,'browser-results.json'),JSON.stringify({version,cases:results.length,results,keyboard:true,noJS:true,flat:true,errors},null,2));
 console.log(`PASS ${results.length} native taxonomy locale/palette/width cases; keyboard, native pager, flat, subpath and no-JS`);
});
