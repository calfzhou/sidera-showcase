---
title: "JSX playground"
date: 2026-10-14T23:05:00+08:00
lastmod: 2026-10-15T22:23:40+08:00
params:
  ai_label: generated
  comments: false
---
Small tools, inside an ordinary Markdown article. These examples use standard
React components compiled by Hugo, with no MDX compiler or remote runtime.
Try changing a value, encoding a message, or changing the whole page's color mode.

For more substantial examples, try the [weekday calendar, Kindle recovery helper and
Chinese-number converter](../legacy-tools/index.md).

## One fence, one counter

The entire component lives in a `jsx-live` fence in this page's `index.md`.
The widget renders directly into the article without additional source-code controls.
`Stack` and `Row` from `sidera/ui` are optional layout helpers: vertical flow and a
wrapping horizontal row. Native controls and the existing CSS classes still work.
Both accept a `gap` of `none`, `small`, `normal`, or `large`, plus normal div props
such as `className`, `style`, and `aria-*`. Omitting `gap` keeps the existing spacing for
that layout; `gap="small"` is useful for a label and its input.

```jsx-live {title="Counter" caption="A component authored directly in Markdown." fallback="The counter starts at zero. Each click adds one."}
import { useState } from 'react';
import { Row } from 'sidera/ui';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <Row>
    <output className="jsx-metric" aria-live="polite">{count}</output>
    <button type="button" onClick={() => setCount(n => n + 1)}>Add one</button>
    <button type="button" onClick={() => setCount(0)}>Reset counter</button>
  </Row>;
}
```

## Text in, bytes out

This widget is loaded with a shortcode from `widgets/Encoder.jsx`; it imports a
small helper from `widgets/encoding.js`. Try **你好，Sidera 👋** as well as ASCII.
Encoding stays in your browser; this demo does not send the input anywhere.
Base64 is an encoding, **not encryption**. Controls and the result panel use Sidera’s
shared styles; the small local stylesheet only reserves output space and preserves
whitespace. Other tools on this page need no component stylesheet.

{{< jsx src="widgets/Encoder.jsx" css="widgets/encoder.css" title="UTF-8 → Base64" caption="Unicode text encoded locally, without a remote service." fallback="Hello, Sidera! encodes to SGVsbG8sIFNpZGVyYSE=." />}}

## A button that belongs to the page

Direct mode is intentionally trusted page code. This component uses the same
`Sidera.setColorMode()` API as the site's controls; your choice also persists on
other pages. **Auto** follows your system preference.

{{< jsx title="Page appearance" >}}
import { useEffect, useState } from 'react';
import { Stack, Row } from 'sidera/ui';

export default function ToneSwitch() {
  const [mode, setMode] = useState(document.documentElement.dataset.colorMode);
  useEffect(() => {
    const observer = new MutationObserver(() => setMode(document.documentElement.dataset.colorMode));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
    return () => observer.disconnect();
  }, []);
  return <Stack>
    <p>Current preference: <strong>{mode}</strong></p>
    <Row>
      {['light', 'dark', 'auto'].map(value => <button type="button" key={value}
        aria-pressed={mode === value} onClick={() => window.Sidera.setColorMode(value)}>{value}</button>)}
    </Row>
  </Stack>;
}
{{< /jsx >}}

## Same component, independent state

The estimate is **words ÷ speed, rounded up**. It does not account for diagrams,
code or rereading, and it does not change this article's metadata.
Both copies import the same component but keep separate state. The first uses
`appearance="card"`; the folded copy uses the default frameless appearance.

{{< jsx src="widgets/ReadingTime.jsx" title="Reading-time estimate" caption="Adjust reading speed to compare estimates." appearance="card" fallback="1,800 words at 300 words per minute takes about 6 minutes." />}}

{{% folding title="Open a second, independent estimate" %}}
{{< jsx src="widgets/ReadingTime.jsx" title="Independent estimate" />}}
{{% /folding %}}

## An optional isolated frame

This copy runs in an opaque sandbox instead of the article document. The controls
still work and colors follow the site. It has no site storage or direct access to
the parent page. Its height is explicitly bounded rather than controlled by the code.

{{< jsx src="widgets/ReadingTime.jsx" mode="sandbox" height=280 title="Isolated estimate" caption="The same component running in an opaque sandbox." />}}

## Ordinary code stays ordinary

A `jsx` fence is only a code example. Only `jsx-live` and the explicit shortcode
execute a component.

```jsx
export default function Example() {
  return <button>This button is source text, not an interactive widget.</button>;
}
```

Outside the islands, **Markdown is still Hugo Markdown**: [native charts](../charts/index.md),
math such as $t = \lceil w / v \rceil$, and normal headings work as usual.
