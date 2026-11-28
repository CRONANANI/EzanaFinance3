/**
 * Frozen-evidence capture and replay for Sonar evaluations (moved from
 * scripts/lib/sonar-quality.mjs on Nov 28 2026 so the production model benchmark,
 * /api/admin/sonar/model-bench, can use the same helpers as the local scripts).
 *
 * Capture records every retrieval runner call of one run; replay serves those records
 * back so several model configurations see exactly the same evidence, and blocks the
 * live database so nothing leaks in.
 */

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
