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
    this.init();
  }

  init() {
    if (this.searchBtn) this.searchBtn.addEventListener('click', () => this.searchCompany());
    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.searchCompany(); });
    }
    document.querySelectorAll('.run-model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelType = e.target.closest('button').dataset.model;
        if (modelType) this.runModel(modelType);
      });
    });
  }

  searchCompany() {
    const query = this.searchInput ? this.searchInput.value.trim() : '';
    if (!query) {
      alert('Please enter a company name or ticker');
      return;
    }
    this.currentCompany = query;
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
});
