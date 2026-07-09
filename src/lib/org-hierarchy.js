/**
 * Council hierarchy model — the 7-tier rank ladder and the hierarchical
 * role-edit permission rules. Shared by the org-chart API (to flag which
 * members the viewer may edit) and the role-edit API (to enforce it).
 *
 * Permission ladder (rank 0 = top):
 *   - The President can edit anyone's role.
 *   - Everyone else can edit only members STRICTLY below their own rank
 *     who are either in their reporting subtree (walking `reports_to`)
 *     or on their own desk (covers Senior Analyst → Analyst, since
 *     analysts report to the desk lead rather than the senior analyst).
 *   - A member may only ASSIGN tiers strictly below their own rank
 *     (the President may assign any tier, including a successor President).
 *   - Nobody edits their own role.
 */

// Rank 0 = top. Junior/quant tiers use fractional ranks so they slot into the
// existing seniority order WITHOUT shifting the original integer ranks — the
// permission math (strictly-below comparisons) is preserved unchanged.
export const ORG_TIERS = [
  {
    id: 'president',
    label: 'President',
    short: 'PRESIDENT',
    cls: 'exec',
    rank: 0,
    role: 'executive',
  },
  {
    id: 'vice_president',
    label: 'Vice President',
    short: 'VP',
    cls: 'exec',
    rank: 1,
    role: 'executive',
  },
  { id: 'executive', label: 'Executive', short: 'EXEC', cls: 'exec', rank: 2, role: 'executive' },
  {
    id: 'senior_portfolio_manager',
    label: 'Senior Portfolio Manager',
    short: 'SR PM',
    cls: 'pm',
    rank: 3,
    role: 'portfolio_manager',
  },
  {
    id: 'portfolio_manager',
    label: 'Portfolio Manager',
    short: 'PM',
    cls: 'pm',
    rank: 4,
    role: 'portfolio_manager',
  },
  {
    id: 'junior_portfolio_manager',
    label: 'Junior Portfolio Manager',
    short: 'JR PM',
    cls: 'pm',
    rank: 4.5,
    role: 'portfolio_manager',
  },
  {
    id: 'senior_analyst',
    label: 'Senior Analyst',
    short: 'SR ANALYST',
    cls: 'an',
    rank: 5,
    role: 'analyst',
  },
  {
    id: 'quant_analyst',
    label: 'Quant Trader',
    short: 'QUANT',
    cls: 'an',
    rank: 5.5,
    role: 'analyst',
  },
  { id: 'analyst', label: 'Analyst', short: 'ANALYST', cls: 'an', rank: 6, role: 'analyst' },
  {
    id: 'junior_analyst',
    label: 'Junior Analyst',
    short: 'JR ANALYST',
    cls: 'an',
    rank: 6.5,
    role: 'analyst',
  },
];

const TIER_BY_ID = new Map(ORG_TIERS.map((t) => [t.id, t]));

/** Tier record for a member; falls back to the coarse role column. */
export function tierOf(member) {
  return TIER_BY_ID.get(member?.tier) || TIER_BY_ID.get(member?.role) || TIER_BY_ID.get('analyst');
}

export function tierRank(member) {
  return tierOf(member).rank;
}

/** Coarse role implied by a tier id (feature gates platform-wide). */
export function roleForTier(tierId) {
  return TIER_BY_ID.get(tierId)?.role || null;
}

export function isValidTier(tierId) {
  return TIER_BY_ID.has(tierId);
}

/** Is `candidateAncestorId` anywhere above `member` on the reporting line? */
export function isInReportingSubtree(member, candidateAncestorId, membersById) {
  const seen = new Set();
  let current = member;
  while (current?.reports_to && !seen.has(current.reports_to)) {
    if (current.reports_to === candidateAncestorId) return true;
    seen.add(current.reports_to);
    current = membersById.get(current.reports_to);
  }
  return false;
}

/** May `editor` change `target`'s role? (both are org_members rows) */
export function canEditMember(editor, target, membersById) {
  if (!editor || !target || editor.id === target.id) return false;
  const editorRank = tierRank(editor);
  if (editorRank === 0) return true; // President edits anyone.
  if (tierRank(target) <= editorRank) return false; // Only strictly below.
  if (isInReportingSubtree(target, editor.id, membersById)) return true;
  // Same desk: a higher tier may edit lower tiers on their own team.
  return Boolean(editor.team_id && editor.team_id === target.team_id);
}

/** Tier ids `editor` is allowed to assign. */
export function assignableTiers(editor) {
  const editorRank = tierRank(editor);
  if (editorRank === 0) return ORG_TIERS.map((t) => t.id);
  return ORG_TIERS.filter((t) => t.rank > editorRank).map((t) => t.id);
}
