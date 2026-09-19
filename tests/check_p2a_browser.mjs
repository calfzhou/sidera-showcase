// P2-A regression scenarios use the shared isolated local Chrome lifecycle.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBrowser } from './browser.mjs';
await runBrowser(async ({ run, port, debugPort, profile, version, errors,
  call, evaluate, navigate, viewport, key, screenshot, delay }) => {
  const pages = [
    ['overview', '/'], ['notebook', '/field-notes/'], ['article', '/field-notes/alpha/'],
    ['tags', '/field-notes/tags/science/'], ['blog', '/journal/'], ['standalone', '/about/']
  ];
  const results = [];
  for (const width of [1440, 900, 768, 390, 320]) {
    await viewport(width, width < 900 ? 844 : 960);
    for (const [name, path] of pages) {
      await navigate(path);
      const geometry = await evaluate(`(() => {
        const main = document.querySelector('main'), menu = document.querySelector('.site-menu');
        return { width: innerWidth, scroll: document.documentElement.scrollWidth,
          main: main.getBoundingClientRect().toJSON(), open: menu.open,
          h1: document.querySelectorAll('h1').length, mains: document.querySelectorAll('main').length,
          background: getComputedStyle(document.documentElement).backgroundColor,
          imgs: [...document.images].every(i => i.complete && i.naturalWidth > 0),
          empty: [...document.querySelectorAll('a')].filter(a => !a.textContent.trim() || !a.getAttribute('href')).length,
          active: document.querySelector('.collection-nav [aria-current]')?.getAttribute('href')
        };
      })()`);
      assert(geometry.scroll <= width + 1, `${name}@${width} overflow: ${geometry.scroll}`);
      assert.equal(geometry.open, width >= 900);
      assert.equal(geometry.h1, 1); assert.equal(geometry.mains, 1);
      assert.equal(geometry.background, 'rgb(17, 24, 32)');
      assert(geometry.imgs); assert.equal(geometry.empty, 0);
      if (path.startsWith('/field-notes/')) assert.equal(geometry.active, '/field-notes/');
      if (width < 900) assert(geometry.main.top < 230, 'Collapsed navigation obscures reading');
      if (width === 1440 || width === 390) await screenshot(`${name}-${width}`);
      results.push({ name, width, geometry });
    }
  }
  // Real keyboard events: skip target, visible focus, native menu disclosure.
  await viewport(390, 844); await navigate('/field-notes/alpha/');
  await key('Tab', 'Tab', 9);
  assert(await evaluate(`document.activeElement.matches('.skip-link') && getComputedStyle(document.activeElement).outlineStyle === 'solid' && document.activeElement.getBoundingClientRect().top >= 0`));
  await key('Enter', 'Enter', 13);
  assert.equal(await evaluate('document.activeElement.id'), 'main');
  await navigate('/field-notes/');
  for (let n = 0; n < 3; n++) await key('Tab', 'Tab', 9);
  assert(await evaluate(`document.activeElement.matches('.site-menu > summary') && getComputedStyle(document.activeElement).outlineWidth === '3px'`));
  await key('Enter', 'Enter', 13);
  assert(await evaluate(`document.querySelector('.site-menu').open`));
  await screenshot('mobile-navigation');
  await key(' ', 'Space', 32);
  assert.equal(await evaluate(`document.querySelector('.site-menu').open`), false);
  // Responsive transition must restore desktop navigation after mobile collapse.
  await viewport(1440); await delay(100);
  assert(await evaluate(`document.querySelector('.site-menu').open`));
  // Native link navigation and complete pager links remain actionable.
  await navigate('/field-notes/');
  await evaluate(`document.querySelector('[data-page-link="next"]').click()`);
  for (let n = 0; n < 100 && !await evaluate(`location.pathname === '/field-notes/page/2/' && document.readyState === 'complete'`); n++) await delay(50);
  assert.equal(await evaluate(`document.querySelector('[data-page-number]').dataset.pageNumber`), '2');
  // Narrow stress page: title, CJK, table/code, image, links, native TOC.
  for (const width of [1440, 390, 320]) {
    await viewport(width, width < 900 ? 844 : 960);
    await navigate('/_stress/field-notes/visual-stress/');
    const stress = await evaluate(`(() => ({
      width: document.documentElement.scrollWidth, viewport: innerWidth,
      toc: [...document.querySelectorAll('#TableOfContents a')].every(a => document.getElementById(decodeURIComponent(a.hash.slice(1)))),
      tocCount: document.querySelectorAll('#TableOfContents a').length,
      wideCode: [...document.querySelectorAll('pre')].some(p => p.scrollWidth > p.clientWidth),
      font: getComputedStyle(document.querySelector('.prose')).fontSize
    }))()`);
    assert(stress.width <= width + 1); assert(stress.toc && stress.tocCount >= 3);
    assert.equal(stress.font, '18px');
    if (width < 900) assert(stress.wideCode);
    if (width !== 320) {
      await screenshot('stress-' + width);
      await evaluate(`document.querySelector('.prose pre').scrollIntoView()`);
      await screenshot('stress-content-' + width);
    }
    results.push({ name: 'stress', width, stress });
  }
  // Light OS preference is deliberately still dark in this first dark-only slice.
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate('/preview/field-notes/alpha/');
  assert.equal(await evaluate(`getComputedStyle(document.documentElement).backgroundColor`), 'rgb(17, 24, 32)');
  assert(await evaluate(`[...document.querySelectorAll('link[rel="stylesheet"],script[src]')].every(e => (e.getAttribute('href') || e.getAttribute('src')).startsWith('/preview/'))`));
  // No-script fallback keeps the complete native navigation usable.
  await call('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate('/field-notes/', false);
  assert(await evaluate(`document.querySelector('.site-menu').open`));
  await call('Emulation.setScriptExecutionDisabled', { value: false });
  // WCAG contrast ratios for all foreground tokens on actual opaque surfaces.
  const contrasts = await evaluate(`(() => {
    const style = getComputedStyle(document.documentElement);
    const rgb = name => style.getPropertyValue(name).trim().slice(1).match(/../g).map(h => parseInt(h,16)/255);
    const lum = c => c.map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i) => s+v*[.2126,.7152,.0722][i],0);
    const rows = [];
    for (const fg of ['--text','--muted','--accent','--pin']) for (const bg of ['--canvas','--surface','--surface-hover']) {
      const a=lum(rgb(fg)), b=lum(rgb(bg)); rows.push({fg,bg,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
    }
    return rows;
  })()`);
  assert(contrasts.every(c => c.ratio >= 4.5)); assert.equal(errors.length, 0);
  await writeFile(resolve(run, 'browser-results.json'), JSON.stringify({
    browser: version.Browser, node: process.version, port, debugPort, isolatedProfile: profile,
    renderedChecks: results, contrasts, keyboard: 'skip, focus, menu open/close: pass',
    pagerClick: 'pass', noScript: 'pass', subpath: 'pass', runtimeErrors: errors,
    limits: 'Chromium only; not an axe audit, screen-reader review, or real-content parity'
  }, null, 2));
  console.log(`PASS ${results.length} rendered route/width checks; keyboard, no-script, pager, subpath, token contrast. ${version.Browser}`);
});
