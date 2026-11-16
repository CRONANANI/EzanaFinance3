#!/usr/bin/env node
/* Pitch Pipeline redesign (Nov 2026): blind ballots, the page model, the
   sample bundle and the page's wiring.
   Usage: npm run test:org-pitch-pipeline

   The blind-ballot tests drive the real server loaders (fetchPitchDetail,
   loadPitchBoard) against an in-memory stand-in for the database client, and
   assert the exact shape that would be sent to the browser. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import {
  ballotView,
  isBlindOpen,
  sealGates,
  sealPitchDetail,
  sealPitchRow,
} from '../src/lib/pitch/ballot-privacy.js';
import { FmpAPI } from '../src/lib/services/fmp.js';
import { fetchPitchDetail, loadPitchBoard } from '../src/lib/org-pitch-api-helpers.js';
import {
  agendaOf,
  analystRecord,
  awaitingReasons,
  fmtPct,
  kpisOf,
  rowStatus,
  rowsForStage,
  stageCounts,
} from '../src/lib/org-pitch-pipeline-model.js';
import {
  applySampleAction,
  buildPitchPipelineSample,
  sampleBoard,
  sampleDetail,
} from '../src/lib/org-pitch-pipeline-sample.js';
import { SAMPLE_PITCHES } from '../src/lib/org-sample-pitches.js';
import { canReject, canEditThesis } from '../src/lib/pitch/rules.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);

/* Prices are never fetched in these tests. */
FmpAPI.getBatchQuote = async () => [];

// ── An in-memory database client with the query surface the loaders use ─────
function fakeDb(tables) {
  const rowsOf = (t) => (tables[t] || []).map((r) => ({ ...r }));
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'u-me' } } }) },
    rpc: async () => ({ data: null, error: { message: 'function does not exist' } }),
    from(table) {
      let rows = rowsOf(table);
      let head = false;
      const q = {
        select(_cols, opts) {
          head = Boolean(opts?.head);
          return q;
        },
        eq(col, val) {
          rows = rows.filter((r) => r[col] === val);
          return q;
        },
        in(col, vals) {
          rows = rows.filter((r) => vals.includes(r[col]));
          return q;
        },
        gte: () => q,
        order: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: rows[0] || null, error: null }),
        single: async () => ({ data: rows[0] || null, error: null }),
        then(resolve) {
          resolve(
            head ? { count: rows.length, data: null, error: null } : { data: rows, error: null },
          );
        },
      };
      return q;
    },
  };
}

