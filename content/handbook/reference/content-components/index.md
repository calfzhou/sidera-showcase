---
title: "Small components, real content"
date: 2026-05-22
summary: "Keyboard tokens, status marks, link cards and exact copy text. Container composition is a separate, unresolved checkpoint."
---

This is the **partial C2 inspection page**, not the completed container showcase. Folding,
grids, boxes, attributed quotations, enhanced images and timelines still await the
native composition decision. Existing [code inclusion](../../../notes/code-inclusion/index.md)
and [advanced Markdown](../advanced-markdown/index.md) remain available.

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

{{< link href="../../../journal/connect-the-useful-parts/index.md?from=components#give-a-link-a-reason" text="Connect the useful parts — a reason to follow the link" icon="signal.svg" >}}

{{< link href="example.txt" text="Open the harmless example file" >}}

## Copy only the value

The prefix is a label; it is not copied. The two spaces in the middle are deliberate.

{{< copy prefix="Example fingerprint" text="AAAA BBBB CCCC DDDD  EEEE FFFF 0000 1111" >}}

Copy uses the same confirmation, text-only toast and selected-field failure path as
code blocks. With JavaScript disabled, the value remains selectable; no dead button.

{{< snippet src="example.txt" lang="text" >}}

## A local sticker, not an asset license

A small signal {{< emoji src="signal.svg" alt="Synthetic green signal, not the blobcat party asset" >}}
can sit beside prose. This original geometric placeholder proves local rendering only.
The used **blobcat party** asset remains unresolved: a CDN address is not permission
to redistribute it. No blobcat library or third-party sticker is bundled.

## Existing native Markdown stays native

{{% block id="component-context" %}}
### Inside the existing top-level block

A [normal source link](../../../journal/connect-the-useful-parts/index.md#give-a-link-a-reason),
ordinary code and $a^2+b^2=c^2$ use the existing native hooks.

![A synthetic signal|96](signal.svg "An existing B caption")
{.no-caption}
{{% /block %}}

This last block deliberately contains **no nested shortcode**. It does not prove
folding → grid → link or folding/box → snippet. Those combinations remain pending.
