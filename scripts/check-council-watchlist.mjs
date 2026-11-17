/**
 * Council watch on the Watchlist (/watchlist).
 *   npm run test:council-watchlist
 *
 * The model's honesty rules (held names plus open pitches only, the owner's
 * source order, stale after 90 days, descriptive cap readings, no invented
 * figures), the sample council, the routes' access rules and the page's
 * gating (the personal watchlist unchanged for everyone else, the council
 * section only for council members once membership is known, sample rows
 * never saved).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  NA,
  capReading,
  comingUp,
  coverageAssignments,
  coverageRows,
  deskRows,
  filterRows,
  ipsWatch,
  openPitches,
  positionCap,
  sortRows,
  stripFigures,
} from '../src/lib/org-watchlist-model.js';
import { buildWatchlistSample } from '../src/lib/org-watchlist-sample.js';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NOW = Date.UTC(2026, 10, 16, 15);
const DAY = 86400000;
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'analyst', displayName: 'Viewer' };
const fund = buildCompanyResearchSample({ ...viewer, now: NOW });
const extras = buildWatchlistSample({ ...viewer, now: NOW });

const raw = {
  now: NOW,
  positions: [
    { ticker: 'AAA', name: 'A Co', team_id: 't1', sector: 'Banks', value: 230, priced: true },
    { ticker: 'BBB', name: 'B Co', team_id: 't1', sector: 'Banks', value: 70, priced: true },
    { ticker: 'CCC', name: 'C Co', team_id: 't2', sector: 'Software', value: 700, priced: true },
  ],
  teams: [
    { id: 't1', name: 'Financials' },
    { id: 't2', name: 'Technology' },
  ],
  members: [
    { id: 'm-1', display_name: 'Viewer' },
    { id: 'm-2', display_name: 'Ana Analyst' },
    { id: 'm-3', display_name: 'Ben Banker' },
  ],
  coverage: [{ member_id: 'm-3', sector: 'Banks', is_primary: true }],
  hops: [{ ticker: 'AAA', to_member_id: 'm-2', created_at: '2026-10-01' }],
  rules: [
    { rule_type: 'max_position_pct', rule_value: { pct: 25 }, is_active: true },
    { rule_type: 'max_sector_pct', rule_value: { pct: 35 }, is_active: true },
    { rule_type: 'prohibited_ticker', rule_value: { ticker: 'ZZZ' }, is_active: true },
  ],
  noteIndex: [
    { ticker: 'AAA', created_at: new Date(NOW - 10 * DAY).toISOString() },
    { ticker: 'BBB', created_at: new Date(NOW - 120 * DAY).toISOString() },
  ],
};
const ex = {
  pitches: [
    { id: 'p1', ticker: 'ZZZ', stage: 'deep_dive', analyst_member_id: 'm-1', team_id: 't2' },
    { id: 'p2', ticker: 'DDD', stage: 'in_portfolio' },
    { id: 'p3', ticker: 'EEE', stage: 'idea', archived_at: '2026-10-01' },
  ],
};

test('the list is every held name plus open pitches only', () => {
  const rows = coverageRows(raw, ex, 'm-1');
  assert.deepEqual(rows.map((r) => r.ticker).sort(), ['AAA', 'BBB', 'CCC', 'ZZZ']);
  assert.equal(openPitches(ex.pitches).length, 1);
});

test('owner: handoff, then sector coverage, then pitch analyst, else unassigned', () => {
  const by = Object.fromEntries(coverageRows(raw, ex, 'm-1').map((r) => [r.ticker, r]));
  assert.equal(by.AAA.owner.name, 'Ana Analyst');
  assert.equal(by.AAA.owner.source, 'Handoff');
  assert.equal(by.BBB.owner.source, 'Sector coverage');
  assert.equal(by.ZZZ.owner.source, 'Pitch analyst');
  assert.equal(by.CCC.owner, null);
  assert.equal(by.CCC.gap, 'unassigned');
});

test('research: current within 90 days, stale after, none without a document', () => {
  const by = Object.fromEntries(coverageRows(raw, ex, 'm-1').map((r) => [r.ticker, r]));
  assert.equal(by.AAA.research, 'current');
  assert.equal(by.AAA.gap, null);
  assert.equal(by.BBB.research, 'stale');
  assert.equal(by.ZZZ.research, 'none');
});

test('weight is read against the stored position cap, descriptively', () => {
  const by = Object.fromEntries(coverageRows(raw, ex, 'm-1').map((r) => [r.ticker, r]));
  assert.equal(positionCap(raw.rules), 25);
  assert.equal(by.AAA.weight.toFixed(1), '23.0');
  assert.equal(by.AAA.capReading.text, 'Nearing');
  assert.equal(by.CCC.capReading.text, 'Above');
  assert.equal(by.ZZZ.capReading.text, 'Not held');
  assert.equal(capReading(null, 25).text, NA);
  assert.equal(capReading(10, null).text, NA);
});

test('my coverage and gaps filters; the strip counts what the rows show', () => {
  const rows = coverageRows(raw, ex, 'm-1');
  assert.deepEqual(
    filterRows(rows, 'mine').map((r) => r.ticker),
    ['ZZZ'],
  );
  assert.deepEqual(
    filterRows(rows, 'gaps')
      .map((r) => r.ticker)
      .sort(),
    ['BBB', 'CCC', 'ZZZ'],
  );
  const s = stripFigures(rows);
  assert.equal(s.names, 4);
  assert.equal(s.held, 3);
  assert.equal(s.pitched, 1);
  assert.equal(s.unassigned, 1);
  assert.equal(s.nearCap, 2);
  assert.equal(sortRows(rows)[0].ticker, 'CCC');
});

test('IPS watch reads sectors and lists prohibited pitches, never a block', () => {
  const rows = coverageRows(raw, ex, 'm-1');
  const ips = ipsWatch(
    raw,
    rows,
    raw.positions.map((p) => ({ ...p, current_value: p.value })),
  );
  assert.equal(ips.sectorCap, 35);
  const sw = Object.fromEntries(ips.sectors.map((s) => [s.sector, s.reading.text]));
  assert.equal(sw.Software, 'Above');
  assert.equal(sw.Banks, 'Within');
  assert.deepEqual(ips.prohibited, ['ZZZ']);
  const none = ipsWatch({ ...raw, rules: [] }, rows, []);
  assert.equal(none.hasRules, false);
});

test('desk watch, assignments and coming up only read records that exist', () => {
  const rows = coverageRows(raw, ex, 'm-1');
  const desks = deskRows(raw, rows);
  assert.equal(desks[0].name, 'Technology');
  assert.deepEqual(desks.find((d) => d.name === 'Financials').covering, ['Ben Banker']);
  const a = coverageAssignments(
    [
      { id: 'a', title: 'Done', status: 'complete' },
      { id: 'b', title: 'Mine', status: 'assigned', mine: true, due_date: '2026-11-20' },
    ],
    NOW,
  );
  assert.deepEqual(
    a.map((x) => x.owner),
    ['You'],
  );
  const items = comingUp(
    {
      meetings: [
        { id: 1, title: 'Past', scheduled_at: new Date(NOW - 2 * DAY).toISOString() },
        { id: 2, title: 'Soon', category: 'ic', scheduled_at: new Date(NOW + DAY).toISOString() },
        { id: 3, title: 'Far', scheduled_at: new Date(NOW + 60 * DAY).toISOString() },
      ],
      sessions: [],
      assignments: [],
    },
    { now: NOW },
  );
  assert.deepEqual(
    items.map((i) => i.title),
    ['Soon'],
  );
});

test('the sample is the shared sample council, labelled and invented', () => {
  assert.equal(extras.is_demo, true);
  const rows = coverageRows(fund, extras, fund.viewer.memberId);
  const held = rows.filter((r) => r.held).map((r) => r.ticker);
  assert.equal(held.length, 12);
  for (const t of ['JPM', 'NVDA', 'HON']) assert.ok(held.includes(t), t);
  for (const t of ['AVGO', 'AXP', 'COST', 'ETN', 'GS', 'ISRG', 'LIN', 'ORCL'])
    assert.ok(
      rows.some((r) => r.ticker === t && r.pitched),
      t,
    );
  for (const p of extras.pitches) assert.equal(p.is_demo, true);
  /* The analyst viewer pitched AXP in the sample. */
  assert.ok(filterRows(rows, 'mine').some((r) => r.ticker === 'AXP'));
  assert.ok(extras.policyPositions.length === 12);
});

