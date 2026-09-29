#!/usr/bin/env node
/* Help Center search: the lexical index (src/lib/help-center-search.js) must
   surface the right article for the phrasings people actually type, including
   partial words while typing. Pure; no server. npm run test:help-search */
import test from 'node:test';
import assert from 'node:assert/strict';
import { searchHelp, stem, tokenize } from '../src/lib/help-center-search.js';

const top = (q, opts = {}) => searchHelp(q, { audience: 'user', limit: 3, ...opts })[0]?.slug;

test('brokerage phrasings find connecting-your-brokerage first', () => {
  for (const q of [
    'connect brokerage',
    'connecting',
    'connect',
    'link my broker',
    'alpaca',
    'how do I connect my brokerage',
    'sync holdings',
  ]) {
    assert.equal(top(q), 'connecting-your-brokerage', q);
  }
});

test('snaptrade surfaces the brokerage articles', () => {
  const slugs = searchHelp('snaptrade', { audience: 'user', limit: 3 }).map((r) => r.slug);
  assert.ok(slugs.includes('connecting-your-brokerage'));
});

test('a partial last word matches while typing', () => {
  assert.equal(top('conn'), 'connecting-your-brokerage');
  const typed = searchHelp('connecting your bro', { audience: 'user', limit: 5 }).map(
    (r) => r.slug,
  );
  assert.ok(typed.includes('connecting-your-brokerage'));
});

test('stemming is symmetric and stopwords drop', () => {
  assert.equal(stem('connecting'), stem('connection'));
  assert.equal(stem('brokerage'), stem('brokers'));
  assert.deepEqual(tokenize('How do I connect my broker?'), [stem('connect'), stem('broker')]);
});

test('audience scoping and empty queries', () => {
  assert.ok(searchHelp('payouts', { audience: 'partner' }).every((r) => r.audience === 'partner'));
  assert.deepEqual(searchHelp('   '), []);
  assert.deepEqual(searchHelp('the and of'), []);
});
