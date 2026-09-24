// Local app tests only: new Chrome profile/process; never attach to user sessions.
// Native Node HTTP/WebSocket + installed Chrome. No browser/package download.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { mkdir, readFile, writeFile, open } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

export async function runBrowser(check, mounts = {}) {
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
    let source = path.startsWith('/_chinese/') ? 'chinese-preview-public' : path.startsWith('/_stress/') ? 'stress-public' : path.startsWith('/preview/') ? 'subpath-public' : 'baseline-public';
    const mount = Object.entries(mounts).find(([prefix]) => path.startsWith(prefix + '/'));
    if (mount) { source = mount[1]; path = path.slice(mount[0].length); }
    else path = path.replace(/^\/(?:_chinese|_stress|preview)(?=\/)/, '');
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
const requests = [];
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
    if (await evaluate(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete' && !!document.querySelector('#main')`)) break;
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
    else if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request.url);
  });
  const args = await call('Browser.getBrowserCommandLine');
  assert(args.arguments.includes(`--user-data-dir=${profile}`), 'Not our isolated Chrome');
  const target = await call('Target.createTarget', { url: 'about:blank' });
  ({ sessionId } = await call('Target.attachToTarget', { targetId: target.targetId, flatten: true }));
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await call('Network.setBlockedURLs', {urls:['https://*']});
  await check({ run, port, debugPort, profile, origin, version, errors, requests,
    call, evaluate, navigate, viewport, key, screenshot, delay });
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

}
