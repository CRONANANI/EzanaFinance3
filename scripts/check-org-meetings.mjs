/**
 * Meetings (/org-team-hub/meetings, Nov 2026 redesign).
 *   npm run test:org-meetings
 *
 * Pure checks on the page model and the sample bundle, the Fund Analytics
 * "Since last meeting" pick, and source guards for the rules that are easy to
 * regress: no running vote count before a meeting is completed, only voting
 * members count toward quorum, the server refuses a vote without quorum or
 * after completion, and the sample is the shared sample council.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applySampleAction,
  briefOf,
  categoryCounts,
  confirmsQuorum,
  isNotClosed,
  meetingBallotView,
  meetingBody,
  meetingsForTab,
  metricsOf,
  nextMeeting,
  quorumOf,
  replySummary,
  roleLabel,
  shiftTerm,
  sortUpcoming,
  termByKey,
  termOf,
  validateMeetingForm,
  voteBlocker,
} from '../src/lib/org-meetings-model.js';
import { buildMeetingsSample } from '../src/lib/org-meetings-sample.js';
import { buildCommandCenterSample } from '../src/lib/org-command-center-sample.js';
import { sinceLastMeeting } from '../src/lib/org-fund-analytics.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const DAY = 86400000;
const iso = (d) => new Date(NOW + d * DAY).toISOString();
const viewer = (role = 'executive') => ({
  userId: 'me',
  memberId: 'm-me',
  role,
  displayName: 'Test Member',
  now: NOW,
});

test('quorum: only voting members who replied yes or attended count', () => {
  const attendees = [
    { member_id: 'a', role: 'executive', rsvp: 'yes' },
    { member_id: 'b', role: 'portfolio_manager', rsvp: 'maybe', attended: true },
    { member_id: 'c', role: 'portfolio_manager', rsvp: 'no' },
    { member_id: 'd', role: 'analyst', rsvp: 'yes' },
    { member_id: 'e', role: 'analyst', rsvp: 'yes', attended: true },
  ];
  assert.equal(attendees.filter(confirmsQuorum).length, 2);
  const r = replySummary(attendees, 'd');
  assert.equal(r.voters_yes, 2);
  assert.equal(r.voters_invited, 3);
  assert.equal(r.mine, 'yes');
  /* Analysts confirming cannot unlock a vote. */
  assert.equal(quorumOf({ eligible: 5, confirmed: 2, pct: 60 }).met, false);
  assert.equal(quorumOf({ eligible: 5, confirmed: 3, pct: 60 }).needed, 3);
  assert.equal(quorumOf({ eligible: 4, confirmed: 2, pct: null }).met, true);
  assert.equal(quorumOf({ eligible: 0, confirmed: 0 }).met, false);
});

test('ballots: no running count, names or choices before completion', () => {
  const votes = [
    { voter_member_id: 'x', vote: 'buy' },
    { voter_member_id: 'y', vote: 'pass' },
    { voter_member_id: 'me', vote: 'abstain' },
  ];
  const open = meetingBallotView({
    votes,
    completed: false,
    viewerMemberId: 'me',
    eligible: 5,
    confirmed: 3,
    quorumPct: 60,
  });
  assert.equal(open.tally, null);
  assert.equal(open.sealed, true);
  assert.equal(open.received, 3);
  assert.equal(open.mine, 'abstain');
  assert.deepEqual(
    Object.keys(open).sort(),
    [
      'completed',
      'confirmed',
      'eligible',
      'mine',
      'quorum_met',
      'quorum_needed',
      'quorum_pct',
      'received',
      'sealed',
      'tally',
    ].sort(),
  );
  assert.ok(!JSON.stringify(open).includes('"x"') && !JSON.stringify(open).includes('pass'));
  /* A count taken separately (the counting function) wins over readable rows. */
  assert.equal(
    meetingBallotView({ votes: [], completed: false, eligible: 5, received: 4 }).received,
    4,
  );
  const closed = meetingBallotView({ votes, completed: true, viewerMemberId: 'me', eligible: 5 });
  assert.deepEqual(closed.tally, { buy: 1, pass: 1, abstain: 1 });
});

test('vote rules: IC only, voters only, open only, quorum met', () => {
  const ic = { category: 'ic', status: 'scheduled' };
  assert.equal(voteBlocker({ meeting: ic, role: 'executive', quorumMet: true }), null);
  assert.match(voteBlocker({ meeting: ic, role: 'analyst', quorumMet: true }), /executives/);
  assert.match(voteBlocker({ meeting: ic, role: 'executive', quorumMet: false }), /quorum/);
  assert.match(
    voteBlocker({ meeting: { ...ic, status: 'closed' }, role: 'executive', quorumMet: true }),
    /closed/,
  );
  assert.match(
    voteBlocker({ meeting: { category: 'general' }, role: 'executive', quorumMet: true }),
    /IC/,
  );
});

