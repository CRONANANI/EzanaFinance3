#!/usr/bin/env node
/* Org permission sub-role defaulting + validation, and the 10-tier CHECK.
   Exercises the pure helpers in org-permissions-config.js; no network, no DB.
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-org-subrole.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMemberPermissions, normalizeSubRole } from '../src/lib/org-permissions-config.js';
import { ORG_TIERS } from '../src/lib/org-hierarchy.js';

// ── Default sub-role so no PM / analyst is ever left permissionless ──────────
test('a null-sub_role analyst resolves the Analyst permission set', () => {
  const perms = getMemberPermissions({ role: 'analyst', sub_role: null, tier: 'analyst' });
  assert.ok(perms.includes('send_to_team'));
  assert.ok(perms.includes('upload_deliverables'));
});

test('a null-sub_role senior PM resolves the Senior PM permission set', () => {
  const perms = getMemberPermissions({
    role: 'portfolio_manager',
    sub_role: null,
    tier: 'senior_portfolio_manager',
  });
  assert.ok(perms.includes('create_events')); // Senior PM only
});

test('a wrong-role sub_role typo falls back to the role default and is non-empty', () => {
  const perms = getMemberPermissions({ role: 'analyst', sub_role: 'Portfolio Manager' });
  assert.ok(perms.length > 0);
});

// ── normalizeSubRole ─────────────────────────────────────────────────────────
test('normalizeSubRole canonicalises case for a known analyst sub-role', () => {
  assert.deepEqual(normalizeSubRole('analyst', 'senior analyst'), {
    ok: true,
    value: 'Senior Analyst',
  });
});

test('normalizeSubRole rejects a sub-role from the wrong role', () => {
  assert.equal(normalizeSubRole('analyst', 'Senior PM').ok, false);
});

test('normalizeSubRole keeps a free-text executive title', () => {
  assert.deepEqual(normalizeSubRole('executive', 'Faculty Advisor'), {
    ok: true,
    value: 'Faculty Advisor',
  });
});

test('normalizeSubRole empty value uses the tier default', () => {
  assert.deepEqual(normalizeSubRole('portfolio_manager', '', 'junior_portfolio_manager'), {
    ok: true,
    value: 'Junior PM',
  });
});

// ── The migration CHECK must list exactly the ORG_TIERS ids ──────────────────
test('every ORG_TIERS id is in the org_members_tier_check migration', () => {
  const sql = readFileSync(
    new URL(
      '../supabase/migrations/20261027120000_org_members_tier_check_ten_tiers.sql',
      import.meta.url,
    ),
    'utf8',
  );
  const checkIds = new Set((sql.match(/'([a-z_]+)'/g) || []).map((s) => s.slice(1, -1)));
  for (const t of ORG_TIERS) {
    assert.ok(checkIds.has(t.id), `tier ${t.id} missing from CHECK`);
  }
});
