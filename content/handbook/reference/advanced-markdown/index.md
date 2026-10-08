---
title: "Advanced Markdown and math"
date: 2026-03-13
lastmod: 2026-05-20
---
## Native callouts

This specimen combines native Markdown with a small general block container.
It does not require a Markdown preprocessor or browser math renderer.

> [!Note]
> A callout keeps **ordinary Markdown**, including a source-relative
> [Journal heading](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason).
>
> - Keep a short list inside the callout.
> - Keep `code` literal and links navigable.
>
> > An ordinary quotation nested inside the callout stays a quotation.

> [!tip]
> A small example is easier to inspect than a large site.

> [!important]
> A published URL is not the same thing as an editor source path.

> [!warning]
> Test changes before publication.

> [!caution]
> Keep a backup before replacing an original source.

This titled form deliberately remains an ordinary quotation, as in the source renderer:

> [!tip] Goal
> Do not silently reinterpret an existing designator.

## Images and native attributes

A standalone image takes its caption from the title, otherwise its cleaned alt text.
The first image has both a native class and an Obsidian width:

![Two connected steps|120](../markdown/sample.svg "A light diagram, adapted only in dark mode")
{.invert-when-dark #adaptive-image}

![Two connected steps|120x60](../markdown/sample.svg)

This next-line suppression keeps the alternative description but omits a caption:

![A plain colored diagram|120](../markdown/sample.svg)
{.no-caption #plain-image}

An image inside ordinary prose has no generated caption: ![Small diagram|40](../markdown/sample.svg).

### Native attribute placement

Place the class on the **next line** after the image, as above. No image shortcode is required.
A palette class applies to the marked element; a figure's caption is not inverted
unless its enclosing block is deliberately marked.

## General Markdown blocks

Use a general container to apply a palette class to a group:

```text
{{%/* block class="invert-when-dark" */%}}
Markdown content here.
{{%/* /block */%}}
```

{{% block class="reading-group" id="adaptive-block" %}}
### Inside a general block

This general block keeps **ordinary Markdown**. A class can mark any element,
not just an image; no inversion is requested on this reading group.

[Give a link a reason](../../../journal/connect-the-useful-parts/index.md?from=block#give-a-link-a-reason).

![Block-owned diagram|120](../markdown/sample.svg "A caption in an ordinary group")

> [!note]
> Nested ordinary content keeps its semantics.
>
> - Lists remain lists.
> - Headings and links belong to the page.
{{% /block %}}

Here is a separately marked group. Its image owns a light background, and the
filter applies to the group as a whole:

{{% block class="invert-when-dark" id="palette-block" %}}
![Group-owned diagram|120](../markdown/sample.svg)
{.no-caption}
{{% /block %}}

A native paragraph can carry the class too. This authored dark surface becomes
light in light mode; pairing foreground and background keeps it readable.
{.invert-when-light #adaptive-paragraph style="color:#fff;background:#17191b;padding:1em"}

Use `%` notation for the outer container and `<` notation for nested shortcodes,
as demonstrated on the [components page](../content-components/index.md).
Ordinary Markdown remains native inside each container.
Do not mark both a parent and its children unless compounded inversion is intended.

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
i & 0 & 1 & 2 \\ \hline
a_i & \boxed 1 & \xcancel 1 & 2 \\ \hdashline
s_i & 1 & 2 & 4
\end{array}
$$

A deliberately wide equation scrolls locally on a narrow screen:

$$
\underbrace{a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}}_{\text{one long sum}}=\sum_{i=1}^{12}a_i
$$

Escaped currency is ordinary text: \$5 and \$10. Code is also literal: `$x_1$`.

```tex
$$x_1 + y_2$$
```

Hugo's embedded KaTeX emits HTML for visual layout and MathML for accessibility at
build time. Matching local CSS/fonts preserve boxes, cancellation and array rules.
No client math script or remote CDN is required, and formulas work without JavaScript.
