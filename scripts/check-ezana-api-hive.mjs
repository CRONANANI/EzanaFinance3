/**
 * Ezana API, hive dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-hive.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');

test('hive: every route in this dimension is live and typed', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'hive')) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});
