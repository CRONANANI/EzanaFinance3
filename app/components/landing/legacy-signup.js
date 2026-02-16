/**
 * Legacy User Signup - First 10,000 get lifetime access
 * Collects emails for launch notification.
 */
(function () {
  'use strict';

  var form = document.getElementById('legacySignupForm');
  if (!form) return;

  var emailInput = document.getElementById('legacyEmail');
  var successEl = document.getElementById('legacySuccess');
  var errorEl = document.getElementById('legacyError');
  var submitBtn = form.querySelector('.legacy-submit-btn');

  var STORAGE_KEY = 'ezana_legacy_signup';

  function showSuccess() {
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = ''; }
    if (successEl) successEl.hidden = false;
    if (form) form.hidden = true;
    if (submitBtn) submitBtn.disabled = false;
  }

  function showError(msg) {
    if (successEl) successEl.hidden = true;
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  function isValidEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str || '');
  }

  function handleSubmit(e) {
    e.preventDefault();

    var email = (emailInput && emailInput.value) ? emailInput.value.trim() : '';
    if (!email) {
      showError('Please enter your email.');
      return;
    }
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address.');
      return;
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!stored.emails) stored.emails = [];
      if (!stored.emails.includes(email)) stored.emails.push(email);
      stored.lastSubmitted = email;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (err) {
      console.warn('Legacy signup storage:', err);
    }

    showSuccess();
  }

  form.addEventListener('submit', handleSubmit);

  if (emailInput) {
    emailInput.addEventListener('input', function () {
      if (errorEl) errorEl.hidden = true;
    });
  }

  try {
    var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (stored && stored.lastSubmitted) {
      showSuccess();
    }
  } catch (_) {}
})();
