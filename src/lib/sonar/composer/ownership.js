/**
 * Sonar: institutional ownership of a universe of securities (Nov 27 2026). Pure, client-safe.
 *
 * The capability behind "which of Nancy Pelosi's stocks are most owned by investment firms?"
 * and any question shaped like it ("which of this fund's holdings are most widely held",
 * "rank my watchlist by institutional ownership"). It is not tied to one person: the universe
 * is any list of securities (a member's estimated disclosed holdings, a manager's 13F book).
 *
 * The server half (./ownership-server.js) reads the data; everything here is deterministic
 * and tested by scripts/check-sonar-ownership.mjs:
 *
 *   quarterDeadlinePassed(period, today)   13F filing deadline (45 days) is behind us
 *   selectCoveredPeriod(coverage, today)   the latest quarter whose filings are adequately
 *                                          loaded, not merely the latest calendar quarter
 *   normalizeUniverse(holdings, map)       tickers to CUSIPs, common equity only, with every
 *                                          exclusion kept and labelled
 *   aggregateHoldings(input)               per-CUSIP managers, value, shares and the prior
 *                                          comparison on the comparable filer set
 *   rankOwnership(rows, metric)            deterministic ranking with stable tie-breaks
 *   ownershipStates(result)                the distinct missing-data states
 *   ownershipAnswer(result)                the direct answer and findings, computed
 *
 * Definitions (spec):
 *   managers   distinct 13F reporting CIKs that list the security in the period (common
 *              shares: share type SH, no put or call rows). Two CIKs of one parent count
 *              twice. Labelled "Distinct 13F reporting managers".
 *   value      reported 13F value summed across those CIKs, in US dollars.
 *   prior      the quarter before, compared only on filers with an effective filing in BOTH
 *              quarters, so a manager that did not file is never counted as a seller.
 *   ownership percentage needs shares outstanding for the same date. Sonar does not hold
 *   that denominator, so the percentage is null, never estimated.
 */

export const OWNERSHIP_VERSION = 'ownership-v1';
export const OWNERSHIP_CAPABILITY = 'institutional-ownership';

export const METRICS = {
  managers: { key: 'managers', label: 'Distinct 13F reporting managers', short: '13F managers' },
  value: { key: 'value', label: 'Aggregate reported 13F value', short: '13F value' },
  change: {
    key: 'change',
    label: 'Net change in reporting managers (comparable filers)',
    short: 'Change in managers',
  },
};

/** 13F reports are due 45 days after the quarter ends. */
export const FILING_LAG_DAYS = 45;
/** A quarter is adequately covered when its filers reach this share of the best recent one. */
export const COVERAGE_THRESHOLD = 0.9;
/** At or below this estimated amount a member's position is the disclosure floor ($1,001). */
export const FLOOR_ESTIMATE = 1001;

const DAY = 86_400_000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

/** Quarter-end dates, newest first, at or before `today`. */
export function quarterEnds(today = new Date(), count = 6) {
  const d = new Date(today);
  let y = d.getUTCFullYear();
  let q = Math.floor(d.getUTCMonth() / 3); // current quarter index 0..3
  const out = [];
  while (out.length < count) {
    q -= 1;
    if (q < 0) {
      q = 3;
      y -= 1;
    }
    const end = new Date(Date.UTC(y, q * 3 + 3, 0));
    out.push(iso(end));
  }
  return out;
}

export function quarterDeadlinePassed(period, today = new Date()) {
  const end = Date.parse(`${period}T00:00:00Z`);
  return Number.isFinite(end) && new Date(today).getTime() >= end + FILING_LAG_DAYS * DAY;
}

/**
 * The reporting quarter to use. `coverage` lists { period, filers } for recent periods.
 * The chosen quarter is the newest one whose filing deadline has passed and whose filer
 * count is at least COVERAGE_THRESHOLD of the best recent quarter. The prior is the quarter
 * immediately before it, when it has data.
 * Returns { period, prior, filers, priorFilers, ratio, skipped: [{period, filers, reason}] }.
 */
