/**
 * Ezana API handlers: cross dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 *
 * The composite reuses the other dimensions' handlers as its section readers
 * (looked up at call time from the merged HANDLERS, so this module does not
 * import ../handlers.js at load and create a cycle).
 */
import {
  ApiError,
  dbError,
  day,
  getAdminClient,
  insightCache,
  newestDate,
  num,
  pathParam,
  sinceDays,
  withTimeout,
} from '../handler-kit';
import {
  confirmation,
  contractToInsider,
  holderChangeSummary,
  insiderNetByTicker,
} from '../insights/cross';

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const SECTION_MS = 2500;

async function all() {
  const mod = await import('../handlers');
  return mod.HANDLERS;
}

/* Run one section reader: null on not-found or empty, 'timeout'/'error' tags
   so the composite can list partial sections. */
async function section(name, fn) {
  try {
    const value = await withTimeout(fn(), SECTION_MS, name);
    return { name, value: value ?? null };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 503))
      return { name, value: null };
    return { name, value: null, partial: true };
  }
}

const firstOrNull = (rows) => (Array.isArray(rows) && rows.length ? rows : null);

async function composite(ticker, cutoff) {
  const H = await all();
  const call = (id, params = {}, path = {}) => H[id]({ params, path, cutoff, key: null });
  const p = { ticker };
  const results = await Promise.all([
    section('congress', async () => {
      const [flow, trades, exposure] = await Promise.allSettled([
        call('congress.insider_flow', { days: 180, min_members: 1, limit: 200 }),
        call('congress.trades', { ticker: [ticker], limit: 5 }),
        call('congress.ticker_committee_exposure', {}, p),
      ]);
      const row = flow.value?.data?.find((r) => r.ticker === ticker) || null;
      const last = trades.value?.data || [];
      const exp = exposure.value?.data || [];
      if (!row && !last.length && !exp.length) return null;
      return {
        flow: row,
        last_trades: last,
        committee_exposure: exp.slice(0, 5),
        as_of: newestDate([row?.last_trade, last[0]?.traded_at]),
        source: 'House Clerk and Senate Office of Public Records',
      };
    }),
    section('lobbying', async () => {
      const r = await call('lobbying.ticker', { lobby_years: 3 }, p);
      const d = r?.data;
      if (!d) return null;
      return {
        lobbying_by_year: d.lobbying_by_year,
        top_issues: d.top_issues,
        totals: d.totals,
        as_of: r.meta?.as_of ?? null,
        source: 'Senate LDA',
      };
    }),
    section('contracts', async () => {
      const r = await call('contracts.ticker', {}, p);
      const d = r?.data;
      if (!d) return null;
      return {
        by_fiscal_year: d.by_fiscal_year,
        year_over_year: d.year_over_year,
        total_usd: d.total_usd,
        as_of: d.as_of ?? r.meta?.as_of ?? null,
        source: 'USAspending',
      };
    }),
    section('institutional', async () => {
      const [holders, whales, activist] = await Promise.allSettled([
        call('institutional.security_holders', { limit: 25 }, p),
        call('institutional.whale_moves', { ticker: [ticker], limit: 5 }),
        call('institutional.activist_stakes', { ticker: [ticker], limit: 5 }),
      ]);
      const h = holders.value?.data || [];
      const w = whales.value?.data || [];
      const a = activist.value?.data || [];
      if (!h.length && !w.length && !a.length) return null;
      return {
        top_holders: h.slice(0, 10),
        holder_changes: holderChangeSummary(h),
        whale_moves: w,
        activist_stakes: a,
        period: holders.value?.meta?.period ?? null,
        as_of: holders.value?.meta?.as_of ?? newestDate([w[0]?.filed_at, a[0]?.filed_at]),
        source: 'SEC EDGAR (13F, 13D/G)',
      };
    }),
    section('insider', async () => {
      const [sum, clusters] = await Promise.allSettled([
        call('insider.issuer_summary', {}, p),
        call('insider.clusters', { days: 90, limit: 200 }),
      ]);
      const s = sum.value?.data;
      const c = clusters.value?.data?.find((r) => r.ticker === ticker) || null;
      if (!s && !c) return null;
      return {
        days_90: s?.days_90 ?? null,
        days_365: s?.days_365 ?? null,
        cluster: c,
        as_of: s?.as_of ?? null,
        source: 'SEC EDGAR (Form 4)',
      };
    }),
    section('etf', async () => {
      const r = await call('etf.exposure', {}, p);
      const rows = firstOrNull(r?.data);
      if (!rows) return null;
      const top = [...rows].sort((x, y) => (num(y.weight_pct) ?? 0) - (num(x.weight_pct) ?? 0));
      return {
        funds_holding: rows.length,
        top_weights: top.slice(0, 5),
        as_of: newestDate(rows.map((x) => x.report_date)),
        source: 'SEC EDGAR (Form N-PORT)',
      };
    }),
    section('patents', async () => {
      const r = await call('patents.momentum', { min_grants: 1, limit: 500 });
      const row = r?.data?.find((x) => x.ticker === ticker) || null;
      if (!row) return null;
      return {
        momentum: row,
        as_of: row.last_grant ?? r.meta?.as_of ?? null,
        source: 'USPTO PatentsView',
      };
    }),
    section('exec_comp', async () => {
      const r = await call('exec_comp.list', { ticker: [ticker], limit: 1 });
      const row = r?.data?.[0];
      if (!row) return null;
      return {
        fiscal_year: row.fiscal_year,
        ceo_total_comp: row.ceo_total_comp,
        ceo_comp_actually_paid: row.ceo_comp_actually_paid,
        company_tsr: row.company_tsr,
        peer_group_tsr: row.peer_group_tsr,
        as_of: row.filed_at ?? null,
        source: 'SEC EDGAR (proxy filings)',
      };
    }),
  ]);
  const sections = Object.fromEntries(results.map((r) => [r.name, r.value]));
  const partial = results.filter((r) => r.partial).map((r) => r.name);
  return {
    data: { ticker, confirmation: confirmation(sections), ...sections },
    meta: {
      source: "Ezana joins over each dimension's public sources (see each section)",
      as_of: newestDate(results.map((r) => r.value?.as_of)),
      ...(partial.length ? { partial } : {}),
    },
  };
}

