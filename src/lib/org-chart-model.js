/**
 * Org chart page model (/org-team-hub/org-chart, Nov 2026 redesign).
 *
 * Pure: no React, no fetch, no server imports. The server loader, the page,
 * the sample bundle and the tests all read it, so the chart, the roster, the
 * coverage map and the flag routing lines can never disagree.
 *
 * Words used here, and what they mean in the data:
 *   rank           one of the ten council ranks (org-hierarchy.js)
 *   role group     executive, portfolio manager or analyst (gates features)
 *   leadership     every member in the executive role group
 *   sector team    a council team that is not the leadership team
 *   sector head    the team's portfolio manager that flag routing uses: the
 *                  earliest joined active member of the portfolio manager
 *                  role group on the team. Not "the highest rank on the team".
 *   unassigned     a portfolio manager or analyst with no sector team (none
 *                  set, a team that no longer exists, or the leadership team)
 *
 * Member order matters. `members` arrives earliest joined first, and "first"
 * below always means first in that order, as flag routing picks.
 */
import { ORG_TIERS, assignableTiers, canEditMember, roleForTier, tierOf } from './org-hierarchy.js';

export const GICS_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate',
];

export const MANAGER_ROLES = ['executive', 'portfolio_manager'];

export const ROLE_GROUP_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function memberName(m) {
  const name = typeof m?.display_name === 'string' ? m.display_name.trim() : '';
  return name || 'Unnamed';
}

