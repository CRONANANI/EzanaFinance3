/**
 * Per-request RAG latency telemetry (Nov 2026). One timer per request; stages are
 * recorded in ms and written as one row to public.rag_request_timings when the
 * request finishes. Same rules as zero-results.js: fire-and-forget, every error
 * swallowed, never blocks or fails a response. Timings only: no query text, no user
 * id, no IP.
 *
 *   const timer = createRequestTimer('sonar-query');
 *   const out = await timer.time('retrieve', retrieve());
 *   timer.set('grounding_regen', 1);
 *   timer.firstByte();
 *   timer.finish(admin, { cacheHit: false, streamed: false, degraded: null });
 */

const SURFACES = new Set(['sonar-query', 'help-center']);

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const ms = (v) => Math.max(0, Math.round(Number(v) || 0));

export function createRequestTimer(surface) {
  const start = now();
  const stages = {};
  let firstByteMs = null;
  let finished = false;

  return {
    /** Await `fnOrPromise` (a promise or a function returning one) and record its ms,
        also when it throws (then rethrow). */
    async time(stage, fnOrPromise) {
      const t0 = now();
      try {
        return await (typeof fnOrPromise === 'function' ? fnOrPromise() : fnOrPromise);
      } finally {
        stages[stage] = ms(now() - t0);
      }
    },

    /** Record a measured value directly (a ms figure, or a small count). */
    set(stage, value) {
      stages[stage] = ms(value);
    },

    /** The first call records the time to first streamed byte; later calls do nothing. */
    firstByte() {
      if (firstByteMs == null) firstByteMs = ms(now() - start);
      return firstByteMs;
    },

    /** ms since the timer started. */
    elapsed() {
      return ms(now() - start);
    },

    /** A copy of the stages so far (for tests and logs). */
    stages() {
      return { ...stages };
    },

    /** Write the row (once). Never throws, never awaited by callers. */
    finish(admin, { cacheHit = false, streamed = false, degraded = null } = {}) {
      if (finished) return;
      finished = true;
      try {
        const totalMs = ms(now() - start);
        console.info('[rag-timing]', surface, totalMs, stages);
        if (!admin || !SURFACES.has(surface)) return;
        const row = {
          surface,
          total_ms: totalMs,
          first_byte_ms: firstByteMs,
          stages: { ...stages },
          cache_hit: Boolean(cacheHit),
          streamed: Boolean(streamed),
          degraded: degraded ? String(degraded).slice(0, 120) : null,
        };
        Promise.resolve(admin.from('rag_request_timings').insert(row)).then(
          () => {},
          () => {},
        );
      } catch {
        /* never throw from telemetry */
      }
    },
  };
}

export default createRequestTimer;
