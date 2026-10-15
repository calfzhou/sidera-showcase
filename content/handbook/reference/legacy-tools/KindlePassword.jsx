import { Row, Stack } from 'sidera/ui';
import { useId, useState } from 'react';
import { kindlePassword } from './kindle.js';
export default function KindlePassword() {
  const id = useId();
  const [serial, setSerial] = useState('');
  let password = '', error = '';
  try { password = kindlePassword(serial); } catch (problem) { error = problem.message; }
  return <Stack className="kindle-tool">
    <Stack gap="small">
      <label htmlFor={id}>Kindle serial number</label>
      <input id={id} type="text" value={serial} autoComplete="off" autoCapitalize="characters" spellCheck={false}
        aria-invalid={!!error} aria-describedby={`${id}-hint ${id}-error`} placeholder="Enter your device’s serial number"
        onChange={event => setSerial(event.target.value)} />
    </Stack>
    <Row>
      <button type="button" onClick={() => setSerial('B012345678901234')}>Use a fictional example</button>
      <button type="button" onClick={() => setSerial('')}>Clear serial</button>
    </Row>
    <output className="jsx-result" aria-live="polite">
      <span className="jsx-note">Legacy SSH password</span>
      <strong className={password ? 'password-result' : 'jsx-note'}>{password || 'Enter a serial number to calculate.'}</strong>
    </output>
    <p id={`${id}-error`} className="jsx-error" aria-live="polite">{error}</p>
    <p id={`${id}-hint`} className="jsx-note">Calculated only in this browser. No serial number is uploaded, logged or saved by this tool.</p>
  </Stack>;
}
