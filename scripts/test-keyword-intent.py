"""Guard the distinct catalog, venue solution and commercial procurement intents."""
import json
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    "courts.html": "Compare Padel Court Types & Systems",
    "solutions.html": "Commercial Padel Court Solutions by Venue & Site",
    "commercial-padel-court.html": "Commercial Padel Court Procurement & Supply Scope",
}


class Headings(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.head = False
        self.capture = None
        self.values = {"title": [], "h1": [], "script": []}
        self.metadata = {}
        self.links = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "head":
            self.head = True
        if tag in {"title", "h1"} and (tag != "title" or self.head):
            self.capture = tag
            self.values[tag].append("")
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.capture = "script"
            self.values["script"].append("")
        if tag == "meta":
            self.metadata[attrs.get("property", attrs.get("name", ""))] = attrs.get("content", "")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.metadata["canonical"] = attrs.get("href", "")
        if tag == "a":
            self.links.append(attrs.get("href", ""))

    def handle_endtag(self, tag):
        if tag == "head":
            self.head = False
        if tag == self.capture:
            self.capture = None

    def handle_data(self, value):
        if self.capture:
            self.values[self.capture][-1] += value


class IntentTests(unittest.TestCase):
    def test_distinct_intents_and_consistent_metadata(self):
        for file, intent in EXPECTED.items():
            with self.subTest(file=file):
                page = Headings((ROOT/file).read_text(encoding="utf-8"))
                title = intent + " | SPORTENVO"
                self.assertEqual(page.values["title"], [title])
                self.assertEqual(page.values["h1"], [intent])
                self.assertEqual(page.metadata["og:title"], title)
                self.assertEqual(page.metadata["twitter:title"], title)
                self.assertEqual(page.metadata["canonical"], "https://sportenvo.com/"+file)
                schemas = [json.loads(s) for s in page.values["script"]]
                entity = next(s for s in schemas if s.get("@type") in {"WebPage", "CollectionPage"})
                self.assertEqual(entity["name"], title)

    def test_procurement_routes_to_specific_buyer_paths(self):
        page = Headings((ROOT/"commercial-padel-court.html").read_text(encoding="utf-8"))
        for target in ["courts.html", "solutions.html", "commercial-padel-club.html", "hotel-resort-padel-court.html", "padel-court-distributor.html"]:
            self.assertIn(target, page.links)

    def test_catalog_routes_to_procurement(self):
        page = Headings((ROOT/"courts.html").read_text(encoding="utf-8"))
        self.assertIn("commercial-padel-court.html", page.links)

    def test_no_literal_line_break_artifact(self):
        self.assertNotIn(r"</section>\n<section", (ROOT/"solutions.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
