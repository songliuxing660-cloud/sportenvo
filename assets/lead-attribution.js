(() => {
  "use strict";
  if (window.sportenvoAttribution) return;
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const storageKey = "sportenvo_visit_attribution";
  const lifetime = 30 * 60 * 1000;
  const now = Date.now();
  const query = new URLSearchParams(window.location.search);
  let context = {};
  try { context = JSON.parse(sessionStorage.getItem(storageKey) || "{}"); } catch {}
  const freshCampaign = keys.some((key) => query.has(key));
  if (!context.updatedAt || now - context.updatedAt >= lifetime || freshCampaign) {
    try {
      for (const key of ["started_at", "source_page", "source_title", "source_cta"]) localStorage.removeItem(`sportenvo_lead_${key}`);
    } catch {}
    let referrerHost = "";
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin !== window.location.origin) referrerHost = referrer.hostname;
    } catch {}
    let referrerSource = "";
    for (const [source, hosts] of Object.entries({
      chatgpt: ["chatgpt.com", "chat.openai.com"],
      perplexity: ["perplexity.ai"],
      copilot: ["copilot.microsoft.com"],
      gemini: ["gemini.google.com"],
      claude: ["claude.ai"]
    })) {
      if (hosts.some((host) => referrerHost === host || referrerHost.endsWith(`.${host}`))) referrerSource = source;
    }
    context = {
      lead_landing_page: window.location.pathname,
      lead_referrer_host: referrerHost,
      lead_referrer_source: referrerSource
    };
    for (const key of keys) context[key] = (query.get(key) || "").trim().slice(0, 140);
  }
  const source = query.get("source");
  if (source) context.lead_source_tag = source.trim().slice(0, 100);
  context.updatedAt = now;
  try { sessionStorage.setItem(storageKey, JSON.stringify(context)); } catch {}
  // Keep the existing Zoho integration in sync, clearing fields from older visits.
  try {
    for (const key of keys) localStorage.setItem(`sportenvo_lead_${key}`, context[key] || "");
    localStorage.setItem("sportenvo_lead_source_tag", context.lead_source_tag || "");
  } catch {}

  function getContext() {
    const { updatedAt, ...parameters } = context;
    return { ...parameters };
  }

  function rememberLeadIntent(ctaText = "", preserveExisting = false) {
    try {
      const started = Number(localStorage.getItem("sportenvo_lead_started_at"));
      const recent = started > 0 && Date.now() - started < 2 * 60 * 60 * 1000;
      if (preserveExisting && recent && localStorage.getItem("sportenvo_lead_source_page")) return;
      localStorage.setItem("sportenvo_lead_started_at", String(Date.now()));
      localStorage.setItem("sportenvo_lead_source_page", window.location.pathname);
      localStorage.setItem("sportenvo_lead_source_title", document.title);
      localStorage.setItem("sportenvo_lead_source_cta", String(ctaText).slice(0, 120));
    } catch {}
  }

  window.sportenvoAttribution = { getContext, rememberLeadIntent };
})();
