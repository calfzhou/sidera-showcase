// F: real shell regions, matched geometry, configuration-only changes, keyboard/no-JS.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBrowser } from './browser.mjs';
await runBrowser(async ({run,version,errors,requests,origin,call,evaluate,navigate,viewport,key,screenshot,delay}) => {
  const results=[];
  const routes=['/','/field-notes/','/field-notes/tags/practice/writing/','/field-notes/shell-1/','/journal/','/guidebook/','/guidebook/getting-started/setup/','/about/'];
  for (const prefix of ['','/_full','/_two','/_compact','/_empty','/_scoped','/_chinese']) {
    for (const mode of ['dark','light']) {
      await navigate(prefix+'/'); await evaluate(`localStorage.setItem('sidera-appearance',${JSON.stringify(mode)})`);
      for (const width of [1440,390]) for (const route of routes) {
        await viewport(width,900); await navigate(prefix+route);
        const state=await evaluate(`(() => {
          const box=s=>document.querySelector(s)?.getBoundingClientRect().toJSON();
          return {left:box('.left-region'),right:box('.right-region'),main:box('.reading-column'),
            overflow:document.documentElement.scrollWidth>innerWidth+1,
            ids:[...document.querySelectorAll('[id]')].map(n=>n.id),
            toc:[...document.querySelectorAll('[data-toc] a')].every(a=>document.getElementById(decodeURIComponent(a.hash.slice(1)))),
            images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),
            components:[...document.querySelectorAll('[data-component]')].map(n=>n.dataset.component),
            appearance:document.querySelectorAll('[data-appearance-cycle]').length,
            dead:[...document.querySelectorAll('a')].filter(a=>!a.getAttribute('href')||(!a.textContent.trim()&&!a.getAttribute('aria-label'))).length};
        })()`);
        assert(!state.overflow && state.toc && state.images && !state.dead,JSON.stringify({prefix,mode,width,route,state}));
        assert.equal(new Set(state.ids).size,state.ids.length);
        assert.equal(state.appearance,0);
        if(width===1440 && state.left) {
          assert.equal(state.left.x,32); assert.equal(state.left.width,288);
          assert.equal(state.main.x,384); assert.equal(state.main.width,696);
          if(state.right) assert.equal(state.right.x,1112);
        }
        if(prefix==='/_compact') {
          assert(!state.left&&!state.right);
          if(width===1440) assert.equal(state.main.x,(width-696)/2);
        }
        if(prefix==='/_two'&&route==='/field-notes/') assert(state.left&&state.right);
        if(prefix==='/_empty'&&route==='/') assert(!state.left&&!state.right);
        if(route==='/about/'&&['','/_full'].includes(prefix)) assert(state.left&&state.right);
        if(mode==='dark' || prefix==='/_full') await screenshot(`${prefix.slice(2)||'default'}-${mode}-${route.split('/').filter(Boolean).join('-')||'home'}-${width}`);
        results.push({prefix,mode,width,route,...state});
      }
    }
  }
  // Breakpoint edges, 200% text, deep active branch and in-flow disclosures.
  for(const width of [320,760,761,900,1230,1231]) {
    await viewport(width,900); await navigate('/_full/field-notes/shell-1/');
    assert.equal(await evaluate(`document.querySelector('.site-menu').open`),width>=761);
    assert.equal(await evaluate(`document.querySelector('.context-menu').open`),width>=1231);
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  }
  await viewport(390,900); await navigate('/_full/field-notes/tags/practice/writing/');
  await evaluate(`document.querySelector('.site-menu').open=true`);
  assert(await evaluate(`document.querySelector('[data-tag="practice"] > details').open`));
  const parent=await evaluate(`document.querySelector('[data-tag="practice"] > .tree-row a').href`);
  await evaluate(`document.querySelector('[data-tag="practice"] > details > summary').focus()`);
  await key('Enter','Enter',13);
  assert.equal(await evaluate(`document.querySelector('[data-tag="practice"] > details').open`),false);
  await evaluate(`document.querySelector('[data-tag="practice"] > .tree-row a').focus()`); await key('Enter','Enter',13);
  for(let i=0;i<80 && await evaluate('location.href')!==parent;i++) await delay(25);
  assert.equal(await evaluate('location.href'),parent);
  await navigate('/_full/field-notes/shell-1/');
  await evaluate(`document.querySelector('.context-menu > summary').focus()`); await key('Enter','Enter',13);
  assert(await evaluate(`document.querySelector('.context-menu').open`));
  await key('Tab','Tab',9); // TOC summary remains a native independently operable disclosure.
  await evaluate(`document.querySelector('[data-toc] a').focus()`); await key('Enter','Enter',13);
  assert.equal(await evaluate('location.hash'),'#start-with-the-smallest-useful-unit');
  await navigate('/_compact/about/'); await evaluate(`Sidera.setAppearance('light')`);
  await navigate('/_compact/'); assert.equal(await evaluate('document.documentElement.dataset.appearance'),'light');
  await viewport(1440); await navigate('/_two/field-notes/shell-1/');
  await evaluate(`document.documentElement.style.fontSize='36px'`);
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  await viewport(390); await call('Emulation.setScriptExecutionDisabled',{value:true}); await navigate('/_two/about/',false);
  assert(await evaluate(`document.querySelector('.site-menu').open && document.querySelector('.context-menu').open && [...document.querySelectorAll('[data-appearance-cycle]')].every(b=>b.hidden)`));
  await screenshot('two-no-js-390'); await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(requests.every(u=>u.startsWith(origin+'/')));
  await writeFile(resolve(run,'browser-results.json'),JSON.stringify({cases:results.length,version,results,errors,keyboard:true,noJS:true,limits:'Installed Chromium only; no full accessibility certification'},null,2));
  console.log(`PASS F ${results.length} route/configuration/palette/width cases, exact shell geometry, breakpoint edges, keyboard, no-JS`);
},Object.fromEntries(['full','two','compact','empty','scoped'].map(n=>['/_'+n,n+'-public'])));
