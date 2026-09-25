# Sidera showcase — Fieldbook

One normal, fictional site for developing and reviewing Sidera. **Root `content/` is the only
live showcase source.** The active `themes/sidera` Git submodule is the theme-development checkout.
No alternate example site, duplicate theme checkout, symlink, Go-module change or package install
is required. P2 visual review is ongoing; this is not a production migration or phase-closure claim.

## Clone, preview and build

```sh
git clone --recurse-submodules git@github.com:calfzhou/sidera-showcase.git
# In an existing checkout:
git submodule update --init --recursive
# For theme development, after checking for local changes:
git -C themes/sidera switch main

# From the showcase root, choose a free port; stop with Ctrl-C:
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender
```

The retired `--source examples/notebook` command is no longer needed. Restart an old preview
from the root rather than pointing it at the removed example folder. No agent-owned review
server is retained. Source edits are read directly from the submodule; commit theme changes
first, then the showcase pointer, and push neither without authorization.

Verified with Hugo **0.166.0**. Fresh successful builds remain authoritative; the accepted
watcher/stale-output limitations are unchanged, and `--disableFastRender` is not a fix:

```sh
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/build-XXXXXX")
hugo --destination "$run/public" --cacheDir "$run/cache" \
  --panicOnWarning --printPathWarnings --printI18nWarnings
```

## Live content

| Collection | Preset | Demonstrates |
|---|---|---|
| `/journal/` | blog | Publication stream, category tree/tag chips, archives, native author and series links |
| `/notes/` | notes | Evolving notes, hierarchical tags, pins, pagination, publication-order sidebar |
| `/handbook/` | docs | Three levels below the root, sibling branches, ordered parent/leaf pages, two recent instances |

The page-tree review path `/handbook/workflows/writing/outline/` has three levels **below**
Handbook. Writing and Research are sibling branches; Reference is a separate top-level branch.
Parents have their own content and explicit child ordering, so both navigation and disclosure
behavior can be examined without changing the theme.

The overview home remains the default. Shared author `/authors/rowan/`, series
`/series/making-notes/`, taxonomy views and `/about/` complete the example. Content/dates/identity
are fictional. Additional collections should demonstrate a concrete capability, not duplicate
another default preview.

**Journal keeps the established dated-URL policy.** Its current articles are:

- `/journal/2026/04/10/beginning/`
- `/journal/2026/04/11/returning/`

Native menu `pageRef` values still use source paths such as `/journal/beginning`; Hugo supplies
the dated URL. Original root date/lastmod fallback chains and Asia/Shanghai timezone remain.
No redirects or real-site URL migration were introduced.

## Configuration and examples

Root `hugo.toml` owns the Fieldbook identity, menus, footer copy and site URL/date policy.
Sidera supplies taxonomy definitions, term URLs and native preset defaults. The site imports
only `[taxonomies]` and `[permalinks.term]` with `_merge='shallow'`; it does not duplicate them
or broadly merge security/markup configuration.

All `examples/*.toml` files are **overlays on this same root content**:

```sh
hugo server --config hugo.toml,examples/widgets.toml --bind 127.0.0.1 --port 14420 --disableFastRender
hugo server --config hugo.toml,examples/chinese.toml --bind 127.0.0.1 --port 14420 --disableFastRender
hugo server --config hugo.toml,examples/full-shell.toml,examples/components.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

- `widgets`: right TOC/profile/links; `full-shell`: alternate menu with a nested Journal link.
- `components`: footer columns/links and an optional local mark cover on the Color note.
- `compact`, `compact-footer`, `empty-regions`: contrasting shell/footer defaults.
- `taxonomies`, `taxonomies-flat`, `model`: global classification and contextual author/series links.
- `scoped`: compact About; [scoped front-matter examples](examples/scoped-frontmatter.md) explain local overrides.
- `chinese`: Chinese theme UI around unchanged authored English content, not automatic translation.

Native Page/section settings can override a config cascade. For example, Notes explicitly selects
its publication-order recent list; compact defaults are easiest to inspect on Home/About. Region
arrays replace rather than append. Components support independent inline instances and reusable named widgets. Define a widget
once under site/language `params.widgets`, then use its name in a region:

```yaml
params:
  widgets:
    welcome:
      component: text
      config:
        title: Welcome
        text: 'Notes, experiments, and useful things to return to.'
  left: [menu, welcome, recent-published]
  right:
    - widget: recent-updates
      config: {count: 3}
