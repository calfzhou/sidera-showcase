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
arrays replace rather than append. Components support independent `{component, config}` instances:

```yaml
params:
  right:
    - toc
    - component: recent
      config: {order: publication, count: 5}
    - component: recent
      config: {order: modification, count: 8}
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
