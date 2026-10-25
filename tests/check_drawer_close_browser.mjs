// Local edit-URL fixtures supply both regions, EN/ZH and real icons-off rendering.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b => {
  const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
  const wait=async expression=>{for(let i=0;i<100;i++){if(await e(expression))return;await delay(30);}assert.fail(expression);};
  const idle=async()=>{await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:0,y:0});await e('document.activeElement.blur()');await delay(120);};
  const point=selector=>e(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const click=async selector=>{const p=await point(selector);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});};
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const width of [320,390])for(const mode of ['light','dark'])for(const lang of ['','zh/']){
    await v(width,900);await n('/preview/'+lang+'published-name/');await e(`Sidera.setColorMode('${mode}')`);
    for(const region of ['left','right']){
      const drawer='#'+region+'-region',close=drawer+' .drawer-close',toggle='[data-region="'+region+'"]';
      const label=lang?'关闭导航':'Close navigation';
      await e(`document.querySelector('${toggle}').focus()`);await key('Enter','Enter',13);
      await wait(`document.querySelector('${drawer}').matches(':popover-open')`);await idle();
      const state=await e(`(()=>{const b=document.querySelector('${close}'),s=getComputedStyle(b),r=b.getBoundingClientRect(),icon=b.querySelector('svg');return {label:b.getAttribute('aria-label'),title:b.title,text:b.textContent.trim(),target:b.getAttribute('popovertarget'),action:b.getAttribute('popovertargetaction'),bg:s.backgroundColor,width:Math.round(r.width*100)/100,height:Math.round(r.height*100)/100,iconWidth:Math.round(icon.getBoundingClientRect().width*100)/100,hidden:icon.getAttribute('aria-hidden'),focusable:icon.getAttribute('focusable')}})()`);
      assert.deepEqual(state,{label,title:label,text:'',target:region+'-region',action:'hide',bg:'rgba(0, 0, 0, 0)',width:44,height:44,iconWidth:20,hidden:'true',focusable:'false'});
      const ax=await call('Accessibility.getFullAXTree');
      assert(ax.nodes.some(x=>x.role?.value==='button'&&x.name?.value===label));
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',...await point(close)});await delay(120);
      assert.notEqual(await e(`getComputedStyle(document.querySelector('${close}')).backgroundColor`),state.bg);
      await idle();await key('Tab','Tab',9);await e(`document.querySelector('${close}').focus()`);
      assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
      await key('Enter','Enter',13);await wait(`!document.querySelector('${drawer}').matches(':popover-open')`);
      assert(await e(`document.activeElement===document.querySelector('${toggle}')`),'Native close returns focus to its invoker');
      await key('Enter','Enter',13);await wait(`document.querySelector('${drawer}').matches(':popover-open')`);
      await key('Escape','Escape',27);await wait(`!document.querySelector('${drawer}').matches(':popover-open')`);
      await click(toggle);await wait(`document.querySelector('${drawer}').matches(':popover-open')`);await idle();
      if(width===390&&!lang){await delay(400);await b.screenshot('drawer-'+region+'-'+mode);}
      await click(close);await wait(`!document.querySelector('${drawer}').matches(':popover-open')`);
      await wait(`document.querySelector('${toggle}').getAttribute('aria-expanded')==='false'`);
      assert(await e('document.documentElement.scrollWidth<=innerWidth'));
    }
  }
  // Icon opt-out is not an unnamed or invisible operation, in either region.
  for(const lang of ['','zh/']){
    await n('/_text/'+lang+'published-name/');
    for(const region of ['left','right']){
      const drawer='#'+region+'-region',close=drawer+' .drawer-close';
      await click('[data-region="'+region+'"]');await wait(`document.querySelector('${drawer}').matches(':popover-open')`);await idle();
      assert(await e(`(()=>{const b=document.querySelector('${close}'),r=b.getBoundingClientRect();return !b.querySelector('svg')&&b.textContent.trim()===${JSON.stringify(lang?'关闭导航':'Close navigation')}&&b.title===b.textContent.trim()&&r.width>=44&&r.height>=44&&b.scrollWidth<=b.clientWidth})()`));
      await click(close);await wait(`!document.querySelector('${drawer}').matches(':popover-open')`);
    }
  }
  await v(1440,900);await n('/preview/published-name/');
  assert(await e(`[...document.querySelectorAll('.drawer-close')].every(b=>!b.getClientRects().length)`));
  await v(390,900);await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/preview/published-name/',false);
  assert(await e(`[...document.querySelectorAll('.drawer-close')].every(b=>!b.getClientRects().length)&&[...document.querySelectorAll('.region-drawer')].every(r=>r.getClientRects().length)`));
  await call('Emulation.setScriptExecutionDisabled',{value:false});await n('/preview/published-name/');
  await click('[data-region="right"]');await wait(`document.querySelector('#right-region').matches(':popover-open')`);
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'forced-colors',value:'active'}]});
  await key('Tab','Tab',9);await e(`document.querySelector('#right-region .drawer-close').focus()`);
  assert.notEqual(await e('getComputedStyle(document.activeElement).outlineStyle'),'none');
  await key('Enter','Enter',13);await wait(`!document.querySelector('#right-region').matches(':popover-open')`);
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(url=>url.startsWith(b.origin+'/')));
  console.log('PASS drawer close: both regions, transparent 44px icon controls, localized tooltip/AX name, hover/focus, native Enter/Escape/click and focus return, 320/390px/light/dark/EN/ZH, icons-off, desktop/no-JS and forced colors');
},{'/preview':'drawers-public','/_text':'icons-off-public'});
