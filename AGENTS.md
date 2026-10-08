# Working on Fieldbook

Read README.md, tests/README.md and the current theme AGENTS.md/manual before editing.
Fieldbook is Sidera's small development consumer. Keep reports and execution logs
outside tracked product documentation. Do not import real-site content.

## Ownership and scope

- Root content is the only live demo: journal, notes, handbook, author and series.
  Preserve representative Markdown/math/code/diagrams/media, source links and edge cases.
  Do not add a parallel preview app, copied manual or duplicate theme checkout.
- Embed only themes/sidera/docs/content with native mounts/pageRef; preserve manual
  AI labels, licenses, empty authors, explicit dates and comments-off cascade.
- Sidera is an independently owned submodule. Check its branch/status, commit theme
  first, confirm remote availability, then commit the consumer gitlink. Development
  uses main; public clone URLs stay HTTPS, owner pushurl stays local SSH.
- Check status before edits and preserve unrelated work. Ask before deleting content.
  Local changes do not authorize pushes, deployments or settings changes. Successful
  main pushes automatically deploy once Pages is activated; disclose that consequence.
  No force push/reset/rebase/squash, automatic branch deletion or other-checkout sync.
- Include `Co-Authored-By: Eureka` in commits created by Eureka.

## Runtime invariants

- Native Hugo fields stay top-level; theme fields use params. False/empty overrides,
  native cascade and independently scoped collections have meaning. Follow the manual.
- Project Pages prefix `/sidera-showcase/` is part of the URL contract. Validate menus,
  identity/CSS/JS, search worker/index/destinations, diagrams, media and 404 links.
  Do not conceal root-host assumptions with redirects or hardcoded template rewrites.
- Keep Goldmark unsafe off. Do not execute included source, fetch arbitrary content,
  relax sandbox/origin validation, or expose private fixtures to make a test pass.
- Preserve EN/ZH UI, keyboard/focus, no-JS/failure behavior and fixed branding.
  Authored English demo/manual bodies are not automatically translated.
- Giscus is showcase-owned. No test comments/reactions or provider permission changes.
  Test its configuration and lazy loader with isolated mocks/network blocking.

## Verification

Use Hugo 0.166.0 extended and fresh destinations/caches. Ordinary Hugo builds require
no Node/Python dependencies. `make check` uses uv with installed Python; CI uses its
system Python standard library. Never install packages speculatively.

Run relevant existing suites after changing shared helpers; do not delete a test
because its assertion predates a theme update. Distinguish obsolete presentation
expectations from supported invariants. Keep test code in its owning repository.
Shared root-host fixture controls are intentional; check_pages must always build
or inspect the real production configuration and prefix without those controls.

Browser checks use tests/browser.mjs, explicit free HTTP/CDP ports and a unique
owned Chrome process/profile; verify its identity, block external requests, and stop
only owned processes. Never attach to a user browser/server. Source directories,
.hugo_build.lock, historical .checks runs and other repositories are not disposable.
No retained preview server unless requested; users run their own Hugo preview.

Report actual checked/pending outcomes. A workflow file or local build is not proof
of GitHub Linux CI, Pages deployment or a live link.
