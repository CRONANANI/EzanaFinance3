/**
 * Sonar research engine: research memory (Section 9.7).
 *
 * After a run, the evidence that survived validation (cited by a kept claim)
 * is remembered per subject, with its ORIGINAL reporting date or period and
 * its retrieval time, in `sonar_research_memory`. A later run about the same
 * subject recalls it as candidate evidence flagged `historical`, which:
 *
 *   - is scored at a discount (evidence.js) and never outranks fresh records
 *   - is shown as "from prior research, retrieved <date>"
 *   - is never treated as current truth: the report says when it was retrieved
 *
 * Scope keeps research separate: 'public' memory comes only from public
 * datasets (every engine source today); a member's or an organization's
 * memory is readable only by that member or organization (RLS on the table,
 * plus the scope filter here). Memory older than MAX_AGE_DAYS is not recalled.
 */
import { toEvidence } from './evidence';

const MAX_AGE_DAYS = 120;
const MAX_RECALL = 6;

export const subjectKey = (subject) =>
  subject ? `${subject.kind}:${String(subject.id).toLowerCase()}` : null;

/** Candidate historical evidence for a subject. */
export async function recallEvidence(admin, { subject, scope = {}, now = new Date() }) {
  const key = subjectKey(subject);
  if (!admin || !key) return [];
  const since = new Date(now.getTime() - MAX_AGE_DAYS * 864e5).toISOString();
  let q = admin
    .from('sonar_research_memory')
    .select('evidence, evidence_id, retrieved_at, run_id, scope')
    .eq('subject_key', key)
    .gte('retrieved_at', since)
    .order('retrieved_at', { ascending: false })
    .limit(MAX_RECALL);
  const scopes = ['public'];
  if (scope.userId) scopes.push(`user:${scope.userId}`);
  if (scope.orgId) scopes.push(`org:${scope.orgId}`);
  q = q.in('scope', scopes);
  const { data, error } = await q;
  if (error || !data?.length) return [];
  return data.map((r) => ({
    ...toEvidence(
      { ...r.evidence, title: `${r.evidence.title} (from prior research)` },
      {
        source: r.evidence.source || 'echo',
        retrievedAt: r.retrieved_at,
        historical: { runId: r.run_id, retrievedAt: r.retrieved_at },
      },
    ),
    /* The id it had when first retrieved, so "new since last time" compares like with like. */
    id: r.evidence_id,
  }));
}

/** Remember the cited evidence of a finished run. Public sources only. */
export async function rememberRun(admin, run, { scope = 'public' } = {}) {
  const key = subjectKey(run?.researchScope?.subject);
  if (!admin || !key) return;
  const cited = new Set(
    [run.executiveConclusion, ...(run.keyFindings || [])]
      .filter(Boolean)
      .flatMap((c) => c.evidenceIds || []),
  );
  const rows = (run.evidence || [])
    .filter((e) => cited.has(e.id) && !e.historical)
    .slice(0, 8)
    .map((e) => ({
      subject_key: key,
      scope,
      run_id: run.runId,
      evidence_id: e.id,
      retrieved_at: e.retrievedAt,
      reporting_date: e.date || e.period?.to || null,
      evidence: {
        source: e.source,
        title: e.title,
        text: e.text,
        url: e.url,
        date: e.date,
        period: e.period,
      },
    }));
  if (!rows.length) return;
  await admin
    .from('sonar_research_memory')
    .upsert(rows, { onConflict: 'subject_key,scope,evidence_id' });
}

/**
 * What changed since the last research on this subject: evidence ids in this
 * run that the remembered set did not have.
 */
export function newSinceLast(run, recalled) {
  const old = new Set(recalled.map((e) => e.id));
  return (run.evidence || []).filter((e) => !e.historical && !old.has(e.id)).map((e) => e.id);
}
