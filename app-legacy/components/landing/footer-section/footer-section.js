/**
 * Footer Section - Dark mode toggle for static HTML
 */
(function () {
  'use strict';

  function initFooterSection() {
    var yearEl = document.getElementById('footerYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var form = document.getElementById('footerNewsletterForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        // Placeholder - wire to newsletter API
      });
    }

    var switchEl = document.getElementById('footerDarkSwitch');
    if (!switchEl) return;

    var isDark = true;

    function toggle() {
      isDark = !isDark;
      switchEl.classList.toggle('checked', isDark);
      switchEl.setAttribute('aria-checked', isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    switchEl.addEventListener('click', toggle);
    switchEl.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooterSection);
  } else {
    initFooterSection();
  }
})();
