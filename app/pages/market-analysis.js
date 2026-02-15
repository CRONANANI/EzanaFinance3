/**
 * Market Analysis - Global Market Data with Claude AI
 */

class MarketAnalysis {
  constructor() {
    this.activeCategory = 'all';
    this.init();
  }
  
  init() {
    // Category tabs
    this.setupCategoryTabs();
    
    // Refresh buttons
    this.setupRefreshButtons();
    
    // AI insights
    this.setupAIInsights();
    
    // Export report button
    this.setupExportReport();
    
    // PMI chart
    this.initPMIChart();
    
    // Initial data load
    this.loadInitialData();
  }
  
  setupCategoryTabs() {
    const tabs = document.querySelectorAll('.category-tab');
    const cards = document.querySelectorAll('.data-card');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Filter cards
        cards.forEach(card => {
          if (category === 'all') {
            card.style.display = 'block';
          } else {
            const cardCategories = card.dataset.category.split(' ');
            if (cardCategories.includes(category)) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          }
        });
        
        this.activeCategory = category;
      });
    });
  }
  
  setupRefreshButtons() {
    // Refresh all data
    document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
      this.refreshAllData();
    });
    
    // Individual refresh buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.closest('button')?.dataset.action;
        if (action) this.handleAction(action);
      });
    });
  }
  
  setupAIInsights() {
    document.getElementById('generateInsightsBtn')?.addEventListener('click', () => {
      this.generateMarketInsights();
    });
  }
  
  setupExportReport() {
    document.getElementById('exportReportBtn')?.addEventListener('click', () => {
      this.exportReport();
    });
  }
  
  initPMIChart() {
    const canvas = document.getElementById('pmiChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Sample PMI data by region
    const pmiData = {
      labels: ['USA', 'Germany', 'Japan', 'China', 'UK', 'France'],
      datasets: [{
        label: 'Manufacturing PMI',
        data: [49.2, 45.8, 48.1, 50.1, 46.3, 44.2],
        backgroundColor: [
          'rgba(16, 185, 129, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ],
        borderColor: [
          '#10b981',
          '#ef4444',
          '#ef4444',
          '#10b981',
          '#ef4444',
          '#ef4444'
        ],
        borderWidth: 1
      }]
    };

    new Chart(ctx, {
      type: 'bar',
      data: pmiData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 42,
            max: 55,
            ticks: {
              callback: function(value) {
                return value === 50 ? '50 (Expansion)' : value;
              }
            }
          }
        }
      }
    });
  }
  
  async loadInitialData() {
    await this.updateMarketIndices();
    await this.updateSectorPerformance();
  }
  
  async updateMarketIndices() {
    console.log('Updating market indices...');
  }
  
  async updateSectorPerformance() {
    console.log('Updating sector performance...');
  }
  
  async refreshAllData() {
    const btn = document.getElementById('refreshAllBtn');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Refreshing...';
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.updateMarketIndices();
      await this.updateSectorPerformance();
      
      btn.innerHTML = '<i class="bi bi-check2"></i> Updated!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      btn.innerHTML = '<i class="bi bi-x"></i> Error';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
  }
  
  async handleAction(action) {
    switch(action) {
      case 'analyze-sectors':
        await this.analyzeSectorTrends();
        break;
      case 'ai-satellite':
        await this.analyzeSatelliteData();
        break;
      case 'fetch-economic':
        await this.fetchEconomicData();
        break;
      case 'refresh-indices':
        await this.updateMarketIndices();
        break;
      default:
        console.log('Action:', action);
    }
  }
  
  async analyzeSectorTrends() {
    const btn = document.querySelector('[data-action="analyze-sectors"]');
    const originalText = btn?.innerHTML;
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Analyzing...';
    }
    
    try {
      const prompt = `You are a Senior Equity Strategist at Morgan Stanley. Analyze current sector performance and provide investment insights.

Given today's sector performance:
- Technology: +2.4%
- Healthcare: +1.2%
- Financials: +0.8%
- Energy: -0.6%
- Consumer Discretionary: -1.1%

Please provide:
1. What's driving sector rotation today?
2. Which sectors look attractive for the next 3-6 months?
3. Key risks to watch in underperforming sectors
4. Positioning recommendations

Be concise (3-4 sentences max).`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const analysis = data.content?.[0]?.text || 'Analysis unavailable.';
      
      const insightBox = document.getElementById('sector-analysis');
      if (insightBox) {
        insightBox.innerHTML = `
          <h4>AI Sector Analysis</h4>
          <p>${analysis}</p>
        `;
        insightBox.classList.add('active');
      }
      
    } catch (error) {
      console.error('Error:', error);
      const insightBox = document.getElementById('sector-analysis');
      if (insightBox) {
        insightBox.innerHTML = `
          <h4>AI Sector Analysis</h4>
          <p>Unable to generate analysis. Set ANTHROPIC_API_KEY or use a backend proxy for Claude API. For now, here's a sample insight: Tech and Healthcare are leading today's rally on strong earnings expectations. Consider overweighting growth sectors while monitoring Fed commentary.</p>
        `;
        insightBox.classList.add('active');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }
  
  async generateMarketInsights() {
    const btn = document.getElementById('generateInsightsBtn');
    const container = document.getElementById('aiInsightsContainer');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Generating...';
    
    container.innerHTML = '<div class="insights-loading">Analyzing global market data...</div>';
    
    try {
      const prompt = `You are the Chief Investment Strategist at BlackRock. Provide a comprehensive market outlook based on current conditions.

Current Market Data:
- S&P 500: 4,783 (+0.8%)
- VIX: 14.2 (low volatility)
- 10Y Treasury: 4.18%
- Dollar Index: 103.45
- GDP Growth: 2.8%
- CPI: 3.1%
- Unemployment: 3.7%
- Fed Funds: 5.25-5.50%

Sector Performance:
- Tech leading (+2.4%)
- Consumer discretionary lagging (-1.1%)

Provide:
1. Market Outlook (3-6 months)
2. Key Drivers to Watch
3. Sector Recommendations
4. Risk Factors
5. Portfolio Positioning Advice

Format as professional investment memo. Be specific and actionable.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const insights = data.content?.[0]?.text || 'Insights unavailable.';
      
      container.innerHTML = `
        <div class="ai-insights-result">
          <div class="insights-header">
            <i class="bi bi-stars"></i>
            <h3>AI Market Insights - ${new Date().toLocaleDateString()}</h3>
          </div>
          <div class="insights-content">
            <pre>${insights}</pre>
          </div>
          <div class="insights-actions">
            <button class="export-btn" onclick="window.marketAnalysis.exportInsights()">
              <i class="bi bi-download"></i>
              Export PDF
            </button>
            <button class="copy-btn" onclick="window.marketAnalysis.copyInsights()">
              <i class="bi bi-clipboard"></i>
              Copy to Clipboard
            </button>
          </div>
        </div>
      `;
      
    } catch (error) {
      console.error('Error:', error);
      container.innerHTML = `
        <div class="insights-error">
          <i class="bi bi-exclamation-triangle"></i>
          <p>Error generating insights. Set ANTHROPIC_API_KEY or use a backend proxy for Claude API access.</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">Sample insight: Markets remain resilient with tech leading. Monitor Fed policy and inflation data for rotation signals.</p>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-stars"></i> Generate Insights';
    }
  }
  
  async analyzeSatelliteData() {
    const btn = document.querySelector('[data-action="ai-satellite"]');
    const originalText = btn?.innerHTML;
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Analyzing...';
    }
    
    try {
      const prompt = `You are an Alternative Data Analyst at Citadel. Interpret satellite and geospatial data for investment insights.

Current Alt Data:
- Retail parking lot traffic: +8.2% vs last week (Target, Walmart strong)
- Oil tank levels: -3.5% capacity (below 5-year average)
- Shipping activity: Neutral (port congestion easing)

Provide:
1. What do these signals indicate about the economy?
2. Which stocks/sectors benefit?
3. Investment implications (2-3 sentences)

Be concise and actionable.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': window.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const analysis = data.content?.[0]?.text || 'Analysis unavailable.';
      
      alert(`Satellite Data Analysis:\n\n${analysis}`);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Unable to generate analysis. Set ANTHROPIC_API_KEY or use a backend proxy. Sample: Retail traffic up suggests consumer strength; oil tanks low may support energy prices.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }
  
  async fetchEconomicData() {
    alert('Fetching latest economic data from FRED...');
  }
  
  exportReport() {
    const content = document.querySelector('.insights-content pre');
    if (content) {
      const text = content.textContent;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `market-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Generate insights first, or export will include current page data.');
    }
  }
  
  exportInsights() {
    const content = document.querySelector('.insights-content pre');
    if (!content) return;
    const text = content.textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-insights-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  copyInsights() {
    const content = document.querySelector('.insights-content pre');
    if (!content) return;
    const text = content.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector('.copy-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.marketAnalysis = new MarketAnalysis();
  
  // Initialize notifications sidebar if available
  if (window.NotificationsSidebar) {
    const sidebar = new NotificationsSidebar();
    sidebar.init();
  }
});
