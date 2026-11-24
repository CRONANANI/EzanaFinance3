/**
 * Ezana API handlers: Alpha Intelligence (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 *
 *   alpha.signals / alpha.signal   the signal registry with readiness gates
 *                                  measured from the database (readCoverage)
 *   alpha.procurement_acceleration company contract history (ticker x FY x
 *                                  agency), evaluated by insights/alpha.js
 *
 * Point in time: the key's delay cutoff is the as-of date for deciding which
 * fiscal years are complete, so a delayed key never sees a year it could not
 * have seen on its cutoff date.
 */
import { ApiError, dbError, getAdminClient, insightCache, pathParam } from '../handler-kit';
import { SIGNALS, signalView } from '../alpha/signals';
import { completeFiscalYears, orderProcurement, procurementAcceleration } from '../insights/alpha';
import { latestCompleteQuarter, priorQuarterEnd } from '@/lib/sec/quarters';

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) =>
  a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 86400000) : null;

async function q(name, promise) {
  const { data, error, count } = await promise;
  if (error) throw dbError(name, error);
  return { data: data || [], count };
}

/* Every row of a filtered query, in pages of 1000 (bounded). */
async function readAll(table, select, apply, order, max = 60000) {
  const admin = getAdminClient();
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    let qb = apply(admin.from(table).select(select));
    for (const k of order) qb = qb.order(k, { ascending: true });
    // eslint-disable-next-line no-await-in-loop
    const { data } = await q(table, qb.range(from, from + 999));
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

const count = (name, apply) =>
  q(name, apply(getAdminClient().from(name).select('*', { count: 'exact', head: true }))).then(
    (r) => r.count ?? 0,
  );

const firstValue = async (table, col, ascending, apply = (x) => x) => {
  const { data } = await q(
    table,
    apply(getAdminClient().from(table).select(col).not(col, 'is', null))
      .order(col, { ascending })
      .limit(1),
  );
  return data[0]?.[col] ?? null;
};

/* ── contract history (shared by coverage and procurement) ─────────── */

/* Cached compactly (agency names indexed, rows as tuples) so the entry stays
   well under the 2 MB data-cache limit; expanded on every read. */
async function loadContractHistory() {
  const packed = await insightCache('alpha', 'contract_history', {}, async () => {
    const rows = await readAll(
      'company_contract_history',
      'ticker, fiscal_year, awarding_agency, award_count, total_amount, synced_at',
      (qb) => qb,
      ['ticker', 'fiscal_year', 'awarding_agency'],
    );
    const agencies = [];
    const index = new Map();
    let synced = null;
    const tuples = rows.map((r) => {
      if (r.synced_at && (!synced || r.synced_at > synced)) synced = r.synced_at;
      const a = r.awarding_agency || '';
      if (!index.has(a)) {
        index.set(a, agencies.length);
        agencies.push(a);
      }
      return [r.ticker, r.fiscal_year, index.get(a), r.award_count, r.total_amount];
    });
    return { agencies, tuples, synced_at: synced };
  });
  return {
    rows: packed.tuples.map(([ticker, fy, a, awards, amount]) => ({
      ticker,
      fiscal_year: fy,
      awarding_agency: packed.agencies[a] || null,
      award_count: awards,
      total_amount: amount,
    })),
    synced_at: packed.synced_at,
  };
}

/* ── coverage: the figures every readiness gate reads ──────────────── */

async function readCoverage(asOf) {
  return insightCache('alpha', 'coverage', { asOf }, async () => {
    const period = latestCompleteQuarter(new Date(`${asOf}T00:00:00Z`));
    const prior = priorQuarterEnd(period);
    const [cur, prev, indexed, insFirst, insLast, lobbyFirst, patents, pmFirst, contracts] =
      await Promise.all([
        readAll('titans_13f_filers', 'cik', (qb) => qb.eq('period', period), ['cik']),
        readAll('titans_13f_filers', 'cik', (qb) => qb.eq('period', prior), ['cik']),
        count('sec_filings', (qb) =>
          qb
            .eq('form_family', 'institutional')
            .eq('period_of_report', period)
            .eq('form_type', '13F-HR'),
        ),
        firstValue('sec_insider_transactions', 'filed_at', true),
        firstValue('sec_insider_transactions', 'filed_at', false),
        firstValue('lobbying_filings', 'filing_year', true),
        count('eyes_patents', (qb) => qb),
        firstValue('prediction_market_snapshots', 'captured_at', true),
        loadContractHistory(),
      ]);
    const prevSet = new Set(prev.map((r) => r.cik));
    const yearNow = Number(asOf.slice(0, 4));
    const pmStart = pmFirst ? String(pmFirst).slice(0, 10) : null;
    return {
      as_of: asOf,
      institutional: {
        period,
        prior_period: prior,
        parsed_filers: cur.length,
        prior_parsed_filers: prev.length,
        comparable_filers: cur.filter((r) => prevSet.has(r.cik)).length,
        indexed_filings: indexed,
      },
      insider: {
        first_filed: insFirst,
        last_filed: insLast,
        span_days: daysBetween(insFirst, insLast),
      },
      contracts: {
        complete_fiscal_years: completeFiscalYears(contracts.rows, asOf),
        synced_at: contracts.synced_at,
      },
      lobbying: {
        first_year: lobbyFirst,
        complete_years: lobbyFirst == null ? 0 : Math.max(0, yearNow - Number(lobbyFirst)),
      },
      patents: { rows: patents },
      predictions: { first_snapshot: pmStart, span_days: daysBetween(pmStart, asOf) },
    };
  });
}

/* ── signal registry ───────────────────────────────────────────────── */

async function signals() {
  const coverage = await readCoverage(today());
  return {
    data: SIGNALS.map((s) => signalView(s, coverage)),
    page: { limit: SIGNALS.length, has_more: false, next: null },
    meta: { as_of: coverage.as_of, coverage },
  };
}

async function signal({ path }) {
  const id = pathParam(path.signal_id, /^[a-z_]{3,60}$/, 'signal');
  const s = SIGNALS.find((x) => x.id === id);
  if (!s) throw new ApiError(404, 'not_found', 'No signal with that id. See /v1/alpha/signals.');
  const coverage = await readCoverage(today());
  return { data: signalView(s, coverage), meta: { as_of: coverage.as_of } };
}

/* ── procurement acceleration ──────────────────────────────────────── */

async function readSectors(tickers) {
  const map = new Map();
  const list = [...tickers];
  for (let i = 0; i < list.length; i += 300) {
    // eslint-disable-next-line no-await-in-loop
    const { data } = await q(
      'ticker_sectors',
      getAdminClient()
        .from('ticker_sectors')
        .select('ticker, sector')
        .in('ticker', list.slice(i, i + 300)),
    );
    for (const r of data) map.set(String(r.ticker).toUpperCase(), r.sector);
  }
  return map;
}

async function procurement({ params, cutoff }) {
  const asOf = cutoff || today();
  const history = await loadContractHistory();
  const complete = completeFiscalYears(history.rows, asOf);
  const latest = complete[complete.length - 1];
  if (latest == null) {
    throw new ApiError(503, 'not_available', 'No complete fiscal year is on file yet.');
  }
  const fiscalYear = params.fiscal_year ?? latest;
  if (!complete.includes(fiscalYear)) {
    throw new ApiError(
      400,
      'invalid_param',
      `"fiscal_year" ${fiscalYear} is not complete as of ${asOf}. Complete years: ${complete.join(', ')}.`,
    );
  }
  const minHistory = params.min_history ?? 5;
  const minBaselineUsd = params.min_baseline_usd ?? 1e6;
  const evaluated = await insightCache(
    'alpha',
    'procurement_acceleration',
    { fiscalYear, minHistory, minBaselineUsd, asOf: complete.join(','), synced: history.synced_at },
    async () => {
      const tickers = new Set(history.rows.map((r) => String(r.ticker).toUpperCase()));
      const sectors = await readSectors(tickers);
      return procurementAcceleration(history.rows, {
        fiscalYear,
        completeYears: complete,
        sectors,
        minHistory,
        minBaselineUsd,
      });
    },
  );
  let rows = evaluated.rows;
  if (params.ticker?.length) {
    const want = new Set(params.ticker.map((t) => t.toUpperCase()));
    rows = rows.filter((r) => want.has(r.entity.ticker));
  }
  if (params.sector) rows = rows.filter((r) => r.entity.sector === params.sector);
  const ordered = orderProcurement(rows, {
    direction: params.direction || 'up',
    sort: params.sort || 'robust_z',
  });
  return {
    data: ordered.slice(0, params.limit),
    page: { limit: params.limit, has_more: ordered.length > params.limit, next: null },
    meta: {
      signal_id: 'procurement_acceleration',
      signal_version: '1.0.0',
      fiscal_year: fiscalYear,
      complete_fiscal_years: complete,
      universe: evaluated.universe,
      excluded: evaluated.excluded,
      matched: ordered.length,
      data_synced_at: history.synced_at,
      data_lineage: [
        {
          source: 'USAspending',
          dataset:
            'Federal contract obligations by recipient, fiscal year and awarding agency, mapped to listed tickers',
          synced_at: history.synced_at,
        },
        { source: 'Ezana', dataset: 'Ticker to sector map' },
      ],
      limitations: SIGNALS.find((s) => s.id === 'procurement_acceleration').limitations,
    },
  };
}

export const HANDLERS = {
  'alpha.signals': signals,
  'alpha.signal': signal,
  'alpha.procurement_acceleration': procurement,
};
