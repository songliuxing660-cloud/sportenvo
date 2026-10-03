(() => {
  "use strict";
  const products = {
    panoramic: ["Panoramic Padel Court", "Panoramic Padel Court"],
    "super-panoramic": ["Super Panoramic Padel Court", "Super Panoramic Padel Court"],
    classic: ["Classic Padel Court", "Classic Padel Court"],
    mobile: ["Mobile Padel Court", "Portable / Mobile Padel Court"],
    "electric-tent": ["Padel Court with Electric Tent", ""],
    roof: ["Padel Court with Roof", "Padel Court with Roof / Cover"],
    "force-hx": ["Anti-Hurricane Padel Court \u2014 FORCE-HX Series", ""],
    "modular-foundation": ["Modular Foundation Base", ""]
  };
  const labels = {
    court: "Court preference", quantity: "Court quantity", location: "Project location",
    venue: "Venue", site: "Site condition", foundation: "Foundation",
    weather: "Weather protection", dimensions: "Site dimensions", stage: "Project stage",
    installation: "Installation plan", timeline: "Target timeline"
  };
  const key = "sportenvo_inquiry_context";
  const clean = value => typeof value === "string" ? value.trim().slice(0, 180) : "";
  const sanitize = state => Object.fromEntries(Object.keys(labels).map(field => [field, clean(state[field])]));
  function capture(state) {
    try { sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), state: sanitize(state) })); } catch (_) {}
  }
  const query = new URLSearchParams(window.location.search);
  const product = query.get("product");
  let state = {};
  // Only a deliberate configurator handoff can restore a recent project brief.
  if (query.get("source") === "start-project-configurator" && !product) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (saved && saved.state && Date.now() - saved.savedAt >= 0 && Date.now() - saved.savedAt < 30 * 60 * 1000) state = sanitize(saved.state);
    } catch (_) {}
  }
  if (Object.hasOwn(products, product)) state = { court: products[product][0] };
  const brief = Object.entries(labels).filter(([field]) => state[field])
    .map(([field, label]) => label + ": " + state[field]).join("\n");
  function prefill(url) {
    // These parameter names and dropdown choices were verified against the public Zoho form.
    if (brief) url.searchParams.set("MultiLine", brief);
    if (state.location) url.searchParams.set("SingleLine2", state.location);
    if (/^[1-9]\d{0,2}$/.test(state.quantity || "")) url.searchParams.set("Number", state.quantity);
    const match = Object.values(products).find(([title]) => title === state.court);
    if (match?.[1]) url.searchParams.set("Dropdown", match[1]);
    return url;
  }
  window.sportenvoInquiry = { capture, prefill, preference: Object.hasOwn(products, product) ? state.court : "" };
  const summary = document.querySelector("[data-inquiry-context]");
  if (summary && brief) {
    summary.hidden = false;
    summary.querySelector("[data-inquiry-summary]").textContent = brief;
  }
  const evidence = document.querySelector("[data-inquiry-evidence]");
  if (evidence) {
    const references = {
      roof: ["project-guatemala-covered-padel-court.html", "Guatemala covered court project"],
      mobile: ["project-harwich-uk-portable-padel-court.html", "Harwich portable court project"],
      "super-panoramic": ["project-moscow-indoor-padel-club.html", "Moscow indoor padel club project"],
      panoramic: ["project-dominican-republic-resort-padel-courts.html", "Dominican Republic resort project"]
    };
    const ref = references[product];
    if (ref) { evidence.href = ref[0]; evidence.textContent = ref[1]; }
  }
})();
