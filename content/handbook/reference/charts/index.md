---
title: "Interactive charts and data"
date: 2026-10-09T22:10:00+08:00
summary: "Live line, bar, donut and scatter charts, with inline JSON, page resources and downloadable JSON source."
---

Charts keep their tooltips and legends: they are live local renderers, not diagram
images. Use their own legends and zoom controls to explore them. Hover or focus a
chart to reveal its source/download panel; on touch screens it stays visible. **View source**
shows the JSON configuration; **Download JSON** saves a self-contained copy. The
numbers here are fictional.

## A fence with inline JSON

Completed pages rise through spring. Hover a point or bar for its value; toggle a
series in the chart legend. The notebook exceeds its target in March and April.

```echarts {caption="Completed pages and monthly targets"}
{
  "color": ["#4779c4", "#ce8643"],
  "tooltip": {"trigger": "axis"},
  "legend": {"top": 0},
  "xAxis": {"type": "category", "data": ["Jan", "Feb", "Mar", "Apr"]},
  "yAxis": {"type": "value", "name": "Pages"},
  "series": [
    {"name": "Completed", "type": "bar", "data": [12, 18, 25, 29]},
    {"name": "Target", "type": "line", "data": [15, 20, 22, 25]}
  ]
}
```

## A paired shortcode

A donut is a pie series with inner and outer radii. The same JSON can move between
a fence, a shortcode body and a configuration file. Reading and experiments account
for three quarters of the recorded sessions.

{{< echarts caption="How the notebook is used" height=340 >}}
{
  "tooltip": {"trigger": "item"},
  "legend": {"top": 0},
  "color": ["#4779c4", "#4a9a84", "#ce8643"],
  "series": [{
    "type": "pie",
    "radius": ["35%", "60%"],
    "data": [
      {"name": "Reading", "value": 45},
      {"name": "Experiments", "value": 30},
      {"name": "Writing", "value": 25}
    ]
  }]
}
{{< /echarts >}}

## Configuration and data files

This chart reads its presentation from a JSON configuration and its rows from a
separate JSON dataset in this page bundle. Drag the zoom slider to focus on a few
months. Sessions increase from 24 in January to 42 in June, with a small dip in May.
The source and download include all dataset rows, regardless of the current zoom.

{{< echarts src="charts/monthly.json" data="data/monthly.json" caption="Notebook sessions over six months" height=400 />}}

## Charts inside a fold and grid

The hidden charts initialize only after this fold is opened and they approach the
viewport. Each resizes to its cell, including on narrow screens.

{{% folding title="Open the small-chart gallery" %}}
{{< grid columns=2 >}}
{{< cell >}}
{{< echarts src="charts/scatter.json" caption="Session length and pages read" height=280 />}}
{{< /cell >}}
{{< cell >}}
```echarts {caption="An inline chart in a grid" height=280}
{
  "tooltip": {"trigger": "axis"},
  "xAxis": {"type": "category", "data": ["Mon", "Tue", "Wed", "Thu"]},
  "yAxis": {"type": "value"},
  "series": [{"type": "line", "smooth": true, "data": [3, 5, 4, 7]}]
}
```
{{< /cell >}}
{{< /grid >}}
{{% /folding %}}

## Adaptive spacing playground

Resize this page between desktop and phone widths. These examples keep the same
360px chart height. The plot gives the native legend more room when it wraps, and
reclaims that room when the page widens. The generated curves below are fictional
layout-test data, not a measured sampling experiment.

### No title, no reserved title gap

This small chart omits `title` and `grid`. Its plot starts near the top without a
fixed title-sized gap. There are no explicit colors or spacing options.

```echarts {caption="A titleless chart with automatic spacing"}
{
  "tooltip": {"trigger": "axis"},
  "legend": {},
  "xAxis": {},
  "yAxis": {},
  "series": [
    {"name": "UnbalancedCoin", "type": "line", "data": [[0.1,0.09989],[0.2,0.20059],[0.3,0.30313],[0.4,0.40019],[0.5,0.50013],[0.6,0.59973],[0.7,0.70198],[0.8,0.80152],[0.9,0.90012]]},
    {"name": "MakeEqualProb", "type": "line", "data": [[0.1,0.49899],[0.2,0.49846],[0.3,0.50038],[0.4,0.49917],[0.5,0.50181],[0.6,0.50022],[0.7,0.49805],[0.8,0.49997],[0.9,0.49956]]}
  ]
}
```

### Ten series: adaptive spacing

All ten legend entries stay visible. On a narrow screen the additional legend rows
should remain below the x-axis labels. Try toggling series, changing the color mode,
and widening the window again. The chart title stays at its native position.

{{< echarts src="charts/adaptive.json" caption="Ten series with adaptive spacing" />}}

### Comparison: explicit spacing

The same data with explicit `grid.top: 65` and `grid.bottom: 80` keeps ECharts'
fixed spacing. Sidera does not override it. This intentionally reproduces the
crowded legend on narrow screens so you can compare the two behaviors.

{{< echarts src="charts/fixed-spacing.json" caption="Ten series with fixed spacing" />}}
