/**
 * Sector screens for Sonar (Nov 4). SERVER ONLY.
 *
 * A ping like "Which defense stocks are members of Congress trading?" is
 * about a SECTOR, read three ways at once:
 *
 *   congress     the past 12 months of disclosed congressional trades in the
 *                sector's stocks: by stock, by member, by month, and the
 *                latest trades (the politician tracker's data)
 *   performance  how the sector's stocks have moved: 1 month, 3 months, year
 *                to date and 1 year, best first
 *   contracts    federal contract obligations to the sector's companies by
 *                fiscal year (Department of Defense for defense), largest first
 *
 * Before this, the ping's lower-case "are" after "stocks" read as a ticker
 * cue and the whole ping resolved to Alexandria Real Estate Equities (ARE).
 *
 * Every leg is bounded and fails soft: a leg that returns nothing is left out
 * of the stack and the brief, never drawn empty. No vendor name appears in a
 * snippet or a label.
 */
import { fetchWithTimeout } from '@/lib/http/fetch-json';
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import {
  CONGRESS_CUE,
  CONTRACTS_CUE,
  PERFORMANCE_CUE,
  wantsSectorScreen,
  panelOrder,
} from '@/lib/sonar/sector-cues';

/* The sector's US-listed companies. Defense has no registry rows yet, so its
   universe is listed here; any other industry falls back to its registry
   basket. Names are display names only. */
export const SECTOR_UNIVERSES = {
  aerospace_defense: {
    label: 'Defense',
    agency: 'Department of Defense',
    agencyShort: 'DoD',
    companies: [
      ['LMT', 'Lockheed Martin'],
      ['RTX', 'RTX'],
      ['NOC', 'Northrop Grumman'],
      ['GD', 'General Dynamics'],
      ['BA', 'Boeing'],
      ['LHX', 'L3Harris'],
      ['HII', 'Huntington Ingalls'],
      ['GE', 'GE Aerospace'],
      ['TDG', 'TransDigm'],
      ['HWM', 'Howmet Aerospace'],
      ['HEI', 'HEICO'],
      ['TXT', 'Textron'],
      ['LDOS', 'Leidos'],
      ['BAH', 'Booz Allen Hamilton'],
      ['SAIC', 'Science Applications'],
      ['CACI', 'CACI International'],
      ['AMTM', 'Amentum'],
      ['KBR', 'KBR'],
      ['PSN', 'Parsons'],
      ['VVX', 'V2X'],
      ['PLTR', 'Palantir'],
      ['KTOS', 'Kratos'],
      ['AVAV', 'AeroVironment'],
      ['BWXT', 'BWX Technologies'],
      ['CW', 'Curtiss-Wright'],
      ['MRCY', 'Mercury Systems'],
      ['DRS', 'Leonardo DRS'],
      ['ESLT', 'Elbit Systems'],
      ['RKLB', 'Rocket Lab'],
    ],
  },
};

export { CONGRESS_CUE, CONTRACTS_CUE, PERFORMANCE_CUE, wantsSectorScreen, panelOrder };

/**
 * The sector's companies: the listed universe, else the registry basket.
 * @returns {{ label: string, agency: string|null, agencyShort: string|null, companies: Array<{ ticker: string, name: string|null }> }}
 */
export function sectorUniverse(industryId, { label = null, basket = [] } = {}) {
  const u = SECTOR_UNIVERSES[industryId];
  if (u) {
    return {
      label: u.label,
      agency: u.agency,
      agencyShort: u.agencyShort,
      companies: u.companies.map(([ticker, name]) => ({ ticker, name })),
    };
  }
  return {
    label: label || 'Sector',
    agency: null,
    agencyShort: null,
    companies: [...new Set(basket)].map((ticker) => ({ ticker, name: null })),
  };
}

/* ── congress ──────────────────────────────────────────────────────── */

const monthKey = (d) => String(d || '').slice(0, 7);
function lastMonths(n, now) {
  const out = [];
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(x.toISOString().slice(0, 7));
  }
  return out;
}
const isBuy = (t) => t.type === 'purchase';
const isSell = (t) => /^sale/.test(String(t.type || ''));

