/**
 * Sample content for Meetings (/org-team-hub/meetings).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/meetings/sample, so the page can be reviewed and presented
 * from a council with little activity. Real councils never receive it, and
 * the page labels it "Sample content" while it shows. Nothing here is read
 * from or written to the database: while it shows, every action is applied
 * on the page by `applySampleAction` (the same rules the routes apply) and is
 * gone on reload.
 *
 * The council is the same sample council every rebuilt Team Hub page shows:
 * the people and the four sector teams come from the Trading Desk bundle
 * (through the Pitch Pipeline bundle), the first three meetings are the
 * Command Center's ("Weekly executive sync", "Council meeting", "Technology
 * team review", same ids and days), and the committee sessions and pitches
 * are the Pitch Pipeline's. Dates are relative to today.
 *
 * Committee vote: the bundle never holds another member's choice for a
 * meeting that is not completed. It holds only the number of ballots
 * received and the viewer's own vote, exactly what the server sends.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildPitchPipelineSample } from './org-pitch-pipeline-sample.js';
import {
  agendaMinutes,
  confirmsQuorum,
  isVoterRole,
  meetingBallotView,
  replySummary,
} from './org-meetings-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);

/* Sample people by surname, as numbered in the Trading Desk bundle. */
const M = {
  tesfaye: 1,
  bekele: 2,
  haile: 3,
  okoye: 4,
  lindqvist: 5,
  park: 6,
  rossi: 7,
  weber: 8,
  alvarez: 9,
};

/*
 * One entry per meeting. `days` is from today and `at` the local time.
 * Agenda rows: [label, type, owner, minutes]. Attendees: [who, reply,
 * attended]; `me` is the viewer. `received` is the number of ballots on an
 * open committee vote; `tally` the final count of a completed one.
 */
