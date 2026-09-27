---
title: Include code without rewriting it
date: 2026-04-20
lastmod: 2026-04-20
tags: [software]
---
Keep source next to a coding note. The file is highlighted as data, never executed;
its indentation, blank lines and final newline are retained. Copy takes the displayed
selection. **Download full source** always retrieves the entire original file.

## Complete file

{{< snippet src="pairs.py" >}}

## Read just the loop

Lines are **one-based and inclusive**. This shows lines 4–8, with native line numbers
starting at 4. Highlight line 2 means the second displayed line (source line 5).

{{< snippet src="pairs.py" title="The lookup loop" from=4 to=8 options="linenos=table,hl_lines=2,anchorlinenos=true" >}}

## A deliberately shared resource

Shared files are explicitly placed under `assets/snippets/`, rather than searched for
across the site. This harmless helper demonstrates the reusable resource contract;
imports in included Python are not followed or executed.

{{< snippet src="labels.py" scope="shared" lang="python" >}}

## Convert a Hexo call

Before:

```text
{% snippet solution.py %}
```

After, keeping `solution.py` beside this bundle's `index.md`:

```text
{{</* snippet src="solution.py" */>}}
```

A custom title becomes `title="Solution"`; `lang:python` becomes `lang="python"`.
Explicit `from:4 to:8` becomes `from=4 to=8`, now inclusive with no trimming.
Omitting both bounds shows the full file, including its last line. Do not preserve
the old plugin's default-end/off-by-one behavior.

Use the standard angle-bracket shortcode on its own line with surrounding blank
lines. It works alongside ordinary Markdown, [source links](../reading-list/index.md),
alerts and math. Do not nest it inside B's `block` shortcode; folding/grid and other
component composition remain C2 work.
