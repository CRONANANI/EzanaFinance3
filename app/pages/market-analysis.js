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

// Fetch Finnhub data for movers, volume, and indices
function loadMarketDataFromFinnhub() {
  if (!window.FinnhubAPI) return;
  const moverItems = document.querySelectorAll('.mover-item[data-symbol]');
  const volumeRows = document.querySelectorAll('.data-table tbody tr[data-symbol]');
  const indexCards = document.querySelectorAll('.index-card[data-symbol]');
  const allSymbols = new Set();
  moverItems.forEach(el => allSymbols.add(el.dataset.symbol));
  volumeRows.forEach(el => allSymbols.add(el.dataset.symbol));
  indexCards.forEach(el => allSymbols.add(el.dataset.symbol));
  const symbols = Array.from(allSymbols).filter(Boolean);
  if (symbols.length === 0) return;
  window.FinnhubAPI.getQuotes(symbols.join(',')).then(data => {
    if (!data || !data.quotes) return;
    const bySymbol = {};
    data.quotes.forEach(q => { bySymbol[q.symbol] = q; });
    function updateMover(el) {
      const q = bySymbol[el.dataset.symbol];
      if (!q || q.error) return;
      const priceEl = el.querySelector('.mover-price');
      const changeEl = el.querySelector('.mover-change');
      if (priceEl && q.c != null) priceEl.textContent = '$' + q.c.toFixed(2);
      if (changeEl && q.dp != null) {
        changeEl.textContent = (q.dp >= 0 ? '+' : '') + q.dp.toFixed(1) + '%';
        changeEl.className = 'mover-change ' + (q.dp >= 0 ? 'positive' : 'negative');
      }
    }
    function updateVolumeRow(row) {
      const q = bySymbol[row.dataset.symbol];
      if (!q || q.error) return;
      const priceEl = row.querySelector('.volume-price');
      const changeEl = row.querySelector('.volume-change');
      if (priceEl && q.c != null) priceEl.textContent = '$' + q.c.toFixed(2);
      if (changeEl && q.dp != null) {
        changeEl.textContent = (q.dp >= 0 ? '+' : '') + q.dp.toFixed(1) + '%';
        changeEl.className = 'volume-change ' + (q.dp >= 0 ? 'positive' : 'negative');
      }
    }
    function updateIndexCard(card) {
      const q = bySymbol[card.dataset.symbol];
      if (!q || q.error) return;
      const valueEl = card.querySelector('.index-value');
      const changeEl = card.querySelector('.index-change');
      if (valueEl && q.c != null) valueEl.textContent = q.c.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (changeEl && q.d != null && q.dp != null) {
        changeEl.textContent = (q.d >= 0 ? '+' : '') + q.d.toFixed(2) + ' (' + (q.dp >= 0 ? '+' : '') + q.dp.toFixed(2) + '%)';
        changeEl.className = 'index-change ' + (q.dp >= 0 ? 'positive' : 'negative');
      }
    }
    moverItems.forEach(updateMover);
    volumeRows.forEach(updateVolumeRow);
    indexCards.forEach(updateIndexCard);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.marketAnalysis = new MarketAnalysis();
  loadMarketDataFromFinnhub();
});
