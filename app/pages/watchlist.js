// Watchlist Page - Add Member Modal + Finnhub stock data

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

  // Fetch real-time stock data from Finnhub via backend
  if (window.FinnhubAPI) {
    const rows = document.querySelectorAll('.watchlist-table tbody tr[data-symbol]');
    const symbols = Array.from(rows).map(r => r.dataset.symbol);
    if (symbols.length) {
      window.FinnhubAPI.getQuotes(symbols).then(data => {
        if (data && data.quotes) {
          data.quotes.forEach(q => {
            if (q.error) return;
            const row = document.querySelector(`.watchlist-table tbody tr[data-symbol="${q.symbol}"]`);
            if (!row) return;
            const c = q.c != null ? q.c : 0;
            const d = q.d != null ? q.d : 0;
            const dp = q.dp != null ? q.dp : 0;
            const priceEl = row.querySelector('.watchlist-price');
            const changeEl = row.querySelector('.watchlist-change');
            const pctEl = row.querySelector('.watchlist-pct');
            if (priceEl) priceEl.textContent = '$' + c.toFixed(2);
            if (changeEl) {
              changeEl.textContent = (d >= 0 ? '+' : '') + '$' + d.toFixed(2);
              changeEl.className = 'watchlist-change ' + (d >= 0 ? 'positive' : 'negative');
            }
            if (pctEl) {
              pctEl.textContent = (dp >= 0 ? '+' : '') + dp.toFixed(2) + '%';
              pctEl.className = 'watchlist-pct ' + (dp >= 0 ? 'positive' : 'negative');
            }
          });
        }
      });
    }
  }
});
