/**
 * Ezana API handlers: titans dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 *
 * 13F, Form 4 and 13D/G routes are delayed: `cutoff` (an ISO date) caps the
 * quarter a key may see (a quarter whose filing deadline passed by the
 * cutoff), the filing dates it may see, and the end of every date window.
 * Two wrapped functions have no as-of argument (confluence) and answer 403
 * to a delayed key instead of leaking newer filings.
 *
 * Executive compensation and ETF holdings are not delayed: they are annual
 * proxy tables and monthly fund portfolio reports, not trading disclosures.
 */
import { ApiError, pageOf, encodeCursor, keysetOr } from '../query';
import {
  getAdminClient,
  readPage,
  rpcRows,
  dbError,
  insightCache,
  num,
  int,
  day,
  upper,
  like,
  endOfDay,
  pathParam,
  newestDate,
} from '../handler-kit';
import {
  currentReportQuarter,
  latestCompleteQuarter,
  priorQuarterEnd,
  dayOffset,
} from '@/lib/sec/quarters';
import { computeFilingProgress } from '@/lib/datasets/institutional/filing-progress-model';
import {
  TICKER_RE,
  CIK_RE,
  padCik,
  holdingChange,
  insiderSummary,
  etfOverlap,
  execCompYears,
  payVsPerformance,
  latestDay,
} from '../insights/titans';

/* ── shared pieces ──────────────────────────────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);
const tickerPath = (v) => pathParam(upper(v), TICKER_RE, 'security');
const cikPath = (v) => padCik(pathParam(v, CIK_RE, 'filer'));
const topPage = (limit) => ({ limit, has_more: false, next: null });
const ratio = (a, b, d = 6) =>
  a == null || !b ? null : Math.round((Number(a) / Number(b)) * 10 ** d) / 10 ** d;

/* A wrapped function with no as-of argument cannot honour a delay. */
function realtimeOnly(cutoff) {
  if (cutoff) {
    throw new ApiError(
      403,
      'not_in_tier',
      'This endpoint needs a key without a data delay. Upgrade the key or use the delayed list endpoints.',
    );
  }
}

/* The 13F quarter to read: the one asked for, else the fallback, never later
   than the newest quarter whose filing deadline passed by the key's cutoff. */
function resolvePeriod(asked, cutoff, fallback) {
  const max = cutoff ? latestCompleteQuarter(cutoff) : null;
  if (asked) {
    if (max && asked > max) {
      throw new ApiError(
        400,
        'invalid_param',
        `"period" is later than this key's data delay allows (latest ${max}).`,
      );
    }
    return asked;
  }
  return max && fallback > max ? max : fallback;
}

async function q(name, promise) {
  const { data, error } = await promise;
  if (error) throw dbError(name, error);
  return data || [];
}