async function contractInsider({ days, limit, cutoff }) {
  const H = await all();
  const mom = await H['contracts.award_momentum']({
    params: { direction: 'up', sort: 'change_pct', limit: 200 },
    path: {},
    cutoff,
    key: null,
  });
  const end = cutoff || new Date().toISOString().slice(0, 10);
  const since = sinceDays(days, null, new Date(`${end}T00:00:00Z`));
  const rows = [];
  for (let from = 0; from < 20000; from += 1000) {
    let q = getAdminClient()
      .from('sec_insider_transactions')
      .select(
        'issuer_ticker, transaction_code, value_usd, transaction_date, filed_at, accession_no, line_no',
      )
      .in('transaction_code', ['P', 'S'])
      .gte('transaction_date', since)
      .lte('transaction_date', end);
    if (cutoff) q = q.lte('filed_at', cutoff);
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await q
      .order('accession_no')
      .order('line_no')
      .range(from, from + 999);
    if (error) throw dbError('sec_insider_transactions', error);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const net = insiderNetByTicker(
    rows.map((r) => ({ ticker: r.issuer_ticker, code: r.transaction_code, value: r.value_usd })),
  );
  const joined = contractToInsider(mom.data, net);
  return {
    data: joined.slice(0, limit),
    page: { limit, has_more: joined.length > limit, next: null },
    meta: {
      source: 'USAspending and SEC EDGAR (Form 4)',
      as_of: newestDate([...rows.map((r) => day(r.transaction_date)), mom.meta?.as_of]),
      insider_window_days: days,
      fiscal_year: mom.data?.[0]?.fiscal_year ?? null,
    },
  };
}

async function influenceCapital({ limit, cutoff }) {
  const H = await all();
  const spend = await H['lobbying.spend_vs_awards']({
    params: { lobby_years: 1, lobby_match: 'all', sort: 'lobbying_usd', limit },
    path: {},
    cutoff,
    key: null,
  });
  const top = (spend.data || []).filter((r) => r.ticker);
  const joined = await Promise.all(
    top.map(async (r) => {
      try {
        const h = await withTimeout(
          H['institutional.security_holders']({
            params: { limit: 50 },
            path: { ticker: r.ticker },
            cutoff,
            key: null,
          }),
          4000,
          r.ticker,
        );
        return { r, holders: { ...holderChangeSummary(h.data), period: h.meta?.period ?? null } };
      } catch {
        return { r, holders: null };
      }
    }),
  );
  return {
    data: joined.map(({ r, holders }) => ({
      ticker: r.ticker,
      company: r.company,
      lobbying_usd: r.lobbying_usd,
      match_method: r.match_method,
      holders,
    })),
    page: { limit, has_more: false, next: null },
    meta: {
      source: 'Senate LDA and SEC EDGAR (13F)',
      as_of: spend.meta?.as_of ?? null,
      note: 'Correlation only: holder changes are shown beside lobbying spend, not explained by it.',
    },
  };
}

export const HANDLERS = {
  'cross.composite': ({ path, cutoff }) => {
    const ticker = pathParam(String(path.ticker || '').toUpperCase(), TICKER_RE, 'ticker');
    return insightCache('cross', 'cross.composite', { ticker, cutoff }, () =>
      composite(ticker, cutoff),
    );
  },

  'cross.contract_to_insider': ({ params, cutoff }) => {
    const args = { days: params.days ?? 90, limit: params.limit, cutoff };
    return insightCache('cross', 'cross.contract_to_insider', args, () => contractInsider(args));
  },

  'cross.influence_to_capital': ({ params, cutoff }) => {
    const args = { limit: Math.min(params.limit ?? 15, 25), cutoff };
    return insightCache('cross', 'cross.influence_to_capital', args, () => influenceCapital(args));
  },

  'cross.capitol_insider_overlap': ({ params, cutoff }) => {
    const days = params.days ?? 60;
    const limit = Math.min(params.limit ?? 20, 100);
    return insightCache(
      'cross',
      'cross.capitol_insider_overlap',
      { days, limit, cutoff },
      async () => {
        const { data, error } = await getAdminClient().rpc('hub_capitol_insider_overlap', {
          p_days: days,
          p_limit: 100,
        });
        if (error) throw dbError('hub_capitol_insider_overlap', error);
        const rows = (data || [])
          .filter((r) => !cutoff || (day(r.member_date) <= cutoff && day(r.insider_date) <= cutoff))
          .slice(0, limit)
          .map((r) => ({
            ticker: r.ticker,
            member: { bioguide_id: r.bioguide_id, name: r.member_name, party: r.party },
            member_date: day(r.member_date),
            insider: { name: r.insider_name, title: r.insider_title },
            insider_date: day(r.insider_date),
            insider_value: num(r.insider_value),
            days_apart:
              r.member_date && r.insider_date
                ? Math.round(
                    Math.abs(Date.parse(r.member_date) - Date.parse(r.insider_date)) / 86400000,
                  )
                : null,
          }));
        return {
          data: rows,
          page: { limit, has_more: false, next: null },
          meta: {
            source: 'House Clerk, Senate Office of Public Records and SEC EDGAR (Form 4)',
            as_of: newestDate(rows.flatMap((r) => [r.member_date, r.insider_date])),
          },
        };
      },
    );
  },
};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here. */
export const LIVE_ONLY_RPCS = [];
