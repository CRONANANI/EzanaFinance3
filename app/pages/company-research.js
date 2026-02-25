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
    document.querySelectorAll('.model-metric-card, .model-card').forEach(el => {
      el.addEventListener('click', (e) => {
        const card = e.target.closest('.model-card');
        if (!card) return;
        const modelType = card.dataset.model;
        if (modelType) this.selectModel(modelType);
      });
    });
    document.getElementById('modelDetailClose')?.addEventListener('click', () => this.closeModelDetail());
    this.setupModelsCarousel();
  }

  setupModelsCarousel() {
    const track = document.getElementById('modelsCarouselTrack');
    const prevBtn = document.getElementById('modelsCarouselPrev');
    const nextBtn = document.getElementById('modelsCarouselNext');
    const cards = document.querySelectorAll('.model-metric-card');
    if (!track || !cards.length) return;

    let currentIndex = 0;
    const getCardsVisible = () => {
      const w = window.innerWidth;
      if (w < 768) return 1;
      if (w < 1024) return 2;
      if (w < 1440) return 3;
      return 4;
    };
    let maxIndex = Math.max(0, cards.length - getCardsVisible());

    const updateCarousel = () => {
      const card = cards[0];
      const cardWidth = card ? card.offsetWidth + 8 : 248;
      const offset = -(currentIndex * cardWidth);
      track.style.transform = `translateX(${offset}px)`;
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex && maxIndex > 0;
    };

    const onResize = () => {
      maxIndex = Math.max(0, cards.length - getCardsVisible());
      currentIndex = Math.min(currentIndex, maxIndex);
      updateCarousel();
    };

    prevBtn?.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });
    nextBtn?.addEventListener('click', () => {
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      } else if (maxIndex > 0) {
        currentIndex = 0;
        updateCarousel();
      }
    });

    window.addEventListener('resize', onResize);
    updateCarousel();
  }

  selectModel(modelType) {
    if (modelType !== 'grpv' && !this.currentCompany) {
      alert('Please search for a company first');
      if (this.searchInput) this.searchInput.focus();
      return;
    }
    this.selectedModelType = modelType;
    const section = document.getElementById('modelDetailSection');
    const titleEl = document.getElementById('modelDetailTitle');
    const bodyEl = document.getElementById('modelDetailBody');
    if (!section || !titleEl || !bodyEl) return;
    titleEl.textContent = this.getModelTitle(modelType);
    if (modelType === 'grpv') {
      this.renderGRPVForm(bodyEl);
    } else if (modelType === 'dcf') {
      this.renderDCFForm(bodyEl);
    } else {
      bodyEl.innerHTML = '<div class="model-placeholder"><p>This model is coming soon. For now, use the AI-powered analysis from the previous flow.</p></div>';
    }
    section.style.display = '';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  closeModelDetail() {
    const section = document.getElementById('modelDetailSection');
    if (section) section.style.display = 'none';
  }

  renderDCFForm(container) {
    const symbol = (this.currentCompany || '').toUpperCase();
    const defaults = {
      revenueGrowthPct: 0.1094,
      ebitdaPct: 0.3127,
      depreciationAndAmortizationPct: 0.0346,
      cashAndShortTermInvestmentsPct: 0.2344,
      receivablesPct: 0.1534,
      inventoriesPct: 0.0155,
      payablePct: 0.1615,
      ebitPct: 0.2782,
      capitalExpenditurePct: 0.0306,
      operatingCashFlowPct: 0.2886,
      sellingGeneralAndAdministrativeExpensesPct: 0.0663,
      taxRate: 0.1492,
      longTermGrowthRate: 4,
      costOfDebt: 3.64,
      costOfEquity: 9.51168,
      marketRiskPremium: 4.72,
      beta: 1.244,
      riskFreeRate: 3.64
    };
    container.innerHTML = `
      <form id="dcfForm" class="dcf-form">
        <div class="dcf-form-grid">
          <div class="dcf-form-group">
            <label for="dcfSymbol">Symbol *</label>
            <input type="text" id="dcfSymbol" value="${symbol}" required placeholder="AAPL">
          </div>
          <div class="dcf-form-group">
            <label for="dcfRevenueGrowth">Revenue Growth %</label>
            <input type="number" id="dcfRevenueGrowth" step="0.0001" value="${defaults.revenueGrowthPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfEbitda">EBITDA %</label>
            <input type="number" id="dcfEbitda" step="0.0001" value="${defaults.ebitdaPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfDepreciation">Depreciation & Amortization %</label>
            <input type="number" id="dcfDepreciation" step="0.0001" value="${defaults.depreciationAndAmortizationPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfCash">Cash & Short-Term Investments %</label>
            <input type="number" id="dcfCash" step="0.0001" value="${defaults.cashAndShortTermInvestmentsPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfReceivables">Receivables %</label>
            <input type="number" id="dcfReceivables" step="0.0001" value="${defaults.receivablesPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfInventories">Inventories %</label>
            <input type="number" id="dcfInventories" step="0.0001" value="${defaults.inventoriesPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfPayable">Payable %</label>
            <input type="number" id="dcfPayable" step="0.0001" value="${defaults.payablePct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfEbit">EBIT %</label>
            <input type="number" id="dcfEbit" step="0.0001" value="${defaults.ebitPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfCapEx">Capital Expenditure %</label>
            <input type="number" id="dcfCapEx" step="0.0001" value="${defaults.capitalExpenditurePct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfOperatingCF">Operating Cash Flow %</label>
            <input type="number" id="dcfOperatingCF" step="0.0001" value="${defaults.operatingCashFlowPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfSGA">SG&A Expenses %</label>
            <input type="number" id="dcfSGA" step="0.0001" value="${defaults.sellingGeneralAndAdministrativeExpensesPct}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfTaxRate">Tax Rate</label>
            <input type="number" id="dcfTaxRate" step="0.0001" value="${defaults.taxRate}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfLTGR">Long-Term Growth Rate %</label>
            <input type="number" id="dcfLTGR" step="0.01" value="${defaults.longTermGrowthRate}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfCostOfDebt">Cost of Debt %</label>
            <input type="number" id="dcfCostOfDebt" step="0.01" value="${defaults.costOfDebt}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfCostOfEquity">Cost of Equity %</label>
            <input type="number" id="dcfCostOfEquity" step="0.0001" value="${defaults.costOfEquity}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfMRP">Market Risk Premium %</label>
            <input type="number" id="dcfMRP" step="0.01" value="${defaults.marketRiskPremium}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfBeta">Beta</label>
            <input type="number" id="dcfBeta" step="0.001" value="${defaults.beta}">
          </div>
          <div class="dcf-form-group">
            <label for="dcfRiskFree">Risk-Free Rate %</label>
            <input type="number" id="dcfRiskFree" step="0.01" value="${defaults.riskFreeRate}">
          </div>
        </div>
        <div class="dcf-form-actions">
          <button type="submit" class="run-model-btn"><i class="bi bi-calculator"></i> Calculate DCF</button>
          <span id="dcfStatus"></span>
        </div>
        <div id="dcfOutput" class="dcf-output-box" style="display:none;"></div>
      </form>
    `;
    container.querySelector('#dcfForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.runDCFModel();
    });
  }

  async runDCFModel() {
    const symbol = (document.getElementById('dcfSymbol')?.value || '').trim().toUpperCase();
    if (!symbol) {
      alert('Please enter a symbol');
      return;
    }
    const statusEl = document.getElementById('dcfStatus');
    const outputEl = document.getElementById('dcfOutput');
    if (statusEl) statusEl.textContent = 'Calculating...';
    if (outputEl) { outputEl.style.display = 'none'; outputEl.innerHTML = ''; }
    const params = {
      symbol,
      revenueGrowthPct: parseFloat(document.getElementById('dcfRevenueGrowth')?.value) || 0,
      ebitdaPct: parseFloat(document.getElementById('dcfEbitda')?.value) || 0,
      depreciationAndAmortizationPct: parseFloat(document.getElementById('dcfDepreciation')?.value) || 0,
      cashAndShortTermInvestmentsPct: parseFloat(document.getElementById('dcfCash')?.value) || 0,
      receivablesPct: parseFloat(document.getElementById('dcfReceivables')?.value) || 0,
      inventoriesPct: parseFloat(document.getElementById('dcfInventories')?.value) || 0,
      payablePct: parseFloat(document.getElementById('dcfPayable')?.value) || 0,
      ebitPct: parseFloat(document.getElementById('dcfEbit')?.value) || 0,
      capitalExpenditurePct: parseFloat(document.getElementById('dcfCapEx')?.value) || 0,
      operatingCashFlowPct: parseFloat(document.getElementById('dcfOperatingCF')?.value) || 0,
      sellingGeneralAndAdministrativeExpensesPct: parseFloat(document.getElementById('dcfSGA')?.value) || 0,
      taxRate: parseFloat(document.getElementById('dcfTaxRate')?.value) || 0,
      longTermGrowthRate: parseFloat(document.getElementById('dcfLTGR')?.value) || 0,
      costOfDebt: parseFloat(document.getElementById('dcfCostOfDebt')?.value) || 0,
      costOfEquity: parseFloat(document.getElementById('dcfCostOfEquity')?.value) || 0,
      marketRiskPremium: parseFloat(document.getElementById('dcfMRP')?.value) || 0,
      beta: parseFloat(document.getElementById('dcfBeta')?.value) || 0,
      riskFreeRate: parseFloat(document.getElementById('dcfRiskFree')?.value) || 0
    };
    try {
      const fmp = window.FmpAPI;
      if (!fmp || !fmp.getCustomDCF) {
        throw new Error('FMP Custom DCF API not available');
      }
      const data = await fmp.getCustomDCF(params);
      if (statusEl) statusEl.textContent = '';
      if (outputEl) {
        outputEl.style.display = '';
        const price = data?.dcf || data?.price || data?.equityValuePerShare || data?.[0]?.dcf || data?.[0]?.price;
        outputEl.innerHTML = price != null
          ? `<div class="stock-price-result">DCF Fair Value: $${Number(price).toFixed(2)}</div><p class="dcf-meta">Based on your custom assumptions for ${symbol}</p>`
          : `<p>Unable to compute. Response: ${JSON.stringify(data)}</p>`;
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = '';
      if (outputEl) {
        outputEl.style.display = '';
        outputEl.innerHTML = `<p style="color:var(--destructive)">Error: ${e.message}. The Custom DCF API may require a premium FMP subscription.</p>`;
      }
    }
  }

  /** GRPV Analysis Model - Score stocks out of 72 based on user preferences */
  hasMetricWeightingUnlock() {
    try {
      const completed = JSON.parse(localStorage.getItem('ezana_learning_completed') || '[]');
      return Array.isArray(completed) && completed.length >= 2;
    } catch (_) { return false; }
  }

  isEliteMember() {
    try {
      return localStorage.getItem('ezana_elite') === 'true';
    } catch (_) { return false; }
  }

  renderGRPVForm(container) {
    const hasUnlock = this.hasMetricWeightingUnlock();
    const maxStocks = this.isEliteMember() ? 25 : 10;
    const sectors = ['Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 'Consumer Defensive', 'Industrials', 'Energy', 'Utilities', 'Real Estate', 'Basic Materials', 'Communication Services'];
    const categories = [
      { id: 'growth', label: 'Growth', metrics: ['Quarterly Revenue Growth (%)', 'Quarterly Earnings Growth (%)'] },
      { id: 'risk', label: 'Risk', metrics: ['D/E Ratio', 'Beta'] },
      { id: 'profitability', label: 'Profitability', metrics: ['Profit Margin (%)', 'Operating Margin (%)', 'Annual Dividend Yield (%)', 'Return on Assets (%)', 'EBITDA/Sales'] },
      { id: 'valuation', label: 'Valuation', metrics: ['Market Cap', 'Trailing P/E', 'PEG Ratio (5yr)', 'Price/Book', 'EV/Revenue', 'EPS'] }
    ];
    let metricHTML = '';
    if (hasUnlock) {
      metricHTML = categories.map(c => `
        <div class="grpv-form-section">
          <h4>${c.label} - Individual Metrics</h4>
          <div class="grpv-category-grid">
            ${c.metrics.map((m, i) => `
              <div class="grpv-category-item">
                <label for="grpv-metric-${c.id}-${i}">${m}</label>
                <input type="range" id="grpv-metric-${c.id}-${i}" class="grpv-weight-slider" min="1" max="5" value="4" data-cat="${c.id}" data-metric="${i}">
                <span class="grpv-weight-value" data-for="grpv-metric-${c.id}-${i}">4</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } else {
      metricHTML = '<p class="grpv-unlock-hint"><i class="bi bi-lock"></i> Complete 2 courses in the Learning Center to unlock individual metric weighting.</p>';
    }
    container.innerHTML = `
      <form id="grpvForm" class="grpv-form">
        <div class="grpv-form-section">
          <h4>Category Weighting (1–5)</h4>
          <div class="grpv-category-grid">
            ${categories.map(c => `
              <div class="grpv-category-item">
                <label for="grpv-cat-${c.id}">${c.label}</label>
                <input type="range" id="grpv-cat-${c.id}" class="grpv-weight-slider" min="1" max="5" value="4" data-cat="${c.id}">
                <span class="grpv-weight-value" data-for="grpv-cat-${c.id}">4</span>
              </div>
            `).join('')}
          </div>
        </div>
        ${metricHTML}
        <div class="grpv-form-section">
          <h4>Select sectors</h4>
          <div class="grpv-sector-grid">
            ${sectors.map(s => `
              <button type="button" class="grpv-sector-chip" data-sector="${s}">${s}</button>
            `).join('')}
          </div>
        </div>
        <div class="grpv-form-actions">
          <button type="submit" class="run-model-btn"><i class="bi bi-calculator"></i> Run GRPV Analysis</button>
          <span id="grpvStatus"></span>
        </div>
        <div id="grpvOutput" class="grpv-output-box" style="display:none;"></div>
      </form>
    `;
    container.querySelectorAll('.grpv-weight-slider').forEach(slider => {
      const valEl = container.querySelector(`[data-for="${slider.id}"]`);
      const update = () => { if (valEl) valEl.textContent = slider.value; };
      slider.addEventListener('input', update);
      update();
    });
    container.querySelectorAll('.grpv-sector-chip').forEach(c => {
      c.addEventListener('click', () => {
        c.classList.toggle('selected');
      });
    });
    container.querySelector('#grpvForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.runGRPV();
    });
  }

  async runGRPV() {
    const statusEl = document.getElementById('grpvStatus');
    const outputEl = document.getElementById('grpvOutput');
    if (statusEl) statusEl.textContent = 'Running GRPV analysis...';
    if (outputEl) { outputEl.style.display = 'none'; outputEl.innerHTML = ''; }

    const catWeights = {};
    ['growth', 'risk', 'profitability', 'valuation'].forEach(id => {
      const el = document.getElementById(`grpv-cat-${id}`);
      catWeights[id] = el ? parseInt(el.value, 10) : 4;
    });

    const selectedSectors = Array.from(document.querySelectorAll('.grpv-sector-chip.selected')).map(c => c.dataset.sector);
    if (selectedSectors.length === 0) {
      if (statusEl) statusEl.textContent = '';
      alert('Please select at least one sector.'); return;
    }

    const maxStocks = this.isEliteMember() ? 25 : 10;
    const fmp = window.FmpAPI;
    if (!fmp || !fmp.screenStocks) {
      if (statusEl) statusEl.textContent = '';
      if (outputEl) { outputEl.style.display = ''; outputEl.innerHTML = '<p style="color:var(--destructive)">FMP API not available.</p>'; }
      return;
    }

    try {
      let candidates = [];
      for (const sector of selectedSectors) {
        const screened = await fmp.screenStocks({ limit: 50, sector });
        const list = Array.isArray(screened) ? screened : [];
        candidates.push(...list);
      }
      candidates = [...new Map(candidates.map(c => [(c.symbol || c.ticker), c])].map(([, c]) => c);
      if (candidates.length === 0) {
        const fallback = await fmp.screenStocks({ limit: 100 });
        candidates = Array.isArray(fallback) ? fallback : [];
      }

      const symbols = [...new Set(candidates.map(c => c.symbol || c.ticker).filter(Boolean))].slice(0, 50);
      const scores = [];
      for (const sym of symbols) {
        const score = await this.computeGRPVScore(sym, catWeights);
        if (score != null) scores.push({ symbol: sym, score, name: candidates.find(c => (c.symbol || c.ticker) === sym)?.companyName || sym });
      }
      scores.sort((a, b) => (b.score || 0) - (a.score || 0));
      const top = scores.slice(0, maxStocks);

      if (statusEl) statusEl.textContent = '';
      if (outputEl) {
        outputEl.style.display = '';
        outputEl.innerHTML = `
          <h4>Top ${maxStocks} stocks (score out of 72)</h4>
          <table class="grpv-results-table">
            <thead><tr><th>Symbol</th><th>Company</th><th>Score</th></tr></thead>
            <tbody>
              ${top.map(r => `<tr><td><strong>${r.symbol}</strong></td><td>${(r.name || '').slice(0, 40)}</td><td>${(r.score || 0).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (e) {
      if (statusEl) statusEl.textContent = '';
      if (outputEl) {
        outputEl.style.display = '';
        outputEl.innerHTML = `<p style="color:var(--destructive)">Error: ${e.message}</p>`;
      }
    }
  }

  async computeGRPVScore(symbol, catWeights) {
    const fmp = window.FmpAPI;
    if (!fmp) return null;
    const [profile, ratios, metrics] = await Promise.all([
      fmp.getCompanyProfile(symbol),
      fmp.getFinancialRatios(symbol, 'ttm', 1),
      fmp.getKeyMetrics(symbol, 'ttm', 1)
    ]);
    const r = ratios && ratios[0] ? ratios[0] : {};
    const m = metrics && metrics[0] ? metrics[0] : {};
    const p = profile || {};
    const mcap = p.mktCap || p.marketCap || 0;
    const growth = ((r.revenueGrowth || 0) + (r.netIncomeGrowth || 0)) / 2;
    const risk = r.debtEquityRatio != null ? (1 / (1 + Math.min(r.debtEquityRatio, 5))) * 5 : 2.5;
    const beta = r.beta != null ? Math.max(0, 5 - Math.abs(r.beta - 1)) : 2.5;
    const profit = (r.profitMargin || 0) + (r.operatingProfitMargin || 0) + (r.dividendYield || 0) * 100 + (r.returnOnAssets || 0);
    const val = (r.peRatio || 0) ? Math.max(0, 5 - Math.abs(Math.log10(r.peRatio || 1))) : 2;
    const catWeight = (catWeights.growth || 4) + (catWeights.risk || 4) + (catWeights.profitability || 4) + (catWeights.valuation || 4);
    const norm = catWeight / 16;
    let score = (growth * 2 + risk + beta + profit * 0.5 + val * 2) * norm;
    score = Math.min(72, Math.max(0, score * 4));
    return score;
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
    if (window.marketChartWidget) window.marketChartWidget.showStockChart(symbol);
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
    if (window.marketChartWidget) window.marketChartWidget.showStockChart(query);
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
    el = document.getElementById('statMarketCap');
    if (el) {
      var mc = quote.marketCap || (profile && profile.marketCap) || 0;
      el.textContent = mc >= 1e12 ? '$' + (mc / 1e12).toFixed(2) + 'T' : mc >= 1e9 ? '$' + (mc / 1e9).toFixed(2) + 'B' : mc >= 1e6 ? '$' + (mc / 1e6).toFixed(0) + 'M' : mc > 0 ? '$' + mc.toLocaleString() : '--';
    }
    el = document.getElementById('statCapType');
    if (el) {
      var mc2 = quote.marketCap || (profile && profile.marketCap) || 0;
      el.textContent = mc2 >= 200e9 ? 'Mega Cap' : mc2 >= 10e9 ? 'Large Cap' : mc2 >= 2e9 ? 'Mid Cap' : mc2 >= 300e6 ? 'Small Cap' : mc2 > 0 ? 'Micro Cap' : '--';
    }
    el = document.getElementById('statPE');
    if (el) el.textContent = (profile && profile.pe) ? Number(profile.pe).toFixed(2) : '--';
    el = document.getElementById('statPELabel');
    if (el && profile && profile.pe) {
      var pe = Number(profile.pe);
      el.textContent = pe < 15 ? 'Undervalued' : pe < 25 ? 'Fair Value' : 'Growth Premium';
    }
    el = document.getElementById('statDivYield');
    if (el) {
      var dy = profile && profile.dividendYield != null ? Number(profile.dividendYield) : null;
      el.textContent = dy != null ? (dy > 1 ? dy.toFixed(2) : (dy * 100).toFixed(2)) + '%' : '--';
    }
    el = document.getElementById('statDivYieldLabel');
    if (el && profile && profile.dividendYield != null) {
      var dyVal = Number(profile.dividendYield);
      if (dyVal > 1) dyVal = dyVal / 100;
      el.textContent = dyVal > 0.04 ? 'High Yield' : dyVal > 0.02 ? 'Moderate Yield' : dyVal > 0 ? 'Low Yield' : 'No Dividend';
    }
    el = document.getElementById('statEPS');
    if (el) el.textContent = (profile && profile.eps) ? '$' + Number(profile.eps).toFixed(2) : '--';
    el = document.getElementById('statEPSLabel');
    if (el && profile && profile.eps) {
      el.textContent = Number(profile.eps) > 0 ? 'Profitable' : 'Net Loss';
      el.className = 'stat-change ' + (Number(profile.eps) > 0 ? 'positive' : 'negative');
    }
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
    if (!window.FinnhubAPI) {
      this.loadOverviewForStats(ticker);
      return;
    }
    var self = this;
    Promise.all([
      window.FinnhubAPI.getQuote(ticker),
      window.FinnhubAPI.getCompanyProfile(ticker)
    ]).then(function(results) {
      var profile = results[1];
      if (profile && profile.marketCapitalization) {
        var mcEl = document.getElementById('statMarketCap');
        if (mcEl) {
          var mcap = profile.marketCapitalization;
          mcEl.textContent = mcap >= 1e12 ? '$' + (mcap / 1e12).toFixed(2) + 'T' : mcap >= 1e9 ? '$' + (mcap / 1e9).toFixed(2) + 'B' : '$' + (mcap / 1e6).toFixed(0) + 'M';
        }
      }
      self.loadOverviewForStats(ticker);
    });
  }

  async loadOverviewForStats(ticker) {
    if (!window.AlphaVantageAPI) return;
    try {
      var overview = await window.AlphaVantageAPI.getCompanyOverview(ticker);
      if (!overview) return;
      var el;
      el = document.getElementById('statMarketCap');
      if (el && overview.MarketCapitalization) {
        var mc = Number(overview.MarketCapitalization);
        el.textContent = mc >= 1e12 ? '$' + (mc / 1e12).toFixed(2) + 'T' : mc >= 1e9 ? '$' + (mc / 1e9).toFixed(2) + 'B' : mc >= 1e6 ? '$' + (mc / 1e6).toFixed(0) + 'M' : '$' + mc.toLocaleString();
      }
      el = document.getElementById('statCapType');
      if (el && overview.MarketCapitalization) {
        var mc2 = Number(overview.MarketCapitalization);
        el.textContent = mc2 >= 200e9 ? 'Mega Cap' : mc2 >= 10e9 ? 'Large Cap' : mc2 >= 2e9 ? 'Mid Cap' : mc2 >= 300e6 ? 'Small Cap' : 'Micro Cap';
      }
      el = document.getElementById('statPE');
      if (el) el.textContent = overview.PERatio && overview.PERatio !== 'None' ? Number(overview.PERatio).toFixed(2) : '--';
      el = document.getElementById('statPELabel');
      if (el && overview.PERatio && overview.PERatio !== 'None') {
        var pe = Number(overview.PERatio);
        el.textContent = pe < 15 ? 'Undervalued' : pe < 25 ? 'Fair Value' : 'Growth Premium';
      }
      el = document.getElementById('statDivYield');
      if (el) el.textContent = overview.DividendYield && overview.DividendYield !== 'None' ? (Number(overview.DividendYield) * 100).toFixed(2) + '%' : '0.00%';
      el = document.getElementById('statDivYieldLabel');
      if (el) {
        var dy = overview.DividendYield && overview.DividendYield !== 'None' ? Number(overview.DividendYield) : 0;
        el.textContent = dy > 0.04 ? 'High Yield' : dy > 0.02 ? 'Moderate Yield' : dy > 0 ? 'Low Yield' : 'No Dividend';
      }
      el = document.getElementById('statEPS');
      if (el) el.textContent = overview.EPS && overview.EPS !== 'None' ? '$' + Number(overview.EPS).toFixed(2) : '--';
      el = document.getElementById('statEPSLabel');
      if (el && overview.EPS && overview.EPS !== 'None') {
        el.textContent = Number(overview.EPS) > 0 ? 'Profitable' : 'Net Loss';
        el.className = 'stat-change ' + (Number(overview.EPS) > 0 ? 'positive' : 'negative');
      }
    } catch (e) {
      console.warn('Alpha Vantage overview fetch failed:', e);
    }
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
      'grpv': 'GRPV Analysis Model',
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
    this.currentSymbol = null;
    this.currentRange = '1M';
    this.mode = 'heatmap';
    this.init();
  }

  init() {
    this.bindControls();
    this.renderHeatmap();
  }

  bindControls() {
    const backBtn = document.getElementById('backToHeatmap');
    if (backBtn) backBtn.addEventListener('click', () => this.showHeatmap());

    document.querySelectorAll('#stockTimeRange .time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#stockTimeRange .time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentRange = btn.dataset.range;
        if (this.currentSymbol) this.loadStockData(this.currentSymbol);
      });
    });
  }

  showHeatmap() {
    this.mode = 'heatmap';
    this.currentSymbol = null;
    document.getElementById('heatmapView').style.display = '';
    document.getElementById('stockChartView').style.display = 'none';
    this.resetStatCards();
  }

  resetStatCards() {
    ['statMarketCap', 'statPE', 'statDivYield', 'statEPS'].forEach(id => {
      var el = document.getElementById(id);
      if (el) el.textContent = '--';
    });
    ['statCapType', 'statPELabel', 'statDivYieldLabel', 'statEPSLabel'].forEach(id => {
      var el = document.getElementById(id);
      if (el) { el.textContent = '--'; el.className = 'stat-change'; }
    });
  }

  showStockChart(symbol) {
    this.mode = 'stock';
    this.currentSymbol = symbol.toUpperCase();
    document.getElementById('heatmapView').style.display = 'none';
    document.getElementById('stockChartView').style.display = '';
    document.getElementById('stockChartTitle').textContent = this.currentSymbol;
    this.loadStockData(this.currentSymbol);
    this.loadOverviewStats(this.currentSymbol);
  }

  async loadOverviewStats(symbol) {
    if (!window.AlphaVantageAPI) return;
    try {
      var overview = await window.AlphaVantageAPI.getCompanyOverview(symbol);
      if (!overview) return;
      var el;
      el = document.getElementById('statMarketCap');
      if (el && overview.MarketCapitalization) {
        var mc = Number(overview.MarketCapitalization);
        el.textContent = mc >= 1e12 ? '$' + (mc / 1e12).toFixed(2) + 'T' : mc >= 1e9 ? '$' + (mc / 1e9).toFixed(2) + 'B' : mc >= 1e6 ? '$' + (mc / 1e6).toFixed(0) + 'M' : '$' + mc.toLocaleString();
      }
      el = document.getElementById('statCapType');
      if (el && overview.MarketCapitalization) {
        var mc2 = Number(overview.MarketCapitalization);
        el.textContent = mc2 >= 200e9 ? 'Mega Cap' : mc2 >= 10e9 ? 'Large Cap' : mc2 >= 2e9 ? 'Mid Cap' : mc2 >= 300e6 ? 'Small Cap' : 'Micro Cap';
      }
      el = document.getElementById('statPE');
      if (el) el.textContent = overview.PERatio && overview.PERatio !== 'None' ? Number(overview.PERatio).toFixed(2) : '--';
      el = document.getElementById('statPELabel');
      if (el && overview.PERatio && overview.PERatio !== 'None') {
        var pe = Number(overview.PERatio);
        el.textContent = pe < 15 ? 'Undervalued' : pe < 25 ? 'Fair Value' : 'Growth Premium';
      }
      el = document.getElementById('statDivYield');
      if (el) el.textContent = overview.DividendYield && overview.DividendYield !== 'None' ? (Number(overview.DividendYield) * 100).toFixed(2) + '%' : '0.00%';
      el = document.getElementById('statDivYieldLabel');
      if (el) {
        var dy = overview.DividendYield && overview.DividendYield !== 'None' ? Number(overview.DividendYield) : 0;
        el.textContent = dy > 0.04 ? 'High Yield' : dy > 0.02 ? 'Moderate Yield' : dy > 0 ? 'Low Yield' : 'No Dividend';
      }
      el = document.getElementById('statEPS');
      if (el) el.textContent = overview.EPS && overview.EPS !== 'None' ? '$' + Number(overview.EPS).toFixed(2) : '--';
      el = document.getElementById('statEPSLabel');
      if (el && overview.EPS && overview.EPS !== 'None') {
        el.textContent = Number(overview.EPS) > 0 ? 'Profitable' : 'Net Loss';
        el.className = 'stat-change ' + (Number(overview.EPS) > 0 ? 'positive' : 'negative');
      }
    } catch (e) {
      console.warn('Overview stats fetch failed:', e);
    }
  }

  async loadStockData(symbol) {
    this.showLoading('stockChartLoading', true);

    try {
      const quote = window.AlphaVantageAPI
        ? await window.AlphaVantageAPI.getGlobalQuote(symbol)
        : null;

      if (quote) this.updateQuoteDisplay(quote);

      let series = [];
      if (this.currentRange === '1D' && window.AlphaVantageAPI) {
        series = await window.AlphaVantageAPI.getIntraday(symbol, '5min');
      } else if (window.AlphaVantageAPI) {
        const outputsize = ['6M', '1Y'].includes(this.currentRange) ? 'full' : 'compact';
        series = await window.AlphaVantageAPI.getDailyTimeSeries(symbol, outputsize);
      }

      if (series && series.length > 0) {
        this.renderChart(this.filterByRange(series));
      } else {
        this.renderDemoStockChart(symbol);
      }
    } catch (err) {
      console.warn('Stock data fetch failed, using demo:', err);
      this.renderDemoStockChart(symbol);
    }

    this.showLoading('stockChartLoading', false);
  }

  updateQuoteDisplay(quote) {
    const priceEl = document.getElementById('stockPrice');
    const changeEl = document.getElementById('stockChange');
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
    return series.filter(d => (d.date || d.datetime) >= cutoffStr);
  }

  renderChart(data) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    if (this.chart) this.chart.destroy();

    const labels = data.map(d => {
      const raw = d.date || d.datetime;
      if (this.currentRange === '1D') return raw.split(' ')[1] || raw;
      return new Date(raw).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        interaction: { mode: 'index', intersect: false },
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
            callbacks: { label: (c) => '$' + c.parsed.y.toFixed(2) }
          }
        },
        scales: {
          x: {
            display: true,
            grid: { color: 'rgba(75, 85, 99, 0.15)' },
            ticks: { color: 'rgba(156, 163, 175, 0.7)', font: { size: 11 }, maxTicksLimit: 8, maxRotation: 0 }
          },
          y: {
            display: true,
            position: 'right',
            grid: { color: 'rgba(75, 85, 99, 0.15)' },
            ticks: { color: 'rgba(156, 163, 175, 0.7)', font: { size: 11 }, callback: (v) => '$' + v.toFixed(0) }
          }
        }
      }
    });
  }

  renderDemoStockChart(symbol) {
    const hash = [...symbol].reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
    const basePrice = 50 + Math.abs(hash % 500);
    const points = 30;
    const data = [];
    const now = new Date();

    for (let i = points; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const noise = (Math.random() - 0.48) * (basePrice * 0.02);
      const trend = ((points - i) / points) * (basePrice * 0.06);
      data.push({ date: d.toISOString().slice(0, 10), close: basePrice + trend + noise });
    }

    const lastPrice = data[data.length - 1].close;
    const firstPrice = data[0].close;
    const change = lastPrice - firstPrice;
    const changePct = (change / firstPrice) * 100;

    const priceEl = document.getElementById('stockPrice');
    const changeEl = document.getElementById('stockChange');
    if (priceEl) priceEl.textContent = '$' + lastPrice.toFixed(2);
    if (changeEl) {
      const sign = change >= 0 ? '+' : '';
      changeEl.textContent = `${sign}${change.toFixed(2)} (${sign}${changePct.toFixed(2)}%)`;
      changeEl.className = 'market-change ' + (change >= 0 ? 'positive' : 'negative');
    }

    document.getElementById('mstatOpen').textContent = '$' + (basePrice + 1).toFixed(2);
    document.getElementById('mstatHigh').textContent = '$' + (basePrice * 1.04).toFixed(2);
    document.getElementById('mstatLow').textContent = '$' + (basePrice * 0.97).toFixed(2);
    document.getElementById('mstatVolume').textContent = '24.8M';
    document.getElementById('mstatPrevClose').textContent = '$' + (basePrice + 0.5).toFixed(2);

    this.renderChart(data);
  }

  // ===== HEATMAP =====

  async renderHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    this.showLoading('heatmapLoading', true);

    let moversData = null;
    try {
      if (window.AlphaVantageAPI) {
        moversData = await window.AlphaVantageAPI.getTopMovers();
      }
    } catch (e) {
      console.warn('Heatmap API fetch failed:', e);
    }

    const stocks = this.buildHeatmapData(moversData);
    this.drawTreemap(container, stocks);
    this.showLoading('heatmapLoading', false);
  }

  buildHeatmapData(moversData) {
    const sectors = {
      'Technology': [
        { t: 'MSFT', mc: 3100, ch: 39.92 }, { t: 'AAPL', mc: 2900, ch: 47.82 },
        { t: 'NVDA', mc: 2800, ch: 184.01 }, { t: 'GOOGL', mc: 2100, ch: 34.42 },
        { t: 'META', mc: 1500, ch: 134.23 }, { t: 'AVGO', mc: 800, ch: 53.55 },
        { t: 'ADBE', mc: 250, ch: 44.12 }, { t: 'CRM', mc: 270, ch: 57.16 },
        { t: 'ORCL', mc: 390, ch: 45.33 }, { t: 'AMD', mc: 220, ch: -72.94 },
        { t: 'INTC', mc: 100, ch: -5.30 }, { t: 'CSCO', mc: 230, ch: 7.98 }
      ],
      'Finance': [
        { t: 'BRK.B', mc: 880, ch: 9.89 }, { t: 'JPM', mc: 680, ch: 7.46 },
        { t: 'V', mc: 570, ch: 13.40 }, { t: 'MA', mc: 440, ch: 11.83 },
        { t: 'BAC', mc: 340, ch: -13.20 }, { t: 'WFC', mc: 220, ch: -2.80 },
        { t: 'GS', mc: 180, ch: 16.19 }, { t: 'MS', mc: 160, ch: 0.19 }
      ],
      'Healthcare': [
        { t: 'LLY', mc: 720, ch: 28.06 }, { t: 'UNH', mc: 480, ch: -8.59 },
        { t: 'JNJ', mc: 400, ch: -6.28 }, { t: 'MRK', mc: 310, ch: 3.99 },
        { t: 'ABBV', mc: 300, ch: -16.82 }, { t: 'PFE', mc: 150, ch: -28.13 },
        { t: 'TMO', mc: 210, ch: -5.71 }, { t: 'ABT', mc: 195, ch: -1.47 }
      ],
      'Consumer': [
        { t: 'AMZN', mc: 2000, ch: 52.38 }, { t: 'TSLA', mc: 800, ch: 122.59 },
        { t: 'WMT', mc: 500, ch: 9.72 }, { t: 'HD', mc: 370, ch: -2.43 },
        { t: 'COST', mc: 350, ch: 17.19 }, { t: 'MCD', mc: 210, ch: 12.78 },
        { t: 'NKE', mc: 120, ch: -6.62 }, { t: 'SBUX', mc: 110, ch: -0.11 },
        { t: 'DIS', mc: 180, ch: -0.11 }, { t: 'NFLX', mc: 280, ch: 80.91 }
      ],
      'Energy': [
        { t: 'XOM', mc: 460, ch: -1.99 }, { t: 'CVX', mc: 300, ch: -8.22 },
        { t: 'COP', mc: 140, ch: -12.51 }, { t: 'SLB', mc: 70, ch: -18.40 }
      ],
      'Industrials': [
        { t: 'CAT', mc: 170, ch: 2.24 }, { t: 'BA', mc: 130, ch: -67.09 },
        { t: 'UPS', mc: 100, ch: 1.52 }, { t: 'LMT', mc: 120, ch: -4.87 },
        { t: 'GE', mc: 190, ch: 44.44 }
      ]
    };

    if (moversData && moversData.top_gainers && moversData.top_gainers.length > 0) {
      moversData.top_gainers.slice(0, 5).forEach(g => {
        if (!Object.values(sectors).flat().find(s => s.t === g.ticker)) {
          sectors['Technology'].push({ t: g.ticker, mc: 50, ch: g.changePercent });
        }
      });
    }

    return sectors;
  }

  drawTreemap(container, sectorData) {
    const allStocks = [];
    for (const [sector, stocks] of Object.entries(sectorData)) {
      stocks.forEach(s => allStocks.push({ ...s, sector }));
    }
    allStocks.sort((a, b) => b.mc - a.mc);

    const totalMc = allStocks.reduce((sum, s) => sum + s.mc, 0);

    let html = '<div style="display:flex;flex-wrap:wrap;width:100%;height:100%;min-height:480px;">';

    allStocks.forEach(stock => {
      const pct = (stock.mc / totalMc) * 100;
      const bg = this.heatmapColor(stock.ch);
      let sizeClass = 'small';
      if (pct > 5) sizeClass = 'large';
      else if (pct > 2) sizeClass = 'medium';
      else if (pct < 0.8) sizeClass = 'tiny';

      const w = Math.max(pct * 1.8, 3);
      const sign = stock.ch >= 0 ? '+' : '';

      html += `<div class="heatmap-cell ${sizeClass}" data-ticker="${stock.t}" 
        style="width:${w}%;flex-grow:${Math.max(Math.round(pct * 10), 1)};background:${bg};"
        title="${stock.t} | ${stock.sector} | ${sign}${stock.ch.toFixed(2)}%">
        <span class="heatmap-cell-ticker">${stock.t}</span>
        <span class="heatmap-cell-change">${sign}${stock.ch.toFixed(1)}%</span>
      </div>`;
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.heatmap-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const ticker = cell.dataset.ticker;
        if (ticker) {
          if (window.companyResearch) {
            window.companyResearch.searchInput.value = ticker;
            window.companyResearch.currentCompany = ticker;
            window.companyResearch.loadCompanyData(ticker);
          }
          this.showStockChart(ticker);
        }
      });
    });
  }

  heatmapColor(changePct) {
    if (changePct > 50) return 'linear-gradient(135deg, #059669, #047857)';
    if (changePct > 20) return 'linear-gradient(135deg, #10b981, #059669)';
    if (changePct > 10) return 'linear-gradient(135deg, #34d399, #10b981)';
    if (changePct > 5) return 'linear-gradient(135deg, #4ade80, #22c55e)';
    if (changePct > 2) return 'linear-gradient(135deg, #6ee7b7, #34d399)';
    if (changePct > 0) return 'linear-gradient(135deg, #86efac, #4ade80)';
    if (changePct > -2) return 'linear-gradient(135deg, #fca5a5, #f87171)';
    if (changePct > -5) return 'linear-gradient(135deg, #f87171, #ef4444)';
    if (changePct > -10) return 'linear-gradient(135deg, #ef4444, #dc2626)';
    if (changePct > -20) return 'linear-gradient(135deg, #dc2626, #b91c1c)';
    return 'linear-gradient(135deg, #b91c1c, #991b1b)';
  }

  showLoading(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !show);
  }

  formatVolume(vol) {
    if (vol >= 1e9) return (vol / 1e9).toFixed(1) + 'B';
    if (vol >= 1e6) return (vol / 1e6).toFixed(1) + 'M';
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + 'K';
    return vol.toString();
  }
}
