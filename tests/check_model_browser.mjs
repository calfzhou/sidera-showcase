// Repository-local validation only; the harness owns its ports and unique Chrome profile.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async ({navigate,viewport,evaluate,call,screenshot,errors,requests,origin,run,version,delay}) => {
  const results=[];
  async function arrived(path) {
    for (let i=0;i<100;i++) {
      if (await evaluate(`location.pathname===${JSON.stringify(path)} && document.readyState==='complete'`)) return;
      await delay(50);
    }
    assert.fail(`Navigation did not complete: ${path}`);
  }
  for (const width of [1440,390]) for (const mode of ['dark','light']) {
    await viewport(width);
    await navigate('/one/a/');
    await evaluate(`document.querySelector('#appearance').value=${JSON.stringify(mode)};document.querySelector('#appearance').dispatchEvent(new Event('change',{bubbles:true}))`);
    for (const route of ['/free/','/free/styled/','/free/chapter/a/','/fourth/','/fourth/a/','/one/a/','/one/series/shared/','/one/authors/alice/','/authors/alice/','/preset/field-guide/']) {
      await navigate(route);
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),route);
      assert(await evaluate('!!document.querySelector("h1") && !!document.querySelector("main")'),route);
      assert.equal(await evaluate('document.documentElement.dataset.appearance'),mode);
      results.push({route,width,mode});
    }
    await navigate('/one/a/');
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#assigned-authors a")].map(a=>a.getAttribute("href"))'),['/authors/bob/','/authors/alice/']);
    assert.equal(await evaluate('document.querySelector("[data-series-next]").getAttribute("href")'),'/one/b/');
    await screenshot(`model-authors-${mode}-${width}`);
    await evaluate('document.querySelector("[data-series-next]").click()');
    await arrived('/one/b/');
    await navigate('/one/series/shared/');
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#articles h2 a")].map(a=>a.getAttribute("href"))'),['/one/a/']);
    await evaluate('document.querySelector("[data-page-link=next]").click()');
    await arrived('/one/series/shared/page/2/');
    assert.deepEqual(await evaluate('[...document.querySelectorAll("#articles h2 a")].map(a=>a.getAttribute("href"))'),['/one/b/']);
    await screenshot(`model-series-${mode}-${width}`);
  }
  await viewport(390);
  await navigate('/preview/zh/one/a/');
  assert.equal(await evaluate('document.querySelector("#assigned-authors a").textContent'),'示例作者');
  assert.equal(await evaluate('document.querySelector("[data-series-next]").getAttribute("href")'),'/preview/zh/one/b/');
  assert(await evaluate('document.querySelector("[data-series]").textContent.includes("专栏下一篇")'));
  await screenshot('model-chinese-mobile');
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await navigate('/one/a/',false);
  assert.equal(await evaluate('document.querySelector("[data-series-next]").getAttribute("href")'),'/one/b/');
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(requests.every(u=>u.startsWith(origin+'/')),JSON.stringify(requests));
  await writeFile(resolve(run,'model-browser-results.json'),JSON.stringify({browser:version.Browser,node:process.version,cases:results,additional:['Chinese scoped links','no-JS native navigation'],limits:'Installed Chromium, not full cross-browser/WCAG certification'},null,2));
  console.log(`PASS model browser: ${results.length} cases, scoped series journey, author order, Chinese and no-JS`);
}, {'/preview':'bilingual-public'});
