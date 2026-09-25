(() => {
  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("#primary-nav");
  const menuButton = document.querySelector(".site-header .menu-toggle");
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
  }, {passive:true});
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".site-header .nav-dropdown[open]").forEach((details) => {
      if (!details.contains(event.target)) details.removeAttribute("open");
    });
  });
})();