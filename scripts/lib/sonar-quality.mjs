/**
 * Shared pieces of Sonar's offline analyst quality loop (Phase 4.2): the regression
 * benchmarks, the snapshot format, the recording runners used at capture time and the
 * replay runners and blocked database client used at replay time.
 *
 *   scripts/sonar-analyst-snapshot.mjs   captures snapshots (recordingRunners)
 *   scripts/sonar-analyst-quality.mjs    replays them (replayRunners, blockedAdmin)
 */

export const SNAPSHOT_VERSION = 1;

/**
 * The regression benchmark, run end to end on every release. Expectations follow the
 * reviewed routing table in scripts/check-sonar-analysts.mjs where it covers the question;
 * the Microsoft positioning expectation is new and unreviewed.
 */
export const BENCHMARK_CASES = [
  {
    id: 'bench-turkey-lira',
    question: "Is Turkey's lira under pressure?",
    mode: 'standard',
    lead: 'fx-strategist',
    supporting: ['macroeconomist', 'sovereign-risk'],
    mustUse: ['fx_spot', 'inflation_monthly', 'policy_rate', 'current_account'],
    mustCompute: ['bothConventionsFx', 'annualise', 'realRateExPost'],
    mustNotClaim: [
      'states an overall pressure level different from assessCurrencyPressure',
      'calls a crisis without disorderly-market or reserve-exhaustion evidence',
      'presents thresholds as official',
      'quotes only the dollar-dearer percentage as the currency loss',
    ],
    goodAnswerTraits: [
      'gives both FX conventions with start and end periods',
      'labels the real policy rate ex-post',
      'cites Ezana thresholds for each component level',
      'states reserves are gross if reserves are used',
    ],
    reviewed: true,
  },
  {
    id: 'bench-msft-ai-infrastructure',
    question:
      'How is Microsoft positioning itself to capture value from the AI infrastructure boom?',
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['industry-analyst'],
    mustUse: ['sec_fundamentals', 'company_profile_segments', 'peer_set'],
    mustCompute: ['marginDecomposition', 'cagr'],
    mustNotClaim: [
      'treats AI market growth as Microsoft revenue',
      'quotes a price target or recommends buying',
      'states a segment figure without its fiscal or calendar period',
    ],
    goodAnswerTraits: [
      'separates market growth from what Microsoft captures',
      'uses the reported cloud segment line with its period',
      'compares with listed hyperscaler peers',
    ],
    reviewed: false,
  },
  {
    id: 'bench-palantir-dependence',
    question: 'How dependent is Palantir on government spending?',
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['contracts-analyst'],
    mustUse: ['sec_fundamentals', 'contract_awards'],
    mustCompute: ['contractObligationsByFY', 'awardCeilingVsObligated'],
    mustNotClaim: [
      'treats contract ceilings as revenue',
      'treats obligations as recognised revenue without saying they differ',
      'mixes federal fiscal years with company fiscal years without saying so',
    ],
    goodAnswerTraits: [
      'reports the government revenue share from filings with its period',
      'distinguishes ceilings, obligations and revenue',
      'states federal fiscal year boundaries',
    ],
    reviewed: true,
  },
  {
    id: 'bench-nvidia-risks',
    question: "What are NVIDIA's biggest risks?",
    mode: 'deep',
    lead: 'equity-research',
    supporting: ['industry-analyst'],
    mustUse: ['sec_fundamentals', 'company_profile_segments'],
    mustCompute: ['marginDecomposition'],
    mustNotClaim: [
      'presents a risk as certain to happen',
      'quotes a price target or recommends selling',
      'states customer concentration figures not in the filings',
    ],
    goodAnswerTraits: [
      'ranks risks by evidence, each cited',
      'separates demand risk from company-specific value capture',
      'states data gaps such as delayed 13F data',
    ],
    reviewed: true,
  },
];

/** JSON-safe copy (drops functions, turns Dates into ISO strings). */
export function plain(v) {
  return v === undefined
    ? null
    : JSON.parse(JSON.stringify(v, (_, x) => (typeof x === 'function' ? undefined : x)));
}

/** Order-independent key for a runner's params. */
export function paramsKey(params) {
  const sort = (v) =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, sort(v[k])]),
          )
        : v;
  return JSON.stringify(sort(plain(params ?? {})));
}

/** Capture: wraps the engine's RUNNERS so every call is recorded. Unknown sources stay undefined. */
export function recordingRunners(RUNNERS, calls) {
  return new Proxy(
    {},
    {
      get(_, source) {
        if (typeof source !== 'string' || typeof RUNNERS[source] !== 'function') return undefined;
        return async (params, ctx) => {
          const t0 = Date.now();
          const base = { source, params: plain(params), paramsKey: paramsKey(params) };
          try {
            const output = await RUNNERS[source](params, ctx);
            calls.push({
              ...base,
              ms: Date.now() - t0,
              ok: true,
              error: null,
              output: plain(output),
            });
            return output;
          } catch (e) {
            calls.push({
              ...base,
              ms: Date.now() - t0,
              ok: false,
              error: e?.name || 'Error',
              output: null,
            });
            throw e;
          }
        };
      },
    },
  );
}

/**
 * Replay: runners that serve a snapshot's recorded outputs. Matching, in order:
 *   exact   same source and same params (may be served more than once)
 *   loose   same source, different params (first unused recorded call; logged)
 *   miss    nothing recorded for the source: { items: [] } (logged)
 * A recorded failure is replayed as a failure with the same error name. Every call is
 * appended to `log` as { source, match, items, paramsKey }.
 */
export function replayRunners(snapshot, log) {
  const pool = (snapshot.calls || []).map((c) => ({ ...c, used: false }));
  return new Proxy(
    {},
    {
      get(_, source) {
        if (typeof source !== 'string' || source === 'then') return undefined;
        return async (params) => {
          const key = paramsKey(params);
          let hit = pool.find((c) => c.source === source && c.paramsKey === key);
          let match = 'exact';
          if (!hit) {
            hit = pool.find((c) => c.source === source && !c.used);
            match = 'loose';
          }
          if (!hit) {
            log.push({ source, match: 'miss', items: 0, paramsKey: key });
            return { items: [] };
          }
          hit.used = true;
          log.push({
            source,
            match,
            items: hit.output?.items?.length || 0,
            paramsKey: key,
            ok: hit.ok,
          });
          if (!hit.ok)
            throw Object.assign(new Error(`replayed failure: ${hit.error}`), {
              name: hit.error || 'Error',
            });
          return plain(hit.output) || { items: [] };
        };
      },
    },
  );
}

/**
 * Replay: a stand-in for the service-role client. Any query resolves to
 * { data: null, error } and is recorded in `leaks`, so a code path that still reads the
 * live database during a replay shows up in the report instead of silently using it.
 */
export function blockedAdmin(leaks) {
  const result = {
    data: null,
    error: { message: 'live database blocked during snapshot replay' },
    count: null,
  };
  const chain = (table) =>
    new Proxy(function stub() {}, {
      get(_, prop) {
        if (prop === 'then') return (resolve) => resolve(result);
        return chain(table);
      },
      apply() {
        return chain(table);
      },
    });
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'then') return undefined;
        return (...a) => {
          leaks.push(`${String(prop)}(${typeof a[0] === 'string' ? a[0] : ''})`);
          return chain(a[0]);
        };
      },
    },
  );
}
