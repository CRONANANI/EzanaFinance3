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
  return fyWindow(fyEndYear, now);
}

/**
 * The USAspending time_period window for any federal fiscal year.
 * US FYs run Oct 1 → Sep 30, named for the *ending* year, so FY`y` is
 * `(y-1)-10-01` → `y-09-30`. For an in-progress FY (end date in the future),
 * `end_date` is clamped to today so we never request a future window.
 *
 * @param {number} fyEndYear e.g. 2026 → { start_date:'2025-10-01', end_date:'2026-09-30' }
 * @returns {{ fyEndYear:number, start_date:string, end_date:string, partial:boolean }}
 */
export function fyWindow(fyEndYear, now = new Date()) {
  const start_date = `${fyEndYear - 1}-10-01`;
  const fyEnd = `${fyEndYear}-09-30`;
  const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
    now.getUTCDate(),
  ).padStart(2, '0')}`;
  const partial = today < fyEnd;
  return { fyEndYear, start_date, end_date: partial ? today : fyEnd, partial };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parse a leading YYYY-MM-DD out of a date string. Returns { y, mo, d } or null
 * for anything missing or malformed — we NEVER fall back to an epoch/default
 * date (a defaulted date is exactly how a bogus "Oct 15 1993"-style row appears).
 */
export function parseIsoYmd(input) {
  if (!input) return null;
  const m = String(input).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d };
}

/** Format a YYYY-MM-DD (or longer ISO) string as "Mon D, YYYY" (e.g. Jun 9, 2026). */
export function formatDisplayDate(input) {
  const parsed = parseIsoYmd(input);
  if (!parsed) return EM_DASH;
  return `${MONTHS[parsed.mo - 1]} ${parsed.d}, ${parsed.y}`;
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

// Sanity bounds. A single federal contract *action* sits comfortably below
// these; values outside them (a "$48B award", a 1993 start date on a recent
// awards view) are almost always a giant IDV ceiling or an old base date that
// reads as fabricated — so we DROP those rows rather than display them. Better
// to show fewer real rows than one bogus-looking one.
const MAX_PLAUSIBLE_AWARD_AMOUNT = 50_000_000_000; // $50B
const MIN_PLAUSIBLE_YEAR = 2000;

/** True only if a result has a usable numeric amount and a recent, parseable date. */
export function isPlausibleAward(r, nowYear = new Date().getUTCFullYear()) {
  const amt = Number(r['Award Amount']);
  if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_PLAUSIBLE_AWARD_AMOUNT) return false;
  const d = parseIsoYmd(r['Start Date']);
  if (!d) return false;
  if (d.y < MIN_PLAUSIBLE_YEAR || d.y > nowYear + 1) return false;
  return true;
}

function mapResults(results, displayLimit) {
  const nowYear = new Date().getUTCFullYear();

  // Validate first — impossible/fabricated-looking rows never reach the UI.
  const valid = results.filter((r) => isPlausibleAward(r, nowYear));
  const dropped = results.length - valid.length;
  if (dropped > 0) {
    console.warn(
      `[usaspending] dropped ${dropped} implausible award row(s) ` +
        `(amount missing/>$50B, or date < ${MIN_PLAUSIBLE_YEAR}/unparseable)`,
    );
  }

  const allRows = valid.map((r, i) => {
    const recipient = r['Recipient Name'] || 'Unknown recipient';
    const agency = r['Awarding Agency'] || EM_DASH;
    const amountNum = r['Award Amount'];
    // generated_internal_id (e.g. "CONT_AWD_…") is the permanent
    // generated_unique_award_id the award-profile endpoint accepts — prefer it
    // over the numeric internal_id so detail links never break.
    const awardId = r.generated_internal_id || (r.internal_id != null ? String(r.internal_id) : '');
    return {
      id: awardId || r['Award ID'] || `usa-${i}`,
      awardId,
      recipient,
      agency,
      ticker: tickerForRecipient(recipient),
      amount: formatAmount(amountNum),
      amountValue: Number(amountNum) || 0,
      date: formatDisplayDate(r['Start Date']),
    };
  });

  // topRecipients — aggregate total award value per recipient over the full
  // valid set, top 5. Mirrors the TOP_RECIPIENTS sample shape ({ name, meta,
  // value }). No fabricated tickers: meta is a real mapped symbol or the agency.
  const byRecipient = new Map();
  for (const r of allRows) {
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

  return { rows: allRows.slice(0, displayLimit), topRecipients };
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
  const displayLimit = Math.min(Math.max(Number(limit) || 15, 1), 100);
  // Over-fetch a buffer: sanity validation drops the largest IDV ceilings and
  // any pre-2000 base dates, which sort to the very top of "by award amount",
  // so we ask for extra to still fill the table with `displayLimit` real rows.
  const fetchLimit = Math.min(displayLimit * 2 + 10, 100);
  const cacheKey = JSON.stringify({ recipient, agency, displayLimit });
  const cached = _memo.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(USA_SPENDING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(buildRequestBody({ recipient, agency, limit: fetchLimit })),
      signal: controller.signal,
    });
    if (!res.ok) {
      return { rows: [], topRecipients: [], error: `USAspending ${res.status}` };
    }
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    const data = { ...mapResults(results, displayLimit), error: null };
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

/* ════════════════════════════════════════════════════════════════════════
   Per-award detail — powers the clickable award detail view.
   ════════════════════════════════════════════════════════════════════════ */

const AWARD_DETAIL_BASE = 'https://api.usaspending.gov/api/v2/awards/';
const TRANSACTIONS_URL = 'https://api.usaspending.gov/api/v2/transactions/';
// Official public award-profile page — the outbound "verify on USAspending" link.
const USA_SPENDING_AWARD_PAGE = 'https://www.usaspending.gov/award/';

const NOT_DISCLOSED = 'Not disclosed';

const _awardMemo = new Map(); // awardId -> { at, data }

function agencyNames(node) {
  return { top: node?.toptier_agency?.name || null, sub: node?.subtier_agency?.name || null };
}

function placeString(loc) {
  if (!loc) return null;
  const city = loc.city_name || loc.city || null;
  const state = loc.state_code || loc.state || null;
  const parts = [city, state].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return loc.country_name || null;
}

/** Best-effort modification history (POST /transactions/). Returns [] on any failure. */
async function fetchTransactions(awardId, signal) {
  try {
    const res = await fetch(TRANSACTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ award_id: awardId, limit: 20, sort: 'action_date', order: 'desc' }),
      signal,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    return results.map((t, i) => ({
      id: t.id ?? `txn-${i}`,
      date: formatDisplayDate(t.action_date),
      amount:
        t.federal_action_obligation != null ? formatAmount(t.federal_action_obligation) : EM_DASH,
      type: t.type_description || t.action_type_description || t.type || NOT_DISCLOSED,
      modNumber: t.modification_number || null,
      description: t.description || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch one award's profile from USAspending and map it to a clean,
 * display-ready object. Null fields become "—" / "Not disclosed" — we NEVER
 * fabricate a value. Always resolves: on timeout / error returns
 * `{ detail: null, error, usaspendingUrl }` so the UI shows a graceful empty
 * state with the outbound verify link rather than a spinner-forever or a 500.
 *
 * @param {string} awardId generated_unique_award_id (e.g. "CONT_AWD_…")
 */
export async function getAwardDetail(awardId) {
  if (!awardId) return { detail: null, error: 'Missing award id', usaspendingUrl: null };

  const cached = _awardMemo.get(awardId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const usaspendingUrl = `${USA_SPENDING_AWARD_PAGE}${encodeURIComponent(awardId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${AWARD_DETAIL_BASE}${encodeURIComponent(awardId)}/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return { detail: null, error: `USAspending ${res.status}`, usaspendingUrl };

    const a = await res.json();
    const contract = a.latest_transaction_contract_data || {};
    const awarding = agencyNames(a.awarding_agency);
    const funding = agencyNames(a.funding_agency);
    const pop = a.period_of_performance || {};
    const generatedId = a.generated_unique_award_id || awardId;

    const detail = {
      awardId: generatedId,
      piid: a.piid || a.fain || a.uri || null,
      recipientName: a.recipient?.recipient_name || NOT_DISCLOSED,
      awardType: a.type_description || a.category || NOT_DISCLOSED,
      description: a.description || NOT_DISCLOSED,
      totalObligation: a.total_obligation != null ? formatAmount(a.total_obligation) : EM_DASH,
      baseAndAllOptions:
        a.base_and_all_options != null ? formatAmount(a.base_and_all_options) : EM_DASH,
      dateSigned: formatDisplayDate(a.date_signed),
      popStart: formatDisplayDate(pop.start_date),
      popEnd: formatDisplayDate(pop.end_date || pop.potential_end_date),
      awardingAgency: awarding.top || NOT_DISCLOSED,
      awardingSubAgency: awarding.sub || null,
      fundingAgency: funding.top || null,
      fundingSubAgency: funding.sub || null,
      // Flag a funding agency only when it genuinely differs from the awarder.
      fundingDiffers: !!(funding.top && funding.top !== awarding.top),
      naics: {
        code: contract.naics || contract.naics_code || null,
        description: contract.naics_description || null,
      },
      psc: {
        code: contract.product_or_service_code || null,
        description: contract.product_or_service_description || null,
      },
      businessCategories: Array.isArray(a.recipient?.business_categories)
        ? a.recipient.business_categories
        : [],
      placeOfPerformance: placeString(a.place_of_performance),
      parentAward: a.parent_award?.generated_unique_award_id
        ? { id: a.parent_award.generated_unique_award_id, piid: a.parent_award.piid || null }
        : null,
      usaspendingUrl: `${USA_SPENDING_AWARD_PAGE}${encodeURIComponent(generatedId)}`,
      modifications: await fetchTransactions(generatedId, controller.signal),
    };

    const data = { detail, error: null, usaspendingUrl: detail.usaspendingUrl };
    _awardMemo.set(awardId, { at: Date.now(), data });
    return data;
  } catch (err) {
    return {
      detail: null,
      error:
        err?.name === 'AbortError' ? 'USAspending timeout' : err?.message || 'USAspending error',
      usaspendingUrl,
    };
  } finally {
    clearTimeout(timer);
  }
}
