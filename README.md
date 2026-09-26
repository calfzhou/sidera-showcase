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

## Ordinary Markdown inspection

Open `/handbook/reference/markdown/` on your own root showcase server. It is also linked
from **Handbook → Reference desk → Ordinary Markdown**. The tracked leaf bundle at
`content/handbook/reference/markdown/` is the single live specimen: English/CJK prose,
headings, tight/loose/nested/task lists, links, quotes, code/line numbers, wide tables,
small local images, native figure/caption and repeated footnotes. Its prose and small
SVG reuse the earlier synthetic reading fixture, not real-site content.

```sh
# From hugo-showcase, if you do not already have your own server running:
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender
# Visit http://127.0.0.1:14420/handbook/reference/markdown/ ; stop with Ctrl-C.
```

Try the color-mode switch, narrow the window, scroll the code/table locally, follow a
TOC link and both footnote return arrows. This is H body review, not final theme acceptance;
TOC/footer/shell design stays as accepted. Chinese UI uses the existing `examples/chinese.toml`
overlay around the same deliberately mixed-language specimen.

Focused repeatable checks (fresh output only; no retained preview):

```sh
run="$PWD/.checks/markdown-$(date +%Y%m%d_%H%M%S)"
SIDERA_CHECK_DIR="$run" uv run --no-project --no-managed-python python3 tests/check_markdown.py
nvm use
SIDERA_HTTP_PORT=14462 SIDERA_CDP_PORT=14463 node tests/check_markdown_browser.mjs "$run"
```

The browser harness verifies those ports are free, uses a unique owned profile and stops
its HTTP/Chrome processes. It checks EN/ZH, both palettes, 320/390/768/1440px, native keyboard
scrolling/TOC/links/footnotes, no-JS enlarged text, image sizing and composited text/selection
contrast. Temporary standalone/branch-body cases reuse the specimen only inside the test run.
These are Chromium spot checks, not full accessibility/cross-browser certification.

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


Header-date checks: run `tests/check_article_dates.py` with `SIDERA_CHECK_DIR` pointing to a fresh
run directory, then `node tests/check_article_dates_browser.mjs <same-directory>`. Native fixture
builds cover date priority/absence/equality and show_updated opt-out; the isolated browser checks
hover/focus, no reflow, touch/no-JS and default footer omission. Timestamp and language rules remain
native Hugo. The optional footer meta component remains available only when explicitly selected.


`params.primary_date` now controls both card and article-header dates independently of sorting:
Blog defaults published; Notes/Handbook default updated. Notes can use list_order=publication
without changing its displayed date. For collection-wide overrides, use cascade.params for
children and params for the section itself (see theme SHELL.md). Explicit show_updated=false
still suppresses the update date; missing dates fall back to the other available enabled date.
`check_primary_date.py` and `check_primary_date_browser.mjs` verify presets, per-page/cascade/site/
language precedence, mixed global/scoped listings, unchanged list/child order and validation.


## Boxed article footer

Normal articles now display References (when supplied), a neutral License notice and Share.
Native terms and series remain outside the box. Authors appear as compact linked names before
the dates, not footer cards by default; custom byline stays independent. The package-management note includes an
explicit external reference; no automatic backlink/content migration is implied.

`examples/article-footer.toml` demonstrates site settings. Page `params.references` is a Markdown
array; `params.license` is Markdown, true for the localized default, or false/empty to hide.
`params.share` selects/orders link/wechat/weibo/email; false/[] hides it. Collection descendant
settings belong in native cascade.params. Optional edit_url is a literal source/edit link, not
an automatic GitHub contributor service. The existing author taxonomy supplies avatar/name cards.

Run `tests/check_article_footer.py` with a fresh SIDERA_CHECK_DIR, then
`node tests/check_article_footer_browser.mjs <same-directory>`. It covers actual Hugo QR output,
share query encoding, native disclosure/no-JS, mocked clipboard success/denial (never touching the
user clipboard), defaults/overrides/repeats/validation and EN/ZH/subpath/mobile behavior. Browser
readiness skips closed-disclosure images and unrequested lazy images; opening QR is checked
explicitly. No live share-provider/repository destination is opened by tests.


Article terms now use centered Stellar-style pills, without All tags in … / collection-category
hub links below the body. Sidebar hub links and native scoped/global term destinations remain.
`check_article_tags.py` plus `check_article_tags_browser.mjs` verify geometry, hover/focus/native
links, no-hub markup, long-label wrapping, repeated/header instances, icons-off and EN/ZH/subpath.


## Collection reading navigation

