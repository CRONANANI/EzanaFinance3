/**
 * Market Analysis - Tab Management & Data Library Cards + live quotes
 */
const MARKET_POLL_SYMBOLS = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT'];
const MARKET_POLL_INTERVAL_MS = 5000;

function updateMarketStatCards(quotes) {
  if (!quotes || !quotes.length) return;
  const bySymbol = {};
  quotes.forEach((q) => { bySymbol[q.symbol] = q; });
  const spy = bySymbol.SPY;
  if (spy) {
    const v = document.getElementById('marketSp500Value');
    const c = document.getElementById('marketSp500Change');
    if (v && spy.current_price != null) v.textContent = spy.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (c && spy.change_percent != null) {
      c.textContent = (spy.change_percent >= 0 ? '+' : '') + spy.change_percent.toFixed(2) + '% Today';
      c.className = 'stat-change ' + (spy.change_percent >= 0 ? 'positive' : 'negative');
    }
  }
  let top = null;
  quotes.forEach((q) => {
    if (q.change_percent != null && (top === null || Math.abs(q.change_percent) > Math.abs(top.change_percent))) top = q;
  });
  if (top) {
    const v = document.getElementById('marketTopMoverValue');
    const c = document.getElementById('marketTopMoverChange');
    if (v) v.textContent = (top.change_percent >= 0 ? '+' : '') + top.change_percent.toFixed(2) + '%';
    if (c) {
      c.textContent = top.symbol;
      c.className = 'stat-change ' + (top.change_percent >= 0 ? 'positive' : 'negative');
    }
  }
}

function startMarketStatPolling() {
  if (!window.apiService) return null;
  const poll = () => {
    window.apiService.getMarketQuotes(MARKET_POLL_SYMBOLS).then((data) => {
      if (data && data.quotes) updateMarketStatCards(data.quotes);
    }).catch(() => {});
  };
  poll();
  return setInterval(poll, MARKET_POLL_INTERVAL_MS);
}

class MarketAnalysis {
  constructor() {
    this.tabs = document.querySelectorAll('.analysis-tab');
    this.contents = document.querySelectorAll('.tab-content');
    
    this.init();
  }
  
  init() {
    this.attachTabListeners();
    this.marketStatInterval = startMarketStatPolling();
    window.addEventListener('beforeunload', () => {
      if (this.marketStatInterval) clearInterval(this.marketStatInterval);
    });
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

// Fetch market data for movers, volume, and indices (uses cached /api/market/quotes)
function loadMarketDataFromFinnhub() {
  if (!window.apiService) return;
  const moverItems = document.querySelectorAll('.mover-item[data-symbol]');
  const volumeRows = document.querySelectorAll('.data-table tbody tr[data-symbol]');
  const indexCards = document.querySelectorAll('.index-card[data-symbol]');
  const allSymbols = new Set();
  moverItems.forEach(el => allSymbols.add(el.dataset.symbol));
  volumeRows.forEach(el => allSymbols.add(el.dataset.symbol));
  indexCards.forEach(el => allSymbols.add(el.dataset.symbol));
  const symbols = Array.from(allSymbols).filter(Boolean);
  if (symbols.length === 0) return;
  window.apiService.getMarketQuotes(symbols).then(data => {
    if (!data || !data.quotes) return;
    const bySymbol = {};
    data.quotes.forEach(q => { bySymbol[q.symbol] = q; });
    function updateMover(el) {
      const q = bySymbol[el.dataset.symbol];
      if (!q) return;
      const priceEl = el.querySelector('.mover-price');
      const changeEl = el.querySelector('.mover-change');
      if (priceEl && q.current_price != null) priceEl.textContent = '$' + q.current_price.toFixed(2);
      if (changeEl && q.change_percent != null) {
        changeEl.textContent = (q.change_percent >= 0 ? '+' : '') + q.change_percent.toFixed(1) + '%';
        changeEl.className = 'mover-change ' + (q.change_percent >= 0 ? 'positive' : 'negative');
      }
    }
    function updateVolumeRow(row) {
      const q = bySymbol[row.dataset.symbol];
      if (!q) return;
      const priceEl = row.querySelector('.volume-price');
      const changeEl = row.querySelector('.volume-change');
      if (priceEl && q.current_price != null) priceEl.textContent = '$' + q.current_price.toFixed(2);
      if (changeEl && q.change_percent != null) {
        changeEl.textContent = (q.change_percent >= 0 ? '+' : '') + q.change_percent.toFixed(1) + '%';
        changeEl.className = 'volume-change ' + (q.change_percent >= 0 ? 'positive' : 'negative');
      }
    }
    function updateIndexCard(card) {
      const q = bySymbol[card.dataset.symbol];
      if (!q) return;
      const valueEl = card.querySelector('.index-value');
      const changeEl = card.querySelector('.index-change');
      if (valueEl && q.current_price != null) valueEl.textContent = q.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (changeEl && q.change != null && q.change_percent != null) {
        changeEl.textContent = (q.change >= 0 ? '+' : '') + q.change.toFixed(2) + ' (' + (q.change_percent >= 0 ? '+' : '') + q.change_percent.toFixed(2) + '%)';
        changeEl.className = 'index-change ' + (q.change_percent >= 0 ? 'positive' : 'negative');
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
