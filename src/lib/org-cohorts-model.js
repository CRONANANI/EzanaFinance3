/**
 * Cohorts (/org-team-hub/cohorts): labels, formatting and the derivations the
 * page draws. Pure: no React, no fetch, no server imports, so the routes, the
 * page, the sample bundle and the checks all share one copy.
 */

export const NA = 'N/A';

export const TABS = [
  { key: 'roster', label: 'Roster' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'alumni', label: 'Alumni' },
];
export const TAB_KEYS = TABS.map((t) => t.key);

export const COHORT_STATUS_LABEL = {
  recruiting: 'Recruiting',
  active: 'Active',
  graduating: 'Graduating',
  alumni: 'Alumni',
  archived: 'Archived',
};

export const LIFECYCLE_LABEL = {
  onboarding: 'Onboarding',
  active: 'Active',
  on_leave: 'On leave',
  graduating: 'Graduating',
  alumni: 'Alumni',
  departed: 'Departed',
};

/* Status is text with an optional icon, never a chip. Tone picks the colour. */
export const LIFECYCLE_TONE = {
  onboarding: 'muted',
  active: 'pos',
  on_leave: 'muted',
  graduating: 'warn',
  alumni: 'muted',
  departed: 'neg',
};
export const LIFECYCLE_ICON = {
  departed: 'bi-person-dash',
  on_leave: 'bi-pause-circle',
  graduating: 'bi-mortarboard',
};

export const ROLE_LABEL = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};
export const roleLabel = (r) => ROLE_LABEL[r] || (r ? String(r).replace(/_/g, ' ') : NA);

export const BOARD_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screened', label: 'Screened' },
  { key: 'interview', label: 'Interview' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'offer', label: 'Offer' },
  { key: 'accepted', label: 'Accepted' },
];
export const STAGE_LABEL = {
  ...Object.fromEntries(BOARD_STAGES.map((s) => [s.key, s.label])),
  rejected: 'Rejected',
  declined: 'Declined',
};
export const NEXT_STAGE = {
  applied: 'screened',
  screened: 'interview',
  interview: 'pitch',
  pitch: 'offer',
};
export const RUBRIC_LABEL = {
  technical: 'Technical',
  communication: 'Communication',
  culture_fit: 'Culture fit',
  prior_experience: 'Prior experience',
};

export const INDUSTRY_LABEL = {
  ib: 'Investment banking',
  pe: 'Private equity',
  am: 'Asset management',
  consulting: 'Consulting',
  other: 'Other',
};
export const FINANCE_INDUSTRIES = ['ib', 'pe', 'am', 'consulting'];
export const FLAG_LABEL = {
  guest_speaker: 'Guest speaker',
  mentor: 'Mentor',
  recruiter: 'Recruiter',
  donor: 'Donor',
};
export const FORM_FIELD_KINDS = [
  { kind: 'short_text', label: 'Short text' },
  { kind: 'long_text', label: 'Long text' },
  { kind: 'dropdown', label: 'Dropdown' },
  { kind: 'file', label: 'File link' },
  { kind: 'ticker', label: 'Ticker' },
];

/** The lifecycle the page shows: a member flagged on the Org Chart reads
 *  Graduating even when their stored lifecycle still says active. */
export function effectiveLifecycle(m) {
  if (!m) return 'active';
  const base = m.lifecycle_status || (m.is_active === false ? 'departed' : 'active');
  if (m.is_graduating && (base === 'active' || base === 'onboarding' || base === 'on_leave')) {
    return 'graduating';
  }
  return base;
}

/** The cohort a tab opens on: Recruitment on the recruiting cohort, every
 *  other tab on the current cohort, else the newest. */
export function defaultCohortId(list, tab) {
  if (!list?.length) return null;
  if (tab === 'recruitment') {
    const recruiting = list.find((c) => c.status === 'recruiting' && !c.archived);
    if (recruiting) return recruiting.id;
  }
  return list.find((c) => c.is_current)?.id || list[0]?.id || null;
}

/** The term line beside the tabs, from what the cohort has on file. */
export function termLine(c) {
  if (!c) return null;
  const parts = [];
  if (c.entry_term && c.expected_grad_term)
    parts.push(`${c.entry_term} to ${c.expected_grad_term}`);
  else if (c.entry_term) parts.push(`From ${c.entry_term}`);
  else if (c.expected_grad_term) parts.push(`Until ${c.expected_grad_term}`);
  if (c.is_current) parts.push('Current');
  if (c.archived) parts.push('Archived');
  return parts.length ? parts.join(', ') : null;
}