const MEETINGS = [
  {
    n: 1,
    title: 'Weekly executive sync',
    category: 'exec',
    days: 2,
    at: [17, 30],
    location: 'Founders Hall 110',
    agenda: [
      ['Fund performance since last week', 'review', 'Selam Haile', 15],
      ['Committee agenda for Thursday', 'discussion', 'Chidi Okoye', 15],
      ['Recruiting pipeline', 'update', 'Ingrid Lindqvist', 10],
    ],
    attendees: [
      ['me', 'yes'],
      ['haile', 'yes'],
      ['okoye', 'yes'],
      ['lindqvist', 'maybe'],
      ['park', 'pending'],
    ],
  },
  {
    n: 2,
    title: 'Council meeting',
    category: 'ic',
    days: 4,
    at: [18, 0],
    location: 'Hall B, room 204',
    quorum: 60,
    pitch: 'COST',
    agenda: [
      ['COST: membership growth and margin case', 'pitch', 'Mikael Bekele', 20],
      ['Portfolio risk and position sizing', 'discussion', 'Ingrid Lindqvist', 15],
      ['Committee vote on COST', 'vote', 'Chidi Okoye', 10],
      ['Sector team updates', 'update', 'Selam Haile', 15],
      ['Recruiting and next steps', 'other', 'Amara Tesfaye', 5],
    ],
    attendees: [
      ['me', 'pending'],
      ['haile', 'yes'],
      ['okoye', 'yes'],
      ['lindqvist', 'yes'],
      ['park', 'maybe'],
      ['tesfaye', 'yes'],
      ['bekele', 'yes'],
      ['rossi', 'maybe'],
      ['alvarez', 'no'],
    ],
    received: 2,
  },
  {
    n: 3,
    title: 'Technology team review',
    category: 'sector',
    days: 11,
    at: [16, 0],
    location: 'Library, group room 3',
    team: 3,
    agenda: [
      ['AVGO deep dive: model check', 'review', 'Elena Rossi', 25],
      ['Coverage refresh: MSFT and AAPL', 'update', 'Selam Haile', 15],
    ],
    attendees: [
      ['me', 'pending'],
      ['haile', 'yes'],
      ['rossi', 'yes'],
    ],
  },
  {
    n: 4,
    title: 'Valuation workshop: DCF basics',
    category: 'education',
    days: 18,
    at: [18, 30],
    location: 'Hall B, room 112',
    agenda: [],
    attendees: [
      ['alvarez', 'yes'],
      ['weber', 'pending'],
      ['bekele', 'maybe'],
    ],
  },
  {
    n: 5,
    title: 'Sector coverage check-in',
    category: 'general',
    days: -3,
    at: [12, 0],
    location: 'Founders Hall 110',
    agenda: [['Coverage gaps by team', 'review', 'Daniel Park', 20]],
    attendees: [
      ['park', 'yes'],
      ['weber', 'yes'],
      ['tesfaye', 'maybe'],
    ],
  },
  /* Completed */
  {
    n: 6,
    title: 'Council meeting',
    category: 'ic',
    days: -10,
    at: [18, 0],
    location: 'Hall B, room 204',
    status: 'closed',
    quorum: 60,
    pitch: 'V',
    recording: 'https://media.example.edu/council/2026-fall-week-10',
    agenda: [
      ['V: payments network pitch', 'pitch', 'Amara Tesfaye', 20],
      ['Questions and risks', 'discussion', 'Chidi Okoye', 15],
      ['Committee vote on V', 'vote', 'Selam Haile', 10],
      ['Fund performance review', 'review', 'Ingrid Lindqvist', 15],
    ],
    attendees: [
      ['me', 'yes', true],
      ['haile', 'yes', true],
      ['okoye', 'yes', true],
      ['lindqvist', 'yes', true],
      ['park', 'maybe', true],
      ['tesfaye', 'yes', true],
      ['bekele', 'yes', true],
      ['rossi', 'no', false],
    ],
    tally: { buy: 4, pass: 1, abstain: 0 },
    documents: [
      ['deck', 'V pitch deck'],
      ['model', 'V three-statement model'],
      ['memo', 'Risk memo: interchange regulation'],
    ],
    notes: [
      'V accepted for a starter position; sizing to follow at the next sync.',
      'Healthcare team to bring the COST pitch to the next council meeting.',
    ],
  },
  {
    n: 7,
    title: 'Weekly executive sync',
    category: 'exec',
    days: -5,
    at: [17, 30],
    location: 'Founders Hall 110',
    status: 'closed',
    agenda: [
      ['Fund performance since last week', 'review', 'Selam Haile', 15],
      ['Term calendar', 'discussion', 'Chidi Okoye', 10],
    ],
    attendees: [
      ['me', 'yes', true],
      ['haile', 'yes', true],
      ['okoye', 'yes', true],
      ['lindqvist', 'yes', false],
    ],
    documents: [['report', 'Weekly fund report']],
  },
  {
    n: 8,
    title: 'Healthcare team review',
    category: 'sector',
    days: -17,
    at: [16, 0],
    location: 'Library, group room 3',
    status: 'closed',
    team: 2,
    agenda: [
      ['COST pitch draft', 'review', 'Mikael Bekele', 25],
      ['ISRG cross-desk review', 'discussion', 'Ingrid Lindqvist', 15],
    ],
    attendees: [
      ['lindqvist', 'yes', true],
      ['bekele', 'yes', true],
      ['alvarez', 'yes', true],
    ],
    documents: [
      ['primer', 'Warehouse club primer'],
      ['earnings_call', 'COST quarterly call notes'],
    ],
  },
  {
    n: 9,
    title: 'Council meeting',
    category: 'ic',
    days: -24,
    at: [18, 0],
    location: 'Hall B, room 204',
    status: 'closed',
    quorum: 60,
    agenda: [
      ['DE: farm equipment cycle pitch', 'pitch', 'Jonas Weber', 20],
      ['Committee vote on DE', 'vote', 'Daniel Park', 10],
    ],
    attendees: [
      ['me', 'yes', true],
      ['haile', 'yes', true],
      ['okoye', 'yes', true],
      ['park', 'yes', true],
      ['lindqvist', 'no', false],
      ['weber', 'yes', true],
    ],
    tally: { buy: 1, pass: 3, abstain: 1 },
  },
  {
    n: 10,
    title: 'Recruiting information session',
    category: 'education',
    days: -31,
    at: [18, 30],
    location: 'Student center, room 2',
    status: 'closed',
    agenda: [['How the council works', 'other', 'Amara Tesfaye', 20]],
    attendees: [
      ['tesfaye', 'yes', true],
      ['rossi', 'yes', true],
    ],
  },
  {
    n: 11,
    title: 'Fall term kickoff',
    category: 'general',
    days: -68,
    at: [18, 0],
    location: 'Hall B, room 204',
    status: 'closed',
    agenda: [
      ['Investment policy refresher', 'review', 'Chidi Okoye', 20],
      ['Team assignments for the term', 'update', 'Selam Haile', 20],
    ],
    attendees: [
      ['me', 'yes', true],
      ['haile', 'yes', true],
      ['okoye', 'yes', true],
      ['tesfaye', 'yes', true],
      ['bekele', 'yes', true],
    ],
  },
  {
    n: 12,
    title: 'Summer portfolio review',
    category: 'exec',
    days: -130,
    at: [17, 0],
    location: 'Founders Hall 110',
    status: 'closed',
    agenda: [['Summer attribution', 'review', 'Ingrid Lindqvist', 30]],
    attendees: [
      ['me', 'yes', true],
      ['lindqvist', 'yes', true],
      ['park', 'yes', true],
    ],
  },
];

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildMeetingsSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const pipe = buildPitchPipelineSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  }).raw;
  const me = pipe.viewer?.memberId || memberId;
  const canManage = isVoterRole(role);

  const roster = pipe.members.map((m) => ({
    id: m.id,
    display_name: m.display_name,
    role: m.role,
    sub_role: m.sub_role || null,
    is_demo: true,
  }));
  const byId = new Map(roster.map((r) => [r.id, r]));
  const eligible = roster.filter((r) => isVoterRole(r.role)).length;

  const pitches = pipe.pitches
    .filter((p) => p.status === 'active' || p.ticker === 'V')
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      company_name: p.company_name,
      stage: p.stage,
      thesis_short: p.thesis_short || null,
      is_demo: true,
    }));
  const pitchByTicker = new Map(pipe.pitches.map((p) => [p.ticker, p]));

  /* Committee sessions (read only here), with the pitches attached. */
  const sessions = pipe.meetings.map((s) => ({
    id: s.id,
    meets_at: s.meets_at,
    ballot_type: s.ballot_type,
    threshold: s.threshold,
    quorum_pct: s.quorum_pct,
    status: s.status,
    pitches: pipe.pitches
      .filter((p) => p.ic_meeting_id === s.id)
      .map((p) => ({ id: p.id, ticker: p.ticker, company_name: p.company_name, stage: p.stage })),
    is_demo: true,
  }));

  /* Times are written for the council's evening in Eastern time (UTC-5), so
     they read as real meeting times; the server that builds this runs in
     UTC. */
  const at = (days, [h, mi]) => {
    const d = new Date(now + days * DAY);
    d.setUTCHours(h + 5, mi, 0, 0);
    return d.toISOString();
  };
  const who = (key) => (key === 'me' ? me : memberOf(M[key]));

  const details = {};
  const meetings = MEETINGS.map((s) => {
    const mid = id('meeting', s.n);
    const pitch = s.pitch ? pitchByTicker.get(s.pitch) : null;
    const closed = s.status === 'closed';
    const scheduledAt = at(s.days, s.at);
    const minutesTotal = (s.agenda || []).reduce((t, a) => t + a[3], 0);
    const meeting = {
      id: mid,
      title: s.title,
      category: s.category,
      status: closed ? 'closed' : 'scheduled',
      scheduled_at: scheduledAt,
      ended_at: closed
        ? new Date(Date.parse(scheduledAt) + (minutesTotal || 60) * 60000).toISOString()
        : null,
      location: s.location || null,
      team_id: s.team ? id('team', s.team) : null,
      quorum_pct: s.quorum ?? null,
      recording_url: s.recording || null,
      recording_source: s.recording ? 'upload' : null,
      pitch_id: pitch?.id || null,
      agenda: (s.agenda || []).map(([label, kind, owner, minutes], i) => ({
        id: `${mid}-agenda-${i + 1}`,
        n: i + 1,
        label,
        kind,
        owner,
        minutes,
        pitch_id: null,
      })),
      minutes: (s.notes || []).map((note) => ({ note })),
      created_at: new Date(now + (s.days - 9) * DAY).toISOString(),
      is_demo: true,
    };
    const attendees = (s.attendees || [])
      .filter(([k]) => k !== 'me' || byId.has(me))
      .map(([k, rsvp, attended], i) => {
        const r = byId.get(who(k));
        return {
          id: `${mid}-att-${i + 1}`,
          member_id: who(k),
          display_name: r?.display_name || 'Member',
          role: r?.role || null,
          sub_role: r?.sub_role || null,
          rsvp,
          attended: attended ?? null,
          is_demo: true,
        };
      });

    let votes = null;
    if (s.category === 'ic') {
      const confirmed = attendees.filter(confirmsQuorum).length;
      if (closed) {
        /* Completed: the final count is public. The viewer's ballot is the
           first Buy when they attended as a voting member. */
        const t = s.tally || { buy: 0, pass: 0, abstain: 0 };
        const rows = [];
        for (const v of ['buy', 'pass', 'abstain']) {
          for (let i = 0; i < t[v]; i += 1) rows.push({ voter_member_id: `x-${v}-${i}`, vote: v });
        }
        if (rows.length && canManage && attendees.some((a) => a.member_id === me)) {
          rows[0].voter_member_id = me;
        }
        votes = meetingBallotView({
          votes: rows,
          completed: true,
          viewerMemberId: me,
          eligible,
          confirmed,
          quorumPct: meeting.quorum_pct,
        });
      } else {
        votes = meetingBallotView({
          completed: false,
          eligible,
          confirmed,
          quorumPct: meeting.quorum_pct,
          received: s.received || 0,
        });
      }
    }

    details[mid] = {
      meeting,
      attendees,
      deliverables: (s.documents || []).map(([kind, label], i) => ({
        id: `${mid}-doc-${i + 1}`,
        kind,
        label,
        is_demo: true,
      })),
      votes,
      preRead: pitch
        ? [
            {
              kind: 'pitch',
              id: pitch.id,
              label: `${pitch.ticker}: ${pitch.company_name}`,
              note: pitch.thesis_short || null,
            },
          ]
        : [],
      roster,
      viewer: {
        userId,
        memberId: me,
        role,
        canManage,
        isICVoter: s.category === 'ic' && canManage,
      },
      is_demo: true,
    };

    return {
      id: mid,
      title: meeting.title,
      category: meeting.category,
      status: meeting.status,
      scheduled_at: meeting.scheduled_at,
      ended_at: meeting.ended_at,
      location: meeting.location,
      team_id: meeting.team_id,
      quorum_pct: meeting.quorum_pct,
      recording_url: meeting.recording_url,
      recording_source: meeting.recording_source,
      analysis_status: 'none',
      pitch_id: meeting.pitch_id,
      created_at: meeting.created_at,
      agenda_items: meeting.agenda.length,
      agenda_minutes: agendaMinutes(meeting.agenda),
      replies: replySummary(attendees, me),
      is_demo: true,
    };
  });

  return {
    is_demo: true,
    list: {
      meetings,
      eligible_voters: eligible,
      sessions,
      pitches,
      recordersConnected: false,
      viewer: {
        userId,
        memberId: me,
        role,
        displayName: displayName || 'You',
        subRole: subRole || null,
        canManage,
        canCreateEvents: canManage,
        canRecordDocuments: canManage,
      },
    },
    details,
    roster,
    next_id: 1,
  };
}
