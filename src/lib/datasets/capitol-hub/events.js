/**
 * Capitol Watch hub: the top signals carousel. SERVER ONLY.
 *
 * getCapitolEvents() assembles HighSignalEvents from five kinds of linked
 * records, ranks them (linked-dataset count, then most recent) and keeps the
 * last 7 days, or the last 30 when the week has fewer than five:
 *
 *   trade_before_award   award-window trades by members ahead of the award
 *   committee_overlap    the committee-sectors linkage
 *   lobbied_then_won     the lobbying-contracts linkage
 *   insider_same_month   members and Form 4 insiders buying in one month
 *   late_filing          trades disclosed more than 45 days after the trade
 *
 * Cached 15 minutes under `hubs`. Errors are thrown inside the cache and
 * caught outside, so a failure is retried on the next request.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, getLinkage, timed } from '@/lib/datasets/hub-data';
import {
  buildCommitteeOverlap,
  buildInsiderSameMonth,
  buildLateFiling,
  buildLobbiedThenWon,
  buildTradeBeforeAward,
  selectEventWindow,
} from './signals';
import {
  companyNames,
  isoDaysAgo,
  latestAwards,
  lobbyingByTicker,
  memberOversight,
  num,
  oversightFor,
  pricesAround,
  todayIso,
  up,
} from './lookups';

const CACHE = { revalidate: 900, tags: ['hubs'] };
const LATE_AFTER_DAYS = 45;
const PRICED_EVENTS = 12;

async function tradesBeforeAwards(admin, since) {
  const { data, error } = await timed(
    admin
      .from('mv_award_window_trades')
      .select(
        'actor_id, actor_name, actor_detail, ticker, side, trade_date, source_id, award_date, award_amount, awarding_agency, days_from_award, ret_30d_pct',
      )
      .eq('actor_type', 'politician')
      .lt('days_from_award', 0)
      .gte('award_date', since)
      .order('award_date', { ascending: false })
      .limit(60),
  );
  if (error) throw new Error(error.message);
  const rows = data || [];
  if (!rows.length) return [];
  /* The disclosed range for each trade. */
  const { data: trades, error: e2 } = await admin
    .from('congress_trades')
    .select('id, amount_min, amount_max')
    .in(
      'id',
      rows.map((r) => r.source_id),
    );
  if (e2) throw new Error(e2.message);
  const range = new Map((trades || []).map((t) => [String(t.id), t]));
  return rows.map((r) => ({
    sourceId: r.source_id,
    bioguideId: r.actor_id,
    member: r.actor_name,
    party: r.actor_detail,
    ticker: r.ticker,
    side: r.side,
    tradeDate: r.trade_date,
    amountMin: range.get(String(r.source_id))?.amount_min ?? null,
    amountMax: range.get(String(r.source_id))?.amount_max ?? null,
    awardDate: r.award_date,
    awardAmount: r.award_amount,
    agency: r.awarding_agency,
    daysFromAward: r.days_from_award,
    ret30: num(r.ret_30d_pct),
  }));
}

