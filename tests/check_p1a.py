"""P1-A integration checks; stdlib only. Retains isolated runs under .checks/."""
from html.parser import HTMLParser
from pathlib import Path
import hashlib
import shutil
import subprocess
import tempfile
from urllib.parse import unquote, urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.article = None
        self.links = {}
        self.assets = []
        self.updated = False
        self.byline = ""
        self.collection_links = []
        self.in_collection_nav = False
        self.list_id = None
        self.in_byline = False
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article":
            assert self.article is None, "More than one article renderer"
            self.article = attrs
        if tag == "ul":
            self.list_id = attrs.get("id")
            self.links[self.list_id] = []
        if tag == "nav":
            self.in_collection_nav = attrs.get("aria-label") == "Collection"
        if tag == "a":
            if self.list_id:
                self.links[self.list_id].append(attrs["href"])
            if self.in_collection_nav:
                self.collection_links.append(attrs["href"])
            self.assets.append(attrs["href"])
        if tag == "img":
            assert attrs.get("alt"), "Fixture image needs alt text"
            self.assets.append(attrs["src"])
        if tag == "p" and attrs.get("class") == "byline":
            self.in_byline = True
        if tag == "time" and attrs.get("class") == "updated":
            self.updated = True

    def handle_endtag(self, tag):
        if tag == "ul":
            self.list_id = None
        if tag == "nav":
            self.in_collection_nav = False
        if tag == "p":
            self.in_byline = False

    def handle_data(self, data):
        if self.in_byline:
            self.byline += data


# Explicit expectations, not derived from the templates under test.
COLLECTIONS = {
    "journal": ("Journal editor", False, ["first-signal", "second-signal", "2024/archive-signal"]),
    "dispatches": ("Dispatch editor", False, ["first-signal", "second-signal", "third-signal"]),
    "field-notes": ("Field team", True, ["alpha", "beta", "gamma", "delta", "epsilon"]),
    "lab-notes": ("Lab team", False, ["alpha", "beta", "gamma", "delta", "storage/epsilon"]),
}
OVERRIDES = {
    "journal/second-signal": ("Guest editor", True),
    "field-notes/beta": ("Visiting naturalist", False),
    "lab-notes/beta": ("Visiting researcher", True),
}


def page(output, route):
    return Page(output / route.strip("/") / "index.html")


def same_links(actual, expected):
    assert len(actual) == len(set(actual)), f"Duplicate links: {actual}"
    assert set(actual) == set(expected), (actual, expected)


def article(output, route, owner, byline, updated):
    rendered = page(output, route)
    assert rendered.article == {
        "data-renderer": "shared-article", "data-collection": owner
    }, (route, rendered.article)
    same_links(rendered.collection_links, [owner] if owner else [])
    assert rendered.byline == byline, (route, rendered.byline, byline)
    assert rendered.updated is updated, (route, rendered.updated, updated)


