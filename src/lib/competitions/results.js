/**
 * Phase 4 results computation. Derives per-team results from submitted scores and
 * materializes them into pitch_results. Uses the same normalized 0..100 scale as
 * the scoreboard (scoring.js) so the two never disagree. Only SUBMITTED judges
 * count — an in-progress scorecard doesn't move the result.
 *
 * These take the service-role admin client (they read across judges) and are
 * called from host-gated routes only.
 */
import { weightedTotal } from './scoring';

/** Recompute + upsert results for one competition. Returns the ranked rows. */
export async function computeResults(admin, competitionId) {
  const [{ data: criteria }, { data: teams }, { data: summaries }, { data: scores }] = await Promise.all([
    admin.from('pitch_rubric_criteria').select('id, weight, max_score').eq('competition_id', competitionId),
    admin.from('pitch_teams').select('id').eq('competition_id', competitionId),
    admin.from('pitch_score_summaries').select('team_id, judge_id, submitted'),
    admin.from('pitch_scores').select('team_id, judge_id, criterion_id, score'),
  ]);

  const teamIds = new Set((teams || []).map((t) => t.id));
  // (team -> set of judges who submitted)
  const submittedJudges = new Map();
  for (const s of summaries || []) {
    if (!s.submitted || !teamIds.has(s.team_id)) continue;
    if (!submittedJudges.has(s.team_id)) submittedJudges.set(s.team_id, new Set());
    submittedJudges.get(s.team_id).add(s.judge_id);
  }

  // (team -> criterion -> [scores from submitted judges])
  const byTeamCrit = new Map();
  for (const sc of scores || []) {
    const judges = submittedJudges.get(sc.team_id);
    if (!judges || !judges.has(sc.judge_id)) continue; // only submitted judges
    if (!byTeamCrit.has(sc.team_id)) byTeamCrit.set(sc.team_id, new Map());
    const crit = byTeamCrit.get(sc.team_id);
    if (!crit.has(sc.criterion_id)) crit.set(sc.criterion_id, []);
    crit.get(sc.criterion_id).push(Number(sc.score));
  }

  const rows = [];
  for (const t of teams || []) {
    const judges = submittedJudges.get(t.id);
    const judgeCount = judges ? judges.size : 0;
    if (!judgeCount) {
      rows.push({ competition_id: competitionId, team_id: t.id, weighted_total: null, judge_count: 0 });
      continue;
    }
    // Average each criterion across submitted judges, then weight to 0..100.
    const avgByCrit = {};
    const crit = byTeamCrit.get(t.id) || new Map();
    for (const [cid, arr] of crit) avgByCrit[cid] = arr.reduce((a, b) => a + b, 0) / arr.length;
    const { total } = weightedTotal(criteria || [], avgByCrit);
    rows.push({ competition_id: competitionId, team_id: t.id, weighted_total: total, judge_count: judgeCount });
  }

  // Rank by weighted_total desc; teams with no scores rank null.
  const scored = rows.filter((r) => r.weighted_total != null).sort((a, b) => b.weighted_total - a.weighted_total);
  scored.forEach((r, i) => {
    r.rank = i + 1;
  });

  const now = new Date().toISOString();
  const upsertRows = rows.map((r) => ({ ...r, rank: r.rank ?? null, computed_at: now }));
  // Replace the competition's results wholesale (idempotent).
  await admin.from('pitch_results').delete().eq('competition_id', competitionId);
  if (upsertRows.length) await admin.from('pitch_results').insert(upsertRows);
  return upsertRows.sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}

/** Per-criterion averages (across submitted judges) for one team, for the breakdown. */
export async function teamCriterionBreakdown(admin, competitionId, teamId) {
  const [{ data: criteria }, { data: summaries }, { data: scores }] = await Promise.all([
    admin
      .from('pitch_rubric_criteria')
      .select('id, label, weight, max_score, sort_order')
      .eq('competition_id', competitionId)
      .order('sort_order', { ascending: true }),
    admin.from('pitch_score_summaries').select('judge_id, submitted').eq('team_id', teamId),
    admin.from('pitch_scores').select('judge_id, criterion_id, score').eq('team_id', teamId),
  ]);
  const submitted = new Set((summaries || []).filter((s) => s.submitted).map((s) => s.judge_id));
  const byCrit = new Map();
  for (const sc of scores || []) {
    if (!submitted.has(sc.judge_id)) continue;
    if (!byCrit.has(sc.criterion_id)) byCrit.set(sc.criterion_id, []);
    byCrit.get(sc.criterion_id).push(Number(sc.score));
  }
  return (criteria || []).map((c) => {
    const arr = byCrit.get(c.id) || [];
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return { id: c.id, label: c.label, max_score: c.max_score, weight: c.weight, avg, pct: avg == null ? null : Math.round((avg / c.max_score) * 100) };
  });
}

/** Aggregated judge feedback for a team, anonymized to "Judge from [Firm]" unless
 *  the judge opted to attribute (attribute_comment = true). */
export async function teamFeedback(admin, teamId) {
  const { data: summaries } = await admin
    .from('pitch_score_summaries')
    .select('judge_id, comment, submitted, attribute_comment')
    .eq('team_id', teamId);
  const rows = (summaries || []).filter((s) => s.submitted && s.comment && s.comment.trim());
  if (!rows.length) return [];
  const judgeIds = rows.map((r) => r.judge_id);
  const { data: judges } = await admin.from('pitch_judges').select('id, full_name, firm').in('id', judgeIds);
  const byId = new Map((judges || []).map((j) => [j.id, j]));
  return rows.map((r) => {
    const j = byId.get(r.judge_id) || {};
    const firm = j.firm || 'a judging firm';
    return {
      label: r.attribute_comment && j.full_name ? `${j.full_name}${j.firm ? `, ${j.firm}` : ''}` : `Judge from ${firm}`,
      comment: r.comment.trim(),
    };
  });
}
