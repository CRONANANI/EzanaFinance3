/**
 * Ezana API, titans dimension: the pure maths behind the insight routes.
 * No server imports, so scripts/check-ezana-api-titans.mjs can test it.
 *
 *   holdingChange(now, prior, comparable)  13F quarter-over-quarter class
 *   insiderSummary(rows, anchor)           net open-market flow by role,
 *                                          over 90 and 365 days
 *   holdingKey(h)                          one security id across funds
 *   etfOverlap(a, b, { top })              sum of min weights + shared names
 *   execCompYears(rows)                    one row per company and year
 *   payVsPerformance(rows, opts)           CEO pay growth against TSR
 */

const DAY = 86400000;
const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const round = (v, d = 1) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);

export const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
export const CIK_RE = /^[0-9]{1,10}$/;
/** SEC CIKs are stored zero-padded to 10 digits in the 13F tables. */
export const padCik = (cik) => String(cik).padStart(10, '0');

/**
 * 13F change class for one filer and one security, the same rule the
 * Institutional page uses: prior 0 and now > 0 is new; now 0 and prior > 0 is
 * exited; now at least twice prior is doubled; then added, trimmed or flat.
 * null when the filer has no filing for the prior quarter (not comparable).
 */
export function holdingChange(sharesNow, sharesPrior, comparable = true) {
  if (!comparable) return null;
  const now = Number(sharesNow) || 0;
  const prior = Number(sharesPrior) || 0;
  if (prior === 0 && now > 0) return 'new';
  if (now === 0 && prior > 0) return 'exited';
  if (prior > 0 && now >= prior * 2) return 'doubled';
  if (now > prior) return 'added';
  if (now < prior) return 'trimmed';
  return 'flat';
}

/* ── insider summary ─────────────────────────────────────────────────── */

const ROLES = ['officer', 'director', 'ten_pct_owner'];
const emptyFlow = () => ({ buys: 0, buy_value: 0, sells: 0, sell_value: 0, net_value: 0 });

function addFlow(f, isBuy, value) {
  if (isBuy) {
    f.buys += 1;
    f.buy_value += value;
  } else {
    f.sells += 1;
    f.sell_value += value;
  }
  f.net_value = f.buy_value - f.sell_value;
}

/**
 * Net open-market flow for one issuer over the 90 and 365 days ending at
 * `anchor` (ISO date). Only code P (buy) and S (sale) count. A transaction is
 * added to every role its reporter holds (an officer who is also a director
 * appears under both); `total` counts each transaction once.
 * rows: { transaction_date, code, value, is_officer, is_director, is_ten_pct_owner }
 */
export function insiderSummary(rows, anchor) {
  const end = Date.parse(`${anchor}T00:00:00Z`);
  const windows = { days_90: 90, days_365: 365 };
  const out = {};
  for (const [name, days] of Object.entries(windows)) {
    const start = end - days * DAY;
    const total = emptyFlow();
    const byRole = Object.fromEntries(ROLES.map((r) => [r, emptyFlow()]));
    for (const r of rows || []) {
      if (r.code !== 'P' && r.code !== 'S') continue;
      const t = Date.parse(`${String(r.transaction_date).slice(0, 10)}T00:00:00Z`);
      if (!Number.isFinite(t) || t < start || t > end) continue;
      const value = n(r.value) || 0;
      const isBuy = r.code === 'P';
      addFlow(total, isBuy, value);
      if (r.is_officer) addFlow(byRole.officer, isBuy, value);
      if (r.is_director) addFlow(byRole.director, isBuy, value);
      if (r.is_ten_pct_owner) addFlow(byRole.ten_pct_owner, isBuy, value);
    }
    const fix = (f) => ({
      ...f,
      buy_value: Math.round(f.buy_value),
      sell_value: Math.round(f.sell_value),
      net_value: Math.round(f.net_value),
    });
    out[name] = {
      ...fix(total),
      by_role: Object.fromEntries(ROLES.map((r) => [r, fix(byRole[r])])),
    };
  }
  return out;
}

/* ── ETF overlap ─────────────────────────────────────────────────────── */

const CUSIP_RE = /^[0-9A-Z]{9}$/;
const ISIN_RE = /^[A-Z]{2}[0-9A-Z]{10}$/;

/**
 * One id for a security across funds: the CUSIP (also read out of a US or
 * Canadian ISIN), else the ISIN, else the ticker, else the name. All-zero
 * CUSIPs (cash, derivatives) are not ids.
 */
