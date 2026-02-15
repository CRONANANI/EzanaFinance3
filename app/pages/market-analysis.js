/**
 * Market Analysis - Tab Management & Data Library Cards
 */
class MarketAnalysis {
  constructor() {
    this.tabs = document.querySelectorAll('.analysis-tab');
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
    // Update active tab
    this.tabs.forEach(tab => {
      if (tab.dataset.tab === targetTab) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update active content
    this.contents.forEach(content => {
      if (content.dataset.content === targetTab) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }
}

// Toggle Data Library card expand/collapse
function toggleDataCard(headerEl) {
  const card = headerEl.closest('.data-category-card');
  if (card) {
    card.classList.toggle('expanded');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.marketAnalysis = new MarketAnalysis();
});
