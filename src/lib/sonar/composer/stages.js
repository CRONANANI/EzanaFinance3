/**
 * Typed intermediate results for multi-stage research (Nov 28 2026). Pure, no imports.
 *
 * A cross-dataset screen ("companies Congress bought, that won new federal contracts, whose
 * institutional ownership rose") is a chain: each stage reads one dataset for the universe
 * the previous stage verified and passes on only the companies that survived it. Before
 * this module the chain had no carrier: the dataset planner could not run contracts or 13F
 * reads without tickers, the composer refused a screen without a sector, and the only
 * ticker-free congressional source was a chamber-wide aggregate. Nothing carried the
 * congressional universe forward, so every downstream stage was "unmet".
 *
 * A stage result records, for every company it passes forward:
 *   securityId   canonical id: cik:<CIK> when known, else cusip:<CUSIP>, else ticker:<T>
 *   ticker, cik, name
 *   value        the measure this stage computed (null when it had no data)
 * and for the stage itself:
 *   status       ok | partial | empty | failed | skipped
 *   asOf         the latest date the stage's data covers (ISO date)
 *   period       { from, to } the stage read
 *   coverage     { requested, covered, missing } companies asked about, with data, without
 *   lineage      [{ source, table, filter, asOf }]  where every value came from
 *   downstream   { tickers, since, until }  the parameters the next stage needs
 *   reason       why a stage is empty, failed or skipped (required for those states)
 *
 * An empty or failed stage stops the chain explicitly: every later stage is recorded as
 * skipped with the upstream reason, so a report can say where the funnel ended and why.
 * Nothing is fabricated: a company without a value is "no data", never passed or failed.
 */

export const STAGE_STATUSES = ['ok', 'partial', 'empty', 'failed', 'skipped'];

/** Event sources that can seed a universe from dated records (no sector needed). */
export const SEED_SOURCES = {
  congress: {
    table: 'congress_trades',
    label: 'Companies members of Congress bought',
    measure: 'congress_holders',
  },
  insider: {
    table: 'sec_insider_transactions',
    label: 'Companies with insider open-market purchases',
    measure: 'insider_buying',
  },
  contracts: {
    table: 'contract_awards_resolved',
    label: 'Companies awarded new federal contracts',
    measure: 'gov_contract_value',
  },
};

const clean = (t) =>
  String(t || '')
    .trim()
    .toUpperCase();

/** Canonical security id: CIK, then CUSIP, then the ticker (labelled, never mixed). */
export function securityId({ cik = null, cusip = null, ticker = null } = {}) {
  const c = String(cik ?? '').replace(/^0+/, '');
  if (c && /^\d+$/.test(c)) return `cik:${c}`;
  if (cusip && /^[0-9A-Z]{8,9}$/i.test(String(cusip)))
    return `cusip:${String(cusip).toUpperCase()}`;
  const t = clean(ticker);
  return t ? `ticker:${t}` : null;
}

/** One company row in a stage. */
export function stageRow({ ticker, cik = null, cusip = null, name = null, value = null }) {
  const t = clean(ticker);
  if (!t) throw new Error('stageRow: a ticker is required');
  const v = value == null || value === '' ? null : Number(value);
  return {
    securityId: securityId({ cik, cusip, ticker: t }),
    ticker: t,
    cik: cik == null ? null : String(cik),
    name: name || null,
    value: Number.isFinite(v) ? v : null,
  };
}

/**
 * A validated, frozen stage result. Throws on a malformed one so a broken stage fails
 * loudly in tests rather than passing an unverified universe on.
 */
export function stageResult({
  stage,
  source,
  status,
  rows = [],
  asOf = null,
  period = null,
  coverage = null,
  lineage = [],
  downstream = null,
  reason = null,
  measure = null,
}) {
  if (!stage) throw new Error('stageResult: stage is required');
  if (!STAGE_STATUSES.includes(status)) throw new Error(`stageResult: bad status ${status}`);
  if (status !== 'ok' && status !== 'partial' && !reason)
    throw new Error(`stageResult: a ${status} stage needs a reason`);
  if ((status === 'ok' || status === 'partial') && !rows.length)
    throw new Error('stageResult: an ok stage with no rows is empty');
  if ((status === 'ok' || status === 'partial') && !lineage.length)
    throw new Error('stageResult: every value needs lineage');
  const seen = new Set();
  const unique = [];
  for (const r of rows) {
    if (!r?.securityId) throw new Error('stageResult: rows must come from stageRow');
    if (seen.has(r.securityId)) continue;
    seen.add(r.securityId);
    unique.push(r);
  }
  const requested = coverage?.requested ?? unique.length;
  const covered = coverage?.covered ?? unique.filter((r) => r.value != null).length;
  return Object.freeze({
    stage,
    source: source || null,
    measure,
    status,
    rows: Object.freeze(unique),
    asOf,
    period,
    coverage: Object.freeze({
      requested,
      covered,
      missing: coverage?.missing ?? Math.max(0, requested - covered),
    }),
    lineage: Object.freeze([...lineage]),
    downstream: Object.freeze({
      tickers: unique.map((r) => r.ticker),
      since: downstream?.since ?? period?.from ?? null,
      until: downstream?.until ?? period?.to ?? null,
    }),
    reason,
  });
}

