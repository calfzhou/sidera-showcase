---
title: "One palette, different roles"
date: 2026-10-22T22:48:34+08:00
lastmod: 2026-10-24T15:22:45+08:00
summary: "Eight color families and neutral across highlights, containers and Markdown alerts."
params:
  ai_label: generated
---

A family is not one fixed shade. A highlight is stronger than a box surface; a
colored label needs more contrast than a decorative border. Switch the site's
light/dark mode to compare their adaptations.

## Nine families

{{% grid min_width=180 %}}

{{< cell >}}
{{< box title="Red" color="red" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="red" >}}
{{< /box >}}
{{< folding title="More about red" color="red" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Orange" color="orange" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="orange" >}}
{{< /box >}}
{{< folding title="More about orange" color="orange" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Yellow" color="yellow" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="yellow" >}}
{{< /box >}}
{{< folding title="More about yellow" color="yellow" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Green" color="green" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="green" >}}
{{< /box >}}
{{< folding title="More about green" color="green" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Cyan" color="cyan" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="cyan" >}}
{{< /box >}}
{{< folding title="More about cyan" color="cyan" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Blue" color="blue" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="blue" >}}
{{< /box >}}
{{< folding title="More about blue" color="blue" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Purple" color="purple" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="purple" >}}
{{< /box >}}
{{< folding title="More about purple" color="purple" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Pink" color="pink" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="pink" >}}
{{< /box >}}
{{< folding title="More about pink" color="pink" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{< cell >}}
{{< box title="Neutral" color="neutral" >}}
A quiet surface with neutral body text.

{{< mark text="Highlighted detail" color="neutral" >}}
{{< /box >}}
{{< folding title="More about neutral" color="neutral" >}}
A native disclosure in the same family.
{{< /folding >}}
{{< /cell >}}

{{% /grid %}}

## Meaningful alerts

> [!note]
> Blue points to supporting information.

> [!tip]
> Green highlights a helpful suggestion.

> [!important]
> Purple calls attention to something that matters.

> [!warning]
> Yellow asks the reader to take care.

> [!caution]
> Red flags a risk. The label carries the meaning even without color.

## Independent nested colors

{{% box title="A blue context" color="blue" %}}
{{< mark text="A pink highlight" color="pink" >}} does not borrow the box's color.

{{< box title="Neutral inside blue" >}}
The omitted color stays neutral.
{{< /box >}}

{{< folding title="A green detail" color="green" >}}
> [!caution]
> This remains a red caution, even inside a green fold in a blue box.
{{< /folding >}}
{{% /box %}}

## Optional image inversion

These copies use the same light-authored source. In light mode they look identical;
in dark mode one uses full inversion and the other uses the `invert-soft` modifier.
Open either image to compare the expanded view. Downloads keep the original source.

{{% grid min_width=240 %}}
{{< cell >}}
{{< image src="inversion.svg" original="inversion.svg" alt="Full inversion example" caption="Full inversion in dark mode" class="invert-when-dark" >}}
{{< /cell >}}
{{< cell >}}
{{< image src="inversion.svg" original="inversion.svg" alt="Soft inversion example" caption="Soft inversion in dark mode" class="invert-when-dark invert-soft" >}}
{{< /cell >}}
{{% /grid %}}

```text
{{</* image src="diagram.svg" original="diagram.svg" alt="Diagram" class="invert-when-dark invert-soft" */>}}
```

## Authoring

```text
{{</* mark text="Highlighted detail" color="purple" */>}}

{{%/* box title="A blue context" color="blue" */%}}
{{</* folding title="Supporting detail" color="green" */>}}
Ordinary Markdown goes here.
{{</* /folding */>}}
{{%/* /box */%}}
```

The accepted names are red, orange, yellow, green, cyan, blue, purple, pink and
neutral. Defaults stay yellow for marks and neutral for boxes and folds.

Printed components use light shades; marks retain an underline when backgrounds
are omitted. Open a fold before printing if its contents should be included.
For more native composition examples, see [small content components](../content-components/index.md).
