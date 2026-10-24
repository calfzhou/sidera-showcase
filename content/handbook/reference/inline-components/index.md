---
title: "Small details and alternate views"
date: 2026-10-24T20:06:00+08:00
lastmod: 2026-10-24T20:06:00+08:00
summary: "Inline icons, annotations, text decorations, downloadable attachments and accessible tabs."
params:
  ai_label: generated
---

Small details belong in the flow of a sentence. Tabs keep alternative explanations
close without opening another page. These examples use Sidera's own palette and
native Hugo shortcodes, not Hexo tag syntax.

## Icons and topics

{{< icon name="star" color="yellow" label="Favorite" >}}
{{< icon name="planet" color="purple" label="Explore" >}}
{{< icon name="github" label="GitHub" >}}
Icons inherit the surrounding color unless a named family is selected.

{{< hashtag text="Field notes" >}}
{{< hashtag text="A connected article" href="../content-components/index.md" color="purple" >}}
{{< hashtag text="Cyan" color="cyan" >}}
{{< hashtag text="Pink" color="pink" >}}
{{< hashtag text="Neutral" color="neutral" >}}

```text
{{</* icon name="star" color="yellow" label="Favorite" */>}}
{{</* hashtag text="Field notes" */>}}
{{</* hashtag text="Project" href="https://example.org/" color="purple" */>}}
```

A chip without `href` is just a label. It is not a broken or disabled link.

## An explanation at the point of use

This {{< tip text="A small explanatory note. Hover, focus or tap the underlined term; Escape dismisses the enhanced bubble." >}}annotated **term**{{< /tip >}}
keeps a definition close to its first use. It is not an alert box, and its annotation
contains text rather than links or interactive controls.

```text
{{</* tip text="A small explanatory note." */>}}annotated **term**{{</* /tip */>}}
```

## Seven text decorations

| Effect | Example |
| --- | --- |
| Blur | An answer: {{< blur text="Forty-two" >}} |
| Conceal | A spoiler: {{< psw text="The notebook was in the drawer" >}} |
| Emphasis dots | {{< emp text="Read this carefully" >}} |
| Wavy underline | {{< wavy text="A detail to revisit" >}} |
| Deletion | {{< del text="The previous wording" >}} |
| Superscript | x{{< sup text="2" >}} + y{{< sup text="2" >}} |
| Subscript | H{{< sub text="2" >}}O |

Superscripts and subscripts keep the surrounding text color. The blur and conceal
buttons work with a pointer or Enter/Space; without JavaScript, focusing them
reveals the text. **These effects are not security.** The source remains public,
and print reveals it. Use only fictional spoilers or optional answers here.

```text
{{</* blur text="Forty-two" */>}}
{{</* psw text="A fictional spoiler" */>}}
{{</* emp text="Read this carefully" */>}}
{{</* wavy text="A detail to revisit" */>}}
{{</* del text="The previous wording" */>}}
x{{</* sup text="2" */>}} and H{{</* sub text="2" */>}}O
```

## Code without a code block

Call {{< code-inline lang="python" >}}print("hello  world"){{< /code-inline >}}
or write {{< code-inline lang="html" >}}<strong>Read me</strong>{{< /code-inline >}}
without interrupting the paragraph. The HTML example is code, not active markup.

```text
{{</* code-inline lang="python" */>}}print("hello  world"){{</* /code-inline */>}}
```

## An ordinary attachment

{{< download src="attachments/field-notes.txt" name="Fieldbook notes.txt" text="Download the field notes" >}}

This link serves a local page-bundle file unchanged. No source inclusion or
JavaScript is needed to download it; the browser handles the download hint.

```text
{{</* download src="attachments/field-notes.txt" name="Fieldbook notes.txt" text="Download the field notes" */>}}
```

## Two ways to read the same idea

{{% tabs label="Reading method" align="start" %}}
{{< tab title="Quick explanation" >}}
A useful note records one observation and points to its source. Keep the label
specific and the body short.

{{< hashtag text="One observation" color="green" >}}
{{< /tab >}}
{{< tab title="Worked example" >}}
### The longer explanation

A [link directly to this heading](#the-longer-explanation) reveals this panel.
The normal TOC and Sidera search results work the same way.

{{< box title="Keep the source close" color="cyan" >}}
Use {{< code-inline lang="python" >}}sum(range(1, n + 1)){{< /code-inline >}} for a
small example, or the formula $n(n+1)/2$ when the explanation calls for it.

{{< download src="attachments/field-notes.txt" text="Read the supporting attachment" >}}
{{< /box >}}

{{< tabs label="Supporting detail" >}}
{{< tab title="A reminder" >}}
Inner tabs operate independently of the outer group.
{{< /tab >}}
{{< tab title="A checklist" >}}
- Keep the source link meaningful.
- Check the original attachment.
- Preview narrow and dark layouts.
{{< /tab >}}
{{< /tabs >}}
{{< /tab >}}
{{% /tabs %}}

Use Left/Right, Home and End while a tab has focus. Without JavaScript all panels
remain visible, and printing includes their labels and contents.

```text
{{%/* tabs label="Reading method" active=1 */%}}
{{</* tab title="Quick explanation" */>}}
First explanation.
{{</* /tab */>}}
{{</* tab title="Worked example" */>}}
Another explanation with ordinary **Markdown**.
{{</* /tab */>}}
{{%/* /tabs */%}}
```
