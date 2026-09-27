---
title: "Diagrams with their sources"
date: 2026-06-02
summary: "Local Mermaid and drawio rendering, source downloads and explicitly remote GitHub badges."
---
## Ordinary Mermaid fences

The source stays an ordinary `mermaid` fence. No front-matter flag is needed.
Rendering happens locally; the controls zoom and scroll an inert vector image.

```mermaid {title="A local flowchart"}
flowchart LR
  A[Read source] --> B@{ shape: f-circ }
  B --> C[Render locally]
  C --> D[Keep the source]
```

```mermaid {title="A short Git history"}
gitGraph:
  commit id: "A"
  commit id: "B"
  commit id: "C"
```

## Original drawio files

The native file is the source of truth. This harmless example includes an HTML label
and a locally bundled polygon stencil. Download it to edit in your local app; no
online editor is opened and no diagram is sent to a hosted service.

{{< diagramsnet src="flow.drawio" title="Source to local view" >}}

## Fold, grid and explicit inversion

Native container notation is unchanged: outer `%`, nested `<`. Opening a hidden fold
allows its diagrams to render. A deliberate inversion wrapper uses a fixed light
renderer palette so automatic dark recoloring does not invert it twice.

{{% folding title="Inspect diagrams in a two-column grid" %}}
{{< grid columns=2 >}}
{{< cell >}}
```mermaid {title="A hidden diagram"}
flowchart BT
  a((a)) & b((b)) --> nand --> out(((out)))
```
{{< /cell >}}
{{< cell >}}
{{< block class="invert-when-dark" >}}
{{< diagramsnet src="flow.drawio" title="Explicitly inverted group" >}}
{{< /block >}}
{{< /cell >}}
{{< /grid >}}
{{% /folding %}}

## GitHub badges are external images

This public upstream repository is an example, not a Sidera dependency declaration.
The badges load directly from **Shields** as ordinary images, according to the
approved automatic-loading policy. Their provider may be unavailable or return stale
information. The repository link remains useful independently.

{{< badge_github user="mermaid-js" repo="mermaid" branch="develop" release=true >}}

## Source-only states

```mermaid {disabled=true title="Rendering deliberately disabled"}
flowchart LR
  Source --> Available
```

{{< diagramsnet src="flow.drawio" disabled=true >}}

{{< badge_github user="mermaid-js" repo="mermaid" disabled=true >}}

## Conversion recipes

- Mermaid fences stay fences. Keep B's approved `block` conversion for explicit inversion.
- `{% diagramsnet diagram.drawio %}` becomes the following, with the native file beside the page:

```text
{{</* diagramsnet src="diagram.drawio" title="A useful description" */>}}
```

- `{% badge_github owner repository release:true branch:beta %}` becomes:

```text
{{</* badge_github user="owner" repo="repository" release=true branch="beta" */>}}
```

No original article prose or diagrams were copied into this specimen.
