---
title: "Advanced Markdown and math"
date: 2026-03-13
lastmod: 2026-05-20
---
## Native callouts

This is the working B checkpoint, not a promise of markdown-it grammar parity.
Image attributes, automatic captions and palette containers await the authoring decision.

> [!Note]
> A callout keeps **ordinary Markdown**, including a source-relative
> [Journal heading](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason).
>
> - Keep a short list inside the callout.
> - Keep `code` literal and links navigable.
>
> > An ordinary quotation nested inside the callout stays a quotation.

> [!tip]
> A small example is easier to inspect than an entire migrated site.

> [!important]
> A published URL is not the same thing as an editor source path.

> [!warning]
> Test changes before publication.

> [!caution]
> Keep the original sources read-only until migration is authorized.

This titled form deliberately remains an ordinary quotation, as in the source renderer:

> [!tip] Goal
> Do not silently reinterpret an existing designator.

## Image dimensions

The terminal size marker is removed from alt text. This retains source syntax without a shortcode:

![Two connected steps|120](../markdown/sample.svg "A title remains a tooltip at this checkpoint")

![Two connected steps|120x60](../markdown/sample.svg)

The title is not yet an automatic caption. That policy remains a separate B decision.

## Inline and display equations

For an interval, $area_{i,j}=(j-i)\times\min\{h_i,h_j\}$ retains its underscores,
braces and backslashes. English and 中文 around $x_1^2 + y_2^2 = r^2$ share the same baseline.

$$
\begin{aligned}
a_1 &= \frac{x^2}{2} \\
b_2 &= \sqrt{3}
\end{aligned}
$$

The next expression exercises a local TeX definition and an array, not a site macro registry:

$$
\def\arraystretch{1.5}
\begin{array}{c|ccc}
i & 0 & 1 & 2 \\
a_i & \boxed 1 & \xcancel 1 & 2
\end{array}
$$

Review limitation: the native MathML candidate exposes the array rule, box and cancellation
in markup, but Chromium does not paint all of them. Do not treat this candidate as full
formula compatibility. Bundled KaTeX CSS/fonts for HTML+MathML output require approval.

A deliberately wide equation scrolls locally on a narrow screen:

$$
\underbrace{a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}}_{\text{one long sum}}=\sum_{i=1}^{12}a_i
$$

Escaped currency is ordinary text: \$5 and \$10. Code is also literal: `$x_1$`.

```tex
$$x_1 + y_2$$
```

Hugo's embedded KaTeX emits native MathML at build time. No client math script, CDN,
KaTeX stylesheet or new font is required. Browser math typography differs from KaTeX's
HTML/CSS output; this is a reviewable choice, not pixel-equivalence or universal TeX support.
