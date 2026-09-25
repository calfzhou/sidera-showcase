// P2-C: actual single-language and bilingual output, same isolated CDP lifecycle.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runBrowser } from './browser.mjs';

await runBrowser(async ({ run, port, debugPort, profile, origin, version, errors, requests,
  call, evaluate, navigate, viewport, key, screenshot, delay }) => {
  const results = [];
  const palette = () => evaluate(`getComputedStyle(document.documentElement).colorScheme`);
  const choose = value => evaluate(`Sidera.setColorMode(${JSON.stringify(value)})`);
  const os = async value => {
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value}]});
    for(let n=0;n<80;n++) {
      if(await evaluate(`matchMedia('(prefers-color-scheme: light)').matches === ${value==='light'} && (document.documentElement.dataset.colorMode !== 'auto' || document.documentElement.dataset.colorScheme === ${JSON.stringify(value)})`)) return;
      await delay(25);
    }
    assert.fail('Native media/appearance state did not settle');
  };
  const pages = [['overview','/'],['article','/field-notes/alpha/'],['list','/field-notes/'],
    ['tag','/field-notes/tags/science/'],['blog','/journal/'],['standalone','/about/']];
  for (const lang of ['en','zh']) {
    const prefix = lang === 'zh' ? '/_chinese' : '';
    const labels = lang === 'zh' ? ['配色模式','深色','浅色','跟随系统','跳至正文','网站导航'] : ['Color mode','Dark','Light','Auto (system)','Skip to content','Site navigation'];
    await viewport(1440); await navigate(prefix+'/');
    await evaluate(`localStorage.removeItem('sidera-appearance')`); await os('light'); await navigate(prefix+'/');
    assert.equal(await palette(),'light');
    assert.equal(await evaluate('document.documentElement.dataset.colorMode'),'auto');
    // Real keyboard cycle: auto -> dark -> light; the action label is localized.
    await evaluate(`document.querySelector('[data-color-mode-cycle]').focus()`);
    await key('Enter','Enter',13);assert.equal(await palette(),'dark');
    await key('Enter','Enter',13);assert.equal(await palette(),'light');
    await navigate(prefix+'/about/'); assert.equal(await palette(),'light');
    await os('dark'); assert.equal(await palette(),'light');
    await choose('auto'); assert.equal(await palette(),'dark');
    await os('light'); await delay(80); assert.equal(await palette(),'light');
    for (const mode of ['dark','light']) {
      await choose(mode);
      for (const width of [1440,390,320]) {
        await viewport(width,width<900?844:960);
        for (const [name,path] of pages) {
          await navigate(prefix+path);
          const state = await evaluate(`({lang:document.documentElement.lang,
            label:document.querySelector('[data-color-mode-cycle]').getAttribute('aria-label'),
            skip:document.querySelector('.skip-link').textContent,
            nav:document.querySelector('.sidebar').getAttribute('aria-label'),
            width:innerWidth,scroll:document.documentElement.scrollWidth,
            headings:document.querySelectorAll('h1').length,
            images:[...document.images].every(i=>i.complete && i.naturalWidth>0),
            dates:[...document.querySelectorAll('.article-dates time,.card-dates time')].map(t=>t.textContent),
            ui:[...document.querySelectorAll('.list-meta,.pin-label,.recent-panel>.section-heading,.recent-panel>.muted,[data-page-number],.site-footer')].map(e=>e.textContent).join(' ')})`);
          assert.equal(state.lang,lang==='zh'?'zh-CN':'en-US');
          assert(state.label.includes(labels[0])&&state.label.includes(mode==='dark'?labels[1]:labels[2]));
          assert.deepEqual([state.skip,state.nav],labels.slice(4));
          assert.equal(await palette(),mode); assert(state.scroll<=width+1,JSON.stringify(state));
          assert.equal(state.headings,1); assert(state.images);
          if (['list','tag','blog'].includes(name)) {
            assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-page-number]')).display`),'flex');
            assert(await evaluate(`[...document.querySelectorAll('[data-page-link]')].every(a=>parseFloat(getComputedStyle(a).paddingTop)>0 && getComputedStyle(a.closest('.pagination')).backgroundColor !== 'rgba(0, 0, 0, 0)')`));
          }
          if(lang==='zh') {
            assert(!/Published|Modified|Updated|articles|Pins first|Page \d|Built with|Recently updated/.test(state.ui+state.dates.join(' ')),state.ui);
            assert(state.dates.every(t=>/^(发表于|修改于|更新于) \d+年\d+月\d+日$/.test(t)),state.dates);
          }
          if (name==='article') assert.equal(await evaluate(`document.querySelector('article').dataset.collection`),prefix+'/field-notes/');
          if (width!==320 && ['article','list','tag','standalone'].includes(name)) await screenshot(`${lang}-${mode}-${name}-${width}`);
          results.push({lang,mode,width,name,scroll:state.scroll});
        }
      }
      // Real keyboard skip/disclosure and visible focus for each language/palette.
      await navigate(prefix+'/field-notes/'); await key('Tab','Tab',9);
      assert(await evaluate(`document.activeElement.matches('.skip-link') && getComputedStyle(document.activeElement).outlineWidth==='3px'`));
      await key('Enter','Enter',13); assert.equal(await evaluate('document.activeElement.id'),'main');
      await navigate(prefix+'/field-notes/'); await evaluate(`document.querySelector('[data-region="left"]').focus()`);
      assert(await evaluate(`document.activeElement.matches('[data-region="left"]')`));
      await key('Enter','Enter',13); await delay(80); assert(await evaluate(`document.querySelector('#left-region').matches(':popover-open')`));
      for(let n=0;n<100 && !await evaluate(`document.activeElement.matches('[data-color-mode-cycle]')`);n++) await key('Tab','Tab',9);
      assert(await evaluate(`document.activeElement.matches('[data-color-mode-cycle]')`));
      assert((await evaluate(`document.activeElement.getAttribute('aria-label')`)).includes(labels[0]));
      const tree = await call('Accessibility.getFullAXTree');
      assert(tree.nodes.some(n=>n.role?.value==='button' && n.name?.value.includes(labels[0])));
      await screenshot(`${lang}-${mode}-navigation-320`);
      await evaluate(`document.querySelector('[data-page-link="next"]').click()`); await delay(200);
      assert.equal(await evaluate('location.pathname'),prefix+'/field-notes/page/2/');
      assert.equal(await palette(),mode);
    }
    // Both localized fallbacks, not merely inherited English evidence.
    await choose('light');
    await call('Emulation.setScriptExecutionDisabled',{value:true});
    await navigate(prefix+'/field-notes/',false);
    assert.equal(await palette(),'light');
    assert(await evaluate(`document.querySelector('.site-menu').open && [...document.querySelectorAll('[data-color-mode-cycle]')].every(b=>b.hidden)`));
    assert.equal(await evaluate(`document.querySelector('.skip-link').textContent`),labels[4]);
    await call('Emulation.setScriptExecutionDisabled',{value:false});
    let {identifier}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})`});
    await navigate(prefix+'/'); assert.equal(await palette(),'light');
    await choose('dark'); assert.equal(await palette(),'dark');
    await navigate(prefix+'/about/'); assert.equal(await palette(),'light');
    await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
    ({identifier}=await call('Page.addScriptToEvaluateOnNewDocument',{source:`Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError')}`}));
    await navigate(prefix+'/'); await choose('dark'); assert.equal(await palette(),'dark');
    await call('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  }
  // A bilingual site has DIFFERENT memberships under one host and base subpath.
  for (const mode of ['dark','light']) {
    await choose(mode);
    for(const width of [1440,320]) {
      await viewport(width,width<900?844:960);
      await navigate('/preview/zh/field-notes/alpha/');
      assert.equal(await evaluate(`document.querySelector('[id^="toc-heading-"]').textContent`),'本页目录');
      await evaluate(`document.querySelector('#right-region[popover]')?.showPopover()`);
      const ax = await call('Accessibility.getFullAXTree');
      assert(ax.nodes.some(n=>n.role?.value==='navigation' && n.name?.value==='本页目录'));
      await evaluate(`document.querySelector('#right-region[popover]')?.showPopover(); document.querySelector('[data-toc] a').focus()`); await key('Enter','Enter',13);
      assert.equal(await evaluate('location.hash'),'#reading');
      await screenshot(`bilingual-article-${mode}-${width}`);
      await navigate('/preview/zh/field-notes/tags/');
      assert.equal(await evaluate(`document.querySelector('h1').textContent`),'标签');
      assert.equal(await evaluate(`document.querySelector('[data-note-count]').dataset.noteCount`),'2');
      await evaluate(`document.querySelector('#left-region[popover]')?.showPopover()`);
      assert(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1 && !document.querySelector('img[src="x"]')`));
      await screenshot(`bilingual-${mode}-${width}`);
      await navigate('/preview/field-notes/tags/');
      assert.equal(await evaluate(`document.querySelector('[data-note-count]').dataset.noteCount`),'5');
      assert.equal(await evaluate(`document.querySelector('h1').textContent`),'Tags');
    }
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert(requests.every(u=>u.startsWith(origin+'/')),JSON.stringify(requests));
  await writeFile(resolve(run,'browser-results.json'),JSON.stringify({browser:version.Browser,node:process.version,
    port,debugPort,profile,renderedChecks:results,bilingualCases:4,runtimeErrors:errors,
    verified:'Both locales/palettes: labels + AX button, native keyboard cycle, skip/focus/disclosure/pager, persistence/Auto, no JS/denied storage, wrapping, dates; bilingual tag counts/subpath/escaping',
    limits:'Installed Chromium only; not full cross-browser/screen-reader/WCAG certification'},null,2));
  console.log(`PASS P2-C ${results.length} localized route/palette/width cases + 4 bilingual cases; keyboard, AX, modes and fallbacks`);
});
