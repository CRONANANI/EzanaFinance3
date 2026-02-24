/**
 * Company Research - Financial Models with Claude API
 * Set window.ANTHROPIC_API_KEY for live API calls; otherwise demo mode is used.
 */

const MODEL_PROMPTS = {
  dcf: `You are a Senior Analyst at Goldman Sachs. I need a complete DCF (Discounted Cash Flow) valuation model for [COMPANY_NAME].

Please provide:
- Free cash flow projections: Next 5 years with growth assumptions
- WACC calculation: Cost of equity + cost of debt breakdown
- Terminal value: Both perpetuity growth and exit multiple methods
- Sensitivity analysis: How value changes with different assumptions
- Discount rate justification: Why we chose this WACC
- Key drivers: What makes cash flow go up or down
- Comparable companies: How our assumptions compare to peers
- Valuation range: Bull case, base case, bear case scenarios

Format as investment banking pitch book valuation page with clear formulas.

Company: [COMPANY_DESCRIPTION]`,

  'three-statement': `You are a VP at Morgan Stanley. I need a complete three-statement model for [COMPANY_NAME].

Please provide:
- Income statement: Revenue, costs, EBITDA, net income (5 years)
- Balance sheet: Assets, liabilities, equity (5 years)
- Cash flow statement: Operating, investing, financing activities (5 years)
- Link formulas: How statements connect (net income → cash flow → balance sheet)
- Working capital: How AR, inventory, and AP change
- Debt schedule: Principal payments and interest expense
- Key assumptions: Revenue growth, margins, capex as % of sales
- Error checks: Balance sheet balancing and circular references

Format as Excel-style model with formulas explained in plain English.

Company: [COMPANY_DESCRIPTION]`,

  'ma-accretion': `You are a Managing Director at JP Morgan. I need an accretion/dilution analysis for [ACQUIRER] buying [TARGET].

Please provide:
- Deal structure: Cash vs. stock mix and total consideration
- Pro forma income statement: Combined company earnings
- EPS impact: Accretion or dilution percentage
- Synergies: Cost savings and revenue opportunities with dollar amounts
- Funding sources: Debt, cash on hand, or equity issuance
- Credit impact: How debt/EBITDA ratio changes
- Break-even analysis: What synergies needed to be accretive
- Sensitivity table: EPS impact at different purchase prices

Format as M&A analysis memo with deal recommendations.

Deal: [COMPANY_DESCRIPTION]`,

  lbo: `You are a Private Equity Associate at KKR. I need a complete LBO model for [COMPANY_NAME].

Please provide:
- Sources and uses: How deal is funded (debt, equity, fees)
- Debt structure: Senior debt, mezzanine, interest rates, covenants
- Cash flow sweep: How excess cash pays down debt
- Exit scenarios: Strategic sale vs. IPO in year 5
- IRR calculation: Internal rate of return for equity investors
- Cash-on-cash multiple: Total proceeds divided by equity invested
- Debt paydown schedule: Year-by-year principal reduction
- Management assumptions: EBITDA growth and margin improvement

Format as private equity investment committee memo with returns analysis.

Company: [COMPANY_DESCRIPTION]`,

  comps: `You are an Equity Research Analyst at Citi. I need a trading comps analysis for [COMPANY_NAME].

Please provide:
- Peer group: 10-15 public companies in same industry
- Trading multiples: EV/EBITDA, EV/Revenue, P/E for each peer
- Financial metrics: Revenue, EBITDA, margins for comparison
- Valuation range: 25th percentile, median, 75th percentile multiples
- Implied valuation: What our company is worth at each multiple
- Adjustments: Why our company deserves premium or discount
- Growth comparison: How our growth compares to peers
- Quality screen: Which peers are most comparable and why

Format as comparable company valuation table with multiples highlighted.

Company: [COMPANY_DESCRIPTION]`,

  precedent: `You are an M&A Banker at Lazard. I need a precedent transaction analysis for [COMPANY_NAME].

Please provide:
- Transaction universe: 15-20 relevant M&A deals in past 5 years
- Deal multiples: EV/EBITDA, EV/Revenue paid in each transaction
- Deal characteristics: Acquirer, target, deal size, date, rationale
- Premium analysis: Control premium paid over trading price
- Valuation range: 25th percentile, median, 75th percentile of multiples
- Deal adjustments: Strategic vs. financial buyers, synergy levels
- Market conditions: How M&A market has changed over time
- Implied valuation: What our company is worth based on precedents

Format as M&A valuation analysis with transaction comparables table.

Company: [COMPANY_DESCRIPTION]`,

  ipo: `You are a Capital Markets Banker at Barclays. I need an IPO pricing analysis for [COMPANY_NAME].

Please provide:
- Offering structure: Primary vs. secondary shares, total raise
- Pre-money valuation: Company value before IPO proceeds
- Post-money valuation: Company value after IPO proceeds
- Comparable IPOs: Recent deals in same sector with pricing multiples
- Valuation range: Low, mid, high price per share scenarios
- Dilution analysis: How much existing owners get diluted
- Float analysis: Percentage of company trading publicly
- First-day pop expectation: Typical underpricing in sector

Format as IPO pricing memo with share price recommendation range.

Company: [COMPANY_DESCRIPTION]`,

  credit: `You are a Leveraged Finance Banker at Credit Suisse. I need a debt capacity analysis for [COMPANY_NAME].

Please provide:
- EBITDA analysis: Last 3 years and next 3 years projected
- Leverage ratios: Total Debt/EBITDA industry standards
- Interest coverage: EBITDA/Interest expense minimum thresholds
- Debt structure: Senior secured, unsecured, subordinated layers
- Covenants: Financial maintenance tests (leverage, coverage)
- Maximum debt: How much company can borrow responsibly
- Pricing grid: Interest rates at different leverage levels
- Refinancing analysis: When existing debt matures and needs rollover

Format as credit memo with debt capacity recommendation.

Company: [COMPANY_DESCRIPTION]`,

  sotp: `You are a Restructuring Advisor at Evercore. I need a sum-of-the-parts valuation for [COMPANY_NAME].

Please provide:
- Business segments: Break company into distinct operating divisions
- Segment financials: Revenue, EBITDA, margins for each division
- Valuation methodology: Best approach for each segment (DCF, comps, multiples)
- Segment values: Individual valuation for each business unit
- Corporate costs: Overhead to allocate or remove
- Debt allocation: How to assign debt to each segment
- Total value: Sum of all parts minus debt plus cash
- Value per share: Implied stock price from SOTP analysis

Format as restructuring analysis with breakup valuation scenarios.

Company: [COMPANY_DESCRIPTION]`,

  operating: `You are a Growth Equity Investor at General Atlantic. I need a detailed operating model for [COMPANY_NAME].

Please provide:
- Revenue build: Bottom-up forecast by customer, product, or geography
- Unit economics: CAC, LTV, payback period, gross margin per unit
- Cohort analysis: How different customer vintages perform over time
- Key drivers: What makes revenue and costs move
- Scenario planning: Upside, base, downside case assumptions
- Burn rate: Monthly cash consumption and runway calculation
- Breakeven analysis: When company becomes cash flow positive
- Scaling assumptions: How unit economics improve with growth

Format as operating model with monthly projections for year 1, quarterly for years 2-3.

Company: [COMPANY_DESCRIPTION]`,

  sensitivity: `You are a Risk Management VP at UBS. I need sensitivity and scenario analysis for [COMPANY_NAME].

Please provide:
- One-way sensitivity: How value changes with one variable (revenue growth, margin, WACC)
- Two-way sensitivity: How value changes with two variables simultaneously
- Scenario builder: Best case (all positives), base case (likely), worst case (all negatives)
- Monte Carlo inputs: Probability distributions for key assumptions
- Breakeven analysis: What must go right for deal to work
- Downside protection: How bad can things get before disaster
- Risk factors: Top 5 assumptions with biggest impact on value
- Hedging strategies: How to protect against key risks

Format as risk analysis memo with sensitivity tables and scenario outcomes.

Company: [COMPANY_DESCRIPTION]`,

  'investment-memo': `You are a Partner at Blackstone. I need an investment committee memo for [COMPANY_NAME].

Please provide:
- Executive summary: 3-paragraph overview of opportunity (investment thesis, returns, risks)
- Deal overview: Structure, size, use of proceeds, timeline
- Company analysis: Business model, competitive position, financial performance
- Industry analysis: Market size, growth, trends, competitive dynamics
- Investment thesis: Why this deal makes money (3-5 key points)
- Valuation summary: Multiple methodologies with football field chart description
- Returns analysis: IRR, cash-on-cash multiple, exit scenarios
- Risk assessment: Top 5 risks and mitigation strategies
- Recommendation: Invest or pass with clear reasoning

Format as investment committee presentation deck outline.

Company: [COMPANY_DESCRIPTION]`
};

