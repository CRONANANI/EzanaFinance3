// Watchlist Page - Add Member Modal + live market quotes + WatchlistFilters + StockWatchlistFilters

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

/** StockWatchlistFilters - Filter panel for Stock Watchlist */
class StockWatchlistFilters {
  constructor(options = {}) {
    this.panel = options.panel || document.getElementById('stockFiltersPanel');
    this.toggleBtn = options.toggleBtn || document.getElementById('stockFiltersToggle');
    this.clearBtn = options.clearBtn || document.getElementById('stockFiltersClear');
    this.table = options.table || document.getElementById('stockWatchlistTable');
    this.sectionsEl = options.sectionsEl || document.getElementById('stockFiltersSections');
    this.activeFilters = {};
    this.presets = {
      growth: { growth: ['rev-50'], mcap: ['large', 'mid'], valuation: ['pe-20-30'], expert: ['inst-buy'] },
      value: { valuation: ['pe-under-10', 'pb-under-1'], dividend: ['growth-5'], financial: ['positive-cf'] },
      momentum: { price: ['up-10-today'], volume: ['vol-2x'], technical: ['above-50dma', 'rsi-overbought'] },
      contrarian: { price: ['down-20-month'], technical: ['rsi-oversold'], expert: ['insider-buy'], analyst: ['upgrade'] },
      dividend: { dividend: ['div-yield-5', 'aristocrat', 'payout-low'], financial: ['positive-cf'] },
      'high-conviction': { expert: ['congress-buy', 'inst-buy', 'multi-insider-buy'], analyst: ['upgrade'] },
      breakout: { price: ['near-52w-high'], volume: ['vol-2x'], technical: ['breaking-resistance', 'macd-bullish'] },
      'short-squeeze': { short: ['high-20', 'squeeze-risk', 'days-cover-5'], volume: ['unusual-spike'], price: ['up-5-today'] },
      earnings: { fundamental: ['earnings-week', 'earnings-beat'], volume: ['vol-2x'], price: ['up-5-today'] },
      defensive: { market: ['beta-low'], dividend: ['div-yield-3'], sector: ['utilities', 'consumer-staples'] }
    };
  }

  setupToggle() {
    if (this.toggleBtn && this.panel) {
      this.toggleBtn.addEventListener('click', () => {
        this.panel.classList.toggle('open');
      });
    }
  }

  setupSectionToggles() {
    if (!this.sectionsEl) return;
    this.sectionsEl.querySelectorAll('.filter-section').forEach((section) => {
      const btn = section.querySelector('.filter-section-toggle');
      if (btn) {
        btn.addEventListener('click', () => section.classList.toggle('collapsed'));
      }
    });
  }

  setupCheckboxes() {
    if (!this.panel) return;
    this.panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => this.updateAndApply());
    });
  }

  setupPresets() {
    if (!this.panel) return;
    this.panel.querySelectorAll('.preset-btn[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (this.presets[preset]) this.applyPreset(this.presets[preset]);
      });
    });
  }

  applyPreset(preset) {
    if (!this.panel) return;
    this.panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
    Object.entries(preset).forEach(([name, values]) => {
      const vals = Array.isArray(values) ? values : [values];
      vals.forEach((v) => {
        const input = this.panel.querySelector(`input[name="${name}"][value="${v}"]`) ||
          this.panel.querySelector(`input[value="${v}"]`);
        if (input) input.checked = true;
      });
    });
    this.updateAndApply();
  }

  gatherFilters() {
    const filters = {};
    if (!this.panel) return filters;
    this.panel.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
      const name = cb.name;
      if (!filters[name]) filters[name] = [];
      filters[name].push(cb.value);
    });
    return filters;
  }

  updateSectionCounts() {
    if (!this.sectionsEl) return;
    this.sectionsEl.querySelectorAll('.filter-section').forEach((section) => {
      const opts = section.querySelectorAll('.filter-options input:checked');
      const countEl = section.querySelector('.filter-count');
      if (countEl) countEl.textContent = opts.length;
    });
  }

  updateAndApply() {
    this.activeFilters = this.gatherFilters();
    this.updateSectionCounts();
    this.applyFilters();
  }

  applyFilters() {
    const filters = this.activeFilters;
    const container = this.container || document.querySelector('.stock-watchlist-template');
    if (!container) return;
    const rows = container.querySelectorAll('.watchlist-stock-item[data-symbol]');
    const hasAny = Object.keys(filters).some((k) => filters[k] && filters[k].length > 0);

    rows.forEach((row) => {
      if (!hasAny) {
        row.style.display = '';
        return;
      }
      let show = true;
      for (const [filterName, filterValues] of Object.entries(filters)) {
        if (!filterValues || filterValues.length === 0) continue;
        const rowValues = (row.dataset[filterName] || '').split(/[,\s]+/).filter(Boolean);
        if (rowValues.length === 0) {
          show = false;
          break;
        }
        const match = filterValues.some((fv) => rowValues.includes(fv));
        if (!match) {
          show = false;
          break;
        }
      }
      row.style.display = show ? '' : 'none';
    });
  }

  clearAll() {
    if (!this.panel) return;
    this.panel.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
    this.updateAndApply();
  }

  init() {
    this.setupToggle();
    this.setupSectionToggles();
    this.setupCheckboxes();
    this.setupPresets();
    if (this.clearBtn) this.clearBtn.addEventListener('click', () => this.clearAll());
    this.updateAndApply();
  }
}
window.StockWatchlistFilters = StockWatchlistFilters;