test('routes: signed in, council members only, sample for demo viewers only', () => {
  const live = read('src/app/api/org/watchlist/route.js');
  const sample = read('src/app/api/org/watchlist/sample/route.js');
  for (const f of [live, sample]) {
    assert.match(f, /requireAuth: true/);
    assert.match(f, /getCurrentOrgMember/);
    assert.match(f, /status: 403/);
    assert.match(f, /getUserClient/);
    assert.doesNotMatch(f, /SERVICE_ROLE|getServiceClient|getAdminClient|createServiceClient/);
  }
  assert.match(sample, /isCommunityDemoViewer\(user\)/);
  assert.match(sample, /sample: null/);
  assert.doesNotMatch(live, /\.(insert|update|upsert|delete)\(/);
});

test('page: council section gated on membership; sample rows are never saved', () => {
  const page = read('src/app/(dashboard)/watchlist/page.js');
  assert.match(page, /const councilReady = Boolean\(isOrgUser && !orgLoading\)/);
  assert.match(page, /useCouncilWatchlist\(councilReady\)/);
  assert.match(page, /\{councilReady \? \(\s*<CouncilWatch/);
  assert.match(page, /if \(sample\) \{\s*notify\('Sample content\. Nothing was saved\.'\)/);
  assert.match(page, /onSendToTeam=\{canSend \? setSendTicker : null\}/);
  const view = read('src/components/watchlist/council/CouncilWatch.jsx');
  assert.match(view, /Sample content/);
  assert.doesNotMatch(view, /Add to coverage|Backup|Priority|insider|upgrade/i);
  const hook = read('src/components/watchlist/council/useCouncilWatchlist.js');
  assert.match(hook, /useCouncilResearch\(null, enabled\)/);
});
