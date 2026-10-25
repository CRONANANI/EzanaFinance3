/**
 * Judge scorecard submission (QA ORG-5). Submit carries every score, so a
 * failed autosave can never be locked in silently: each score is validated
 * against the competition's rubric, all of them are upserted into
 * pitch_scores (same conflict key as the autosave route), and only when that
 * succeeds is the summary marked submitted. Takes the service-role client;
 * the judge has already been resolved from their token.
 */
import { judgeCanAccessTeam } from '@/lib/competitions/judge-token';

/** Competition statuses in which scoring is closed (ORG-20). */
export const SCORING_CLOSED_STATUSES = ['complete', 'archived'];

/** True when the judge's competition no longer accepts scores. */
export async function isScoringClosed(admin, competitionId) {
  const { data } = await admin
    .from('pitch_competitions')
    .select('status')
    .eq('id', competitionId)
    .maybeSingle();
  return SCORING_CLOSED_STATUSES.includes(data?.status);
}

/**
 * Validate submitted scores against the rubric. Returns { rows } (one per
 * criterion, last value wins) or { error }.
 */
export function validateScores(scores, criteria) {
  if (scores == null) return { rows: [] };
  if (!Array.isArray(scores)) return { error: 'scores must be an array' };
  const byId = new Map((criteria || []).map((c) => [c.id, c]));
  const out = new Map();
  for (const s of scores) {
    const c = byId.get(s?.criterion_id);
    if (!c) return { error: 'Unknown criterion' };
    const n = s?.score === '' || s?.score == null ? NaN : Number(s.score);
    const max = Number(c.max_score) || 0;
    if (!Number.isFinite(n) || n < 0 || n > max) {
      return { error: `Score for "${c.label || c.id}" must be between 0 and ${max}` };
    }
    out.set(c.id, n);
  }
  return { rows: [...out].map(([criterion_id, score]) => ({ criterion_id, score })) };
}

/** Returns { status, body }. */
export async function submitJudgeScorecard(admin, judge, body) {
  const teamId = body?.team_id;
  if (!teamId) return { status: 400, body: { error: 'team_id required' } };
  if (!(await judgeCanAccessTeam(admin, judge.id, teamId))) {
    return { status: 403, body: { error: 'This team is not in your room.' } };
  }
  if (await isScoringClosed(admin, judge.competition_id)) {
    return { status: 409, body: { error: 'Judging for this competition is closed.' } };
  }

  // Idempotent: a retried submit after success changes nothing.
  const { data: existing } = await admin
    .from('pitch_score_summaries')
    .select('submitted')
    .eq('judge_id', judge.id)
    .eq('team_id', teamId)
    .maybeSingle();
  if (existing?.submitted) return { status: 200, body: { ok: true, submitted: true } };

  const { data: criteria, error: critErr } = await admin
    .from('pitch_rubric_criteria')
    .select('id, label, max_score')
    .eq('competition_id', judge.competition_id);
  if (critErr) return { status: 500, body: { error: critErr.message } };

  const checked = validateScores(body?.scores, criteria);
  if (checked.error) return { status: 400, body: { error: checked.error } };

  const now = new Date().toISOString();
  if (checked.rows.length) {
    const { error: scoreErr } = await admin.from('pitch_scores').upsert(
      checked.rows.map((r) => ({
        judge_id: judge.id,
        team_id: teamId,
        criterion_id: r.criterion_id,
        score: r.score,
        updated_at: now,
      })),
      { onConflict: 'judge_id,team_id,criterion_id' },
    );
    if (scoreErr) return { status: 500, body: { error: scoreErr.message } };
  }

  const { error } = await admin.from('pitch_score_summaries').upsert(
    {
      judge_id: judge.id,
      team_id: teamId,
      comment: body?.comment ? String(body.comment) : null,
      attribute_comment: !!body?.attribute_comment,
      submitted: true,
      submitted_at: now,
      updated_at: now,
    },
    { onConflict: 'judge_id,team_id' },
  );
  if (error) return { status: 500, body: { error: error.message } };
  return { status: 200, body: { ok: true, submitted: true, saved: checked.rows.length } };
}