export function selectCoveredPeriod(coverage = [], today = new Date()) {
  const rows = (coverage || [])
    .map((r) => ({ period: String(r.period).slice(0, 10), filers: Number(r.filers) || 0 }))
    .filter((r) => r.filers > 0)
    .sort((a, b) => (a.period < b.period ? 1 : -1));
  if (!rows.length) return null;
  const best = Math.max(...rows.slice(0, 4).map((r) => r.filers));
  const skipped = [];
  let chosen = null;
  for (const r of rows) {
    if (!quarterDeadlinePassed(r.period, today)) {
      skipped.push({ ...r, reason: 'filing deadline not yet passed' });
      continue;
    }
    if (r.filers < best * COVERAGE_THRESHOLD) {
      skipped.push({ ...r, reason: 'filings not yet adequately loaded' });
      continue;
    }
    chosen = r;
    break;
  }
  if (!chosen) return { period: null, prior: null, filers: 0, priorFilers: 0, ratio: 0, skipped };
  const expectedPrior = previousQuarter(chosen.period);
  const prior = rows.find((r) => r.period === expectedPrior) || null;
  return {
    period: chosen.period,
    prior: prior?.period || null,
    filers: chosen.filers,
    priorFilers: prior?.filers || 0,
    ratio: best ? chosen.filers / best : 0,
    best,
    skipped,
  };
}

export function previousQuarter(period) {
  const [y, m] = String(period).split('-').map(Number);
  const q = Math.floor((m - 1) / 3);
  const py = q === 0 ? y - 1 : y;
  const pq = q === 0 ? 3 : q - 1;
  return iso(new Date(Date.UTC(py, pq * 3 + 3, 0)));
}

/* ── universe ───────────────────────────────────────────────────────── */

/** Renamed tickers that disclosures still carry. */
export const TICKER_ALIASES = { SQ: 'XYZ', FB: 'META', ANTM: 'ELV', RE: 'EG', PARA: 'PSKY' };

/** Security types counted as common equity (OpenFIGI security_type). */
const EQUITY_TYPES = new Set([
  'Common Stock',
  'REIT',
  'ADR',
  'Depositary Receipt',
  'NY Reg Shrs',
  'GDR',
  'MLP',
  'Ltd Part',
  'Tracking Stk',
]);
const PARTNERSHIP_TYPES = new Set(['MLP', 'Ltd Part']);

export const cleanTicker = (t) =>
  String(t || '')
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, '');

/**
 * Holdings to an eligible universe. `holdings`: [{ ticker, issuer, est?, share?, value? }].
 * `map`: { [ticker]: [{ cusip, securityType, marketSector, name }] } from the security
 * master. A ticker with more than one candidate common-equity CUSIP is ambiguous and is not
 * guessed. Returns { eligible, excluded: [{ ticker, issuer, reason }] }.
 */
export function normalizeUniverse(holdings = [], map = {}) {
  const eligible = [];
  const excluded = [];
  const seen = new Set();
  for (const h of holdings) {
    const raw = cleanTicker(h.ticker);
    if (!raw) {
      excluded.push({ ticker: null, issuer: h.issuer || null, reason: 'no ticker disclosed' });
      continue;
    }
    const ticker = TICKER_ALIASES[raw] || raw;
    const cands = (map[ticker] || []).filter(Boolean);
    if (!cands.length) {
      excluded.push({
        ticker: raw,
        issuer: h.issuer || null,
        reason: 'unmatched: no CUSIP on file',
      });
      continue;
    }
    const equity = cands.filter(
      (c) => !c.marketSector || c.marketSector === 'Equity' || EQUITY_TYPES.has(c.securityType),
    );
    const common = equity.filter((c) => !c.securityType || EQUITY_TYPES.has(c.securityType));
    if (!common.length) {
      excluded.push({
        ticker: raw,
        issuer: h.issuer || null,
        reason: `not common equity (${cands[0].securityType || 'other security'})`,
      });
      continue;
    }
    const distinct = [...new Set(common.map((c) => c.cusip))];
    if (distinct.length > 1) {
      excluded.push({
        ticker: raw,
        issuer: h.issuer || null,
        reason: 'ambiguous: more than one CUSIP for this ticker',
      });
      continue;
    }
    const c = common[0];
    if (seen.has(c.cusip)) continue;
    seen.add(c.cusip);
    eligible.push({
      cusip: c.cusip,
      ticker,
      disclosedTicker: raw !== ticker ? raw : null,
      issuer: h.issuer || c.name || ticker,
      securityType: c.securityType || null,
      partnership: PARTNERSHIP_TYPES.has(c.securityType),
      est: h.est ?? null,
      weight: h.share ?? null,
      value: h.value ?? null,
      floor: h.est != null && Number(h.est) <= FLOOR_ESTIMATE,
    });
  }
  return { eligible, excluded };
}

