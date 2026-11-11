/**
 * Auth listeners must not hand a promise back to Supabase (Nov 2026).
 *
 * The browser client runs with a custom auth lock. A token refresh notifies
 * every onAuthStateChange listener while that lock is held and waits for each
 * callback. A callback that returns (or awaits) work calling supabase.auth.*
 * waits for the same lock: the lock never releases, and every later
 * getUser() / getSession() in the tab hangs. That is what left /settings on
 * "Loading settings…" forever.
 *
 * Rule: the callback is a plain (non-async) function with a block body, and
 * anything that touches supabase.auth.* is deferred with setTimeout(..., 0).
 *
 *   node --no-warnings --test scripts/check-auth-listeners.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = new URL('../src/', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const listeners = [];
for (const file of walk(SRC)) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\.onAuthStateChange\(\s*([^]{0,80})/g)) {
    listeners.push({ file: path.relative(SRC, file), head: m[1] });
  }
}

test('there are auth listeners to check', () => {
  assert.ok(listeners.length > 0);
});

test('no auth listener is async or returns its work to Supabase', () => {
  for (const { file, head } of listeners) {
    assert.doesNotMatch(head, /^async\b/, `${file}: listener must not be async`);
    // "(args) => expr" hands expr (often a promise) back; require "(args) => {".
    assert.match(head, /^\(?[\w\s,]*\)?\s*=>\s*\{/, `${file}: listener needs a block body`);
  }
});

test('the beginner-level listener defers its refresh', () => {
  const src = fs.readFileSync(path.join(SRC, 'hooks/useBeginnerLevel.js'), 'utf8');
  assert.match(src, /onAuthStateChange\(\(\) => \{[^]*?setTimeout\(\(\) => refresh\(\), 0\);/);
});