test('lists: upcoming soonest first, past-dated open meetings read Not closed', () => {
  const rows = [
    { id: 'far', status: 'scheduled', scheduled_at: iso(20) },
    { id: 'soon', status: 'scheduled', scheduled_at: iso(1) },
    { id: 'none', status: 'scheduled', scheduled_at: null, created_at: iso(-1) },
    { id: 'late', status: 'scheduled', scheduled_at: iso(-2) },
    { id: 'done', status: 'closed', scheduled_at: iso(-5) },
  ];
  assert.deepEqual(
    sortUpcoming(rows.filter((r) => r.status !== 'closed')).map((r) => r.id),
    ['late', 'soon', 'far', 'none'],
  );
  assert.equal(isNotClosed(rows[3], NOW), true);
  assert.equal(isNotClosed(rows[1], NOW), false);
  assert.equal(nextMeeting(rows, NOW).id, 'soon');
  assert.deepEqual(
    meetingsForTab(rows, 'past', termOf(NOW)).map((r) => r.id),
    ['done'],
  );
  assert.equal(categoryCounts([{ category: 'ic' }, { category: 'odd' }]).general, 1);
});

test('terms: fall 2026 runs September to December, and steps across years', () => {
  const t = termOf(NOW);
  assert.equal(t.key, '2026-fall');
  assert.equal(shiftTerm(t, 1).key, '2027-spring');
  assert.equal(shiftTerm(termByKey('2026-spring'), -1).key, '2025-fall');
  assert.equal(termByKey('nonsense', NOW).key, '2026-fall');
});

test('figures and brief describe the data', () => {
  const rows = [
    {
      id: 'a',
      category: 'ic',
      status: 'scheduled',
      scheduled_at: iso(3),
      quorum_pct: 60,
      replies: { invited: 4, yes: 2, pending: 1, voters_yes: 1, mine: 'pending' },
      agenda_items: 2,
      agenda_minutes: 30,
    },
    { id: 'b', category: 'general', status: 'closed', scheduled_at: iso(-3) },
  ];
  const m = metricsOf(rows, { now: NOW, eligible: 5 });
  assert.equal(m.next.id, 'a');
  assert.equal(m.awaitingReply, 1);
  assert.equal(m.quorumAtRisk, 1);
  assert.equal(m.completedTerm, 1);
  const brief = briefOf(rows[0], { eligible: 5 }).join(' ');
  assert.match(brief, /1 of 5 voting members confirmed; 3 needed/);
  assert.ok(!/should|recommend|consider/i.test(brief));
});

test('form: title required, quorum 1 to 100', () => {
  assert.ok(validateMeetingForm({ title: ' ' }).title);
  assert.ok(validateMeetingForm({ title: 'A', quorum_pct: 0 }).quorum_pct);
  assert.deepEqual(validateMeetingForm({ title: 'A', quorum_pct: '' }), {});
  const body = meetingBody({ title: ' X ', category: 'bad', quorum_pct: '', scheduled_at: '' });
  assert.equal(body.title, 'X');
  assert.equal(body.category, 'general');
  assert.equal(body.quorum_pct, null);
  assert.equal(roleLabel('portfolio_manager', 'Senior PM'), 'Senior PM');
  assert.equal(roleLabel('executive', 'Faculty Advisor'), 'Faculty advisor');
});

test('sample: the shared council and the Command Center meetings', () => {
  const s = buildMeetingsSample(viewer());
  const cc = buildCommandCenterSample({ userId: 'me', role: 'executive', now: NOW });
  for (const m of cc.meetings.meetings) {
    const mine = s.list.meetings.find((x) => x.id === m.id);
    assert.ok(mine, `missing ${m.id}`);
    assert.equal(mine.title, m.title);
    assert.equal(mine.scheduled_at.slice(0, 10), m.scheduled_at.slice(0, 10));
  }
  const names = s.roster.map((r) => r.display_name);
  for (const n of [
    'Amara Tesfaye',
    'Selam Haile',
    'Chidi Okoye',
    'Ingrid Lindqvist',
    'Elena Rossi',
  ]) {
    assert.ok(names.includes(n), n);
  }
  for (const m of s.list.meetings) assert.equal(m.is_demo, true);
  for (const d of Object.values(s.details)) {
    assert.equal(d.meeting.is_demo, true);
    if (d.votes && d.meeting.status !== 'closed') assert.equal(d.votes.tally, null);
  }
  assert.ok(s.list.meetings.every((m) => m.scheduled_at.startsWith('2026')));
  assert.ok(s.list.sessions.length > 0);
});

