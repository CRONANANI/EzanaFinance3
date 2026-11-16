/**
 * Meetings (/org-team-hub/meetings): the page model.
 *
 * Pure: no React, no fetch, no server imports. The list loader, the detail
 * and vote routes, the page, the sample bundle and the tests all read these
 * functions, so the rules cannot drift apart.
 *
 * Rules that live here:
 *   - Only voting members (executives, which includes faculty advisors, and
 *     portfolio managers) count toward quorum. A voting member counts once
 *     they replied yes or were marked as attended.
 *   - The committee vote on this page is never shown as a running count.
 *     While a meeting is not completed a member may learn only how many
 *     ballots were received, whether quorum is met, and their own vote. The
 *     Buy, Pass and Abstain counts appear once the meeting is completed.
 *   - Upcoming means not completed, soonest first. A meeting whose date has
 *     passed but that nobody completed stays upcoming and reads "Not closed".
 */

export const NA = 'N/A';
export const VOTER_ROLES = ['executive', 'portfolio_manager'];
export const VOTE_VALUES = ['buy', 'pass', 'abstain'];
export const RSVP_VALUES = ['yes', 'maybe', 'no'];
export const DEFAULT_QUORUM_PCT = 50;

export const CATEGORIES = [
  { key: 'ic', label: 'IC' },
  { key: 'sector', label: 'Sector' },
  { key: 'general', label: 'General' },
  { key: 'exec', label: 'Exec' },
  { key: 'education', label: 'Education' },
];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
export const categoryLabel = (key) =>
  (CATEGORIES.find((c) => c.key === key) || CATEGORIES[2]).label;

export const AGENDA_KINDS = ['discussion', 'pitch', 'review', 'vote', 'update', 'other'];
export const DELIVERABLE_KINDS = [
  'model',
  'memo',
  'report',
  'deck',
  'sheet',
  'primer',
  'news',
  'earnings_call',
];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const kindLabel = (k) => (k ? cap(String(k).replace(/_/g, ' ')) : NA);

export const VOTE_LABELS = { buy: 'Buy', pass: 'Pass', abstain: 'Abstain' };
export const RSVP_LABELS = { yes: 'Yes', maybe: 'Maybe', no: 'No', pending: 'No reply' };

/* ── Roles ─────────────────────────────────────────────────────────────── */
export const isVoterRole = (role) => VOTER_ROLES.includes(role);

const ROLE_LABELS = {
  executive: 'Executive',
  portfolio_manager: 'Portfolio manager',
  analyst: 'Analyst',
};
/** Sentence-case label, preferring the member's title (for example "Faculty advisor"). */
export function roleLabel(role, subRole) {
  const s = String(subRole || '').trim();
  if (s) {
    const words = s
      .split(/\s+/)
      .map((w, i) =>
        w.toLowerCase() === 'pm' ? 'PM' : i === 0 ? cap(w.toLowerCase()) : w.toLowerCase(),
      );
    return words.join(' ');
  }
  return ROLE_LABELS[role] || NA;
}

/* ── Status and time ───────────────────────────────────────────────────── */
export const isCompleted = (m) => m?.status === 'closed';
export const whenOf = (m) => m?.scheduled_at || m?.ended_at || null;
const ms = (iso) => (iso ? Date.parse(iso) : NaN);

/** A meeting whose date has passed and that nobody marked completed. */
export function isNotClosed(m, now = Date.now()) {
  if (!m || isCompleted(m) || !m.scheduled_at) return false;
  return ms(m.scheduled_at) < now;
}

export function statusLabel(m, now = Date.now()) {
  if (isCompleted(m)) return 'Completed';
  if (isNotClosed(m, now)) return 'Not closed';
  return 'Scheduled';
}

/** Upcoming: soonest first, meetings without a time last. */
export function sortUpcoming(list) {
  return [...(list || [])].sort((a, b) => {
    const x = ms(a.scheduled_at);
    const y = ms(b.scheduled_at);
    if (Number.isNaN(x) && Number.isNaN(y)) return ms(b.created_at) - ms(a.created_at) || 0;
    if (Number.isNaN(x)) return 1;
    if (Number.isNaN(y)) return -1;
    return x - y;
  });
}

