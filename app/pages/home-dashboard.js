/**
 * Portfolio Dashboard - Redesigned
 * Handles metrics carousel, chart display, and news filtering
 */

class PortfolioDashboard {
  constructor() {
    this.carousel = document.getElementById('metricsCarousel');
    this.prevBtn = document.getElementById('carouselPrev');
    this.nextBtn = document.getElementById('carouselNext');
    this.metricCards = document.querySelectorAll('.metric-card');
    this.chartCanvas = document.getElementById('mainChart');
    this.chartTitle = document.getElementById('chartTitle');
    this.chartSubtitle = document.getElementById('chartSubtitle');
    this.newsFilters = document.querySelectorAll('.news-filter');
    this.newsCards = document.querySelectorAll('.news-card');

    this.currentIndex = 0;
    this.cardsVisible = this.getCardsVisible();
    this.maxIndex = Math.max(0, (this.metricCards.length || 0) - this.cardsVisible);
    this.autoplayInterval = null;
    this.currentMetric = 'risk';
    this.chart = null;

    this.init();
  }

  init() {
    this.setupCarousel();
    this.setupChart();
    this.setupNewsFilters();
    this.setupQuickActions();
    this.setupTimeRangeButtons();
    this.attachResizeListener();
  }

  setupCarousel() {
    this.updateCarousel();

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.stopAutoplay();
        this.prev();
        this.startAutoplay();
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.stopAutoplay();
        this.next();
        this.startAutoplay();
      });
    }

    this.metricCards.forEach((card) => {
      card.addEventListener('click', () => this.selectMetric(card.dataset.metric));
    });

    this.startAutoplay();
    if (this.carousel) {
      this.carousel.addEventListener('mouseenter', () => this.stopAutoplay());
      this.carousel.addEventListener('mouseleave', () => this.startAutoplay());
    }
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
    if (!this.carousel || !this.metricCards.length) return;

    const card = this.metricCards[0];
    const cardWidth = card ? card.offsetWidth + 16 : 296;
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

    this.metricCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.metric === metricType);
    });

    this.updateChart(metricType);
  }

  setupChart() {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.getContext('2d');
    const data = this.getChartData('risk');

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
            ticks: { color: '#9ca3af' }
          },
          y: {
            grid: { color: 'rgba(156, 163, 175, 0.1)' },
            ticks: { color: '#9ca3af' }
          }
        }
      }
    });
  }

  updateChart(metricType) {
    const info = this.getMetricInfo(metricType);
    if (this.chartTitle) this.chartTitle.textContent = info.title;
    if (this.chartSubtitle) this.chartSubtitle.textContent = info.subtitle;
    if (this.chart) {
      this.chart.data = this.getChartData(metricType);
      this.chart.update();
    }
  }

  getMetricInfo(metricType) {
    const info = {
      pnl: { title: "Today's P&L Analysis", subtitle: "Profit and loss throughout the trading day" },
      performer: { title: "Top Performer Trend", subtitle: "NVDA performance over the past 3 months" },
      risk: { title: "Risk Score Analysis", subtitle: "Portfolio risk assessment over time" },
      dividends: { title: "Dividend Income Tracking", subtitle: "Monthly dividend payments history" },
      market: { title: "Market Performance Comparison", subtitle: "Your portfolio vs S&P 500" },
      allocation: { title: "Asset Allocation History", subtitle: "Portfolio distribution over time" },
      volatility: { title: "Volatility Analysis", subtitle: "Portfolio volatility score trends" },
      beta: { title: "Beta vs Market", subtitle: "Portfolio correlation with market movements" },
      sector: { title: "Sector Exposure Breakdown", subtitle: "Technology sector concentration over time" }
    };
    return info[metricType] || info.risk;
  }

  getChartData(metricType) {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const datasets = {
      pnl: { label: "P&L", data: [1200, -400, 800, 1500, -200, 2000, 1247, 900, 1100], borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
      performer: { label: "NVDA", data: [150, 165, 180, 195, 220, 240, 265, 280, 295], borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' },
      risk: { label: "Risk Score", data: [5.5, 5.8, 6.0, 6.2, 6.1, 6.3, 6.2, 6.0, 5.9], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
      dividends: { label: "Dividends", data: [720, 735, 750, 780, 800, 825, 847, 850, 860], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
      market: { label: "Performance", data: [100, 102, 105, 107, 108, 110, 112, 115, 118], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
      allocation: { label: "Stocks %", data: [60, 62, 63, 65, 65, 66, 65, 64, 65], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
      volatility: { label: "Volatility", data: [5.2, 5.0, 4.8, 4.7, 4.9, 4.8, 4.6, 4.7, 4.8], borderColor: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.1)' },
      beta: { label: "Beta", data: [1.02, 1.03, 1.04, 1.05, 1.06, 1.05, 1.04, 1.05, 1.05], borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)' },
      sector: { label: "Tech %", data: [30, 31, 32, 33, 34, 35, 35, 34, 35], borderColor: '#14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.1)' }
    };

    const ds = datasets[metricType] || datasets.risk;
    return {
      labels,
      datasets: [{
        ...ds,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    };
  }

  setupNewsFilters() {
    this.newsFilters.forEach((f) => {
      f.addEventListener('click', () => {
        const category = f.dataset.filter;
        this.filterNews(category);
        this.newsFilters.forEach((x) => x.classList.remove('active'));
        f.classList.add('active');
      });
    });
  }

  filterNews(category) {
    this.newsCards.forEach((card) => {
      card.style.display = category === 'all' || card.dataset.category === category ? 'block' : 'none';
    });
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
        if (this.chart) this.chart.update();
      });
    });
  }

  handleQuickAction(action) {
    const msg = {
      refresh: 'Refreshing portfolio data...',
      report: 'Generating portfolio report...',
      transaction: 'Add transaction form would open here',
      analysis: 'Running portfolio analysis...',
      alerts: 'Alerts configuration would open here',
      watchlist: 'Add to watchlist form would open here'
    };
    if (window.notificationsSidebar && typeof window.notificationsSidebar.showToast === 'function') {
      window.notificationsSidebar.showToast(msg[action] || action, 'info');
    } else {
      console.log('Quick action:', action);
    }
  }

  attachResizeListener() {
    window.addEventListener('resize', () => {
      const n = this.getCardsVisible();
      if (n !== this.cardsVisible) {
        this.cardsVisible = n;
        this.maxIndex = Math.max(0, (this.metricCards.length || 0) - this.cardsVisible);
        this.currentIndex = Math.min(this.currentIndex, this.maxIndex);
        this.updateCarousel();
      }
    });
  }
}

function toggleNewsCard(header) {
  const card = header.closest('.news-card');
  if (card) card.classList.toggle('expanded');
}

document.addEventListener('DOMContentLoaded', () => {
  window.portfolioDashboard = new PortfolioDashboard();
});
