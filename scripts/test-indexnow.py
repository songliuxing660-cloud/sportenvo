import ast
import hashlib
import re
import textwrap
import unittest
from html.parser import HTMLParser
from pathlib import Path


workflow = Path(__file__).resolve().parents[1] / ".github/workflows/indexnow.yml"
source = workflow.read_text(encoding="utf-8").split("python3 - <<'PY'\n", 1)[1].rsplit("\n          PY", 1)[0]
tree = ast.parse(textwrap.dedent(source))
definitions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in {"normalized", "FingerprintParser", "matches_revision"}]
scope = {"hashlib": hashlib, "re": re, "HTMLParser": HTMLParser}
exec(compile(ast.Module(body=definitions, type_ignores=[]), str(workflow), "exec"), scope)


class DeploymentFingerprintTests(unittest.TestCase):
    def setUp(self):
        self.original = '<html><head><title>SPORTENVO</title></head><body><a href="mailto:sales@sportenvo.com">sales@sportenvo.com</a></body></html>'
        self.hash = hashlib.sha256(self.original.encode("utf-8")).hexdigest()
        self.marked = self.original.replace('</head>', f'<meta name="sportenvo-content-sha256" content="{self.hash}">\n</head>')

    def matches(self, live, local=None):
        return scope["matches_revision"](live.encode("utf-8"), (local or self.marked).encode("utf-8"))

    def test_cloudflare_transformations_preserve_revision(self):
        transformed = self.marked.replace('href="mailto:sales@sportenvo.com"', 'href="/cdn-cgi/l/email-protection"').replace('</body>', '<script src="/cdn-cgi/email-decode.js"></script></body>')
        self.assertTrue(self.matches(transformed))

    def test_missing_stale_and_duplicate_markers_are_rejected(self):
        self.assertFalse(self.matches(self.original))
        self.assertFalse(self.matches(self.marked.replace(self.hash, '0' * 64)))
        self.assertFalse(self.matches(self.marked.replace('</head>', f'<meta name="sportenvo-content-sha256" content="{self.hash}"></head>')))

    def test_line_endings_and_local_integrity(self):
        self.assertTrue(self.matches(self.marked, '\ufeff' + self.marked.replace('\n', '\r\n')))
        self.assertFalse(self.matches(self.marked, self.marked.replace('SPORTENVO', 'Changed title')))


if __name__ == "__main__":
    unittest.main()
