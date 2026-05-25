import { KEYWORDS } from './echo-keywords.js';

const SUPPLEMENTAL_DEFINITIONS = {
  'inflation risk': 'Your money buys less over time as prices rise.',
  'interest rate risk': 'Bond prices fall when interest rates rise.',
  'market risk': 'A broad selloff drags every asset down at once.',
  'business risk': 'The specific company you own falters or fails.',
  'liquidity risk': "You can't sell when you need to — or only at a steep discount.",
  diversification: 'Holding many uncorrelated positions so no single risk dominates the outcome.',
  'asset allocation':
    'How a portfolio is split across asset classes (stocks, bonds, cash, real estate).',
  rebalancing: 'Periodically restoring a portfolio to its target allocation after market moves.',
  correlation:
    'How closely two assets move together. Diversification works because correlations are below 1.',
  overfitting: 'Building a model so closely fit to past noise that it fails on new data.',
  crowding: 'When too many traders follow the same signal, the edge erodes.',
  'survivorship bias': 'You see the winners that survived but not the failures that disappeared.',
  'base rate': 'The unconditional probability of an outcome before considering specifics.',
  edge: 'A repeatable reason your decisions should outperform a passive benchmark net of costs.',
  revenue: 'Total money the company collected from selling products or services during the period.',
  'cost of revenue': 'The direct cost of producing the product or service that was sold.',
  'gross profit':
    'Revenue minus cost of revenue. The profit from the product itself, before overhead.',
  'operating expenses':
    'Costs of running the business beyond the direct cost of the product — R&D, sales, admin.',
  'operating income':
    'Profit from the core business after operating expenses, before interest and taxes.',
  'net income': 'Final profit after every cost. The "bottom line."',
  eps: 'Earnings per share. Net income divided by shares outstanding.',
  'diluted eps': 'EPS including the dilutive effect of options and convertible securities.',
  assets: 'Economic resources the company controls.',
  liabilities: 'Money the company owes to others.',
  equity: 'What would remain for shareholders if every asset were sold and every debt paid.',
  'current assets': 'Assets expected to convert to cash within a year.',
  'current liabilities': 'Debts due within a year.',
  goodwill: 'The premium paid above book value when acquiring another company.',
  'retained earnings': 'Cumulative profit kept by the company rather than paid out as dividends.',
  'book value': 'Total assets minus total liabilities. The accounting value of shareholder equity.',
  'operating cash flow':
    'Cash generated or used by the core business operations during the period.',
  'capital expenditure': 'Cash spent on long-term assets like property, equipment, software.',
  capex: 'Capital expenditure. Cash spent on long-term assets.',
  'free cash flow':
    'Operating cash flow minus capital expenditure. Cash available after maintaining operations.',
  fcf: 'Free cash flow. Operating cash flow minus capital expenditure.',
  depreciation:
    'A non-cash expense allocating the cost of long-term assets over their useful life.',
  amortization: 'Like depreciation, but for intangible assets like software, patents, or goodwill.',
  'working capital':
    'Current assets minus current liabilities. Changes in working capital affect operating cash flow.',
  'p/e ratio':
    'Price-to-earnings ratio. Stock price divided by EPS. Measures how much investors pay per dollar of profit.',
  'current ratio': 'Current assets divided by current liabilities. Short-term liquidity measure.',
  'quick ratio': 'Like current ratio but excludes inventory. A stricter liquidity test.',
  'debt-to-equity': 'Total debt divided by total equity. Measures financial leverage.',
  'return on equity':
    'Net income divided by shareholder equity. How efficiently the company uses shareholder capital.',
  roe: 'Return on equity. Net income divided by shareholder equity.',
  'return on invested capital':
    'After-tax operating income divided by invested capital. The truest measure of business returns.',
  roic: 'Return on invested capital.',
};

