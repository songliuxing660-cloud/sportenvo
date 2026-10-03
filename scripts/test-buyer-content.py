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
