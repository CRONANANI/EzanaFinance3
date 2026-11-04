/**
 * Sonar research engine: structured telemetry and feedback (Sections 9.1, 9.2).
 *
 * A research run writes:
 *   sonar_research_runs    one row per run (linked to the sonar_queries
 *                          ledger row that charged it): the spec, the plan,
 *                          the report, evidence decisions, validation stats,
 *                          model, prompt and config versions, timings, status
 *   sonar_research_events  one row per pipeline leg (name, ok, ms, note)
 *
 * Feedback lands in sonar_research_feedback with status 'pending_review':
 * it is a signal for investigation, never a direct change to retrieval or
 * models. Recalibration reads only reviewed feedback (status 'accepted').
 *
 * No raw IP is ever stored (salted hash only, as the ledger does). Writes are
 * bounded and never fail a run.
 */

const MAX_JSON = 200_000;
const clip = (o) => {
  const s = JSON.stringify(o ?? null);
  return s.length > MAX_JSON ? { truncated: true, size: s.length } : o;
};

export async function recordRun(
  admin,
  run,
  { queryId = null, userId = null, ipHash = null, status = 'complete' } = {},
) {
  if (!admin || !run?.runId) return;
  const m = run.researchMetadata || {};
  const row = {
    id: run.runId,
    query_id: queryId,
    user_id: userId,
    ip_hash: ipHash,
    status,
    engine_version: run.engine,
    prompt_version: run.promptVersion,
    config_version: run.configVersion,
    model: m.model || null,
    question: String(run.researchQuestion || '').slice(0, 500),
    primary_domain: run.researchScope?.domains?.[0]?.id || null,
    domains: run.researchScope?.domains || [],
    subject: run.researchScope?.subject || null,
    depth: run.researchScope?.depth || null,
    plan: clip(run.methodology?.plan),
    evidence_decisions: clip(run.methodology?.evidence),
    report: clip({
      executiveConclusion: run.executiveConclusion,
      keyFindings: run.keyFindings,
      analysis: run.analysis,
      limitations: run.limitations,
      confidence: run.confidence,
      metrics: run.quantitativeMetrics,
      evidence: run.evidence,
    }),
    validation: m.validation,
    deterministic: Boolean(run.methodology?.deterministic),
    partial: Boolean(m.partial),
    duration_ms: m.durationMs ?? null,
    phase1_ms: m.phase1Ms ?? null,
    provider_errors: m.providerErrors || [],
  };
  const { error } = await admin.from('sonar_research_runs').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[sonar-engine] run telemetry failed', error.message);
  const events = (m.trace || []).map((t, i) => ({
    run_id: run.runId,
    seq: i,
    leg: t.leg,
    ok: t.ok,
    ms: t.ms,
    note: t.note ? String(t.note).slice(0, 200) : null,
  }));
  if (events.length) {
    const { error: e2 } = await admin.from('sonar_research_events').insert(events);
    if (e2) console.warn('[sonar-engine] event telemetry failed', e2.message);
  }
  /* The evidence graph across runs: every observed or inferred relationship
     with its evidence ids, so later research can traverse it. */
  const rels = (run.relationships || []).slice(0, 300).map((r) => ({
    run_id: run.runId,
    rel_key: r.id.slice(0, 500),
    rel_type: r.type,
    source_node: r.source.id,
    source_label: r.source.label,
    target_node: r.target.id,
    target_label: r.target.label,
    evidence_ids: r.evidenceIds || [],
    period: r.period || null,
    confidence: r.confidence,
    status: r.status,
    note: r.note,
  }));
  if (rels.length) {
    const { error: e3 } = await admin
      .from('sonar_research_relationships')
      .upsert(rels, { onConflict: 'run_id,rel_key', ignoreDuplicates: true });
    if (e3) console.warn('[sonar-engine] relationship telemetry failed', e3.message);
  }
}

export const FEEDBACK_KINDS = [
  'helpful',
  'incomplete',
  'incorrect_finding',
  'irrelevant_source',
  'outdated_evidence',
  'missing_relationship',
  'incorrect_calculation',
  'insufficient_depth',
];

/** Validate a feedback body. Returns the clean row or an error string. */
export function cleanFeedback(body) {
  const runId = String(body?.runId || '');
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return { error: 'Unknown research run.' };
  const kind = String(body?.kind || '');
  if (!FEEDBACK_KINDS.includes(kind)) return { error: 'Unknown feedback type.' };
  const findingId = body?.findingId ? String(body.findingId).slice(0, 60) : null;
  const evidenceId = body?.evidenceId ? String(body.evidenceId).slice(0, 60) : null;
  const note = body?.note
    ? String(body.note)
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .slice(0, 1000)
    : null;
  return { row: { run_id: runId, kind, finding_id: findingId, evidence_id: evidenceId, note } };
}
