# Collection and page overrides

All Sidera settings live in the same `params.sidera` table. Add the following
keys **inside the existing table**, rather than declaring a duplicate TOML table.

For the Field notes root:

```toml
[params.sidera]
# Keep existing collection/byline/show_updated/list_order/page_size here.
left = ['menu', 'notes-tags']
right = ['recent', 'profile']
recent_count = 2
profile = {title = 'Field notebook', text = 'A collection-local profile.'}
```

For Alpha's existing front matter:

```toml
[params.sidera]
# Keep existing tags and pinned here.
left = ['notes-tags']
right = ['text']
text = 'This page replaces the collection’s right region.'
```

For the standalone About page:

```toml
[params.sidera]
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
runtime setting engine. Native cascading is still available but a local `sidera`
table replaces the cascaded table. `examples/scoped.toml` demonstrates it only on
About, which has no local table in the normal source. Do not expect native cascade
to inject individual shell fields into a note's existing `sidera.tags` table.