/** Past: latest first. */
export function sortPast(list) {
  return [...(list || [])].sort(
    (a, b) => (ms(whenOf(b)) || ms(b.created_at) || 0) - (ms(whenOf(a)) || ms(a.created_at) || 0),
  );
}

/** The earliest scheduled meeting dated now or later. */
export function nextMeeting(meetings, now = Date.now()) {
  return (
    sortUpcoming(
      (meetings || []).filter(
        (m) => !isCompleted(m) && m.scheduled_at && ms(m.scheduled_at) >= now,
      ),
    )[0] || null
  );
}

/* ── Terms ─────────────────────────────────────────────────────────────── */
/* Spring January to April, Summer May to August, Fall September to December. */
const TERMS = [
  { name: 'Spring', from: 0, to: 3 },
  { name: 'Summer', from: 4, to: 7 },
  { name: 'Fall', from: 8, to: 11 },
];
function termFor(year, index) {
  const t = TERMS[index];
  return {
    key: `${year}-${t.name.toLowerCase()}`,
    label: `${t.name} ${year}`,
    start: new Date(year, t.from, 1).getTime(),
    end: new Date(year, t.to + 1, 1).getTime() - 1,
    year,
    index,
  };
}
export function termOf(time = Date.now()) {
  const d = new Date(time);
  const month = d.getMonth();
  return termFor(
    d.getFullYear(),
    TERMS.findIndex((t) => month >= t.from && month <= t.to),
  );
}
export function termByKey(key, now = Date.now()) {
  const m = /^(\d{4})-(spring|summer|fall)$/.exec(String(key || ''));
  if (!m) return termOf(now);
  return termFor(
    Number(m[1]),
    TERMS.findIndex((t) => t.name.toLowerCase() === m[2]),
  );
}
export function shiftTerm(term, step) {
  let { year, index } = term;
  index += step;
  while (index < 0) {
    index += 3;
    year -= 1;
  }
  while (index > 2) {
    index -= 3;
    year += 1;
  }
  return termFor(year, index);
}
export function inTerm(m, term) {
  const t = ms(whenOf(m)) || ms(m?.created_at);
  return Number.isFinite(t) && t >= term.start && t <= term.end;
}

/* ── Lists ─────────────────────────────────────────────────────────────── */
export const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'term', label: 'Term' },
];
export const TAB_KEYS = TABS.map((t) => t.key);

/** The meetings a tab shows, before the category filter. */
export function meetingsForTab(meetings, tab, term) {
  const all = meetings || [];
  if (tab === 'past') return sortPast(all.filter(isCompleted));
  if (tab === 'term') {
    const rows = all.filter((m) => inTerm(m, term));
    return [...sortUpcoming(rows.filter((m) => m.scheduled_at))].concat(
      rows.filter((m) => !m.scheduled_at),
    );
  }
  return sortUpcoming(all.filter((m) => !isCompleted(m)));
}

export function filterByCategory(list, category) {
  if (!category || category === 'all') return list || [];
  return (list || []).filter((m) => (m.category || 'general') === category);
}

export function categoryCounts(list) {
  const out = { all: (list || []).length };
  for (const c of CATEGORY_KEYS) out[c] = 0;
  for (const m of list || []) {
    const k = CATEGORY_KEYS.includes(m.category) ? m.category : 'general';
    out[k] += 1;
  }
  return out;
}

/* ── Quorum and replies ────────────────────────────────────────────────── */
export function quorumOf({ eligible = 0, confirmed = 0, pct = DEFAULT_QUORUM_PCT } = {}) {
  const p = Number.isFinite(Number(pct)) && pct !== null ? Number(pct) : DEFAULT_QUORUM_PCT;
  const needed = Math.ceil((p / 100) * eligible);
  return { eligible, confirmed, pct: p, needed, met: eligible > 0 && confirmed >= needed };
}

/** A voting member who replied yes or was marked as attended. */
export const confirmsQuorum = (a) =>
  isVoterRole(a?.role) && (a.attended === true || a.rsvp === 'yes');

/**
 * Replies for one meeting from its attendee rows ({ member_id, role, rsvp,
 * attended }). `mine` is the viewer's own reply, or null when not invited.
 */
