# Sidera showcase

Synthetic fixtures and regression harness for the independent Hugo Sidera theme. The active
`themes/sidera` Git submodule is also the theme-development checkout. No sibling theme clone,
Go-module dependency change, symlink, Hexo runtime or package download is required.

P2-F's shell is accepted. **P2-M now implements the agreed content/configuration model**:
portable params, optional native presets with separate section/descendant defaults, independent
scope boundaries, page-tree capabilities, shared classification, multiple authors and scoped
series. G/H still own final browsing/reading/footer finishing; this is not whole-P2 completion
or real-site conversion. The inactive PoC source was retired separately; skeleton/history remain.

## Clone and develop

```sh
git clone --recurse-submodules git@github.com:calfzhou/sidera-showcase.git
# Existing checkout:
git submodule update --init --recursive
# For intentional theme development (updates may detach HEAD):
git -C themes/sidera switch main
```

Edit the nested checkout; Hugo reads local changes without committing/pushing. Commit theme
first, then the showcase gitlink. Push neither without authorization; if publishing later,
push the theme commit before its showcase pointer. The submodule's main branch hint is not
`--remote`: ordinary update uses the pinned commit. Preserve local changes before any update.
Plain `git archive` omits submodules; exact-source reproduction needs an initialized checkout.

## Build and preview

Verified with Hugo **0.166.0+extended+withdeploy** on macOS. This is a tested version, not an
assertion that the extended/deploy features are required or every older version works.

```sh
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/build-XXXXXX")
hugo --destination "$run/public" --cacheDir "$run/cache" \
  --panicOnWarning --printPathWarnings --printI18nWarnings

# User-owned convenience preview; choose a free port, stop with Ctrl-C:
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender
```

Only fresh successful builds to new destinations are authoritative. Known watcher/stale-output
limitations remain D-010's migration tolerance; --disableFastRender is not a fix. Never publish
a failed build. No agent-owned preview is retained at handoff.

## Theme-owned definitions, site-owned content

Sidera supplies tags, categories, authors, series and preset definitions, native term URLs,
and bundled blog/notes/docs preset term Pages. Showcase config contains only import permission:

```toml
[taxonomies]
_merge = 'shallow'
[permalinks.term]
_merge = 'shallow'
```

Hugo needs these category-specific gates to import theme configuration. There is no repeated
taxonomy declaration/preset registry or root-wide/security/markup merge. Date chains, timezone,
language, page permalinks and pagination remain deliberate site policy. Journal retains its
native `/journal/YYYY/MM/DD/slug/` URL rule; its convention treats date as publication date.

Read the self-contained theme guides:

- [CONTRACT.md](themes/sidera/CONTRACT.md): fields/types, ownership, scopes, validation and limits.
- [PRESETS.md](themes/sidera/PRESETS.md): three targets, bundled defaults, native overrides/custom terms.
- [TAXONOMIES.md](themes/sidera/TAXONOMIES.md): global/scoped tags/categories/authors/series.
- [DOCS.md](themes/sidera/DOCS.md): native body/tree/order/pagers and explicit docs mount.
- [SHELL.md](themes/sidera/SHELL.md): native menus, fixed regions, safety and native hooks.
- [I18N.md](themes/sidera/I18N.md): EN/ZH configuration, overrides and filename-language boundary.

The optional workspace [migration-project](../migration-project/README.md) holds decisions/history;
it is **not** a build or test dependency. Real-site/Stellar/Hugo-doc reference repos are not inputs
to the ordinary build or regression suite.

## Content model

```yaml
# A section's _index.md
preset: notes
params:
  list_order: modification
  page_size: 10
  # Only for an independently browsed nested section:
  scope_root: true
cascade:
  target:
    kind: page
  params:
    byline: Field team
    show_updated: true
```

Top-level content sections are roots automatically. Nested sections remain in the nearest
outer browsing scope unless local scope_root is true. Preset selection never starts a scope.
A section without any preset can configure identical capabilities. Ordinary section params
configure itself; native cascade provides descendant metadata. Native effective Page.Params
wins before target-specific preset defaults. Empty/false/maps/arrays retain deliberate semantics.

