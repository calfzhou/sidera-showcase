# Sidera showcase

This repository is `calfzhou/sidera-showcase`; its local folder is still named
`hugo-showcase`. The active theme is **Sidera**, a Git submodule at
`themes/sidera`. That nested checkout is also the main theme-development checkout.
The former sibling clone was moved here, not deleted or recreated. The retained
`themes/poc` and `themes/skeleton` are inactive reference/comparison fixtures.

P2-A/B/C provide the responsive theme, dark/light/system reading experience and
native English/Chinese UI over the closed P1 proof. P2-D consolidates documentation
and readiness without changing runtime behavior.
Whole-P2 acceptance remains pending; no production-compatibility claim is implied.
The theme-owned [supported contract](themes/sidera/CONTRACT.md) distinguishes required
site policies from defaults and links the native i18n/override guide. The durable
plan and decisions live in the optional workspace sibling
[migration-project](../migration-project/README.md); that repository is **not** a build
or regression-test dependency.

## Clone, build and develop

```sh
git clone --recurse-submodules git@github.com:calfzhou/sidera-showcase.git
# Existing clone:
git submodule update --init --recursive
# Before making theme commits (updates commonly detach HEAD):
git -C themes/sidera switch main
# Or create a feature branch at the intended starting commit.
```

Edit `themes/sidera` directly and run the normal showcase build below. Hugo sees
uncommitted theme edits; no push, module download, symlink or sibling checkout is
needed. Theme and showcase histories remain separate:

1. Commit theme changes inside `themes/sidera` (on the intended branch).
2. Review/stage `themes/sidera` in the showcase to record the exact theme commit.
3. Push the theme branch first, then push the showcase commit referencing it.

The submodule's `branch = main` is only a branch hint for optional remote-update
commands. Ordinary `git submodule update --init --recursive` checks out the commit
pinned by the showcase, not the latest remote branch. Do not use `--remote` for
reproducible builds. Before updates, check for local changes in both repositories.
Switching to `main` may move away from the pinned revision, so make that an
intentional development choice; a feature branch at the pin also works.

A plain `git archive` of the showcase does **not** include submodule contents.
Use a recursive clone for reproducibility checks. Local unpushed theme commits
must be published before another machine can resolve their showcase pointers.

## Run

Verified with Hugo **v0.166.0+extended+withdeploy**, Homebrew darwin/amd64. Earlier versions have not been tested. The check script uses Python 3.9+ standard library only (tested 3.9.6); `uv` 0.11.21 was used to invoke the installed interpreter, with no project environment or managed Python installation.

From this repository:

```sh
# Reproducible targeted integration checks:
uv run --no-project --no-managed-python python3 tests/check_p1a.py
uv run --no-project --no-managed-python python3 tests/check_p1b.py
uv run --no-project --no-managed-python python3 tests/check_p1c.py
uv run --no-project --no-managed-python python3 tests/check_poc_theme.py
uv run --no-project --no-managed-python python3 tests/check_journal_urls.py

# Standalone build, isolated from any pre-existing public/ output:
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/manual-XXXXXX")
hugo --destination "$run/public" --cacheDir "$run/cache" --panicOnWarning --printPathWarnings
```

Each check script creates a fresh ignored `.checks/p1a-*`, `p1b-*` or `p1c-*` directory per invocation and prints its location. It retains build logs, version, generated HTML, a result summary, and the isolated content-only extension copy; it never deletes an existing directory. Nothing under `.checks` is tracked. Build output from the old skeleton in `public/` is neither used nor evidence for these checks. A web server/browser is not needed for P1-A; visual/browser testing is not claimed.

## Minimal content contract

```text
content/
├── _index.md
├── about.md                         # standalone regular page
├── journal/_index.md                # blog; three leaf articles
├── dispatches/_index.md             # independent blog; three leaf articles
├── field-notes/_index.md            # notebook; five leaf articles
└── lab-notes/
    ├── _index.md                    # notebook; five leaf articles in total
    └── storage/
        ├── _index.md                # ordinary section, NOT a notebook
        └── epsilon/index.md        # belongs to Lab notes
```

- Mark a collection root's `_index.md` with `[params.sidera] collection = 'blog'` or `'notebook'`. Its Page object/logical location supplies identity and its title supplies the label. Do **not** cascade the collection marker or repeat membership IDs on articles.
- `themes/sidera/layouts/_partials/collection-owner.html` selects the page itself if it is a marked section, otherwise its closest marked ancestor. `.Section` is only the top-level section name; `.CurrentSection` can be an unmarked storage subsection. Neither alone is the owner contract.
- Root `params.sidera.byline` and `params.sidera.show_updated` provide article defaults through Page → nearest owner → Site key-presence resolution. Articles can override either, including explicit empty/`false`. This avoids native table replacement when a page authors its own `sidera.tags`.
- Identity/classification are read from the owner, not copied into article defaults. List policies below belong on the collection root, not on every article; read them from the owner, never article params.
- All regular pages use one `themes/sidera/layouts/page.html`, regardless of blog/notebook/standalone identity. Content uses ordinary `.Content`; relative image/source links remain within the article leaf bundle.
- A collection lists `.RegularPagesRecursive`, **filtered by nearest owner**. This reaches storage subsections but excludes articles of any nested marked collection. The homepage discovers marked sections at any depth, with no collection-name map or singleton blog.
- Native cascade follows ancestry independently of collection ownership, but a local `sidera` table replaces its cascaded counterpart. The theme does not recreate cascade merging. Article defaults intentionally fall back to the nearest owner, not an outer independent collection; set nested-owner defaults explicitly.
- Collection roots/ordinary sections use `_index.md`; individual article bundles use `index.md`. `journal/2024` intentionally has no `_index.md`, so it is a storage directory, not a section. `resource-note.md` inside `field-notes/alpha` is intentionally a leaf resource, not a second article.

