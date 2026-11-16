/**
 * Council sections of US Equities (/company-research).
 * Model readings on the shared sample council, honest empty handling, the
 * descriptive policy check, the membership gate in the page, and the routes'
 * data access (signed-in member only, sample for demo viewers only).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';
import {
  coverageGaps,
  fmtMoney,
  fmtSignedPct,
  fundOverview,
  onTicker,
  parseCompactDollars,
  policyReadings,
  sampleTickerPart,
  sectionOrder,
  sleevesOf,
} from '../src/lib/org-company-research-model.js';

const NOW = Date.UTC(2026, 10, 16, 15);
const raw = buildCompanyResearchSample({
  userId: 'u-me',
  memberId: 'm-me',
  role: 'executive',
  displayName: 'Viewer',
  now: NOW,
});
const read = (f) => fs.readFileSync(f, 'utf8');

test('the sample is the shared sample council, every row flagged', () => {
  const o = fundOverview(raw);
  assert.equal(fmtMoney(o.totals.value), '$240,050.00');
  assert.equal(fmtSignedPct(o.totals.gainPct), '+46.73%');
  assert.equal(o.totals.positions, 12);
  assert.equal(o.totals.unpriced, 1);
  assert.equal(o.teams, 4);
  assert.equal(o.benchmark.label, 'SPY');
  assert.equal(fmtSignedPct(o.benchmark.pct), '+10.08%');
  assert.ok(raw.is_demo);
  for (const k of ['positions', 'notes', 'pitches', 'rules']) {
    assert.ok(raw[k].length, `${k} present`);
    assert.ok(
      raw[k].every((r) => r.is_demo),
      `${k} rows carry is_demo`,
    );
  }
  const names = JSON.stringify(raw.members.map((m) => m.display_name));
  assert.match(names, /Amara Tesfaye/);
});

test('sleeves add up to the fund', () => {
  const rows = sleevesOf(raw);
  assert.equal(rows.length, 4);
  const sum = rows.reduce((s, r) => s + r.value, 0);
  assert.equal(Math.round(sum * 100), Math.round(fundOverview(raw).totals.value * 100));
  const w = rows.reduce((s, r) => s + r.weightPct, 0);
  assert.ok(Math.abs(w - 100) < 1e-9);
});

test('one held name: position, sleeve, research, pitch, contribution', () => {
  const v = onTicker(raw, sampleTickerPart(raw, 'nvda'), {
    ticker: 'NVDA',
    sector: 'Technology',
    marketCapText: '$3.80T',
  });
  assert.equal(v.held, true);
  assert.equal(v.holding.team, 'Technology');
  assert.equal(v.sleeve.rows[0].ticker, 'NVDA', 'the name leads its sleeve');
  assert.equal(v.sleeve.count, 3);
  assert.ok(v.docCount > 0);
  assert.equal(v.analyst, 'Elena Rossi', 'latest coverage handoff wins');
  assert.equal(v.latestPitch.stageLabel, 'In portfolio');
  /* Contributions of every holding add up to the fund gain on cost. */
  const total = raw.positions.reduce((s, p) => {
    const c = onTicker(raw, { docs: [], pitches: [] }, { ticker: p.ticker }).contribution;
    return s + (c.contributionPp || 0);
  }, 0);
  assert.ok(Math.abs(total - fundOverview(raw).totals.gainPct) < 1e-9);
});

test('an unpriced holding has no return and no contribution', () => {
  const v = onTicker(raw, { docs: [], pitches: [] }, { ticker: 'HON' });
  assert.equal(v.holding.priced, false);
  assert.equal(v.holding.returnPct, null);
  assert.equal(v.contribution.contributionPp, null);
  const gaps = coverageGaps(raw);
  const hon = gaps.find((g) => g.ticker === 'HON');
  assert.equal(hon.status, 'uncovered');
  assert.equal(hon.priced, false);
  assert.ok(gaps.every((g) => ['uncovered', 'stale'].includes(g.status)));
});