/* ── aggregation ────────────────────────────────────────────────────── */

/** A filer's name without the trailing list of its own securities ("MORGAN STANLEY (MS, MS-PA)"). */
export const cleanFilerName = (n) =>
  n == null
    ? null
    : String(n)
        .replace(/\s*\((?:[A-Z0-9.-]+(?:,\s*)?)+\)\s*$/, '')
        .trim() || String(n);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Per-CUSIP figures from raw holding rows (the batch read), or pass `rows` already
 * aggregated by the database function (same field names).
 *
 *   now     [{ cusip, cik, value_usd, shares }]  every row in the period's effective filings
 *   prior   [{ cusip, cik, shares }]             the prior period's rows
 *   filersNow, filersPrior   Set of CIKs with an effective filing in each period
 *   names   { [cik]: { name, book } }            for the largest holders
 *   cusips  the universe (a security nobody holds still gets a row, with zero managers)
 */
export function aggregateHoldings({
  now = [],
  prior = [],
  filersNow = new Set(),
  filersPrior = new Set(),
  names = {},
  cusips = [],
  top = 5,
}) {
  const comparable = new Set([...filersNow].filter((c) => filersPrior.has(c)));
  const cur = new Map(); // cusip -> Map(cik -> {value, shares})
  for (const r of now) {
    if (!r?.cusip || !r?.cik) continue;
    const m = cur.get(r.cusip) || new Map();
    const x = m.get(r.cik) || { value: 0, shares: 0 };
    x.value += num(r.value_usd);
    x.shares += num(r.shares);
    m.set(r.cik, x);
    cur.set(r.cusip, m);
  }
  const pri = new Map();
  for (const r of prior) {
    if (!r?.cusip || !r?.cik || !comparable.has(r.cik)) continue;
    const m = pri.get(r.cusip) || new Map();
    m.set(r.cik, (m.get(r.cik) || 0) + num(r.shares));
    pri.set(r.cusip, m);
  }
  const hasPrior = filersPrior.size > 0;
  return [...new Set(cusips)].map((cusip) => {
    const m = cur.get(cusip) || new Map();
    const p = pri.get(cusip) || new Map();
    let value = 0;
    let shares = 0;
    let comparableNow = 0;
    let newManagers = 0;
    let sharesNowCmp = 0;
    for (const [cik, x] of m) {
      value += x.value;
      shares += x.shares;
      if (comparable.has(cik)) {
        comparableNow += 1;
        sharesNowCmp += x.shares;
        if (!p.has(cik)) newManagers += 1;
      }
    }
    let exitedManagers = 0;
    let sharesPriorCmp = 0;
    for (const [cik, s] of p) {
      sharesPriorCmp += s;
      if (!m.has(cik)) exitedManagers += 1;
    }
    const holders = [...m.entries()]
      .map(([cik, x]) => ({
        cik,
        name: cleanFilerName(names[cik]?.name || null),
        value: x.value,
        shares: x.shares,
        weight: names[cik]?.book > 0 ? x.value / names[cik].book : null,
        priorShares: p.has(cik) ? p.get(cik) : null,
        comparable: comparable.has(cik),
      }))
      .sort((a, b) => b.value - a.value || (a.cik < b.cik ? -1 : 1))
      .slice(0, top);
    return {
      cusip,
      managers: m.size,
      value: m.size ? value : 0,
      shares: m.size ? shares : 0,
      comparableNow,
      comparablePrior: hasPrior ? p.size : null,
      newManagers: hasPrior ? newManagers : null,
      exitedManagers: hasPrior ? exitedManagers : null,
      sharesNowCmp: hasPrior ? sharesNowCmp : null,
      sharesPriorCmp: hasPrior ? sharesPriorCmp : null,
      top: holders,
    };
  });
}

