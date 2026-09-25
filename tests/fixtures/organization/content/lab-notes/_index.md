+++
preset = 'notes'
title = 'Lab notes'
[params]
# Explicit legacy all-content hub for organization/pagination regression coverage.
taxonomy_hubs = 'list'
taxonomy_hierarchy = ['tags', 'categories']
scope_root = true
byline = 'Lab team'
show_updated = false
list_order = 'title'
page_size = 3
[cascade.target]
kind = 'page'
[cascade.params]
byline = 'Lab team'
show_updated = false

+++
Lab notes is an independent synthetic notebook. Article defaults live here; membership follows placement.
