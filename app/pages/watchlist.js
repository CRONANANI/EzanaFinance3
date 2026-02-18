// Watchlist Page - Add Member Modal + live market quotes + WatchlistFilters

const POLL_SYMBOLS = ['NVDA', 'AAPL', 'TSLA'];
const POLL_INTERVAL_MS = 5000;

/** WatchlistFilters - Filter sidebar for Recent Activity */
class WatchlistFilters {
  constructor(options = {}) {
    this.sidebar = options.sidebar || document.getElementById('filtersSidebar');
    this.activityList = options.activityList || document.getElementById('activityList');
    this.chipsContainer = options.chipsContainer || document.getElementById('activeFiltersChips');
    this.clearBtn = options.clearBtn || document.getElementById('clearAllFilters');
    this.activeFilters = {};
    this.presets = {
      congress: { activity: ['congressional'], position: ['100k-1m', 'over-1m'], time: '7d' },
      institutional: { activity: ['13f'], investor: ['hedge-funds'] },
      insider: { activity: ['insider'], investor: ['insiders'], time: '30d' },
      tech: { activity: ['13f', 'insider'], position: ['over-1m'], investor: ['institutional'] },
      contrarian: { activity: ['insider'], time: '30d' },
      political: { activity: ['congressional'], time: '7d' }
    };
  }

  setupToggles() {
    if (!this.sidebar) return;
    const sections = this.sidebar.querySelectorAll('.filter-section');
    sections.forEach((section) => {
      const btn = section.querySelector('.filter-section-toggle');
      if (btn) {
        btn.addEventListener('click', () => {
          section.classList.toggle('collapsed');
        });
      }
    });
  }

  setupCheckboxes() {
    if (!this.sidebar) return;
    this.sidebar.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => this.updateActiveFilters());
    });
    this.sidebar.querySelectorAll('input[type="radio"]').forEach((rb) => {
      rb.addEventListener('change', () => this.updateActiveFilters());
    });
  }

  setupPresets() {
    if (!this.sidebar) return;
    this.sidebar.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (this.presets[preset]) this.applyPreset(this.presets[preset]);
      });
    });
  }

  applyPreset(preset) {
    this.sidebar.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const name = cb.name;
      const val = cb.value;
      cb.checked = preset[name] && (Array.isArray(preset[name]) ? preset[name].includes(val) : preset[name] === val);
    });
    this.sidebar.querySelectorAll('input[type="radio"]').forEach((rb) => {
      rb.checked = preset.time === rb.value;
    });
    this.updateActiveFilters();
    this.applyFilters();
  }

  gatherFilters() {
    const filters = {};
    if (!this.sidebar) return filters;
    this.sidebar.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      if (!filters[cb.name]) filters[cb.name] = [];
      filters[cb.name].push(cb.value);
    });
    this.sidebar.querySelectorAll('input[type="radio"]:checked').forEach((rb) => {
      filters[rb.name] = rb.value;
    });
    return filters;
  }

  updateActiveFilters() {
    this.activeFilters = this.gatherFilters();
    if (!this.chipsContainer) return;
    this.chipsContainer.innerHTML = '';
    const labels = { activity: 'Activity', investor: 'Investor', position: 'Position', time: 'Time' };
    const valueLabels = {
      congressional: 'Congress', '13f': '13F', insider: 'Insider', 'gov-contracts': 'Gov Contracts',
      lobbying: 'Lobbying', patents: 'Patents', 'hedge-funds': 'Hedge Funds', institutional: 'Institutional',
      insiders: 'Insiders', 'under-10k': '<$10K', '10k-100k': '$10K-$100K', '100k-1m': '$100K-$1M',
      'over-1m': '>$1M', '24h': '24h', '7d': '7 Days', '30d': '30 Days', quarter: 'Quarter', year: 'Year'
    };
    Object.entries(this.activeFilters).forEach(([key, val]) => {
      const arr = Array.isArray(val) ? val : [val];
      arr.forEach((v) => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip';
        const label = valueLabels[v] || v;
        chip.innerHTML = `${labels[key] || key}: ${label} <button type="button" aria-label="Remove">×</button>`;
        chip.querySelector('button').addEventListener('click', () => {
          const input = this.sidebar.querySelector(`input[name="${key}"][value="${v}"]`);
          if (input) input.checked = false;
          this.updateActiveFilters();
          this.applyFilters();
        });
        this.chipsContainer.appendChild(chip);
      });
    });
    this.updateSectionCounts();
  }

  updateSectionCounts() {
    if (!this.sidebar) return;
    this.sidebar.querySelectorAll('.filter-section').forEach((section) => {
      const opts = section.querySelectorAll('.filter-options input:checked');
      const countEl = section.querySelector('.filter-count');
      if (countEl) countEl.textContent = opts.length;
    });
  }

  applyFilters() {
    const filters = this.activeFilters;
    if (!this.activityList) return;
    const items = this.activityList.querySelectorAll('.member-item');
    const hasActivity = filters.activity && filters.activity.length > 0;
    const hasInvestor = filters.investor && filters.investor.length > 0;
    const hasPosition = filters.position && filters.position.length > 0;
    const hasTime = filters.time;
    const hasAny = hasActivity || hasInvestor || hasPosition || hasTime;

    items.forEach((item) => {
      if (!hasAny) {
        item.style.display = '';
        return;
      }
      let show = true;
      if (hasActivity) {
        const act = (item.dataset.activity || '').toLowerCase();
        show = filters.activity.some((a) => act === a || act.includes((a || '').replace('-', '')));
      }
      if (show && hasInvestor) {
        const inv = (item.dataset.investor || '').toLowerCase();
        show = filters.investor.some((i) => inv === i || inv.includes((i || '').replace('-', '')));
      }
      if (show && hasPosition) {
        const pos = (item.dataset.position || '').toLowerCase();
        show = filters.position.some((p) => pos === p || pos.includes((p || '').replace('-', '')));
      }
      if (show && hasTime) {
        const t = (item.dataset.time || '').toLowerCase();
        show = t === filters.time;
      }
      item.style.display = show ? '' : 'none';
    });
  }

  clearAll() {
    if (!this.sidebar) return;
    this.sidebar.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    this.sidebar.querySelectorAll('input[type="radio"]').forEach((rb) => { rb.checked = false; });
    this.updateActiveFilters();
    this.applyFilters();
  }

  init() {
    this.setupToggles();
    this.setupCheckboxes();
    this.setupPresets();
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clearAll());
    }
    this.updateActiveFilters();
  }
}
window.WatchlistFilters = WatchlistFilters;

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

  if (window.WatchlistFilters) {
    const filters = new WatchlistFilters();
    filters.init();
    window.watchlistFilters = filters;
  }

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