const ORG = 'org-1';
const M = {
  me: { id: 'm-me', org_id: ORG, display_name: 'Viewer Exec', role: 'executive', is_active: true },
  pm1: {
    id: 'm-pm1',
    org_id: ORG,
    display_name: 'Voter One',
    role: 'portfolio_manager',
    team_id: 't1',
    is_active: true,
  },
  pm2: {
    id: 'm-pm2',
    org_id: ORG,
    display_name: 'Voter Two',
    role: 'portfolio_manager',
    team_id: 't2',
    is_active: true,
  },
  an: {
    id: 'm-an',
    org_id: ORG,
    display_name: 'Author Analyst',
    role: 'analyst',
    team_id: 't1',
    is_active: true,
  },
};
function world({ meetingStatus = 'in_session', ballotType = 'blind', withOwn = false } = {}) {
  const votes = [
    {
      id: 'v1',
      pitch_id: 'p-blind',
      voter_member_id: 'm-pm1',
      vote: 'yes',
      rationale: 'SECRET-RATIONALE-ONE',
      recused: false,
      created_at: '2026-11-14',
    },
    {
      id: 'v2',
      pitch_id: 'p-blind',
      voter_member_id: 'm-pm2',
      vote: 'no',
      rationale: 'SECRET-RATIONALE-TWO',
      recused: false,
      created_at: '2026-11-14',
    },
  ];
  if (withOwn) {
    votes.push({
      id: 'v3',
      pitch_id: 'p-blind',
      voter_member_id: 'm-me',
      vote: 'abstain',
      rationale: 'Mine',
      recused: false,
      created_at: '2026-11-15',
    });
  }
  return fakeDb({
    org_members: Object.values(M),
    org_teams: [
      { id: 't1', org_id: ORG, name: 'Financials' },
      { id: 't2', org_id: ORG, name: 'Healthcare' },
    ],
    org_ic_meetings: [
      {
        id: 'mtg',
        org_id: ORG,
        ballot_type: ballotType,
        status: meetingStatus,
        threshold: 'simple',
        quorum_pct: 50,
        meets_at: '2026-11-15T15:00:00Z',
      },
    ],
    org_pitches: [
      {
        id: 'p-blind',
        org_id: ORG,
        ticker: 'AAA',
        company_name: 'Alpha Co',
        team_id: 't1',
        analyst_member_id: 'm-an',
        stage: 'ic_vote',
        status: 'active',
        ic_meeting_id: 'mtg',
        /* A tally left on the row by an earlier write: must never leave. */
        vote_yes_count: 1,
        vote_no_count: 1,
        vote_abstain_count: 0,
        thesis_short: 'A thesis that is long enough to pass.',
        stage_entered_at: '2026-11-13T00:00:00Z',
        created_at: '2026-10-01T00:00:00Z',
      },
    ],
    org_pitch_votes: votes,
  });
}

const VIEW = { id: 'm-me', role: 'executive', tier: 'executive', team_id: null };

// ── Blind ballots: the pure rules ────────────────────────────────────────────
test('blind ballot: open until the meeting is closed', () => {
  assert.equal(isBlindOpen({ ballot_type: 'blind', status: 'in_session' }), true);
  assert.equal(isBlindOpen({ ballot_type: 'blind', status: 'scheduled' }), true);
  assert.equal(isBlindOpen({ ballot_type: 'blind', status: 'closed' }), false);
  assert.equal(isBlindOpen({ ballot_type: 'open', status: 'in_session' }), false);
  assert.equal(isBlindOpen(null), false);
});

test('blind ballot: a sealed row carries no tally', () => {
  const r = sealPitchRow({ id: 'x', vote_yes_count: 3, vote_no_count: 1, vote_abstain_count: 2 });
  assert.equal(r.vote_yes_count, null);
  assert.equal(r.vote_no_count, null);
  assert.equal(r.vote_abstain_count, null);
  assert.equal(r.ballots_sealed, true);
});

test('blind ballot: sealed view keeps only the viewer’s own ballot and the count', () => {
  const votes = [
    { voter_member_id: 'a', vote: 'yes', rationale: 'r1' },
    { voter_member_id: 'b', vote: 'no', rationale: 'r2' },
    { voter_member_id: 'me', vote: 'abstain', rationale: 'mine' },
  ];
  const v = ballotView({
    votes,
    sealed: true,
    viewerMemberId: 'me',
    eligibleCount: 5,
    quorumPct: 60,
  });
  assert.deepEqual(
    v.votes.map((x) => x.voter_member_id),
    ['me'],
  );
  assert.equal(v.summary.tally, null);
  assert.equal(v.summary.received, 3);
  assert.equal(v.summary.own.vote, 'abstain');
  const open = ballotView({ votes, sealed: false, viewerMemberId: 'me', eligibleCount: 5 });
  assert.equal(open.votes.length, 3);
  assert.deepEqual(open.summary.tally, { yes: 1, no: 1, abstain: 1 });
});

test('blind ballot: "Vote carried" says nothing while the vote is open', () => {
  const gates = sealGates([
    { id: 'quorum_met', status: 'pass', detail: '2 of 2 voted' },
    { id: 'vote_passed', status: 'pass', detail: 'Carried' },
  ]);
  assert.equal(gates[0].status, 'pass');
  assert.equal(gates[1].status, 'pending');
  assert.doesNotMatch(gates[1].detail, /Carried/);
});

