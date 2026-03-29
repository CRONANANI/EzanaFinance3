/**
 * Sentinel weekly report — structured text for /api/centaur/sentinel and SentinelReportModal.
 * Uses @@SECTION:id@@ markers for reliable parsing; supports legacy plain-text reports.
 */

export const SENTINEL_DISCLAIMER =
  'This report is generated for educational purposes only. It is not investment advice. Always conduct your own research before making investment decisions.';

const SECTION = {
  PORTFOLIO_HEALTH: 'PORTFOLIO_HEALTH',
  KEY_INSIGHTS: 'KEY_INSIGHTS',
  TOP_PERFORMERS: 'TOP_PERFORMERS',
  EVENTS: 'EVENTS',
  RECOMMENDATIONS: 'RECOMMENDATIONS',
  DISCLAIMER: 'DISCLAIMER',
};

function sectionBlock(id, body) {
  return `@@SECTION:${id}@@\n${(body || '').trim()}\n\n`;
}

/**
 * @param {Array<{ ticker_symbol?: string, institution_value?: number, quantity?: number, institution_price?: number }>} holdings
 * @param {{ totalValue?: number }} [opts]
 */
export function buildSentinelReportText(holdings, opts = {}) {
  const rows = Array.isArray(holdings) ? holdings : [];
  const totalValue = opts.totalValue ?? rows.reduce((s, h) => s + (Number(h.institution_value) || 0), 0);
  const sorted = [...rows].sort(
    (a, b) => (Number(b.institution_value) || 0) - (Number(a.institution_value) || 0),
  );
  const top = sorted.slice(0, 8);
  const tickers = [...new Set(rows.map((r) => r.ticker_symbol).filter(Boolean))];

  const healthLabel = 'Strong';

  const keyInsights = [];
  if (tickers.length > 0) {
    keyInsights.push(
      `• Your report is anchored to ${tickers.length} unique position${tickers.length === 1 ? '' : 's'} across your linked accounts: ${tickers.slice(0, 12).join(', ')}${tickers.length > 12 ? '…' : ''}.`,
    );
    keyInsights.push(
      '• Concentration risk: review whether any single name exceeds your intended policy weight; trim or hedge if needed.',
    );
    keyInsights.push(
      '• Macro and rates narratives this week may move growth vs. value factor leadership — map headlines back to your actual tickers above.',
    );
  } else {
    keyInsights.push(
      '• Connect a brokerage on the Trading page to pull live holdings; Sentinel will then tailor every section to your symbols.',
    );
    keyInsights.push(
      '• Until holdings sync, this report uses a neutral baseline. Your dashboard portfolio card will reflect the same totals once linked.',
    );
  }

  const topPerformers = [];
  if (top.length > 0) {
    top.forEach((h, i) => {
      const t = h.ticker_symbol || '—';
      const v = Number(h.institution_value) || 0;
      const pct = totalValue > 0 ? ((v / totalValue) * 100).toFixed(1) : '0';
      topPerformers.push(
        `• ${t}: ~${pct}% of portfolio value ($${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}). ${i === 0 ? 'Largest sleeve — watch earnings revisions and sector beta.' : 'Track position size vs. your plan and rebalance if extended.'}`,
      );
    });
  } else {
    topPerformers.push('• No holdings detected yet — top names will appear here after your accounts sync.');
  }

  const events = [
    '• Central bank and inflation prints — high impact for duration-sensitive names in your book.',
    '• Earnings guidance and margin commentary for your largest weights.',
    '• Geopolitical and commodity shocks that could flow through to your sector mix.',
  ];

  const recommendations = [];
  if (tickers.length > 0) {
    recommendations.push(`• Cross-check ${tickers.slice(0, 5).join(', ')} against your debrief queue and trim into strength if policy limits are breached.`);
    recommendations.push('• Refresh stop levels and position sizing on higher-beta names.');
    recommendations.push('• Revisit tax-lot and cost basis assumptions before year-end activity.');
  } else {
    recommendations.push('• Link brokerage accounts to unlock ticker-level recommendations.');
    recommendations.push('• Use the dashboard portfolio view to validate totals against this report.');
  }

  let out = '';
  out += sectionBlock(SECTION.PORTFOLIO_HEALTH, healthLabel);
  out += sectionBlock(SECTION.KEY_INSIGHTS, keyInsights.join('\n'));
  out += sectionBlock(SECTION.TOP_PERFORMERS, topPerformers.join('\n'));
  out += sectionBlock(SECTION.EVENTS, events.join('\n'));
  out += sectionBlock(SECTION.RECOMMENDATIONS, recommendations.join('\n'));
  out += sectionBlock(SECTION.DISCLAIMER, SENTINEL_DISCLAIMER);

  return out.trim();
}

/**
 * Strip legacy header lines from old saved reports.
 */
