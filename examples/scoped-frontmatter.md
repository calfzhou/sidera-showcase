# Page and collection overrides

The root showcase is the only preview site. Its content uses YAML front matter. Merge these
keys into the existing `params` map (do not add a second `params` block).

For `content/notes/_index.md`:

```yaml
params:
  left: [menu, taxonomies]
  right:
    - component: recent
      config: {order: publication, count: 2}
    - component: profile
      config: {title: Notes desk, text: 'A collection-local profile.'}
```

For `content/notes/package-management/index.md`:

```yaml
params:
  right:
    - component: text
      config: {text: 'A page-specific sidebar note.'}
```

For `content/about.md`, `params.left: false` and `params.right: []` explicitly select a compact
shell. Ordinary section params affect that section only; use `cascade.params` for descendants.
Native Page values win before preset/site defaults. Instance config is local to that instance.

The old `tests/prepare_scoped_example.py` remains an isolated **regression fixture** preparer;
it does not modify or represent another maintained live example.
