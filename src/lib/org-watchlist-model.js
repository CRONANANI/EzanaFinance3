/**
 * Council watch on the Watchlist (/watchlist): the pure model.
 *
 * Council members keep their personal watchlist unchanged and also see a
 * council section built here from their council's own records: the position
 * book, sector teams, sector coverage, coverage handoffs, research dates, the
 * stored investment policy rules (all from the US Equities council loader),
 * plus open pitches, Coverage assignments, upcoming meetings and committee
 * sessions (GET /api/org/watchlist). The live routes and the sample bundle
 * hand over the same shapes, so one set of functions draws both.
 *
 * Honesty rules, the same as the other council sections:
 * - Nothing here is a shared list. The coverage list is read from the book
 *   and the pipeline every time; nobody edits it on this page.
 * - The owner is the latest coverage handoff, then sector coverage, then (for
 *   a name that is only pitched) the pitch's analyst, each labelled with its
 *   source. Otherwise "Unassigned".
 * - The policy readings are descriptive. They read stored limits against the
 *   council's own book and never block or advise.
 * - A missing figure is N/A, never a dash or a zero.
 *
 * Pure: no React, no fetch, no server imports.
 */
import { holdingsSummary, sectorCap } from './org-compliance-model.js';

export const NA = 'N/A';
export const STALE_DAYS = 90;
export const CLOSED_STAGES = ['rejected', 'exited', 'in_portfolio', 'approved'];
const DAY = 86400000;

export const LINKS = {
  dossier: (t) =>
    `/org-team-hub/research-library?view=ticker&symbol=${encodeURIComponent(upper(t))}`,
  library: '/org-team-hub/research-library',
  lineage: '/org-team-hub/research-library?view=lineage',
  pitch: (id) => `/org-team-hub/pitches?pitch=${encodeURIComponent(id)}`,
  pipeline: '/org-team-hub/pitches',
  compliance: '/org-team-hub/compliance',
  assignments: '/org-team-hub/assignments',
  meetings: '/org-team-hub/meetings',
  orgChart: '/org-team-hub/org-chart',
  research: (t) => `/company-research?ticker=${encodeURIComponent(upper(t))}`,
};

/* ── Formatting ─────────────────────────────────────────────────────────── */

const finite = (v) => v != null && v !== '' && Number.isFinite(Number(v));
function upper(t) {
  return String(t || '')
    .toUpperCase()
    .trim();
}

/** 13.0% (a share, never signed) */
export const fmtShare = (v, digits = 1) => (finite(v) ? `${Number(v).toFixed(digits)}%` : NA);

/** Nov 12, 2026 (UTC, so server and browser agree) */
export function fmtDate(v) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Nov 12 (UTC) */
export function fmtShortDate(v) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const STAGE = {
  idea: 'Idea',
  screening: 'Screening',
  deep_dive: 'Deep dive',
  cross_desk_review: 'Cross-desk review',
  pitch_scheduled: 'Pitch scheduled',
  ic_vote: 'IC vote',
  approved: 'Approved',
  in_portfolio: 'In portfolio',
  exited: 'Exited',
  rejected: 'Rejected',
};
export const stageText = (s) => STAGE[s] || (s ? String(s).replace(/_/g, ' ') : NA);

/* ── Inputs ─────────────────────────────────────────────────────────────── */

/** Open pitches with a ticker: not archived, not closed. */
export function openPitches(pitches = []) {
  return (pitches || []).filter(
    (p) => p && p.ticker && !p.archived_at && !CLOSED_STAGES.includes(p.stage),
  );
}

/** One directory from every part that carries members. */
export function directory(...lists) {
  const byId = new Map();
  const byUser = new Map();
  for (const list of lists) {
    for (const m of list || []) {
      if (m?.id && !byId.has(m.id)) byId.set(m.id, m.display_name || null);
      if (m?.user_id && !byUser.has(m.user_id)) byUser.set(m.user_id, m.display_name || null);
    }
  }
  return {
    member: (id) => (id && byId.get(id)) || null,
    user: (id) => (id && byUser.get(id)) || null,
  };
}

/** The lowest active single-position cap, or null. */
export function positionCap(rules = []) {
  const caps = (rules || [])
    .filter((r) => r && r.is_active !== false && r.rule_type === 'max_position_pct')
    .map((r) => Number(r.rule_value?.pct))
    .filter((n) => Number.isFinite(n));
  return caps.length ? Math.min(...caps) : null;
}

