import { Row, Stack } from 'sidera/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { centuryRows, localToday, mod7, paperMonths, paperPath, paperSelection, weekdays, yearRows } from './calendar.js';
const columns = [0, 1, 2, 3, 4, 5, 6];
const example = { year: 2011, month: 8, day: 10 };
const blank = { century: null, ending: null, month: null, day: null };
const sheetWidth = 628;
const letter = index => 'ABCDEFG'[index];
// Opposite corners of each logical area in the single paper table. Include its
// label and empty cells; DOM ancestry alone cannot identify border-spacing gaps.
const previewAreas = {
  ending: ['.paper-years', '[data-paper-cell="18:10"]'],
  century: ['.paper-century', '[data-paper-cell="25:3"]'],
  month: ['.paper-months', '.paper-months.paper-side-label'],
  day: ['.paper-days', '.paper-days.paper-side-label'],
};

export default function Calendar() {
  const id = useId();
  const viewport = useRef(null);
  const [selection, setSelection] = useState(() => paperSelection(example));
  const [hover, setHover] = useState(null);
  const [focus, setFocus] = useState(null);
  const [fit, setFit] = useState(true);
  const [width, setWidth] = useState(sheetWidth);
  useEffect(() => {
    const node = viewport.current;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const preview = hover || focus;
  const current = preview ? { ...selection, [preview.part]: preview.value } : selection;
  const trace = paperPath(current);
  const scale = fit ? Math.min(1, width / sheetWidth) : 1;
  function reset(value) { setSelection(value); setHover(null); setFocus(null); }
  function leavePreviewArea(event) {
    // Entering another numbered cell already supplies the next preview.
    if (!hover || event.target.closest('button[data-part]')) return;
    const [start, end] = previewAreas[hover.part].map(selector =>
      event.currentTarget.querySelector(selector).getBoundingClientRect());
    const { clientX: x, clientY: y } = event;
    if (x < start.left || x > end.right || y < start.top || y > end.bottom) setHover(null);
  }
  function cellClass(region, row, col) {
    return `paper-${region}${trace.path.has(`${row}:${col}`) ? ' paper-path' : ''}${trace.junctions.has(`${row}:${col}`) ? ' paper-junction' : ''}`;
  }
  function button(part, value, label) {
    const key = value?.key ?? value;
    const selected = (selection[part]?.key ?? selection[part]) === key;
    const description = part === 'month' ? `Month ${value.label}${value.leap ? ', leap year' : ''}` :
      `${part === 'ending' ? 'Year ending' : part === 'century' ? 'Century' : 'Day'} ${label}`;
    return <button type="button" aria-label={description} title={description} aria-pressed={selected}
      data-part={part} data-value={key}
      onMouseEnter={() => setHover({ part, value })}
      onFocus={() => setFocus({ part, value })} onBlur={() => setFocus(null)}
      onClick={() => reset({ ...selection, [part]: value })}>{label}</button>;
  }
  return <Stack className="calendar-tool">
    <Row className="paper-toolbar" role="group" aria-label="Paper calendar controls">
      <button type="button" data-paper-action="example" onClick={() => reset(paperSelection(example))}>2011 example</button>
      <button type="button" data-paper-action="today" onClick={() => reset(paperSelection(localToday()))}>Today</button>
      <button type="button" data-paper-action="clear" onClick={() => reset(blank)}>Clear highlights</button>
      <button type="button" data-paper-action="size" aria-pressed={!fit} onClick={() => setFit(value => !value)}>{fit ? 'Actual size' : 'Fit sheet'}</button>
    </Row>
    <div ref={viewport} className="paper-viewport" tabIndex={0} role="region" aria-label="Perpetual weekday paper table, scroll horizontally at actual size">
      <table className="paper-calendar" style={{ zoom: scale }} aria-describedby={`${id}-result`}
        onMouseMove={leavePreviewArea} onMouseLeave={() => setHover(null)}>
        <caption>Perpetual weekday calendar</caption>
        {/* Omit original column 1 (4n+x); retain logical coordinates for the lookup paths. */}
        <colgroup>{Array.from({ length: 16 }, (_, col) => <col key={col} style={{ width: col === 0 || col === 15 ? 22 : 38 }} />)}</colgroup>
        <tbody>
          <tr>
            <td className="paper-blank" colSpan={3} rowSpan={19} />
            <th className="paper-years" colSpan={7} scope="colgroup">Last two digits of the year</th>
            <td className="paper-blank paper-notes-space" colSpan={6} rowSpan={19} />
          </tr>
          {yearRows.map((values, row) => <tr key={`year-${row}`} data-paper-row={row + 1}>
            {values.map((ending, col) => <td key={col} data-paper-cell={`${row + 1}:${col + 4}`}
              className={cellClass('years', row + 1, col + 4)}>
              {ending !== null && button('ending', ending, String(ending).padStart(2, '0'))}
            </td>)}
          </tr>)}
          {columns.map(row => <tr key={`cross-${row}`} data-paper-row={19 + row}>
            {row === 0 && <th className="paper-century paper-side-label" rowSpan={7} scope="rowgroup">Century</th>}
            {[2, 3].map(col => {
              const century = centuryRows[row].find(cell => cell.column === col);
              return <td key={col} data-paper-cell={`${19 + row}:${col}`} className={cellClass('century', 19 + row, col)}>
                {century && button('century', century, century.label)}
              </td>;
            })}
            {columns.map(col => <td key={`letter-${col}`} data-paper-cell={`${19 + row}:${4 + col}`} className={cellClass('letters', 19 + row, 4 + col)}>{letter(mod7(col - row))}</td>)}
            {[11, 12, 13].map(col => {
              const month = paperMonths.find(cell => cell.row === 19 + row && cell.column === col);
              return <td key={col} data-paper-cell={`${19 + row}:${col}`} className={cellClass('months', 19 + row, col)}>
                {month && button('month', month, month.label)}
              </td>;
            })}
            {row === 0 && <><th className="paper-months paper-side-label" rowSpan={7} scope="rowgroup">Month</th><td className="paper-blank" colSpan={2} rowSpan={7} /></>}
          </tr>)}
          {columns.map(row => <tr key={`week-${row}`} data-paper-row={26 + row}>
            {row === 0 && <td className="paper-blank" colSpan={3} rowSpan={7} />}
            {columns.map(col => <td key={col} data-paper-cell={`${26 + row}:${4 + col}`} className={cellClass('weekdays', 26 + row, 4 + col)}>
              <abbr title={weekdays[(row + col) % 7]}>{weekdays[(row + col) % 7].slice(0, 2)}</abbr>
            </td>)}
            {[0, 1, 2, 3, 4].map(col => {
              const day = row + 1 + col * 7;
              return <td key={`day-${col}`} data-paper-cell={`${26 + row}:${11 + col}`} className={cellClass('days', 26 + row, 11 + col)}>
                {day <= 31 && button('day', day, String(day))}
              </td>;
            })}
            {row === 0 && <th className="paper-days paper-side-label" rowSpan={7} scope="rowgroup">Day</th>}
          </tr>)}
          <tr><td className="paper-blank" colSpan={3} /><th className="paper-weekdays" colSpan={7}>Weekday</th><td className="paper-blank" colSpan={6} /></tr>
        </tbody>
      </table>
    </div>
    <output id={`${id}-result`} className="jsx-row jsx-note paper-result" aria-live="polite" aria-atomic="true">
      <span>{preview ? 'Preview' : 'Selected'}: {current.century?.label ?? '—'} / {current.ending === null ? '—' : String(current.ending).padStart(2, '0')} / {current.month?.label ?? '—'} / {current.day ?? '—'}</span>
      {trace.yearKey !== null && <span>Year key <b>{letter(trace.yearKey)}</b></span>}
      {trace.weekday && <strong>{trace.weekday}</strong>}
      {trace.warning && <span className="jsx-error">{trace.warning}</span>}
    </output>
  </Stack>;
}
