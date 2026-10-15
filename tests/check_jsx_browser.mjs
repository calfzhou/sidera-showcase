// Production showcase only; owned local Chrome and HTTP server, no external services.
import assert from 'node:assert/strict';
import { runBrowser } from './browser.mjs';
const prefix = '/sidera-showcase';
await runBrowser(async b => {
  const { evaluate: e, navigate: n, call, delay, viewport, key } = b;
  const contexts = new Map();
  b.on('Runtime.executionContextCreated', (p, sid) => {
    if (p.context.auxData?.isDefault) contexts.set(`${sid}:${p.context.id}`, {sid, id:p.context.id});
  });
  b.on('Runtime.executionContextDestroyed', (p, sid) => contexts.delete(`${sid}:${p.executionContextId}`));
  b.on('Runtime.executionContextsCleared', (_, sid) => {
    for (const [key, value] of contexts) if (value.sid === sid) contexts.delete(key);
  });
  b.on('Target.detachedFromTarget', p => {
    for (const [key, value] of contexts) if (value.sid === p.sessionId) contexts.delete(key);
  });
  b.on('Target.attachedToTarget', async p => {
    await call('Runtime.enable', {}, p.sessionId);
    await call('Network.enable', {}, p.sessionId);
    await call('Network.setBlockedURLs', {urls:['https://*']}, p.sessionId);
    await call('Runtime.runIfWaitingForDebugger', {}, p.sessionId);
  });
  await call('Target.setAutoAttach', {autoAttach:true,waitForDebuggerOnStart:true,flatten:true});
  const wait = async expression => {
    for(let i=0;i<160;i++){ if(await e(expression)) return; await delay(50); }
    console.error('Runtime errors',JSON.stringify(b.errors)); console.error('Requests',b.requests.filter(u=>u.includes('jsx'))); assert.fail(expression + '\n' + JSON.stringify(await e(`({errors:[...document.querySelectorAll('.jsx-status')].map(n=>n.textContent),states:[...document.querySelectorAll('[data-sidera-jsx]')].map(n=>n.dataset.state)})`)));
  };
  const widget = i => `document.querySelectorAll('[data-sidera-jsx]')[${i}]`;
  const render = async i => {
    await e(`${widget(i)}.scrollIntoView({block:'center',behavior:'instant'})`);
    await wait(`${widget(i)}.dataset.state==='ready'`);
  };
  const appearance = async (index, kind, title, caption) => {
    assert.equal(await e(`${widget(index)}.dataset.appearance`),kind);
    assert(await e(`(()=>{
      const figure=${widget(index)}, style=getComputedStyle(figure);
      const title=figure.querySelector(':scope > .jsx-title'), caption=figure.querySelector(':scope > figcaption');
      const root=figure.querySelector('.jsx-root').getBoundingClientRect();
      if(!!title!==${title} || !!caption!==${caption}) return false;
      if(title && (title.tagName!=='DIV' || title.id || title.getBoundingClientRect().bottom>root.top+1)) return false;
      if(caption && (figure.lastElementChild!==caption || caption.getBoundingClientRect().top<root.bottom-1 || getComputedStyle(caption).textAlign!=='center')) return false;
      const plain=${JSON.stringify(kind)}==='plain';
      return ['Top','Right','Bottom','Left'].every(side=>plain
        ? style['padding'+side]==='0px' && style['border'+side+'Width']==='0px'
        : parseFloat(style['padding'+side])>0 && style['border'+side+'Width']==='1px')
        && (plain ? style.backgroundColor==='rgba(0, 0, 0, 0)' : style.backgroundColor!=='rgba(0, 0, 0, 0)');
    })()`));
  };
  await viewport(1280,900); await n(prefix+'/handbook/reference/jsx/');
  await render(0);await appearance(0,'plain',true,true);
  await e(`${widget(0)}.querySelector('button').focus()`);await key('Enter','Enter',13);
  await wait(`${widget(0)}.querySelector('output').textContent==='1'`);
  await render(1);
  const text='你好，Sidera 👋';
  await e(`(()=>{const input=${widget(1)}.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(text)}); input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await e(`${widget(1)}.querySelector('button').click()`);
  await wait(`${widget(1)}.querySelector('output').textContent===${JSON.stringify(Buffer.from(text).toString('base64'))}`);
  assert.equal(await e(`getComputedStyle(${widget(1)}.querySelector('output')).minHeight`),'63px');
  await render(2);await e(`${widget(2)}.querySelector('button').click()`);
  await wait(`document.documentElement.dataset.colorMode==='light' && ${widget(2)}.querySelector('strong').textContent==='light'`);
  await e(`Sidera.setColorMode('dark')`);
  await wait(`${widget(2)}.querySelector('strong').textContent==='dark'`);
  await render(3);await appearance(3,'card',true,true);await e(`${widget(3)}.querySelector('button').click()`);
  await wait(`${widget(3)}.querySelector('output').textContent==='7'`);
  assert.equal(await e(`${widget(4)}.dataset.state`),'idle');
  await e(`document.querySelector('.content-folding>summary').click()`);await render(4);
  assert.equal(await e(`${widget(4)}.querySelector('output').textContent`),'6');
  await appearance(4,'plain',true,false);
  const ids=await e(`[...document.querySelectorAll('.jsx-root [id]')].map(el=>el.id)`);
  assert.equal(new Set(ids).size,ids.length);
  await render(5);
  assert.equal(await e(`${widget(5)}.querySelector('iframe').getAttribute('sandbox')`),'allow-scripts');
  assert.equal(await e(`${widget(5)}.querySelector('iframe').contentDocument`),null);
  assert.equal(await e(`${widget(5)}.querySelector('iframe').title`),'Isolated estimate');
  await appearance(5,'plain',true,true);
  const frameEval = async expression => {
    for(const {sid,id} of contexts.values()) {
      const r=await call('Runtime.evaluate',{contextId:id,returnByValue:true,awaitPromise:true,
        expression:`location.pathname.includes('/jsx/frames/') ? ({found:true,value:(()=>{return (${expression});})()}) : null`},sid);
      if(r.result?.value?.found){assert(!r.exceptionDetails);return r.result.value.value;}
    }
    assert.fail('Sandbox context missing');
  };
  assert.equal(await frameEval(`document.querySelector('output').textContent`),'6');
  await frameEval(`(document.querySelector('button').click(),true)`);await delay(150);
  assert.equal(await frameEval(`document.querySelector('output').textContent`),'7');
  assert(await frameEval(`(()=>{try{parent.document.body;return false}catch{return true}})()`));
  assert(await frameEval(`(()=>{try{localStorage.getItem('test');return false}catch{return true}})()`));
  await e(`Sidera.setColorMode('light')`);await delay(150);
  assert.equal(await frameEval(`document.documentElement.dataset.colorScheme`),'light');
  await e(`window.postMessage({type:'sidera-jsx-error'},'*')`);await delay(100);
  assert.equal(await e(`${widget(5)}.dataset.state`),'ready');
  for (const tone of ['light','dark']) {
    await e(`Sidera.setColorMode('${tone}')`);await viewport(1280,900);await render(1);
    await appearance(1,'plain',true,true);
    await b.screenshot(`jsx-${tone}-desktop`);
    await viewport(390,844);await render(1);
    assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
    await appearance(1,'plain',true,true);
    await b.screenshot(`jsx-${tone}-mobile`);
    await render(3);await appearance(3,'card',true,true);
    await b.screenshot(`jsx-card-${tone}-mobile`);
  }
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert.equal(new Set(b.requests.filter(u=>u.includes('/jsx/react-runtime.'))).size,1);
  assert(b.requests.filter(u=>u.startsWith(b.origin+'/')).every(u=>new URL(u).pathname.startsWith(prefix+'/')));
  // Compiler/controller-free pages do not load React.
  const before=b.requests.length;await n(prefix+'/notes/reading-list/');
  assert(!b.requests.slice(before).some(u=>u.includes('/jsx/')));
  await call('Emulation.setScriptExecutionDisabled',{value:true});await n(prefix+'/handbook/reference/jsx/',false);
  assert(await e(`[...document.querySelectorAll('.jsx-fallback')].every(n=>!n.hidden) && [...document.querySelectorAll('.jsx-root')].every(n=>n.hidden)`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  await call('Network.setBlockedURLs',{urls:['https://*','*/jsx/components/*']});
  await n(prefix+'/handbook/reference/jsx/');
  await e(`${widget(0)}.scrollIntoView({block:'center',behavior:'instant'})`);
  await wait(`${widget(0)}.dataset.state==='error'`);
  assert(await e(`!document.querySelector('.jsx-source') && !${widget(0)}.querySelector('.jsx-fallback').hidden`));
  if (process.argv[3]) {
    await call('Network.setBlockedURLs',{urls:['https://*']});
    await viewport(1280,1200);await n('/styling/');
    await render(0);await render(1);
    await appearance(0,'plain',true,true);await appearance(1,'card',true,true);
    assert.equal(await e(`${widget(1)}.querySelector('iframe').title`),'Native frame defaults');
    assert.equal(await e(`${widget(0)}.dataset.css`),'');
    assert.equal(await e(`${widget(1)}.dataset.css`),'');
    const probeStyles = `(()=>{
      const root=document.querySelector('.style-probe');
      const style=selector=>getComputedStyle(root.querySelector(selector));
      return {field:style('.jsx-field').display, fieldGap:style('.jsx-field').gap,
        stackGap:getComputedStyle(root).gap, result:style('.jsx-result').display,
        border:style('.jsx-result').borderInlineStartWidth,
        noteColor:style('.jsx-note').color, noteMargin:style('p.jsx-note').marginBlock,
        errorColor:style('.jsx-error').color, errorDisplay:style('.jsx-error').display,
        invalidBorder:style('input').borderColor, radius:style('input').borderRadius,
        disabled:style('button:disabled').opacity, checkboxWidth:parseFloat(style('input[type="checkbox"]').width),
        radioWidth:parseFloat(style('input[type="radio"]').width)};
    })()`;
    let native=await e(probeStyles);
    assert.equal(native.field,'grid');assert.equal(native.result,'grid');
    assert(parseFloat(native.fieldGap)<parseFloat(native.stackGap));
    assert.equal(native.border,'3px');assert.equal(native.radius,'7px');
    assert.equal(native.noteMargin,'0px');assert.equal(native.disabled,'0.5');
    assert.equal(native.errorDisplay,'none');
    assert(native.checkboxWidth<30 && native.radioWidth<30);
    await e(`${widget(0)}.querySelector('button').focus()`);await key('Enter','Enter',13);
    await wait(`${widget(0)}.querySelector('.jsx-error').textContent!==''`);
    assert.equal(await e(`getComputedStyle(${widget(0)}.querySelector('button')).outlineWidth`),'3px');
    await frameEval(`(document.querySelector('button').click(),true)`);await delay(150);
    // An author override remains local and can beat the shared defaults.
    await render(2);await appearance(2,'card',true,false);
    assert.equal(await e(`getComputedStyle(${widget(2)}.querySelector('.jsx-result')).borderInlineStartWidth`),'7px');
    assert.equal(await e(`getComputedStyle(${widget(0)}.querySelector('.jsx-result')).borderInlineStartWidth`),'3px');
    assert(await e(`parseFloat(getComputedStyle([...document.querySelectorAll('p')].find(p=>p.textContent==='Ordinary paragraph outside the widgets.')).marginBottom)>0`));
    await e(`document.documentElement.style.setProperty('--pin','#c0392b')`);
    for(const tone of ['light','dark']) {
      await e(`Sidera.setColorMode('${tone}')`);await delay(150);
      native=await e(probeStyles);
      assert.notEqual(native.errorDisplay,'none');
      assert.equal(native.errorColor,'rgb(192, 57, 43)');
      assert.equal(native.invalidBorder,native.errorColor);
      assert.deepEqual(await frameEval(probeStyles),native,'Shared page/frame styles and custom theme tokens');
      assert.notEqual(await e(`getComputedStyle(${widget(2)}.querySelector('.jsx-note')).color`),native.noteColor);
      await viewport(390,844);await render(0);
      assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
      await b.screenshot(`jsx-native-styles-${tone}-mobile`);
    }
    await viewport(1280,1200);await n('/layouts/');
    await render(0);await render(1);
    const layoutMetrics = `(()=>{
      const root=document.querySelector('.layout-probe');
      const metrics=node=>{const css=getComputedStyle(node);return [css.display,css.gap,css.alignItems,css.flexWrap]};
      const pairs=[...root.querySelectorAll('[data-gap-case]')].map(group=>{
        const stack=group.querySelector('[data-layout="stack"]'), row=group.querySelector('[data-layout="row"]');
        return {gap:group.dataset.gapCase,stack:metrics(stack),row:metrics(row),
          nativeStack:metrics(group.querySelector('[data-native="stack"]')),
          nativeRow:metrics(group.querySelector('[data-native="row"]')),
          wrapped:row.children[1].getBoundingClientRect().top>row.children[0].getBoundingClientRect().top,
          nativeElements:stack.tagName==='DIV' && row.tagName==='DIV' && row.children[0].tagName==='BUTTON',
          clean:!stack.hasAttribute('gap') && !row.hasAttribute('gap') && !stack.hasAttribute('role') && !row.hasAttribute('style')};
      });
      const actions=root.querySelector('[data-events]');
      return {pairs,rootTag:root.tagName,rootRole:root.getAttribute('role'),rootId:root.id,
        role:actions.getAttribute('role'),label:actions.getAttribute('aria-label'),
        customClass:actions.classList.contains('custom-layout'),gap:getComputedStyle(actions).gap,
        justify:getComputedStyle(actions).justifyContent};
    })()`;
    const checkLayouts = (values,mobile) => {
      assert.equal(values.rootTag,'DIV');assert.equal(values.rootRole,null);assert(values.rootId);
      assert.equal(values.role,'group');assert.equal(values.label,'Layout actions');
      assert(values.customClass);assert.equal(values.gap,'7px');assert.equal(values.justify,'flex-end');
      assert.equal(values.pairs.length,4);
      for(const pair of values.pairs) {
        assert.deepEqual(pair.stack,pair.nativeStack);assert.deepEqual(pair.row,pair.nativeRow);
        assert.equal(pair.stack[0],'grid');assert.equal(pair.row[0],'flex');assert.equal(pair.row[3],'wrap');
        assert(pair.nativeElements && pair.clean);
        if(mobile) assert(pair.wrapped);
      }
      const gaps=values.pairs.map(pair=>parseFloat(pair.stack[1]));
      assert.equal(gaps[0],0);assert(gaps[1]>0 && gaps[1]<gaps[2] && gaps[2]<gaps[3]);
    };
    for(const width of [1280,390]) {
      await viewport(width,900);await render(0);await render(1);
      checkLayouts(await e(layoutMetrics),width===390);
      checkLayouts(await frameEval(layoutMetrics),width===390);
      assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
    }
    await e(`${widget(0)}.querySelector('[data-events] button').focus()`);await key('Enter','Enter',13);
    await wait(`${widget(0)}.querySelector('output').textContent==='1'`);
    await frameEval(`(document.querySelector('[data-events] button').click(),true)`);await delay(150);
    assert.equal(await frameEval(`document.querySelector('output').textContent`),'1','Row forwards ref and bubbled events');
    await n('/layout-failure/');
    for(let i=0;i<2;i++) {
      await e(`${widget(i)}.scrollIntoView({block:'center',behavior:'instant'})`);
      await wait(`${widget(i)}.dataset.state==='error'`);
      assert(await e(`!${widget(i)}.querySelector('.jsx-fallback').hidden`));
    }
    await viewport(1280,1200);await n('/failure/');
    for (let i=0;i<3;i++) {
      await e(`${widget(i)}.scrollIntoView({block:'center',behavior:'instant'})`);
      await wait(`${widget(i)}.dataset.state==='error'`);
      assert(await e(`!document.querySelector('.jsx-source') && !${widget(i)}.querySelector('.jsx-fallback').hidden`));
    }
    await render(3);await e(`${widget(3)}.querySelector('button').click()`);
    await wait(`${widget(3)}.querySelector('input').value==='1'`);
    assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  }
  console.log('PASS JSX: plain/card appearance, top titles/bottom captions, Stack/Row native equivalence/gaps/props/refs/wrapping, counter keyboard, Unicode Base64, stylesheet customization, shared page/frame styles, page API, repeat instances, lazy fold, opaque frame interaction/theme/origin checks, light/dark desktop/mobile, shared React, no-JS, import failure and independent runtime failures');
}, {[prefix]:'public', ...(process.argv[3] ? {'':process.argv[3]+'/baseline-public'} : {})});
