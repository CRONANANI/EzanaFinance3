/**
 * Sonar for organizations: what Sonar may do to council records (Nov 28 2026).
 *
 * Every council action is one of four classes:
 *   read_only     Sonar reads authorized records and answers
 *   proposed      Sonar suggests a change; nothing happens until a member confirms it
 *   confirmed     a write a member confirmed, checked again on the server (send a finding,
 *                 link research to a pitch, request a review, create an assignment)
 *   governance    restricted to humans through the existing Pitch Pipeline and committee:
 *                 stage changes, votes, approvals, positions, trades. Sonar never performs
 *                 these, whoever asks and however the request is worded.
 *
 * A model's output can only ever produce a proposal: `fromModel` actions are refused unless
 * they are read-only or proposed, and a proposal becomes a write only through the confirmed
 * action route, which re-checks membership and permission keys (never role names alone).
 *
 * Pure and client-safe; unit-tested in scripts/check-org-sonar-intelligence.mjs.
 */
import { getMemberPermissions } from '@/lib/org-permissions-config';
import { canReadReport, canEditReport } from '@/lib/org-sonar/reports';

export const ACTION_CLASSES = {
  read: 'read_only',
  propose_thesis_section: 'proposed',
  suggest_diligence: 'proposed',
  propose_assignment: 'proposed',
  propose_monitor: 'proposed',
  send_finding: 'confirmed',
  link_pitch: 'confirmed',
  request_review: 'confirmed',
  create_assignment: 'confirmed',
  change_pitch_stage: 'governance',
  cast_vote: 'governance',
  approve_pitch: 'governance',
  reject_pitch: 'governance',
  approve_report: 'governance',
  add_position: 'governance',
  execute_trade: 'governance',
};

/** Permission keys a confirmed action needs (in addition to active membership). */
const NEEDS = {
  send_finding: ['send_to_team'],
  create_assignment: ['manage_tasks', 'manage_team_tasks'],
};

export function classify(action) {
  return ACTION_CLASSES[action] || 'governance';
}

/**
 * May `member` perform `action` now? ctx: { report, recipients, reviewer, overrides,
 * fromModel, confirmed }. -> { ok, class, reason }
 */
export function authorizeAction(action, member, ctx = {}) {
  const cls = classify(action);
  const deny = (reason) => ({ ok: false, class: cls, reason });
  if (!member || member.is_active === false) return deny('Active council membership is required.');
  if (cls === 'governance')
    return deny(
      'Pitch stages, votes, approvals, positions and trades are decided by members through the Pitch Pipeline and the committee. Sonar does not perform them.',
    );
  if (cls === 'read_only' || cls === 'proposed') return { ok: true, class: cls, reason: null };
  /* A confirmed write: a member's explicit confirmation, never a model's output. */
  if (ctx.fromModel)
    return deny('A research answer can propose this, but a member has to confirm it.');
  if (!ctx.confirmed) return deny('Confirm the action first.');
  const perms = new Set(getMemberPermissions(member, ctx.overrides || []));
  const need = NEEDS[action];
  if (need && !need.some((k) => perms.has(k)))
    return deny(`This needs the ${need.map((k) => k.replace(/_/g, ' ')).join(' or ')} permission.`);
  const viewer = {
    user_id: member.user_id,
    org_id: member.org_id,
    role: member.role,
    team_id: member.team_id,
    is_active: member.is_active,
  };
  if (ctx.report && ctx.report.org_id !== member.org_id)
    return deny('That research belongs to another organization.');
  switch (action) {
    case 'send_finding': {
      if (!ctx.report || !canReadReport(ctx.report, viewer))
        return deny('You cannot share research you cannot read.');
      const recipients = ctx.recipients || [];
      if (!recipients.length) return deny('Choose at least one recipient.');
      const blocked = recipients.filter(
        (r) =>
          r.org_id !== member.org_id ||
          r.is_active === false ||
          !canReadReport(ctx.report, {
            user_id: r.user_id,
            org_id: r.org_id,
            role: r.role,
            team_id: r.team_id,
          }),
      );
      if (blocked.length)
        return deny(
          `${blocked.length} recipient${blocked.length > 1 ? 's' : ''} cannot open this report under its visibility, so the finding was not sent. Widen the report's sharing first.`,
        );
      return { ok: true, class: cls, reason: null };
    }
    case 'link_pitch':
      if (!ctx.report || !canEditReport(ctx.report, viewer))
        return deny('Only the report author or a manager links it to a pitch.');
      if (!ctx.pitch || ctx.pitch.org_id !== member.org_id) return deny('Unknown pitch.');
      return { ok: true, class: cls, reason: null };
    case 'request_review': {
      if (!ctx.report || ctx.report.author_id !== member.user_id)
        return deny('The author requests review of a report.');
      const rv = ctx.reviewer;
      if (!rv || rv.org_id !== member.org_id || rv.is_active === false)
        return deny('Choose an active member of this council.');
      const rvPerms = new Set(getMemberPermissions(rv, ctx.reviewerOverrides || []));
      const canApprove =
        ['executive', 'portfolio_manager'].includes(rv.role) || rvPerms.has('approve_deliverables');
      if (!canApprove)
        return deny(
          'That member cannot approve reports. Choose a portfolio manager, an executive or a member with approval permission.',
        );
      if (rv.user_id === member.user_id)
        return deny('A report is reviewed by someone other than its author.');
      return { ok: true, class: cls, reason: null };
    }
    default:
      return { ok: true, class: cls, reason: null };
  }
}

/** The shared finding, exactly as sent: finding, report, version, evidence, author, time. */
export function findingMessage({
  report,
  version,
  finding,
  evidenceIds = [],
  author,
  message = '',
  now = new Date(),
}) {
  const note = String(message || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
  return {
    subject: `Sonar finding: ${report.title || report.ticker || 'research'}`.slice(0, 160),
    body: [
      note,
      `"${String(finding.text || '').slice(0, 1200)}"`,
      `From ${report.title || 'a report'}, version ${version}.`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    attachment_kind: 'document',
    attachment_ref: `sonar_report:${report.id}`,
    attachment_label: (report.title || 'Sonar report').slice(0, 160),
    attachment_meta: {
      kind: 'sonar_finding',
      report_id: report.id,
      version,
      finding_id: finding.id || null,
      evidence_ids: evidenceIds.slice(0, 20),
      author_member_id: author?.id || null,
      sent_at: now.toISOString(),
    },
  };
}
