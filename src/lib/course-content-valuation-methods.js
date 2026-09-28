/**
 * Authored content: stocks-intermediate-9, Choosing the Right Valuation Method.
 * 12 sections, 10-question quiz. The method matrix is built from
 * src/lib/valuation/valuation-method-map.js so the course and the Company
 * Research selector can never drift apart.
 *
 * All worked examples are hypothetical round numbers, labeled as such.
 */

import { VALUATION_ARCHETYPES } from './valuation/valuation-method-map.js';

const MATRIX_ROWS = VALUATION_ARCHETYPES.map((a) => ({
  attribute: a.label,
  values: [a.primary, a.crossChecks[0]],
}));

const VALUATION_METHODS_CONTENT = {
  'stocks-intermediate-9': {
    tool: {
      href: '/company-research?model=valuation',
      label: 'Open the Valuation Method Selector',
      blurb:
        'Search any ticker in Company Research and the selector classifies it, names the primary method and its cross checks, and opens the matching Ezana model.',
    },
    sections: [
      {
        title: 'One company, one method? Not quite',
        subDeck:
          'A bank, a gold miner, and a software company can all be worth $50 billion, but no single formula gets you there for all three.',
        content:
          'Every valuation method answers the same question: what is this business worth today? They differ in what they treat as the source of value. A discounted cash flow model says value comes from future free cash flow. A dividend discount model says it comes from cash actually paid to shareholders. A net asset value model says it comes from what the assets are worth. A multiples approach says it comes from how the market prices similar businesses.\n\nThe skill is matching the method to how the business actually creates value. Use the wrong one and you get a precise number that means nothing. The table below is the professional starting point. The rest of this course explains why each pairing works and where it breaks.',
        visual: {
          type: 'comparison-table',
          data: {
            columns: [
              { label: 'Primary method', color: 'var(--emerald)' },
              { label: 'First cross check', color: 'var(--info)' },
            ],
            rows: MATRIX_ROWS,
          },
          caption: 'Primary valuation method and first cross check by company type.',
        },
        keyTerms: [
          'intrinsic value',
          'discounted cash flow',
          'net asset value',
          'valuation multiple',
        ],
      },
      {
        title: 'The four questions that pick the method',
        content:
          'Before opening a spreadsheet, ask four questions. First, are cash flows positive and reasonably predictable? If yes, discounting cash flows is on the table. Second, is value tied up in identifiable assets with a market price, such as ore in the ground or buildings with rents? If yes, build up an asset value. Third, does the business pay out most of what it earns, and is the payout stable? If yes, dividends are a clean proxy for cash to owners. Fourth, is there a deep set of listed peers? If yes, multiples give you a market check.\n\nMost real companies pass more than one test. That is why professionals triangulate: one primary method that fits the economics, plus one or two cross checks that catch a bad assumption.',
        callout:
          'The primary method should match how the company makes money. The cross check should be able to prove you wrong.',
      },
      {
        title: 'Mining companies: net asset value',
        content:
          'A mine is a depleting asset. It holds a known quantity of ore, produces for a set number of years, then closes. That makes a perpetual growth DCF a poor fit. Instead analysts build a net asset value: each mine is modeled from today until the reserves run out, using a commodity price deck (an assumed path of metal prices), production volumes, and all-in sustaining costs. Each mine is discounted separately, the values are summed, and net debt is subtracted.\n\nListed miners are then compared on price to NAV (P/NAV). A miner trading at 0.7x NAV is priced below the modeled value of its assets, which can signal opportunity or market doubt about the price deck, the jurisdiction, or execution. Always check which commodity prices the NAV assumes. Change the gold price assumption and the NAV can swing dramatically.',
        keyTerms: ['net asset value', 'price deck', 'all-in sustaining cost', 'reserves', 'P/NAV'],
      },
      {
        title: 'Banks and insurers: the dividend discount model',
        content:
          "For most companies, debt is a way to finance the business. For a bank, debt (deposits and borrowings) is the raw material it lends out. That breaks free cash flow and enterprise value, the two building blocks of DCF and EV multiples. What is left is cash returned to shareholders, which is why the dividend discount model fits financials.\n\nThe Gordon growth version is simple: value equals next year's dividend divided by the required return minus the growth rate, V = D0 x (1 + g) / (k - g). Hypothetical example: a bank pays $1.00 per share, you require a 10% return, and you expect dividends to grow 6% a year forever. Value = 1.00 x 1.06 / (0.10 - 0.06) = $26.50. Pay more than $26.50 and your expected return falls below 10%.\n\nThe model is very sensitive to the gap between k and g. Professionals cross check with price to tangible book value and ask whether return on equity comfortably exceeds the cost of equity.",
        callout:
          'If growth ever equals or exceeds the required return, the Gordon formula breaks. That is a signal your growth assumption is not sustainable forever.',
        keyTerms: [
          'dividend discount model',
          'required rate of return',
          'Gordon growth model',
          'tangible book value',
        ],
      },
      {
        title: 'Distressed companies: liquidation value',
        content:
          'When a company may not survive, forecasting ten years of cash flows is fiction. The relevant question becomes what the assets would fetch if sold, and who gets paid first. Liquidation analysis marks each asset at a realistic recovery rate (cash near 100%, receivables below that, specialized equipment far below book), subtracts wind-down costs, and then runs the proceeds down the capital structure: secured lenders, then unsecured creditors, then equity.\n\nEquity is last in line, so a company can have valuable assets and still leave shareholders with nothing. Distress investors also run a going-concern view that assumes a restructuring succeeds. The gap between the liquidation floor and the going-concern value is the bet.',
        keyTerms: ['liquidation value', 'recovery rate', 'capital structure', 'absolute priority'],
      },
      {
        title: 'Startups: the venture capital method',
        content:
          'A young private company has no stable earnings to discount and no true peers to multiply. Venture investors work backwards from an exit instead. Estimate what the company could be worth at exit, divide by the return multiple the investor needs to compensate for the high failure rate, and the result is the post-money valuation they can accept today.\n\nHypothetical example: if the company could sell for $300 million in seven years and the fund targets a 10x return, the post-money valuation today is $300M / 10 = $30M. A $5M check at that valuation buys about 16.7% of the company, before future rounds dilute it. Because public companies already trade, this method applies to private companies, not listed tickers.',
        keyTerms: [
          'venture capital method',
          'post-money valuation',
          'target return multiple',
          'dilution',
        ],
      },
      {
        title: 'Consumer discretionary: DCF plus comps',
        content:
          'Retailers, restaurants, automakers, and apparel brands are usually mature, cash generative, and surrounded by listed peers. That makes them textbook candidates for a discounted cash flow model paired with comparable company multiples.\n\nThe trap is the cycle. Spending on non-essentials rises and falls with the economy, so a DCF built off a peak year overstates value and one built off a recession understates it. Normalize margins over a full cycle, then check the result against peer EV/EBITDA and P/E. If your DCF says 40% upside while peers imply the stock is fairly priced, find the assumption doing the work.',
        callout:
          'Use a reverse DCF to ask the opposite question: what growth is the current price already assuming?',
        keyTerms: [
          'discounted cash flow',
          'WACC',
          'terminal value',
          'EV/EBITDA',
          'normalized margins',
        ],
      },
      {
        title: 'Conglomerates: sum-of-the-parts',
        content:
          'A conglomerate owns businesses that have little to do with each other: an aerospace unit, an insurance arm, a consumer brand. Applying one multiple to the whole company blends together segments the market would price very differently.\n\nSum-of-the-parts values each segment on its own peer group, adds the segment values, then subtracts net debt and the capitalized cost of running headquarters. Hypothetical example: segments worth $40B, $25B, and $10B sum to $75B of enterprise value. If the whole company trades at $60B, the market is applying a 20% conglomerate discount. Activists often argue that a breakup would close that gap.',
        visual: {
          type: 'bar-chart',
          data: {
            bars: [
              { label: 'Segment A', value: 40, color: 'var(--emerald)' },
              { label: 'Segment B', value: 25, color: 'var(--info)' },
              { label: 'Segment C', value: 10, color: 'var(--purple)' },
              { label: 'Market value', value: 60, color: 'var(--warning)' },
            ],
            unit: '$B',
          },
          caption: 'Hypothetical sum-of-the-parts: $75B of segment value vs a $60B market value.',
        },
        keyTerms: ['sum-of-the-parts', 'conglomerate discount', 'segment reporting', 'spin-off'],
      },
      {
        title: 'REITs: net asset value and FFO',
        content:
          'A real estate investment trust is essentially a portfolio of income producing properties. Its value is anchored by what those properties would sell for. Analysts take net operating income and divide by a market capitalization rate to estimate property value, subtract debt, and divide by shares.\n\nHypothetical example: $50M of net operating income at a 6% cap rate implies about $833M of property value. Subtract $300M of debt and the NAV is about $533M, or about $26.67 per share across 20M shares. Earnings are distorted by depreciation on buildings that often appreciate, so REITs are also compared on price to funds from operations (P/FFO) and adjusted FFO (P/AFFO) rather than P/E.',
        keyTerms: ['REIT', 'net operating income', 'cap rate', 'funds from operations', 'AFFO'],
      },
      {
        title: 'High growth tech: revenue multiples',
        content:
          'Fast growing software and internet companies often report small or negative earnings because they spend heavily on growth. P/E is meaningless when earnings are near zero. Revenue is the most stable base, so these companies are compared on enterprise value to forward revenue.\n\nThe multiple is only as good as the revenue behind it. A company growing 40% with 80% gross margins and high customer retention deserves a much higher multiple than one growing 15% with 50% gross margins. A common shorthand is the Rule of 40: revenue growth plus profit margin should be at or above 40%. As the company matures, shift the weight toward a long horizon DCF with an explicit path to margins.',
        callout:
          'Revenue multiples compress fast when growth slows. Always ask what multiple the company earns once growth halves.',
        keyTerms: ['EV/Revenue', 'Rule of 40', 'gross margin', 'net revenue retention'],
      },
      {
        title: 'Utilities: DDM or DCF',
        content:
          'Regulated utilities earn an allowed return on their rate base, the capital regulators let them recover through customer bills. That makes cash flows unusually predictable, and utilities pay out a large share of earnings as dividends. Both the dividend discount model and a DCF work well, and they should land close to each other.\n\nBecause utility cash flows behave like a bond, their valuations move with interest rates. When bond yields rise, the required return rises and utility values fall, even if nothing changed operationally. Cross check the dividend yield against government bond yields and track rate base growth, the main engine of future dividends.',
        keyTerms: [
          'rate base',
          'allowed return on equity',
          'dividend yield',
          'interest rate sensitivity',
        ],
      },
      {
        title: 'Putting it together in Ezana',
        content:
          "In practice, pick the primary method from the company type, run it, then run at least one cross check that uses a different source of value. When the two disagree, the disagreement is information: it tells you which assumption the answer depends on.\n\nEzana's Valuation Method Selector in Company Research does the first step for you. Search a ticker and it reads the company's industry and financial profile, names the primary method and cross checks, explains why, and opens the matching Ezana model: the interactive DCF for cash flow businesses, the comps model for multiples, and a built-in dividend discount calculator for banks and utilities.",
        callout:
          'Educational content only. Not investment advice. Every method is only as good as its inputs.',
      },
    ],
    quiz: [
      {
        question: 'Why is a standard free cash flow DCF a poor fit for most banks?',
        options: [
          'Banks do not pay taxes',
          "Debt is the raw material of a bank's business, so free cash flow and enterprise value lose their usual meaning",
          'Banks never pay dividends',
          'Bank stocks are too volatile to model',
        ],
        correctIndex: 1,
        explanation:
          'Deposits and borrowings are what a bank lends out, so separating operating cash flow from financing does not work. Dividends and book value carry the signal instead.',
      },
      {
        question:
          'A hypothetical bank pays a $1.00 dividend, you require a 10% return, and you expect 6% growth forever. What is the Gordon growth value?',
        options: ['$10.00', '$16.67', '$25.00', '$26.50'],
        correctIndex: 3,
        explanation: 'V = D0 x (1 + g) / (k - g) = 1.00 x 1.06 / (0.10 - 0.06) = $26.50.',
      },
      {
        question: 'Which method is most closely associated with valuing a gold miner?',
        options: [
          'Net asset value built mine by mine to the end of reserves',
          'Revenue multiples',
          'The venture capital method',
          'Price to funds from operations',
        ],
        correctIndex: 0,
        explanation:
          'Mines are depleting assets with a finite life, so analysts model each mine to depletion at a commodity price deck and sum the discounted values.',
      },
      {
        question:
          "A company's segments are worth $40B, $25B, and $10B on their own peer multiples, but the whole company trades at $60B. What is the implied conglomerate discount?",
        options: ['15%', '20%', '25%', '60%'],
        correctIndex: 1,
        explanation: 'Sum of parts is $75B. ($75B - $60B) / $75B = 20%.',
      },
      {
        question: 'Why are REITs usually compared on P/FFO rather than P/E?',
        options: [
          'REITs do not report earnings',
          'P/FFO is required by law',
          'Depreciation on buildings depresses reported earnings even when the properties hold or gain value',
          'FFO includes the value of land only',
        ],
        correctIndex: 2,
        explanation:
          'Funds from operations adds back real estate depreciation, giving a better picture of the cash a property portfolio generates.',
      },
      {
        question:
          'Under the venture capital method, an exit value of $300M and a 10x target return imply what post-money valuation today?',
        options: ['$3M', '$10M', '$30M', '$300M'],
        correctIndex: 2,
        explanation: 'Post-money = exit value / target multiple = $300M / 10 = $30M.',
      },
      {
        question: 'Why do analysts often value high growth software companies on EV/Revenue?',
        options: [
          'Earnings are often small or negative because of heavy reinvestment, so revenue is the more stable base',
          'Revenue is audited but earnings are not',
          'Software companies have no costs',
          'Regulators require it',
        ],
        correctIndex: 0,
        explanation:
          'When earnings are near zero, P/E is meaningless. Revenue, judged alongside growth and gross margin, gives a workable comparison.',
      },
      {
        question: 'In a liquidation analysis, who is paid last?',
        options: ['Secured lenders', 'Unsecured bondholders', 'Suppliers', 'Common shareholders'],
        correctIndex: 3,
        explanation:
          'Proceeds flow down the capital structure by priority. Common equity is residual, so it is paid only after every creditor.',
      },
      {
        question: 'What is the main risk of building a DCF for a retailer off a single peak year?',
        options: [
          'The discount rate becomes negative',
          'Cyclical demand means peak margins overstate normal cash flows, inflating the valuation',
          'Retailers cannot be compared to peers',
          'Terminal value becomes zero',
        ],
        correctIndex: 1,
        explanation:
          'Consumer discretionary demand rises and falls with the economy. Normalizing margins over a full cycle avoids anchoring on a boom or a bust.',
      },
      {
        question:
          'Why do utility valuations tend to fall when bond yields rise, even with no change in operations?',
        options: [
          'Utilities stop paying dividends when rates rise',
          'Regulators cut the rate base automatically',
          'Higher yields raise the required return investors demand from bond-like cash flows',
          'Utility revenue is priced in foreign currency',
        ],
        correctIndex: 2,
        explanation:
          'Predictable, high payout cash flows compete with bonds. A higher required return lowers the present value of the same dividends.',
      },
    ],
  },
};

export default VALUATION_METHODS_CONTENT;