The two notebooks intentionally differ in byline and update-date visibility. These presentation settings do **not** define what a notebook is; tag organization is proven by P1-B; a generalized reference/backlink system remains out of scope. `Date`/`PublishDate`/`Lastmod`, ordering, pins and native pagination follow the P1-C contract below. All fixtures use explicit historical timestamps, never Git or build time. `params.sidera.tags` follows the P1-B contract below for notebooks; blog tags remain raw fixtures. Global taxonomy/term/RSS outputs remain disabled; custom notebook tag sections are not native taxonomy pages, and no feed support is claimed.


## Journal publication-date URLs

For Journal, **`date` is the publication date**, as confirmed by the user. The site
configuration—not the reusable theme—sets:

```toml
[permalinks.page]
journal = '/journal/:year/:month/:day/:slugorcontentbasename/'
```

Examples: `/journal/2024/01/01/first-signal/`,
`/journal/2024/01/02/second-signal/`, and
`/journal/2024/01/02/archive-signal/`. Source directories are unchanged, including
the archive fixture's storage folder. Journal root and pagination remain
`/journal/` and `/journal/page/2/`; other collection URLs are unchanged.

An explicit `slug` wins; otherwise the Markdown filename or leaf bundle basename
is used. Editing the title or `lastmod` does not change the URL. Hugo's native date
tokens use `.Date`; do not provide a conflicting `publishDate` for this Journal
authoring convention. The shared date fallback configuration and distinct-date
capability tests remain unchanged for other requirements. This adds no validator
or custom URL-building code. Explicit per-page `url` still overrides native rules.

No aliases for old synthetic URLs are generated. Use fresh build destinations to
avoid stale output from previous routes. The dedicated check covers the three
baseline posts, nested storage, explicit slug and plain-file fallback, bundle
assets, local-time timestamps, title/update stability, subpath hosting and HTTP;
unrelated collection output is compared byte-for-byte with a rule-free build.

## Add a collection

Add a content section, give its `_index.md` the marker and owner defaults, and add regular articles beneath it. No template edit or central registry is necessary. For example:

```toml
+++
title = 'Another notebook'
[params.sidera]
byline = 'Another team'
show_updated = true
collection = 'notebook'
+++
```

The automated extension test copies `tests/fixtures/annex` into **an isolated site's** `content/lab-notes/annex`. Its probe is one ordinary section deeper at `annex/storage/probe/index.md`: `.Section` would still be `lab-notes`, but its owner is Annex notes, not Lab notes or Annex storage. Checks assert the new homepage link, shared renderer, nearest defaults, disjoint lists, and byte-identical config/templates. The real showcase remains four collections after the test.

## Check coverage and limits

The script checks every baseline article's owner, shared-renderer marker, resolved byline, update-date visibility and collection backlink; exact collection/homepage membership with no duplicates; the standalone page; storage-section traversal; local asset byte equality and all rendered local link/image targets; and exclusion of the Markdown leaf resource from rendered articles. It repeats baseline assertions after the fifth collection is added and verifies the nested collection's behavior.

Pass: **P1-01–P1-08** for the supported public synthetic showcase contract. P1-B and P1-C have dedicated targeted checks; earlier membership assertions now traverse complete pager chains, not only page 1. P1 is closed as the organizational proof. P1-D records the bounded inventory and remaining production limits. Closure does not imply final styling, real-content parity or deployment approval.

## P1-C collection list policy

Settings are optional **only on the marked owner `_index.md`**, alongside `params.sidera.collection`. Do not cascade them or duplicate them on articles. They apply to that owner's collection root, ordinary storage-section subsets, notebook hub and every tag-result union. Nested marked collections read their own settings/defaults, never the outer owner's policy.

```toml
[params.sidera]
collection = 'notebook'
list_order = 'modification' # publication | modification | title
page_size = 2              # positive integer (TOML or YAML)
```

| Setting | Default / meaning |
|---|---|
| `params.sidera.list_order` | Blogs: `publication`; notebooks: `modification`; unowned sections: `title` |
| `publication` | Native `.PublishDate` descending, then `.Title` ascending, then logical `.Path` ascending |
| `modification` | Native `.Lastmod` descending, then `.Title` ascending, then `.Path` ascending |
| `title` | Native `.Title` ascending, then `.Path` ascending; not `.LinkTitle`, date or weight |
| `params.sidera.page_size` | 10 for either collection kind; explicit owner size overrides it, including for tag results |
| Article `params.sidera.pinned` | Boolean, absent/false means ordinary; true promotes the article within each selected main result |

Sorting uses Hugo's stable `collections.Sort`, least-significant key first; tied titles/dates, opposite weights and different paths are verified against installed Hugo 0.166.0. Title comparison is Hugo's native ascending string comparison, not natural-number sorting or custom transliteration. Dates compare instants (including equal timestamps with different offsets). Zero/unknown dates sort after known dates in descending date views. No hidden weight, source-discovery order or Git date decides a tie.

**Pins are a stable partition of the complete sorted result, before pagination.** Pinned articles retain the selected sort order among themselves; ordinary articles retain it among themselves. Each article occurs **once** in a main result across all pages. Pins consume ordinary page capacity; excess pins spill onto later pages rather than being repeated or dropped. A pin outside a tag/section's membership is not injected into that result. There is no numeric pin priority or special pinned-page quota.

**Recent updates** is a separate, unpaginated view of up to five articles on each collection-root pager, sourced from the **whole owner-filtered collection**, not the current main pager. It always sorts by modification/title/path and ignores pins and main-list order/size. It intentionally repeats unchanged as a widget on later root pagers; it is not another paginator. No separate recent-update route/feed or configurable widget framework is introduced.