Public custom fields are under params, not a blanket params.sidera wrapper. Native metadata,
menus and taxonomy assignments stay native. No old-key/type aliases or duplicate article-owner
IDs. Private generated navigation fields remain under params.sidera and cannot be authored.
The presets are defaults, not closed blog/docs/notes capability types.

The original synthetic collections remain Journal, Dispatches, Field notes and Lab notes;
Storage is a native nested section, not a separate Lab collection. A site-owned Workshop
handbook demonstrates body-bearing branch/leaf documents, local ordering and child pagination.
An isolated Annex test adds an independent nested scope using content/config only.

## Authors and series walkthrough

Journal's First/Second signal and Field's Alpha now demonstrate fictional native attribution
and a shared `model-workshop` series term. Author profiles and series metadata are site content,
not theme defaults. One term may span sections; the section-scoped sequence does not mix them.

```yaml
authors: [demo-editor, demo-researcher]
series: model-workshop
```

Inspect `/authors/demo-editor/`, `/series/model-workshop/`,
`/journal/series/model-workshop/`, `/field-notes/series/model-workshop/`, and the corresponding
articles. Authors preserve authored order; show_authors=false hides display, not membership.
Series links normally prefer contextual results; previous/next is scoped and independent of
pagination/pins. Optional native series_weight ordering is a series-term policy.

To expose all four contextual taxonomy choices without editing the theme:

```sh
hugo server --config hugo.toml,examples/model.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

Other same-theme configurations: `examples/full-shell.toml`, `two-regions.toml`, `compact.toml`,
`empty-regions.toml`, `taxonomies.toml`, `taxonomies-flat.toml`, and the native per-page example in
[scoped-frontmatter.md](examples/scoped-frontmatter.md). Whole-site overrides of preset values
use native config cascade; Site.Params alone is lower-priority fallback. Footer APIs and local covers are now documented in the theme SHELL.md.
Default global classification is flat. The named collection fixtures explicitly retain hierarchy
examples; taxonomy demo configs deliberately exercise global hierarchy/flat variants.

## Docs remain opt-in

The site handbook at `/guidebook/` is ordinary site content. The separate theme sample lives
only in `themes/sidera/docs/content` and is **absent by default**:

```sh
hugo server --config hugo.toml,docs-on.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

This explicit native mount publishes the sample at `/sidera/`; `docs-off.toml` demonstrates
removing the opt-in. The bundled docs **preset term** is not permission to publish theme docs.
Sample content/resources are not copied into site source. Both root and nested mount namespaces,
native override/language/resource/order behavior remain in the regression suite.

## Tests

Python 3.9+ stdlib via installed uv; no Python package install. Tests create fresh ignored .checks
runs, retain logs/output, never overwrite public, and stop their own HTTP/browser processes.

```sh
uv run --no-project --no-managed-python python3 tests/check_model.py
# The preceding command prints its retained run; optional focused browser check:
# nvm use (selects .nvmrc; installed Node 24.12.0)
# node tests/check_model_browser.mjs /absolute/path/to/that/run

uv run --no-project --no-managed-python python3 tests/check_theme_defaults.py
uv run --no-project --no-managed-python python3 tests/check_theme_packaging.py
uv run --no-project --no-managed-python python3 tests/check_p1a.py
uv run --no-project --no-managed-python python3 tests/check_p1b.py
uv run --no-project --no-managed-python python3 tests/check_p1c.py
uv run --no-project --no-managed-python python3 tests/check_journal_urls.py
uv run --no-project --no-managed-python python3 tests/check_taxonomies.py
uv run --no-project --no-managed-python python3 tests/check_namespace.py
uv run --no-project --no-managed-python python3 tests/check_p2w.py
uv run --no-project --no-managed-python python3 tests/check_p2f.py
```

The historical check_namespace filename now verifies **public params and private generated
metadata**, including removal of old namespace readers, native fields, empty/false and menu icons.
Packaging compares active-theme/in-place config/data/assets/adapters, local edits/site overrides
and the retained skeleton's measured gaps. No PoC source or obsolete schema back-conversion.

P2-A/B/C scripts also run the installed-browser harness; select .nvmrc before them. It starts
its own Chrome/profile on explicit available ports (default HTTP 14378/CDP 14379), verifies its
instance and stops it. Never attach tests to a user browser or stop an occupied unrelated port.
P2-W/F/taxonomy browser scripts reuse isolated prepared runs. No connector is needed for these
repository-local tests, no browser/dependency download. Chromium checks are not universal WCAG/
screen-reader/Safari/Firefox/CSP certification. Images are local/system-font evidence.