def check_baseline(output, extra=False):
    roots = [f"/{slug}/" for slug in COLLECTIONS]
    if extra:
        roots.append("/lab-notes/annex/")
    same_links(page(output, "/").links["collections"], roots)
    same_links(page(output, "/").links["standalone"], ["/about/"])
    expected_articles = {"/about/"}
    for slug, (byline, updated, paths) in COLLECTIONS.items():
        owner = f"/{slug}/"
        routes = [f"{owner}{path}/" for path in paths]
        same_links(page(output, owner).links["articles"], routes)
        same_links(page(output, owner).collection_links, [owner])
        for path, route in zip(paths, routes):
            expected_articles.add(route)
            article(output, route, owner, *OVERRIDES.get(f"{slug}/{path}", (byline, updated)))
            text = (output / route.strip("/") / "index.html").read_text()
            assert "This is the synthetic <strong>" in text, route
    article(output, "/about/", "", "", False)
    same_links(page(output, "/lab-notes/storage/").links["articles"],
               ["/lab-notes/storage/epsilon/"])
    same_links(page(output, "/lab-notes/storage/").collection_links, ["/lab-notes/"])
    assert not (output / "journal/2024/index.html").exists(), "Directory became a section"
    if extra:
        route = "/lab-notes/annex/storage/probe/"
        expected_articles.add(route)
        article(output, route, "/lab-notes/annex/", "Annex team", True)
        for section in ["/lab-notes/annex/", "/lab-notes/annex/storage/"]:
            same_links(page(output, section).links["articles"], [route])
            same_links(page(output, section).collection_links, ["/lab-notes/annex/"])
    actual_articles = set()
    for path in output.rglob("*.html"):
        rendered = Page(path)
        route = "/" + path.relative_to(output).as_posix().removesuffix("index.html")
        if rendered.article:
            actual_articles.add(route)
        for link in rendered.assets:
            target = urlparse(urljoin("https://example.org" + route, link))
            if target.netloc != "example.org":
                continue
            local = output / unquote(target.path).lstrip("/")
            if target.path.endswith("/"):
                local /= "index.html"
            assert local.is_file(), (path, link, local)
    assert actual_articles == expected_articles, (actual_articles, expected_articles)
    bundle = Path("field-notes/alpha")
    for asset in ["sample.svg", "sample.py"]:
        assert (output / bundle / asset).read_bytes() == (ROOT / "content" / bundle / asset).read_bytes()
    # The Markdown resource must not become a page or disappear from a branch's article count.
    assert not (output / bundle / "resource-note/index.html").exists()
    assert {"sample.svg", "sample.py"} <= set(page(output, "/field-notes/alpha/").assets)


def snapshot(root):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file()}


def build(source, output, run, label):
    command = ["hugo", "--source", str(source), "--destination", str(output),
               "--cacheDir", str(run / "cache"), "--panicOnWarning", "--printPathWarnings"]
    result = subprocess.run(command, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, timeout=60)
    (run / f"{label}.log").write_text(result.stdout)
    print(result.stdout, end="")
    assert result.returncode == 0, f"{label} build failed"
    assert "WARN" not in result.stdout and "ERROR" not in result.stdout, result.stdout


def main():
    checks = ROOT / ".checks"
    checks.mkdir(exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix="p1a-", dir=checks))
    print(f"Retained run: {run}", flush=True)
    version = subprocess.check_output(["hugo", "version"], text=True, timeout=10).strip()
    (run / "version.txt").write_text(version + "\n")
    print(version)
    original_templates = snapshot(ROOT / "layouts")
    for source in (ROOT / "content").rglob("*.md"):
        if source.name not in ("_index.md", "resource-note.md"):
            assert "collection =" not in source.read_text(), source
            assert "notebook_id" not in source.read_text(), source
    build(ROOT, run / "baseline", run, "baseline")
    check_baseline(run / "baseline")
    print("PASS baseline: 4 independent collections, 16 articles + standalone, defaults/overrides, assets, nested section")

    variant = run / "variant-source"
    variant.mkdir()
    shutil.copy2(ROOT / "hugo.toml", variant / "hugo.toml")
    for directory in ["content", "layouts"]:
        shutil.copytree(ROOT / directory, variant / directory)
    shutil.copytree(ROOT / "tests/fixtures/annex", variant / "content/lab-notes/annex")
    assert snapshot(variant / "layouts") == original_templates
    assert (variant / "hugo.toml").read_bytes() == (ROOT / "hugo.toml").read_bytes()
    build(variant, run / "extended", run, "extended")
    check_baseline(run / "extended", extra=True)
    assert snapshot(variant / "layouts") == original_templates == snapshot(ROOT / "layouts")
    print("PASS content-only extension: 5 collections, nearest nested owner/cascade, no parent-list leakage, unchanged templates/config")
    summary = "PASS P1-A targeted checks (P1-01, P1-02, P1-07, P1-08). P1-03/04 are pending; P1-05/06 are checked separately by check_p1b.py.\n"
    (run / "result.txt").write_text(summary)
    print(summary, end="")


if __name__ == "__main__":
    main()
