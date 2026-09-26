// Focused component/state evaluation on a verified own local instance. No external browsing.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async ({run,version,navigate,viewport,evaluate,call,key,screenshot,delay,errors,requests,origin}) => {
  let cases=0;
  const alpha='/field-notes/alpha/';
  async function mode(value) {
    await evaluate(`Sidera.setColorMode(${JSON.stringify(value)})`);
    await delay(220);
  }
  async function wait(expression) {
    for(let n=0;n<100;n++){if(await evaluate(expression))return;await delay(30);}
    assert.fail(expression);
  }
  for(const [width,palette,prefix] of [[1440,'dark',''],[390,'light','/_chinese'],[390,'dark',''],[1440,'light','/_chinese']]) {
    await viewport(width);await navigate(prefix+alpha);await mode(palette);
    for(const route of [alpha,'/field-notes/','/guidebook/getting-started/setup/','/authors/demo-editor/','/journal/series/model-workshop/']) {
      await navigate(prefix+route);
      const state=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,loaded:[...document.images].every(i=>i.naturalWidth>0),palette:document.documentElement.dataset.colorScheme,ids:[...document.querySelectorAll('[id]')].map(n=>n.id)})`);
      assert(!state.overflow && state.loaded,JSON.stringify({width,palette,route,state}));
      assert.equal(state.palette,palette);assert.equal(new Set(state.ids).size,state.ids.length);cases++;
    }
  }
  await viewport(1440);await navigate('/field-notes/');await mode('dark');
  const point=await evaluate(`(()=>{const r=document.querySelector('.card-title').getBoundingClientRect();return{x:r.x+20,y:r.y+10}})()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await delay(300);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.card-title')).backgroundSize`),'100% 10px');
  await screenshot('components-dark-desktop');
  await evaluate(`document.querySelector('.card-title').focus()`);
  assert.notEqual(await evaluate(`getComputedStyle(document.querySelector('.card-title')).outlineStyle`),'none');
  // Keyboard branch toggle leaves the parent body's independent anchor reachable.
  await navigate('/guidebook/getting-started/setup/');
  const parent='.docs-navigation a[data-doc-path="/guidebook/getting-started"]';
  await evaluate(`document.querySelector(${JSON.stringify(parent)}).closest('li').querySelector('summary').focus()`);
  const opened=await evaluate(`document.activeElement.parentElement.open`);await key('Enter','Enter',13);
  assert.equal(await evaluate(`document.activeElement.parentElement.open`),!opened);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(parent)}).getAttribute('href')`),'/guidebook/getting-started/');
  await key('Enter','Enter',13);
  // Native heading anchor navigation + scroll-aware current state; no click interception.
  await navigate(alpha);
  await evaluate(`document.querySelector('[data-toc] a[href="#observation-3"]').focus()`);await key('Enter','Enter',13);
  await wait(`location.hash==='#observation-3' && document.querySelector('[data-toc] a[aria-current]').hash==='#observation-3'`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.left-region')).position`),'sticky');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.right-region')).position`),'sticky');
  // Footer at real article end, both columns and native sequence remain reachable.
  await navigate('/journal/2024/01/01/first-signal/');
  assert.equal(await evaluate(`document.querySelector('[data-series-next]').getAttribute('href')`),'/journal/2024/01/02/second-signal/');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#footer-assigned-authors a')].map(a=>a.textContent.trim())`),['Example editor','Example researcher']);
  await evaluate(`document.querySelector('.article-footer').scrollIntoView({behavior:'instant',block:'start'})`);await delay(100);
  await screenshot('components-footers-desktop');
  await viewport(390);await navigate('/_chinese'+alpha);await mode('light');
  await evaluate(`document.querySelector('[data-region="left"]').focus()`);await key('Enter','Enter',13);await delay(80);
  assert(await evaluate(`document.querySelector('#left-region').matches(':popover-open')`));
  await key('Escape','Escape',27);
  await evaluate(`document.querySelector('[data-region="right"]').focus()`);await key('Enter','Enter',13);await delay(80);
  assert(await evaluate(`document.querySelector('#right-region').matches(':popover-open')`));
  assert.equal(await evaluate(`document.querySelector('.toc-top').textContent`),'返回顶部');
  await delay(450);await screenshot('components-light-chinese-mobile');
  // Reduced motion removes both transition duration and cover zoom.
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate('/field-notes/');await evaluate(`document.querySelector('.card-title').focus()`);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.card-cover img')).transform`),'none');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.card-cover img')).transitionDuration`),'0s');
  await call('Emulation.setEmulatedMedia',{features:[]});
  // System preference and storage persistence use the existing appearance implementation.
  await mode('auto');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
  await wait(`document.documentElement.dataset.colorScheme==='light'`);await navigate(alpha);
  assert.equal(await evaluate(`document.documentElement.dataset.colorMode`),'auto');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});
  await wait(`document.documentElement.dataset.colorScheme==='dark'`);
  // Both no-JS and denied storage stay readable. Do not make absent footers readiness markers.
  await call('Emulation.setScriptExecutionDisabled',{value:true});await navigate(alpha,false);
  assert(await evaluate(`document.querySelector('.site-menu').open && document.querySelector('.context-menu').open && [...document.querySelectorAll('[data-color-mode-cycle]')].every(b=>b.hidden)`));
  assert(await evaluate(`!!document.querySelector('.article-footer a')`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  const injection=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})`});
  await navigate(alpha);assert.equal(await evaluate(`document.documentElement.dataset.colorScheme`),'dark');
  await mode('light');assert.equal(await evaluate(`document.documentElement.dataset.colorScheme`),'light');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
  assert.equal(errors.length,0,JSON.stringify(errors));assert(requests.every(u=>u.startsWith(origin+'/')),JSON.stringify(requests));
  await writeFile(resolve(run,'browser-results.json'),JSON.stringify({cases,browser:version.Browser,node:process.version,checks:['card hover/focus','parent link/disclosure keyboard','native TOC anchor/scroll current','sticky rails','footer columns/series/authors','Chinese mobile disclosures','reduced motion','System storage','no-JS/denied storage'],limits:'Installed Chromium only; visual review not pixel parity or complete accessibility certification.'},null,2));
  console.log(`PASS G browser: ${cases} representative views and focused dynamic states`);
},{'/_chinese':'chinese-public','':'components-public'});