export function replySummary(attendees, viewerMemberId = null) {
  const out = {
    invited: 0,
    yes: 0,
    maybe: 0,
    no: 0,
    pending: 0,
    voters_invited: 0,
    voters_yes: 0,
    mine: null,
  };
  for (const a of attendees || []) {
    out.invited += 1;
    const r = RSVP_VALUES.includes(a.rsvp) ? a.rsvp : 'pending';
    out[r] += 1;
    if (isVoterRole(a.role)) {
      out.voters_invited += 1;
      if (confirmsQuorum(a)) out.voters_yes += 1;
    }
    if (viewerMemberId && a.member_id === viewerMemberId) out.mine = r;
  }
  return out;
}

/** Replies by role for the tracker: voting roles first, then the rest. */
export function repliesByRole(attendees) {
  const groups = [
    { key: 'executive', label: 'Executives', counts: true },
    { key: 'portfolio_manager', label: 'Portfolio managers', counts: true },
    { key: 'analyst', label: 'Analysts', counts: false },
  ];
  return groups
    .map((g) => {
      const rows = (attendees || []).filter((a) =>
        g.key === 'analyst' ? !isVoterRole(a.role) : a.role === g.key,
      );
      return {
        ...g,
        invited: rows.length,
        yes: rows.filter((a) => a.rsvp === 'yes' || a.attended === true).length,
        replied: rows.filter((a) => RSVP_VALUES.includes(a.rsvp)).length,
      };
    })
    .filter((g) => g.invited > 0);
}

/* ── The committee vote ────────────────────────────────────────────────── */
/**
 * What a member may see of a meeting's committee vote.
 *
 * @param {{ votes?: object[], completed: boolean, viewerMemberId?: string|null,
 *           eligible?: number, confirmed?: number, quorumPct?: number|null,
 *           received?: number|null }} input
 *   `votes` are ballot rows ({ voter_member_id, vote }) the server could read.
 *   `received` overrides the count taken from `votes` (the server counts
 *   ballots separately once members can no longer read each other's).
 */
export function meetingBallotView({
  votes = [],
  completed,
  viewerMemberId = null,
  eligible = 0,
  confirmed = 0,
  quorumPct = null,
  received = null,
}) {
  const all = Array.isArray(votes) ? votes.filter((v) => VOTE_VALUES.includes(v?.vote)) : [];
  const own = viewerMemberId ? all.find((v) => v.voter_member_id === viewerMemberId) : null;
  const q = quorumOf({ eligible, confirmed, pct: quorumPct ?? DEFAULT_QUORUM_PCT });
  const view = {
    sealed: !completed,
    completed: Boolean(completed),
    received: received != null ? received : all.length,
    eligible,
    confirmed,
    quorum_pct: q.pct,
    quorum_needed: q.needed,
    quorum_met: q.met,
    mine: own ? own.vote : null,
    tally: null,
  };
  if (completed) {
    view.tally = { buy: 0, pass: 0, abstain: 0 };
    for (const v of all) view.tally[v.vote] += 1;
  }
  return view;
}

/** Why a vote cannot be cast right now, or null when it can. */
export function voteBlocker({ meeting, role, quorumMet }) {
  if (!meeting || meeting.category !== 'ic') return 'Voting is for IC meetings only.';
  if (!isVoterRole(role)) return 'Only executives and portfolio managers vote.';
  if (isCompleted(meeting)) return 'Voting closed when the meeting was completed.';
  if (!quorumMet) return 'Voting opens when quorum is met.';
  return null;
}

/* ── Strip figures ─────────────────────────────────────────────────────── */
/**
 * @param {object[]} meetings list rows (each may carry `replies`)
 * @param {{ now?: number, eligible?: number }} opts eligible = voting members
 */
export function metricsOf(meetings, { now = Date.now(), eligible = 0 } = {}) {
  const term = termOf(now);
  const all = meetings || [];
  const open = all.filter((m) => !isCompleted(m));
  const future = open.filter((m) => m.scheduled_at && ms(m.scheduled_at) >= now);
  return {
    next: nextMeeting(all, now),
    upcomingTerm: open.filter((m) => !m.scheduled_at || inTerm(m, term)).length,
    awaitingReply: future.filter((m) => m.replies?.mine === 'pending').length,
    quorumAtRisk: future.filter(
      (m) =>
        m.category === 'ic' &&
        !quorumOf({ eligible, confirmed: m.replies?.voters_yes || 0, pct: m.quorum_pct }).met,
    ).length,
    completedTerm: all.filter((m) => isCompleted(m) && inTerm(m, term)).length,
    notClosed: open.filter((m) => isNotClosed(m, now)).length,
    term,
  };
}