### Native dates and fallback policy

`hugo.toml` explicitly configures metadata-only fallback chains:

| Native method | Ordered sources | Use |
|---|---|---|
| `.Date` | `date`, `publishDate`, `pubdate`, `published` | General content date; may differ from publication; not the publication-sort key |
| `.PublishDate` | `publishDate`, `pubdate`, `published`, `date` | Publication-first sort and article's “Published” label; native future-publication eligibility remains Hugo's |
| `.Lastmod` | `lastmod`, `modified`, `publishDate`, `pubdate`, `published`, `date` | Modification-first/recent-update sort and article's optional “Updated” label |

Missing all applicable sources yields Hugo's zero time; the UI says `undated` or omits an article date label, never invents “today.” We deliberately exclude `lastmod` from the `.Date` chain: Hugo can fall back from `.PublishDate` to resolved `.Date`, so retaining Hugo's default modification fallback there would infer publication from a modification-only note. The isolated native-method probe proves a modification-only note has zero Date/PublishDate and a known Lastmod. `pubdate`, `published` and `modified` aliases, different Date/PublishDate values, publication-before-Date Lastmod fallback, missing dates and equal instants with differing offsets are tested. No `:git`, `:fileModTime`, `:filename`, `now`, Git-info lookup or changed file timestamp contributes to dates. This is the synthetic showcase policy, not a claim that historical real-site dates have been inventoried or converted.

### Native pagination and navigation

`lists/render.html` is the **only** paginator creation site. Templates first select the owner-filtered section or tag union; the helper sorts and partitions pins, then calls `.Paginate` with that Page collection and owner size. It passes the resulting **Pager** to `lists/navigation.html`. Shared layout, tag-tree/model, article rendering and recent updates never call `.Paginator` or seed another `.Paginate`; Hugo caches the first call for a Page and silently reuses it thereafter.

- Canonical first result is the section/tag route; later pages are `page/2/`, `page/3/`, etc. `[pagination] path = 'page'` is part of this route contract; first-page aliases are disabled. The fixed project pagination path is not a per-owner setting.
- Multiple-page results have First/Last links (including self-links at the ends), Previous only after page 1, and Next only before the last page. All links use native Pager URLs, including baseURL subpaths.
- A single page has no pager links. An empty result keeps its root route and shows “No articles”; Hugo reports PageNumber 1 and TotalPages 0, with no later pages/links.
- `page/` is reserved beneath **every paginated section**, including blogs and unmarked storage sections as well as notebook roots/tag routes. Authored published routes, aliases and local static collisions fail with `P1C` diagnostics; P1-B's early notebook discovery checks remain. This is not a redesign of source discovery or support for arbitrary static/module mounts.
- Counts and tag trees always describe the full selected result/owner model, not the current pager. Untagged notes remain in roots/hubs; tag results remain deduplicated ancestor/leaf unions.
- Invalid order, non-positive/non-integer size and non-boolean pins fail with the offending owner/article path. Boolean false is preserved; string `"true"` is not a pin. These list semantics are independent of the localized Sidera presentation.

### Baseline expected sequences

Read each main sequence continuously across all pagers:

| Collection | Main sequence | Size | Recent updates (ignores pins) |
|---|---|---|---|
| Journal (blog, publication) | Second → Archive → First | 2 | First → Archive → Second |
| Dispatches (blog, publication) | Third → Second → First | 2 | Third → Second → First |
| Field notes (notebook, modification) | Alpha → Beta → Gamma → Epsilon → Delta | 2 | Beta → Gamma → Alpha → Epsilon → Delta |
| Lab notes (notebook, title) | Gamma → Alpha → Beta → Delta → Epsilon | 3 | Alpha → Beta → Gamma → Epsilon → Delta |

Two notebooks remain peers despite different sort orders; the content-only Annex test also demonstrates a **publication-first notebook**, while a YAML fixture demonstrates a title-ordered blog. Classification is not sorting. P1-C additionally proves more pins than page capacity, tied titles/dates resolved by Path regardless of weight, multi-page ancestor/leaf results, nested owner isolation, empty/single results, owner-local defaults, independent sizes, all navigation targets, identical repeat builds, `/preview/` hosting, and helpful invalid-input diagnostics. No production publication/discovery parity or incremental rebuild claim is added.

## P1-B notebook tags and routes

Write tags **once**, as literal `params.sidera.tags` arrays on ordinary Markdown notes. No notebook ID, term registry, explicit ancestor assignments, hand-authored tag pages, or build preprocessor is needed. TOML and YAML front matter are supported in local `content/`; P2-C adds the native filename-translation convention documented below. An empty/missing array means untagged. Tags classify notes; neither the storage sections nor the tag tree prescribe a reading sequence.

```toml
[params.sidera]
tags = ['science/quantum/basics', 'science/quantum/experiments']
```

### Normalization

