// Actual JSX tools in the real showcase; independent Chrome, blocked external traffic.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runBrowser } from './browser.mjs';
const prefix = '/sidera-showcase';
await runBrowser(async b => {
  const { evaluate: e, navigate: n, viewport, call, delay, key } = b;
  const wait = async expression => {
    for(let i=0;i<160;i++){if(await e(expression)) return;await delay(50);}
    assert.fail(expression+'\n'+JSON.stringify(b.errors));
  };
  const fill = async (selector,value) => {
    await e(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  };
  const render = async index => {
    await e(`document.querySelectorAll('[data-sidera-jsx]')[${index}].scrollIntoView({block:'center',behavior:'instant'})`);
    await wait(`document.querySelectorAll('[data-sidera-jsx]')[${index}].dataset.state==='ready'`);
  };
  await viewport(1280,960);await n(prefix+'/handbook/reference/legacy-tools/');
  await render(0);
  assert(!await e(`document.querySelector('.jsx-source')`));
  const cell = (part,value) => `document.querySelector('[data-part="${part}"][data-value="${value}"]')`;
  const action = name => `document.querySelector('[data-paper-action="${name}"]')`;
  const result = `document.querySelector('.paper-result')`;
  await wait(`${result}.textContent.includes('Wednesday')`);
  assert.equal(await e(`document.querySelectorAll('.paper-calendar').length`),1);
  assert(!await e(`document.querySelector('.calendar-tool details,.calendar-tool input')`));
  assert.equal(await e(`document.querySelectorAll('[data-part="ending"]').length`),100);
  assert.equal(await e(`document.querySelector('.paper-notes-space').textContent`),'');
  assert.equal(await e(`document.querySelector('.paper-notes-space').rowSpan`),19);
  assert.equal(await e(`document.querySelectorAll('.paper-calendar col').length`),16);
  assert.deepEqual(await e(`[...document.querySelectorAll('[data-part="century"]')].map(el=>el.textContent)`),['15','19','16','20','17','21','18','22']);
  assert(!await e(`document.querySelector('.paper-calendar').textContent.includes('4n')`));
  assert(!await e(`document.querySelector('[data-paper-cell="19:1"]')`));
  // Geometry is the contract: all three grids must share the SAME seven columns.
  const alignment = async () => {
    assert(await e(`(()=>{
      const rect=(row,col)=>document.querySelector('[data-paper-cell="'+row+':'+col+'"]').getBoundingClientRect();
      for(let col=4;col<=10;col++) {
        const year=rect(1,col), cross=rect(19,col), week=rect(26,col);
        if(Math.abs(year.x-cross.x)>1||Math.abs(year.x-week.x)>1||Math.abs(year.width-week.width)>1) return false;
        if(!(year.y<cross.y&&cross.y<week.y)) return false;
      }
      return rect(19,3).right<=rect(19,4).left && rect(19,11).left>=rect(19,10).right && rect(26,11).left>=rect(26,10).right;
    })()`));
  };
  await alignment();
  assert.deepEqual(await e(`[...document.querySelectorAll('.paper-junction')].map(el=>el.dataset.paperCell)`),['20:10','21:4','28:4']);
  for (const coord of ['2:10','18:10','19:10','20:3','20:9','21:12','25:4','26:4','28:12']) {
    assert(await e(`document.querySelector('[data-paper-cell="${coord}"]').classList.contains('paper-path')`),coord);
  }
  await e(`${action('clear')}.click()`);
  await wait(`document.querySelectorAll('.paper-path').length===0`);
  await e(`${cell('century','20')}.click()`);
  await e(`${cell('ending','11')}.click()`);
  await wait(`${result}.textContent.includes('Year key F') && !${result}.textContent.includes('Wednesday')`);
  await e(`${cell('month','8')}.click()`);await e(`${cell('day','10')}.click()`);
  await wait(`${result}.textContent.includes('Wednesday')`);
  // Focus/hover preview, Enter commits, leaving the sheet restores the pinned path.
  await e(`${cell('ending','96')}.focus()`);
  await wait(`${result}.textContent.includes('Preview')`);
  assert.equal(await e(`${cell('ending','11')}.getAttribute('aria-pressed')`),'true');
  await key('Enter','Enter',13);await e(`document.activeElement.blur()`);
  await wait(`${cell('ending','96')}.getAttribute('aria-pressed')==='true'`);
  assert.equal(await e(`${result}.querySelector('strong').textContent`),new Date(Date.UTC(2096,7,10)).toLocaleDateString('en-US',{weekday:'long'}));
  await e(`${cell('century','21')}.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))`);
  await wait(`${result}.textContent.includes('Preview: 21 / 96')`);
  assert.equal(await e(`${cell('century','20')}.getAttribute('aria-pressed')`),'true');
  await e(`document.querySelector('.paper-calendar').dispatchEvent(new MouseEvent('mouseout',{bubbles:true,relatedTarget:document.querySelector('.paper-toolbar')}))`);
  await wait(`${result}.textContent.includes('Selected: 20 / 96')`);
  // Paper choices do not auto-clamp or auto-switch the selected month.
  await e(`${cell('ending','0')}.click()`);await e(`${cell('month','2-prime')}.click()`);await e(`${cell('day','29')}.click()`);
  await wait(`${result}.textContent.includes('Tuesday') && !${result}.querySelector('.jsx-error')`);
  await e(`${cell('century','19')}.click()`);
  await wait(`${result}.textContent.includes('unprimed')`);
  assert.equal(await e(`${cell('day','29')}.getAttribute('aria-pressed')`),'true');
  await e(`${cell('month','2')}.click()`);
  await wait(`${result}.textContent.includes('28 days')`);
  await e(`${cell('day','28')}.click()`);await wait(`!${result}.querySelector('.jsx-error')`);
  await e(`${action('today')}.click()`);
  const today=await e(`(()=>{const d=new Date();return [Math.floor(d.getFullYear()/100),d.getFullYear()%100,d.getDate()].map(String)})()`);
  assert.deepEqual(await e(`['century','ending','day'].map(part=>document.querySelector('[data-part="'+part+'"][aria-pressed="true"]').dataset.value)`),today);
  await e(`${action('example')}.click()`);
  // Real pointer movement: gaps/empty cells retain a preview until the pointer
  // exits that logical sub-table, even with CSS zoom and horizontal scrolling.
  const pointer = async point => {
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await e(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  };
  const center = async selector => await e(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const snapshot = async () => await e(`({text:${result}.textContent,path:[...document.querySelectorAll('.paper-path,.paper-junction')].map(el=>[el.dataset.paperCell,el.className])})`);
  const areas = [
    {part:'ending',first:'2',next:'4',left:'1:6',right:'1:7',empty:'1:8'},
    {part:'century',first:'15',next:'17',left:'19:2',right:'19:3',empty:'21:2',outside:'19:4'},
    {part:'month',first:'10',next:'5',left:'19:12',right:'19:13',empty:'20:12',outside:'20:10'},
    {part:'day',first:'22',next:'25',left:'26:14',right:'26:15',empty:'29:15',outside:'26:10'},
  ];
  for(const width of [1280,390]) {
    await viewport(width,960);
    for(const actual of [false,true]) {
      if(actual) await e(`${action('size')}.click()`);
      for(const area of areas) {
        await pointer({x:0,y:0});
        await e(`${action('example')}.click()`);
        const selected=await snapshot();
        const first=`[data-part="${area.part}"][data-value="${area.first}"]`;
        await e(`document.querySelector(${JSON.stringify(first)}).scrollIntoView({block:'center',inline:'center',behavior:'instant'})`);
        await pointer(await center(first));
        await wait(`${result}.textContent.startsWith('Preview:')`);
        const preview=await snapshot();
        const gap=await e(`(()=>{
          const left=document.querySelector('[data-paper-cell="${area.left}"]').getBoundingClientRect();
          const right=document.querySelector('[data-paper-cell="${area.right}"]').getBoundingClientRect();
          return {x:(left.right+right.left)/2,y:left.y+left.height/2};
        })()`);
        assert(await e(`!document.elementFromPoint(${gap.x},${gap.y}).closest('button[data-part]')`));
        await pointer(gap);assert.deepEqual(await snapshot(),preview,`${area.part}: cell gap`);
        await pointer(await center(`[data-paper-cell="${area.empty}"]`));
        assert.deepEqual(await snapshot(),preview,`${area.part}: empty cell`);
        await pointer(await center(`[data-part="${area.part}"][data-value="${area.next}"]`));
        assert.notDeepEqual(await snapshot(),preview,`${area.part}: next numbered cell`);
        const outside=area.outside ? await center(`[data-paper-cell="${area.outside}"]`) : await e(`(()=>{
          const header=document.querySelector('.paper-years').getBoundingClientRect();
          const row=document.querySelector('[data-paper-cell="1:6"]').getBoundingClientRect();
          return {x:header.left-4,y:row.y+row.height/2};
        })()`);
        await pointer(outside);assert.deepEqual(await snapshot(),selected,`${area.part}: leave area inside sheet`);
        await pointer(await center(first));
        await pointer({x:0,y:0});assert.deepEqual(await snapshot(),selected,`${area.part}: leave sheet`);
      }
      if(actual) await e(`${action('size')}.click()`);
    }
  }
  await viewport(1280,960);
  await render(1);
  const serial='b012 34567890 1234';
  await fill('.kindle-tool input',serial);
  const expected='fiona'+createHash('md5').update('B012345678901234\n').digest('hex').slice(7,11);
  await wait(`document.querySelector('.kindle-tool output strong').textContent===${JSON.stringify(expected)}`);
  await e(`document.querySelector('.kindle-tool .jsx-row button:last-child').focus()`);await key('Enter','Enter',13);
  await wait(`document.querySelector('.kindle-tool input').value==='' && !document.querySelector('.kindle-tool output').textContent.includes('fiona')`);
  await fill('.kindle-tool input','bad!');
  await wait(`document.querySelector('.kindle-tool input').getAttribute('aria-invalid')==='true'`);
  await e(`document.querySelector('.kindle-tool .jsx-row button:first-child').click()`);
  await wait(`document.querySelector('.kindle-tool output strong').textContent===${JSON.stringify(expected)}`);
  assert(!await e(`Object.values(localStorage).some(value=>value.includes('B012345678901234'))`));
  assert(!b.requests.some(url=>url.includes('B012345678901234')||url.includes(encodeURIComponent(serial))));
  await render(2);
  await fill('.chinese-tool input','-00012');
  await wait(`document.querySelector('.chinese-tool textarea').value==='负十二'`);
  await fill('.chinese-tool input','1'+'0'.repeat(51));
  await wait(`document.querySelector('.chinese-tool textarea').value==='一千極'`);
  await fill('.chinese-tool input','9'.repeat(53));
  await wait(`document.querySelector('.chinese-tool .jsx-error').textContent.includes('52 digits')`);
  assert.equal(await e(`document.querySelector('.chinese-tool textarea').value`),'');
  await fill('.chinese-tool input','1.23');
  await wait(`document.querySelector('.chinese-tool input').getAttribute('aria-invalid')==='true'`);
  await fill('.chinese-tool input','0');
  await wait(`document.querySelector('.chinese-tool textarea').value==='零'`);
  await fill('.chinese-tool input','');
  await wait(`document.querySelector('.chinese-tool textarea').value==='' && document.querySelector('.chinese-tool .jsx-error').textContent===''`);
  await fill('.chinese-tool input','123456789');
  await wait(`document.querySelector('.chinese-tool textarea').value==='一亿二千三百四十五万六千七百八十九'`);
  const ids=await e(`[...document.querySelectorAll('[id]')].map(el=>el.id)`);
  assert.equal(new Set(ids).size,ids.length);
  for(const tone of ['light','dark']) {
    await e(`Sidera.setColorMode('${tone}')`);
    for(const width of [1280,390]) {
      await viewport(width,960);
      for(const [index,name] of ['calendar','kindle','chinese'].entries()) {
        await render(index);
        assert(await e(`(()=>{
          const figure=document.querySelectorAll('[data-sidera-jsx]')[${index}], style=getComputedStyle(figure);
          const root=figure.querySelector('.jsx-root'), caption=figure.querySelector(':scope > figcaption');
          return figure.dataset.appearance==='plain' && style.padding==='0px' && style.borderTopWidth==='0px'
            && style.backgroundColor==='rgba(0, 0, 0, 0)' && caption===figure.lastElementChild
            && caption.getBoundingClientRect().top>=root.getBoundingClientRect().bottom-1;
        })()`));
        if(index===0) {
          await e(`document.querySelector('.paper-calendar').scrollIntoView({block:'start',behavior:'instant'})`);
          await alignment();
          assert(await e(`getComputedStyle(document.querySelector('[data-paper-cell="25:4"]')).backgroundColor !== getComputedStyle(document.querySelector('[data-paper-cell="25:5"]')).backgroundColor`));
          await wait(`document.querySelector('.paper-calendar').getBoundingClientRect().width <= document.querySelector('.paper-viewport').clientWidth + 1`);
        }
        assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
        await delay(200);
        await b.screenshot(`tools-${name}-${tone}-${width}`);
      }
    }
  }
  await render(0);await e(`${action('size')}.click()`);
  await wait(`Math.abs(document.querySelector('.paper-calendar').getBoundingClientRect().width-628)<1`);
  assert(await e(`document.querySelector('.paper-viewport').scrollWidth>document.querySelector('.paper-viewport').clientWidth && document.documentElement.scrollWidth<=innerWidth`));
  await alignment();
  await e(`document.querySelector('[data-paper-cell="20:10"]').scrollIntoView({block:'center',inline:'center',behavior:'instant'})`);
  await delay(200);await b.screenshot('tools-paper-calendar-actual-mobile');
  await e(`${action('size')}.click()`);
  await wait(`document.querySelector('.paper-calendar').getBoundingClientRect().width <= document.querySelector('.paper-viewport').clientWidth + 1`);
  await call('Emulation.setScriptExecutionDisabled',{value:true});await n(prefix+'/handbook/reference/legacy-tools/',false);
  assert(await e(`[...document.querySelectorAll('.jsx-fallback')].every(el=>!el.hidden) && !document.querySelector('.jsx-source')`));
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert(b.requests.filter(url=>url.startsWith('http')).every(url=>url.startsWith(b.origin+prefix+'/')),b.requests.join('\n'));
  console.log('PASS legacy JSX browser: single-sheet spatial alignment and connected paths; calendar click/focus/hover/manual leap selections; stable pointer previews across all four areas in fit/actual-size desktop/mobile views; local Kindle formula/privacy/reset; exact Chinese integers/limits/errors; light/dark/mobile tables; no source UI; no-JS; no external requests');
}, {[prefix]:'public'});