const TERM_DEFINITION_LOOKUP = (() => {
  const lookup = { ...SUPPLEMENTAL_DEFINITIONS };
  for (const entry of Object.values(KEYWORDS)) {
    if (entry?.term && entry?.definition) {
      const key = entry.term.toLowerCase().trim();
      lookup[key] = entry.definition;
      if (!key.endsWith('s')) lookup[`${key}s`] = entry.definition;
      else lookup[key.slice(0, -1)] = entry.definition;
    }
  }
  return lookup;
})();

function lookupDefinition(term) {
  if (!term) return null;
  return TERM_DEFINITION_LOOKUP[String(term).toLowerCase().trim()] || null;
}

function resolveTermDefinition(term, existingDef) {
  if (existingDef && existingDef !== '(definition pending)') return existingDef;
  return (
    lookupDefinition(term) ||
    `Definition for "${term}" — add to SUPPLEMENTAL_DEFINITIONS in section-modules-transform.js.`
  );
}

function enrichKeyTermDefinitions(modules) {
  if (!Array.isArray(modules)) return modules;
  return modules.map((m) => {
    if (m.type === 'keyTermCards' && Array.isArray(m.terms)) {
      return {
        ...m,
        terms: m.terms.map((t) => ({
          ...t,
          definition: resolveTermDefinition(t.name, t.definition),
        })),
      };
    }
    if (m.type === 'keyTermsList' && Array.isArray(m.terms)) {
      return {
        ...m,
        terms: m.terms.map((t) =>
          typeof t === 'string'
            ? { name: t, definition: resolveTermDefinition(t) }
            : { ...t, definition: resolveTermDefinition(t.name, t.definition) },
        ),
      };
    }
    return m;
  });
}

const HISTORY_TRIGGERS = [
  /history/i,
  /historical/i,
  /evolution of/i,
  /origins of/i,
  /the rise of/i,
  /the fall of/i,
  /crash/i,
  /crisis/i,
  /\b(19|20)\d{2}\b/,
  /since the/i,
  /before the/i,
  /after the/i,
  /founded/i,
  /invented/i,
  /the birth of/i,
];

const TICKER_REGEX =
  /\b(AAPL|MSFT|GOOGL?|AMZN|META|TSLA|NVDA|NFLX|AMD|INTC|JPM|BAC|WFC|GS|MS|XOM|CVX|JPM|BAC|GS|WFC|MS|XOM|CVX|JNJ|UNH|PFE|LLY|ABBV|KO|PEP|WMT|PG|HD|MCD|NKE|DIS|BA|CAT|GE|F|GM|SPY|QQQ|IWM|VTI|VOO|TLT|IEF|SHY|GLD|SLV|USO|VNQ|XLK|XLF|XLE|XLV|XLY|XLP|XLI|XLB|XLU|BTC|ETH|BNB|SOL|ADA|DOGE|BRK\.B)\b/gi;

const COMPANY_TO_TICKER = {
  apple: 'AAPL',
  microsoft: 'MSFT',
  google: 'GOOGL',
  alphabet: 'GOOGL',
  amazon: 'AMZN',
  meta: 'META',
  facebook: 'META',
  tesla: 'TSLA',
  nvidia: 'NVDA',
  netflix: 'NFLX',
  'jp morgan': 'JPM',
  jpmorgan: 'JPM',
  'goldman sachs': 'GS',
  'berkshire hathaway': 'BRK.B',
  exxon: 'XOM',
  chevron: 'CVX',
  walmart: 'WMT',
  'coca-cola': 'KO',
  'coca cola': 'KO',
  bitcoin: 'BTC',
  ethereum: 'ETH',
};

const TERM_COLORS = ['amber', 'blue', 'red', 'violet', 'coralDeep'];

export function findTickersInText(text) {
  if (!text) return [];
  const found = new Set();
  const tickerMatches = text.match(TICKER_REGEX);
  if (tickerMatches)
    tickerMatches.forEach((t) => found.add(t.toUpperCase().replace('BRK.B', 'BRK.B')));
  const lower = text.toLowerCase();
  for (const [name, ticker] of Object.entries(COMPANY_TO_TICKER)) {
    if (lower.includes(name)) found.add(ticker);
  }
  return Array.from(found);
}

