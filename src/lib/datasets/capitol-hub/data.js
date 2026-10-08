/**
 * Capitol Watch hub: heatmap, portfolio and member drawer reads. SERVER ONLY.
 * Cached 15 minutes under `hubs`; errors thrown inside the cache, caught
 * outside, so a failure is retried on the next request.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';
import { compareRegions, congressPortfolio, heatmapGrid } from './signals';
import { committeeName, isoDaysAgo, memberOversight, num, up } from './lookups';
import { getCapitolEvents } from './events';

const CACHE = { revalidate: 900, tags: ['hubs'] };
const MIN_COMMITTEE_SEATS = 10;

/* Thrown inside a cached loader for an empty result, so the empty answer is
   never cached (a cold read under load can come back empty) and the next
   request reads again. The guard turns it into { empty: true }. */
class EmptyResult extends Error {}

const guard =
  (label, fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof EmptyResult || e?.message === 'EMPTY_RESULT') return { empty: true };
      console.error('[capitol-hub]', label, e?.message || e);
      return { error: true };
    }
  };

/* ── heatmap ──────────────────────────────────────────────────────────── */

/* Both chambers are precomputed in mv_capitol_heatmap (refreshed by the
   congress-trades and committees crons). Until that model exists the read
   falls back to the live function, so deploy order cannot break the card. */
async function heatmapRows(chamber) {
  const admin = getAdminClient();
  const mv = await timed(
    admin
      .from('mv_capitol_heatmap')
      .select(
        'committee_thomas_id, committee, chamber, sector, seats, holders, share_pct, holder_rows',
      )
      .eq('req_chamber', chamber),
  );
  if (!mv.error) return mv.data || [];
  const { data, error } = await timed(
    admin.rpc('hub_capitol_heatmap', { p_chamber: chamber, p_min_seats: MIN_COMMITTEE_SEATS }),
  );
  if (error) throw new Error(error.message);
  return data || [];
}

async function loadHeatmapOrThrow(chamber) {
  if (!configured()) return { empty: true };
  const data = await heatmapRows(chamber);
  if (!data.length) throw new EmptyResult('EMPTY_RESULT');
  const grid = heatmapGrid(
    data.map((r) => ({ ...r, committee: committeeName(r.committee_thomas_id, r.committee) })),
  );
  return { chamber, ...grid };
}
const cachedHeatmap = unstable_cache(loadHeatmapOrThrow, ['capitol-heatmap-v2'], CACHE);

/** { chamber, committees, sectors, grid, max, selected } | { empty } | { error }. */
export const getHeatmap = guard('heatmap', (chamber = 'house') =>
  cachedHeatmap(chamber === 'senate' ? 'senate' : 'house'),
);

/* ── Congress's portfolio ─────────────────────────────────────────────── */

async function loadPortfolioOrThrow(party, chamber) {
  if (!configured()) return { rows: [], maxMembers: 0 };
  const { data, error } = await timed(
    getAdminClient().rpc('hub_congress_portfolio', {
      p_party: party,
      p_chamber: chamber,
      p_limit: 16,
    }),
  );
  if (error) throw new Error(error.message);
  return congressPortfolio(data || [], 16);
}
const cachedPortfolio = unstable_cache(loadPortfolioOrThrow, ['capitol-portfolio-v1'], CACHE);

const PARTY = { D: 'D', R: 'R' };
const CHAMBER = { house: 'house', senate: 'senate' };

/** { rows, maxMembers } | { error }. party D | R | null, chamber house | senate | null. */
export const getPortfolio = guard('portfolio', (party = null, chamber = null) =>
  cachedPortfolio(PARTY[party] || null, CHAMBER[chamber] || null),
);

/* ── Congress's portfolio, compared ──────────────────────────────────── */

