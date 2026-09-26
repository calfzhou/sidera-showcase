---
title: "Ordinary Markdown"
description: "A small reading specimen: English and Chinese prose, nested lists, code, tables and native figures."
date: 2026-03-12
lastmod: 2026-05-20
---
This synthetic page keeps the ordinary parts of a document together. Read it at a comfortable pace, or use the contents to jump to [code and data](#code-and-data). No special theme tags, remote fonts or external images are needed.

For syntax details, see [Hugo’s Markdown documentation](https://gohugo.io/content-management/formats/) or stay within [this handbook]({{< relref "/handbook" >}}). External text links have a small suffix; internal links do not.

## Reading at a comfortable pace

An observation begins with a small detail. We write it down, return to it later, and notice a relationship that was not obvious the first time. A useful reading surface gives these sentences enough space without asking the eye to travel too far. **Strong emphasis**, *quiet emphasis*, and ~~a discarded assumption~~ should remain distinct from [an ordinary handbook link]({{< relref "/handbook" >}}).

A second paragraph tests the rhythm between blocks. Long articles need neither a procession of cards nor a new control for every operation. Native headings, links, selection and scrolling are enough for this example. A reader can follow an idea, pause at a quotation and return to the surrounding text without losing their place.[^reading]

### Mixed-language paragraphs

笔记的价值并不在于一次写完，而在于能够不断补充、修订与连接。阅读一段较长的文字时，行距、标点和换行共同影响理解。这里使用完全虚构的说明文字，观察中文在本地字体回退情况下是否清晰，而不是测试某一种远程字体是否成功下载。

When an English sentence mentions 知识组织与日常观察, the surrounding words should keep their natural spacing. 数字 2026、英文 Hugo 与中文标点混合使用；这段文字只为检查普通阅读，不包含真实个人笔记。A local font fallback should remain useful offline.

> A note is a revisable observation, not a finished chapter. Classification gives it a home; links allow it to meet other ideas.
>
> 记录问题，也记录重新思考问题的过程。
>
> > Keep the original context when quoting a quotation.

## Lists and small distinctions

1. Start with an observation and its context. This deliberately longer item wraps onto several lines on a phone, keeping its number beside the first line rather than above the whole paragraph.
2. Compare it with earlier notes.
   - Keep the assumptions visible.
   - Separate what happened from what might explain it.
     1. Read the original description.
     2. Write down one question.
3. Return later and revise the conclusion.

A loose list preserves paragraphs within an item:

- Keep a short record of the initial question.

  Add a second paragraph when the context matters. Its left edge belongs to the same item, not to the outer article.

  - A nested observation can contain `inline_code` and **important details**.
  - Another observation keeps its own marker.

- Leave room for a different answer tomorrow.

Tasks record a state; these native disabled checkboxes are not a task-management service.

- [x] Read the description.
- [ ] Compare the English and 中文 paragraphs on a narrow screen.
  - [x] Keep the nested state visible.
  - [ ] Return to the source.

### A useful distinction

A heading describes the next part of the text, while a tag classifies the whole page.

#### A smaller detail

The collection supplies browsing context; it does not change what ordinary Markdown means.

##### A qualification

Small headings remain readable instead of shrinking below the text they introduce.

###### The final level

Six native heading levels are available, although most articles need only two or three.

## Code and data

An inline identifier can wrap without widening the page: `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`. A long [linked identifier with no spaces: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789](#closing-observations) should behave the same way.

```python {linenos=table, linenostart=8, hl_lines=[3]}
# Synthetic code: comments, strings and numbers remain readable in both palettes.
def describe(label: str, count: int = 3) -> str:
    if count > 0:
        return f"{label}: {count}"
    return "No observations"

print(describe("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"))
```

```text
An uncolored wide line: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz
second line stays within the same locally scrollable block
```

```html
<article data-note="synthetic">Text &amp; safe markup, displayed as code</article>
```

### A wide table

| Observation | Unbroken identifier | Reading notes | Count |
| :--- | :--- | :---: | ---: |
| Alpha | abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 | Keep the whole identifier available. | 12 |
| Beta | ordinary-identifier | 表格在局部滚动，不应把整页推向屏幕外。 | 3 |

A small table should not look like a code block:

| Choice | Meaning | Count |
| :--- | :---: | ---: |
| Keep | **Useful** | 12 |
| Revisit | *Uncertain* | 3 |

## Images and captions

The first image is ordinary Markdown. Its alt text describes the content; a title is not automatically converted into a caption. The second uses Hugo's already-supported native figure shortcode, with an explicit width and a caption. Neither image should stretch beyond its source width or the reading column.

![Two connected sample nodes](sample.svg "An ordinary image title")

{{< figure src="sample.svg" alt="Two connected sample nodes, shown at an explicit width" width="120" height="60" title="A native figure" caption="A small local image with a longer caption. 图注可以中英混排；它属于图片，而不是新的文章章节。" >}}

[![Two linked nodes leading to the reference desk](sample.svg)]({{< relref "/handbook/reference" >}})

---

## Closing observations

The last heading gives the contents link a distant destination. Follow the [reference desk]({{< relref "/handbook/reference" >}}), return to [the opening section](#reading-at-a-comfortable-pace), or revisit the footnote.[^reading] A hard line break stays intentional:  
this sentence starts on the next line, within the same paragraph.

[^reading]: This is a native Goldmark footnote, used twice so both return links can be checked. It is part of the article body, not the configured article footer.

    A second footnote paragraph keeps its indentation. [Back to the discussion](#mixed-language-paragraphs).