/** An explicit empty result: the stage ran and nothing qualified. */
export const emptyStage = (stage, source, reason, extra = {}) =>
  stageResult({ stage, source, status: 'empty', reason, ...extra });

/** An explicit failure: the stage could not run (a read error, a missing table). */
export const failedStage = (stage, source, reason, extra = {}) =>
  stageResult({ stage, source, status: 'failed', reason, ...extra });

/** The verified universe a stage hands to the next one (only ok or partial stages). */
export function nextUniverse(result) {
  if (!result || (result.status !== 'ok' && result.status !== 'partial')) return [];
  return result.rows.map((r) => ({ ticker: r.ticker, cik: r.cik, name: r.name }));
}

/**
 * Run stages in order. Each stage is { id, source, run(universe, prev) => stageResult }.
 * The first stage gets `initial` (may be empty for a seed stage). A stage that throws is
 * recorded as failed; an empty or failed stage stops the chain and every later stage is
 * recorded as skipped with the upstream reason. Returns { stages, final, stoppedAt }.
 */
export async function runStageChain(stages, { initial = [] } = {}) {
  const out = [];
  let universe = initial;
  let prev = null;
  let stoppedAt = null;
  for (const s of stages) {
    if (stoppedAt) {
      out.push(
        stageResult({
          stage: s.id,
          source: s.source,
          status: 'skipped',
          reason: `not run: stage ${stoppedAt.stage} was ${stoppedAt.status} (${stoppedAt.reason})`,
        }),
      );
      continue;
    }
    let r;
    try {
      // eslint-disable-next-line no-await-in-loop
      r = await s.run(universe, prev);
      if (!r || !STAGE_STATUSES.includes(r.status))
        throw new Error('stage returned no stage result');
    } catch (e) {
      r = failedStage(s.id, s.source, String(e?.message || e).slice(0, 200));
    }
    out.push(r);
    if (r.status === 'empty' || r.status === 'failed') {
      stoppedAt = r;
      continue;
    }
    prev = r;
    universe = nextUniverse(r);
  }
  return { stages: out, final: stoppedAt ? null : prev, stoppedAt };
}

/**
 * Keep the rows of `universe` whose value passes `test`; rows without a value are "no
 * data" (counted in coverage, never passed). A pure filter stage builder.
 */
export function filterStage({
  stage,
  source,
  measure,
  universe,
  values,
  test = null,
  passed = null,
  asOf = null,
  period = null,
  lineage,
  emptyReason,
}) {
  const rows = [];
  let covered = 0;
  for (const u of universe) {
    const v = values[u.ticker];
    if (v == null) continue;
    covered += 1;
    if (passed ? passed.has(u.ticker) : test(v)) rows.push(stageRow({ ...u, value: v }));
  }
  const coverage = { requested: universe.length, covered, missing: universe.length - covered };
  if (!rows.length)
    return emptyStage(
      stage,
      source,
      covered
        ? emptyReason || `none of ${covered} companies with data passed`
        : `no ${measure} data for any of ${universe.length} companies`,
      { measure, coverage, asOf, period, lineage },
    );
  return stageResult({
    stage,
    source,
    measure,
    status: covered < universe.length ? 'partial' : 'ok',
    rows,
    asOf,
    period,
    coverage,
    lineage,
  });
}

/**
 * Which stage seeds a screen without a named universe: the first filter whose source can
 * list companies from dated records. Returns { seed, rest } or { seed: null, reason }.
 */
/* Measure source -> seed source. Only dated records seed: contracts seed through the
   windowed measure (awards signed in the window), never the fiscal-year vintage, whose
   period differs from the screen window. */
const SEED_FOR_SOURCE = { congress: 'congress', insider: 'insider', contracts_window: 'contracts' };

export function planSeed(filters = [], measures = {}) {
  for (let i = 0; i < filters.length; i += 1) {
    const src = SEED_FOR_SOURCE[measures[filters[i].metric]?.source];
    if (src && (filters[i].op === 'exists' || filters[i].op === '>'))
      return { seed: { ...filters[i], source: src }, rest: filters.filter((_, k) => k !== i) };
  }
  return {
    seed: null,
    rest: filters,
    reason:
      'The screen names no sector or companies, and none of its conditions can list companies on its own (congressional purchases, insider purchases or new federal contracts can).',
  };
}

/**
 * The verified universe a composed screen hands to the dataset planner: the companies that
 * passed every stage, capped, with the stage chain as lineage. Without it the planner
 * reports contracts, 13F and per-company congressional sources as "unmet: tickers" for a
 * question that names no company. Null when there is no completed screen with rows.
 */
export function universeFromComposition(composition, { max = 12 } = {}) {
  for (const r of composition?.results || []) {
    if (r?.capability !== 'financial-screen' || r.status !== 'done' || !r.table?.length) continue;
    const tickers = r.table
      .map((t) => clean(t.ticker))
      .filter(Boolean)
      .slice(0, max);
    if (!tickers.length) continue;
    return {
      tickers,
      names: {},
      label: `the ${tickers.length} companies that passed the screen`,
      basis: 'screen',
      lineage: (r.stages || []).map((s) => `${s.stage}:${s.status}`),
    };
  }
  return null;
}
