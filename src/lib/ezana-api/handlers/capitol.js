/**
 * Ezana API handlers: capitol dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js; the
 * maths lives in ../insights/capitol.js.
 */
import {
  ApiError,
  getAdminClient,
  readPage,
  rpcRows,
  rpcDoc,
  insightCache,
  sinceDays,
  pathParam,
  num,
  int,
  day,
  upper,
  like,
  endOfDay,
  newestDate,
  dbError,
} from '../handler-kit';
import { pageOf } from '../query';
import {
  COMPARE_GROUPS,
  MOMENTUM_MIN_PRIOR_USD,
  BURN_MIN_RECEIPTS,
  TILT_MIN_OUTSIDE,
  awardMomentum,
  awardsPerLobbyingDollar,
  burnRate,
  clientBook,
  distinctLobbyists,
  fecLeaderboard,
  issueCounts,
  issueMixChange,
  lagByMember,
  latestCompleteFiscalYear,
  outsideTilt,
  rankMembers,
  sectorMix,
  sectorTilts,
  sortMomentum,
  spendByPeriod,
  stateRollup,
  topCommitteeTickers,
} from '../insights/capitol';

const BIOGUIDE = /^[A-Z][0-9]{6}$/;
const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;
const COMMITTEE = /^[A-Z0-9]{2,8}$/;
const FEC_CANDIDATE = /^[HSP][0-9A-Z]{8}$/;
const LDA_ID = /^[0-9]{1,10}$/;

const SRC = {
  congress: 'House Clerk and Senate Office of Public Records',
  committees:
    'House Clerk and Senate Office of Public Records; congress-legislators (committee rosters)',
  fec: 'FEC',
  lda: 'Senate LDA',
  usaspending: 'USAspending',
  lobbyingAwards: 'Senate LDA and USAspending',
  awardsPrices: 'USAspending and market prices',
  awardsTraders: 'USAspending, House Clerk, Senate Office of Public Records and SEC EDGAR',
  awardsCongress: 'USAspending, House Clerk and Senate Office of Public Records',
};

const id = (r) => r;
const top = (rows, limit) => ({
  data: rows.slice(0, limit),
  page: { limit, has_more: false, next: null },
});
const member = (r) => ({
  bioguide_id: r.bioguide_id || null,
  name: r.name ?? r.full_name ?? r.member_name ?? null,
  party: r.party || null,
  chamber: r.chamber || null,
  state: r.state || null,
  ...(r.district !== undefined ? { district: r.district } : {}),
});

