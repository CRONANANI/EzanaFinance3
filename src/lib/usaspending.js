/**
 * USAspending.gov federal contract awards — shared server-side data layer.
 *
 * USAspending.gov exposes a free, public, hosted REST API at
 * https://api.usaspending.gov with NO authentication and NO API key
 * ("Endpoints do not currently require any authorization"). We do NOT need
 * their Docker / Postgres / Elasticsearch self-hosting stack — we just make
 * server-side POST calls to `spending_by_award` and map the response into the
 * row shape the public /datasets pages already use, so live data is a drop-in
 * swap for the static sample.
 *
 * Caching: a light module-level memo (1h TTL) throttles upstream calls. The
 * consuming pages and the API route render at request time (force-dynamic) so
 * production always serves live data in the initial HTML, while this memo
 * keeps USAspending hit at most ~once/hour per distinct query. A Supabase
 * cache is an explicit later optimization — not needed for v1.
 *
 * Scope: federal CONTRACTS only (award type codes A/B/C/D). Grants (02–05)
 * and loans (07/08) are deliberately out of scope. USAspending is never wired
 * into Lobbying (LDA) or Patents (USPTO) — different systems entirely.
 */

const USA_SPENDING_URL = 'https://api.usaspending.gov/api/v2/search/spending_by_award/';

const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

// Contract award type codes. A/B/C/D = contracts (definitive contracts, BPA
// calls, purchase orders, delivery orders). Grants/loans intentionally excluded.
const CONTRACT_AWARD_TYPE_CODES = ['A', 'B', 'C', 'D'];

const EM_DASH = '—';

/**
 * Ticker handling — USAspending returns the recipient *company name*, never a
 * stock ticker, so we NEVER fabricate one. This is a small, hand-maintained
 * map of a few obvious large *public* federal contractors; every recipient
 * that is not an unambiguous match renders "—". Keys are matched as
 * case-insensitive substrings of the recipient name. Order matters where one
 * needle could be a prefix of another.
 */
const PUBLIC_CONTRACTOR_TICKERS = [
  ['lockheed martin', 'LMT'],
  ['boeing', 'BA'],
  ['raytheon', 'RTX'],
  ['rtx corp', 'RTX'],
  ['general dynamics', 'GD'],
  ['northrop grumman', 'NOC'],
  ['l3harris', 'LHX'],
  ['l-3 harris', 'LHX'],
  ['leidos', 'LDOS'],
  ['booz allen', 'BAH'],
  ['science applications', 'SAIC'],
  ['palantir', 'PLTR'],
  ['honeywell', 'HON'],
  ['caterpillar', 'CAT'],
  ['microsoft', 'MSFT'],
  ['amazon', 'AMZN'],
  ['international business machines', 'IBM'],
  ['accenture', 'ACN'],
  ['general electric', 'GE'],
  ['humana', 'HUM'],
];

export function tickerForRecipient(name) {
  const n = String(name || '').toLowerCase();
  for (const [needle, sym] of PUBLIC_CONTRACTOR_TICKERS) {
    if (n.includes(needle)) return sym;
  }
  return EM_DASH;
}

/**
 * Current U.S. federal fiscal year window. The federal FY runs Oct 1 → Sep 30
 * and is named for the calendar year it ends in (e.g. Oct 1 2025 → Sep 30 2026
 * is "FY2026"). Computed from today so we never ship a stale hardcoded year.
 */
