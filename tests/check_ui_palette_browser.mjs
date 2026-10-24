// Actual theme UI selectors; same isolated fixture as check_palette.py.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';

await runBrowser(async b=>{
  const {evaluate:e,call,navigate:n,viewport:v,delay}=b;
  await v(1280,1200);await n('/preview/ui-palette/');
  const probe=`(()=>{
    const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
    const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].map(v=>v/255)};
    const over=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
    const bg=el=>el?over(rgba(getComputedStyle(el).backgroundColor),bg(el.parentElement)):[1,1,1,1];
    const lum=c=>c.slice(0,3).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const role=(name,el=document.documentElement)=>{const p=document.createElement('span');p.style.color='var('+name+')';el.append(p);const c=getComputedStyle(p).color;p.remove();return c};
    const elements=[...document.querySelectorAll('.ui-plane .ai-label,.ui-plane .ui-link,.ui-plane .pin-label,.ui-plane .jsx-error,.ui-plane .search-keyword,.ui-plane .search-body-mark,.ui-plane .search-button,.ui-plane .heading-anchor,.ui-plane .chroma .k,.ui-plane .chroma .s')];
    const samples=elements.map(el=>{const back=bg(el);return {plane:el.closest('.ui-plane').dataset.plane,label:el.textContent,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,ratio:ratio(over(rgba(getComputedStyle(el).color),back),back)}});
    const expected={manual:role('--palette-blue-text'),reviewed:role('--palette-green-text'),polished:role('--palette-green-text'),generated:role('--palette-orange-text')};
    const colors=Object.fromEntries(['--accent','--link','--pin','--danger','--code-keyword','--code-literal','--palette-yellow-text','--palette-yellow-highlight'].map(name=>[name,role(name)]));
    return {samples,expected,colors,min:Math.min(...samples.map(s=>s.ratio)),overflow:document.documentElement.scrollWidth>innerWidth,labels:[...document.querySelectorAll('.ai-label')].map(el=>({kind:el.dataset.aiLabel,color:getComputedStyle(el).color})),fixed:role('--link',document.querySelector('#fixed-light-probe'))};
  })()`;
  const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const animation of document.getAnimations()){if(animation.effect.getComputedTiming().endTime!==Infinity)animation.finish();}})()`);
  const results=[];const snapshots={};
  for(const mode of ['light','dark']){
    await e(`document.documentElement.dataset.colorScheme='${mode}'`);await settle();
    const r=await e(probe);snapshots[mode]=r;
    assert(!r.overflow);assert(r.min>=4.5,JSON.stringify(r.samples.filter(s=>s.ratio<4.5)));
    for(const label of r.labels)assert.equal(label.color,r.expected[label.kind]);
    for(const s of r.samples){
      const token={'A useful link':'--link','Pinned':'--pin','Error message':'--danger','Search keyword':'--palette-yellow-text','Loading':'--accent','Search error':'--danger','const':'--code-keyword','"Independent syntax colors"':'--code-literal'}[s.label];
      if(token)assert.equal(s.color,r.colors[token],s.label);
      if(s.label==='Matched body text')assert.equal(s.background,r.colors['--palette-yellow-highlight']);
    }
    // Real hover, checked after the existing color/background transition.
    for(const selector of ['.ui-plane .heading-anchor','.ui-plane .social-link']){
      const point=await e(`(()=>{const el=document.querySelector('${selector}');el.scrollIntoView({block:'center',behavior:'instant'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await settle();
      const hover=await e(probe);assert(hover.min>=4.5,JSON.stringify(hover.samples.filter(s=>s.ratio<4.5)));
      if(selector.includes('social'))assert.equal(await e(`getComputedStyle(document.querySelector('${selector}')).color`),r.colors['--accent']);
      else assert.notEqual(hover.samples.find(s=>s.label==='#').background,r.samples.find(s=>s.label==='#').background);
    }
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await settle();
    await e(`window.scrollTo({top:0,behavior:'instant'})`);await b.screenshot('ui-palette-'+mode);
    results.push(mode+': '+r.samples.length+' foreground/background pairs on four shell surfaces; minimum '+r.min.toFixed(2)+':1; hover and filled-label contrast');
  }
  assert.equal(snapshots.dark.fixed,snapshots.light.fixed,'Explicit inversion chrome remains fixed-light');
  for(const mode of ['light','dark']){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode}]});
    await e(`document.documentElement.dataset.colorScheme='auto'`);await settle();
    assert.deepEqual((await e(probe)).colors,snapshots[mode].colors);
  }
  // Pinned labels no longer control error or syntax colors.
  await e(`document.documentElement.style.setProperty('--pin','#663399')`);
  const independent=await e(probe);
  assert.equal(independent.colors['--danger'],snapshots.dark.colors['--danger']);
  assert.equal(independent.colors['--code-literal'],snapshots.dark.colors['--code-literal']);
  await e(`document.documentElement.style.removeProperty('--pin')`);
  await v(390,844);assert(!(await e(probe)).overflow);
  await e(`window.scrollTo({top:0,behavior:'instant'})`);await b.screenshot('ui-palette-mobile');
  await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/preview/ui-palette/',false);
  assert.deepEqual((await e(probe)).colors,snapshots.dark.colors);
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  results.push('auto in both modes, no-JS, fixed-light inversion chrome, independent semantic overrides, mobile');
  await writeFile(resolve(b.run,'ui-palette-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS '+results.join('; '));
},{'/preview':'baseline-public'});
