// Repository-local proof, isolated installed Chrome; no external browsing.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBrowser } from './browser.mjs';
await runBrowser(async ({run,version,errors,requests,origin,call,evaluate,navigate,viewport,key,screenshot}) => {
  let cases=0;
  for (const prefix of ['', '/_chinese']) for (const mode of ['dark','light']) {
    await navigate(prefix+'/guidebook/');
    await evaluate(`localStorage.setItem('sidera-appearance',${JSON.stringify(mode)})`);
    for (const width of [390,1280]) for (const route of ['/guidebook/','/guidebook/page/2/','/guidebook/getting-started/setup/','/guidebook/reference/','/sidera/','/sidera/authoring/example/']) {
      await viewport(width); await navigate(prefix+route);
      const state=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,
        mode:document.documentElement.dataset.colorScheme, tree:!!document.querySelector('.docs-navigation'),
        article:document.querySelector('article')?.dataset.renderer,
        list:document.querySelectorAll('#doc-children > li').length,
        prose:!!document.querySelector('article > .prose'),
        loaded:[...document.images].every(i=>i.complete && i.naturalWidth>0),
        text:document.querySelector('.docs-navigation').textContent})`);
      assert(!state.overflow,JSON.stringify({route,width,state}));
      assert(state.tree && state.loaded && state.article==='shared-article');
      assert.equal(state.prose,!route.includes('/page/2/'));
      if(prefix) assert(state.text.includes('页面目录'));
      if(route==='/guidebook/') assert.equal(state.list,2);
      if(route==='/guidebook/reference/') assert.equal(state.list,0);
      if(route==='/guidebook/' && width===390) await screenshot(`docs-${prefix?'zh':'en'}-${mode}-${width}`);
      if(route==='/guidebook/getting-started/setup/' && width===1280 && !prefix) await screenshot(`docs-child-${mode}-${width}`);
      cases++;
    }
  }
  await viewport(1280); await navigate('/guidebook/');
  await evaluate(`document.querySelector('[data-page-link="next"]').focus()`);
  await key('Enter','Enter',13);
  for(let i=0;i<50 && !(await evaluate(`location.pathname==='/guidebook/page/2/' && document.readyState==='complete'`));i++) await new Promise(r=>setTimeout(r,50));
  assert.equal(await evaluate('location.pathname'),'/guidebook/page/2/');
  assert.equal(await evaluate(`document.querySelectorAll('#doc-children li').length`),2);
  // Active-branch navigation now collapses unrelated branches. Open the real
  // parent disclosure before focusing its child; do not focus a hidden link.
  await evaluate(`document.querySelector('.docs-navigation a[data-doc-path="/guidebook/getting-started"]').closest('li').querySelector('details > summary').focus()`);
  await key('Enter','Enter',13);
  assert(await evaluate(`document.querySelector('.docs-navigation a[data-doc-path="/guidebook/getting-started"]').closest('li').querySelector('details').open`));
  await evaluate(`document.querySelector('.docs-navigation a[data-doc-path="/guidebook/getting-started/setup"]').focus()`);
  await key('Enter','Enter',13);
  for(let i=0;i<50 && !(await evaluate(`location.pathname==='/guidebook/getting-started/setup/' && document.readyState==='complete'`));i++) await new Promise(r=>setTimeout(r,50));
  assert.equal(await evaluate(`document.querySelector('.docs-navigation [aria-current="page"]').dataset.docPath`),'/guidebook/getting-started/setup');
  await viewport(390); await call('Emulation.setScriptExecutionDisabled',{value:true}); await navigate('/sidera/',false);
  assert.equal(await evaluate(`document.querySelector('.site-menu').open`),true);
  assert.equal(await evaluate(`[...document.querySelectorAll('[data-color-mode-cycle]')].every(b=>b.hidden)`),true);
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(!requests.some(u=>u.startsWith('http')&&!u.startsWith(origin)));
  await writeFile(resolve(run,'browser-results.json'),JSON.stringify({cases,version,keyboard:true,noJS:true,errors},null,2));
  console.log(`PASS ${cases} docs route/locale/palette/width cases; keyboard, no-JS, assets and zero runtime errors.`);
});