```

Theme-owned guides:
[CONTRACT](themes/sidera/CONTRACT.md) · [PRESETS](themes/sidera/PRESETS.md) ·
[SHELL](themes/sidera/SHELL.md) · [TAXONOMIES](themes/sidera/TAXONOMIES.md) ·
[DOCS](themes/sidera/DOCS.md) · [I18N](themes/sidera/I18N.md).
They define scope/preset independence, exact types/precedence/safety, instance options and source limits.
Fonts are local/system fallbacks; icon/style notices are in the theme. No content license is inferred.

## Theme docs remain opt-in

`/handbook/` is ordinary site content. The separate theme sample is absent by default:

```sh
hugo server --config hugo.toml,docs-on.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

This publishes the theme-owned sample at `/sidera/` through native mounts. Append `docs-off.toml`
to remove that opt-in. The always-available docs **preset term** is not the sample itself.
No theme docs are copied into root content.

## Tests: live showcase versus intentional fixtures

The former organizational showcase is preserved in
[`tests/fixtures/organization`](tests/fixtures/organization/README.md), including its original
config, resources and matching test overlays. It is **test input, not a second maintained preview**.
It keeps purposeful multiple-collection, isolation, hierarchy, date, pin, pagination, resource,
author/series and docs edge cases out of the normal site's editorial content.

- `copy_site()` assembles those stable fixture inputs with the **current** theme in a test directory.
- `copy_showcase()` copies the real root site for live configuration/UI checks.
- No theme is stored in the fixture and neither content tree is mounted into the other.
- Existing semantic fixture assertions remain; root presentation tests follow the live site.

Python uses installed uv/stdlib; Node uses `.nvmrc` (24.12.0). Runs write fresh ignored output,
never overwrite root `public/`, and stop their owned HTTP/Chrome processes:

```sh
uv run --no-project --no-managed-python python3 tests/check_showcase.py
uv run --no-project --no-managed-python python3 tests/check_identity.py
uv run --no-project --no-managed-python python3 tests/check_menu.py
uv run --no-project --no-managed-python python3 tests/check_p2gr.py
nvm use
# Use the matching Python check's printed directory:
node tests/check_identity_browser.mjs /absolute/path/to/identity/run
node tests/check_menu_browser.mjs /absolute/path/to/menu/run
node tests/check_p2gr_browser.mjs /absolute/path/to/p2gr/run
```

Organization/model/configuration suites remain under their established names: `check_p1a.py`,
`check_p1b.py`, `check_p1c.py`, `check_journal_urls.py`, `check_theme_packaging.py`,
`check_theme_defaults.py`, `check_namespace.py`, `check_model.py`, `check_taxonomies.py`,
`check_p2w.py`, `check_p2f.py`, `check_p2g.py`, `check_p2c.py`, `check_instances.py`,
`check_recent.py` and `check_browsing.py`. Invoke them with the same uv command. P2-C supports
`SIDERA_SKIP_BROWSER=1` for its configuration/catalog portion. Historical A/B/F browser matrices
retain old fixed visual assumptions; they are not the current visual-fidelity gate.

Focused instance/browsing browser suites consume their corresponding Python output directory.
For `check_recent_browser.mjs`, first build the live root to that run's `normal-public` destination.
For the root-only scrolling check:

```sh
run=$(mktemp -d "$PWD/.checks/sidebar-scroll-XXXXXX")
hugo --destination "$run/baseline-public" --cacheDir "$run/cache" --panicOnWarning
node tests/check_sidebar_scroll_browser.mjs "$run"
```

`check_tree_presentation_browser.mjs` uses a root build plus the organizational fixture's generated
`generic-public` and a root widgets build; `tests/prepare_root_browser.py` prepares those three.
Tests use explicit free HTTP/CDP ports (14378/14379 by default), a fresh owned Chrome profile and
no downloads; they never attach to user profiles or stop unrelated occupied ports. Chromium checks
are not full screen-reader/WCAG/Safari/Firefox certification.

For structural validation of excluded content use a separate private build with
`--buildDrafts --buildFuture --buildExpired`. Drafts are not a structural exemption. Contextual
route discovery remains bounded to supported local literal TOML/YAML sources, not universal
mount/generated-content or publication/privacy certification. No failed build is publishable.

Exact-source reproduction requires initializing the pinned submodule—plain `git archive` is
incomplete. The coordination/history repository in the sibling migration workspace is optional,
not a build/test input; original-site/Stellar/Hugo-doc repositories remain read-only references.

Wrapped tree-row alignment is checked with `tests/check_tree_alignment_browser.mjs` against a
normal root build (`baseline-public` in its run directory). It tests page/tag/category arrows
with short and multiline labels, open/closed branches, desktop/mobile, aligned counts, native
keyboard/accessibility state and no-JS enlarged text. Tree titles wrap; recent rows still truncate.

Named-widget and footer checks: run `tests/check_widgets.py` and `tests/check_site_footer.py`
with the same uv command. Their browser counterparts consume each printed run directory. The
root welcome widget is reused by Home/About; Notes uses recent-published; Handbook defines its
8-entry update widget once and references it by name. Footer links are text-first and visually
neutral for current pages, with keyboard/hover feedback retained.


