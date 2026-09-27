---
title: "Video without a player service"
date: 2026-06-01
lastmod: 2026-06-01
summary: "Native MP4 controls, deliberate loading and a source link that remains useful."
---
## Load, then play

This two-second **silent test pattern** is a small local MP4, not a third-party clip.
Load it deliberately, then use the browser's controls to play, pause, seek or expand.
Nothing plays automatically. The file contains no speech or other audio.

{{< video src="motion.mp4" width=480 title="Silent test pattern · two seconds" >}}

The maximum frame width is 480 pixels; narrower screens constrain it. The video keeps
its natural aspect ratio. The file link also works when scripting or playback fails.

## Inside existing containers

The outer container uses `%`; nested components use `<`. A video inside a closed
fold makes no media request until you open the fold **and** load the video.

{{% folding title="A video in a grid" %}}
{{< grid columns=2 >}}
{{< cell >}}
{{< video src="motion.mp4" width=320 title="The same local test pattern" >}}
{{< /cell >}}
{{< cell >}}
### Keep the source accessible

A normal resource link is still useful beside the player. No metadata-fetch service
or replacement for the existing link card is involved.

{{< link href="motion.mp4" text="Open the local MP4" >}}
{{< /cell >}}
{{< /grid >}}
{{% /folding %}}

## Explicitly disabled

{{% box title="File access without embedded playback" %}}
{{< video src="motion.mp4" title="Disabled playback example" disabled=true >}}
{{% /box %}}

Disabling the player does not hide or redact the file. Only the ordinary source link
is offered; no player controller is needed when a page contains only disabled players.

## Migration recipe

The original site's one active video call supplies an MP4 URL and `width:480px`:

```text
{% video https://assets.leetcode.com/uploads/2020/09/30/angle.mp4 width:480px %}
```

Use named Hugo arguments, with a numeric width:

```text
{{</* video src="https://assets.leetcode.com/uploads/2020/09/30/angle.mp4" width=480 title="Field-of-view illustration" */>}}
```

That URL above is **source text only**. This specimen never loads it. A remote video
connects to its host only when a reader chooses Load video or opens the file link.
No copy is downloaded during the Hugo build. Local inputs use exact page resources;
there is no whole-site filesystem search or fallback to another bundle.