/* Every row of a filtered read, 1,000 at a time, in a stable order. */
async function readAll(table, select, apply, order, max = 60_000) {
  const admin = getAdminClient();
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    let qb = admin.from(table).select(select);
    if (apply) qb = apply(qb);
    for (const k of order) qb = qb.order(k);
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await qb.range(from, from + 999);
    if (error) throw dbError(table, error);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function one(table, select, apply) {
  const { data, error } = await apply(getAdminClient().from(table).select(select)).maybeSingle();
  if (error) throw dbError(table, error);
  return data;
}

const memberId = (v) => pathParam(upper(v), BIOGUIDE, 'member');
const tickerId = (v) => pathParam(upper(v), TICKER, 'ticker');

async function requireMember(bioguide) {
  const m = await one(
    'congress_members',
    'bioguide_id, full_name, party, chamber, state, district',
    (q) => q.eq('bioguide_id', bioguide),
  );
  if (!m) throw new ApiError(404, 'not_found', 'No member with that id.');
  return m;
}

/* ── Politician Tracker ─────────────────────────────────────────────── */

async function rankings(params, cutoff) {
  const days = params.days ?? 365;
  const sort = params.sort || 'volume';
  const norm = {
    days,
    chamber: params.chamber,
    party: params.party,
    q: params.q,
    sort,
    cutoff: cutoff || undefined,
  };
  return insightCache('capitol', 'congress.rankings', norm, async () => {
    const since = sinceDays(days);
    const [{ data: rows }, trades] = await Promise.all([
      rpcRows(
        'politician_rankings',
        {
          window_days: days,
          p_chamber: params.chamber || null,
          p_party: params.party || null,
          p_q: params.q || null,
          p_sort: 'volume',
          lim: 1000,
        },
        id,
      ),
      readAll(
        'congress_trades',
        'id, bioguide_id, transaction_date, disclosure_date',
        (q) => {
          let x = q.gte('transaction_date', since).not('disclosure_date', 'is', null);
          if (cutoff) x = x.lte('disclosure_date', cutoff);
          return x;
        },
        ['id'],
      ),
    ]);
    const lag = lagByMember(trades);
    return rankMembers(
      rows
        .filter((r) => num(r.trades) > 0)
        .map((r) => ({
          bioguide_id: r.bioguide_id,
          name: r.full_name,
          party: r.party,
          chamber: r.chamber,
          state: r.state,
          district: r.district,
          trades: int(r.trades),
          buys: int(r.buys),
          sells: int(r.sells),
          est_volume: num(r.disclosed_volume) ?? 0,
          avg_disclosure_lag_days: lag.get(r.bioguide_id) ?? null,
          last_trade: day(r.last_trade),
          top_tickers: (r.top_tickers || []).map((t) => upper(t)),
        })),
      sort,
    );
  });
}

export const HANDLERS = {
  'congress.rankings': async ({ params, cutoff }) => {
    const ranked = await rankings(params, cutoff);
    const out = top(
      ranked.map((r) => ({
        rank: r.rank,
        member: member(r),
        trades: r.trades,
        buys: r.buys,
        sells: r.sells,
        est_volume: r.est_volume,
        avg_disclosure_lag_days: r.avg_disclosure_lag_days,
        last_trade: r.last_trade,
        top_tickers: r.top_tickers,
      })),
      params.limit,
    );
    return {
      ...out,
      meta: {
        source: SRC.congress,
        window_days: params.days ?? 365,
        sort: params.sort || 'volume',
        as_of: newestDate(ranked.map((r) => r.last_trade)),
      },
    };
  },

  'congress.member_portfolio': async ({ path }) => {
    const bioguide = memberId(path.id);
    const m = await requireMember(bioguide);
    const doc = await insightCache(
      'capitol',
      'congress.member_portfolio',
      { bioguide },
      async () => {
        const { data: p } = await rpcDoc(
          'politician_portfolio',
          { p_bioguide: bioguide, p_limit: 50 },
          id,
          'No member with that id.',
        );
        /* The disclosed range bounds per open position (best effort: the
         estimate stands without them). */
        const range = new Map();
        try {
          const rows = await readAll(
            'mv_congress_open_positions',
            'ticker, est_low, est_high',
            (q) => q.eq('bioguide_id', bioguide),
            ['ticker'],
            5000,
          );
          for (const r of rows) range.set(upper(r.ticker), r);
        } catch {
          /* leave the range out */
        }
        return {
          member: member(m),
          est_total: num(p.total) ?? 0,
          positions: int(p.positions) ?? 0,
          stock_positions: int(p.stockPositions) ?? 0,
          holdings: (p.holdings || []).map((h) => {
            const r = range.get(upper(h.ticker));
            return {
              ticker: upper(h.ticker),
              company: h.company || null,
              sector: h.sector || null,
              est_value: num(h.est),
              est_low: r ? num(r.est_low) : null,
              est_high: r ? num(r.est_high) : null,
              share: num(h.share),
            };
          }),
          sectors: (p.sectors || []).map((s) => ({
            sector: s.sector,
            est_value: num(s.est),
            positions: int(s.positions),
            share: num(s.share),
          })),
        };
      },
    );
    return { data: doc, meta: { source: SRC.congress } };
  },

  'congress.member_similar': async ({ params, path }) => {
    const bioguide = memberId(path.id);
    const limit = Math.min(params.limit, 12);
    await requireMember(bioguide);
    const rows = await insightCache(
      'capitol',
      'congress.member_similar',
      { bioguide, limit },
      async () => {
        const { data } = await rpcRows(
          'politician_similar',
          { p_bioguide: bioguide, p_limit: limit },
          (r) => ({
            member: member({ ...r, bioguide_id: r.bioguideId }),
            overlap: num(r.score),
            shared_count: int(r.shared_count),
            shared_tickers: (r.shared || []).map((t) => upper(t)),
          }),
        );
        return data;
      },
    );
    return { ...top(rows, limit), meta: { source: SRC.congress, window_days: 1095 } };
  },

  'congress.most_traded': async ({ params }) => {
    const days = params.days ?? 365;
    const lim = Math.min(params.limit, 100);
    const norm = { days, lim, chamber: params.chamber, party: params.party };
    const rows = await insightCache('capitol', 'congress.most_traded', norm, async () => {
      const { data } = await rpcRows(
        'congress_top_tickers',
        {
          window_days: days,
          lim,
          p_chamber: params.chamber || null,
          p_party: params.party || null,
          p_q: null,
        },
        (r, i) => ({
          rank: i + 1,
          ticker: upper(r.ticker),
          trades: int(r.trades),
          members: int(r.members),
        }),
      );
      return data;
    });
    return { ...top(rows, lim), meta: { source: SRC.congress, window_days: days } };
  },

  'congress.most_held': async ({ params }) => {
    const days = params.days ?? null;
    const lim = Math.min(params.limit, 100);
    const norm = { days: days ?? undefined, lim, chamber: params.chamber, party: params.party };
    const rows = await insightCache('capitol', 'congress.most_held', norm, async () => {
      const { data } = await rpcRows(
        'congress_most_held_tickers',
        {
          window_days: days,
          lim,
          p_chamber: params.chamber || null,
          p_party: params.party || null,
          p_q: null,
        },
        (r, i) => ({
          rank: i + 1,
          ticker: upper(r.ticker),
          company: r.company || null,
          holders: int(r.holders),
          buys: int(r.buys),
          last_buy: day(r.last_buy),
        }),
      );
      return data;
    });
    return {
      ...top(rows, lim),
      meta: {
        source: SRC.congress,
        window_days: days,
        as_of: newestDate(rows.map((r) => r.last_buy)),
      },
    };
  },

  'congress.portfolio': async ({ params }) => {
    const lim = Math.min(params.limit, 50);
    const norm = { lim, party: params.party, chamber: params.chamber };
    const doc = await insightCache('capitol', 'congress.portfolio', norm, async () => {
      const [{ data: tickers }, { data: cmp }] = await Promise.all([
        rpcRows(
          'hub_congress_portfolio',
          { p_party: params.party || null, p_chamber: params.chamber || null, p_limit: lim },
          (r) => ({
            ticker: upper(r.ticker),
            sector: r.sector || null,
            members: int(r.members),
            est_low: num(r.est_low),
            est_high: num(r.est_high),
          }),
        ),
        /* Sector mix over every position: the chamber split, narrowed by party. */
        rpcDoc(
          'hub_congress_portfolio_compare',
          { p_dim: 'chamber', p_party: params.party || null, p_chamber: null },
          id,
        ),
      ]);
      const side = params.chamber === 'house' ? 'a' : params.chamber === 'senate' ? 'b' : 'both';
      return { tickers, sectors: sectorMix(cmp.rows || [], side) };
    });
    return { data: doc, meta: { source: SRC.congress } };
  },

  'congress.portfolio_compare': async ({ params }) => {
    const dim = params.dim || 'party';
    const norm = {
      dim,
      party: dim === 'chamber' ? params.party : undefined,
      chamber: dim === 'party' ? params.chamber : undefined,
    };
    const doc = await insightCache('capitol', 'congress.portfolio_compare', norm, async () => {
      const { data } = await rpcDoc(
        'hub_congress_portfolio_compare',
        { p_dim: dim, p_party: norm.party || null, p_chamber: norm.chamber || null },
        id,
      );
      const g = data.groups || {};
      const labels = COMPARE_GROUPS[dim];
      return {
        dim,
        groups: {
          a: { label: labels.a, members: int(g.a?.members) ?? 0, tickers: int(g.a?.tickers) ?? 0 },
          b: { label: labels.b, members: int(g.b?.members) ?? 0, tickers: int(g.b?.tickers) ?? 0 },
        },
        sectors: sectorTilts(data.rows || []),
      };
    });
    return { data: doc, meta: { source: SRC.congress } };
  },

  'congress.activity_monthly': async ({ params, cutoff }) => {
    const days = params.days ?? 365;
    const norm = { days, chamber: params.chamber, party: params.party };
    const rows = await insightCache('capitol', 'congress.activity_monthly', norm, async () => {
      const { data } = await rpcRows(
        'congress_monthly_counts',
        {
          window_days: days,
          p_chamber: params.chamber || null,
          p_party: params.party || null,
          p_q: null,
        },
        (r) => {
          const house = int(r.house) ?? 0;
          const senate = int(r.senate) ?? 0;
          return { month: day(r.month), house, senate, total: house + senate };
        },
      );
      return data;
    });
    /* Months that start after the delay cutoff are hidden. */
    const kept = cutoff ? rows.filter((r) => r.month <= cutoff) : rows;
    return { data: kept, meta: { source: SRC.congress, window_days: days } };
  },

  'congress.states': async ({ params }) => {
    const days = params.days ?? 365;
    const rows = await insightCache('capitol', 'congress.states', { days }, async () => {
      const { data } = await rpcRows('hub_capitol_state_members', { p_days: days }, (r) => ({
        ...r,
        last_trade: day(r.last_trade),
      }));
      return stateRollup(data);
    });
    const kept = params.state ? rows.filter((r) => r.state === params.state) : rows;
    return {
      ...top(kept, params.limit),
      meta: {
        source: SRC.congress,
        window_days: days,
        as_of: newestDate(kept.map((r) => r.last_trade)),
      },
    };
  },

  'congress.insider_flow': async ({ params, cutoff }) => {
    const days = params.days ?? 180;
    const minMembers = params.min_members ?? 2;
    const direction = params.direction || 'buying';
    const norm = {
      days,
      minMembers,
      chamber: params.chamber,
      party: params.party,
      direction,
      limit: params.limit,
      cutoff: cutoff || undefined,
    };
    const rows = await insightCache('capitol', 'congress.insider_flow', norm, async () => {
      const { data } = await rpcRows(
        'api_congress_insider_flow',
        {
          p_days: days,
          p_min_members: minMembers,
          p_chamber: params.chamber || null,
          p_party: params.party || null,
          p_limit: params.limit,
          ...(cutoff ? { p_cutoff: cutoff } : {}),
          ...(direction === 'selling' ? { p_direction: 'selling' } : {}),
        },
        (r) => ({
          ticker: upper(r.ticker),
          buyers: int(r.buyers),
          sellers: int(r.sellers),
          buys: int(r.buys),
          sells: int(r.sells),
          est_buy_usd: num(r.buy_usd),
          est_sell_usd: num(r.sell_usd),
          flow_score: num(r.flow_score),
          avg_disclosure_lag_days: num(r.avg_disclosure_lag_days),
          first_trade: day(r.first_trade),
          last_trade: day(r.last_trade),
        }),
      );
      return data;
    });
    return {
      ...top(rows, params.limit),
      meta: {
        source: SRC.congress,
        window_days: days,
        window_end: cutoff || new Date().toISOString().slice(0, 10),
        min_members: minMembers,
        as_of: newestDate(rows.map((r) => r.last_trade)),
      },
    };
  },

  /* ── Committee Assignments ────────────────────────────────────────── */

  'congress.committee_heatmap': async ({ params }) => {
    const chamber = params.chamber || 'house';
    const minSeats = params.min_seats ?? 10;
    const rows = await insightCache(
      'capitol',
      'congress.committee_heatmap',
      { chamber, minSeats },
      async () => {
        const { data } = await rpcRows(
          'hub_capitol_heatmap',
          { p_chamber: chamber, p_min_seats: minSeats },
          (r) => ({
            committee: { id: r.committee_thomas_id, name: r.committee, chamber: r.chamber },
            sector: r.sector,
            seats: int(r.seats),
            holders: int(r.holders),
            share_pct: num(r.share_pct),
            holder_members: (r.holder_rows || []).map((h) => ({
              bioguide_id: h.bioguideId || null,
              name: h.member || null,
              party: h.party || null,
              tickers: (h.tickers || []).map((t) => upper(t)),
              last_trade: day(h.lastTrade),
            })),
          }),
        );
        return data.sort(
          (a, b) =>
            b.share_pct - a.share_pct ||
            b.holders - a.holders ||
            a.committee.id.localeCompare(b.committee.id) ||
            a.sector.localeCompare(b.sector),
        );
      },
    );
    return { ...top(rows, params.limit), meta: { source: SRC.committees, chamber } };
  },

  'congress.committee_holdings': async ({ params, path }) => {
    const committeeId = pathParam(upper(path.id), COMMITTEE, 'committee');
    const days = params.days ?? 180;
    const since = sinceDays(days);
    const out = await insightCache(
      'capitol',
      'congress.committee_holdings',
      { committeeId, days },
      async () => {
        const committee = await one(
          'congress_committees',
          'thomas_id, name, chamber, parent_thomas_id',
          (q) => q.eq('thomas_id', committeeId),
        );
        if (!committee) return null;
        const seats = await readAll(
          'ezq_committee_seats',
          'bioguide_id',
          (q) => q.eq('committee_thomas_id', committeeId),
          ['bioguide_id'],
          5000,
        );
        const members = [...new Set(seats.map((s) => upper(s.bioguide_id)).filter(Boolean))];
        const meta = {
          committee: {
            id: committee.thomas_id,
            name: committee.name,
            chamber: committee.chamber,
            parent_id: committee.parent_thomas_id,
            members: members.length,
          },
        };
        if (!members.length) return { rows: [], meta };
        const [held, traded] = await Promise.all([
          readAll(
            'congress_open_positions',
            'bioguide_id, ticker',
            (q) => q.in('bioguide_id', members).not('ticker', 'is', null),
            ['bioguide_id', 'ticker'],
            20_000,
          ),
          readAll(
            'congress_trades_enriched',
            'id, bioguide_id, ticker',
            (q) =>
              q.in('bioguide_id', members).gte('transaction_date', since).not('ticker', 'is', null),
            ['id'],
            20_000,
          ),
        ]);
        const group = (rows) => {
          const m = new Map();
          for (const r of rows) {
            const t = upper(r.ticker);
            if (!t || !TICKER.test(t)) continue;
            if (!m.has(t)) m.set(t, new Set());
            m.get(t).add(upper(r.bioguide_id));
          }
          return m;
        };
        const tickers = topCommitteeTickers(group(held), group(traded), 50);
        if (!tickers.length) return { rows: [], meta };
        const { data } = await rpcRows(
          'hub_committee_ticker_stats',
          { p_pairs: tickers.map((t) => ({ committee: committeeId, ticker: t })), p_since: since },
          (r) => ({
            ticker: upper(r.ticker),
            seats: int(r.seats),
            holders: int(r.holders),
            holder_share_pct: r.seats ? Math.round((1000 * r.holders) / r.seats) / 10 : null,
            holder_names: r.holder_names || [],
            buyers: int(r.buyers),
            sellers: int(r.sellers),
          }),
        );
        data.sort(
          (a, b) =>
            b.holders - a.holders ||
            b.buyers + b.sellers - (a.buyers + a.sellers) ||
            a.ticker.localeCompare(b.ticker),
        );
        return { rows: data, meta };
      },
    );
    if (!out) throw new ApiError(404, 'not_found', 'No committee with that id.');
    return {
      ...top(out.rows, params.limit),
      meta: { source: SRC.committees, ...out.meta, window_days: days },
    };
  },

  'congress.ticker_committee_exposure': async ({ path }) => {
    const ticker = tickerId(path.ticker);
    const rows = await insightCache(
      'capitol',
      'congress.ticker_committee_exposure',
      { ticker },
      async () => {
        const { data } = await rpcRows(
          'hub_ticker_committee_holders',
          { p_tickers: [ticker] },
          (r) => ({
            ticker: upper(r.ticker),
            committee: { id: r.committee_thomas_id, name: r.committee, chamber: r.chamber },
            seats: int(r.seats),
            holders: int(r.holders),
            share_pct: num(r.share_pct),
            holder_names: r.holder_names || [],
          }),
        );
        return data.sort(
          (a, b) =>
            b.share_pct - a.share_pct ||
            b.holders - a.holders ||
            a.committee.id.localeCompare(b.committee.id),
        );
      },
    );
    return { data: rows, meta: { source: SRC.committees, ticker } };
  },

  /* ── Campaign finance ─────────────────────────────────────────────── */

  'fec.candidates': async ({ params }) => {
    const cycle = params.cycle ?? (await latestCycle());
    const rows = await readPage(
      'fec_candidate_totals',
      'bioguide_id, candidate_id, name, party, office, state, cycle, receipts, disbursements, cash_on_hand_end_period, individual_itemized_contributions, other_political_committee_contributions, debts_owed_by_committee, coverage_end_date, synced_at',
      {
        keys: ['receipts', 'bioguide_id'],
        notNull: ['receipts'],
        limit: params.limit,
        cursor: params.cursor,
      },
      (q) => {
        let x = q.eq('cycle', cycle);
        if (params.party) x = x.eq('party', params.party);
        if (params.chamber) x = x.eq('office', params.chamber === 'house' ? 'H' : 'S');
        if (params.state) x = x.eq('state', params.state);
        if (params.q) x = x.ilike('name', like(params.q));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => [r.receipts, r.bioguide_id]);
    return {
      data: kept.map((r) => ({
        bioguide_id: r.bioguide_id,
        candidate_id: r.candidate_id,
        name: r.name,
        party: r.party,
        office: r.office,
        state: r.state,
        cycle: r.cycle,
        receipts: num(r.receipts),
        disbursements: num(r.disbursements),
        cash_on_hand: num(r.cash_on_hand_end_period),
        individual_contributions: num(r.individual_itemized_contributions),
        pac_contributions: num(r.other_political_committee_contributions),
        debts: num(r.debts_owed_by_committee),
        coverage_end: day(r.coverage_end_date),
      })),
      page,
      meta: { cycle, as_of: day(newestDate(kept.map((r) => r.synced_at))) },
    };
  },

  'fec.candidate_donors': async ({ params, path }) => {
    const { col, value } = candidateKey(path.id);
    const doc = await insightCache(
      'capitol',
      'fec.candidate_donors',
      { col, value, cycle: params.cycle },
      async () => {
        const [cand, row] = await Promise.all([
          candidateOf(col, value, params.cycle),
          latestRow(
            'fec_candidate_donors',
            'cycle, by_employer, by_occupation, synced_at',
            col,
            value,
            params.cycle,
          ),
        ]);
        if (!cand && !row) throw new ApiError(404, 'not_found', 'No candidate with that id.');
        const list = (arr, key) =>
          (Array.isArray(arr) ? arr : [])
            .map((d) => ({
              name: d[key] || null,
              contributions: int(d.count),
              amount: num(d.total),
            }))
            .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
        return {
          candidate: cand,
          cycle: row?.cycle ?? cand?.cycle ?? null,
          employers: list(row?.by_employer, 'employer'),
          occupations: list(row?.by_occupation, 'occupation'),
          as_of: day(row?.synced_at),
        };
      },
    );
    const { as_of, ...data } = doc;
    return { data, meta: { source: SRC.fec, as_of } };
  },

  'fec.candidate_outside': async ({ params, path }) => {
    const { col, value } = candidateKey(path.id);
    const doc = await insightCache(
      'capitol',
      'fec.candidate_outside',
      { col, value, cycle: params.cycle },
      async () => {
        const [cand, row] = await Promise.all([
          candidateOf(col, value, params.cycle),
          latestRow(
            'fec_candidate_outside',
            'cycle, support_total, oppose_total, communication_cost, by_committee, spending_by_purpose, synced_at',
            col,
            value,
            params.cycle,
          ),
        ]);
        if (!cand && !row) throw new ApiError(404, 'not_found', 'No candidate with that id.');
        const committees = (Array.isArray(row?.by_committee) ? row.by_committee : []).map((c) => ({
          committee_id: c.committeeId || null,
          name: c.committeeName || null,
          side: c.supportOpposeIndicator === 'O' ? 'oppose' : 'support',
          amount: num(c.total),
        }));
        const bySize = (a, b) => (b.amount ?? 0) - (a.amount ?? 0);
        const support = num(row?.support_total) ?? 0;
        const oppose = num(row?.oppose_total) ?? 0;
        return {
          candidate: cand,
          cycle: row?.cycle ?? cand?.cycle ?? null,
          support_usd: support,
          oppose_usd: oppose,
          net_usd: support - oppose,
          tilt: outsideTilt(support, oppose),
          communication_cost_usd: num(row?.communication_cost) ?? 0,
          supporting: committees.filter((c) => c.side === 'support').sort(bySize),
          opposing: committees.filter((c) => c.side === 'oppose').sort(bySize),
          campaign_spending_by_purpose: (Array.isArray(row?.spending_by_purpose)
            ? row.spending_by_purpose
            : []
          ).map((p) => ({
            purpose: p.purpose || null,
            payments: int(p.count),
            amount: num(p.total),
          })),
          as_of: day(row?.synced_at),
        };
      },
    );
    const { as_of, ...data } = doc;
    return { data, meta: { source: SRC.fec, as_of } };
  },

  'fec.leaderboard': async ({ params }) => {
    const cycle = params.cycle ?? (await latestCycle());
    const sort = params.sort || 'receipts';
    const rows = await insightCache('capitol', 'fec.leaderboard', { cycle }, async () => {
      const [totals, outside] = await Promise.all([
        readAll(
          'fec_candidate_totals',
          'bioguide_id, candidate_id, name, party, office, state, cycle, receipts, disbursements, cash_on_hand_end_period, synced_at',
          (q) => q.eq('cycle', cycle),
          ['bioguide_id'],
        ),
        readAll(
          'fec_candidate_outside',
          'bioguide_id, support_total, oppose_total',
          (q) => q.eq('cycle', cycle),
          ['bioguide_id'],
        ),
      ]);
      const out = new Map(outside.map((o) => [o.bioguide_id, o]));
      return totals.map((t) => {
        const o = out.get(t.bioguide_id);
        const support = num(o?.support_total) ?? 0;
        const oppose = num(o?.oppose_total) ?? 0;
        return {
          candidate: {
            bioguide_id: t.bioguide_id,
            candidate_id: t.candidate_id,
            name: t.name,
            party: t.party,
            office: t.office,
            state: t.state,
          },
          candidate_id: t.candidate_id,
          receipts: num(t.receipts),
          disbursements: num(t.disbursements),
          cash_on_hand: num(t.cash_on_hand_end_period),
          burn_rate: burnRate(t.disbursements, t.receipts),
          outside_support: support,
          outside_oppose: oppose,
          outside_tilt: outsideTilt(support, oppose),
          synced_at: t.synced_at,
        };
      });
    });
    const filtered = rows.filter(
      (r) =>
        (!params.party || r.candidate.party === params.party) &&
        (!params.chamber || r.candidate.office === (params.chamber === 'house' ? 'H' : 'S')) &&
        (!params.state || r.candidate.state === params.state),
    );
    const ranked = fecLeaderboard(filtered, sort).map(({ candidate_id, synced_at, ...r }) => r);
    return {
      ...top(ranked, params.limit),
      meta: {
        source: SRC.fec,
        cycle,
        sort,
        floors: {
          burn_rate_min_receipts: BURN_MIN_RECEIPTS,
          outside_tilt_min_usd: TILT_MIN_OUTSIDE,
        },
        as_of: day(newestDate(rows.map((r) => r.synced_at))),
      },
    };
  },

  /* ── Lobbying ─────────────────────────────────────────────────────── */

  'lobbying.client': async ({ path, cutoff }) => {
    const clientId = Number(pathParam(path.id, LDA_ID, 'client'));
    const doc = await insightCache(
      'capitol',
      'lobbying.client',
      { clientId, cutoff: cutoff || undefined },
      async () => {
        const filings = await readAll(
          'lobbying_filings',
          'uuid, filing_year, quarter, amount, registrant_id, registrant_name, client_name, client_description, issues, dt_posted',
          (q) => {
            const x = q.eq('client_id', clientId);
            return cutoff ? x.lte('dt_posted', endOfDay(cutoff)) : x;
          },
          ['uuid'],
          10_000,
        );
        if (!filings.length) return null;
        const latest = filings.reduce((a, b) =>
          String(b.dt_posted || '') > String(a.dt_posted || '') ? b : a,
        );
        const regs = new Map();
        for (const f of filings) {
          const r = regs.get(f.registrant_id) || {
            id: f.registrant_id,
            name: f.registrant_name,
            filings: 0,
            amount: 0,
          };
          r.filings += 1;
          r.amount += num(f.amount) ?? 0;
          regs.set(f.registrant_id, r);
        }
        return {
          client: {
            id: clientId,
            name: latest.client_name,
            description: latest.client_description,
          },
          filings: filings.length,
          total_amount: filings.reduce((s, f) => s + (num(f.amount) ?? 0), 0),
          spend_by_year: spendByPeriod(filings),
          registrants: [...regs.values()].sort((a, b) => b.amount - a.amount),
          issues: issueCounts(filings, 30),
          as_of: day(latest.dt_posted),
        };
      },
    );
    if (!doc) throw new ApiError(404, 'not_found', 'No lobbying client with that id.');
    const { as_of, ...data } = doc;
    return { data, meta: { source: SRC.lda, as_of } };
  },

  'lobbying.registrant': async ({ params, path, cutoff }) => {
    const registrantId = Number(pathParam(path.id, LDA_ID, 'registrant'));
    const doc = await insightCache(
      'capitol',
      'lobbying.registrant',
      { registrantId, year: params.year, cutoff: cutoff || undefined },
      async () => {
        const filings = await readAll(
          'lobbying_filings',
          'uuid, filing_year, amount, registrant_name, client_id, client_name, issues, lobbyists, dt_posted',
          (q) => {
            let x = q.eq('registrant_id', registrantId);
            if (params.year) x = x.eq('filing_year', params.year);
            return cutoff ? x.lte('dt_posted', endOfDay(cutoff)) : x;
          },
          ['uuid'],
          30_000,
        );
        if (!filings.length) return null;
        const latest = filings.reduce((a, b) =>
          String(b.dt_posted || '') > String(a.dt_posted || '') ? b : a,
        );
        const clients = clientBook(filings, 200);
        return {
          registrant: { id: registrantId, name: latest.registrant_name },
          filings: filings.length,
          total_amount: filings.reduce((s, f) => s + (num(f.amount) ?? 0), 0),
          client_count: new Set(filings.map((f) => f.client_id)).size,
          lobbyists: distinctLobbyists(filings),
          clients,
          issues: issueCounts(filings, 30),
          as_of: day(latest.dt_posted),
        };
      },
    );
    if (!doc) throw new ApiError(404, 'not_found', 'No lobbying registrant with that id.');
    const { as_of, clients, ...rest } = doc;
    return {
      data: { ...rest, clients: clients.slice(0, params.limit) },
      meta: { source: SRC.lda, as_of, year: params.year ?? null },
    };
  },

  'lobbying.issue_mix': async ({ params }) => {
    const year = params.year || new Date().getUTCFullYear();
    const period = params.issue_period || 'year';
    const rows = await insightCache('capitol', 'lobbying.issue_mix', { year, period }, async () => {
      const [cur, prior] = await Promise.all([
        rpcRows('lobbying_issue_mix', { p_year: year, p_period: period, p_days: 90 }, id),
        rpcRows('lobbying_issue_mix', { p_year: year - 1, p_period: period, p_days: 90 }, id),
      ]);
      return issueMixChange(cur.data, prior.data);
    });
    return {
      data: rows,
      meta: {
        source: SRC.lda,
        year,
        period,
        prior: { year: year - 1, period },
        coverage: rows.length ? undefined : { rows: 0, note: 'No filings for this period yet' },
      },
    };
  },

  'lobbying.contributions': async ({ params, cutoff }) => {
    const keys = ['contribution_date', 'filing_uuid', 'item_index'];
    const rows = await readPage(
      'lobbying_contribution_items',
      'filing_uuid, item_index, contribution_type, contributor_name, payee_name, honoree_name, amount, contribution_date, report:lobbying_contribution_reports!inner(dt_posted, filer_type, registrant_id, registrant_name, lobbyist_id, lobbyist_name, filing_year, filing_period, document_url)',
      { keys, notNull: ['contribution_date'], limit: params.limit, cursor: params.cursor },
      (q) => {
        let x = q;
        if (params.q) {
          const t = `"${like(params.q).replace(/%/g, '*')}"`;
          x = x.or(`honoree_name.ilike.${t},contributor_name.ilike.${t},payee_name.ilike.${t}`);
        }
        if (params.from) x = x.gte('contribution_date', params.from);
        if (params.to) x = x.lte('contribution_date', params.to);
        /* A few filings carry mistyped future dates (2046...); leave them out. */
        x = x.lte('contribution_date', new Date().toISOString().slice(0, 10));
        if (params.min_amount != null) x = x.gte('amount', params.min_amount);
        if (cutoff) x = x.lte('report.dt_posted', endOfDay(cutoff));
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => keys.map((k) => r[k]));
    return {
      data: kept.map((r) => ({
        id: `${r.filing_uuid}:${r.item_index}`,
        type: r.contribution_type || null,
        contributor: r.contributor_name || null,
        payee: r.payee_name || null,
        honoree: r.honoree_name || null,
        amount: num(r.amount),
        date: day(r.contribution_date),
        filer: {
          type: r.report?.filer_type || null,
          registrant: {
            id: r.report?.registrant_id ?? null,
            name: r.report?.registrant_name || null,
          },
          lobbyist: r.report?.lobbyist_id
            ? { id: r.report.lobbyist_id, name: r.report.lobbyist_name || null }
            : null,
        },
        report: {
          uuid: r.filing_uuid,
          year: r.report?.filing_year ?? null,
          period: r.report?.filing_period || null,
          posted_at: r.report?.dt_posted || null,
          document_url: r.report?.document_url || null,
        },
      })),
      page,
    };
  },

  'lobbying.ticker': async ({ params, path, cutoff }) => {
    const ticker = tickerId(path.ticker);
    const years = params.lobby_years ?? 3;
    const doc = await insightCache(
      'capitol',
      'lobbying.ticker',
      { ticker, years, cutoff: cutoff || undefined },
      async () => {
        const matches = await readAll(
          'lobbying_client_tickers',
          'client_name, company_label, match_method, verified',
          (q) => q.eq('ticker', ticker),
          ['client_name'],
          500,
        );
        if (!matches.length) return null;
        const cur = new Date().getUTCFullYear();
        const from = cur - years + 1;
        const [filings, awards] = await Promise.all([
          readAll(
            'lobbying_filings',
            'uuid, filing_year, quarter, amount, issues',
            (q) => {
              const x = q
                .in(
                  'client_name',
                  matches.map((m) => m.client_name),
                )
                .gte('filing_year', from)
                .lte('filing_year', cur);
              return cutoff ? x.lte('dt_posted', endOfDay(cutoff)) : x;
            },
            ['uuid'],
            20_000,
          ),
          readAll(
            'company_contract_history',
            'fiscal_year, awarding_agency, total_amount, award_count',
            (q) => q.eq('ticker', ticker).gte('fiscal_year', from).lte('fiscal_year', cur),
            ['fiscal_year', 'awarding_agency'],
            5000,
          ),
        ]);
        const byFy = new Map();
        for (const a of awards) {
          const y = byFy.get(a.fiscal_year) || { fiscal_year: a.fiscal_year, amount: 0, awards: 0 };
          y.amount += num(a.total_amount) ?? 0;
          y.awards += int(a.award_count) ?? 0;
          byFy.set(a.fiscal_year, y);
        }
        const lobbying = spendByPeriod(filings);
        const lobbyingUsd = lobbying.reduce((s, y) => s + y.amount, 0);
        const awardUsd = [...byFy.values()].reduce((s, y) => s + y.amount, 0);
        return {
          ticker,
          company: matches[0].company_label || null,
          clients: matches.map((m) => ({
            name: m.client_name,
            match_method: m.verified ? 'verified' : m.match_method || 'name_exact',
          })),
          lobbying_by_year: lobbying,
          top_issues: issueCounts(filings, 10),
          awards_by_fiscal_year: [...byFy.values()].sort((a, b) => b.fiscal_year - a.fiscal_year),
          totals: {
            from_year: from,
            to_year: cur,
            lobbying_usd: lobbyingUsd,
            award_usd: Math.round(awardUsd),
            award_per_lobbying_dollar: awardsPerLobbyingDollar(awardUsd, lobbyingUsd),
          },
        };
      },
    );
    if (!doc) throw new ApiError(404, 'not_found', 'No lobbying client is matched to that ticker.');
    return { data: doc, meta: { source: SRC.lobbyingAwards } };
  },

  'lobbying.spend_vs_awards': async ({ params }) => {
    const years = params.lobby_years ?? 1;
    const match = params.lobby_match || 'all';
    const sort = params.sort || 'ratio';
    const rows = await insightCache(
      'capitol',
      'lobbying.spend_vs_awards',
      { years, match },
      async () => {
        const { data } = await rpcRows(
          'hub_lobbying_award_ratio',
          { p_years: years, p_include_matched: match === 'all', p_limit: 500 },
          (r) => ({
            ticker: upper(r.ticker),
            company: r.company_label || null,
            client: r.client_name || null,
            match_method: r.match_method || null,
            lobbying_usd: num(r.lobbying),
            awards: int(r.awards),
            award_usd: num(r.award_value),
            award_per_lobbying_dollar: awardsPerLobbyingDollar(r.award_value, r.lobbying),
          }),
        );
        return data;
      },
    );
    const k = {
      ratio: 'award_per_lobbying_dollar',
      award_usd: 'award_usd',
      lobbying_usd: 'lobbying_usd',
    }[sort];
    const ranked = [...rows]
      .sort((a, b) => (b[k] ?? -1) - (a[k] ?? -1) || a.ticker.localeCompare(b.ticker))
      .map((r, i) => ({ rank: i + 1, ...r }));
    return {
      ...top(ranked, params.limit),
      meta: { source: SRC.lobbyingAwards, years, match, sort },
    };
  },

  /* ── Government contracts ─────────────────────────────────────────── */

  'contracts.agencies': async ({ params }) => {
    const keys = ['fiscal_year', 'total_amount', 'awarding_agency'];
    const rows = await readPage(
      'gov_contract_agency_rollup',
      'fiscal_year, awarding_agency, agency_bucket, total_amount, award_count, synced_at',
      { keys, notNull: ['total_amount'], limit: params.limit, cursor: params.cursor },
      (q) => {
        let x = q;
        if (params.agency) x = x.ilike('awarding_agency', like(params.agency));
        if (params.year) x = x.eq('fiscal_year', params.year);
        return x;
      },
    );
    const { rows: kept, page } = pageOf(rows, params.limit, (r) => keys.map((k) => r[k]));
    return {
      data: kept.map((r) => ({
        fiscal_year: r.fiscal_year,
        agency: r.awarding_agency,
        agency_group: r.agency_bucket || null,
        amount: num(r.total_amount),
        awards: int(r.award_count),
      })),
      page,
      meta: { as_of: day(newestDate(kept.map((r) => r.synced_at))) },
    };
  },

  'contracts.ticker': async ({ path, cutoff }) => {
    const ticker = tickerId(path.ticker);
    const doc = await insightCache(
      'capitol',
      'contracts.ticker',
      { ticker, cutoff: cutoff || undefined },
      async () => {
        const [{ data: card }, history, asOf] = await Promise.all([
          rpcDoc('contractor_company_card', { p_ticker: ticker, p_since: null, p_limit: 10 }, id),
          readAll(
            'company_contract_history',
            'ticker, fiscal_year, awarding_agency, total_amount, award_count, synced_at',
            (q) => q.eq('ticker', ticker),
            ['fiscal_year', 'awarding_agency'],
            5000,
          ),
          coverageAsOf(),
        ]);
        if (!history.length && !int(card.awardCount)) return null;
        const byFy = new Map();
        for (const h of history) {
          const y = byFy.get(h.fiscal_year) || {
            fiscal_year: h.fiscal_year,
            amount: 0,
            awards: 0,
            agencies: new Map(),
          };
          y.amount += num(h.total_amount) ?? 0;
          y.awards += int(h.award_count) ?? 0;
          y.agencies.set(h.awarding_agency, num(h.total_amount) ?? 0);
          byFy.set(h.fiscal_year, y);
        }
        const fy = latestCompleteFiscalYear(minDate(asOf, cutoff));
        const [yoy] = awardMomentum(history, fy, { minPrior: 0 });
        return {
          ticker,
          total_usd: num(card.total),
          awards: int(card.awardCount),
          recipients: int(card.recipientCount),
          first_award: day(card.firstDate),
          last_award: day(card.lastDate),
          by_fiscal_year: [...byFy.values()]
            .sort((a, b) => b.fiscal_year - a.fiscal_year)
            .map(({ agencies, ...y }) => {
              const topAgency = [...agencies].sort((a, b) => b[1] - a[1])[0];
              return {
                ...y,
                amount: Math.round(y.amount),
                top_agency: topAgency ? topAgency[0] : null,
                complete: y.fiscal_year <= fy,
              };
            }),
          by_agency: (card.agencies || []).map((a) => ({
            agency: a.agency,
            amount: num(a.amount),
            awards: int(a.n),
          })),
          recipient_names: (card.names || []).map((r) => ({
            name: r.name,
            amount: num(r.amount),
            awards: int(r.n),
          })),
          top_awards: (card.awards || [])
            .filter((a) => !cutoff || !a.date || day(a.date) <= cutoff)
            .map((a) => ({
              id: a.id,
              recipient: a.recipient || null,
              agency: a.agency || null,
              amount: num(a.amount),
              action_date: day(a.date),
            })),
          year_over_year: yoy
            ? {
                fiscal_year: fy,
                latest_usd: yoy.latest_usd,
                prior_usd: yoy.prior_usd,
                change_usd: yoy.change_usd,
                change_pct: yoy.change_pct,
                top_agency: yoy.top_agency,
              }
            : null,
          as_of: day(newestDate(history.map((h) => h.synced_at))),
        };
      },
    );
    if (!doc) throw new ApiError(404, 'not_found', 'No federal awards for that ticker.');
    const { as_of, ...data } = doc;
    return { data, meta: { source: SRC.usaspending, as_of } };
  },

  'contracts.award_momentum': async ({ params, cutoff }) => {
    const sort = params.sort || 'change_pct';
    const direction = params.direction || 'up';
    const asOf = await coverageAsOf();
    const complete = latestCompleteFiscalYear(minDate(asOf, cutoff));
    const fy = params.year ?? complete;
    if (fy > complete) {
      throw new ApiError(
        400,
        'invalid_param',
        `Fiscal year ${fy} is not complete in the data yet; the latest complete year is ${complete}.`,
      );
    }
    const rows = await insightCache('capitol', 'contracts.award_momentum', { fy }, async () => {
      const history = await readAll(
        'company_contract_history',
        'ticker, fiscal_year, awarding_agency, total_amount, award_count',
        (q) => q.in('fiscal_year', [fy - 1, fy]),
        ['ticker', 'fiscal_year', 'awarding_agency'],
      );
      return awardMomentum(history, fy);
    });
    const ranked = sortMomentum(rows, sort, direction).map((r, i) => ({ rank: i + 1, ...r }));
    return {
      ...top(ranked, params.limit),
      meta: {
        source: SRC.usaspending,
        fiscal_year: fy,
        prior_fiscal_year: fy - 1,
        min_prior_year_usd: MOMENTUM_MIN_PRIOR_USD,
        sort,
        direction,
        as_of: asOf,
      },
    };
  },

  'contracts.award_reaction': async ({ params }) => {
    const lim = Math.min(params.limit, 50);
    const rows = await insightCache('capitol', 'contracts.award_reaction', { lim }, async () => {
      const { data } = await rpcRows('hub_award_companies', { p_limit: lim }, (r) => ({
        ticker: upper(r.ticker),
        award_dates: int(r.award_dates),
        award_usd: num(r.award_value),
        avg_move_30d_pct: num(r.avg_move_pct),
        hit_rate: num(r.hit_rate),
        top_agency: r.top_agency || null,
        consistent: !!r.quick_step,
      }));
      return data;
    });
    return { ...top(rows, lim), meta: { source: SRC.awardsPrices } };
  },

  'contracts.trades_near_awards': async ({ params, cutoff }) => {
    const days = params.days ?? 365;
    const near = params.near_days ?? 30;
    const lim = Math.min(params.limit, 100);
    const since = sinceDays(days);
    const rows = await insightCache(
      'capitol',
      'contracts.trades_near_awards',
      { since, near, lim },
      async () => {
        const { data } = await rpcRows(
          'hub_capitol_trades_near_contracts',
          { p_since: since, p_window_days: near, p_limit: lim },
          (r) => ({
            member: member({ bioguide_id: r.bioguide_id, name: r.member_name, party: r.party }),
            ticker: upper(r.ticker),
            trades: int(r.trades),
            first_trade: day(r.first_trade),
            last_trade: day(r.last_trade),
            awards: int(r.awards),
            award_usd: num(r.award_value),
            top_agency: r.top_agency || null,
          }),
        );
        return data;
      },
    );
    /* A pair with any trade after the delay cutoff is hidden whole. */
    const kept = cutoff ? rows.filter((r) => !r.last_trade || r.last_trade <= cutoff) : rows;
    return {
      ...top(kept, lim),
      meta: {
        source: SRC.awardsCongress,
        window_days: days,
        near_days: near,
        as_of: newestDate(kept.map((r) => r.last_trade)),
      },
    };
  },

  'contracts.pre_award_traders': async ({ params }) => {
    const lim = Math.min(params.limit, 50);
    const rows = await insightCache('capitol', 'contracts.pre_award_traders', { lim }, async () => {
      const { data } = await rpcRows('hub_award_readers', { p_limit_per_type: lim }, (r) => ({
        actor: {
          type: r.actor_type,
          id: r.actor_id,
          name: r.actor_name || null,
          detail: r.actor_detail || null,
        },
        trades: int(r.trades),
        trades_before_award: int(r.before_award),
        avg_days_before_award: num(r.avg_lead_days),
        measured_trades: int(r.measured),
        avg_return_30d_pct: num(r.avg_ret_pct),
        hit_rate: num(r.hit_rate),
        best_ticker: upper(r.best_ticker),
        best_return_pct: num(r.best_ret_pct),
        award_usd: num(r.award_value),
        score: num(r.score),
      }));
      return data;
    });
    const kept = params.award_actor
      ? rows.filter((r) => r.actor.type === params.award_actor)
      : rows;
    return {
      data: kept,
      page: { limit: lim, has_more: false, next: null },
      meta: { source: SRC.awardsTraders, window_days: 30, per_actor_type: lim },
    };
  },
};

/* ── shared pieces ──────────────────────────────────────────────────── */

function minDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

/* The date the contract data runs to: the newest fiscal year's sync date
   (the source runs a few months behind), never later than today. */
async function coverageAsOf() {
  const { data, error } = await getAdminClient()
    .from('gov_contract_coverage')
    .select('fiscal_year, synced_at')
    .order('fiscal_year', { ascending: false })
    .limit(1);
  if (error) throw dbError('gov_contract_coverage', error);
  const today = new Date().toISOString().slice(0, 10);
  return minDate(day(data?.[0]?.synced_at), today) || today;
}

async function latestCycle() {
  const { data, error } = await getAdminClient()
    .from('fec_candidate_totals')
    .select('cycle')
    .order('cycle', { ascending: false })
    .limit(1);
  if (error) throw dbError('fec_candidate_totals', error);
  return data?.[0]?.cycle ?? new Date().getUTCFullYear() + (new Date().getUTCFullYear() % 2);
}

function candidateKey(raw) {
  const v = upper(raw);
  if (BIOGUIDE.test(v)) return { col: 'bioguide_id', value: v };
  if (FEC_CANDIDATE.test(v)) return { col: 'candidate_id', value: v };
  throw new ApiError(404, 'not_found', 'No candidate with that id.');
}

async function latestRow(table, select, col, value, cycle) {
  let q = getAdminClient().from(table).select(select).eq(col, value);
  if (cycle) q = q.eq('cycle', cycle);
  const { data, error } = await q.order('cycle', { ascending: false }).limit(1);
  if (error) throw dbError(table, error);
  return data?.[0] || null;
}

async function candidateOf(col, value, cycle) {
  const r = await latestRow(
    'fec_candidate_totals',
    'bioguide_id, candidate_id, name, party, office, state, cycle',
    col,
    value,
    cycle,
  );
  return r
    ? {
        bioguide_id: r.bioguide_id,
        candidate_id: r.candidate_id,
        name: r.name,
        party: r.party,
        office: r.office,
        state: r.state,
        cycle: r.cycle,
      }
    : null;
}

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here. */
export const LIVE_ONLY_RPCS = ['politician_similar'];
