/**
 * Sample content for the council Community (/community for council members).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/community/sample, so the page can be reviewed and presented
 * before a council has posted. Real councils never receive it, the page
 * labels it "Sample content" while it shows, it replaces council data rather
 * than mixing with it, and nothing done to it is sent anywhere: a post, a
 * reaction, a pin, a removal or a new event stays on the page and is gone on
 * reload (applySampleAction in org-community-model.js applies the routes'
 * own rules).
 *
 * It is the same sample council every rebuilt Team Hub page shows. Members,
 * teams and awards come from the Recognition bundle; pitches open for
 * feedback and their discussion counts from the Pitch Pipeline bundle;
 * published notes and their comments from the Research Library bundle;
 * scheduled meetings from the Meetings bundle; the fund headline and the
 * weekly digest from the Command Center and Trading Desk bundles; the
 * council ranking from the Council Rankings bundle and open competitions
 * from the Competitions bundle. Nothing is typed in twice. What this file
 * adds is what only this page has: posts, replies, reactions, council
 * events, mentions and the viewer's inbox, plus the faculty advisor (Hana
 * Girma, as on the Grades sample).
 *
 * Every row is in the shape the live routes return, and carries is_demo.
 * Pure: no React, no fetch, no server imports.
 */
import { buildRecognitionSample } from './org-recognition-sample.js';
import { buildPitchPipelineSample, sampleBoard } from './org-pitch-pipeline-sample.js';
import { buildResearchLibrarySample } from './org-research-library-sample.js';
import { buildMeetingsSample } from './org-meetings-sample.js';
import { buildCommandCenterSample } from './org-command-center-sample.js';
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { buildCouncilRankingsSample } from './org-council-rankings-sample.js';
import { buildCompetitionsSample } from './org-competitions-sample.js';
import { rankRows } from './council-rankings-model.js';
import { ALL_EXTRAS, OPEN_PITCH_STAGES, REACTIONS, viewerRights } from './org-community-model.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const userOf = (n) => `sample-user-${String(n).padStart(3, '0')}`;
const memberOf = (n) => `sample-member-${String(n).padStart(3, '0')}`;
const teamOf = (n) => `sample-team-${String(n).padStart(3, '0')}`;
const ADVISOR = { id: 'sample-member-advisor', user_id: 'sample-user-advisor' };
const LIKE = REACTIONS[0].stored;
const IDEA = REACTIONS[1].stored;

