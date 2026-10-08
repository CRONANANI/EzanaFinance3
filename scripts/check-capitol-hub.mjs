/**
 * Capitol Watch hub: the pure functions behind the top signals, the rule
 * builder, the heatmap and Congress's portfolio. Placeholder people only.
 *
 * Usage: node --test scripts/check-capitol-hub.mjs  (or npm run test:capitol-hub)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPITOL_DATASETS,
  buildCommitteeOverlap,
  buildInsiderSameMonth,
  buildLateFiling,
  buildLobbiedThenWon,
  buildRuleEvent,
  buildTradeBeforeAward,
  congressPortfolio,
  defaultRule,
  describeMatch,
  heatAlpha,
  heatmapCell,
  heatmapGrid,
  matchSignalRule,
  rankHighSignalEvents,
  selectEventWindow,
  signalStrength,
  suggestRuleName,
  usdShort,
  validateRule,
  visibleConditions,
} from '../src/lib/datasets/capitol-hub/signals.js';

const TODAY = '2026-10-07';

const TRADE = {
  sourceId: 't-1',
  bioguideId: 'x000001',
  member: '[Member name]',
  party: 'R',
  ticker: 'lmt',
  company: '[Company]',
  side: 'buy',
  tradeDate: '2026-09-12',
  amountMin: 15001,
  amountMax: 50000,
  awardDate: '2026-09-21',
  awardAmount: 1.24e9,
  agency: 'Department of Defense',
  daysFromAward: -9,
  ret30: 6.8,
};

test('usdShort writes amounts for sentences', () => {
  assert.equal(usdShort(1.24e9), '$1.24B');
  assert.equal(usdShort(860e6), '$860M');
  assert.equal(usdShort(15000), '$15K');
  assert.equal(usdShort(null), null);
});

test('strength is a count: N OF 5 for Capitol only, N LINKED with an outside dataset', () => {
  const capitol = signalStrength([
    'Politician Tracker',
    'Government Contracts',
    'Committee Assignments',
  ]);
  assert.equal(capitol.label, '3 OF 5 DATASETS');
  assert.deepEqual(capitol.dots, [true, true, true, false, false]);
  const mixed = signalStrength(['Politician Tracker', 'Form 4 insiders']);
  assert.equal(mixed.label, '2 DATASETS LINKED');
  assert.deepEqual(mixed.dots, [true, true]);
  assert.equal(CAPITOL_DATASETS.length, 5);
});

test('trade before award: headline, one reason per linked dataset, facts', () => {
  const e = buildTradeBeforeAward(TRADE, {
    committee: { name: 'Armed Services', sector: 'Defense' },
  });
  assert.equal(e.kind, 'trade_before_award');
  assert.equal(e.ticker, 'LMT');
  assert.equal(e.headline, '[Member name] bought LMT 9 days before a $1.24B Defense award');
  assert.deepEqual(e.linkedDatasets, [
    'Politician Tracker',
    'Government Contracts',
    'Committee Assignments',
  ]);
  assert.equal(e.reasons.length, e.linkedDatasets.length);
  assert.deepEqual(
    e.facts.map((f) => f.label),
    ['30D return', 'Award', 'Oversight', 'Agency'],
  );
  assert.equal(e.facts[0].sign, 'pos');
  assert.equal(e.flaggedAt, '2026-09-21');
  assert.equal(e.member.bioguideId, 'X000001');
  assert.ok(e.sources.includes('congress-legislators'));
  assert.ok(!e.sources.includes('Senate LDA'));
});

test('events do not need prices: a missing return stays null', () => {
  const e = buildTradeBeforeAward({ ...TRADE, ret30: null });
  assert.equal(e.return30d, null);
  assert.equal(e.facts[0].value, null);
  assert.deepEqual(e.prices, []);
  assert.equal(e.linkedDatasets.length, 2);
});

test('the other builders link the datasets their records come from', () => {
  const cov = buildCommitteeOverlap({
    bioguideId: 'X000002',
    member: '[Member name]',
    party: 'D',
    ticker: 'NVDA',
    side: 'purchase',
    tradeDate: '2026-09-30',
    committee: 'Energy and Commerce',
    sector: 'Technology',
    holding: { name: 'Energy and Commerce', holders: 3, seats: 24, share: 0.125 },
  });
  assert.match(cov.headline, /^3 of 24 Energy and Commerce members hold NVDA/);
  assert.deepEqual(cov.linkedDatasets, ['Politician Tracker', 'Committee Assignments']);

  const ltw = buildLobbiedThenWon(
    {
      ticker: 'PLTR',
      company: '[Company]',
      client: '[Client]',
      year: 2026,
      spend: 1.9e6,
      awardsN: 4,
      awardsV: 412e6,
      latestAward: { date: '2026-09-20', amount: 100e6, agency: 'Department of the Army' },
    },
    {
      memberTrade: {
        bioguideId: 'X000003',
        member: '[Member name]',
        side: 'sale',
        date: '2026-09-01',
      },
    },
  );
  assert.equal(ltw.flaggedAt, '2026-09-20');
  assert.deepEqual(ltw.linkedDatasets, [
    'Lobbying Activity',
    'Government Contracts',
    'Politician Tracker',
  ]);

  const ism = buildInsiderSameMonth({
    ticker: 'XOM',
    bioguideId: 'X000004',
    member: '[Member name]',
    memberDate: '2026-09-03',
    insiderName: '[Insider name]',
    insiderTitle: 'Director',
    insiderDate: '2026-09-18',
    insiderValue: 250000,
  });
  assert.equal(ism.flaggedAt, '2026-09-18');
  assert.equal(signalStrength(ism.linkedDatasets).label, '2 DATASETS LINKED');

  const late = buildLateFiling({
    id: 'c-9',
    bioguideId: 'X000005',
    member: '[Member name]',
    ticker: 'JPM',
    side: 'sale',
    tradeDate: '2026-07-01',
    disclosureDate: '2026-09-01',
  });
  assert.equal(late.headline, '[Member name] disclosed a JPM sale 62 days after the trade');
  assert.equal(late.facts[0].value, 17);
});

test('rankHighSignalEvents: linked count, then most recent, one per id', () => {
  const a = { id: 'a', flaggedAt: '2026-10-01', linkedDatasets: ['x', 'y'] };
  const b = { id: 'b', flaggedAt: '2026-09-01', linkedDatasets: ['x', 'y', 'z'] };
  const c = { id: 'c', flaggedAt: '2026-10-05', linkedDatasets: ['x', 'y'] };
  assert.deepEqual(
    rankHighSignalEvents([a, b, c, a]).map((e) => e.id),
    ['b', 'c', 'a'],
  );
});

test('selectEventWindow widens to 30 days when the week has fewer than five', () => {
  const mk = (id, d) => ({ id, flaggedAt: d, linkedDatasets: ['x'] });
  const few = [mk('1', '2026-10-05'), mk('2', '2026-09-20'), mk('3', '2026-08-01')];
  const w = selectEventWindow(few, TODAY);
  assert.equal(w.days, 30);
  assert.deepEqual(
    w.events.map((e) => e.id),
    ['1', '2'],
  );
  const many = ['1', '2', '3', '4', '5'].map((id) => mk(id, '2026-10-04'));
  assert.equal(selectEventWindow(many, TODAY).days, 7);
});

/* ── rules ── */

