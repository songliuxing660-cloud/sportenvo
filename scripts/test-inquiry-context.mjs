import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const script = readFileSync(new URL("../assets/inquiry-context.js", import.meta.url), "utf8");
function visit(query = "", session = new Map()) {
  const window = { location: new URL("https://sportenvo.com/index.html" + query) };
  const sandbox = { window, document: { querySelector: () => null }, URL, URLSearchParams, Date,
    sessionStorage: { getItem: k => session.get(k), setItem: (k, v) => session.set(k, v) } };
  vm.runInNewContext(script, sandbox);
  return { api: window.sportenvoInquiry, session, url: () => window.sportenvoInquiry.prefill(new URL("https://forms.zohopublic.com/form")) };
}
test("eight explicit product choices match verified public Zoho options", () => {
  for (const [slug, dropdown] of Object.entries({ panoramic: "Panoramic Padel Court", "super-panoramic": "Super Panoramic Padel Court", classic: "Classic Padel Court", mobile: "Portable / Mobile Padel Court", roof: "Padel Court with Roof / Cover", "electric-tent": "Padel Court with Electric Tent", "force-hx": "Anti-Hurricane Padel Court \u2014 FORCE-HX Series", "modular-foundation": "Modular Foundation Base" })) {
    const page = visit("?product=" + slug);
    assert.ok(page.url().searchParams.get("MultiLine").includes(page.api.preference));
    assert.equal(page.url().searchParams.get("Dropdown"), dropdown);
  }
});
test("an undecided configurator buyer keeps the verified recommendation option", () => {
  const config = visit();
  config.api.capture({ court: "Not Sure \u2014 Recommend a Solution" });
  const home = visit("?source=start-project-configurator", config.session);
  assert.equal(home.url().searchParams.get("Dropdown"), "Not Sure \u2014 Recommend a Solution");
});
test("explicit handoff preserves current project details but no arbitrary personal fields", () => {
  const config = visit();
  config.api.capture({ court: "Mobile Padel Court", quantity: "2", location: "Madrid, Spain", foundation: "Modular Foundation", email: "private@example.com" });
  const home = visit("?source=start-project-configurator", config.session);
  assert.equal(home.url().searchParams.get("Number"), "2");
  assert.equal(home.url().searchParams.get("SingleLine2"), "Madrid, Spain");
  assert.match(home.url().searchParams.get("MultiLine"), /Foundation: Modular Foundation/);
  assert.ok(!home.url().href.includes("private"));
  assert.equal(home.url().searchParams.get("SingleLine1"), null, "do not guess country from free-form location");
});
test("direct quote never inherits another project's location and quantity", () => {
  const config = visit(); config.api.capture({ quantity: "2", location: "Old Site", court: "Mobile Padel Court" });
  assert.equal(visit("?product=roof", config.session).url().searchParams.get("SingleLine2"), null);
  assert.equal(visit("", config.session).url().searchParams.get("MultiLine"), null);
});
test("quantity ranges remain text and are not silently rounded", () => {
  const config = visit(); config.api.capture({ quantity: "10+" });
  const url = visit("?source=start-project-configurator", config.session).url();
  assert.equal(url.searchParams.get("Number"), null);
  assert.match(url.searchParams.get("MultiLine"), /10\+/);
});
test("invalid, expired and future contexts fail closed", () => {
  assert.equal(visit("?product=__proto__&email=private@example.com").url().searchParams.get("MultiLine"), null);
  for (const value of ["{", JSON.stringify({ savedAt: Date.now() - 1800001, state: { location: "Old Site" } }), JSON.stringify({ savedAt: Date.now() + 60000, state: { location: "Future Site" } })]) {
    const session = new Map([["sportenvo_inquiry_context", value]]);
    assert.equal(visit("?source=start-project-configurator", session).url().searchParams.get("MultiLine"), null);
  }
});
test("all product primary quote links target the form with their product", () => {
  for (const [file, slug] of Object.entries({ "panoramic.html": "panoramic", "super-panoramic.html": "super-panoramic", "classic-padel-court.html": "classic", "mobile.html": "mobile", "electric-tent-padel-court.html": "electric-tent", "roof.html": "roof", "force-hx.html": "force-hx", "modular-foundation.html": "modular-foundation" })) {
    const html = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    const links = [...html.matchAll(/<a class="(?:header-cta|button button-accent)" href="([^"]+)"[^>]*>Get Project Quote/g)];
    assert.ok(links.length >= 3, file);
    for (const [, href] of links) {
      const url = new URL(href.replaceAll("&amp;", "&"), "https://sportenvo.com");
      assert.equal(url.pathname, "/index.html"); assert.equal(url.hash, "#formal-project-inquiry"); assert.equal(url.searchParams.get("product"), slug);
    }
  }
});