function updateWatchlistFromQuotes(quotes) {
  if (!quotes || !quotes.length) return;
  quotes.forEach((q) => {
    document.querySelectorAll(`.watchlist-stock-item[data-symbol="${q.symbol}"]`).forEach((item) => {
      const price = q.current_price != null ? q.current_price : 0;
      const change = q.change != null ? q.change : 0;
      const changePct = q.change_percent != null ? q.change_percent : 0;
      const isPositive = change >= 0;
      const priceEl = item.querySelector('.watchlist-price');
      const changeEl = item.querySelector('.watchlist-change');
      const iconEl = item.querySelector('.stock-item-icon.insight-icon');
      if (priceEl) priceEl.textContent = '$' + price.toFixed(2);
      if (changeEl) {
        changeEl.textContent = (isPositive ? '+' : '') + '$' + change.toFixed(2);
        changeEl.className = 'watchlist-change ' + (isPositive ? 'positive' : 'negative');
      }
      if (iconEl) {
        iconEl.className = 'stock-item-icon insight-icon ' + (isPositive ? 'positive' : 'negative');
        iconEl.innerHTML = isPositive ? '<i class="bi bi-graph-up-arrow"></i>' : '<i class="bi bi-graph-down-arrow"></i>';
      }
    });
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
  const poll = () => {
    if (window.MarketDataService) {
      window.MarketDataService.getBatchQuotes(POLL_SYMBOLS).then((quotes) => {
        if (quotes && quotes.length) {
          var adapted = quotes.map(function(q) {
            return {
              symbol: q.symbol,
              current_price: q.price,
              change: q.change,
              change_percent: q.changePercent
            };
          });
          updateWatchlistFromQuotes(adapted);
        }
      }).catch(function() {});
    } else if (window.apiService) {
      window.apiService.getMarketQuotes(POLL_SYMBOLS).then((data) => {
        if (data && data.quotes) updateWatchlistFromQuotes(data.quotes);
      }).catch(() => {});
    }
  };
  poll();
  return setInterval(poll, POLL_INTERVAL_MS);
}

document.addEventListener('DOMContentLoaded', function() {
  const addMemberBtn = document.getElementById('addMemberBtn');
  const modal = document.getElementById('addMemberModal');
  const closeBtn = document.getElementById('closeModal');

  // Watchlist dropdown - select between created watchlists
  const watchlistDropdownBtn = document.getElementById('watchlistDropdownBtn');
  const watchlistDropdownMenu = document.getElementById('watchlistDropdownMenu');
  const activeWatchlistName = document.getElementById('activeWatchlistName');
  const watchlistDropdownWrap = document.querySelector('.watchlist-dropdown-wrap');

  function closeWatchlistDropdown() {
    if (watchlistDropdownWrap) watchlistDropdownWrap.classList.remove('active');
    if (watchlistDropdownBtn) watchlistDropdownBtn.setAttribute('aria-expanded', 'false');
    if (watchlistDropdownMenu) watchlistDropdownMenu.setAttribute('aria-hidden', 'true');
  }

  function setActiveWatchlist(id, label) {
    if (activeWatchlistName) activeWatchlistName.textContent = label;
    document.querySelectorAll('.watchlist-dropdown-item').forEach(function(item) {
      item.classList.toggle('active', item.dataset.watchlist === id);
    });
    document.querySelectorAll('.watchlist-category').forEach(function(cat) {
      const catId = cat.dataset.category;
      const show = id === 'all' || catId === id;
      cat.style.display = show ? '' : 'none';
      if (show && id !== 'all') {
        cat.classList.add('expanded');
        var icon = cat.querySelector('.watchlist-category-toggle i');
        if (icon) icon.className = 'bi bi-chevron-up';
      }
    });
    closeWatchlistDropdown();
  }

  if (watchlistDropdownBtn && watchlistDropdownWrap) {
    watchlistDropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      const isOpen = watchlistDropdownWrap.classList.toggle('active');
      watchlistDropdownBtn.setAttribute('aria-expanded', isOpen);
      watchlistDropdownMenu.setAttribute('aria-hidden', !isOpen);
    });
  }

  document.querySelectorAll('.watchlist-dropdown-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      setActiveWatchlist(item.dataset.watchlist, item.querySelector('span').textContent);
    });
  });

  document.addEventListener('click', function(e) {
    if (watchlistDropdownWrap && !watchlistDropdownWrap.contains(e.target)) {
      closeWatchlistDropdown();
    }
  });

  // Watchlist category expand/collapse
  document.querySelectorAll('.watchlist-category-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const category = btn.closest('.watchlist-category');
      const icon = btn.querySelector('i.bi-chevron-down, i.bi-chevron-up');
      category.classList.toggle('expanded');
      if (icon) {
        icon.className = category.classList.contains('expanded') ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
      }
    });
  });

  if (window.WatchlistFilters) {
    const filters = new WatchlistFilters();
    filters.init();
    window.watchlistFilters = filters;
  }

  if (window.StockWatchlistFilters) {
    const stockFilters = new StockWatchlistFilters();
    stockFilters.init();
    window.stockWatchlistFilters = stockFilters;
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