const POOL = [
  {
    id: 'p1',
    level: 'trade',
    ticker: 'LMT',
    member: { bioguideId: 'X000001', name: '[Member name]', party: 'R' },
    side: 'purchase',
    tradeDate: '2026-09-12',
    amountMin: 15001,
    flaggedAt: '2026-09-12',
    awards: [{ date: '2026-09-21', amount: 1.24e9, agency: 'Department of Defense' }],
    oversees: { committee: 'Armed Services', sector: 'Defense' },
    ret30: 6.8,
  },
  {
    id: 'p2',
    level: 'trade',
    ticker: 'GD',
    member: { bioguideId: 'X000002', name: '[Member name]', party: 'D' },
    side: 'purchase',
    tradeDate: '2026-08-01',
    amountMin: 1001,
    flaggedAt: '2026-08-01',
    awards: [{ date: '2026-10-05', amount: 60e6, agency: 'Department of the Navy' }],
    oversees: null,
  },
  {
    id: 'p3',
    level: 'company',
    ticker: 'BAH',
    member: null,
    flaggedAt: '2026-09-30',
    awards: [{ date: '2026-09-30', amount: 312e6, agency: 'Homeland Security' }],
    lobbying: { client: '[Client]', spend: 1e6, year: 2026 },
    institutions: [{ date: '2026-08-14' }],
  },
];