function getDemoAnalysis(company, modelType) {
  const title = {
    'dcf': 'DCF Valuation Model',
    'three-statement': 'Three-Statement Financial Model',
    'ma-accretion': 'M&A Accretion/Dilution Analysis',
    'lbo': 'LBO Model',
    'comps': 'Comparable Companies Analysis',
    'precedent': 'Precedent Transactions Analysis',
    'ipo': 'IPO Valuation',
    'credit': 'Credit Analysis',
    'sotp': 'Sum-of-the-Parts Valuation',
    'operating': 'Operating Model',
    'sensitivity': 'Sensitivity Analysis',
    'investment-memo': 'Investment Committee Memo'
  }[modelType] || 'Financial Model';
  return `[DEMO MODE - Add your Anthropic API key for live analysis]\n\n${title} for ${company}\n\nThis is a placeholder. Configure window.ANTHROPIC_API_KEY and the Claude API will generate investment banking-quality analysis.`;
}

class CompanyResearch {
  constructor() {
    this.currentCompany = null;
    this.searchInput = document.getElementById('companySearchInput');
    this.searchBtn = document.getElementById('searchCompanyBtn');
    this.suggestionsEl = document.getElementById('searchSuggestions');
    this._debounceTimer = null;
    this._highlightIndex = -1;
    this._suggestions = [];
    this.init();
  }