// ── Blind ballots: the payload the server would send ────────────────────────
test('server: pitch detail during an open blind vote is stripped', async () => {
  const d = await fetchPitchDetail(world(), ORG, 'p-blind', { viewerMemberId: 'm-me' });
  const json = JSON.stringify(d);
  assert.deepEqual(d.votes, []);
  assert.equal(d.vote_yes_count, null);
  assert.equal(d.vote_no_count, null);
  assert.equal(d.vote_abstain_count, null);
  assert.equal(d.ballot.sealed, true);
  assert.equal(d.ballot.tally, null);
  assert.equal(d.ballot.received, 2);
  assert.equal(d.ballot.own, null);
  for (const secret of ['SECRET-RATIONALE', 'Voter One', 'Voter Two', 'm-pm1', 'm-pm2']) {
    assert.ok(!json.includes(secret), `payload leaks ${secret}`);
  }
});

test('server: the viewer gets their own ballot back, and only that', async () => {
  const d = await fetchPitchDetail(world({ withOwn: true }), ORG, 'p-blind', {
    viewerMemberId: 'm-me',
  });
  assert.equal(d.votes.length, 1);
  assert.equal(d.votes[0].voter_member_id, 'm-me');
  assert.equal(d.ballot.own.vote, 'abstain');
  assert.equal(d.ballot.received, 3);
  assert.ok(!JSON.stringify(d).includes('SECRET-RATIONALE'));
});

test('server: a caller that names no viewer gets no ballot at all', async () => {
  const d = await fetchPitchDetail(world({ withOwn: true }), ORG, 'p-blind');
  assert.deepEqual(d.votes, []);
});

test('server: after the meeting closes the record is returned in full', async () => {
  const d = await fetchPitchDetail(world({ meetingStatus: 'closed' }), ORG, 'p-blind', {
    viewerMemberId: 'm-me',
  });
  assert.equal(d.votes.length, 2);
  assert.equal(d.ballot.sealed, false);
  assert.deepEqual(d.ballot.tally, { yes: 1, no: 1, abstain: 0 });
  assert.equal(d.vote_yes_count, 1);
});

test('server: an open (not blind) ballot shows every ballot as before', async () => {
  const d = await fetchPitchDetail(world({ ballotType: 'open' }), ORG, 'p-blind', {
    viewerMemberId: 'm-me',
  });
  assert.equal(d.votes.length, 2);
});

test('server: the pipeline payload carries participation only during a blind vote', async () => {
  const board = await loadPitchBoard(world({ withOwn: true }), ORG, { viewer: VIEW });
  const p = board.pitches.find((x) => x.id === 'p-blind');
  const json = JSON.stringify(board);
  assert.equal(p.vote_yes_count, null);
  assert.equal(p.vote_no_count, null);
  assert.equal(p.vote_abstain_count, null);
  assert.deepEqual(Object.keys(p.ballot).sort(), [
    'closed',
    'eligible',
    'quorum_met',
    'quorum_needed',
    'received',
    'sealed',
  ]);
  assert.equal(p.ballot.received, 3);
  assert.equal(p.gate.gates.find((g) => g.id === 'vote_passed').status, 'pending');
  /* Votes cast leaves out ballots in the open blind vote. */
  assert.deepEqual(board.votes_cast, {});
  assert.ok(!json.includes('SECRET-RATIONALE'));
  assert.ok(!/"vote":"(yes|no|abstain)"/.test(json), 'no ballot choice anywhere in the payload');
});

