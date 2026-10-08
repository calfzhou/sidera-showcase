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

## Compose with ordinary Markdown

Use the angle-bracket shortcode on its own line with surrounding blank lines.
It works alongside [source links](../reading-list/index.md), alerts and math.
Inside a fold, box or grid, use `%` for the outer container and `<` for nested
shortcodes, including `snippet`. See the
[component examples](../../handbook/reference/content-components/index.md).

A custom title uses `title="Solution"`; an explicit language uses `lang="python"`.
Omitting both line bounds shows the full file, including its final line.
