// Own Chrome/profile only. Consumes the theme's check_palette.py output.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate: e, navigate: n, call, viewport: v} = b;
  const names = ['red','orange','yellow','green','cyan','blue','purple','pink','neutral'];
  const alerts = {note:'blue',tip:'green',important:'purple',warning:'yellow',caution:'red'};
  const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const animation of document.getAnimations()){if(animation.effect.getComputedTiming().endTime!==Infinity)animation.finish();}})()`);
  const results = [];
  await v(1440, 1200);
  await n('/preview/palette/');
  // Sample browser-computed colors, including alpha compositing through ancestors.
  const probe = `(() => {
    const context = document.createElement('canvas').getContext('2d', {willReadFrequently:true});
    const rgb = color => {context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].map(v=>v/255)};
    const over = (a,b) => [...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
    const background = el => {if(!el)return [1,1,1,1];return over(rgb(getComputedStyle(el).backgroundColor),background(el.parentElement))};
    const lum = c => c.slice(0,3).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const snapshot = el => {const s=getComputedStyle(el);return {text:s.color,bg:s.backgroundColor,border:s.borderInlineStartColor}};
    const token = (el,role) => {const span=document.createElement('span');span.style.color='var(--color-'+role+')';el.append(span);const color=getComputedStyle(span).color;span.remove();return color};
    const checks = [...document.querySelectorAll('.content-mark,.content-box > .container-title > strong,.content-folding > summary,.markdown-alert-title > strong,.container-body > p,.container-body > p > a')].map(el=>{
      const bg=background(el), fg=over(rgb(getComputedStyle(el).color),bg);
      return {kind:el.className||el.tagName,text:el.textContent.slice(0,60),ratio:ratio(fg,bg)};
    });
    const boxes=Object.fromEntries(${JSON.stringify(names)}.map(name=>[name,snapshot(document.querySelector('#box-'+name))]));
    const nested=[...document.querySelectorAll('.content-box[id^="nested-"]')].map(el=>({id:el.id,name:el.dataset.color,...snapshot(el),mark:snapshot(el.querySelector('mark')),fold:snapshot(el.querySelector('summary'))}));
    const marks=Object.fromEntries(${JSON.stringify(names)}.map(name=>[name,snapshot(document.querySelector('#box-'+name+' mark'))]));
    const folds=Object.fromEntries(${JSON.stringify(names)}.map(name=>[name,snapshot(document.querySelector('#fold-'+name+' summary'))]));
    const bars=[...document.querySelectorAll('.markdown-alert')].map(el=>({type:[...el.classList].find(c=>c.startsWith('markdown-alert-')).replace('markdown-alert-',''),bar:getComputedStyle(el).borderInlineStartColor,title:getComputedStyle(el.querySelector('strong')).color,contrast:ratio(rgb(getComputedStyle(el).borderInlineStartColor),background(el))}));
    const tokens=Object.fromEntries(${JSON.stringify(names)}.map(name=>{const el=document.querySelector('#box-'+name);return [name,{accent:token(el,'accent'),text:token(el,'text')}]}));
    return {boxes,nested,marks,folds,bars,tokens,checks,min:Math.min(...checks.map(c=>c.ratio)),overflow:document.documentElement.scrollWidth>innerWidth};
  })()`;
  const modes = {};
  for (const mode of ['light','dark']) {
    await e(`document.documentElement.dataset.colorScheme='${mode}'`);
    await settle(); // Sample final colors, independently of background frame scheduling.
    const r = await e(probe);
    modes[mode]=r;
    assert(!r.overflow);
    assert(r.min >= 4.5, JSON.stringify(r.checks.filter(c=>c.ratio<4.5)));
    for (const child of r.nested) {
      assert.deepEqual({text:child.text,bg:child.bg,border:child.border},r.boxes[child.name],child.id);
      assert.deepEqual(child.mark,r.marks[child.name],child.id+' mark');
      assert.deepEqual(child.fold,r.folds[child.name],child.id+' fold');
    }
    for (const bar of r.bars) {
      assert.equal(bar.bar,r.tokens[alerts[bar.type]].accent);
      assert.equal(bar.title,r.tokens[alerts[bar.type]].text);
      assert(bar.contrast>=3,JSON.stringify(bar));
    }
    // Explicit/default neutral children must not inherit their colored parent.
    assert(await e(`Array.from(document.querySelectorAll('[id^="outer-"] > .container-body > .content-box:not([id])')).every(el=>getComputedStyle(el).backgroundColor===getComputedStyle(document.querySelector('#box-neutral')).backgroundColor)`));
    await e(`document.querySelector('#palette-grid').scrollIntoView({block:'start',behavior:'instant'})`);
    await b.screenshot('palette-'+mode);
    results.push(mode+': 81 cross-family nests, 50 alert bars, min sampled text contrast '+r.min.toFixed(2)+':1');
  }
  assert.notDeepEqual(modes.light.boxes,modes.dark.boxes);
  for (const preference of ['light','dark']) {
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:preference}]});
    await e(`document.documentElement.dataset.colorScheme='auto'`);
    await settle();
    assert.deepEqual((await e(probe)).boxes,modes[preference].boxes);
  }
  results.push('auto follows both OS preferences without palette JavaScript');
  await e(`document.documentElement.dataset.colorScheme='dark';document.querySelector('#fold-blue summary').focus()`);
  assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
  await b.key('Enter','Enter',13);
  assert(await e(`document.querySelector('#fold-blue').open`));
  await b.key('Enter','Enter',13);
  assert.equal(await e(`document.querySelector('#fold-blue').open`),false);
  for (const name of names) {
    await e(`document.querySelector('#fold-${name} summary').focus()`);
    await settle();
    assert((await e(probe)).min>=4.5, name+' focused summary contrast');
  }
  await v(390,844);
  await e(`document.querySelector('#palette-grid').scrollIntoView({block:'start',behavior:'instant'})`);
  assert.equal((await e(probe)).overflow,false);
  await b.screenshot('palette-mobile');
  results.push('mobile has no page overflow; keyboard disclosure and focus remain native');

  // Print roles must switch even when the reader selected dark. Background-free
  // output still has dark text, visible labels/borders and underlined marks.
  await v(1440,1200);
  await call('Emulation.setEmulatedMedia',{media:'print'});
  await e(`document.documentElement.dataset.colorScheme='dark'`);
  await settle();
  const print=await e(probe);
  for (const name of names) {
    assert.deepEqual(print.boxes[name],modes.light.boxes[name]);
    assert.deepEqual(print.marks[name],modes.light.marks[name]);
  }
  assert(await e(`Array.from(document.querySelectorAll('.content-mark')).every(el=>getComputedStyle(el).textDecorationLine.includes('underline'))`));
  // Recheck component text against white paper with all background paints omitted.
  await e(`window.paperStyle=document.createElement('style');paperStyle.textContent='* {background:transparent!important} html {background:white!important}';document.head.append(paperStyle)`);
  const paper=await e(probe);
  assert(paper.min>=4.5,JSON.stringify(paper.checks.filter(c=>c.ratio<4.5)));
  await e(`paperStyle.remove()`);
  results.push('print from dark selects light roles; no-background sampled text contrast '+paper.min.toFixed(2)+':1; marks retain underlines');
  await call('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  assert(await e(`Array.from(document.querySelectorAll('.content-mark')).every(el=>getComputedStyle(el).outlineStyle==='solid')`));
  assert(await e(`(() => {const el=document.createElement('span');el.style.color='CanvasText';document.body.append(el);const color=getComputedStyle(el).color;el.remove();return [...document.querySelectorAll('.content-box,.content-folding,.markdown-alert')].every(el=>getComputedStyle(el).borderInlineStartColor===color)})()`));
  results.push('forced-colors keeps explicit mark outlines and system-colored container borders');
  await call('Emulation.setEmulatedMedia',{features:[]});
  await n('/preview/zh/palette/');
  assert(await e(`document.querySelector('.markdown-alert-note').getAttribute('aria-label')==='说明'`));
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await n('/preview/palette/',false);
  await e(`document.documentElement.dataset.colorScheme='light'`);
  await settle();
  assert.deepEqual((await e(probe)).boxes,modes.light.boxes);
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  await n('/override/palette/');
  assert.equal(await e(`getComputedStyle(document.querySelector('#box-blue mark')).backgroundColor`),'rgb(171, 205, 239)');
  results.push('localized alerts, no-JS palette, site CSS token override');
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert(!b.requests.some(url=>url.startsWith('https://')),'Fixture should request only local resources');
  await writeFile(resolve(b.run,'palette-browser-results.json'),JSON.stringify({results,errors:b.errors},null,2)+'\n');
  console.log('PASS '+results.join('; '));
},{'/preview':'baseline-public','/override':'override-public'});
