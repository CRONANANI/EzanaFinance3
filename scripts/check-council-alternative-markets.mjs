/**
 * Council cards of Alternative Markets (/alternative-markets).
 *   npm run test:council-alternative-markets
 *
 * The model's honesty rules (descriptive policy check, topic matching, no
 * invented figures), the sample council, the routes' access rules, the
 * page's gating (retail page unchanged apart from honest labels, council
 * cards only for council members once membership is known) and the retail
 * honesty fixes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LINKS,
  POLICY_NOTE,
  altPitches,
  altResearch,
  bandOrder,
  cleanTicker,
  coverageRows,
  learningLinks,
  nextMeetings,
  policyLine,
  policyLookup,
  standingRows,
} from '../src/lib/org-alternative-markets-model.js';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';
import { buildAlternativeMarketsSample } from '../src/lib/org-alternative-markets-sample.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'executive', displayName: 'Viewer' };
const NOW = Date.UTC(2026, 10, 16, 15);
const fundRaw = buildCompanyResearchSample({ ...viewer, now: NOW });
const extras = buildAlternativeMarketsSample({ ...viewer, now: NOW });

test('policy check is descriptive and reads the stored list', () => {
  const mo = policyLookup(fundRaw, 'mo');
  assert.equal(mo.ticker, 'MO');
  assert.equal(mo.prohibited, true);
  assert.equal(policyLine(mo).text, 'MO: On the prohibited list.');
  const btc = policyLookup(fundRaw, 'BTC');
  assert.equal(btc.prohibited, false);
  assert.equal(policyLine(btc).text, 'BTC: Not on the prohibited list.');
  assert.ok(btc.readings.length > 0, 'every active stored rule is read');
  assert.match(POLICY_NOTE, /No asset class rule set/);
  for (const w of ['approved', 'allowed', 'recommend', 'eligible']) {
    assert.ok(!policyLine(btc).text.toLowerCase().includes(w));
    assert.ok(!POLICY_NOTE.toLowerCase().replace('not a recommendation', '').includes(w));
  }
  assert.equal(policyLine(policyLookup(fundRaw, '')), null);
  const none = policyLookup({ positions: [], rules: [] }, 'BTC');
  assert.equal(none.hasRules, false);
});

test('ticker input is cleaned', () => {
  assert.equal(cleanTicker(' btc usd!'), 'BTCUSD');
  assert.equal(cleanTicker('a'.repeat(20)).length, 12);
});

test('research and pitches are matched to the mode, primers first', () => {
  const opts = { members: extras.members, viewer: extras.viewer };
  const crypto = altResearch(extras.notes, { mode: 'crypto', rowTickers: ['BTC'], ...opts });
  assert.ok(crypto.length > 0);
  assert.equal(crypto[0].kind, 'Primer');
  assert.ok(
    crypto.every((r) => !/JPM|NVDA|LLY/.test(r.title)),
    'equity notes stay out',
  );
  const comm = altResearch(extras.notes, { mode: 'commodities', rowTickers: ['GOLD'], ...opts });
  assert.ok(comm.some((r) => r.title === 'Gold miners against bullion'));
  assert.ok(comm.every((r) => r.author !== 'Former member'));

  const cp = altPitches(extras.pitches, { mode: 'crypto' });
  assert.deepEqual(
    cp.map((p) => p.ticker),
    ['IBIT', 'COIN'],
  );
  const mp = altPitches(extras.pitches, { mode: 'commodities' });
  assert.ok(mp.every((p) => ['GDX', 'DBC'].includes(p.ticker)));
  assert.ok(mp.every((p) => p.stage && p.lead));
  const live = altPitches([{ id: 'x', ticker: 'GLD', stage: 'exited', created_at: '2026-01-01' }], {
    mode: 'commodities',
  });
  assert.equal(live.length, 0, 'closed pitches stay out');
});

test('drafts reach only their author or a manager', () => {
  const notes = [
    { id: 'd', title: 'Gold draft', status: 'draft', author_id: 'other', created_at: '2026-01-01' },
  ];
  assert.equal(
    altResearch(notes, { mode: 'commodities', viewer: { role: 'analyst', userId: 'me' } }).length,
    0,
  );
  assert.equal(
    altResearch(notes, { mode: 'commodities', viewer: { role: 'executive', userId: 'me' } }).length,
    1,
  );
});

test('learning links are real courses', () => {
  for (const mode of ['crypto', 'commodities']) {
    const rows = learningLinks(mode);
    assert.equal(rows.length, 3);
    assert.ok(rows.every((c) => c.href.startsWith('/learning-center/course/')));
  }
});

test('coverage, meetings and standing come from the records', () => {
  const cov = coverageRows(fundRaw);
  assert.equal(cov.length, 4);
  const m = nextMeetings(extras.meetings, NOW);
  assert.ok(m.length > 0 && m.length <= 3);
  assert.ok(m.every((x) => new Date(x.at).getTime() >= NOW));
  const st = standingRows(extras.standing.rows, extras.standing.myOrgId);
  assert.equal(st.status, 'ready');
  for (const r of st.rows) {
    assert.deepEqual(Object.keys(r).sort(), ['mine', 'name', 'orgId', 'rank', 'rating', 'tier']);
  }
});

test('role order and links', () => {
  assert.equal(bandOrder('analyst')[0], 'research');
  assert.equal(bandOrder('portfolio_manager')[0], 'policy');
  assert.equal(LINKS.newPitch('btc'), '/org-team-hub/pitches?new=pitch&ticker=BTC');
});

test('sample bundle is flagged and uses invented names', () => {
  assert.equal(extras.is_demo, true);
  for (const n of extras.notes) assert.equal(n.is_demo, true);
  for (const p of extras.pitches) assert.equal(p.is_demo, true);
});

test('routes: member-only, user client, sample gated', () => {
  const live = read('src/app/api/org/alternative-markets/route.js');
  assert.match(live, /getUserClient/);
  assert.match(live, /getCurrentOrgMember/);
  assert.doesNotMatch(live, /getAdminClient|getServiceClient|SERVICE_ROLE|supabaseAdmin/);
  assert.doesNotMatch(live, /vote_yes_count|vote_no_count|tally/);
  const sample = read('src/app/api/org/alternative-markets/sample/route.js');
  assert.match(sample, /isCommunityDemoViewer\(user\)/);
  assert.match(sample, /sample: null/);
});

test('page: council cards only for council members once known; retail is honest', () => {
  const page = read('src/components/alternative-markets/am2/AmPage.jsx');
  assert.match(page, /councilReady = Boolean\(isOrgUser && !orgLoading\)/);
  assert.match(page, /useCouncilAlt\(councilReady\)/);
  for (const c of ['CouncilWorkspace', 'CouncilContext', 'CouncilChartActions']) {
    assert.match(page, new RegExp(`councilReady \\? \\(\\s*<${c}|councilReady && \\(?\\s*<${c}`));
  }
  const hook = read('src/components/alternative-markets/council/useCouncilAlt.js');
  assert.doesNotMatch(hook, /org-alternative-markets-model/, 'retail bundle carries no model');

  const files = [
    'AmPage.jsx',
    'AmPageFooter.jsx',
    'AmOnchain.jsx',
    'AmMetricCard.jsx',
    'AmMovers.jsx',
    'AmPriceChart.jsx',
    'AmSentiment.jsx',
    'AmNews.jsx',
    'MarqueeTicker.jsx',
    'AmPricesTable.jsx',
  ].map((f) => read(`src/components/alternative-markets/am2/${f}`));
  const all = files.join('\n');
  assert.doesNotMatch(all, /delayed up to|Updated 1m ago|>\s*Live\s*</);
  assert.doesNotMatch(all, /Live ticker|last 12h|· now/);
  assert.doesNotMatch(all, /TF_OPTIONS|TIMEFRAMES/, 'no timeframe that changes nothing');
  assert.match(read('src/components/alternative-markets/am2/AmPageFooter.jsx'), /Illustrative/);
  const mappers = read('src/components/alternative-markets/am2/am2-mappers.js');
  assert.doesNotMatch(mappers, /signed \* 1\.4|estimateVolume/, 'no invented 7d or volume');
});
