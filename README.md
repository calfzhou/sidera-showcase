# Hugo collection organization showcase

P1-A/P1-B form an intentionally unstyled, synthetic organizational proof, not a theme choice or a Stellar port. The generated `themes/skeleton` files remain intact but are **inactive**. No dependencies, external services, JavaScript, preprocessing, series, or wiki implementation are required.

The durable plan, fixture matrix, decisions, results and phase gates live in [migration-project](../migration-project/README.md), especially [P1-A evidence](../migration-project/P1-A.md) and [P1-B evidence](../migration-project/P1-B.md). Do not infer completion of Phase 1 from this slice.

## Run

Verified with Hugo **v0.166.0+extended+withdeploy**, Homebrew darwin/amd64. Earlier versions have not been tested. The check script uses Python 3.9+ standard library only (tested 3.9.6); `uv` 0.11.21 was used to invoke the installed interpreter, with no project environment or managed Python installation.

From this repository:

```sh
# Reproducible targeted integration checks:
uv run --no-project --no-managed-python python3 tests/check_p1a.py
uv run --no-project --no-managed-python python3 tests/check_p1b.py

# Standalone build, isolated from any pre-existing public/ output:
run=$(mktemp -d "$PWD/.checks/manual-XXXXXX") # .checks exists after running the checks
hugo --destination "$run/public" --cacheDir "$run/cache" --panicOnWarning --printPathWarnings
```

The check script creates a fresh ignored `.checks/p1a-*` directory per invocation and prints its location. It retains build logs, version, generated HTML, a result summary, and the isolated content-only extension copy; it never deletes an existing directory. Nothing under `.checks` is tracked. Build output from the old skeleton in `public/` is neither used nor evidence for these checks. A web server/browser is not needed for P1-A; visual/browser testing is not claimed.

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
- Identity/classification are read from the owner, not copied into article defaults. Future list policies belong on the collection root, not on every article. Only the two article presentation defaults above are implemented now.
- All regular pages use one `layouts/page.html`, regardless of blog/notebook/standalone identity. Content uses ordinary `.Content`; relative image/source links remain within the article leaf bundle.
- A collection lists `.RegularPagesRecursive`, **filtered by nearest owner**. This reaches storage subsections but excludes articles of any nested marked collection. The homepage discovers marked sections at any depth, with no collection-name map or singleton blog.
- Native cascade follows ancestry independently of collection ownership: an inner collection overrides outer defaults it sets, but unspecified defaults still inherit. A collection marker is not a cascade firewall.
- Collection roots/ordinary sections use `_index.md`; individual article bundles use `index.md`. `journal/2024` intentionally has no `_index.md`, so it is a storage directory, not a section. `resource-note.md` inside `field-notes/alpha` is intentionally a leaf resource, not a second article.

The two notebooks intentionally differ in byline and update-date visibility. These presentation settings do **not** define what a notebook is; tag organization is proven by P1-B; a generalized reference/backlink system remains out of scope. `date`/`lastmod` are explicit fixture values, not a finalized migration date policy. Lists currently use title order, with no pagination or pins. `params.tags` follows the P1-B contract below for notebooks; blog tags and `params.pinned` remain raw fixtures. Global taxonomy/term/RSS outputs remain disabled; custom notebook tag sections are not native taxonomy pages, and no feed support is claimed.

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

Pass: **P1-01, P1-02, P1-05, P1-06, P1-07, P1-08** for the supported showcase contract. Pending: **P1-03/P1-04** (date ordering/ties/pinning and pagination). P1-B has its own targeted check script; the P1-A assertions remain intact. No full Phase 1 gate, visual styling, real-content compatibility, original-site edits or deployment are implied.

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
- Reject an empty slug and the slug `page` at any depth (reserved for later pagination). Punctuation is permitted in labels, but it must not silently merge different identities: `a b` versus `a-b`, and `C++` versus `C#`, fail in the same notebook. Collisions are checked on **every ancestor prefix**, including ancestors not explicitly assigned.
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

`<notebook>/tags/` and `<notebook>/page/` are reserved namespaces: no authored notes, sections, URL/slug overrides, aliases, or local static output may occupy them. Source collisions are rejected before adapter generation; resolved URLs and aliases are also validated during rendering. `tag_view` is internal generated-page metadata, not an author field. The segment `page` is reserved only to avoid future conflicts; there is no pagination implementation. Names such as an ordinary article `science` and a tag `science` coexist because they occupy different namespaces. Storage-local articles such as `storage/tags` do not occupy the notebook-root namespace.

Always build with **both** `--panicOnWarning --printPathWarnings` to detect Hugo publication collisions in addition to the intentional `P1B ...` diagnostics. Failed builds may leave partial output; never preview/publish them. Use a fresh destination rather than trusting old generated files.

### Implementation and limits

`content/_content.gotmpl` creates real Hugo **section Pages** for hubs, tags and their ancestors. A small recursive partial reads local front matter with Hugo's `os.ReadDir`/`ReadFile` and `transform.Unmarshal`. It recognizes marked owners and leaf bundles, skipping Markdown leaf resources. This is **route discovery**, not a replacement for Hugo's page parsing. No `Site.Pages` access occurs in the adapter: installed Hugo 0.166 errors at that build stage, as the test reproduces.

At render time, `tags/model.html` computes membership from the owner's actual `.RegularPagesRecursive`, filtered through the same nearest-owner helper used in P1-A. One normalizer serves discovery and membership. Counts and lists come from the same deduplicated Page slices. Generated sections keep the native `.Paginate` path available for the next slice; no paginator calls or speculative pagination helper are added now.

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

Port 14237 was available for the automated HTTP smoke test, which stopped its server afterward. If occupied when you try, choose another explicit free port; do not stop the existing service. Visit `http://127.0.0.1:14237/field-notes/tags/`, then Science → Quantum → Basics (2 notes); compare Lab notes' Basics (1 note). Follow a note's owner/tag links and the Alpha cross-notebook link. Unicode and space-normalized examples live under Field notes. Stop this foreground preview with Ctrl-C. No live server is left by the automated checks.
