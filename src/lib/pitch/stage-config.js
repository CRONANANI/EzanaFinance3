/**
 * STAGE_CONFIG — the spec's per-stage rules (PART 1.2), translated to this
 * repo's role/tier model.
 *
 * The spec's advancer roles (desk_senior_pm / vp_ops / vp_portfolio / cio /
 * trading_desk / president / auto) don't exist as org_members.role values
 * (which are only executive/portfolio_manager/analyst). They DO map onto the
 * fine-grained `tier` ladder, so authorization checks a (role, tier) pair.
 *
 * ic_vote.overrideRoles is [] — a vote result is never overridable by an
 * individual, including the CIO. The answer to a bad vote is a re-vote.
 */

export const STAGE_CONFIG = {
  idea: {
    label: 'Idea',
    ownerRoles: ['junior_analyst'],
    gates: ['has_ticker_and_thesis', 'desk_assigned', 'screening_checklist_pass'],
    advancedBy: 'auto',
    overrideRoles: ['cio'],
    next: 'screening',
  },
  screening: {
    label: 'Screening',
    ownerRoles: ['junior_analyst', 'senior_analyst'],
    gates: [
      'thesis_completeness_80',
      'senior_analyst_signoffs',
      'no_unresolved_challenges',
      'compliance_no_hard_breach',
    ],
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['vp_portfolio', 'cio'],
    next: 'deep_dive',
  },
  deep_dive: {
    label: 'Deep Dive',
    ownerRoles: ['senior_analyst', 'junior_pm', 'senior_pm'],
    gates: [
      'desk_meeting_logged',
      'required_models_complete',
      'thesis_completeness_100',
      'all_challenges_resolved',
      'compliance_no_hard_breach',
    ],
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['vp_portfolio', 'cio'],
    next: 'cross_desk_review',
  },
  cross_desk_review: {
    label: 'Cross-Desk Review',
    ownerRoles: ['senior_pm'],
    gates: ['cross_desk_majority'],
    advancedBy: 'auto',
    overrideRoles: ['cio'],
    next: 'pitch_scheduled',
  },
  pitch_scheduled: {
    label: 'Pitch Scheduled',
    ownerRoles: ['senior_analyst', 'junior_analyst'],
    gates: ['ic_meeting_assigned', 'deck_uploaded', 'pre_read_distributed_48h'],
    advancedBy: 'vp_ops',
    overrideRoles: ['cio'],
    next: 'ic_vote',
  },
  ic_vote: {
    label: 'IC Vote',
    ownerRoles: ['president'],
    gates: ['quorum_met', 'vote_closed', 'conflicts_recused'],
    advancedBy: 'auto',
    overrideRoles: [], // NEVER overridable — the vote is the vote.
    next: 'approved',
  },
  approved: {
    label: 'Approved',
    ownerRoles: ['trading_desk'],
    gates: ['trade_executed'],
    advancedBy: 'trading_desk',
    overrideRoles: ['cio'],
    next: 'in_portfolio',
  },
  in_portfolio: {
    label: 'In Portfolio',
    ownerRoles: ['senior_analyst'],
    gates: [], // exits via a separate action, not "advance"
    advancedBy: 'desk_senior_pm',
    overrideRoles: ['cio'],
    next: null,
  },
};

export function stageConfig(stage) {
  return STAGE_CONFIG[stage] || null;
}

/**
 * Map a spec advancer role → a predicate over the viewer's (role, tier).
 *   cio            → tier president
 *   vp_ops/vp_portfolio → tier vice_president
 *   desk_senior_pm → tier senior_portfolio_manager (or any executive)
 *   trading_desk   → role executive (no dedicated tier)
 *   president      → tier president
 *   auto           → any manager may trigger the (gates-driven) advance
 */
export function viewerMatchesAdvancer(advancer, viewer) {
  if (!viewer) return false;
  const tier = viewer.tier;
  const role = viewer.role;
  const isManager = role === 'executive' || role === 'portfolio_manager';
  switch (advancer) {
    case 'auto':
      return isManager;
    case 'cio':
    case 'president':
      return tier === 'president';
    case 'vp_ops':
    case 'vp_portfolio':
      return tier === 'vice_president' || tier === 'president';
    case 'desk_senior_pm':
      return tier === 'senior_portfolio_manager' || role === 'executive';
    case 'trading_desk':
      return role === 'executive' || role === 'portfolio_manager';
    default:
      return false;
  }
}

/** Can the viewer advance a pitch out of `stage`? */
export function canAdvanceStage(stage, viewer) {
  const cfg = STAGE_CONFIG[stage];
  return !!cfg && viewerMatchesAdvancer(cfg.advancedBy, viewer);
}

/** Can the viewer override failing gates at `stage`? ic_vote → never. */
export function canOverrideStage(stage, viewer) {
  const cfg = STAGE_CONFIG[stage];
  if (!cfg || cfg.overrideRoles.length === 0) return false;
  return cfg.overrideRoles.some((r) => viewerMatchesAdvancer(r, viewer));
}
