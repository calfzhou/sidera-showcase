// P2-B scenarios; shared P2-A driver owns/cleans the isolated local browser.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBrowser } from './browser.mjs';

await runBrowser(async ({ run, port, debugPort, profile, origin, version, errors, requests,
  call, evaluate, navigate, viewport, key, screenshot, delay }) => {
  const results = [], contrasts = [], reading = [];
  const palette = () => evaluate(`document.documentElement.dataset.appearance || 'dark'`);
  // Native media events and keyboard scrolling are asynchronous in headless Chrome.
  // Wait for the asserted state, not an assumed 80/100ms compositor schedule.
  const waitFor = async (predicate, label) => {
    for (let n=0; n<80; n++) {
      if (await predicate()) return;
      await delay(25);
    }
    assert.fail(`Timed out waiting for ${label}`);
  };
  const os = async value => {
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
    await waitFor(() => evaluate(`matchMedia('(prefers-color-scheme: light)').matches === ${value==='light'}`), 'native media query');
    if (await evaluate(`document.querySelector('#appearance')?.value === 'system'`)) {
      await waitFor(async () => (await palette()) === value, 'System appearance');
    }
  };
  const choose = async value => {
    await evaluate(`document.querySelector('#appearance').value = ${JSON.stringify(value)}; document.querySelector('#appearance').dispatchEvent(new Event('change', {bubbles:true}))`);
  };
  const overflow = async label => {
    const size = await evaluate(`({viewport: innerWidth, document: document.documentElement.scrollWidth})`);
    assert(size.document <= size.viewport + 1, `${label}: ${JSON.stringify(size)}`);
    return size;
  };
  // Observe when the early palette is set: before any body exists, still loading.
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    new MutationObserver(() => {
      if (!window.earlyPalette && document.documentElement?.dataset.appearance) {
        window.earlyPalette = { value: document.documentElement.dataset.appearance,
          body: !!document.body, state: document.readyState };
      }
    }).observe(document, {subtree:true, attributes:true, attributeFilter:['data-appearance']});
  ` });
  // Simulate absent optional local fonts without uninstalling anything. All
  // following screenshots use the actual remaining production fallback stacks.
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    document.addEventListener('DOMContentLoaded', () => {
      const style=getComputedStyle(document.documentElement);
      for (const [token,optional] of [['--reading','LXGW WenKai'],['--code','Source Code Pro']]) {
        document.documentElement.style.setProperty(token, style.getPropertyValue(token).split(',').filter(f=>!f.includes(optional)).join(','));
      }
    });
  ` });
  await viewport(1440); await os('light'); await navigate('/');
  assert.equal(await palette(), 'dark', 'Fresh preference must not default to system');
  assert.equal(await evaluate(`document.querySelector('#appearance').value`), 'dark');
  // Real keyboard interaction with the labeled native select.
  await evaluate(`document.querySelector('#appearance').focus()`);
  await call('Input.dispatchKeyEvent', {type:'keyDown',key:'l',code:'KeyL',text:'l',windowsVirtualKeyCode:76});
  await call('Input.dispatchKeyEvent', {type:'keyUp',key:'l',code:'KeyL',windowsVirtualKeyCode:76});
  await key('Tab','Tab',9);
  assert.equal(await palette(), 'light');
  assert.equal(await evaluate(`localStorage.getItem('sidera-appearance')`), 'light');
  await navigate('/field-notes/alpha/');
  assert.equal(await palette(), 'light');
  assert.deepEqual(await evaluate('window.earlyPalette'), { value: 'light', body: false, state: 'loading' });
  await call('Page.reload'); await delay(300);
  assert.equal(await palette(), 'light');
  await os('dark'); await delay(80); assert.equal(await palette(), 'light', 'Explicit light ignores OS');
  await choose('system'); assert.equal(await palette(), 'dark');
  await os('light'); await delay(80); assert.equal(await palette(), 'light');
  await os('dark'); await delay(80); assert.equal(await palette(), 'dark');
  await navigate('/about/'); assert.equal(await evaluate(`document.querySelector('#appearance').value`), 'system');
  await os('light'); await delay(80); assert.equal(await palette(), 'light');
  await choose('dark'); await os('dark'); await os('light'); await delay(80);
  assert.equal(await palette(), 'dark', 'Explicit dark ignores OS');
  await evaluate(`localStorage.setItem('sidera-appearance', 'invalid')`);
  await navigate('/'); assert.equal(await palette(), 'dark');

  const pages = [ ['overview','/'], ['notebook','/field-notes/'], ['title-list','/lab-notes/'],
    ['article','/field-notes/alpha/'], ['tags','/field-notes/tags/science/'],
    ['blog','/journal/'], ['standalone','/about/'], ['storage','/lab-notes/storage/'] ];
  for (const mode of ['dark','light']) {
    await choose(mode);
    for (const width of [1440, 900, 768, 390, 320]) {
      await viewport(width, width < 900 ? 844 : 960);
      for (const [name,path] of pages) {
        await navigate(path);
        assert.equal(await palette(), mode);
        const geometry = await overflow(`${mode}/${name}@${width}`);
        assert(await evaluate(`document.querySelectorAll('h1').length === 1 && document.querySelectorAll('main').length === 1 && [...document.images].every(i => i.complete && i.naturalWidth > 0)`));
        if (path.startsWith('/field-notes/')) assert.equal(await evaluate(`document.querySelector('.collection-nav [aria-current]').getAttribute('href')`), '/field-notes/');
        if (path.startsWith('/lab-notes/')) assert.equal(await evaluate(`document.querySelector('.collection-nav [aria-current]').getAttribute('href')`), '/lab-notes/');
        if (path === '/about/') assert.equal(await evaluate(`document.querySelectorAll('.collection-nav [aria-current]').length`), 0);
        if ([1440,390].includes(width) && ['notebook','article','tags','standalone','blog'].includes(name)) await screenshot(`${mode}-${name}-${width}`);
        results.push({mode,name,width,...geometry});
      }
    }
    // Contrast on actual palette tokens, including the composited translucent rail.
    const rows = await evaluate(`(() => {
      const s=getComputedStyle(document.documentElement);
      const rgb=n => s.getPropertyValue(n).trim().slice(1).match(/../g).map(h=>parseInt(h,16)/255);
      const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
      const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      const backgrounds=['--canvas','--surface','--surface-hover'].map(n=>[n,rgb(n)]);
      const rail=getComputedStyle(document.querySelector('.sidebar')).backgroundColor.match(/[\\d.]+/g).map(Number);
      backgrounds.push(['rail',rail.slice(0,3).map((v,i)=>v/255*rail[3]+rgb('--canvas')[i]*(1-rail[3]))]);
      return ['--text','--muted','--accent','--pin'].flatMap(fg=>backgrounds.map(([bg,c])=>({fg,bg,ratio:ratio(rgb(fg),c)})));
    })()`);
    assert(rows.every(r=>r.ratio>=4.5), JSON.stringify(rows));
    contrasts.push({mode,rows});
    for (const width of [1440,390,320]) {
      await viewport(width, width < 900 ? 844 : 960);
      await navigate('/_stress/field-notes/reading-sample/');
      await overflow(`${mode}/reading@${width}`);
      assert(await evaluate(`[...document.images].every(i=>i.naturalWidth>0) && document.querySelectorAll('figcaption').length === 1`));
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.prose')).fontSize`), '18px');
      if (width < 900) assert(await evaluate(`[...document.querySelectorAll('pre,table')].filter(e=>e.scrollWidth>e.clientWidth).length >= 2`));
      // Native TOC link activation, actual fragment and scroll destination.
      await evaluate(`document.querySelector('.context-menu').open=true; document.querySelector('[data-toc] a[href="#closing-observations"]').focus()`);
      await key('Enter','Enter',13); await delay(50);
      assert.equal(await evaluate('location.hash'), '#closing-observations');
      assert(await evaluate(`document.querySelector('#closing-observations').getBoundingClientRect().top < innerHeight`));
      if (width !== 320) {
        await evaluate('scrollTo(0,0)'); await screenshot(`${mode}-reading-${width}`);
        await evaluate(`document.querySelector('#reading-at-a-comfortable-pace').scrollIntoView()`); await screenshot(`${mode}-prose-${width}`);
        await evaluate(`document.querySelector('#mixed-language-paragraphs').scrollIntoView()`); await screenshot(`${mode}-cjk-${width}`);
        await evaluate(`document.querySelector('#lists-and-a-deeper-heading').scrollIntoView()`); await screenshot(`${mode}-lists-${width}`);
        await evaluate(`document.querySelector('pre').scrollIntoView()`); await screenshot(`${mode}-code-${width}`);
        await evaluate(`document.querySelector('figure').scrollIntoView()`); await screenshot(`${mode}-figure-${width}`);
      }
      // Native Chromium scroll containers must be keyboard reachable, no widget.
      const scrolling = await evaluate(`(() => {
        const elements=[...document.querySelectorAll('pre,table')].filter(e=>e.scrollWidth>e.clientWidth);
        return elements.map(e=>({tag:e.tagName, overflow:getComputedStyle(e).overflowX, width:e.clientWidth, scroll:e.scrollWidth}));
      })()`);
      const metrics = await evaluate(`(() => {
        const p=document.querySelector('.prose > p:nth-of-type(3)'), text=p.firstChild;
        const countLines=()=>{const lines=new Map(); for(let i=0;i<text.length;i++) { const range=document.createRange(); range.setStart(text,i); range.setEnd(text,i+1);
          const top=range.getBoundingClientRect().top; lines.set(top,(lines.get(top)||0)+1); } return [...lines.values()]; };
        const lineCharacters=countLines(), prose=document.querySelector('.prose');
        prose.style.maxWidth='none'; const uncappedLineCharacters=countLines(); prose.style.maxWidth='';
        const pre=document.querySelector('pre'), color=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number).map(n=>n/255);
        const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
        const bg=lum(color(getComputedStyle(pre).backgroundColor));
        const tokenContrasts=[...pre.querySelectorAll('span')].filter(e=>e.textContent.trim()).map(e=>{
          const fg=lum(color(getComputedStyle(e).color)); return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05); });
        return {proseWidth:document.querySelector('.prose').clientWidth,lineCharacters,uncappedLineCharacters, minCodeContrast:Math.min(...tokenContrasts)};
      })()`);
      assert(metrics.minCodeContrast>=4.5, JSON.stringify(metrics));
      reading.push({mode,width,scrolling,metrics});
    }
    await evaluate(`document.querySelector('.site-menu').open=true; document.querySelector('#appearance').focus()`);
    assert(await evaluate(`document.activeElement.labels[0].textContent === 'Appearance' && getComputedStyle(document.activeElement).outlineWidth === '3px'`));
    // Eight-level tag ancestry/full count; open disclosure must not overflow.
    await viewport(320,844);
    await navigate('/_stress/field-notes/tags/');
    await evaluate(`document.querySelector('.site-menu').open=true`);
    await overflow(`${mode}/deep-tree`);
    await screenshot(`${mode}-deep-tree-320`);
    await navigate('/_stress/field-notes/tags/reading/observations/languages/english/cjk/paragraphs/long-labels/final-level/');
    await overflow(`${mode}/deep-leaf`);
    assert.equal(await evaluate(`document.querySelector('[data-note-count]').dataset.noteCount`), '1');
    await evaluate(`document.querySelector('.page-breadcrumbs a[href$="/long-labels/"]').click()`); await delay(150);
    assert(await evaluate(`location.pathname.endsWith('/long-labels/') && document.querySelector('[data-note-count]').dataset.noteCount === '1'`));
    await evaluate(`document.querySelector('.article-card h2 a').click()`); await delay(150);
    assert.equal(await evaluate(`document.querySelector('article[data-collection]').dataset.collection`), '/_stress/field-notes/');
    // Real skip/disclosure focus behavior is checked in each palette.
    await navigate('/field-notes/'); await key('Tab','Tab',9);
    assert(await evaluate(`document.activeElement.matches('.skip-link') && getComputedStyle(document.activeElement).outlineWidth === '3px'`));
    await key('Enter','Enter',13); assert.equal(await evaluate('document.activeElement.id'),'main');
    await navigate('/field-notes/'); for(let n=0;n<3;n++) await key('Tab','Tab',9);
    assert(await evaluate(`document.activeElement.matches('.site-menu > summary')`));
    await key('Enter','Enter',13); assert(await evaluate(`document.querySelector('.site-menu').open`));
    await key(' ','Space',32); assert.equal(await evaluate(`document.querySelector('.site-menu').open`),false);
    await viewport(1440); await waitFor(() => evaluate(`document.querySelector('.site-menu').open`), 'desktop navigation disclosure');
    // 200% text enlargement, then a 1280px desktop's 200% zoom-equivalent reflow.
    await navigate('/_stress/field-notes/reading-sample/');
    await evaluate(`document.documentElement.style.fontSize='36px'`);
    await overflow(`${mode}/200-percent-text`); await screenshot(`${mode}-text-200`);
    await viewport(640,480); await navigate('/_stress/field-notes/reading-sample/');
    await overflow(`${mode}/200-percent-reflow`);
    await evaluate(`document.querySelector('pre').scrollIntoView()`); await screenshot(`${mode}-reflow-200`);
  }
  // Inspect actual font fallback on the machine, not just a font-family declaration.
  await call('DOM.enable'); await call('CSS.enable');
  const {root} = await call('DOM.getDocument');
  const fonts = {};
  for (const [name,selector] of [['prose','.prose > p'],['cjk','.prose > p:nth-of-type(4)'],['code','pre .c1']]) {
    const {nodeId}=await call('DOM.querySelector',{nodeId:root.nodeId,selector});
    fonts[name]=(await call('CSS.getPlatformFontsForNode',{nodeId})).fonts;
    assert(fonts[name].length > 0 && fonts[name].every(f=>!f.isCustomFont && !/WenKai|Source Code Pro/i.test(f.familyName)), JSON.stringify(fonts));
  }
  // Keyboard-local scrolling: tab naturally into overflowing code/table, arrow right.
  await viewport(390,844); await navigate('/_stress/field-notes/reading-sample/');
  let scrollTargets = new Set();
  for(let n=0;n<100 && scrollTargets.size<2;n++) {
    await key('Tab','Tab',9);
    const tag = await evaluate(`document.activeElement.matches('pre,table') && document.activeElement.scrollWidth > document.activeElement.clientWidth ? document.activeElement.tagName : ''`);
    if(tag) {
      await key('ArrowRight','ArrowRight',39);
      await waitFor(() => evaluate('document.activeElement.scrollLeft > 0'), `keyboard scroll ${tag}`);
      assert(await evaluate('document.activeElement.scrollLeft > 0'), `keyboard scroll ${tag}`);
      scrollTargets.add(tag);
    }
  }
  assert.deepEqual([...scrollTargets].sort(),['PRE','TABLE']);
  // Palette persistence through real pager navigation and subpath hosting.
  await choose('light'); await navigate('/field-notes/');
  await evaluate(`document.querySelector('[data-page-link="next"]').click()`); await delay(200);
  assert.equal(await evaluate(`document.querySelector('[data-page-number]').dataset.pageNumber`),'2');
  assert.equal(await palette(),'light');
  await navigate('/preview/field-notes/alpha/'); assert.equal(await palette(),'light');
  assert(await evaluate(`[...document.querySelectorAll('link[rel="stylesheet"],script[src]')].every(e=>(e.getAttribute('href')||e.getAttribute('src')).startsWith('/preview/'))`));
  // No JS ignores even a stored light choice, hides the control, leaves native nav.
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await navigate('/field-notes/',false);
  assert.equal(await palette(),'dark');
  assert(await evaluate(`document.querySelector('.site-menu').open && getComputedStyle(document.querySelector('.appearance')).display === 'none' && getComputedStyle(document.documentElement).colorScheme === 'dark'`));
  await screenshot('no-js-390');
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  // Denied storage read/getter and writes: working in-page control, reload default.
  let {identifier}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})`});
  await navigate('/'); assert.equal(await palette(),'dark');
  await choose('light'); assert.equal(await palette(),'light');
  await choose('system'); await os('dark'); await delay(60); assert.equal(await palette(),'dark');
  await os('light'); await delay(60); assert.equal(await palette(),'light');
  await navigate('/about/'); assert.equal(await palette(),'dark');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  // Read succeeds but write is denied (e.g. quota/privacy restrictions).
  ({identifier}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}` }));
  await navigate('/'); assert.equal(await palette(),'light');
  await choose('dark'); assert.equal(await palette(),'dark');
  await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(requests.every(url=>url.startsWith(origin+'/')), JSON.stringify(requests.filter(url=>!url.startsWith(origin+'/'))));
  await writeFile(resolve(run,'browser-results.json'),JSON.stringify({browser:version.Browser,node:process.version,
    port,debugPort,isolatedProfile:profile,renderedChecks:results,reading,contrasts,fonts, requests: [...new Set(requests)],
    fallbackSimulation: 'Remove only WenKai/Source Code Pro from production stacks per document; inspect actual platform fonts; HTTPS blocked, all page requests loopback',
    appearance:'dark initial / native keyboard / explicit and system transitions / reload and navigation / invalid stored value / early head application: pass',
    fallbacks:'no JS / denied getter / denied write: pass',navigation:'keyboard skip, focus, disclosure, TOC, scroll containers, deep tags, pager, subpath: pass',
    zoom:'200% root text; 640 CSS px reflow equivalent to 1280 desktop at 200% (not browser UI zoom)', runtimeErrors:errors,
    limits:'Installed Chromium only; no screen-reader, Safari/Firefox, full WCAG or production-rich-content certification'},null,2));
  console.log(`PASS P2-B ${results.length} route/palette/width cases, six reading cases, modes, fallbacks, fonts, navigation and contrast`);
});