export function initialsOf(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** The rank's full name, as the app names it ("Senior Portfolio Manager"). */
export function rankLabel(memberOrTierId) {
  const m = typeof memberOrTierId === 'string' ? { tier: memberOrTierId } : memberOrTierId;
  return tierOf(m).label;
}

/** A custom title when one is set, otherwise nothing (the rank says it). */
export function customTitle(m) {
  const t = typeof m?.title === 'string' ? m.title.trim() : '';
  return t && t !== rankLabel(m) ? t : null;
}

export const roleGroupOf = (m) => tierOf(m).role;

/** Investment committee: the members who vote on pitches. */
export const isCommittee = (m) => m?.role === 'executive' || m?.role === 'portfolio_manager';

const byRank = (a, b) =>
  tierOf(a).rank - tierOf(b).rank || memberName(a).localeCompare(memberName(b));

/* ── Structure ──────────────────────────────────────────────────────────── */

/**
 * The council's structure: leadership, sector teams and the unassigned.
 * Every active member lands in exactly one of the three.
 *
 * @param {{ members: object[], teams: Array<{id:string,name:string}> }} input
 */
export function buildStructure({ members, teams }) {
  const all = Array.isArray(members) ? members : [];
  const allTeams = Array.isArray(teams) ? teams : [];
  const leadership = all.filter((m) => m.role === 'executive').sort(byRank);

  /* The leadership team is where the president (or, failing that, the vice
     president) sits, and any team named "Executive". It is not a sector team. */
  const president = all.find((m) => tierOf(m).id === 'president' && m.role === 'executive');
  const vp = all.find((m) => tierOf(m).id === 'vice_president' && m.role === 'executive');
  const leadershipTeamIds = new Set(
    [
      president?.team_id || vp?.team_id || null,
      ...allTeams
        .filter((t) => /^executives?$/i.test(String(t.name || '').trim()))
        .map((t) => t.id),
    ].filter(Boolean),
  );
  const sectorTeams = allTeams
    .filter((t) => !leadershipTeamIds.has(t.id))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const sectorTeamIds = new Set(sectorTeams.map((t) => t.id));

  const rest = all.filter((m) => m.role !== 'executive');
  const teamRows = sectorTeams.map((t) => {
    const onTeam = rest.filter((m) => m.team_id === t.id);
    /* Routing's pick: the first portfolio manager on the team, in join order. */
    const head = onTeam.find((m) => m.role === 'portfolio_manager') || null;
    const ranked = [...onTeam].sort(byRank);
    const topRanked = ranked[0] || null;
    return {
      id: t.id,
      name: t.name,
      head,
      topRanked,
      /* True when the chart's old idea of a head (highest rank) is someone
         other than the member flags are routed to. */
      headDiffers: Boolean(topRanked && (!head || topRanked.id !== head.id)),
      others: ranked.filter((m) => !head || m.id !== head.id),
      count: onTeam.length,
    };
  });

  const unassigned = rest
    .filter((m) => !m.team_id || !sectorTeamIds.has(m.team_id))
    .sort(byRank)
    .map((m) => ({
      member: m,
      reason: !m.team_id
        ? 'No team set'
        : leadershipTeamIds.has(m.team_id)
          ? 'Seated on the leadership team'
          : 'Team no longer exists',
    }));

  return { leadership, teams: teamRows, unassigned, leadershipTeamIds: [...leadershipTeamIds] };
}

/** The group a member is drawn in: 'leadership', a team id, or 'unassigned'. */
export function placementOf(member, structure) {
  if (!member) return { kind: 'unassigned', label: 'Unassigned' };
  if (member.role === 'executive') return { kind: 'leadership', label: 'Leadership' };
  const team = structure.teams.find((t) => t.id === member.team_id);
  if (team) return { kind: 'team', teamId: team.id, label: team.name };
  return { kind: 'unassigned', label: 'Unassigned' };
}

/* ── Sector coverage ────────────────────────────────────────────────────── */

/**
 * The eleven standard sectors with who covers each. `routingAnalyst` is the
 * member flag routing would pick for the sector: the first covering member in
 * the analyst role group (a covering executive or portfolio manager is listed
 * but is not used by routing).
 */
export function coverageMap(members, sectors = GICS_SECTORS) {
  const all = Array.isArray(members) ? members : [];
  return sectors.map((sector) => {
    const covering = all.filter((m) => (m.sectors || []).some((s) => s.sector === sector));
    const analysts = covering.filter((m) => m.role === 'analyst');
    const primary = analysts.find((m) =>
      (m.sectors || []).some((s) => s.sector === sector && s.isPrimary),
    );
    return { sector, covering, routingAnalyst: primary || analysts[0] || null };
  });
}

export const sectorsOf = (m) => (m?.sectors || []).map((s) => s.sector);

/* ── Flag routing ───────────────────────────────────────────────────────── */

/**
 * Who a position flag goes to. A line-for-line mirror of the server's
 * routing (resolveFlagRoutingDb and the fallback in the flags route), run on
 * the roster the page already holds, so the page can say where a flag on each
 * team or sector would land without raising one.
 *
 *   covering analyst: the analyst on the latest pitch for the ticker, else the
 *     sector's covering analyst (primary first), else the first analyst on the
 *     holding's team
 *   sector head: the first portfolio manager on the holding's team
 *   recipient: the covering analyst, else the sector head; the sector head
 *     when the person flagging is the covering analyst; an executive when
 *     neither exists or the recipient would be the person flagging
 *
 * @param {object[]} members active members, earliest joined first
 * @param {{ teamId?: string|null, sector?: string|null,
 *           pitchAnalystId?: string|null, raiserId?: string|null }} flag
 */
export function resolveFlagRouting(members, flag = {}) {
  const all = Array.isArray(members) ? members : [];
  const { teamId = null, sector = null, pitchAnalystId = null, raiserId = null } = flag;

  let covering = null;
  let via = null;
  if (pitchAnalystId) {
    covering = all.find((m) => m.id === pitchAnalystId) || null;
    if (covering) via = 'pitch';
  }
  if (!covering && sector) {
    const analysts = all.filter(
      (m) => m.role === 'analyst' && (m.sectors || []).some((s) => s.sector === sector),
    );
    covering =
      analysts.find((m) => m.sectors.some((s) => s.sector === sector && s.isPrimary)) ||
      analysts[0] ||
      null;
    if (covering) via = 'sector';
  }
  if (!covering && teamId) {
    covering = all.find((m) => m.team_id === teamId && m.role === 'analyst') || null;
    if (covering) via = 'team';
  }
  const sectorHead = teamId
    ? all.find((m) => m.team_id === teamId && m.role === 'portfolio_manager') || null
    : null;
  const fallbackExecutive = all.find((m) => m.role === 'executive') || null;

  const raiserIsCovering = Boolean(covering && raiserId && covering.id === raiserId);
  let recipient = raiserIsCovering ? sectorHead : covering || sectorHead;
  let usedFallback = false;
  if (!recipient || (raiserId && recipient.id === raiserId)) {
    if (fallbackExecutive && fallbackExecutive.id !== raiserId) {
      recipient = fallbackExecutive;
      usedFallback = true;
    } else if (!recipient) {
      recipient = fallbackExecutive;
      usedFallback = Boolean(fallbackExecutive);
    }
  }
  return {
    coveringAnalyst: covering,
    coveringVia: via,
    sectorHead,
    fallbackExecutive,
    recipient: recipient || null,
    usedFallback,
  };
}

/**
 * One routing line per sector team, plus one for holdings with no team, as
 * the Flag routing section prints them.
 */
export function flagRoutingRows(members, structure) {
  const rowFor = (teamId, name) => {
    const r = resolveFlagRouting(members, { teamId });
    return {
      teamId,
      name,
      sectorHead: r.sectorHead,
      teamAnalyst: r.coveringAnalyst,
      fallbackExecutive: r.fallbackExecutive,
      /* Nobody on the team can receive a flag: it goes to an executive. */
      noOneOnTeam: !r.sectorHead && !r.coveringAnalyst,
      noRecipient: !r.recipient,
    };
  };
  return [
    ...structure.teams.map((t) => rowFor(t.id, t.name)),
    { ...rowFor(null, 'No team on the holding'), unassigned: true },
  ];
}

/* ── Figures ────────────────────────────────────────────────────────────── */

export function councilCounts(members, structure) {
  const all = Array.isArray(members) ? members : [];
  const map = coverageMap(all);
  return {
    members: all.length,
    teams: structure.teams.length,
    leadership: structure.leadership.length,
    committee: all.filter(isCommittee).length,
    noSectorHead: structure.teams.filter((t) => !t.head).length,
    unassigned: structure.unassigned.length,
    sectorsCovered: map.filter((s) => s.covering.length > 0).length,
    sectorCount: map.length,
  };
}

/**
 * Sector team rows joined to the fund book's sleeves (value and return on
 * cost per team, from the Team Hub summary). `sleeves` may be null while it
 * loads or when it failed: money cells are then null and print N/A.
 */
export function teamTableRows(structure, sleeves) {
  const bySleeve = new Map((Array.isArray(sleeves) ? sleeves : []).map((s) => [s.teamId, s]));
  const rows = structure.teams.map((t) => {
    const s = bySleeve.get(t.id) || null;
    return {
      ...t,
      value: s ? num(s.value) : null,
      roiPct: s ? num(s.roiPct) : null,
    };
  });
  /* The total return follows from each sleeve's value and return (cost is
     value over one plus return). A sleeve with value but no return makes the
     total unknowable, so it reads N/A. */
  let value = 0;
  let cost = 0;
  let known = rows.length > 0 && Array.isArray(sleeves);
  for (const r of rows) {
    if (r.value == null) {
      known = false;
      continue;
    }
    value += r.value;
    if (r.roiPct == null) {
      if (r.value > 0) known = false;
    } else if (r.roiPct > -100) {
      cost += r.value / (1 + r.roiPct / 100);
    }
  }
  const total = {
    members:
      rows.reduce((n, r) => n + r.count, 0) +
      structure.unassigned.length +
      structure.leadership.length,
    value: Array.isArray(sleeves) && rows.every((r) => r.value != null) ? value : null,
    roiPct: known && cost > 0 ? (value / cost - 1) * 100 : null,
  };
  return { rows, total };
}

/* ── Roster ─────────────────────────────────────────────────────────────── */

export const ROSTER_FILTERS = [
  { value: 'all', label: 'All members' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'pm', label: 'Portfolio managers' },
  { value: 'analyst', label: 'Analysts' },
  { value: 'unassigned', label: 'Unassigned' },
];

export function rosterRows(members, structure, filter = 'all') {
  const all = Array.isArray(members) ? members : [];
  const byId = new Map(all.map((m) => [m.id, m]));
  const unassignedIds = new Set(structure.unassigned.map((u) => u.member.id));
  const order = (m) => {
    const p = placementOf(m, structure);
    if (p.kind === 'leadership') return 0;
    if (p.kind === 'team') return 1 + structure.teams.findIndex((t) => t.id === p.teamId);
    return 1000;
  };
  return all
    .filter((m) => {
      if (filter === 'leadership') return m.role === 'executive';
      if (filter === 'pm') return m.role === 'portfolio_manager';
      if (filter === 'analyst') return m.role === 'analyst';
      if (filter === 'unassigned') return unassignedIds.has(m.id);
      return true;
    })
    .sort((a, b) => order(a) - order(b) || byRank(a, b))
    .map((m) => ({
      member: m,
      placement: placementOf(m, structure),
      manager: m.reports_to ? byId.get(m.reports_to) || null : null,
      sectors: sectorsOf(m),
      committee: isCommittee(m),
    }));
}

export function directReportsOf(members, memberId) {
  return (Array.isArray(members) ? members : [])
    .filter((m) => m.reports_to === memberId)
    .sort(byRank);
}

/* ── Succession ─────────────────────────────────────────────────────────── */

/**
 * Members marked as graduating or with a term end on file, soonest first.
 * A graduating member's covered sectors are listed: each needs a handoff.
 */
export function successionRows(members) {
  return (Array.isArray(members) ? members : [])
    .filter((m) => m.is_graduating || m.term_end)
    .sort(
      (a, b) =>
        String(a.term_end || '9999').localeCompare(String(b.term_end || '9999')) || byRank(a, b),
    )
    .map((m) => ({
      member: m,
      termEnd: m.term_end || null,
      graduating: Boolean(m.is_graduating),
      sectors: sectorsOf(m),
    }));
}

/* ── Recent changes ─────────────────────────────────────────────────────── */

export function changeRows(changes, members) {
  const byId = new Map((Array.isArray(members) ? members : []).map((m) => [m.id, m]));
  const known = (id) => ORG_TIERS.some((t) => t.id === id);
  return (Array.isArray(changes) ? changes : []).map((c) => ({
    id: c.id,
    by: c.changed_by_member_id ? byId.get(c.changed_by_member_id) || null : null,
    target: byId.get(c.target_member_id) || null,
    from: known(c.old_tier) ? rankLabel(c.old_tier) : null,
    to: known(c.new_tier) ? rankLabel(c.new_tier) : null,
    at: c.created_at || null,
  }));
}

/* ── What the viewer may do ─────────────────────────────────────────────── */

/**
 * Stamp each member with `editable` (may the viewer change their rank) and
 * build the viewer block, by the same rules the rank route enforces.
 */
export function withEditRights(members, viewerMemberId) {
  const all = Array.isArray(members) ? members : [];
  const byId = new Map(all.map((m) => [m.id, m]));
  const viewerRow = byId.get(viewerMemberId) || null;
  return {
    members: all.map((m) => ({
      ...m,
      tier: tierOf(m).id,
      editable: viewerRow ? canEditMember(viewerRow, m, byId) : false,
    })),
    viewer: viewerRow
      ? {
          memberId: viewerRow.id,
          role: viewerRow.role,
          subRole: viewerRow.sub_role || null,
          tier: tierOf(viewerRow).id,
          canManage: MANAGER_ROLES.includes(viewerRow.role),
          assignableTiers: assignableTiers(viewerRow),
        }
      : null,
  };
}

/** The ranks the viewer may give this member (never the current one). */
export function rankOptions(member, viewer) {
  if (!member?.editable) return [];
  const allowed = new Set(viewer?.assignableTiers || []);
  const current = tierOf(member).id;
  return ORG_TIERS.filter((t) => allowed.has(t.id) && t.id !== current);
}

/** One line saying what the signed-in member can change on this page. */
export function scopeNote(viewer, members) {
  if (!viewer) return '';
  const n = (Array.isArray(members) ? members : []).filter((m) => m.editable).length;
  const ranks =
    n === 0
      ? 'You cannot change anyone’s rank.'
      : `You can change the rank of ${n} member${n === 1 ? '' : 's'}.`;
  return viewer.canManage
    ? `You can edit member details and sector coverage. ${ranks}`
    : `Member details and sector coverage are edited by executives and portfolio managers. ${ranks}`;
}

/* ── Edits ──────────────────────────────────────────────────────────────── */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Would making `managerId` the manager of `memberId` close a loop? */
export function wouldLoop(members, memberId, managerId) {
  if (!managerId) return false;
  if (managerId === memberId) return true;
  const byId = new Map((Array.isArray(members) ? members : []).map((m) => [m.id, m]));
  const seen = new Set();
  let cur = byId.get(managerId);
  while (cur?.reports_to && !seen.has(cur.id)) {
    if (cur.reports_to === memberId) return true;
    seen.add(cur.id);
    cur = byId.get(cur.reports_to);
  }
  return false;
}

/**
 * Check a member edit before it is sent, and return the request body for the
 * existing chart route: only the fields that changed.
 *
 * @returns {{ ok: true, body: object|null } | { ok: false, error: string }}
 */
export function memberEditBody(member, draft, members) {
  const body = {};
  const title = String(draft.title ?? '').trim();
  if (title.length > 80) return { ok: false, error: 'Keep the title under 80 characters.' };
  if (title !== String(member.title || '').trim()) body.title = title;

  const manager = draft.reports_to || null;
  if (manager !== (member.reports_to || null)) {
    if (wouldLoop(members, member.id, manager)) {
      return {
        ok: false,
        error: 'That member reports to this one, so they cannot also be the manager.',
      };
    }
    body.reports_to = manager;
  }
  const start = draft.term_start || null;
  const end = draft.term_end || null;
  if ((start && !DATE_RE.test(start)) || (end && !DATE_RE.test(end))) {
    return { ok: false, error: 'Enter term dates as a full date.' };
  }
  if (start && end && end < start) {
    return { ok: false, error: 'The term end is before the term start.' };
  }
  if (start !== (member.term_start || null)) body.term_start = start;
  if (end !== (member.term_end || null)) body.term_end = end;
  if (Boolean(draft.is_graduating) !== Boolean(member.is_graduating)) {
    body.is_graduating = Boolean(draft.is_graduating);
  }
  if (Array.isArray(draft.sectors)) {
    const next = GICS_SECTORS.filter((s) => draft.sectors.includes(s));
    const cur = GICS_SECTORS.filter((s) => sectorsOf(member).includes(s));
    if (next.join('|') !== cur.join('|')) body.sectors = next;
  }
  if (Object.keys(body).length === 0) return { ok: true, body: null };
  return { ok: true, body: { member_id: member.id, ...body } };
}

/** Apply a saved member edit to the roster the page holds. */
export function applyMemberEdit(members, body) {
  return (Array.isArray(members) ? members : []).map((m) => {
    if (m.id !== body.member_id) return m;
    const next = { ...m };
    if ('title' in body) next.title = body.title === '' ? null : body.title;
    if ('reports_to' in body) next.reports_to = body.reports_to || null;
    if ('term_start' in body) next.term_start = body.term_start || null;
    if ('term_end' in body) next.term_end = body.term_end || null;
    if ('is_graduating' in body) next.is_graduating = Boolean(body.is_graduating);
    if (Array.isArray(body.sectors)) {
      next.sectors = body.sectors.map((sector) => ({ sector, isPrimary: true }));
    }
    return next;
  });
}

/**
 * The requests that make `memberIds` the members covering `sector`: one body
 * per member whose set of sectors changes (the route replaces a member's
 * whole set).
 */
export function sectorCoverageBodies(members, sector, memberIds) {
  const want = new Set(memberIds);
  const out = [];
  for (const m of Array.isArray(members) ? members : []) {
    const has = sectorsOf(m).includes(sector);
    if (has === want.has(m.id)) continue;
    const next = has ? sectorsOf(m).filter((s) => s !== sector) : [...sectorsOf(m), sector];
    out.push({ member_id: m.id, sectors: GICS_SECTORS.filter((s) => next.includes(s)) });
  }
  return out;
}

/**
 * Apply a rank change the way the rank route does, for sample content: the
 * role group follows the rank, a default title follows it too, a custom title
 * stays, and the change is logged. Returns null when the rules refuse it.
 */
export function applyRankChange(chart, memberId, tierId, now = Date.now()) {
  const members = chart?.members || [];
  const byId = new Map(members.map((m) => [m.id, m]));
  const viewerRow = byId.get(chart?.viewer?.memberId);
  const target = byId.get(memberId);
  if (!viewerRow || !target) return null;
  if (!canEditMember(viewerRow, target, byId)) return null;
  if (!assignableTiers(viewerRow).includes(tierId)) return null;
  const oldTier = tierOf(target).id;
  if (oldTier === tierId) return chart;
  const patched = members.map((m) => {
    if (m.id !== memberId) return m;
    const next = { ...m, tier: tierId, role: roleForTier(tierId) };
    if (!m.title || m.title === tierOf(m).label) next.title = rankLabel(tierId);
    return next;
  });
  const rights = withEditRights(patched, viewerRow.id);
  return {
    ...chart,
    members: rights.members,
    viewer: { ...chart.viewer, ...rights.viewer },
    changes: [
      {
        id: `local-change-${now}`,
        target_member_id: memberId,
        changed_by_member_id: viewerRow.id,
        old_tier: oldTier,
        new_tier: tierId,
        created_at: new Date(now).toISOString(),
        is_demo: true,
      },
      ...(chart.changes || []),
    ],
  };
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 14, 2026, 10:42" in UTC-independent local time; null when unreadable. */
export function fmtDateTime(v) {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${hh}:${mm}`;
}

/** A stored date (YYYY-MM-DD) as "May 15, 2027", with no time zone shift. */
export function fmtDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  if (!m) return null;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