/** 'Within' | 'Nearing' (over 90% of the cap) | 'Above', or N/A. */
export function capReading(weight, cap) {
  if (!finite(weight) || !finite(cap)) return { text: NA, tone: 'na' };
  const w = Number(weight);
  const c = Number(cap);
  if (w > c) return { text: 'Above', tone: 'down' };
  if (w > c * 0.9) return { text: 'Nearing', tone: 'warn' };
  return { text: 'Within', tone: 'up' };
}

/* ── The coverage list ──────────────────────────────────────────────────── */

function ownerOf(raw, ticker, sectors, pitch, names) {
  const t = upper(ticker);
  const hop = (raw?.hops || [])
    .filter((h) => upper(h.ticker) === t && h.to_member_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  if (hop && names.member(hop.to_member_id)) {
    return { id: hop.to_member_id, name: names.member(hop.to_member_id), source: 'Handoff' };
  }
  const cov = (raw?.coverage || [])
    .filter((c) => c.sector && sectors.includes(c.sector))
    .sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)));
  for (const c of cov) {
    const n = names.member(c.member_id);
    if (n) return { id: c.member_id, name: n, source: 'Sector coverage' };
  }
  if (pitch?.analyst_member_id && names.member(pitch.analyst_member_id)) {
    return {
      id: pitch.analyst_member_id,
      name: names.member(pitch.analyst_member_id),
      source: 'Pitch analyst',
    };
  }
  return null;
}

/**
 * Every held name and every open pitch, one row each, built from the
 * council's records as the signed-in member.
 * @param raw     the US Equities fund part (positions, teams, members,
 *                coverage, hops, rules, noteIndex, now, viewer)
 * @param extras  this page's part (pitches, members, viewer)
 */
export function coverageRows(raw, extras, viewerMemberId = null) {
  const now = raw?.now || extras?.now || Date.now();
  const names = directory(raw?.members, extras?.members);
  const teamName = new Map((raw?.teams || []).map((t) => [t.id, t.name]));
  const positions = raw?.positions || [];
  const total = positions.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const cap = positionCap(raw?.rules);
  const pitches = openPitches(extras?.pitches).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  const lastDoc = new Map();
  for (const d of raw?.noteIndex || []) {
    const t = upper(d.ticker);
    if (!t || !d.created_at) continue;
    const prev = lastDoc.get(t);
    if (!prev || new Date(d.created_at) > new Date(prev)) lastDoc.set(t, d.created_at);
  }
  const mySectors = new Set(
    (raw?.coverage || [])
      .filter((c) => viewerMemberId && c.member_id === viewerMemberId)
      .map((c) => c.sector),
  );

  const tickers = [];
  const seen = new Set();
  for (const p of positions) {
    const t = upper(p.ticker);
    if (t && !seen.has(t)) {
      seen.add(t);
      tickers.push(t);
    }
  }
  for (const p of pitches) {
    const t = upper(p.ticker);
    if (t && !seen.has(t)) {
      seen.add(t);
      tickers.push(t);
    }
  }

  return tickers.map((t) => {
    const pos = positions.find((p) => upper(p.ticker) === t) || null;
    const pitch = pitches.find((p) => upper(p.ticker) === t) || null;
    const team =
      teamName.get(pos?.team_id) || teamName.get(pitch?.team_id) || pitch?.sector || null;
    const sectors = [pos?.sector, pitch?.sector, team].filter(Boolean);
    const owner = ownerOf(raw, t, sectors, pitch, names);
    const last = lastDoc.get(t) || null;
    const research = !last
      ? 'none'
      : now - new Date(last).getTime() > STALE_DAYS * DAY
        ? 'stale'
        : 'current';
    const weight = pos && total > 0 ? ((Number(pos.value) || 0) / total) * 100 : null;
    const mine = Boolean(
      viewerMemberId &&
      ((owner && owner.id === viewerMemberId) ||
        (pitch && pitch.analyst_member_id === viewerMemberId) ||
        sectors.some((s) => mySectors.has(s))),
    );
    return {
      ticker: t,
      name: pos?.name || pitch?.company_name || null,
      held: Boolean(pos),
      pitched: Boolean(pitch),
      team,
      sector: pos?.sector || pitch?.sector || null,
      owner,
      lastDocAt: last,
      research,
      weight,
      cap,
      capReading: pos ? capReading(weight, cap) : { text: 'Not held', tone: 'na' },
      pitch: pitch
        ? {
            id: pitch.id,
            stage: pitch.stage,
            stageText: stageText(pitch.stage),
            analyst: names.member(pitch.analyst_member_id),
          }
        : null,
      priced: pos ? Boolean(pos.priced) : null,
      gap: !owner ? 'unassigned' : research === 'current' ? null : research,
      mine,
    };
  });
}