/* Read every row of a filtered query in pages of 1000 (bounded). */
async function readAll(table, select, apply, order, max = 30000) {
  const admin = getAdminClient();
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    let qb = apply(admin.from(table).select(select));
    for (const k of order) qb = qb.order(k, { ascending: true });
    // eslint-disable-next-line no-await-in-loop
    const rows = await q(table, qb.range(from, from + 999));
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ── institutional (13F) ────────────────────────────────────────────── */

async function securityHolders({ params, path, cutoff }) {
  const ticker = tickerPath(path.ticker);
  const period = resolvePeriod(params.period, cutoff, latestCompleteQuarter(new Date()));
  const limit = Math.min(params.limit, 100);
  return insightCache(
    'titans',
    'institutional.security_holders',
    { ticker, period, limit, cutoff },
    async () => {
      const admin = getAdminClient();
      const { data: x, error } = await admin.rpc('titans_security_xray', {
        p_key: ticker,
        p_period: period,
        p_limit: limit,
        p_offset: 0,
      });
      if (error) throw dbError('titans_security_xray', error);
      if (!x || !x.cusip) {
        throw new ApiError(404, 'not_found', `No 13F holders of ${ticker} on file for ${period}.`);
      }
      const ladder = Array.isArray(x.ladder) ? x.ladder : [];
      const ciks = ladder.map((h) => h.cik).filter(Boolean);
      const [now, before, priorFilers] = ciks.length
        ? await Promise.all([
            q(
              'titans_13f_positions',
              admin
                .from('titans_13f_positions')
                .select('cik, shares')
                .eq('period', x.period)
                .eq('cusip', x.cusip)
                .eq('put_call', '')
                .in('cik', ciks),
            ),
            q(
              'titans_13f_positions',
              admin
                .from('titans_13f_positions')
                .select('cik, shares')
                .eq('period', x.prior_period)
                .eq('cusip', x.cusip)
                .eq('put_call', '')
                .in('cik', ciks),
            ),
            q(
              'titans_13f_filers',
              admin
                .from('titans_13f_filers')
                .select('cik')
                .eq('period', x.prior_period)
                .in('cik', ciks),
            ),
          ])
        : [[], [], []];
      const sharesNow = new Map(now.map((r) => [r.cik, num(r.shares)]));
      const sharesPrior = new Map(before.map((r) => [r.cik, num(r.shares)]));
      const filedPrior = new Set(priorFilers.map((r) => r.cik));
      const data = ladder.map((h, i) => {
        const comparable = filedPrior.has(h.cik);
        const shares = sharesNow.get(h.cik) ?? null;
        const prior = comparable ? (sharesPrior.get(h.cik) ?? 0) : null;
        return {
          rank: i + 1,
          filer: { cik: h.cik, name: h.filer_name || null },
          shares,
          value: num(h.value_usd),
          weight: num(h.weight) == null ? null : Math.round(num(h.weight) * 1e6) / 1e6,
          shares_prior: prior,
          change: holdingChange(shares, prior, comparable),
        };
      });
      return {
        data,
        page: topPage(limit),
        meta: {
          security: { ticker: upper(x.ticker), cusip: x.cusip, issuer: x.issuer || null },
          period: day(x.period),
          prior_period: day(x.prior_period),
          holders: int(x.holders_now),
          holders_prior: int(x.holders_prior),
          buyers: int(x.buyers),
          sellers: int(x.sellers),
          new_holders: int(x.new),
          exited_holders: int(x.exited),
          total_value: num(x.value_usd),
          total_shares: num(x.shares),
          as_of: day(x.period),
        },
      };
    },
  );
}

async function filerPortfolio({ params, path, cutoff }) {
  const cik = cikPath(path.cik);
  const admin = getAdminClient();
  let fq = admin
    .from('titans_13f_filers')
    .select('period, cik, filer_name, book, positions, first_filed_at, filed_at')
    .eq('cik', cik);
  if (params.period) fq = fq.eq('period', params.period);
  if (cutoff) fq = fq.lte('first_filed_at', endOfDay(cutoff));
  const [filer] = await q('titans_13f_filers', fq.order('period', { ascending: false }).limit(1));
  if (!filer) {
    throw new ApiError(
      404,
      'not_found',
      params.period
        ? `No 13F book on file for that filer for ${params.period}.`
        : 'No 13F book on file for that filer.',
    );
  }
  const period = day(filer.period);
  const prior = priorQuarterEnd(period);
  let pq = admin
    .from('titans_13f_filers')
    .select('book, positions')
    .eq('period', prior)
    .eq('cik', cik);
  if (cutoff) pq = pq.lte('first_filed_at', endOfDay(cutoff));
  const [priorFiler] = await q('titans_13f_filers', pq.limit(1));
  const keys = ['value_usd', 'cusip', 'put_call'];
  const rows = await readPage(
    'titans_13f_positions',
    'cusip, ticker, issuer, put_call, shares, value_usd',
    { keys, limit: params.limit, cursor: params.cursor },
    (qb) => qb.eq('period', period).eq('cik', cik),
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => keys.map((k) => r[k]));
  const priorMap = new Map();
  if (priorFiler && kept.length) {
    const cusips = [...new Set(kept.map((r) => r.cusip))];
    for (const part of chunk(cusips, 100)) {
      // eslint-disable-next-line no-await-in-loop
      const prev = await q(
        'titans_13f_positions',
        admin
          .from('titans_13f_positions')
          .select('cusip, put_call, shares, value_usd')
          .eq('period', prior)
          .eq('cik', cik)
          .in('cusip', part),
      );
      for (const p of prev) priorMap.set(`${p.cusip}|${p.put_call}`, p);
    }
  }
  const book = num(filer.book);
  return {
    data: kept.map((r) => {
      const p = priorFiler ? priorMap.get(`${r.cusip}|${r.put_call}`) : null;
      const sharesPrior = priorFiler ? (num(p?.shares) ?? 0) : null;
      return {
        ticker: upper(r.ticker),
        cusip: r.cusip,
        issuer: r.issuer || null,
        put_call: r.put_call || null,
        shares: num(r.shares),
        value: num(r.value_usd),
        weight: ratio(r.value_usd, book),
        shares_prior: sharesPrior,
        value_prior: priorFiler ? (num(p?.value_usd) ?? 0) : null,
        change: holdingChange(r.shares, sharesPrior, !!priorFiler),
      };
    }),
    page,
    meta: {
      filer: { cik, name: filer.filer_name || null },
      period,
      prior_period: prior,
      filed_at: day(filer.filed_at),
      book,
      positions: int(filer.positions),
      prior_book: priorFiler ? num(priorFiler.book) : null,
      prior_filed: !!priorFiler,
      as_of: day(filer.filed_at),
    },
  };
}

async function fundTwins({ params, path, cutoff }) {
  const cik = cikPath(path.cik);
  const period = resolvePeriod(params.period, cutoff, latestCompleteQuarter(new Date()));
  return insightCache('titans', 'institutional.fund_twins', { cik, period, cutoff }, async () => {
    const admin = getAdminClient();
    const [filer] = await q(
      'titans_13f_filers',
      admin
        .from('titans_13f_filers')
        .select('cik, filer_name, book')
        .eq('period', period)
        .eq('cik', cik)
        .limit(1),
    );
    if (!filer) {
      throw new ApiError(404, 'not_found', `No 13F book on file for that filer for ${period}.`);
    }
    const { data, error } = await admin.rpc('titans_fund_twins', { p_cik: cik, p_period: period });
    if (error) throw dbError('titans_fund_twins', error);
    const twins = Array.isArray(data) ? data : [];
    return {
      data: twins.map((t) => ({
        filer: { cik: t.cik, name: t.filer_name || null },
        book: num(t.book),
        overlap: num(t.overlap) == null ? null : Math.round(num(t.overlap) * 1e4) / 1e4,
        shared_positions: int(t.shared),
        shared_tickers: (t.shared_tickers || []).map(upper),
        only_this_fund: (t.only_a || []).map(upper),
        only_twin: (t.only_b || []).map(upper),
      })),
      page: topPage(3),
      meta: {
        filer: { cik, name: filer.filer_name || null, book: num(filer.book) },
        period,
        as_of: period,
      },
    };
  });
}

async function filingProgress({ cutoff }) {
  const asOf = cutoff || today();
  const period = currentReportQuarter(asOf);
  const prior = priorQuarterEnd(period);
  const offset = dayOffset(period, asOf);
  return insightCache(
    'titans',
    'institutional.filing_progress',
    { asOf, cutoff, period },
    async () => {
      const admin = getAdminClient();
      const [p, c] = await Promise.all([
        admin.rpc('thirteen_f_filing_progress', {
          p_period: period,
          p_prior: prior,
          p_day_offset: offset,
        }),
        admin.rpc('titans_filing_curve', { p_period: period }),
      ]);
      if (p.error) throw dbError('thirteen_f_filing_progress', p.error);
      if (c.error) throw dbError('titans_filing_curve', c.error);
      const r = (Array.isArray(p.data) ? p.data[0] : p.data) || {};
      const curve = c.data || {};
      const pts = (xs) => (Array.isArray(xs) ? xs : []).map((d) => [int(d?.[0]), int(d?.[1])]);
      let open = pts(curve.open);
      let filed = int(r.filed) || 0;
      if (cutoff) {
        /* As of the cutoff: the curve up to that day, and its last point as
           the filed count (filers first seen by then). */
        open = open.filter(([d]) => d <= offset);
        filed = open.length ? open[open.length - 1][1] : 0;
      }
      const g = computeFilingProgress({
        period,
        prior,
        now: asOf,
        counts: {
          filed,
          expected: int(r.expected) || 0,
          priorFiledByOffset: int(r.prior_filed_by_offset) || 0,
          priorCoverageStart: r.prior_coverage_start || null,
        },
      });
      const movers = (curve.early_movers || []).filter(
        (m) => !cutoff || (m.filed_at && day(m.filed_at) <= cutoff),
      );
      const round4 = (v) => (v == null ? null : Math.round(v * 1e4) / 1e4);
      return {
        data: {
          period,
          prior_period: prior,
          deadline: g.deadline,
          days_left: g.daysLeft,
          day: g.dayOffset,
          closed: g.closed,
          filed: g.filed,
          expected: g.expected,
          pct_filed: round4(g.pct),
          prior_pct_by_same_day: round4(g.pacingPct),
          pace: g.pacing,
          curve: {
            this_quarter: open,
            prior_quarter: pts(curve.prior),
            prior_final: int(curve.prior_final),
          },
          early_filers: movers.map((m) => ({
            filer: { cik: m.cik, name: m.filer_name || null },
            filed_at: day(m.filed_at),
            book: num(m.value_usd),
            positions: int(m.positions),
          })),
        },
        meta: { as_of: cutoff ? asOf : day(r.last_ingested_at) || asOf },
      };
    },
  );
}

async function confluence({ params, cutoff }) {
  realtimeOnly(cutoff);
  const days = params.days ?? 90;
  const limit = Math.min(params.limit, 100);
  return insightCache('titans', 'institutional.confluence', { days, limit }, async () => {
    const out = await rpcRows('hub_titans_confluence', { p_days: days, p_limit: limit }, (r) => ({
      ticker: upper(r.ticker),
      whale_filers: int(r.whale_filers),
      whale_value: num(r.whale_value),
      latest_quarter: r.latest_quarter || null,
      insider_buys: int(r.insider_buys),
      insider_buy_value: num(r.insider_buy_value),
      insider_sells: int(r.insider_sells),
      activist_stakes: int(r.activist_stakes),
      congress_buys: int(r.congress_buys),
      signals: int(r.signals),
    }));
    return { ...out, page: topPage(limit), meta: { days, as_of: today() } };
  });
}

/* ── insider (Form 4) ───────────────────────────────────────────────── */

const rolesOf = (b) =>
  [b.officer && 'officer', b.director && 'director', b.ten_pct_owner && 'ten_pct_owner'].filter(
    Boolean,
  );

async function insiderClusters({ params, cutoff }) {
  const days = Math.min(params.days ?? 90, 730);
  const span = params.span_days ?? 30;
  const minInsiders = params.min_insiders ?? 2;
  const limit = params.limit;
  return insightCache(
    'titans',
    'insider.clusters',
    { days, span, minInsiders, limit, cutoff },
    async () => {
      /* p_cutoff is passed only when it applies, so an undelayed key still
         works against the earlier four-argument version of the function. */
      const args = {
        p_days: days,
        p_span_days: span,
        p_min_insiders: minInsiders,
        p_limit: limit,
        ...(cutoff ? { p_cutoff: cutoff } : {}),
      };
      const out = await rpcRows('api_insider_clusters', args, (r) => ({
        ticker: upper(r.ticker),
        issuer: r.issuer || null,
        insiders: int(r.insiders),
        officers: int(r.officers),
        directors: int(r.directors),
        total_value: num(r.total_usd),
        first_buy: day(r.first_buy),
        last_buy: day(r.last_buy),
        span_days: int(r.span_days),
        buyers: (Array.isArray(r.buyers) ? r.buyers : []).map((b) => ({
          name: b.name || null,
          title: b.title || null,
          roles: rolesOf(b),
          value: num(b.value_usd),
          first_buy: day(b.first_buy),
          last_buy: day(b.last_buy),
        })),
      }));
      return {
        ...out,
        page: topPage(limit),
        meta: {
          days,
          span_days: span,
          min_insiders: minInsiders,
          as_of: newestDate(out.data.map((r) => r.last_buy)) || cutoff || today(),
        },
      };
    },
  );
}

const TX_SELECT =
  'accession_no, table_kind, line_no, filed_at, issuer_cik, issuer_name, issuer_ticker, reporter_cik, reporter_name, reporter_title, is_director, is_officer, is_ten_pct_owner, security_title, transaction_date, transaction_code, acquired_disposed, shares, price, value_usd';

async function issuerSummary({ path, cutoff }) {
  const ticker = tickerPath(path.ticker);
  const anchor = cutoff || today();
  return insightCache('titans', 'insider.issuer_summary', { ticker, anchor, cutoff }, async () => {
    const admin = getAdminClient();
    const since = new Date(Date.parse(`${anchor}T00:00:00Z`) - 365 * 86400000)
      .toISOString()
      .slice(0, 10);
    let flowQ = admin
      .from('sec_insider_transactions')
      .select(TX_SELECT)
      .eq('issuer_ticker', ticker)
      .eq('table_kind', 'non_derivative')
      .in('transaction_code', ['P', 'S'])
      .gte('transaction_date', since)
      .lte('transaction_date', anchor);
    let recentQ = admin
      .from('sec_insider_transactions')
      .select(TX_SELECT)
      .eq('issuer_ticker', ticker);
    if (cutoff) {
      flowQ = flowQ.lte('filed_at', cutoff);
      recentQ = recentQ.lte('filed_at', cutoff);
    }
    const [flow, recent] = await Promise.all([
      q('sec_insider_transactions', flowQ.limit(5000)),
      q(
        'sec_insider_transactions',
        recentQ
          .not('transaction_date', 'is', null)
          .order('transaction_date', { ascending: false })
          .order('filed_at', { ascending: false })
          .order('accession_no', { ascending: false })
          .order('line_no', { ascending: true })
          .limit(10),
      ),
    ]);
    if (!flow.length && !recent.length) {
      throw new ApiError(404, 'not_found', `No Form 4 transactions on file for ${ticker}.`);
    }
    const s = insiderSummary(
      flow.map((t) => ({
        transaction_date: t.transaction_date,
        code: t.transaction_code,
        value: t.value_usd,
        is_officer: t.is_officer,
        is_director: t.is_director,
        is_ten_pct_owner: t.is_ten_pct_owner,
      })),
      anchor,
    );
    const any = recent[0] || flow[0];
    return {
      data: {
        ticker,
        issuer: { cik: any.issuer_cik || null, name: any.issuer_name || null },
        as_of: anchor,
        days_90: s.days_90,
        days_365: s.days_365,
        recent: recent.map((t) => ({
          id: `${t.accession_no}:${t.table_kind}:${t.line_no}`,
          filed_at: day(t.filed_at),
          transaction_date: day(t.transaction_date),
          insider: {
            cik: t.reporter_cik,
            name: t.reporter_name,
            title: t.reporter_title,
            is_director: !!t.is_director,
            is_officer: !!t.is_officer,
            is_ten_pct_owner: !!t.is_ten_pct_owner,
          },
          security: t.security_title,
          code: t.transaction_code,
          acquired_disposed: t.acquired_disposed,
          shares: num(t.shares),
          price: num(t.price),
          value: num(t.value_usd),
        })),
      },
      meta: { as_of: latestDay([...flow, ...recent].map((t) => t.filed_at)) || anchor },
    };
  });
}

/* ── executive compensation ─────────────────────────────────────────── */

const EC_SELECT =
  'cik, fiscal_year, peo_key, ticker, entity_name, peo_name, peo_total_comp, peo_comp_actually_paid, non_peo_neo_avg_total_comp, non_peo_neo_avg_comp_actually_paid, company_tsr, peer_group_tsr, net_income, company_selected_measure_name, company_selected_measure_value, accession_no, filed_at';

function execCompFilters(params) {
  return (qb) => {
    let x = qb;
    if (params.ticker) x = x.in('ticker', params.ticker);
    if (params.year) x = x.eq('fiscal_year', params.year);
    if (params.q) x = x.ilike('entity_name', like(params.q));
    return x;
  };
}

async function execCompList({ params }) {
  /* Rows are one per company, year and CEO; a page is whole company-years.
     The read takes up to eight rows per company-year and drops a last group
     the read may have cut short. */
  const admin = getAdminClient();
  const max = Math.min(1000, (params.limit + 1) * 8);
  let qb = execCompFilters(params)(admin.from('sec_exec_comp').select(EC_SELECT));
  if (params.cursor) qb = qb.or(keysetOr(['fiscal_year', 'cik'], params.cursor));
  const rows = await q(
    'sec_exec_comp',
    qb
      .order('fiscal_year', { ascending: false })
      .order('cik', { ascending: false })
      .order('peo_key', { ascending: true })
      .limit(max),
  );
  let groups = execCompYears(rows);
  const truncated = rows.length === max;
  if (truncated && groups.length > 1) groups = groups.slice(0, -1);
  const has_more = truncated || groups.length > params.limit;
  const kept = groups.slice(0, params.limit);
  const last = kept[kept.length - 1];
  return {
    data: kept,
    page: {
      limit: params.limit,
      has_more,
      next: has_more && last ? encodeCursor([last.fiscal_year, last.cik]) : null,
    },
    meta: { as_of: latestDay(kept.map((r) => r.filed_at)) },
  };
}

async function payVsPerf({ params }) {
  const sort = params.sort || 'gap';
  const direction = params.direction || 'up';
  const tickers = params.ticker || null;
  const limit = params.limit;
  return insightCache(
    'titans',
    'exec_comp.pay_vs_performance',
    { tickers: tickers ? tickers.join(',') : undefined, sort, direction, limit },
    async () => {
      const rows = await readAll(
        'sec_exec_comp',
        EC_SELECT,
        (qb) => (tickers ? qb.in('ticker', tickers) : qb),
        ['cik', 'fiscal_year', 'peo_key'],
      );
      const data = payVsPerformance(rows, { sort, direction, limit, minYears: 3 });
      return {
        data,
        page: topPage(limit),
        meta: {
          sort,
          direction,
          companies_read: new Set(rows.map((r) => r.cik)).size,
          as_of: latestDay(rows.map((r) => r.filed_at)),
        },
      };
    },
  );
}

/* ── ETF holdings ───────────────────────────────────────────────────── */

const FUND_SELECT = 'series_id, ticker, fund_name, net_assets, holdings_count, report_date';
const fundOut = (f) => ({
  ticker: upper(f.ticker),
  name: f.fund_name || null,
  series_id: f.series_id,
  net_assets: num(f.net_assets),
  holdings_count: int(f.holdings_count),
  report_date: day(f.report_date),
});

async function etfFunds() {
  return q(
    'sec_etf_funds',
    getAdminClient()
      .from('sec_etf_funds')
      .select(FUND_SELECT)
      .eq('status', 'ok')
      .order('net_assets', { ascending: false, nullsFirst: false })
      .order('series_id', { ascending: true })
      .limit(500),
  );
}

async function etfByTicker(raw) {
  const t = upper(raw);
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(String(t || '')))
    throw new ApiError(404, 'not_found', 'No tracked ETF with that ticker.');
  const [f] = await q(
    'sec_etf_funds',
    getAdminClient()
      .from('sec_etf_funds')
      .select(FUND_SELECT)
      .eq('status', 'ok')
      .eq('ticker', t)
      .limit(1),
  );
  if (!f) throw new ApiError(404, 'not_found', `${t} is not a tracked ETF.`);
  return f;
}