- `/` is the hierarchy separator. Lowercase each segment, trim surrounding whitespace and collapse runs of spaces/Unicode space separators to one space. These case/spacing variants intentionally share identity and canonical display labels.
- Reject empty segments (including leading/trailing/repeated `/`), `.`/`..`, backslashes, control characters, non-string values, and a non-array `tags` value. Control characters are rejected, not normalized (including tabs/newlines).
- First slug each segment by retaining letters/numbers/combining marks and replacing other runs with `-`, trimming edge hyphens. If the resulting slug contains non-ASCII characters, publish it as `u-` plus its lowercase UTF-8 hexadecimal bytes. Thus `量子/基础` has readable UI labels and the portable route `u-e9878fe5ad90/u-e59fbae7a180`. This avoids silent composed/decomposed filename overwrites on macOS without adding a Unicode-normalization dependency. There is **no NFC/NFKC normalization or transliteration**: `café` and decomposed `café` are deliberately distinct labels with distinct encoded routes. An ASCII label equal to an encoded slug still triggers the ordinary collision check; it cannot overwrite that tag.
- Reject an empty slug and the slug `page` at any depth (reserved for pagination). Punctuation is permitted in labels, but it must not silently merge different identities: `a b` versus `a-b`, and `C++` versus `C#`, fail in the same notebook. Collisions are checked on **every ancestor prefix**, including ancestors not explicitly assigned.
- Duplicate assignments collapse. Parent membership is the union of directly assigned notes and all descendant assignments, deduplicated by Page. A note assigned to parent + child or multiple siblings contributes once to each ancestor count.
- The same tag identity in different notebooks remains independent. A nested marked notebook owns its own notes and tag views; the outer notebook excludes them.

### Route namespace

For a notebook whose content path is `field-notes`:

| View | Route |
|---|---|
| Collection/list | `/field-notes/` |
| Tag tree and all-note list (including untagged) | `/field-notes/tags/` |
| Ancestor union | `/field-notes/tags/science/` |
| Nested tag list | `/field-notes/tags/science/quantum/basics/` |
| Ordinary note | `/field-notes/alpha/` |

Notebook content path segments use lowercase ASCII letters/digits/hyphens in this proof. The notebook root URL must follow that content path; route-changing root `url`/`slug` overrides fail validation. Moving/renaming a notebook or changing a normalized tag changes its URL; historical permalink/redirect policy is **not** solved. Routes do not depend on tag discovery order or article title.

`<notebook>/tags/` and `<notebook>/page/` are reserved namespaces: no authored notes, sections, URL/slug overrides, aliases, or local static output may occupy them. Source collisions are rejected before adapter generation; resolved URLs and aliases are also validated during rendering. `tag_view` is internal generated-page metadata, not an author field. P1-C now uses the reserved `page` segment for native pagination. Names such as an ordinary article `science` and a tag `science` coexist because they occupy different namespaces. Storage-local articles such as `storage/tags` do not occupy the notebook-root namespace.

Always build with **both** `--panicOnWarning --printPathWarnings` to detect Hugo publication collisions in addition to the intentional `P1B ...` diagnostics. Failed builds may leave partial output; never preview/publish them. Use a fresh destination rather than trusting old generated files.

### Implementation and limits

`themes/sidera/content/_content.gotmpl` creates real Hugo **section Pages** for hubs, tags and their ancestors. A small recursive partial reads local front matter with Hugo's `os.ReadDir`/`ReadFile` and `transform.Unmarshal`. It recognizes marked owners and leaf bundles, skipping Markdown leaf resources. This is **route discovery**, not a replacement for Hugo's page parsing. No `Site.Pages` access occurs in the adapter: installed Hugo 0.166 errors at that build stage, as the test reproduces.

At render time, `tags/model.html` computes membership from the owner's actual `.RegularPagesRecursive`, filtered through the same nearest-owner helper used in P1-A. One normalizer serves discovery and membership. Counts and lists come from the same deduplicated Page slices. P1-C passes the full selected union through ordering/pins and then native `.Paginate`; the tag model and tree counts never use the current pager subset.

`notebook-tags.html` supplies the minimal tree, ancestor links and note lists. Collection/ordinary storage views link to the owning notebook's tag hub. Every notebook note links to its owner, hub and direct normalized tags. Cross-notebook Alpha links intentionally adopt the destination notebook's context; context is page ownership, not referrer state.

**Proof boundaries (see P1-D findings below):** discovery is intentionally limited to the existing local Markdown layout and TOML/YAML metadata, not module/content mounts, separate language contentDir trees, JSON/Org front matter, generated notes from other adapters, or cascaded/computed tags. Unknown runtime tags without discovered pages fail rather than producing broken links. These are not accepted restrictions on the later real-site migration.

The route inventory reads all local note metadata, while list membership uses Hugo's published pages. Consequently **unpublished-only tags can have empty generated routes and exposed labels**. Tags must be public vocabulary in this showcase. P1-D now observes draft/future/expiry vocabulary exposure, build-option list gaps and incremental watcher failures. Harmless empty tags and watcher inconvenience are now tolerated during migration; build/rendering failures are not waived. Production semantics and sensitive vocabulary still require an explicit review before publication. This does not expose unpublished article bodies through the list model. Full fresh builds are the verified workflow.

P1-B checks cover exact routes, tree links/counts, direct tags, ancestor unions, isolation, source and URL/alias namespace failures, deterministic fresh outputs, subpath hosting, and HTTP responses. Invalid-input probes deliberately fail and assert their diagnostics. P1-B alone did not verify visuals. P2-A/B/C add the bounded browser evidence below;
global taxonomies, feeds and real-content compatibility remain outside that evidence.

### Manual preview

Use a successful fresh build and a **separate static server**; this avoids any existing Hugo watcher or user preview:

```sh
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/preview-XXXXXX")
hugo --destination "$run/public" --cacheDir "$run/cache" --panicOnWarning --printPathWarnings &&
  uv run --no-project --no-managed-python python3 -m http.server 14237 --bind 127.0.0.1 --directory "$run/public"
```

