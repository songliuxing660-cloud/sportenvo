import argparse
import copy
import json
import re
from html.parser import HTMLParser
from pathlib import Path


PRODUCT_PAGES = (
    "super-panoramic.html", "roof.html", "force-hx.html",
    "modular-foundation.html", "mobile.html",
)
PAGES = PRODUCT_PAGES + ("projects.html",)
SCRIPT = re.compile(r'(<script\b[^>]*type=["\']application/ld\+json["\'][^>]*>)([\s\S]*?)(</script>)', re.I)
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Element:
    def __init__(self, tag, attrs=()):
        self.tag = tag
        self.attrs = dict(attrs)
        self.children = []

    def find(self, tag=None, css_class=None):
        for child in self.children:
            if not isinstance(child, Element):
                continue
            if (tag is None or child.tag == tag) and (css_class is None or css_class in child.attrs.get("class", "").split()):
                yield child
            yield from child.find(tag, css_class)

    def text(self):
        return "".join((child.text() if isinstance(child, Element) else child) for child in self.children)


class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Element(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def clean(text):
    return " ".join(text.split())


def faq_entities(document):
    entities = []
    seen = set()
    for section in document.root.find("section", "geo-faq"):
        for detail in section.find("details"):
            summaries = list(detail.find("summary"))
            answers = list(detail.find("p"))
            if len(summaries) != 1 or not answers:
                raise ValueError("FAQ requires one visible summary and a paragraph answer")
            question = clean(summaries[0].text())
            answer = clean(" ".join(item.text() for item in answers))
            if not question or not answer or question in seen:
                raise ValueError("FAQ questions and answers must be nonempty and unique")
            seen.add(question)
            entities.append({"@type": "Question", "name": question, "acceptedAnswer": {"@type": "Answer", "text": answer}})
    return entities


def approved_brand(root):
    for match in SCRIPT.finditer((root / "index.html").read_text(encoding="utf-8")):
        data = json.loads(match[2])
        for node in data.get("@graph", [data]):
            if node.get("@type") == "Brand" and node.get("@id") == "https://sportenvo.com/#brand":
                return node
    raise ValueError("Missing approved homepage brand")


def sync_page(html, file, brand):
    document = Document(html)
    entities = faq_entities(document) if file in PRODUCT_PAGES else None
    if entities is not None and len(entities) < 4:
        raise ValueError(f"{file}: visible buyer FAQ is missing")
    title = clean(next(document.root.find("title")).text())
    description = next(node.attrs["content"] for node in document.root.find("meta") if node.attrs.get("name") == "description")
    url = f"https://sportenvo.com/{file}"
    pages_seen = 0
    faqs_seen = 0

    def replace(match):
        nonlocal pages_seen, faqs_seen
        data = json.loads(match[2])
        original = copy.deepcopy(data)
        nodes = data.get("@graph", [data])
        for node in nodes:
            if node.get("@type") in {"WebPage", "CollectionPage"}:
                pages_seen += 1
                node["@id"] = url + "#webpage"
                node["name"] = title
                node["description"] = description
                node["about"] = copy.deepcopy(brand)
                node["isPartOf"] = {"@id": "https://sportenvo.com/#website"}
            if node.get("@type") == "FAQPage" and entities is not None:
                faqs_seen += 1
                node["@id"] = url + "#faq"
                node["isPartOf"] = {"@id": url + "#webpage"}
                node["mainEntity"] = entities
        if original == data:
            return match[0]
        serialized = json.dumps(data, ensure_ascii=True, separators=(",", ":")).replace("<", "\\u003c")
        return match[1] + serialized + match[3]

    updated = SCRIPT.sub(replace, html)
    if pages_seen != 1 or (entities is not None and faqs_seen != 1):
        raise ValueError(f"{file}: expected one page node and one product FAQ node")
    return updated


def main():
    parser = argparse.ArgumentParser(description="Keep priority-page entity and FAQ markup consistent with visible content.")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    brand = approved_brand(root)
    changed = []
    for file in PAGES:
        path = root / file
        html = path.read_bytes().decode("utf-8")
        updated = sync_page(html, file, brand)
        if updated != html:
            changed.append(file)
            if args.write:
                path.write_bytes(updated.encode("utf-8"))
    print(json.dumps({"priorityPages": len(PAGES), "pendingChanges": changed, "mode": "write" if args.write else "check"}))
    return 0 if args.write or not changed else 1


if __name__ == "__main__":
    raise SystemExit(main())
