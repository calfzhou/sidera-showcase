// Small local navigation smoke, not a screenshot matrix or external browsing task.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
  const {evaluate: e, navigate: n, key, call, delay} = b;
  for (const scripts of [true, false]) {
    await call('Emulation.setScriptExecutionDisabled', {value: !scripts});
    for (const [label, fragment] of [['Connect the useful parts', ''], ['Give a link a reason', '#give-a-link-a-reason'], ['the surrounding sentence', '#keep-the-surrounding-sentence']]) {
      await n('/notes/reading-list/', scripts);
      assert(await e(`(()=>{const a=[...document.querySelectorAll('.prose a')].find(a=>a.textContent===${JSON.stringify(label)});a.focus();return !a.querySelector('.external-link-marker')})()`));
      await key('Enter', 'Enter', 13);
      for (let i=0; i<80; i++) {
        if (await e(`location.pathname==='/journal/2026/04/14/connect-the-useful-parts/' && location.hash===${JSON.stringify(fragment)} && document.readyState==='complete'`)) break;
        assert(i<79, 'Native navigation did not complete'); await delay(50);
      }
      if (fragment) assert(await e(`(()=>{const h=document.getElementById(${JSON.stringify(fragment.slice(1))});return !!h && document.querySelector(':target')===h && !!h.querySelector('.heading-anchor')})()`));
    }
  }
  await call('Emulation.setScriptExecutionDisabled', {value: false});
  await n('/_edges/notes/link-probe/');
  assert(await e(`!!document.querySelector('.prose a[href^="https://external.example/"] .external-link-marker')`));
  assert(!await e(`document.querySelector('.prose a[href^="/journal/"] .external-link-marker')`));
  assert.equal(await e(`document.querySelector('.prose a[href^="tel:"]').getAttribute('href')`), 'tel:+123456789');
  assert.equal(b.errors.length, 0);
  assert(b.requests.every(u=>u.startsWith(b.origin+'/')), 'No external destination requests');
  console.log('PASS committed note -> dated blog page/heading/reference, no-JS, native markers and external suffix separation');
}, {'/_edges': 'edges-public'});
