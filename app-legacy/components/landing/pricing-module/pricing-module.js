/**
 * PricingModule - Switch and price toggle for static HTML
 */
(function () {
  'use strict';

  function initPricingModule() {
    var switchEl = document.getElementById('pricingSwitch');
    if (!switchEl) return;

    var isAnnual = false;

    function updatePrices() {
      var monthlyPrices = document.querySelectorAll('.pricing-module .monthly-price');
      var yearlyPrices = document.querySelectorAll('.pricing-module .yearly-price');
      var periods = document.querySelectorAll('.pricing-module .pricing-card-period');
      monthlyPrices.forEach(function (p) { p.style.display = isAnnual ? 'none' : 'inline'; });
      yearlyPrices.forEach(function (p) { p.style.display = isAnnual ? 'inline' : 'none'; });
      periods.forEach(function (p) {
        p.textContent = '/ month';
      });
    }

    function toggle() {
      isAnnual = !isAnnual;
      switchEl.classList.toggle('checked', isAnnual);
      switchEl.setAttribute('aria-checked', isAnnual);
      updatePrices();
    }

    switchEl.addEventListener('click', toggle);
    switchEl.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });

    var label = document.getElementById('pricingSwitchLabel');
    if (label) label.addEventListener('click', toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPricingModule);
  } else {
    initPricingModule();
  }
})();