Previous / Parent / Next follows the article footer (or a recursive section's main list), separate
from series links. Set params.navigation_mode on a collection root to list, siblings or sequential.
Blog/Notes default list; Handbook defaults siblings. Switching Handbook to sequential flattens its
existing tree parent-first without altering child order or dates. Do not cascade this root policy.
The root's main-list mode includes pins and spans pagers; all modes stay in the same language/scope.
Parent is shown in siblings/sequential only, not list mode.

Run `tests/check_page_navigation.py` with a fresh SIDERA_CHECK_DIR, followed by
`node tests/check_page_navigation_browser.mjs <same-directory>`. Fixtures cover all three modes
across all presets and unclassified roots, exact reciprocal targets, nested scopes, native excluded
states, bilingual/subpath URLs, root-policy validation and canonical-only controls. Browser checks
use real local keyboard links, no external navigation or user browser session.


## Journal series demonstration

Journal contains nine posts, with interleaved publication dates:

- **Making notes:** four parts — Begin with a small notebook → The value of returning →
  Connect the useful parts → Review without rewriting everything.
- **Quiet software:** three parts — Start with the default → Reveal one layer at a time →
  Make the exit obvious.
- **Standalone:** A walk without a checklist and A small maintenance window (pinned).

Open `/journal/series/`, `/journal/series/making-notes/` or `/journal/series/quiet-software/`.
The main list remains pinned-first/newest-first. Each series reads oldest-first, independently.
For example, Connect the useful parts links to Review without rewriting everything within its
series, but its general Next link leads to Start with the default in the main Journal list.
The two original articles and URLs are unchanged; theme code/page size are unchanged.

`check_showcase.py` asserts the nine-post order, both complete series and their endpoints, absence
of series navigation on standalone posts, and the independent collection-navigation sequence.
After that check, build `chinese-prefixed-public` into the same run folder using
`hugo --config hugo.toml,examples/chinese.toml --baseURL https://example.org/_chinese/` with explicit
`--destination` and `--cacheDir` paths. Run `node tests/check_journal_series_browser.mjs <run-folder>`
to check actual series links, mixed lists and EN/ZH/mobile/no-JS behavior.


Journal cards now identify series membership with a compact name/position badge. The existing
article-footer series block includes a collapsible ordered outline and current-part highlight;
its Previous/Next in series remain separate from collection reading links. Non-series posts keep
no badge/block. Ordering is always oldest publication first, with stable ties and undated last;
series weights and collection pins cannot change it. The former series_order=weight now diagnoses.

Run `tests/check_series_presentation.py` with a fresh SIDERA_CHECK_DIR, then
`node tests/check_series_presentation_browser.mjs <same-directory>` for exact positions, scoped/
global chronology, hidden/standalone/singleton/repeated states, native badge pointer navigation,
keyboard/current outline, EN/ZH/subpath/mobile/no-JS and the removed weight-mode diagnostic.


Top-bar surface checks: build normal output to `baseline-public` and the Chinese overlay to
`chinese-public` (baseURL `https://example.org/_chinese/`) under one run folder, then run
`node tests/check_topbar_browser.mjs <run-folder>`. This checks solid rest vs. layered pinned glass,
return-to-top/reset/viewport events, unchanged dimensions, pointer/keyboard destinations, horizontal
scroll isolation, light/dark and no-JS. No browser user profile or external destinations are used.


The series outline now replaces the separate Previous/Next in series pair. Chapter links remain
in chronological order, with the current part highlighted; the general collection navigation is
unchanged. The showcase contact sentence moved from cascade.params.article_text to
cascade.params.article_end_text: it appears after navigation and any docs child cards as the final
article section. Footer article_text remains available independently for authored footer content.
No comment system is installed; sidera/article-end.html is the final integration slot for later.
`check_article_end.py` and `check_article_end_browser.mjs` verify placement, safe Markdown/empty
values, canonical-only rendering, no duplicate controls, and native chapter links in EN/ZH/mobile.


Compact author checks: `check_header_authors.py` and `check_header_authors_browser.mjs` verify
single/multiple/no-author/date combinations, comma-space separators, native profile destinations,
no default footer cards/avatars, show_authors=false, scoped links and preserved date reveal.
Explicit footer authors/edit configuration remains available; it is no longer a default item.


Header breadcrumb checks: `check_breadcrumbs.py` and `check_breadcrumbs_browser.mjs` cover
Home/collection/native ancestor links (without repeating the current page), independent nested roots, scoped taxonomy
paths, EN/ZH/subpaths, consistent insets, wrapping and hover/keyboard/no-JS navigation.
Use SIDERA_CHECK_DIR for the build output and pass that directory to the browser script.


Heading-marker checks: run `tests/check_heading_markers.py` with a fresh `SIDERA_CHECK_DIR`,
then `node tests/check_heading_markers_browser.mjs <same-directory>` using `.nvmrc` and free
HTTP/CDP ports as above. H2/H3/H4/H5 use Stellar's `#` / `=` / `|` / `:` permalink markers;
H1/H6 stay unmarked. The existing ordinary-Markdown page demonstrates these levels without
another live specimen. Native anchors, formatted heading links and safe attributes are preserved.


External article links now show a quiet `↗` suffix; the ordinary-Markdown specimen contrasts
Hugo documentation with an internal Handbook link. This enhancement leaves native href/target
behavior intact and does not decorate menus, metadata, footers, mail/tel or image-only links.
With scripts disabled, the original links remain usable without suffixes.

For focused checks, use a fresh `SIDERA_CHECK_DIR` with `tests/check_external_links.py`, then
`node tests/check_external_links_browser.mjs <same-directory>`. Both commands use
`SIDERA_HTTP_PORT=14462` by default for this fixture's same-origin absolute link; supply the same
explicit free port to both when changing it, plus a free `SIDERA_CDP_PORT` for the browser.