test('server: every pitch route passes the signed-in member to the detail loader', () => {
  const dir = path.join(ROOT, 'src/app/api/org/pitches');
  const files = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'route.js') files.push(p);
    }
  };
  walk(dir);
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const calls = src.match(/fetchPitchDetail\([^)]*\)/g) || [];
    for (const c of calls) {
      assert.match(c, /viewerMemberId/, `${path.relative(ROOT, f)}: ${c}`);
    }
  }
  const hind = read('src/app/api/org/archive/hindsight/[pitchId]/route.js');
  assert.match(
    hind,
    /fetchPitchDetail\(supabase, orgId, pitch\.id\)/,
    'archive route: decided pitches only',
  );
});

test('server: the tally is not written onto the pitch while a blind vote is open', () => {
  const src = read('src/lib/org-pitch-api-helpers.js');
  assert.match(
    src,
    /if \(await isPitchSealed\(supabase, orgId, pitch\)\) return \{ vote: data \};/,
  );
  const close = read('src/app/api/org/pitches/ic-meetings/[meetingId]/route.js');
  assert.match(close, /status === 'closed'[\s\S]*recalcVoteTally/);
});

test('server: digest and scorecard leave out ballots in an open blind vote', () => {
  assert.match(read('src/app/api/org/digest/route.js'), /sealedPitchIds\.has\(v\.pitch_id\)/);
  assert.match(read('src/lib/org-attribution.js'), /sealedPitchIds\.has\(b\.pitch_id\)/);
});

// ── Page model ───────────────────────────────────────────────────────────────
test('model: a blind ballot row reads as a ballot, never as a vote', () => {
  const s = rowStatus({
    stage: 'ic_vote',
    status: 'active',
    ballot: { sealed: true, closed: false },
  });
  assert.equal(s.label, 'Blind ballot open');
});

test('model: the stage strip filters, and counts equal the rows shown', () => {
  const ps = [
    { stage: 'idea', status: 'active' },
    { stage: 'idea', status: 'active' },
    { stage: 'in_portfolio', status: 'accepted' },
    { stage: 'rejected', status: 'rejected' },
  ];
  const c = stageCounts(ps);
  assert.equal(c.idea, rowsForStage(ps, 'idea').length);
  assert.equal(rowsForStage(ps, null).length, 2);
  assert.deepEqual(kpisOf(ps), { active: 2, in_portfolio: 1, aging: 0, archived: 1 });
});

test('model: what waits on a voter is their own ballot only', () => {
  const pm = { id: 'pm', role: 'portfolio_manager', team_id: 't1' };
  const p = {
    stage: 'ic_vote',
    status: 'active',
    ballot: { sealed: true, closed: false },
    viewer_state: { ballot_cast: false },
    gate: { gates: [] },
  };
  assert.equal(awaitingReasons(p, pm)[0].key, 'ballot');
  const voted = { ...p, viewer_state: { ballot_cast: true } };
  assert.equal(awaitingReasons(voted, pm).length, 0);
  const analyst = { id: 'a', role: 'analyst', team_id: 't1' };
  assert.equal(awaitingReasons(p, analyst).length, 0);
});

test('model: estimates are signed with two decimals; missing reads N/A', () => {
  assert.equal(fmtPct(12.345), '+12.35%');
  assert.equal(fmtPct(-3), '-3.00%');
  assert.equal(fmtPct(null), 'N/A');
});

test('model: the agenda lists the next open meeting and its pitches', () => {
  const a = agendaOf(
    [
      { id: 'p1', ic_meeting_id: 'm2', status: 'active', stage: 'ic_vote' },
      { id: 'p2', stage: 'pitch_scheduled', status: 'active', ic_meeting_id: null },
    ],
    [
      { id: 'm1', status: 'closed' },
      { id: 'm2', status: 'in_session', meets_at: '2026-11-15' },
    ],
  );
  assert.equal(a.meeting.id, 'm2');
  assert.equal(a.items.length, 1);
  assert.equal(a.unassigned.length, 1);
});

