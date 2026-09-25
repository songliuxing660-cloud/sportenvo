const header = document.querySelector("[data-header]");
const nav = document.querySelector("#primary-nav");
const menuButton = document.querySelector(".menu-toggle");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
    document.body.classList.toggle("menu-open", !open);
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a") && window.innerWidth <= 860) {
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });
}

window.addEventListener("scroll", () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });

document.addEventListener("click", (event) => {
  document.querySelectorAll(".nav-dropdown[open]").forEach((details) => {
    if (!details.contains(event.target)) details.removeAttribute("open");
  });
});

const attributionKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const currentParams = new URLSearchParams(window.location.search);
const attribution = {};

for (const key of attributionKeys) {
  let storedValue = "";
  try { storedValue = sessionStorage.getItem(`sportenvo_${key}`) || ""; } catch {}
  const value = currentParams.get(key) || storedValue;
  if (!value) continue;
  attribution[key] = value;
  try { sessionStorage.setItem(`sportenvo_${key}`, value); } catch {}
}

function trackEvent(eventName, parameters = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, parameters);
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...parameters });
}

function rememberLeadIntent(ctaText = "") {
  try {
    localStorage.setItem("sportenvo_lead_started_at", String(Date.now()));
    localStorage.setItem("sportenvo_lead_source_page", window.location.pathname + window.location.search);
    localStorage.setItem("sportenvo_lead_source_title", document.title);
    if (ctaText) localStorage.setItem("sportenvo_lead_source_cta", String(ctaText).slice(0, 120));
  } catch {}
}
window.sportenvoRememberLeadIntent = rememberLeadIntent;

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (!link) return;
  const rawHref = link.getAttribute("href") || "";
  let destination;
  try { destination = new URL(rawHref, window.location.href); } catch { return; }

  const path = destination.pathname.replace(/\\/+$/, "");
  const visibleText = (link.textContent || link.getAttribute("aria-label") || "")
    .replace(/\\s+/g, " ").trim().slice(0, 120);
  const params = {
    link_url: destination.href,
    link_text: visibleText,
    page_location: window.location.href,
    page_title: document.title,
    ...attribution
  };

  if (destination.origin === window.location.origin && path.endsWith("/start-project.html")) {
    rememberLeadIntent(visibleText);
    trackEvent("start_project_click", params);
    return;
  }

  if (destination.hostname === "forms.zohopublic.com") {
    rememberLeadIntent(visibleText);
    trackEvent("project_form_external_open", params);
    trackEvent("request_quote_click", params);
    return;
  }

  if (destination.hostname === "wa.me" || destination.hostname === "api.whatsapp.com") {
    rememberLeadIntent(visibleText);
    trackEvent("contact_whatsapp_click", params);
    return;
  }

  if (destination.protocol === "mailto:" && /sales@sportenvo\\.com/i.test(destination.href)) {
    rememberLeadIntent(visibleText);
    trackEvent("contact_email_click", params);
  }
});

const projectForm = document.querySelector("#project-form");

if (projectForm) {
  projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!projectForm.reportValidity()) return;

    const data = new FormData(projectForm);
    const lines = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Country / Region: ${data.get("country")}`,
      `Venue Type: ${data.get("venue")}`,
      `Court Type: ${data.get("court")}`,
      `Foundation: ${data.get("foundation")}`,
      `Weather Protection: ${data.get("weather")}`,
      `Court Quantity: ${data.get("quantity")}`,
      "",
      "Project Brief:",
      data.get("brief") || "Not provided"
    ];
    const subject = `SPORTENVO project enquiry - ${data.get("country")}`;
    const mailto = `mailto:sales@sportenvo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    const status = projectForm.querySelector(".form-status");
    status.textContent = "Your enquiry has been prepared. Opening your email app...";
    window.location.href = mailto;
  });
}

