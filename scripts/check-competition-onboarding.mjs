/**
 * Unit tests for the pure onboarding logic (evaluateRegistration / deliverables).
 * Run: node scripts/check-competition-onboarding.mjs  (npm run test:competitions)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRegistration,
  deliverablesComplete,
  requiredDeliverableKinds,
  registrationOutcome,
  DEFAULT_CONFIG,
} from '../src/lib/competitions/onboarding.js';

const cfg = (over) => ({ ...DEFAULT_CONFIG, ...over });

test('invite_only always rejects self-registration', () => {
  const r = evaluateRegistration(cfg({ admission_mode: 'invite_only' }), { teamCount: 0, orgTeamCount: 0 });
  assert.equal(r.ok, false);
});

test('open_signup within limits is allowed', () => {
  const r = evaluateRegistration(cfg({ admission_mode: 'open_signup', max_teams: 10 }), {
    teamCount: 3,
    orgTeamCount: 0,
  });
  assert.equal(r.ok, true);
});

test('rejects when competition is full', () => {
  const r = evaluateRegistration(cfg({ admission_mode: 'open_signup', max_teams: 4 }), {
    teamCount: 4,
    orgTeamCount: 0,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /full/i);
});

test('rejects when org reached its per-org team limit', () => {
  const r = evaluateRegistration(cfg({ admission_mode: 'open_signup', max_teams_per_org: 1 }), {
    teamCount: 2,
    orgTeamCount: 1,
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /team limit/i);
});

test('rejects registration before the window opens and after it closes', () => {
  const before = evaluateRegistration(
    cfg({ admission_mode: 'open_signup', registration_opens_at: '2026-06-01T00:00:00Z' }),
    { nowIso: '2026-05-01T00:00:00Z', teamCount: 0, orgTeamCount: 0 },
  );
  assert.equal(before.ok, false);
  const after = evaluateRegistration(
    cfg({ admission_mode: 'open_signup', registration_closes_at: '2026-06-01T00:00:00Z' }),
    { nowIso: '2026-07-01T00:00:00Z', teamCount: 0, orgTeamCount: 0 },
  );
  assert.equal(after.ok, false);
});

test('side_constraint enforces long_only / short_only', () => {
  assert.equal(
    evaluateRegistration(cfg({ admission_mode: 'open_signup', side_constraint: 'long_only' }), { side: 'short', orgTeamCount: 0 }).ok,
    false,
  );
  assert.equal(
    evaluateRegistration(cfg({ admission_mode: 'open_signup', side_constraint: 'short_only' }), { side: 'short', orgTeamCount: 0 }).ok,
    true,
  );
});

test('registrationOutcome respects requires_host_approval_after_signup', () => {
  assert.equal(registrationOutcome(cfg({ admission_mode: 'open_signup' })), 'registered');
  assert.equal(
    registrationOutcome(cfg({ admission_mode: 'open_signup', requires_host_approval_after_signup: true })),
    'invited',
  );
  assert.equal(registrationOutcome(cfg({ admission_mode: 'request_approval' })), 'invited');
});

test('deliverable completeness tracks required kinds', () => {
  const config = cfg({ deliverable_deck: true, deliverable_thesis: true, deliverable_model: false });
  assert.deepEqual(requiredDeliverableKinds(config), ['deck', 'thesis']);
  assert.equal(deliverablesComplete(config, [{ kind: 'deck' }]), false);
  assert.equal(deliverablesComplete(config, [{ kind: 'deck' }, { kind: 'thesis' }]), true);
  assert.equal(deliverablesComplete(cfg({ deliverable_deck: false }), []), true); // nothing required
});
