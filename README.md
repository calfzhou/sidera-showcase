# Hugo collection organization showcase

P1-A/P1-B/P1-C form an intentionally unstyled, synthetic organizational proof, not a theme choice or a Stellar port. The generated `themes/skeleton` files remain intact but are **inactive**. No dependencies, external services, JavaScript, preprocessing, series, or wiki implementation are required.

The durable plan, fixture matrix, decisions, results and phase gates live in [migration-project](../migration-project/README.md), especially [P1-A evidence](../migration-project/P1-A.md) and [P1-B evidence](../migration-project/P1-B.md) and [P1-C evidence](../migration-project/P1-C.md). Do not infer completion of Phase 1 from this slice.

## Run

Verified with Hugo **v0.166.0+extended+withdeploy**, Homebrew darwin/amd64. Earlier versions have not been tested. The check script uses Python 3.9+ standard library only (tested 3.9.6); `uv` 0.11.21 was used to invoke the installed interpreter, with no project environment or managed Python installation.

From this repository:

```sh
# Reproducible targeted integration checks:
uv run --no-project --no-managed-python python3 tests/check_p1a.py
uv run --no-project --no-managed-python python3 tests/check_p1b.py
uv run --no-project --no-managed-python python3 tests/check_p1c.py

# Standalone build, isolated from any pre-existing public/ output:
run=$(mktemp -d "$PWD/.checks/manual-XXXXXX") # .checks exists after running the checks
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

- Mark a collection root's `_index.md` with `[params] collection = 'blog'` or `'notebook'`. Its Page object/logical location supplies identity and its title supplies the label. Do **not** cascade the collection marker or repeat membership IDs on articles.
- `layouts/_partials/collection-owner.html` selects the page itself if it is a marked section, otherwise its closest marked ancestor. `.Section` is only the top-level section name; `.CurrentSection` can be an unmarked storage subsection. Neither alone is the owner contract.
- Native `cascade`, targeted to `kind = 'page'`, supplies `params.byline` and `params.show_updated`. Articles can override either, including explicit `false`. Templates read the resolved `.Params` directly; they do not use a truthy fallback that would discard `false`.
- Identity/classification are read from the owner, not copied into article defaults. List policies below belong on the collection root, not on every article; read them from the owner, never article params.
- All regular pages use one `layouts/page.html`, regardless of blog/notebook/standalone identity. Content uses ordinary `.Content`; relative image/source links remain within the article leaf bundle.
- A collection lists `.RegularPagesRecursive`, **filtered by nearest owner**. This reaches storage subsections but excludes articles of any nested marked collection. The homepage discovers marked sections at any depth, with no collection-name map or singleton blog.
- Native cascade follows ancestry independently of collection ownership: an inner collection overrides outer defaults it sets, but unspecified defaults still inherit. A collection marker is not a cascade firewall.
- Collection roots/ordinary sections use `_index.md`; individual article bundles use `index.md`. `journal/2024` intentionally has no `_index.md`, so it is a storage directory, not a section. `resource-note.md` inside `field-notes/alpha` is intentionally a leaf resource, not a second article.

The two notebooks intentionally differ in byline and update-date visibility. These presentation settings do **not** define what a notebook is; tag organization is proven by P1-B; a generalized reference/backlink system remains out of scope. `Date`/`PublishDate`/`Lastmod`, ordering, pins and native pagination follow the P1-C contract below. All fixtures use explicit historical timestamps, never Git or build time. `params.tags` follows the P1-B contract below for notebooks; blog tags remain raw fixtures. Global taxonomy/term/RSS outputs remain disabled; custom notebook tag sections are not native taxonomy pages, and no feed support is claimed.

## Add a collection

Add a content section, give its `_index.md` the marker and cascade defaults, and add regular articles beneath it. No template edit or central registry is necessary. For example:

```toml
+++
title = 'Another notebook'
[params]
collection = 'notebook'
[cascade]
[cascade.target]
kind = 'page'
[cascade.params]
byline = 'Another team'
show_updated = true
+++
```

The automated extension test copies `tests/fixtures/annex` into **an isolated site's** `content/lab-notes/annex`. Its probe is one ordinary section deeper at `annex/storage/probe/index.md`: `.Section` would still be `lab-notes`, but its owner is Annex notes, not Lab notes or Annex storage. Checks assert the new homepage link, shared renderer, nearest defaults, disjoint lists, and byte-identical config/templates. The real showcase remains four collections after the test.

## Check coverage and limits

The script checks every baseline article's owner, shared-renderer marker, resolved byline, update-date visibility and collection backlink; exact collection/homepage membership with no duplicates; the standalone page; storage-section traversal; local asset byte equality and all rendered local link/image targets; and exclusion of the Markdown leaf resource from rendered articles. It repeats baseline assertions after the fifth collection is added and verifies the nested collection's behavior.

Pass: **P1-01–P1-08** for the supported public synthetic showcase contract. P1-B and P1-C have dedicated targeted checks; earlier membership assertions now traverse complete pager chains, not only page 1. The Phase 1 readiness gate remains pending, including source inventory and the production discovery limitations below. No full Phase 1 gate, visual styling, real-content compatibility, original-site edits or deployment are implied.

## P1-C collection list policy

Settings are optional **only on the marked owner `_index.md`**, alongside `params.collection`. Do not cascade them or duplicate them on articles. They apply to that owner's collection root, ordinary storage-section subsets, notebook hub and every tag-result union. Nested marked collections read their own settings/defaults, never the outer owner's policy.

```toml
[params]
collection = 'notebook'
list_order = 'modification' # publication | modification | title
page_size = 2              # positive integer (TOML or YAML)
```

| Setting | Default / meaning |
|---|---|
| `params.list_order` | Blogs: `publication`; notebooks: `modification`; unowned sections: `title` |
| `publication` | Native `.PublishDate` descending, then `.Title` ascending, then logical `.Path` ascending |
| `modification` | Native `.Lastmod` descending, then `.Title` ascending, then `.Path` ascending |
| `title` | Native `.Title` ascending, then `.Path` ascending; not `.LinkTitle`, date or weight |
| `params.page_size` | 10 for either collection kind; explicit owner size overrides it, including for tag results |
| Article `params.pinned` | Boolean, absent/false means ordinary; true promotes the article within each selected main result |

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
- Invalid order, non-positive/non-integer size and non-boolean pins fail with the offending owner/article path. Boolean false is preserved; string `"true"` is not a pin. Minimal labels/dates/navigation are verification UI, not theme styling.

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

Write tags **once**, as literal `params.tags` arrays on ordinary Markdown notes. No notebook ID, term registry, explicit ancestor assignments, hand-authored tag pages, or build preprocessor is needed. TOML and YAML front matter are supported in this single-language, local `content/` showcase. An empty/missing array means untagged. Tags classify notes; neither the storage sections nor the tag tree prescribe a reading sequence.

```toml
[params]
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

