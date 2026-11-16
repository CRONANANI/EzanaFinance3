/**
 * Sample content for the council tab of Quant Lab (/for-the-quants).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/quant-lab/sample, so the tab can be presented from a council
 * with little activity. Real councils never receive it, the page labels it
 * "Sample content" while it shows, and nothing done to it is saved (the tab
 * has no write actions; the pre-check runs on the page and saves nothing).
 *
 * It is the same sample council every rebuilt Team Hub page shows, assembled
 * from those bundles rather than typed in again (the KPI row's book, teams,
 * rules and benchmark come from the US Equities sample, which the page loads
 * through the same fund loader):
 *   - the open pitches and their required-model checklists from the Pitch
 *     Pipeline sample (so Open pitch lands on the same sample pitch there),
 *   - the Model assignments from the Assignments sample, filtered the way the
 *     live route filters,
 *   - the holdings filed under their sector team and the stored policy rules
 *     from the Compliance sample, which is what the policy engine reads.
 * Fund risk for the sample uses the twelve sample holdings and their real
 * market closes (GET /api/org/quant-lab/risk?sample=1). Every name is
 * invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';
import { buildAssignmentsSample } from './org-assignments-sample.js';
import { buildComplianceSample } from './org-compliance-sample.js';
import { CLOSED_STAGES, modelChecklist } from './org-quant-lab-model.js';

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildQuantLabSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const pipeline = buildPitchPipelineSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  }).raw;
  const work = buildAssignmentsSample({ userId, memberId, role, displayName, title, subRole, now });
  const compliance = buildComplianceSample({ role, displayName, userId, now });
  const required = ['dcf', 'three_statement', 'comps'];

  const pitches = pipeline.pitches
    .filter((p) => p.ticker && !p.archived_at && !CLOSED_STAGES.includes(p.stage))
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      company_name: p.company_name,
      team_id: p.team_id,
      sector: p.sector || null,
      stage: p.stage,
      status: p.status,
      analyst_member_id: p.analyst_member_id,
      position_size_pct: p.position_size_pct ?? null,
      created_at: p.created_at,
      archived_at: null,
      is_demo: true,
    }));
  const models = {};
  for (const p of pitches) {
    models[p.id] = modelChecklist(
      required,
      (pipeline.facts?.[p.id]?.models || []).map((m) => ({ ...m, pitch_id: p.id })),
    );
  }

  const assignments = (work.board.assignments || [])
    .filter((a) => (a.type || a.assignment_type) === 'model' && !a.archived)
    .map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      due_date: a.due_date || null,
      overdue: Boolean(a.overdue),
      mine: Boolean(a.mine),
      assignees: (a.assignees || []).map((x) => x.name).filter(Boolean),
      is_demo: true,
    }));

  return {
    is_demo: true,
    now,
    viewer: { role, memberId: pipeline.viewer?.id || memberId || null },
    members: (pipeline.members || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      is_demo: true,
    })),
    pitches,
    models,
    assignments,
    /* What the policy engine reads: holdings under their sector team. */
    positions: compliance.positions,
    rules: compliance.rules,
  };
}
