// Owned local Chrome only. Native MathML, not client KaTeX or an external page.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
  const {evaluate:e,navigate:n,viewport,call,screenshot,key} = b;
  const route='/handbook/reference/advanced-markdown/';
  for (const [width,palette,prefix] of [[1440,'dark',''],[390,'light',''],[390,'dark','/_chinese'],[1440,'light','/_chinese']]) {
    await viewport(width,1000); await n(prefix+route);
    await e(`document.documentElement.dataset.colorScheme=${JSON.stringify(palette)}`);
    const result=await e(`(()=>{
      const body=document.querySelector('.prose');const math=[...body.querySelectorAll('math')];
      const blocks=[...body.querySelectorAll('.math-display')];const imgs=[...body.querySelectorAll('img')];
      return {count:math.length,blocks:blocks.length,overflow:document.documentElement.scrollWidth>innerWidth,
        mathWidths:math.map(m=>m.getBoundingClientRect().width),
        images:imgs.every(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().width<=120.1),
        wide:blocks.at(-1).scrollWidth>blocks.at(-1).clientWidth,
        alerts:body.querySelectorAll('aside[role=note]').length,
        literal:body.textContent.includes('$5 and $10')&&body.querySelector('code').textContent==='code',
        inline:math.slice(0,2).every(m=>getComputedStyle(m).display==='inline math')};
    })()`);
    assert.equal(result.count,5);assert.equal(result.blocks,3);assert.equal(result.alerts,5);
    assert(!result.overflow);assert(result.images);assert(result.literal);assert(result.mathWidths.every(w=>w>0));
    if(width===390) {
      assert(result.wide,'long formula needs its own scrollport');
      await e(`document.querySelectorAll('.math-display')[2].focus()`);
      const before=await e(`document.querySelectorAll('.math-display')[2].scrollLeft`);
      await key('ArrowRight','ArrowRight',39);await b.delay(200);
      assert(await e(`document.querySelectorAll('.math-display')[2].scrollLeft`)>before);
    }
    await e(`document.querySelector('.prose h2').scrollIntoView({block:'start',behavior:'instant'})`);
    if(width===1440&&palette==='dark')await screenshot('advanced-desktop-dark');
    await e(`document.getElementById('inline-and-display-equations').scrollIntoView({block:'start',behavior:'instant'})`);
    await b.delay(100);
    if(width===390&&palette==='light')await screenshot('math-mobile-light');
    const ax=await call('Accessibility.getFullAXTree');
    assert(ax.nodes.some(x=>/math/i.test(x.role?.value||'')), 'Native MathML is in Chrome accessibility tree');
  }
  await call('Emulation.setScriptExecutionDisabled',{value:true});await viewport(390);await n(route,false);
  assert.equal(await e(`document.querySelectorAll('math').length`),5);
  assert(await e(`document.querySelector('math').getBoundingClientRect().width>0`));
  await e(`document.querySelector('.markdown-alert a').focus()`);await key('Enter','Enter',13);await b.delay(300);
  assert(await e(`location.pathname==='/journal/2026/04/14/connect-the-useful-parts/' && location.hash==='#give-a-link-a-reason'`));
  assert.equal(b.errors.length,0);
  assert(b.requests.every(u=>u.startsWith(b.origin+'/')),'No external math/resource request');
  console.log('PASS native math/alerts/images at desktop/mobile, EN/ZH, both palettes, AX, keyboard overflow, no-JS and source link');
},{'/_chinese':'chinese-public'});
