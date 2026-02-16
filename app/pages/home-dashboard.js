/**
 * Portfolio Dashboard - Complete
 * Handles sidebar toggle, metrics carousel, chart display, news ticker, and quick actions
 */

class PortfolioDashboard {
  constructor() {
    this.dashboardMain = document.querySelector('.dashboard-main');

    this.carousel = document.getElementById('metricsCarousel');
    this.prevBtn = document.getElementById('carouselPrev');
    this.nextBtn = document.getElementById('carouselNext');
    this.metricCards = document.querySelectorAll('.metric-card');

    this.chartCanvas = document.getElementById('mainChart');
    this.chartTitle = document.getElementById('chartTitle');

    this.newsTicker = document.getElementById('newsTicker');

    this.sidebarVisible = true;
    this.currentIndex = 0;
    this.cardsVisible = this.getCardsVisible();
    this.maxIndex = Math.max(0, (this.metricCards?.length || 0) - this.cardsVisible);
    this.autoplayInterval = null;
    this.currentMetric = 'portfolio';
    this.currentTimeRange = '3M';
    this.chart = null;

    this.init();
  }

  init() {
    this.setupDashboardSidebarSync();
    this.setupCarousel();
    this.toggleAllocationView(this.currentMetric === 'allocation');
    this.lazyLoadCharts();
    this.setupNewsTicker();
    this.setupQuickActions();
    this.setupTimeRangeButtons();
    this.attachResizeListener();
    this.startMarketQuotesPolling();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('portfolio-comparison-modal')?.classList.contains('active')) {
        this.closePortfolioComparisonModal();
      }
    });
  }

  startMarketQuotesPolling() {
    const POLL_SYMBOLS = ['NVDA', 'AAPL', 'MSFT', 'TSLA'];
    const POLL_INTERVAL_MS = 5000;

    const poll = () => {
      if (!window.apiService) return;
      window.apiService.getMarketQuotes(POLL_SYMBOLS).then((data) => {
        if (!data || !data.quotes) return;
        const bySymbol = {};
        data.quotes.forEach((q) => { bySymbol[q.symbol] = q; });
        this.updateMetricCards(bySymbol);
        this.updateTopHoldings(bySymbol);
      }).catch(() => {});
    };

    poll();
    this.marketQuotesInterval = setInterval(poll, POLL_INTERVAL_MS);
    window.addEventListener('beforeunload', () => this.stopMarketQuotesPolling());
  }

  stopMarketQuotesPolling() {
    if (this.marketQuotesInterval) {
      clearInterval(this.marketQuotesInterval);
      this.marketQuotesInterval = null;
    }
  }

  updateMetricCards(bySymbol) {
    const card = document.querySelector('.metric-card[data-symbol="NVDA"]');
    if (card) {
      const q = bySymbol.NVDA;
      if (q) {
        const valueEl = card.querySelector('.metric-value');
        const changeEl = card.querySelector('.metric-change');
        if (valueEl && q.current_price != null) valueEl.textContent = 'NVDA $' + q.current_price.toFixed(2);
        if (changeEl && q.change_percent != null) {
          changeEl.textContent = (q.change_percent >= 0 ? '+' : '') + q.change_percent.toFixed(2) + '%';
          changeEl.className = 'metric-change ' + (q.change_percent >= 0 ? 'positive' : 'negative');
        }
      }
    }
  }

  updateTopHoldings(bySymbol) {
    document.querySelectorAll('.holding-item[data-symbol]').forEach((item) => {
      const q = bySymbol[item.dataset.symbol];
      if (!q) return;
      const shares = parseInt(item.dataset.shares || '0', 10);
      const valueEl = item.querySelector('.holding-value-display');
      const changeEl = item.querySelector('.holding-change-display');
      if (valueEl && q.current_price != null) {
        const val = shares ? (shares * q.current_price).toLocaleString(undefined, { maximumFractionDigits: 0 }) : q.current_price.toFixed(2);
        valueEl.textContent = shares ? '$' + val : '$' + q.current_price.toFixed(2);
      }
      if (changeEl && q.change_percent != null) {
        changeEl.textContent = (q.change_percent >= 0 ? '+' : '') + q.change_percent.toFixed(2) + '%';
        changeEl.className = 'holding-change-display change ' + (q.change_percent >= 0 ? 'positive' : 'negative');
      }
    });
  }

  setupDashboardSidebarSync() {
    // Notifications sidebar handles its own toggle; sync dashboard-main margin with body.sidebar-open
    const updateMargin = () => {
      const open = document.body.classList.contains('sidebar-open');
      if (this.dashboardMain) {
        this.dashboardMain.classList.toggle('sidebar-hidden', !open);
      }
    };
    updateMargin();
    const observer = new MutationObserver(updateMargin);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  setupNewsTicker() {
    if (!this.newsTicker) return;

    const newsItems = Array.from(this.newsTicker.children);
    newsItems.forEach((item) => {
      const clone = item.cloneNode(true);
      this.newsTicker.appendChild(clone);
    });

    this.newsTicker.addEventListener('mouseenter', () => {
      this.newsTicker.style.animationPlayState = 'paused';
    });
    this.newsTicker.addEventListener('mouseleave', () => {
      this.newsTicker.style.animationPlayState = 'running';
    });
  }

  setupCarousel() {
    this.updateCarousel();

    this.prevBtn?.addEventListener('click', () => {
      this.stopAutoplay();
      this.prev();
      this.startAutoplay();
    });
    this.nextBtn?.addEventListener('click', () => {
      this.stopAutoplay();
      this.next();
      this.startAutoplay();
    });

    this.metricCards?.forEach((card) => {
      card.addEventListener('click', () => this.selectMetric(card.dataset.metric));
    });

    this.startAutoplay();
    this.carousel?.addEventListener('mouseenter', () => this.stopAutoplay());
    this.carousel?.addEventListener('mouseleave', () => this.startAutoplay());
  }

  getCardsVisible() {
    const w = window.innerWidth;
    if (w < 768) return 1;
    if (w < 1024) return 2;
    if (w < 1440) return 3;
    return 4;
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateCarousel();
    }
  }

  next() {
    if (this.currentIndex < this.maxIndex) {
      this.currentIndex++;
      this.updateCarousel();
    } else {
      this.currentIndex = 0;
      this.updateCarousel();
    }
  }

  updateCarousel() {
    if (!this.carousel || !this.metricCards?.length) return;
    const card = this.metricCards[0];
    const cardWidth = card ? card.offsetWidth + 12 : 252;
    const offset = -(this.currentIndex * cardWidth);
    this.carousel.style.transform = `translateX(${offset}px)`;
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex === 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= this.maxIndex && this.maxIndex > 0;
  }

  startAutoplay() {
    this.stopAutoplay();
    this.autoplayInterval = setInterval(() => this.next(), 4000);
  }

  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  selectMetric(metricType) {
    this.currentMetric = metricType;
    this.metricCards?.forEach((card) => {
      card.classList.toggle('active', card.dataset.metric === metricType);
    });
    this.toggleAllocationView(metricType === 'allocation');
    this.updateChart(metricType);
  }

  toggleAllocationView(isAllocation) {
    const lineChart = document.getElementById('lineChartContainer');
    const allocationView = document.getElementById('allocationChartView');
    const timeRangeSelector = document.getElementById('timeRangeSelector');
    const allocationTimeframe = document.getElementById('allocationTimeframe');
    if (lineChart) lineChart.style.display = isAllocation ? 'none' : '';
    if (allocationView) allocationView.style.display = isAllocation ? 'block' : 'none';
    if (timeRangeSelector) timeRangeSelector.style.display = isAllocation ? 'none' : 'flex';
    if (allocationTimeframe) allocationTimeframe.style.display = isAllocation ? 'block' : 'none';
  }

  lazyLoadCharts() {
    const self = this;
    if (typeof Chart !== 'undefined') {
      this.setupChart();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    script.onload = function() {
      self.setupChart();
    };
    document.head.appendChild(script);
  }

  setupChart() {
    if (!this.chartCanvas) return;
    const ctx = this.chartCanvas.getContext('2d');
    const data = this.getChartData('portfolio');

    this.chart = new Chart(ctx, {
      type: 'line',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#10b981',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 1,
            padding: 12,
            displayColors: false
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: '#9ca3af', font: { size: 10 } }
          }
        }
      }
    });
  }

  updateChart(metricType) {
    const info = this.getMetricInfo(metricType);
    if (this.chartTitle) this.chartTitle.textContent = info.title;
    if (this.chart) {
      this.chart.data = this.getChartData(metricType);
      this.chart.update();
    }
  }

  getMetricInfo(metricType) {
    const info = {
      portfolio: { title: 'Total Portfolio Value' },
      pnl: { title: "Today's P&L Analysis" },
      performer: { title: 'Top Performer Trend' },
      risk: { title: 'Risk Score Analysis' },
      dividends: { title: 'Dividend Income Tracking' },
      allocation: { title: 'Asset Allocation History' },
      volatility: { title: 'Volatility Analysis' },
      beta: { title: 'Beta vs Market' },
      sector: { title: 'Sector Exposure Breakdown' }
    };
    return info[metricType] || info.portfolio;
  }

  getTimeRangeData() {
    const ranges = {
      '1D': { labels: ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'], points: 14 },
      '1W': { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], points: 7 },
      '1M': { labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5'], points: 5 },
      '3M': { labels: ['Mo1', 'Mo2', 'Mo3'], points: 3 },
      '6M': { labels: ['Mo1', 'Mo2', 'Mo3', 'Mo4', 'Mo5', 'Mo6'], points: 6 },
      '1Y': { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], points: 12 }
    };
    return ranges[this.currentTimeRange] || ranges['3M'];
  }

  getChartData(metricType) {
    const { labels, points } = this.getTimeRangeData();
    const rand = (seed, min, max) => (seed * 0.1 % 1) * (max - min) + min;
    const baseData = {
      portfolio: { label: 'Portfolio Value', base: 158420, min: 127500, max: 165000, trend: 1.0003, swing: 0.003 },
      pnl: { label: 'P&L', base: 1247, min: -500, max: 2500, trend: 1.0, swing: 0.5 },
      performer: { label: 'NVDA', base: 295, min: 150, max: 320, trend: 1.002, swing: 0.01 },
      risk: { label: 'Risk Score', base: 6.2, min: 5.0, max: 7.0, trend: 1.0, swing: 0.05 },
      dividends: { label: 'Dividends', base: 847, min: 700, max: 900, trend: 1.001, swing: 0.01 },
      allocation: { label: 'Stocks %', base: 65, min: 58, max: 68, trend: 1.0005, swing: 0.5 },
      volatility: { label: 'Volatility', base: 4.8, min: 4.2, max: 5.5, trend: 0.9995, swing: 0.1 },
      beta: { label: 'Beta', base: 1.05, min: 0.98, max: 1.12, trend: 1.0, swing: 0.02 },
      sector: { label: 'Tech %', base: 35, min: 28, max: 38, trend: 1.001, swing: 0.5 }
    };
    const cfg = baseData[metricType] || baseData.portfolio;
    const data = [];
    const startFactor = this.currentTimeRange === '1D' ? 0.998 : (this.currentTimeRange === '1W' ? 0.97 : (this.currentTimeRange === '1M' ? 0.95 : (this.currentTimeRange === '6M' ? 0.90 : (this.currentTimeRange === '1Y' ? 0.85 : 0.92))));
    let v = cfg.base * startFactor;
    const swing = (cfg.swing || 0.01) * cfg.base;
    for (let i = 0; i < points; i++) {
      v = v * cfg.trend + rand(i + 1, -swing, swing);
      v = Math.min(cfg.max, Math.max(cfg.min, v));
      data.push(Math.round(v * 100) / 100);
    }
    if (this.currentTimeRange !== '1D' && data.length > 0) data[data.length - 1] = cfg.base;
    const bgColors = { portfolio: 'rgba(16, 185, 129, 0.1)', pnl: 'rgba(16, 185, 129, 0.1)', performer: 'rgba(251, 191, 36, 0.1)', risk: 'rgba(239, 68, 68, 0.1)', dividends: 'rgba(34, 197, 94, 0.1)', allocation: 'rgba(139, 92, 246, 0.1)', volatility: 'rgba(236, 72, 153, 0.1)', beta: 'rgba(249, 115, 22, 0.1)', sector: 'rgba(20, 184, 166, 0.1)' };
    const fgColors = { portfolio: '#10b981', pnl: '#10b981', performer: '#fbbf24', risk: '#ef4444', dividends: '#22c55e', allocation: '#8b5cf6', volatility: '#ec4899', beta: '#f97316', sector: '#14b8a6' };
    return {
      labels,
      datasets: [{
        label: cfg.label,
        data,
        borderColor: fgColors[metricType] || '#10b981',
        backgroundColor: bgColors[metricType] || 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    };
  }

  setupQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.handleQuickAction(btn.dataset.action));
    });
  }

  setupTimeRangeButtons() {
    document.querySelectorAll('.time-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTimeRange = btn.dataset.range || '3M';
        this.updateChart(this.currentMetric);
      });
    });
  }

  handleQuickAction(action) {
    if (action === 'analysis') {
      this.openPortfolioComparisonModal();
      return;
    }
    const msg = {
      refresh: 'Refreshing portfolio data...',
      report: 'Generating portfolio report...',
      alerts: 'Alerts configuration would open here',
      watchlist: 'Add to watchlist form would open here'
    };
    console.log('Quick action:', msg[action] || action);
  }

  openPortfolioComparisonModal() {
    let modal = document.getElementById('portfolio-comparison-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'portfolio-comparison-modal';
      modal.className = 'portfolio-comparison-modal';
      modal.innerHTML = `
        <div class="comparison-modal-overlay"></div>
        <div class="comparison-modal-content">
          <div class="comparison-modal-header">
            <h3>Portfolio vs Market Indices</h3>
            <button class="comparison-modal-close" aria-label="Close"><i class="bi bi-x"></i></button>
          </div>
          <p class="comparison-modal-desc">Compare your portfolio performance against major market indices over time.</p>
          <div class="comparison-chart-wrap">
            <canvas id="comparisonChart"></canvas>
          </div>
          <div class="comparison-index-legend">
            <span class="legend-item"><i class="bi bi-circle-fill" style="color:#10b981"></i> Your Portfolio</span>
            <span class="legend-item"><i class="bi bi-circle-fill" style="color:#3b82f6"></i> S&P 500</span>
            <span class="legend-item"><i class="bi bi-circle-fill" style="color:#8b5cf6"></i> NASDAQ</span>
            <span class="legend-item"><i class="bi bi-circle-fill" style="color:#f59e0b"></i> Dow Jones</span>
          </div>
          <div class="comparison-time-select">
            <button class="comp-time-btn active" data-range="1M">1M</button>
            <button class="comp-time-btn" data-range="3M">3M</button>
            <button class="comp-time-btn" data-range="6M">6M</button>
            <button class="comp-time-btn" data-range="1Y">1Y</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector('.comparison-modal-overlay').addEventListener('click', () => this.closePortfolioComparisonModal());
      modal.querySelector('.comparison-modal-close').addEventListener('click', () => this.closePortfolioComparisonModal());
      modal.querySelectorAll('.comp-time-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.comp-time-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.updateComparisonChart(btn.dataset.range);
        });
      });
    }
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.initComparisonChart(), 50);
  }

  closePortfolioComparisonModal() {
    const modal = document.getElementById('portfolio-comparison-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  initComparisonChart() {
    const canvas = document.getElementById('comparisonChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (this.comparisonChart) this.comparisonChart.destroy();
    this.comparisonChart = new Chart(ctx, {
      type: 'line',
      data: this.getComparisonChartData('3M'),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#10b981',
            bodyColor: '#9ca3af',
            borderColor: 'rgba(16, 185, 129, 0.2)',
            borderWidth: 1,
            padding: 12
          }
        },
        scales: {
          x: { grid: { color: 'rgba(156, 163, 175, 0.1)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
          y: { grid: { color: 'rgba(156, 163, 175, 0.1)' }, ticks: { color: '#9ca3af', font: { size: 10 } } }
        }
      }
    });
  }

  updateComparisonChart(range) {
    if (this.comparisonChart) {
      this.comparisonChart.data = this.getComparisonChartData(range || '3M');
      this.comparisonChart.update();
    }
  }

  getComparisonChartData(range) {
    const config = {
      '1M': { labels: ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'Wk5'], points: 5 },
      '3M': { labels: ['Mo1', 'Mo2', 'Mo3'], points: 3 },
      '6M': { labels: ['Mo1', 'Mo2', 'Mo3', 'Mo4', 'Mo5', 'Mo6'], points: 6 },
      '1Y': { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], points: 12 }
    };
    const { labels, points } = config[range] || config['3M'];
    const portfolio = [];
    const spy = [];
    const nasdaq = [];
    const dow = [];
    let p = 100, s = 100, n = 100, d = 100;
    for (let i = 0; i < points; i++) {
      p = p * (1 + (Math.sin(i * 0.5) * 0.02 + 0.015));
      s = s * (1 + (Math.sin(i * 0.4) * 0.015 + 0.01));
      n = n * (1 + (Math.sin(i * 0.6) * 0.02 + 0.012));
      d = d * (1 + (Math.sin(i * 0.35) * 0.012 + 0.008));
      portfolio.push(Math.round(p * 100) / 100);
      spy.push(Math.round(s * 100) / 100);
      nasdaq.push(Math.round(n * 100) / 100);
      dow.push(Math.round(d * 100) / 100);
    }
    return {
      labels,
      datasets: [
        { label: 'Your Portfolio', data: portfolio, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 2 },
        { label: 'S&P 500', data: spy, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
        { label: 'NASDAQ', data: nasdaq, borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
        { label: 'Dow Jones', data: dow, borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 }
      ]
    };
  }

  attachResizeListener() {
    window.addEventListener('resize', () => {
      const n = this.getCardsVisible();
      if (n !== this.cardsVisible) {
        this.cardsVisible = n;
        this.maxIndex = Math.max(0, (this.metricCards?.length || 0) - this.cardsVisible);
        this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
        this.updateCarousel();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.portfolioDashboard = new PortfolioDashboard();
});
