# Temporary collection PoC theme

This folder packages the existing P1 organizational proof; **it is not the final
project theme/name or a visual-design choice**. No separate repository, new
styling, dependencies or broader loader support is introduced.

- `layouts/` contains the shared article/section/tag templates and their helpers.
- `content/_content.gotmpl` is the same tag-page adapter, supplied through Hugo's
  native theme content mount. There are no demo articles in this theme.
- The site enables it with `theme = 'poc'`. No site-local templates or adapter
  are required; optional same-path site templates can override theme templates.
- Site content, collection definitions/defaults, URL choices and configuration
  remain site-owned. The showcase config documents the date chains, disabled
  global taxonomies/RSS and pagination namespace used by this proof.

The adapter still physically reads the consuming site's local `content/`
Markdown metadata. Packaging does not add arbitrary content mounts, multilingual
inputs, other formats, watcher reliability or complete publication eligibility.
A root site content adapter would override this one; composing other adapters is
not tested. These limits are not silently accepted future authoring restrictions.

See the [showcase guide](../../README.md) and
[packaging/skeleton comparison](../../../migration-project/P1-D-THEME.md).
All existing templates and the adapter were moved byte-for-byte; no behavior
change is intended. `tests/check_poc_theme.py` reconstructs the former in-place
layout in an isolated copy and asserts identical complete published output.
