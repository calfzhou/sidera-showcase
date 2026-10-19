// Consumes the theme's check_random.py fixture via the owned local harness.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate: e, navigate: n, viewport: v, call, delay, key} = b;
  const selector = '[data-sidera-random]';
  const wait = async expression => {
    for (let i = 0; i < 100; i++) {
      if (await e(expression)) return;
      await delay(50);
    }
    assert.fail(expression);
  };
  const ready = () => wait(`!!document.querySelector('${selector}:not([hidden])')`);
  const results = [];
  await v(1440, 960);
  await n('/preview/docs/article/'); await ready();
  assert.equal(await e(`document.querySelector('[data-instance="left-random-1"]').previousElementSibling.dataset.component`), 'menu');
  const index = await e(`document.querySelector('[data-sidera-random-script]').dataset.index`);
  const urls = JSON.parse(await readFile(resolve(b.run, 'baseline-public', index.replace('/preview/', '')), 'utf8'));
  assert.equal(b.requests.filter(url => url === b.origin + index).length, 1);
  const eligible = urls.filter(url => url !== '/preview/docs/article/');
  const target = '/preview/notes/article/';
  assert(eligible.includes(target));
  await e(`Math.random = () => ${(eligible.indexOf(target) + 0.5) / eligible.length}; document.querySelector('${selector}').focus()`);
  assert.equal(await e(`getComputedStyle(document.activeElement).outlineStyle`), 'solid');
  await key('Enter', 'Enter', 13);
  await wait(`location.pathname === '${target}'`); await ready();
  assert.equal(await e(`document.querySelector('[data-instance="left-random-1"]').previousElementSibling.dataset.component`), 'menu');
  assert.equal(await e(`document.querySelector('[data-sidera-random-script]').dataset.index`), index);
  results.push('keyboard activation crosses collections in the same tab; exact shared pool on destination');

  await n('/preview/repeats/'); await ready();
  assert.equal(await e(`document.querySelectorAll('${selector}:not([hidden])').length`), 5);
  assert.equal(await e(`document.querySelectorAll('[data-sidera-random-script]').length`), 1);
  assert.equal(await e(`document.querySelector('[data-instance="left-random-2"]').querySelectorAll('svg').length`), 0);
  assert(await e(`document.querySelector('[data-instance="left-random-2"]').textContent.includes('Random article')`));
  assert.equal(b.requests.filter(url => url === b.origin + index).length, 3);
  results.push('five repeated instances share one fetch per document; icons-off keeps visible text');

  await n('/preview/docs/article/'); await ready();
  await wait(`document.getAnimations().every(a => a.playState !== 'running')`);
  await e(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`);
  for (const mode of ['light', 'dark']) {
    await e(`document.documentElement.dataset.colorScheme = '${mode}'`);
    assert(await e(`(() => {const r=document.querySelector('${selector}').getBoundingClientRect();return r.height>=44&&r.width>100&&r.right<=innerWidth;})()`));
    await b.screenshot('random-' + mode);
  }
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  await v(390, 844);
  await wait(`document.querySelector('#left-region').getAttribute('popover') === 'auto'`);
  await e(`document.querySelector('[data-region="left"]').click()`);
  await wait(`document.querySelector('#left-region').matches(':popover-open')`);
  assert(await e(`document.documentElement.scrollWidth<=innerWidth&&document.querySelector('${selector}').getBoundingClientRect().height>=44`));
  await e(`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`);
  await b.screenshot('random-mobile');
  results.push('light/dark, focus, mobile drawer, touch target and reduced-motion layout');

  await n('/preview/zh/docs/article/'); await ready();
  assert(await e(`document.querySelector('${selector}').textContent.includes('随机文章')`));
  const zhIndex = await e(`document.querySelector('[data-sidera-random-script]').dataset.index`);
  assert.notEqual(zhIndex, index);
  const zhUrls = JSON.parse(await readFile(resolve(b.run, 'baseline-public', zhIndex.replace('/preview/', '')), 'utf8'));
  assert(zhUrls.every(url => url.includes('/zh/') || url === '/preview/special-zh/'));
  results.push('localized label and independent current-language pool');

  await call('Emulation.setScriptExecutionDisabled', {value: true});
  await n('/preview/docs/article/', false);
  assert(await e(`document.querySelector('${selector}').hidden&&getComputedStyle(document.querySelector('${selector}').parentElement).display==='none'`));
  await call('Emulation.setScriptExecutionDisabled', {value: false});
  await call('Network.setCacheDisabled', {cacheDisabled: true});
  await call('Network.setBlockedURLs', {urls: ['https://*', '*random/*.json']});
  await n('/preview/docs/article/');
  assert(await e(`document.querySelector('${selector}').hidden&&getComputedStyle(document.querySelector('${selector}').parentElement).display==='none'`));
  await call('Network.setBlockedURLs', {urls: ['https://*']});
  await n('/preview/docs/article/'); await ready();
  results.push('no-JS and failed index hide the entire component; next load recovers');

  await n('/empty/'); assert.equal(await e(`document.querySelectorAll('${selector}').length`), 0);
  await n('/single/'); await ready();
  await e(`document.querySelector('${selector}').click()`);
  await wait(`location.pathname === '/single/only/'`);
  assert.equal(await e(`document.querySelectorAll('${selector}').length`), 0);
  results.push('empty pool omitted; singleton home opens its article and offers no self-loop');
  assert.equal(b.errors.length, 0, JSON.stringify(b.errors));
  assert(!b.requests.some(url => url.includes('/search/')), 'No search index dependency');
  await writeFile(resolve(b.run, 'random-browser-results.json'), JSON.stringify({results, errors: b.errors}, null, 2) + '\n');
  console.log('PASS ' + results.join('; '));
}, {'/preview': 'baseline-public', '/empty': 'empty-public', '/single': 'single-public'});
