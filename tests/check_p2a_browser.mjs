// Local app tests only: new Chrome profile/process; never attach to user sessions.
// Native Node HTTP/WebSocket + installed Chrome. No browser/package download.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { mkdir, readFile, writeFile, open } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const run = resolve(process.argv[2]);
const port = Number(process.env.SIDERA_HTTP_PORT || 14378);
const debugPort = Number(process.env.SIDERA_CDP_PORT || 14379);
const chromePath = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = resolve(run, 'chrome-profile');
const origin = `http://127.0.0.1:${port}`;
const delay = ms => new Promise(r => setTimeout(r, ms));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/__p2a') { res.end(run); return; }
    let path = decodeURIComponent(new URL(req.url, origin).pathname);
    const source = path.startsWith('/_stress/') ? 'stress-public' : path.startsWith('/preview/') ? 'subpath-public' : 'baseline-public';
    path = path.replace(/^\/(?:_stress|preview)(?=\/)/, '');
    const root = resolve(run, source);
    const file = resolve(root, '.' + path + (path.endsWith('/') ? 'index.html' : ''));
    assert(file.startsWith(root + sep));
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
let chrome, socket, log;
const pending = new Map();
let nextId = 0;
const errors = [];
let sessionId;
function call(method, params = {}, session = sessionId) {
  const id = ++nextId;
  return new Promise((accept, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
    pending.set(id, { accept, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
  });
}
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function navigate(path, paint = true) {
  const url = origin + path;
  await call('Page.navigate', { url });
  for (let n = 0; n < 100; n++) {
    if (await evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('.site-footer')`)) break;
    assert(n < 99, 'Page readiness timeout');
    await delay(50);
  }
  if (paint) await evaluate(`(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); })()`);
}
async function viewport(width, height = 960) {
  await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
}
async function key(key, code, virtualKey) {
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: virtualKey, ...(key === 'Enter' ? { text: '\r' } : {}) });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: virtualKey });
}
async function screenshot(name) {
  const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(resolve(run, name + '.png'), Buffer.from(image.data, 'base64'));
}
try {
  await mkdir(profile);
  // Binding fails instead of stopping/reusing any existing service.
  const probe = net.createServer();
  probe.listen(debugPort, '127.0.0.1'); await once(probe, 'listening');
  await new Promise(r => probe.close(r));
  server.listen(port, '127.0.0.1'); await once(server, 'listening');
  assert.equal(await (await fetch(origin + '/__p2a')).text(), run);
  log = await open(resolve(run, 'chrome.log'), 'w');
  chrome = spawn(chromePath, [
    '--headless=new', `--user-data-dir=${profile}`, `--remote-debugging-port=${debugPort}`,
    '--remote-debugging-address=127.0.0.1', '--enable-automation', '--no-first-run',
    '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--disable-default-apps', '--disable-extensions', 'about:blank'
  ], { stdio: ['ignore', log.fd, log.fd] });
  let version;
  for (let n = 0; n < 300; n++) {
    assert(chrome.exitCode === null, 'Own Chrome exited');
    try { version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json(); break; }
    catch { await delay(75); }
  }
  assert(version, 'Own Chrome did not start');
  socket = new WebSocket(version.webSocketDebuggerUrl);
  await once(socket, 'open');
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (pending.has(message.id)) {
      const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer);
      if (message.error) p.reject(new Error(JSON.stringify(message.error))); else p.accept(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
  });
  const args = await call('Browser.getBrowserCommandLine');
  assert(args.arguments.includes(`--user-data-dir=${profile}`), 'Not our isolated Chrome');
  const target = await call('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await call('Target.attachToTarget', { targetId: target.targetId, flatten: true }));
  await call('Page.enable'); await call('Runtime.enable');
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
} finally {
  if (socket?.readyState === 1) socket.close();
  for (const p of pending.values()) clearTimeout(p.timer);
  if (chrome && chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await Promise.race([once(chrome, 'exit'), delay(5000)]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  await new Promise(r => server.close(r));
  if (log) await log.close();
}
