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
    document.querySelectorAll(".ps-slider").forEach(function (slider) {
      if (slider.getAttribute("data-ps-slider-init")) {
        return;
      }

      slider.setAttribute("data-ps-slider-init", "1");

      var slides = slider.querySelectorAll(".ps-slider-slide");
      if (!slides.length) {
        return;
      }

      var indicators = slider.querySelectorAll(".ps-slider-indicator");
      var interval = parseInt(slider.getAttribute("data-autoplay") || "", 10) || 30000;

      if (window.matchMedia("(max-width: 768px)").matches) {
        var track = slider.querySelector(".ps-slider-track");
        if (!track || slides.length < 2) {
          return;
        }

        var mobileCurrent = 0;
        var mobileStartAt = 0;
        var mobileRafId = 0;
        var scrollIdleTimer = 0;

        function getProgressBar(idx) {
          var ind = indicators[idx];
          return ind ? ind.querySelector(".ps-slider-ind-progress") : null;
        }

        function setMobileActive(idx) {
          indicators.forEach(function (btn, i) {
            btn.classList.toggle("ps-active", i === idx);
            if (i !== idx) {
              var bar = getProgressBar(i);
              if (bar) bar.style.width = "0%";
            }
          });
        }

        function mobileSlideWidth() {
          var el = slides[0];
          var w = el ? el.offsetWidth : 0;
          if (!w) {
            w = track.clientWidth || 0;
          }
          if (!w && el) {
            w = el.getBoundingClientRect().width || 0;
          }
          return Math.max(1, Math.round(w));
        }

        function syncMobileCurrent() {
          var width = mobileSlideWidth();
          if (!width) return;
          mobileCurrent = Math.round(track.scrollLeft / width);
          if (mobileCurrent >= slides.length) mobileCurrent = slides.length - 1;
          if (mobileCurrent < 0) mobileCurrent = 0;
          setMobileActive(mobileCurrent);
        }

        function goToMobile(idx, behavior) {
          mobileCurrent = ((idx % slides.length) + slides.length) % slides.length;
          setMobileActive(mobileCurrent);
          var w = mobileSlideWidth();
          track.scrollTo({ left: mobileCurrent * w, behavior: behavior || "smooth" });
          mobileStartAt = performance.now();
        }

        var mobileResizeTimer = 0;
        function onMobileSliderViewportChange() {
          if (mobileResizeTimer) {
            clearTimeout(mobileResizeTimer);
          }
          mobileResizeTimer = window.setTimeout(function () {
            mobileResizeTimer = 0;
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                goToMobile(mobileCurrent, "auto");
              });
            });
          }, 100);
        }

        function tickMobile(now) {
          var elapsed = now - mobileStartAt;
          var pct = Math.min((elapsed / interval) * 100, 100);
          var bar = getProgressBar(mobileCurrent);
          if (bar) bar.style.width = pct + "%";

          if (elapsed >= interval) {
            goToMobile(mobileCurrent + 1, "smooth");
          }

          mobileRafId = requestAnimationFrame(tickMobile);
        }

        function restartMobileAutoplay() {
          if (mobileRafId) {
            cancelAnimationFrame(mobileRafId);
          }
          mobileStartAt = performance.now();
          mobileRafId = requestAnimationFrame(tickMobile);
        }

        track.addEventListener("scroll", function () {
          if (scrollIdleTimer) {
            clearTimeout(scrollIdleTimer);
          }
          scrollIdleTimer = window.setTimeout(function () {
            syncMobileCurrent();
            restartMobileAutoplay();
          }, 120);
        }, { passive: true });

        window.addEventListener("resize", onMobileSliderViewportChange);
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", onMobileSliderViewportChange);
        }

        indicators.forEach(function (btn) {
          btn.addEventListener("click", function () {
            var idx = parseInt(btn.getAttribute("data-slide-index") || "0", 10);
            if (!isNaN(idx) && idx !== mobileCurrent) {
              goToMobile(idx, "smooth");
            }
          });
        });

        goToMobile(0, "auto");
        restartMobileAutoplay();
        return;
      }

      var current = 0;
      var startTime = 0;
      var rafId = 0;
      var dragStartX = 0;
      var dragLastX = 0;
      var isDragging = false;
      var hasDragged = false;

      function getProgressBar(idx) {
        var ind = indicators[idx];
        return ind ? ind.querySelector(".ps-slider-ind-progress") : null;
      }

      function activateSlide(idx) {
        slides[current] && slides[current].classList.remove("ps-active");
        if (indicators[current]) {
          indicators[current].classList.remove("ps-active");
          var prevBar = getProgressBar(current);
          if (prevBar) prevBar.style.width = "0%";
        }

        current = ((idx % slides.length) + slides.length) % slides.length;

        slides[current] && slides[current].classList.add("ps-active");
        if (indicators[current]) {
          indicators[current].classList.add("ps-active");
        }
        startTime = performance.now();
      }

      function goNext() {
        activateSlide(current + 1);
      }

      function goPrev() {
        activateSlide(current - 1);
      }

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
        if (evt.button !== 0) return;
        isDragging = true;
        hasDragged = false;
        dragStartX = getClientX(evt);
        dragLastX = dragStartX;
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
        var pct = Math.min((elapsed / interval) * 100, 100);
        var bar = getProgressBar(current);
        if (bar) bar.style.width = pct + "%";

        if (elapsed >= interval) {
          goNext();
        }

        rafId = requestAnimationFrame(tick);
      }

      indicators.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-slide-index") || "0", 10);
          if (!isNaN(idx) && idx !== current) activateSlide(idx);
        });
      });

      activateSlide(0);
      rafId = requestAnimationFrame(tick);

      slider.addEventListener("touchstart", onDragStart, { passive: true });
      slider.addEventListener("touchmove", onDragMove, { passive: true });
      slider.addEventListener("touchend", onDragEnd);

      slider.addEventListener("mousedown", onDragStart, true);
      window.addEventListener("mousemove", onDragMove, true);
      window.addEventListener("mouseup", onDragEnd, true);

      slider.addEventListener(
        "click",
        function (evt) {
          if (hasDragged) {
            evt.preventDefault();
            evt.stopPropagation();
            hasDragged = false;
          }
        },
        true
      );
    });
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
      section.setAttribute("data-ps-plist-init", "1");

      var viewport = section.querySelector("[data-ps-plist-viewport]");
      var track = section.querySelector("[data-ps-plist-track]");
      var cards = section.querySelectorAll("[data-ps-plist-card]");
      var prevBtn = section.querySelector("[data-ps-plist-prev]");
      var nextBtn = section.querySelector("[data-ps-plist-next]");
      var progressFill = section.querySelector("[data-ps-plist-progress-fill]");

      if (!track || !cards.length) {
        return;
      }

      var current = 0;
      var isMobile = function () {
        return typeof window !== "undefined" && window.innerWidth <= 767;
      };
      var getScrollEl = function () {
        return isMobile() && viewport ? viewport : track;
      };

      function visibleCount() {
        var w = window.innerWidth || 0;
        if (w <= 767) return 1;
        if (w < 1200) return 3;
        return 4;
      }

      function maxIndex() {
        return Math.max(0, cards.length - visibleCount());
      }

      function cardStep() {
        if (cards.length < 2) return cards[0].getBoundingClientRect().width;
        var first = cards[0].getBoundingClientRect();
        var second = cards[1].getBoundingClientRect();
        return Math.abs(second.left - first.left);
      }

      function updateProgress() {
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
        var el = getScrollEl();
        el.scrollTo({ left: current * cardStep(), behavior: "smooth" });
        updateProgress();
      }

      function syncFromScroll() {
        var step = cardStep();
        if (!step) return;
        var el = getScrollEl();
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
        viewport.addEventListener("scroll", syncFromScroll, { passive: true });
      }

      /* Mouse drag: desktop only (mobile = native scroll on viewport, no handlers) */
      if (!isMobile()) {
        var dragStartX = 0;
        var dragScrollLeft = 0;
        var isPointerDown = false;
        var hasDragged = false;
        var suppressClickUntil = 0;

        function isClickSuppressed() {
          return Date.now() < suppressClickUntil;
        }

        function suppressClickFor(ms) {
          suppressClickUntil = Date.now() + ms;
        }

        function onTrackMouseDown(evt) {
          if (evt.button !== 0) return;
          var el = getScrollEl();
          isPointerDown = true;
          hasDragged = false;
          dragStartX = evt.clientX;
          dragScrollLeft = el.scrollLeft;
          evt.preventDefault();
          document.addEventListener("mousemove", onTrackMouseMove, true);
          document.addEventListener("mouseup", onTrackMouseUp, true);
        }
        function onTrackMouseMove(evt) {
          if (!isPointerDown) return;
          var dx = evt.clientX - dragStartX;
          if (Math.abs(dx) > 5) {
            hasDragged = true;
          }
          getScrollEl().scrollLeft = dragScrollLeft - dx;
        }
        function onTrackMouseUp() {
          isPointerDown = false;
          if (hasDragged) {
            suppressClickFor(280);
            hasDragged = false;
          }
          document.removeEventListener("mousemove", onTrackMouseMove, true);
          document.removeEventListener("mouseup", onTrackMouseUp, true);
          syncFromScroll();
        }
        track.addEventListener("mousedown", onTrackMouseDown, true);

        track.addEventListener(
          "wheel",
          function (evt) {
            if (Math.abs(evt.deltaX) > 4 || Math.abs(evt.deltaY) > 4) {
              suppressClickFor(180);
            }
          },
          { passive: true }
        );

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

      window.addEventListener("resize", function () {
        goTo(current);
      });

      updateProgress();
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
              syncDots(ix);
              syncSlideMedia(ix);
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
        syncDots(idx);
        syncSlideMedia(idx);
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
          syncDots(idx);
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
        showLbImage(idx);
        lightbox.classList.add("ab-open");
        document.body.style.overflow = "hidden";
      }

      gallery.querySelectorAll("[data-gallery-open]").forEach(function (trigger) {
        trigger.addEventListener("click", function (e) {
          if (e.target.closest("video")) return;
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
            readMore.classList.add("ps-rev-read-more--shown");
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

      var base = (root.getAttribute("data-eo-api-origin") || "https://api.easyorders.dev").replace(/\/$/, "");
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

  /** Scroll-triggered reveal: `[data-anim]` (+ optional `data-seq`, `data-cycle` when `data-anim="cycle"`). Simple viewport IO + optional wiring below. Respects `prefers-reduced-motion`. */
  var PS_SR_ANIM_CYCLE = [
    "fadeInUp",
    "fadeInDown",
    "fadeInLeft",
    "fadeInRight",
    "scaleIn",
    "rotateIn",
    "slideInUp",
    "zoomIn",
    "slideInLeft",
    "slideInRight",
    "fadeInScale",
    "flipIn",
  ];

  var prestigeAnimProcessedWeak =
    typeof WeakSet !== "undefined" ? new WeakSet() : null;
  var prestigeAnimProcessedSet = prestigeAnimProcessedWeak ? null : [];

  function prestigeAnimWasProcessed(el) {
    if (prestigeAnimProcessedWeak) {
      return prestigeAnimProcessedWeak.has(el);
    }
    return prestigeAnimProcessedSet.indexOf(el) !== -1;
  }

  function prestigeAnimMarkProcessed(el) {
    if (prestigeAnimProcessedWeak) {
      prestigeAnimProcessedWeak.add(el);
      return;
    }
    if (prestigeAnimProcessedSet.indexOf(el) === -1) {
      prestigeAnimProcessedSet.push(el);
    }
  }

  function prestigeClearAnimTimer(el) {
    var tid = el.getAttribute("data-prestige-anim-timer");
    if (tid) {
      clearTimeout(parseInt(tid, 10));
      el.removeAttribute("data-prestige-anim-timer");
    }
  }

  function prestigeResolveAnimType(el) {
    var raw = el.getAttribute("data-anim");
    if (!raw) {
      return null;
    }
    if (raw === "cycle") {
      var c = parseInt(el.getAttribute("data-cycle") || "0", 10);
      if (isNaN(c)) {
        c = 0;
      }
      if (c % 19 === 13) {
        return "bounceIn";
      }
      return PS_SR_ANIM_CYCLE[c % PS_SR_ANIM_CYCLE.length];
    }
    return raw;
  }

  function prestigeEnsureAnimObserver() {
    if (!window.IntersectionObserver) {
      return null;
    }
    if (window.__prestigeAnimationObserver) {
      return window.__prestigeAnimationObserver;
    }

    var isMobile = window.innerWidth <= 768;
    var config = {
      root: null,
      rootMargin: isMobile ? "0px 0px -20px 0px" : "0px 0px -50px 0px",
      threshold: isMobile ? 0.05 : 0.1,
    };

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }
        prestigeTriggerAnimation(entry.target);
        try {
          obs.unobserve(entry.target);
        } catch (unobsErr) {
          /* ignore */
        }
      });
    }, config);

    window.__prestigeAnimationObserver = obs;
    return obs;
  }

  function prestigeTriggerAnimation(el) {
    if (prestigeAnimWasProcessed(el)) {
      return;
    }
    if (el.classList.contains("animated")) {
      prestigeAnimMarkProcessed(el);
      return;
    }

    if (!el.getAttribute("data-anim")) {
      return;
    }

    prestigeAnimMarkProcessed(el);

    var animType = prestigeResolveAnimType(el);
    if (!animType) {
      return;
    }

    var seq = el.getAttribute("data-seq");
    var delay = seq ? parseInt(seq, 10) * 0.1 : 0;
    if (isNaN(delay)) {
      delay = 0;
    }

    prestigeClearAnimTimer(el);
    var tid = window.setTimeout(function () {
      el.removeAttribute("data-prestige-anim-timer");
      if (!el.isConnected || el.classList.contains("animated")) {
        return;
      }
      el.classList.remove("will-animate");
      el.classList.add("animated");
      el.classList.add("anim-" + animType);
    }, delay * 1000);
    el.setAttribute("data-prestige-anim-timer", String(tid));
  }

  /** Maps class tokens `ps-sr-a-*` / `ps-sr-s-*` / `ps-sr-c-*` into `data-*` when the host strips attributes. */
  function psSrClassTokens(el) {
    var cn = el.className;
    if (cn && typeof cn.baseVal === "string") {
      return cn.baseVal.trim().split(/\s+/).filter(Boolean);
    }
    if (typeof cn === "string") {
      return cn.trim().split(/\s+/).filter(Boolean);
    }
    return String(el.getAttribute("class") || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function psSrWireClassesToAnimAttrs() {
    if (!document.querySelectorAll) {
      return;
    }
    var candidates = document.querySelectorAll("[class*='ps-sr-a-']");
    if (!candidates.length) {
      return;
    }
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || el.nodeType !== 1) {
        continue;
      }
      var parts = psSrClassTokens(el);
      var pi;
      if (!el.getAttribute("data-anim")) {
        for (pi = 0; pi < parts.length; pi++) {
          var ta = parts[pi];
          if (ta.indexOf("ps-sr-a-") !== 0) {
            continue;
          }
          var anim = ta.slice(8);
          if (anim) {
            el.setAttribute("data-anim", anim);
          }
          break;
        }
      }
      if (!el.getAttribute("data-seq")) {
        for (pi = 0; pi < parts.length; pi++) {
          var ts = parts[pi];
          if (ts.indexOf("ps-sr-s-") !== 0) {
            continue;
          }
          var ns = ts.slice(8);
          if (/^\d+$/.test(ns)) {
            el.setAttribute("data-seq", ns);
          }
          break;
        }
      }
      if (!el.getAttribute("data-cycle")) {
        for (pi = 0; pi < parts.length; pi++) {
          var tc = parts[pi];
          if (tc.indexOf("ps-sr-c-") !== 0) {
            continue;
          }
          var nc = tc.slice(8);
          if (/^\d+$/.test(nc)) {
            el.setAttribute("data-cycle", nc);
          }
          break;
        }
      }
    }
  }

  var psSrScheduled = false;

  function initPrestigeScrollRevealAnimations() {
    if (!document.querySelectorAll) {
      return;
    }

    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    psSrWireClassesToAnimAttrs();

    function revealAllInstant(el) {
      prestigeClearAnimTimer(el);
      if (!el.getAttribute("data-anim")) {
        return;
      }
      if (el.classList.contains("animated")) {
        return;
      }
      var animType = prestigeResolveAnimType(el);
      el.classList.remove("will-animate");
      el.classList.add("animated");
      if (animType) {
        el.classList.add("anim-" + animType);
      }
    }

    var noIO = reduced || !window.IntersectionObserver;

    if (noIO) {
      document.querySelectorAll("[data-anim]").forEach(revealAllInstant);
      return;
    }

    var observer = prestigeEnsureAnimObserver();
    if (!observer) {
      document.querySelectorAll("[data-anim]").forEach(revealAllInstant);
      return;
    }

    var isMobile = window.innerWidth <= 768;
    var visibilityOffset = isMobile ? 20 : 100;

    document.querySelectorAll("[data-anim]").forEach(function (el) {
      if (prestigeAnimWasProcessed(el)) {
        return;
      }

      if (
        !el.classList.contains("will-animate") &&
        !el.classList.contains("animated")
      ) {
        el.classList.add("will-animate");
      }

      if (el.classList.contains("animated")) {
        prestigeAnimMarkProcessed(el);
        return;
      }

      var rect = el.getBoundingClientRect();
      var windowHeight =
        window.innerHeight || document.documentElement.clientHeight;
      var isVisible =
        rect.top < windowHeight - visibilityOffset && rect.bottom > 0;

      if (isVisible) {
        prestigeTriggerAnimation(el);
      } else {
        observer.observe(el);
      }
    });
  }

  function schedulePrestigeScrollRevealAnimations() {
    if (psSrScheduled) {
      return;
    }
    psSrScheduled = true;
    requestAnimationFrame(function () {
      psSrScheduled = false;
      initPrestigeScrollRevealAnimations();
    });
  }

  function prestigeInstallAnimationBootTimersOnce() {
    if (window.__prestigeAnimationBootTimers) {
      return;
    }
    window.__prestigeAnimationBootTimers = true;
    window.setTimeout(function () {
      try {
        schedulePrestigeScrollRevealAnimations();
      } catch (e) {
        console.warn("[Prestige] Scroll reveal (boot 100ms):", e);
      }
    }, 100);
    window.setTimeout(function () {
      try {
        schedulePrestigeScrollRevealAnimations();
      } catch (e) {
        console.warn("[Prestige] Scroll reveal (boot 300ms):", e);
      }
    }, 300);
  }

  function runPrestigeDynamicInits() {
    try {
      initPrestigeQuickViewScope();
    } catch (e) {
      console.warn("[Prestige] Quick View scope error:", e);
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
      initPrestigeListProducts();
    } catch (e) {
      console.warn("[Prestige] List products init error:", e);
    }
    try {
      initPrestigeThanksOrderFetch();
    } catch (e) {
      console.warn("[Prestige] Thanks order fetch error:", e);
    }
    try {
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
    try {
      schedulePrestigeScrollRevealAnimations();
    } catch (e) {
      console.warn("[Prestige] Scroll reveal init error:", e);
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
    runPrestigeDynamicInits();
    prestigeInstallAnimationBootTimersOnce();
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
          (el.matches("[data-anim]") ||
            el.matches(".ps-slider") ||
            el.matches("[data-ps-featured-carousel]") ||
            el.matches("[data-ps-plist]") ||
            el.matches(".ab-gallery") ||
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
            el.matches("[data-liquid-thanks]") ||
            (el.id && el.id.indexOf("headlessui-dialog-panel") === 0))
        ) {
          scheduleDynamicInits();
          return;
        }
        if (
          el.querySelector &&
          (el.querySelector("[data-anim]") ||
            el.querySelector(".ps-slider") ||
            el.querySelector("[data-ps-featured-carousel]") ||
            el.querySelector("[data-ps-plist]") ||
            el.querySelector(".ab-gallery") ||
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
            el.querySelector("[data-liquid-thanks]") ||
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

  window.addEventListener("load", function () {
    try {
      schedulePrestigeScrollRevealAnimations();
    } catch (e) {
      console.warn("[Prestige] Scroll reveal (load):", e);
    }
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