Port 14237 was available for the automated HTTP smoke tests, which stopped its server afterward. If occupied when you try, choose another explicit free port; do not stop the existing service. Visit `http://127.0.0.1:14237/field-notes/tags/`, then Science → Quantum → Basics (2 notes); compare Lab notes' Basics (1 note). Follow a note's owner/tag links and the Alpha cross-notebook link. Unicode and space-normalized examples live under Field notes. Then check Journal page 2, Field root/hub pages 1–3, and Lab pages 1–2 against the sequences below. The recent-update list stays unchanged across a collection’s pagers. For multi-page ancestor/leaf results and pin overflow, run P1-C and serve its printed run directory’s `edges-public` instead; visit `/field-notes/tags/science/quantum/basics/page/2/`. Stop this foreground preview with Ctrl-C. No live server is left by the automated checks.


## P1-D readiness observations (not production approval)

[P1-D review](../migration-project/P1-D.md) inventories the real-site structure and
records bounded experiments. The runtime templates retain P1-C behavior (now theme-packaged); this slice adds observation helpers, not a loader replacement.

```sh
uv run --no-project --no-managed-python python3 tests/check_p1d.py
uv run --no-project --no-managed-python python3 tests/inventory_p1d.py
```

`check_p1d.py` uses synthetic copies only; all logs, output, snapshots and JSON
remain in a fresh ignored `.checks/p1d-*`. It starts its own identifiable Hugo
servers on an available explicit loopback port in 14347–14362, verifies HTTP
readiness, and stops each process in `finally`. “Removal” moves only a newly
created synthetic fixture outside its scratch content tree; no original is
deleted. Fresh builds use the existing strict build helper. Watcher comparisons
are observations, **not a green acceptance result**: inspect `results.json` and
per-case `comparison.json` for failures. It also probes native eligibility and
an isolated `updated` date alias; the real configuration is unchanged.

**Observed:** adding/changing tag vocabulary can fail incremental rebuilds with
missing generated Pages even with `--disableFastRender`; removing vocabulary can
leave stale routes. Native article rename/removal also leaves old disk output.
Do not trust watcher output for validation/publication. Use fresh destinations
and successful full builds; the existing separate static-preview workflow remains
verified. The user accepts unreliable live preview as non-blocking during migration; use this fresh-build workflow for validation. A quick resource-dependency probe is retained for later investigation, not adopted as a fix.

**Optional historical inventory, not a clean-checkout build/test prerequisite:**
`inventory_p1d.py` reads tracked reference Markdown from sibling `gocalf.com-hugo`
without writes there. It reports aggregate front-matter shapes and lexical
capability candidates (ignoring fenced/inline examples), not a full YAML/Hexo
parser or a conversion plan. It excludes templates, the consistency report and
deferred wiki from article counts. It stores no note bodies.

Unpublished-only vocabulary remains exposed by generated tag pages. Native
build options are not synonymous with public Page membership: `render = 'never'`
and `render = 'link'` probes produce unsuitable list links. The user tolerates harmless empty tags during migration, but requires fresh-build
success and intact published rendering. This is not approval of invalid links for supported valid content or public disclosure of private data. Invalid or colliding draft metadata is correctly rejected; drafts are not exempt from structural validation (D-013).
Final publication semantics remain for later review; passing P1-A/B/C does not
prove complete eligibility parity. P1 is closed; P2-A/B/C are implemented and P2-D reviews readiness. P3 implementation
and real migration need separate authorization.


### P1-D follow-up: migration tolerance and quick investigation

```sh
uv run --no-project --no-managed-python python3 tests/probe_p1d_followup.py
```

Reuses the existing isolated watcher/build helpers and retains `.checks/p1d-followup-*`.
Scratch copies only: content-as-assets mount + `resources.Get` improves existing-note
invalidation; new-note discovery still fails even with an added `resources.Match` read,
and obsolete disk files remain. No runtime/configuration patch is adopted.

