#!/usr/bin/env node
/* QA Phase 4 org P1 regression suite (ORG-1, ORG-3, ORG-4, ORG-5).
   Exercises the extracted decision helpers with a mocked Supabase / Resend;
   no network, no real email.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-p1.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockSupabase } from './lib/mock-supabase.mjs';
import {
  inviteLink,
  sendOrgInviteEmail,
  validateInviteScope,
  isInviteReturnPath,
} from '../src/lib/org-invites.js';
import { resolveProvisionRoleTier } from '../src/lib/org-provision.js';
import { targetMatchesMember, submitAssignment } from '../src/lib/org-assignment-submit.js';
import { submitJudgeScorecard, validateScores } from '../src/lib/competitions/judge-submit.js';
import { judgeRateLimited } from '../src/lib/competitions/judge-rate-limit.js';

// ── ORG-1 ──────────────────────────────────────────────────────────────────
test('ORG-1: invite link points at the org-login accept screen', () => {
  assert.equal(
    inviteLink('t/k n', 'https://ezana.world/'),
    'https://ezana.world/auth/org-login?invite=t%2Fk%20n',
  );
});

test('ORG-1: a failed invite email reports false instead of throwing', async () => {
  const failing = { emails: { send: async () => ({ error: { message: 'boom' } }) } };
  const throwing = {
    emails: {
      send: async () => {
        throw new Error('network');
      },
    },
  };
  const args = { email: 'a@u.edu', orgName: 'Fund', role: 'analyst', link: 'https://x/y' };
  assert.equal(await sendOrgInviteEmail(failing, args), false);
  assert.equal(await sendOrgInviteEmail(throwing, args), false);
  assert.equal(await sendOrgInviteEmail(null, args), false);
});

test('ORG-1: a sent invite email goes to the invitee with the link, escaped', async () => {
  const sent = [];
  const ok = { emails: { send: async (m) => (sent.push(m), { error: null }) } };
  const res = await sendOrgInviteEmail(ok, {
    email: 'a@u.edu',
    orgName: '<Fund>',
    role: 'analyst',
    link: 'https://ezana.world/auth/org-login?invite=abc',
    from: 'Ezana <noreply@ezana.world>',
  });
  assert.equal(res, true);
  assert.equal(sent[0].to, 'a@u.edu');
  assert.equal(sent[0].from, 'Ezana <noreply@ezana.world>');
  assert.match(sent[0].html, /invite=abc/);
  assert.match(sent[0].html, /&lt;Fund&gt;/);
});

test('ORG-20: invite team/cohort must belong to the inviter org', async () => {
  const db = createMockSupabase({
    seed: {
      org_teams: [
        { id: 'team-1', org_id: 'org-1' },
        { id: 'team-x', org_id: 'org-2' },
      ],
      org_cohorts: [{ id: 'co-1', org_id: 'org-1' }],
    },
  });
  assert.equal(
    await validateInviteScope(db, 'org-1', { team_id: 'team-1', cohort_id: 'co-1' }),
    null,
  );
  assert.equal(await validateInviteScope(db, 'org-1', {}), null);
  assert.match(await validateInviteScope(db, 'org-1', { team_id: 'team-x' }), /team_id/);
  assert.match(await validateInviteScope(db, 'org-1', { cohort_id: 'nope' }), /cohort_id/);
});

test('ORG-1: only a same-site org-login invite path skips the membership sign-out', () => {
  assert.equal(isInviteReturnPath('/auth/org-login?invite=abc'), true);
  assert.equal(isInviteReturnPath('/org-team-hub'), false);
  assert.equal(isInviteReturnPath('/auth/org-login'), false);
  assert.equal(isInviteReturnPath('/home?invite=abc'), false);
  assert.equal(isInviteReturnPath('//evil.com/auth/org-login?invite=abc'), false);
  assert.equal(isInviteReturnPath('https://evil.com/auth/org-login?invite=abc'), false);
  assert.equal(isInviteReturnPath(undefined), false);
});

// ── ORG-3 ──────────────────────────────────────────────────────────────────
const PM = { role: 'portfolio_manager', tier: 'portfolio_manager' };
const EXEC = { role: 'executive', tier: 'executive' };
const PRESIDENT = { role: 'executive', tier: 'president' };

test('ORG-3: a PM cannot provision an executive (403)', () => {
  const r = resolveProvisionRoleTier(PM, { role: 'executive' });
  assert.equal(r.ok, false);
  assert.equal(r.status, 403);
});

test('ORG-3: a PM cannot assign a tier at or above their own (403)', () => {
  for (const tier of ['president', 'vice_president', 'executive', 'portfolio_manager']) {
    const r = resolveProvisionRoleTier(PM, { role: 'analyst', tier });
    assert.equal(r.ok, false, tier);
    assert.equal(r.status, 403);
  }
  assert.equal(resolveProvisionRoleTier(PM, { tier: 'made_up' }).status, 403);
});

test('ORG-3: allowed provisions pass through', () => {
  assert.deepEqual(resolveProvisionRoleTier(PM, { role: 'analyst', tier: 'junior_analyst' }), {
    ok: true,
    role: 'analyst',
    tier: 'junior_analyst',
  });
  assert.deepEqual(resolveProvisionRoleTier(PM, {}), { ok: true, role: 'analyst', tier: null });
  assert.equal(resolveProvisionRoleTier(EXEC, { role: 'executive' }).ok, true);
  assert.equal(resolveProvisionRoleTier(EXEC, { tier: 'executive' }).ok, false);
  assert.equal(
    resolveProvisionRoleTier(PRESIDENT, { role: 'executive', tier: 'president' }).ok,
    true,
  );
});

// ── ORG-4 ──────────────────────────────────────────────────────────────────
const COHORT_MEMBER = {
  id: 'm-ana',
  user_id: 'u-ana',
  org_id: 'org-1',
  role: 'analyst',
  team_id: 'team-a',
  cohort_id: 'cohort-1',
  display_name: 'Ana',
};

function assignmentDb(targets, assignedTo = 'u-someone-else') {
  return createMockSupabase({
    seed: {
      org_assignments: [
        { id: 'asg-1', org_id: 'org-1', assigned_to: assignedTo, status: 'assigned' },
      ],
      org_assignment_assignees: targets.map((t) => ({
        assignment_id: 'asg-1',
        org_id: 'org-1',
        ...t,
      })),
    },
  });
}

test('ORG-4: target matching mirrors auth_targeted_assignment_ids()', () => {
  const m = { ...COHORT_MEMBER, title: 'Desk Lead', sub_role: 'quant' };
  assert.equal(targetMatchesMember({ target_type: 'org' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'member', target_id: 'm-ana' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'team', target_id: 'team-a' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'cohort', target_id: 'cohort-1' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'role', target_role: 'analyst' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'role', target_role: 'desk lead' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'role', target_role: 'QUANT' }, m), true);
  assert.equal(targetMatchesMember({ target_type: 'cohort', target_id: 'cohort-2' }, m), false);
  assert.equal(targetMatchesMember({ target_type: 'team', target_id: 'team-b' }, m), false);
  assert.equal(targetMatchesMember({ target_type: 'role', target_role: '' }, m), false);
});

test('ORG-4: a cohort assignee (not assigned_to) submits and gets 201', async () => {
  const db = assignmentDb([{ target_type: 'cohort', target_id: 'cohort-1' }]);
  const res = await submitAssignment({
    userClient: db,
    adminClient: db,
    member: COHORT_MEMBER,
    isManager: false,
    assignmentId: 'asg-1',
    note: 'done',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.submission.version, 1);
  assert.equal(res.body.submission.submitted_by, 'u-ana');
  assert.equal(db.rows('org_assignments')[0].status, 'submitted');
});

test('ORG-4: a member outside every target gets 403 and nothing is written', async () => {
  const db = assignmentDb([{ target_type: 'cohort', target_id: 'cohort-2' }]);
  const res = await submitAssignment({
    userClient: db,
    adminClient: db,
    member: COHORT_MEMBER,
    isManager: false,
    assignmentId: 'asg-1',
  });
  assert.equal(res.status, 403);
  assert.equal(db.rows('org_assignment_submissions').length, 0);
  assert.equal(db.rows('org_assignments')[0].status, 'assigned');
});

test('ORG-4: the legacy assigned_to still submits; a missing assignment is 404', async () => {
  const db = assignmentDb([], 'u-ana');
  const ok = await submitAssignment({
    userClient: db,
    adminClient: db,
    member: COHORT_MEMBER,
    isManager: false,
    assignmentId: 'asg-1',
  });
  assert.equal(ok.status, 201);
  const missing = await submitAssignment({
    userClient: db,
    adminClient: db,
    member: COHORT_MEMBER,
    isManager: false,
    assignmentId: 'nope',
  });
  assert.equal(missing.status, 404);
});

// ── ORG-5 ──────────────────────────────────────────────────────────────────
const JUDGE = { id: 'judge-1', competition_id: 'comp-1' };

function judgeDb({ status = 'judging', submitted = false } = {}) {
  return createMockSupabase({
    seed: {
      pitch_competitions: [{ id: 'comp-1', status }],
      pitch_room_judges: [{ judge_id: 'judge-1', room_id: 'room-1' }],
      pitch_teams: [{ id: 'team-1', room_id: 'room-1' }],
      pitch_rubric_criteria: [
        { id: 'c-thesis', competition_id: 'comp-1', label: 'Thesis', max_score: 10 },
        { id: 'c-model', competition_id: 'comp-1', label: 'Model', max_score: 5 },
        { id: 'c-other', competition_id: 'comp-2', label: 'Other comp', max_score: 10 },
      ],
      pitch_score_summaries: submitted
        ? [{ judge_id: 'judge-1', team_id: 'team-1', submitted: true }]
        : [],
    },
  });
}

test('ORG-5: submit persists every score, then locks the summary', async () => {
  const db = judgeDb();
  const res = await submitJudgeScorecard(db, JUDGE, {
    team_id: 'team-1',
    comment: 'Strong',
    scores: [
      { criterion_id: 'c-thesis', score: 8 },
      { criterion_id: 'c-model', score: 4 },
    ],
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const saved = db.rows('pitch_scores');
  assert.deepEqual(saved.map((r) => [r.judge_id, r.team_id, r.criterion_id, r.score]).sort(), [
    ['judge-1', 'team-1', 'c-model', 4],
    ['judge-1', 'team-1', 'c-thesis', 8],
  ]);
  const summary = db.rows('pitch_score_summaries')[0];
  assert.equal(summary.submitted, true);
  assert.equal(summary.comment, 'Strong');
});

test('ORG-5: a foreign criterion or out-of-range score is rejected and nothing locks', async () => {
  for (const scores of [
    [{ criterion_id: 'c-other', score: 3 }],
    [{ criterion_id: 'c-model', score: 6 }],
    [{ criterion_id: 'c-model', score: -1 }],
    [{ criterion_id: 'c-model', score: 'abc' }],
  ]) {
    const db = judgeDb();
    const res = await submitJudgeScorecard(db, JUDGE, { team_id: 'team-1', scores });
    assert.equal(res.status, 400, JSON.stringify(scores));
    assert.equal(db.rows('pitch_scores').length, 0);
    assert.equal(db.rows('pitch_score_summaries').length, 0);
  }
});

test('ORG-5: a failed score write is a 500 and the scorecard stays unlocked', async () => {
  const db = judgeDb();
  const failing = {
    ...db,
    from: (t) =>
      t === 'pitch_scores'
        ? { upsert: async () => ({ data: null, error: { message: 'write failed' } }) }
        : db.from(t),
  };
  const res = await submitJudgeScorecard(failing, JUDGE, {
    team_id: 'team-1',
    scores: [{ criterion_id: 'c-thesis', score: 7 }],
  });
  assert.equal(res.status, 500);
  assert.equal(db.rows('pitch_score_summaries').length, 0);
});

test('ORG-5/ORG-20: 409 once the competition is complete or archived; 403 outside the room', async () => {
  for (const status of ['complete', 'archived']) {
    const res = await submitJudgeScorecard(judgeDb({ status }), JUDGE, { team_id: 'team-1' });
    assert.equal(res.status, 409);
  }
  const res = await submitJudgeScorecard(judgeDb(), JUDGE, { team_id: 'team-other' });
  assert.equal(res.status, 403);
});

test('ORG-5: a retried submit after success is a no-op 200', async () => {
  const db = judgeDb({ submitted: true });
  const res = await submitJudgeScorecard(db, JUDGE, {
    team_id: 'team-1',
    scores: [{ criterion_id: 'c-thesis', score: 1 }],
  });
  assert.equal(res.status, 200);
  assert.equal(db.rows('pitch_scores').length, 0);
});

test('ORG-5: validateScores keeps the last value per criterion', () => {
  const crit = [{ id: 'a', max_score: 10 }];
  assert.deepEqual(
    validateScores(
      [
        { criterion_id: 'a', score: 2 },
        { criterion_id: 'a', score: 9 },
      ],
      crit,
    ),
    { rows: [{ criterion_id: 'a', score: 9 }] },
  );
  assert.deepEqual(validateScores(undefined, crit), { rows: [] });
  assert.ok(validateScores('x', crit).error);
});

test('ORG-5: judge rate limit is 120/min keyed by the token hash, never the raw token', async () => {
  const seen = [];
  const check = async (key, limit, windowMs) => {
    seen.push({ key, limit, windowMs });
    return { allowed: seen.length <= 1 };
  };
  const token = 'a'.repeat(43);
  assert.equal(await judgeRateLimited(token, check), false);
  assert.equal(await judgeRateLimited(token, check), true);
  assert.equal(await judgeRateLimited(null, check), false);
  assert.equal(seen.length, 2);
  assert.equal(seen[0].limit, 120);
  assert.equal(seen[0].windowMs, 60_000);
  assert.match(seen[0].key, /^judge:[0-9a-f]{64}$/);
  assert.ok(!seen[0].key.includes(token));
});
