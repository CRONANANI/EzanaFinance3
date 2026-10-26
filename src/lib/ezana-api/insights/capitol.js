/**
 * Pure maths for the Capitol Watch insight endpoints (no server imports, so
 * scripts/check-ezana-api-capitol.mjs can test it directly).
 */

const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? 0 : Number(v));
const round = (v, dp = 1) => (v == null ? null : Math.round(v * 10 ** dp) / 10 ** dp);
const byKey =
  (k, dir = -1) =>
  (a, b) => {
    const x = a[k];
    const y = b[k];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return dir * (x - y);
  };

/* ── Politician Tracker ─────────────────────────────────────────────── */

/** Days between trade and disclosure, or null. */
export function lagDays(traded, disclosed) {
  if (!traded || !disclosed) return null;
  const d = Math.round((Date.parse(disclosed) - Date.parse(traded)) / 86400000);
  return Number.isFinite(d) ? d : null;
}

/** Average disclosure lag (days, 1 dp) per member from raw trade rows. */
export function lagByMember(rows) {
  const acc = new Map();
  for (const r of rows || []) {
    const lag = lagDays(r.transaction_date, r.disclosure_date);
    if (lag == null || lag < 0 || !r.bioguide_id) continue;
    const a = acc.get(r.bioguide_id) || { sum: 0, k: 0 };
    a.sum += lag;
    a.k += 1;
    acc.set(r.bioguide_id, a);
  }
  return new Map([...acc].map(([id, a]) => [id, round(a.sum / a.k)]));
}

export const RANK_SORTS = ['volume', 'trades', 'buys', 'sells', 'lag'];
const RANK_FIELD = {
  volume: 'est_volume',
  trades: 'trades',
  buys: 'buys',
  sells: 'sells',
  lag: 'avg_disclosure_lag_days',
};

/** Members ranked by one activity measure, highest first; ties by volume, then name. */
export function rankMembers(rows, sort = 'volume') {
  const k = RANK_FIELD[sort] || RANK_FIELD.volume;
  return [...rows]
    .sort(
      (a, b) =>
        byKey(k)(a, b) ||
        byKey('est_volume')(a, b) ||
        String(a.name || '').localeCompare(String(b.name || '')),
    )
    .map((r, i) => ({ rank: i + 1, ...r }));
}

/**
 * Flow score from -100 to +100: half member breadth (buyers vs sellers),
 * half dollar flow (estimated buy vs sell dollars), each scaled to +-50.
 * Mirrors the database function so the method text can be tested.
 */
export function flowScore({ buyers = 0, sellers = 0, buyUsd = 0, sellUsd = 0 }) {
  const breadth = (buyers - sellers) / Math.max(buyers + sellers, 1);
  const dollars = buyUsd + sellUsd > 0 ? (buyUsd - sellUsd) / (buyUsd + sellUsd) : 0;
  return round(breadth * 50 + dollars * 50);
}

/** Group labels for the portfolio comparison. */
export const COMPARE_GROUPS = {
  party: { a: 'Democrats', b: 'Republicans' },
  chamber: { a: 'House', b: 'Senate' },
};

/**
 * Sector tilts between two groups from per-ticker rows { sector, a, b,
 * aHigh, bHigh } (a and b are counts of member positions). Each side's share
 * of its own positions per sector, and the tilt (a share minus b share, in
 * percentage points). Sorted by the size of the tilt.
 */
export function sectorTilts(rows) {
  const per = new Map();
  let ta = 0;
  let tb = 0;
  for (const r of rows || []) {
    const s = r.sector || 'Unclassified';
    const x = per.get(s) || { sector: s, a: 0, b: 0, aHigh: 0, bHigh: 0, tickers: 0 };
    x.a += n(r.a);
    x.b += n(r.b);
    x.aHigh += n(r.aHigh);
    x.bHigh += n(r.bHigh);
    x.tickers += 1;
    per.set(s, x);
    ta += n(r.a);
    tb += n(r.b);
  }
  return [...per.values()]
    .map((x) => {
      const aShare = ta ? (100 * x.a) / ta : 0;
      const bShare = tb ? (100 * x.b) / tb : 0;
      return {
        sector: x.sector,
        tickers: x.tickers,
        a_positions: x.a,
        b_positions: x.b,
        a_share_pct: round(aShare),
        b_share_pct: round(bShare),
        tilt_pts: round(aShare - bShare),
        a_est_high: x.aHigh,
        b_est_high: x.bHigh,
      };
    })
    .sort(
      (p, q) => Math.abs(q.tilt_pts) - Math.abs(p.tilt_pts) || p.sector.localeCompare(q.sector),
    );
}