test('defaultRule and visibleConditions follow the selected datasets', () => {
  const r = defaultRule();
  assert.equal(r.window, '90D');
  assert.ok(visibleConditions(r.datasets).includes('trade_within_days'));
  assert.ok(
    !visibleConditions(['Lobbying Activity', '13F institutions']).includes('trade_within_days'),
  );
  assert.ok(!visibleConditions(['Lobbying Activity', '13F institutions']).includes('party'));
  assert.equal(suggestRuleName(r), 'Committee members trading before awards');
});

test('matchSignalRule: every selected dataset and every enabled condition', () => {
  const rule = defaultRule();
  const out = matchSignalRule(rule, POOL, { today: TODAY });
  assert.equal(out.count, 1);
  assert.equal(out.matches[0].id, 'p1');
  assert.equal(out.matches[0].award.amount, 1.24e9);
  assert.equal(
    describeMatch(out.matches[0]),
    '[Member name] bought 9 days before $1.24B Defense award',
  );

  /* Without the committee, GD qualifies once the award floor and the day
     range let its award in. */
  const loose = {
    ...rule,
    datasets: ['Politician Tracker', 'Government Contracts'],
    conditions: [
      { id: 'trade_within_days', value: 90, enabled: true },
      { id: 'award_min', value: 50e6, enabled: true },
    ],
  };
  assert.equal(matchSignalRule(loose, POOL, { today: TODAY }).count, 2);
  /* Party filter. */
  const dems = {
    ...loose,
    conditions: [...loose.conditions, { id: 'party', value: 'D', enabled: true }],
  };
  assert.deepEqual(
    matchSignalRule(dems, POOL, { today: TODAY }).matches.map((m) => m.id),
    ['p2'],
  );
  /* A 30-day window leaves the August trade out. */
  assert.equal(matchSignalRule({ ...loose, window: '30D' }, POOL, { today: TODAY }).count, 1);
});

test('matchSignalRule: company rules when no member dataset is selected', () => {
  const rule = {
    datasets: ['Government Contracts', 'Lobbying Activity', '13F institutions'],
    conditions: [{ id: 'award_min', value: 100e6, enabled: true }],
    window: '90D',
  };
  const out = matchSignalRule(rule, POOL, { today: TODAY });
  assert.deepEqual(
    out.matches.map((m) => m.id),
    ['p3'],
  );
  const ev = buildRuleEvent(out.matches[0], { id: 'r1', name: 'Lobbied and held', ...rule });
  assert.equal(ev.kind, 'user_rule');
  assert.equal(ev.ruleId, 'r1');
  assert.equal(ev.measuredFrom, 'filing_date');
  assert.deepEqual(ev.linkedDatasets, [
    'Government Contracts',
    'Lobbying Activity',
    '13F institutions',
  ]);
});

