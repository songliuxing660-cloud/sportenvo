import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../assets/inquiry-funnel.js", import.meta.url), "utf8");
function visit() {
  const events = [], handlers = {}, timers = new Map(), observers = [];
  let nextTimer = 0;
  const frameHandlers = {};
  const frame = { contentWindow: {}, addEventListener: (name, fn) => { frameHandlers[name] = fn; } };
  const loading = { style: {} };
  const shell = { state: "", querySelector: () => loading, setAttribute(name, value) { this.state = value; } };
  const mount = { querySelector: () => frame, closest: () => shell };
  const document = { documentElement: { lang: "en" }, getElementById: () => mount, activeElement: null, addEventListener: (name, fn) => { handlers["document:" + name] = fn; } };
  const window = { sportenvoTrafficAudience: "test", gtag: (...args) => events.push(args), addEventListener: (name, fn) => { handlers[name] = fn; }, setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id), IntersectionObserver: true };
  const sandbox = vm.createContext({ window, document, location: new URL("https://sportenvo.com/start-project.html?email=private@example.com"), URL, Set, Number,
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() {} }
  });
  vm.runInContext(source, sandbox);
  return { events, handlers, timers, frame, frameHandlers, loading, shell, document, observers, run: () => vm.runInContext(source, sandbox), count: name => events.filter(e => e[1] === name).length };
}
const formId = "XD-pakvMRutFV5VW272mlo86-BampgzRVraMENChmNI";
test("loaded and verified ready are separate; repeated height changes count once", () => {
  const v = visit();
  v.frameHandlers.load();
  assert.equal(v.count("inquiry_form_loaded"), 1);
  assert.equal(v.count("inquiry_form_ready"), 0);
  for (const height of [900, 1100, 1300]) v.handlers.message({ source: v.frame.contentWindow, origin: "https://forms.zohopublic.com", data: formId + "|" + height });
  assert.equal(v.count("inquiry_form_ready"), 1);
  assert.equal(v.shell.state, "ready");
  assert.equal(v.timers.size, 0);
  assert.ok(!JSON.stringify(v.events).includes("private@example.com"));
  assert.ok(v.events.every(e => e[2].traffic_audience === "test" && e[2].form_location === "project"));
});
test("untrusted or malformed messages cannot hide a slow form warning", () => {
  const v = visit();
  for (const message of [
    { source: {}, origin: "https://forms.zohopublic.com", data: formId + "|900" },
    { source: v.frame.contentWindow, origin: "https://forms.zohopublic.com.fake.test", data: formId + "|900" },
    { source: v.frame.contentWindow, origin: "https://forms.zohopublic.com", data: "wrong-form|900" },
    { source: v.frame.contentWindow, origin: "https://forms.zohopublic.com", data: formId + "|-1" }
  ]) v.handlers.message(message);
  assert.equal(v.count("inquiry_form_ready"), 0);
  [...v.timers.values()].find(t => t.delay === 12000).fn();
  assert.equal(v.count("inquiry_form_load_slow"), 1);
  assert.equal(v.shell.state, "slow");
  assert.match(v.loading.textContent, /Open it directly/);
  assert.equal(v.events.some(e => ["generate_lead", "project_form_submit"].includes(e[1])), false);
});
test("visible, engaged and contact clicks do not become leads or transmit entered messages", () => {
  const v = visit();
  v.observers[0].fn([{ isIntersecting: true, intersectionRatio: 0.001 }]);
  assert.equal(v.count("inquiry_form_visible"), 0);
  v.observers[0].fn([{ isIntersecting: true, intersectionRatio: 0.1 }]);
  v.observers[0].fn([{ isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.equal(v.count("inquiry_form_visible"), 1);
  v.handlers.blur();
  [...v.timers.values()].filter(t => t.delay === 0).at(-1).fn();
  assert.equal(v.count("inquiry_form_engaged"), 0);
  v.document.activeElement = v.frame;
  v.handlers.blur();
  [...v.timers.values()].filter(t => t.delay === 0).at(-1).fn();
  assert.equal(v.count("inquiry_form_engaged"), 1);
  v.handlers["document:click"]({ target: { closest: () => ({ href: "https://wa.me/8613128265916?text=private-project-details" }) } });
  assert.equal(v.count("inquiry_contact_whatsapp_click"), 1);
  assert.ok(!JSON.stringify(v.events).includes("private-project-details"));
  assert.equal(v.events.some(e => ["generate_lead", "project_form_submit"].includes(e[1])), false);
  v.run();
  assert.equal(v.count("inquiry_form_requested"), 1);
});


test("English and Spanish inquiry pages only mark verified Zoho resize as ready", () => {
  for (const locale of ["", "es/"]) {
    const page = readFileSync(new URL("../" + locale + "start-project.html", import.meta.url), "utf8");
    const start = page.match(/<script id="start-project-zoho-loader">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(start, locale + "missing Zoho loader");
    assert.doesNotMatch(start, /frame\.addEventListener\('load',function\(\)\{[\s\S]*?sportenvo:form-ready/);
    assert.match(start, /event\.source!==frame\.contentWindow/);
    assert.match(start, /event\.origin!=='https:\/\/forms\.zohopublic\.com'/);
    assert.match(start, /if\(!verifiedReady\)/);
    assert.match(start, /sportenvo:form-ready/);

    const home = readFileSync(new URL("../" + locale + "index.html", import.meta.url), "utf8");
    const homeLoader = home.match(/<script id="home-zoho-lazy-loader">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(homeLoader, locale + "missing homepage Zoho loader");
    assert.doesNotMatch(homeLoader, /frame\.addEventListener\('load',function\(\)\{[\s\S]*?project_form_view/);
    assert.match(homeLoader, /if\(!ready\)\{\s*ready=true;\s*send\('project_form_embed_ready'\)/);
    assert.match(homeLoader, /event\.source!==frame\.contentWindow/);
    assert.match(homeLoader, /event\.origin!=='https:\/\/forms\.zohopublic\.com'/);
    assert.match(page, locale ? /Solo son obligatorios el nombre/ : /Only your name, email/);
    assert.match(home, locale ? /Solo son obligatorios el nombre/ : /Only name, email/);
  }
});
