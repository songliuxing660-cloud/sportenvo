import argparse
import importlib.util
import json
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location("buyer_content", Path(__file__).with_name("sync-buyer-content.py"))
buyer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(buyer)
PAGES = (
    "how-much-does-a-padel-court-cost.html",
    "padel-court-installation-guide.html",
    "high-wind-padel-court-guide.html",
    "modular-foundation-guide.html",
)


def visible_faq(html):
    document = buyer.Document(html)
    containers = list(document.root.find(css_class="faq-list")) + list(document.root.find(css_class="faq-grid"))
    if len(containers) != 1:
        raise ValueError("Guide must have one visible FAQ container")
    entities = []
    for child in containers[0].children:
        if not isinstance(child, buyer.Element):
            continue
        headings, paragraphs = list(child.find("h3")), list(child.find("p"))
        if not headings:
            continue
        if len(headings) != 1 or not paragraphs:
            raise ValueError("FAQ requires one question and an answer")
        entities.append({"@type": "Question", "name": buyer.clean(headings[0].text()),
                         "acceptedAnswer": {"@type": "Answer", "text": buyer.clean(" ".join(p.text() for p in paragraphs))}})
    if not entities or len({item["name"] for item in entities}) != len(entities):
        raise ValueError("FAQ must be nonempty and unique")
    return entities


def synchronize(html, modified=None):
    if modified:
        date.fromisoformat(modified)
    entities = visible_faq(html)
    faq_count = 0

    def update(match):
        nonlocal faq_count
        data = json.loads(match[2])
        original = json.dumps(data, ensure_ascii=False)
        for node in data.get("@graph", [data]):
            if node.get("@type") == "FAQPage":
                node["mainEntity"] = entities
                faq_count += 1
            if node.get("@type") in {"WebPage", "Article", "TechArticle"}:
                if modified:
                    node["dateModified"] = modified
                if node.get("publisher", {}).get("@id") == "https://sportenvo.com/#organizationanization":
                    node["publisher"]["@id"] = "https://sportenvo.com/#organization"
                if node.get("url", node.get("@id", "")).startswith("https://sportenvo.com/how-much-does-a-padel-court-cost.html"):
                    node.pop("reviewedBy", None)
                    node["author"] = {"@id": "https://sportenvo.com/#organization"}
        if json.dumps(data, ensure_ascii=False) == original:
            return match[0]
        return match[1] + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + match[3]

    result = buyer.SCRIPT.sub(update, html)
    if faq_count != 1:
        raise ValueError("Guide must have exactly one FAQPage schema")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--modified", help="Actual content edit date, YYYY-MM-DD")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    changed = []
    for name in PAGES:
        file = root / name
        html = file.read_bytes().decode("utf-8")
        updated = synchronize(html, args.modified)
        if updated != html:
            changed.append(name)
            if args.write:
                file.write_bytes(updated.encode("utf-8"))
    print(json.dumps({"changed": changed, "written": args.write}))
    if changed and not args.write:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