/** Sector mix from the same per-ticker rows, both groups together. */
export function sectorMix(rows, side = 'both') {
  const per = new Map();
  let total = 0;
  for (const r of rows || []) {
    const pos = side === 'a' ? n(r.a) : side === 'b' ? n(r.b) : n(r.a) + n(r.b);
    const high = side === 'a' ? n(r.aHigh) : side === 'b' ? n(r.bHigh) : n(r.aHigh) + n(r.bHigh);
    if (!pos) continue;
    const s = r.sector || 'Unclassified';
    const x = per.get(s) || { sector: s, positions: 0, tickers: 0, est_high: 0 };
    x.positions += pos;
    x.tickers += 1;
    x.est_high += high;
    per.set(s, x);
    total += pos;
  }
  return [...per.values()]
    .map((x) => ({ ...x, share_pct: total ? round((100 * x.positions) / total) : null }))
    .sort((a, b) => b.positions - a.positions || a.sector.localeCompare(b.sector));
}

/** Per-state rollup of per-member rows. */
export function stateRollup(rows, topMembers = 5) {
  const per = new Map();
  for (const r of rows || []) {
    if (!r.state) continue;
    const x = per.get(r.state) || {
      state: r.state,
      members: 0,
      trades: 0,
      buys: 0,
      sells: 0,
      est_volume: 0,
      last_trade: null,
      list: [],
    };
    x.members += 1;
    x.trades += n(r.trades);
    x.buys += n(r.buys);
    x.sells += n(r.sells);
    x.est_volume += n(r.volume);
    if (r.last_trade && (!x.last_trade || r.last_trade > x.last_trade)) x.last_trade = r.last_trade;
    x.list.push(r);
    per.set(r.state, x);
  }
  return [...per.values()]
    .map(({ list, ...x }) => ({
      ...x,
      top_members: list
        .sort((a, b) => n(b.volume) - n(a.volume) || n(b.trades) - n(a.trades))
        .slice(0, topMembers)
        .map((m) => ({
          bioguide_id: m.bioguide_id,
          name: m.member_name,
          party: m.party,
          chamber: m.chamber,
          trades: n(m.trades),
          est_volume: n(m.volume),
          last_trade: m.last_trade || null,
        })),
    }))
    .sort((a, b) => b.est_volume - a.est_volume || a.state.localeCompare(b.state));
}

/**
 * The tickers to profile for one committee (the stats function takes at most
 * 50 committee-ticker pairs): those held or traded by the most of its
 * members, held first.
 */
export function topCommitteeTickers(holdersByTicker, tradersByTicker, max = 50) {
  const all = new Set([...holdersByTicker.keys(), ...tradersByTicker.keys()]);
  return [...all]
    .map((t) => ({
      t,
      h: holdersByTicker.get(t)?.size || 0,
      x: tradersByTicker.get(t)?.size || 0,
    }))
    .sort((a, b) => b.h - a.h || b.x - a.x || a.t.localeCompare(b.t))
    .slice(0, max)
    .map((r) => r.t);
}

/* ── Campaign finance ───────────────────────────────────────────────── */

export const FEC_SORTS = ['receipts', 'cash_on_hand', 'burn_rate', 'outside_tilt'];
/* Floors so tiny bases don't top a ratio ranking. */
export const BURN_MIN_RECEIPTS = 10_000;
export const TILT_MIN_OUTSIDE = 10_000;

/** Disbursements / receipts, or null when receipts are not positive. */
export function burnRate(disbursements, receipts) {
  const r = n(receipts);
  return r > 0 ? Math.round((n(disbursements) / r) * 1000) / 1000 : null;
}

