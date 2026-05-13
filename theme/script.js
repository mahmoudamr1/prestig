/**
 * Tailwind utilities come from the host app (e.g. Next.js `globals.css` + tailwindcss).
 * Do not inject the Play CDN here. Include theme templates in `content` (or safelist) so JIT picks up classes.
 */

(function () {
  "use strict";
  if (typeof document === "undefined") {
    return;
  }
  var MOUNT_EVENT = "ps-theme-content-mounted";

  /** Default EasyOrders public API v1 base (production). Override via `data-eo-api-origin` / `data-eo-api-base` / `window.__EO_STORE_API_BASE__`. */
  const PS_EO_API_V1_BASE = "https://api.easy-orders.net/api/v1";

  function readPrestigeScrollY(scrollRoot) {
    if (!scrollRoot || scrollRoot === window) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return scrollRoot.scrollTop || 0;
  }

  function getPrestigeHeaderScrollRoot() {
    var main = document.querySelector("main");
    if (!main) {
      return window;
    }
    var st = window.getComputedStyle(main);
    var oy = st.overflowY;
    if (
      (oy !== "auto" && oy !== "scroll" && oy !== "overlay") ||
      main.scrollHeight <= main.clientHeight + 2
    ) {
      return window;
    }
    /* Only treat <main> as the scroll root when the document itself is not scrolling
       (typical app shell: overflow hidden on html/body). Otherwise window scrollY is
       authoritative and main.scrollTop can be non-zero while still at the “top” UX. */
    var htmlSt = window.getComputedStyle(document.documentElement);
    var bodySt = window.getComputedStyle(document.body);
    var htmlLocked =
      htmlSt.overflow === "hidden" ||
      htmlSt.overflowY === "hidden" ||
      htmlSt.overflowY === "clip";
    var bodyLocked =
      bodySt.overflow === "hidden" ||
      bodySt.overflowY === "hidden" ||
      bodySt.overflowY === "clip";
    if (htmlLocked || bodyLocked) {
      return main;
    }
    return window;
  }

  function syncPrestigeThemeStack() {
    var theme = document.querySelector(".ps-theme");
    var header = theme ? theme.querySelector(".ps-header") : document.querySelector(".ps-header");
    var ann = theme ? theme.querySelector(".ps-announce") : null;
    var spacer = theme ? theme.querySelector(".ps-theme-layout-spacer") : null;

    function measure() {
      var ah = 0;
      if (ann) {
        var rect = ann.getBoundingClientRect();
        ah = Math.round(rect.height) || ann.offsetHeight || 0;
      }
      var hh = header ? Math.round(header.offsetHeight) || 74 : 74;
      document.documentElement.style.setProperty("--ps-announce-h", ah + "px");
      document.documentElement.style.setProperty("--ps-header-h", hh + "px");
      if (spacer) {
        spacer.style.height = ah + hh + "px";
      }
    }

    measure();
    requestAnimationFrame(measure);
  }

  function initPrestigeHeaderScroll() {
    var header = document.querySelector(".ps-header");
    if (!header || header.getAttribute("data-ps-scroll-init")) {
      return;
    }

    header.setAttribute("data-ps-scroll-init", "1");

    var scrollRoot = getPrestigeHeaderScrollRoot();
    var lastY = readPrestigeScrollY(scrollRoot);
    var delta = 2;

    function setScrolledState(y) {
      if (y > 6) {
        header.classList.add("ps-scrolled");
      } else {
        header.classList.remove("ps-scrolled");
      }
    }

    function setVisible() {
      header.classList.remove("ps-hidden");
    }

    function setHidden() {
      if (readPrestigeScrollY(scrollRoot) > 6) {
        header.classList.add("ps-hidden");
      }
    }

    function onScroll() {
      var y = readPrestigeScrollY(scrollRoot);
      setScrolledState(y);

      if (y <= 6) {
        setVisible();
      } else if (y < lastY - delta) {
        setVisible();
      } else if (y > lastY + delta) {
        setHidden();
      }

      lastY = y;
    }

    setScrolledState(lastY);

    if (scrollRoot === window) {
      window.addEventListener("scroll", onScroll, { passive: true });
    } else {
      scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    }
  }

  function initPrestigeSearchRedirect() {
    document.querySelectorAll('[data-eo="search-btn"]').forEach(function (btn) {
      if (btn.getAttribute("data-ps-search-init")) {
        return;
      }

      btn.setAttribute("data-ps-search-init", "1");
      btn.addEventListener("click", function () {
        window.location.href = "/search";
      });
    });
  }

  function clearPrestigeAnnounceSliders() {
    document.querySelectorAll(".ps-announce-slider").forEach(function (root) {
      var tid = root.getAttribute("data-ps-ann-interval-id");
      if (tid) {
        clearInterval(parseInt(tid, 10));
        root.removeAttribute("data-ps-ann-interval-id");
      }
      root.removeAttribute("data-ps-ann-slider-init");
    });
  }

  function collectAnnounceItems(root) {
    var type = root.getAttribute("data-ann-type");
    var out = [];
    if (type === "marquee") {
      root.querySelectorAll('.ps-announce-marquee-item:not([aria-hidden="true"])').forEach(function (el) {
        out.push(el.innerHTML);
      });
    } else if (type === "slider") {
      root.querySelectorAll(".ps-announce-slide").forEach(function (el) {
        out.push(el.innerHTML);
      });
    } else if (root.querySelector(".ps-announce-simple")) {
      root.querySelectorAll(".ps-announce-simple > span").forEach(function (el) {
        if (!el.classList.contains("ps-announce-sep")) {
          out.push(el.innerHTML);
        }
      });
    }
    return out;
  }

  function teardownAnnounceCarousel(root) {
    var mcTid = root.getAttribute("data-ps-mc-interval-id");
    if (mcTid) {
      clearInterval(parseInt(mcTid, 10));
      root.removeAttribute("data-ps-mc-interval-id");
    }
    var mc = root.querySelector(".ps-announce-mc");
    if (mc) {
      mc.remove();
    }
    root.classList.remove("ps-announce--has-mc");
  }

  function setupAnnounceCarousel(root) {
    teardownAnnounceCarousel(root);
    var items = collectAnnounceItems(root);
    if (items.length < 2) {
      return;
    }

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mc = document.createElement("div");
    mc.className = "ps-announce-mc";
    mc.setAttribute("aria-live", "polite");

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "ps-announce-mc-nav ps-announce-mc-prev";
    prev.setAttribute("aria-label", "Previous announcement");
    prev.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M9 2L4 7l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var view = document.createElement("div");
    view.className = "ps-announce-mc-view";

    items.forEach(function (html, idx) {
      var block = document.createElement("p");
      block.className = "ps-announce-mc-slide" + (idx === 0 ? " ps-active" : "");
      block.innerHTML = html;
      view.appendChild(block);
    });

    var next = document.createElement("button");
    next.type = "button";
    next.className = "ps-announce-mc-nav ps-announce-mc-next";
    next.setAttribute("aria-label", "Next announcement");
    next.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M5 2l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    mc.appendChild(prev);
    mc.appendChild(view);
    mc.appendChild(next);
    root.appendChild(mc);
    root.classList.add("ps-announce--has-mc");

    var slides = mc.querySelectorAll(".ps-announce-mc-slide");
    var i = 0;
    var timerId = null;
    /** Auto-advance interval (prev/next reset this timer). */
    var MC_INTERVAL_MS = 3000;

    function showIndex(nextI) {
      slides[i].classList.remove("ps-active");
      i = (nextI + slides.length) % slides.length;
      slides[i].classList.add("ps-active");
    }

    function step(delta) {
      showIndex(i + delta);
    }

    function startAuto() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
      root.removeAttribute("data-ps-mc-interval-id");
      if (reduced) {
        return;
      }
      timerId = window.setInterval(function () {
        step(1);
      }, MC_INTERVAL_MS);
      root.setAttribute("data-ps-mc-interval-id", String(timerId));
    }

    prev.addEventListener("click", function () {
      step(-1);
      startAuto();
    });
    next.addEventListener("click", function () {
      step(1);
      startAuto();
    });

    startAuto();
  }

  function syncPrestigeAnnounceBar() {
    document.querySelectorAll("[data-ps-announce]").forEach(function (root) {
      teardownAnnounceCarousel(root);
    });
    clearPrestigeAnnounceSliders();
    document.querySelectorAll("[data-ps-announce]").forEach(function (root) {
      var items = collectAnnounceItems(root);
      if (items.length > 1) {
        setupAnnounceCarousel(root);
      }
    });
    syncPrestigeThemeStack();
  }

  function initPrestigeMobileMenu() {
    /* Event delegation: header HTML is often injected after DOMContentLoaded (React + Liquid),
       so direct getElementById + addEventListener in init() would miss #eo-menu-btn forever. */
    if (document.documentElement.dataset.psPrestigeMobileMenu === "1") {
      return;
    }
    document.documentElement.dataset.psPrestigeMobileMenu = "1";

    function openMenu() {
      var menu = document.getElementById("eo-mobile-menu");
      var overlay = document.getElementById("eo-mobile-overlay");
      if (!menu) {
        return;
      }
      menu.classList.add("ps-open");
      if (overlay) {
        overlay.classList.add("ps-open");
      }
      document.body.style.overflow = "hidden";
    }

    function closeMenu() {
      var menu = document.getElementById("eo-mobile-menu");
      var overlay = document.getElementById("eo-mobile-overlay");
      if (menu) {
        menu.classList.remove("ps-open");
      }
      if (overlay) {
        overlay.classList.remove("ps-open");
      }
      document.body.style.overflow = "";
    }

    document.addEventListener(
      "click",
      function (e) {
        var t = e.target;
        if (!t || !t.closest) {
          return;
        }

        if (t.closest("#eo-menu-btn")) {
          e.preventDefault();
          var m = document.getElementById("eo-mobile-menu");
          if (!m) {
            return;
          }
          if (m.classList.contains("ps-open")) {
            closeMenu();
          } else {
            openMenu();
          }
          return;
        }

        if (t.closest("#eo-mobile-close")) {
          e.preventDefault();
          closeMenu();
          return;
        }

        var overlayEl = document.getElementById("eo-mobile-overlay");
        if (
          overlayEl &&
          overlayEl.classList.contains("ps-open") &&
          (t === overlayEl || overlayEl.contains(t))
        ) {
          closeMenu();
          return;
        }

        var navLink = t.closest(".ps-mobile-nav a");
        if (navLink) {
          var menuEl = document.getElementById("eo-mobile-menu");
          if (menuEl && menuEl.contains(navLink)) {
            closeMenu();
          }
          return;
        }

        var trigger = t.closest(".ps-accordion-trigger");
        if (!trigger) {
          return;
        }
        var menuForAcc = document.getElementById("eo-mobile-menu");
        if (!menuForAcc || !menuForAcc.contains(trigger)) {
          return;
        }
        e.preventDefault();
        var parent = trigger.closest(".ps-mobile-accordion");
        if (!parent) {
          return;
        }
        var isOpen = parent.classList.contains("ps-open");
        menuForAcc.querySelectorAll(".ps-mobile-accordion.ps-open").forEach(function (acc) {
          if (acc !== parent) {
            acc.classList.remove("ps-open");
          }
        });
        parent.classList.toggle("ps-open", !isOpen);
      },
      false
    );
  }

  function initPrestigeSlider() {
    if (!window._psSliderBreakpointBound) {
      window._psSliderBreakpointBound = true;
      var mq758 = window.matchMedia("(max-width: 768px)");
      var onPsSliderBreak = function () {
        document.querySelectorAll(".ps-slider").forEach(function (el) {
          if (typeof el._psSliderDispose === "function") {
            el._psSliderDispose();
          }
          initOnePrestigeSlider(el);
        });
      };
      if (mq758.addEventListener) {
        mq758.addEventListener("change", onPsSliderBreak);
      } else if (mq758.addListener) {
        mq758.addListener(onPsSliderBreak);
      }
    }
    document.querySelectorAll(".ps-slider").forEach(initOnePrestigeSlider);
  }

  function initOnePrestigeSlider(slider) {
    if (typeof slider._psSliderDispose === "function") {
      slider._psSliderDispose();
    }
    slider.removeAttribute("data-ps-slider-init");

    var track = slider.querySelector(".ps-slider-track");
    if (!track) {
      return;
    }

    var originalSlides = track.querySelectorAll(".ps-slider-slide[data-ps-slide]");
    if (!originalSlides.length) {
      return;
    }

    var mqSlideMobile = window.matchMedia("(max-width: 768px)");
    if (mqSlideMobile.matches) {
      var viewportM = slider.querySelector(".ps-slider-viewport");
      var indicatorsM = slider.querySelectorAll(".ps-slider-indicator");
      if (
        !viewportM ||
        originalSlides.length < 2 ||
        !indicatorsM.length
      ) {
        return;
      }

      var acM = new AbortController();
      var sigM = acM.signal;
      var scrollIdleM = 0;
      var mobileIdx = 0;
      var autoplayTimerM = 0;
      var mobileSlideStart = performance.now();
      var mobileProgressRaf = 0;
      var mobileAutoplayScrollActive = false;
      var mobileAutoplayScrollEndT = 0;
      var intervalM = parseInt(slider.getAttribute("data-autoplay") || "", 10) || 3000;
      var reduceMotionM =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      function disposeMobileHero() {
        acM.abort();
        if (scrollIdleM) {
          clearTimeout(scrollIdleM);
          scrollIdleM = 0;
        }
        if (mobileAutoplayScrollEndT) {
          clearTimeout(mobileAutoplayScrollEndT);
          mobileAutoplayScrollEndT = 0;
        }
        mobileAutoplayScrollActive = false;
        if (mobileProgressRaf) {
          cancelAnimationFrame(mobileProgressRaf);
          mobileProgressRaf = 0;
        }
        if (autoplayTimerM) {
          clearInterval(autoplayTimerM);
          autoplayTimerM = 0;
        }
        indicatorsM.forEach(function (b) {
          var f = b.querySelector(".ps-slider-ind-progress");
          if (f) {
            f.style.removeProperty("transform");
            f.style.removeProperty("transform-origin");
          }
        });
        slider.removeAttribute("data-ps-slider-init");
        slider._psSliderDispose = null;
      }

      slider._psSliderDispose = disposeMobileHero;
      slider.setAttribute("data-ps-slider-init", "1");

      function syncDotsMobile() {
        var prevIdx = mobileIdx;
        var rect = viewportM.getBoundingClientRect();
        var mid = rect.left + rect.width / 2;
        var best = 0;
        var bestD = Infinity;
        var i;
        for (i = 0; i < originalSlides.length; i++) {
          var r = originalSlides[i].getBoundingClientRect();
          var cx = r.left + r.width / 2;
          var d = Math.abs(cx - mid);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        mobileIdx = best;
        if (best !== prevIdx) {
          mobileSlideStart = performance.now();
        }
        indicatorsM.forEach(function (btn, j) {
          var on = j === best;
          btn.classList.toggle("ps-active", on);
          btn.setAttribute("aria-current", on ? "true" : "false");
        });
      }

      function goSlideMobile(idx, instantScroll) {
        var el = originalSlides[idx];
        if (!el) {
          return;
        }
        var useInstant = !!instantScroll || reduceMotionM;
        mobileAutoplayScrollActive = true;
        if (mobileAutoplayScrollEndT) {
          clearTimeout(mobileAutoplayScrollEndT);
        }
        var settleMs = useInstant ? 80 : 620;
        mobileAutoplayScrollEndT = window.setTimeout(function () {
          mobileAutoplayScrollEndT = 0;
          mobileAutoplayScrollActive = false;
          syncDotsMobile();
          armMobileAutoplay();
        }, settleMs);
        /* Never scrollIntoView here: mobile Safari/Chrome often scroll the *page* vertically to the slider. */
        var vRect = viewportM.getBoundingClientRect();
        var sRect = el.getBoundingClientRect();
        var maxScroll = Math.max(0, viewportM.scrollWidth - viewportM.clientWidth);
        var targetLeft = Math.min(
          maxScroll,
          Math.max(0, viewportM.scrollLeft + (sRect.left - vRect.left))
        );
        if (useInstant) {
          var prevSb = viewportM.style.scrollBehavior;
          viewportM.style.scrollBehavior = "auto";
          viewportM.scrollLeft = targetLeft;
          viewportM.style.scrollBehavior = prevSb;
        } else {
          viewportM.scrollTo({ left: targetLeft, behavior: "smooth" });
        }
      }

      function clearMobileAutoplay() {
        if (autoplayTimerM) {
          clearInterval(autoplayTimerM);
          autoplayTimerM = 0;
        }
      }

      function armMobileAutoplay() {
        clearMobileAutoplay();
        mobileSlideStart = performance.now();
        if (originalSlides.length < 2) {
          return;
        }
        autoplayTimerM = window.setInterval(function () {
          var next = (mobileIdx + 1) % originalSlides.length;
          goSlideMobile(next, false);
        }, intervalM);
      }

      function tickMobileIndicatorProgress(now) {
        mobileProgressRaf = window.requestAnimationFrame(tickMobileIndicatorProgress);
        if (originalSlides.length < 2) {
          indicatorsM.forEach(function (b) {
            var f = b.querySelector(".ps-slider-ind-progress");
            if (f) {
              f.style.removeProperty("transform");
              f.style.removeProperty("transform-origin");
            }
          });
          return;
        }
        var p = 0;
        if (autoplayTimerM || mobileAutoplayScrollActive) {
          p = Math.min(1, Math.max(0, (now - mobileSlideStart) / intervalM));
        }
        indicatorsM.forEach(function (btn) {
          var fill = btn.querySelector(".ps-slider-ind-progress");
          if (!fill) {
            return;
          }
          if (btn.classList.contains("ps-active")) {
            fill.style.transformOrigin = "left center";
            fill.style.transform = "scaleX(" + p + ")";
          } else {
            fill.style.removeProperty("transform");
            fill.style.removeProperty("transform-origin");
          }
        });
      }

      viewportM.addEventListener(
        "scroll",
        function () {
          if (mobileAutoplayScrollActive) {
            return;
          }
          clearMobileAutoplay();
          if (scrollIdleM) {
            clearTimeout(scrollIdleM);
          }
          scrollIdleM = window.setTimeout(function () {
            scrollIdleM = 0;
            syncDotsMobile();
            armMobileAutoplay();
          }, 80);
        },
        { passive: true, signal: sigM }
      );

      indicatorsM.forEach(function (btn, idx) {
        btn.addEventListener(
          "click",
          function () {
            clearMobileAutoplay();
            mobileSlideStart = performance.now();
            goSlideMobile(idx, false);
          },
          { signal: sigM }
        );
      });

      window.addEventListener(
        "resize",
        function () {
          syncDotsMobile();
        },
        { passive: true, signal: sigM }
      );

      syncDotsMobile();
      armMobileAutoplay();
      mobileProgressRaf = window.requestAnimationFrame(tickMobileIndicatorProgress);
      return;
    }

    var indicators = slider.querySelectorAll(".ps-slider-indicator");
    var interval = parseInt(slider.getAttribute("data-autoplay") || "", 10) || 30000;

    var ac = new AbortController();
    var signal = ac.signal;
    var animRaf = 0;
    var resizeObserver = null;

    function disposeSliderInstance() {
      ac.abort();
      if (animRaf) {
        cancelAnimationFrame(animRaf);
        animRaf = 0;
      }
      if (resizeObserver) {
        try {
          resizeObserver.disconnect();
        } catch (eDis) {}
        resizeObserver = null;
      }
      track.querySelectorAll(".ps-slider-slide--clone").forEach(function (n) {
        n.remove();
      });
      track.style.transform = "";
      indicators.forEach(function (b) {
        var f = b.querySelector(".ps-slider-ind-progress");
        if (f) {
          f.style.removeProperty("transform");
          f.style.removeProperty("transform-origin");
        }
      });
      slider.removeAttribute("data-ps-slider-init");
      slider._psSliderDispose = null;
    }

    slider._psSliderDispose = disposeSliderInstance;
    slider.setAttribute("data-ps-slider-init", "1");

    var viewport = slider.querySelector(".ps-slider-viewport");

    var realCount = originalSlides.length;
    var slides;
    var internal = 0;

    if (realCount >= 2) {
      var lastEl = originalSlides[realCount - 1];
      var firstEl = originalSlides[0];
      var cloneStart = lastEl.cloneNode(true);
      cloneStart.classList.add("ps-slider-slide--clone");
      cloneStart.removeAttribute("data-ps-slide");
      cloneStart.setAttribute("aria-hidden", "true");
      var cloneEnd = firstEl.cloneNode(true);
      cloneEnd.classList.add("ps-slider-slide--clone");
      cloneEnd.removeAttribute("data-ps-slide");
      cloneEnd.setAttribute("aria-hidden", "true");
      track.insertBefore(cloneStart, firstEl);
      track.appendChild(cloneEnd);
      slides = track.querySelectorAll(".ps-slider-slide");
      internal = 1;
    } else {
      slides = originalSlides;
      internal = 0;
    }

    var startTime = 0;
    var dragStartX = 0;
    var dragLastX = 0;
    var isDragging = false;
    var hasDragged = false;
    var desktopResizeTimer = 0;

    function getTrackGap() {
      try {
        var cs = window.getComputedStyle(track);
        return parseFloat(cs.gap || cs.columnGap) || 0;
      } catch (errG) {
        return 0;
      }
    }

    function realIndexFromInternal() {
      if (realCount < 2) {
        return internal;
      }
      if (internal === 0) {
        return realCount - 1;
      }
      if (internal === realCount + 1) {
        return 0;
      }
      return internal - 1;
    }

    var PEEK_L_CLS = "ps-slider-slide--peek-left";
    var PEEK_R_CLS = "ps-slider-slide--peek-right";

    function syncActiveClass() {
      slides.forEach(function (s, i) {
        s.classList.toggle("ps-active", i === internal);
      });
    }

    function syncPeekCornerClasses() {
      slides.forEach(function (s) {
        s.classList.remove(PEEK_L_CLS, PEEK_R_CLS);
      });
      if (slides.length < 2) {
        return;
      }
      var ai = internal;
      if (ai > 0) {
        slides[ai - 1].classList.add(PEEK_L_CLS);
      }
      if (ai < slides.length - 1) {
        slides[ai + 1].classList.add(PEEK_R_CLS);
      }
    }

    function computeTranslateX() {
      var gap = getTrackGap();
      var acc = 0;
      var i;
      for (i = 0; i < internal; i++) {
        var el = slides[i];
        var w = el ? el.getBoundingClientRect().width : 0;
        acc += w + gap;
      }
      var activeEl = slides[internal];
      var slideW = activeEl ? activeEl.getBoundingClientRect().width : 0;
      var activeML = 0;
      if (activeEl) {
        try {
          activeML =
            parseFloat(window.getComputedStyle(activeEl).marginLeft) || 0;
        } catch (errM) {
          activeML = 0;
        }
      }
      acc += activeML;
      if (!viewport) {
        return -acc;
      }
      var vpW = viewport.getBoundingClientRect().width;
      var padL = 0;
      try {
        padL = parseFloat(window.getComputedStyle(viewport).paddingLeft) || 0;
      } catch (errP) {
        padL = 0;
      }
      var centerOffset = vpW / 2 - slideW / 2 - padL;
      return centerOffset - acc;
    }

    function applyDesktopTransform(instant) {
      syncActiveClass();
      syncPeekCornerClasses();
      void track.offsetHeight;
      var x = computeTranslateX();
      if (instant) {
        track.classList.add("ps-slider-track--instant");
        track.style.transform = "translate3d(" + x + "px,0,0)";
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            track.classList.remove("ps-slider-track--instant");
          });
        });
      } else {
        track.style.transform = "translate3d(" + x + "px,0,0)";
      }
    }

    function onDesktopResize() {
      if (desktopResizeTimer) {
        window.clearTimeout(desktopResizeTimer);
      }
      desktopResizeTimer = window.setTimeout(function () {
        desktopResizeTimer = 0;
        window.requestAnimationFrame(function () {
          applyDesktopTransform(true);
        });
      }, 80);
    }

    if (viewport && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(function () {
        applyDesktopTransform(true);
      });
      resizeObserver.observe(viewport);
    }

    function updateIndicators() {
      var ri = realIndexFromInternal();
      indicators.forEach(function (btn, i) {
        var on = i === ri;
        btn.classList.toggle("ps-active", on);
        btn.setAttribute("aria-current", on ? "true" : "false");
      });
    }

    function applyIndicatorProgress(p) {
      var ri = realIndexFromInternal();
      var clamped = Math.max(0, Math.min(1, p));
      indicators.forEach(function (btn, i) {
        var fill = btn.querySelector(".ps-slider-ind-progress");
        if (!fill) {
          return;
        }
        if (i === ri) {
          fill.style.transformOrigin = "left center";
          fill.style.transform = "scaleX(" + clamped + ")";
        } else {
          fill.style.removeProperty("transform");
          fill.style.removeProperty("transform-origin");
        }
      });
    }

    function activateReal(idx) {
      if (realCount < 2) {
        internal = 0;
      } else {
        internal = idx + 1;
      }
      startTime = performance.now();
      updateIndicators();
      applyDesktopTransform(false);
    }

    function goNext() {
      if (realCount < 2) {
        return;
      }
      if (internal >= realCount + 1) {
        return;
      }
      internal++;
      startTime = performance.now();
      updateIndicators();
      applyDesktopTransform(false);
    }

    function goPrev() {
      if (realCount < 2) {
        return;
      }
      if (internal <= 0) {
        return;
      }
      internal--;
      startTime = performance.now();
      updateIndicators();
      applyDesktopTransform(false);
    }

    track.addEventListener(
      "transitionend",
      function (e) {
        if (e.target !== track) {
          return;
        }
        if (e.propertyName !== "transform") {
          return;
        }
        if (realCount < 2) {
          return;
        }
        if (internal === realCount + 1) {
          track.classList.add("ps-slider-track--instant");
          internal = 1;
          syncActiveClass();
          syncPeekCornerClasses();
          void track.offsetHeight;
          track.style.transform = "translate3d(" + computeTranslateX() + "px,0,0)";
          window.requestAnimationFrame(function () {
            track.classList.remove("ps-slider-track--instant");
          });
          updateIndicators();
          startTime = performance.now();
        } else if (internal === 0) {
          track.classList.add("ps-slider-track--instant");
          internal = realCount;
          syncActiveClass();
          syncPeekCornerClasses();
          void track.offsetHeight;
          track.style.transform = "translate3d(" + computeTranslateX() + "px,0,0)";
          window.requestAnimationFrame(function () {
            track.classList.remove("ps-slider-track--instant");
          });
          updateIndicators();
          startTime = performance.now();
        }
      },
      { signal: signal }
    );

    function getClientX(evt) {
      if (evt.touches && evt.touches[0]) {
        return evt.touches[0].clientX;
      }
      if (evt.changedTouches && evt.changedTouches[0]) {
        return evt.changedTouches[0].clientX;
      }
      return evt.clientX || 0;
    }

    function onDragStart(evt) {
      if (evt.type === "mousedown" && evt.button !== 0) {
        return;
      }
      isDragging = true;
      hasDragged = false;
      dragStartX = getClientX(evt);
      dragLastX = dragStartX;
      if (viewport) {
        viewport.classList.add("ps-slider-grabbing");
      }
      evt.preventDefault();
    }

    function onDragMove(evt) {
      if (!isDragging) return;
      dragLastX = getClientX(evt);
      if (Math.abs(dragLastX - dragStartX) > 8) {
        hasDragged = true;
      }
    }

    function onDragEnd() {
      if (viewport) {
        viewport.classList.remove("ps-slider-grabbing");
      }
      if (!isDragging) return;
      isDragging = false;

      var deltaX = dragLastX - dragStartX;
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) {
          goNext();
        } else {
          goPrev();
        }
      }

    }

    function tick(now) {
      var elapsed = now - startTime;
      if (elapsed >= interval) {
        if (realCount >= 2) {
          goNext();
        } else {
          startTime = performance.now();
        }
      }
      if (realCount >= 2 && indicators.length) {
        var eProg = now - startTime;
        var pr = Math.min(1, Math.max(0, eProg / interval));
        applyIndicatorProgress(pr);
      }
      animRaf = window.requestAnimationFrame(tick);
    }

    indicators.forEach(function (btn) {
      btn.addEventListener(
        "click",
        function () {
          var idx = parseInt(btn.getAttribute("data-slide-index") || "0", 10);
          if (isNaN(idx)) {
            return;
          }
          if (idx !== realIndexFromInternal()) {
            activateReal(idx);
          }
        },
        { signal: signal }
      );
    });

    startTime = performance.now();
    updateIndicators();
    applyDesktopTransform(true);
    animRaf = window.requestAnimationFrame(tick);

    window.addEventListener("resize", onDesktopResize, { signal: signal });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onDesktopResize, { signal: signal });
    }

    slider.addEventListener("touchstart", onDragStart, { passive: true, signal: signal });
    slider.addEventListener("touchmove", onDragMove, { passive: true, signal: signal });
    slider.addEventListener("touchend", onDragEnd, { signal: signal });

    slider.addEventListener("mousedown", onDragStart, { capture: true, signal: signal });
    window.addEventListener("mousemove", onDragMove, { capture: true, signal: signal });
    window.addEventListener("mouseup", onDragEnd, { capture: true, signal: signal });

    slider.addEventListener(
      "click",
      function (evt) {
        if (hasDragged) {
          evt.preventDefault();
          evt.stopPropagation();
          hasDragged = false;
        }
      },
      { capture: true, signal: signal }
    );
  }

  function initPrestigeFeaturedCarousel() {
    document.querySelectorAll("[data-ps-featured-carousel]").forEach(function (section) {
      if (section.getAttribute("data-ps-featured-init")) {
        return;
      }
      section.setAttribute("data-ps-featured-init", "1");

      var carousel = section.querySelector(".ps-featured-carousel");
      var slides = section.querySelectorAll(".ps-featured-slide");
      var prevBtn = section.querySelector("[data-ps-featured-prev]");
      var nextBtn = section.querySelector("[data-ps-featured-next]");

      if (!carousel || !slides.length) {
        return;
      }

      var mqMobile = window.matchMedia("(max-width: 767.98px)");
      var current = 0;
      var total = slides.length;
      var dots = section.querySelectorAll("[data-ps-featured-go]");
      var scrollRaf = 0;

      function isMobileFeatured() {
        return mqMobile.matches;
      }

      function slideViewportWidth() {
        return carousel.getBoundingClientRect().width || 0;
      }

      function syncDots() {
        dots.forEach(function (dot, i) {
          var on = i === current;
          dot.classList.toggle("is-active", on);
          dot.setAttribute("aria-current", on ? "true" : "false");
        });
      }

      function setActiveFromIndex(index) {
        current = index;
        slides.forEach(function (slide, i) {
          slide.classList.toggle("ps-active", i === current);
        });
        syncDots();
      }

      /** Mobile only: snap track to slide (instant — avoids dot flicker vs smooth scroll). */
      function scrollCarouselTo(index) {
        var w = slideViewportWidth();
        if (w <= 0) {
          return;
        }
        carousel.scrollLeft = index * w;
      }

      function goTo(index) {
        if (index < 0) {
          index = total - 1;
        } else if (index >= total) {
          index = 0;
        }
        if (isMobileFeatured()) {
          setActiveFromIndex(index);
          scrollCarouselTo(index);
        } else {
          setActiveFromIndex(index);
        }
      }

      function readIndexFromScroll() {
        if (!isMobileFeatured()) {
          return;
        }
        var w = slideViewportWidth();
        if (w <= 0) {
          return;
        }
        var idx = Math.round(carousel.scrollLeft / w);
        idx = Math.max(0, Math.min(total - 1, idx));
        if (idx !== current) {
          setActiveFromIndex(idx);
        }
      }

      carousel.addEventListener(
        "scroll",
        function () {
          if (!isMobileFeatured()) {
            return;
          }
          if (scrollRaf) {
            return;
          }
          scrollRaf = window.requestAnimationFrame(function () {
            scrollRaf = 0;
            readIndexFromScroll();
          });
        },
        { passive: true }
      );

      if (typeof mqMobile.addEventListener === "function") {
        mqMobile.addEventListener("change", function () {
          if (isMobileFeatured()) {
            goTo(current);
          } else {
            setActiveFromIndex(current);
          }
        });
      } else if (typeof mqMobile.addListener === "function") {
        mqMobile.addListener(function () {
          if (isMobileFeatured()) {
            goTo(current);
          } else {
            setActiveFromIndex(current);
          }
        });
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          goTo(current - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          goTo(current + 1);
        });
      }
      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          var raw = dot.getAttribute("data-ps-featured-go");
          var idx = raw == null ? NaN : parseInt(raw, 10);
          if (!isNaN(idx)) {
            goTo(idx);
          }
        });
      });

      slides.forEach(function (slide, i) {
        if (slide.classList.contains("ps-active")) {
          current = i;
        }
      });

      if (isMobileFeatured()) {
        window.requestAnimationFrame(function () {
          goTo(current);
        });
      } else {
        syncDots();
      }
    });
  }

  function initPrestigeListProducts() {
    document.querySelectorAll("[data-ps-plist]").forEach(function (section) {
      if (section.getAttribute("data-ps-plist-init")) {
        return;
      }
      if (section.hasAttribute("data-ps-plist-showcase")) {
        return;
      }
      section.setAttribute("data-ps-plist-init", "1");

      var viewport = section.querySelector("[data-ps-plist-viewport]");
      var track = section.querySelector("[data-ps-plist-track]");
      var cards = section.querySelectorAll("[data-ps-plist-card]");
      var prevBtn = section.querySelector("[data-ps-plist-prev]");
      var nextBtn = section.querySelector("[data-ps-plist-next]");
      var progressFill = section.querySelector("[data-ps-plist-progress-fill]");
      var isSplitShowcase = section.hasAttribute("data-ps-plist-split");
      var fracCurrent = section.querySelector("[data-ps-plist-frac-current]");
      var fracTotal = section.querySelector("[data-ps-plist-frac-total]");

      if (!track || !cards.length) {
        return;
      }

      if (fracTotal) {
        fracTotal.textContent = String(cards.length);
      }

      var current = 0;
      var isMobile = function () {
        return typeof window !== "undefined" && window.innerWidth <= 767;
      };
      var getScrollEl = function () {
        if (isSplitShowcase && viewport) {
          return viewport;
        }
        return isMobile() && viewport ? viewport : track;
      };

      function visibleCount() {
        var w = window.innerWidth || 0;
        if (isSplitShowcase) {
          return 1;
        }
        if (w <= 767) return 1;
        if (w < 1200) return 3;
        return 4;
      }

      function maxIndex() {
        return Math.max(0, cards.length - visibleCount());
      }

      /* Align with tablet breakpoint (e.g. FoxTheme `screen and (max-width: 1023px)`). */
      function isSplitCssSnapMq() {
        return (
          isSplitShowcase &&
          typeof window.matchMedia !== "undefined" &&
          window.matchMedia("(max-width: 1023px)").matches
        );
      }

      function splitTargetScrollLeftForIndex(idx) {
        var c = cards[idx];
        if (!c || !viewport) {
          return 0;
        }
        var maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
        /* Match CSS scroll-snap-align: start (≤1023px) — center math fights mandatory snap + touch pan on phones. */
        var v = viewport.getBoundingClientRect();
        var r = c.getBoundingClientRect();
        var tStart = viewport.scrollLeft + (r.left - v.left);
        return Math.min(maxScroll, Math.max(0, tStart));
      }

      function splitAlignCard(idx, smooth) {
        var c = cards[idx];
        if (!c || !isSplitShowcase || !viewport) {
          return;
        }
        var reduceMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var target = splitTargetScrollLeftForIndex(idx);
        if (!smooth || reduceMotion) {
          var prevSb = viewport.style.scrollBehavior;
          viewport.style.scrollBehavior = "auto";
          viewport.scrollLeft = target;
          viewport.style.scrollBehavior = prevSb;
        } else {
          viewport.scrollTo({ left: target, behavior: "smooth" });
        }
      }

      function splitMostVisibleIndex() {
        if (!viewport) {
          return 0;
        }
        var v = viewport.getBoundingClientRect();
        var midV = v.left + v.width / 2;
        var best = 0;
        var bestW = -1;
        var bestDist = Infinity;
        for (var i = 0; i < cards.length; i++) {
          var r = cards[i].getBoundingClientRect();
          var w = Math.max(0, Math.min(r.right, v.right) - Math.max(r.left, v.left));
          var midC = r.left + r.width / 2;
          var dist = Math.abs(midC - midV);
          if (w > bestW) {
            bestW = w;
            bestDist = dist;
            best = i;
          } else if (w === bestW && w > 0 && dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        }
        return best;
      }

      var splitScrollSettleTimer = null;
      var splitProgrammaticScroll = false;
      var splitPointerDragging = false;
      /* ≤1023px: no scroll listener on viewport (Sleek swipe-mobile parity — native scroll only). */
      var splitSnapIoRaf = null;
      var splitSnapIo = null;

      function scheduleSplitViewportSettle() {
        if (
          !isSplitShowcase ||
          !viewport ||
          splitProgrammaticScroll ||
          isSplitCssSnapMq()
        ) {
          return;
        }
        clearTimeout(splitScrollSettleTimer);
        splitScrollSettleTimer = window.setTimeout(function () {
          splitScrollSettleTimer = null;
          if (splitProgrammaticScroll) {
            return;
          }
          var idx = splitMostVisibleIndex();
          splitAlignCard(idx, false);
          current = idx;
          updateFraction();
        }, 110);
      }

      function splitSnapAfterDrag() {
        if (!isSplitShowcase || !viewport) {
          return;
        }
        if (isSplitCssSnapMq()) {
          clearTimeout(splitScrollSettleTimer);
          splitScrollSettleTimer = null;
          current = splitMostVisibleIndex();
          updateFraction();
          return;
        }
        clearTimeout(splitScrollSettleTimer);
        splitScrollSettleTimer = null;
        var idx = splitMostVisibleIndex();
        splitAlignCard(idx, false);
        current = idx;
        updateFraction();
      }

      function cardStep() {
        if (cards.length < 2) return cards[0].getBoundingClientRect().width;
        var first = cards[0].getBoundingClientRect();
        var second = cards[1].getBoundingClientRect();
        return Math.abs(second.left - first.left);
      }

      function updateFraction() {
        if (!fracCurrent || !cards.length) {
          return;
        }
        var idx = Math.min(Math.max(current, 0), cards.length - 1);
        fracCurrent.textContent = String(idx + 1);
        if (fracTotal) {
          fracTotal.textContent = String(cards.length);
        }
      }

      function updateProgress() {
        if (isSplitShowcase) {
          updateFraction();
          return;
        }
        if (!progressFill) return;
        var max = maxIndex();
        var visible = Math.min(visibleCount(), cards.length);
        var thumb = Math.max((visible / cards.length) * 100, 12);
        var left = max > 0 ? (current / max) * (100 - thumb) : 0;
        progressFill.style.width = thumb + "%";
        progressFill.style.left = left + "%";
      }

      function goTo(index) {
        var max = maxIndex();
        current = Math.min(Math.max(index, 0), max);
        if (isSplitShowcase) {
          splitProgrammaticScroll = true;
          /* CSS snap + smooth scrollTo fight each other on mobile; keep arrows instant. */
          var useSmooth = !isSplitCssSnapMq();
          splitAlignCard(current, useSmooth);
          window.setTimeout(function () {
            splitProgrammaticScroll = false;
            if (!isSplitCssSnapMq()) {
              splitAlignCard(current, false);
              current = splitMostVisibleIndex();
            }
            /* Snap: index from scrollend / IntersectionObserver; keep goTo() current for arrows. */
            updateFraction();
          }, isSplitCssSnapMq() ? 90 : 520);
          updateProgress();
          return;
        }
        var el = getScrollEl();
        el.scrollTo({ left: current * cardStep(), behavior: "smooth" });
        updateProgress();
      }

      function syncFromScroll() {
        if (isSplitShowcase) {
          if (splitProgrammaticScroll) {
            return;
          }
          if (splitPointerDragging && !isSplitCssSnapMq()) {
            return;
          }
          if (isSplitCssSnapMq()) {
            return;
          }
          current = splitMostVisibleIndex();
          updateFraction();
          scheduleSplitViewportSettle();
          return;
        }
        var el = getScrollEl();
        var step = cardStep();
        if (!step) return;
        var max = maxIndex();
        current = Math.min(Math.max(Math.round(el.scrollLeft / step), 0), max);
        updateProgress();
      }

      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          goTo(current - 1);
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          goTo(current + 1);
        });
      }

      track.addEventListener("scroll", syncFromScroll, { passive: true });
      if (viewport && viewport !== track) {
        if (!isSplitShowcase || !isSplitCssSnapMq()) {
          viewport.addEventListener("scroll", syncFromScroll, { passive: true });
        }
        if (isSplitShowcase) {
          viewport.addEventListener(
            "scrollend",
            function () {
              if (splitProgrammaticScroll) {
                return;
              }
              if (isSplitCssSnapMq()) {
                current = splitMostVisibleIndex();
                updateFraction();
                return;
              }
              current = splitMostVisibleIndex();
              splitAlignCard(current, false);
              updateFraction();
            },
            { passive: true }
          );
        }
      }

      /* Snap tablets/phones: observe slides — no per-scroll JS (matches Sleek testimonials + swipe-mobile feel). */
      if (
        isSplitShowcase &&
        viewport &&
        typeof window.IntersectionObserver !== "undefined"
      ) {
        splitSnapIo = new IntersectionObserver(
          function () {
            if (splitProgrammaticScroll || !isSplitCssSnapMq()) {
              return;
            }
            if (splitSnapIoRaf) {
              window.cancelAnimationFrame(splitSnapIoRaf);
            }
            splitSnapIoRaf = window.requestAnimationFrame(function () {
              splitSnapIoRaf = null;
              if (splitProgrammaticScroll || !isSplitCssSnapMq()) {
                return;
              }
              var idx = splitMostVisibleIndex();
              if (idx !== current) {
                current = idx;
                updateFraction();
              }
            });
          },
          {
            root: viewport,
            rootMargin: "0px",
            threshold: [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1],
          }
        );
        for (var si = 0; si < cards.length; si++) {
          splitSnapIo.observe(cards[si]);
        }
      }

      /* Stop browser dragging link preview / ghost images inside the horizontal strip (desktop + touch). */
      if (isSplitShowcase && viewport) {
        section.addEventListener(
          "dragstart",
          function (e) {
            var t = e.target;
            if (!viewport.contains(t)) {
              return;
            }
            if (t.closest && (t.closest("img") || t.closest("a[href]"))) {
              e.preventDefault();
            }
          },
          true
        );
      }

      /* Pointer drag: desktop wide screens; tablet/phone split = native pan + CSS snap only */
      if (!isMobile() && !(isSplitShowcase && isSplitCssSnapMq())) {
        var dragStartX = 0;
        var dragScrollLeft = 0;
        var isPointerDown = false;
        var hasDragged = false;
        var suppressClickUntil = 0;
        var activePointerId = null;
        var dragSensitivity = isSplitShowcase ? 1.52 : 1.12;

        function isClickSuppressed() {
          return Date.now() < suppressClickUntil;
        }

        function suppressClickFor(ms) {
          suppressClickUntil = Date.now() + ms;
        }

        function dragScrollEl() {
          return getScrollEl();
        }

        function onDragPointerDown(evt) {
          if (isPointerDown) {
            return;
          }
          if (evt.pointerType === "mouse" && evt.button !== 0) {
            return;
          }
          if (!evt.isPrimary) {
            return;
          }
          var el = dragScrollEl();
          isPointerDown = true;
          hasDragged = false;
          activePointerId = evt.pointerId;
          splitPointerDragging = !!isSplitShowcase;
          dragStartX = evt.clientX;
          dragScrollLeft = el.scrollLeft;
          try {
            el.setPointerCapture(evt.pointerId);
          } catch (e) {
            /* ignore */
          }
          el.addEventListener("pointermove", onDragPointerMove);
          el.addEventListener("pointerup", onDragPointerUp);
          el.addEventListener("pointercancel", onDragPointerUp);
          evt.preventDefault();
        }

        function onDragPointerMove(evt) {
          if (!isPointerDown || evt.pointerId !== activePointerId) {
            return;
          }
          var el = dragScrollEl();
          var dx = evt.clientX - dragStartX;
          if (Math.abs(dx) > 2) {
            if (!hasDragged && isSplitShowcase && viewport) {
              viewport.classList.add("ps-plist-viewport--dragging");
            }
            hasDragged = true;
            if (evt.pointerType === "mouse") {
              evt.preventDefault();
            }
          }
          el.scrollLeft = dragScrollLeft - dx * dragSensitivity;
        }

        function onDragPointerUp(evt) {
          if (evt.pointerId !== activePointerId) {
            return;
          }
          var el = dragScrollEl();
          var didDrag = hasDragged;
          isPointerDown = false;
          activePointerId = null;
          splitPointerDragging = false;
          if (hasDragged) {
            suppressClickFor(280);
            hasDragged = false;
          }
          try {
            el.releasePointerCapture(evt.pointerId);
          } catch (e) {
            /* ignore */
          }
          if (isSplitShowcase && viewport) {
            viewport.classList.remove("ps-plist-viewport--dragging");
          }
          el.removeEventListener("pointermove", onDragPointerMove);
          el.removeEventListener("pointerup", onDragPointerUp);
          el.removeEventListener("pointercancel", onDragPointerUp);
          syncFromScroll();
          if (isSplitShowcase && viewport && didDrag) {
            splitSnapAfterDrag();
          }
        }

        var dragListenEl = isSplitShowcase && viewport ? viewport : track;
        dragListenEl.addEventListener("pointerdown", onDragPointerDown, true);

        section.addEventListener(
          "click",
          function (evt) {
            if (!isClickSuppressed()) return;
            var target = evt.target;
            if (!target || !target.closest) return;
            var link = target.closest("a[href]");
            if (!link || !section.contains(link)) return;
            evt.preventDefault();
            evt.stopPropagation();
          },
          true
        );
      }

      var plistResizeTimer = null;
      window.addEventListener("resize", function () {
        clearTimeout(plistResizeTimer);
        plistResizeTimer = window.setTimeout(function () {
          plistResizeTimer = null;
          if (isSplitShowcase && isSplitCssSnapMq() && viewport) {
            current = Math.min(
              Math.max(splitMostVisibleIndex(), 0),
              maxIndex()
            );
            updateFraction();
            return;
          }
          goTo(current);
        }, 220);
      });

      updateProgress();

      if (isSplitShowcase && viewport) {
        window.requestAnimationFrame(function () {
          if (isSplitCssSnapMq()) {
            current = splitMostVisibleIndex();
            updateFraction();
            return;
          }
          splitProgrammaticScroll = true;
          splitAlignCard(0, false);
          current = 0;
          window.requestAnimationFrame(function () {
            splitProgrammaticScroll = false;
            updateFraction();
          });
        });
      }
    });
  }

  /**
   * Shared desktop behavior for horizontal “snap” carousels (categories, reviews, future blocks).
   * Below the media query: no listeners — mobile uses CSS overflow-x + scroll-snap only.
   *
   * @param {Object} cfg
   * @param {string} cfg.rootSelector - Section root, e.g. '[data-ps-cat-showcase]'
   * @param {string} cfg.initAttr - Dedupe flag, e.g. 'data-ps-cat-showcase-init'
   * @param {string} cfg.trackSelector - Scrollable element, e.g. '[data-ps-cat-carousel]'
   * @param {string} cfg.prevSelector
   * @param {string} cfg.nextSelector
   * @param {string} cfg.cardSelector - Slide selector scoped under track, e.g. '.category-card'
   * @param {string} [cfg.desktopMediaQuery] - Default '(min-width: 1025px)'
   * @param {boolean} [cfg.alwaysBindArrows] - If true, prev/next work at all widths (list-products); desktop-only drag still uses desktopMediaQuery.
   * @param {number} [cfg.dragSensitivity] - Horizontal scroll multiplier vs pointer delta (default 1.65).
   * @param {number} [cfg.dragThresholdPx] - Min horizontal movement (px) before a gesture counts as drag for click-suppression (default 2).
   */
  function initPrestigeSnapCarouselGroup(cfg) {
    var rootSelector = cfg.rootSelector;
    var initAttr = cfg.initAttr;
    var trackSelector = cfg.trackSelector;
    var prevSelector = cfg.prevSelector;
    var nextSelector = cfg.nextSelector;
    var cardSelector = cfg.cardSelector;
    var mqString = cfg.desktopMediaQuery || "(min-width: 1025px)";
    var alwaysBindArrows = !!cfg.alwaysBindArrows;
    var dragSensitivity =
      typeof cfg.dragSensitivity === "number" && cfg.dragSensitivity > 0
        ? cfg.dragSensitivity
        : 1.65;
    var dragThresholdPx =
      typeof cfg.dragThresholdPx === "number" && cfg.dragThresholdPx >= 0
        ? cfg.dragThresholdPx
        : 2;

    document.querySelectorAll(rootSelector).forEach(function (root) {
      if (root.getAttribute(initAttr)) {
        return;
      }
      root.setAttribute(initAttr, "1");

      var track = root.querySelector(trackSelector);
      var prevBtn = root.querySelector(prevSelector);
      var nextBtn = root.querySelector(nextSelector);
      if (!track) {
        return;
      }

      var mql =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia(mqString)
          : { matches: false };

      var teardownDesktop = null;

      function cardStep() {
        var cards = track.querySelectorAll(cardSelector);
        if (!cards.length) return 0;
        if (cards.length < 2) {
          return cards[0].getBoundingClientRect().width;
        }
        var a = cards[0].getBoundingClientRect();
        var b = cards[1].getBoundingClientRect();
        return Math.abs(b.left - a.left);
      }

      function scrollByStep(dir) {
        var step = cardStep();
        if (!step) return;
        track.scrollBy({ left: dir * step, behavior: "smooth" });
      }

      function onPrev() {
        scrollByStep(-1);
      }
      function onNext() {
        scrollByStep(1);
      }

      function bindDesktop() {
        if (teardownDesktop) return;

        if (!alwaysBindArrows) {
          if (prevBtn) prevBtn.addEventListener("click", onPrev);
          if (nextBtn) nextBtn.addEventListener("click", onNext);
        }

        var dragStartX = 0;
        var dragScrollLeft = 0;
        var isPointerDown = false;
        var hasDragged = false;
        var suppressClickUntil = 0;
        var activePointerId = null;

        function isClickSuppressed() {
          return Date.now() < suppressClickUntil;
        }
        function suppressClickFor(ms) {
          suppressClickUntil = Date.now() + ms;
        }

        function onTrackPointerDown(evt) {
          if (evt.pointerType !== "mouse" || evt.button !== 0) {
            return;
          }
          if (!evt.isPrimary) {
            return;
          }
          isPointerDown = true;
          hasDragged = false;
          dragStartX = evt.clientX;
          dragScrollLeft = track.scrollLeft;
          activePointerId = evt.pointerId;
          evt.preventDefault();
          try {
            track.setPointerCapture(evt.pointerId);
          } catch (e) {
            /* ignore */
          }
          track.addEventListener("pointermove", onTrackPointerMove);
          track.addEventListener("pointerup", onTrackPointerUp);
          track.addEventListener("pointercancel", onTrackPointerUp);
        }
        function onTrackPointerMove(evt) {
          if (!isPointerDown || evt.pointerId !== activePointerId) {
            return;
          }
          var rawDx = evt.clientX - dragStartX;
          if (Math.abs(rawDx) > dragThresholdPx) {
            hasDragged = true;
          }
          var dx = rawDx * dragSensitivity;
          track.scrollLeft = dragScrollLeft - dx;
        }
        function onTrackPointerUp(evt) {
          if (evt.pointerId !== activePointerId) {
            return;
          }
          isPointerDown = false;
          activePointerId = null;
          if (hasDragged) {
            suppressClickFor(280);
            hasDragged = false;
          }
          try {
            track.releasePointerCapture(evt.pointerId);
          } catch (e) {
            /* ignore */
          }
          track.removeEventListener("pointermove", onTrackPointerMove);
          track.removeEventListener("pointerup", onTrackPointerUp);
          track.removeEventListener("pointercancel", onTrackPointerUp);
        }
        function onTrackWheel(evt) {
          if (Math.abs(evt.deltaX) > 4 || Math.abs(evt.deltaY) > 4) {
            suppressClickFor(180);
          }
        }
        function onSectionClickCapture(evt) {
          if (!isClickSuppressed()) return;
          var target = evt.target;
          if (!target || !target.closest) return;
          var link = target.closest("a[href]");
          if (!link || !root.contains(link)) return;
          evt.preventDefault();
          evt.stopPropagation();
        }

        track.addEventListener("pointerdown", onTrackPointerDown, true);
        track.addEventListener("wheel", onTrackWheel, { passive: true });
        root.addEventListener("click", onSectionClickCapture, true);

        teardownDesktop = function () {
          if (!alwaysBindArrows) {
            if (prevBtn) prevBtn.removeEventListener("click", onPrev);
            if (nextBtn) nextBtn.removeEventListener("click", onNext);
          }
          track.removeEventListener("pointerdown", onTrackPointerDown, true);
          track.removeEventListener("wheel", onTrackWheel);
          track.removeEventListener("pointermove", onTrackPointerMove);
          track.removeEventListener("pointerup", onTrackPointerUp);
          track.removeEventListener("pointercancel", onTrackPointerUp);
          root.removeEventListener("click", onSectionClickCapture, true);
          teardownDesktop = null;
        };
      }

      function unbindDesktop() {
        if (teardownDesktop) teardownDesktop();
      }

      function applyBreakpoint() {
        if (mql.matches) {
          bindDesktop();
        } else {
          unbindDesktop();
        }
      }

      if (alwaysBindArrows) {
        if (prevBtn) prevBtn.addEventListener("click", onPrev);
        if (nextBtn) nextBtn.addEventListener("click", onNext);
      }

      applyBreakpoint();

      if (mql.addEventListener) {
        mql.addEventListener("change", applyBreakpoint);
      } else if (mql.addListener) {
        mql.addListener(applyBreakpoint);
      }

      window.addEventListener("resize", applyBreakpoint);
    });
  }

  /** list-products split: same scroll contract as categories showcase (track + flex + snap; arrows all widths). */
  function initPrestigeListProductsShowcaseCarousel() {
    initPrestigeSnapCarouselGroup({
      rootSelector: "[data-ps-plist-showcase]",
      initAttr: "data-ps-plist-showcase-init",
      trackSelector: "[data-ps-plist-carousel]",
      prevSelector: "[data-ps-plist-prev]",
      nextSelector: "[data-ps-plist-next]",
      cardSelector: "[data-ps-plist-card]",
      alwaysBindArrows: true,
      dragSensitivity: 2.85,
      dragThresholdPx: 2,
    });

    document.querySelectorAll("[data-ps-plist-showcase]").forEach(function (root) {
      if (root.getAttribute("data-ps-plist-fraction-init")) {
        return;
      }

      var track = root.querySelector("[data-ps-plist-carousel]");
      var fracCurrent = root.querySelector("[data-ps-plist-frac-current]");
      var fracTotal = root.querySelector("[data-ps-plist-frac-total]");
      if (!track) {
        return;
      }

      var cards = track.querySelectorAll("[data-ps-plist-card]");
      if (!cards.length) {
        return;
      }

      root.setAttribute("data-ps-plist-fraction-init", "1");
      root.setAttribute("data-ps-plist-init", "1");

      if (!fracCurrent) {
        return;
      }

      if (fracTotal) {
        fracTotal.textContent = String(cards.length);
      }

      function cardStepForFraction() {
        if (cards.length < 2) {
          return cards[0].getBoundingClientRect().width;
        }
        var a = cards[0].getBoundingClientRect();
        var b = cards[1].getBoundingClientRect();
        return Math.abs(b.left - a.left);
      }

      function syncFractionFromScroll() {
        var step = cardStepForFraction();
        if (!step) return;
        var idx = Math.round(track.scrollLeft / step);
        idx = Math.min(Math.max(idx, 0), cards.length - 1);
        fracCurrent.textContent = String(idx + 1);
      }

      root.addEventListener(
        "dragstart",
        function (e) {
          var t = e.target;
          if (!track.contains(t)) {
            return;
          }
          if (t.closest && (t.closest("img") || t.closest("a[href]"))) {
            e.preventDefault();
          }
        },
        true
      );

      track.addEventListener("scroll", syncFractionFromScroll, { passive: true });
      try {
        track.addEventListener("scrollend", syncFractionFromScroll, {
          passive: true,
        });
      } catch (e) {
        /* scrollend unsupported */
      }
      window.addEventListener("resize", syncFractionFromScroll, { passive: true });
      window.requestAnimationFrame(syncFractionFromScroll);
    });
  }

  function initPrestigeHotCardCarousel() {
    initPrestigeSnapCarouselGroup({
      rootSelector: "[data-ps-hot-cards]",
      initAttr: "data-ps-hot-cards-scroll-init",
      trackSelector: "[data-ps-hot-cards-track]",
      prevSelector: "[data-ps-hot-cards-prev]",
      nextSelector: "[data-ps-hot-cards-next]",
      cardSelector: "[data-ps-hot-cards-slide]",
      alwaysBindArrows: true,
      dragSensitivity: 2.2,
      dragThresholdPx: 2,
    });

    document.querySelectorAll("[data-ps-hot-cards]").forEach(function (root) {
      if (root.getAttribute("data-ps-hot-cards-dots-init")) {
        return;
      }
      var track = root.querySelector("[data-ps-hot-cards-track]");
      var dots = root.querySelectorAll("[data-ps-hot-cards-go]");
      if (!track || !dots.length) {
        return;
      }
      root.setAttribute("data-ps-hot-cards-dots-init", "1");

      var slides = track.querySelectorAll("[data-ps-hot-cards-slide]");
      function cardStep() {
        if (!slides.length) {
          return 0;
        }
        if (slides.length < 2) {
          return slides[0].getBoundingClientRect().width;
        }
        var a = slides[0].getBoundingClientRect();
        var b = slides[1].getBoundingClientRect();
        return Math.abs(b.left - a.left);
      }

      function setActive(idx) {
        idx = Math.max(0, Math.min(dots.length - 1, idx));
        dots.forEach(function (dot, i) {
          var on = i === idx;
          dot.classList.toggle("ps-hot-cards__dot--active", on);
          dot.setAttribute("aria-current", on ? "true" : "false");
        });
      }

      function syncFromScroll() {
        var step = cardStep();
        if (!step) {
          return;
        }
        var idx = Math.round(track.scrollLeft / step);
        setActive(idx);
      }

      var raf = 0;
      track.addEventListener(
        "scroll",
        function () {
          if (raf) {
            return;
          }
          raf = window.requestAnimationFrame(function () {
            raf = 0;
            syncFromScroll();
          });
        },
        { passive: true }
      );
      try {
        track.addEventListener("scrollend", syncFromScroll, { passive: true });
      } catch (eScrollEnd) {
        /* unsupported */
      }
      window.addEventListener("resize", syncFromScroll, { passive: true });

      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          var raw = dot.getAttribute("data-ps-hot-cards-go");
          var idx = parseInt(raw, 10);
          if (isNaN(idx)) {
            return;
          }
          var step = cardStep();
          if (!step) {
            return;
          }
          track.scrollTo({ left: idx * step, behavior: "smooth" });
          setActive(idx);
        });
      });

      window.requestAnimationFrame(syncFromScroll);
    });
  }

  function initPrestigeCategoryShowcase() {
    initPrestigeSnapCarouselGroup({
      rootSelector: "[data-ps-cat-showcase]",
      initAttr: "data-ps-cat-showcase-init",
      trackSelector: "[data-ps-cat-carousel]",
      prevSelector: "[data-ps-cat-prev]",
      nextSelector: "[data-ps-cat-next]",
      cardSelector: ".category-card",
    });
  }

  function initPrestigeCustomerReviewsCarousel() {
    initPrestigeSnapCarouselGroup({
      rootSelector: "[data-ps-rev-showcase]",
      initAttr: "data-ps-rev-showcase-init",
      trackSelector: "[data-ps-rev-carousel]",
      prevSelector: "[data-ps-rev-prev]",
      nextSelector: "[data-ps-rev-next]",
      cardSelector: ".ps-rev-carousel__card",
    });
  }

  function initPrestigeFaqSplitShowcase() {
    document.querySelectorAll("[data-ps-faq-split]").forEach(function (root) {
      if (root.getAttribute("data-ps-faq-split-init")) {
        return;
      }
      root.setAttribute("data-ps-faq-split-init", "1");
      root.addEventListener("click", function (evt) {
        var btn = evt.target.closest("[data-faq-split-trigger]");
        if (!btn || !root.contains(btn)) {
          return;
        }
        var item = btn.closest("[data-faq-split-item]");
        if (!item) {
          return;
        }
        var wasOpen = item.classList.contains("is-open");
        root.querySelectorAll("[data-faq-split-item]").forEach(function (row) {
          row.classList.remove("is-open");
          var t = row.querySelector("[data-faq-split-trigger]");
          var p = row.querySelector(".faq-split-showcase__panel");
          if (t) {
            t.setAttribute("aria-expanded", "false");
          }
          if (p) {
            p.setAttribute("hidden", "");
          }
        });
        if (!wasOpen) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
          var panel = item.querySelector(".faq-split-showcase__panel");
          if (panel) {
            panel.removeAttribute("hidden");
          }
        }
      });
    });
  }

  function initRelatedProductsCarousel() {
    document.querySelectorAll(".ab-plist--related").forEach(function (section) {
      if (section.dataset.abPlistInit === "1") return;
      var track = section.querySelector(".ab-plist-track");
      var prev = section.querySelector(".ab-plist-prev");
      var next = section.querySelector(".ab-plist-next");
      if (!track || !prev || !next) return;

      function scrollAmount() {
        var card = track.querySelector(".ab-plist-card");
        var gap = 10;
        var w = card ? card.getBoundingClientRect().width + gap : 280;
        return Math.max(140, Math.min(track.clientWidth * 0.85, w * 2));
      }

      function rtlFactor() {
        return getComputedStyle(section).direction === "rtl" ? -1 : 1;
      }

      prev.addEventListener("click", function () {
        var amt = scrollAmount() * rtlFactor();
        track.scrollBy({ left: -amt, behavior: "smooth" });
      });
      next.addEventListener("click", function () {
        var amt = scrollAmount() * rtlFactor();
        track.scrollBy({ left: amt, behavior: "smooth" });
      });

      section.dataset.abPlistInit = "1";
    });
  }

  function initLegacyGallery() {
    document.querySelectorAll(".ab-gallery").forEach(function (gallery) {
      if (gallery.dataset.galleryInit) return;
      gallery.dataset.galleryInit = "1";

      var slider = gallery.querySelector("[data-ab-gallery-slider]");
      var slides = gallery.querySelectorAll(".ab-gallery-slide");
      var thumbs = gallery.querySelectorAll(".ab-gallery-thumb");
      var dots = gallery.querySelectorAll(".ab-gallery-dot");
      var images = [];

      function syncDots(idx) {
        if (!dots.length) return;
        dots.forEach(function (d, i) {
          var on = i === idx;
          d.classList.toggle("is-active", on);
          d.setAttribute("aria-selected", on ? "true" : "false");
        });
      }

      thumbs.forEach(function (thumb) {
        if (thumb.dataset.src) {
          images.push(thumb.dataset.src);
        }
      });

      if (images.length === 0) {
        gallery.querySelectorAll(".ab-gallery-cell[data-src]").forEach(function (cell) {
          if (cell.dataset.src) {
            images.push(cell.dataset.src);
          }
        });
      }

      if (images.length === 0 && slides.length) {
        slides.forEach(function (slide) {
          if (slide.dataset.src) {
            images.push(slide.dataset.src);
          }
        });
      }

      function getActiveMediaIndex() {
        var activeSlide = gallery.querySelector(".ab-gallery-slide.is-active");
        if (activeSlide && activeSlide.dataset.src) {
          var k = images.indexOf(activeSlide.dataset.src);
          if (k !== -1) return k;
        }
        var activeCell = gallery.querySelector(".ab-gallery-cell.ab-gallery-cell--active");
        if (activeCell) {
          var ac = activeCell.getAttribute("data-thumb-index");
          if (ac !== null && ac !== "") {
            var acn = parseInt(ac, 10);
            if (!Number.isNaN(acn) && acn >= 0 && acn < images.length) {
              return acn;
            }
          }
        }
        var mainEl = gallery.querySelector("#gallery-main-image");
        if (mainEl && mainEl.src) {
          var i = images.indexOf(mainEl.src);
          if (i !== -1) return i;
        }
        for (var j = 0; j < slides.length; j++) {
          if (slides[j].classList.contains("is-active")) return j;
        }
        return 0;
      }

      function syncGridCells(idx) {
        gallery.querySelectorAll(".ab-gallery-cell").forEach(function (cell) {
          var ci = cell.getAttribute("data-thumb-index");
          var cin = ci !== null && ci !== "" ? parseInt(ci, 10) : NaN;
          cell.classList.toggle("ab-gallery-cell--active", !Number.isNaN(cin) && cin === idx);
        });
      }

      function syncMainMobileFromIndex(idx) {
        if (slides.length || !images.length) return;
        var src = images[idx];
        if (!src || String(src).indexOf(".mp4") !== -1) return;
        var mainImg = gallery.querySelector(".ab-gallery-mobile #gallery-main-image");
        if (mainImg && mainImg.tagName === "IMG") {
          mainImg.src = src;
        }
      }

      function syncSlideMedia(idx) {
        slides.forEach(function (slide, i) {
          slide.classList.toggle("is-active", i === idx);
        });
        var slide = slides[idx];
        if (!slide) return;
        var media = slide.querySelector(".ab-gallery-main-media");
        if (media && media.tagName === "IMG" && !media.id) {
          var prev = gallery.querySelector("#gallery-main-image");
          if (prev && prev !== media) {
            prev.removeAttribute("id");
          }
          media.id = "gallery-main-image";
        }
      }

      function isStackLayout() {
        return typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1024px)").matches;
      }

      function scrollSliderToIndex(idx, instant) {
        if (!slider || !slides.length) return;
        if (isStackLayout()) return;
        var w = slider.clientWidth;
        if (w <= 0) return;
        slider.scrollTo({
          left: idx * w,
          behavior: instant ? "auto" : "smooth",
        });
      }

      function scrollStackToIndex(idx, instant) {
        if (!isStackLayout() || !slides.length) return;
        var slide = slides[idx];
        if (!slide) return;
        slide.scrollIntoView({
          behavior: instant ? "auto" : "smooth",
          block: "center",
        });
      }

      var stackObserver = null;

      function bindStackObserver() {
        if (!slides.length) return;
        if (!isStackLayout()) {
          if (stackObserver) {
            stackObserver.disconnect();
            stackObserver = null;
          }
          return;
        }
        if (!stackObserver) {
          stackObserver = new IntersectionObserver(
            function (entries) {
              var best = null;
              var bestRatio = 0;
              for (var i = 0; i < entries.length; i++) {
                var en = entries[i];
                if (en.isIntersecting && en.intersectionRatio > bestRatio) {
                  bestRatio = en.intersectionRatio;
                  best = en.target;
                }
              }
              if (!best || best.dataset.slideIndex === undefined) return;
              var ix = parseInt(best.getAttribute("data-slide-index"), 10);
              if (Number.isNaN(ix) || ix < 0 || ix >= images.length) return;
              thumbs.forEach(function (t) {
                t.classList.toggle("ab-active", thumbIndex(t) === ix);
              });
              syncGridCells(ix);
              syncDots(ix);
              syncSlideMedia(ix);
              syncMainMobileFromIndex(ix);
              var src = images[ix];
              if (src) {
                gallery.dispatchEvent(
                  new CustomEvent("gallery-change", { bubbles: true, detail: { src: src } })
                );
              }
            },
            { root: null, rootMargin: "-10% 0px -48% 0px", threshold: [0.12, 0.28, 0.45, 0.62] }
          );
        } else {
          stackObserver.disconnect();
        }
        for (var s = 0; s < slides.length; s++) {
          stackObserver.observe(slides[s]);
        }
      }

      function setActiveIndex(idx) {
        if (!images.length) return;
        idx = ((idx % images.length) + images.length) % images.length;
        var src = images[idx];
        if (!src) return;
        thumbs.forEach(function (t) {
          t.classList.toggle("ab-active", thumbIndex(t) === idx);
        });
        syncGridCells(idx);
        syncDots(idx);
        syncSlideMedia(idx);
        syncMainMobileFromIndex(idx);
        if (isStackLayout()) {
          scrollStackToIndex(idx, false);
        } else {
          scrollSliderToIndex(idx, false);
        }
        gallery.dispatchEvent(
          new CustomEvent("gallery-change", { bubbles: true, detail: { src: src } })
        );
      }

      function thumbIndex(thumb) {
        var n = thumb.dataset.thumbIndex;
        if (n !== undefined && n !== "") {
          return parseInt(n, 10);
        }
        var ds = thumb.dataset.src;
        return images.indexOf(ds);
      }

      var scrollT = null;
      function onSliderScroll() {
        if (!slider || window.innerWidth > 768) return;
        if (scrollT) clearTimeout(scrollT);
        scrollT = setTimeout(function () {
          scrollT = null;
          var w = slider.clientWidth;
          if (w <= 0) return;
          var idx = Math.round(slider.scrollLeft / w);
          if (idx < 0 || idx >= slides.length) return;
          syncSlideMedia(idx);
          thumbs.forEach(function (t) {
            t.classList.toggle("ab-active", thumbIndex(t) === idx);
          });
          syncGridCells(idx);
          syncDots(idx);
          syncMainMobileFromIndex(idx);
          var src = images[idx];
          if (src) {
            gallery.dispatchEvent(
              new CustomEvent("gallery-change", { bubbles: true, detail: { src: src } })
            );
          }
        }, 80);
      }

      if (slider) {
        slider.addEventListener("scroll", onSliderScroll, { passive: true });
      }

      window.addEventListener("resize", function () {
        bindStackObserver();
        if (slider && window.innerWidth <= 768) {
          var idx = getActiveMediaIndex();
          scrollSliderToIndex(idx, true);
        }
      });

      thumbs.forEach(function (thumb) {
        thumb.addEventListener("click", function () {
          var idx = thumbIndex(thumb);
          if (idx < 0 || idx >= images.length) return;
          setActiveIndex(idx);
        });
      });

      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          var di = dot.getAttribute("data-dot-index");
          var idx = di !== null && di !== "" ? parseInt(di, 10) : NaN;
          if (Number.isNaN(idx) || idx < 0 || idx >= images.length) return;
          setActiveIndex(idx);
        });
      });

      document.querySelectorAll("body > .ab-lightbox").forEach(function (el) {
        el.remove();
      });

      var lightbox = gallery.querySelector("[data-lightbox]");
      if (lightbox) {
        document.body.appendChild(lightbox);
      }

      var lbImg = lightbox && lightbox.querySelector("[data-lightbox-img]");
      var lbCounter = lightbox && lightbox.querySelector("[data-lightbox-counter]");
      var lbIndex = 0;

      function showLbImage(idx) {
        lbIndex = ((idx % images.length) + images.length) % images.length;
        if (lbImg) lbImg.src = images[lbIndex];
        if (lbCounter) lbCounter.textContent = lbIndex + 1 + " / " + images.length;
      }

      function openLightboxFromTrigger(trigger) {
        if (!lightbox || images.length === 0) return;
        var idx = getActiveMediaIndex();
        if (idx < 0) idx = 0;
        var slide = trigger.closest && trigger.closest(".ab-gallery-slide");
        if (slide) {
          var si = slide.getAttribute("data-slide-index");
          if (si !== null && si !== "") {
            var parsed = parseInt(si, 10);
            if (!Number.isNaN(parsed) && parsed >= 0 && parsed < images.length) {
              idx = parsed;
            }
          }
        }
        var mixCell = trigger.closest && trigger.closest(".ab-gallery-cell");
        if (mixCell) {
          var mi = mixCell.getAttribute("data-thumb-index");
          if (mi !== null && mi !== "") {
            var pm = parseInt(mi, 10);
            if (!Number.isNaN(pm) && pm >= 0 && pm < images.length) {
              idx = pm;
            }
          }
        }
        showLbImage(idx);
        lightbox.classList.add("ab-open");
        document.body.style.overflow = "hidden";
      }

      gallery.querySelectorAll("[data-gallery-open]").forEach(function (trigger) {
        trigger.addEventListener("click", function (e) {
          if (e.target.closest && e.target.closest("video") && !trigger.classList.contains("ab-gallery-zoom"))
            return;
          var mixCell = trigger.closest && trigger.closest(".ab-gallery-cell");
          if (mixCell) {
            var mi = mixCell.getAttribute("data-thumb-index");
            if (mi !== null && mi !== "") {
              var pm = parseInt(mi, 10);
              if (!Number.isNaN(pm)) {
                setActiveIndex(pm);
              }
            }
          }
          e.preventDefault();
          openLightboxFromTrigger(trigger);
        });
      });

      if (lightbox) {
        lightbox.addEventListener("click", function (e) {
          var target = e.target;
          if (target.closest("[data-lightbox-close]")) {
            lightbox.classList.remove("ab-open");
            document.body.style.overflow = "";
            return;
          }
          if (target.closest("[data-lightbox-prev]")) {
            showLbImage(lbIndex - 1);
            return;
          }
          if (target.closest("[data-lightbox-next]")) {
            showLbImage(lbIndex + 1);
          }
        });
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          bindStackObserver();
          if (slider && window.innerWidth <= 768 && slides.length) {
            var ri = getActiveMediaIndex();
            scrollSliderToIndex(ri, true);
            syncDots(ri);
          } else if (dots.length) {
            syncDots(getActiveMediaIndex());
          }
        });
      });
    });
  }

  function initLegacyGalleryKeyboard() {
    if (window.__psGalleryKeyInit) return;
    window.__psGalleryKeyInit = true;

    document.addEventListener("keydown", function (e) {
      var lb = document.querySelector("body > .ab-lightbox.ab-open");
      if (!lb) return;

      if (e.key === "Escape") {
        lb.classList.remove("ab-open");
        document.body.style.overflow = "";
        return;
      }
      if (e.key === "ArrowLeft") {
        var prev = lb.querySelector("[data-lightbox-prev]");
        if (prev) prev.click();
        return;
      }
      if (e.key === "ArrowRight") {
        var next = lb.querySelector("[data-lightbox-next]");
        if (next) next.click();
      }
    });
  }

  function initLegacyReviews() {
    document.querySelectorAll(".ab-reviews, .ps-rev-section").forEach(function (section) {
      if (section.getAttribute("data-reviews-init")) return;
      section.setAttribute("data-reviews-init", "1");

      var readMoreLabel =
        section.getAttribute("data-reviews-read-more") || "...Read more";
      var showLessLabel =
        section.getAttribute("data-reviews-show-less") || "Show less";

      section.querySelectorAll("[data-review-comment]").forEach(function (el) {
        var readMore = document.createElement("button");
        readMore.className = "ab-review-read-more";
        readMore.type = "button";
        readMore.textContent = readMoreLabel;
        el.parentNode.insertBefore(readMore, el.nextSibling);

        requestAnimationFrame(function () {
          if (el.scrollHeight > el.clientHeight + 2) {
            readMore.classList.add("ab-visible");
          }
        });

        readMore.addEventListener("click", function () {
          if (el.classList.contains("ab-review-expanded")) {
            el.classList.remove("ab-review-expanded");
            readMore.textContent = readMoreLabel;
          } else {
            el.classList.add("ab-review-expanded");
            readMore.textContent = showLessLabel;
          }
        });
      });
    });
  }

  function parsePromoCountdownEndMs(endRaw) {
    var s = String(endRaw || "").trim();
    if (!s) {
      return NaN;
    }
    /* Normalize fancy dashes / spaces from copy-paste or RTL inputs */
    s = s
      .replace(/\u00a0/g, " ")
      .replace(/[\u2013\u2014\u2212]/g, "-")
      .trim();

    /* Legacy: real ISO timestamps only (must contain T + clock). Do NOT match plain d-m-y:
       e.g. "1-5-2026" was wrongly routed here because "-2026" satisfied [+-]\d{2}:?\d{2}$
       → Date.parse() used US month/day rules. */
    if (/T\s*\d/.test(s)) {
      var legacy = Date.parse(s);
      return isFinite(legacy) ? legacy : NaN;
    }

    /* Calendar day (no clock): merchant format is always day-month-year — last segment = 4-digit year */
    var parts = s.split(/[-/.\s]+/).filter(function (p) {
      return p.length > 0;
    });
    if (parts.length !== 3 || !/^\d{4}$/.test(parts[2])) {
      return NaN;
    }
    var day = parseInt(parts[0], 10);
    var mo = parseInt(parts[1], 10);
    var year = parseInt(parts[2], 10);
    if (mo < 1 || mo > 12 || day < 1 || day > 31) {
      return NaN;
    }
    var dt = new Date(year, mo - 1, day, 23, 59, 59, 999);
    if (dt.getFullYear() !== year || dt.getMonth() !== mo - 1 || dt.getDate() !== day) {
      return NaN;
    }
    return dt.getTime();
  }

  function promoCountdownHeroResetDigits(timer) {
    ["days", "hours", "minutes", "seconds"].forEach(function (unit) {
      var el = timer.querySelector('[data-unit="' + unit + '"]');
      if (el) {
        el.textContent = "00";
      }
    });
  }

  function initPromoCountdownHeroTimers() {
    document.querySelectorAll('.promo-countdown-hero__timer[data-pch-mode="calendar"][data-end]').forEach(function (timer) {
      var endRaw = (timer.getAttribute("data-end") || "").trim();
      var prevEnd = timer.getAttribute("data-pch-end");
      var oldId = timer.getAttribute("data-pch-interval-id");

      if (!endRaw) {
        if (oldId) {
          clearInterval(parseInt(oldId, 10));
          timer.removeAttribute("data-pch-interval-id");
        }
        timer.removeAttribute("data-pch-end");
        promoCountdownHeroResetDigits(timer);
        return;
      }

      if (prevEnd === endRaw && oldId) {
        return;
      }

      if (oldId) {
        clearInterval(parseInt(oldId, 10));
        timer.removeAttribute("data-pch-interval-id");
      }

      var endMs = parsePromoCountdownEndMs(endRaw);
      if (!isFinite(endMs)) {
        timer.removeAttribute("data-pch-end");
        promoCountdownHeroResetDigits(timer);
        return;
      }

      timer.setAttribute("data-pch-end", endRaw);

      var daysEl = timer.querySelector('[data-unit="days"]');
      var hoursEl = timer.querySelector('[data-unit="hours"]');
      var minsEl = timer.querySelector('[data-unit="minutes"]');
      var secsEl = timer.querySelector('[data-unit="seconds"]');

      function pad(n) {
        return n < 10 ? "0" + n : String(n);
      }

      function tick() {
        var diff = Math.max(0, endMs - Date.now());
        var s = Math.floor(diff / 1000);
        var dd = Math.floor(s / 86400);
        s -= dd * 86400;
        var hh = Math.floor(s / 3600);
        s -= hh * 3600;
        var mm = Math.floor(s / 60);
        s -= mm * 60;

        if (daysEl) daysEl.textContent = pad(dd);
        if (hoursEl) hoursEl.textContent = pad(hh);
        if (minsEl) minsEl.textContent = pad(mm);
        if (secsEl) secsEl.textContent = pad(s);
      }

      tick();
      var intervalId = window.setInterval(tick, 1000);
      timer.setAttribute("data-pch-interval-id", String(intervalId));
    });
  }

  function initPromoCountdownHeroRollingTimers() {
    document.querySelectorAll('.promo-countdown-hero__timer[data-pch-mode="rolling"]').forEach(function (timer) {
      var hrs = parseFloat(timer.getAttribute("data-hours"));
      var rawKey = (timer.getAttribute("data-storage-key") || "promo-hero").trim();
      var storageKey = rawKey.replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 64) || "promo-hero";
      var sig = storageKey + "|" + String(hrs);
      var prevSig = timer.getAttribute("data-pch-roll-sig");
      var oldId = timer.getAttribute("data-pch-roll-interval-id");

      if (!isFinite(hrs) || hrs <= 0) {
        if (oldId) {
          clearInterval(parseInt(oldId, 10));
          timer.removeAttribute("data-pch-roll-interval-id");
        }
        timer.removeAttribute("data-pch-roll-sig");
        promoCountdownHeroResetDigits(timer);
        return;
      }

      if (prevSig === sig && oldId) {
        return;
      }

      if (oldId) {
        clearInterval(parseInt(oldId, 10));
        timer.removeAttribute("data-pch-roll-interval-id");
      }

      timer.setAttribute("data-pch-roll-sig", sig);

      var lsKey = "pch-promo-roll-" + storageKey + "-h" + String(hrs);
      var durationMs = hrs * 3600 * 1000;
      var remaining = durationMs;

      try {
        var stored = localStorage.getItem(lsKey);
        if (stored && Number(stored) > 60000) {
          remaining = Number(stored);
        }
      } catch (e) {}

      var end = Date.now() + remaining;

      var daysEl = timer.querySelector('[data-unit="days"]');
      var hoursEl = timer.querySelector('[data-unit="hours"]');
      var minsEl = timer.querySelector('[data-unit="minutes"]');
      var secsEl = timer.querySelector('[data-unit="seconds"]');

      function pad(n) {
        return n < 10 ? "0" + n : String(n);
      }

      function tick() {
        var diff = Math.max(0, end - Date.now());
        var tot = Math.floor(diff / 1000);
        var d = Math.floor(tot / 86400);
        tot -= d * 86400;
        var h = Math.floor(tot / 3600);
        tot -= h * 3600;
        var m = Math.floor(tot / 60);
        tot -= m * 60;
        var s = tot;

        if (daysEl) daysEl.textContent = pad(d);
        if (hoursEl) hoursEl.textContent = pad(h);
        if (minsEl) minsEl.textContent = pad(m);
        if (secsEl) secsEl.textContent = pad(s);

        try {
          localStorage.setItem(lsKey, String(diff));
        } catch (e) {}
      }

      tick();
      var rollIv = window.setInterval(function () {
        tick();
        if (end <= Date.now()) {
          clearInterval(rollIv);
          timer.removeAttribute("data-pch-roll-interval-id");
          try {
            localStorage.removeItem(lsKey);
          } catch (e) {}
        }
      }, 1000);
      timer.setAttribute("data-pch-roll-interval-id", String(rollIv));
    });
  }

  function clampPscPct(p) {
    if (!isFinite(p)) return 50;
    return Math.max(0, Math.min(100, p));
  }

  function parsePscCompareSplitPct(root) {
    if (!root) return 50;
    var cs = window.getComputedStyle(root).getPropertyValue("--psc-split").trim().replace(",", ".");
    if (cs) {
      var a = parseFloat(cs);
      if (isFinite(a)) return clampPscPct(a);
    }
    var ds = (root.getAttribute("data-psc-split") || "").trim().replace(",", ".");
    var b = parseFloat(ds);
    return isFinite(b) ? clampPscPct(b) : 50;
  }

  function initPrestigeProductCompareSliders() {
    document.querySelectorAll(".psc-compare:not([data-psc-bound])").forEach(function (root) {
      root.setAttribute("data-psc-bound", "1");

      var scene = root.querySelector(".psc-compare__scene");
      var media = root.querySelector(".psc-compare__media");
      var viewport = root.querySelector(".psc-compare__viewport");
      var handle = root.querySelector(".psc-compare__handle");
      if (!media || !handle) return;

      var track = scene || media;
      var POINTER_SLOP_TRACK = 14;
      var POINTER_SLOP_HANDLE = 5;
      var startX = 0;
      var startY = 0;
      var dragging = false;
      var gestureDecided = false;
      /** Must be true only after pointerdown on track (not spurious hover moves with startX=0). */
      var pointerArm = false;
      var slopPx = POINTER_SLOP_TRACK;

      function setSplitPct(pct) {
        pct = clampPscPct(pct);
        pct = Math.round(pct * 100) / 100;
        root.style.setProperty("--psc-split", String(pct));
        handle.setAttribute("aria-valuenow", String(Math.round(pct)));
        root.setAttribute("data-psc-split", String(pct));
      }

      function pctFromClientX(cx) {
        var rect = media.getBoundingClientRect();
        if (!(rect.width > 0)) return parsePscCompareSplitPct(root);
        return clampPscPct(((cx - rect.left) / rect.width) * 100);
      }

      function releaseCap(ev) {
        if (!ev || ev.pointerId === undefined) return;
        try {
          track.releasePointerCapture(ev.pointerId);
        } catch (e2) {}
      }

      function resetGesture(ev) {
        releaseCap(ev);
        pointerArm = false;
        dragging = false;
        gestureDecided = false;
      }

      function onPointerDown(ev) {
        if (ev.button !== undefined && ev.button !== 0) return;
        var nearLink = ev.target && ev.target.closest ? ev.target.closest("a") : null;
        if (nearLink) return;

        pointerArm = true;
        slopPx =
          handle.contains && ev.target ? (handle.contains(ev.target) ? POINTER_SLOP_HANDLE : POINTER_SLOP_TRACK) : POINTER_SLOP_TRACK;

        startX = ev.clientX;
        startY = ev.clientY;

        if (handle.contains && ev.target && handle.contains(ev.target)) {
          dragging = true;
          gestureDecided = true;
          try {
            track.setPointerCapture(ev.pointerId);
          } catch (e) {}
          setSplitPct(pctFromClientX(ev.clientX));
          return;
        }

        dragging = false;
        gestureDecided = false;
      }

      function onPointerMove(ev) {
        if (!pointerArm) return;
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        var adx = Math.abs(dx);
        var ady = Math.abs(dy);

        if (!gestureDecided && (adx > slopPx || ady > slopPx)) {
          gestureDecided = true;
          if (adx > ady) {
            dragging = true;
            try {
              track.setPointerCapture(ev.pointerId);
            } catch (e) {}
          }
        }

        if (!dragging) return;
        ev.preventDefault();
        setSplitPct(pctFromClientX(ev.clientX));
      }

      function onPointerUp(ev) {
        resetGesture(ev);
      }

      track.addEventListener("pointerdown", onPointerDown);
      track.addEventListener("pointermove", onPointerMove, { passive: false });
      track.addEventListener("pointerup", onPointerUp);
      track.addEventListener("pointercancel", onPointerUp);

      if (viewport) {
        viewport.addEventListener("keydown", function (ev) {
          if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
          ev.preventDefault();
          var cur = parsePscCompareSplitPct(root);
          var step = 2;
          if (ev.key === "ArrowLeft") setSplitPct(cur - step);
          else setSplitPct(cur + step);
        });
      }
    });
  }

  function initLegacyFakeCounters() {
    var counters = document.querySelectorAll(".ab-fake-counter");
    for (var i = 0; i < counters.length; i++) {
      var el = counters[i];
      if (el.dataset.counterInit) continue;
      el.dataset.counterInit = "1";

      (function (counter) {
        var pid = counter.dataset.productId || "";
        var hrs = parseFloat(counter.dataset.hours) || 1;
        var defaultMs = 1000 * 60 * 60 * hrs;
        var remaining = defaultMs;

        try {
          var stored = localStorage.getItem("counter-" + pid);
          if (stored && Number(stored) > 1000 * 60 * 60 * 0.1) {
            remaining = Number(stored);
          }
        } catch (e) {}

        var end = Date.now() + remaining;
        var daysEl = counter.querySelector('[data-unit="days"]');
        var hoursEl = counter.querySelector('[data-unit="hours"]');
        var minsEl = counter.querySelector('[data-unit="minutes"]');
        var secsEl = counter.querySelector('[data-unit="seconds"]');

        function pad(n) {
          return n < 10 ? "0" + n : String(n);
        }

        function tick() {
          var diff = Math.max(0, end - Date.now());
          var s = Math.floor(diff / 1000);
          var d = Math.floor(s / 86400);
          s -= d * 86400;
          var h = Math.floor(s / 3600);
          s -= h * 3600;
          var m = Math.floor(s / 60);
          s -= m * 60;

          if (daysEl) daysEl.textContent = pad(d);
          if (hoursEl) hoursEl.textContent = pad(h);
          if (minsEl) minsEl.textContent = pad(m);
          if (secsEl) secsEl.textContent = pad(s);

          try {
            localStorage.setItem("counter-" + pid, String(diff));
          } catch (e) {}

          if (diff > 0) {
            requestAnimationFrame(function () {
              setTimeout(tick, 1000);
            });
          }
        }

        tick();
      })(el);
    }
  }

  function initLegacyFakeVisitors() {
    var visitors = document.querySelectorAll(".ab-fake-visitor");
    for (var i = 0; i < visitors.length; i++) {
      var el = visitors[i];
      if (el.dataset.visitorInit) continue;
      el.dataset.visitorInit = "1";

      (function (container) {
        var min = parseInt(container.dataset.min, 10) || 10;
        var max = parseInt(container.dataset.max, 10) || 50;
        var countEl = container.querySelector(".ab-fv-count");
        if (!countEl) return;

        function rand() {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        countEl.textContent = String(rand());
        setInterval(function () {
          countEl.textContent = String(rand());
        }, 3000);
      })(el);
    }
  }

  function initLegacyDescriptionAccordion() {
    var accordions = document.querySelectorAll(".lq-desc-accordion");
    for (var i = 0; i < accordions.length; i++) {
      var acc = accordions[i];
      if (acc.dataset.descInit) continue;
      acc.dataset.descInit = "1";

      acc.addEventListener("click", function (e) {
        var btn = e.target.closest(".lq-desc-toggle");
        if (!btn) return;

        var item = btn.parentElement;
        var panel = item.querySelector(".lq-desc-panel");
        if (!panel) return;

        var isOpen = item.getAttribute("data-open") === "true";
        if (isOpen) {
          item.removeAttribute("data-open");
          btn.setAttribute("aria-expanded", "false");
          panel.style.display = "none";
        } else {
          item.setAttribute("data-open", "true");
          btn.setAttribute("aria-expanded", "true");
          panel.style.display = "block";
        }
      });
    }
  }

  function initLegacyDescriptionTabs() {
    var tabContainers = document.querySelectorAll(".lq-desc-tabs");
    for (var i = 0; i < tabContainers.length; i++) {
      var container = tabContainers[i];
      if (container.dataset.tabsInit) continue;
      container.dataset.tabsInit = "1";

      (function (el) {
        el.addEventListener("click", function (e) {
          var tab = e.target.closest(".lq-desc-tab");
          if (!tab) return;

          var key = tab.getAttribute("data-tab");
          if (!key) return;

          var allTabs = el.querySelectorAll(".lq-desc-tab");
          var allPanels = el.querySelectorAll(".lq-desc-tab-panel");

          for (var t = 0; t < allTabs.length; t++) {
            allTabs[t].classList.remove("active");
            allTabs[t].setAttribute("aria-selected", "false");
          }
          for (var p = 0; p < allPanels.length; p++) {
            allPanels[p].classList.remove("active");
          }

          tab.classList.add("active");
          tab.setAttribute("aria-selected", "true");
          var panel = el.querySelector('[data-panel="' + key + '"]');
          if (panel) {
            panel.classList.add("active");
          }
        });
      })(container);
    }
  }

  function initCollectionFiltersShell() {
    var shell = document.querySelector("[data-ps-filters-shell]");
    if (!shell || shell.getAttribute("data-ps-filters-shell-init")) return;
    shell.setAttribute("data-ps-filters-shell-init", "1");
    var mq = window.matchMedia("(max-width: 900px)");
    function sync() {
      if (mq.matches) {
        shell.removeAttribute("open");
      } else {
        shell.setAttribute("open", "");
      }
    }
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
    } else {
      window.addEventListener("resize", sync);
    }
  }

  function initCollectionFilterGroupsAccordion() {
    var groups = document.querySelectorAll("[data-ps-filter-group]");
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      if (group.getAttribute("data-ps-filter-group-init")) continue;
      group.setAttribute("data-ps-filter-group-init", "1");
      group.addEventListener("toggle", function () {
        var self = this;
        if (!self.open) return;
        var parent = self.parentElement;
        var siblings = parent
          ? parent.querySelectorAll("[data-ps-filter-group]")
          : document.querySelectorAll("[data-ps-filter-group]");
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] !== self) {
            siblings[i].removeAttribute("open");
          }
        }
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Platform Quick View uses Headless UI; tag the dialog panel so `style.css` can scope
   * Prestige PDP tokens (same classes as `.p_details_container`: .color_variation, .button_variation, …).
   */
  function initPrestigeQuickViewScope() {
    var panels = document.querySelectorAll('[id^="headlessui-dialog-panel"]');
    for (var i = 0; i < panels.length; i++) {
      var panel = panels[i];
      if (!panel || !panel.querySelector) {
        continue;
      }
      if (
        panel.querySelector(".color_variation") ||
        panel.querySelector(".button_variations_container") ||
        panel.querySelector(".button_variation")
      ) {
        panel.classList.add("ps-prestige-qv");
      }
    }
  }

  function normalizeThanksApiOrder(body) {
    if (!body || typeof body !== "object") return null;
    if (body.data && typeof body.data === "object") {
      var inner = body.data;
      if (inner.cart_items || inner.total_cost !== undefined || inner.cost !== undefined) {
        return inner;
      }
    }
    if (body.cart_items || body.total_cost !== undefined || body.cost !== undefined) {
      return body;
    }
    return null;
  }

  function getThanksOrderIdFromSearch() {
    try {
      var q = new URLSearchParams(window.location.search || "");
      return (q.get("order_id") || q.get("orderId") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function buildThanksOrderMarkup(order, cfg) {
    var items = order.cart_items;
    if (!items || !items.length) return "";

    var cur = cfg.currency || "EGP";
    var lSummary = cfg.labelOrderSummary || "Order Summary";
    var lQty = cfg.labelQty || "Qty";
    var lTotal = cfg.labelTotal || "Total";
    var lDelivery = cfg.labelDelivery || "Delivery details";

    var parts = [];
    parts.push('<div class="ps-thanks-order-items">');
    parts.push('<h3 class="ps-thanks-order-title">' + escapeHtml(lSummary) + "</h3>");
    parts.push('<ul class="ps-thanks-order-list" role="list">');

    for (var i = 0; i < items.length; i++) {
      var line = items[i];
      var name = line.product_name;
      if (!name && line.product) name = line.product.name;
      var thumb = line.product_thumb;
      if (!thumb && line.variant && line.variant.thumb) thumb = line.variant.thumb;
      if (!thumb && line.product && line.product.thumb) thumb = line.product.thumb;
      thumb = thumb || "";
      var qty = line.quantity != null ? line.quantity : "";
      var price = line.price != null ? line.price : "";

      parts.push('<li class="ps-thanks-order-item">');
      parts.push('<div class="ps-thanks-order-item-image">');
      parts.push(
        '<img class="ps-thanks-order-item-img" src="' +
          escapeHtml(thumb) +
          '" alt="' +
          escapeHtml(name || "") +
          '" loading="lazy" />'
      );
      parts.push("</div>");
      parts.push('<div class="ps-thanks-order-item-content">');
      parts.push('<p class="ps-thanks-order-item-title">' + escapeHtml(name || "") + "</p>");

      var hasOpts = line.options && line.options.length;
      var hasVp = line.variant && line.variant.variation_props && line.variant.variation_props.length;
      if (hasOpts) {
        parts.push('<div class="ps-thanks-order-item-options">');
        for (var o = 0; o < line.options.length; o++) {
          var opt = line.options[o];
          parts.push(
            '<span class="ps-thanks-order-item-option"><strong>' +
              escapeHtml(opt.variation || "") +
              ":</strong> " +
              escapeHtml(opt.value || "") +
              "</span>"
          );
        }
        parts.push("</div>");
      } else if (hasVp) {
        parts.push('<div class="ps-thanks-order-item-options">');
        var vps = line.variant.variation_props;
        for (var v = 0; v < vps.length; v++) {
          var vp = vps[v];
          parts.push(
            '<span class="ps-thanks-order-item-option"><strong>' +
              escapeHtml(vp.variation || "") +
              ":</strong> " +
              escapeHtml(vp.variation_prop || "") +
              "</span>"
          );
        }
        parts.push("</div>");
      }

      parts.push('<div class="ps-thanks-order-item-bottom">');
      parts.push(
        '<span class="ps-thanks-order-item-qty">' +
          escapeHtml(lQty) +
          ": " +
          escapeHtml(String(qty)) +
          "</span>"
      );
      parts.push(
        '<span class="ps-thanks-order-item-price">' +
          escapeHtml(String(price)) +
          " " +
          escapeHtml(cur) +
          "</span>"
      );
      parts.push("</div>");
      parts.push("</div>");
      parts.push("</li>");
    }

    parts.push("</ul>");

    var grand =
      order.total_cost != null && order.total_cost !== ""
        ? order.total_cost
        : order.cost != null && order.cost !== ""
          ? order.cost
          : "";
    if (grand !== "" && grand != null) {
      parts.push('<div class="ps-thanks-order-total-row">');
      parts.push('<span class="ps-thanks-order-total-label">' + escapeHtml(lTotal) + "</span>");
      parts.push(
        '<span class="ps-thanks-order-total-value">' +
          escapeHtml(String(grand)) +
          " " +
          escapeHtml(cur) +
          "</span>"
      );
      parts.push("</div>");
    }

    parts.push("</div>");

    var nm = order.full_name || "";
    var ph = order.phone || "";
    var ad = order.address || "";
    if (nm || ph || ad) {
      parts.push('<div class="ps-thanks-order-meta">');
      parts.push('<div class="ps-thanks-delivery-card">');
      parts.push('<h3 class="ps-thanks-delivery-title">' + escapeHtml(lDelivery) + "</h3>");
      if (nm) parts.push('<p class="ps-thanks-delivery-line">' + escapeHtml(nm) + "</p>");
      if (ph) parts.push('<p class="ps-thanks-delivery-line">' + escapeHtml(ph) + "</p>");
      if (ad) parts.push('<p class="ps-thanks-delivery-line">' + escapeHtml(ad) + "</p>");
      parts.push("</div>");
      parts.push("</div>");
    }

    return parts.join("");
  }

  function initPrestigeThanksOrderFetch() {
    var orderId = getThanksOrderIdFromSearch();
    if (!orderId) return;

    var sections = document.querySelectorAll("[data-liquid-thanks][data-ps-thanks]");
    for (var s = 0; s < sections.length; s++) {
      var root = sections[s];
      if (root.getAttribute("data-thanks-client-fetch") === "0") continue;

      var slot = root.querySelector("[data-thanks-order-slot]");
      if (!slot) continue;

      var prevFetched = root.getAttribute("data-thanks-fetched-order-id");
      if (prevFetched && prevFetched !== orderId) {
        slot.innerHTML = "";
        root.removeAttribute("data-thanks-fetched-order-id");
      }

      if (slot.querySelector(".ps-invoice")) continue;

      if (prevFetched === orderId && slot.querySelectorAll(".ps-thanks-order-item").length > 0) {
        continue;
      }

      var existingRows = slot.querySelectorAll(".ps-thanks-order-item").length;
      if (existingRows > 0) continue;

      if (root.getAttribute("data-thanks-fetch-inflight") === "1") continue;

      var base = (
        root.getAttribute("data-eo-api-origin") ||
        PS_EO_API_V1_BASE.replace(/\/api\/v1\/?$/i, "")
      ).replace(/\/$/, "");
      var url = base + "/api/v1/orders/client/" + encodeURIComponent(orderId);

      root.setAttribute("data-thanks-fetch-inflight", "1");

      var cfg = {
        currency: root.getAttribute("data-thanks-currency") || "EGP",
        labelOrderSummary: root.getAttribute("data-thanks-label-order-summary") || "Order Summary",
        labelQty: root.getAttribute("data-thanks-label-qty") || "Qty",
        labelTotal: root.getAttribute("data-thanks-label-total") || "Total",
        labelDelivery: root.getAttribute("data-thanks-label-delivery") || "Delivery details",
      };

      fetch(url, {
        method: "GET",
        credentials: "omit",
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          if (!res.ok) throw new Error("thanks order http " + res.status);
          return res.json();
        })
        .then(function (body) {
          var order = normalizeThanksApiOrder(body);
          if (!order || !order.cart_items || !order.cart_items.length) {
            root.removeAttribute("data-thanks-fetch-inflight");
            return;
          }
          var html = buildThanksOrderMarkup(order, cfg);
          if (html) {
            slot.innerHTML = html;
            root.setAttribute("data-thanks-fetched-order-id", orderId);
          }
          root.removeAttribute("data-thanks-fetch-inflight");
        })
        .catch(function (err) {
          console.warn("[Prestige] Thanks order fetch:", err);
          root.removeAttribute("data-thanks-fetch-inflight");
        });
    }
  }

  /** EasyOrders home-section hydration (`data-eo-hs-ids` / `data-eo-hs-mount`) — same contract as hosted reference script.js */
  var eoHsCurrencySymbolCache = "";

  function resolveEoHsCurrencySymbol() {
    if (eoHsCurrencySymbolCache) {
      return eoHsCurrencySymbolCache;
    }
    try {
      var nd = document.getElementById("__NEXT_DATA__");
      if (nd) {
        var data = JSON.parse(nd.textContent || "{}");
        var app =
          data &&
          data.props &&
          data.props.pageProps &&
          data.props.pageProps.appSettings;
        if (app && app.currency_symbol) {
          eoHsCurrencySymbolCache = String(app.currency_symbol);
          return eoHsCurrencySymbolCache;
        }
      }
    } catch (e) {}
    var probe = document.querySelector(
      ".ps-pgrid-price-current, .ps-plist-price-current, .ps-featured-price-current, .eo-hs-card__meta, .ab-pgrid-price"
    );
    if (probe) {
      var sym = (probe.textContent || "").replace(/[\d,.\s]/g, "").trim();
      if (sym) {
        eoHsCurrencySymbolCache = sym;
        return eoHsCurrencySymbolCache;
      }
    }
    return "";
  }

  function resolveEoHsApiBase(fromEl) {
    var anchor =
      fromEl && fromEl.closest && fromEl.closest("[data-eo-api-base]");
    var s = "";
    if (anchor && anchor.getAttribute("data-eo-api-base")) {
      s = String(anchor.getAttribute("data-eo-api-base") || "").trim();
    } else if (
      typeof window.__EO_STORE_API_BASE__ === "string" &&
      window.__EO_STORE_API_BASE__
    ) {
      s = String(window.__EO_STORE_API_BASE__).trim();
    }
    s = s.replace(/\/$/, "");
    if (!s) {
      return PS_EO_API_V1_BASE.replace(/\/$/, "");
    }
    if (!/\/api\/v\d+$/i.test(s)) {
      s = s.replace(/\/$/, "") + "/api/v1";
    }
    return s.replace(/\/$/, "");
  }

  function eoHsEscapeAttr(val) {
    return String(val || "").replace(/"/g, "&quot;");
  }

  function initEasyOrdersHsCtaLinks() {
    document
      .querySelectorAll("a[data-eo-hs-cta]:not([data-eo-hs-cta-done])")
      .forEach(function (el) {
        var id = String(el.getAttribute("data-eo-hs-cta-id") || "").trim();
        var entity = el.getAttribute("data-eo-hs-cta-entity") || "";
        el.setAttribute("data-eo-hs-cta-done", "1");
        if (!id) {
          return;
        }
        var base = resolveEoHsApiBase(el);
        var path =
          entity === "categories"
            ? "categories"
            : entity === "pages"
              ? "simple-pages"
              : "products";
        var url = base + "/" + path + "?filter=id||$in||" + id + "&limit=1";
        fetch(url, {
          credentials: "omit",
          headers: { Accept: "application/json" },
        })
          .then(function (res) {
            return res.ok
              ? res.json()
              : Promise.reject(new Error(String(res.status)));
          })
          .then(function (body) {
            var rows = Array.isArray(body)
              ? body
              : body && Array.isArray(body.data)
                ? body.data
                : [];
            var row = rows[0];
            if (!row) {
              return;
            }
            var slug = row.slug || "";
            if (!slug) {
              return;
            }
            if (entity === "categories") {
              el.href = "/collections/" + encodeURIComponent(slug);
            } else if (entity === "pages") {
              el.href = "/pages/" + encodeURIComponent(slug);
            } else {
              el.href = "/products/" + encodeURIComponent(slug);
            }
          })
          .catch(function () {});
      });
  }

  function initEasyOrdersHsHydration() {
    var roots = document.querySelectorAll(
      "[data-eo-hs-ids]:not([data-eo-hs-fetched])"
    );
    if (!roots.length) {
      return;
    }

    var currencySym = resolveEoHsCurrencySymbol();

    roots.forEach(function (root) {
      var ids = (root.getAttribute("data-eo-hs-ids") || "").trim();
      if (!ids) {
        return;
      }

      var mount = root.querySelector("[data-eo-hs-mount]");
      if (!mount) {
        return;
      }

      root.setAttribute("data-eo-hs-fetched", "1");
      mount.classList.add("eo-hs-loading");

      var base = resolveEoHsApiBase(root);
      var entity = root.getAttribute("data-eo-hs-entity") || "products";
      var collection = entity === "categories" ? "categories" : "products";
      var url =
        base +
        "/" +
        collection +
        "?filter=id||$in||" +
        ids +
        "&limit=20";

      fetch(url, {
        credentials: "omit",
        headers: { Accept: "application/json" },
      })
        .then(function (res) {
          return res.ok ? res.json() : Promise.reject(res.status);
        })
        .then(function (body) {
          var rows = Array.isArray(body)
            ? body
            : body && Array.isArray(body.data)
              ? body.data
              : [];

          if (!rows.length) {
            mount.innerHTML =
              '<p class="eo-hs-error">' +
              (entity === "categories"
                ? "No categories found."
                : "No products found.") +
              "</p>";
            mount.classList.remove("eo-hs-loading");
            return;
          }

          var html = "";
          if (entity === "categories") {
            rows.forEach(function (row) {
              var slug = row.slug || "";
              var name = row.name || "";
              var thumb =
                row.thumb ||
                row.image ||
                (row.images && row.images[0]) ||
                "";
              var href = slug
                ? "/collections/" + encodeURIComponent(slug)
                : "#";
              var media = thumb
                ? '<div class="eo-hs-card__media"><img src="' +
                  eoHsEscapeAttr(thumb) +
                  '" alt="' +
                  eoHsEscapeAttr(name) +
                  '" loading="lazy" width="320" height="400" style="width:100%;height:100%;object-fit:cover;display:block;" /></div>'
                : '<div class="eo-hs-card__media eo-hs-card__media--empty"></div>';
              html +=
                '<a class="eo-hs-card--category" href="' +
                href +
                '">' +
                media +
                '<div class="eo-hs-card__body"><span class="eo-hs-card__title">' +
                String(name).replace(/</g, "&lt;") +
                "</span></div></a>";
            });
          } else {
            rows.forEach(function (row) {
              var slug = row.slug || "";
              var name = row.name || "";
              var thumb =
                row.thumb ||
                (row.images && row.images[0]) ||
                "";
              var sale = row.sale_price;
              var price = row.price;
              var showSale =
                sale != null &&
                price != null &&
                Number(sale) < Number(price);
              var priceNow = showSale ? sale : price || 0;
              var priceWas = showSale ? price : 0;
              var sym = currencySym || row.currency || "";
              var media = thumb
                ? '<div class="eo-hs-card__media"><img src="' +
                  eoHsEscapeAttr(thumb) +
                  '" alt="' +
                  eoHsEscapeAttr(name) +
                  '" loading="lazy" width="320" height="400" style="width:100%;height:100%;object-fit:cover;display:block;" /></div>'
                : '<div class="eo-hs-card__media eo-hs-card__media--empty"></div>';
              var meta = '<span class="eo-hs-card__meta">';
              if (priceWas) {
                meta +=
                  '<del style="opacity:0.55;margin-inline-end:4px">' +
                  priceWas +
                  " " +
                  sym +
                  "</del> ";
              }
              meta += priceNow + " " + sym + "</span>";
              html +=
                '<a class="eo-hs-card--product" href="/products/' +
                encodeURIComponent(slug) +
                '">' +
                media +
                '<div class="eo-hs-card__body"><span class="eo-hs-card__title">' +
                String(name).replace(/</g, "&lt;") +
                "</span>" +
                meta +
                "</div></a>";
            });
          }

          mount.innerHTML = html;
          mount.classList.remove("eo-hs-loading");
          if (typeof window.initFormatPrices === "function") {
            try {
              window.initFormatPrices();
            } catch (e2) {}
          }
        })
        .catch(function () {
          mount.innerHTML =
            '<p class="eo-hs-error">Failed to load.</p>';
          mount.classList.remove("eo-hs-loading");
        });
    });
  }

  function runPrestigeDynamicInits() {
    try {
      initEasyOrdersHsCtaLinks();
      initEasyOrdersHsHydration();
    } catch (e) {
      console.warn("[Prestige] EasyOrders home-section hydration error:", e);
    }
    try {
      initPrestigeQuickViewScope();
    } catch (e) {
      console.warn("[Prestige] Quick View scope error:", e);
    }
    try {
      initPrestigeVariationNameLabels();
    } catch (e) {
      console.warn("[Prestige] Variation name label init error:", e);
    }
    try {
      initCollectionFiltersShell();
      initCollectionFilterGroupsAccordion();
    } catch (e) {
      console.warn("[Prestige] Collection filters init error:", e);
    }
    try {
      syncPrestigeAnnounceBar();
    } catch (e) {
      console.warn("[Prestige] Announce bar sync error:", e);
    }
    try {
      initPrestigeSlider();
    } catch (e) {
      console.warn("[Prestige] Slider init error:", e);
    }
    try {
      initPrestigeFeaturedCarousel();
    } catch (e) {
      console.warn("[Prestige] Featured carousel init error:", e);
    }
    try {
      initPrestigeListProductsShowcaseCarousel();
    } catch (e) {
      console.warn("[Prestige] List products showcase carousel init error:", e);
    }
    try {
      initPrestigeHotCardCarousel();
    } catch (e) {
      console.warn("[Prestige] Hot card carousel init error:", e);
    }
    try {
      initPrestigeListProducts();
    } catch (e) {
      console.warn("[Prestige] List products init error:", e);
    }
    try {
      initPrestigeCategoryShowcase();
    } catch (e) {
      console.warn("[Prestige] Category showcase init error:", e);
    }
    try {
      initPrestigeCustomerReviewsCarousel();
    } catch (e) {
      console.warn("[Prestige] Customer reviews carousel init error:", e);
    }
    try {
      initPrestigeFaqSplitShowcase();
    } catch (e) {
      console.warn("[Prestige] FAQ split showcase init error:", e);
    }
    try {
      initPrestigeThanksOrderFetch();
    } catch (e) {
      console.warn("[Prestige] Thanks order fetch error:", e);
    }
    try {
      initRelatedProductsCarousel();
      initLegacyGallery();
      initLegacyGalleryKeyboard();
      initLegacyReviews();
      initPromoCountdownHeroTimers();
      initPromoCountdownHeroRollingTimers();
      initPrestigeProductCompareSliders();
      initLegacyFakeCounters();
      initLegacyFakeVisitors();
      initLegacyDescriptionAccordion();
      initLegacyDescriptionTabs();
    } catch (e) {
      console.warn("[Prestige] Product sections init error:", e);
    }
  }

  function init() {
    try {
      syncPrestigeThemeStack();
      initPrestigeHeaderScroll();
      initPrestigeSearchRedirect();
      syncPrestigeAnnounceBar();
      initPrestigeMobileMenu();
    } catch (e) {
      console.warn("[Prestige] Header/menu init error:", e);
    }
    try {
      initPrestigeVariationNameLabels();
    } catch (e) {
      console.warn("[Prestige] Variation name label init error:", e);
    }
    runPrestigeDynamicInits();
  }

  var dynamicInitScheduled = false;
  function scheduleDynamicInits() {
    if (dynamicInitScheduled) return;
    dynamicInitScheduled = true;
    requestAnimationFrame(function () {
      dynamicInitScheduled = false;
      runPrestigeDynamicInits();
    });
  }

  document.addEventListener(MOUNT_EVENT, function () {
    scheduleDynamicInits();
  });

  window.addEventListener("popstate", function () {
    try {
      initPrestigeThanksOrderFetch();
    } catch (e) {
      console.warn("[Prestige] Thanks order fetch (popstate):", e);
    }
  });

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "attributes") {
        var pname = m.attributeName;
        if (
          pname === "data-end" ||
          pname === "data-hours" ||
          pname === "data-pch-mode" ||
          pname === "data-storage-key"
        ) {
          var at = m.target;
          if (
            at &&
            at.nodeType === 1 &&
            at.matches &&
            at.matches(".promo-countdown-hero__timer")
          ) {
            scheduleDynamicInits();
            return;
          }
        }
        continue;
      }
      if (m.type !== "childList") {
        continue;
      }
      var nodes = m.addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var el = nodes[j];
        if (el.nodeType !== 1) continue;
        if (
          el.matches &&
          (el.matches(".ps-slider") ||
            el.matches("[data-ps-featured-carousel]") ||
            el.matches("[data-ps-plist]") ||
            el.matches("[data-ps-cat-showcase]") ||
            el.matches("[data-ps-rev-showcase]") ||
            el.matches("[data-ps-faq-split]") ||
            el.matches("[data-ps-hot-cards]") ||
            el.matches(".ab-gallery") ||
            el.matches(".ab-plist--related") ||
            el.matches(".ab-reviews") ||
            el.matches(".ps-rev-section") ||
            el.matches(".psc-compare") ||
            el.matches(".promo-countdown-hero__timer") ||
            el.matches(".ab-fake-counter") ||
            el.matches(".ab-fake-visitor") ||
            el.matches(".lq-desc-accordion") ||
            el.matches(".lq-desc-tabs") ||
            el.matches(".ps-cl-section") ||
            el.matches(".ps-announce-slider") ||
            el.matches("[data-ps-announce]") ||
            el.matches(".ps-theme") ||
            el.matches(".ps-header") ||
            el.matches("#eo-header") ||
            el.matches("h2.variation_name") ||
            el.matches("[data-liquid-thanks]") ||
            el.matches("[data-eo-hs-ids]") ||
            el.matches("a[data-eo-hs-cta]") ||
            el.matches(".shop-the-look") ||
            el.matches(".category-mosaic") ||
            (el.id && el.id.indexOf("headlessui-dialog-panel") === 0))
        ) {
          scheduleDynamicInits();
          return;
        }
        if (
          el.querySelector &&
          (el.querySelector(".ps-slider") ||
            el.querySelector("[data-ps-featured-carousel]") ||
            el.querySelector("[data-ps-plist]") ||
            el.querySelector("[data-ps-cat-showcase]") ||
            el.querySelector("[data-ps-rev-showcase]") ||
            el.querySelector("[data-ps-faq-split]") ||
            el.querySelector("[data-ps-hot-cards]") ||
            el.querySelector(".ab-gallery") ||
            el.querySelector(".ab-plist--related") ||
            el.querySelector(".ab-reviews") ||
            el.querySelector(".ps-rev-section") ||
            el.querySelector(".psc-compare") ||
            el.querySelector(".promo-countdown-hero__timer") ||
            el.querySelector(".ab-fake-counter") ||
            el.querySelector(".ab-fake-visitor") ||
            el.querySelector(".lq-desc-accordion") ||
            el.querySelector(".lq-desc-tabs") ||
            el.querySelector(".ps-cl-section") ||
            el.querySelector(".ps-announce-slider") ||
            el.querySelector("[data-ps-announce]") ||
            el.querySelector(".ps-theme") ||
            el.querySelector(".ps-header") ||
            el.querySelector("#eo-header") ||
            el.querySelector("h2.variation_name") ||
            el.querySelector("[data-liquid-thanks]") ||
            el.querySelector("[data-eo-hs-ids]") ||
            el.querySelector("a[data-eo-hs-cta]") ||
            el.querySelector(".shop-the-look") ||
            el.querySelector(".category-mosaic") ||
            el.querySelector('[id^="headlessui-dialog-panel"]'))
        ) {
          scheduleDynamicInits();
          return;
        }
      }
    }
  });

  var announceResizeTimer = null;
  window.addEventListener("resize", function () {
    if (announceResizeTimer) {
      clearTimeout(announceResizeTimer);
    }
    announceResizeTimer = window.setTimeout(function () {
      announceResizeTimer = null;
      try {
        syncPrestigeAnnounceBar();
      } catch (e) {
        console.warn("[Prestige] Announce bar resize sync error:", e);
      }
    }, 150);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init();
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-end", "data-hours", "data-pch-mode", "data-storage-key"],
        });
      }
    });
  } else {
    init();
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-end", "data-hours", "data-pch-mode", "data-storage-key"],
      });
    }
  }
})();
