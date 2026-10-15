// Pure logic regressions: no DOM, network, user serials or external checkout needed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { calendarTrace, daysInMonth, isLeapYear, paperSelection, paperPath, paperMonths, centuryRows, yearRows } from '../content/handbook/reference/legacy-tools/calendar.js';
import { translateNumber } from '../content/handbook/reference/legacy-tools/number-chinese.js';
import { kindlePassword } from '../content/handbook/reference/legacy-tools/kindle.js';
import md5 from '../content/handbook/reference/legacy-tools/vendor/md5.js';
const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
let checked = 0;
for (let year = 1800; year < 2200; year++) {
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const expected = new Date(0); expected.setUTCFullYear(year, month - 1, day);
      assert.equal(calendarTrace(year, month, day).weekday, names[expected.getUTCDay()], `${year}-${month}-${day}`);
      assert.equal(paperPath(paperSelection({year,month,day})).weekday, names[expected.getUTCDay()]);
      checked++;
    }
  }
}
for (const [year, month, day] of [[1,1,1],[4,2,29],[96,12,31],[99,1,1],[100,3,1],[400,2,29],[1582,10,15],[9999,12,31]]) {
  const expected = new Date(0); expected.setUTCFullYear(year, month - 1, day);
  assert.equal(calendarTrace(year, month, day).weekday, names[expected.getUTCDay()]);
  assert.equal(paperPath(paperSelection({year,month,day})).weekday, names[expected.getUTCDay()]);
}
assert.equal(calendarTrace(2011,8,10).weekday,'Wednesday');
assert.equal('ABCDEFG'[calendarTrace(2011,8,10).letter],'F');
assert(!isLeapYear(1900));assert(isLeapYear(2000));assert(!isLeapYear(2100));
for (const args of [[0,1,1],[10000,1,1],[2024,0,1],[2024,13,1],[2024,4,31],[1900,2,29],[2024,2,0],[2024,2,1.5]]) assert.throws(()=>calendarTrace(...args),RangeError);
const selected = paperSelection({year:2011,month:8,day:10});
const trace = paperPath(selected);
assert.deepEqual([...trace.junctions], ['20:10','21:4','28:4']);
for (let row=2;row<=20;row++) assert(trace.path.has(`${row}:10`));
for (let col=3;col<=10;col++) assert(trace.path.has(`20:${col}`));
for (let col=4;col<=12;col++) assert(trace.path.has(`21:${col}`));
for (let row=21;row<=28;row++) assert(trace.path.has(`${row}:4`));
for (let col=4;col<=12;col++) assert(trace.path.has(`28:${col}`));
const empty = {century:null,ending:null,month:null,day:null};
assert.equal(paperPath(empty).path.size,0);
assert.equal(paperPath({...empty,ending:0}).weekday,null);
assert(paperPath({...selected,month:paperMonths.find(cell=>cell.key==='2'),day:31}).warning.includes('28 days'));
const leap = paperSelection({year:2000,month:2,day:29});
assert.equal(leap.month.key,'2-prime');
assert(paperPath({...leap,century:centuryRows.flat().find(cell=>cell.value===19)}).warning.includes('unprimed'));
assert(paperPath({...leap,month:paperMonths.find(cell=>cell.key==='2')}).warning.includes('leap month'));
assert.equal(centuryRows.flat().filter(c=>c.value!==null).length,8);
assert.deepEqual(yearRows.flat().filter(x=>x!==null),Array.from({length:100},(_,i)=>i));
for (let year=0;year<100;year++) {
  const slot = year + Math.floor(year / 4);
  assert.equal(yearRows[Math.floor(slot/7)][slot%7],year);
}
const numbers = {
  '': '', '0':'零', '-0':'零', '0000':'零', '-000':'零', '10':'十', '11':'十一', '20':'二十',
  '101':'一百零一', '1010':'一千零一十', '10000':'一万', '10001':'一万零一',
  '10010':'一万零一十', '100000001':'一亿零一', '-00012':'负十二',
  '123456789':'一亿二千三百四十五万六千七百八十九',
  '9007199254740993':'九千零七兆一千九百九十二亿五千四百七十四万零九百九十三',
};
for (const [number,expected] of Object.entries(numbers)) assert.equal(translateNumber(number),expected,number);
assert.equal(translateNumber(' 123 '),'一百二十三');
assert.equal(translateNumber('1'+'0'.repeat(48)),'一極');
assert.equal(translateNumber('1'+'0'.repeat(51)),'一千極');
assert.equal(translateNumber('-'+'9'.repeat(52)), '负'+translateNumber('9'.repeat(52)));
assert(!translateNumber('9'.repeat(52)).includes('undefined'));
for(const invalid of ['-','+1','1.2','1e3','NaN','一百','12 34','9'.repeat(53)]) assert.throws(()=>translateNumber(invalid),RangeError,invalid);
for(const input of ['', 'abc', 'message digest', '你好 👋', 'a'.repeat(1000)]) {
  assert.equal(md5(input), createHash('md5').update(input).digest('hex'));
}
for(const serial of ['B012345678901234','b012 3456\n7890 1234', 'ABC', '12345']) {
  const expected = 'fiona'+createHash('md5').update(serial.toUpperCase().replace(/\s+/g,'')+'\n').digest('hex').slice(7,11);
  assert.equal(kindlePassword(serial),expected);
}
assert.equal(kindlePassword(' \n '),'');
assert.throws(()=>kindlePassword('not-a-serial'),RangeError);
assert.throws(()=>kindlePassword('a'.repeat(129)),RangeError);
const vendor = new URL('../content/handbook/reference/legacy-tools/vendor/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('md5-provenance.json',vendor),'utf8'));
for(const [name,hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(new URL(name,vendor))).digest('hex'),hash);
console.log(`PASS legacy tools: ${checked} Gregorian dates, lookup alignment, leap/invalid dates, Chinese reading and 52-digit limits, MD5 vectors, Kindle normalization and dependency provenance`);
