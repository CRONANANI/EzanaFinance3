/**
 * Council view of Global Market Analysis (/market-analysis).
 *   npm run test:council-global-market
 *
 * The model's honesty rules, the sample council, the routes' access rules
 * and the page's gating (retail page unchanged, Council view only for
 * council members once membership is known).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  appendAgenda,
  agendaDraft,
  councilTeams,
  gicsOf,
  kpis,
  macroResearch,
  matchEvents,
  policyCheck,
  returnSeries,
  sleeveRows,
  standingRows,
  topicOf,
  upcoming,
} from '../src/lib/org-global-market-model.js';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';
import { buildGlobalMarketSample } from '../src/lib/org-global-market-sample.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'executive', displayName: 'Viewer' };
const NOW = Date.UTC(2026, 10, 16, 15);
const fundRaw = buildCompanyResearchSample({ ...viewer, now: NOW });
const extras = buildGlobalMarketSample({ ...viewer, now: NOW });
const ev = (title, extra = {}) => ({ title, time: new Date(NOW).toISOString(), ...extra });

test('sector words map to GICS sectors', () => {
  assert.equal(gicsOf('Technology'), 'Information Technology');
  assert.equal(gicsOf('Healthcare'), 'Health Care');
  assert.equal(gicsOf('Banks'), 'Financials');
  assert.equal(gicsOf('Something else'), null);
});

test('events match teams by topic and sector only, never by ticker or country', () => {
  assert.equal(topicOf(ev('Fed holds policy rate')).key, 'rates');
  assert.equal(topicOf(ev('Brent crude moves higher')).key, 'energy');
  assert.equal(topicOf(ev('Celebrity wedding')), null);
  const rows = matchEvents(
    [
      ev('Fed holds policy rate', { impact: 'CRITICAL', country: 'US' }),
      ev('Chipmakers rally'),
      ev('Celebrity wedding'),
      ev('Old Fed story', { time: new Date(NOW - 9 * 86400000).toISOString() }),
    ],
    fundRaw,
    { now: NOW },
  );
  assert.deepEqual(
    rows.map((r) => r.title),
    ['Fed holds policy rate', 'Chipmakers rally'],
  );
  assert.deepEqual(
    rows[0].teams.map((t) => t.name),
    ['Financials'],
  );
  for (const r of rows) {
    assert.ok(!('impactEstimate' in r));
    assert.ok(!('tickers' in r));
  }
});

test('no teams, no matches', () => {
  assert.deepEqual(matchEvents([ev('Fed holds policy rate')], { ...fundRaw, teams: [] }), []);
});

test('sleeves carry no country, currency or asset-class figure', () => {
  const rows = sleeveRows(fundRaw);
  assert.equal(rows.length, 4);
  for (const r of rows) {
    for (const k of ['country', 'region', 'currency', 'assetClass'])
      assert.ok(!(k in r), `sleeve has ${k}`);
  }
  const total = rows.reduce((s, r) => s + r.weightPct, 0);
  assert.ok(Math.abs(total - 100) < 0.01);
});

test('a sleeve warning appears only against a stored sector cap', () => {
  const noCap = sleeveRows({ ...fundRaw, rules: [] });
  assert.ok(noCap.every((r) => r.capNote === null));
  const tight = {
    ...fundRaw,
    rules: [{ id: 'r', rule_type: 'max_sector_pct', rule_value: { pct: 20 }, is_active: true }],
  };
  const warned = sleeveRows(tight).filter((r) => r.capNote);
  assert.ok(warned.length > 0);
  assert.match(warned[0].capNote.text, /20% sector cap/);
});

test('policy check is descriptive and lists unpriced holdings', () => {
  const pc = policyCheck(fundRaw);
  assert.ok(pc.ruleCount > 0);
  assert.deepEqual(pc.unpriced, ['HON']);
  assert.ok(pc.rows.every((r) => !/block|sell|buy|should/i.test(`${r.reading} ${r.status}`)));
});

test('return series rebase to 0% and alpha is fund minus benchmark', () => {
  const all = returnSeries(extras.snapshots, 'ALL');
  assert.equal(all.points[0].fund, 0);
  assert.ok(Math.abs(all.fundPct - 46.73) < 0.01);
  assert.ok(Math.abs(all.benchPct - 10.08) < 0.01);
  assert.ok(Math.abs(all.alphaPct - (all.fundPct - all.benchPct)) < 1e-9);
  const m = returnSeries(extras.snapshots, '1M');
  assert.equal(m.points[0].fund, 0);
  assert.equal(returnSeries([], 'ALL'), null);
});

test('council versus council shows rating and tier only', () => {
  const st = standingRows(extras.standing.rows, extras.standing.myOrgId);
  assert.equal(st.status, 'ready');
  assert.ok(st.rows.some((r) => r.mine && r.name === 'Sample council'));
  for (const r of st.rows)
    assert.deepEqual(Object.keys(r).sort(), ['mine', 'name', 'orgId', 'rank', 'rating', 'tier']);
  assert.equal(standingRows(extras.standing.rows, 'not-rated').status, 'unrated');
});

test('macro research keeps no-ticker or macro-tagged documents and hides others drafts', () => {
  const rows = macroResearch(extras.notes, { members: extras.members, viewer: extras.viewer });
  assert.ok(rows.length > 0);
  const analyst = macroResearch(
    [{ id: 'd', title: 'Draft', status: 'draft', author_id: 'other', created_at: NOW }],
    { viewer: { role: 'analyst', userId: 'me' } },
  );
  assert.equal(analyst.length, 0);
});

test('KPI strip and next meeting come from the book and Meetings', () => {
  const next = upcoming(extras.meetings, NOW).next;
  const k = kpis(fundRaw, next);
  assert.equal(Math.round(k.value), 240050);
  assert.equal(k.positions, 12);
  assert.equal(k.benchLabel, 'SPY');
  assert.ok(k.next && k.next.day);
});

test('agenda items append to the stored agenda in the route shape', () => {
  const row = {
    id: 'e1',
    title: 'Fed holds policy rate',
    topic: 'Rates and central banks',
    teams: [{ owners: ['Amara Tesfaye'] }],
  };
  const out = appendAgenda([{ id: 'a', label: 'Old', minutes: 5 }], [agendaDraft(row)]);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 'a');
  assert.equal(out[1].owner, 'Amara Tesfaye');
  assert.equal(out[1].kind, 'discussion');
});

test('the sample is the shared sample council with invented names', () => {
  assert.ok(extras.is_demo);
  const names = councilTeams(fundRaw).map((t) => t.name);
  assert.deepEqual(names.sort(), ['Financials', 'Healthcare', 'Industrials', 'Technology']);
  const people = extras.members.map((m) => m.display_name);
  for (const n of ['Amara Tesfaye', 'Mikael Bekele', 'Selam Haile', 'Chidi Okoye'])
    assert.ok(people.includes(n), n);
  assert.ok(extras.snapshots.every((s) => s.is_demo));
  assert.ok(extras.notes.every((s) => s.is_demo));
});

test('routes: member-scoped user client; sample only for demo viewers', () => {
  const live = read('src/app/api/org/market-analysis/route.js');
  assert.match(live, /getUserClient/);
  assert.doesNotMatch(live, /getAdminClient|service_role/);
  assert.match(live, /getCurrentOrgMember/);
  const sample = read('src/app/api/org/market-analysis/sample/route.js');
  assert.match(sample, /isCommunityDemoViewer\(user\)/);
  assert.match(sample, /sample: null/);
});

test('page: retail views unchanged; Council view only once membership is known', () => {
  const page = read('src/app/(dashboard)/market-analysis/page.js');
  assert.match(page, /const councilReady = Boolean\(isOrgUser && !orgLoading\)/);
  assert.match(page, /\{councilReady && \(\s*<button/);
  assert.match(page, /THE MAP/);
  assert.match(page, /THE CHAIN/);
  assert.match(page, /GLOBAL EMPIRE RANKINGS/);
  assert.match(page, /import\('@\/components\/market-analysis\/council\/CouncilView'\)/);
  assert.doesNotMatch(page, /^import .*council\/CouncilView/m);
  const view = read('src/components/market-analysis/council/CouncilView.jsx');
  assert.doesNotMatch(view, /Related market watch|Market context/);
  assert.match(view, /not an impact\s+estimate/);
});

test('council CSS uses tokens only', () => {
  const css = read('src/components/market-analysis/council/council-market.css');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /rgba?\(/);
  assert.doesNotMatch(css, /box-shadow/);
});
