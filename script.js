(function () {
  "use strict";

  var root = document.documentElement;
  var masthead = document.getElementById("masthead");
  var menuButton = document.querySelector(".menu-toggle");
  var navigation = document.getElementById("primary-navigation");
  var progress = document.querySelector(".reading-progress");
  var motionQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };
  var reduceMotion = motionQuery.matches;
  var requestFrame = typeof window.requestAnimationFrame === "function"
    ? window.requestAnimationFrame.bind(window)
    : function (callback) { return window.setTimeout(callback, 16); };
  var scheduled = false;
  var lastProgress = "";
  var revealObserver = null;

  function updateScrollState() {
    var offset = Math.max(0, window.scrollY || window.pageYOffset || 0);
    var scrollableHeight = Math.max(0, root.scrollHeight - window.innerHeight);
    var nextProgress = scrollableHeight > 0
      ? Math.min(1, offset / scrollableHeight).toFixed(4)
      : "0.0000";

    if (masthead) masthead.classList.toggle("is-scrolled", offset > 20);
    if (progress && nextProgress !== lastProgress) {
      progress.style.setProperty("--scroll-progress", nextProgress);
      lastProgress = nextProgress;
    }
    scheduled = false;
  }

  function requestScrollUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestFrame(updateScrollState);
  }

  function closeNavigation(restoreFocus) {
    if (!menuButton || !navigation) return;
    navigation.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    if (restoreFocus) menuButton.focus();
  }

  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", function () {
    if (window.innerWidth > 720) closeNavigation(false);
    requestScrollUpdate();
  }, { passive: true });
  window.addEventListener("pageshow", requestScrollUpdate, { passive: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(requestScrollUpdate).catch(function () {});
  }

  if (menuButton && navigation) {
    menuButton.addEventListener("click", function () {
      var open = !navigation.classList.contains("is-open");
      navigation.classList.toggle("is-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    });

    navigation.addEventListener("click", function (event) {
      var target = event.target;
      while (target && target !== navigation) {
        if (target.tagName === "A") {
          closeNavigation(false);
          break;
        }
        target = target.parentElement;
      }
    });

    document.addEventListener("pointerdown", function (event) {
      if (!navigation.classList.contains("is-open")) return;
      if (!navigation.contains(event.target) && !menuButton.contains(event.target)) {
        closeNavigation(false);
      }
    }, { passive: true });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && navigation.classList.contains("is-open")) {
        closeNavigation(true);
      }
    });
  }

  if (!reduceMotion && typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".project-spread").forEach(function (project) {
      var image = project.querySelector(".project-image");
      var pointerScheduled = false;
      var pointerInside = false;
      var pointerX = 0;
      var pointerY = 0;
      if (!image) return;

      project.addEventListener("pointermove", function (event) {
        pointerInside = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (pointerScheduled) return;
        pointerScheduled = true;
        requestFrame(function () {
          pointerScheduled = false;
          if (!pointerInside) return;
          var bounds = image.getBoundingClientRect();
          image.style.setProperty("--spot-x", String(pointerX - bounds.left) + "px");
          image.style.setProperty("--spot-y", String(pointerY - bounds.top) + "px");
        });
      }, { passive: true });

      project.addEventListener("pointerleave", function () {
        pointerInside = false;
        image.style.removeProperty("--spot-x");
        image.style.removeProperty("--spot-y");
      }, { passive: true });
    });
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    try {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -36px 0px", threshold: 0.06 });

      root.classList.add("js-enhanced");
      document.querySelectorAll(".reveal").forEach(function (element) {
        revealObserver.observe(element);
      });
    } catch (error) {
      root.classList.remove("js-enhanced");
      if (revealObserver) revealObserver.disconnect();
    }
  }

  if ("IntersectionObserver" in window && navigation) {
    try {
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var target = "#" + entry.target.id;
          navigation.querySelectorAll("a").forEach(function (link) {
            if (link.getAttribute("href") === target) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      }, { rootMargin: "-35% 0px -52% 0px", threshold: 0 });

      document.querySelectorAll("main section[id]").forEach(function (section) {
        sectionObserver.observe(section);
      });
    } catch (error) {
      navigation.querySelectorAll("[aria-current]").forEach(function (link) {
        link.removeAttribute("aria-current");
      });
    }
  }

  function handleMotionPreference(event) {
    reduceMotion = event.matches;
    if (reduceMotion) {
      root.classList.remove("js-enhanced");
      if (revealObserver) revealObserver.disconnect();
    }
    requestScrollUpdate();
  }

  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", handleMotionPreference);
  } else if (typeof motionQuery.addListener === "function") {
    motionQuery.addListener(handleMotionPreference);
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) requestScrollUpdate();
  });
})();
