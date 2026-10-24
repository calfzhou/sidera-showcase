// Production showcase; own browser/profile. No user session or external services.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {runBrowser} from './browser.mjs';

await runBrowser(async b=>{
  const {evaluate:e,call,viewport:v,delay}=b;
  await v(1440,960);await b.navigate('/sidera-showcase/sidera/authoring/');
  const read=`(()=>{const ring=getComputedStyle(document.querySelector('.identity-avatar'),'::before'),line=getComputedStyle(document.querySelector('.search-form'),'::after');const pick=s=>({background:s.backgroundImage,colors:s.backgroundImage.match(/rgb\\([^)]+\\)/g),animation:s.animationName,duration:s.animationDuration,state:s.animationPlayState,opacity:Number(s.opacity),transform:s.transform,position:s.backgroundPositionX,height:s.height,mask:s.maskImage});return {ring:pick(ring),line:pick(line)}})()`;
  const wait=async expression=>{for(let i=0;i<100;i++){if(await e(expression))return;await delay(50)}assert.fail(expression)};
  const settle=()=>e(`(()=>{getComputedStyle(document.body).color;for(const a of document.getAnimations())if(a.effect.getComputedTiming().endTime!==Infinity)a.finish()})()`);
  async function activate(){
    await b.key('Tab','Tab',9);
    await e(`document.querySelector('.identity-avatar').focus()`);
    assert(await e(`document.querySelector('.identity-avatar').matches(':focus-visible')`));
    const point=await e(`(()=>{const r=document.querySelector('.search-form').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await settle();
  }
  const results=[],snapshots={};
  const original='#04f3ff,#08ffc6,#ddf730,#ffbd19,#ff1fe0,#c418ff,#3b5bff,#04f3ff';
  for(const mode of ['light','dark']){
    await e(`Sidera.setColorMode('${mode}')`);await activate();
    const active=await e(read);snapshots[mode]=active;
    assert(active.ring.background.startsWith('conic-gradient('));assert(active.line.background.startsWith('linear-gradient('));
    assert.deepEqual(active.ring.colors,active.line.colors);assert.equal(active.ring.colors.length,8);assert.equal(active.ring.colors[0],active.ring.colors[7]);
    assert.equal(active.ring.duration,'4s');assert.equal(active.line.duration,'20s');
    assert.equal(active.ring.animation,'identity-spin');assert.equal(active.line.animation,'sidera-search-glow');
    assert.equal(active.ring.state,'running');assert.equal(active.line.state,'running');
    assert.equal(active.ring.opacity,1);assert.equal(active.line.opacity,1);assert.equal(active.line.height,'2px');
    assert(active.ring.mask.includes('2px'));
    await wait(`getComputedStyle(document.querySelector('.search-form'),'::after').backgroundPositionX!==${JSON.stringify(active.line.position)}`);
    await wait(`getComputedStyle(document.querySelector('.identity-avatar'),'::before').transform!==${JSON.stringify(active.ring.transform)}`);
    // Reproducible previews: reduced motion freezes only the existing animations.
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await settle();
    const still=await e(read);assert.equal(still.ring.animation,'none');assert.equal(still.line.animation,'none');
    assert.deepEqual(still.ring.colors,active.ring.colors);
    // Show the decorative ring without the separate keyboard-focus outline.
    await e(`document.querySelector('#search-input').focus()`);
    const avatarPoint=await e(`(()=>{const r=document.querySelector('.identity-avatar').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...avatarPoint});await settle();
    assert(await e(`document.querySelector('.identity-avatar').matches(':hover')`));
    await b.screenshot('rainbow-'+mode);
    const clip=await e(`(()=>{const r=document.querySelector('.site-heading').getBoundingClientRect(),s=document.querySelector('.search-form').getBoundingClientRect();return {x:Math.floor(r.x-8),y:Math.floor(r.y-8),width:Math.ceil(s.right-r.x+16),height:Math.ceil(s.bottom-r.y+24),scale:2}})()`);
    const capture=async suffix=>{const image=await call('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});await writeFile(resolve(b.run,'rainbow-'+mode+'-'+suffix+'.png'),Buffer.from(image.data,'base64'))};
    await capture('after');
    await e(`document.documentElement.style.setProperty('--decorative-spectrum',${JSON.stringify(original)})`);
    assert.deepEqual((await e(read)).ring.colors,(await e(read)).line.colors);
    await capture('before');
    await e(`document.documentElement.style.removeProperty('--decorative-spectrum')`);
    await call('Emulation.setEmulatedMedia',{features:[]});
    results.push(mode+': shared eight stops; 2px geometry, opacity, 4s/20s motion and reduced-motion behavior preserved');
  }
  assert.notDeepEqual(snapshots.light.ring.colors,snapshots.dark.ring.colors);
  // Native CSS auto works even before the JS mode controller resolves it.
  for(const mode of ['light','dark']){
    await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:mode}]});
    await e(`document.documentElement.dataset.colorScheme='auto'`);await settle();
    assert.deepEqual((await e(read)).ring.colors,snapshots[mode].ring.colors);
  }
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:850});
  await e(`document.activeElement.blur()`);await settle();
  const idle=await e(read);assert.equal(idle.ring.opacity,0);assert.equal(idle.line.opacity,0);assert.equal(idle.line.state,'paused');
  await v(390,844);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await wait(`document.querySelector('#left-region').getAttribute('popover')==='auto'`);
  if(!await e(`document.querySelector('#left-region').matches(':popover-open')`))await e(`document.querySelector('[data-region="left"]').click()`);
  await wait(`document.querySelector('#left-region').matches(':popover-open')`);
  await e(`document.querySelector('#search-input').focus()`);await settle();
  assert.equal((await e(read)).line.opacity,1);assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
  await call('Emulation.setScriptExecutionDisabled',{value:true});await b.navigate('/sidera-showcase/sidera/authoring/',false);
  await e(`document.documentElement.dataset.colorScheme='light'`);
  assert.deepEqual((await e(read)).ring.colors,snapshots.light.ring.colors);
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  results.push('auto, shared custom override, idle state, mobile keyboard focus, no-JS');
  await writeFile(resolve(b.run,'rainbow-results.json'),JSON.stringify(results,null,2)+'\n');
  console.log('PASS '+results.join('; '));
},{'/sidera-showcase':resolve(process.argv[3]||resolve(process.argv[2],'public'))});
