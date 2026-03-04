/**
 * FAQ Section - Two-level accordion:
 * 1) Category toggle: click category to expand/collapse its questions (all collapsed by default).
 * 2) Question accordion: click a question to reveal the answer.
 * Call initFAQ(container) after FAQ HTML is in the DOM.
 */
(function () {
  'use strict';

  function initFAQCategoryToggles(root) {
    var categories = root.querySelectorAll('.faq-category');
    categories.forEach(function (category) {
      var toggle = category.querySelector('.category-toggle');
      var itemsEl = category.querySelector('.faq-items');
      if (!toggle || !itemsEl) return;

      toggle.addEventListener('click', function () {
        var expanded = category.classList.toggle('category-expanded');
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });

      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    });
  }

  function initFAQAccordion(container) {
    var root = container && container.nodeType ? container : document;
    var items = root.querySelectorAll('.faq-item');
    var closeOthers = true;

    items.forEach(function (item) {
      var question = item.querySelector('.faq-question');
      var answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      question.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var isActive = item.classList.contains('active');

        if (isActive) {
          item.classList.remove('active');
          question.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = '';
        } else {
          if (closeOthers) {
            items.forEach(function (other) {
              if (other !== item) {
                other.classList.remove('active');
                var q = other.querySelector('.faq-question');
                var a = other.querySelector('.faq-answer');
                if (q) q.setAttribute('aria-expanded', 'false');
                if (a) a.style.maxHeight = '';
              }
            });
          }
          item.classList.add('active');
          question.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });

      question.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          question.click();
        }
      });
    });
  }

  function initFAQ(container) {
    var root = container && container.nodeType ? container : document;
    initFAQCategoryToggles(root);
    initFAQAccordion(root);
  }

  window.initFAQAccordion = initFAQAccordion;
  window.initFAQ = initFAQ;

  // No auto-init here: index.html calls initFAQ(container) once. Auto-init would run
  // again on DOMContentLoaded and attach duplicate listeners (toggle would fire twice = no visible change).
})();
