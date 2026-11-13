/**
 * Unit tests for where a notification opens and the text it shows (pure).
 * Run: node --no-warnings --test scripts/check-notification-destination.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  notificationDestination as dest,
  notificationSummary as summary,
} from '../src/lib/notifications/destination.js';

test('an embedded app link wins', () => {
  const n = {
    type: 'market_news',
    content: '\u{1F4C9} How low will Nvidia go? ($NVDA)\n↳ /company-research?q=NVDA',
  };
  assert.equal(dest(n).href, '/company-research?q=NVDA');
  assert.equal(
    dest({ type: 'market_news', content: 'x\n↳ /market-analysis' }).href,
    '/market-analysis',
  );
});

test('unsafe or unknown embedded links are ignored', () => {
  for (const bad of [
    '//evil.example',
    'https://evil.example',
    '/api/account/delete',
    'javascript:1',
    '/inside-the-capitol',
  ]) {
    const n = { type: 'community', content: `hello\n↳ ${bad}` };
    assert.equal(dest(n).href, '/community', bad);
  }
});

test('friend requests open the community', () => {
  assert.equal(dest({ type: 'community', friendRequestId: 7 }).href, '/community');
});

test('one ticker opens its research page; none or several open the list page', () => {
  assert.equal(dest({ type: 'watchlist', tickers: ['aapl'] }).href, '/company-research?q=AAPL');
  assert.equal(dest({ type: 'watchlist', tickers: [] }).href, '/watchlist');
  assert.equal(dest({ type: 'watchlist', tickers: ['AAPL', 'MSFT'] }).href, '/watchlist');
  assert.equal(
    dest({ type: 'portfolio_alerts', tickers: ['BRK.B'] }).href,
    '/company-research?q=BRK.B',
  );
  assert.equal(dest({ type: 'portfolio_alerts' }).href, '/home-dashboard');
  assert.equal(dest({ type: 'market_news' }).href, '/market-analysis');
  assert.equal(dest({ type: 'inside-the-capitol' }).href, '/market-analysis');
  assert.equal(dest({ type: 'watchlist', tickers: ['<script>'] }).href, '/watchlist');
});

test('every type resolves to a page', () => {
  assert.equal(dest({ type: 'learning' }).href, '/learning-center');
  assert.equal(dest({ type: 'general' }).href, '/settings?tab=notifications');
  assert.equal(dest(null).href, '/settings?tab=notifications');
  for (const type of [
    'market_news',
    'inside-the-capitol',
    'portfolio_alerts',
    'watchlist',
    'community',
    'learning',
    'x',
  ]) {
    const d = dest({ type });
    assert.ok(d.href.startsWith('/') && !d.href.startsWith('//') && d.label, type);
  }
});

test('summary drops the link line and marker emoji', () => {
  assert.equal(
    summary('\u{1F4C9} How low will Nvidia go? ($NVDA)\n↳ /company-research?q=NVDA'),
    'How low will Nvidia go? ($NVDA)',
  );
  assert.equal(
    summary('On your watchlist: Tech. Currently $182.10.'),
    'On your watchlist: Tech. Currently $182.10.',
  );
  assert.equal(summary(null), '');
});
