import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync, readdirSync } from "node:fs";
const source = readFileSync(new URL("../assets/traffic-context.js", import.meta.url), "utf8");
const attribution = readFileSync(new URL("../assets/lead-attribution.js", import.meta.url), "utf8");
function visit(url, store = new Map(), referrer = "", denied = false) {
  const window = { location: new URL(url) };
  const storage = { getItem: k => { if (denied) throw Error("blocked"); return store.get(k) ?? null; }, setItem: (k, v) => { if (denied) throw Error("blocked"); store.set(k, v); }, removeItem: k => store.delete(k) };
  const sandbox = vm.createContext({ window, document: { referrer, title: "Court" }, sessionStorage: storage, localStorage: storage, URL, URLSearchParams, Date });
  vm.runInContext(source, sandbox); vm.runInContext(attribution, sandbox);
  return { window, store };
}
test("QA attribution survives a commercial page, case and direct inquiry navigation", () => {
  const a = visit("https://sportenvo.com/roof.html?utm_source=qa&utm_medium=codex");
  const b = visit("https://sportenvo.com/project-guatemala-covered-padel-court.html", a.store);
  const c = visit("https://sportenvo.com/start-project.html?source=guatemala-case-bottom&product=roof#formal-project-inquiry", b.store);
  assert.equal(c.window.sportenvoTrafficAudience, "test");
  assert.equal(c.window.sportenvoAttribution.getContext().traffic_audience, "test");
  assert.equal(c.window.sportenvoAttribution.getContext().utm_source, "qa");
  assert.equal(c.window.sportenvoAttribution.getContext().lead_source_tag, "guatemala-case-bottom");
  assert.equal(c.window.dataLayer[0][0], "set");
  assert.equal(c.window.dataLayer[0][1].traffic_audience, "test");
});
test("a fresh real campaign clears the previous QA label and campaign", () => {
  const a = visit("https://sportenvo.com/?utm_source=qa&utm_medium=codex");
  const b = visit("https://sportenvo.com/roof.html?utm_source=google&utm_medium=cpc", a.store);
  assert.equal(b.window.sportenvoTrafficAudience, "external");
  assert.equal(b.window.sportenvoAttribution.getContext().utm_source, "google");
});
test("expired, future and malformed labels do not misclassify visitors", () => {
  for (const value of ["{", JSON.stringify({ audience: "test", updatedAt: Date.now() - 1800001 }), JSON.stringify({ audience: "test", updatedAt: Date.now() + 60000 })]) {
    assert.equal(visit("https://sportenvo.com/", new Map([["sportenvo_traffic_audience", value]])).window.sportenvoTrafficAudience, "external");
  }
});
test("only exact local development hosts and their referrals are test traffic", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) assert.equal(visit(`http://${host}:4187/roof.html`).window.sportenvoTrafficAudience, "test");
  assert.equal(visit("https://sportenvo.com/", new Map(), "http://127.0.0.1:4187/").window.sportenvoTrafficAudience, "test");
  assert.equal(visit("https://sportenvo.com/", new Map(), "https://localhost.example.com/").window.sportenvoTrafficAudience, "external");
});
test("blocked storage still labels the current QA page and does not send personal data", () => {
  const a = visit("https://sportenvo.com/?utm_source=qa&email=private@example.com", new Map(), "", true);
  assert.equal(a.window.sportenvoTrafficAudience, "test");
  assert.equal(JSON.stringify(a.window.dataLayer).includes("private@example.com"), false);
});
test("every root tracked page labels page views before the original Google tag runs", () => {
  const root = new URL("../", import.meta.url);
  for (const file of readdirSync(root).filter(f => f.endsWith(".html"))) {
    const html = readFileSync(new URL(file, root), "utf8");
    if (!html.includes("G-2R150CJB3Z")) continue;
    const positions = [...html.matchAll(/src="\/assets\/traffic-context\.js\?v=20261009"/g)];
    assert.equal(positions.length, 1, file);
    assert.ok(positions[0].index < html.search(/gtag\(["']config["']/), file);
  }
});