test('sample: actions follow the server rules and never reveal choices early', () => {
  const s = buildMeetingsSample(viewer());
  const id = 'sample-meeting-002';
  let r = applySampleAction(s, { type: 'vote', id, vote: 'buy' }, NOW);
  assert.equal(r.ok, true);
  assert.equal(r.bundle.details[id].votes.mine, 'buy');
  assert.equal(r.bundle.details[id].votes.tally, null);
  r = applySampleAction(r.bundle, { type: 'complete', id }, NOW);
  const t = r.bundle.details[id].votes.tally;
  assert.equal(t.buy + t.pass + t.abstain, r.bundle.details[id].votes.received);
  assert.equal(r.bundle.list.meetings.find((m) => m.id === id).status, 'closed');
  /* An analyst cannot vote, edit or schedule. */
  const a = buildMeetingsSample(viewer('analyst'));
  assert.equal(applySampleAction(a, { type: 'vote', id, vote: 'buy' }, NOW).ok, false);
  assert.equal(applySampleAction(a, { type: 'agenda', id, agenda: [] }, NOW).ok, false);
  assert.equal(applySampleAction(a, { type: 'create', form: { title: 'x' } }, NOW).ok, false);
  assert.equal(applySampleAction(a, { type: 'rsvp', id, rsvp: 'yes' }, NOW).ok, true);
  /* Recording links must be web links. */
  assert.equal(
    applySampleAction(s, { type: 'recording', id: 'sample-meeting-009', url: 'ftp://x' }, NOW).ok,
    false,
  );
});

/* A query builder that records the calls and returns `rows` filtered the way
   the database would for the filters this code uses. */
function fakeSupabase(meetings) {
  const calls = [];
  const q = (table) => {
    const state = { table, filters: [], order: null };
    const api = {
      select: () => api,
      eq: () => api,
      not: (col, op, val) => (state.filters.push(['not', col, op, val]), api),
      lte: (col, val) => (state.filters.push(['lte', col, val]), api),
      gte: () => api,
      order: (col, opts) => ((state.order = [col, opts]), api),
      limit: () => api,
      then: (res) => {
        calls.push(state);
        if (table !== 'org_meetings') return res({ count: 0, data: [] });
        let rows = [...meetings];
        for (const f of state.filters) {
          if (f[0] === 'not') rows = rows.filter((r) => r[f[1]] != null);
          if (f[0] === 'lte') rows = rows.filter((r) => r[f[1]] && r[f[1]] <= f[2]);
        }
        if (state.order) {
          const [col, { ascending }] = state.order;
          rows.sort((a, b) => (a[col] < b[col] ? -1 : 1) * (ascending ? 1 : -1));
        }
        return res({ data: rows });
      },
    };
    return api;
  };
  return { from: q, calls };
}

test('Fund Analytics: since last meeting is the latest past meeting by its date', async () => {
  const sb = fakeSupabase([
    { id: 'future', scheduled_at: iso(3), created_at: iso(-30) },
    { id: 'undated', scheduled_at: null, created_at: iso(-1) },
    { id: 'last', scheduled_at: iso(-4), created_at: iso(-40) },
    { id: 'older', scheduled_at: iso(-11), created_at: iso(-2) },
  ]);
  const rows = [
    { snapshot_date: iso(-10).slice(0, 10), total_value: 100, return_pct: 1 },
    { snapshot_date: iso(-4).slice(0, 10), total_value: 110, return_pct: 2 },
    { snapshot_date: iso(0).slice(0, 10), total_value: 125, return_pct: 3.5 },
  ];
  const out = await sinceLastMeeting(sb, 'org', rows, NOW);
  assert.equal(out.since_date, iso(-4).slice(0, 10));
  assert.equal(out.days_ago, 4);
  assert.equal(out.fund_value_delta, 15);
  const q = sb.calls.find((c) => c.table === 'org_meetings');
  assert.equal(q.order[0], 'scheduled_at');
  /* Only future meetings: nothing to compare against. */
  const none = await sinceLastMeeting(
    fakeSupabase([{ id: 'f', scheduled_at: iso(2) }]),
    'org',
    rows,
    NOW,
  );
  assert.equal(none, null);
});

test('source guards', () => {
  const detail = read('src/app/api/org/meetings/[id]/route.js');
  assert.match(detail, /meetingBallotView\(/);
  assert.ok(!/tally\[/.test(detail), 'detail route builds no tally of its own');
  const votes = read('src/app/api/org/meetings/[id]/votes/route.js');
  assert.match(votes, /voteBlocker\(/);
  assert.match(votes, /meetingBallotView\(/);
  assert.ok(!/tally\[/.test(votes));
  const loader = read('src/app/api/org/meetings/_loader.js');
  assert.match(loader, /org_meeting_ballot_counts/);
  assert.ok(!/getServiceClient|service_role/i.test(loader));
  const page = read('src/components/org/meetings/MeetingsPage.jsx');
  const detailUi = read('src/components/org/meetings/MeetingDetail.jsx');
  for (const src of [page, detailUi, read('src/components/org/meetings/SideColumn.jsx')]) {
    assert.ok(!/—/.test(src), 'no em dash');
    assert.ok(!/Zoom|Otter|Fireflies|Read\.ai|Supabase/.test(src), 'no vendor names');
    assert.ok(!/real-time/i.test(src));
  }
  /* The open vote shows counts only once the meeting is completed. */
  assert.match(detailUi, /completed && v\.tally/);
  const fa = read('src/lib/org-fund-analytics.js');
  assert.ok(
    !/started_at/.test(fa.slice(fa.indexOf('sinceLastMeeting'), fa.indexOf('positions_closed'))),
  );
});