/* At a fixed local hour, `days` from now. */
function at(now, days, hour, minute = 0) {
  const d = new Date(now + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/*
 * Posts: [key, author ('me', 'advisor' or member number), type, team number
 * or null, hours ago, title, ticker, text, pinned hours ago or null].
 */
const POSTS = [
  [
    'agenda',
    'advisor',
    'announcement',
    null,
    27,
    'Investment committee agenda for Thursday',
    null,
    'Thursday covers the COST vote, the ISRG cross-desk review and sleeve weights for next term. Pre-reads are in the research library by Tuesday evening. Come with one question for each presenter.',
    26,
  ],
  [
    'nim',
    4,
    'question',
    1,
    3,
    'How are members framing bank net interest margin risk next quarter?',
    'JPM',
    'With two more cuts priced in, what deposit beta are you using for JPM and BAC? Share the range you tested and what moved your answer.',
    null,
  ],
  [
    'tech',
    3,
    'update',
    3,
    20,
    'Technology desk coverage: week 11',
    'AVGO',
    'The AVGO deep dive is with Elena and goes to cross-desk review next week. ORCL is scheduled for committee. The MSFT note now carries the cloud margin check.',
    null,
  ],
  [
    'isrg',
    2,
    'discussion',
    2,
    31,
    'ISRG cross-desk review: what would change your mind?',
    'ISRG',
    'Before the review, tell me the one number that would move you from hold to buy, or the other way. I will fold the answers into the memo.',
    null,
  ],
  [
    'etn',
    8,
    'discussion',
    4,
    52,
    'ETN power demand: share your capacity sources',
    'ETN',
    'Building the three scenarios for grid demand. If you have a sourced capacity table I have not used yet, post it here before Friday.',
    null,
  ],
  [
    'standup',
    5,
    'update',
    2,
    74,
    'Healthcare stand-up moves to Tuesday',
    null,
    'From next week the Healthcare stand-up is Tuesday at 10:00, same room. Bring one line on each name you cover.',
    null,
  ],
  [
    'ips',
    9,
    'question',
    null,
    98,
    'Where are the sector caps written down?',
    null,
    'I am sizing my first pitch and want to check the sector limit before I put a weight in the memo. Which page has the current caps?',
    null,
  ],
  [
    'mine',
    'me',
    'discussion',
    null,
    122,
    'Reading list for the new analyst class',
    null,
    'Collecting the three pieces each of you found most useful this term. One line on why, and the note or pitch it helped with.',
    null,
  ],
];

/* Replies: [post key, author, hours ago, text]. */
const REPLIES = [
  [
    'nim',
    1,
    2,
    'I used 35 to 45 percent for JPM and 40 to 50 for BAC. The table is in the JPM note.',
  ],
  ['nim', 2, 1, 'Same range here. Worth adding the case where deposit costs stop falling.'],
  ['isrg', 7, 28, 'Procedure growth above 15 percent for two more quarters would move me to buy.'],
  ['ips', 4, 96, 'Compliance in the Team Hub lists every rule, with the sector cap at the top.'],
  ['mine', 7, 118, 'The comparables primer. It is how I set up the AVGO peer table.'],
];

/* Reactions: [post key, like voters, idea voters] by member number. */
const REACT = [
  ['agenda', [1, 2, 3, 4, 5, 6, 7, 8, 9, 'me'], [3, 7]],
  ['nim', [1, 2, 6], [5, 7, 8, 'me']],
  ['tech', [1, 4, 5, 7], [2]],
  ['isrg', [3, 5], [1, 7, 9]],
  ['etn', [6], [3]],
  ['standup', [2, 9], []],
  ['ips', [4], []],
  ['mine', [1, 7, 9], [2]],
];

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildCommunitySample(viewer) {
  const now = viewer.now ?? Date.now();
  const me = {
    id: viewer.memberId || 'sample-member-me',
    user_id: viewer.userId || 'sample-user-me',
  };
  const base = {
    userId: me.user_id,
    memberId: me.id,
    role: viewer.role,
    displayName: viewer.displayName,
    now,
  };

  /* Members and teams: the Recognition bundle (it includes the viewer). */
  const rec = buildRecognitionSample(base);
  const members = rec.members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    display_name: m.id === me.id ? viewer.displayName || 'You' : m.display_name,
    role: m.role,
    sub_role: m.sub_role || null,
    title: m.id === me.id ? viewer.title || null : null,
    team_id: m.team_id || null,
    is_active: true,
    is_demo: true,
  }));
  if (!members.some((m) => m.id === ADVISOR.id)) {
    members.push({
      ...ADVISOR,
      display_name: 'Hana Girma',
      role: 'executive',
      sub_role: null,
      title: 'Faculty Advisor',
      team_id: null,
      is_active: true,
      is_demo: true,
    });
  }
  const teams = rec.teams.map((t) => ({ id: t.id, name: t.name }));
  const nameOfUser = new Map(members.map((m) => [m.user_id, m.display_name]));
  const authorUser = (a) =>
    a === 'me' ? me.user_id : a === 'advisor' ? ADVISOR.user_id : userOf(a);

  /* Posts, replies and reactions. */
  const postId = (key) => `sample-post-${key}`;
  const posts = [];
  for (const [key, a, type, team, hours, title, ticker, content, pinned] of POSTS) {
    posts.push({
      id: postId(key),
      org_id: 'sample',
      team_id: team ? teamOf(team) : null,
      author_id: authorUser(a),
      content,
      post_type: type,
      created_at: new Date(now - hours * HOUR).toISOString(),
      parent_id: null,
      title,
      ticker,
      pinned_at: pinned != null ? new Date(now - pinned * HOUR).toISOString() : null,
      pinned_by: pinned != null ? ADVISOR.user_id : null,
      edited_at: null,
      is_demo: true,
    });
  }
  REPLIES.forEach(([key, a, hours, content], i) => {
    posts.push({
      id: `sample-reply-${String(i + 1).padStart(3, '0')}`,
      org_id: 'sample',
      team_id: null,
      author_id: authorUser(a),
      content,
      post_type: 'discussion',
      created_at: new Date(now - hours * HOUR).toISOString(),
      parent_id: postId(key),
      title: null,
      ticker: null,
      pinned_at: null,
      pinned_by: null,
      edited_at: null,
      is_demo: true,
    });
  });
  const reactions = [];
  for (const [key, likes, ideas] of REACT) {
    for (const a of likes)
      reactions.push({ target_id: postId(key), user_id: authorUser(a), emoji: LIKE });
    for (const a of ideas)
      reactions.push({ target_id: postId(key), user_id: authorUser(a), emoji: IDEA });
  }

  /* Council events (the page adds scheduled meetings beside them). */
  const events = [
    ['Healthcare stand-up', 'meeting', 2, 1, 10, 0, 'Tuesday stand-up, one line per covered name.'],
    ['ORCL pitch memo due', 'deadline', 3, 2, 17, 0, 'Memo and model in the research library.'],
    [
      'Faculty advisor review',
      'review',
      null,
      3,
      15,
      0,
      'Hana Girma reviews the term plan with the executives.',
    ],
    ['Sleeve weights presentation', 'presentation', null, 9, 16, 30, null],
  ].map(([title, type, team, days, h, mi, description], i) => ({
    id: `sample-event-${String(i + 1).padStart(3, '0')}`,
    team_id: team ? teamOf(team) : null,
    title,
    description,
    event_type: type,
    event_date: at(now, days, h, mi),
    created_by: ADVISOR.user_id,
    is_demo: true,
  }));
  const mt = buildMeetingsSample(base);
  const meetings = (mt.list?.meetings || [])
    .filter((m) => m.status === 'scheduled' && Date.parse(m.scheduled_at) >= now - 2 * HOUR)
    .map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      scheduled_at: m.scheduled_at,
      team_id: m.team_id || null,
      location: m.location || null,
      is_demo: true,
    }));

  /* Mentions and inbox. */
  const pp = buildPitchPipelineSample(base);
  const board = sampleBoard(pp.raw);
  const openPitch = board.pitches.find((p) => p.status === 'active' && p.stage === 'deep_dive');
  const mentions = [
    ['sample-mention-001', 2, 'thread', 'sample-thread-jpm', 'JPM', 2, false],
    [
      'sample-mention-002',
      3,
      'pitch',
      openPitch?.id || 'sample-pitch-019',
      openPitch?.ticker || 'AVGO',
      5,
      false,
    ],
    ['sample-mention-003', 5, 'post', postId('standup'), null, 70, true],
  ].map(([id, a, type, target, ticker, hours, seen]) => ({
    id,
    author_id: userOf(a),
    author_name: nameOfUser.get(userOf(a)) || 'Member',
    target_type: type,
    target_id: target,
    ticker,
    seen,
    created_at: new Date(now - hours * HOUR).toISOString(),
    is_demo: true,
  }));
  const inbox = [
    [
      'sample-dm-001',
      ADVISOR.id,
      'Committee prep and reminders',
      'Checklist for Thursday attached. Please confirm the agenda order by Wednesday.',
      false,
      'document',
      'Committee prep checklist',
      1.5,
    ],
    [
      'sample-dm-002',
      memberOf(6),
      'Re: ORCL feedback',
      'Thanks for the notes. I moved the margin bridge to the front of the memo.',
      false,
      null,
      null,
      6,
    ],
    [
      'sample-dm-003',
      memberOf(8),
      'Industrials meeting notes',
      'Notes from Friday, with the ETN capacity questions we left open.',
      true,
      null,
      null,
      50,
    ],
  ].map(([id, from, subject, body, read, kind, label, hours]) => ({
    id,
    sender_member_id: from,
    sender_name: members.find((m) => m.id === from)?.display_name || 'Member',
    subject,
    body,
    is_read: read,
    attachment_kind: kind,
    attachment_label: label,
    created_at: new Date(now - hours * HOUR).toISOString(),
    is_demo: true,
  }));

  /* Recognition. */
  const awards = rec.recognitions.slice(0, 4).map((r) => ({
    id: r.id,
    recipient_id: r.recipient_id,
    awarded_by: r.awarded_by,
    badge_type: r.badge_type,
    title: r.title,
    reason: r.reason,
    period: r.period,
    is_award: r.is_award,
    auto_generated: r.auto_generated,
    created_at: r.created_at,
    recipient_name: nameOfUser.get(r.recipient_id) || 'Member',
    giver_name: r.auto_generated ? null : nameOfUser.get(r.awarded_by) || null,
    is_demo: true,
  }));

  /* Pitches open for feedback and published research. */
  const discussion = pp.raw.discussion || {};
  const pitches = board.pitches
    .filter((p) => p.status === 'active' && OPEN_PITCH_STAGES.includes(p.stage))
    .map((p) => ({
      id: p.id,
      ticker: p.ticker,
      company_name: p.company_name || null,
      stage: p.stage,
      analyst_name: p.analyst_name || 'Unassigned',
      team_id: p.team_id || null,
      team_name: p.team_name || null,
      created_at: p.created_at,
      stage_entered_at: p.stage_entered_at || p.created_at,
      comments: (discussion[p.id] || []).length,
      is_demo: true,
    }));
  const rl = buildResearchLibrarySample(base);
  const noteComments = {};
  for (const c of rl.comments || []) noteComments[c.note_id] = (noteComments[c.note_id] || 0) + 1;
  const notes = (rl.notes || [])
    .filter((n) => n.status === 'published' && n.visibility === 'org')
    .sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)))
    .slice(0, 10)
    .map((n) => ({
      id: n.id,
      author_id: n.author_id,
      title: n.title,
      ticker: n.ticker || null,
      sector: n.sector || null,
      team_id: n.team_id || null,
      status: n.status,
      visibility: n.visibility,
      view_count: n.view_count ?? null,
      published_at: n.published_at,
      created_at: n.created_at,
      author_name: n.author_name || nameOfUser.get(n.author_id) || 'Member',
      comments: noteComments[n.id] || 0,
      is_demo: true,
    }));

  /* The fund headline and the weekly digest. */
  const cc = buildCommandCenterSample({ ...base, displayName: viewer.displayName });
  const td = buildTradingDeskSample(base);
  const perf = cc.summary.performance;
  const council = {
    members: members.length,
    fund: {
      value: perf.total_value,
      returnPct: perf.return_pct,
      positions: td.book?.positions?.length ?? null,
    },
  };

  /* Across Ezana. */
  const ranking = buildCouncilRankingsSample({ now });
  const ranked = rankRows(ranking.rows, 'overall');
  const comps = buildCompetitionsSample(base);
  const live = [...(comps.entered || []), ...(comps.joinable || [])]
    .filter((c) => ['open', 'in_progress', 'judging'].includes(c.status))
    .slice(0, 3)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      starts_at: c.config?.registration_opens_at || null,
      ends_at: c.config?.deliverable_due_at || c.config?.registration_closes_at || null,
      isHost: false,
      is_demo: true,
    }));
  const across = {
    myOrgId: ranking.myOrgId,
    rows: ranked.map((r) => ({
      orgId: r.orgId,
      name: r.name,
      tier: r.tier,
      rating: r.rating,
      comp: r.comp,
      fund: r.fund,
      rank: r.rank,
      is_demo: true,
    })),
    total: ranked.length,
    competitions: live,
  };

  const viewerRow = members.find((m) => m.id === me.id) || {
    ...me,
    role: viewer.role,
    display_name: viewer.displayName,
  };
  return {
    is_demo: true,
    viewer: { ...viewerRow, org_id: 'sample', is_active: true },
    caps: ALL_EXTRAS,
    rights: viewerRights({ ...viewerRow, org_id: 'sample' }, ALL_EXTRAS),
    members,
    teams,
    posts,
    reactions,
    events,
    meetings,
    mentions,
    inbox,
    awards,
    pitches,
    notes,
    council,
    digest: cc.digest,
    across,
  };
}
