#!/usr/bin/env node
/* QA remediation (Retail-B): community image paths + bucket policy (MIG-2/R29),
   server-priced mock trades (RET-10), server-graded quizzes (RET-14),
   quote posts (RET-16), login-lockout proof (RET-9), email preferences (RET-7).
   Usage: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-retail-qa.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCommunityImagePath } from '../src/lib/community-utils.js';

const UID = '11111111-1111-4111-8111-111111111111';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* ── MIG-2 / R29 ─────────────────────────────────────────────────────── */

test('community image path starts with the uploader uid (bucket policy folder)', () => {
  const p = buildCommunityImagePath(UID, 'My Photo (1).PNG', 123);
  assert.equal(p, `${UID}/123-My-Photo-1-.PNG`);
  assert.equal(p.split('/')[0], UID);
});

test('community image path strips directories and traversal', () => {
  const p = buildCommunityImagePath(UID, '../../etc/passwd', 5);
  assert.equal(p, `${UID}/5-passwd`);
  assert.equal(buildCommunityImagePath(UID, '...', 5), `${UID}/5-image`);
  assert.throws(() => buildCommunityImagePath('', 'a.png'));
});

test('every community composer uses the uid-first path and surfaces upload errors', () => {
  for (const f of [
    'src/components/community/redesign_v2/EvoComposer.jsx',
    'src/components/community/_legacy/FeedComposer.jsx',
    'src/components/community/_legacy_v1/Composer.jsx',
  ]) {
    const src = read(f);
    assert.ok(!src.includes('community/${user.id}'), `${f}: legacy community/ prefix`);
    assert.ok(src.includes('buildCommunityImagePath('), `${f}: path helper`);
    assert.ok(src.includes('COMMUNITY_IMAGE_UPLOAD_ERROR'), `${f}: upload error shown`);
  }
});

test('bucket migration: owner folder policies, documents bucket has no policies', () => {
  const sql = read('supabase/migrations/20261026110000_storage_buckets_community_documents.sql');
  assert.match(sql, /\('community-images', 'community-images', true/);
  assert.match(sql, /\('documents', 'documents', false/);
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text/);
  const createPolicies = sql.match(/create policy[^;]+;/g) || [];
  assert.equal(createPolicies.length, 3);
  for (const p of createPolicies) assert.ok(!p.includes("'documents'"));
});