/* ── Formatting ────────────────────────────────────────────────────────── */
const pad = (n) => String(n).padStart(2, '0');
export function fmtTime(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? NA : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtDay(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export function fmtDate(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  const day = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${day} ${fmtTime(iso)}`;
}
/** Value for a datetime-local input, in the viewer's time zone. */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const agendaMinutes = (agenda) =>
  (agenda || []).reduce(
    (s, it) => s + (Number.isFinite(Number(it?.minutes)) ? Number(it.minutes) : 0),
    0,
  );

/**
 * The next meeting brief: facts about the meeting, in sentences. Describes,
 * never advises.
 */
export function briefOf(m, { eligible = 0, pitchesById = null } = {}) {
  if (!m) return [];
  const out = [];
  const where = m.location ? ` in ${m.location}` : '';
  out.push(`${categoryLabel(m.category)} meeting on ${fmtDateTime(m.scheduled_at)}${where}.`);
  const items = m.agenda_items ?? (Array.isArray(m.agenda) ? m.agenda.length : 0);
  const minutes = m.agenda_minutes ?? agendaMinutes(m.agenda);
  out.push(
    items > 0
      ? `${items} agenda item${items === 1 ? '' : 's'}${minutes > 0 ? `, ${minutes} min planned` : ''}.`
      : 'No agenda items yet.',
  );
  const r = m.replies;
  if (r && r.invited > 0) {
    out.push(`${r.yes} of ${r.invited} invited replied yes, ${r.pending} not replied.`);
  } else {
    out.push('Nobody has been invited yet.');
  }
  if (m.category === 'ic') {
    const q = quorumOf({ eligible, confirmed: r?.voters_yes || 0, pct: m.quorum_pct });
    out.push(
      `${q.confirmed} of ${q.eligible} voting members confirmed; ${q.needed} needed for quorum.`,
    );
  }
  const p = m.pitch_id && pitchesById ? pitchesById.get(m.pitch_id) : null;
  if (p) out.push(`Linked pitch: ${p.ticker}${p.company_name ? `, ${p.company_name}` : ''}.`);
  return out;
}

/* ── Committee sessions from the Pitch Pipeline (read only) ────────────── */
const SESSION_STATUS = { scheduled: 'Scheduled', in_session: 'In session', closed: 'Closed' };
export const sessionStatusLabel = (s) => SESSION_STATUS[s] || NA;

/** Sessions that are not closed, soonest first, then the latest closed one. */
export function sessionsToShow(sessions, limit = 4) {
  const rows = sessions || [];
  const open = rows
    .filter((s) => s.status !== 'closed')
    .sort((a, b) => (ms(a.meets_at) || Infinity) - (ms(b.meets_at) || Infinity));
  const closed = rows
    .filter((s) => s.status === 'closed')
    .sort((a, b) => (ms(b.meets_at) || 0) - (ms(a.meets_at) || 0));
  return [...open, ...closed.slice(0, 1)].slice(0, limit);
}

/* ── Forms ─────────────────────────────────────────────────────────────── */
export function validateMeetingForm(form) {
  const errors = {};
  if (!String(form?.title || '').trim()) errors.title = 'Enter a title.';
  if (form?.quorum_pct !== '' && form?.quorum_pct != null) {
    const n = Number(form.quorum_pct);
    if (!Number.isFinite(n) || n < 1 || n > 100) errors.quorum_pct = 'Enter 1 to 100.';
  }
  return errors;
}

/** The request body for create and for the "update" action, from the form. */
export function meetingBody(form) {
  const body = {
    title: String(form.title || '')
      .trim()
      .slice(0, 160),
    category: CATEGORY_KEYS.includes(form.category) ? form.category : 'general',
    scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    location: String(form.location || '').trim() || null,
    quorum_pct:
      form.quorum_pct === '' || form.quorum_pct == null
        ? null
        : Math.round(Number(form.quorum_pct)),
  };
  if ('pitch_id' in form) body.pitch_id = form.pitch_id || null;
  return body;
}

/* ── Sample content: actions applied on the page ───────────────────────── */
const clone = (x) => JSON.parse(JSON.stringify(x));

function refreshListRow(bundle, id) {
  const d = bundle.details[id];
  const row = bundle.list.meetings.find((m) => m.id === id);
  if (!d || !row) return;
  const m = d.meeting;
  Object.assign(row, {
    title: m.title,
    category: m.category,
    status: m.status,
    scheduled_at: m.scheduled_at,
    ended_at: m.ended_at,
    location: m.location,
    quorum_pct: m.quorum_pct,
    recording_url: m.recording_url,
    pitch_id: m.pitch_id,
    agenda_items: (m.agenda || []).length,
    agenda_minutes: agendaMinutes(m.agenda),
    replies: replySummary(d.attendees, bundle.list.viewer.memberId),
  });
}

function refreshVotes(bundle, id) {
  const d = bundle.details[id];
  if (!d?.votes) return;
  const confirmed = d.attendees.filter(confirmsQuorum).length;
  const q = quorumOf({
    eligible: d.votes.eligible,
    confirmed,
    pct: d.meeting.quorum_pct ?? DEFAULT_QUORUM_PCT,
  });
  Object.assign(d.votes, {
    confirmed,
    quorum_pct: q.pct,
    quorum_needed: q.needed,
    quorum_met: q.met,
  });
}

/**
 * Apply one action to the sample bundle with the server's rules. Returns
 * { ok, bundle, error, id }. Nothing is sent anywhere.
 */
export function applySampleAction(input, action, now = Date.now()) {
  const bundle = clone(input);
  const viewer = bundle.list.viewer;
  const deny = (error) => ({ ok: false, bundle: input, error });
  const d = action.id ? bundle.details[action.id] : null;
  if (action.type !== 'create' && !d) return deny('Not found');
  const m = d?.meeting;

  switch (action.type) {
    case 'create': {
      if (!viewer.canCreateEvents) return deny('You cannot schedule meetings.');
      const body = meetingBody(action.form);
      if (!body.title) return deny('Title required');
      const id = `sample-meeting-new-${bundle.next_id++}`;
      const meeting = {
        id,
        ...body,
        status: 'scheduled',
        ended_at: null,
        team_id: null,
        recording_url: null,
        pitch_id: null,
        agenda: [],
        minutes: [],
        created_at: new Date(now).toISOString(),
        is_demo: true,
      };
      bundle.details[id] = {
        meeting,
        attendees: [],
        deliverables: [],
        votes:
          meeting.category === 'ic'
            ? meetingBallotView({
                completed: false,
                eligible: bundle.list.eligible_voters,
                quorumPct: meeting.quorum_pct,
              })
            : null,
        preRead: [],
        roster: bundle.roster,
        viewer: { ...viewer, isICVoter: meeting.category === 'ic' && isVoterRole(viewer.role) },
      };
      bundle.list.meetings.push({ ...meeting });
      refreshListRow(bundle, id);
      return { ok: true, bundle, id };
    }
    case 'update': {
      if (!viewer.canManage) return deny('Manager role required');
      const body = meetingBody(action.form);
      Object.assign(m, body);
      if ('pitch_id' in body) {
        const p = (bundle.list.pitches || []).find((x) => x.id === body.pitch_id);
        d.preRead = p
          ? [
              {
                kind: 'pitch',
                id: p.id,
                label: `${p.ticker}${p.company_name ? `: ${p.company_name}` : ''}`,
                note: p.thesis_short || null,
              },
            ]
          : [];
      }
      if (m.category === 'ic' && !d.votes) {
        d.votes = meetingBallotView({
          completed: isCompleted(m),
          eligible: bundle.list.eligible_voters,
          quorumPct: m.quorum_pct,
        });
      }
      if (m.category !== 'ic') d.votes = null;
      d.viewer.isICVoter = m.category === 'ic' && isVoterRole(viewer.role);
      refreshVotes(bundle, action.id);
      break;
    }
    case 'agenda':
      if (!viewer.canManage) return deny('Manager role required');
      m.agenda = (action.agenda || []).map((it, i) => ({
        id: it.id || `sample-agenda-${action.id}-${bundle.next_id++}`,
        n: i + 1,
        label: String(it.label || '').slice(0, 240),
        minutes:
          Number.isFinite(Number(it.minutes)) && it.minutes !== null && it.minutes !== ''
            ? Math.max(0, Math.round(Number(it.minutes)))
            : null,
        owner: it.owner || null,
        kind: it.kind || null,
        pitch_id: it.pitch_id || null,
      }));
      break;
    case 'complete':
      if (!viewer.canManage) return deny('Manager role required');
      if (isCompleted(m)) return deny('Already completed');
      m.status = 'closed';
      m.ended_at = new Date(now).toISOString();
      if (d.votes) {
        d.votes.sealed = false;
        d.votes.completed = true;
        /* The sample holds no other member's choice before completion, so the
           other ballots are given choices only now: one Pass when there are
           three or more, the rest Buy. */
        const others = Math.max(0, d.votes.received - (d.votes.mine ? 1 : 0));
        const tally = {
          buy: others - (others >= 3 ? 1 : 0),
          pass: others >= 3 ? 1 : 0,
          abstain: 0,
        };
        if (d.votes.mine) tally[d.votes.mine] += 1;
        d.votes.tally = tally;
      }
      break;
    case 'rsvp': {
      if (!RSVP_VALUES.includes(action.rsvp)) return deny('Invalid rsvp');
      let row = d.attendees.find((a) => a.member_id === viewer.memberId);
      if (!row) {
        row = {
          id: `sample-att-${bundle.next_id++}`,
          member_id: viewer.memberId,
          display_name: viewer.displayName || 'You',
          role: viewer.role,
          sub_role: viewer.subRole || null,
          rsvp: 'pending',
          attended: null,
        };
        d.attendees.push(row);
      }
      row.rsvp = action.rsvp;
      refreshVotes(bundle, action.id);
      break;
    }
    case 'addAttendee': {
      if (!viewer.canManage) return deny('Manager role required');
      const r = bundle.roster.find((x) => x.id === action.memberId);
      if (!r) return deny('Not a council member');
      if (!d.attendees.some((a) => a.member_id === r.id)) {
        d.attendees.push({
          id: `sample-att-${bundle.next_id++}`,
          member_id: r.id,
          display_name: r.display_name,
          role: r.role,
          sub_role: r.sub_role || null,
          rsvp: 'pending',
          attended: null,
        });
      }
      refreshVotes(bundle, action.id);
      break;
    }
    case 'attended': {
      if (!viewer.canManage) return deny('Manager role required');
      const row = d.attendees.find((a) => a.member_id === action.memberId);
      if (!row) return deny('Not invited');
      row.attended = Boolean(action.attended);
      refreshVotes(bundle, action.id);
      break;
    }
    case 'vote': {
      const blocked = voteBlocker({
        meeting: m,
        role: viewer.role,
        quorumMet: d.votes?.quorum_met,
      });
      if (blocked) return deny(blocked);
      if (!VOTE_VALUES.includes(action.vote)) return deny('Invalid vote');
      if (!d.votes.mine) d.votes.received += 1;
      d.votes.mine = action.vote;
      break;
    }
    case 'recording': {
      if (!viewer.canManage) return deny('Manager role required');
      const url = String(action.url || '').trim();
      if (!/^https?:\/\/\S+$/i.test(url)) return deny('Enter a web link (http or https).');
      m.recording_url = url;
      break;
    }
    case 'addDocument':
      if (!viewer.canRecordDocuments) return deny('You cannot record documents.');
      if (!String(action.label || '').trim()) return deny('Label required');
      d.deliverables.push({
        id: `sample-doc-${bundle.next_id++}`,
        kind: DELIVERABLE_KINDS.includes(action.kind) ? action.kind : 'memo',
        label: String(action.label).trim().slice(0, 200),
        is_demo: true,
      });
      break;
    case 'removeDocument':
      if (!viewer.canManage) return deny('Manager role required');
      d.deliverables = d.deliverables.filter((x) => x.id !== action.docId);
      break;
    default:
      return deny('Unknown action');
  }
  refreshListRow(bundle, action.id);
  return { ok: true, bundle, id: action.id };
}
