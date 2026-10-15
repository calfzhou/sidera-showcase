import { Row, Stack } from 'sidera/ui';
import { useId, useState } from 'react';
export default function ReadingTime() {
  const id = useId();
  const [words, setWords] = useState(1800);
  const [speed, setSpeed] = useState(300);
  return <Stack>
    <Row><output className="jsx-metric" aria-live="polite">{Math.ceil(words / speed)}</output><span>minutes to read</span></Row>
    <label htmlFor={id}>{speed} words per minute · {words} words</label>
    <input id={id} type="range" min="100" max="600" step="50" value={speed} onChange={event => setSpeed(Number(event.target.value))} />
    <Row>
      <button type="button" onClick={() => setWords(value => value + 300)}>Add 300 words</button>
      <button type="button" onClick={() => { setWords(1800); setSpeed(300); }}>Reset estimate</button>
    </Row>
  </Stack>;
}
