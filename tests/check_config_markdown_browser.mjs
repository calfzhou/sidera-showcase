// One bounded normal-root rendered check. Build baseline-public with comments=false;
// browser.mjs owns/validates its fresh profile and explicit ports, blocks HTTPS, stops all.
import assert from 'node:assert/strict';
import { runBrowser } from './browser.mjs';
await runBrowser(async ({ navigate, evaluate, viewport }) => {
  await viewport(1280, 900);
  const titles = [];
  for (const path of ['/', '/about/']) {
    await navigate(path);
    const state = await evaluate(`(() => {
      const footer = document.querySelector('[data-instance="site-footer-text-1"]');
      const welcome = document.querySelector('[data-instance="left-text-1"]');
      return {
        title: document.querySelector('#main h1').textContent.trim(),
        footer: footer.textContent, strong: footer.querySelector('strong').textContent,
        home: footer.querySelector('a').getAttribute('href'),
        welcome: welcome.textContent,
        comments: !!document.querySelector('#sidera-comments'),
        visible: footer.getBoundingClientRect().height > 0
      };
    })()`);
    assert.equal(state.strong, 'Fieldbook');
    assert.equal(state.home, 'https://example.org/');
    assert(state.welcome.includes(`You are reading ${state.title}.`));
    assert(!/[{}]/.test(state.footer + state.welcome));
    assert(state.visible && !state.comments);
    titles.push(state.title);
  }
  assert.notEqual(titles[0], titles[1]);
  console.log('PASS normal-root configured footer/native home extension and page-aware Welcome; distinct pages, visible Markdown, no comment slot or live service.');
});
