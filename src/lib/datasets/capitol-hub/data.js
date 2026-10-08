/**
 * Capitol Watch hub: heatmap, portfolio and member drawer reads. SERVER ONLY.
 * Cached 15 minutes under `hubs`; errors thrown inside the cache, caught
 * outside, so a failure is retried on the next request.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, timed } from '@/lib/datasets/hub-data';
import { congressPortfolio, heatmapGrid } from './signals';
import { committeeName, isoDaysAgo, memberOversight, num, up } from './lookups';
import { getCapitolEvents } from './events';

const CACHE = { revalidate: 900, tags: ['hubs'] };
const MIN_COMMITTEE_SEATS = 10;

const guard =
  (label, fn) =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error('[capitol-hub]', label, e?.message || e);
      return { error: true };
    }
  };

/* ── heatmap ──────────────────────────────────────────────────────────── */

async function loadHeatmapOrThrow(chamber) {
  if (!configured()) return { empty: true };
  const { data, error } = await timed(
    getAdminClient().rpc('hub_capitol_heatmap', {
      p_chamber: chamber,
      p_min_seats: MIN_COMMITTEE_SEATS,
    }),
  );
  if (error) throw new Error(error.message);
  if (!data?.length) return { empty: true };
  const grid = heatmapGrid(
    data.map((r) => ({ ...r, committee: committeeName(r.committee_thomas_id, r.committee) })),
  );
  return { chamber, ...grid };
}
const cachedHeatmap = unstable_cache(loadHeatmapOrThrow, ['capitol-heatmap-v1'], CACHE);

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

async function loadMemberOrThrow(bioguide) {
  if (!configured()) return null;
  const admin = getAdminClient();
  const id = up(bioguide);
  const since12 = isoDaysAgo(365);
  const [member, trades, holdings, finance, donors, oversight] = await Promise.all([
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
    admin
      .from('congress_open_positions')
      .select('ticker, est_value, first_buy, last_date, last_type, trades')
      .eq('bioguide_id', id)
      .order('est_value', { ascending: false })
      .limit(60),
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
    memberOversight(admin, [id]),
  ]);
  for (const r of [member, trades, holdings, finance, donors])
    if (r.error) throw new Error(r.error.message);
  if (!member.data) return { notFound: true };

  const held = (holdings.data || []).map((h) => ({
    ticker: up(h.ticker),
    estValue: num(h.est_value),
    firstBuy: h.first_buy,
    lastDate: h.last_date,
    lastType: h.last_type,
    trades: num(h.trades),
  }));
  /* Holdings that won federal awards in the last 12 months. */
  const heldTickers = held.map((h) => h.ticker).filter(Boolean);
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

  const t = trades.data || [];
  const lags = t
    .filter((r) => r.disclosure_date && r.transaction_date)
    .map((r) => (Date.parse(r.disclosure_date) - Date.parse(r.transaction_date)) / 86400000);
  const fin = finance.data?.[0] || null;
  const don = donors.data?.[0] || null;
  const m = member.data;
  const { events } = await getCapitolEvents();

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
      raised: num(fin?.receipts),
      medianLag: median(lags),
    },
    signals: (events || []).filter((e) => e.member?.bioguideId === id).slice(0, 6),
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
const cachedMember = unstable_cache(loadMemberOrThrow, ['capitol-member-v1'], CACHE);

/** The drawer's profile, { notFound } or { error }. */
export const getMemberProfile = guard('member', (bioguide) => cachedMember(up(bioguide)));
