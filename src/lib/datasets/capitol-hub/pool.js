/**
 * Capitol Watch hub: the candidate pool a signal rule runs over. SERVER ONLY.
 *
 * One pool per rule window (30D, 90D, 180D, 12M), cached 15 minutes under
 * `hubs`. Two kinds of candidate (see matchSignalRule in signals.js):
 *   trade    one member's latest trade in a company in the window, with every
 *            record the other datasets hold for that member or company
 *   company  one company with a contract award in the window, with its
 *            lobbying and SEC filings
 * The pool is the same for every reader; matching is pure and per request.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';
import { configured, count, readAll, timed } from '@/lib/datasets/hub-data';
import { RULE_CONDITIONS, RULE_WINDOWS, agencyGroup, ownerOf } from './signals';
import {
  DAY,
  companyNames,
  isoDaysAgo,
  lobbyingByTicker,
  memberOversight,
  num,
  oversightFor,
  todayIso,
  up,
} from './lookups';

const CACHE = { revalidate: 900, tags: ['hubs'] };
/* Awards this far either side of a trade can satisfy "trade within N days". */
const AWARD_REACH_DAYS = 90;
const WITHIN_DAYS = RULE_CONDITIONS.find((c) => c.id === 'trade_within_days').values.map(
  (v) => v.value,
);
/* Insider trades this close to a member's trade join it. */
const INSIDER_REACH_DAYS = 30;

const byTicker = (rows, key = 'ticker') => {
  const m = new Map();
  for (const r of rows) {
    const t = up(r[key]);
    if (!t) continue;
    if (!m.has(t)) m.set(t, []);
    m.get(t).push(r);
  }
  return m;
};

