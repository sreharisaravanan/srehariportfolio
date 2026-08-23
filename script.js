(function () {
  "use strict";

  var masthead = document.getElementById("masthead");
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.getElementById("primary-navigation");
  var progress = document.querySelector(".reading-progress");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var scheduled = false;

  function updateScrollState() {
    var offset = window.scrollY || window.pageYOffset || 0;
    if (masthead) masthead.classList.toggle("is-scrolled", offset > 20);
    if (progress) {
      var height = document.documentElement.scrollHeight - window.innerHeight;
      var value = height > 0 ? Math.min(100, Math.max(0, (offset / height) * 100)) : 0;
      progress.style.setProperty("--scroll-progress", String(value) + "%");
    }
    scheduled = false;
  }

  function requestScrollUpdate() {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateScrollState);
    }
  }

  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });

  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var open = navigation.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });

    navigation.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navigation.classList.contains("is-open")) {
        navigation.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        menuButton.focus();
      }
    });
  }

  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".project-spread").forEach(function (project) {
      project.addEventListener("pointermove", function (event) {
        var image = project.querySelector(".project-image");
        if (!image) return;
        var bounds = image.getBoundingClientRect();
        image.style.setProperty("--spot-x", String(event.clientX - bounds.left) + "px");
        image.style.setProperty("--spot-y", String(event.clientY - bounds.top) + "px");
      }, { passive: true });
    });
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-enhanced");

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -45px 0px", threshold: 0.08 });

    document.querySelectorAll(".reveal").forEach(function (element) {
      revealObserver.observe(element);
    });

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || !navigation) return;
        var target = "#" + entry.target.id;
        navigation.querySelectorAll("a").forEach(function (link) {
          if (link.getAttribute("href") === target) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-36% 0px -54% 0px", threshold: 0 });

    document.querySelectorAll("main section[id]").forEach(function (section) {
      sectionObserver.observe(section);
    });
  }
})();
