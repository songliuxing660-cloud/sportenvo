import re
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

ROOT = Path(__file__).resolve().parents[1]
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
SITE = "https://sportenvo.com"
BOTS = ("Googlebot", "bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "Claude-SearchBot", "Claude-User", "ClaudeBot", "PerplexityBot", "Google-Extended")


def sitemap_urls(xml):
    root = ET.fromstring(xml)
    if root.tag != NS + "urlset":
        raise ValueError("Expected the sitemap urlset namespace")
    urls = []
    for node in root.iter():
        if node.tail and node.tail.strip():
            raise ValueError("Unexpected text between sitemap elements")
        if node.tag in {NS + "urlset", NS + "url"} and node.text and node.text.strip():
            raise ValueError("Unexpected text inside sitemap containers")
    for entry in root:
        if entry.tag != NS + "url" or len(entry.findall(NS + "loc")) != 1:
            raise ValueError("Each sitemap entry needs one URL location")
        urls.append(entry.findtext(NS + "loc"))
    return urls


class Metadata(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.robots = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("name", "").lower() in {"robots", "googlebot", "bingbot"}:
            self.robots.append(attrs.get("content", "").lower())


class CrawlPolicyTests(unittest.TestCase):
    def setUp(self):
        self.urls = sitemap_urls((ROOT / "sitemap.xml").read_text(encoding="utf-8"))
        self.robot_text = (ROOT / "robots.txt").read_text(encoding="utf-8")
        self.robots = RobotFileParser()
        self.robots.parse(self.robot_text.splitlines())

    def test_sitemap_structure_and_unique_same_origin_urls(self):
        self.assertTrue(self.urls)
        self.assertEqual(len(self.urls), len(set(self.urls)))
        self.assertTrue(all(urlsplit(url).scheme == "https" and urlsplit(url).netloc == "sportenvo.com" for url in self.urls))

    def test_literal_backslash_newline_between_urls_is_rejected(self):
        broken = f'<urlset xmlns="{NS[1:-1]}"><url><loc>{SITE}/</loc></url>\\n</urlset>'
        with self.assertRaises(ValueError):
            sitemap_urls(broken)

    def test_wrong_namespace_is_rejected(self):
        with self.assertRaises(ValueError):
            sitemap_urls("<urlset><url><loc>https://sportenvo.com/</loc></url></urlset>")

    def test_search_and_ai_crawlers_can_access_public_content_and_assets(self):
        targets = self.urls + [SITE + "/assets/site-v2.css", SITE + "/assets/site-v2.js", SITE + "/llms.txt", SITE + "/sitemap.xml"]
        for agent in BOTS:
            for url in targets:
                with self.subTest(agent=agent, url=url):
                    self.assertTrue(self.robots.can_fetch(agent, url))
        self.assertIn("Sitemap: " + SITE + "/sitemap.xml", self.robot_text)

    def test_sitemap_pages_allow_indexing_and_snippets(self):
        for url in self.urls:
            pathname = urlsplit(url).path.lstrip("/")
            file = ROOT / (pathname + "index.html" if pathname.endswith("/") or not pathname else pathname)
            metadata = Metadata(file.read_text(encoding="utf-8"))
            with self.subTest(url=url):
                # No robots meta is the default allow policy, not an exclusion.
                for directives in metadata.robots:
                    self.assertFalse(re.search(r"\b(?:noindex|nosnippet|none)\b|\bmax-snippet\s*:\s*0\b", directives))

    def test_llms_internal_references_are_canonical_public_pages_or_controls(self):
        text = (ROOT / "llms.txt").read_text(encoding="utf-8")
        urls = set(re.findall(r"https://sportenvo\.com/[^\s)>]*", text))
        self.assertTrue(urls)
        allowed = set(self.urls) | {SITE + "/robots.txt", SITE + "/sitemap.xml"}
        self.assertEqual(urls - allowed, set())


if __name__ == "__main__":
    unittest.main()
