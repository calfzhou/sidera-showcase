# Organization regression inputs — not a second showcase

Snapshot origin: showcase `270777e` (theme remains live, not frozen).

This is the original root content/configuration, preserved byte-for-byte when Fieldbook became
the single root showcase. It deliberately contains multiple blogs/notebooks, pins, date ties,
undated pages, nested scope boundaries, shared authors/series, resources and ordered docs.

`copy_site()` in `tests/check_p1b.py` assembles these inputs with the **current live theme** in a
fresh test directory. No theme copy is stored here. Existing semantic assertions remain against
this stable fixture. `copy_showcase()` instead copies the real root site for its UI/config tests.
The root content and fixture content are not mounted together or published together.

The `examples/` files are the matching old configuration inputs for those regression tests.
They are not the root site's current preview instructions. Use the repository root README for
normal preview; add new edge cases to tests, not another maintained example site.
