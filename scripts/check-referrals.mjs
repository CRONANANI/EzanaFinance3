#!/usr/bin/env node
/* Referral rules (src/lib/referrals.js): code alphabet and length, the
   self-referral and same-person guards, Gmail normalization, the sign-up-only
   window. Pure; npm run test:referrals (part of npm test). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REFERRAL_ALPHABET,
  isValidCodeFormat,
  codeFormatProblem,
  normalizeCode,
  emailIdentity,
  isSamePerson,
  applyProblem,
  maskEmail,
  APPLY_WINDOW_MS,
} from '../src/lib/referrals.js';

test('alphabet is 32 unambiguous characters', () => {
  assert.equal(REFERRAL_ALPHABET.length, 32);
  for (const bad of ['0', 'O', '1', 'I']) assert.ok(!REFERRAL_ALPHABET.includes(bad), bad);
  assert.equal(new Set(REFERRAL_ALPHABET).size, 32);
});

test('code format: 8 chars from the alphabet, normalized', () => {
  assert.ok(isValidCodeFormat('ABCD2345'));
  assert.ok(isValidCodeFormat(' abcd-2345 '));
  assert.equal(normalizeCode('ab cd-23'), 'ABCD23');
  assert.ok(!isValidCodeFormat('ABCD234'));
  assert.ok(!isValidCodeFormat('ABCD23450'));
  assert.ok(!isValidCodeFormat('ABCD2O45'));
  assert.ok(!isValidCodeFormat('ABCD2I45'));
  assert.match(codeFormatProblem('ABCD0123'), /0, O, 1 or I/);
  assert.match(codeFormatProblem('ABC'), /8 characters/);
  assert.equal(codeFormatProblem('ABCD2345'), null);
});

test('gmail normalization strips dots and +tags', () => {
  assert.equal(emailIdentity('J.Doe+ezana@Gmail.com'), 'jdoe@gmail.com');
  assert.equal(emailIdentity('jdoe@googlemail.com'), 'jdoe@gmail.com');
  assert.equal(emailIdentity('j.doe+x@example.com'), 'j.doe@example.com');
  assert.ok(isSamePerson('john.smith@gmail.com', 'johnsmith+alt@gmail.com'));
  assert.ok(!isSamePerson('john.smith@example.com', 'johnsmith@example.com'));
});

test('apply guards: self, same person, sign-up window', () => {
  const now = Date.parse('2026-09-29T12:00:00Z');
  const fresh = new Date(now - 5 * 60 * 1000).toISOString();
  const base = {
    referrerId: 'a',
    refereeId: 'b',
    referrerEmail: 'alice@example.com',
    refereeEmail: 'bob@example.com',
    refereeCreatedAt: fresh,
    now,
  };
  assert.equal(applyProblem(base), null);
  assert.equal(applyProblem({ ...base, refereeId: 'a' }), 'self');
  assert.equal(
    applyProblem({ ...base, referrerEmail: 'al.ice@gmail.com', refereeEmail: 'alice+2@gmail.com' }),
    'same_person',
  );
  assert.equal(
    applyProblem({ ...base, refereeCreatedAt: new Date(now - APPLY_WINDOW_MS - 1).toISOString() }),
    'too_late',
  );
  assert.equal(applyProblem({ ...base, referrerId: null }), 'invalid');
});

test('masked email keeps first letter and domain', () => {
  assert.equal(maskEmail('jane@gmail.com'), 'j***@gmail.com');
  assert.equal(maskEmail('nope'), '***');
});
