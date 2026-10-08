---
title: "Small components, real content"
date: 2026-05-22
summary: "Native folds, boxes and grids alongside keyboard tokens, status marks, links and exact copy text."
---

This page combines native folds, boxes and grids with keyboard tokens, marks,
links and exact-copy text. Each specimen keeps its source close to the rendered result.
See also [code inclusion](../../../notes/code-inclusion/index.md)
and [advanced Markdown](../advanced-markdown/index.md).

## Read the small signals

Press {{< kbd text="Ctrl" >}} + {{< kbd text="`" >}} to reveal a command panel.
On another keyboard the same action may use {{< kbd text="⌘ Cmd" >}}.
These are keyboard tokens, not clickable buttons.

| Check | Result |
| --- | --- |
| Source exists | {{< mark text="✓" color="green" >}} |
| Missing destination | {{< mark text="✗" color="red" >}} |
| Awaiting review | {{< mark text="?" color="yellow" >}} |

In `aabcc`, underline the selected characters: {{< u text="aa" >}}bcc.
The underline does not alter the text or silently turn it into a link.

> [!note]
> A native alert can contain {{< kbd text="F4" >}} and a [source-relative link](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason).
> This is ordinary Markdown composition, not nested shortcodes.

## A sentence worth pausing on

{{< quot text="Keep the useful parts | leave room to think" >}}

{{< quot text="A quieter thought, without ornament" ornament=false >}}

Neither line pretends to be an attributed quotation or adds a heading to the TOC.
Use a real Markdown heading when the words belong in the document outline.

## Follow an explicit destination

The first card resolves the editor-relative Markdown file to Journal’s native dated
URL, including its query and heading. The second opens an adjacent harmless file.
There is no preview-metadata service and no remote request to invent a description.

{{< link href="../../../journal/connect-the-useful-parts/index.md?from=components#give-a-link-a-reason" text="Connect the useful parts — a reason to follow the link" icon="reading" >}}

{{< link href="example.txt" text="Open the harmless example file" >}}

## Copy only the value

The prefix is a label; it is not copied. The two spaces in the middle are deliberate.

{{< copy prefix="Example fingerprint" text="AAAA BBBB CCCC DDDD  EEEE FFFF 0000 1111" >}}

Copy uses the same confirmation, text-only toast and selected-field failure path as
code blocks. With JavaScript disabled, the value remains selectable; no dead button.

{{< snippet src="example.txt" lang="text" >}}

## Existing native Markdown stays native

{{% block id="component-context" %}}
### Inside the existing top-level block

A [normal source link](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason),
ordinary code and $a^2+b^2=c^2$ use the existing native hooks.

![A synthetic signal|96](signal.svg "An existing B caption")
{.no-caption}
{{% /block %}}

This block retains B’s original syntax. The examples below add nested components
without a second Markdown pass over their generated HTML.

## Reveal the supporting material

The outer container uses `%`; everything nested inside it uses `<`. Ordinary image,
link, alert and code-fence syntax stays Markdown. The first fold starts closed.

{{% folding title="Compare **two views** and $x^2$" id="fold-comparison" %}}
Use {{< kbd text="Enter" >}} to toggle the focused summary; this token is not a button.
A native [source link](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason)
and $a^2+b^2=c^2$ still use the existing hooks.

{{< grid columns=2 >}}
{{< cell >}}
![Original signal|96](signal.svg "A visible caption")

{{< link href="../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason" text="Read the connected article" icon="reading" >}}
{{< /cell >}}
{{< cell class="no-caption" >}}
![Explicitly inverted signal|96](signal.svg "This caption is suppressed by the cell")
{.invert-when-dark .invert-when-light}

{{< link href="example.txt" text="Open the harmless file" >}}
{{< link href="../../../notes/code-inclusion/index.md" text="Keep two cards in one cell" >}}
{{< /cell >}}
{{< /grid >}}

> [!tip]
> A native alert inside a fold retains **emphasis** and its own ordinary Markdown.

{{< box title="A small selected excerpt" color="red" child="codeblock" >}}
{{< snippet src="example.txt" from=2 to=2 lang="text" options="linenos=table,hl_lines=1" >}}
{{< /box >}}
{{% /folding %}}

{{% folding title="Read the full file" child="codeblock" open=true id="fold-code" %}}
{{< snippet src="example.txt" lang="text" >}}
{{% /folding %}}

## Compact groups and a normal box

{{% grid min_width=150 %}}
{{< cell >}}
1. ![First signal|96](signal.svg)
{.no-caption}
{{< /cell >}}
{{< cell >}}
1. ![Second signal|96](signal.svg)
{.no-caption}
{{< /cell >}}
{{< cell >}}
A deliberately long cell label remains readable without creating horizontal page
scrolling: abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz.
{{< /cell >}}
{{% /grid %}}

{{% box title="Review the example" color="red" %}}
A normal box can contain a [resource link](example.txt), inline $x_1$, and a fence:

```text
A literal <tag> is code, not HTML.
```

{{< copy text="Only this value" prefix="Example" >}}
{{% /box %}}

## Credit a quotation with Markdown

> A short demonstration passage, not a quotation from another author's work.
>
> — Fieldbook example, *Notes on writing*

No dedicated attribution, emoji, timeline or enhanced-image shortcode is needed.