test('policy check: stored limits only, descriptive, cash floor never checked', () => {
  const rows = policyReadings(raw, {
    ticker: 'NVDA',
    holding: onTicker(raw, { docs: [], pitches: [] }, { ticker: 'NVDA' }).holding,
    sector: 'Technology',
    marketCapText: '$3.80T',
  });
  const active = raw.rules.filter((r) => r.is_active !== false);
  assert.equal(rows.length, active.length, 'inactive rules are not read');
  const pos = rows.find((r) => r.type === 'max_position_pct');
  assert.equal(pos.limit, '25%', 'the stored limit, not a design value');
  assert.equal(pos.reading, 'Within');
  const cash = rows.find((r) => r.type === 'cash_floor_pct');
  assert.equal(cash.reading, 'Not checked');
  assert.equal(rows[rows.length - 1].type, 'cash_floor_pct');
  const cap = rows.find((r) => r.type === 'min_market_cap');
  assert.equal(cap.reading, 'Above');
  const words = rows.map((r) => r.reading).join(' ');
  assert.doesNotMatch(words, /should|recommend|block|buy|sell/i);
  const banned = policyReadings(
    { ...raw, rules: [{ id: 'r', rule_type: 'prohibited_ticker', rule_value: { ticker: 'MO' } }] },
    { ticker: 'MO' },
  );
  assert.equal(banned[0].reading, 'Prohibited');
  assert.equal(parseCompactDollars('$750M'), 750e6);
  assert.equal(parseCompactDollars('--'), null);
});

test('an empty council reads honestly', () => {
  const empty = { positions: [], teams: [], members: [], rules: [], noteIndex: [] };
  assert.equal(fundOverview(empty).status, 'empty');
  assert.equal(fundOverview(empty).totals.gainPct, null);
  assert.deepEqual(sleevesOf(empty), []);
  assert.deepEqual(coverageGaps(empty), []);
  const v = onTicker(empty, { docs: [], pitches: [] }, { ticker: 'AAPL' });
  assert.equal(v.held, false);
  assert.equal(v.contribution, null);
  assert.deepEqual(v.policy, []);
  assert.equal(fundOverview(empty).benchmark.pct, null);
});

test('section order follows the role', () => {
  assert.equal(sectionOrder('analyst')[0], 'research');
  assert.equal(sectionOrder('portfolio_manager')[0], 'position');
  assert.deepEqual(sectionOrder('executive').slice(0, 2), ['position', 'policy']);
});

test('page: council sections only after membership is known; retail untouched', () => {
  const page = read('src/app/(dashboard)/company-research/page.js');
  assert.match(page, /const councilReady = isOrgUser && !orgLoading;/);
  assert.match(
    page,
    /useCouncilResearch\(\s*viewMode === 'stock' \? selectedStock : null,\s*councilReady,?\s*\)/,
  );
  const uses = page.match(/<Council(Band|OnThisName|NameSections|Gaps|Sleeves)\b/g) || [];
  assert.equal(uses.length, 6);
  const guarded = page.match(/councilReady &&[\s\S]{0,80}?<Council/g) || [];
  assert.equal(guarded.length, uses.length, 'every council section sits behind councilReady');
  assert.match(page, /import\('@\/components\/research\/council\/CouncilSections'\)/);
  const hook = read('src/components/research/council/useCouncilResearch.js');
  assert.match(hook, /if \(!enabled\) return;/, 'nothing is fetched for non-members');
  assert.doesNotMatch(hook, /from '@\/lib\/org-/, 'the retail bundle carries no council model');
});

test('routes: the signed-in member only; sample for demo viewers only', () => {
  const live = read('src/app/api/org/company-research/route.js');
  assert.match(live, /getUserClient\(\)/);
  assert.doesNotMatch(live, /getAdminClient|SERVICE_ROLE/);
  assert.match(live, /getOrgPositionBook\(supabase, orgId\)/);
  assert.match(live, /requireAuth: true/);
  assert.doesNotMatch(live, /\.(insert|update|delete|upsert)\(/, 'read only');
  const sample = read('src/app/api/org/company-research/sample/route.js');
  assert.match(sample, /if \(!isCommunityDemoViewer\(user\)\)[\s\S]*sample: null/);
});

test('copy and token rules in the council files', () => {
  const files = [
    'src/components/research/council/CouncilSections.jsx',
    'src/components/research/council/council-research.css',
    'src/components/research/council/useCouncilResearch.js',
    'src/lib/org-company-research-model.js',
    'src/lib/org-company-research-sample.js',
  ];
  for (const f of files) {
    const s = read(f);
    assert.ok(!s.includes(String.fromCharCode(8212)), `${f}: em dash`);
    assert.doesNotMatch(s, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${f}: hex colour`);
    assert.doesNotMatch(s, /rgba?\(/, `${f}: rgba`);
    assert.doesNotMatch(s, /real-time|Supabase|Finnhub|FMP\b/, `${f}: copy`);
  }
  const jsx = read('src/components/research/council/CouncilSections.jsx');
  assert.doesNotMatch(jsx, /<(Card|CardHeader|PageHeader|Eyebrow)\b/);
  assert.doesNotMatch(jsx, /country|currency|asset class/i);
  const css = read('src/components/research/council/council-research.css');
  assert.match(css, /var\(--btn-primary-fg\)/);
  assert.doesNotMatch(css, /box-shadow/);
});