/** The database function's rows, in aggregateHoldings' shape. */
export function fromDatabaseRows(rows = [], { hasPrior = true } = {}) {
  return rows.map((r) => ({
    cusip: r.cusip,
    managers: num(r.managers),
    value: num(r.value_usd),
    shares: num(r.shares),
    comparableNow: num(r.comparable_now),
    comparablePrior: hasPrior ? num(r.comparable_prior) : null,
    newManagers: hasPrior ? num(r.new_managers) : null,
    exitedManagers: hasPrior ? num(r.exited_managers) : null,
    sharesNowCmp: hasPrior ? num(r.shares_now_cmp) : null,
    sharesPriorCmp: hasPrior ? num(r.shares_prior_cmp) : null,
    top: (r.top || []).map((t) => ({
      cik: t.cik,
      name: cleanFilerName(t.filer_name || null),
      value: num(t.value_usd),
      shares: num(t.shares),
      weight: t.weight == null ? null : Number(t.weight),
      priorShares: t.prior_shares == null ? null : Number(t.prior_shares),
      comparable: Boolean(t.comparable),
    })),
  }));
}

/* ── ranking ────────────────────────────────────────────────────────── */

const changeOf = (r) => (r.comparablePrior == null ? null : r.comparableNow - r.comparablePrior);

/**
 * Deterministic order. managers: count, then aggregate value, then CUSIP. value: aggregate
 * value, then count, then CUSIP. change: net change among comparable filers, then count,
 * then CUSIP (rows with no prior sort last). Rank is 1-based; a security nobody reports is
 * listed after the ranked ones, unranked.
 */
export function rankOwnership(rows = [], metric = 'managers') {
  const key = METRICS[metric] ? metric : 'managers';
  const cmp = (a, b) => {
    if (key === 'value') return b.value - a.value || b.managers - a.managers || tie(a, b);
    if (key === 'change') {
      const ca = changeOf(a);
      const cb = changeOf(b);
      if (ca == null && cb != null) return 1;
      if (cb == null && ca != null) return -1;
      return (cb ?? 0) - (ca ?? 0) || b.managers - a.managers || tie(a, b);
    }
    return b.managers - a.managers || b.value - a.value || tie(a, b);
  };
  const held = rows.filter((r) => r.managers > 0).sort(cmp);
  const none = rows.filter((r) => !(r.managers > 0)).sort(tie);
  return [
    ...held.map((r, i) => ({ ...r, rank: i + 1, change: changeOf(r) })),
    ...none.map((r) => ({ ...r, rank: null, change: changeOf(r) })),
  ];
}
const tie = (a, b) => (a.cusip < b.cusip ? -1 : a.cusip > b.cusip ? 1 : 0);

/* ── states ─────────────────────────────────────────────────────────── */

/**
 * The distinct states the report keeps apart (spec): unmatched securities, securities no
 * filer reports, a quarter with partial coverage, an unavailable prior, and a failed read.
 */
export function ownershipStates(r) {
  const states = [];
  if (!r) return [{ key: 'failed', label: 'The ownership read failed.' }];
  if (r.failed) states.push({ key: 'failed', label: r.failed });
  const unmatched = (r.excluded || []).filter((x) => /^unmatched|^ambiguous/.test(x.reason));
  if (unmatched.length)
    states.push({
      key: 'unmatched',
      label: `${unmatched.length} holding${unmatched.length === 1 ? '' : 's'} could not be matched to a security identifier: ${unmatched.map((x) => x.ticker).join(', ')}.`,
    });
  const zero = (r.rows || []).filter((x) => !(x.managers > 0));
  if (zero.length)
    states.push({
      key: 'zero_holders',
      label: `${zero.length} matched securit${zero.length === 1 ? 'y has' : 'ies have'} no reporting manager in ${r.period}: ${zero.map((x) => x.ticker).join(', ')}.`,
    });
  if (r.coverage && r.coverage.ratio < 1)
    states.push({
      key: 'partial_coverage',
      label: `${r.coverage.filers.toLocaleString('en-US')} filers are loaded for ${r.period}, ${Math.round(r.coverage.ratio * 100)}% of the best recent quarter.`,
    });
  if (!r.prior)
    states.push({
      key: 'prior_unavailable',
      label: 'The prior quarter is not available, so no quarter-over-quarter change is shown.',
    });
  return states;
}

/* ── formatting and the computed answer ─────────────────────────────── */

