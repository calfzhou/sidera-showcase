# Sidera showcase — Fieldbook

A small fictional site for developing [Sidera](https://github.com/calfzhou/hugo-theme-sidera):
a journal, notes, an example handbook, native authors/series and rendering specimens.
`content/` is the single live demo; the theme's manual is mounted directly from its submodule.

**Live demo:** <https://calfzhou.github.io/sidera-showcase/>

## Clone and preview

Requires **Git and Hugo 0.166.0 extended**. Normal builds need no Node or Python.

```sh
git clone --recurse-submodules https://github.com/calfzhou/sidera-showcase.git
cd sidera-showcase
hugo server --bind 127.0.0.1 --port 1313 --disableFastRender
# Stop with Ctrl-C. Choose another port if 1313 is occupied.
hugo --environment production --panicOnWarning
```

An existing clone needs `git submodule update --init --recursive`. This restores the
**committed theme revision**, not the newest main. Build into a fresh destination
for authoritative output; ordinary builds do not clear stale files. `make check`
does this automatically without deleting earlier output.

## Theme development

This showcase's `themes/sidera` checkout is the fast development target. A recursive
clone normally leaves it detached at the pinned commit. Check both repositories for
local changes before switching or updating; stop on divergence rather than resetting.

```sh
git status --short
git -C themes/sidera status --short
git -C themes/sidera fetch origin main
git -C themes/sidera switch main
# If no local main exists, instead use: git -C themes/sidera switch --track origin/main
git -C themes/sidera merge --ff-only origin/main

# Owners only: local push transport, never a change to the public .gitmodules URL.
git -C themes/sidera config remote.origin.pushurl git@github.com:calfzhou/hugo-theme-sidera.git
```

Edit the theme directly, test it here, then **commit and push the theme first**.
After confirming its commit is available remotely, commit the consumer pin:

```sh
git -C themes/sidera push origin main
git add themes/sidera
git commit -m "Update Sidera"
git push origin main
```

Commit theme edits before that first push. Never use `submodule update --remote`
in a build: every consumer pins an exact revision. Other sites, including GoCalf,
update their own pins deliberately; this workflow does not synchronize their checkouts.

## Manual and examples

- Preview **Sidera manual** at `/sidera/` beneath the deployment prefix. Its source is
  [`themes/sidera/docs/content`](themes/sidera/docs/content/_index.md), not copied demo content.
  Manual AI disclosure, MIT notice, empty authors and disabled comments remain intact.
- **Handbook** is Fieldbook's fictional example tree and rendering gallery, not theme documentation.
- `examples/*.toml` are configuration overlays on the same site. For Chinese controls:
  `hugo server --config hugo.toml,examples/chinese.toml --port 1313`.
- Giscus uses only the showcase's repository/category. Previewing may contact the
  provider; do not submit test comments or reactions. The manual never loads comments.

## Checks and GitHub flow

Checks use installed Python 3.11+ and uv; no packages are installed.

```sh
make check                 # fresh production build, prefix/artifact and workflow checks
# Focused feature suites (Python standard library, managed with uv):
uv run --no-project --no-managed-python python3 tests/check_showcase.py
uv run --no-project --no-managed-python python3 tests/check_source_links.py
```

[Contributor guidance](AGENTS.md) and the [test guide](tests/README.md) cover fixtures,
focused regressions and isolated browser tests. Only browser tests require Node
(`nvm use`, version in `.nvmrc`) and an installed Chrome; no browser/package download.

The workflow builds/tests/uploads an artifact for PRs to `main`. PRs never deploy.
Pages uses **GitHub Actions**. Successful pushes to `main`
**automatically deploy**; failed or non-main builds cannot publish. A manual run is
build-only unless `deploy` is selected on main. Use merge commits when merging PRs;
do not squash/rebase or automatically delete branches. Direct owner commits on main
use the same checks and deployment policy. No CNAME or custom domain is used.

Hugo's Linux version/checksum and recursive theme pin are fixed in the workflow.
Theme and bundled asset rights remain in Sidera's licenses/notices; no broader license
for site content is implied.
