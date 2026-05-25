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
    terms: keyTerms.map((t, i) => ({
      name: typeof t === 'string' ? t : t.name,
      color: TERM_COLORS[i % TERM_COLORS.length],
      definition: typeof t === 'object' && t.definition ? t.definition : '(definition pending)',
    })),
  };
}

function buildCalloutModule(callout) {
  if (!callout) return null;
  return { type: 'callout', body: callout };
}

/** Convert legacy section shape to explicit modules array. Idempotent. */
export function transformSection(section) {
  if (Array.isArray(section.modules) && section.modules.length > 0) {
    return section;
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
    modules,
  };
}

export function transformCourseContent(content) {
  if (!content?.sections) return content;
  return {
    ...content,
    sections: content.sections.map(transformSection),
  };
}
