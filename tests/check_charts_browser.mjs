// Isolated local consumer only; uses theme check_charts.py output. No user browser.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
  const {evaluate: e, navigate: n, call, delay, viewport, key} = b;
  const contexts = new Map();
  let failLibrary = false;
  const external = [];
  b.on('Runtime.executionContextCreated', (p, sid) => {
    if (p.context.auxData?.isDefault) contexts.set(`${sid}:${p.context.id}`, {sid, id: p.context.id});
  });
  b.on('Runtime.executionContextDestroyed', (p, sid) => contexts.delete(`${sid}:${p.executionContextId}`));
  b.on('Runtime.executionContextsCleared', (_, sid) => {
    for (const [key, value] of contexts) if (value.sid === sid) contexts.delete(key);
  });
  b.on('Fetch.requestPaused', (p, sid) => {
    if (failLibrary && p.request.url.includes('echarts.common.min.')) return call('Fetch.failRequest', {requestId:p.requestId,errorReason:'Failed'}, sid);
    if (p.request.url.startsWith(b.origin + '/')) return call('Fetch.continueRequest', {requestId:p.requestId}, sid);
    external.push(p.request.url);
    return call('Fetch.failRequest', {requestId:p.requestId,errorReason:'BlockedByClient'}, sid);
  });
  b.on('Target.attachedToTarget', async p => {
    await call('Runtime.enable', {}, p.sessionId);
    await call('Network.enable', {}, p.sessionId);
    await call('Fetch.enable', {patterns:[{urlPattern:'http*'}]}, p.sessionId);
    await call('Runtime.runIfWaitingForDebugger', {}, p.sessionId);
  });
  await call('Fetch.enable', {patterns:[{urlPattern:'http*'}]});
  await call('Target.setAutoAttach', {autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
  const wait = async expression => {
    for (let i=0;i<360;i++) { if (await e(expression)) return; await delay(50); }
    assert.fail('Timeout: '+expression+' '+JSON.stringify(await e(`[...document.querySelectorAll('[data-sidera-chart]')].map(f=>({id:f.id,state:f.dataset.state,fold:f.closest('details.content-folding')?.open,w:f.getBoundingClientRect().width,y:f.getBoundingClientRect().y}))`)));
  };
  const render = async id => {
    await e(`document.getElementById(${JSON.stringify(id)}).scrollIntoView({behavior:'instant',block:'center'})`);
    await wait(`document.getElementById(${JSON.stringify(id)}).dataset.state==='ready'`);
  };
  const settleFrame = () => e(`(async()=>{let previous,stable=0;for(let i=0;i<40;i++){const r=document.querySelector('#inline iframe').getBoundingClientRect();const next=[r.x,r.y,r.width,r.height];stable=previous&&next.every((v,k)=>Math.abs(v-previous[k])<.1)?stable+1:0;if(stable>=3)return;previous=next;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Chart layout did not settle')})()`);
  async function frame(title, expression) {
    for (const {sid,id} of contexts.values()) {
      try {
        const r = await call('Runtime.evaluate', {contextId:id,returnByValue:true,awaitPromise:true,
          expression:`document.title===${JSON.stringify(title)} && window.echarts ? ({found:true,value:(()=>{const chart=echarts.getInstanceByDom(document.getElementById('chart'));return (${expression})})()}) : null`}, sid);
        if (r.exceptionDetails) assert.fail(JSON.stringify(r.exceptionDetails));
        if (r.result.value?.found) return r.result.value.value;
      } catch (err) {
        if (/Cannot find context|Session with given id|Inspected target navigated/.test(String(err))) continue;
        throw err;
      }
    }
    assert.fail('No chart context: '+title+' '+JSON.stringify([...contexts.values()]));
  }
  await viewport(1100,850);
  await n('/late/');
  assert.equal(await e(`document.querySelector('[data-sidera-chart]').dataset.state`), 'idle');
  assert(!b.requests.some(url=>url.includes('/vendor/echarts-')));
  await e(`document.querySelector('[data-sidera-chart]').scrollIntoView({behavior:'instant',block:'center'})`);
  await wait(`document.querySelector('[data-sidera-chart]').dataset.state==='ready'`);
  for (const [prefix, width, palette] of [['',1100,'light'],['/sidera-showcase',390,'dark'],['/_chinese',390,'dark'],['/_icons',390,'light']]) {
    await viewport(width,850); await n(prefix+'/charts/');
    await e(`Sidera.setColorMode('${palette}')`); await render('inline');
    assert.equal(await e(`document.querySelector('#inline iframe').getAttribute('sandbox')`),'allow-scripts');
    assert.equal(await e(`document.querySelector('#inline iframe').contentDocument`),null);
    assert(await frame('Sales <&> target', `document.querySelectorAll('svg path').length>0 && chart.getZr().painter.getType()==='svg'`));
    assert.equal(await frame('Sales <&> target', `chart.getOption().tooltip[0].renderMode`),'richText');
    await delay(100);
    assert.equal(await frame('Sales <&> target', `document.documentElement.style.colorScheme`),palette);
    assert(!await e(`document.querySelector('.chart-controls,.chart-legend,.chart-reset,.chart-table,.chart-description')`));
    // Real pointer input on the chart's own SVG legend; no duplicate HTML buttons.
    const toggleLegend = async () => {
      await render('inline'); await settleFrame();
      const point = await frame('Sales <&> target', `(()=>{const node=[...document.querySelectorAll('svg text')].find(n=>n.textContent==='Sales');const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      const rect = await e(`(()=>{const r=document.querySelector('#inline iframe').getBoundingClientRect();return {x:r.x,y:r.y}})()`);
      const position={x:rect.x+point.x,y:rect.y+point.y,button:'left',clickCount:1};
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:position.x,y:position.y});
      await delay(60);
      await call('Input.dispatchMouseEvent',{type:'mousePressed',...position});
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',...position});
      await delay(120);
    };
    await toggleLegend();
    assert.equal(await frame('Sales <&> target', `chart.getOption().legend[0].selected.Sales`),false);
    await toggleLegend();
    assert.equal(await frame('Sales <&> target', `chart.getOption().legend[0].selected.Sales`),true);
    await frame('Sales <&> target', `(chart.dispatchAction({type:'dataZoom',start:0,end:100}),true)`);
    // Shared diagram toolbar: hidden at rest, visible on hover or keyboard focus.
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    await e(`document.activeElement?.blur()`); await delay(200);
    assert.equal(await e(`getComputedStyle(document.querySelector('#inline .chart-tools')).opacity`),'0');
    await render('inline'); await settleFrame();
    const hover = await e(`(()=>{const r=document.querySelector('#inline .chart-view').getBoundingClientRect();return {x:r.x+5,y:r.y+5}})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...hover}); await delay(200);
    assert.equal(await e(`getComputedStyle(document.querySelector('#inline .chart-tools')).opacity`),'1');
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    // Source disclosure is keyboard accessible, initially collapsed after render.
    assert(!await e(`document.querySelector('#inline .chart-source').open`));
    await e(`document.querySelector('#inline [data-chart-action="source"]').focus()`); await key('Enter','Enter',13);
    assert(await e(`document.querySelector('#inline .chart-source').open`));
    assert.equal(await e(`document.querySelector('#inline [data-chart-action="source"]').getAttribute('aria-expanded')`),'true');
    await delay(200);
    assert.equal(await e(`getComputedStyle(document.querySelector('#inline .chart-tools')).opacity`),'1');
    await key('Enter','Enter',13);
    assert(!await e(`document.querySelector('#inline .chart-source').open`));
    const download = await e(`(async()=>{const a=document.querySelector('#data-file .chart-download');const r=await fetch(a.href);return {ok:r.ok,filename:a.download,same:(await r.text())===document.querySelector('#data-file .chart-source code').textContent}})()`);
    assert.deepEqual(download,{ok:true,filename:'chart.json',same:true});
    // Tooltip is painted in SVG and never inserted as author HTML.
    await frame('Sales <&> target', `(chart.dispatchAction({type:'showTip',seriesIndex:0,dataIndex:1}),true)`);
    await delay(150);
    assert(await frame('Sales <&> target', `document.querySelector('svg').textContent.includes('18')`));
    assert(!await frame('Sales <&> target', `!!document.querySelector('#chart>div[style*="position: absolute"]')`));
    await frame('Sales <&> target', `(chart.dispatchAction({type:'hideTip'}),true)`);
    if (!prefix) {
      await render('inline'); await settleFrame();
      const pixel = await frame('Sales <&> target', `chart.convertToPixel({seriesIndex:0},[1,18])`);
      const rect = await e(`(()=>{const r=document.querySelector('#inline iframe').getBoundingClientRect();return {x:r.x,y:r.y}})()`);
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:rect.x+pixel[0],y:rect.y+pixel[1]+2});
      await delay(250);
      assert(await frame('Sales <&> target', `document.querySelector('svg').textContent.includes('18')`));
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
    }
    // Rendering all forms, hidden nested shortcode/fence and fixed inversion.
    for (const id of ['paired','file','data-fence','data-file','scatter','multi']) await render(id);
    assert.equal(await e(`document.getElementById('nested').dataset.state`),'idle');
    await e(`document.querySelector('.content-folding>summary').focus()`); await key('Enter','Enter',13);
    await wait(`document.querySelector('.content-folding').open`);
    await render('nested'); await render('nested-fence');
    assert.equal(await frame('Inverted chart', `document.documentElement.style.colorScheme`),'light');
    assert(await e('document.documentElement.scrollWidth<=innerWidth'));
    if(prefix==='/_chinese') assert(await e(`document.querySelector('#inline .chart-status').textContent.includes('图表已就绪')`));
    await render('inline'); await b.screenshot(prefix===''?'charts-light':prefix==='/_chinese'?'charts-chinese':prefix==='/_icons'?'charts-text-controls':'charts-mobile-dark');
  }
  // Palette and reduced-motion updates must preserve user zoom/legend selections.
  await viewport(1100,850); await n('/charts/'); await render('inline');
  await e(`Sidera.setColorMode('light')`); await delay(150);
  await frame('Sales <&> target', `(chart.dispatchAction({type:'legendToggleSelect',name:'Sales'}),chart.dispatchAction({type:'dataZoom',start:20,end:70}),true)`);
  await e(`Sidera.setColorMode('dark')`); await delay(250);
  assert.equal(await frame('Sales <&> target', `chart.getOption().legend[0].selected.Sales`),false);
  assert.equal(await frame('Sales <&> target', `chart.getOption().dataZoom[0].start`),20);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]}); await delay(150);
  assert.equal(await frame('Sales <&> target', `chart.getOption().animation`),false);
  assert(await frame('Sales <&> target', `chart.getOption().series.every(s=>s.animation===false)`));
  await viewport(320,850); await delay(100);
  assert(await e('document.documentElement.scrollWidth<=innerWidth'));
  assert(await frame('Sales <&> target', `Math.abs(chart.getWidth()-document.getElementById('chart').clientWidth)<=1`));
  await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await delay(150);
  assert(await e(`matchMedia('(pointer:coarse)').matches`));
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});
  await e(`document.activeElement?.blur()`); await delay(200);
  assert.equal(await e(`getComputedStyle(document.querySelector('#inline .chart-tools')).opacity`),'1');
  assert(await e(`document.querySelector('#inline [data-chart-action="source"]').getBoundingClientRect().height>=44`));
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  // Forged host messages cannot impersonate the sandbox renderer.
  await e(`window.postMessage({type:'chart-error'},'*')`); await delay(60);
  assert.equal(await e(`document.getElementById('inline').dataset.state`),'ready');
  for(const route of ['host-content','host-summary']) { await n('/'+route+'/');await render('inline'); }
  for(const route of ['plain','code','host-plain']) {
    const before=b.requests.length;await n('/'+route+'/');
    assert(!await e(`document.querySelector('[data-sidera-charts-script],.chart-frame')`));
    assert(!b.requests.slice(before).some(url=>url.includes('/vendor/echarts-')));
  }
  await n('/security/');
  await wait(`document.querySelector('[data-sidera-chart]').dataset.state==='ready'`);
  assert(!await frame('Safe labels', `!!document.querySelector('img,[onerror]')`));
  await frame('Safe labels', `(chart.dispatchAction({type:'showTip',seriesIndex:0,dataIndex:1}),true)`);
  await delay(100);
  assert(!await frame('Safe labels', `!!document.querySelector('#chart script,#chart img')`));
  await n('/failure/');
  await wait(`document.getElementById('broken').dataset.state==='error'`);
  await render('healthy');
  assert(await e(`document.querySelector('#broken .chart-source').open`));
  failLibrary=true; await n('/charts/');
  await wait(`document.getElementById('inline').dataset.state==='error'`);
  assert(await e(`document.querySelector('#inline .chart-source').open && !document.querySelector('#inline iframe')`));
  failLibrary=false;
  await call('Emulation.setScriptExecutionDisabled',{value:true}); await n('/charts/',false);
  assert(await e(`[...document.querySelectorAll('.chart-source')].every(d=>d.open)`));
  assert(await e(`document.querySelectorAll('.chart-download[download]').length===9 && document.querySelectorAll('.chart-source code').length===9 && !document.querySelector('.chart-frame')`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.deepEqual(external,[]);
  assert.deepEqual(b.errors,[]);
  console.log('PASS interactive charts: all authoring forms, EN/ZH, project prefix, lazy/fold/grid, SVG tooltips, native legends, keyboard source disclosure/downloads, palette/motion/state/resize, no-JS/failure, opaque frames and no external requests');
},{'/sidera-showcase':'subpath-public','/_chinese':'chinese-public','/_icons':'icons-off-public'});