/** (support - oppose) / (support + oppose), from -1 to 1, or null with no outside money. */
export function outsideTilt(support, oppose) {
  const s = n(support);
  const o = n(oppose);
  return s + o > 0 ? Math.round(((s - o) / (s + o)) * 1000) / 1000 : null;
}

/**
 * Leaderboard rows ranked by one measure, highest first. Ratio sorts drop
 * candidates under their floor (receipts for burn rate, outside money for
 * the tilt).
 */
export function fecLeaderboard(rows, sort = 'receipts') {
  const k = FEC_SORTS.includes(sort) ? sort : 'receipts';
  return rows
    .filter((r) => {
      if (k === 'burn_rate') return r.burn_rate != null && n(r.receipts) >= BURN_MIN_RECEIPTS;
      if (k === 'outside_tilt')
        return (
          r.outside_tilt != null && n(r.outside_support) + n(r.outside_oppose) >= TILT_MIN_OUTSIDE
        );
      return r[k] != null;
    })
    .sort((a, b) => n(b[k]) - n(a[k]) || n(b.receipts) - n(a.receipts) || cmpId(a, b))
    .map((r, i) => ({ rank: i + 1, ...r }));
}
const cmpId = (a, b) => String(a.candidate_id || '').localeCompare(String(b.candidate_id || ''));

/* ── Lobbying ───────────────────────────────────────────────────────── */

/**
 * Issue shares for a period and the change against a prior period, from
 * rows { issue, filings, total_filings } (top issues per period).
 */
export function issueMixChange(current, prior) {
  const tot = (rows) => n(rows?.[0]?.total_filings);
  const ct = tot(current);
  const pt = tot(prior);
  const prev = new Map((prior || []).map((r) => [r.issue, n(r.filings)]));
  return (current || []).map((r) => {
    const share = ct ? (100 * n(r.filings)) / ct : null;
    const pf = prev.get(r.issue);
    const pshare = pt && pf != null ? (100 * pf) / pt : null;
    return {
      issue: r.issue,
      filings: n(r.filings),
      share_pct: round(share),
      prior_filings: pf ?? null,
      prior_share_pct: round(pshare),
      change_pts: share != null && pshare != null ? round(share - pshare) : null,
    };
  });
}

/** Issue codes counted across filings (each filing counts an issue once). */
export function issueCounts(filings, top = 15) {
  const c = new Map();
  for (const f of filings || []) {
    const seen = new Set();
    for (const i of Array.isArray(f.issues) ? f.issues : []) {
      const code = i?.code || null;
      if (!code || seen.has(code)) continue;
      seen.add(code);
      const x = c.get(code) || { code, name: i.display || code, filings: 0 };
      x.filings += 1;
      c.set(code, x);
    }
  }
  return [...c.values()]
    .sort((a, b) => b.filings - a.filings || a.code.localeCompare(b.code))
    .slice(0, top);
}

/** Spend by year (and quarter within it) from filings. */
export function spendByPeriod(filings) {
  const years = new Map();
  for (const f of filings || []) {
    if (!f.filing_year) continue;
    const y = years.get(f.filing_year) || { year: f.filing_year, amount: 0, filings: 0, q: {} };
    y.amount += n(f.amount);
    y.filings += 1;
    const q = f.quarter || null;
    if (q) y.q[q] = (y.q[q] || 0) + n(f.amount);
    years.set(f.filing_year, y);
  }
  return [...years.values()]
    .sort((a, b) => b.year - a.year)
    .map((y) => ({
      year: y.year,
      amount: y.amount,
      filings: y.filings,
      quarters: ['q1', 'q2', 'q3', 'q4']
        .filter((k) => k in y.q)
        .map((k) => ({ quarter: k.toUpperCase(), amount: y.q[k] })),
    }));
}