async function loadPoolOrThrow(window) {
  if (!configured()) return [];
  const days = RULE_WINDOWS[window] || 90;
  const admin = getAdminClient();
  const since = isoDaysAgo(days);
  const awardSince = isoDaysAgo(days + AWARD_REACH_DAYS);

  const tradeTotal = await count(() =>
    timed(
      admin
        .from('congress_trades_enriched')
        .select('id', { count: 'exact', head: true })
        .gte('transaction_date', since)
        .not('ticker', 'is', null),
    ),
  );
  /* The indexed, pre-resolved copy of awards with a ticker. */
  const awardTotal = await count(() =>
    timed(
      admin
        .from('mv_contract_award_tickers')
        .select('ticker', { count: 'exact', head: true })
        .gte('action_date', awardSince),
    ),
  );
  const [trades, awards, insiders, whales, fecRows, lobbying, returns] = await Promise.all([
    tradeTotal
      ? readAll(
          () =>
            timed(
              admin
                .from('congress_trades_enriched')
                .select(
                  'id, bioguide_id, member_name, party, chamber, ticker, asset_name, type, transaction_date, disclosure_date, amount_min, amount_max, owner',
                )
                .gte('transaction_date', since)
                .not('ticker', 'is', null)
                .order('transaction_date', { ascending: false })
                .order('id'),
            ),
          tradeTotal,
          20,
        )
      : [],
    awardTotal
      ? readAll(
          () =>
            timed(
              admin
                .from('mv_contract_award_tickers')
                .select('ticker, action_date, award_amount, awarding_agency')
                .gte('action_date', awardSince)
                .order('ticker')
                .order('action_date')
                .order('award_amount')
                .order('awarding_agency'),
            ),
          awardTotal,
          20,
        )
      : [],
    timed(
      admin
        .from('sec_insider_transactions')
        .select('issuer_ticker, transaction_date, transaction_code')
        .in('transaction_code', ['P', 'S'])
        .gte('transaction_date', isoDaysAgo(days + INSIDER_REACH_DAYS))
        .order('transaction_date', { ascending: false })
        .limit(5000),
    ),
    timed(
      admin
        .from('whale_moves')
        .select('ticker, kind, filed_at')
        .gte('filed_at', since)
        .order('filed_at', { ascending: false })
        .limit(5000),
    ),
    timed(
      admin
        .from('ezq_campaign_finance')
        .select('bioguide_id, cycle, receipts')
        .not('receipts', 'is', null)
        .order('cycle', { ascending: false })
        .limit(2000),
    ),
    /* Optional: a rule without lobbying still runs if this read fails. */
    lobbyingByTicker(admin).catch(() => new Map()),
    timed(
      admin
        .from('mv_award_window_trades')
        .select('source_id, ret_30d_pct')
        .eq('actor_type', 'politician')
        .limit(2000),
    ),
  ]);
  for (const r of [insiders, whales, fecRows, returns])
    if (r.error) throw new Error(r.error.message);

  const awardsBy = byTicker(
    awards.map((a) => ({
      ticker: a.ticker,
      date: a.action_date,
      amount: num(a.award_amount),
      agency: a.awarding_agency,
      group: agencyGroup(a.awarding_agency),
    })),
  );
  const insidersBy = byTicker(
    (insiders.data || []).map((r) => ({ ticker: r.issuer_ticker, date: r.transaction_date })),
  );
  const whaleBy = byTicker(
    (whales.data || []).map((r) => ({
      ticker: r.ticker,
      kind: r.kind,
      date: String(r.filed_at).slice(0, 10),
    })),
  );
  const cycle = fecRows.data?.[0]?.cycle;
  const fec = new Map(
    (fecRows.data || [])
      .filter((r) => r.cycle === cycle)
      .map((r) => [up(r.bioguide_id), { receipts: num(r.receipts), cycle }]),
  );
  const ret = new Map((returns.data || []).map((r) => [String(r.source_id), num(r.ret_30d_pct)]));

  /* One trade candidate per member and company: the latest in the window. */
  const latest = new Map();
  for (const t of trades) {
    const key = `${up(t.bioguide_id)}|${up(t.ticker)}`;
    if (!latest.has(key)) latest.set(key, t);
  }
  const memberTrades = [...latest.values()];
  const [oversight, names] = await Promise.all([
    memberOversight(
      admin,
      memberTrades.map((t) => t.bioguide_id),
    ),
    companyNames(admin, [...memberTrades.map((t) => t.ticker), ...awardsBy.keys()]),
  ]);

  /* A busy contractor wins hundreds of awards a quarter. A rule asks only
     "is there an award of at least X within N days" (optionally before or
     after the trade, from some agency groups), so each trade keeps the
     largest award inside each N, on each side of the trade, from each agency
     group; every answer the builder can ask for is the same. */
  const maxBy = (list) =>
    (list || []).reduce((b, a) => (!b || (a.amount ?? 0) > (b.amount ?? 0) ? a : b), null);
  const compact = (list) => {
    const seen = new Set();
    return list
      .filter(Boolean)
      .filter((a) => {
        const k = `${a.date}|${a.amount}|${a.agency}|${a.group}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .map(({ date, amount, agency, group }) => ({ date, amount, agency, group }));
  };
  const bucketMaxima = (list, date) => {
    const picks = [];
    const groups = [...new Set((list || []).map((a) => a.group))];
    for (const d of WITHIN_DAYS) {
      const inReach = near(list, date, d);
      for (const g of groups) {
        const ofGroup = inReach.filter((a) => a.group === g);
        picks.push(maxBy(ofGroup.filter((a) => a.date >= date)));
        picks.push(maxBy(ofGroup.filter((a) => a.date <= date)));
      }
    }
    return compact(picks);
  };
  const near = (list, date, reach) =>
    (list || []).filter((x) => Math.abs(Date.parse(x.date) - Date.parse(date)) <= reach * DAY);
  const inWindow = (list) => (list || []).filter((x) => x.date >= since);

  const tradeCandidates = memberTrades.map((t) => {
    const ticker = up(t.ticker);
    const w = whaleBy.get(ticker) || [];
    const o = oversightFor(oversight, t.bioguide_id, ticker);
    return {
      id: String(t.id),
      level: 'trade',
      ticker,
      company: names.get(ticker) || t.asset_name || null,
      member: {
        bioguideId: up(t.bioguide_id),
        name: t.member_name || t.bioguide_id,
        party: t.party,
        chamber: t.chamber ? String(t.chamber).toLowerCase() : null,
      },
      side: t.type,
      owner: ownerOf(t.owner),
      lagDays:
        t.disclosure_date && t.transaction_date
          ? Math.round((Date.parse(t.disclosure_date) - Date.parse(t.transaction_date)) / DAY)
          : null,
      tradeDate: t.transaction_date,
      amountMin: num(t.amount_min),
      amountMax: num(t.amount_max),
      flaggedAt: t.transaction_date,
      awards: bucketMaxima(awardsBy.get(ticker), t.transaction_date),
      oversees: o,
      lobbying: lobbying.get(ticker) || null,
      fec: fec.get(up(t.bioguide_id)) || null,
      insiders: near(insidersBy.get(ticker), t.transaction_date, INSIDER_REACH_DAYS).map(
        ({ date }) => ({ date }),
      ),
      institutions: inWindow(w.filter((x) => x.kind === 'institutional')).map(({ date }) => ({
        date,
      })),
      whales: inWindow(w.filter((x) => x.kind === 'activist')).map(({ date }) => ({ date })),
      ret30: ret.get(String(t.id)) ?? null,
    };
  });

  const companyCandidates = [...awardsBy.entries()].map(([ticker, list]) => {
    const recent = inWindow(list).sort((a, b) => b.date.localeCompare(a.date));
    const w = whaleBy.get(ticker) || [];
    return {
      id: `co-${ticker}`,
      level: 'company',
      ticker,
      company: names.get(ticker) || null,
      member: null,
      side: null,
      tradeDate: null,
      amountMin: null,
      flaggedAt: recent[0]?.date || null,
      awards: compact([recent[0], maxBy(recent)]),
      oversees: null,
      lobbying: lobbying.get(ticker) || null,
      fec: null,
      insiders: inWindow(insidersBy.get(ticker)).map(({ date }) => ({ date })),
      institutions: inWindow(w.filter((x) => x.kind === 'institutional')).map(({ date }) => ({
        date,
      })),
      whales: inWindow(w.filter((x) => x.kind === 'activist')).map(({ date }) => ({ date })),
      ret30: null,
    };
  });

  return [...tradeCandidates, ...companyCandidates.filter((c) => c.flaggedAt)];
}

const cachedPool = unstable_cache(loadPoolOrThrow, ['capitol-rule-pool-v3'], CACHE);

/** The pool for a window, or throws (the route answers with its error state). */
export async function getRulePool(window) {
  return cachedPool(RULE_WINDOWS[window] ? window : '90D');
}

export { todayIso };
