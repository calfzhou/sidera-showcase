# Fieldbook — a normal Sidera site

Fictional English notes, journal, authors/series, handbook and standalone page. Uses the
live theme checkout, not target HTML or a copied theme. No font/CDN/service dependency.
The theme's generic defaults still work in the parent stress/organization showcase.

From the showcase root, choose a free port:

```sh
hugo server --source examples/notebook --bind 127.0.0.1 --port 14420 --disableFastRender
```

Start at `/notes/` and `/notes/package-management/`; also inspect `/`, `/tags/`,
`/notes/tags/tools/python/`, `/authors/rowan/`, `/series/making-notes/`, `/preset/notes/`,
`/journal/`, `/handbook/`, `/handbook/start/` and `/about/`.
The overview home remains the default. `list_header=false` only on the notes root removes
its redundant title/intro; counts, paging and contextual term-page titles remain visible.

Use `--config hugo.toml,widgets.toml` for an authored right profile/links variant;
`--config hugo.toml,chinese.toml` for Chinese theme UI around unchanged authored English copy.
The larger optional-cover/full-components configuration remains in the parent showcase.
Stop the foreground server with Ctrl-C. Actual bundled theme docs are not enabled here.

Identity: the icon and the complete title/subtitle box link home. Hover/focus the icon for
the rotating rainbow ring; hover/focus the text box to reveal the second half of
`params.identity.subtitle` (`first | second`). No underline or JavaScript is needed.

Menu accents: Notes uses `menus.primary.params.color = '#3dc550'`, Journal uses
`'#ffbd2b'`. Omit/clear the entry color for the theme default. Hover/focus accents the icon;
current pages and their menu ancestors also show the matching 8px dot. Labels stay neutral.

Recent content: Notes chooses `{component: recent, config: {order: publication}}`, Journal
keeps `recent` (updates), and Handbook uses both orders as independent recent instances.
Each can override count/sections while inheriting the native owner scope. Compact rows show only the title; long titles
are ellipsized with the full text in the browser's native hover tooltip.
