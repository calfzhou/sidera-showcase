// Synthetic local media only. The harness blocks all HTTPS, including mock remote
// video.example.invalid; no original LeetCode media is fetched or played.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
const route = '/handbook/reference/video/';
await runBrowser(async b => {
  const {evaluate:e, navigate:n, viewport:v, call, key, delay} = b;
  const wait = async (expression, expected=true) => {
    for (let i=0;i<100;i++) {
      if ((await e(expression)) === expected) return;
      await delay(50);
    }
    assert.fail('Timed out: '+expression);
  };
  for (const [prefix,mode,width] of [['','dark',1440],['','light',390],['/_chinese','dark',390],['/_chinese','light',1440]]) {
    await v(width,950); let start=b.requests.length; await n(prefix+route);
    await e(`Sidera.setColorMode('${mode}')`);
    assert(!b.requests.slice(start).some(u=>u.includes('.mp4')), 'No media before reader activation');
    assert.equal(await e(`document.querySelector('.video-load').textContent`), prefix?'加载视频':'Load video');
    assert(await e(`[...document.querySelectorAll('video')].every(x=>!x.currentSrc&&x.paused)`));
    await e(`document.querySelector('.video-load').focus()`); await key('Enter','Enter',13);
    await wait(`document.querySelector('.content-video').dataset.state`, 'ready');
    assert(await e(`(()=>{const x=document.querySelector('video');return x.readyState>=2&&x.videoWidth===320&&x.videoHeight===180&&x.paused&&x.currentTime===0&&x.controls&&!x.autoplay&&!x.loop})()`));
    assert(await e(`document.activeElement===document.querySelector('video')`));
    assert.equal(await e(`document.querySelector('.video-status').textContent`),prefix?'视频已就绪。请使用播放器控件开始播放。':'Video ready. Use the player controls to start playback.');
    assert.equal(await e(`document.querySelectorAll('video')[1].currentSrc`),'');
    assert(await e('document.documentElement.scrollWidth<=innerWidth'));
    assert(await e(`document.querySelector('.content-video').getBoundingClientRect().width<=480.1`));
    // Actually decode/play the harmless local clip, then pause and seek. Not a mocked player.
    await e(`document.querySelector('video').play()`); await delay(150);
    assert(await e(`document.querySelector('video').currentTime>0&&!document.querySelector('video').paused`));
    await e(`document.querySelector('video').pause();document.querySelector('video').currentTime=1`);
    await wait(`!document.querySelector('video').seeking`);
    assert(await e(`document.querySelector('video').paused&&Math.abs(document.querySelector('video').currentTime-1)<.1`),JSON.stringify(await e(`(()=>{const v=document.querySelector('video');return {time:v.currentTime,duration:v.duration,paused:v.paused,seekable:[...Array(v.seekable.length)].map((_,i)=>[v.seekable.start(i),v.seekable.end(i)]),buffered:[...Array(v.buffered.length)].map((_,i)=>[v.buffered.start(i),v.buffered.end(i)])}})()`)));
    // A hidden nested player only attaches after both disclosure and activation.
    await e(`document.querySelector('.content-folding>summary').focus()`); await key(' ','Space',32);
    assert(await e(`document.querySelector('.content-folding').open`));
    assert.equal(await e(`document.querySelectorAll('video')[1].currentSrc`),'');
    await e(`document.querySelector('.content-folding .video-load').focus()`); await key('Enter','Enter',13);
    await wait(`document.querySelector('.content-folding .content-video').dataset.state`,'ready');
    assert(await e(`[...document.querySelectorAll('video')].every(x=>x.paused)`));
    for (const w of [320,780]) {
      await v(w,950);
      assert(await e('document.documentElement.scrollWidth<=innerWidth'));
      assert(await e(`[...document.querySelectorAll('video')].every(x=>x.getBoundingClientRect().width<=x.closest('.content-video').clientWidth)`));
    }
  }
  // System palette changes do not invert movie pixels; author inversion remains explicit.
  await n('/video-probe/'); await e(`Sidera.setColorMode('auto')`);
  for (const palette of ['dark','light']) {
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:palette}]});
    await wait(`document.documentElement.dataset.colorScheme`,palette);
    assert.equal(await e(`getComputedStyle(document.querySelector('video')).filter`),'none');
    assert.equal(await e(`getComputedStyle(document.querySelector('#video-inversion')).filter`),palette==='dark'?'invert(1) hue-rotate(180deg)':'none');
  }
  assert(await e(`document.querySelector('video').getAttribute('aria-label')==='<&> $literal$'`));
  // Blocked remote request produces useful failure; another local player still succeeds.
  await e(`document.querySelector('.content-box .video-load').click()`);
  await wait(`document.querySelector('.content-box .content-video').dataset.state`,'error');
  assert(await e(`document.querySelector('.content-box .video-status').textContent.includes('could not be loaded')`));
  await e(`document.querySelector('#video-inversion .video-load').click()`);
  await wait(`document.querySelector('#video-inversion .content-video').dataset.state`,'ready');
  const bytes = Buffer.from(await (await fetch(b.origin+route+'motion.mp4')).arrayBuffer());
  assert.deepEqual(bytes,await readFile(resolve(b.run,'baseline-public'+route+'motion.mp4')));
  // No controller on plain/list/disabled/code-only views; actual Summary and Content get it.
  for (const p of ['/','/handbook/reference/','/video-disabled/','/video-code/','/video-plain-host/']) {
    let start=b.requests.length; await n(p);
    assert(!await e(`document.querySelector('[data-sidera-video-script]')`));
    assert(!b.requests.slice(start).some(u=>u.includes('/js/video.')||u.includes('.mp4')));
  }
  for (const p of ['/video-summary-host/','/video-content-host/']) {
    await n(p); await e(`document.querySelector('.video-load').click()`);
    await wait(`document.querySelector('.content-video').dataset.state`,'ready');
  }
  // The bounded stalled-network path (shorten ONLY its test timer, prevent media I/O).
  const mock=await call('Page.addScriptToEvaluateOnNewDocument',{source:`
    const timer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>timer(fn,ms===15000?30:ms,...args);
    Object.defineProperty(HTMLMediaElement.prototype,'src',{configurable:true,get(){return ''},set(v){this.dataset.testSrc=v}});
    HTMLMediaElement.prototype.load=function(){};
  `});
  await n(route);await e(`document.querySelector('.video-load').focus()`);await key('Enter','Enter',13);
  await wait(`document.querySelector('.content-video').dataset.state`,'error');
  assert(await e(`document.activeElement.matches('.video-source')`));
  assert(await e(`document.querySelector('video').hidden`));
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:mock.identifier});
  // Untrusted-looking translation content is text, not injected UI.
  await n('/_override'+route);await e(`document.querySelector('.video-load').click()`);
  await wait(`document.querySelector('.content-video').dataset.state`,'ready');
  assert(await e(`document.querySelector('.video-status').textContent==='<img src=x onerror=bad()> & ready'`));
  assert(!await e(`document.querySelector('.content-video img')`));
  // Native touch activation and target size.
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await v(390,950);await n(route);
  const point=await e(`(()=>{const b=document.querySelector('.video-load');b.scrollIntoView({behavior:'instant',block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,h:r.height}})()`);
  assert(point.h>=44);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point.x,y:point.y}]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`document.querySelector('.content-video').dataset.state`,'ready');
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  // No-JS leaves an honest file fallback, no inactive-looking visible load button.
  await call('Emulation.setScriptExecutionDisabled',{value:true});let start=b.requests.length;await n(route,false);
  assert(await e(`[...document.querySelectorAll('.video-load,video')].every(x=>x.hidden)`));
  assert(await e(`document.querySelector('noscript').textContent.includes('JavaScript is unavailable')`));
  assert(await e(`document.querySelector('.video-source').getAttribute('href')===${JSON.stringify(route+'motion.mp4')}`));
  assert(!b.requests.slice(start).some(u=>u.includes('.mp4')));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  // Two useful views only, not a historic screenshot campaign.
  await v(1100,850);await n(route);await e(`Sidera.setColorMode('dark');document.querySelector('.video-load').click()`);
  await wait(`document.querySelector('.content-video').dataset.state`,'ready');
  await e(`document.querySelector('.content-video').scrollIntoView({behavior:'instant',block:'center'})`);await b.screenshot('video-dark');
  await v(390,850);await n('/_chinese'+route);await e(`Sidera.setColorMode('light');document.querySelector('.video-load').click()`);
  await wait(`document.querySelector('.content-video').dataset.state`,'ready');
  await e(`document.querySelector('.content-video').scrollIntoView({behavior:'instant',block:'center'})`);await b.screenshot('video-mobile');
  assert.equal(b.errors.length,0);
  // Chromium's native media controls also report inline SVG data: icons; these
  // are not network requests or assets introduced by the theme.
  const unexpected=b.requests.filter(u=>!u.startsWith(b.origin+'/')&&!u.startsWith('https://video.example.invalid/')&&!u.startsWith('data:image/svg+xml;base64,'));
  assert.deepEqual(unexpected,[]);
  console.log('PASS native MP4: real local decode/play/pause/seek, explicit load, hidden grid, EN/ZH/palettes/System/inversion, touch/keyboard, mocked failure/timeout, no-JS, Content/Summary and plain-page resource isolation');
},{'/_chinese':'chinese-public','/_override':'overrides-public'});
