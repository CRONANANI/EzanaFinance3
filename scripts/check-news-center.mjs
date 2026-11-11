/**
 * /home News Center feed model (src/lib/home/news-center.js).
 *   node --no-warnings --test scripts/check-news-center.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterestIndex,
  scoreEcho,
  scoreNews,
  normalizeNews,
  pickCommunity,
  composeFeed,
  relativeTime,
  reasonText,
} from '../src/lib/home/news-center.js';

const NOW = Date.parse('2026-11-10T20:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString();
const hoursAgo = (n) => new Date(NOW - n * 3600000).toISOString();

const profile = {
  personalization_enabled: true,
  interests: {
    tickers: [{ value: 'NVDA', score: 90 }],
    themes: [{ value: 'AI Infrastructure', score: 70 }],
    sectors: [{ value: 'Energy', score: 40 }],
  },
};

const cards = [
  {
    id: 'old-match',
    title: 'Chips',
    tickers: ['NVDA'],
    meta: { themes: ['AI Infrastructure'] },
    publishedAt: daysAgo(60),
    heroImage: { src: '/a.jpg' },
  },
  {
    id: 'new-nomatch',
    title: 'Yen',
    tickers: [],
    meta: { themes: ['Carry Trade'] },
    publishedAt: daysAgo(1),
    heroImage: { src: '/b.jpg' },
  },
  {
    id: 'energy',
    title: 'Refining',
    tickers: [],
    meta: { sectors: ['Energy'] },
    publishedAt: daysAgo(10),
  },
];

test('interest index merges profile and fallback tickers, keeps the higher score', () => {
  const idx = buildInterestIndex(profile, new Set(['nvda', 'AAPL']));
  assert.equal(idx.tickers.get('NVDA'), 90);
  assert.equal(idx.tickers.get('AAPL'), 50);
  assert.equal(idx.terms.get('ai infrastructure').dim, 'theme');
  assert.ok(idx.size >= 4);
});

test('personalization off yields an empty index and a recency feed', () => {
  const idx = buildInterestIndex({ ...profile, personalization_enabled: false }, ['NVDA']);
  assert.equal(idx.enabled, false);
  assert.equal(idx.size, 0);
  const feed = composeFeed({ echoCards: cards, idx, now: NOW });
  assert.equal(feed.personalized, false);
  assert.equal(feed.lead.key, 'echo:new-nomatch');
  assert.equal(feed.lead.reason, null);
});

test('an interest match outranks a newer article with no match', () => {
  const idx = buildInterestIndex(profile);
  const a = scoreEcho(cards[0], idx, NOW);
  const b = scoreEcho(cards[1], idx, NOW);
  assert.ok(a.score > b.score);
  assert.deepEqual(a.reason, { kind: 'ticker', label: 'NVDA' });
  assert.equal(reasonText(a.reason), 'Because you follow NVDA');
  assert.equal(reasonText(scoreEcho(cards[2], idx, NOW).reason), 'Matches your interest in Energy');
});

test('news: both provider shapes normalise; junk rows drop', () => {
  assert.equal(normalizeNews({ headline: 'x', url: 'javascript:alert(1)' }), null);
  assert.equal(normalizeNews({ url: 'https://a.com' }), null);
  const fin = normalizeNews({
    headline: 'H',
    url: 'https://a.com/1',
    source: 'S',
    datetime: 1794340800,
  });
  assert.equal(fin.at, 1794340800000);
  const av = normalizeNews({
    title: 'T',
    url: 'https://a.com/2',
    datetime: '2026-11-10T12:00:00Z',
  });
  assert.equal(av.at, Date.parse('2026-11-10T12:00:00Z'));
});

test('news: tickers match as whole case-sensitive words only', () => {
  const idx = buildInterestIndex({
    interests: {
      tickers: [
        { value: 'ALL', score: 80 },
        { value: 'A', score: 80 },
        { value: 'BRK.B', score: 80 },
      ],
    },
  });
  const at = Date.parse(hoursAgo(2));
  assert.equal(
    scoreNews({ title: 'Markets rally as all sectors gain', at }, idx, NOW).reason,
    null,
  );
  assert.equal(scoreNews({ title: 'A quiet day for stocks', at }, idx, NOW).reason, null);
  assert.equal(scoreNews({ title: 'Allstate (ALL) beats', at }, idx, NOW).reason.label, 'ALL');
  assert.equal(
    scoreNews({ title: 'Buffett trims BRK.B stake', at }, idx, NOW).reason.label,
    'BRK.B',
  );
});

test('community: favourite creator is the most-liked followed author, never self', () => {
  const following = [
    {
      id: 'p1',
      author: { id: 'u1', name: 'Ana' },
      created_at: hoursAgo(1),
      liked_by_me: false,
      title: 'Newest',
    },
    {
      id: 'p2',
      author: { id: 'u2', name: 'Ben' },
      created_at: hoursAgo(5),
      liked_by_me: true,
      title: 'Ben new',
    },
    {
      id: 'p3',
      author: { id: 'u2', name: 'Ben' },
      created_at: hoursAgo(30),
      liked_by_me: true,
      title: 'Ben old',
    },
    {
      id: 'p4',
      author: { id: 'me', name: 'Me' },
      created_at: hoursAgo(0.5),
      liked_by_me: true,
      title: 'Mine',
    },
  ];
  const trending = [
    { id: 'p2', author: { id: 'u2' }, title: 'Ben new' },
    { id: 'p9', author: { id: 'u9', name: 'Zed' }, title: 'Hot' },
  ];
  const { creatorPost, trendingPost, creatorLikes } = pickCommunity(following, trending, 'me');
  assert.equal(creatorPost.id, 'p2');
  assert.equal(creatorLikes, 2);
  assert.equal(trendingPost.id, 'p9');
  const none = pickCommunity([following[0]], [], 'me');
  assert.equal(none.creatorPost.id, 'p1');
  assert.equal(none.creatorLikes, 0);
});

test('composeFeed: lead is the best Echo story, feed mixes kinds, no duplicates', () => {
  const idx = buildInterestIndex(profile);
  const newsRows = [
    {
      headline: 'NVDA guides higher',
      url: 'https://n.com/1',
      source: 'Wire',
      datetime: hoursAgo(3),
    },
    {
      headline: 'NVDA guides higher',
      url: 'https://n.com/1-dup',
      source: 'Other',
      datetime: hoursAgo(3),
    },
    { headline: 'Stale story', url: 'https://n.com/old', datetime: daysAgo(30) },
    { headline: 'Oil slips', url: 'https://n.com/2', datetime: hoursAgo(1) },
  ];
  const following = [
    { id: 'p1', author: { id: 'u1', name: 'Ana' }, created_at: hoursAgo(1), title: 'Thesis' },
  ];
  const trending = [
    { id: 'p9', author: { id: 'u9', name: 'Zed' }, excerpt: 'Hot take', created_at: hoursAgo(2) },
  ];
  const feed = composeFeed({ echoCards: cards, newsRows, following, trending, idx, now: NOW });
  assert.equal(feed.lead.key, 'echo:old-match');
  assert.equal(feed.news.length, 2);
  assert.equal(feed.news[0].title, 'NVDA guides higher');
  assert.deepEqual(feed.forYou.map((i) => i.kind).slice(0, 3), ['news', 'echo', 'creator']);
  assert.ok(!feed.forYou.some((i) => i.key === feed.lead.key));
  assert.equal(new Set(feed.forYou.map((i) => i.key)).size, feed.forYou.length);
  assert.equal(feed.community.length, 2);
  assert.equal(feed.community[1].title, 'Hot take');
  assert.equal(feed.personalized, true);
});

test('composeFeed survives empty inputs', () => {
  const feed = composeFeed({});
  assert.equal(feed.lead, null);
  assert.deepEqual(feed.forYou, []);
});

test('relativeTime', () => {
  assert.equal(relativeTime(hoursAgo(0.2), NOW), '12m');
  assert.equal(relativeTime(hoursAgo(5), NOW), '5h');
  assert.equal(relativeTime(daysAgo(3), NOW), '3d');
  assert.equal(relativeTime('2026-10-02T00:00:00Z', NOW), 'Oct 02');
  assert.equal(relativeTime(null, NOW), '');
});