const shortUsd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  const r = n % 1000 === 1 ? n - 1 : n;
  if (r >= 1e9) return `$${+(r / 1e9).toFixed(1)}B`;
  if (r >= 1e6) return `$${+(r / 1e6).toFixed(r % 1e6 ? 1 : 0)}M`;
  if (r >= 1e3) return `$${Math.round(r / 1e3)}K`;
  return `$${Math.round(r)}`;
};
const band = (min, max, sep = '–') => {
  const lo = shortUsd(min);
  const hi = shortUsd(max);
  return lo && hi ? `${lo}${sep}${hi}` : lo ? `${lo}+` : null;
};

/**
 * Summarise a sector's congressional trades. Pure: rows in, panel out.
 * @param {Array} trades congress_trades rows (bioguide_id, ticker, type, transaction_date, amount_min, amount_max)
 * @param {Map<string, object>} members bioguide_id -> { full_name, party, chamber, state }
 */
export function summarizeCongress(trades, members, { names = new Map(), now = new Date() } = {}) {
  if (!trades?.length) return null;
  const months = lastMonths(12, now);
  const monthly = months.map((m) => ({ month: m, buys: 0, sells: 0 }));
  const byMonth = new Map(monthly.map((m) => [m.month, m]));
  const tick = new Map();
  const mem = new Map();
  for (const t of trades) {
    const tk = String(t.ticker || '').toUpperCase();
    if (!tk) continue;
    const slot = byMonth.get(monthKey(t.transaction_date));
    if (slot) {
      if (isBuy(t)) slot.buys += 1;
      else if (isSell(t)) slot.sells += 1;
    }
    const a = tick.get(tk) || {
      ticker: tk,
      name: names.get(tk) || null,
      trades: 0,
      buys: 0,
      sells: 0,
      members: new Set(),
      last: null,
    };
    a.trades += 1;
    if (isBuy(t)) a.buys += 1;
    if (isSell(t)) a.sells += 1;
    if (t.bioguide_id) a.members.add(t.bioguide_id);
    if (!a.last || String(t.transaction_date) > a.last) a.last = t.transaction_date;
    tick.set(tk, a);

    if (t.bioguide_id) {
      const info = members.get(t.bioguide_id) || {};
      const m = mem.get(t.bioguide_id) || {
        bioguideId: t.bioguide_id,
        name: info.full_name || 'Member of Congress',
        party: info.party || null,
        chamber: info.chamber || null,
        state: info.state || null,
        trades: 0,
        buys: 0,
        sells: 0,
        tickers: new Set(),
      };
      m.trades += 1;
      if (isBuy(t)) m.buys += 1;
      if (isSell(t)) m.sells += 1;
      m.tickers.add(tk);
      mem.set(t.bioguide_id, m);
    }
  }
  const byTicker = [...tick.values()]
    .map((a) => ({ ...a, members: a.members.size }))
    .sort((a, b) => b.trades - a.trades || b.members - a.members);
  const byMember = [...mem.values()]
    .map((m) => ({ ...m, tickers: [...m.tickers] }))
    .sort((a, b) => b.trades - a.trades);
  const sorted = [...trades].sort((a, b) =>
    String(b.transaction_date).localeCompare(String(a.transaction_date)),
  );
  const latest = sorted.slice(0, 6).map((t) => ({
    member: members.get(t.bioguide_id)?.full_name || 'Member of Congress',
    party: members.get(t.bioguide_id)?.party || null,
    ticker: String(t.ticker || '').toUpperCase(),
    type: String(t.type || '').replace('_', ' '),
    date: t.transaction_date || null,
    range: band(t.amount_min, t.amount_max),
    min: Number(t.amount_min) || null,
    max: Number(t.amount_max) || null,
  }));
  return {
    window: '12M',
    total: trades.length,
    buys: trades.filter(isBuy).length,
    sells: trades.filter(isSell).length,
    memberCount: mem.size,
    byTicker: byTicker.slice(0, 10),
    byMember: byMember.slice(0, 6),
    monthly,
    latest,
  };
}