async function loadCompareOrThrow(dim, party, chamber) {
  if (!configured()) return { dim, groups: null, regions: compareRegions([]) };
  const { data, error } = await timed(
    getAdminClient().rpc('hub_congress_portfolio_compare', {
      p_dim: dim,
      p_party: dim === 'chamber' ? party : null,
      p_chamber: dim === 'party' ? chamber : null,
    }),
  );
  if (error) throw new Error(error.message);
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  if (!rows.length) throw new EmptyResult('EMPTY_RESULT');
  return { dim, groups: data.groups || null, regions: compareRegions(rows) };
}
const cachedCompare = unstable_cache(loadCompareOrThrow, ['capitol-portfolio-compare-v1'], CACHE);

/**
 * { dim, groups: { a: { members, tickers }, b }, regions: { a, both, b } }
 * | { empty } | { error }. dim 'party' (Democrats vs Republicans, narrowed by
 * chamber) or 'chamber' (House vs Senate, narrowed by party).
 */
export const getPortfolioCompare = guard('portfolio-compare', (dim, party = null, chamber = null) =>
  cachedCompare(
    dim === 'chamber' ? 'chamber' : 'party',
    PARTY[party] || null,
    CHAMBER[chamber] || null,
  ),
);

/* ── lobbying and contracts: award dollars per lobbying dollar ─────────── */

async function loadLobbyingRatioOrThrow(years) {
  if (!configured()) return { years, rows: [] };
  const { data, error } = await timed(
    getAdminClient().rpc('hub_lobbying_award_ratio', {
      p_years: years,
      p_include_matched: true,
      p_limit: 500,
    }),
  );
  if (error) throw new Error(error.message);
  const rows = (data || []).map((r) => ({
    ticker: r.ticker,
    client: r.client_name,
    company: r.company_label || r.client_name,
    matched: r.match_method !== 'verified',
    lobbying: num(r.lobbying),
    awards: num(r.awards),
    awardValue: num(r.award_value),
  }));
  if (!rows.length) throw new EmptyResult('EMPTY_RESULT');
  return { years, rows };
}
const cachedLobbyingRatio = unstable_cache(
  loadLobbyingRatioOrThrow,
  ['capitol-lobbying-ratio-v1'],
  CACHE,
);

/**
 * { years, rows: [{ ticker, client, company, matched, lobbying, awards,
 * awardValue }] } | { empty } | { error }. years 1 (this year's lobbying,
 * awards over 12 months) or 2. Name-matched rows are always included; the
 * tab filters them client side so the statistics recompute.
 */
export const getLobbyingRatio = guard('lobbying-ratio', (years = 1) =>
  cachedLobbyingRatio(Number(years) === 2 ? 2 : 1),
);

/* ── who reads contract awards best: every actor near an award ────────── */

const ACTOR_TYPE = {
  politician: 'Politician',
  insider: 'Insider',
  institution: 'Institution',
  whale: 'Whale',
};

async function loadAwardReadersOrThrow() {
  if (!configured()) return { rows: [] };
  const { data, error } = await timed(
    getAdminClient().rpc('hub_award_readers', { p_limit_per_type: 25 }),
  );
  if (error) throw new Error(error.message);
  const rows = (data || []).map((r) => ({
    type: ACTOR_TYPE[r.actor_type] || r.actor_type,
    id: r.actor_id,
    name: r.actor_name,
    detail: r.actor_detail,
    trades: num(r.trades),
    beforeAward: num(r.before_award),
    avgLeadDays: num(r.avg_lead_days),
    measured: num(r.measured),
    avgRetPct: num(r.avg_ret_pct),
    hitRate: num(r.hit_rate),
    bestTicker: r.best_ticker,
    bestRetPct: num(r.best_ret_pct),
    awardValue: num(r.award_value),
    score: num(r.score),
    quickStep: Boolean(r.quick_step),
  }));
  if (!rows.length) throw new EmptyResult('EMPTY_RESULT');
  return { rows };
}
const cachedAwardReaders = unstable_cache(
  loadAwardReadersOrThrow,
  ['capitol-award-readers-v1'],
  CACHE,
);