export const RESEARCH_TEXT = {
  current: 'Current',
  stale: `Stale, over ${STALE_DAYS} days`,
  none: 'No research',
};

/** Rows for a filter: 'all' | 'mine' | 'gaps'. */
export function filterRows(rows, filter) {
  if (filter === 'mine') return rows.filter((r) => r.mine);
  if (filter === 'gaps') return rows.filter((r) => r.gap);
  return rows;
}

const SORTS = {
  ticker: (a, b) => a.ticker.localeCompare(b.ticker),
  weight: (a, b) => (a.weight ?? -1) - (b.weight ?? -1),
  research: (a, b) =>
    (a.lastDocAt ? new Date(a.lastDocAt).getTime() : 0) -
    (b.lastDocAt ? new Date(b.lastDocAt).getTime() : 0),
};

/** Sort a copy. Default: held names first, heaviest first, then pitched by ticker. */
export function sortRows(rows, key = 'default', dir = 'asc') {
  const out = [...rows];
  if (key === 'default') {
    return out.sort(
      (a, b) => Number(b.held) - Number(a.held) || SORTS.weight(b, a) || SORTS.ticker(a, b),
    );
  }
  const f = SORTS[key] || SORTS.ticker;
  out.sort(f);
  return dir === 'desc' ? out.reverse() : out;
}

/** The KPI strip. */
export function stripFigures(rows) {
  return {
    names: rows.length,
    held: rows.filter((r) => r.held).length,
    pitched: rows.filter((r) => r.pitched && !r.held).length,
    unassigned: rows.filter((r) => r.gap === 'unassigned').length,
    stale: rows.filter((r) => r.owner && r.research !== 'current').length,
    nearCap: rows.filter((r) => r.held && ['Nearing', 'Above'].includes(r.capReading.text)).length,
    mine: rows.filter((r) => r.mine).length,
  };
}

/* ── Desk watch: sector teams ───────────────────────────────────────────── */

/** One row per sector team: names held and pitched, sleeve weight, coverage, gaps. */
export function deskRows(raw, rows) {
  const names = directory(raw?.members);
  const positions = raw?.positions || [];
  const total = positions.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const out = [];
  for (const t of raw?.teams || []) {
    const mine = rows.filter((r) => r.team === t.name);
    const held = positions.filter((p) => p.team_id === t.id);
    const value = held.reduce((s, p) => s + (Number(p.value) || 0), 0);
    const sectors = new Set(held.map((p) => p.sector).filter(Boolean));
    const covering = [
      ...new Set(
        (raw?.coverage || [])
          .filter((c) => c.is_primary && (sectors.has(c.sector) || c.sector === t.name))
          .map((c) => names.member(c.member_id))
          .filter(Boolean),
      ),
    ];
    out.push({
      id: t.id,
      name: t.name,
      held: mine.filter((r) => r.held).length,
      pitched: mine.filter((r) => r.pitched && !r.held).length,
      weight: total > 0 && held.length ? (value / total) * 100 : null,
      covering,
      gaps: mine.filter((r) => r.gap).length,
    });
  }
  return out.sort((a, b) => (b.weight ?? -1) - (a.weight ?? -1) || a.name.localeCompare(b.name));
}

/* ── IPS watch (descriptive) ────────────────────────────────────────────── */

/**
 * The largest positions against the stored single-position cap, and sector
 * weights against the stored sector cap, read the way Compliance reads them
 * (market value, the book's sector field). Pitched names on the prohibited
 * list are listed too. Never a block.
 * @param policyPositions  what the policy engine reads (live: the book)
 */
export function ipsWatch(raw, rows, policyPositions, top = 4) {
  const rules = raw?.rules || [];
  const pCap = positionCap(rules);
  const sCap = sectorCap(rules);
  const positions = rows
    .filter((r) => r.held && r.weight != null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, top)
    .map((r) => ({
      ticker: r.ticker,
      weight: r.weight,
      cap: pCap,
      reading: capReading(r.weight, pCap),
    }));
  const h = holdingsSummary(policyPositions || []);
  const sectors = h.sectors.slice(0, top).map((s) => ({
    sector: s.sector,
    weight: s.pct,
    cap: sCap,
    reading: s.unclassified ? { text: NA, tone: 'na' } : capReading(s.pct, sCap),
  }));
  const banned = new Set(
    rules
      .filter((r) => r && r.is_active !== false && r.rule_type === 'prohibited_ticker')
      .map((r) => upper(r.rule_value?.ticker))
      .filter(Boolean),
  );
  const prohibited = rows.filter((r) => banned.has(r.ticker)).map((r) => r.ticker);
  return {
    positionCap: pCap,
    sectorCap: sCap,
    hasRules: pCap != null || sCap != null,
    positions,
    sectors,
    prohibited,
    flagged:
      positions.filter((p) => p.reading.text !== 'Within' && p.reading.text !== NA).length +
      sectors.filter((s) => s.reading.text !== 'Within' && s.reading.text !== NA).length,
  };
}

