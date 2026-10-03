import copy
import json
import runpy
import unittest
from pathlib import Path


module = runpy.run_path(str(Path(__file__).with_name("sync-buyer-content.py")))
Document = module["Document"]
faq_entities = module["faq_entities"]
sync_page = module["sync_page"]


class BuyerContentTests(unittest.TestCase):
    def test_dimensions_two_court_area_is_not_a_total_site_requirement(self):
        root = Path(__file__).resolve().parents[1]
        document = Document((root / "padel-court-dimensions.html").read_text(encoding="utf-8"))
        section = next(node for node in document.root.find("section") if node.attrs.get("id") == "quick-reference")
        row = next(node for node in section.find("tr") if module["clean"](node.text()).startswith("2 courts"))
        cells = list(row.find("td"))
        self.assertIn("400 m", cells[1].text())
        self.assertIn(f"{round(400 / 0.3048 ** 2):,}", cells[1].text())
        self.assertIn("not the total site area", cells[2].text())
        links = {node.attrs.get("href") for node in section.find("a")}
        self.assertTrue({"mobile.html", "panoramic.html", "modular-foundation.html"}.issubset(links))

    def test_roof_comparison_keeps_project_specific_limits(self):
        root = Path(__file__).resolve().parents[1]
        document = Document((root / "roof.html").read_text(encoding="utf-8"))
        section = next(node for node in document.root.find("section") if node.attrs.get("id") == "roof-system-comparison")
        table = next(section.find("table"))
        headings = [module["clean"](node.text()) for node in next(table.find("thead")).find("th")]
        self.assertEqual(headings, ["Buyer checkpoint", "Fixed roof", "Aluminum-alloy retractable roof"])
        rows = list(next(table.find("tbody")).find("tr"))
        self.assertEqual(len(rows), 4)
        self.assertTrue(all(len(list(row.find("td"))) == 2 for row in rows))
        text = module["clean"](section.text())
        self.assertIn("final suitability is confirmed for the actual venue", text)
        self.assertIn("does not establish a universal wind rating", text)
        self.assertIn("foundation reactions", text)

    def test_visible_answers_keep_link_text_and_decode_entities(self):
        html = '<section class="geo-faq"><details><summary>Roof &amp; foundation?</summary><p>Read <a href="roof.html">the roof guide</a> before <strong>ordering</strong>.</p></details></section>'
        entity = faq_entities(Document(html))[0]
        self.assertEqual(entity["name"], "Roof & foundation?")
        self.assertEqual(entity["acceptedAnswer"]["text"], "Read the roof guide before ordering.")

    def test_navigation_details_are_not_buyer_questions(self):
        self.assertEqual(faq_entities(Document('<nav><details><summary>Courts</summary><p>Products</p></details></nav>')), [])

    def test_duplicate_visible_questions_are_rejected(self):
        item = '<details><summary>Does it need ground preparation?</summary><p>Yes.</p></details>'
        with self.assertRaises(ValueError):
            faq_entities(Document('<section class="geo-faq">' + item * 2 + '</section>'))

    def test_actual_priority_pages_are_in_sync_and_idempotent(self):
        root = Path(__file__).resolve().parents[1]
        brand = module["approved_brand"](root)
        for file in module["PAGES"]:
            with self.subTest(file=file):
                html = (root / file).read_bytes().decode("utf-8")
                self.assertEqual(sync_page(html, file, brand), html)
                nodes = [json.loads(match[2]) for match in module["SCRIPT"].finditer(html)]
                page = next(node for node in nodes if node.get("@type") in {"WebPage", "CollectionPage"})
                self.assertEqual(page["about"], brand)
                if file in module["PRODUCT_PAGES"]:
                    faq = next(node for node in nodes if node.get("@type") == "FAQPage")
                    self.assertEqual(faq["mainEntity"], faq_entities(Document(html)))
                    changed = copy.deepcopy(brand)
                    changed["name"] = "Different brand"
                    self.assertNotEqual(sync_page(html, file, changed), html)


if __name__ == "__main__":
    unittest.main()
