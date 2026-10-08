(() => {
  "use strict";
  const key = "sportenvo_traffic_audience";
  const now = Date.now();
  const localHost = host => /^(localhost|127\.0\.0\.1|\[?::1\]?)$/i.test(host);
  const query = new URLSearchParams(window.location.search);
  let localReferrer = false;
  try { localReferrer = localHost(new URL(document.referrer).hostname); } catch {}
  let previous = null;
  try { previous = JSON.parse(sessionStorage.getItem(key) || "null"); } catch {}
  const hasCampaign = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].some(k => query.has(k));
  const explicitQA = (query.get("utm_source") || "").toLowerCase() === "qa";
  const recentTest = previous?.audience === "test" && now - previous.updatedAt >= 0 && now - previous.updatedAt < 30 * 60 * 1000;
  const audience = localHost(window.location.hostname) || localReferrer || explicitQA || (!hasCampaign && recentTest) ? "test" : "external";
  try { sessionStorage.setItem(key, JSON.stringify({ audience, updatedAt: now })); } catch {}
  // This is a reporting label, not a destructive GA4 internal-traffic filter.
  window.sportenvoTrafficAudience = audience;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("set", { traffic_audience: audience });
})();
