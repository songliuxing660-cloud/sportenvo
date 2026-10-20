import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const script = readFileSync(new URL("../assets/inquiry-context.js", import.meta.url), "utf8");
test("deliberate configurator links reveal the optional tool on entry and hash navigation", () => {
  const disclosure = { open: false };
  const listeners = {};
  const window = { location: new URL("https://sportenvo.com/start-project.html#projectConfiguratorTitle"), addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(script, { window, document: { querySelector: selector => selector === "[data-configurator-disclosure]" ? disclosure : null }, URL, URLSearchParams, Date, sessionStorage: { getItem: () => null } });
  assert.equal(disclosure.open, true);
  disclosure.open = false;
  window.location.hash = "#formal-project-inquiry"; listeners.hashchange(); assert.equal(disclosure.open, false);
  window.location.hash = "#projectConfiguratorTitle"; listeners.hashchange(); assert.equal(disclosure.open, true);
});
function visit(query = "", session = new Map()) {
  const window = { location: new URL("https://sportenvo.com/" + query) };
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
      assert.equal(url.pathname, "/start-project.html"); assert.equal(url.hash, "#formal-project-inquiry"); assert.equal(url.searchParams.get("product"), slug);
    }
  }
});

test("Panoramic and Mobile decision paths keep their source; relocation also selects Mobile in both languages", () => {
  for (const locale of ["", "es/"]) {
    for (const product of ["panoramic", "mobile"]) {
      const html = readFileSync(new URL("../" + locale + product + ".html", import.meta.url), "utf8");
      const decision = "start-project.html?source=" + product + "-planning-guide#projectConfiguratorTitle";
      assert.ok(html.includes('href="' + decision + '"'), locale + product + ": missing decision source");
      const decisionUrl = new URL(decision, "https://sportenvo.com/" + locale + product + ".html");
      assert.equal(decisionUrl.searchParams.get("source"), product + "-planning-guide");
      assert.equal(decisionUrl.searchParams.get("product"), null, "undecided buyers must stay free to choose");
    }
    const mobileHtml = readFileSync(new URL("../" + locale + "mobile.html", import.meta.url), "utf8");
    const relocation = [...mobileHtml.matchAll(/href="([^"]*source=mobile-relocation-planning[^"]*)"/g)];
    assert.equal(relocation.length, 1, locale + "mobile: exactly one relocation CTA");
    const destination = new URL(relocation[0][1].replaceAll("&amp;", "&"), "https://sportenvo.com/" + locale + "mobile.html");
    assert.equal(destination.pathname, "/" + locale + "start-project.html");
    assert.equal(destination.hash, "#projectConfiguratorTitle");
    assert.equal(destination.searchParams.get("source"), "mobile-relocation-planning");
    assert.equal(destination.searchParams.get("product"), "mobile");
    const prefilling = visit(destination.search);
    assert.equal(prefilling.url().searchParams.get("Dropdown"), "Portable / Mobile Padel Court");
    assert.match(prefilling.url().searchParams.get("MultiLine"), /Mobile Padel Court/);
  }
});

test("floating product quote follows the primary form route and retains product context", () => {
  const source = readFileSync(new URL("../assets/site-v2.js", import.meta.url), "utf8");
  const setup = source.slice(source.indexOf("const quoteProducts ="), source.indexOf("contactActions.append"));
  for (const [pathname, href, expectedPath, product] of [
    ["/roof.html", "start-project.html?source=roof-product&product=roof#formal-project-inquiry", "/start-project.html", "roof"],
    ["/modular-foundation.html", "start-project.html?source=foundation-product&product=modular-foundation#formal-project-inquiry", "/start-project.html", "modular-foundation"],
    ["/panoramic.html", "/start-project.html?source=panoramic-product&product=panoramic#formal-project-inquiry", "/start-project.html", "panoramic"],
    ["/es/panoramic.html", "/start-project.html?source=panoramic-product&product=panoramic#formal-project-inquiry", "/start-project.html", "panoramic"],
    ["/roof.html", null, "/start-project.html", "roof"]
  ]) {
    const quoteLink = {};
    vm.runInNewContext(setup, { quoteLink, URL, SV_T: en => en, window: { location: { href: "https://sportenvo.com" + pathname, pathname } }, document: { querySelector: () => href ? {getAttribute: () => href} : null } });
    const destination = new URL(quoteLink.href, "https://sportenvo.com" + pathname);
    assert.equal(destination.pathname, expectedPath);
    assert.equal(destination.hash, "#formal-project-inquiry");
    assert.equal(destination.searchParams.get("product"), product);
    assert.equal(destination.searchParams.get("source"), "floating-product-cta");
  }
});
