(function () {
    "use strict";

    var body = document.body;
    var hero = document.querySelector(".hero-section");
    var features = document.getElementById("features");
    var rocket = document.querySelector(".rocket-wrap");
    var menuToggle = document.getElementById("menu-toggle");
    var mobileNav = document.getElementById("mobile-nav");

    if (!hero || !features || !rocket) {
        return;
    }

    var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    var reduceMotion = motionQuery.matches;
    var startY = 0;
    var endY = 1;
    var ticking = false;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function computeRange() {
        startY = hero.offsetTop;
        endY = features.offsetTop - window.innerHeight * 0.25;
        if (endY <= startY) {
            endY = startY + 1;
        }
    }

    function applyRocketStyle() {
        if (reduceMotion) {
            rocket.style.transform = "translate3d(0px, -20px, 0) rotate(-6deg)";
            rocket.style.opacity = "1";
            return;
        }

        var progress = clamp((window.scrollY - startY) / (endY - startY), 0, 1);
        var lift = -320 * progress;
        var drift = 44 * progress;
        var wobble = Math.sin(progress * Math.PI * 10) * 3.2;
        var angle = -14 + progress * 22 + wobble;
        var fade = 0.82 + progress * 0.18;

        rocket.style.transform = "translate3d(" + drift.toFixed(2) + "px, " + lift.toFixed(2) + "px, 0) rotate(" + angle.toFixed(2) + "deg)";
        rocket.style.opacity = fade.toFixed(3);
    }

    function requestPaint() {
        if (ticking) {
            return;
        }

        ticking = true;
        window.requestAnimationFrame(function () {
            applyRocketStyle();
            ticking = false;
        });
    }

    function handleViewportChange() {
        computeRange();
        requestPaint();

        if (window.innerWidth > 900) {
            setMenuOpen(false);
        }
    }

    function setMenuOpen(isOpen) {
        if (!menuToggle || !mobileNav) {
            return;
        }

        menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
        mobileNav.hidden = !isOpen;
        body.classList.toggle("mobile-nav-open", isOpen);
    }

    function isMenuOpen() {
        return menuToggle && menuToggle.getAttribute("aria-expanded") === "true";
    }

    function onAnchorClick(event) {
        var link = event.currentTarget;
        var href = link.getAttribute("href");
        if (!href || href.charAt(0) !== "#") {
            return;
        }

        var target = document.querySelector(href);
        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start"
        });

        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", href);
        }

        if (isMenuOpen()) {
            setMenuOpen(false);
        }
    }

    if (menuToggle && mobileNav) {
        menuToggle.addEventListener("click", function () {
            setMenuOpen(!isMenuOpen());
        });

        document.addEventListener("click", function (event) {
            if (!isMenuOpen()) {
                return;
            }
            if (mobileNav.contains(event.target) || menuToggle.contains(event.target)) {
                return;
            }
            setMenuOpen(false);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setMenuOpen(false);
            }
        });
    }

    var anchors = document.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < anchors.length; i += 1) {
        anchors[i].addEventListener("click", onAnchorClick);
    }

    if (motionQuery.addEventListener) {
        motionQuery.addEventListener("change", function (event) {
            reduceMotion = event.matches;
            requestPaint();
        });
    } else if (motionQuery.addListener) {
        motionQuery.addListener(function (event) {
            reduceMotion = event.matches;
            requestPaint();
        });
    }

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", handleViewportChange, { passive: true });
    window.addEventListener("orientationchange", handleViewportChange, { passive: true });

    handleViewportChange();
})();