Structural validation of unreferenced excluded content uses a separate private native build with
--buildDrafts --buildFuture --buildExpired; draft is not a validation exemption. Current contextual
vocabulary discovery is bounded to supported local literal TOML/YAML and built-in source roots,
not arbitrary mounts/generated/cascaded vocabulary or full Hugo-loader parity. Harmless empty
inferred term pages remain tolerated during migration; privacy/public-list lifecycle needs the
relevant production review. Historical watcher/inventory probes are optional, not prerequisites
or permission to edit the read-only real site. License/distribution and whole-P2 acceptance remain open.


## P2-G component and footer preview

From this checkout, choose a free port and run your own foreground server:

```sh
hugo server --config hugo.toml,examples/full-shell.toml,examples/components.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

Inspect `/field-notes/` (local diagram cover + term badges), `/journal/2024/01/01/first-signal/`
(ordered authors, scoped series and both footers), `/guidebook/getting-started/setup/`
(tree + TOC), `/authors/demo-editor/` and a term result/pager. Hover/focus the card title,
activate a term independently, expand a tree while retaining its parent link, scroll a
heading-rich body, and switch Light/System or narrow the window. All content is synthetic.

Use `examples/compact-footer.toml` last for the contrasting no-sidebar/no-article-footer,
text-first/credit-off composition. This is an explicit override, not a standalone limitation.
The default home remains collection overview; whole-site/non-content finishing is superseded by the corrective P2-GR section below;
selected-home and detailed Markdown work remain separate. The examples do not assign a content license or require theme template edits.
Footer arrays/text/menu selectors are public params with existing preset/cascade precedence;
see the theme SHELL/CONTRACT guides for defaults, empty behavior and small native hooks.

Focused checks (existing Python/Node/Chrome only):

```sh
uv run --no-project --no-managed-python python3 tests/check_p2g.py
# Then, using the printed retained directory:
nvm use
node tests/check_p2g_browser.mjs /absolute/path/to/retained/run
```

The browser check samples components/states rather than reproducing every historical matrix.
It uses explicit free local ports (SIDERA_HTTP_PORT/SIDERA_CDP_PORT can override defaults),
a fresh owned Chrome profile, blocks HTTPS, and stops its services at completion. No server
is left for review. Stop your own preview with Ctrl-C. Fresh builds remain authoritative.


## P2-GR — Stellar-like normal presentation

The live theme now uses the Stellar-led composition across the default showcase as well as
normal sites: bounded reading track/inset cards, full-height left rail, banner-like headers,
quiet TOC/footer hierarchy, local Solar icons, fine-pointer spotlight/tilt and narrow-screen
drawers. Native Hugo scope/preset/author/series and all optional cover/footer controls remain.

For a normal text-first example, see [Fieldbook](examples/notebook/README.md):

```sh
hugo server --source examples/notebook --bind 127.0.0.1 --port 14420 --disableFastRender
```

This is a real site source consuming the same submodule, not static target HTML. Inspect
`/notes/`, `/notes/package-management/`, `/`, taxonomies, authors/series, handbook and About.
The original default showcase and full-components/compact variants still work. The sole new
presentation setting is `params.list_header` (true by default): false removes a redundant
recursive section intro while retaining an accessible title, full counts and paginator.

Narrow screens now use native auto-popovers (right ≤1180px, left ≤667px), with Escape,
light-dismiss, explicit close and focus return. No-JS/unsupported browsers retain open in-flow
navigation. Local/system fonts only; see theme THIRD-PARTY-NOTICES for Solar CC BY 4.0,
Stellar MIT and the React Bits-derived hover notice. No license is assigned to site content.

Focused corrective checks:

```sh
uv run --no-project --no-managed-python python3 tests/check_p2gr.py
nvm use
node tests/check_p2gr_browser.mjs /absolute/path/to/printed/run
```

The browser harness creates a fresh profile even on rerun and stops its owned services.
The corrective browser suite covers normal page types and live hover, TOC, drawers, keyboard,
no-JS, reduced motion and configurable layouts. This is not cross-browser/production certification.
