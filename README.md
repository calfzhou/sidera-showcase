# Hugo collection organization showcase

P1-A is an intentionally unstyled, synthetic organizational proof, not a theme choice or a Stellar port. The generated `themes/skeleton` files remain intact but are **inactive**. No dependencies, external services, JavaScript, preprocessing, series, or wiki implementation are required.

The durable plan, fixture matrix, decisions, results and phase gates live in [migration-project](../migration-project/README.md), especially [P1-A evidence](../migration-project/P1-A.md). Do not infer completion of Phase 1 from this slice.

## Run

Verified with Hugo **v0.166.0+extended+withdeploy**, Homebrew darwin/amd64. Earlier versions have not been tested. The check script uses Python 3.9+ standard library only (tested 3.9.6); `uv` 0.11.21 was used to invoke the installed interpreter, with no project environment or managed Python installation.

From this repository:

```sh
# Reproducible targeted integration checks, including two strict builds:
uv run --no-project --no-managed-python python3 tests/check_p1a.py

# Standalone build, isolated from any pre-existing public/ output:
run=$(mktemp -d "$PWD/.checks/manual-XXXXXX") # .checks exists after running the checks
hugo --destination "$run/public" --cacheDir "$run/cache" --panicOnWarning
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

The two notebooks intentionally differ in byline and update-date visibility. These presentation settings do **not** define what a notebook is; tag/reference organization is still to be implemented. `date`/`lastmod` are explicit fixture values, not a finalized migration date policy. Lists currently use title order, with no pagination or pins. Raw `params.tags` and `params.pinned` are future test inputs only, not a settled tag/pinning contract. Global taxonomy/term/RSS outputs are disabled for this slice; no scoped taxonomy or feed support is claimed.

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

Pass: **P1-01, P1-02, P1-07, P1-08** in this minimal slice. Pending: **P1-03–P1-06**, including date ordering/ties/pinning, pagination, notebook tag hierarchy/counts/scoping, route normalization/collisions and tag navigation. No full Phase 1 gate, visual styling, real-content compatibility, original-site edits or deployment are implied.
