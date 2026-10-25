// Own Chrome/profile only. Consumes themes/sidera/tests/check_rich_tables.py output.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate:e,navigate:n,viewport:v,call}=b;
  const results=[];
  const settle=()=>e(`(()=>{for(const a of document.getAnimations()){if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()}})()`);
  await v(1440,1100);
  await n('/preview/tables/');
  const cells=()=>e(`(()=>{const t=document.querySelector('#merged > .rich-table-scroll > table'),rows=[...t.tBodies[0].rows];return {rowCounts:rows.map(r=>r.cells.length),rowSpan:rows[0].cells[0].rowSpan,colSpan:rows[2].cells[1].colSpan,headRows:t.tHead.rows.length,display:getComputedStyle(t).display,refs:rows[1].cells[0].getAttribute('headers').split(' ').map(id=>document.getElementById(id).textContent.trim())}})()`);
  const model=await cells();
  assert.deepEqual(model.rowCounts,[3,2,2,2]);
  assert.equal(model.rowSpan,2);assert.equal(model.colSpan,2);assert.equal(model.headRows,2);
  assert.equal(model.display,'table');assert.deepEqual(model.refs,['Paper','Size','A series']);
  const ax=await call('Accessibility.getFullAXTree');
  assert(ax.nodes.some(n=>n.role?.value==='table'&&n.name?.value==='Paper sizes'), 'Visible figure caption must name the table');
  assert(ax.nodes.some(n=>n.role?.value==='rowheader'&&n.name?.value==='A series'), 'Body group must expose row-header semantics');
  results.push('Native multirow headers, rectangular spans and explicit accessible header associations');

  const gridProbe=`(()=>{
    const rich=[...document.querySelectorAll('.rich-table[data-borders="grid"]')];
    if(rich.length!==2)return false;
    for(const table of rich)for(const cell of table.querySelectorAll(':scope > :is(thead,tbody) > tr > :is(th,td)')){
      const s=getComputedStyle(cell),edge=cell.dataset.column==='0';
      if(s.borderInlineStartWidth!==(edge?'0px':'1px')||(!edge&&(s.borderInlineStartStyle!=='solid'||s.borderInlineStartColor!==s.borderBottomColor)))return false;
    }
    const plain=document.querySelector('#plain-grid');
    for(const row of plain.rows)for(const [i,cell] of [...row.cells].entries())if(getComputedStyle(cell).borderInlineStartWidth!==(i===0?'0px':'1px'))return false;
    const carried=document.querySelector('#rectangles tbody tr:nth-child(2) > :first-child');
    const full=document.querySelector('#rectangles tbody tr:nth-child(3) > :first-child');
    return carried.dataset.column==='2'&&getComputedStyle(carried).borderInlineStartWidth==='1px'&&full.colSpan===4&&getComputedStyle(full).borderInlineStartWidth==='0px';
  })()`;
  const colorProbe=`(()=>{
    const c=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
    const rgba=color=>{c.clearRect(0,0,1,1);c.fillStyle=color;c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].map(x=>x/255)};
    const over=(a,b)=>[...a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3])),1];
    const bg=el=>{if(!el)return [1,1,1,1];const s=getComputedStyle(el);let color=over(rgba(s.backgroundColor),bg(el.parentElement));if(s.backgroundImage.startsWith('linear-gradient('))color=over(rgba(s.getPropertyValue('--panel')),color);return color};
    const lum=rgb=>rgb.slice(0,3).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    return [...document.querySelectorAll('#merged > .rich-table-scroll > table > thead > tr > th,#merged > .rich-table-scroll > table > tbody > tr > th,#merged > .rich-table-scroll > table > tbody > tr > td,#merged > figcaption')].map(el=>{const s=getComputedStyle(el),back=bg(el);return {label:el.textContent.slice(0,20),fg:s.color,bg:s.backgroundColor,ratio:ratio(over(rgba(s.color),back),back)}})
  })()`;
  const modes={};
  for(const mode of ['light','dark']) {
    await e(`document.documentElement.dataset.colorScheme='${mode}'`);await settle();
    modes[mode]=await e(colorProbe);
    assert(modes[mode].every(x=>x.ratio>=4.5),JSON.stringify(modes[mode]));
    await e(`document.querySelector('#merged').scrollIntoView({block:'center',behavior:'instant'})`);
    await b.screenshot('rich-table-'+mode);
    assert.equal(await e(`getComputedStyle(document.querySelector('#merged tbody tr:first-child td:last-child')).textAlign`),'end');
    assert.equal(await e(`getComputedStyle(document.querySelector('#merged tbody tr:first-child td')).textAlign`),'center');
    assert.equal(await e(`getComputedStyle(document.querySelector('#merged tbody tr:first-child th')).minWidth`),'100px');
    assert.equal(await e(`getComputedStyle(document.querySelector('#merged .code-block pre')).textAlign`),'start');
    assert.equal(await e(`getComputedStyle(document.querySelector('#merged tbody tr:nth-child(3) td')).minWidth`),'260px');
    assert(await e(`(()=>{
      const normal=document.querySelector('.prose table:not(.rich-table):not(.lntable)'),rich=document.querySelector('#merged .rich-table');
      const keys=['fontSize','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderBottomStyle','borderBottomWidth','borderBottomColor','borderLeftWidth','borderRightWidth','backgroundColor'];
      for(const type of ['th','td']) {const a=getComputedStyle(normal.querySelector(type)),b=getComputedStyle(rich.querySelector(type));if(!keys.every(key=>a[key]===b[key]))return false;}
      const f=document.querySelector('#merged'),scroll=f.querySelector('.rich-table-scroll'),caption=f.querySelector(':scope > figcaption');
      const a=getComputedStyle(caption),b=getComputedStyle(document.querySelector('.caption-reference figcaption'));
      return ['fontSize','fontWeight','lineHeight','color','textAlign','marginTop'].every(key=>a[key]===b[key])&&a.textAlign==='center'&&caption.getBoundingClientRect().top>=scroll.getBoundingClientRect().bottom&&getComputedStyle(f).borderTopWidth==='0px'&&getComputedStyle(f).backgroundColor==='rgba(0, 0, 0, 0)';
    })()`), 'Match ordinary Markdown cell styling and standard centered bottom captions');
    assert(await e(`(()=>{const t=document.querySelector('#merged .rich-table');return document.getElementById(t.getAttribute('aria-labelledby'))===document.querySelector('#merged > figcaption')})()`));
    assert(await e(gridProbe),'Plain/rich grid uses real cell boundaries, including carried rowspans');
    await e(`document.querySelector('#merged .rich-table').dataset.borders='grid'`);
    assert(await e(`(()=>{const t=document.querySelector('#merged .rich-table');return getComputedStyle(t.tHead.rows[0].cells[1]).borderInlineStartWidth==='1px'&&getComputedStyle(t.tHead.rows[1].cells[0]).borderInlineStartWidth==='1px'&&getComputedStyle(t.tBodies[0].rows[1].cells[0]).borderInlineStartWidth==='1px'&&[...t.querySelectorAll('.lntd')].every(c=>getComputedStyle(c).borderInlineStartWidth==='0px')})()`));
    await b.screenshot('rich-table-grid-'+mode);
    await e(`document.querySelector('#merged .rich-table').dir='rtl'`);
    assert(await e(`(()=>{const c=document.querySelector('#merged .rich-table').tBodies[0].rows[1].cells[0],s=getComputedStyle(c);return s.borderRightWidth==='1px'&&s.borderLeftWidth==='0px'})()`));
    await e(`(()=>{const t=document.querySelector('#merged .rich-table');t.removeAttribute('dir');t.dataset.borders='rows'})()`);
    results.push(mode+': normal Markdown table styling, centered bottom figure captions, contrast, column alignment and span widths');
    results.push(mode+': optional grid, RTL, rowspan boundaries and nested code-table isolation');
  }
  for(const scheme of ['light','dark']) {
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:scheme}]});
    await e(`document.documentElement.dataset.colorScheme='auto'`);await settle();
    assert.deepEqual(await e(colorProbe),modes[scheme]);
  }
  results.push('Auto palette follows both OS preferences');

  // CSS-only sticky geometry inside an explicit bounded scrollport.
  await v(390,844);
  await e(`document.querySelector('#sticky').scrollIntoView({block:'center',behavior:'instant'})`);
  const before=await e(`(()=>{const s=document.querySelector('#sticky .rich-table-scroll');s.scrollTop=0;s.scrollLeft=0;return {left:s.querySelector('tbody [data-column="0"]').getBoundingClientRect().left,top:s.getBoundingClientRect().top}})()`);
  await e(`document.querySelector('#sticky .rich-table-scroll').scrollTop=240;document.querySelector('#sticky .rich-table-scroll').scrollLeft=120`);
  await b.delay(60);
  const after=await e(`(()=>{const s=document.querySelector('#sticky .rich-table-scroll'),h=s.querySelector('thead');return {left:s.querySelector('tbody [data-column="0"]').getBoundingClientRect().left,headTop:h.getBoundingClientRect().top,top:s.getBoundingClientRect().top,headHeight:h.getBoundingClientRect().height,scroll:s.scrollLeft,height:s.clientHeight}})()`);
  assert(after.scroll>0);
  assert(Math.abs(before.left-after.left)<1);
  assert(Math.abs(after.headTop-after.top)<2,JSON.stringify(after));
  assert(after.height<=240);
  assert(await e(`(()=>{const f=document.querySelector('#sticky'),scroll=f.querySelector('.rich-table-scroll'),caption=f.querySelector('figcaption'),r=caption.getBoundingClientRect(),s=scroll.getBoundingClientRect();return r.top>=s.bottom&&Math.abs((r.left+r.right)/2-(s.left+s.right)/2)<1&&r.left>=0&&r.right<=innerWidth})()`));
  await b.screenshot('rich-table-sticky-mobile');
  assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false);
  await e(`document.querySelector('#legacy .rich-table-scroll').focus();document.querySelector('#legacy .rich-table-scroll').scrollLeft=0`);
  assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
  await b.key('ArrowRight','ArrowRight',39);await b.delay(200);
  assert(await e(`document.querySelector('#legacy .rich-table-scroll').scrollLeft>0`));
  assert(await e(`!!document.querySelector('#legacy .visually-hidden')`), 'Exercise external-link accessible labels inside the scrollport');
  assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false, 'Offscreen accessible labels must not expand the document');
  results.push('Narrow layout without page overflow; keyboard scrolling; multirow sticky header/first-column geometry');
  await e(`document.querySelector('.content-folding').open=true`);
  assert(await e(`document.querySelector('.content-folding .rich-table').getBoundingClientRect().height>0`));
  assert(await e(`!!document.querySelector('#merged .lntable')&&document.querySelector('#merged .katex')!==null`));
  results.push('Fold/grid/tab composition, native Markdown lists, local links, Chroma table line numbers and math');

  await call('Emulation.setEmulatedMedia',{media:'print'});
  assert(await e(gridProbe));
  assert.equal(await e(`getComputedStyle(document.querySelector('#sticky .rich-table-scroll')).maxHeight`),'none');
  assert.equal(await e(`getComputedStyle(document.querySelector('#sticky thead')).position`),'static');
  assert.equal(await e(`getComputedStyle(document.querySelector('#sticky tbody th')).position`),'static');
  assert.equal(await e(`getComputedStyle(document.querySelector('#sticky .rich-table-scroll')).overflow`),'visible');
  assert(await e(`(()=>{const f=document.querySelector('#sticky'),caption=f.querySelector('figcaption'),scroll=f.querySelector('.rich-table-scroll');return getComputedStyle(caption).textAlign==='center'&&caption.getBoundingClientRect().top>=scroll.getBoundingClientRect().bottom})()`));
  await call('Emulation.setEmulatedMedia',{media:'',features:[{name:'forced-colors',value:'active'},{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.notEqual(await e(`getComputedStyle(document.querySelector('#merged th')).borderBottomStyle`),'none');
  assert(await e(gridProbe));
  await call('Emulation.setEmulatedMedia',{features:[]});
  results.push('Print disables sticky/clipping; forced-colors keeps grid boundaries; no added animation');

  await n('/preview/host/');
  assert(await e(`(()=>{const ids=[...document.querySelectorAll('.rich-table th[id]')].map(x=>x.id);return ids.length===new Set(ids).size&&document.querySelectorAll('.rich-table').length===24})()`));
  await n('/preview/zh/tables/');
  assert(await e(`!!document.querySelector('.rich-table-scroll[aria-label="可滚动的数据表格"]')`));
  await n('/override/tables/');
  assert.equal(await e(`getComputedStyle(document.querySelector('#merged td')).borderBottomColor`),'rgb(100, 90, 80)');
  results.push('Repeated Content/Summary IDs, Chinese labels, native CSS override');

  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await n('/preview/tables/',false);
  assert.deepEqual(await cells(),model);
  assert(await e(gridProbe));
  await e(`document.querySelector('#sticky .rich-table-scroll').scrollTop=240;document.querySelector('#sticky .rich-table-scroll').scrollLeft=120`);
  assert.equal(await e(`getComputedStyle(document.querySelector('#sticky thead')).position`),'sticky');
  assert(await e(`Array.from(document.querySelectorAll('.rich-table [headers]')).every(c=>c.getAttribute('headers').split(' ').every(id=>document.getElementById(id)))`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  results.push('No-JS semantics, associations and sticky reading are intact');
  if(process.argv[3]) {
    await n('/sidera-showcase/handbook/reference/rich-tables/');
    assert.equal(await e(`document.querySelectorAll('.rich-table').length`),5);
    for(const mode of ['light','dark']) {
      await v(1280,1000);
      await e(`document.documentElement.dataset.colorScheme='${mode}'`);await settle();
      await e(`document.querySelector('#header-and-body-rowspans').scrollIntoView({block:'start',behavior:'instant'})`);
      await b.screenshot('showcase-rich-table-'+mode);
    }
    await v(390,844);
    await e(`document.querySelector('[data-sticky-header]').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('[data-sticky-header] .rich-table-scroll').scrollTop=160;document.querySelector('[data-sticky-header] .rich-table-scroll').scrollLeft=140`);
    assert.equal(await e(`document.documentElement.scrollWidth>innerWidth`),false);
    await b.screenshot('showcase-rich-table-mobile');
    await n('/sidera-showcase/sidera/authoring/tables/');
    assert(await e(`document.querySelector('.prose').textContent.includes('How merging works')`));
    results.push('Real project-prefixed showcase and mounted manual; light/dark/mobile specimens');
  }
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  await writeFile(resolve(b.run,'rich-table-browser-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS rich-table browser:',results.join('; '));
}, {'/preview':'baseline-public','/override':'override-public',...(process.argv[3]?{'/sidera-showcase':resolve(process.argv[3])}:{})});