A normal fresh build with valid excluded draft/future/expired/headless notes keeps all
17 existing articles and existing list/tag outputs byte-identical. Empty routes are
added; homepage changes only in whitespace and sitemap gains those routes. However,
a draft's malformed tags or slug collision with a public tag still fails a fresh build.
These diagnostic probes are expected invalid-input rejections under D-013; no draft-validation bypass is required. See [P1-D follow-up](../migration-project/P1-D.md#follow-up--migration-tolerance-and-quick-investigation)
for the user's clarified scope, evidence and future investigation leads.


## Historical PoC packaging and current regression comparison

The original P1-D experiment is retained for reference. Sidera supplies the organization implementation plus its independent visual shell through a submodule. [PoC theme guide](themes/poc/README.md) and
[comparison report](../migration-project/P1-D-THEME.md) explain the boundary.
All 18 templates and the tag adapter moved unchanged into the theme. Native Hugo
theme lookup/content mounting supplies them; site content and policies remain
here. Moving the adapter too prevents a switch to skeleton from leaving behind a
site adapter calling unavailable PoC helpers. No custom mount setup was added.

`check_poc_theme.py` now runs eight strict isolated builds: active Sidera, retained PoC functional comparison, uncommitted local theme edit, reconstructed
former in-place layout, optional site-template override, untouched skeleton,
skeleton with its demo content parked outside a scratch copy, and a native-global-
taxonomy contrast. It asserts whole-output byte equivalence between **active Sidera and its in-place
reconstruction**, including CSS/JS assets, then checks the known skeleton gaps rather than pretending feature parity. The helper
retains sources, published outputs, logs and `results.json` under `.checks/poc-theme-*`.
It also serves four skeleton routes on its own available explicit loopback port
and stops the server. No original skeleton file is edited or deleted.

For a direct switch experiment without changing saved configuration:

```sh
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/skeleton-preview-XXXXXX")
hugo --theme skeleton --destination "$run/public" --cacheDir "$run/cache" --panicOnWarning --printPathWarnings
# If desired, serve only that successful build on an explicit free port:
uv run --no-project --no-managed-python python3 -m http.server 14237 --bind 127.0.0.1 --directory "$run/public"
```

Do not stop an existing preview if that port is occupied; choose another explicit
free port. Stop your own foreground server with Ctrl-C. This stock-theme experiment
includes skeleton's three demo posts by default. The comparison helper also retains
a source-only variant (demo content moved within the scratch run, not deleted).

Skeleton renders all 17 showcase article/standalone routes and their local assets,
but offers a global homepage stream and immediate-section lists instead of the
collection/notebook contract. It ignores the custom owner list policies, pins,
recent-update widget, byline/update display and scoped tag navigation. With the
site's current config it has no taxonomies; enabling them in scratch gives **global
flat assignments**, not notebook-scoped ancestor unions. It also emits a zero date
on About and breaks relative bundle image/download URLs in list summaries (not on
the article). Its default Home/Posts/Tags menu needs site-specific configuration.
No other third-party theme was downloaded or tested; skeleton is a bundled Hugo
starter scaffold, not a universal default or representative of every mature theme.


## P2-A visual review and local browser checks

The review direction is a quiet dark reading site, not a Stellar/Hexo port: translucent
collection rail, slate cards, native scoped notebook navigation and shared article
rendering. This homepage is explicitly a multi-collection **synthetic demo**, not an
approved replacement for the real site's Notes-first homepage. See the theme README
for visual boundaries/provenance and the coordination P2-A report for exact evidence.

P2-A explicitly retires the setup-only **active Sidera = retained PoC visual-byte**
assertion. Its historical `bd5dd82` evidence is preserved. Packaging checks now assert
both themes' exact membership/defaults/assets and ordering/pager chains, identical HTML
route sets, unchanged PoC/skeleton source, active/in-place full-output equality, local
theme edits and optional overrides. P1-A/B/C and Journal assertions remain intact.

The browser test uses installed Chrome and Node **24.12.0** (`.nvmrc`); Node is a
**test-only** prerequisite. Building Sidera requires only Hugo, not Node or Hexo. No
packages, browser binaries or fonts are downloaded. Python remains stdlib via uv.

```sh
nvm use
# NODE_BIN avoids a system Node being prepended by a uv/Python launcher.
NODE_BIN="$(command -v node)" uv run --no-project --no-managed-python python3 tests/check_p2a.py
```

It makes timestamped `.checks/frontend-design_YYYYMMDD_HHMMSS/` output with isolated
source copies, strict baseline/stress/subpath builds, logs, JSON and screenshots.
`SIDERA_CHECK_DIR` optionally names a **new** run directory. `CHROME_BIN` can point
to another installed Chrome. Own loopback HTTP **14378** and CDP **14379** must be free
(or explicitly select `SIDERA_HTTP_PORT` / `SIDERA_CDP_PORT`); occupied ports fail,
never replace another service. The harness verifies its unique Chrome profile before
creating a target, tests only local output and stops its own browser/server in `finally`.
No existing browser/profile is inspected or attached. Native Node WebSocket supplies
CDP because no repository Playwright/Selenium dependency was available.

Coverage: six routes at 1440/900/768/390/320 CSS px; 18px long-title/mixed-language/code/
table/image/TOC stress page at three widths; overflow, context, loaded images, styles,
landmarks, keyboard skip/focus/Enter/Space disclosure, pager click, no-JS fallback,
subpath assets and foreground-token contrast. Not a full accessibility audit, real
device check, Safari/Firefox test, rich-content or production acceptance. The separate P2-B suite below covers appearance.

For manual review use the **fresh build + static server** recipe above. Start at `/`,
then `/field-notes/`, `/field-notes/alpha/`, `/field-notes/tags/science/`, `/journal/`
and `/about/`. Compare `/lab-notes/` and paginate the lists. Below 900px open “Browse
collections & tags”; use Tab, Enter/Space, and the skip link. Comment on reading width,
font feel, contrast, card density and the rail before the next visual slice.


## P2-B reading and appearance checks

Dark is the fresh default, not automatic OS following. The native Appearance
select offers Dark/Light/System at the top of collection navigation; on mobile,
open the native disclosure. A valid choice survives navigation/reload when storage
works. System follows OS changes. Blocked storage leaves a per-document choice;
no scripting leaves readable dark and no dead control. See the theme README for
the early inline script/CSP boundary and local-font/provenance policy.

```sh
nvm use
NODE_BIN="$(command -v node)" uv run --no-project --no-managed-python python3 tests/check_p2b.py
```

Uses the same isolated Python builds and extracted shared native CDP driver
(`tests/browser.mjs`) as P2-A, with the same explicit port/environment options.
The original P2-A scenarios still run separately. P2-B adds three strict builds,
an ordinary synthetic Markdown reading fixture (test-only), eight-level tag
counts/ancestry, 80 route/palette/width cases, six long-reading cases, actual native
select keyboard interaction, persistence/system transitions, early initialization,
invalid preference, denied read/write and no-JS fallbacks. It checks foreground
contrast including the composited rail and rendered code tokens, native TOC and
keyboard scrolling, owner context/pager links, subpaths, 200% root-text enlargement
and 640 CSS-pixel reflow (not browser UI zoom certification).

To test optional font absence on a machine that has WenKai installed, the browser
fixture removes only WenKai and Source Code Pro from the production fallback stacks
at runtime, then inspects Chromium's actual platform fonts for English/CJK/code.
HTTPS resources are blocked and all observed page requests must stay on the own
loopback server. Screenshots and JSON are retained in the timestamped run, not
committed. No font/tool/package downloads. Chromium spot checks are not a complete
WCAG, screen-reader, real-device or cross-browser audit.

The native code hook only replaces fixed highlighting colors with theme token
classes; it does not implement P3 code-file tools or special shortcodes. The fixture
uses Hugo's existing `figure` shortcode, not a new component. The ordinary showcase
content and P1 assertions remain unchanged. P1 stays closed; whole-P2 user visual approval and licensing still need explicit
disposition. P2-D consolidates coverage rather than inventing another polish slice.

## P2-C English/Chinese localization

Sidera now ships native English and Simplified Chinese UI catalogs. All theme-owned
visible/accessibility labels—including appearance options, generated tag hub titles,
full count/pager/date messages and empty states—are translated. Content, titles,
authors and tag identities stay authored. No framework or language switcher is added.
See [theme localization guide and 51-key inventory](themes/sidera/I18N.md).

### Your own preview (no task-owned server is retained)

From this checkout, with the pinned submodule initialized, run **one** foreground
server on an available explicit port:

```sh
# English UI (existing default):
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender

# Or Chinese UI around the same unchanged content:
hugo server --config hugo.toml,tests/fixtures/i18n/chinese.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender
```

Stop your server with Ctrl-C. If occupied, choose another port; do not terminate
someone else's process. `--disableFastRender` does not fix the known adapter watcher
limitations; fresh successful strict builds are the verification authority:

```sh
mkdir -p .checks
run=$(mktemp -d "$PWD/.checks/manual-i18n-XXXXXX")
hugo --config hugo.toml,tests/fixtures/i18n/chinese.toml \
  --destination "$run/public" --cacheDir "$run/cache" \
  --panicOnWarning --printPathWarnings --printI18nWarnings
```

For bilingual authoring, the guide shows native `languages.en` / `languages.zh`
configuration and optional `*.zh.md` translations under shared `content/`. The
configuration example is also in `tests/fixtures/i18n/bilingual.toml`; the checker
adds its small asymmetric content fixture in scratch, **not** to the base showcase.
Missing article translations need not be created. Separate language contentDir
layouts/arbitrary mounts are not claimed supported by this bounded adapter.

### Reproduce localization checks

```sh
nvm use
NODE_BIN="$(command -v node)" uv run --no-project --no-managed-python python3 tests/check_p2c.py
# Build/semantic checks only, explicitly skipping browser verification:
SIDERA_SKIP_BROWSER=1 uv run --no-project --no-managed-python python3 tests/check_p2c.py
```

Same `SIDERA_CHECK_DIR` (must be new), installed Chrome/Node and explicit available
HTTP/CDP port controls as P2-A/B. No installs. All own processes stop in `finally`;
there is no detached review preview. Outputs/screenshots stay in the timestamped
`.checks` folder. Tests exercise 11 successful strict builds, six intentional
rejections (missing key + Chinese structural errors), full original baseline
assertions in both UIs, filename bilingual membership/cache isolation, native
language prefixes/subpaths, all 51 keys/plural counts, escaped interpolation,
native default fallback/site override, and 72 localized browser matrix cases plus
four bilingual cases. Styling no longer depends on English ARIA names.

Existing P1-A/B/C/packaging/Journal/publication and P2-A/B suites remain separate
regressions. Only presentation-label expectations in the shared parsers changed;
no ownership/date/count/route/pin/pager/asset assertion was removed. Packaging's
active/in-place byte comparison now includes native i18n catalogs. Historical
PoC/skeleton fixtures remain immutable and English-only. Browser checks are local
Chromium spot checks, not full cross-browser/screen-reader/WCAG certification.


## Distribution boundary

Sidera currently has no selected distribution license. Its active CSS/JS/templates
are independently authored; local/system font names do not bundle font files.
Do not infer a license grant from public repository metadata or a visual reference.
No external distribution is authorized by the local P2 readiness review.

The retained inactive PoC is project-authored comparison code. The inactive
`themes/skeleton` was generated by `hugo new theme` (commit `0d51869`) and includes
a sample JPEG and favicon, but no tracked license/attribution file. Its asset rights
were **not established** by this review. Before distributing the complete showcase,
verify upstream scaffold/asset terms and preserve required notices (or discuss a
separately authorized exclusion). These files are not active Sidera output; do not
modify/remove the frozen fixtures as incidental cleanup. This separate showcase
packaging issue does not block local P3 capability work.


## P2-W: inspect both documentation trees

Sidera's docs/page-tree proof is implemented, **not** the final P2 visual redesign.
The committed site-owned [Workshop handbook](content/guidebook/_index.md) has
body-bearing branches, a three-level tree, partial order, pagers, a local SVG,
links and an intentionally disabled child list. The separate
[theme-owned sample](themes/sidera/docs/content/_index.md) stays solely in the
Sidera submodule. Both the showcase and theme leave it **off by default**; use
[docs-on.toml](docs-on.toml) to publish it explicitly.
See the precise [schema, native behavior and validation contract](themes/sidera/DOCS.md).

From this checkout, after initializing its exact theme submodule:

```sh
git submodule update --init --recursive
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender
```

Open <http://127.0.0.1:14420/guidebook/> (site-owned). Navigate through Start a
workshop → Set up the room, inspect page 2, and compare Workshop reference: it has
prose and a child in the full tree, but no under-body child list. Bundled `/sidera/`
and its collection/sitemap entries are absent in this normal configuration.
Stop with Ctrl-C. Use another free port if needed; Eureka leaves no preview running.

To opt in to the theme-owned sample, start a fresh server with:

```sh
hugo server --config hugo.toml,docs-on.toml \
  --bind 127.0.0.1 --port 14421 --disableFastRender
```

Both <http://127.0.0.1:14421/guidebook/> and
<http://127.0.0.1:14421/sidera/> are then available. The sample remains solely in
the theme repository; no content is copied or removed. The earlier `docs-off.toml`
is retained as an explicit reset for layered configurations, but normal preview
no longer needs it. Fresh builds are authoritative: do not infer absence from
an old public directory or stale watcher output.

Reproduction with installed Hugo/Python and optional nvm Node/Chrome:

```sh
uv run --no-project --no-managed-python python3 tests/check_p2w.py
# Use the retained run path printed above (contains both browser input builds):
nvm use
node tests/check_p2w_browser.mjs .checks/p2w-REPLACE-WITH-PRINTED-RUN
```

The suite tests exact tree and pager membership, defaults/overrides/empty/invalid
settings, source-local versus cascade order, notes/wiki aliases, native publication,
childless-to-parent identity, nested independent docs, mixed leaves and logical
identity versus slugs, default off, two mount namespaces, intentional site override,
URL/source collisions, authored filename translations and both UIs. An all-states
native validation build is required for **unreferenced** excluded docs; see DOCS.md.
Existing P1 suites retain exact original article/list/tag/route/date/asset assertions
and now explicitly account for the new section documents and their pagers. Frozen
PoC/skeleton comparisons deliberately omit only the new docs inputs they predate.

## P2-F — approved shell and configurable regions

The active theme now implements the left-anchored neutral/glass shell, native
menus, real optional right region and full standalone-page capabilities.
[Theme shell contract](themes/sidera/SHELL.md) covers the fixed components,
site/language → nearest-owner → Page presence rules, native cascade caveats,
false/empty/clear semantics, local images, icon choices and small native hooks.
All Sidera-defined collection/list/notes/docs/article/shell settings now use
`params.sidera`, with no legacy compatibility layer. Native Hugo fields remain native.

Use an available explicit port; these are **your foreground processes**, stopped
with Ctrl-C. Eureka does not leave a preview server running:

```sh
# Default collection overview; contextual notes/docs navigation; full About page.
hugo server --bind 127.0.0.1 --port 14420 --disableFastRender

# Native selected menu, original local identity mark and authored profile.
hugo server --config hugo.toml,examples/full-shell.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender

# Genuine two-sidebar browsing: left navigation/tree, right recent/profile/TOC.
hugo server --config hugo.toml,examples/full-shell.toml,examples/two-regions.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender

# Native cascade example: explicitly compact About (no local sidera table).
hugo server --config hugo.toml,examples/full-shell.toml,examples/scoped.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender

# All-site compact or context-only/inapplicable-region collapse demonstrations.
hugo server --config hugo.toml,examples/compact.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender
hugo server --config hugo.toml,examples/empty-regions.toml \
  --bind 127.0.0.1 --port 14420 --disableFastRender
```

Inspect `/`, `/field-notes/`, `/field-notes/tags/science/quantum/`,
`/field-notes/alpha/`, `/journal/2024/01/01/first-signal/`, `/guidebook/`,
`/guidebook/getting-started/setup/` and `/about/`. About now has ordinary headings
to demonstrate its default right TOC. Its compact layout is explicitly chosen by
`examples/scoped.toml`, not hard-coded. Since all custom fields now share one
namespace, native cascade cannot inject settings into an existing local `sidera`
table. [Collection/page front-matter examples](examples/scoped-frontmatter.md)
provide the full arrangement and a ready-to-run isolated copy command. No theme
source changes are needed.

Append `,docs-on.toml` to a chosen config list for the single-source theme sample
at `/sidera/`. **Bundled docs remain off in normal configuration.** The persistent
handbook and its native ordered children remain functional in every arrangement.

F does not complete selected-collection home, covers/refined cards, native blog
index/term templates or full footer composition. The `blog-taxonomies` component
consumes actual native Pages if a site supplies them; it never invents missing
links. G/H implement the remaining capabilities. No search/comments/backlinks,
real-site migration, font download, license grant or production publication.

### Focused shell checks

```sh
uv run --no-project --no-managed-python python3 tests/check_p2f.py
# Installed Node/Chrome only; explicitly retain the nvm Node path through uv.
nvm use
export NODE_BIN="$(command -v node)"
run="$PWD/.checks/f-visual-$(date +%Y%m%d_%H%M%S)"
SIDERA_CHECK_DIR="$run" uv run --no-project --no-managed-python \
  python3 tests/prepare_p2f_browser.py
"$NODE_BIN" tests/check_p2f_browser.mjs "$run"
```

The visual preparation uses longer **synthetic** articles in isolated copies,
never edits the normal content or real-site output, and builds seven configurations
on the same theme bytes. The 224-case browser matrix checks geometry, no ghost
regions, useful trees, headings/links/assets, palettes, breakpoints, keyboard and
no-JS behavior. Existing P1/P2 suites remain required regressions; historical tests
now check full owner-tree semantics and current TOC IDs rather than freezing old
markup/colors/border radii. Chromium/macOS is the actual tested browser boundary.

## Namespace cleanup after F

Sidera owns `params.sidera`, in site config, current-language config, content front
matter and native menu-entry params. Keys include `collection`, `list_order`,
`page_size`, `tags` (custom hierarchical notes tags), `pinned`, `byline`,
`show_updated`, `children` and shell settings. Private generated tag fields are
namespaced too. Native Hugo metadata/menus/taxonomies/assignments and unrelated
site custom parameters are not moved. This is a pre-release break, not aliases.

Root article defaults now live directly in `[params.sidera]`, resolved per-key
from the Page, nearest owner, then Site. This preserves fixture bylines and explicit
false overrides without repeating metadata on notes. **Important native behavior:**
a local `sidera` table replaces cascaded `sidera`, including when its only local
field is `tags` or `collection`. Root/page front matter is the right place for
those scoped exceptions; no custom cascade emulation has been added.