/** { rows } | { empty } | { error }: every trader with a trade within 30 days of an award. */
export const getAwardReaders = guard('award-readers', () => cachedAwardReaders());

/* ── member drawer ────────────────────────────────────────────────────── */

const median = (values) => {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

const topList = (obj, n = 6) => {
  const list = Array.isArray(obj)
    ? obj
    : obj && typeof obj === 'object'
      ? Object.entries(obj).map(([name, total]) => ({ name, total }))
      : [];
  return list
    .map((x) => ({
      name: x.name || x.employer || x.occupation || x.label || null,
      total: num(x.total ?? x.amount ?? x.value),
    }))
    .filter((x) => x.name && x.name !== 'NULL' && x.total != null)
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
};

/* Holdings from the materialized positions (indexed on bioguide_id); the
   congress_open_positions view aggregates every trade per call, so it is only
   the fallback while the model does not exist. */
async function memberHoldings(admin, id) {
  const cols = 'ticker, est_value, first_buy, last_date, last_type, trades';
  const mv = await admin
    .from('mv_congress_open_positions')
    .select(cols)
    .eq('bioguide_id', id)
    .order('est_value', { ascending: false })
    .limit(60);
  if (!mv.error) return mv.data || [];
  const { data, error } = await admin
    .from('congress_open_positions')
    .select(cols)
    .eq('bioguide_id', id)
    .order('est_value', { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * The drawer's first paint: identity, committees, trades and holdings. Four
 * indexed reads in parallel; no awards, finance or signals.
 */
async function loadMemberCoreOrThrow(bioguide) {
  if (!configured()) return null;
  const admin = getAdminClient();
  const id = up(bioguide);
  const since12 = isoDaysAgo(365);
  const [member, trades, holdings, oversight] = await Promise.all([
    admin
      .from('congress_members')
      .select('bioguide_id, full_name, chamber, party, state, district, in_office, photo_url')
      .eq('bioguide_id', id)
      .maybeSingle(),
    admin
      .from('congress_trades_enriched')
      .select(
        'id, ticker, asset_name, type, transaction_date, disclosure_date, amount_min, amount_max',
      )
      .eq('bioguide_id', id)
      .gte('transaction_date', since12)
      .order('transaction_date', { ascending: false })
      .limit(200),
    memberHoldings(admin, id),
    memberOversight(admin, [id]),
  ]);
  for (const r of [member, trades]) if (r.error) throw new Error(r.error.message);
  if (!member.data) return { notFound: true };

  const held = holdings.map((h) => ({
    ticker: up(h.ticker),
    estValue: num(h.est_value),
    firstBuy: h.first_buy,
    lastDate: h.last_date,
    lastType: h.last_type,
    trades: num(h.trades),
  }));
  const t = trades.data || [];
  const lags = t
    .filter((r) => r.disclosure_date && r.transaction_date)
    .map((r) => (Date.parse(r.disclosure_date) - Date.parse(r.transaction_date)) / 86400000);
  const m = member.data;
  return {
    member: {
      bioguideId: m.bioguide_id,
      name: m.full_name,
      chamber: m.chamber,
      party: m.party,
      state: m.state,
      district: m.district,
      inOffice: m.in_office,
      photo: m.photo_url || null,
    },
    committees: (oversight.get(id) || []).map((c) => ({ id: c.id, name: c.name })),
    stats: {
      trades12m: t.length,
      holdings: held.length,
      medianLag: median(lags),
    },
    trades: t.slice(0, 40).map((r) => ({
      id: r.id,
      ticker: up(r.ticker),
      asset: r.asset_name,
      side: /^s/i.test(r.type || '') ? 'sell' : r.type === 'purchase' ? 'buy' : r.type,
      date: r.transaction_date,
      disclosed: r.disclosure_date,
      range: [num(r.amount_min), num(r.amount_max)],
    })),
    holdings: held,
  };
}

/** The rest: campaign finance, top donors, and holdings that won awards. */
async function loadMemberExtraOrThrow(bioguide) {
  if (!configured()) return null;
  const admin = getAdminClient();
  const id = up(bioguide);
  const since12 = isoDaysAgo(365);
  const [finance, donors, holdings] = await Promise.all([
    admin
      .from('ezq_campaign_finance')
      .select(
        'cycle, receipts, disbursements, cash_on_hand, individual_itemized_contributions, pac_contributions, coverage_end_date',
      )
      .eq('bioguide_id', id)
      .order('cycle', { ascending: false })
      .limit(1),
    admin
      .from('fec_candidate_donors')
      .select('cycle, by_employer, by_occupation')
      .eq('bioguide_id', id)
      .order('cycle', { ascending: false })
      .limit(1),
    memberHoldings(admin, id),
  ]);
  for (const r of [finance, donors]) if (r.error) throw new Error(r.error.message);

  /* Holdings that won federal awards in the last 12 months. */
  const heldTickers = holdings.map((h) => up(h.ticker)).filter(Boolean);
  let awarded = [];
  if (heldTickers.length) {
    const { data, error } = await admin
      .from('contract_awards_resolved')
      .select('ticker, award_amount, awarding_agency, action_date')
      .in('ticker', heldTickers)
      .gte('action_date', since12)
      .order('award_amount', { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const by = new Map();
    for (const a of data || []) {
      const t = up(a.ticker);
      const cur = by.get(t) || { ticker: t, total: 0, awards: 0, agency: a.awarding_agency };
      cur.total += num(a.award_amount) || 0;
      cur.awards += 1;
      by.set(t, cur);
    }
    awarded = [...by.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }
  const fin = finance.data?.[0] || null;
  const don = donors.data?.[0] || null;
  return {
    raised: num(fin?.receipts),
    awarded,
    finance: fin
      ? {
          cycle: fin.cycle,
          receipts: num(fin.receipts),
          disbursements: num(fin.disbursements),
          cashOnHand: num(fin.cash_on_hand),
          individual: num(fin.individual_itemized_contributions),
          pac: num(fin.pac_contributions),
          asOf: fin.coverage_end_date,
        }
      : null,
    donors: don
      ? {
          cycle: don.cycle,
          employers: topList(don.by_employer),
          occupations: topList(don.by_occupation),
        }
      : null,
  };
}

const cachedMemberCore = unstable_cache(loadMemberCoreOrThrow, ['capitol-member-core-v1'], CACHE);
const cachedMemberExtra = unstable_cache(
  loadMemberExtraOrThrow,
  ['capitol-member-extra-v1'],
  CACHE,
);

/** The drawer's first paint, { notFound } or { error }. */
export const getMemberCore = guard('member-core', (bioguide) => cachedMemberCore(up(bioguide)));

/** Finance, donors and awarded holdings, or { error }. */
export const getMemberExtra = guard('member-extra', (bioguide) => cachedMemberExtra(up(bioguide)));

/**
 * The whole profile in the original single shape (core, extra and the
 * member's signals among this week's events), for callers that do not ask
 * for a part.
 */
async function loadMemberOrThrow(bioguide) {
  const id = up(bioguide);
  const [core, extra, ev] = await Promise.all([
    cachedMemberCore(id),
    cachedMemberExtra(id),
    getCapitolEvents(),
  ]);
  if (!core || core.notFound) return core;
  return {
    ...core,
    stats: { ...core.stats, raised: extra?.raised ?? null },
    signals: (ev?.events || []).filter((e) => e.member?.bioguideId === id).slice(0, 6),
    awarded: extra?.awarded || [],
    finance: extra?.finance || null,
    donors: extra?.donors || null,
  };
}
const cachedMember = unstable_cache(loadMemberOrThrow, ['capitol-member-v2'], CACHE);

/** The drawer's profile, { notFound } or { error }. */
export const getMemberProfile = guard('member', (bioguide) => cachedMember(up(bioguide)));