async function congressLeg(admin, tickers, names, now) {
  if (!admin || !tickers.length) return null;
  const since = new Date(now.getTime() - 365 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await admin
    .from('congress_trades')
    .select('bioguide_id, ticker, type, transaction_date, amount_min, amount_max')
    .in('ticker', tickers)
    .gte('transaction_date', since)
    .order('transaction_date', { ascending: false })
    .limit(3000);
  if (error || !data?.length) return null;
  const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
  const { data: rows } = ids.length
    ? await admin
        .from('congress_members')
        .select('bioguide_id, full_name, party, chamber, state')
        .in('bioguide_id', ids)
    : { data: [] };
  const members = new Map((rows || []).map((m) => [m.bioguide_id, m]));
  return summarizeCongress(data, members, { names, now });
}

/* ── performance ───────────────────────────────────────────────────── */

const FMP_STABLE = 'https://financialmodelingprep.com/stable';
const PERF_TTL_MS = 15 * 60 * 1000;
const perfCache = new Map();
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

async function priceChange(sym, key, ms) {
  const hit = perfCache.get(sym);
  if (hit && Date.now() - hit.at < PERF_TTL_MS) return hit.row;
  try {
    const res = await fetchWithTimeout(
      `${FMP_STABLE}/stock-price-change?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`,
      { cache: 'no-store' },
      ms,
    );
    if (!res.ok) return null;
    const d = await res.json();
    const r = (Array.isArray(d) ? d[0] : d) || null;
    if (!r) return null;
    const row = {
      m1: num(r['1M']),
      m3: num(r['3M']),
      ytd: num(r.ytd ?? r.YTD),
      y1: num(r['1Y']),
    };
    perfCache.set(sym, { at: Date.now(), row });
    return row;
  } catch {
    return null;
  }
}

/** Rank a sector's stocks by year to date (1 year where YTD is missing). */
export function rankPerformance(rows) {
  const score = (r) => (r.ytd != null ? r.ytd : r.y1 != null ? r.y1 : null);
  return rows
    .filter((r) => score(r) != null)
    .sort((a, b) => score(b) - score(a))
    .map((r) => ({ ...r, basis: r.ytd != null ? 'ytd' : '1y' }));
}

async function performanceLeg(companies, { ms, now }) {
  const key = getFmpKey();
  if (!key || !companies.length) return null;
  const rows = await Promise.all(
    companies.map(async (c) => {
      const p = await priceChange(c.ticker, key, ms);
      return p ? { ticker: c.ticker, name: c.name, ...p } : null;
    }),
  );
  const ranked = rankPerformance(rows.filter(Boolean));
  if (!ranked.length) return null;
  return { asOf: now.toISOString().slice(0, 10), rows: ranked.slice(0, 10), count: ranked.length };
}

/* ── contracts ─────────────────────────────────────────────────────── */

/** The US federal fiscal year a date falls in (FY2027 starts 2026-10-01). */
export const federalFy = (d = new Date()) =>
  d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();

/**
 * Contract totals by company for the two latest fiscal years. Pure.
 * The latest year ranks only when it looks complete (an earlier fiscal year
 * holding at least 80% of the prior year's total); otherwise the prior,
 * complete year ranks and the latest is labelled "to date".
 */
export function summarizeContracts(rows, { names = new Map(), now = new Date() } = {}) {
  if (!rows?.length) return null;
  const fys = [...new Set(rows.map((r) => Number(r.fiscal_year)).filter(Boolean))].sort(
    (a, b) => b - a,
  );
  const latestFy = fys[0];
  const priorFy = latestFy - 1;
  const by = new Map();
  for (const r of rows) {
    const fy = Number(r.fiscal_year);
    if (fy !== latestFy && fy !== priorFy) continue;
    const tk = String(r.ticker || '').toUpperCase();
    const a = by.get(tk) || {
      ticker: tk,
      name: names.get(tk) || null,
      latest: 0,
      prior: 0,
      awards: 0,
    };
    if (fy === latestFy) a.latest += Number(r.total_amount) || 0;
    else a.prior += Number(r.total_amount) || 0;
    if (fy === latestFy) a.awards += Number(r.award_count) || 0;
    by.set(tk, a);
  }
  const all = [...by.values()];
  const sumLatest = all.reduce((s, a) => s + a.latest, 0);
  const sumPrior = all.reduce((s, a) => s + a.prior, 0);
  const latestComplete = latestFy < federalFy(now) && sumPrior > 0 && sumLatest >= 0.8 * sumPrior;
  const rankBy = latestComplete || !sumPrior ? 'latest' : 'prior';
  const ranked = all
    .filter((a) => a[rankBy] > 0)
    .sort((a, b) => b[rankBy] - a[rankBy] || b.latest - a.latest);
  if (!ranked.length) return null;
  return {
    latestFy,
    priorFy,
    latestComplete,
    rankBy,
    rows: ranked.slice(0, 10),
  };
}

async function contractsLeg(admin, tickers, agency, names, now) {
  if (!admin || !tickers.length) return null;
  let q = admin
    .from('company_contract_history')
    .select('ticker, fiscal_year, award_count, total_amount, awarding_agency')
    .in('ticker', tickers)
    .gte('fiscal_year', federalFy(now) - 3);
  if (agency) q = q.eq('awarding_agency', agency);
  const { data, error } = await q.limit(5000);
  if (error || !data?.length) return null;
  return summarizeContracts(data, { names, now });
}

/* ── the screen ────────────────────────────────────────────────────── */

const soft = (p, ms) => {
  let timer;
  return Promise.race([
    Promise.resolve()
      .then(p)
      .catch(() => null),
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(null), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

/**
 * The sector screen dossier. kind 'sector'.
 * @param {{ industryId: string, label?: string, basket?: string[], query?: string, admin: object, ms?: number, now?: Date }} args
 */
export async function buildSectorScreen({
  industryId,
  label = null,
  basket = [],
  query = '',
  admin,
  ms = 1800,
  now = new Date(),
}) {
  const u = sectorUniverse(industryId, { label, basket });
  const tickers = u.companies.map((c) => c.ticker);
  const names = new Map(u.companies.map((c) => [c.ticker, c.name]));
  const [congress, performance, contracts] = await Promise.all([
    soft(() => congressLeg(admin, tickers, names, now), ms),
    soft(() => performanceLeg(u.companies, { ms: Math.max(600, ms - 300), now }), ms),
    soft(() => contractsLeg(admin, tickers, u.agency, names, now), ms),
  ]);
  return {
    kind: 'sector',
    name: `${u.label} stocks`,
    ticker: null,
    industry: { id: industryId, label: u.label },
    agency: u.agency,
    agencyShort: u.agencyShort,
    universe: tickers,
    order: panelOrder(query),
    congress,
    performance,
    contracts,
    /* The company layout's fields, empty, so any consumer that has not
       learned about kind still renders without throwing. */
    fundamentals: null,
    spark: null,
    news: [],
    echo: [],
    matches: {
      echo: null,
      contracts: null,
      congress: congress?.latest?.length
        ? congress.latest.map((t) => ({
            member: t.member,
            type: `${t.type} ${t.ticker}`,
            date: t.date,
            range: t.range,
          }))
        : null,
      sectorMembers: congress?.byMember?.length ? congress.byMember.slice(0, 4) : null,
      sectorContracts: contracts?.rows?.length
        ? { ...contracts, rows: contracts.rows.slice(0, 4) }
        : null,
      sec: null,
      thirteenF: null,
      lobbying: null,
      markets: null,
    },
  };
}

const pct = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

/**
 * The screen as evidence snippets, in the order the ping asked for, so the
 * brief answers from the tables on screen.
 */
export function sectorEvidence(s) {
  if (!s || s.kind !== 'sector') return [];
  const who = s.industry.label;
  const blocks = {
    congress: () => {
      const c = s.congress;
      if (!c) return [];
      return [
        {
          corpus: 'congress',
          title: `Congressional trading in ${who} stocks, last 12 months`,
          snippet: `Members of Congress disclosed ${c.total} trades in ${who.toLowerCase()} stocks in the last 12 months (${c.buys} purchases, ${c.sells} sales) by ${c.memberCount} members. Most traded: ${c.byTicker
            .slice(0, 6)
            .map(
              (t) =>
                `${t.ticker}${t.name ? ` (${t.name})` : ''} ${t.trades} trades by ${t.members} ${t.members === 1 ? 'member' : 'members'}, ${t.buys} buys, ${t.sells} sales`,
            )
            .join('; ')}.`,
          meta: { sector: who },
        },
        {
          corpus: 'congress',
          title: `Most active members in ${who} stocks`,
          snippet: `Most active members of Congress in ${who.toLowerCase()} stocks over the last 12 months: ${c.byMember
            .slice(0, 5)
            .map(
              (m) =>
                `${m.name}${m.party ? ` (${[m.party, m.state].filter(Boolean).join('-')})` : ''} ${m.trades} trades in ${m.tickers.slice(0, 4).join(', ')}`,
            )
            .join('; ')}.`,
          meta: { sector: who },
        },
        {
          corpus: 'congress',
          title: `Latest congressional trades in ${who} stocks`,
          snippet: `Latest disclosed congressional trades in ${who.toLowerCase()} stocks: ${c.latest
            .map(
              (t) =>
                `${t.date} ${t.member} ${t.type} ${t.ticker}${band(t.min, t.max, ' to ') ? ` ${band(t.min, t.max, ' to ')}` : ''}`,
            )
            .join('; ')}. Filings report amount ranges, not exact amounts.`,
          meta: { sector: who },
        },
      ];
    },
    performance: () => {
      const p = s.performance;
      if (!p) return [];
      const line = (r) =>
        `${r.ticker}${r.name ? ` (${r.name})` : ''} ${[
          r.ytd != null ? `YTD ${pct(r.ytd)}` : null,
          r.y1 != null ? `1Y ${pct(r.y1)}` : null,
          r.m1 != null ? `1M ${pct(r.m1)}` : null,
        ]
          .filter(Boolean)
          .join(', ')}`;
      const worst = [...p.rows].reverse().slice(0, 2);
      return [
        {
          corpus: 'market',
          title: `Best performing ${who} stocks`,
          snippet: `Share price performance across ${p.count} ${who.toLowerCase()} stocks, as of ${p.asOf}, best first: ${p.rows
            .slice(0, 6)
            .map(line)
            .join('; ')}. Weakest of the top ten: ${worst.map(line).join('; ')}.`,
          meta: { sector: who },
        },
      ];
    },
    contracts: () => {
      const k = s.contracts;
      if (!k) return [];
      const agency = s.agency ? `${s.agency} ` : 'federal ';
      const fy = (a) =>
        `${a.ticker}${a.name ? ` (${a.name})` : ''} ${shortUsd(a.prior) || '$0'} in FY${k.priorFy}, ${shortUsd(a.latest) || '$0'} in FY${k.latestFy}${k.latestComplete ? '' : ' to date'}`;
      return [
        {
          corpus: 'contracts',
          title: `${who} companies by ${agency}contract obligations`,
          snippet: `${who} companies by ${agency}contract obligations, ranked by FY${k.rankBy === 'latest' ? k.latestFy : k.priorFy}: ${k.rows
            .slice(0, 6)
            .map(fy)
            .join(
              '; ',
            )}.${k.latestComplete ? '' : ` FY${k.latestFy} reflects obligations synced so far.`}`,
          meta: { sector: who },
        },
      ];
    },
  };
  return (s.order || ['congress', 'performance', 'contracts']).flatMap(
    (id) => blocks[id]?.() || [],
  );
}