export function holdingKey(h) {
  const cusip = String(h?.cusip || '')
    .trim()
    .toUpperCase();
  if (CUSIP_RE.test(cusip) && !/^0+$/.test(cusip)) return `C:${cusip}`;
  const isin = String(h?.isin || '')
    .trim()
    .toUpperCase();
  if (ISIN_RE.test(isin)) {
    if (/^(US|CA)/.test(isin) && !/^0+$/.test(isin.slice(2, 11))) return `C:${isin.slice(2, 11)}`;
    return `I:${isin}`;
  }
  const ticker = String(h?.ticker || '')
    .trim()
    .toUpperCase();
  if (ticker) return `T:${ticker}`;
  const name = String(h?.name || '')
    .trim()
    .toUpperCase();
  return name ? `N:${name}` : null;
}

function weightsOf(holdings) {
  const m = new Map();
  for (const h of holdings || []) {
    const key = holdingKey(h);
    const w = n(h.weight);
    if (!key || w == null || w <= 0) continue;
    const cur = m.get(key) || { weight: 0, ticker: null, name: null };
    cur.weight += w;
    cur.ticker = cur.ticker || (h.ticker ? String(h.ticker).toUpperCase() : null);
    cur.name = cur.name || h.name || null;
    m.set(key, cur);
  }
  return m;
}

/**
 * Weight overlap between two funds: the sum over shared securities of
 * min(weight in a, weight in b). Weights are percent of net assets, so the
 * overlap is a percent from 0 (nothing shared) to 100 (identical books).
 * holdings: { cusip, isin, ticker, name, weight }
 */
export function etfOverlap(a, b, { top = 10 } = {}) {
  const wa = weightsOf(a);
  const wb = weightsOf(b);
  const shared = [];
  let overlap = 0;
  for (const [key, x] of wa) {
    const y = wb.get(key);
    if (!y) continue;
    const m = Math.min(x.weight, y.weight);
    overlap += m;
    shared.push({
      ticker: x.ticker || y.ticker,
      name: x.name || y.name,
      weight_a: round(x.weight, 4),
      weight_b: round(y.weight, 4),
      overlap: round(m, 4),
    });
  }
  shared.sort((p, q) => q.overlap - p.overlap || String(p.name).localeCompare(String(q.name)));
  return {
    overlap_pct: round(overlap, 2),
    shared_holdings: shared.length,
    holdings_a: wa.size,
    holdings_b: wb.size,
    top_shared: shared.slice(0, top),
  };
}

/* ── executive compensation ──────────────────────────────────────────── */

/* A row names a CEO when it carries a CEO pay figure; the other rows of a
   year (peer-NEO averages filed under their own member) do not. */
const isCeoRow = (r) => n(r.peo_total_comp) != null || n(r.peo_comp_actually_paid) != null;

/**
 * Group raw pay-versus-performance rows (one per company, fiscal year and
 * CEO) into one row per company and year. When a year has more than one CEO
 * the single-CEO figures are null and every CEO is listed in `ceos`.
 */