const HOLDING_SELECT =
  'series_id, report_date, line_no, name, title, cusip, isin, ticker, balance, units, value_usd, pct_value, asset_category, issuer_category, country';

async function etfList({ params }) {
  const funds = await etfFunds();
  const kept = funds.slice(0, params.limit);
  return {
    data: kept.map(fundOut),
    page: topPage(params.limit),
    meta: { funds: funds.length, as_of: latestDay(funds.map((f) => f.report_date)) },
  };
}

async function etfHoldings({ params, path }) {
  const f = await etfByTicker(path.ticker);
  const keys = ['value_usd', 'line_no'];
  const rows = await readPage(
    'sec_etf_holdings',
    HOLDING_SELECT,
    { keys, notNull: ['value_usd'], limit: params.limit, cursor: params.cursor },
    (qb) => qb.eq('series_id', f.series_id).eq('report_date', f.report_date),
  );
  const { rows: kept, page } = pageOf(rows, params.limit, (r) => keys.map((k) => r[k]));
  return {
    data: kept.map((h) => ({
      name: h.name || null,
      title: h.title || null,
      ticker: upper(h.ticker),
      cusip: h.cusip && !/^0+$/.test(h.cusip) ? h.cusip : null,
      isin: h.isin || null,
      balance: num(h.balance),
      units: h.units || null,
      value: num(h.value_usd),
      weight_pct: num(h.pct_value),
      asset_category: h.asset_category || null,
      issuer_category: h.issuer_category || null,
      country: h.country || null,
    })),
    page,
    meta: { etf: fundOut(f), report_date: day(f.report_date), as_of: day(f.report_date) },
  };
}