/* ── Formatting ──────────────────────────────────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Sep 02, 2026" (UTC, so server and browser agree). */
export function fmtDate(v) {
  if (!v) return NA;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return NA;
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}`;
}
export const fmtInt = (n) =>
  n == null || !Number.isFinite(Number(n)) ? NA : Math.round(Number(n)).toLocaleString('en-US');
export const fmtPct = (n) => (n == null || !Number.isFinite(Number(n)) ? NA : `${Math.round(n)}%`);
export const fmtStar = (n) =>
  n == null || !Number.isFinite(Number(n)) ? NA : `${Number(n).toFixed(1)} / 5`;

export function initialsOf(name) {
  const p = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!p.length) return '';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : p[0][1] || '')).toUpperCase();
}

/** How an applicant is named on the page: the blind ID while blinded. */
export function applicantLabel(a) {
  if (!a) return NA;
  if (a.blinded || !a.full_name) return a.blind_id || 'Applicant';
  return a.full_name;
}

/* ── Roster ──────────────────────────────────────────────────────────────── */
export function rosterSectors(members) {
  const set = new Set();
  for (const m of members || []) for (const s of m.sectors || []) set.add(s.sector);
  return [...set].sort();
}
export function rosterRoles(members) {
  return [...new Set((members || []).map((m) => m.role).filter(Boolean))].sort();
}

/** Filter and sort roster rows. Missing values sort last either way. */
export function filterRoster(members, { q = '', status = '', sector = '', role = '', sort }) {
  const needle = q.trim().toLowerCase();
  const rows = (members || []).filter((m) => {
    if (
      needle &&
      !String(m.display_name || '')
        .toLowerCase()
        .includes(needle)
    )
      return false;
    if (status && m.lifecycle_status !== status) return false;
    if (role && m.role !== role) return false;
    if (sector && !(m.sectors || []).some((s) => s.sector === sector)) return false;
    return true;
  });
  const { key = 'display_name', dir = 1 } = sort || {};
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

/** Lifecycle moves a manager may make from a status (the route checks). */
export function lifecycleActions(status) {
  if (status === 'alumni' || status === 'departed') return [];
  const out = [];
  if (status === 'onboarding') out.push({ to: 'active', label: 'Promote to active' });
  if (status === 'active') out.push({ to: 'on_leave', label: 'Mark on leave' });
  if (status === 'on_leave') out.push({ to: 'active', label: 'Return to active' });
  if (status !== 'graduating') out.push({ to: 'graduating', label: 'Begin graduation' });
  out.push({ to: 'departed', label: 'Depart', danger: true });
  return out;
}

/* ── Alumni ──────────────────────────────────────────────────────────────── */
/**
 * Alumni figures from the records on file. Destinations count only stored
 * industries; an alum with none is "no placement recorded".
 */
export function alumniSummary(alumni) {
  const rows = alumni || [];
  const total = rows.length;
  const counts = {};
  let unrecorded = 0;
  for (const a of rows) {
    if (INDUSTRY_LABEL[a.employer_industry]) {
      counts[a.employer_industry] = (counts[a.employer_industry] || 0) + 1;
    } else unrecorded += 1;
  }
  const destinations = Object.entries(counts)
    .map(([key, count]) => ({ key, label: INDUSTRY_LABEL[key], count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  let top = null;
  if (destinations.length) {
    const max = destinations[0].count;
    const leaders = destinations.filter((d) => d.count === max);
    top =
      leaders.length === 1
        ? { label: leaders[0].label, tied: false, caption: null }
        : {
            label: 'Tied',
            tied: true,
            caption: `${leaders.length} industries, ${max} ${max === 1 ? 'alumnus' : 'alumni'} each`,
          };
  }
  const placedFinance = rows.filter(
    (a) => a.placed_within_6mo === true && FINANCE_INDUSTRIES.includes(a.employer_industry),
  ).length;
  return {
    total,
    placedFinancePct: total > 0 ? Math.round((placedFinance / total) * 100) : null,
    engaged: rows.filter((a) => (a.engagement_flags || []).length > 0).length,
    destinations,
    unrecorded,
    top,
  };
}

export function filterAlumni(alumni, { cohort = '', industry = '', flag = '' }) {
  return (alumni || []).filter((a) => {
    if (cohort && a.cohort_id !== cohort) return false;
    if (industry === 'none' && a.employer_industry) return false;
    if (industry && industry !== 'none' && a.employer_industry !== industry) return false;
    if (flag && !(a.engagement_flags || []).includes(flag)) return false;
    return true;
  });
}

/* ── Address ─────────────────────────────────────────────────────────────── */
/** Read ?cohort= and ?tab= from a search string. */
export function readAddress(search) {
  const p = new URLSearchParams(search || '');
  const tab = p.get('tab');
  return {
    cohort: p.get('cohort') || null,
    tab: TAB_KEYS.includes(tab) ? tab : null,
  };
}
