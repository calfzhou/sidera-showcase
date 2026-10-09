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
