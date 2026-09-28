// Dependency-free unit checks against the shipped matcher, not a second engine.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../themes/sidera/assets/js/search-core.js',import.meta.url),'utf8')+'\nthis.engine=SideraSearch;',context);
const s=context.engine, plain=x=>JSON.parse(JSON.stringify(x));
assert.deepEqual(plain(s.tokens(' CAFÉ cafe\u0301 连接笔记 a+b[0] ')),['cafe','连接笔记','a+b[0]']);
assert.deepEqual(plain(s.matches('😀 café cafe\u0301',s.tokens('cafe'))),[[3,7],[8,13]]);
assert.deepEqual(plain(s.matches('a+b[0] .*(x)',s.tokens('a+b[0]'))),[[0,6]]);
assert.deepEqual(plain(s.matches('<img src=x onerror=alert(1)>',s.tokens('<img src=x'))),[[0,4],[5,10]]);
assert.deepEqual(plain(s.matches('abcdef',s.tokens('abc bcd def'))),[[0,6]]);
assert.equal(s.tokens('a b c d e f g h i').length,8);
assert.equal(s.tokens(' ').length,0);
const docs=[
 {url:'/native/date/',title:'Shared title',scope:'/notes/',context:'Notes',sections:[{id:'',title:'',text:'😀 intro'},{id:'native-id',title:'A café',text:'A café 连接笔记 repeated needle'}]},
 {url:'/custom/',title:'Needle title',scope:'/notes/nested/',context:'Independent',sections:[{id:'',title:'',text:'independent needle'}]}
];
assert.equal(s.search(docs,'needle','/notes/').length,1);
assert.equal(s.search(docs,'needle','').length,2);
assert.equal(s.search(docs,'cafe 连接','/notes/')[0].section.id,'native-id');
assert.equal(s.search(docs,'cafe not-present','').length,0);
assert.equal(s.search(docs,'Shared title','')[0].section,null);
assert.equal(s.search(docs,'needle','/notes/')[0].offset,'😀 intro'.length+1);
assert.equal(s.search(Array.from({length:60},(_,i)=>({...docs[0],url:`/${i}/`})),'needle','').length,40);
console.log('PASS literal/hostile-looking punctuation, English/CJK/diacritics, combining and non-BMP offsets, AND/rank/title fallback/scope/result bounds');
