/**
 * Sonar Companion: the action registry (Nov 28 2026).
 *
 * Every button the Companion shows is declared here with its required permission, target,
 * inputs, whether it needs confirmation, and the existing endpoint or page that performs it.
 * availableActions() returns only actions that can work for this reader and this result, so
 * no button looks clickable and does nothing. Governance (trades, pitch approval, votes,
 * permissions, IPS rules) is not in the registry at all.
 *
 * Pure and client-safe; unit-tested in scripts/check-sonar-companion.mjs.
 */

export const COMPANION_ACTIONS = {
  open_full: {
    label: 'Open in full Sonar',
    workspace: 'any',
    permission: null,
    target: 'result',
    inputs: [],
    confirm: false,
    via: 'navigate:/sonar/history/[runId]',
  },
  open_history: {
    label: 'Research history',
    workspace: 'personal',
    permission: null,
    target: null,
    inputs: [],
    confirm: false,
    via: 'navigate:/sonar/history',
  },
  copy_citation: {
    label: 'Copy citation',
    workspace: 'any',
    permission: null,
    target: 'citation',
    inputs: [],
    confirm: false,
    via: 'clipboard',
  },
  open_company: {
    label: 'Open company research',
    workspace: 'any',
    permission: null,
    target: 'entity',
    inputs: ['symbol'],
    confirm: false,
    via: 'navigate:/company-research?ticker=[symbol]',
  },
  save_to_org: {
    label: 'Save to the council',
    workspace: 'organization',
    permission: 'active_membership',
    target: 'result',
    inputs: ['runId'],
    confirm: true,
    via: 'POST /api/org/sonar-reports',
  },
  send_finding: {
    label: 'Send finding to team',
    workspace: 'organization',
    permission: 'send_to_team',
    target: 'report_finding',
    inputs: ['reportId', 'findingId', 'recipients'],
    confirm: true,
    via: 'POST /api/org/sonar/actions',
  },
  open_council: {
    label: 'Open council intelligence',
    workspace: 'organization',
    permission: 'active_membership',
    target: null,
    inputs: [],
    confirm: false,
    via: 'navigate:/org-team-hub/sonar?tab=intelligence',
  },
};

/** Never offered from the Companion, whoever asks. */
export const FORBIDDEN = [
  'execute_trade',
  'approve_pitch',
  'cast_vote',
  'change_permissions',
  'modify_ips',
  'change_pitch_stage',
];

/**
 * @param view  the normalized result (view.js) or null
 * @param ctx   the page descriptor
 * @param who   { orgMember, permissions: string[] }
 */
export function availableActions(view, ctx, who = {}) {
  const perms = new Set(who.permissions || []);
  const out = [];
  const allow = (key) => {
    const a = COMPANION_ACTIONS[key];
    if (a.workspace === 'organization' && ctx?.workspace !== 'organization') return;
    if (a.workspace === 'personal' && ctx?.workspace === 'organization') return;
    if (a.permission === 'active_membership' && !who.orgMember) return;
    if (a.permission && a.permission !== 'active_membership' && !perms.has(a.permission)) return;
    out.push({ key, ...a });
  };
  if (view?.runId || view?.kind === 'council') allow('open_full');
  allow('open_history');
  if (view?.citations?.length) allow('copy_citation');
  if (ctx?.entity?.symbol && ctx.pageType !== 'company') allow('open_company');
  if (view?.kind === 'research' && view.runId && view.status === 'done') allow('save_to_org');
  if (ctx?.workspace === 'organization') allow('open_council');
  return out;
}
