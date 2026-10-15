import { Row, Stack } from 'sidera/ui';
import { useId, useState } from 'react';
import { encode } from './widgets/encoding.js';

export default function Encoder() {
  const id = useId();
  const [text, setText] = useState('Hello, Sidera!');
  const [result, setResult] = useState('');
  return <Stack className="encoder-tool">
    <Stack gap="small">
      <label htmlFor={id}>Text to encode — Unicode welcome</label>
      <textarea id={id} value={text} maxLength={10000} onChange={event => setText(event.target.value)} />
    </Stack>
    <Row>
      <button type="button" onClick={() => setResult(encode(text))}>Encode Base64</button>
      <button type="button" onClick={() => { setText(''); setResult(''); }}>Clear</button>
      <span>{text.length} UTF-16 code units</span>
    </Row>
    <output className="jsx-result" aria-live="polite"><samp>{result || 'Your encoded text will appear here.'}</samp></output>
  </Stack>;
}
