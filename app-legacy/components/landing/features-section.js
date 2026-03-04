/**
 * Features Section - Animation and Interaction Handler
 * Ezana Finance Landing Page - Swarmnode-inspired features block
 */

(function (global) {
  'use strict';

  function FeaturesSection(container) {
    var root = container && container.nodeType ? container : document;
    this.container = container && container.nodeType ? container : null;
    this.features = root.querySelectorAll('.feature-block');
    this.tradeItems = root.querySelectorAll('.trade-item');
    this.observerOptions = {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    };
    this.observer = null;
    this.init();
  }

  FeaturesSection.prototype.init = function () {
    this.setupIntersectionObserver();
    this.setupTradeItemDelays();
    this.setupTimeRangeButtons();
    // Congress filters, intel tabs, portfolio rotation, community toggle are handled by *Filter/*Switcher/*Rotation/*Toggle classes below
  };

  /**
   * Intersection Observer for scroll-triggered animations
   */
  FeaturesSection.prototype.setupIntersectionObserver = function () {
    var self = this;
    this.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.dataset.feature === 'congress') {
            self.animateTradeItems();
          }
        }
      });
    }, this.observerOptions);

    this.features.forEach(function (feature) {
      self.observer.observe(feature);
    });
  };

  FeaturesSection.prototype.setupTradeItemDelays = function () {
    this.tradeItems.forEach(function (item) {
      var delay = item.getAttribute('data-delay') || '0';
      item.style.animationDelay = delay + 'ms';
    });
  };

  FeaturesSection.prototype.animateTradeItems = function () {
    var self = this;
    this.tradeItems.forEach(function (item) {
      var delay = parseInt(item.getAttribute('data-delay'), 10) || 0;
      setTimeout(function () {
        item.classList.add('animate');
      }, delay);
    });
  };

  /**
   * Portfolio time range buttons (1D, 1W, 1M, 1Y)
   */
  FeaturesSection.prototype.setupTimeRangeButtons = function () {
    var root = this.container || document;
    var timeBtns = root.querySelectorAll('.time-btn');

    timeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        timeBtns.forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');
      });
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btn.click();
        }
      });
    });
  };

  /**
   * Optional: disconnect observer when needed (e.g. for SPA teardown)
   */
  FeaturesSection.prototype.destroy = function () {
    if (this.observer && this.features.length) {
      this.features.forEach(function (feature) {
        this.observer.unobserve(feature);
      }.bind(this));
    }
  };

  // --- Congressional Trading Filter ---
  function CongressionalTradingFilter() {
    this.filterButtons = document.querySelectorAll('.congress-visual .filter-pill');
    this.mockData = {
      all: [
        { politician: 'Nancy Pelosi', ticker: 'NVDA', type: 'purchase', amount: '$50,001 - $100,000', party: 'democrat', chamber: 'house', time: '2 minutes ago' },
        { politician: 'Dan Crenshaw', ticker: 'TSLA', type: 'sale', amount: '$15,001 - $50,000', party: 'republican', chamber: 'house', time: '5 minutes ago' },
        { politician: 'Josh Gottheimer', ticker: 'AAPL', type: 'purchase', amount: '$100,001 - $250,000', party: 'democrat', chamber: 'house', time: '8 minutes ago' }
      ],
      purchases: [
        { politician: 'Nancy Pelosi', ticker: 'NVDA', type: 'purchase', amount: '$50,001 - $100,000', party: 'democrat', chamber: 'house', time: '2 minutes ago' },
        { politician: 'Josh Gottheimer', ticker: 'AAPL', type: 'purchase', amount: '$100,001 - $250,000', party: 'democrat', chamber: 'house', time: '8 minutes ago' },
        { politician: 'Tommy Tuberville', ticker: 'MSFT', type: 'purchase', amount: '$15,001 - $50,000', party: 'republican', chamber: 'senate', time: '12 minutes ago' }
      ],
      sales: [
        { politician: 'Dan Crenshaw', ticker: 'TSLA', type: 'sale', amount: '$15,001 - $50,000', party: 'republican', chamber: 'house', time: '5 minutes ago' },
        { politician: 'Debbie Stabenow', ticker: 'GM', type: 'sale', amount: '$1,001 - $15,000', party: 'democrat', chamber: 'senate', time: '15 minutes ago' },
        { politician: 'Pat Toomey', ticker: 'JPM', type: 'sale', amount: '$50,001 - $100,000', party: 'republican', chamber: 'senate', time: '22 minutes ago' }
      ],
      house: [
        { politician: 'Nancy Pelosi', ticker: 'NVDA', type: 'purchase', amount: '$50,001 - $100,000', party: 'democrat', chamber: 'house', time: '2 minutes ago' },
        { politician: 'Dan Crenshaw', ticker: 'TSLA', type: 'sale', amount: '$15,001 - $50,000', party: 'republican', chamber: 'house', time: '5 minutes ago' },
        { politician: 'Josh Gottheimer', ticker: 'AAPL', type: 'purchase', amount: '$100,001 - $250,000', party: 'democrat', chamber: 'house', time: '8 minutes ago' }
      ],
      senate: [
        { politician: 'Tommy Tuberville', ticker: 'MSFT', type: 'purchase', amount: '$15,001 - $50,000', party: 'republican', chamber: 'senate', time: '12 minutes ago' },
        { politician: 'Debbie Stabenow', ticker: 'GM', type: 'sale', amount: '$1,001 - $15,000', party: 'democrat', chamber: 'senate', time: '15 minutes ago' },
        { politician: 'Pat Toomey', ticker: 'JPM', type: 'sale', amount: '$50,001 - $100,000', party: 'republican', chamber: 'senate', time: '22 minutes ago' }
      ]
    };
    if (this.filterButtons.length) {
      this.attachFilterListeners();
    }
  }

  CongressionalTradingFilter.prototype.attachFilterListeners = function () {
    var self = this;
    this.filterButtons.forEach(function (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        var filter = button.getAttribute('data-filter') || 'all';
        self.applyFilter(filter);
        self.filterButtons.forEach(function (btn) {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      });
    });
  };

  CongressionalTradingFilter.prototype.applyFilter = function (filter) {
    var data = this.mockData[filter] || this.mockData.all;
    this.updateTradeDisplay(data);
  };

  CongressionalTradingFilter.prototype.updateTradeDisplay = function (data) {
    var feedItemsContainer = document.querySelector('.congress-visual .feed-items');
    if (!feedItemsContainer) return;
    feedItemsContainer.innerHTML = '';
    var self = this;
    data.forEach(function (trade, index) {
      var tradeItem = self.createTradeItem(trade, index);
      feedItemsContainer.appendChild(tradeItem);
    });
    setTimeout(function () {
      feedItemsContainer.querySelectorAll('.trade-item').forEach(function (item, i) {
        setTimeout(function () {
          item.classList.add('animate');
        }, i * 100);
      });
    }, 50);
  };

  CongressionalTradingFilter.prototype.createTradeItem = function (trade, index) {
    var div = document.createElement('div');
    div.className = 'trade-item';
    div.setAttribute('data-animate', 'slide-in');
    div.setAttribute('data-delay', index * 100);
    var icon = trade.type === 'purchase' ? 'arrow-up-circle-fill text-green' : 'arrow-down-circle-fill text-red';
    var badge = trade.type === 'purchase' ? 'Purchase' : 'Sale';
    div.innerHTML =
      '<div class="trade-icon"><i class="bi bi-' + icon.split(' ')[0] + ' ' + (trade.type === 'purchase' ? 'text-green' : 'text-red') + '"></i></div>' +
      '<div class="trade-details">' +
      '<div class="trade-header"><span class="politician-name">' + trade.politician + '</span><span class="trade-badge ' + trade.type + '">' + badge + '</span></div>' +
      '<div class="trade-info"><span class="ticker">' + trade.ticker + '</span><span class="amount">' + trade.amount + '</span></div>' +
      '<div class="trade-meta"><span class="timestamp">' + trade.time + '</span><span class="party ' + trade.party + '">' + (trade.party.charAt(0).toUpperCase() + trade.party.slice(1)) + '</span></div>' +
      '</div>';
    return div;
  };

  // --- Portfolio Metrics Rotation ---
  function PortfolioMetricsRotation() {
    this.metricsContainer = document.querySelector('.portfolio-visual .metrics-mini-grid');
    this.currentSet = 0;
    this.metricSets = [
      [
        { label: 'Risk Score', value: '6.2', unit: '/10' },
        { label: 'Sharpe Ratio', value: '1.45', unit: '' },
        { label: 'Dividends', value: '$847', unit: '/mo' },
        { label: 'Asset Allocation', value: 'Balanced', unit: '' }
      ],
      [
        { label: "Today's P&L", value: '+$1,247', unit: '' },
        { label: 'Top Performer', value: 'NVDA', unit: '+12.4%' },
        { label: 'Market Performance', value: '+8.4%', unit: ' vs S&P 500' },
        { label: 'Volatility Score', value: '4.8', unit: '/10' }
      ],
      [
        { label: 'Beta vs Market', value: '1.05', unit: '' },
        { label: 'Sector Exposure', value: 'Tech', unit: ' 35%' },
        { label: 'Monthly Dividends', value: '$847', unit: '' },
        { label: 'Risk Score', value: '6.2', unit: '/10' }
      ]
    ];
    if (this.metricsContainer) {
      var self = this;
      setInterval(function () {
        self.rotateMetrics();
      }, 5000);
    }
  }

  PortfolioMetricsRotation.prototype.rotateMetrics = function () {
    this.currentSet = (this.currentSet + 1) % this.metricSets.length;
    this.updateMetricsDisplay();
  };

  PortfolioMetricsRotation.prototype.updateMetricsDisplay = function () {
    if (!this.metricsContainer) return;
    var metrics = this.metricSets[this.currentSet];
    var metricElements = this.metricsContainer.querySelectorAll('.metric-mini');
    var self = this;
    metricElements.forEach(function (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
    });
    setTimeout(function () {
      metricElements.forEach(function (el, index) {
        if (metrics[index]) {
          var labelEl = el.querySelector('.metric-label');
          var valueEl = el.querySelector('.metric-value');
          if (labelEl) labelEl.textContent = metrics[index].label;
          if (valueEl) {
            if (metrics[index].unit) {
              valueEl.innerHTML = metrics[index].value + '<span class="metric-unit">' + metrics[index].unit + '</span>';
            } else {
              valueEl.textContent = metrics[index].value;
            }
          }
        }
        setTimeout(function () {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }, index * 50);
      });
    }, 300);
  };

  // --- Market Intelligence Tab Switcher ---
  function IntelligenceTabSwitcher() {
    this.tabs = document.querySelectorAll('.intelligence-visual .intel-tab');
    this.panels = document.querySelectorAll('.intelligence-visual .intel-panel');
    this.mockData = {
      contracts: [
        { agency: 'Department of Defense', company: 'Lockheed Martin', amount: '$450M', date: '2 days ago', impact: 'high' },
        { agency: 'NASA', company: 'SpaceX', amount: '$1.2B', date: '1 week ago', impact: 'high' },
        { agency: 'Department of Energy', company: 'Tesla', amount: '$85M', date: '2 weeks ago', impact: 'medium' }
      ],
      lobbying: [
        { company: 'Meta Platforms', amount: '$5.2M', quarter: 'Q4 2025', issues: 'Tech Policy, Privacy', impact: 'high' },
        { company: 'Amazon', amount: '$4.8M', quarter: 'Q4 2025', issues: 'Cloud Computing, Labor', impact: 'high' },
        { company: 'Google', amount: '$3.9M', quarter: 'Q4 2025', issues: 'AI Regulation, Antitrust', impact: 'medium' }
      ],
      patents: [
        { company: 'Apple', category: 'Consumer Electronics', count: 1247, quarter: 'Q4 2025', trend: 'up', impact: 'high' },
        { company: 'Tesla', category: 'Automotive AI', count: 892, quarter: 'Q4 2025', trend: 'up', impact: 'high' },
        { company: 'Nvidia', category: 'AI Hardware', count: 743, quarter: 'Q4 2025', trend: 'up', impact: 'medium' }
      ]
    };
    if (this.tabs.length && this.panels.length) {
      this.attachTabListeners();
    }
  }

  IntelligenceTabSwitcher.prototype.attachTabListeners = function () {
    var self = this;
    this.tabs.forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        var tabName = tab.getAttribute('data-tab') || 'contracts';
        self.switchTab(tabName);
        self.tabs.forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      });
    });
  };

  IntelligenceTabSwitcher.prototype.switchTab = function (tabName) {
    var self = this;
    this.panels.forEach(function (panel) {
      panel.style.display = 'none';
      panel.style.opacity = '0';
    });
    var targetPanel = document.querySelector('.intelligence-visual .intel-panel[data-panel="' + tabName + '"]');
    if (targetPanel) {
      targetPanel.style.display = 'flex';
      this.updatePanelContent(targetPanel, tabName);
      setTimeout(function () {
        targetPanel.style.opacity = '1';
      }, 50);
    }
  };

  IntelligenceTabSwitcher.prototype.updatePanelContent = function (panel, tabName) {
    var data = this.mockData[tabName];
    if (!data) return;
    panel.innerHTML = '';
    var self = this;
    data.forEach(function (item, index) {
      var itemEl = self.createIntelItem(item, tabName, index);
      panel.appendChild(itemEl);
    });
  };

  IntelligenceTabSwitcher.prototype.createIntelItem = function (item, type, index) {
    var div = document.createElement('div');
    div.className = 'intel-item';
    div.style.opacity = '0';
    div.style.transform = 'translateY(20px)';
    var impactCap = item.impact.charAt(0).toUpperCase() + item.impact.slice(1) + ' Impact';
    if (type === 'contracts') {
      div.innerHTML =
        '<div class="intel-icon contracts"><i class="bi bi-file-earmark-text"></i></div>' +
        '<div class="intel-content">' +
        '<div class="intel-title">' + item.agency + '</div>' +
        '<div class="intel-company">' + item.company + '</div>' +
        '<div class="intel-amount">' + item.amount + ' Contract Award</div>' +
        '<div class="intel-meta"><span class="intel-date">' + item.date + '</span><span class="intel-impact ' + item.impact + '">' + impactCap + '</span></div>' +
        '</div>';
    } else if (type === 'lobbying') {
      div.innerHTML =
        '<div class="intel-icon lobbying"><i class="bi bi-megaphone"></i></div>' +
        '<div class="intel-content">' +
        '<div class="intel-title">' + item.company + '</div>' +
        '<div class="intel-company">Lobbying Expenditure</div>' +
        '<div class="intel-amount">' + item.amount + ' spent in ' + item.quarter + '</div>' +
        '<div class="intel-meta"><span class="intel-date">' + item.issues + '</span><span class="intel-impact ' + item.impact + '">' + impactCap + '</span></div>' +
        '</div>';
    } else if (type === 'patents') {
      div.innerHTML =
        '<div class="intel-icon patents"><i class="bi bi-lightbulb"></i></div>' +
        '<div class="intel-content">' +
        '<div class="intel-title">' + item.company + '</div>' +
        '<div class="intel-company">' + item.category + '</div>' +
        '<div class="intel-amount">' + item.count + ' patents filed in ' + item.quarter + '</div>' +
        '<div class="intel-meta"><span class="intel-date">Trend: ' + (item.trend === 'up' ? '\u2191 Increasing' : '\u2193 Decreasing') + '</span><span class="intel-impact ' + item.impact + '">' + impactCap + '</span></div>' +
        '</div>';
    }
    var i = index;
    setTimeout(function () {
      div.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    }, i * 100);
    return div;
  };

  // --- Community Feed Toggle ---
  function CommunityFeedToggle() {
    this.feedActions = document.querySelectorAll('.community-visual .feed-action');
    this.postsContainer = document.querySelector('.community-visual .community-items');
    this.mockData = {
      trending: [
        { author: 'JD', name: 'John Doe', badge: 'expert', content: 'Just noticed a pattern in semiconductor congressional trades. NVDA purchases up 40% this week among tech committee members...', stats: { likes: 124, comments: 38, bookmarks: 56 } },
        { author: 'AS', name: 'Alex Smith', badge: 'verified', content: 'Defense contract awards correlating strongly with recent lobbying spend. Check out my detailed analysis...', stats: { likes: 89, comments: 22, bookmarks: 43 } }
      ],
      recent: [
        { author: 'MK', name: 'Maria Kim', badge: 'verified', content: 'New congressional trade alert: Senator just disclosed a large purchase in renewable energy sector. Interesting timing with upcoming legislation...', stats: { likes: 45, comments: 12, bookmarks: 23 } },
        { author: 'RP', name: 'Robert Park', badge: 'expert', content: 'Anyone else tracking the unusual patent filing activity from major tech companies this quarter? Something big might be coming...', stats: { likes: 67, comments: 18, bookmarks: 34 } }
      ]
    };
    if (this.feedActions.length && this.postsContainer) {
      this.setActiveAction(this.feedActions[0]);
      this.attachToggleListeners();
    }
  }

  CommunityFeedToggle.prototype.attachToggleListeners = function () {
    var self = this;
    this.feedActions.forEach(function (action) {
      action.addEventListener('click', function (e) {
        e.preventDefault();
        var text = action.textContent.trim().toLowerCase();
        var view = text.indexOf('trending') !== -1 ? 'trending' : 'recent';
        self.toggleView(view);
        self.setActiveAction(action);
      });
    });
  };

  CommunityFeedToggle.prototype.setActiveAction = function (activeAction) {
    this.feedActions.forEach(function (action) {
      action.style.borderColor = 'rgba(156, 163, 175, 0.1)';
      action.style.color = '#9ca3af';
    });
    if (activeAction) {
      activeAction.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      activeAction.style.color = '#10b981';
    }
  };

  CommunityFeedToggle.prototype.toggleView = function (view) {
    var data = this.mockData[view] || this.mockData.trending;
    this.updateFeedDisplay(data);
  };

  CommunityFeedToggle.prototype.updateFeedDisplay = function (data) {
    var container = this.postsContainer;
    if (!container) return;
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    var self = this;
    setTimeout(function () {
      container.innerHTML = '';
      data.forEach(function (post, index) {
        var postEl = self.createPostElement(post, index);
        container.appendChild(postEl);
      });
      container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 300);
  };

  CommunityFeedToggle.prototype.createPostElement = function (post, index) {
    var div = document.createElement('div');
    div.className = 'community-post';
    var badgeClass = post.badge === 'expert' ? 'expert' : 'verified';
    var badgeText = post.badge === 'expert' ? 'Expert Trader' : 'Verified';
    div.innerHTML =
      '<div class="post-author">' +
      '<div class="author-avatar">' + post.author + '</div>' +
      '<div class="author-info"><span class="author-name">' + post.name + '</span><span class="author-badge ' + badgeClass + '">' + badgeText + '</span></div>' +
      '</div>' +
      '<div class="post-content"><p>' + post.content + '</p></div>' +
      '<div class="post-stats">' +
      '<span class="stat"><i class="bi bi-hand-thumbs-up"></i> ' + post.stats.likes + '</span>' +
      '<span class="stat"><i class="bi bi-chat"></i> ' + post.stats.comments + '</span>' +
      '<span class="stat"><i class="bi bi-bookmark"></i> ' + post.stats.bookmarks + '</span>' +
      '</div>';
    return div;
  };

  // Auto-init when DOM is ready if script runs in page context
  function autoInit() {
    var container = document.getElementById('features-section-container');
    var section = document.querySelector('.features-section');
    if (section) {
      global._featuresSectionInstance = new FeaturesSection(section);
    }
    if (document.querySelector('.congress-visual')) {
      global.congressFilter = new CongressionalTradingFilter();
    }
    if (document.querySelector('.portfolio-visual')) {
      global.portfolioMetrics = new PortfolioMetricsRotation();
    }
    if (document.querySelector('.intelligence-visual')) {
      global.intelTabs = new IntelligenceTabSwitcher();
    }
    if (document.querySelector('.community-visual')) {
      global.communityFeed = new CommunityFeedToggle();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  global.FeaturesSection = FeaturesSection;
  global.CongressionalTradingFilter = CongressionalTradingFilter;
  global.PortfolioMetricsRotation = PortfolioMetricsRotation;
  global.IntelligenceTabSwitcher = IntelligenceTabSwitcher;
  global.CommunityFeedToggle = CommunityFeedToggle;
})(typeof window !== 'undefined' ? window : this);
