import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


audit = module("technical", "audit-technical-seo.py")
home = module("home_links", "sync-home-links.py")


class TechnicalSeo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = audit.audit()
        cls.pages = {p["file"]: p for p in cls.result["pages"]}

    def test_site_canonical_sitemap_and_links(self):
        self.assertEqual(self.result["issues"], [])
        self.assertEqual(self.result["index_html_links"], [])

    def test_no_public_orphan_or_single_entry_page(self):
        self.assertEqual(self.result["orphans"], [])
        self.assertEqual(self.result["single_entry_pages"], [])

    def test_home_hero_is_unchanged(self):
        # Baseline from the published homepage before this scoped SEO change.
        self.assertEqual(self.result["hero_sha256"], "bf3cc31102cce2d665479020d46f9ca11f2a13c49099e269b798e127df3dd221")

    def test_normalization_keeps_query_anchor_and_other_markup(self):
        source = '<a class="button" href="../index.html?source=roof&amp;product=roof#formal-project-inquiry">Quote</a>'
        output = home.HomeLinks(source, "https://sportenvo.com/markets/uk.html").updated()
        self.assertEqual(output, '<a class="button" href="https://sportenvo.com/?source=roof&amp;product=roof#formal-project-inquiry">Quote</a>')
        self.assertEqual(home.HomeLinks(output, audit.SITE).updated(), output)

    def test_normalization_leaves_external_and_product_links(self):
        source = '<a href="https://example.com/index.html">Other</a><a href="roof.html">Roof</a><a href="#main">Skip</a>'
        self.assertEqual(home.HomeLinks(source, audit.SITE + "index.html").updated(), source)

    def test_dynamic_quote_link_uses_root(self):
        source = (ROOT / "assets/site-v2.js").read_text(encoding="utf-8")
        self.assertNotIn('quoteLink.href = "/index.html', source)
        self.assertIn('quoteLink.href = "https://sportenvo.com/?source=floating-product-cta&product="', source)

    def test_contextual_topic_edges(self):
        edges = {
            "commercial-padel-court.html": ["modular-foundation-guide.html", "padel-court-installation-guide.html", "padel-court-shipping-guide.html"],
            "padel-court-installation-guide.html": ["commercial-padel-court.html", "courts.html", "modular-foundation.html"],
            "high-wind-padel-court-guide.html": ["commercial-padel-court.html", "force-hx.html", "modular-foundation-guide.html"],
            "modular-foundation-guide.html": ["commercial-padel-court.html", "modular-foundation.html"],
            "roof.html": ["commercial-padel-court.html", "high-wind-padel-court-guide.html"],
            "padel-court-roof-guide.html": ["commercial-padel-court.html", "roof.html"],
            "how-much-does-a-padel-court-cost.html": ["padel-court-roof-guide.html", "padel-court-dimensions.html"],
            "projects.html": ["commercial-padel-court.html", "start-project.html"],
        }
        for file, expected in edges.items():
            body = {a["target"] for a in self.pages[file]["anchors"] if a["body"]}
            for target in expected:
                with self.subTest(file=file, target=target):
                    self.assertIn(audit.SITE + target, body)

    def test_existing_robots_policy_is_preserved(self):
        text = (ROOT / "robots.txt").read_text(encoding="utf-8")
        self.assertEqual(text.strip(), "User-agent: *\nAllow: /\n\nSitemap: https://sportenvo.com/sitemap.xml")

    def test_site_selection_long_text_wraps_without_removing_content(self):
        text = (ROOT / "padel-club-site-selection.html").read_text(encoding="utf-8")
        self.assertIn('.buyer-guide-v5 .article-main p{overflow-wrap:anywhere}', text)


if __name__ == "__main__":
    unittest.main()
