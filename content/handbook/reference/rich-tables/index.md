---
title: "Tables with structure"
date: 2026-10-25T00:12:00+08:00
lastmod: 2026-10-25T10:06:00+08:00
summary: "Grouped headings, merged body cells and Markdown-rich comparisons without a spreadsheet widget."
params:
  ai_label: generated
---

Use an ordinary Markdown table when every cell is simple. Use a rich table when
headings group several columns, a label covers several rows, or an explanation
needs a real list. These examples keep the native HTML table structure and work
without JavaScript. Tables use the same understated styling as ordinary Markdown
tables; captions sit below them, centered and outside the scrollable area.

## Three groups, six columns

Each series heading covers two columns. This is the original flat-header form;
`colspan` defaults to one when omitted.

{{< rich-table caption="A small paper-size comparison (mm)" cellwidth=100 >}}
headers:
  - {text: A series, colspan: 2}
  - {text: B series, colspan: 2}
  - {text: C series, colspan: 2}
rows:
  - [A0, "841 × 1189", B0, "1000 × 1414", C0, "917 × 1297"]
  - [A3, "297 × 420", B3, "353 × 500", C3, "324 × 458"]
  - [A4, "210 × 297", B4, "250 × 353", C4, "229 × 324"]
{{< /rich-table >}}

## Header and body rowspans

“Series” spans both header rows. “A series” is a row header spanning two body
rows. The Notes row combines the final two columns into one Markdown cell. This
example opts into `borders="grid"` to make the merged boundaries clear. This example
opts into `borders="grid"` so the merged boundaries remain clear.

{{< rich-table caption="Paper sizes and reading notes" borders="grid" row_headers=true >}}
columns:
  - {min_width: 100}
  - {align: center, min_width: 90}
  - {align: end, min_width: 180}
headers:
  - - {text: Series, rowspan: 2}
    - {text: Paper, colspan: 2}
  - [Size, Dimensions (mm)]
rows:
  - - {text: A series, rowspan: 2}
    - A4
    - "210 × 297"
  - [A3, "297 × 420"]
  - - Notes
    - text: |
        - Dimensions are shown as short side × long side.
        - Keep **row labels** with the values they describe.
        - Read the [ordinary Markdown specimen](../markdown/index.md).
      colspan: 2
      align: start
{{< /rich-table >}}

Covered positions are omitted; the A3 row has only two authored cells because the
row header is already occupying its first column. An empty string would create a
real empty cell, not a placeholder for that rowspan.

```text
{{</* rich-table caption="Paper sizes" */>}}
headers:
  - - {text: Series, rowspan: 2}
    - {text: Paper, colspan: 2}
  - [Size, Dimensions (mm)]
rows:
  - - {text: A series, header: row, rowspan: 2}
    - A4
    - "210 × 297"
  - [A3, "297 × 420"]
{{</* /rich-table */>}}
```

## Author-selected separators

The grouped-series table above uses the default `borders="rows"`; the merged table
uses `borders="grid"`. The choice changes separators, not structure or caption
placement. It does not add a heavy outside frame.

```text
{{</* rich-table src="observations.yaml" borders="grid" caption="Observations" /*/>}}
```

Ordinary Markdown tables can opt in too:

| Feature | Result |
| --- | --- |
| Reading | Supported |
| Writing | Supported |
{.table-grid}

```markdown
| Feature | Result |
| --- | --- |
| Reading | Supported |
| Writing | Supported |
{.table-grid}
```

Omit the attribute to keep the normal horizontal-only style.

## A body cell spanning both directions

The top-left body cell covers a two-by-two rectangle. Nothing crosses the boundary
between header and body.

{{< rich-table caption="A rectangular body merge" cellwidth=110 borders="grid" >}}
headers: [Left, Center, Right]
rows:
  - - {text: "A two-row, two-column explanation", rowspan: 2, colspan: 2}
    - First value
  - [Second value]
  - - {text: "A full-width concluding note", colspan: 3, align: center}
{{< /rich-table >}}

## A longer reading window

This table comes from an adjacent YAML resource. Scroll in either direction; the
complete two-row header and the first column remain visible. The bounded window
and sticky behavior use CSS, not a table controller.

{{< rich-table src="observations.yaml" caption="Illustrative field observations" sticky_header=true sticky_first_column=true max_height=300 />}}

```text
{{</* rich-table src="observations.yaml" caption="Field observations" sticky_header=true sticky_first_column=true max_height=300 /*/>}}
```

## A table inside another component

{{% folding title="A small **comparison** inside a tab and grid" %}}
{{< tabs label="Table example" >}}
{{< tab title="Comparison" >}}
{{< grid columns=1 >}}
{{< cell >}}
{{< rich-table row_headers=true caption="Two ways to record a result" >}}
headers: [Approach, Notes]
rows:
  - - Formula
    - 'A compact relationship: $n(n+1)/2$.'
  - - Code
    - |
      ```python
      total = sum(range(1, n + 1))
      ```
{{< /rich-table >}}
{{< /cell >}}
{{< /grid >}}
{{< /tab >}}
{{< /tabs >}}
{{% /folding %}}

Table headers are associated with their data cells in generated HTML. Printing
removes the bounded window and sticky positioning; it does not automatically open
an enclosing closed disclosure.