test('rules: reject and thesis edits follow the routes', () => {
  const pitch = { stage: 'screening', status: 'active', analyst_member_id: 'a' };
  assert.equal(canReject({ id: 'x', role: 'analyst' }, pitch), false);
  assert.equal(canReject({ id: 'x', role: 'executive', tier: 'executive' }, pitch), true);
  /* A plain PM cannot move a Screening pitch on, so cannot reject it either. */
  assert.equal(
    canReject({ id: 'x', role: 'portfolio_manager', tier: 'portfolio_manager' }, pitch),
    false,
  );
  assert.equal(canEditThesis({ id: 'a', role: 'analyst' }, pitch), true);
  assert.equal(canEditThesis({ id: 'b', role: 'analyst' }, pitch), false);
  assert.equal(
    canEditThesis({ id: 'a', role: 'analyst' }, { ...pitch, stage: 'cross_desk_review' }),
    false,
  );
});

// ── Sample content ───────────────────────────────────────────────────────────
const bundle = () =>
  buildPitchPipelineSample({
    userId: 'u',
    memberId: 'me',
    role: 'executive',
    tier: 'executive',
    displayName: 'You',
    now: NOW,
  });

test('sample: the same pitches as Fund Analytics', () => {
  const board = sampleBoard(bundle().raw);
  assert.equal(board.pitches.length, SAMPLE_PITCHES.length);
  assert.deepEqual(
    board.pitches.map((p) => p.ticker),
    SAMPLE_PITCHES.map((p) => p[0]),
  );
  const fa = read('src/lib/org-fund-analytics-sample.js');
  assert.match(fa, /SAMPLE_PITCHES/);
  for (const p of board.pitches) assert.equal(p.is_demo, true);
});

test('sample: no real people; the council is the sample council', () => {
  const raw = bundle().raw;
  const names = raw.members.map((m) => m.display_name);
  assert.ok(names.includes('Amara Tesfaye'));
  assert.ok(names.includes('Selam Haile'));
});

test('sample: the open blind vote is sealed exactly as the server seals it', () => {
  const raw = bundle().raw;
  const board = sampleBoard(raw);
  const cost = board.pitches.find((p) => p.ticker === 'COST');
  assert.equal(cost.ballot.sealed, true);
  assert.equal(cost.vote_yes_count, null);
  const d = sampleDetail(raw, cost.id);
  assert.deepEqual(d.votes, []);
  assert.equal(d.ballot.tally, null);
  assert.equal(d.ballot.received, 3);
});

test('sample: a ballot cast stays sealed; closing the vote reveals the results', () => {
  let raw = bundle().raw;
  const cost = raw.pitches.find((p) => p.ticker === 'COST');
  let r = applySampleAction(raw, {
    type: 'vote',
    pitchId: cost.id,
    vote: 'yes',
    rationale: 'Mine.',
  });
  assert.equal(r.ok, true);
  raw = r.raw;
  let d = sampleDetail(raw, cost.id);
  assert.equal(d.votes.length, 1);
  assert.equal(d.ballot.own.vote, 'yes');
  assert.equal(d.ballot.tally, null);
  r = applySampleAction(raw, {
    type: 'meetingStatus',
    meetingId: cost.ic_meeting_id,
    status: 'closed',
  });
  assert.equal(r.ok, true);
  d = sampleDetail(r.raw, cost.id);
  assert.equal(d.votes.length, 4);
  assert.deepEqual(d.ballot.tally, { yes: 3, no: 1, abstain: 0 });
});