async function lateFilings(admin, since) {
  const { data, error } = await timed(
    admin
      .from('congress_trades_enriched')
      .select(
        'id, bioguide_id, member_name, party, ticker, type, transaction_date, disclosure_date, amount_min, amount_max',
      )
      .gte('disclosure_date', since)
      .not('ticker', 'is', null)
      .not('transaction_date', 'is', null)
      .order('disclosure_date', { ascending: false })
      .limit(1000),
  );
  if (error) throw new Error(error.message);
  const seen = new Set();
  const out = [];
  for (const r of data || []) {
    const lag = (Date.parse(r.disclosure_date) - Date.parse(r.transaction_date)) / 86400000;
    if (!(lag > LATE_AFTER_DAYS)) continue;
    /* One per member and ticker: the latest. */
    const key = `${up(r.bioguide_id)}-${up(r.ticker)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: r.id,
      bioguideId: r.bioguide_id,
      member: r.member_name,
      party: r.party,
      ticker: r.ticker,
      side: r.type,
      tradeDate: r.transaction_date,
      disclosureDate: r.disclosure_date,
      amountMin: r.amount_min,
      amountMax: r.amount_max,
    });
  }
  return out.slice(0, 20);
}

async function memberTradesByTicker(admin, tickers, since) {
  const list = [...new Set(tickers.map(up).filter(Boolean))];
  if (!list.length) return new Map();
  const { data, error } = await admin
    .from('congress_trades_enriched')
    .select('bioguide_id, member_name, party, ticker, type, transaction_date')
    .in('ticker', list)
    .gte('transaction_date', since)
    .order('transaction_date', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  const out = new Map();
  for (const r of data || []) {
    const t = up(r.ticker);
    if (!out.has(t))
      out.set(t, {
        bioguideId: r.bioguide_id,
        member: r.member_name,
        party: r.party,
        side: r.type,
        date: r.transaction_date,
      });
  }
  return out;
}

async function loadEventsOrThrow() {
  if (!configured()) return { days: 7, events: [] };
  const admin = getAdminClient();
  const today = todayIso();
  const since = isoDaysAgo(30);

  const [tba, committeeLinkage, lobbyLinkage, insider, late, lobbying] = await Promise.all([
    tradesBeforeAwards(admin, since),
    getLinkage('capitol-committee-sectors'),
    getLinkage('capitol-lobbying-contracts'),
    timed(admin.rpc('hub_capitol_insider_overlap', { p_days: 60, p_limit: 20 })),
    lateFilings(admin, since),
    lobbyingByTicker(admin),
  ]);
  if (insider.error) throw new Error(insider.error.message);

  const covRows = (committeeLinkage.rows || []).filter(
    (r) => r.member?.bioguideId && r.date && r.date >= since,
  );
  const lobRows = lobbyLinkage.rows || [];
  const tickers = [
    ...tba.map((r) => r.ticker),
    ...covRows.map((r) => r.ticker),
    ...lobRows.map((r) => r.ticker),
    ...(insider.data || []).map((r) => r.ticker),
    ...late.map((r) => r.ticker),
  ];
  const [oversight, names, awards12m, memberTrades] = await Promise.all([
    memberOversight(
      admin,
      tba.map((r) => r.bioguideId),
    ),
    companyNames(admin, tickers),
    latestAwards(
      admin,
      [...covRows.map((r) => r.ticker), ...lobRows.map((r) => r.ticker)],
      isoDaysAgo(365),
    ),
    memberTradesByTicker(
      admin,
      lobRows.map((r) => r.ticker),
      isoDaysAgo(90),
    ),
  ]);
  const company = (t) => names.get(up(t)) || null;

  const events = [
    ...tba.map((r) =>
      buildTradeBeforeAward(
        { ...r, company: company(r.ticker) },
        {
          committee: (() => {
            const o = oversightFor(oversight, r.bioguideId, r.ticker);
            return o ? { name: o.committee, sector: o.sector } : null;
          })(),
          lobbying: lobbying.get(up(r.ticker)) || null,
        },
      ),
    ),
    ...covRows.map((r) => {
      const holding = (r.committees || []).find((c) => c.name === r.committee) || null;
      return buildCommitteeOverlap(
        {
          bioguideId: r.member.bioguideId,
          member: r.member.name,
          party: r.member.party,
          ticker: r.ticker,
          company: company(r.ticker),
          side: r.side,
          tradeDate: r.date,
          committee: r.committee,
          sector: r.sector,
          holding,
        },
        {
          lobbying: lobbying.get(up(r.ticker)) || null,
          award: awards12m.get(up(r.ticker)) || null,
        },
      );
    }),
    ...lobRows.map((r) =>
      buildLobbiedThenWon(
        {
          ticker: r.ticker,
          company: r.company || company(r.ticker),
          client: r.client,
          year: r.year,
          spend: r.spend,
          awardsN: r.awardsN,
          awardsV: r.awardsV,
          latestAward: awards12m.get(up(r.ticker)) || null,
        },
        { memberTrade: memberTrades.get(up(r.ticker)) || null },
      ),
    ),
    ...(insider.data || []).map((r) =>
      buildInsiderSameMonth({
        ticker: r.ticker,
        company: company(r.ticker),
        bioguideId: r.bioguide_id,
        member: r.member_name,
        party: r.party,
        memberDate: r.member_date,
        insiderName: r.insider_name,
        insiderTitle: r.insider_title,
        insiderDate: r.insider_date,
        insiderValue: r.insider_value,
      }),
    ),
    ...late.map((r) => buildLateFiling({ ...r, company: company(r.ticker) })),
  ];

  const picked = selectEventWindow(events, today);
  /* Prices for the events a reader sees first; empty until the sync runs. */
  const priced = await Promise.all(
    picked.events
      .slice(0, PRICED_EVENTS)
      .map((e) => pricesAround(admin, e.ticker, e.awardDate || e.tradeDate).catch(() => [])),
  );
  priced.forEach((p, i) => {
    picked.events[i].prices = p;
  });
  return { days: picked.days, events: picked.events, asOf: today };
}

const cachedEvents = unstable_cache(loadEventsOrThrow, ['capitol-events-v1'], CACHE);

/** { days: 7 | 30, events: HighSignalEvent[], asOf } or { error: true, events: [] }. */
export async function getCapitolEvents() {
  try {
    return await cachedEvents();
  } catch (e) {
    console.error('[capitol-hub] events', e?.message || e);
    return { days: 7, events: [], error: true };
  }
}
