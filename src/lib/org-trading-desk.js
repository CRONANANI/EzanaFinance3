/**
 * Trading Desk (/org-trading) model: the derivations the page draws, kept
 * pure (no React, no I/O) so they can be tested and the components stay thin.
 *
 * The desk is the fund's shared book and its written review loop. Nothing
 * here places, sizes or simulates a trade. Every figure is computed from
 * payloads the page already loads (the one fund book, the Team Hub summary,
 * the roster and the flag routes). A missing input yields null and the page
 * prints N/A.
 */
import { NA, fmtMoney, shortName } from './org-command-center.js';
import { stripDemoLabel } from './org-display.js';

const HOUR_MS = 3600000;

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/* ── Formatting ─────────────────────────────────────────────────────────── */

/** +$1,417.00, -$2,176.20. A change, so always signed. Missing reads N/A. */
export function fmtSignedMoney(v) {
  const n = num(v);
  if (n == null) return NA;
  return `${n >= 0 ? '+' : '-'}${fmtMoney(Math.abs(n))}`;
}

/** 17.31%. A share of the fund is not a change, so it carries no sign. */
export function fmtShare(v, digits = 2) {
  const n = num(v);
  if (n == null) return NA;
  return `${n.toFixed(digits)}%`;
}

/** 1,250 or 12.5 (fractional shares keep up to four decimals). */
export function fmtShares(v) {
  const n = num(v);
  if (n == null) return NA;
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/** "3h ago", "2d ago". */
export function fmtAgo(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return NA;
  const min = Math.max(0, Math.floor((now - t) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

/** Nov 12, 2026, 4:05 PM in the reader's own time zone. */
export function fmtDateTime(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return NA;
  return new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/* ── Flags ──────────────────────────────────────────────────────────────── */

export const FLAG_TABS = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'sent', label: 'Sent' },
  { value: 'resolved', label: 'Resolved' },
];

/** The list request for each tab (the same three the inbox has always used). */
export const FLAG_TAB_QUERY = {
  inbox: 'asRecipient=true&status=open',
  sent: 'asRaiser=true',
  resolved: 'asRaiser=true&asRecipient=true&status=closed',
};

export const FLAG_TAB_EMPTY = {
  inbox: 'No flags are waiting on you.',
  sent: 'You have not raised a flag yet.',
  resolved: 'No answered flags yet.',
};

export const FLAG_STATUS_LABEL = {
  open: 'Awaiting response',
  accepted: 'Accepted',
  acknowledged: 'Acknowledged',
  rejected: 'Rejected',
  escalated: 'Escalated to IC',
  resolved: 'Resolved',
  expired: 'Expired',
};

export const ANSWERED = ['accepted', 'acknowledged', 'rejected', 'escalated'];

export function flagStatusLabel(status) {
  return FLAG_STATUS_LABEL[status] || status || NA;
}

/** "Red flag" or "Green flag": the colour always comes with the word. */
export function flagColorLabel(color) {
  return color === 'red' ? 'Red flag' : 'Green flag';
}

/**
 * Time left to answer an open flag. The colouring is the rule the inbox has
 * always had: amber under six hours, then overdue.
 * @returns {{ label: string, tone: 'default'|'warn'|'neg', overdue: boolean } | null}
 */
export function flagDeadline(flag, now = Date.now()) {
  if (!flag || flag.status !== 'open') return null;
  const due = Date.parse(flag.response_due_at || '');
  if (!Number.isFinite(due)) return null;
  const hrs = (due - now) / HOUR_MS;
  if (hrs <= 0) return { label: 'Overdue', tone: 'neg', overdue: true };
  let label;
  if (hrs < 1) label = '<1h';
  else if (hrs < 24) label = `${Math.floor(hrs)}h`;
  else label = `${Math.floor(hrs / 24)}d ${String(Math.floor(hrs % 24)).padStart(2, '0')}h`;
  return { label, tone: hrs < 6 ? 'warn' : 'default', overdue: false };
}

/** Only the two members a flag was routed to may answer it. */
export function isRoutedRecipient(flag, memberId) {
  if (!flag || !memberId) return false;
  return flag.recipient_member_id === memberId || flag.sector_head_member_id === memberId;
}

/** The routed members by name: covering analyst first, then the sector head. */
export function flagRecipients(flag) {
  const out = [];
  if (flag?.recipient?.display_name) out.push(flag.recipient.display_name);
  if (
    flag?.sector_head_member_id &&
    flag.sector_head_member_id !== flag.recipient_member_id &&
    flag?.sector_head?.display_name
  ) {
    out.push(flag.sector_head.display_name);
  }
  return out;
}

/** Evidence as the flag stores it: a label, never a file or a link. */
export function flagEvidenceLabels(flag) {
  const out = [];
  for (const e of flag?.evidence || []) {
    const kind = e.type === 'chart' ? 'Chart snapshot' : e.type || 'Evidence';
    out.push(e.caption ? `${kind}: ${e.caption}` : kind);
  }
  for (const a of flag?.attachments || []) {
    out.push(a.attachment_label || String(a.attachment_kind || 'Pinned item').replace(/_/g, ' '));
  }
  return out;
}

/** What a scored flag turned out to be, or null while it is not scored. */
export function flagOutcome(flag) {
  const o = Array.isArray(flag?.outcome) ? flag.outcome[0] : flag?.outcome;
  if (!o || o.was_correct == null) return null;
  return { correct: Boolean(o.was_correct) };
}

/**
 * The lists the three tabs show, from one array of flags. The live page asks
 * the server for each list; sample content is filtered here by the same rules
 * so both read alike.
 */
export function flagsForTab(flags, tab, memberId) {
  const all = Array.isArray(flags) ? flags : [];
  const routed = (f) => isRoutedRecipient(f, memberId);
  const raised = (f) => f.raiser_member_id === memberId;
  let out;
  if (tab === 'inbox') out = all.filter((f) => f.status === 'open' && routed(f));
  else if (tab === 'sent') out = all.filter(raised);
  else out = all.filter((f) => ANSWERED.includes(f.status) && (routed(f) || raised(f)));
  return [...out].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

/** Open flags per holding, keyed like the book: ticker plus team. */
export function openFlagsByHolding(flags) {
  const map = new Map();
  for (const f of Array.isArray(flags) ? flags : []) {
    if (f.status !== 'open') continue;
    const key = `${String(f.ticker || '').toUpperCase()}_${f.team_id || 'na'}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  return map;
}

/** The Review cell of a holding: what is open on it, in words. */
export function reviewState(flags) {
  const list = Array.isArray(flags) ? flags : [];
  if (list.length === 0) return null;
  if (list.length > 1) {
    return {
      label: `${list.length} open flags`,
      tone: list.some((f) => f.flag_color === 'red') ? 'neg' : 'pos',
    };
  }
  return {
    label: flagColorLabel(list[0].flag_color),
    tone: list[0].flag_color === 'red' ? 'neg' : 'pos',
  };
}

/* ── Member flag accuracy ───────────────────────────────────────────────── */

/** Average conviction is stored on a 1 to 3 scale: Low, Med, High. */
export function convictionWord(avg) {
  const n = num(avg);
  if (n == null) return NA;
  if (n < 1.5) return 'Low';
  if (n < 2.5) return 'Med';
  return 'High';
}

const CONVICTION_SCORE = { low: 1, med: 2, high: 3 };

/**
 * The per-member accuracy table, computed the way the accuracy route computes
 * it. Used for sample content, so the sample table follows from the sample
 * flags instead of being typed in.
 * @param {Array} flags each with raiser_member_id, raiser, flag_color, conviction, outcome
 * @param {Array<{responder_member_id:string, flag_id:string}>} rejections
 */
export function aggregateFlagAccuracy(flags, rejections = []) {
  const by = new Map();
  const ensure = (id, row) => {
    if (!by.has(id)) {
      by.set(id, {
        member_id: id,
        display_name: row?.display_name || null,
        role: row?.role || null,
        flags_raised: 0,
        green: 0,
        red: 0,
        scored: 0,
        correct: 0,
        cSum: 0,
        cN: 0,
        rejected_and_wrong: 0,
      });
    }
    const m = by.get(id);
    if (!m.display_name && row?.display_name) m.display_name = row.display_name;
    return m;
  };
  const byId = new Map();
  for (const f of flags || []) {
    byId.set(f.id, f);
    const m = ensure(f.raiser_member_id, f.raiser);
    m.flags_raised += 1;
    if (f.flag_color === 'green') m.green += 1;
    if (f.flag_color === 'red') m.red += 1;
    if (CONVICTION_SCORE[f.conviction]) {
      m.cSum += CONVICTION_SCORE[f.conviction];
      m.cN += 1;
    }
    const o = flagOutcome(f);
    if (o) {
      m.scored += 1;
      if (o.correct) m.correct += 1;
    }
  }
  for (const r of rejections || []) {
    const o = flagOutcome(byId.get(r.flag_id));
    if (o?.correct) ensure(r.responder_member_id, r.responder).rejected_and_wrong += 1;
  }
  return [...by.values()]
    .map((m) => ({
      member_id: m.member_id,
      display_name: m.display_name,
      role: m.role,
      flags_raised: m.flags_raised,
      green: m.green,
      red: m.red,
      scored: m.scored,
      correct: m.correct,
      accuracy_pct: m.scored > 0 ? Math.round((m.correct / m.scored) * 1000) / 10 : null,
      avg_conviction: m.cN > 0 ? Math.round((m.cSum / m.cN) * 100) / 100 : null,
      rejected_and_wrong: m.rejected_and_wrong,
    }))
    .sort((a, b) => (b.accuracy_pct ?? -1) - (a.accuracy_pct ?? -1));
}

/* ── Holdings ───────────────────────────────────────────────────────────── */

const keyOf = (ticker, teamId) => `${String(ticker || '').toUpperCase()}_${teamId || 'na'}`;

/**
 * One row per holding, with the people accountable for it.
 *
 * The covering analyst, sector head and thesis come from the flaggable-book
 * payload when the member can flag (it resolves them from the latest pitch,
 * sector coverage and the org chart). A member who cannot flag does not
 * receive that payload, so the analyst and sector head fall back to sector
 * coverage and the roster, and the thesis is unknown (N/A), never "No".
 *
 * Unpriced positions are carried at cost by the book: their value is their
 * cost and their gain is not a number.
 */
export function buildHoldingRows({
  positions,
  dossier,
  coverage,
  members,
  teams,
  openFlags,
  fundValue,
} = {}) {
  const book = Array.isArray(positions) ? positions : [];
  const teamName = new Map((teams || []).map((t) => [t.id || t.teamId, stripDemoLabel(t.name)]));
  const active = (members || []).filter((m) => m.is_active !== false);
  const nameById = new Map(active.map((m) => [m.id, m.display_name]));
  const pmByTeam = new Map();
  for (const m of active) {
    if (m.role === 'portfolio_manager' && m.team_id && !pmByTeam.has(m.team_id)) {
      pmByTeam.set(m.team_id, m);
    }
  }
  const analystBySector = new Map();
  for (const c of coverage || []) {
    if (!c.sector) continue;
    const who = active.find((m) => m.id === c.member_id);
    if (!who || who.role !== 'analyst') continue;
    if (!analystBySector.has(c.sector) || c.is_primary) analystBySector.set(c.sector, who.id);
  }
  const dossierKnown = Array.isArray(dossier);
  const dossierByKey = new Map((dossier || []).map((d) => [keyOf(d.ticker, d.teamDbId), d]));
  const flagsByKey = openFlagsByHolding(openFlags);
  const total = num(fundValue) ?? book.reduce((s, p) => s + (num(p.value) || 0), 0);

  return book.map((p) => {
    const key = keyOf(p.ticker, p.team_id);
    const d = dossierByKey.get(key) || null;
    const priced = p.priced ?? p.current_price != null;
    const cost = num(p.cost) ?? (num(p.shares) || 0) * (num(p.avg_cost) || 0);
    const value = num(p.value) ?? cost;
    const fallbackAnalystId = p.sector ? analystBySector.get(p.sector) || null : null;
    const fallbackPm = p.team_id ? pmByTeam.get(p.team_id) || null : null;
    const analystId = d ? d.analyst_member_id || null : fallbackAnalystId;
    const headId = d ? d.sector_head_member_id || null : fallbackPm?.id || null;
    return {
      key,
      id: p.id,
      ticker: String(p.ticker || '').toUpperCase(),
      name: p.name || null,
      teamId: p.team_id || null,
      teamName: p.team_id ? teamName.get(p.team_id) || null : null,
      sector: p.sector || null,
      analystId,
      analyst: d ? d.analyst || null : fallbackAnalystId ? nameById.get(fallbackAnalystId) : null,
      headId,
      head: d ? d.sector_head || null : fallbackPm?.display_name || null,
      thesisKnown: dossierKnown && Boolean(d),
      thesis: d?.thesis || null,
      shares: num(p.shares),
      avgCost: num(p.avg_cost),
      price: priced ? num(p.current_price) : null,
      priced: Boolean(priced),
      value,
      cost,
      pl: priced ? value - cost : null,
      plPct: priced && cost > 0 ? ((value - cost) / cost) * 100 : null,
      pctFund: total > 0 ? (value / total) * 100 : null,
      flags: flagsByKey.get(key) || [],
      isSample: Boolean(p.is_demo),
      position: p,
    };
  });
}

/**
 * What a member's role lets them see of the book.
 *   executive          the whole fund
 *   portfolio manager  their own team
 *   analyst            positions in the sectors they cover, with the rest of
 *                      their team shown read only
 * @returns {{ scope: 'fund'|'team'|'coverage', state: 'ok'|'no-team'|'no-coverage',
 *             mine: Array, others: Array }}
 */
export function scopeHoldings(rows, { role, teamId, memberId, coverage } = {}) {
  const all = Array.isArray(rows) ? rows : [];
  if (role === 'executive') return { scope: 'fund', state: 'ok', mine: all, others: [] };
  if (!teamId) {
    return {
      scope: role === 'analyst' ? 'coverage' : 'team',
      state: 'no-team',
      mine: [],
      others: [],
    };
  }
  const team = all.filter((r) => r.teamId === teamId);
  if (role !== 'analyst') return { scope: 'team', state: 'ok', mine: team, others: [] };
  const sectors = new Set(
    (coverage || []).filter((c) => c.member_id === memberId && c.sector).map((c) => c.sector),
  );
  const mine = team.filter((r) => r.sector && sectors.has(r.sector));
  return {
    scope: 'coverage',
    state: sectors.size === 0 ? 'no-coverage' : 'ok',
    mine,
    others: team.filter((r) => !mine.includes(r)),
  };
}

export const SCOPE_LABEL = {
  fund: 'Whole fund',
  team: 'Your team',
  coverage: 'Your coverage',
};

/** Text filter over ticker, company, the two names and the thesis. */
export function filterHoldings(rows, { team = 'all', query = '' } = {}) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  return (rows || []).filter((r) => {
    if (team === 'unassigned' ? r.teamId : team !== 'all' && r.teamId !== team) return false;
    if (!q) return true;
    return [r.ticker, r.name, r.teamName, r.sector, r.analyst, r.head, r.thesis]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
}

/** Totals of a set of rows. Unpriced rows add their cost to value and no gain. */
export function holdingsTotals(rows) {
  let value = 0;
  let cost = 0;
  let unpriced = 0;
  for (const r of rows || []) {
    value += r.value || 0;
    cost += r.cost || 0;
    if (!r.priced) unpriced += 1;
  }
  return {
    count: (rows || []).length,
    value,
    cost,
    pl: value - cost,
    plPct: cost > 0 ? ((value - cost) / cost) * 100 : null,
    unpriced,
  };
}

/** Gaps a council would want closed, counted from the rows in view. */
export function accountabilityGaps(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const thesisKnown = list.some((r) => r.thesisKnown);
  return {
    uncovered: list.filter((r) => !r.analyst).length,
    noHead: list.filter((r) => !r.head).length,
    noTeam: list.filter((r) => !r.teamId).length,
    unpriced: list.filter((r) => !r.priced).length,
    noThesis: thesisKnown ? list.filter((r) => r.thesisKnown && !r.thesis).length : null,
  };
}

/** The most recent pricing time across the book, or null when nothing is priced. */
export function pricesAsOf(positions) {
  let latest = null;
  for (const p of positions || []) {
    const t = Date.parse(p.last_priced_at || '');
    if (Number.isFinite(t) && (latest == null || t > latest)) latest = t;
  }
  return latest == null ? null : new Date(latest).toISOString();
}

/* ── Fund book ──────────────────────────────────────────────────────────── */

/** "Today": the last two daily fund records compared. Null under two records. */
export function todayChange(snapshots) {
  const s = Array.isArray(snapshots) ? snapshots : [];
  if (s.length < 2) return null;
  const last = num(s[s.length - 1].value);
  const prev = num(s[s.length - 2].value);
  if (last == null || prev == null) return null;
  return { dollar: last - prev, pct: prev ? ((last - prev) / prev) * 100 : null };
}

export const ALLOCATION_COLORS = [
  'var(--chart-cat-1)',
  'var(--chart-cat-3)',
  'var(--chart-cat-2)',
  'var(--chart-cat-4)',
  'var(--chart-cat-6)',
  'var(--chart-cat-7)',
  'var(--chart-cat-5)',
];
export const UNASSIGNED_COLOR = 'var(--text-muted)';

/**
 * Allocation by sector team: each team's sleeve as a share of the book, and
 * one "Unassigned" slice for positions on no team. Shares are unsigned.
 */
export function allocationSlices(sectors, positions) {
  const teams = (Array.isArray(sectors) ? sectors : [])
    .filter((s) => num(s.value) > 0)
    .sort((a, b) => b.value - a.value);
  const ids = new Set(teams.map((s) => s.teamId));
  const unassigned = (positions || [])
    .filter((p) => !ids.has(p.team_id))
    .reduce((sum, p) => sum + (num(p.value) || 0), 0);
  const slices = teams.map((s, i) => ({
    id: s.teamId,
    name: stripDemoLabel(s.name),
    value: Number(s.value),
    color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
  }));
  if (unassigned > 0) {
    slices.push({
      id: 'unassigned',
      name: 'Unassigned',
      value: unassigned,
      color: UNASSIGNED_COLOR,
    });
  }
  const total = slices.reduce((s, x) => s + x.value, 0);
  return {
    total,
    slices: slices.map((s) => ({ ...s, pct: total > 0 ? (s.value / total) * 100 : null })),
  };
}

/** Team filters for the holdings table: only the teams that hold something in view. */
export function teamFilters(rows) {
  const seen = new Map();
  let unassigned = false;
  for (const r of rows || []) {
    if (!r.teamId) unassigned = true;
    else if (!seen.has(r.teamId)) seen.set(r.teamId, r.teamName || 'Team');
  }
  const out = [...seen.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (unassigned) out.push({ value: 'unassigned', label: 'Unassigned' });
  return out;
}

export { NA, shortName };
