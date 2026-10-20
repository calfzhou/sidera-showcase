// Consume check_random.py output. Hold the real URL-list response to exercise
// initialization order, rather than relying on a fast/cached local fetch.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate: e, navigate: n, call, delay, key} = b;
  const selector = '[data-sidera-random]';
  const wait = async expression => {
    for (let i = 0; i < 100; i++) {
      if (await e(expression)) return;
      await delay(50);
    }
    assert.fail(expression);
  };
  const pending = async () => {
    await wait(`typeof window.__finishRandom === 'function'`);
    assert(await e(`[...document.querySelectorAll('${selector}')].every(b => !b.hidden && b.disabled && b.getAttribute('aria-busy') === 'true')`));
  };
  const ready = () => wait(`[...document.querySelectorAll('${selector}')].every(b => !b.hidden && !b.disabled && !b.hasAttribute('aria-busy'))`);
  const settle = async action => { await e(`window.__finishRandom(${JSON.stringify(action)})`); };
  await b.viewport(1440, 1400);
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'no-preference'}]});
  await call('Page.addScriptToEvaluateOnNewDocument', {source: `
    window.__reveals = [];
    window.__indexFetches = 0;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      window.__reveals.push({instance: this.dataset.instance || this.className,
        delay: options.delay, duration: options.duration,
        randomPending: document.querySelector('[data-sidera-random]')?.disabled});
      return animate.call(this, frames, options);
    };
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      if (!String(args[0]).includes('/random/')) return response;
      window.__indexFetches++;
      return new Promise((resolve, reject) => {
        window.__finishRandom = action => {
          if (action === 'failure') reject(new Error('Simulated offline response'));
          else if (action === 'invalid') resolve(new Response('{}'));
          else resolve(response);
        };
      });
    };
  `});

  // Pause the controller response itself: DOM/layout may paint before deferred
  // scripts execute. Waiting only for the JSON response misses this interval.
  let heldScript;
  b.on('Fetch.requestPaused', event => { heldScript = event.requestId; });
  await call('Fetch.enable', {patterns: [{urlPattern: '*/js/random.min.*.js', requestStage: 'Response'}]});
  const placement = `(() => {
    const button = document.querySelector('${selector}');
    const wrapper = button.closest('.region-component');
    return {height: button.getBoundingClientRect().height, hidden: button.hidden,
      disabled: button.disabled, busy: button.getAttribute('aria-busy'),
      nextTop: wrapper.nextElementSibling.offsetTop};
  })()`;
  for (const path of ['/preview/docs/article/', '/preview/notes/article/']) {
    heldScript = null;
    await call('Page.navigate', {url: b.origin + path});
    for (let i = 0; i < 100 && !heldScript; i++) await delay(50);
    assert(heldScript, 'Controller response is paused');
    await wait(`document.querySelector('[data-sidera-random-script]')?.dataset.current === '${path}' && !!document.querySelector('${selector}')?.closest('.region-component').nextElementSibling`);
    await e(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    const beforeScript = await e(placement);
    assert.equal(await e(`window.__reveals.length`), 0, 'Sample before deferred reveal runs');
    assert(beforeScript.height >= 44 && !beforeScript.hidden && beforeScript.disabled && beforeScript.busy === 'true', JSON.stringify(beforeScript));
    await call('Fetch.continueRequest', {requestId: heldScript});
    await pending();
    assert.equal((await e(placement)).nextTop, beforeScript.nextTop, 'Controller initialization must not insert a slot');
    await settle('success'); await ready();
    assert.equal((await e(placement)).nextTop, beforeScript.nextTop, 'Index readiness must not move following content');
  }
  await call('Fetch.disable');
  console.log('PASS first paint before deferred scripts: disabled widget already occupies its slot; docs/notes navigation has no late insertion');

  await n('/preview/docs/article/'); await pending();
  const initial = await e(`window.__reveals`);
  const menu = initial.find(a => a.instance === 'left-menu-1');
  const random = initial.find(a => a.instance === 'left-random-1');
  assert(menu && random, JSON.stringify(initial));
  assert.equal(menu.delay, 0);
  assert.equal(random.delay, 100);
  assert.equal(random.duration, menu.duration);
  assert.equal(random.randomPending, true);
  const topBefore = await e(`document.querySelector('[data-instance="left-page-tree-1"]').offsetTop`);
  // A loading button cannot navigate or take keyboard focus.
  await e(`document.querySelector('${selector}').focus(); document.querySelector('${selector}').click()`);
  assert(await e(`!document.activeElement.matches('${selector}') && location.pathname === '/preview/docs/article/'`));
  await wait(`document.getAnimations().every(a => a.playState !== 'running')`);
  await settle('success'); await ready();
  assert.equal(await e(`document.querySelector('[data-instance="left-page-tree-1"]').offsetTop`), topBefore);
  assert.equal(await e(`window.__reveals.length`), initial.length, 'Readiness does not start another reveal');
  assert.equal(await e(`window.__indexFetches`), 1);
  await e(`document.querySelector('${selector}').focus()`);
  await key('Enter', 'Enter', 13);
  await wait(`location.pathname !== '/preview/docs/article/'`);
  console.log('PASS loading random widget joins the normal stagger; no click/focus while pending, no readiness layout shift or replay; keyboard navigation works');

  for (const outcome of ['failure', 'invalid']) {
    await n('/preview/docs/article/'); await pending();
    await settle(outcome);
    await wait(`document.querySelector('${selector}').hidden`);
    assert(await e(`document.querySelector('${selector}').disabled && !document.querySelector('${selector}').hasAttribute('aria-busy') && getComputedStyle(document.querySelector('${selector}').parentElement).display === 'none'`));
  }
  await n('/preview/repeats/'); await pending();
  assert.equal(await e(`document.querySelectorAll('${selector}').length`), 5);
  assert.equal(await e(`window.__indexFetches`), 1);
  await settle('success'); await ready();
  console.log('PASS failed/invalid responses hide the full widget; repeated instances share one pending request');

  for (const [name, path, reduced] of [
    ['reduced motion', '/preview/docs/article/', true],
    ['hash destination', '/preview/docs/article/#main', false],
    ['site opt-out', '/no-reveal/docs/article/', false],
  ]) {
    await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference'}]});
    // Force a new document: navigating only to a hash would reuse the ready page.
    await call('Page.navigate', {url: 'about:blank'});
    await wait(`location.href === 'about:blank'`);
    await n(path); await pending();
    assert.equal(await e(`window.__reveals.length`), 0, name);
    await settle('success'); await ready();
    assert.equal(await e(`window.__reveals.length`), 0, name + ' after readiness');
  }
  // User focus cancels active reveal; readiness must not restart it.
  await n('/preview/docs/article/'); await pending();
  await e(`document.querySelector('.native-menu a, .navigation-content a').focus()`);
  assert.equal(await e(`document.querySelector('[data-instance="left-random-1"]').getAnimations().length`), 0);
  const beforeReady = await e(`window.__reveals.length`);
  await settle('success'); await ready();
  assert.equal(await e(`window.__reveals.length`), beforeReady);
  console.log('PASS reduced motion, hash navigation, page_reveal=false and focus cancellation remain authoritative');
  assert.equal(b.errors.length, 0, JSON.stringify(b.errors));
}, {'/preview': 'baseline-public', '/no-reveal': 'reveal-off-public'});
