(() => {
  "use strict";
  const mount = document.getElementById("zf_div_XD-pakvMRutFV5VW272mlo86-BampgzRVraMENChmNI");
  if (!mount || window.sportenvoInquiryFunnel) return;
  window.sportenvoInquiryFunnel = true;
  const formId = "XD-pakvMRutFV5VW272mlo86-BampgzRVraMENChmNI";
  const placement = /\/start-project\.html$/.test(location.pathname) ? "project" : "home";
  const shell = mount.closest("[data-start-zoho-form], [data-home-zoho-form]") || mount.parentElement;
  const loading = shell.querySelector(".formal-inquiry-loading, .home-formal-loading");
  const es = document.documentElement.lang.startsWith("es");
  const fired = new Set();
  let frame, timer, ready = false;
  function track(name, extra = {}) {
    if (fired.has(name)) return;
    fired.add(name);
    if (typeof window.gtag !== "function") return;
    // Never include form values, WhatsApp messages or arbitrary URL queries.
    window.gtag("event", name, {
      page_location: location.origin + location.pathname,
      form_name: "SPORTENVO Project Inquiry",
      form_location: placement,
      traffic_audience: window.sportenvoTrafficAudience || "external",
      ...extra
    });
  }
  function attach() {
    if (frame) return;
    frame = mount.querySelector("iframe");
    if (!frame) return;
    track("inquiry_form_requested");
    frame.addEventListener("load", () => track("inquiry_form_loaded"), { once: true });
    timer = window.setTimeout(() => {
      if (ready) return;
      track("inquiry_form_load_slow");
      shell.setAttribute("data-form-state", "slow");
      if (loading) {
        loading.style.display = "block";
        loading.textContent = es ? "El formulario tarda en cargar. Puede abrirlo directamente o usar WhatsApp o correo." : "The form is taking longer to load. Open it directly, or use WhatsApp or email.";
      }
    }, 12000);
    if ("IntersectionObserver" in window) {
      const visible = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.01)) {
          track("inquiry_form_visible");
          visible.disconnect();
        }
      }, { threshold: 0.01 });
      visible.observe(frame);
    }
  }
  const observer = new MutationObserver(() => { attach(); if (frame) observer.disconnect(); });
  observer.observe(mount, { childList: true });
  attach();
  window.addEventListener("message", event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== "https://forms.zohopublic.com" || typeof event.data !== "string") return;
    const parts = event.data.split("|");
    const height = Number(parts[1]);
    if (parts[0] !== formId || ![2, 3].includes(parts.length) || !Number.isFinite(height) || height <= 0) return;
    ready = true;
    window.clearTimeout(timer);
    shell.setAttribute("data-form-state", "ready");
    if (loading) loading.style.display = "none";
    track("inquiry_form_ready");
  });
  window.addEventListener("blur", () => window.setTimeout(() => {
    if (frame && document.activeElement === frame) track("inquiry_form_engaged", { engagement_method: "iframe_focus" });
  }, 0));
  document.addEventListener("click", event => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    const method = ["wa.me", "api.whatsapp.com"].includes(url.hostname) ? "whatsapp" : url.protocol === "mailto:" ? "email" : url.hostname === "forms.zohopublic.com" ? "external_form" : "";
    if (method) track("inquiry_contact_" + method + "_click", { contact_method: method });
  });
})();
