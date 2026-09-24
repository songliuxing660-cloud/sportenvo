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

