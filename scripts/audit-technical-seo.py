import argparse
import hashlib
import importlib.util
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SITE = "https://sportenvo.com/"
spec = importlib.util.spec_from_file_location("buyer", ROOT / "scripts/sync-buyer-content.py")
buyer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(buyer)


def walk(node, excluded=False):
    excluded = excluded or node.tag in {"nav", "footer"} or "site-header" in node.attrs.get("class", "").split()
    yield node, excluded
    for child in node.children:
        if isinstance(child, buyer.Element):
            yield from walk(child, excluded)


def target(href, url):
    parsed = urlsplit(urljoin(url, href))
    if parsed.netloc != "sportenvo.com" or parsed.scheme not in {"http", "https"}:
        return None
    pathname = unquote(parsed.path)
    if pathname == "/index.html":
        pathname = "/"
    return SITE.rstrip("/") + pathname


def audit(root=ROOT):
    pages = {}
    issues = []
    index_refs = []
    for file in sorted(root.rglob("*.html")):
        rel = file.relative_to(root).as_posix()
        if any(part.startswith(".") for part in file.relative_to(root).parts) or re.match(r"google[\w-]+\.html$", file.name):
            continue
        raw = file.read_text(encoding="utf-8")
        doc = buyer.Document(raw)
        url = urljoin(SITE, "" if rel == "index.html" else rel)
        meta = list(doc.root.find("meta"))
        noindex = any(n.attrs.get("name", "").lower() in {"robots", "googlebot"} and "noindex" in n.attrs.get("content", "").lower() for n in meta)
        canonicals = [n.attrs.get("href") for n in doc.root.find("link") if "canonical" in n.attrs.get("rel", "").split()]
        anchors = []
        for node, excluded in walk(doc.root):
            if node.tag != "a" or not node.attrs.get("href"):
                continue
            href = node.attrs["href"]
            parsed = urlsplit(urljoin(url, href))
            if parsed.netloc == "sportenvo.com" and parsed.path == "/index.html":
                index_refs.append({"file": rel, "href": href})
            dest = target(href, url)
            if dest:
                anchors.append({"target": dest, "href": href, "body": not excluded, "text": buyer.clean(node.text())})
        if not noindex:
            if canonicals != [url]:
                issues.append(f"{rel}: expected exactly one self canonical {url}, found {canonicals}")
            if len(list(doc.root.find("h1"))) != 1:
                issues.append(f"{rel}: H1 count is not one")
        pages[url] = {"file": rel, "url": url, "noindex": noindex, "canonical": canonicals, "anchors": anchors}
    inbound, body_inbound = defaultdict(set), defaultdict(set)
    for url, page in pages.items():
        for a in page["anchors"]:
            dest = a["target"]
            pathname = unquote(urlsplit(dest).path)
            if dest not in pages and not (root / pathname.lstrip("/")).is_file():
                issues.append(f"{page['file']}: missing internal target {a['href']}")
            if url != dest and not page["noindex"]:
                inbound[dest].add(page["file"])
                if a["body"]:
                    body_inbound[dest].add(page["file"])
    sm = ET.parse(root / "sitemap.xml")
    urls = [n.text for n in sm.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    if len(urls) != len(set(urls)):
        issues.append("sitemap: duplicate URLs")
    for url in urls:
        if url not in pages or pages[url]["noindex"] or pages[url]["canonical"] != [url]:
            issues.append(f"sitemap: unavailable, noindex or noncanonical URL {url}")
    public = [p for p in pages.values() if not p["noindex"]]
    for p in public:
        if p["url"] not in urls:
            issues.append(f"sitemap: missing {p['url']}")
        p["incoming_pages"] = sorted(inbound[p["url"]])
        p["incoming_body_pages"] = sorted(body_inbound[p["url"]])
    home = (root / "index.html").read_bytes()
    hero = re.search(rb'<section class="home-hero">[\s\S]*?</section>', home)
    if not hero:
        issues.append("homepage: missing original home-hero section")
    return {
        "summary": {"html_pages": len(pages), "public_pages": len(public), "sitemap_urls": len(urls), "index_html_links": len(index_refs), "issues": len(issues)},
        "hero_sha256": hashlib.sha256(hero[0]).hexdigest() if hero else None,
        "issues": issues, "index_html_links": index_refs, "sitemap_urls": urls,
        "orphans": [p["file"] for p in public if p["url"] != SITE and not p["incoming_pages"]],
        "single_entry_pages": [p["file"] for p in public if len(p["incoming_pages"]) == 1],
        "body_single_entry_pages": [p["file"] for p in public if len(p["incoming_body_pages"]) <= 1],
        "pages": list(pages.values()),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", type=Path)
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--baseline", type=Path)
    args = parser.parse_args()
    result = audit()
    if args.baseline:
        before = json.loads(args.baseline.read_text(encoding="utf-8"))
        if before["hero_sha256"] != result["hero_sha256"]:
            result["issues"].append("homepage Hero differs from baseline")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(json.dumps({**result["summary"], "orphans": result["orphans"], "body_single_entry_pages": result["body_single_entry_pages"]}))
    for issue in result["issues"]:
        print(issue)
    if result["issues"] or (args.strict and result["index_html_links"]):
        raise SystemExit(1)
