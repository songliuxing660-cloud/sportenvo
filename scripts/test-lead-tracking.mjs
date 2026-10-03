import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const attributionScript = readFileSync(new URL("../assets/lead-attribution.js", import.meta.url), "utf8");
const conversionScript = readFileSync(new URL("../assets/sportenvo-conversion-v7.js", import.meta.url), "utf8");
const homeScript = readFileSync(new URL("../index.html", import.meta.url), "utf8")
  .match(/<script id="home-zoho-lazy-loader">([\s\S]*?)<\/script>/)[1];

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

function visit(url, local = storage(), session = storage(), referrer = "") {
  const events = [];
  const listeners = new Map();
  const location = new URL(url);
  const window = {
    location,
    gtag: (...args) => events.push(args),
    addEventListener: (name, callback) => {
      const callbacks = listeners.get(name) || [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    setTimeout: () => 1
  };
  const document = { referrer, title: "SPORTENVO Test", addEventListener() {}, getElementById: () => null, querySelector: () => null };
  const sandbox = vm.createContext({ window, document, location, localStorage: local, sessionStorage: session, URL, URLSearchParams, Date, console, clearTimeout() {}, CustomEvent: class {} });
  vm.runInContext(attributionScript, sandbox);
  return { window, document, sandbox, local, session, events, listeners, run: (script) => vm.runInContext(script, sandbox) };
}

test("campaign survives guide, configurator and homepage form navigation", () => {
  const landing = visit("https://sportenvo.com/roof.html?utm_source=youtube&utm_medium=video&utm_campaign=roof&utm_content=demo");
  landing.window.sportenvoAttribution.rememberLeadIntent("Review roof scope");
  const enquiry = visit("https://sportenvo.com/start-project.html?source=roof-guide", landing.local, landing.session);
  enquiry.window.sportenvoAttribution.rememberLeadIntent("", true);
  const home = visit("https://sportenvo.com/?source=start-project-direct#formal-project-inquiry", landing.local, landing.session);
  const ctx = home.window.sportenvoAttribution.getContext();
  assert.equal(ctx.utm_source, "youtube");
  assert.equal(ctx.utm_medium, "video");
  assert.equal(ctx.utm_content, "demo");
  assert.equal(ctx.lead_landing_page, "/roof.html");
  assert.equal(home.local.getItem("sportenvo_lead_source_page"), "/roof.html");
  assert.equal(home.local.getItem("sportenvo_lead_utm_source"), "youtube");
});

test("a new campaign clears missing values from the old campaign", () => {
  const first = visit("https://sportenvo.com/?utm_source=youtube&utm_medium=video&utm_campaign=roof");
  const second = visit("https://sportenvo.com/roof.html?utm_source=medium", first.local, first.session);
  assert.equal(second.window.sportenvoAttribution.getContext().utm_source, "medium");
  assert.equal(second.window.sportenvoAttribution.getContext().utm_campaign, "");
  assert.equal(second.local.getItem("sportenvo_lead_utm_medium"), "");
});

test("AI referrals use exact host boundaries and do not impersonate UTM campaigns", () => {
  const ai = visit("https://sportenvo.com/roof.html", undefined, undefined, "https://www.perplexity.ai/search/example");
  assert.equal(ai.window.sportenvoAttribution.getContext().lead_referrer_source, "perplexity");
  assert.equal(ai.window.sportenvoAttribution.getContext().utm_source, "");
  const other = visit("https://sportenvo.com/roof.html", undefined, undefined, "https://fakeperplexity.ai/search/example");
  assert.equal(other.window.sportenvoAttribution.getContext().lead_referrer_source, "");
});

test("fresh sessions clear old contact intent and do not store arbitrary landing query fields", () => {
  const local = storage();
  local.setItem("sportenvo_lead_source_page", "/old.html");
  local.setItem("sportenvo_lead_started_at", String(Date.now()));
  const current = visit("https://sportenvo.com/roof.html?email=test@example.com&utm_source=medium", local);
  assert.equal(local.getItem("sportenvo_lead_started_at"), null);
  current.window.sportenvoAttribution.rememberLeadIntent("Roof");
  assert.equal(local.getItem("sportenvo_lead_source_page"), "/roof.html");
  assert.ok(!JSON.stringify(current.window.sportenvoAttribution.getContext()).includes("test@example.com"));
});

test("blocked browser storage does not break attribution or CTA handlers", () => {
  const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  const current = visit("https://sportenvo.com/?utm_source=youtube", denied, denied);
  assert.equal(current.window.sportenvoAttribution.getContext().utm_source, "youtube");
  assert.doesNotThrow(() => current.window.sportenvoAttribution.rememberLeadIntent("Quote"));
});

test("submitted query parameter alone never becomes a confirmed lead", () => {
  const current = visit("https://sportenvo.com/thank-you.html?submitted=1");
  current.local.setItem("sportenvo_lead_started_at", String(Date.now()));
  current.run(conversionScript);
  assert.equal(current.events.filter((event) => event[1] === "generate_lead").length, 0);
  assert.equal(current.events.find((event) => event[1] === "thank_you_view")[2].conversion_confirmed, false);
});

test("homepage submission deduplicates repeated callbacks and the following thank-you visit", () => {
  const current = visit("https://sportenvo.com/?utm_source=youtube&utm_campaign=roof");
  const loading = { style: {}, textContent: "" };
  const fallback = { classList: { add() {}, remove() {} } };
  const shell = { querySelector: (selector) => selector.includes("loading") ? loading : fallback };
  let frame;
  const mount = { appendChild: (element) => { frame = element; } };
  current.document.querySelector = () => shell;
  current.document.getElementById = () => mount;
  current.document.createElement = () => ({ style: {}, contentWindow: {}, setAttribute() {}, addEventListener() {} });
  current.sandbox.IntersectionObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ isIntersecting: true }]); } disconnect() {} };
  current.window.IntersectionObserver = current.sandbox.IntersectionObserver;
  current.run(homeScript);
  assert.equal(new URL(frame.src).searchParams.get("utm_source"), "youtube");
  const callback = current.listeners.get("message")[0];
  callback({ origin: "https://unrelated.example", source: frame.contentWindow, data: "zf_submitform" });
  assert.equal(current.events.filter((event) => event[1] === "generate_lead").length, 0);
  callback({ origin: "https://forms.zohopublic.com", source: {}, data: "zf_submitform" });
  assert.equal(current.events.filter((event) => event[1] === "generate_lead").length, 0);
  const confirmed = { origin: "https://forms.zohopublic.com", source: frame.contentWindow, data: "zf_submitform" };
  callback(confirmed);
  callback(confirmed);
  callback({ ...confirmed, data: { event_name: "zf_submitform" } });
  const conversions = current.events.filter((event) => event[1] === "generate_lead");
  assert.equal(conversions.length, 1);
  assert.equal(conversions[0][2].utm_source, "youtube");
  const thanks = visit("https://sportenvo.com/thank-you.html?submitted=1", current.local, current.session);
  thanks.run(conversionScript);
  assert.equal(thanks.events.filter((event) => event[1] === "generate_lead").length, 0);
});

test("unmatched Zoho messages cannot confirm an enquiry without its embedded frame", () => {
  const current = visit("https://sportenvo.com/start-project.html");
  current.run(conversionScript);
  current.listeners.get("message")[0]({ origin: "https://forms.zohopublic.com", source: {}, data: "zf_submitform" });
  assert.equal(current.session.getItem("sportenvo_form_submit_confirmed"), null);
});
