// Consumes theme check_shortcodes.py output; owns Chrome/profile and local servers.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate:e,navigate:n,viewport:v,call} = b;
  const results = [];
  const tap = async selector => {
    await e(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);
    const point = await e(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await b.delay(350);
  };
  const outer = `document.querySelector('#methods')`;
  const states = () => e(`[...${outer}.querySelectorAll(':scope > .content-tab')].map(p=>!p.hidden)`);
  const enhanced = () => e(`document.querySelector('.content-tabs').hasAttribute('data-enhanced')`);
  await v(1440,1100);
  await n('/preview/controls/');
  assert(await enhanced());
  assert.deepEqual(await states(), [false,true]);
  assert(await e(`document.querySelectorAll('[role=tablist]').length===3 && [...document.querySelectorAll('[role=tab]')].every(t=>document.getElementById(t.getAttribute('aria-controls')).getAttribute('aria-labelledby')===t.id)`));
  await e(`${outer}.querySelector('[role=tab][aria-selected=true]').focus()`);
  await b.key('ArrowLeft','ArrowLeft',37);
  assert.deepEqual(await states(), [true,false]);
  assert.equal(await e(`document.activeElement.getAttribute('aria-selected')`),'true');
  await b.key('End','End',35);
  assert.deepEqual(await states(), [false,true]);
  await b.key('Home','Home',36);
  assert.deepEqual(await states(), [true,false]);
  await b.key('ArrowLeft','ArrowLeft',37);
  assert.deepEqual(await states(), [false,true]);
  assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
  results.push('ARIA relationships, initial panel, roving focus, arrows/Home/End and wraparound');

  await n('/preview/controls/#deep-heading');
  assert.deepEqual(await states(), [false,true]);
  assert(await e(`(()=>{const h=document.querySelector('#deep-heading');return [...document.querySelectorAll('.content-tab')].filter(p=>p.contains(h)).every(p=>!p.hidden)&&h.getBoundingClientRect().height>0})()`));
  await e(`location.hash='#first-heading'`);
  await b.delay(80);
  assert.deepEqual(await states(), [true,false]);
  await n('/preview/controls/?kw=Deep%20target');
  assert(await e(`document.querySelector('#deep-heading').closest('.content-tab').hidden===false`));
  assert(await e(`!!document.querySelector('#deep-heading').parentElement.querySelector('[data-search-mark]')`));
  results.push('initial/changing deep links and search highlights reveal nested panels');
  await n('/preview/controls/');

  for (const mode of ['light','dark']) {
    await e(`document.documentElement.dataset.colorScheme='${mode}';for(const a of document.getAnimations()){if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()}`);
    assert(await e(`['.content-sup','.content-sub'].every(selector=>{const el=document.querySelector(selector);return getComputedStyle(el).color===getComputedStyle(el.parentElement).color})`));
    await e(`document.querySelector('.content-sup').parentElement.style.color='rgb(140, 50, 90)'`);
    assert.equal(await e(`getComputedStyle(document.querySelector('.content-sup')).color`),'rgb(140, 50, 90)');
    await e(`document.querySelector('.content-sup').parentElement.style.removeProperty('color')`);
    await e(`document.querySelector('.content-tip .tip-trigger').focus()`);
    assert(await e(`document.querySelector('.tip-bubble').matches(':popover-open')`));
    assert(await e(`(()=>{const b=document.querySelector('.tip-bubble').getBoundingClientRect();return b.left>=0&&b.right<=innerWidth&&b.top>=0&&b.bottom<=innerHeight})()`));
    assert(await e(`document.querySelector('.tip-trigger').getAttribute('aria-describedby')===document.querySelector('.tip-bubble').id`));
    await b.key('Escape','Escape',27);
    assert.equal(await e(`document.querySelector('.tip-bubble').matches(':popover-open')`),false);
    await e(`document.querySelector('.content-psw').focus()`);
    await b.key('Enter','Enter',13);
    assert.equal(await e(`document.querySelector('.content-psw').getAttribute('aria-pressed')`),'true');
    assert.equal(await e(`getComputedStyle(document.querySelector('.content-psw > span')).opacity`),'1');
    await b.key('Enter','Enter',13);
    assert.equal(await e(`document.querySelector('.content-psw').getAttribute('aria-pressed')`),'false');
    assert.equal(await e(`getComputedStyle(document.querySelector('.content-psw > span')).opacity`),'0');
    await e(`document.querySelector('.content-blur').focus()`);
    await b.key(' ','Space',32);
    assert.equal(await e(`getComputedStyle(document.querySelector('.content-blur > span')).filter`),'none');
    await b.key(' ','Space',32);
    await e(`document.querySelector('.prose').scrollIntoView({behavior:'instant',block:'start'})`);
    await b.screenshot('shortcodes-'+mode);
    assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false);
    results.push(mode+': tooltip bounds and Escape, keyboard reveal/hide, no overflow');
  }
  // Browser textContent is the source contract, not highlighted/minified markup.
  const codes=await e(`[...document.querySelectorAll('.content-code-inline code')].map(c=>c.textContent)`);
  assert.deepEqual(codes, ['print("你好  <&>")','<b>Hi</b>','<?php echo "hello"; ?>','<tag>&','const value = 1;']);
  assert(await e(`(()=>{const c=document.querySelector('.content-code-inline'),p=c.parentElement;return getComputedStyle(c).display==='inline'&&p.textContent.startsWith('Inline: A')&&p.textContent.includes('B.')})()`));

  await v(390,844);
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await e(`document.activeElement.blur()`);
  await tap('.tip-trigger');
  assert(await e(`document.querySelector('.tip-bubble').matches(':popover-open')`));
  assert(await e(`(()=>{const r=document.querySelector('.tip-bubble').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`));
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:4,y:4}]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await e(`document.querySelector('.tip-bubble').matches(':popover-open')`),false);
  await tap('.content-psw');
  assert.equal(await e(`document.querySelector('.content-psw').getAttribute('aria-pressed')`),'true');
  assert.equal(await e(`document.querySelector('.tip-bubble').matches(':popover-open')`),false);
  await tap('#methods [role=tab]');
  assert.deepEqual(await states(), [true,false]);
  await e(`${outer}.scrollIntoView({behavior:'instant',block:'start'})`);
  assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false);
  await b.screenshot('shortcodes-mobile');
  results.push('narrow viewport, bounded annotation and inline code geometry');

  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert(await e(`[...document.querySelectorAll('.content-tab')].every(p=>getComputedStyle(p).display!=='none')`));
  assert(await e(`[...document.querySelectorAll('.tab-title')].every(p=>getComputedStyle(p).display!=='none')`));
  assert.equal(await e(`getComputedStyle(document.querySelector('.tabs-nav')).display`),'none');
  assert(await e(`['.content-sup','.content-sub'].every(selector=>{const el=document.querySelector(selector);return getComputedStyle(el).color===getComputedStyle(el.parentElement).color})`));
  assert.equal(await e(`getComputedStyle(document.querySelector('.content-psw > span')).opacity`),'1');
  assert.equal(await e(`getComputedStyle(document.querySelector('.tip-bubble')).display`),'inline');
  await call('Emulation.setEmulatedMedia',{media:'',features:[{name:'forced-colors',value:'active'},{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await e(`getComputedStyle(document.querySelector('[role=tab][aria-selected=true]')).borderBottomWidth`),'2px');
  await call('Emulation.setEmulatedMedia',{features:[]});
  results.push('print exposes all panel labels, annotations and concealed text; forced-colors selected border');

  await n('/preview/host/');
  assert.equal(await e(`document.querySelectorAll('.content-tabs[data-enhanced]').length`),6);
  assert(await e(`(()=>{const ids=[...document.querySelectorAll('[role=tab],[role=tabpanel],[role=tooltip]')].map(x=>x.id);return ids.length===new Set(ids).size})()`));
  results.push('repeated cross-page Content: unique generated control IDs');
  await n('/preview/zh/controls/');
  assert.equal(await e(`document.querySelector('.content-reveal').title`),'显示遮盖的文字（非安全保护）');
  assert.equal(await e(`[...document.querySelectorAll('[role=tablist]')].at(-1).getAttribute('aria-label')`),'内容选项卡');
  await n('/off/controls/');
  assert.equal(await e(`document.querySelector('.content-download svg')`),null);
  assert(await e(`!!document.querySelector('.content-icon svg')`));
  results.push('Chinese UI, icons-off retains authored icon and download label');

  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await n('/preview/controls/',false);
  assert.equal(await enhanced(),false);
  assert(await e(`[...document.querySelectorAll('.content-tab')].every(p=>!p.hidden)`));
  await e(`document.querySelector('.tip-trigger').focus()`);
  assert.equal(await e(`getComputedStyle(document.querySelector('.tip-bubble')).display`),'block');
  await e(`document.querySelector('.content-blur').focus()`);
  assert.equal(await e(`getComputedStyle(document.querySelector('.content-blur > span')).filter`),'none');
  assert(await e(`!!document.querySelector('.content-download[download][href]')`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  await call('Network.setBlockedURLs',{urls:['*content-controls*']});
  await n('/preview/controls/');
  assert.equal(await enhanced(),false);
  assert(await e(`[...document.querySelectorAll('.content-tab')].every(p=>!p.hidden)`));
  results.push('no-JS and failed controller: all tabs and downloads readable; focus reveals annotations/text');
  if (process.argv[3]) {
    await call('Network.setBlockedURLs',{urls:['https://*']});
    await n('/sidera-showcase/handbook/reference/inline-components/');
    assert(await enhanced());
    for (const mode of ['light','dark']) {
      await e(`document.documentElement.dataset.colorScheme='${mode}';for(const a of document.getAnimations()){if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()}`);
      await v(1280,1000);
      await e(`document.querySelector('#icons-and-topics').scrollIntoView({block:'start',behavior:'instant'})`);
      await b.screenshot('showcase-shortcodes-'+mode);
      await e(`document.querySelector('#two-ways-to-read-the-same-idea').scrollIntoView({block:'start',behavior:'instant'})`);
      await b.screenshot('showcase-tabs-'+mode);
    }
    await v(390,844);
    await e(`document.querySelector('#seven-text-decorations').scrollIntoView({block:'start',behavior:'instant'})`);
    assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false);
    await b.screenshot('showcase-shortcodes-mobile');
    await n('/sidera-showcase/sidera/authoring/example/');
    assert(await enhanced());
    results.push('real prefixed showcase and mounted manual: live controls, desktop light/dark and mobile');
  }
  assert(!b.errors.length,JSON.stringify(b.errors));
  await writeFile(resolve(b.run,'shortcodes-browser-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS shortcodes browser:',results.join('; '));
}, {'/preview':'baseline-public','/off':'icons-off-public',...(process.argv[3] ? {'/sidera-showcase':resolve(process.argv[3])} : {})});