## Social footer and visitor color mode

The bottom of the left bar is a configurable `left_footer` region, defaulting to the `social`
component. Root `menus.social` currently demonstrates Email, Code and the optional color-mode
action. The two local SVGs live in `assets/icons`; they are site-owned examples, not theme/vendor
logos. Replace the menu destinations/assets with the site owner's choices (maximum six entries).

Set `params.color_mode` to `dark`, `light` or `auto` (Sidera defaults to auto; Fieldbook explicitly
chooses dark). A saved visitor choice wins. The optional menu action uses
`params.onclick = 'Sidera.cycleColorMode()'` and cycles dark/light/auto; removing it does not add
a replacement selector. Source strings are not executed as arbitrary JS. See theme SHELL.md.

Focused checks: `check_social.py` prepares defaults/menus/safety fixtures, then
`node tests/check_social_browser.mjs /absolute/path/to/printed/run` exercises the actual cycle,
storage/OS behavior, pinned footer, local icons, optional control, keyboard/mobile/no-JS behavior.


Color-mode switching now uses the shared `Sidera.toast(text, duration)` feedback helper. It slides
in from the top, waits briefly and disappears; only the explicit cycle action announces a mode
change. Public config/API names now match Color mode: params.color_mode and Sidera.cycleColorMode/setColorMode. To check
motion, safe text, rapid replacement, mobile drawer layering and reduced-motion/no-JS behavior,
build root output as `baseline-public` plus the Chinese overlay as `chinese-public` (baseURL
`https://example.org/_chinese/`) in a fresh run directory, then run
`node tests/check_notifications_browser.mjs /absolute/path/to/run`.


TOC rendering/state check:

```sh
SIDERA_CHECK_DIR="$PWD/.checks/toc-new-run" uv run --no-project --no-managed-python python3 tests/prepare_toc_browser.py
nvm use
node tests/check_toc_browser.mjs "$PWD/.checks/toc-new-run"
```

It uses an isolated native Markdown outline (six heading levels and long labels), not target HTML,
and checks the shared track/current marker, source-like hierarchy, wrapping, actual anchor/scroll
behavior, collapse/footer, repeated instances, icons-off, mobile palettes, Chinese and no-JS.

Public naming migration: use color_mode in site/language params and color-mode for the fixed
switch icon. Update onclick to Sidera.cycleColorMode(). There are no owner-config/API aliases;
old appearance entries diagnose. Stored visitor choices are preserved through the unchanged
private browser storage key. Theme SHELL.md also lists the renamed translation/style hooks.


The site-footer `credit` item supports Markdown in the native `built_with` translation override
(`i18n/en.toml` or `i18n/zh-CN.toml`). For example:
`other = 'Built with [Hugo](https://gohugo.io/) · **Sidera**'` under `[built_with]`.
It uses the same native Markdown/raw-HTML policy as `footer_text`; the default wording stays
unchanged. `check_site_footer.py` and `check_site_footer_browser.mjs` cover translated Markdown,
HTML policy, compact typography and native keyboard links as well as the sitemap defaults.


Pager checks: set `SIDERA_CHECK_DIR` to a fresh directory and run `tests/check_pager.py`, then
`node tests/check_pager_browser.mjs <same-directory>` with the documented local browser harness.
These prepare native 0/1/6/12-page fixtures and EN/ZH/subpath builds, verify unchanged pagination
URLs/order, and inspect responsive windows, disabled/current/hover/focus states and no-JS links.
The normal showcase still uses its original content/page sizes; no extra demo collection is live.


Scoped tag/category landing pages default to term indexes for every collection (including Notes
and Handbook), using the same renderer as Journal. Flat tags remain chips; hierarchical tags
and categories retain their directory layout and scoped counts. A specific term still lists its
matching pages. Use `params.taxonomy_hubs = 'list'` on an owner only to request the alternative
all-content hub deliberately. The historical organization/annex fixtures opt into that mode to
retain their established all-content pagination tests; the normal showcase has no such override.
`check_taxonomy_hubs.py` plus `check_taxonomy_hubs_browser.mjs` cover the shared default on the live
showcase and populated blog/notes/docs/unclassified fixtures, independent scopes, pagination,
empty docs, hierarchy/counts and explicit list opt-in in EN/ZH/subpath and no-JS.


Post/note lists no longer show a count/sort row, and docs child lists no longer show a separate
child-count line. Native list accessibility metadata remains. After `check_showcase.py` builds
its run directory, run `node tests/check_list_metadata_browser.mjs <run-directory>` to verify
visible omission, retained headings/cards, accessible labels and keyboard/no-JS navigation.