/* ── Coverage assignments ───────────────────────────────────────────────── */

/** Open Coverage assignments the Assignments page shows this viewer, soonest first. */
export function coverageAssignments(list, now = Date.now()) {
  return (list || [])
    .filter((a) => a && !a.archived && !['complete', 'graded'].includes(a.status))
    .sort((a, b) => {
      if (Boolean(a.mine) !== Boolean(b.mine)) return a.mine ? -1 : 1;
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    })
    .map((a) => {
      const due = a.due_date ? new Date(a.due_date).getTime() : null;
      const people = a.assignees || [];
      return {
        id: a.id,
        title: a.title || 'Untitled',
        owner: a.mine
          ? 'You'
          : people.length
            ? people.length > 1
              ? `${people[0]} and ${people.length - 1} more`
              : people[0]
            : NA,
        due: fmtShortDate(a.due_date),
        dueInDays: due == null ? null : Math.round((due - now) / DAY),
        overdue: Boolean(a.overdue),
        status: String(a.status || 'assigned').replace(/_/g, ' '),
      };
    });
}

/* ── Coming up ──────────────────────────────────────────────────────────── */

const CATEGORY = {
  ic: 'Council meeting',
  exec: 'Executive meeting',
  sector: 'Team review',
  education: 'Workshop',
  general: 'Meeting',
};

/**
 * The next dated items from records that exist: committee sessions (with the
 * pitches on them), council meetings and Coverage assignment due dates, in
 * the next `days` days.
 */
export function comingUp(extras, { now = Date.now(), days = 30, limit = 6 } = {}) {
  const end = now + days * DAY;
  const items = [];
  const pitchById = new Map((extras?.pitches || []).map((p) => [p.id, p]));
  for (const s of extras?.sessions || []) {
    const at = new Date(s.meets_at).getTime();
    if (!Number.isFinite(at) || s.status === 'closed' || s.status === 'cancelled') continue;
    if (at < now - DAY || at > end) continue;
    const tickers = (
      s.pitches || openPitches(extras?.pitches).filter((p) => p.ic_meeting_id === s.id)
    )
      .map((p) => upper(p.ticker || pitchById.get(p.id)?.ticker))
      .filter(Boolean);
    items.push({
      id: `s-${s.id}`,
      at,
      date: fmtShortDate(s.meets_at),
      kind: 'Committee session',
      title: s.status === 'in_session' ? 'Committee session (in session)' : 'Committee session',
      tickers,
      href: LINKS.pipeline,
      icon: 'bi-people',
    });
  }
  for (const m of extras?.meetings || []) {
    const at = new Date(m.scheduled_at).getTime();
    if (!Number.isFinite(at) || at < now || at > end) continue;
    if (['closed', 'completed', 'cancelled', 'canceled'].includes(m.status)) continue;
    items.push({
      id: `m-${m.id}`,
      at,
      date: fmtShortDate(m.scheduled_at),
      kind: CATEGORY[m.category] || 'Meeting',
      title: m.title || CATEGORY[m.category] || 'Meeting',
      tickers: [],
      href: LINKS.meetings,
      icon: 'bi-calendar-event',
    });
  }
  for (const a of extras?.assignments || []) {
    if (!a.due_date || a.archived || ['complete', 'graded'].includes(a.status)) continue;
    const at = new Date(a.due_date).getTime();
    if (!Number.isFinite(at) || at > end) continue;
    if (at < now && !a.overdue) continue;
    items.push({
      id: `a-${a.id}`,
      at,
      date: fmtShortDate(a.due_date),
      kind: a.overdue ? 'Coverage due, overdue' : 'Coverage due',
      title: a.title || 'Coverage assignment',
      tickers: [],
      href: LINKS.assignments,
      icon: 'bi-clipboard-check',
    });
  }
  return items.sort((a, b) => a.at - b.at).slice(0, limit);
}
