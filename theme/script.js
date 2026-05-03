!(function () {
  function e() {
    var e = document.querySelector(".ab-header");
    if (e && !e.dataset.scrollInit) {
      e.dataset.scrollInit = "1";
      var t = window.scrollY;
      window.addEventListener(
        "scroll",
        function () {
          var a = window.scrollY;
          Math.abs(a - t) < 5 ||
            (a > t && a > 100
              ? e.classList.add("ab-hidden")
              : e.classList.remove("ab-hidden"),
            (t = a));
        },
        { passive: !0 }
      );
    }
  }
  function t() {
    var e = document.getElementById("eo-menu-btn"),
      t = document.getElementById("eo-mobile-menu"),
      a = document.getElementById("eo-mobile-overlay"),
      n = document.getElementById("eo-mobile-close");
    function r() {
      t.classList.remove("ab-open"),
        a && a.classList.remove("ab-open"),
        (document.body.style.overflow = "");
    }
    e &&
      t &&
      !e.dataset.menuInit &&
      ((e.dataset.menuInit = "1"),
      e.addEventListener("click", function () {
        t.classList.add("ab-open"),
          a && a.classList.add("ab-open"),
          (document.body.style.overflow = "hidden");
      }),
      n && n.addEventListener("click", r),
      a && a.addEventListener("click", r),
      t.querySelectorAll(".ab-mobile-nav > a").forEach(function (e) {
        e.addEventListener("click", r);
      }),
      t.querySelectorAll(".ab-mobile-accordion-panel a").forEach(function (e) {
        e.addEventListener("click", r);
      }),
      t.querySelectorAll(".ab-mobile-accordion-trigger").forEach(function (e) {
        e.dataset.accordionInit ||
          ((e.dataset.accordionInit = "1"),
          e.addEventListener("click", function () {
            var a = e.closest(".ab-mobile-accordion");
            if (a) {
              var n = a.classList.contains("ab-open");
              t.querySelectorAll(".ab-mobile-accordion.ab-open").forEach(function (e) {
                e !== a && e.classList.remove("ab-open");
              }),
                a.classList.toggle("ab-open", !n);
            }
          }));
      }));
  }
  function a() {
    document.querySelectorAll(".ab-plist").forEach(function (e) {
      if (!e.dataset.scrollArrowInit) {
        e.dataset.scrollArrowInit = "1";
        var t = e.querySelector(".ab-plist-track"),
          a = e.querySelector(".ab-plist-prev"),
          n = e.querySelector(".ab-plist-next");
        t &&
          (a &&
            a.addEventListener("click", function () {
              t.scrollBy({ left: -r(), behavior: "smooth" });
            }),
          n &&
            n.addEventListener("click", function () {
              t.scrollBy({ left: r(), behavior: "smooth" });
            }));
      }
      function r() {
        var e = t.querySelector(".ab-plist-card");
        if (!e) return 0.8 * t.clientWidth;
        var a = getComputedStyle(t),
          n = parseFloat(a.gap) || 16;
        return e.offsetWidth + n;
      }
    });
  }
  function n() {
    document.querySelectorAll(".ab-slider").forEach(function (e) {
      if (!e.dataset.sliderInit) {
        e.dataset.sliderInit = "1";
        var t = e.querySelectorAll(".ab-slider-slide");
        if (!(t.length < 2)) {
          var a = e.querySelector(".ab-slider-progress-bar"),
            n = e.querySelector(".ab-slider-pause"),
            r = parseInt(e.dataset.autoplay) || 5e3,
            o = 0,
            i = !1,
            c = 0,
            l = null;
          n &&
            n.addEventListener("click", function () {
              i
                ? d()
                : ((i = !0), e.classList.add("ab-paused"), l && cancelAnimationFrame(l));
            }),
            d();
        }
      }
      function s(e) {
        if (!i) {
          var n,
            d = e - c,
            u = Math.min((d / r) * 100, 100);
          a && (a.style.width = u + "%"),
            d >= r &&
              ((n = o + 1),
              t[o].classList.remove("ab-active"),
              (o = n % t.length),
              t[o].classList.add("ab-active"),
              (c = performance.now())),
            (l = requestAnimationFrame(s));
        }
      }
      function d() {
        (i = !1),
          e.classList.remove("ab-paused"),
          (c = performance.now()),
          (l = requestAnimationFrame(s));
      }
    });
  }
  function r() {
    var e = document.querySelectorAll(".ab-reveal:not(.ab-observed)");
    if (e.length) {
      var t = new IntersectionObserver(
        function (e) {
          e.forEach(function (e) {
            e.isIntersecting &&
              (e.target.classList.add("ab-visible"), t.unobserve(e.target));
          });
        },
        { threshold: 0.1 }
      );
      e.forEach(function (e) {
        e.classList.add("ab-observed"), t.observe(e);
      });
    }
  }
  function o() {
    document.querySelectorAll(".ab-gallery").forEach(function (e) {
      if (!e.dataset.galleryInit) {
        e.dataset.galleryInit = "1";
        var t = e.querySelector(".ab-gallery-main-media"),
          a = e.querySelectorAll(".ab-gallery-thumb"),
          n = [];
        a.forEach(function (e) {
          e.dataset.src && n.push(e.dataset.src);
        }),
          0 === n.length && t && n.push(t.src),
          document.querySelectorAll("body > .ab-lightbox").forEach(function (e) {
            e.remove();
          });
        var r = e.querySelector("[data-lightbox]");
        r && document.body.appendChild(r);
        var o = r && r.querySelector("[data-lightbox-img]"),
          i = r && r.querySelector("[data-lightbox-counter]"),
          c = 0;
        a.forEach(function (n) {
          n.addEventListener("click", function () {
            var r = n.dataset.src;
            r &&
              t &&
              ((t.src = r),
              a.forEach(function (e) {
                e.classList.remove("ab-active");
              }),
              n.classList.add("ab-active"));
          });
        }),
          e.querySelectorAll("[data-gallery-open]").forEach(function (e) {
            e.addEventListener("click", function (e) {
              if (!e.target.closest("[data-src]") && r) {
                var a = t ? n.indexOf(t.src) : 0;
                l(-1 === a ? 0 : a),
                  r.classList.add("ab-open"),
                  (document.body.style.overflow = "hidden");
              }
            });
          }),
          r &&
            r.addEventListener("click", function (e) {
              var t = e.target;
              if (t.closest("[data-lightbox-close]"))
                return (
                  r.classList.remove("ab-open"), void (document.body.style.overflow = "")
                );
              t.closest("[data-lightbox-prev]")
                ? l(c - 1)
                : t.closest("[data-lightbox-next]") && l(c + 1);
            });
      }
      function l(e) {
        (c = ((e % n.length) + n.length) % n.length),
          o && (o.src = n[c]),
          i && (i.textContent = c + 1 + " / " + n.length);
      }
    });
  }
  function i() {
    document.querySelectorAll(".ab-reviews").forEach(function (e) {
      e.getAttribute("data-reviews-init") ||
        (e.setAttribute("data-reviews-init", "1"),
        e.querySelectorAll("[data-review-comment]").forEach(function (e) {
          var t = document.createElement("button");
          (t.className = "ab-review-read-more"),
            (t.type = "button"),
            (t.textContent = "...Read more"),
            e.parentNode.insertBefore(t, e.nextSibling),
            requestAnimationFrame(function () {
              e.scrollHeight > e.clientHeight + 2 && t.classList.add("ab-visible");
            }),
            t.addEventListener("click", function () {
              e.classList.contains("ab-review-expanded")
                ? (e.classList.remove("ab-review-expanded"),
                  (t.textContent = "...Read more"))
                : (e.classList.add("ab-review-expanded"), (t.textContent = "Show less"));
            });
        }));
    });
  }
  function c() {
    for (
      var e = document.querySelectorAll(".ab-fake-counter"), t = 0;
      t < e.length;
      t++
    ) {
      var a = e[t];
      a.dataset.counterInit ||
        ((a.dataset.counterInit = "1"),
        (function (e) {
          var t = e.dataset.productId || "",
            a = 36e5 * (parseFloat(e.dataset.hours) || 1);
          try {
            var n = localStorage.getItem("counter-" + t);
            n && Number(n) > 36e4 && (a = Number(n));
          } catch (e) {}
          var r = Date.now() + a,
            o = e.querySelector('[data-unit="days"]'),
            i = e.querySelector('[data-unit="hours"]'),
            c = e.querySelector('[data-unit="minutes"]'),
            l = e.querySelector('[data-unit="seconds"]');
          function s(e) {
            return e < 10 ? "0" + e : String(e);
          }
          !(function e() {
            var a = Math.max(0, r - Date.now()),
              n = Math.floor(a / 1e3),
              d = Math.floor(n / 86400);
            n -= 86400 * d;
            var u = Math.floor(n / 3600);
            n -= 3600 * u;
            var v = Math.floor(n / 60);
            (n -= 60 * v),
              o && (o.textContent = s(d)),
              i && (i.textContent = s(u)),
              c && (c.textContent = s(v)),
              l && (l.textContent = s(n));
            try {
              localStorage.setItem("counter-" + t, String(a));
            } catch (e) {}
            a > 0 &&
              requestAnimationFrame(function () {
                setTimeout(e, 1e3);
              });
          })();
        })(a));
    }
  }
  function l() {
    for (
      var e = document.querySelectorAll(".ab-fake-visitor"), t = 0;
      t < e.length;
      t++
    ) {
      var a = e[t];
      a.dataset.visitorInit ||
        ((a.dataset.visitorInit = "1"),
        (function (e) {
          var t = parseInt(e.dataset.min, 10) || 10,
            a = parseInt(e.dataset.max, 10) || 50,
            n = e.querySelector(".ab-fv-count");
          function r() {
            return Math.floor(Math.random() * (a - t + 1)) + t;
          }
          n &&
            ((n.textContent = String(r())),
            setInterval(function () {
              n.textContent = String(r());
            }, 3e3));
        })(a));
    }
  }
  function s() {
    for (
      var e = document.querySelectorAll(".lq-desc-accordion"), t = 0;
      t < e.length;
      t++
    ) {
      var a = e[t];
      a.dataset.descInit ||
        ((a.dataset.descInit = "1"),
        a.addEventListener("click", function (e) {
          var t = e.target.closest(".lq-desc-toggle");
          if (t) {
            var a = t.parentElement,
              n = a.querySelector(".lq-desc-panel");
            if (n)
              "true" === a.getAttribute("data-open")
                ? (a.removeAttribute("data-open"),
                  t.setAttribute("aria-expanded", "false"),
                  (n.style.display = "none"))
                : (a.setAttribute("data-open", "true"),
                  t.setAttribute("aria-expanded", "true"),
                  (n.style.display = "block"));
          }
        }));
    }
  }
  function u() {
    document
      .querySelectorAll('.ab-announce[data-ann-type="slider"]')
      .forEach(function (e) {
        if (!e.dataset.annSliderInit) {
          e.dataset.annSliderInit = "1";
          var t = e.querySelectorAll(".ab-ann-slide");
          if (t.length < 2) return;
          var a = 0;
          setInterval(function () {
            var n = t[a],
              next = (a + 1) % t.length;
            n.classList.remove("ab-active");
            n.classList.add("ab-exit-left");
            t[next].classList.add("ab-active");
            setTimeout(function () {
              n.classList.remove("ab-exit-left");
            }, 500);
            a = next;
          }, 3e3);
        }
      });
  }
  function v() {
    document.querySelectorAll(".ab-ann-marquee").forEach(function (e) {
      if (!e.dataset.marqueeInit) {
        e.dataset.marqueeInit = "1";
        var t = e.querySelector(".ab-ann-marquee-track");
        if (!t) return;
        var a = t.innerHTML,
          n = t.scrollWidth,
          r = e.offsetWidth;
        if (n < 1) return;
        var o = Math.ceil((2 * r) / n);
        if (o < 2) o = 2;
        t.innerHTML = "";
        for (var i = 0; i < o; i++) t.insertAdjacentHTML("beforeend", a);
        var c = t.scrollWidth / o,
          l = Math.max(c / 40, 5);
        t.style.setProperty("--marquee-dur", l + "s"),
          t.style.setProperty("--marquee-offset", "-" + c + "px"),
          t.classList.add("ab-running");
      }
    });
  }
  e(),
    t(),
    a(),
    n(),
    r(),
    o(),
    u(),
    v(),
    window.__abGalleryKeyInit ||
      ((window.__abGalleryKeyInit = !0),
      document.addEventListener("keydown", function (e) {
        var t = document.querySelector("body > .ab-lightbox.ab-open");
        if (t) {
          if ("Escape" === e.key)
            return (
              t.classList.remove("ab-open"), void (document.body.style.overflow = "")
            );
          if ("ArrowLeft" !== e.key)
            if ("ArrowRight" !== e.key);
            else {
              var a = t.querySelector("[data-lightbox-next]");
              a && a.click();
            }
          else {
            var n = t.querySelector("[data-lightbox-prev]");
            n && n.click();
          }
        }
      })),
    i(),
    c(),
    l(),
    s(),
    new MutationObserver(function () {
      e(), t(), a(), n(), r(), o(), u(), v(), i(), c(), l(), s();
    }).observe(document.body, { childList: !0, subtree: !0 });
})();