export function isHistorySection(title) {
  return HISTORY_TRIGGERS.some((re) => re.test(title || ''));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wrapTickerMentions(text) {
  if (!text) return text;
  if (text.includes('[[ticker:')) return text;

  let result = text;
  const seenTickers = new Set();

  result = result.replace(new RegExp(TICKER_REGEX.source, 'g'), (match) => {
    const symbol = match.toUpperCase();
    if (seenTickers.has(symbol)) return match;
    seenTickers.add(symbol);
    return `[[ticker:${symbol}]]${match}[[/ticker]]`;
  });

  const sortedNames = Object.keys(COMPANY_TO_TICKER).sort((a, b) => b.length - a.length);
  const seenCompanies = new Set();
  for (const name of sortedNames) {
    const ticker = COMPANY_TO_TICKER[name];
    if (seenCompanies.has(ticker) || seenTickers.has(ticker)) continue;
    const re = new RegExp(`\\b(${escapeRegex(name)})\\b`, 'i');
    if (re.test(result)) {
      result = result.replace(re, (matched) => `[[ticker:${ticker}]]${matched}[[/ticker]]`);
      seenCompanies.add(ticker);
    }
  }

  return result;
}

function buildParagraphModules(content) {
  if (!content) return [];
  return content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((body) => ({ type: 'paragraphs', body: wrapTickerMentions(body) }));
}

function buildChartModule(visual) {
  if (!visual) return null;
  return {
    type: 'chart',
    visualType: visual.type,
    data: visual.data,
    eyebrow: 'Live example',
    title: visual.caption || 'Visualization',
  };
}

function buildContextTimeline(section) {
  return {
    type: 'contextTimeline',
    position: 'right',
    title: 'Historical context',
    events: [
      {
        year: '—',
        label: 'Author needed',
        detail: `Authoring required: replace with real events for "${section.title}".`,
      },
    ],
    _needsAuthoring: true,
  };
}

function buildKeyTermsModule(keyTerms) {
  if (!Array.isArray(keyTerms) || keyTerms.length === 0) return null;
  if (keyTerms.length < 3) {
    return { type: 'keyTermsList', terms: keyTerms };
  }
  return {
    type: 'keyTermCards',
    eyebrow: 'Key terms unlocked this section',
    pillLabel: `${keyTerms.length} new`,
    terms: keyTerms.map((t, i) => {
      const name = typeof t === 'string' ? t : t.name;
      return {
        name,
        color: TERM_COLORS[i % TERM_COLORS.length],
        definition: resolveTermDefinition(name, typeof t === 'object' ? t.definition : null),
      };
    }),
  };
}

function buildCalloutModule(callout) {
  if (!callout) return null;
  return { type: 'callout', body: callout };
}

/** Convert legacy section shape to explicit modules array. Idempotent. */
export function transformSection(section) {
  if (Array.isArray(section.modules) && section.modules.length > 0) {
    return {
      ...section,
      modules: enrichKeyTermDefinitions(section.modules),
    };
  }

  const modules = [];
  const allText = section.content || '';
  const isHistory = isHistorySection(section.title);

  modules.push(...buildParagraphModules(allText));

  if (isHistory) {
    modules.push(buildContextTimeline(section));
  }

  const chart = buildChartModule(section.visual);
  if (chart) modules.push(chart);

  const callout = buildCalloutModule(section.callout);
  if (callout) modules.push(callout);

  const terms = buildKeyTermsModule(section.keyTerms);
  if (terms) modules.push(terms);

  return {
    ...section,
    shortTitle: section.shortTitle || section.title,
    estimatedMinutes: section.estimatedMinutes || 3,
    modules: enrichKeyTermDefinitions(modules),
  };
}

export function transformCourseContent(content) {
  if (!content?.sections) return content;
  return {
    ...content,
    sections: content.sections.map(transformSection),
  };
}
