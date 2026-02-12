/**
 * Learning Center - Tab Management
 */
class LearningCenter {
  constructor() {
    this.tabs = document.querySelectorAll('.learning-tab');
    this.contents = document.querySelectorAll('.tab-content');

    this.init();
  }

  init() {
    this.attachTabListeners();
  }

  attachTabListeners() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(targetTab) {
    this.tabs.forEach(tab => {
      if (tab.dataset.tab === targetTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.contents.forEach(content => {
      if (content.dataset.content === targetTab) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.learningCenter = new LearningCenter();
});
