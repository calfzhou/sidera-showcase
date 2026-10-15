import { Row, Stack } from 'sidera/ui';
import { useId, useState } from 'react';
import { translateNumber } from './number-chinese.js';
const examples = ['0', '1010', '100000001', '-9007199254740993'];
export default function NumberChinese() {
  const id = useId();
  const [input, setInput] = useState('123456789');
  let result = '', error = '';
  try { result = translateNumber(input); } catch (problem) { error = problem.message; }
  return <Stack className="chinese-tool">
    <Stack gap="small">
      <label htmlFor={id}>Integer · up to 52 digits</label>
      <input id={id} type="text" inputMode="text" value={input} spellCheck={false}
        aria-invalid={!!error} aria-describedby={`${id}-hint ${id}-error`}
        placeholder="For example: -100000001" onChange={event => setInput(event.target.value)} />
    </Stack>
    <Row className="tool-examples" aria-label="Example integers">
      {examples.map(value => <button type="button" key={value} onClick={() => setInput(value)}>{value}</button>)}
      <button type="button" onClick={() => setInput('')}>Clear integer</button>
    </Row>
    <p id={`${id}-hint`} className="jsx-note">Converted as text, never rounded through a JavaScript Number.</p>
    <p id={`${id}-error`} className="jsx-error" aria-live="polite">{error}</p>
    <Stack gap="small">
      <label htmlFor={`${id}-output`}>Chinese reading</label>
      <textarea id={`${id}-output`} className="chinese-output" lang="zh-CN" rows={4} value={result} readOnly aria-live="polite" />
    </Stack>
  </Stack>;
}
