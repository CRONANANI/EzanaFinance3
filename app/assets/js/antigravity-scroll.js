/**
 * Antigravity Center Component Scroll Handler
 * Hides the center component when user scrolls past hero section (smooth fade).
 * Background animation continues; only the center component fades out.
 */
(function () {
  'use strict';

  function AntigravityScrollController() {
    this.heroSection = document.getElementById('heroSection');
    this.centerComponent = document.getElementById('antigravityCenterComponent');

    this.config = {
      threshold: 0.2,
      rootMargin: '0px',
      fadeThreshold: 0.5
    };

    this.isHidden = false;
    this.isFading = false;

    this.init();
  }

  AntigravityScrollController.prototype.init = function () {
    if (!this.heroSection || !this.centerComponent) {
      return;
    }

    if ('IntersectionObserver' in window) {
      this.setupIntersectionObserver();
    } else {
      this.setupScrollListener();
    }

    this.checkInitialState();
  };

  AntigravityScrollController.prototype.setupIntersectionObserver = function () {
    var self = this;
    var observerOptions = {
      threshold: [0, 0.2, 0.5, 0.8, 1.0],
      rootMargin: this.config.rootMargin
    };

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var visibleRatio = entry.intersectionRatio;

        if (visibleRatio < self.config.fadeThreshold && visibleRatio > self.config.threshold) {
          self.startFading();
        }

        if (visibleRatio <= self.config.threshold) {
          self.hideCenterComponent();
        }

        if (visibleRatio > self.config.threshold) {
          self.showCenterComponent();
        }
      });
    }, observerOptions);

    observer.observe(this.heroSection);
  };

  AntigravityScrollController.prototype.setupScrollListener = function () {
    var self = this;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          self.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  };

  AntigravityScrollController.prototype.handleScroll = function () {
    var heroRect = this.heroSection.getBoundingClientRect();
    var heroHeight = heroRect.height;
    var heroTop = heroRect.top;
    var heroBottom = heroRect.bottom;

    var visibleHeight = Math.max(0, Math.min(heroBottom, window.innerHeight) - Math.max(heroTop, 0));
    var visibleRatio = heroHeight > 0 ? visibleHeight / heroHeight : 1;

    if (visibleRatio < this.config.fadeThreshold && visibleRatio > this.config.threshold) {
      this.startFading();
    }

    if (visibleRatio <= this.config.threshold) {
      this.hideCenterComponent();
    }

    if (visibleRatio > this.config.threshold) {
      this.showCenterComponent();
    }
  };

  AntigravityScrollController.prototype.startFading = function () {
    if (!this.isFading) {
      this.centerComponent.classList.add('fading');
      this.isFading = true;
    }
  };

  AntigravityScrollController.prototype.hideCenterComponent = function () {
    if (!this.isHidden) {
      this.centerComponent.classList.add('hidden');
      this.centerComponent.classList.remove('fading');
      this.isHidden = true;
      this.isFading = false;
      try {
        window.dispatchEvent(new CustomEvent('antigravity:hidden', { detail: { isHidden: true } }));
      } catch (e) {}
    }
  };

  AntigravityScrollController.prototype.showCenterComponent = function () {
    if (this.isHidden) {
      this.centerComponent.classList.remove('hidden', 'fading');
      this.isHidden = false;
      this.isFading = false;
      try {
        window.dispatchEvent(new CustomEvent('antigravity:shown', { detail: { isHidden: false } }));
      } catch (e) {}
    }
  };

  AntigravityScrollController.prototype.checkInitialState = function () {
    var heroRect = this.heroSection.getBoundingClientRect();
    var heroHeight = heroRect.height;
    var visibleHeight = Math.max(0, Math.min(heroRect.bottom, window.innerHeight) - Math.max(heroRect.top, 0));
    var visibleRatio = heroHeight > 0 ? visibleHeight / heroHeight : 1;

    if (visibleRatio <= this.config.threshold) {
      this.hideCenterComponent();
    }
  };

  function initAntigravityScroll() {
    window.antigravityController = new AntigravityScrollController();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAntigravityScroll);
  } else {
    initAntigravityScroll();
  }
})();