function stripLegacyHeaders(text) {
  if (!text) return '';
  return text
    .replace(/^YOHANNES SENTINEL[^\n]*\n*/i, '')
    .replace(/^Generated:\s*[^\n]+\n*/i, '')
    .trim();
}

/**
 * Remove storage markers and technical tokens from displayed copy.
 */
export function cleanSentinelField(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s.replace(/@@SECTION:\w+@@\s*/g, '');
  t = t.replace(/@+/g, '');
  // If leaked ALL_CAPS_SNAKE ids appear as words, show spaces instead of underscores
  t = t.replace(/\b([A-Z]{2,}(?:_[A-Z0-9]+)+)\b/g, (_, token) => token.replace(/_/g, ' '));
  return t.trim();
}

function parseMarkedSections(text) {
  const raw = stripLegacyHeaders(text);
  if (!raw.includes('@@SECTION:')) return null;

  const map = {};
  const re = /@@SECTION:(\w+)@@/g;
  const matches = [...raw.matchAll(re)];
  if (matches.length === 0) return null;

  for (let i = 0; i < matches.length; i++) {
    const sectionKey = matches[i][1];
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : raw.length;
    map[sectionKey] = raw.slice(start, end).trim();
  }

  return Object.keys(map).length ? map : null;
}

function parseLegacySections(text) {
  const raw = stripLegacyHeaders(text);
  const disclaimerMatch = raw.match(/(This report is generated for educational purposes only\.[\s\S]*)$/i);
  const disclaimer = disclaimerMatch ? disclaimerMatch[1].trim() : SENTINEL_DISCLAIMER;
  let body = disclaimerMatch ? raw.slice(0, disclaimerMatch.index).trim() : raw;
  /* Safety: legacy path sometimes receives @@SECTION markup if the marked parser failed */
  body = body.replace(/@@SECTION:\w+@@\s*/g, '');

  let portfolioHealth = 'Strong';
  const ph = body.match(/PORTFOLIO HEALTH:\s*([^\n]+)/i);
  if (ph) {
    portfolioHealth = ph[1].trim();
    body = body.replace(/PORTFOLIO HEALTH:\s*[^\n]+\s*/i, '').trim();
  }
  body = body.replace(/^\s*Your portfolio is performing well\.[^\n]*\n*/i, '').trim();

  const headerRe = /(KEY INSIGHTS|TOP PERFORMERS|EVENTS TO MONITOR|RECOMMENDATIONS)\s*\n*/gi;
  const chunks = body.split(headerRe);
  const sections = { keyInsights: '', topPerformers: '', events: '', recommendations: '' };
  for (let i = 1; i < chunks.length; i += 2) {
    const label = (chunks[i] || '').toUpperCase();
    const content = (chunks[i + 1] || '').trim();
    if (label.includes('KEY INSIGHTS')) sections.keyInsights = content;
    else if (label.includes('TOP PERFORMERS')) sections.topPerformers = content;
    else if (label.includes('EVENTS')) sections.events = content;
    else if (label.includes('RECOMMENDATIONS')) sections.recommendations = content;
  }

  if (!sections.keyInsights.trim() && chunks[0]?.trim()) {
    sections.keyInsights = chunks[0].trim();
  }

  return {
    portfolioHealth: cleanSentinelField(portfolioHealth),
    keyInsights: cleanSentinelField(sections.keyInsights),
    topPerformers: cleanSentinelField(sections.topPerformers),
    events: cleanSentinelField(sections.events),
    recommendations: cleanSentinelField(sections.recommendations),
    disclaimer: cleanSentinelField(disclaimer),
  };
}

/**
 * @returns {{ portfolioHealth: string, keyInsights: string, topPerformers: string, events: string, recommendations: string, disclaimer: string, legacyBody?: string }}
 */
export function parseSentinelReportText(text) {
  if (!text?.trim()) {
    return {
      portfolioHealth: 'Strong',
      keyInsights: '',
      topPerformers: '',
      events: '',
      recommendations: '',
      disclaimer: SENTINEL_DISCLAIMER,
    };
  }

  const marked = parseMarkedSections(text);
  if (marked && Object.keys(marked).length > 0) {
    return {
      portfolioHealth: cleanSentinelField(marked.PORTFOLIO_HEALTH || 'Strong'),
      keyInsights: cleanSentinelField(marked.KEY_INSIGHTS || ''),
      topPerformers: cleanSentinelField(marked.TOP_PERFORMERS || ''),
      events: cleanSentinelField(marked.EVENTS || ''),
      recommendations: cleanSentinelField(marked.RECOMMENDATIONS || ''),
      disclaimer: cleanSentinelField(marked.DISCLAIMER || SENTINEL_DISCLAIMER),
    };
  }

  return parseLegacySections(text);
}

