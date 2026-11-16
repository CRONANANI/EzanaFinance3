/**
 * Sample content for the Pitch Pipeline (/org-team-hub/pitches).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/pitches/sample, so the page can be reviewed and presented from
 * a council with little activity. Real councils never receive it, and the
 * page labels it "Sample content" while it shows. Nothing here is read from
 * or written to the database: while it shows, every action is applied on the
 * page by `applySampleAction` (with the same rules the routes apply) and is
 * gone on reload.
 *
 * The council is the same sample council the Command Center, the Trading
 * Desk, Fund Analytics and Assignments show: the people and the four sector
 * teams come from the Trading Desk bundle, and the pitches are the shared
 * list in org-sample-pitches.js, so the Fund Analytics funnel and this
 * pipeline count the same pitches. Dates are relative to today.
 *
 * Blind ballots: the sample obeys the same rule as the server. The bundle
 * carries the sample ballots (they are invented), but every board row and
 * every pitch the page is given is passed through the same sealing functions
 * the routes use, so an open blind vote shows only the participation count
 * and the viewer's own ballot until the meeting is closed.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { SAMPLE_PITCHES, SAMPLE_PITCH_AUTHORS } from './org-sample-pitches.js';
import { isBlindOpen, sealPitchDetail, sealPitchRow } from './pitch/ballot-privacy.js';
import { boardRow } from './pitch/board-rows.js';
import { allGatesPass, evaluateGates } from './pitch/gates.js';
import { STAGE_CONFIG } from './pitch/stage-config.js';
import { isThesisFrozen, stageLabel } from './pitch/stages.js';
import {
  AGING_DAYS,
  OBJECTION_MIN_CHARS,
  OVERRIDE_MIN_CHARS,
  canAdvanceStage,
  canCrossDeskReview,
  canEditThesis,
  canExit,
  canOverrideStage,
  canRecordOutcome,
  canReject,
  canReviewFalsification,
  canSignOff,
  isDeskPm,
  isManager,
  isVoter,
  reviewDueAt,
} from './pitch/rules.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);
const teamOf = (n) => id('team', n);
const REQUIRED_MODELS = ['dcf', 'three_statement', 'comps'];
const MIN_SIGNOFFS = 2;

/* Where each pitch stands. Decided pitches follow from the shared list: an
   accepted pitch whose ticker is on the book is In portfolio, V is accepted
   but not on the book yet, PFE and DE were rejected. */
const PIPELINE = {
  COST: { stage: 'ic_vote', days: 2, meeting: 'next' },
  TMO: { stage: 'idea', days: 3 },
  ETN: { stage: 'screening', days: 9 },
  AXP: { stage: 'screening', days: 41 },
  AVGO: { stage: 'deep_dive', days: 12 },
  GS: { stage: 'deep_dive', days: 34 },
  ISRG: { stage: 'cross_desk_review', days: 6 },
  ORCL: { stage: 'pitch_scheduled', days: 4 },
  LIN: { stage: 'pitch_scheduled', days: 5, meeting: 'next' },
  ABT: { stage: 'idea', days: 1 },
};
const TEAM_OF_TICKER = {
  JPM: 1,
  SCHW: 1,
  BAC: 1,
  V: 1,
  AXP: 1,
  GS: 1,
  LLY: 2,
  UNH: 2,
  MRK: 2,
  PFE: 2,
  COST: 2,
  TMO: 2,
  ISRG: 2,
  ABT: 2,
  NVDA: 3,
  MSFT: 3,
  AAPL: 3,
  AVGO: 3,
  ORCL: 3,
  CAT: 4,
  GE: 4,
  DE: 4,
  ETN: 4,
  LIN: 4,
};
/* [short thesis, pitch price, target, expected return, horizon, type]. */
const FACTS = {
  JPM: [
    'Fortress balance sheet and fee growth compound returns through the rate cycle.',
    292.3,
    360,
    23.16,
  ],
  SCHW: [
    'Net new assets and cost discipline rebuild earnings as cash sorting fades.',
    83.7,
    104,
    24.25,
  ],
  BAC: ['A slow-repricing deposit base keeps net interest income compounding.', 45.0, 56, 24.44],
  LLY: ['Incretin demand outruns supply and the pipeline extends the runway.', 877.8, 1080, 23.04],
  UNH: ['Care delivery scale offsets medical cost pressure over a full cycle.', 500.0, 610, 22.0],
  MRK: ['Oncology cash flows fund a pipeline that covers the patent cliff.', 122.9, 150, 22.05],
  NVDA: [
    'Accelerated computing demand and platform lead support a long overweight.',
    108.2,
    150,
    38.63,
  ],
  MSFT: ['Cloud and productivity attach rates keep widening the margin base.', 522.0, 610, 16.86],
  AAPL: [
    'Services mix and buybacks carry earnings through a flat hardware cycle.',
    265.4,
    300,
    13.04,
  ],
  CAT: [
    'Services revenue smooths the equipment cycle and supports the dividend.',
    391.7,
    460,
    17.44,
  ],
  GE: ['Engine aftermarket backlog gives years of visibility on cash flow.', 222.1, 270, 21.57],
  V: ['Cross-border volume and value-added services lift take rates.', 344.0, 405, 17.73],
  PFE: ['Cost cuts and launches restore growth after the pandemic cliff.', 26.4, 33, 25.0],
  DE: ['Precision agriculture raises earnings through the farm cycle.', 498.0, 560, 12.45],
  COST: [
    'Membership renewals and fee increases compound with little cycle risk.',
    912.0,
    1040,
    14.04,
  ],
  TMO: ['Bioprocessing recovery and pricing restore mid-teens earnings growth.', 498.2, 590, 18.43],
  ETN: ['Data center power demand lifts electrical backlog for several years.', 338.9, 410, 20.98],
  AXP: ['Premium card spend and younger members support high-teens returns.', 301.5, 355, 17.74],
  AVGO: [
    'Custom accelerator wins add a second growth engine beside networking.',
    334.1,
    420,
    25.71,
  ],
  GS: [
    'Capital markets recovery and asset management fees lift returns on equity.',
    702.0,
    820,
    16.81,
  ],
  ISRG: [
    'A new surgical system cycle and procedure growth support premium margins.',
    512.4,
    610,
    19.05,
  ],
  ORCL: ['Contracted cloud backlog converts to revenue faster than expected.', 228.0, 290, 27.19],
  LIN: ['Pricing power and a backlog of contracted projects compound earnings.', 461.3, 530, 14.89],
  ABT: ['Device growth outpaces diagnostics normalization from here.', 129.0, 150, 16.28],
};
const HORIZON = { TMO: '24m', ABT: '12m', ETN: '24m', AVGO: '24m', ORCL: '12m' };

