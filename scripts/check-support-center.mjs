/**
 * Unit tests for the support centre model (pure functions, no React).
 * No test runner is configured; run directly:  node scripts/check-support-center.mjs
 * (also `npm run test:support`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCES,
  categoriesFor,
  startHere,
  matchesFor,
  matchesByCategory,
  relatedArticles,
  keepReading,
  stillTrending,
  recentlyUpdated,
  relativeDate,
  readMinutes,
  articleMeta,
  trendingFallback,
} from '../src/lib/help-center/support-model.js';

test('categoriesFor: canonical order, counts, Bootstrap icons, urls', () => {
  const cats = categoriesFor('user');
  assert.equal(cats.length, 12);
  assert.equal(cats[0].title, 'Getting Started');
  assert.ok(cats.every((c) => c.icon.startsWith('bi-')));
  assert.ok(cats.every((c) => c.count > 0));
  assert.equal(cats[0].url, '/help-center/user/category/getting-started');
  assert.equal(categoriesFor('partner')[0].url, '/help-center/partner/category/onboarding');
});

test('startHere: three configured categories per audience, all real', () => {
  for (const aud of Object.keys(AUDIENCES)) {
    const s = startHere(aud);
    assert.equal(s.length, 3, aud);
    assert.deepEqual(
      s.map((c) => c.id),
      AUDIENCES[aud].startHere,
    );
  }
});

test('matchesFor: brokerage question matches several categories; short query is empty', () => {
  const m = matchesFor('how do I connect my brokerage account', 'user');
  assert.ok(m.length >= 3);
  assert.ok(m.every((x) => x.slug && x.category && typeof x.score === 'number'));
  const counts = matchesByCategory(m);
  assert.ok(Object.keys(counts).length >= 2);
  assert.deepEqual(matchesFor('hi', 'user'), []);
});

test('matchesByCategory: counts distinct slugs only', () => {
  const counts = matchesByCategory([
    { slug: 'a', category: 'X', score: 1 },
    { slug: 'a', category: 'X', score: 1 },
    { slug: 'b', category: 'X', score: 1 },
    { slug: 'c', category: null, score: 1 },
  ]);
  assert.deepEqual(counts, { X: 2 });
});

test('relatedArticles: sources first, then matches by score, deduped, with read times', () => {
  const sources = [{ slug: 'connecting-your-brokerage', title: 'S' }];
  const matches = [
    { slug: 'connecting-your-brokerage', category: 'Getting Started', score: 9 },
    { slug: 'first-steps', category: 'Getting Started', score: 2 },
    { slug: 'creating-your-account', category: 'Getting Started', score: 5 },
  ];
  const r = relatedArticles(sources, matches, 'user');
  assert.deepEqual(
    r.map((x) => x.slug),
    ['connecting-your-brokerage', 'creating-your-account', 'first-steps'],
  );
  assert.equal(r[0].isSource, true);
  assert.ok(r[0].readMinutes >= 1);
  assert.equal(r[0].title, 'Connecting Your External Brokerage Account', 'resolved from content');
});

test('keepReading: excludes sources, keeps full count, top categories first', () => {
  const sources = [{ slug: 'connecting-your-brokerage' }];
  const matches = [
    { slug: 'connecting-your-brokerage', category: 'Getting Started', score: 9 },
    { slug: 'first-steps', category: 'Getting Started', score: 2 },
    { slug: 'creating-your-account', category: 'Getting Started', score: 5 },
    { slug: 'two-factor-authentication', category: 'Account & Security', score: 4 },
  ];
  const k = keepReading(sources, matches, 'user');
  assert.equal(k[0].title, 'Getting Started');
  assert.equal(k[0].count, 3, 'header count includes the source');
  assert.deepEqual(
    k[0].articles.map((a) => a.slug),
    ['creating-your-account', 'first-steps'],
  );
  /* A category whose only match is a source is dropped. */
  const only = keepReading(sources, matches.slice(0, 1), 'user');
  assert.deepEqual(only, []);
});

test('stillTrending: removes anything already shown', () => {
  const trending = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }];
  assert.deepEqual(
    stillTrending(trending, [{ slug: 'b' }], 3).map((t) => t.slug),
    ['a', 'c', 'd'],
  );
});

test('recentlyUpdated: empty when content has no dates; never invents one', () => {
  assert.deepEqual(recentlyUpdated('user'), []);
  assert.deepEqual(recentlyUpdated('partner'), []);
});

test('relativeDate', () => {
  const now = new Date('2026-09-30T12:00:00Z');
  assert.equal(relativeDate('2026-09-30', now), 'today');
  assert.equal(relativeDate('2026-09-28', now), '2 days ago');
  assert.equal(relativeDate('2026-06-01', now), '2026-06-01');
  assert.equal(relativeDate(null, now), null);
});

test('readMinutes and articleMeta', () => {
  assert.equal(readMinutes(''), 1);
  assert.equal(readMinutes('<p>' + 'word '.repeat(600) + '</p>'), 3);
  const a = articleMeta('user', 'creating-your-account');
  assert.equal(a.category, 'Getting Started');
  assert.equal(a.url, '/help-center/user/article/creating-your-account');
  assert.equal(articleMeta('user', 'nope'), null);
});

test('trendingFallback: six real articles', () => {
  const t = trendingFallback('user');
  assert.equal(t.length, 6);
  assert.ok(t.every((x) => x.title && x.url));
});
