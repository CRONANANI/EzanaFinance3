#!/usr/bin/env node
/* EzanaQL LIKE (security assessment F-10): the regex-free matcher agrees with
   SQL LIKE semantics, refuses patterns over the caps, and stays fast on the
   inputs that made the old RegExp backtrack. Usage: npm run test:ezanaql-like */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./ezanaql-node-loader.mjs', import.meta.url);

const { likeMatch, likePatternProblem } = await import('../src/lib/ezanaql/like.js');
const { parse } = await import('../src/lib/ezanaql/parser.js');

function reference(text, pat) {
  const re = new RegExp(
    '^' +
      pat
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.') +
      '$',
    's',
  );
  return re.test(text);
}

test('fixed cases', () => {
  const cases = [
    ['apple', 'apple', true],
    ['apple', 'app', false],
    ['apple', 'app%', true],
    ['apple', '%ple', true],
    ['apple', '%pp%', true],
    ['apple', 'a_ple', true],
    ['apple', '_____', true],
    ['apple', '______', false],
    ['apple', '%', true],
    ['', '%', true],
    ['', '', true],
    ['', '_', false],
    ['aaa', 'a%a%a', true],
    ['aa', 'a%a%a', false],
    ['abcabc', '%bc%bc', true],
    ['a.b', 'a.b', true],
    ['axb', 'a.b', false],
    ['abab', 'ab%%ab', true],
    ['lockheed martin', '%martin', true],
  ];
  for (const [t, p, want] of cases) {
    assert.equal(likeMatch(t, p), want, `${JSON.stringify(t)} LIKE ${JSON.stringify(p)}`);
  }
});

test('agrees with the regex reference on random inputs', () => {
  const alpha = 'ab_%';
  let seed = 7;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  for (let i = 0; i < 20000; i += 1) {
    const t = Array.from({ length: rnd(9) }, () => 'ab'[rnd(2)]).join('');
    let p = Array.from({ length: rnd(7) }, () => alpha[rnd(4)]).join('');
    if (likePatternProblem(p)) continue;
    assert.equal(likeMatch(t, p), reference(t, p), `${t} LIKE ${p}`);
  }
});

test('caps: long patterns and too many % are refused', () => {
  assert.match(likePatternProblem('a'.repeat(101)), /100 characters/);
  assert.match(likePatternProblem('%a%b%c%d%e'), /at most 4/);
  assert.equal(likePatternProblem('%%%%%%a%'), null, 'repeated % collapse');
  assert.equal(likeMatch('abcde', '%a%b%c%d%e'), false, 'over the cap never matches');
  assert.throws(() => parse(`FROM gov.contracts WHERE recipient LIKE "%a%b%c%d%e%"`), /at most 4/);
});

test('pathological inputs finish in under 50 ms', () => {
  const text = 'a'.repeat(100_000);
  const pats = ['%a%a%a%b', '%a_a_a_a_a_a_a_a_b', '%' + 'a'.repeat(95) + 'b%', '%%%%%%%%a%a%a%b'];
  for (const p of pats) {
    const t0 = performance.now();
    assert.equal(likeMatch(text, p), false);
    const ms = performance.now() - t0;
    assert.ok(ms < 50, `${p.slice(0, 20)} took ${ms.toFixed(1)} ms`);
  }
});