const words = {
  full: (co, s) =>
    `${s} ${co} has a position in its market that peers find hard to copy, and the council's base case assumes that position holds while the next leg of growth comes from areas the market is not yet paying for. The valuation leaves room for error if margins stay where they are today.`,
  whyNow: (co) =>
    `${co} reports in the coming weeks, and recent data points suggest estimates are too low for the next two quarters.`,
  variant: (co) =>
    `Consensus treats ${co} as a mature business with flat margins. We think mix shift lifts margins by more than the market expects over two years.`,
  falsification: () =>
    'Two consecutive quarters of revenue growth below 5% or margin compression of more than 150 basis points.',
};

/**
 * Which thesis sections each pitch has filled in. The sample is chosen so
 * every gate state shows somewhere: ETN has six sections (Screening passes on
 * the thesis), AXP is missing its base value, AVGO is complete, GS lacks the
 * bear value.
 */
const THESIS_LEVEL = {
  TMO: 'short',
  ABT: 'short',
  ETN: 'six',
  AXP: 'five',
  AVGO: 'all',
  GS: 'ten',
};

function thesisFor(ticker, company, level) {
  const [short] = FACTS[ticker];
  const lv = level || 'all';
  const t = { thesis_short: short };
  if (lv === 'short') return { ...t, catalysts: [], risks: [] };
  Object.assign(t, {
    thesis_full: words.full(company, short),
    why_now: words.whyNow(company),
    catalysts: ['Next quarterly report', 'Investor day guidance'],
    risks: ['Execution on new products', 'A slower economy'],
  });
  if (lv !== 'five') t.valuation_base = FACTS[ticker][2];
  if (lv === 'six' || lv === 'five') return t;
  Object.assign(t, {
    variant_perception: words.variant(company),
    falsification: words.falsification(),
    valuation_bull: Math.round(FACTS[ticker][2] * 1.18),
    position_size_pct: 3,
    conviction_level: 4,
  });
  if (lv !== 'ten') t.valuation_bear = Math.round(FACTS[ticker][1] * 0.82);
  return t;
}

/**
 * @param {{ userId: string, memberId: string, role: string, tier?: string|null,
 *           displayName?: string, title?: string, subRole?: string, now?: number }} viewer
 */