  init() {
    if (this.searchBtn) this.searchBtn.addEventListener('click', () => this.searchCompany());
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { this.handleEnterKey(); } });
      this.searchInput.addEventListener('input', () => this.onSearchInput());
      this.searchInput.addEventListener('keydown', (e) => this.onSearchKeydown(e));
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.company-search-wrapper')) this.hideSuggestions();
    });
    document.querySelectorAll('.run-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelType = e.target.closest('button').dataset.model;
        if (modelType) this.runModel(modelType);
      });
    });
  }

  onSearchInput() {
    clearTimeout(this._debounceTimer);
    const query = this.searchInput.value.trim();
    if (query.length < 1) {
      this.hideSuggestions();
      return;
    }
    this._debounceTimer = setTimeout(() => this.fetchSuggestions(query), 250);
  }

  async fetchSuggestions(query) {
    if (!this.suggestionsEl) return;

    this.suggestionsEl.innerHTML = '<div class="search-suggestions-loading"><i class="bi bi-arrow-repeat spin"></i> Searching...</div>';
    this.suggestionsEl.classList.add('active');

    let results = [];
    try {
      if (window.AlphaVantageAPI) {
        results = await window.AlphaVantageAPI.searchSymbol(query);
      }
    } catch (e) {
      console.warn('Symbol search failed:', e);
    }

    if (!results || results.length === 0) {
      results = this.getLocalMatches(query);
    }

    this._suggestions = results;
    this._highlightIndex = -1;

    if (results.length === 0) {
      this.suggestionsEl.innerHTML = '<div class="search-suggestions-empty">No results found</div>';
      return;
    }

    this.suggestionsEl.innerHTML = results.slice(0, 8).map((r, i) => `
      <div class="suggestion-item" data-index="${i}" data-symbol="${this.escapeAttr(r.symbol)}">
        <span class="suggestion-symbol">${this.escapeHtml(r.symbol)}</span>
        <div class="suggestion-details">
          <div class="suggestion-name">${this.escapeHtml(r.name)}</div>
          <div class="suggestion-meta">${this.escapeHtml(r.region || '')}${r.currency ? ' &middot; ' + this.escapeHtml(r.currency) : ''}</div>
        </div>
        <span class="suggestion-type">${this.escapeHtml(r.type || 'Equity')}</span>
      </div>
    `).join('');

    this.suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSuggestion(item.dataset.symbol);
      });
    });
  }

  getLocalMatches(query) {
    const popular = [
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'V', name: 'Visa Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'WMT', name: 'Walmart Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'UNH', name: 'UnitedHealth Group', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'XOM', name: 'Exxon Mobil Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'HD', name: 'The Home Depot Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'MA', name: 'Mastercard Incorporated', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'DIS', name: 'The Walt Disney Company', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'NFLX', name: 'Netflix Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'ADBE', name: 'Adobe Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'CRM', name: 'Salesforce Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'INTC', name: 'Intel Corporation', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'BA', name: 'The Boeing Company', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'GS', name: 'Goldman Sachs Group', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'UBER', name: 'Uber Technologies Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'SQ', name: 'Block Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'COIN', name: 'Coinbase Global Inc.', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'PLTR', name: 'Palantir Technologies', type: 'Equity', region: 'United States', currency: 'USD' },
      { symbol: 'SNOW', name: 'Snowflake Inc.', type: 'Equity', region: 'United States', currency: 'USD' }
    ];
    const q = query.toLowerCase();
    return popular.filter(s =>
      s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }

  onSearchKeydown(e) {
    if (!this.suggestionsEl || !this.suggestionsEl.classList.contains('active')) return;
    const items = this.suggestionsEl.querySelectorAll('.suggestion-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._highlightIndex = Math.min(this._highlightIndex + 1, items.length - 1);
      this.updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._highlightIndex = Math.max(this._highlightIndex - 1, -1);
      this.updateHighlight(items);
    } else if (e.key === 'Escape') {
      this.hideSuggestions();
    }
  }

  handleEnterKey() {
    const items = this.suggestionsEl ? this.suggestionsEl.querySelectorAll('.suggestion-item') : [];
    if (this._highlightIndex >= 0 && items[this._highlightIndex]) {
      this.selectSuggestion(items[this._highlightIndex].dataset.symbol);
    } else {
      this.searchCompany();
    }
  }

  updateHighlight(items) {
    items.forEach((item, i) => {
      item.classList.toggle('highlighted', i === this._highlightIndex);
    });
    if (this._highlightIndex >= 0 && items[this._highlightIndex]) {
      items[this._highlightIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  selectSuggestion(symbol) {
    if (this.searchInput) this.searchInput.value = symbol;
    this.hideSuggestions();
    this.currentCompany = symbol;
    this.loadCompanyData(symbol);
  }

  hideSuggestions() {
    if (this.suggestionsEl) {
      this.suggestionsEl.classList.remove('active');
      this.suggestionsEl.innerHTML = '';
    }
    this._highlightIndex = -1;
    this._suggestions = [];
  }

  escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  searchCompany() {
    const query = this.searchInput ? this.searchInput.value.trim() : '';
    if (!query) return;
    this.hideSuggestions();
    this.currentCompany = query;
    this.loadCompanyData(query);
  }

  async loadCompanyData(query) {
    const ticker = /^[A-Z]{1,5}$/i.test(query) ? query.toUpperCase() : null;
    if (!ticker) return;

    const svc = window.MarketDataService;
    if (svc) {
      try {
        const [profile, quote, dcf, analystData, peers, financials] = await Promise.all([
          svc.getCompanyProfile(ticker).catch(() => null),
          svc.getQuote(ticker).catch(() => null),
          svc.getDCFValuation(ticker).catch(() => null),
          svc.getAnalystData(ticker).catch(() => null),
          svc.getPeers(ticker).catch(() => []),
          svc.getFinancials(ticker).catch(() => null)
        ]);

        if (quote) this.updateStatsFromQuote(quote, profile);
        if (profile) this.updateCompanyInfoPanel(profile);
        if (dcf) this.updateDCF(dcf);
        if (analystData) this.updateAnalystData(analystData);
        if (peers && peers.length) this.updatePeers(peers);
        if (financials) this.updateFinancials(financials);
      } catch (e) {
        console.warn('MarketDataService load failed, falling back to Finnhub:', e);
        this.loadFinnhubData(ticker);
      }
    } else {
      this.loadFinnhubData(ticker);
    }
  }

  updateStatsFromQuote(quote, profile) {
    var el;
    el = document.getElementById('statPrice');
    if (el && quote.price != null) el.textContent = '$' + Number(quote.price).toFixed(2);
    el = document.getElementById('statPriceChange');
    if (el && quote.changePercent != null) {
      var pct = Number(quote.changePercent);
      el.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
      el.className = 'stat-change ' + (pct >= 0 ? 'positive' : 'negative');
    }
    el = document.getElementById('statMarketCap');
    if (el) {
      var mc = quote.marketCap || (profile && profile.marketCap) || 0;
      el.textContent = mc >= 1e12 ? '$' + (mc / 1e12).toFixed(1) + 'T' : mc >= 1e9 ? '$' + (mc / 1e9).toFixed(1) + 'B' : mc >= 1e6 ? '$' + (mc / 1e6).toFixed(0) + 'M' : '$' + mc.toLocaleString();
    }
    el = document.getElementById('statCapType');
    if (el) {
      var mc2 = quote.marketCap || (profile && profile.marketCap) || 0;
      el.textContent = mc2 >= 200e9 ? 'Mega Cap' : mc2 >= 10e9 ? 'Large Cap' : mc2 >= 2e9 ? 'Mid Cap' : mc2 >= 300e6 ? 'Small Cap' : 'Micro Cap';
    }
    el = document.getElementById('statPE');
    if (el && profile && profile.pe) el.textContent = Number(profile.pe).toFixed(1);
    el = document.getElementById('statEPS');
    if (el && profile && profile.eps) el.textContent = 'EPS: $' + Number(profile.eps).toFixed(2);
    el = document.getElementById('statVolume');
    if (el && quote.volume) {
      var v = quote.volume;
      el.textContent = v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(0) + 'K' : v;
    }
    el = document.getElementById('statBeta');
    if (el && profile && profile.beta) el.textContent = 'Beta: ' + Number(profile.beta).toFixed(2);
  }

  updateCompanyInfoPanel(profile) {
    var panel = document.getElementById('companyInfoPanel');
    if (!panel) return;
    panel.style.display = '';
    var setTxt = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val || '--'; };
    setTxt('companyName', profile.name);
    setTxt('companySector', profile.sector + ' / ' + profile.industry);
    setTxt('companyExchange', profile.exchange);
    setTxt('companyDescription', profile.description || 'No description available.');
    setTxt('companyCEO', profile.ceo);
    setTxt('companyEmployees', profile.employees ? Number(profile.employees).toLocaleString() : '--');
    setTxt('companyIPODate', profile.ipoDate);
    setTxt('company52High', profile.high52 ? '$' + Number(profile.high52).toFixed(2) : '--');
    setTxt('company52Low', profile.low52 ? '$' + Number(profile.low52).toFixed(2) : '--');
    setTxt('companyDivYield', profile.dividendYield ? (Number(profile.dividendYield) * 100).toFixed(2) + '%' : '--');
    var logo = document.getElementById('companyLogo');
    if (logo && profile.image) { logo.src = profile.image; logo.style.display = ''; }
  }

  updateDCF(dcf) {
    var el = document.getElementById('companyDCF');
    if (el && dcf && dcf.dcf != null) el.textContent = '$' + Number(dcf.dcf).toFixed(2);
  }

  updateAnalystData(data) {
    var el = document.getElementById('companyRating');
    if (el && data.rating) {
      el.textContent = data.rating.ratingRecommendation || data.rating.rating || '--';
    }
  }

  updatePeers(peers) {
    var section = document.getElementById('companyPeers');
    var list = document.getElementById('peersList');
    if (!section || !list) return;
    section.style.display = '';
    list.innerHTML = peers.slice(0, 8).map(function(p) {
      return '<span class="peer-badge">' + p + '</span>';
    }).join('');
  }

  updateFinancials(fin) {
    var section = document.getElementById('companyFinancials');
    var wrap = document.getElementById('financialsTableWrap');
    if (!section || !wrap || !fin || !fin.metrics || !fin.metrics.length) return;
    section.style.display = '';
    var m = fin.metrics[0];
    var rows = [
      ['Revenue per Share', m.revenuePerShare],
      ['Net Income per Share', m.netIncomePerShare],
      ['Operating CF per Share', m.operatingCashFlowPerShare],
      ['Free CF per Share', m.freeCashFlowPerShare],
      ['Book Value per Share', m.bookValuePerShare],
      ['Debt to Equity', m.debtToEquity],
      ['Current Ratio', m.currentRatio],
      ['ROE', m.roe],
      ['ROA', m.returnOnTangibleAssets],
      ['Dividend Yield', m.dividendYield],
    ];
    var html = '<table class="financials-table"><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>';
    rows.forEach(function(r) {
      var val = r[1] != null ? (typeof r[1] === 'number' ? r[1].toFixed(2) : r[1]) : '--';
      html += '<tr><td>' + r[0] + '</td><td>' + val + '</td></tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  loadFinnhubData(ticker) {
    if (!window.FinnhubAPI) return;
    Promise.all([
      window.FinnhubAPI.getQuote(ticker),
      window.FinnhubAPI.getCompanyProfile(ticker)
    ]).then(function(results) {
      var quote = results[0];
      var profile = results[1];
      if (quote && quote.c != null) {
        var priceEl = document.getElementById('statPrice');
        var changeEl = document.getElementById('statPriceChange');
        if (priceEl) priceEl.textContent = '$' + quote.c.toFixed(2);
        if (changeEl && quote.dp != null) {
          changeEl.textContent = (quote.dp >= 0 ? '+' : '') + quote.dp.toFixed(2) + '%';
          changeEl.className = 'stat-change ' + (quote.dp >= 0 ? 'positive' : 'negative');
        }
      }
      if (profile && profile.marketCapitalization) {
        var mcEl = document.getElementById('statMarketCap');
        if (mcEl) {
          var mcap = profile.marketCapitalization;
          mcEl.textContent = mcap >= 1e12 ? '$' + (mcap / 1e12).toFixed(1) + 'T' : mcap >= 1e9 ? '$' + (mcap / 1e9).toFixed(1) + 'B' : '$' + (mcap / 1e6).toFixed(0) + 'M';
        }
      }
    });
  }

  async runModel(modelType) {
    if (!this.currentCompany) {
      alert('Please search for a company first');
      if (this.searchInput) this.searchInput.focus();
      return;
    }

    const btn = document.querySelector(`.run-model-btn[data-model="${modelType}"]`);
    const outputDiv = document.getElementById(`output-${modelType}`);
    if (!btn || !outputDiv) return;

    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Running Model...';
    outputDiv.classList.add('active');
    outputDiv.innerHTML = '<p>Analyzing ' + this.currentCompany + '...</p>';

    try {
      const prompt = MODEL_PROMPTS[modelType]
        .replace(/\[COMPANY_NAME\]/g, this.currentCompany)
        .replace(/\[COMPANY_DESCRIPTION\]/g, this.currentCompany)
        .replace(/\[ACQUIRER\]/g, this.currentCompany)
        .replace(/\[TARGET\]/g, 'target company');

      const apiKey = window.ANTHROPIC_API_KEY || '';
      const headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      };

      if (!apiKey) throw new Error('API_KEY_MISSING');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) throw new Error('API request failed: ' + response.status);
      const data = await response.json();
      const analysis = data.content && data.content[0] ? data.content[0].text : 'No response.';

      outputDiv.innerHTML = `
        <h4>${this.getModelTitle(modelType)} - ${this.currentCompany}</h4>
        <pre>${this.escapeHtml(analysis)}</pre>
        <div class="output-actions">
          <button class="export-btn" onclick="window.companyResearch.exportResults('${modelType}')">
            <i class="bi bi-download"></i> Export to Excel
          </button>
          <button class="copy-btn" onclick="window.companyResearch.copyResults('${modelType}')">
            <i class="bi bi-clipboard"></i> Copy to Clipboard
          </button>
        </div>
      `;
    } catch (error) {
      const analysis = getDemoAnalysis(this.currentCompany, modelType);
      outputDiv.innerHTML = `
        <h4>${this.getModelTitle(modelType)} - ${this.currentCompany}</h4>
        <pre>${this.escapeHtml(analysis)}</pre>
        <div class="output-actions">
          <button class="export-btn" onclick="window.companyResearch.exportResults('${modelType}')">
            <i class="bi bi-download"></i> Export to Excel
          </button>
          <button class="copy-btn" onclick="window.companyResearch.copyResults('${modelType}')">
            <i class="bi bi-clipboard"></i> Copy to Clipboard
          </button>
        </div>
      `;
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.innerHTML = '<i class="bi bi-play-circle"></i> Run Model';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getModelTitle(modelType) {
    const titles = {
      'dcf': 'DCF Valuation Model',
      'three-statement': 'Three-Statement Financial Model',
      'ma-accretion': 'M&A Accretion/Dilution Analysis',
      'lbo': 'LBO Model',
      'comps': 'Comparable Companies Analysis',
      'precedent': 'Precedent Transactions Analysis',
      'ipo': 'IPO Valuation',
      'credit': 'Credit Analysis',
      'sotp': 'Sum-of-the-Parts Valuation',
      'operating': 'Operating Model',
      'sensitivity': 'Sensitivity Analysis',
      'investment-memo': 'Investment Committee Memo'
    };
    return titles[modelType] || 'Financial Model';
  }

  exportResults(modelType) {
    const outputDiv = document.getElementById(`output-${modelType}`);
    const pre = outputDiv ? outputDiv.querySelector('pre') : null;
    if (!pre) return;
    const content = pre.textContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (this.currentCompany || 'company') + '_' + modelType + '_analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  copyResults(modelType) {
    const outputDiv = document.getElementById(`output-${modelType}`);
    const pre = outputDiv ? outputDiv.querySelector('pre') : null;
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent).then(() => {
      const btn = outputDiv.querySelector('.copy-btn');
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.companyResearch = new CompanyResearch();
  window.marketChartWidget = new MarketChartWidget();
});

class MarketChartWidget {
  constructor() {
    this.chart = null;
    this.currentSymbol = 'SPY';
    this.currentRange = '1M';
    this.symbolNames = {
      SPY: 'S&P 500 Index',
      QQQ: 'NASDAQ 100',
      DIA: 'Dow Jones Industrial',
      IWM: 'Russell 2000'
    };
    this.init();
  }

  init() {
    this.bindControls();
    this.loadData();
  }

  bindControls() {
    document.querySelectorAll('.market-symbol-selector .symbol-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.market-symbol-selector .symbol-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentSymbol = btn.dataset.symbol;
        document.getElementById('marketChartTitle').textContent = this.symbolNames[this.currentSymbol] || this.currentSymbol;
        this.loadData();
      });
    });

    document.querySelectorAll('#marketTimeRange .time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#marketTimeRange .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentRange = btn.dataset.range;
        this.loadData();
      });
    });
  }

  async loadData() {
    this.showLoading(true);

    try {
      const quote = window.AlphaVantageAPI
        ? await window.AlphaVantageAPI.getGlobalQuote(this.currentSymbol)
        : null;

      if (quote) {
        this.updateQuoteDisplay(quote);
      }

      let series = [];

      if (this.currentRange === '1D' && window.AlphaVantageAPI) {
        series = await window.AlphaVantageAPI.getIntraday(this.currentSymbol, '5min');
      } else if (window.AlphaVantageAPI) {
        const outputsize = ['6M', '1Y'].includes(this.currentRange) ? 'full' : 'compact';
        series = await window.AlphaVantageAPI.getDailyTimeSeries(this.currentSymbol, outputsize);
      }

      if (series && series.length > 0) {
        const filtered = this.filterByRange(series);
        this.renderChart(filtered);
      } else {
        this.renderDemoChart();
      }
    } catch (err) {
      console.warn('Market chart data fetch failed, using demo:', err);
      this.renderDemoChart();
    }

    this.showLoading(false);
  }

  updateQuoteDisplay(quote) {
    const priceEl = document.getElementById('marketPrice');
    const changeEl = document.getElementById('marketChange');
    const openEl = document.getElementById('mstatOpen');
    const highEl = document.getElementById('mstatHigh');
    const lowEl = document.getElementById('mstatLow');
    const volEl = document.getElementById('mstatVolume');
    const prevEl = document.getElementById('mstatPrevClose');

    if (priceEl) priceEl.textContent = '$' + quote.price.toFixed(2);
    if (changeEl) {
      const sign = quote.change >= 0 ? '+' : '';
      changeEl.textContent = `${sign}${quote.change.toFixed(2)} (${sign}${quote.changePercent.toFixed(2)}%)`;
      changeEl.className = 'market-change ' + (quote.change >= 0 ? 'positive' : 'negative');
    }
    if (openEl) openEl.textContent = '$' + quote.open.toFixed(2);
    if (highEl) highEl.textContent = '$' + quote.high.toFixed(2);
    if (lowEl) lowEl.textContent = '$' + quote.low.toFixed(2);
    if (volEl) volEl.textContent = this.formatVolume(quote.volume);
    if (prevEl) prevEl.textContent = '$' + quote.previousClose.toFixed(2);
  }

  filterByRange(series) {
    const now = new Date();
    let cutoff = new Date();

    switch (this.currentRange) {
      case '1D': return series;
      case '1W': cutoff.setDate(now.getDate() - 7); break;
      case '1M': cutoff.setMonth(now.getMonth() - 1); break;
      case '3M': cutoff.setMonth(now.getMonth() - 3); break;
      case '6M': cutoff.setMonth(now.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: cutoff.setMonth(now.getMonth() - 1);
    }

    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return series.filter(d => {
      const dateStr = d.date || d.datetime;
      return dateStr >= cutoffStr;
    });
  }

  renderChart(data) {
    const ctx = document.getElementById('marketChart');
    if (!ctx) return;

    if (this.chart) this.chart.destroy();

    const labels = data.map(d => {
      const raw = d.date || d.datetime;
      if (this.currentRange === '1D') {
        return raw.split(' ')[1] || raw;
      }
      const dt = new Date(raw);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const prices = data.map(d => d.close || d.adjustedClose || d.price);

    const isPositive = prices.length >= 2 && prices[prices.length - 1] >= prices[0];
    const lineColor = isPositive ? '#10b981' : '#ef4444';
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: prices,
          borderColor: lineColor,
          backgroundColor: fillColor,
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHitRadius: 10,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: lineColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 20, 25, 0.95)',
            titleColor: '#fff',
            bodyColor: '#10b981',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (ctx) => '$' + ctx.parsed.y.toFixed(2)
            }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(75, 85, 99, 0.15)' },
            ticks: {
              color: 'rgba(156, 163, 175, 0.7)',
              font: { size: 11 },
              maxTicksLimit: 8,
              maxRotation: 0
            }
          },
          y: {
            display: true,
            position: 'right',
            grid: { color: 'rgba(75, 85, 99, 0.15)' },
            ticks: {
              color: 'rgba(156, 163, 175, 0.7)',
              font: { size: 11 },
              callback: (v) => '$' + v.toFixed(0)
            }
          }
        }
      }
    });
  }

  renderDemoChart() {
    const basePrice = { SPY: 590, QQQ: 510, DIA: 430, IWM: 225 }[this.currentSymbol] || 500;
    const points = 30;
    const data = [];
    const now = new Date();

    for (let i = points; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const noise = (Math.random() - 0.48) * 8;
      const trend = ((points - i) / points) * 15;
      data.push({
        date: d.toISOString().slice(0, 10),
        close: basePrice + trend + noise
      });
    }

    const lastPrice = data[data.length - 1].close;
    const firstPrice = data[0].close;
    const change = lastPrice - firstPrice;
    const changePct = (change / firstPrice) * 100;

    const priceEl = document.getElementById('marketPrice');
    const changeEl = document.getElementById('marketChange');
    if (priceEl) priceEl.textContent = '$' + lastPrice.toFixed(2);
    if (changeEl) {
      const sign = change >= 0 ? '+' : '';
      changeEl.textContent = `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
      changeEl.className = 'market-change ' + (change >= 0 ? 'positive' : 'negative');
    }

    document.getElementById('mstatOpen').textContent = '$' + (basePrice + 2).toFixed(2);
    document.getElementById('mstatHigh').textContent = '$' + (basePrice + 20).toFixed(2);
    document.getElementById('mstatLow').textContent = '$' + (basePrice - 5).toFixed(2);
    document.getElementById('mstatVolume').textContent = '68.2M';
    document.getElementById('mstatPrevClose').textContent = '$' + (basePrice + 1).toFixed(2);

    this.renderChart(data);
  }

  showLoading(show) {
    const el = document.getElementById('marketChartLoading');
    if (el) el.classList.toggle('hidden', !show);
  }

  formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toString();
  }
}
