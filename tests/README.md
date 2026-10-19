# Focused regression checks

Hugo 0.166.0 extended; Python 3.11+ uses the standard library (`make check` selects an installed version via uv). Run from the repository root:

```sh
make check
SIDERA_CHECK_DIR="$PWD/.checks/source-links-$(date +%Y%m%d_%H%M%S)" \
  uv run --no-project --no-managed-python python3 tests/check_source_links.py
```

Use a fresh path for each run. Most suites print their retained output directory;
some require SIDERA_CHECK_DIR. Read the entry point before invoking a suite. Outputs,
caches, private all-states builds and failure fixtures must never be deployed.

## Choose a suite

| Concern | Checks |
|---|---|
| HTML minification, deferred fragments, custom footer hooks and frame output | Theme `check_minify.py <fresh-absolute-output> [minified-site-output]`; fixtures and full artifact audited in `make check` and Pages CI |
| Real production prefix, manual, assets, output boundary, comments IDs | `check_pages.py <public-directory>`; `make check` builds first |
| Single live site's configuration variants | `check_showcase.py` |
| Publication/model/scopes/taxonomies | `check_organization.py`, `check_tag_routes.py`, `check_ordering.py`, `check_model.py`, `check_taxonomies.py` |
| Docs tree, optional embedding and source links | `check_docs.py`, `check_source_links.py`, theme `tests/check_manual.py` |
| Native theme packaging/overrides | `check_theme_packaging.py`, `check_theme_defaults.py` |
| UI/localization/configuration | `check_shell.py`, `check_presentation.py`, `check_localization.py`, `check_instances.py` |
| Markdown/math/code/components | `check_markdown.py`, `check_advanced_markdown.py`, `check_snippets.py`, `check_content_components.py`, `check_composition.py` |
| Charts | Theme `tests/check_charts.py <fresh-absolute-output>`; `check_charts_browser.mjs <same-output>` |
| Diagrams/video | `check_diagrams.py`, `check_videos.py`, their preview/browser peers |
| Random article | Theme `check_random.py <fresh-output>`, `check_random.mjs`; showcase `check_random_browser.mjs <same-output>` |
| Search/references/comments | `check_discovery.py`, `check_search_core.mjs`, `check_comments.py` and browser peers |
| Watcher/publication behavior | `check_preview_lifecycle.py`, focused `*_preview.py` suites |

Other descriptive `check_*.py`/`*_browser.mjs` files target individual features.
`check_asset_pipeline` and `check_reading` retain broader stress matrices; they are
not substitutes for a focused current-page visual check. Do not assume a passing
build proves accessibility, cross-browser compatibility or live deployment.

## Fixture boundaries

- `fixtures/organization` is an isolated synthetic multi-collection corpus. Its
  explicit settings preserve order/pin/tie/tag/scope tests independently of changing
  preset defaults. It is never mounted into the live site and stores no theme copy.
- `copy_site()` pairs that fixture with the current theme in fresh test output.
- `copy_showcase()` uses real demo content/configuration, with an explicit root-host
  URL control and the optional manual disabled by default for focused feature tests.
  Generated `manual-on.toml` / `manual-off.toml` files test native optional mounting;
  they are not user-facing preview configs. `manual=True` keeps the actual manual/menu.
- `check_showcase` tests that manual-enabled variant; `check_pages` checks the real,
  unmodified production prefix/configuration. Never weaken the latter by applying
  root-host controls or copying fixture content into production.
- Shared helpers live in `check_organization`, `check_tag_routes`, `check_shell` and
  `check_docs`; changes need caller checks. Theme-specific feature regressions also
  remain in `themes/sidera/tests`, with invocation guidance in the theme AGENTS.md.

## Local browser checks

Use the installed Chrome and the Node version in `.nvmrc`; no Playwright/npm install:

```sh
nvm use
# Build once into <run>/public with the real project-prefix config, then:
SIDERA_HTTP_PORT=14920 SIDERA_CDP_PORT=14921 \
  node tests/check_pages_browser.mjs /absolute/path/to/run
```

