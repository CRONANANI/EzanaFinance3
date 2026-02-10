/**
 * Features Section - Animation and Interaction Handler
 * Ezana Finance Landing Page - Swarmnode-inspired features block
 */

(function (global) {
  'use strict';

  function FeaturesSection(container) {
    var root = container && container.nodeType ? container : document;
    this.container = container && container.nodeType ? container : null;
    this.features = root.querySelectorAll('.feature-block');
    this.tradeItems = root.querySelectorAll('.trade-item');
    this.observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    };
    this.observer = null;
    this.init();
  }

  FeaturesSection.prototype.init = function () {
    this.setupIntersectionObserver();
    this.setupTradeItemDelays();
    this.setupFilterInteractions();
    this.setupTabInteractions();
    this.setupTimeRangeButtons();
  };

  /**
   * Intersection Observer for scroll-triggered animations
   */
  FeaturesSection.prototype.setupIntersectionObserver = function () {
    var self = this;
    this.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.dataset.feature === 'congress') {
            self.animateTradeItems();
          }
        }
      });
    }, this.observerOptions);

    this.features.forEach(function (feature) {
      self.observer.observe(feature);
    });
  };

  FeaturesSection.prototype.setupTradeItemDelays = function () {
    this.tradeItems.forEach(function (item) {
      var delay = item.getAttribute('data-delay') || '0';
      item.style.animationDelay = delay + 'ms';
    });
  };

  FeaturesSection.prototype.animateTradeItems = function () {
    var self = this;
    this.tradeItems.forEach(function (item) {
      var delay = parseInt(item.getAttribute('data-delay'), 10) || 0;
      setTimeout(function () {
        item.classList.add('animate');
      }, delay);
    });
  };

  /**
   * Filter pill interactions (Congressional Trading)
   */
  FeaturesSection.prototype.setupFilterInteractions = function () {
    var root = this.container || document;
    var filterPills = root.querySelectorAll('.filter-pill');
    var self = this;

    filterPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        filterPills.forEach(function (p) {
          p.classList.remove('active');
          p.setAttribute('aria-pressed', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
      });
      pill.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pill.click();
        }
      });
    });
  };

  /**
   * Intelligence tabs interactions
   */
  FeaturesSection.prototype.setupTabInteractions = function () {
    var root = this.container || document;
    var tabs = root.querySelectorAll('.intel-tab');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          tab.click();
        }
      });
    });
  };

  /**
   * Portfolio time range buttons (1D, 1W, 1M, 1Y)
   */
  FeaturesSection.prototype.setupTimeRangeButtons = function () {
    var root = this.container || document;
    var timeBtns = root.querySelectorAll('.time-btn');

    timeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        timeBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  };

  /**
   * Optional: disconnect observer when needed (e.g. for SPA teardown)
   */
  FeaturesSection.prototype.destroy = function () {
    if (this.observer && this.features.length) {
      this.features.forEach(function (feature) {
        this.observer.unobserve(feature);
      }.bind(this));
    }
  };

  // Auto-init when DOM is ready if script runs in page context
  function autoInit() {
    var container = document.getElementById('features-section-container');
    var section = document.querySelector('.features-section');
    if (section) {
      global._featuresSectionInstance = new FeaturesSection(section);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  global.FeaturesSection = FeaturesSection;
})(typeof window !== 'undefined' ? window : this);