test('sample: actions follow the routes’ rules', () => {
  const raw = bundle().raw;
  const gs = raw.pitches.find((p) => p.ticker === 'GS');
  assert.equal(
    applySampleAction(raw, { type: 'advance', pitchId: gs.id }).ok,
    false,
    'gates failing',
  );
  const vote = applySampleAction(raw, {
    type: 'vote',
    pitchId: gs.id,
    vote: 'yes',
    rationale: 'x',
  });
  assert.equal(vote.ok, false, 'not at IC vote');
  const analyst = buildPitchPipelineSample({
    userId: 'u',
    memberId: 'me',
    role: 'analyst',
    now: NOW,
  }).raw;
  const axp = analyst.pitches.find((p) => p.ticker === 'AXP');
  assert.equal(axp.analyst_member_id, 'me', 'an analyst viewer authors a pitch');
  assert.equal(
    applySampleAction(analyst, { type: 'reject', pitchId: axp.id, note: 'No' }).ok,
    false,
  );
  const edit = applySampleAction(analyst, {
    type: 'editThesis',
    pitchId: axp.id,
    patch: { valuation_base: 355 },
  });
  assert.equal(edit.ok, true);
  const after = sampleBoard(edit.raw).pitches.find((p) => p.id === axp.id);
  assert.ok(after.gate.gates.find((g) => g.id === 'thesis_completeness_80').status === 'pass');
});

test('sample: the record’s votes leave out the open blind vote', () => {
  const board = sampleBoard(bundle().raw);
  const rec = analystRecord(board.pitches, board.members, board.votes_cast);
  const haile = rec.find((r) => r.name === 'Selam Haile');
  /* 14 decided pitches carry closed ballots; the COST ballot is not counted. */
  assert.equal(haile.votes_cast, 14);
});

// ── Page wiring ──────────────────────────────────────────────────────────────
test('page: no tally field is read anywhere in the page', () => {
  for (const f of readdirSync(path.join(ROOT, 'src/components/org/pitches'))) {
    if (!/^(Pitch(Pipeline|Dialog|Tabs)|Submit|Schedule|usePipeline)/.test(f)) continue;
    const src = read(`src/components/org/pitches/${f}`);
    assert.doesNotMatch(src, /vote_(yes|no|abstain)_count/, f);
  }
});

test('page: the ballot form never starts with a choice', () => {
  const src = read('src/components/org/pitches/PitchDialog.jsx');
  assert.match(src, /const \[choice, setChoice\] = useState\(null\);/);
  assert.match(src, /stage === 'ic_vote' && meeting && meeting\.status === 'in_session'/);
});

test('page: one vote form, no vendor names, address state, ds dialogs', () => {
  const dir = 'src/components/org/pitches';
  const all = [
    'PitchPipelinePage.jsx',
    'PitchDialog.jsx',
    'PitchTabs.jsx',
    'SubmitPitchDialog.jsx',
    'ScheduleMeetingDialog.jsx',
  ]
    .map((f) => read(`${dir}/${f}`))
    .join('\n');
  assert.equal((all.match(/type: 'vote'/g) || []).length, 1);
  assert.doesNotMatch(all, /\bFMP\b|Financial Modeling Prep|alert\(/);
  assert.match(
    read(`${dir}/PitchPipelinePage.jsx`),
    /set\('stage', stage \|\| null\);[\s\S]*set\('pitch', pitchId \|\| null\);/,
  );
  assert.match(all, /from '@\/components\/ds'/);
  assert.doesNotMatch(
    read('src/app/api/org/pitches/[pitchId]/supporting-data/route.js'),
    /FMP fetch failed/,
  );
});

test('page: the old per-pitch address still redirects into the dialog', () => {
  assert.match(
    read('src/app/(dashboard)/org-team-hub/pitches/[pitchId]/page.js'),
    /redirect\(`\/org-team-hub\/pitches\?pitch=\$\{pitchId\}`\)/,
  );
});

test('server: the thesis edit path accepts every gated field', () => {
  const src = read('src/app/api/org/pitches/[pitchId]/route.js');
  for (const k of [
    'valuation_base',
    'valuation_bull',
    'valuation_bear',
    'variant_perception',
    'falsification',
    'position_size_pct',
  ]) {
    assert.match(src, new RegExp(`'${k}'`), k);
  }
});
