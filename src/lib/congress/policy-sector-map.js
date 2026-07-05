/**
 * Policy → Sector map — STATIC, human-curated DATA (never runtime-guessed).
 *
 * Maps Congress.gov `policyArea` values (one per bill) and a set of high-signal
 * `subjects` to market sectors and representative tickers / ETFs. Used by the
 * Legislative Momentum engine (momentum.js) to answer "which sectors are seeing
 * rising legislative activity" — analytical/informational only, never advice.
 *
 * Extensible & reviewable: add/adjust entries here. Tickers are representative
 * constituents, not recommendations. Prices/fundamentals for these come from
 * the existing FMP/Finnhub integration.
 *
 * policyArea values are the official Congress.gov set (e.g. "Armed Forces and
 * National Security", "Energy", "Health", "Finance and Financial Sector",
 * "Science, Technology, Communications", "Transportation and Public Works",
 * "Agriculture and Food", "Taxation", "Environmental Protection").
 */

/** sectorKey → { label, etf, tickers[] } */
export const SECTORS = {
  defense: { label: 'Defense & Aerospace', etf: 'ITA', tickers: ['LMT', 'RTX', 'GD', 'NOC', 'BA'] },
  energy: { label: 'Energy (Oil & Gas)', etf: 'XLE', tickers: ['XOM', 'CVX', 'COP', 'SLB'] },
  cleanEnergy: { label: 'Clean Energy', etf: 'ICLN', tickers: ['FSLR', 'ENPH', 'NEE', 'RUN'] },
  pharma: { label: 'Pharma & Biotech', etf: 'XBI', tickers: ['PFE', 'MRK', 'JNJ', 'ABBV', 'LLY'] },
  providers: { label: 'Healthcare Providers', etf: 'IHF', tickers: ['UNH', 'HCA', 'CVS'] },
  banks: { label: 'Banks & Financials', etf: 'XLF', tickers: ['JPM', 'BAC', 'WFC', 'GS'] },
  fintech: { label: 'Fintech', etf: 'FINX', tickers: ['V', 'MA', 'PYPL', 'COIN'] },
  tech: { label: 'Technology', etf: 'XLK', tickers: ['MSFT', 'AAPL', 'GOOGL', 'META'] },
  semis: { label: 'Semiconductors', etf: 'SMH', tickers: ['NVDA', 'AMD', 'AVGO', 'INTC', 'TSM'] },
  industrials: {
    label: 'Industrials & Infrastructure',
    etf: 'XLI',
    tickers: ['CAT', 'DE', 'UNP', 'HON'],
  },
  agriculture: { label: 'Agriculture & Food', etf: 'MOO', tickers: ['ADM', 'DE', 'BG', 'MOS'] },
  autos: { label: 'Autos & EV', etf: 'CARZ', tickers: ['TSLA', 'GM', 'F'] },
};

/** policyArea (exact) → sectorKey[] */
export const POLICY_AREA_SECTORS = {
  'Armed Forces and National Security': ['defense'],
  Energy: ['energy', 'cleanEnergy'],
  'Environmental Protection': ['cleanEnergy'],
  Health: ['pharma', 'providers'],
  'Finance and Financial Sector': ['banks', 'fintech'],
  'Science, Technology, Communications': ['tech', 'semis'],
  'Transportation and Public Works': ['industrials', 'autos'],
  'Agriculture and Food': ['agriculture'],
  Taxation: ['banks'],
  Commerce: ['tech', 'industrials'],
};

/** high-signal subject → sectorKey[] (refines/adds beyond policyArea) */
export const SUBJECT_SECTORS = {
  Semiconductors: ['semis'],
  'Solar energy': ['cleanEnergy'],
  'Wind energy': ['cleanEnergy'],
  'Electric power generation and transmission': ['cleanEnergy', 'energy'],
  'Oil and gas': ['energy'],
  'Drug and radiation therapy': ['pharma'],
  'Prescription drugs': ['pharma'],
  'Health programs administration and funding': ['providers'],
  'Banking and financial institutions regulation': ['banks'],
  Securities: ['banks', 'fintech'],
  'Digital assets': ['fintech'],
  'Military procurement, research, weapons development': ['defense'],
  'Motor vehicles': ['autos'],
  'Electric vehicles': ['autos', 'cleanEnergy'],
  'Agricultural prices and subsidies': ['agriculture'],
};

/**
 * Resolve the sector keys a bill maps to from its policyArea + subjects.
 * @param {{policyArea?:string, subjects?:string[]}} bill
 * @returns {string[]} unique sectorKeys (may be empty — honest)
 */
export function sectorsForBill(bill = {}) {
  const keys = new Set();
  const pa = POLICY_AREA_SECTORS[bill.policyArea] || POLICY_AREA_SECTORS[bill.policy_area];
  if (pa) pa.forEach((k) => keys.add(k));
  for (const s of bill.subjects || []) {
    const sk = SUBJECT_SECTORS[s];
    if (sk) sk.forEach((k) => keys.add(k));
  }
  return [...keys];
}

/** Which sector(s) a ticker belongs to (for oversight-overlap + contractor cards). */
export function sectorsForTicker(ticker) {
  const t = String(ticker || '').toUpperCase();
  const out = [];
  for (const [key, s] of Object.entries(SECTORS)) if (s.tickers.includes(t)) out.push(key);
  return out;
}
