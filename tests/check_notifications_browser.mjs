// Site-level toast lifecycle and color-mode feedback; isolated installed Chrome only.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const message=()=>e(`document.querySelector('#sidera-toast').textContent`);
 const hidden=()=>e(`document.querySelector('#sidera-toast').hidden`);
 await v(1440,960);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await n('/journal/');
 assert(await hidden());await e(`Sidera.setAppearance('light')`);assert(await hidden(),'programmatic setter stays silent');
 await e(`document.querySelector('[data-appearance-cycle]').focus()`);await key('Enter','Enter',13);
 assert.equal(await e(`document.documentElement.dataset.appearanceMode`),'auto');
 assert.equal(await message(),'Following system color mode.');
 await delay(80);
 const early=await e(`document.querySelector('#sidera-toast').getBoundingClientRect().top`);
 assert(early<32,'toast enters from above');await delay(500);
 const resting=await e(`(()=>{const t=document.querySelector('#sidera-toast'),r=t.getBoundingClientRect();return{top:r.top,center:r.x+r.width/2,opacity:getComputedStyle(t).opacity,pointer:getComputedStyle(t).pointerEvents}})()`);
 assert(Math.abs(resting.top-32)<1);assert(Math.abs(resting.center-(await e('document.documentElement.clientWidth'))/2)<1);assert.equal(resting.opacity,'1');assert.equal(resting.pointer,'none');
 assert(await e(`document.activeElement.matches('[data-appearance-cycle]')`),'notification must not steal focus');
 const ax=await call('Accessibility.getFullAXTree');assert(ax.nodes.some(n=>n.role?.value==='status'&&n.properties?.some(p=>p.name==='live'&&p.value.value==='polite')));
 await b.screenshot('color-mode-notice');
 await delay(1000);assert(!(await hidden()),'message must dwell, not flash');await delay(1600);assert(await hidden());
 assert.equal(await e(`document.querySelector('#sidera-toast-status').textContent`),'');
 // Plain text, rapid replacement and stale timer cancellation: no injected HTML or stacked notices.
 await e(`Sidera.toast('<img src=x onerror=alert(1)>',80)`);assert.equal(await e(`document.querySelector('#sidera-toast img')`),null);
 await delay(650);await e(`Sidera.toast('Latest message',400)`);await delay(500);assert.equal(await message(),'Latest message');assert(!(await hidden()));
 await delay(1000);assert(await hidden());assert.equal(await e(`document.querySelectorAll('#sidera-toast').length`),1);
 // OS/storage changes apply a palette without producing unsolicited announcements.
 await e(`Sidera.setAppearance('auto')`);await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});await delay(80);assert(await hidden());
 // Notifications are above a mobile top-layer drawer, without dismissing it or blocking input.
 await v(390,844);await n('/_chinese/about/');await e(`Sidera.setAppearance('dark');document.querySelector('[data-region="left"]').click()`);await delay(430);
 await e(`document.querySelector('[data-appearance-cycle]').focus()`);await key('Enter','Enter',13);await delay(550);
 assert.equal(await message(),'已切换到浅色配色。');
 assert(await e(`document.querySelector('#left-region').matches(':popover-open') && document.querySelector('#sidera-toast').matches(':popover-open')`));
 assert(await e(`(()=>{const r=document.querySelector('#sidera-toast').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()`));
 assert(await e(`document.activeElement.matches('[data-appearance-cycle]')`));
 await e(`Sidera.cycleAppearance()`);assert.equal(await message(),'已切换到跟随系统配色。');await e(`Sidera.cycleAppearance()`);assert.equal(await message(),'已切换到深色配色。');
 // Reduced motion retains the announcement/dwell but removes the travel and transition.
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await e(`Sidera.toast('Reduced motion',150)`);await delay(50);
 assert.equal(await e(`getComputedStyle(document.querySelector('#sidera-toast')).transitionDuration`),'0s');
 assert.equal(await e(`document.querySelector('#sidera-toast').getBoundingClientRect().top`),32);await delay(180);assert(await hidden());
 await call('Emulation.setScriptExecutionDisabled',{value:true});await n('/about/',false);assert(await hidden());
 assert.equal(await e(`document.querySelector('#sidera-toast-status').textContent`),'');await call('Emulation.setScriptExecutionDisabled',{value:false});
 assert.equal(b.errors.length,0,JSON.stringify(b.errors));assert(b.requests.every(u=>u.startsWith(b.origin+'/')));
 await writeFile(resolve(b.run,'notification-results.json'),JSON.stringify({checks:['source-like enter/dwell/exit','latest message and stale timers','text-only safety','localized cycle messages','silent initialization/system/setter','polite status/no focus theft','mobile top layer','reduced motion/no JS'],browser:b.version.Browser},null,2));
 console.log('PASS site notification lifecycle and localized color-mode feedback');
},{'/_chinese':'chinese-public'});
