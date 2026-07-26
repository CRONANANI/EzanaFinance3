/**
 * Unit tests for the Phase 7 consent gates — the load-bearing privacy logic.
 * Run: node scripts/check-recruiting-consent.mjs  (npm run test:recruiting)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { consentAllowsJudges, consentAllowsFirms } from '../src/lib/competitions/recruiting.js';

test('default / missing opt-in exposes nobody', () => {
  assert.equal(consentAllowsJudges(null), false);
  assert.equal(consentAllowsFirms(null), false);
  assert.equal(consentAllowsJudges({ consented: false, consent_scope: 'none' }), false);
  assert.equal(consentAllowsFirms({ consented: false, consent_scope: 'none' }), false);
});

test('scope none never exposes, even if consented flag is somehow true', () => {
  const o = { consented: true, consent_scope: 'none', revoked_at: null };
  assert.equal(consentAllowsJudges(o), false);
  assert.equal(consentAllowsFirms(o), false);
});

test('judges_only exposes to judges but NOT to firms', () => {
  const o = { consented: true, consent_scope: 'judges_only', revoked_at: null };
  assert.equal(consentAllowsJudges(o), true);
  assert.equal(consentAllowsFirms(o), false);
});

test('sponsoring_firms exposes to both judges and firms', () => {
  const o = { consented: true, consent_scope: 'sponsoring_firms', revoked_at: null };
  assert.equal(consentAllowsJudges(o), true);
  assert.equal(consentAllowsFirms(o), true);
});

test('a revocation removes exposure immediately, regardless of scope', () => {
  const o = { consented: true, consent_scope: 'sponsoring_firms', revoked_at: '2026-06-01T00:00:00Z' };
  assert.equal(consentAllowsJudges(o), false);
  assert.equal(consentAllowsFirms(o), false);
});