For existing feature browser suites, pass the matching Python suite's output directory.
`prepare_root_browser.py`, `prepare_shell_browser.py`, `prepare_taxonomies_browser.py`
and `prepare_toc_browser.py` prepare specialized inputs. `browser.mjs` checks free
ports and process identity, creates a new owned Chrome profile, blocks external HTTPS
and stops only its own HTTP/Chrome processes. Never attach to a user profile/server.
Use SIDERA_HTTP_PORT/SIDERA_CDP_PORT to select other free ports; CHROME_BIN can name an
installed Chrome on another OS. Browser tests are optional locally, not normal Hugo
build dependencies. Do not post comments/reactions or test real provider permissions.

## Interactive chart checks

Build the isolated theme fixture, then use its output with the owned browser harness:

```sh
run="$PWD/.checks/charts-$(date +%Y%m%d_%H%M%S)"
uv run --no-project --no-managed-python --python ">=3.11" --no-python-downloads python themes/sidera/tests/check_charts.py "$run"
nvm use
node themes/sidera/tests/check_chart_layout.cjs
SIDERA_HTTP_PORT=14960 SIDERA_CDP_PORT=14961 node tests/check_charts_browser.mjs "$run"
```

The fixture covers native fences, paired/self-closing shortcodes, bundle JSON,
separate/multiple datasets, nested components, conditional host Content/Summary,
root/project-prefix/Chinese builds and rejected unsafe inputs. Browser checks keep
all renderer requests local and verify live SVG, native legend interaction, keyboard-accessible source viewing,
self-contained downloads, legend/zoom state, palette/motion/resize, lazy folds and
no-JS/failure fallbacks. Adaptive spacing checks include continuous width sweeps
with normal animation enabled, checking per-frame axis/legend clearance and stable
margins when returning to the same width.
The live specimen is `content/handbook/reference/charts/`; private fixtures are not
mounted into the production site. Test artifacts stay under the fresh `.checks` run.

## JSX islands

Run `uv run --no-project --no-managed-python python3 themes/sidera/tests/check_jsx.py <fresh-absolute-output>`
for native compilation/resource/publication/locale validation. Run the theme
`tests/check_jsx_preview.py <fresh-absolute-output>` with `SIDERA_HTTP_PORT=14984`
for imported-helper, layout-shim and fence edits during a native Hugo preview. Build the real site
into `<run>/public`, then run
`SIDERA_HTTP_PORT=14980 SIDERA_CDP_PORT=14981 node tests/check_jsx_browser.mjs <run> <contract-run>`
with the nvm-selected Node. The optional second path exercises private failure
fixtures from the contract suite, plus no-custom-CSS form styling in page/sandbox
modes, scoped author overrides, theme tokens, native controls and prose isolation.
It also checks Stack/Row parity, gaps, native props/refs, wrapping, plain/card
appearance, and top titles/bottom captions.
Browser checks use the owned harness; screenshots
remain under the run directory. No live provider actions or external React downloads.

### Rebuilt everyday tools

`node tests/check_legacy_tools.mjs` checks the Gregorian lookup arithmetic over a
complete 400-year cycle (including the paper path), the table's leap-year gaps,
partial selections, connected path coordinates, invalid dates, string-based
Chinese numbers through 52 digits, and the legacy Kindle MD5 formula against
Node's crypto implementation. It verifies the showcase-local MD5 vendor hashes.
No GoCalf checkout, network or real device serial is used by the committed tests.

After a fresh production build into `<run>/public`, use
`SIDERA_HTTP_PORT=14986 SIDERA_CDP_PORT=14987 node tests/check_legacy_tools_browser.mjs <run>`
with the same isolated harness to check the single-sheet column alignment, blank
quadrants, connected highlights, selection/hover/focus, real pointer movement across
gaps/empty cells and area exits in fit/actual-size views, manual leap-month warnings,
fit/actual-size scrolling, input validation, local-only calculation, no source
disclosure, no-JS, and light/dark desktop/mobile.
The fixtures are the live `content/handbook/reference/legacy-tools/` examples.