/** A registrant's client book: clients by reported spend. */
export function clientBook(filings, top = 50) {
  const per = new Map();
  for (const f of filings || []) {
    const id = f.client_id;
    if (id == null) continue;
    const x = per.get(id) || {
      client_id: id,
      client: f.client_name,
      amount: 0,
      filings: 0,
      first_year: f.filing_year,
      last_year: f.filing_year,
    };
    x.amount += n(f.amount);
    x.filings += 1;
    if (f.filing_year < x.first_year) x.first_year = f.filing_year;
    if (f.filing_year > x.last_year) x.last_year = f.filing_year;
    per.set(id, x);
  }
  return [...per.values()]
    .sort((a, b) => b.amount - a.amount || b.filings - a.filings || a.client_id - b.client_id)
    .slice(0, top);
}

/** Distinct lobbyists named across filings. */
export function distinctLobbyists(filings) {
  const ids = new Set();
  for (const f of filings || [])
    for (const l of Array.isArray(f.lobbyists) ? f.lobbyists : [])
      ids.add(l?.id ?? l?.name ?? null);
  ids.delete(null);
  return ids.size;
}

/** Award dollars per lobbying dollar, or null without lobbying spend. */
export function awardsPerLobbyingDollar(awardUsd, lobbyingUsd) {
  const l = n(lobbyingUsd);
  return l > 0 ? Math.round((n(awardUsd) / l) * 10) / 10 : null;
}

/* ── Government contracts ───────────────────────────────────────────── */

/** Federal fiscal year of an ISO date (FY y runs Oct 1 of y-1 to Sep 30 of y). */
export function fiscalYearOf(iso) {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
}

/** The newest fiscal year that had ended (Sep 30) on or before `asOf`. */
export function latestCompleteFiscalYear(asOf) {
  const d = String(asOf).slice(0, 10);
  const fy = fiscalYearOf(d);
  return d >= `${fy}-09-30` ? fy : fy - 1;
}

/* A ticker needs at least this much in the prior year to be ranked, so a
   small base can't produce a +900% change. */
export const MOMENTUM_MIN_PRIOR_USD = 1_000_000;

/**
 * Award momentum per ticker from rows { ticker, fiscal_year,
 * awarding_agency, total_amount, award_count }: the latest year against the
 * year before, the change in dollars and %, and the latest year's top agency.
 * Tickers whose prior year is under `minPrior` are left out.
 */
export function awardMomentum(rows, year, { minPrior = MOMENTUM_MIN_PRIOR_USD } = {}) {
  const per = new Map();
  for (const r of rows || []) {
    const fy = Number(r.fiscal_year);
    if (fy !== year && fy !== year - 1) continue;
    const t = String(r.ticker || '').toUpperCase();
    if (!t) continue;
    const x = per.get(t) || { ticker: t, latest: 0, prior: 0, awards: 0, agencies: new Map() };
    if (fy === year) {
      x.latest += n(r.total_amount);
      x.awards += n(r.award_count);
      const a = r.awarding_agency || 'Unknown';
      x.agencies.set(a, (x.agencies.get(a) || 0) + n(r.total_amount));
    } else {
      x.prior += n(r.total_amount);
    }
    per.set(t, x);
  }
  return [...per.values()]
    .filter((x) => x.prior >= minPrior)
    .map((x) => {
      const top = [...x.agencies].sort((a, b) => b[1] - a[1])[0] || null;
      const change = x.latest - x.prior;
      return {
        ticker: x.ticker,
        fiscal_year: year,
        latest_usd: Math.round(x.latest),
        prior_usd: Math.round(x.prior),
        change_usd: Math.round(change),
        change_pct: round((100 * change) / x.prior),
        awards: x.awards,
        top_agency: top ? top[0] : null,
        top_agency_usd: top ? Math.round(top[1]) : null,
      };
    });
}

export const MOMENTUM_SORTS = ['change_pct', 'change_usd', 'latest_usd'];

/** Sort momentum rows: direction up (largest first) or down (largest falls first). */
export function sortMomentum(rows, sort = 'change_pct', direction = 'up') {
  const k = MOMENTUM_SORTS.includes(sort) ? sort : 'change_pct';
  const s = direction === 'down' && k !== 'latest_usd' ? 1 : -1;
  return [...rows].sort((a, b) => s * (a[k] - b[k]) || a.ticker.localeCompare(b.ticker));
}
