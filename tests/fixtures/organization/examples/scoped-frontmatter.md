# Collection and page overrides

Public custom settings live under native `params`. Add the following
keys **inside the existing table**, rather than declaring a duplicate TOML table.

For the Field notes root:

```toml
[params]
# Keep existing scope_root/list_order/page_size here; preset is native top-level.
left = ['menu', 'taxonomies']
right = ['recent', 'profile']
recent_count = 2
profile = {title = 'Field notebook', text = 'A collection-local profile.'}
```

For Alpha's existing front matter:

```toml
[params]
# Keep pinned here; tags/categories/authors/series are native top-level.
left = ['taxonomies']
right = ['text']
text = 'This page replaces the collection’s right region.'
```

For the standalone About page:

```toml
[params]
left = false
right = []
```

These are ordinary content settings—not theme edits. For a ready-to-run isolated
copy, leaving your normal content untouched:

```sh
uv run --no-project --no-managed-python python3 tests/prepare_scoped_example.py \
  "$PWD/.checks/scoped-preview"
hugo server --source "$PWD/.checks/scoped-preview/example-source" \
  --config hugo.toml,full-shell.toml --bind 127.0.0.1 --port 14420 --disableFastRender
```

Choose a new output folder/available port; stop your foreground server with Ctrl-C.
The helper applies these same owner/page overrides; it is showcase tooling, not a
runtime setting engine. Native cascade is evaluated before preset fallback. Flat scalar
params inherit independently; a local nested map replaces that cascaded map. Ordinary root
params affect that root only—put intended descendant defaults under `cascade.params`.