export const fmtUsd = (v) => {
  if (v == null || !Number.isFinite(v)) return 'N/A';
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(0)}K`;
  return `${s}$${Math.round(a)}`;
};
export const fmtInt = (v) =>
  v == null || !Number.isFinite(v) ? 'N/A' : Math.round(v).toLocaleString('en-US');
export const fmtSigned = (v) =>
  v == null || !Number.isFinite(v) ? 'N/A' : `${v > 0 ? '+' : ''}${fmtInt(v)}`;
export const fmtPct = (v, d = 1) =>
  v == null || !Number.isFinite(v) ? 'N/A' : `${(v * 100).toFixed(d)}%`;
export const quarterLabel = (period) => {
  if (!period) return 'N/A';
  const [y, m] = String(period).split('-').map(Number);
  return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
};
const nameOf = (r) => `${r.issuer || r.ticker}${r.ticker ? ` (${r.ticker})` : ''}`;
const listNames = (rows) =>
  rows.length <= 2
    ? rows.map(nameOf).join(' and ')
    : `${rows.slice(0, -1).map(nameOf).join(', ')} and ${nameOf(rows[rows.length - 1])}`;

/**
 * The direct answer and findings, computed from the result alone. Findings only: breadth is
 * not conviction, value changes are not flows, and a disclosure is not a trade date.
 */
export function ownershipAnswer(r) {
  if (!r || r.failed || !r.rows?.length) {
    return {
      text: r?.failed
        ? `The institutional ownership ranking did not complete: ${r.failed}`
        : 'No eligible securities were found to rank, so no ownership ranking is shown.',
      findings: [],
    };
  }
  const ranked = r.rows.filter((x) => x.rank != null);
  const metric = METRICS[r.metric] || METRICS.managers;
  const lead = ranked.slice(0, 3);
  const q = quarterLabel(r.period);
  const who = r.subject?.name ? `${r.subject.name}'s` : 'the';
  let text;
  if (!lead.length) {
    text = `None of ${who} ${r.universe.eligible} matched securities is reported by a 13F manager in ${q}.`;
  } else if (r.metric === 'value') {
    text = `By aggregate reported 13F value in ${q}, ${who} most institutionally held stocks are ${listNames(lead)}, led by ${nameOf(lead[0])} at ${fmtUsd(lead[0].value)} across ${fmtInt(lead[0].managers)} reporting managers.`;
  } else if (r.metric === 'change') {
    text = `Among ${who} stocks, ${nameOf(lead[0])} added the most 13F reporting managers from ${quarterLabel(r.prior)} to ${q} (${fmtSigned(lead[0].change)} among filers that reported in both quarters).`;
  } else {
    text = `${nameOf(lead[0])} is the most widely held of ${who} stocks among 13F filers, reported by ${fmtInt(lead[0].managers)} distinct managers in ${q}${
      lead[1]
        ? `, followed by ${listNames(lead.slice(1))} (${lead
            .slice(1)
            .map((x) => fmtInt(x.managers))
            .join(' and ')})`
        : ''
    }.`;
  }
  const findings = [];
  const add = (title, explanation, tickers = []) => findings.push({ title, explanation, tickers });

  /* Material positions: breadth among the member's larger estimated positions. */
  const material = ranked.filter((x) => !x.floor && x.weight != null);
  const floors = ranked.filter((x) => x.floor);
  if (floors.length && lead.some((x) => x.floor)) {
    const byWeight = [...material].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 5);
    const widest = [...byWeight].sort((a, b) => b.managers - a.managers || b.value - a.value)[0];
    add(
      'Residual positions rank high',
      `${listNames(floors.filter((x) => lead.includes(x)))} ${lead.filter((x) => x.floor).length === 1 ? 'is' : 'are'} estimated at the $1,001 disclosure floor, so ${lead.filter((x) => x.floor).length === 1 ? 'it carries' : 'they carry'} almost no weight in the estimated portfolio.${widest ? ` Among the five largest estimated positions, ${nameOf(widest)} is the most widely held (${fmtInt(widest.managers)} managers, estimated weight ${fmtPct(widest.weight)}).` : ''}`,
      [...floors.map((x) => x.ticker), widest?.ticker].filter(Boolean),
    );
  }
  if (ranked.length >= 2 && r.metric !== 'value') {
    const byValue = [...ranked].sort((a, b) => b.value - a.value || tie(a, b))[0];
    if (byValue.cusip !== ranked[0].cusip)
      add(
        'Breadth and dollars differ',
        `${nameOf(ranked[0])} has the most reporting managers, but ${nameOf(byValue)} has the largest aggregate reported value (${fmtUsd(byValue.value)} across ${fmtInt(byValue.managers)} managers). Reported value moves with the share price as well as with positions.`,
        [ranked[0].ticker, byValue.ticker],
      );
  }
  if (r.prior) {
    const moved = ranked.filter((x) => x.change != null);
    const up = [...moved].sort((a, b) => b.change - a.change || tie(a, b))[0];
    const down = [...moved].sort((a, b) => a.change - b.change || tie(a, b))[0];
    if (up && up.change > 0)
      add(
        'Largest gain in managers',
        `${nameOf(up)}: ${fmtInt(up.newManagers)} comparable filers started reporting it and ${fmtInt(up.exitedManagers)} stopped, a net ${fmtSigned(up.change)} from ${quarterLabel(r.prior)} to ${q}.`,
        [up.ticker],
      );
    if (down && down.change < 0 && down.cusip !== up?.cusip)
      add(
        'Largest decline in managers',
        `${nameOf(down)}: ${fmtInt(down.exitedManagers)} comparable filers stopped reporting it and ${fmtInt(down.newManagers)} started, a net ${fmtSigned(down.change)} over the same quarter.`,
        [down.ticker],
      );
  }
  const narrow = ranked[ranked.length - 1];
  if (ranked.length >= 4 && narrow)
    add(
      'Narrowest institutional base',
      `${nameOf(narrow)} is reported by ${fmtInt(narrow.managers)} managers in ${q}, the fewest of the ranked holdings.`,
      [narrow.ticker],
    );
  return { text, findings: findings.slice(0, 5), metricLabel: metric.label };
}

