/**
 * Zero-result telemetry (RAG_SYSTEM.md §3 P5). When a RAG surface takes its
 * honest empty-state path, record the query — these are the corpus's content
 * gaps. Fire-and-forget: best-effort, truncated, and NEVER blocks or fails the
 * response (all errors swallowed).
 *
 * @param {object} admin  service-role Supabase client
 * @param {'help-center'|'copilot'|'sonar'} surface
 * @param {string} query
 */
export function logZeroResult(admin, surface, query) {
  try {
    const q = String(query || '').trim().slice(0, 300);
    if (!admin || !q) return;
    admin
      .from('rag_zero_results')
      .insert({ surface, query: q })
      .then(() => {}, () => {});
  } catch {
    /* never throw from telemetry */
  }
}
