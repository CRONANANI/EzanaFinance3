// Watchlist Page - Add Member Modal + live market quotes

const POLL_SYMBOLS = ['NVDA', 'AAPL', 'TSLA'];
const POLL_INTERVAL_MS = 5000;

function updateWatchlistFromQuotes(quotes) {
  if (!quotes || !quotes.length) return;
  quotes.forEach((q) => {
    const row = document.querySelector(`.watchlist-table tbody tr[data-symbol="${q.symbol}"]`);
    if (!row) return;
    const price = q.current_price != null ? q.current_price : 0;
    const change = q.change != null ? q.change : 0;
    const changePct = q.change_percent != null ? q.change_percent : 0;
    const priceEl = row.querySelector('.watchlist-price');
    const changeEl = row.querySelector('.watchlist-change');
    const pctEl = row.querySelector('.watchlist-pct');
    if (priceEl) priceEl.textContent = '$' + price.toFixed(2);
    if (changeEl) {
      changeEl.textContent = (change >= 0 ? '+' : '') + '$' + change.toFixed(2);
      changeEl.className = 'watchlist-change ' + (change >= 0 ? 'positive' : 'negative');
    }
    if (pctEl) {
      pctEl.textContent = (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%';
      pctEl.className = 'watchlist-pct ' + (changePct >= 0 ? 'positive' : 'negative');
    }
  });
  const perfEl = document.getElementById('watchlistPerformanceValue');
  if (perfEl && quotes.length) {
    let sum = 0;
    let n = 0;
    quotes.forEach((q) => {
      if (q.change_percent != null) { sum += q.change_percent; n++; }
    });
    const avg = n ? (sum / n).toFixed(2) : '0';
    const sign = parseFloat(avg) >= 0 ? '+' : '';
    perfEl.textContent = sign + avg + '%';
    perfEl.className = 'stat-value ' + (parseFloat(avg) >= 0 ? 'positive' : 'negative');
  }
}

function startWatchlistPolling() {
  if (!window.apiService) return null;
  const poll = () => {
    window.apiService.getMarketQuotes(POLL_SYMBOLS).then((data) => {
      if (data && data.quotes) updateWatchlistFromQuotes(data.quotes);
    }).catch(() => {});
  };
  poll();
  return setInterval(poll, POLL_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', function() {
  const addMemberBtn = document.getElementById('addMemberBtn');
  const modal = document.getElementById('addMemberModal');
  const closeBtn = document.getElementById('closeModal');

  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', function() {
      if (modal) modal.classList.add('active');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      if (modal) modal.classList.remove('active');
    });
  }

  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  let watchlistInterval = startWatchlistPolling();
  window.addEventListener('beforeunload', function() {
    if (watchlistInterval) clearInterval(watchlistInterval);
  });
});