export function buildPitchPipelineSample({
  userId,
  memberId,
  role,
  tier = null,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const desk = buildTradingDeskSample({ userId, memberId, role, displayName, title, subRole, now });
  const iso = (days) => new Date(now + days * DAY).toISOString();
  const me = desk.viewer.memberId;
  const members = desk.roster.members.map((m) => ({
    ...m,
    tier:
      m.id === me
        ? tier || role
        : m.sub_role === 'Senior Analyst'
          ? 'senior_analyst'
          : m.sub_role === 'Senior PM'
            ? 'senior_portfolio_manager'
            : m.role,
  }));
  const teams = desk.roster.teams;
  const held = new Set(desk.book.positions.map((p) => p.ticker));
  const priceOf = new Map(desk.book.positions.map((p) => [p.ticker, p.current_price]));
  const author = (who, ticker) =>
    ticker === 'AXP' && role === 'analyst' ? me : memberOf(SAMPLE_PITCH_AUTHORS[who]);

  /* The committee: the next meeting is in session with a blind ballot; an
     earlier one closed. */
  const meetings = [
    {
      id: id('ic', 1),
      meets_at: iso(-0.1),
      ballot_type: 'blind',
      threshold: 'simple',
      quorum_pct: 60,
      status: 'in_session',
      is_demo: true,
    },
    {
      id: id('ic', 2),
      meets_at: iso(7),
      ballot_type: 'open',
      threshold: 'supermajority',
      quorum_pct: 50,
      status: 'scheduled',
      is_demo: true,
    },
    {
      id: id('ic', 3),
      meets_at: iso(-5),
      ballot_type: 'blind',
      threshold: 'simple',
      quorum_pct: 60,
      status: 'closed',
      is_demo: true,
    },
  ];

  const pitches = SAMPLE_PITCHES.map(([ticker, company, who, decision, daysAgo], i) => {
    const plan = PIPELINE[ticker];
    const [, pitchPrice, target, expected] = FACTS[ticker];
    let stage;
    let status = 'active';
    let enteredDaysAgo;
    if (plan) {
      stage = plan.stage;
      enteredDaysAgo = plan.days;
    } else if (decision === 'rejected') {
      stage = 'rejected';
      status = 'rejected';
      enteredDaysAgo = daysAgo;
    } else if (held.has(ticker)) {
      stage = 'in_portfolio';
      status = 'accepted';
      enteredDaysAgo = Math.max(1, daysAgo - 3);
    } else {
      stage = 'approved';
      enteredDaysAgo = daysAgo;
    }
    const createdDaysAgo = (daysAgo ?? enteredDaysAgo) + 28 + (i % 5) * 4;
    const level = THESIS_LEVEL[ticker];
    const thesis = thesisFor(ticker, company, level);
    const decided = decision != null;
    return {
      id: id('pitch', i + 1),
      org_id: 'sample',
      ticker,
      company_name: company,
      sector: teams.find((t) => t.id === teamOf(TEAM_OF_TICKER[ticker]))?.name || null,
      team_id: teamOf(TEAM_OF_TICKER[ticker]),
      analyst_member_id: author(who, ticker),
      pitch_type: 'long',
      time_horizon: HORIZON[ticker] || '12m',
      stage,
      status,
      decision: decided ? decision : null,
      decision_at: decided ? iso(-daysAgo) : null,
      decision_rationale: decided
        ? decision === 'accepted'
          ? 'The committee voted to buy at the proposed size.'
          : 'The committee passed: the valuation already reflects the recovery.'
        : null,
      ...thesis,
      catalyst_date: plan ? iso(30 + i).slice(0, 10) : null,
      target_price: target,
      expected_return_pct: expected,
      pitch_price: pitchPrice,
      current_price_at_submission: pitchPrice,
      stage_entered_at: iso(-enteredDaysAgo),
      created_at: iso(-createdDaysAgo),
      ic_meeting_id: plan?.meeting === 'next' ? meetings[0].id : decided ? meetings[2].id : null,
      last_reaffirmed_at:
        stage === 'in_portfolio'
          ? iso(-(['UNH', 'JPM', 'SCHW'].includes(ticker) ? 96 : 40 + i))
          : null,
      archived_at: stage === 'rejected' ? iso(-daysAgo) : null,
      archive_reason: stage === 'rejected' ? 'The committee passed on valuation.' : null,
      vote_yes_count: decided ? (decision === 'accepted' ? 4 : 1) : 0,
      vote_no_count: decided ? (decision === 'accepted' ? 1 : 3) : 0,
      vote_abstain_count: 0,
      current_price:
        priceOf.get(ticker) ?? Math.round(pitchPrice * (1 + ((i % 7) - 2) / 100) * 100) / 100,
      is_demo: true,
    };
  });
  const byTicker = new Map(pitches.map((p) => [p.ticker, p]));
  const pid = (t) => byTicker.get(t).id;

  /* Facts the gates read, per pitch. */
  const facts = {};
  const fact = (t, f) => {
    facts[pid(t)] = { ...emptyFacts(), ...f };
  };
  for (const p of pitches) facts[p.id] = emptyFacts();
  const signoff = (who, inDesk, scope = 'qualitative', decision = 'approve') => ({
    member_id: memberOf(who),
    in_desk: inDesk,
    scope,
    decision,
    comment: null,
    created_at: iso(-2),
  });
  const model = (type, reviewed) => ({
    model_type: type,
    file_url: `https://example.org/sample/${type}.xlsx`,
    version: 1,
    reviewed_at: reviewed ? iso(-3) : null,
    reviewed_by: reviewed ? memberOf(6) : null,
    complete: reviewed,
  });
  const meetingRow = (attendees) => ({
    held_at: iso(-4),
    attendee_ids: attendees.map(memberOf),
    compliance_notes: 'No restricted list conflicts.',
    sector_weight_notes: 'Within the sector cap after sizing.',
    headwinds: 'Rate-sensitive end markets.',
    tailwinds: 'Backlog and pricing.',
    proposed_sizing_pct: 3,
    decision: 'advance',
    notes: null,
  });
  /* ETN: thesis done, one of two sign-offs (none from its own desk yet). */
  fact('ETN', { signoffs: [signoff(5, false)] });
  /* AXP: two sign-offs, but the thesis lacks its base value; it is aging. */
  fact('AXP', { signoffs: [signoff(4, true), signoff(3, false)] });
  /* AVGO: desk meeting held, two of three models reviewed, one waiting. */
  fact('AVGO', {
    deskMeeting: meetingRow([3, 7, 6]),
    models: [model('dcf', true), model('three_statement', true), model('comps', false)],
    deliverables: [{ kind: 'memo', title: 'Investment memo, first draft' }],
    challenges: [{ status: 'resolved' }],
  });
  /* GS: models reviewed, no desk meeting yet, thesis missing its bear value. */
  fact('GS', {
    models: REQUIRED_MODELS.map((m) => model(m, true)),
    deliverables: [{ kind: 'model', title: 'Earnings model' }],
  });
  /* ISRG: one of the two cross-desk approvals it needs. */
  fact('ISRG', {
    cross: [
      {
        reviewer_member_id: memberOf(4),
        reviewer_team_id: teamOf(1),
        decision: 'approve',
        reason: null,
      },
    ],
    models: REQUIRED_MODELS.map((m) => model(m, true)),
    deskMeeting: meetingRow([5, 2, 9]),
  });
  /* ORCL: deck listed, no meeting yet. LIN: on the agenda, no deck yet. */
  fact('ORCL', { deliverables: [{ kind: 'deck', title: 'Committee deck' }] });
  fact('LIN', { deliverables: [{ kind: 'memo', title: 'Investment memo' }] });
  fact('COST', { deliverables: [{ kind: 'deck', title: 'Committee deck' }] });

  /* Ballots. COST is in the open blind vote: three members have voted. The
     decided pitches carry the ballots of the closed meeting. */
  const ballots = {};
  let ballotN = 0;
  const ballot = (who, vote, rationale, daysAgo = 0.05) => ({
    id: id('ballot', (ballotN += 1)),
    voter_member_id: typeof who === 'number' ? memberOf(who) : who,
    vote,
    rationale,
    recused: false,
    created_at: iso(-daysAgo),
  });
  ballots[pid('COST')] = [
    ballot(3, 'yes', 'Renewal rates and fee increases give a clear path to the target.'),
    ballot(4, 'no', 'At this multiple the upside is already in the price.'),
    ballot(6, 'yes', 'Low cycle risk suits the fund at the proposed size.'),
  ];
  for (const p of pitches) {
    if (!p.decision) continue;
    ballots[p.id] = [
      ballot(3, p.decision === 'accepted' ? 'yes' : 'no', 'Recorded at the committee meeting.', 5),
      ballot(4, 'yes', 'Recorded at the committee meeting.', 5),
      ballot(5, p.decision === 'accepted' ? 'yes' : 'no', 'Recorded at the committee meeting.', 5),
      ballot(6, 'no', 'Recorded at the committee meeting.', 5),
    ];
  }

  const discussion = {};
  discussion[pid('AVGO')] = [
    {
      id: id('msg', 1),
      author_member_id: memberOf(3),
      body: 'How sensitive is the custom accelerator ramp to one customer?',
      created_at: iso(-3),
    },
    {
      id: id('msg', 2),
      author_member_id: memberOf(7),
      body: 'The model shows the case without the largest customer on the second tab.',
      created_at: iso(-2.6),
    },
  ];
  discussion[pid('COST')] = [
    {
      id: id('msg', 3),
      author_member_id: memberOf(5),
      body: 'Pre-read is in the deck. Fee increase timing is on slide six.',
      created_at: iso(-1),
    },
  ];

  const history = {};
  for (const p of pitches) {
    const created = p.created_at;
    const order = [
      'idea',
      'screening',
      'deep_dive',
      'cross_desk_review',
      'pitch_scheduled',
      'ic_vote',
      'approved',
      'in_portfolio',
    ];
    const upto = p.stage === 'rejected' ? order.indexOf('ic_vote') + 1 : order.indexOf(p.stage);
    const steps = order.slice(0, Math.max(1, upto + 1));
    const span = new Date(p.stage_entered_at).getTime() - new Date(created).getTime();
    history[p.id] = steps.map((s, k) => ({
      id: `${p.id}-h${k}`,
      from_stage: k ? steps[k - 1] : null,
      to_stage: s,
      actor_member_id: k ? memberOf(6) : p.analyst_member_id,
      note: k ? null : 'Pitch submitted',
      created_at: new Date(
        new Date(created).getTime() + (steps.length > 1 ? (span * k) / (steps.length - 1) : 0),
      ).toISOString(),
    }));
    if (p.stage === 'rejected') {
      history[p.id].push({
        id: `${p.id}-hr`,
        from_stage: 'ic_vote',
        to_stage: 'rejected',
        actor_member_id: memberOf(6),
        note: p.archive_reason,
        created_at: p.archived_at,
      });
    }
  }

  const deliverables = {};
  for (const p of pitches) {
    deliverables[p.id] = (facts[p.id].deliverables || []).map((d, k) => ({
      id: `${p.id}-d${k}`,
      kind: d.kind,
      title: d.title,
      uploaded_at: iso(-3 - k),
      uploaded_by_member_id: p.analyst_member_id,
    }));
  }

  const hindsight = {};
  SAMPLE_PITCHES.forEach(([ticker, , , , , ret, alpha]) => {
    if (ret == null || alpha == null) return;
    hindsight[pid(ticker)] = {
      pitch_id: pid(ticker),
      return_pct: ret,
      benchmark_return_pct: Math.round((ret - alpha) * 100) / 100,
      alpha_pct: alpha,
      current_state:
        alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline',
    };
  });

  return {
    is_demo: true,
    raw: {
      now,
      viewer: {
        id: me,
        role,
        tier: tier || role,
        team_id: desk.viewer.teamId || null,
        display_name: displayName || 'You',
      },
      members,
      teams,
      meetings,
      pitches,
      facts,
      ballots,
      discussion,
      history,
      deliverables,
      hindsight,
      held: [...held],
      next_id: 1,
    },
  };
}

function emptyFacts() {
  return {
    signoffs: [],
    models: [],
    deskMeeting: null,
    deliverables: [],
    cross: [],
    challenges: [],
  };
}

// ── Reading the sample, with the server's rules ─────────────────────────────
const voters = (raw) => raw.members.filter((m) => isVoter(m) && m.is_active !== false);
const meetingOf = (raw, p) => raw.meetings.find((m) => m.id === p.ic_meeting_id) || null;

function enrich(raw, p) {
  const analyst = raw.members.find((m) => m.id === p.analyst_member_id);
  const team = raw.teams.find((t) => t.id === p.team_id);
  const days = Math.max(0, Math.floor((raw.now - new Date(p.stage_entered_at).getTime()) / DAY));
  const dels = raw.deliverables[p.id] || [];
  return {
    ...p,
    analyst_name: analyst?.display_name || 'Unassigned',
    team_name: team?.name || null,
    stage_label: stageLabel(p.stage),
    days_in_stage: days,
    is_aging: p.status === 'active' && days > AGING_DAYS,
    deliverables: dels,
    deliverable_count: dels.length,
    upside_pct:
      p.current_price && p.target_price
        ? ((p.target_price - p.current_price) / p.current_price) * 100
        : null,
  };
}

/** The gate inputs for one sample pitch, in the shape the server builds. */
export function sampleContext(raw, p) {
  const f = raw.facts[p.id] || emptyFacts();
  const meeting = meetingOf(raw, p);
  const sealed = isBlindOpen(meeting);
  const all = raw.ballots[p.id] || [];
  const active = all.filter((v) => !v.recused);
  const yes = active.filter((v) => v.vote === 'yes').length;
  const no = active.filter((v) => v.vote === 'no').length;
  const eligibleVoters = voters(raw).length;
  const quorumPct = meeting?.quorum_pct ?? 50;
  const seniors = raw.members.filter((m) => m.id !== p.analyst_member_id && canSignOff(m)).length;
  return {
    deskConfig: { min_senior_signoffs: MIN_SIGNOFFS, required_models: REQUIRED_MODELS },
    requiredModels: REQUIRED_MODELS,
    signoffs: f.signoffs,
    deskMeeting: f.deskMeeting
      ? { ...f.deskMeeting, attendee_count: f.deskMeeting.attendee_ids.length }
      : null,
    models: f.models,
    deliverableKinds: (raw.deliverables[p.id] || []).map((d) => d.kind),
    crossDeskApprovals: f.cross,
    crossDeskNeeded: Math.floor((raw.teams.length - 1) / 2) + 1,
    openChallenges: f.challenges.filter((c) => c.status === 'open'),
    challengeCount: f.challenges.length,
    icMeeting: meeting?.id || null,
    meeting,
    ballotsSealed: sealed,
    votesCast: active.length,
    eligibleVoters,
    quorumNeeded: meeting ? Math.max(1, Math.ceil((quorumPct / 100) * eligibleVoters)) : 0,
    voteClosed: meeting?.status === 'closed',
    votePassed:
      yes + no > 0 &&
      (meeting?.threshold === 'supermajority' ? yes * 3 >= (yes + no) * 2 : yes * 2 > yes + no),
    viewerVotes: all,
    eligibleSeniorCount: seniors,
    positionExists: raw.held.includes(p.ticker),
    unrecusedConflicts: 0,
  };
}

/** The board, in the shape GET /api/org/pitches/board returns. */
export function sampleBoard(raw) {
  const eligible = voters(raw).length;
  const sealedIds = new Set(
    raw.pitches.filter((p) => isBlindOpen(meetingOf(raw, p))).map((p) => p.id),
  );
  const pitches = raw.pitches.map((p) => {
    const row = enrich(raw, p);
    const sealedRow = sealedIds.has(p.id) ? sealPitchRow(row) : row;
    const live = p.status === 'active' || p.stage === 'in_portfolio';
    return boardRow(sealedRow, live ? sampleContext(raw, p) : null, raw.viewer, {
      meeting: meetingOf(raw, p),
      eligibleCount: eligible,
      hindsight: raw.hindsight[p.id] || null,
    });
  });
  const votesCast = {};
  for (const [pitchId, list] of Object.entries(raw.ballots)) {
    if (sealedIds.has(pitchId)) continue;
    for (const v of list) votesCast[v.voter_member_id] = (votesCast[v.voter_member_id] || 0) + 1;
  }
  return {
    view: 'pipeline',
    is_demo: true,
    viewer: { ...raw.viewer, is_manager: isManager(raw.viewer) },
    pitches,
    stale: false,
    meetings: raw.meetings,
    eligible_voters: eligible,
    teams: raw.teams.map((t) => ({ id: t.id, name: t.name })),
    members: raw.members.map((m) => ({
      id: m.id,
      display_name: m.display_name,
      role: m.role,
      team_id: m.team_id || null,
    })),
    votes_cast: votesCast,
  };
}

const nameOf = (raw, memberId) =>
  raw.members.find((m) => m.id === memberId)?.display_name || 'Member';

/** One pitch, in the shape GET /api/org/pitches/[id] returns, sealed the same way. */
export function sampleDetail(raw, pitchId) {
  const p = raw.pitches.find((x) => x.id === pitchId);
  if (!p) return null;
  const meeting = meetingOf(raw, p);
  const detail = {
    ...enrich(raw, p),
    hindsight: raw.hindsight[p.id] || null,
    votes: (raw.ballots[p.id] || []).map((v) => ({
      ...v,
      voter_name: nameOf(raw, v.voter_member_id),
      voter_role: raw.members.find((m) => m.id === v.voter_member_id)?.role || null,
    })),
    discussion: (raw.discussion[p.id] || []).map((d) => ({
      ...d,
      author_name: nameOf(raw, d.author_member_id),
    })),
    history: (raw.history[p.id] || []).map((h) => ({
      ...h,
      actor_name: h.actor_member_id ? nameOf(raw, h.actor_member_id) : 'System',
      to_stage_label: stageLabel(h.to_stage),
      from_stage_label: h.from_stage ? stageLabel(h.from_stage) : null,
    })),
    ic_meeting: meeting,
    review_due_at: reviewDueAt(p),
    is_archived: p.status !== 'active',
    permissions: {
      can_upload_deliverable:
        p.status === 'active' &&
        ['screening', 'deep_dive', 'cross_desk_review', 'pitch_scheduled'].includes(p.stage),
      can_discuss: p.status === 'active',
    },
    is_demo: true,
  };
  return sealPitchDetail(detail, {
    sealed: isBlindOpen(meeting),
    viewerMemberId: raw.viewer.id,
    eligibleCount: voters(raw).length,
    quorumPct: meeting?.quorum_pct ?? 50,
  });
}

/** The stage panels' data, in the shapes their routes return. */
export function samplePanels(raw, pitchId) {
  const p = raw.pitches.find((x) => x.id === pitchId);
  if (!p) return null;
  const f = raw.facts[p.id] || emptyFacts();
  const v = raw.viewer;
  const viewerMember = raw.members.find((m) => m.id === v.id) || v;
  /* Sign-offs (GET .../signoff). */
  const desk = raw.members.filter((m) => m.team_id === p.team_id && canSignOff(m));
  const roster = new Map(desk.map((m) => [m.id, { ...m, in_desk: true }]));
  for (const s of f.signoffs) {
    if (!roster.has(s.member_id)) {
      const m = raw.members.find((x) => x.id === s.member_id);
      if (m) roster.set(m.id, { ...m, in_desk: m.team_id === p.team_id });
    }
  }
  const signMembers = [...roster.values()].map((m) => {
    const mine = f.signoffs.filter((s) => s.member_id === m.id);
    const pick = (scope) => {
      const s = mine.find((x) => x.scope === scope);
      return s ? { decision: s.decision, comment: s.comment, created_at: s.created_at } : null;
    };
    return {
      member_id: m.id,
      display_name: m.display_name,
      role: m.role,
      tier: m.tier,
      in_desk: m.in_desk,
      model: pick('model'),
      qualitative: pick('qualitative'),
    };
  });
  const approved = signMembers.filter(
    (m) => m.model?.decision === 'approve' || m.qualitative?.decision === 'approve',
  );
  /* Cross-desk (GET .../cross-desk). */
  const others = raw.teams.filter((t) => t.id !== p.team_id);
  const needed = Math.floor((raw.teams.length - 1) / 2) + 1;
  const crossDesks = others.map((t) => {
    const a = f.cross.find((x) => x.reviewer_team_id === t.id) || null;
    const pm = a
      ? raw.members.find((m) => m.id === a.reviewer_member_id)
      : raw.members.find((m) => m.team_id === t.id && isDeskPm(m));
    return {
      team_id: t.id,
      team_name: t.name,
      pm_id: pm?.id || null,
      pm_name: pm?.display_name || null,
      decision: a?.decision || null,
      reason: a?.reason || null,
      decided_at: a ? raw.now : null,
    };
  });
  const mineCross = f.cross.find((a) => a.reviewer_member_id === v.id) || null;
  /* Models (GET .../models). */
  const checklist = REQUIRED_MODELS.map((type) => {
    const row = f.models.find((m) => m.model_type === type) || null;
    return {
      model_type: type,
      file_url: row?.file_url || null,
      uploaded: Boolean(row?.file_url),
      reviewed: Boolean(row?.reviewed_at),
      reviewed_at: row?.reviewed_at || null,
      version: row?.version || null,
      complete: Boolean(row?.file_url && row?.reviewed_at),
    };
  });
  return {
    signoff: {
      required: MIN_SIGNOFFS,
      approvedCount: approved.length,
      inDeskApproved: approved.filter((m) => m.in_desk).length,
      gatePass: approved.length >= MIN_SIGNOFFS && approved.some((m) => m.in_desk),
      members: signMembers,
      viewer: { id: v.id, eligible: canSignOff(viewerMember), in_desk: v.team_id === p.team_id },
    },
    crossDesk: {
      summary: {
        needed,
        approved: f.cross.filter((a) => a.decision === 'approve').length,
        objections: f.cross.filter((a) => a.decision === 'object').length,
        otherDeskCount: others.length,
      },
      desks: crossDesks,
      viewer: {
        eligible: canCrossDeskReview(viewerMember, p),
        is_pitching_desk: Boolean(v.team_id && v.team_id === p.team_id),
        decision: mineCross?.decision || null,
        reason: mineCross?.reason || null,
      },
    },
    deskMeeting: { meeting: f.deskMeeting },
    models: {
      checklist,
      completeCount: checklist.filter((c) => c.complete).length,
      requiredCount: checklist.length,
      canReview: isManager(v),
    },
    roster: raw.members.map((m) => ({
      id: m.id,
      display_name: m.display_name,
      team_id: m.team_id,
    })),
  };
}

// ── Sample actions: applied on the page, never sent ─────────────────────────
const clone = (raw) => JSON.parse(JSON.stringify(raw));
const fail = (error) => ({ ok: false, error });

/**
 * Apply one action to the sample, with the rules the matching route applies.
 * Returns { ok, raw, error, id }. The input is never changed.
 */
export function applySampleAction(input, action) {
  const raw = clone(input);
  const v = raw.viewer;
  const me = raw.members.find((m) => m.id === v.id) || v;
  const nowIso = new Date(raw.now).toISOString();
  const p = action.pitchId ? raw.pitches.find((x) => x.id === action.pitchId) : null;
  if (action.pitchId && !p) return fail('Pitch not found');
  const hist = (from, to, note) =>
    (raw.history[p.id] = [
      ...(raw.history[p.id] || []),
      {
        id: `${p.id}-h${Date.now()}`,
        from_stage: from,
        to_stage: to,
        actor_member_id: v.id,
        note: note || null,
        created_at: nowIso,
      },
    ]);
  const f = p ? (raw.facts[p.id] = raw.facts[p.id] || emptyFacts()) : null;

  switch (action.type) {
    case 'advance': {
      const cfg = STAGE_CONFIG[p.stage];
      if (!cfg?.next) return fail(`Stage ${p.stage} cannot advance.`);
      if (!canAdvanceStage(p.stage, me)) return fail('Your role cannot advance this pitch.');
      const gates = evaluateGates(p.stage, p, sampleContext(raw, p));
      const passed = allGatesPass(gates);
      if (!passed) {
        if (!action.override) return fail('Gates failing');
        if (!canOverrideStage(p.stage, me)) return fail('This stage cannot be overridden.');
        if ((action.reason || '').trim().length < OVERRIDE_MIN_CHARS) {
          return fail(`Override reason must be at least ${OVERRIDE_MIN_CHARS} characters.`);
        }
      }
      const from = p.stage;
      p.stage = cfg.next;
      p.stage_entered_at = nowIso;
      if (p.stage === 'approved') {
        p.decision = 'accepted';
        p.decision_at = nowIso;
      }
      if (p.stage === 'in_portfolio') {
        p.status = 'accepted';
        p.last_reaffirmed_at = nowIso;
      }
      hist(from, p.stage, passed ? null : `Override: ${action.reason.trim()}`);
      break;
    }
    case 'reject': {
      if (!canReject(me, p)) return fail('Your role cannot move this pitch.');
      if (!(action.note || '').trim()) return fail('Rejection rationale required');
      const from = p.stage;
      Object.assign(p, {
        stage: 'rejected',
        status: 'rejected',
        decision: 'rejected',
        decision_at: nowIso,
        stage_entered_at: nowIso,
        archived_at: nowIso,
        archive_reason: action.note.trim(),
      });
      hist(from, 'rejected', action.note.trim());
      break;
    }
    case 'exit': {
      if (!canExit(me, p)) return fail('Your role cannot move this pitch.');
      if (!(action.note || '').trim()) return fail('Note required for this transition');
      Object.assign(p, {
        stage: 'exited',
        archive_reason: action.note.trim(),
        archived_at: nowIso,
        stage_entered_at: nowIso,
      });
      hist('in_portfolio', 'exited', action.note.trim());
      break;
    }
    case 'editThesis': {
      if (!canEditThesis(me, p) || isThesisFrozen(p.stage))
        return fail('The thesis is frozen from Cross-Desk Review onward.');
      Object.assign(p, action.patch || {});
      break;
    }
    case 'vote': {
      if (!isVoter(me)) return fail('Not eligible to vote on the IC');
      if (p.stage !== 'ic_vote') return fail('Voting is not open');
      const meeting = meetingOf(raw, p);
      if (meeting?.status === 'closed') return fail('Voting is closed');
      if (!['yes', 'no', 'abstain'].includes(action.vote))
        return fail('vote must be yes, no, or abstain');
      if (!(action.rationale || '').trim()) return fail('rationale required');
      const list = (raw.ballots[p.id] = (raw.ballots[p.id] || []).filter(
        (b) => b.voter_member_id !== v.id,
      ));
      list.push({
        id: `${p.id}-mine`,
        voter_member_id: v.id,
        vote: action.vote,
        rationale: action.rationale.trim(),
        recused: false,
        created_at: nowIso,
      });
      break;
    }
    case 'meetingStatus': {
      if (v.role !== 'executive') return fail('Executives only');
      const m = raw.meetings.find((x) => x.id === action.meetingId);
      if (!m) return fail('Meeting not found');
      const next = { scheduled: ['in_session', 'closed'], in_session: ['closed'], closed: [] };
      if (!(next[m.status] || []).includes(action.status))
        return fail(`Cannot move a ${m.status} meeting to ${action.status}`);
      m.status = action.status;
      if (m.status === 'closed') {
        for (const x of raw.pitches.filter((q) => q.ic_meeting_id === m.id)) {
          const act = (raw.ballots[x.id] || []).filter((b) => !b.recused);
          x.vote_yes_count = act.filter((b) => b.vote === 'yes').length;
          x.vote_no_count = act.filter((b) => b.vote === 'no').length;
          x.vote_abstain_count = act.filter((b) => b.vote === 'abstain').length;
        }
      }
      break;
    }
    case 'assignMeeting': {
      if (!isManager(me)) return fail('Managers only');
      if (
        p.status !== 'active' ||
        !['cross_desk_review', 'pitch_scheduled', 'ic_vote'].includes(p.stage)
      ) {
        return fail('A pitch can be scheduled from Cross-Desk Review, Pitch Scheduled or IC Vote');
      }
      const m = raw.meetings.find((x) => x.id === action.meetingId);
      if (action.meetingId && !m) return fail('Meeting not found');
      if (m?.status === 'closed') return fail('That meeting is closed');
      if (!m && p.stage === 'ic_vote') return fail('Cannot detach a pitch while its vote is open');
      p.ic_meeting_id = m ? m.id : null;
      break;
    }
    case 'scheduleMeeting': {
      if (!isManager(me)) return fail('Managers only');
      const mid = `sample-ic-new-${raw.next_id++}`;
      raw.meetings.push({
        id: mid,
        meets_at: action.form.meets_at ? new Date(action.form.meets_at).toISOString() : null,
        ballot_type: action.form.ballot_type === 'blind' ? 'blind' : 'open',
        threshold: action.form.threshold === 'supermajority' ? 'supermajority' : 'simple',
        quorum_pct: Number(action.form.quorum_pct) || 50,
        status: 'scheduled',
        is_demo: true,
      });
      return { ok: true, raw, id: mid };
    }
    case 'signoff': {
      if (!canSignOff(me))
        return fail('Not eligible to sign off, requires Senior Analyst tier or above');
      f.signoffs = f.signoffs.filter((s) => !(s.member_id === v.id && s.scope === action.scope));
      f.signoffs.push({
        member_id: v.id,
        in_desk: v.team_id === p.team_id,
        scope: action.scope,
        decision: action.decision,
        comment: action.comment || null,
        created_at: nowIso,
      });
      break;
    }
    case 'crossDesk': {
      if (v.team_id && v.team_id === p.team_id)
        return fail('The pitching desk cannot review its own pitch.');
      if (!canCrossDeskReview(me, p))
        return fail('Only another desk’s senior PM may record a cross-desk decision.');
      if (
        action.decision === 'object' &&
        (action.reason || '').trim().length < OBJECTION_MIN_CHARS
      ) {
        return fail(`An objection requires a written reason (min ${OBJECTION_MIN_CHARS} chars).`);
      }
      f.cross = f.cross.filter((a) => a.reviewer_member_id !== v.id);
      f.cross.push({
        reviewer_member_id: v.id,
        reviewer_team_id: v.team_id,
        decision: action.decision,
        reason: action.reason || null,
      });
      break;
    }
    case 'deliverable': {
      if (!(action.title || '').trim() || !action.kind) return fail('kind and title required');
      raw.deliverables[p.id] = [
        ...(raw.deliverables[p.id] || []),
        {
          id: `${p.id}-d${Date.now()}`,
          kind: action.kind,
          title: action.title.trim(),
          uploaded_at: nowIso,
          uploaded_by_member_id: v.id,
        },
      ];
      break;
    }
    case 'model': {
      const existing = f.models.find((m) => m.model_type === action.modelType);
      if (action.reviewed) {
        if (!isManager(me))
          return fail('Only a portfolio manager or executive may mark a model reviewed');
        if (!existing) return fail('Upload the model before marking it reviewed');
        Object.assign(existing, { reviewed_at: nowIso, reviewed_by: v.id, complete: true });
      } else {
        if (!(action.fileUrl || '').trim()) return fail('file_url required');
        if (existing)
          Object.assign(existing, {
            file_url: action.fileUrl,
            version: (existing.version || 1) + 1,
            reviewed_at: null,
            complete: false,
          });
        else
          f.models.push({
            model_type: action.modelType,
            file_url: action.fileUrl,
            version: 1,
            reviewed_at: null,
            complete: false,
          });
      }
      break;
    }
    case 'deskMeeting': {
      if (!isManager(me)) return fail('Only a desk PM or executive may log a desk meeting.');
      const b = action.body || {};
      if (!b.held_at) return fail('A meeting date/time (held_at) is required.');
      if ((b.attendee_ids || []).length < 3)
        return fail('At least 3 attendees are required to log a desk meeting.');
      for (const k of ['compliance_notes', 'sector_weight_notes', 'headwinds', 'tailwinds']) {
        if (!String(b[k] || '').trim())
          return fail(`Field "${k}" is required and cannot be empty.`);
      }
      if (
        b.proposed_sizing_pct === '' ||
        b.proposed_sizing_pct == null ||
        Number.isNaN(Number(b.proposed_sizing_pct))
      ) {
        return fail('A numeric proposed sizing % is required.');
      }
      f.deskMeeting = {
        ...b,
        held_at: new Date(b.held_at).toISOString(),
        proposed_sizing_pct: Number(b.proposed_sizing_pct),
      };
      break;
    }
    case 'comment': {
      if (!(action.body || '').trim()) return fail('body required');
      raw.discussion[p.id] = [
        ...(raw.discussion[p.id] || []),
        {
          id: `${p.id}-m${Date.now()}`,
          author_member_id: v.id,
          body: action.body.trim(),
          created_at: nowIso,
        },
      ];
      break;
    }
    case 'decision': {
      if (!canRecordOutcome(me, p)) return fail('Executives only');
      if (!['accepted', 'rejected', 'watchlist', 'deferred'].includes(action.decision))
        return fail('Invalid decision');
      if (!(action.rationale || '').trim()) return fail('decision_rationale required');
      const from = p.stage;
      const accepted = action.decision === 'accepted';
      Object.assign(p, {
        stage: accepted ? 'approved' : 'rejected',
        status: accepted ? 'active' : action.decision,
        decision: action.decision,
        decision_at: nowIso,
        decision_rationale: action.rationale.trim(),
        stage_entered_at: nowIso,
      });
      if (!accepted)
        Object.assign(p, { archived_at: nowIso, archive_reason: action.rationale.trim() });
      hist(from, p.stage, action.rationale.trim());
      break;
    }
    case 'falsification': {
      if (!canReviewFalsification(me, p)) return fail('Your role cannot take this step.');
      p.last_reaffirmed_at = nowIso;
      break;
    }
    case 'submit': {
      const b = action.body || {};
      if (!b.ticker || !b.pitch_type || !(b.thesis_short || '').trim()) {
        return fail('ticker, pitch_type, and thesis_short required');
      }
      const nid = `sample-pitch-new-${raw.next_id++}`;
      const row = {
        id: nid,
        org_id: 'sample',
        ticker: String(b.ticker).toUpperCase(),
        company_name: b.company_name || String(b.ticker).toUpperCase(),
        sector: raw.teams.find((t) => t.id === (b.team_id || v.team_id))?.name || null,
        team_id: b.team_id || v.team_id || null,
        analyst_member_id: v.id,
        pitch_type: b.pitch_type,
        time_horizon: b.time_horizon || null,
        stage: 'idea',
        status: 'active',
        decision: null,
        catalysts: b.catalysts || [],
        risks: b.risks || [],
        thesis_short: b.thesis_short.slice(0, 280),
        thesis_full: b.thesis_full || null,
        why_now: b.why_now || null,
        variant_perception: b.variant_perception || null,
        falsification: b.falsification || null,
        valuation_base: b.valuation_base ?? null,
        valuation_bull: b.valuation_bull ?? null,
        valuation_bear: b.valuation_bear ?? null,
        position_size_pct: b.position_size_pct ?? null,
        conviction_level: b.conviction_level ?? null,
        catalyst_date: b.catalyst_date || null,
        target_price: b.target_price ?? null,
        expected_return_pct: b.expected_return_pct ?? null,
        pitch_price: b.current_price_at_submission ?? null,
        current_price_at_submission: b.current_price_at_submission ?? null,
        current_price: b.current_price_at_submission ?? null,
        stage_entered_at: nowIso,
        created_at: nowIso,
        ic_meeting_id: null,
        is_demo: true,
      };
      raw.pitches.unshift(row);
      raw.facts[nid] = emptyFacts();
      raw.history[nid] = [
        {
          id: `${nid}-h0`,
          from_stage: null,
          to_stage: 'idea',
          actor_member_id: v.id,
          note: 'Pitch submitted',
          created_at: nowIso,
        },
      ];
      return { ok: true, raw, id: nid };
    }
    default:
      return fail('Unknown action');
  }
  return { ok: true, raw, id: p?.id || null };
}
