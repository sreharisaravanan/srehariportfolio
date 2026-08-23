(function () {
  "use strict";
  var header = document.getElementById("site-header");
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.getElementById("primary-navigation");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function syncHeader() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 20); }
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });
  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var isOpen = navigation.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    });
    navigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
      });
    });
  }
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".editorial-project").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var visual = card.querySelector(".project-visual");
        if (!visual) return;
        var bounds = visual.getBoundingClientRect();
        visual.style.setProperty("--spot-x", String(event.clientX - bounds.left) + "px");
        visual.style.setProperty("--spot-y", String(event.clientY - bounds.top) + "px");
      }, { passive: true });
    });
  }
  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-enhanced");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -50px 0px", threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (element) { observer.observe(element); });
  }
})();