async function etfExposure({ path }) {
  const ticker = tickerPath(path.ticker);
  return insightCache('titans', 'etf.exposure', { ticker }, async () => {
    const admin = getAdminClient();
    const funds = new Map((await etfFunds()).map((f) => [f.series_id, f]));
    const byTicker = await q(
      'sec_etf_holdings',
      admin.from('sec_etf_holdings').select(HOLDING_SELECT).eq('ticker', ticker).limit(1000),
    );
    const cusips = [
      ...new Set(
        byTicker.map((h) => h.cusip).filter((c) => c && /^[0-9A-Z]{9}$/.test(c) && !/^0+$/.test(c)),
      ),
    ];
    const byCusip = cusips.length
      ? await q(
          'sec_etf_holdings',
          admin.from('sec_etf_holdings').select(HOLDING_SELECT).in('cusip', cusips).limit(1000),
        )
      : [];
    const per = new Map();
    const seen = new Set();
    for (const h of [...byTicker, ...byCusip]) {
      const id = `${h.series_id}|${h.report_date}|${h.line_no}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const f = funds.get(h.series_id);
      if (!f || day(h.report_date) !== day(f.report_date)) continue;
      const cur = per.get(h.series_id) || { f, weight: 0, value: 0, balance: 0 };
      cur.weight += num(h.pct_value) || 0;
      cur.value += num(h.value_usd) || 0;
      cur.balance += num(h.balance) || 0;
      per.set(h.series_id, cur);
    }
    const data = [...per.values()]
      .sort((a, b) => b.weight - a.weight || b.value - a.value)
      .map((x) => ({
        etf: { ticker: upper(x.f.ticker), name: x.f.fund_name || null },
        weight_pct: Math.round(x.weight * 1e6) / 1e6,
        value: Math.round(x.value * 100) / 100,
        balance: x.balance,
        report_date: day(x.f.report_date),
      }));
    return {
      data,
      page: topPage(data.length),
      meta: {
        ticker,
        funds_holding: data.length,
        funds_tracked: funds.size,
        total_value: Math.round(data.reduce((s, r) => s + r.value, 0) * 100) / 100,
        as_of: latestDay(data.map((r) => r.report_date)),
      },
    };
  });
}

async function etfOverlapRoute({ params }) {
  if (!params.a || !params.b) {
    throw new ApiError(400, 'invalid_param', 'Pass two ETF tickers as "a" and "b".');
  }
  const a = upper(params.a);
  const b = upper(params.b);
  if (a === b) throw new ApiError(400, 'invalid_param', '"a" and "b" must be different ETFs.');
  return insightCache('titans', 'etf.overlap', { a, b }, async () => {
    const [fa, fb] = await Promise.all([etfByTicker(a), etfByTicker(b)]);
    const read = (f) =>
      readAll(
        'sec_etf_holdings',
        'line_no, name, cusip, isin, ticker, pct_value',
        (qb) => qb.eq('series_id', f.series_id).eq('report_date', f.report_date),
        ['line_no'],
      );
    const [ha, hb] = await Promise.all([read(fa), read(fb)]);
    const shape = (rows) => rows.map((h) => ({ ...h, weight: num(h.pct_value) }));
    const o = etfOverlap(shape(ha), shape(hb), { top: 10 });
    const side = (f, n) => ({
      ticker: upper(f.ticker),
      name: f.fund_name || null,
      report_date: day(f.report_date),
      holdings: n,
    });
    return {
      data: {
        a: side(fa, o.holdings_a),
        b: side(fb, o.holdings_b),
        overlap_pct: o.overlap_pct,
        shared_holdings: o.shared_holdings,
        top_shared: o.top_shared,
      },
      meta: { as_of: latestDay([fa.report_date, fb.report_date]) },
    };
  });
}

export const HANDLERS = {
  'institutional.security_holders': securityHolders,
  'institutional.filer_portfolio': filerPortfolio,
  'institutional.fund_twins': fundTwins,
  'institutional.filing_progress': filingProgress,
  'institutional.confluence': confluence,
  'insider.clusters': insiderClusters,
  'insider.issuer_summary': issuerSummary,
  'exec_comp.list': execCompList,
  'exec_comp.pay_vs_performance': payVsPerf,
  'etf.funds': etfList,
  'etf.holdings': etfHoldings,
  'etf.exposure': etfExposure,
  'etf.overlap': etfOverlapRoute,
};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here.
   Every function above is created by a migration:
     titans_security_xray, titans_fund_twins, titans_filing_curve
       20261022120000_titans_institutional_snapshot_v2.sql
     thirteen_f_filing_progress  20261023200000_thirteen_f_filing_progress.sql
     hub_titans_confluence       20261006000900_dimension_hubs.sql
     api_insider_clusters        20261026190100_api_insider_clusters.sql */
export const LIVE_ONLY_RPCS = [];