export function execCompYears(rows) {
  const groups = new Map();
  for (const r of rows || []) {
    const k = `${r.cik}|${r.fiscal_year}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const out = [];
  for (const g of groups.values()) {
    const first = g[0];
    const ceos = g.filter(isCeoRow).map((r) => ({
      name: r.peo_name || null,
      total_comp: n(r.peo_total_comp),
      comp_actually_paid: n(r.peo_comp_actually_paid),
    }));
    const pick = (f) => {
      for (const r of g) if (n(r[f]) != null) return n(r[f]);
      return null;
    };
    const measure = g.find((r) => r.company_selected_measure_name) || {};
    out.push({
      cik: String(first.cik),
      ticker: first.ticker ? String(first.ticker).toUpperCase() : null,
      company: first.entity_name || null,
      fiscal_year: Number(first.fiscal_year),
      ceo_total_comp: ceos.length === 1 ? ceos[0].total_comp : null,
      ceo_comp_actually_paid: ceos.length === 1 ? ceos[0].comp_actually_paid : null,
      ceos,
      other_neo_avg_total_comp: pick('non_peo_neo_avg_total_comp'),
      other_neo_avg_comp_actually_paid: pick('non_peo_neo_avg_comp_actually_paid'),
      company_tsr: pick('company_tsr'),
      peer_group_tsr: pick('peer_group_tsr'),
      net_income: pick('net_income'),
      company_selected_measure: measure.company_selected_measure_name
        ? {
            name: measure.company_selected_measure_name,
            value: n(measure.company_selected_measure_value),
          }
        : null,
      filed_at:
        g
          .map((r) => r.filed_at)
          .filter(Boolean)
          .sort()
          .pop()
          ?.slice(0, 10) || null,
    });
  }
  return out;
}

export const PVP_SORTS = ['gap', 'cap_growth', 'tsr'];
export const PVP_DIRECTIONS = ['up', 'down'];

/**
 * CEO pay growth against shareholder return, per company, over the most
 * recent run of consecutive fiscal years (at least `minYears`) that each have
 * exactly one CEO, a compensation-actually-paid figure and a TSR. Only the
 * company's latest filing is read, since TSR is the value of $100 invested
 * at that filing's base date and is not comparable across filings.
 *
 *   cap_growth_pct  CEO compensation actually paid, last year vs first, in %
 *   tsr_change_pct  growth of the $100 investment over the same years, in %
 *   gap             cap_growth_pct - tsr_change_pct, in percentage points
 *
 * direction 'up' keeps gap > 0 (pay outgrew shareholder return), 'down' keeps
 * gap < 0. sort 'gap' ranks by the size of the gap; 'cap_growth' and 'tsr'
 * rank by that measure, highest first. Companies whose first-year pay is zero
 * or negative are left out (a growth rate needs a positive base).
 */
export function payVsPerformance(
  rows,
  { sort = 'gap', direction = 'up', limit = 50, minYears = 3 } = {},
) {
  const byCik = new Map();
  for (const r of rows || []) {
    const k = String(r.cik);
    if (!byCik.has(k)) byCik.set(k, []);
    byCik.get(k).push(r);
  }
  const out = [];
  for (const list of byCik.values()) {
    /* the latest filing only */
    const latest = list.reduce((best, r) =>
      `${r.filed_at || ''}|${r.accession_no || ''}` >
      `${best.filed_at || ''}|${best.accession_no || ''}`
        ? r
        : best,
    );
    const years = execCompYears(list.filter((r) => r.accession_no === latest.accession_no))
      .filter(
        (y) =>
          y.ceos.length === 1 &&
          y.ceo_comp_actually_paid != null &&
          y.company_tsr != null &&
          y.company_tsr > 0,
      )
      .sort((a, b) => a.fiscal_year - b.fiscal_year);
    if (!years.length) continue;
    /* the trailing run of consecutive years */
    let start = years.length - 1;
    while (start > 0 && years[start - 1].fiscal_year === years[start].fiscal_year - 1) start -= 1;
    const run = years.slice(start);
    if (run.length < minYears) continue;
    const a = run[0];
    const z = run[run.length - 1];
    if (!(a.ceo_comp_actually_paid > 0)) continue;
    const capGrowth = (z.ceo_comp_actually_paid / a.ceo_comp_actually_paid - 1) * 100;
    const tsrChange = (z.company_tsr / a.company_tsr - 1) * 100;
    const peerChange =
      a.peer_group_tsr > 0 && z.peer_group_tsr != null
        ? (z.peer_group_tsr / a.peer_group_tsr - 1) * 100
        : null;
    out.push({
      cik: a.cik,
      ticker: z.ticker,
      company: z.company,
      from_year: a.fiscal_year,
      to_year: z.fiscal_year,
      years: run.length,
      ceo_cap_first: a.ceo_comp_actually_paid,
      ceo_cap_last: z.ceo_comp_actually_paid,
      cap_growth_pct: round(capGrowth),
      tsr_first: a.company_tsr,
      tsr_last: z.company_tsr,
      tsr_change_pct: round(tsrChange),
      peer_tsr_change_pct: round(peerChange),
      gap: round(capGrowth - tsrChange),
    });
  }
  const kept = out.filter((r) => (direction === 'down' ? r.gap < 0 : r.gap > 0));
  const measure =
    {
      gap: (r) => Math.abs(r.gap),
      cap_growth: (r) => r.cap_growth_pct,
      tsr: (r) => r.tsr_change_pct,
    }[sort] || ((r) => Math.abs(r.gap));
  kept.sort((p, q) => measure(q) - measure(p) || String(p.ticker).localeCompare(String(q.ticker)));
  return kept.slice(0, limit);
}

/** Latest of a list of ISO dates/timestamps, as YYYY-MM-DD, or null. */
export function latestDay(values) {
  let best = null;
  for (const v of values || []) if (v && (!best || String(v) > String(best))) best = String(v);
  return best ? best.slice(0, 10) : null;
}
