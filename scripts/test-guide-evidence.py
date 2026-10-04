import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("guide_content", ROOT / "scripts/sync-guide-content.py")
guide = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guide)
LTA = "https://www.lta.org.uk/siteassets/padel/lta-padel-court-construction-guidance-note-2025.pdf"


class GuideEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.pages = {name: (ROOT / name).read_text(encoding="utf-8") for name in guide.PAGES}

    def test_faq_schema_matches_visible_answers_and_is_idempotent(self):
        for name, html in self.pages.items():
            with self.subTest(page=name):
                self.assertEqual(guide.synchronize(html), html)
                nodes = [node for m in guide.buyer.SCRIPT.finditer(html)
                         for node in json.loads(m[2]).get("@graph", [json.loads(m[2])])]
                faq = [node for node in nodes if node.get("@type") == "FAQPage"]
                self.assertEqual(len(faq), 1)
                self.assertEqual(faq[0]["mainEntity"], guide.visible_faq(html))

    def test_dates_entities_canonical_and_buyer_evidence(self):
        for name, html in self.pages.items():
            with self.subTest(page=name):
                document = guide.buyer.Document(html)
                canonicals = [node.attrs["href"] for node in document.root.find("link") if node.attrs.get("rel") == "canonical"]
                self.assertEqual(canonicals, ["https://sportenvo.com/" + name])
                self.assertEqual(len(list(document.root.find("h1"))), 1)
                self.assertIn('"dateModified":"2026-10-04"', html)
                self.assertIn('data-guide-evidence="20261004"', html)
                self.assertIn("October 4, 2026", html)
                self.assertNotIn("organizationanization", html)

    def test_cost_numbers_are_labeled_historical_regional_not_global_quotes(self):
        html = self.pages[guide.PAGES[0]]
        self.assertNotIn("US$", html)
        self.assertNotIn("reviewedBy", html)
        self.assertNotIn("Reviewed by:", html)
        self.assertIn("Historical UK example", html)
        self.assertIn("excluding VAT and fees", html)
        self.assertIn(LTA, html)
        for number in ("36,000", "128,000", "35,000", "140,000", "71,000", "268,000"):
            self.assertIn("GBP " + number, html)

    def test_wind_target_is_not_certification_or_direct_speed_comparison(self):
        html = self.pages[guide.PAGES[2]]
        self.assertNotIn("verified specifications", html)
        self.assertNotIn("uses verified", html)
        self.assertIn("not independent certification", html)
        self.assertIn("averaging period", html)
        self.assertIn("Support reactions and anchors", html)
        self.assertIn("https://www.asce.org/", html)

    def test_foundation_restriction_is_scoped_and_prefill_is_valid(self):
        html = self.pages[guide.PAGES[3]]
        self.assertIn('id="uk-permanent-outdoor"', html)
        self.assertIn("following the LTA 2025 specification", html)
        self.assertIn("above-ground foundations are excluded", html)
        self.assertIn("not global law", html)
        self.assertIn("not claimed to be LTA-approved", html)
        self.assertIn(LTA, html)
        self.assertIn("rfq_foundation=modular", html)
        self.assertNotIn("rfq_court=modular-foundation", html)

    def test_installation_release_points_and_documented_acceptance(self):
        html = self.pages[guide.PAGES[1]]
        self.assertIn("Before opening to players", html)
        self.assertIn("model-specific assembly manual", html)
        self.assertIn("as-built drawing revisions", html)
        self.assertIn("not a model-specific installation manual", html)


if __name__ == "__main__":
    unittest.main()