`content/_content.gotmpl` creates real Hugo **section Pages** for hubs, tags and their ancestors. A small recursive partial reads local front matter with Hugo's `os.ReadDir`/`ReadFile` and `transform.Unmarshal`. It recognizes marked owners and leaf bundles, skipping Markdown leaf resources. This is **route discovery**, not a replacement for Hugo's page parsing. No `Site.Pages` access occurs in the adapter: installed Hugo 0.166 errors at that build stage, as the test reproduces.

At render time, `tags/model.html` computes membership from the owner's actual `.RegularPagesRecursive`, filtered through the same nearest-owner helper used in P1-A. One normalizer serves discovery and membership. Counts and lists come from the same deduplicated Page slices. P1-C passes the full selected union through ordering/pins and then native `.Paginate`; the tag model and tree counts never use the current pager subset.

`notebook-tags.html` supplies the minimal tree, ancestor links and note lists. Collection/ordinary storage views link to the owning notebook's tag hub. Every notebook note links to its owner, hub and direct normalized tags. Cross-notebook Alpha links intentionally adopt the destination notebook's context; context is page ownership, not referrer state.

**Proof boundaries:** discovery is intentionally limited to the existing local Markdown layout and TOML/YAML metadata, not module/content mounts, multilingual files, JSON/Org front matter, generated notes from other adapters, or cascaded/computed tags. Unknown runtime tags without discovered pages fail rather than producing broken links. These are not accepted restrictions on the later real-site migration.

The route inventory reads all local note metadata, while list membership uses Hugo's published pages. Consequently **unpublished-only tags can have empty generated routes and exposed labels**. Tags must be public vocabulary in this showcase. Draft/future/expiry/build-option discovery parity, vocabulary privacy, and incremental watcher invalidation are **not proven or accepted as production behavior**; revisit before using this strategy on private/unpublished real content. This does not expose unpublished article bodies through the list model. Full fresh builds are the verified workflow.

P1-B checks cover exact routes, tree links/counts, direct tags, ancestor unions, isolation, source and URL/alias namespace failures, deterministic fresh outputs, subpath hosting, and HTTP responses. Invalid-input probes deliberately fail and assert their diagnostics. No browser/visual review, final styling, global taxonomy behavior, feeds, or real-content compatibility is claimed.

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
records bounded experiments. The runtime templates/configuration remain at the
P1-C behavior; this slice adds observation helpers, not a loader replacement.

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
verified. A decision on the theme-development workflow is pending user discussion.

`inventory_p1d.py` reads tracked reference Markdown from sibling `gocalf.com-hugo`
without writes there. It reports aggregate front-matter shapes and lexical
capability candidates (ignoring fenced/inline examples), not a full YAML/Hexo
parser or a conversion plan. It excludes templates, the consistency report and
deferred wiki from article counts. It stores no note bodies.

Unpublished-only vocabulary remains exposed by generated tag pages. Native
build options are not synonymous with public Page membership: `render = 'never'`
and `render = 'link'` probes produce unsuitable list links. Required publication
eligibility/privacy resolution and any accepted bounded authoring contract must
be reviewed before real unpublished inputs/publication; passing P1-A/B/C does not
approve these limitations. P1 remains open for direct user experiments and
explanations in task `260919-bright-galaxy`; P2 requires explicit authorization.
