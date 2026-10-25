// Native sidebar actions; local comments fixture only, never open the edit destination.
import assert from 'node:assert/strict';
import {runBrowser} from './browser.mjs';

await runBrowser(async b => {
  const {evaluate: e, navigate: n, viewport: v, call, key} = b;
  await call('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  const expected = 'https://github.com/example/site/blob/main/content/notes/plain';
  const showSidebar = async () => { await e(`(() => {
    const sidebar=document.querySelector('#right-region');
    if (sidebar.hasAttribute('popover') && !sidebar.matches(':popover-open')) document.querySelector('[data-region="right"]').click();
  })()`); await b.delay(300); };
  const settle = () => b.delay(120); // Also usable while script execution is disabled.
  const style = selector => e(`(() => {const a=document.querySelector(${JSON.stringify(selector)}),s=getComputedStyle(a);return {
    color:s.color, background:s.backgroundColor, shadow:s.boxShadow, font:s.fontSize, padding:s.padding,
    radius:s.borderRadius, gap:s.gap, icon:s.getPropertyValue('--icon-size'), decoration:s.textDecorationLine
  }})()`);
  const focus = async selector => {await e(`document.querySelector(${JSON.stringify(selector)}).focus()`);await settle();};
  const hover = async selector => {
    const point=await e(`(() => {document.activeElement.blur();const a=document.querySelector(${JSON.stringify(selector)});a.scrollIntoView({block:'nearest',behavior:'instant'});const r=a.getBoundingClientRect();return {x:r.x+20,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent', {type:'mouseMoved', ...point});await settle();
  };
  const clearInteraction = async () => {
    await call('Input.dispatchMouseEvent', {type:'mouseMoved',x:0,y:0});
    await e('document.activeElement.blur()');await settle();
  };
  // Matching action styles alone can miss all three accidentally being filled.
  const assertActionFills = async (active = '') => {
    for (const name of ['toc-top','toc-edit','toc-comments']) {
      const background=(await style('.'+name)).background;
      if(name===active) assert.notEqual(background,'rgba(0, 0, 0, 0)',name+' must highlight');
      else assert.equal(background,'rgba(0, 0, 0, 0)',name+' must rest transparent');
    }
  };
  for (const [width, mode, lang] of [[1440,'light',''],[1440,'dark',''],[1181,'dark',''],[1180,'dark',''],[320,'light','zh/'],[390,'dark','zh/']]) {
    await v(width,900);await n('/preview/'+lang+'published-name/');
    await e(`Sidera.setColorMode(${JSON.stringify(mode)})`);await settle();await showSidebar();await clearInteraction();
    await assertActionFills();
    assert.deepEqual(await e(`[...document.querySelector('.toc-footer').children].map(a=>a.className)`), ['toc-top','toc-edit','toc-comments']);
    assert.equal(await e(`document.querySelector('.toc-edit').href`),expected+(lang?'.zh':'')+'.md');
    assert.equal(await e(`document.querySelector('.toc-edit').textContent.trim()`),lang?'编辑本文':'Edit this article');
    assert.equal(await e(`document.querySelector('.toc-edit').target`),'_blank');
    assert.equal(await e(`document.querySelector('.toc-edit').rel`),'noopener noreferrer');
    assert.equal(await e(`document.querySelectorAll('.article-footer .toc-edit,.article-edit').length`),0);
    assert(await e(`(() => {const a=document.querySelector('.toc-edit').getBoundingClientRect(),top=document.querySelector('.toc-top').getBoundingClientRect();return a.width===top.width&&a.height>=40&&a.width>0&&document.documentElement.scrollWidth<=innerWidth})()`));
    assert.deepEqual(await style('.toc-edit'),await style('.toc-top'));
    assert.equal((await style('.toc-edit')).font,'16px');assert.equal((await style('.toc-edit')).icon.trim(),'16px');
    await focus('.toc-top');await key('Tab','Tab',9);
    assert(await e(`document.activeElement===document.querySelector('.toc-edit')`));
    const focused=await style('.toc-edit');await focus('.toc-top');
    assert.deepEqual(focused,await style('.toc-top'));await assertActionFills('toc-top');
    await focus('.toc-edit');await assertActionFills('toc-edit');
    assert.notEqual(await e(`getComputedStyle(document.activeElement).outlineStyle`),'none');
    const ax=await call('Accessibility.getFullAXTree');
    assert(ax.nodes.some(node=>node.role?.value==='link'&&node.name?.value===(lang?'编辑本文':'Edit this article')));
    await key('Tab','Tab',9);
    assert(await e(`document.activeElement===document.querySelector('.toc-comments')`));
    await assertActionFills('toc-comments');
    await hover('.toc-top');const top=await style('.toc-top');await assertActionFills('toc-top');
    for(const name of ['toc-edit','toc-comments']){
      await hover('.'+name);assert.deepEqual(await style('.'+name),top);await assertActionFills(name);
    }
    await clearInteraction();await assertActionFills();
    // Collapsing the heading list does not hide page actions.
    await e(`document.querySelector('.article-toc').open=false`);
    assert(await e(`document.querySelector('.toc-edit').getBoundingClientRect().height>0`));
    await focus('.toc-comments');await key('Enter','Enter',13);await b.delay(100);
    assert.equal(await e('location.hash'),'#sidera-comments');
  }
  await v(1440,900);await n('/preview/notes/instance/');
  assert.equal(await e(`document.querySelectorAll('.toc-edit').length`),2);
  assert.equal(await e(`document.querySelectorAll('[data-instance="right-toc-2"] .toc-edit').length`),0);
  assert(await e(`(() => {const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size})()`));
  for(const lang of ['', 'zh/']){
    for(const page of ['edit-only','edit-only-empty','hidden','nohead']){
      await n('/preview/'+lang+'notes/'+page+'/');
      assert(await e(`!!document.querySelector('.toc-edit')&&!document.querySelector('.toc-comments')`));
      if(page==='nohead'){
        assert.equal(await e(`document.querySelectorAll('.article-toc').length`),0);
        assert.deepEqual(await e(`[...document.querySelector('.toc-footer').children].map(a=>a.className)`),['toc-top','toc-edit']);
      }
    }
    await n('/preview/'+lang+'notes/nohead-none/');
    assert.equal(await e(`document.querySelectorAll('.toc-footer,#right-region,[data-region="right"]').length`),0);
    await n('/preview/'+lang+'notes/comments-only/');
    assert.deepEqual(await e(`[...document.querySelector('.toc-footer').children].map(a=>a.className)`),['toc-top','toc-comments']);
    await v(390,900);await n('/_text/'+lang+'published-name/');await showSidebar();
    assert.equal(await e(`document.querySelectorAll('.toc-edit svg').length`),0);
    assert.equal(await e(`document.querySelector('.toc-edit').textContent.trim()`),lang?'编辑本文':'Edit this article');
    assert(await e(`document.documentElement.scrollWidth<=innerWidth`));
    await v(1440,900);
  }
  // Without scripts the sidebar remains native, not an inaccessible drawer.
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await v(390,900);await n('/preview/published-name/',false);
  await clearInteraction();await assertActionFills();
  await focus('.toc-top');await key('Tab','Tab',9);
  assert(await e(`document.activeElement===document.querySelector('.toc-edit')&&document.activeElement.getBoundingClientRect().height>0`));
  assert.equal(await e(`document.querySelector('.toc-edit').href`),expected+'.md');
  await assertActionFills('toc-edit');
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'},{name:'forced-colors',value:'active'}]});
  assert.notEqual(await e(`getComputedStyle(document.querySelector('.toc-edit')).outlineStyle`),'none');
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await v(1440,900);await n('/preview/published-name/');await e(`Sidera.setColorMode('light')`);await settle();
  await hover('.toc-top');await b.screenshot('edit-sidebar-light');
  await v(390,900);await n('/preview/published-name/');await e(`Sidera.setColorMode('dark')`);await settle();await showSidebar();
  await hover('.toc-top');await b.screenshot('edit-sidebar-dark-mobile');
  assert.equal(b.errors.length,0,JSON.stringify(b.errors));
  assert(b.requests.every(url=>url.startsWith(b.origin+'/')),JSON.stringify(b.requests));
  console.log('PASS sidebar edit: action order, native URLs, TOC style parity and isolated resting/hover/focus fills across the drawer breakpoint, drawer/EN/ZH/light/dark, keyboard/AX, no headings/comments/authors/sharing, repeats/icons-off/no-JS/forced-colors and no footer duplicate');
},{'/preview':'baseline-public','/_text':'icons-off-public'});