export function currentFederalFiscalYear(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0 = Jan … 9 = Oct
  // October, November and December belong to the *next* fiscal year.
  const fyEndYear = m >= 9 ? y + 1 : y;
  return {
    fyEndYear,
    start_date: `${fyEndYear - 1}-10-01`,
    end_date: `${fyEndYear}-09-30`,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a YYYY-MM-DD (or longer ISO) string as "Mon D, YYYY" (e.g. Jun 9, 2026). */
export function formatDisplayDate(input) {
  if (!input) return EM_DASH;
  const s = String(input);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] || '';
  return `${month} ${Number(d)}, ${y}`;
}

/** Format a numeric USD amount as a compact mono string: $X.XXB / $X.XM / $X,XXX. */
export function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return EM_DASH;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

const _memo = new Map(); // cacheKey -> { at, data }

function buildRequestBody({ recipient, agency, limit }) {
  const fy = currentFederalFiscalYear();
  const filters = {
    award_type_codes: CONTRACT_AWARD_TYPE_CODES,
    time_period: [{ start_date: fy.start_date, end_date: fy.end_date }],
  };
  // Optional filters — omit any that are absent.
  if (recipient) filters.recipient_search_text = [recipient];
  if (agency) filters.agencies = [{ type: 'awarding', tier: 'toptier', name: agency }];

  return {
    subawards: false,
    limit: Math.min(Math.max(Number(limit) || 15, 1), 100),
    page: 1,
    order: 'desc',
    sort: 'Award Amount',
    filters,
    fields: [
      'Award ID',
      'Recipient Name',
      'Award Amount',
      'Awarding Agency',
      'Awarding Sub Agency',
      'Start Date',
      'Award Type',
    ],
  };
}

function mapResults(results) {
  const rows = results.map((r, i) => {
    const recipient = r['Recipient Name'] || 'Unknown recipient';
    const agency = r['Awarding Agency'] || EM_DASH;
    const amountNum = r['Award Amount'];
    return {
      id: r['Award ID'] || r.internal_id || `usa-${i}`,
      recipient,
      agency,
      ticker: tickerForRecipient(recipient),
      amount: formatAmount(amountNum),
      amountValue: Number(amountNum) || 0,
      date: formatDisplayDate(r['Start Date']),
    };
  });

  // topRecipients — aggregate total award value per recipient, top 5. Mirrors
  // the TOP_RECIPIENTS sample shape ({ name, meta, value }). No fabricated
  // tickers: meta shows a real mapped symbol when we have one, else the agency.
  const byRecipient = new Map();
  for (const r of rows) {
    const cur = byRecipient.get(r.recipient) || {
      name: r.recipient,
      total: 0,
      agency: r.agency,
      ticker: r.ticker,
    };
    cur.total += r.amountValue;
    byRecipient.set(r.recipient, cur);
  }
  const topRecipients = [...byRecipient.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((x) => ({
      name: x.name,
      meta: x.ticker !== EM_DASH ? `${x.ticker} · ${x.agency}` : x.agency,
      value: formatAmount(x.total),
    }));

  return { rows, topRecipients };
}

/**
 * Fetch + map current-fiscal-year federal contract awards from USAspending.
 * Always resolves (never throws): on timeout / rate-limit / upstream error it
 * returns `{ rows: [], topRecipients: [], error }` so callers fall back to the
 * static sample instead of crashing.
 *
 * @param {{ recipient?: string, agency?: string, limit?: number|string }} [opts]
 * @returns {Promise<{ rows: object[], topRecipients: object[], error: string|null }>}
 */
export async function getContractAwards({ recipient = '', agency = '', limit = 15 } = {}) {
  const cacheKey = JSON.stringify({ recipient, agency, limit });
  const cached = _memo.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USA_SPENDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildRequestBody({ recipient, agency, limit })),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { rows: [], topRecipients: [], error: `USAspending ${res.status}` };
    }
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    const data = { ...mapResults(results), error: null };
    // Only cache successful, non-empty responses so a transient failure can't
    // pin an empty result for an hour.
    if (data.rows.length > 0) _memo.set(cacheKey, { at: Date.now(), data });
    return data;
  } catch (err) {
    return {
      rows: [],
      topRecipients: [],
      error:
        err?.name === 'AbortError' ? 'USAspending timeout' : err?.message || 'USAspending error',
    };
  } finally {
    clearTimeout(timer);
  }
}