/** Plain text for Sonar's writer and evidence pool (every figure computed above). */
export function ownershipText(r) {
  if (!r) return '';
  const ans = ownershipAnswer(r);
  const q = quarterLabel(r.period);
  const head = [
    'Institutional Ownership Analysis (calculated from SEC Form 13F filings; findings, not advice).',
    `Universe: ${r.universe.source}. ${r.universe.eligible} eligible common equities of ${r.universe.total} disclosed holdings; ${r.universe.excluded} excluded.`,
    `Reporting quarter: ${q} (period ${r.period}), ${fmtInt(r.coverage?.filers)} filers with an effective filing${r.prior ? `; compared with ${quarterLabel(r.prior)} on ${fmtInt(r.coverage?.comparable)} filers that reported in both quarters` : '; prior quarter unavailable'}.`,
    `Ranked by: ${METRICS[r.metric]?.label || METRICS.managers.label}.`,
    `Answer: ${ans.text}`,
    '',
    `| Rank | Stock | Est. weight | 13F managers | 13F value | Managers Q/Q (comparable) |`,
    '|---|---|---|---|---|---|',
    ...r.rows.map(
      (x) =>
        `| ${x.rank ?? 'not held'} | ${nameOf(x)} | ${x.weight != null ? fmtPct(x.weight) : 'N/A'}${x.floor ? ' (floor)' : ''} | ${fmtInt(x.managers)} | ${fmtUsd(x.value)} | ${x.change == null ? 'N/A' : fmtSigned(x.change)} |`,
    ),
    '',
    ...ans.findings.map((f) => `Finding: ${f.title}. ${f.explanation}`),
    ...ownershipStates(r).map((s) => `Data state: ${s.label}`),
    ...(r.limitations || []).map((l) => `Limitation: ${l}`),
  ];
  return head.join('\n');
}

export const OWNERSHIP_LIMITATIONS = [
  'A count of reporting managers measures how widely a stock is held, not how strongly any manager believes in it; most large holders are index and diversified funds.',
  'Counts are distinct 13F filer CIKs among the filers Ezana has loaded for the quarter, not every investment firm; two CIKs of one parent count twice.',
  'A change in reported value is not proof of buying or selling: it also moves with the share price. Manager changes compare only filers that reported in both quarters.',
  '13F reports are point-in-time quarter-end snapshots filed up to 45 days later; the member positions are estimated from STOCK Act disclosures at range midpoints, on a different date.',
  'Ownership percentage needs shares outstanding for the same date, which Sonar does not hold, so it is not shown.',
];
