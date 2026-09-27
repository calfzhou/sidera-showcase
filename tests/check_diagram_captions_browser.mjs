// Caption placement/centering only; existing isolated harness blocks external calls.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';
await runBrowser(async b=>{
 const {evaluate:e,navigate:n,viewport:v,call,key,delay}=b;
 const wait=async x=>{for(let i=0;i<400;i++){if(await e(x))return;await delay(50);}assert.fail(x)};
 await v(1440,960);await n('/handbook/reference/diagrams/');
 await e(`document.querySelector('[data-sidera-diagram="drawio"]').scrollIntoView({behavior:'instant',block:'center'})`);
 await wait(`document.querySelector('[data-sidera-diagram="drawio"]').dataset.state==='ready'`);
 assert(await e(`(()=>{const f=document.querySelector('[data-sidera-diagram="drawio"]'),c=f.querySelector('figcaption'),v=f.querySelector('.diagram-view'),i=v.querySelector('img'),a=v.getBoundingClientRect(),r=i.getBoundingClientRect();return f.lastElementChild===c&&c.getBoundingClientRect().top>=f.querySelector('.diagram-canvas').getBoundingClientRect().bottom&&getComputedStyle(c).textAlign==='center'&&Math.abs((r.left+r.right-a.left-a.right)/2)<2})()`));
 // Popup caption is below the canvas, not a title above it.
 await e(`document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="expand"]').click()`);await delay(100);
 assert(await e(`(()=>{const d=document.querySelector('dialog'),c=d.querySelector('.diagram-dialog-caption'),v=d.querySelector('.diagram-canvas');return d.open&&!c.hidden&&getComputedStyle(c).textAlign==='center'&&c.getBoundingClientRect().top>=v.getBoundingClientRect().bottom})()`));
 await key('Escape','Escape',27);await delay(100);
 // Centering must not make an oversized image's left edge unreachable.
 await e(`document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="in"]').click();document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="in"]').click();document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="in"]').click()`);
 assert(await e(`(()=>{const v=document.querySelector('[data-sidera-diagram="drawio"] .diagram-view'),i=v.querySelector('img');v.scrollLeft=0;return v.scrollWidth>v.clientWidth&&i.getBoundingClientRect().left>=v.getBoundingClientRect().left-1})()`));
 await e(`document.querySelector('[data-sidera-diagram="drawio"] [data-diagram-action="fit"]').click()`);
 await b.screenshot('caption-centered');
 // Verify what the URL actually contains, not a guess based on its blob: spelling.
 const svg=await e(`fetch(document.querySelector('[data-sidera-diagram="drawio"] img').src).then(async r=>({type:r.headers.get('content-type'),svg:(await r.text()).includes('<svg')}))`);
 assert(svg.svg&&svg.type.startsWith('image/svg+xml'));
 await v(390,850);await e(`Sidera.setColorMode('dark')`);await delay(200);
 assert(await e(`getComputedStyle(document.querySelector('[data-sidera-diagram="drawio"] figcaption')).textAlign==='center'`));
 assert(await e('document.documentElement.scrollWidth<=innerWidth'));
 assert.equal(b.errors.length,0);
 console.log('PASS below/center captions and centered inline SVG; modal caption; oversized pan; mobile; Blob MIME is image/svg+xml');
});