test('validateRule refuses what the API must refuse', () => {
  assert.equal(validateRule({ ...defaultRule(), name: '' }).ok, false);
  assert.equal(
    validateRule({ ...defaultRule(), name: 'x', datasets: ['Politician Tracker'] }).ok,
    false,
  );
  assert.equal(
    validateRule({
      ...defaultRule(),
      name: 'x',
      datasets: ['Politician Tracker', 'Prediction markets'],
    }).ok,
    false,
  );
  assert.equal(validateRule({ ...defaultRule(), name: 'x', window: '2Y' }).ok, false);
  assert.equal(
    validateRule({ ...defaultRule(), name: 'x', conditions: [{ id: 'award_min', value: 7 }] }).ok,
    false,
  );
  const ok = validateRule({ ...defaultRule(), name: '  Mine  ', alerts: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.rule.name, 'Mine');
  assert.equal(ok.rule.alerts, true);
  assert.equal(validateRule({ ...defaultRule() }, { requireName: false }).ok, true);
});

/* ── heatmap and portfolio ── */

const HEAT = [
  {
    committee_thomas_id: 'HSAS',
    committee: 'Armed Services',
    chamber: 'house',
    sector: 'Industrials',
    seats: 50,
    holders: 10,
    share_pct: 20,
    holder_rows: [
      {
        bioguideId: 'x1',
        member: '[Member name]',
        party: 'R',
        tickers: ['lmt'],
        lastTrade: '2026-09-12',
      },
    ],
  },
  {
    committee_thomas_id: 'HSAS',
    committee: 'Armed Services',
    chamber: 'house',
    sector: 'Energy',
    seats: 50,
    holders: 2,
    share_pct: 4,
    holder_rows: [],
  },
  {
    committee_thomas_id: 'HSIF',
    committee: 'Energy and Commerce',
    chamber: 'house',
    sector: 'Energy',
    seats: 40,
    holders: 4,
    share_pct: 10,
    holder_rows: [],
  },
];

test('heatmapCell shapes one committee by sector cell', () => {
  const c = heatmapCell(HEAT[0]);
  assert.equal(c.share, 0.2);
  assert.equal(c.members, 50);
  assert.deepEqual(c.holderRows[0].tickers, ['LMT']);
  assert.equal(c.holderRows[0].bioguideId, 'X1');
});

test('heatmapGrid picks committees by top share, sectors by holders, fills gaps', () => {
  const g = heatmapGrid(HEAT, { committees: 8, sectors: 7 });
  assert.deepEqual(
    g.committees.map((c) => c.id),
    ['HSAS', 'HSIF'],
  );
  assert.deepEqual(g.sectors, ['Industrials', 'Energy']);
  assert.equal(g.grid[1][0].share, 0);
  assert.deepEqual(g.selected, [0, 0]);
  assert.equal(heatAlpha(0.2, g.max), 0.86);
  assert.equal(heatAlpha(0, g.max), 0.06);
});

test('congressPortfolio ranks by members and keeps 16', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    ticker: `T${i}`,
    members: 20 - i,
    est_low: 1000 * i,
    est_high: 5000 * i,
  }));
  const p = congressPortfolio(rows);
  assert.equal(p.rows.length, 16);
  assert.equal(p.rows[0].ticker, 'T0');
  assert.equal(p.rows[0].rank, 1);
  assert.equal(p.maxMembers, 20);
});

test('the committee condition is fixed: toggling it never changes the count', () => {
  const base = defaultRule();
  const toggled = (on) => ({
    ...base,
    conditions: base.conditions.map((c) =>
      c.id === 'committee_oversees' ? { ...c, enabled: on } : c,
    ),
  });
  const a = matchSignalRule(toggled(true), POOL, { today: TODAY }).count;
  const b = matchSignalRule(toggled(false), POOL, { today: TODAY }).count;
  assert.equal(a, b);
  /* Committee Assignments itself still decides: without it the count changes. */
  const noCommittee = { ...base, datasets: ['Politician Tracker', 'Government Contracts'] };
  assert.ok(matchSignalRule(noCommittee, POOL, { today: TODAY }).count >= a);
});
