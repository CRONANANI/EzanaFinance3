/**
 * Community page redesign (Nov 2026): the pure helpers in
 * src/lib/community/redesign.js and the wiring rules from the handoff
 * (user-session reads, title + topic on new posts, tokens only, no em dashes).
 *   node --no-warnings --test scripts/check-community-redesign.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LEADERBOARD_PERIOD,
  normalizeTab,
  normalizeTopic,
  stripMarkdown,
  excerpt,
  validateTitle,
  groupNumber,
  compactNumber,
  signedPct,
  relativeTime,
  initials,
} from '../src/lib/community/redesign.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ROUTES = [
  'feed',
  'stats',
  'insights',
  'discussions',
  'leaderboard/top',
  'people',
  'topics',
  'search/all',
  'thread',
  'me',
];
const COMPONENTS = [
  'CommunityPage',
  'CommunityHeader',
  'CommunitySidebar',
  'CommunityStats',
  'CommunityFeed',
  'FeedPostCard',
  'DiscussionThread',
  'CommunityInsights',
  'ActiveDiscussions',
  'CommunityLeaderboard',
  'PeopleToFollow',
];

test('numbers read like the spec', () => {
  assert.equal(groupNumber(48392), '48,392');
  assert.equal(compactNumber(8400), '8.4K');
  assert.equal(compactNumber(12000), '12K');
  assert.equal(compactNumber(2_500_000), '2.5M');
  assert.equal(signedPct(3.4), '+3.40%');
  assert.equal(signedPct(-1.1), '-1.10%');
  assert.equal(signedPct(0), '0.00%');
  assert.equal(signedPct(null), null);
});

test('relative times', () => {
  const now = Date.parse('2026-11-09T15:00:00Z');
  const ago = (ms) => new Date(now - ms).toISOString();
  assert.equal(relativeTime(ago(30e3), now), 'Now');
  assert.equal(relativeTime(ago(6 * 3600e3), now), '6h ago');
  assert.equal(relativeTime(ago(30 * 3600e3), now), 'Yesterday');
  assert.equal(relativeTime(ago(3 * 86400e3), now), '3d ago');
  assert.equal(relativeTime('nope', now), '');
});

test('tabs, topics and titles are validated', () => {
  assert.equal(normalizeTab('Trending'), 'trending');
  assert.equal(normalizeTab('saved'), null);
  assert.equal(normalizeTopic('macro-policy'), 'macro-policy');
  assert.equal(normalizeTopic('all'), null);
  assert.equal(normalizeTopic("x'; drop"), null);
  assert.equal(validateTitle('  ok ').ok, false);
  assert.equal(validateTitle('A fine title').value, 'A fine title');
  assert.equal(validateTitle('x'.repeat(161)).ok, false);
  assert.equal(LEADERBOARD_PERIOD, 'yearly');
});

test('excerpts drop markdown and the repeated title', () => {
  assert.equal(stripMarkdown('**Bold** and [a link](https://x.y) `code`'), 'Bold and a link code');
  assert.equal(excerpt('Title line\nThe body text.', 'Title line'), 'The body text.');
  assert.ok(excerpt('word '.repeat(200), '', 60).endsWith('…'));
  assert.equal(initials('Mira Chen'), 'MC');
});

test('every community route reads as the signed-in user, never the service role', () => {
  for (const r of ROUTES) {
    const src = read(`src/app/api/community/${r}/route.js`);
    assert.match(src, /withSession\(/, `${r} uses the user session`);
    assert.doesNotMatch(
      src,
      /getAdminClient|getLazyAdminClient|SERVICE_ROLE/,
      `${r} has no service role`,
    );
  }
  assert.match(read('src/app/api/community/feed/route.js'), /rpc\('community_feed'/);
  assert.match(read('src/app/api/community/stats/route.js'), /rpc\('community_page_stats'/);
  assert.match(read('src/app/api/community/insights/route.js'), /FmpAPI\.getBatchQuote/);
});

test('new top-level posts need a title and a topic (server side)', () => {
  const src = read('src/app/api/community/posts/route.js');
  assert.match(src, /validateTitle\(/);
  assert.match(src, /Choose a topic for your post\./);
  assert.match(read('src/components/community/redesign_v2/EvoComposer.jsx'), /topic_slug: topic/);
  assert.match(read('src/app/(dashboard)/partner-community/page.js'), /topic_slug: newTopic/);
});

test('page: tokens only, no em dashes, no emoji, Bootstrap Icons', () => {
  const css = read('src/app/(dashboard)/community/community.module.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no raw colours');
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const c of COMPONENTS) {
    const src = read(`src/components/community/${c}.jsx`);
    assert.ok(!src.includes('—'), `${c}: no em dash`);
    assert.doesNotMatch(src, /lucide-react/, `${c}: Bootstrap Icons`);
    assert.doesNotMatch(src, /[\u{1F300}-\u{1FAFF}]/u, `${c}: no emoji`);
  }
  const page = read('src/app/(dashboard)/community/page.js');
  assert.match(page, /CommunityPage/);
  assert.match(read('src/components/community/CommunityPage.jsx'), /className="ez-canvas"/);
});
