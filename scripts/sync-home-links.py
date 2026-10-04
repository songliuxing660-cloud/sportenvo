import argparse
import html
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

SITE = "https://sportenvo.com/"
ROOT = Path(__file__).resolve().parents[1]


class HomeLinks(HTMLParser):
    def __init__(self, source, base):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.base = base
        self.changes = []
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        href = dict(attrs).get("href")
        if tag != "a" or not href or href.startswith("#"):
            return
        url = urlsplit(urljoin(self.base, href))
        if url.netloc != "sportenvo.com" or url.path != "/index.html":
            return
        # Keep source/product/UTM parameters and the inquiry anchor intact.
        replacement = html.escape(urlunsplit(("https", "sportenvo.com", "/", url.query, url.fragment)), quote=True)
        opening = self.get_starttag_text()
        attr = re.search(r'\bhref\s*=\s*(["\'])(.*?)\1', opening, re.I | re.S)
        if not attr:
            raise ValueError("Expected a quoted href")
        line, column = self.getpos()
        start = self.offsets[line - 1] + column
        self.changes.append((start + attr.start(2), start + attr.end(2), replacement))

    handle_startendtag = handle_starttag

    def updated(self):
        result = self.source
        for start, end, replacement in reversed(self.changes):
            result = result[:start] + replacement + result[end:]
        return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize homepage links without reserializing HTML or changing layout.")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    count = 0
    for file in sorted(ROOT.rglob("*.html")):
        rel = file.relative_to(ROOT)
        if any(part.startswith(".") for part in rel.parts):
            continue
        source = file.read_bytes().decode("utf-8")
        links = HomeLinks(source, urljoin(SITE, rel.as_posix()))
        if links.changes:
            print(f"{rel.as_posix()}: {len(links.changes)} homepage hrefs")
            count += len(links.changes)
            if args.write:
                file.write_bytes(links.updated().encode("utf-8"))
    print(f"Homepage links {'normalized' if args.write else 'pending'}: {count}")
