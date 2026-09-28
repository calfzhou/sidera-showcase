import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
  const {evaluate:e,navigate:n,key,call,delay,viewport,screenshot}=b;
  const wait=async expr=>{for(let i=0;i<100;i++){if(await e(expr))return;await delay(50);}assert.fail(expr);};
  await call('Fetch.enable',{patterns:[{urlPattern:'*search/*.json',requestStage:'Request'}]});
  b.on('Fetch.requestPaused',async p=>{await delay(400);await call('Fetch.continueRequest',{requestId:p.requestId});});
  await viewport(1440,960); await n('/notes/reading-list/');
  await e(`(()=>{const i=document.querySelector('#search-input');i.focus();i.value='reading';i.dispatchEvent(new Event('input'));})()`);
  assert(await e(`document.querySelector('[data-search-wrapper]').classList.contains('is-loading') && document.querySelector('.search-status').textContent==='Loading search…'`));
  await wait(`!!document.querySelector('.search-results a')`);
  await call('Fetch.disable');
  await e(`(()=>{const i=document.querySelector('#search-input');i.value='';i.dispatchEvent(new Event('input'));})()`);
  const docs=await e(`fetch(document.querySelector('[data-sidera-search]').dataset.index).then(r=>r.json()).then(x=>x.documents)`);
  // Every real indexed document's rendered DOM must reproduce the generated sections.
  for(const doc of docs) {
    // Avoid real Shields providers and heavy diagram initialization: inspect detached HTML.
    const sections=await e(`(async()=>{const html=await fetch(${JSON.stringify(doc.url)}).then(r=>r.text());const dom=new DOMParser().parseFromString(html,'text/html');const rules=JSON.parse(document.querySelector('[data-sidera-search]').dataset.rules);return SideraSearch.bodySections(dom.querySelector('[data-search-body]'),rules).map(({id,title,text})=>({id,title,text}));})()`);
    assert.deepEqual(sections,doc.sections,doc.url+' text/heading model');
  }
  const query=async(text,global=false)=>{
    await e(`(()=>{const input=document.querySelector('#search-input');input.focus();${global?`const s=document.querySelector('.search-scope');if(s){s.value='';s.dispatchEvent(new Event('change'));}`:''}input.value=${JSON.stringify(text)};input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await delay(150);
  };
  await query('marginalia',true); await wait(`!!document.querySelector('.search-results a')`);
  const target='/journal/2026/04/14/connect-the-useful-parts/';
  // Intro: pointer navigation and real body marks/first-match scroll.
  const point=await e(`(()=>{const r=document.querySelector('.search-results a[href^="${target}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
  await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  await wait(`location.pathname===${JSON.stringify(target)} && !!document.querySelector('[data-search-mark]')`);
  assert.equal(await e('location.hash'),'');
  await wait(`document.querySelector('[data-search-mark]').getBoundingClientRect().top<100`);
  assert.equal(await e(`document.querySelectorAll('mark mark').length`),0);
  await call('Page.reload'); await wait(`document.readyState==='complete' && !!document.querySelector('[data-search-mark]')`);
  assert.equal(await e(`document.querySelectorAll('[data-search-mark]').length`),1);
  await e(`document.querySelector('.search-highlight-clear').click()`);
  assert.equal(await e(`new URL(location.href).searchParams.has('kw')`),false);
  assert.equal(await e(`document.querySelectorAll('[data-search-mark]').length`),0);
  // Actual back and heading keyboard journey, native IDs authoritative.
  await e('history.back()');await wait(`location.pathname==='/notes/reading-list/'`);
  await query('Give a link a reason',true);await wait(`!!document.querySelector('.search-results a[href^="${target}"]')`);
  await e(`document.querySelector('.search-results a[href^="${target}"]').focus()`); await key('Enter','Enter',13);
  await wait(`location.pathname===${JSON.stringify(target)} && location.hash==='#give-a-link-a-reason' && !!document.querySelector('[data-search-mark]')`);
  await wait(`document.querySelector(':target').getBoundingClientRect().top>=-2 && document.querySelector(':target').getBoundingClientRect().top<120`);
  assert(await e(`!!document.querySelector(':target [data-search-mark]')`));
  // CJK in a fold; literal special characters; cross-span highlighted code/copy unaffected.
  await n('/notes/reading-list/');await query('连接笔记',true);await wait(`!!document.querySelector('.search-results a[href^="${target}"]')`);
  await e(`document.querySelector('.search-results a[href^="${target}"]').click()`);
  await wait(`!!document.querySelector('details[open] [data-search-mark]')`);
  assert.equal(await e('location.hash'),'#connections-across-languages');
  await delay(200); await screenshot('search-destination');
  await n('/notes/code-inclusion/?kw=matching_pair#complete-file');
  assert(await e(`!!document.querySelector('pre [data-search-mark]')`));
  assert.equal(await e(`document.querySelectorAll('.code-toolbar mark,.lnt mark,.katex mark,.diagram-source mark').length`),0);
  const code=await e(`document.querySelector('.code-block').dataset.codeSource`);
  await e(`navigator.clipboard.writeText=async text=>{window.copied=text};document.querySelector('.code-copy').click()`);
  // Different code-control selector may be supplied by existing theme; exact payload checked below.
  assert.equal(await e('window.copied'),JSON.parse(code));
  await n(target+'?kw='+encodeURIComponent('a+b[0]')+'#connections-across-languages');
  assert.equal(await e(`document.querySelector('[data-search-mark]').textContent`),'a+b[0]');
  await n(target+'?kw='+encodeURIComponent('<img src=x onerror=alert(1)>[.*]'));
  assert.equal(await e(`document.querySelectorAll('[data-search-mark]').length`),0);
  assert.equal(await e(`document.querySelectorAll('[data-search-body] img[src="x"]').length`),0);
  // Keyboard, clear/empty/no-result, scope UX (not security), palettes/mobile.
  await n('/notes/reading-list/'); await query('matching_pair');await wait(`!!document.querySelector('.search-results a')`);
  assert(await e(`[...document.querySelectorAll('.search-results a')].every(a=>a.pathname.startsWith('/notes/'))`));
  await key('ArrowDown','ArrowDown',40); assert(await e(`document.activeElement.matches('.search-results a')`));
  await key('ArrowUp','ArrowUp',38); assert(await e(`document.activeElement.id==='search-input'`));
  await key('Escape','Escape',27);assert.equal(await e(`document.querySelector('.search-results').textContent`),'');
  await query('definitely-no-results-9a8b');assert(await e(`!document.querySelector('.search-status').hidden`));
  await query('matching_pair');await e(`Sidera.setColorMode('dark')`);await screenshot('search-dark');
  await call('Emulation.setTouchEmulationEnabled',{enabled:true}); await viewport(390,844);await delay(200);await e(`Sidera.setColorMode('light');document.querySelector('[data-region="left"]').click()`);await delay(300);await screenshot('search-mobile');
  assert(await e(`(()=>{const a=document.querySelector('.search-results a'),r=a.getBoundingClientRect(),box=document.querySelector('.search-results').getBoundingClientRect();return r.bottom<=box.bottom && getComputedStyle(document.querySelector('.site-menu')).display==='none'})()`));
  assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  await delay(200);
  const clearPoint=await e(`(()=>{const r=document.querySelector('.search-clear').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  assert(await e(`document.elementFromPoint(${clearPoint.x},${clearPoint.y})?.closest('.search-clear')!==null`),JSON.stringify(await e(`({point:${JSON.stringify(clearPoint)},hit:document.elementFromPoint(${clearPoint.x},${clearPoint.y})?.outerHTML?.slice(0,500),open:document.querySelector('#left-region').matches(':popover-open'),rect:document.querySelector('.search-clear').getBoundingClientRect().toJSON()})`)));
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[clearPoint]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`document.querySelector('#search-input').value==='' && getComputedStyle(document.querySelector('.site-menu')).display!=='none'`);
  await call('Emulation.setTouchEmulationEnabled',{enabled:false});
  // No script: searchable content/navigation stay accessible, disabled control says why.
  await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/notes/reading-list/',false);
  assert(await e(`document.querySelector('#search-input').disabled && !!document.querySelector('.search-fallback')`));
  assert(await e(`document.querySelector('[data-content-relations="outgoing"] a').getAttribute('href')===${JSON.stringify(target)}`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  // Unavailable public JSON: failure is visible, no phantom results, retry on focus.
  await viewport(1440,960); await call('Network.setBlockedURLs',{urls:['*search/*.json']});await n('/notes/reading-list/');await query('matching_pair');await wait(`document.querySelector('.search-status').textContent.includes('unavailable')`);
  await call('Network.setBlockedURLs',{urls:[]});await e(`document.querySelector('#search-input').blur();document.querySelector('#search-input').focus()`);await wait(`!!document.querySelector('.search-results a')`);
  // Desktop shortcut, editable/IME exceptions, and reduced-motion spotlight guard.
  await e(`document.querySelector('#search-input').blur()`);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'k',code:'KeyK',modifiers:4});
  await call('Input.dispatchKeyEvent',{type:'keyUp',key:'k',code:'KeyK',modifiers:4});
  assert(await e(`document.activeElement.id==='search-input'`));
  assert(await e(`(()=>{const t=document.createElement('textarea');document.body.append(t);t.focus();const ev=new KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true,cancelable:true});t.dispatchEvent(ev);const native=!ev.defaultPrevented;t.remove();return native;})()`));
  assert(await e(`(()=>{const i=document.querySelector('#search-input'),ev=new KeyboardEvent('keydown',{key:'k',metaKey:true,isComposing:true,bubbles:true,cancelable:true});i.dispatchEvent(ev);return !ev.defaultPrevented;})()`));
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await query('matching_pair');
  assert.equal(await e(`getComputedStyle(document.querySelector('.search-results a'),'::after').content`),'none');
  await call('Emulation.setEmulatedMedia',{features:[]});
  // Generated bilingual/subpath fixtures: native language URLs and independent scopes.
  await n('/preview/notes/a/'); await query('Boundaryneedle');
  assert.equal(await e(`document.querySelectorAll('.search-results a').length`),0);
  await query('Boundaryneedle',true); await wait(`!!document.querySelector('.search-results a')`);
  assert.equal(await e(`document.querySelector('.search-results a').getAttribute('href')`),'/preview/notes/independent/leaf/?kw=Boundaryneedle');
  await n('/preview/zh/notes/a/');
  assert.equal(await e(`document.querySelector('#search-input').placeholder`),'在 笔记 中搜索');
  await query('连接笔记');await wait(`!!document.querySelector('.search-results a')`);
  assert(await e(`[...document.querySelectorAll('.search-results a')].every(a=>a.pathname.startsWith('/preview/zh/'))`));
  await key('Enter','Enter',13);await wait(`location.hash==='#%E4%B8%AD%E6%96%87%E6%A0%87%E9%A2%98' && !!document.querySelector('[data-search-mark]')`);
  assert.equal(await e(`document.querySelector('.search-highlight-clear').textContent`),'清除关键词高亮');
  // C2/model-generated index: code split across spans and excluded authored/math text.
  await n('/preview/notes/a/?kw=snippet_unique#native-source');
  assert(await e(`!!document.querySelector('pre [data-search-mark]')`));
  assert.equal(await e(`document.querySelectorAll('.content-mark [data-search-mark],.katex [data-search-mark]').length`),0);
  assert(await e(`document.querySelector('pre [data-search-mark]').closest('details').open`),'Reveal a body hit even when its heading is outside the fold');
  await n('/preview/notes/a/'); await query('<img src=x onerror=alert(1)>',true);
  await wait(`!!document.querySelector('.search-results a')`);
  assert.equal(await e(`document.querySelectorAll('.search-results img').length`),0);
  await e(`document.querySelector('.search-results a').click()`);
  await wait(`!!document.querySelector('code [data-search-mark]')`);
  assert.equal(await e(`document.querySelectorAll('[data-search-body] img[src="x"]').length`),0);
  await e(`(()=>{const u=new URL(location.href);u.searchParams.set('from','context');history.replaceState(null,'',u);document.querySelector('.search-highlight-clear').click()})()`);
  assert.equal(await e(`new URL(location.href).searchParams.get('from')`),'context');
  assert.equal(await e(`location.hash`),'#keep-native');
  await n('/preview/notes/a/?kw=snippet_unique#native-source');
  await n('/preview/notes/a/?kw=fenced_needle#native-source');
  assert(await e(`!!document.querySelector('.code-block:not([data-code-source]) [data-search-mark]')`));
  await e(`navigator.clipboard.writeText=async text=>{window.fenceCopy=text};document.querySelector('.code-block:not([data-code-source]) .code-copy').click()`);
  assert.equal(await e('window.fenceCopy'),'def fenced_needle():\n    return "<b>literal</b>"');
  // Bounded idempotence on back/forward-style replay with no duplicate marks.
  const marks=await e(`document.querySelectorAll('[data-search-mark]').length`);
  await e(`dispatchEvent(new PopStateEvent('popstate'))`);
  assert.equal(await e(`document.querySelectorAll('[data-search-mark]').length`),marks);
  assert.equal(await e(`document.querySelectorAll('mark mark').length`),0);
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert(b.requests.every(u=>u.startsWith(b.origin+'/')),'No external requests');
  console.log(`PASS ${docs.length} generated/DOM section models; scope, pointer/keyboard click-through, intro/heading/CJK/fold/code/literal marks, back/reload/clear, mobile/palettes/no-JS/failure`);
}, {'/preview':'native/native-public'});
