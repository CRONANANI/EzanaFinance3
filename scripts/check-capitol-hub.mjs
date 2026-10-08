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
  CONDITION_GROUPS,
  RULE_CONDITIONS,
  agencyGroup,
  compareRegions,
  ownerOf,
} from '../src/lib/datasets/capitol-hub/signals.js';
import {
  lensArea,
  distanceFor,
  vennLayout,
} from '../src/app/datasets/[hub]/capitol/venn-geometry.js';
import {
  lobbyingStats,
  pearson,
  ranks,
  spearman,
} from '../src/app/datasets/[hub]/capitol/stats.js';

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

/* ── Oct 8: Compare, lobbying ratio, step 2 conditions ─────────────────── */

test('venn: the lens area matches the overlap and the layout covers edge cases', () => {
  const r1 = Math.sqrt(1013 / Math.PI);
  const r2 = Math.sqrt(1231 / Math.PI);
  const d = distanceFor(r1, r2, 500);
  assert.ok(Math.abs(lensArea(r1, r2, d) - 500) < 0.5);
  const full = vennLayout(513, 500, 731);
  assert.ok(full.paths.a && full.paths.both && full.paths.b);
  assert.equal(vennLayout(50, 0, 30).paths.both, null, 'disjoint sets have no lens');
  const inside = vennLayout(0, 20, 1000);
  assert.ok(inside.paths.both && inside.paths.b && !inside.paths.a, 'A inside B');
  assert.equal(vennLayout(0, 0, 0), null);
});

test('compareRegions splits tickers into only A, both and only B, most held first', () => {
  const r = compareRegions([
    { ticker: 'AAA', a: 3, b: 0 },
    { ticker: 'BBB', a: 2, b: 5 },
    { ticker: 'CCC', a: 0, b: 1 },
    { ticker: 'DDD', a: 9, b: 9 },
  ]);
  assert.equal(r.a.count, 1);
  assert.equal(r.both.count, 2);
  assert.equal(r.b.count, 1);
  assert.equal(r.both.top[0].ticker, 'DDD');
});

test('lobbying stats: pearson, spearman with ties, and a weak reading near zero', () => {
  assert.ok(Math.abs(pearson([1, 2, 3, 4], [2, 4, 6, 8]) - 1) < 1e-9);
  assert.deepEqual(ranks([10, 20, 20, 5]), [2, 3.5, 3.5, 1]);
  assert.ok(Math.abs(spearman([1, 2, 3], [3, 2, 1]) + 1) < 1e-9);
  const rows = [
    { lobbying: 1e5, awardValue: 5e6 },
    { lobbying: 2e5, awardValue: 1e6 },
    { lobbying: 3e5, awardValue: 9e6 },
    { lobbying: 4e5, awardValue: 2e6 },
    { lobbying: 5e5, awardValue: 6e6 },
    { lobbying: 0, awardValue: 6e6 },
  ];
  const s = lobbyingStats(rows);
  assert.equal(s.n, 5, 'rows without lobbying are left out');
  assert.ok(s.p > 0.05 && s.p <= 1);
  assert.ok(s.r2 >= 0 && s.r2 <= 1);
  assert.equal(lobbyingStats([{ lobbying: 1, awardValue: 1 }]).r, null);
});

test('step 2 has 16 conditions in four groups; new ones start off', () => {
  assert.equal(RULE_CONDITIONS.length, 16);
  const groups = new Set(CONDITION_GROUPS.map((g) => g.id));
  for (const c of RULE_CONDITIONS) assert.ok(groups.has(c.group), `${c.id} has a group`);
  const old = ['trade_within_days', 'award_min', 'committee_oversees', 'trader_types'];
  for (const c of RULE_CONDITIONS)
    if (!old.includes(c.id)) assert.equal(c.defaultOff, true, `${c.id} starts off`);
  const insiders = visibleConditions([...CAPITOL_DATASETS, 'Form 4 insiders']);
  assert.equal(insiders.length, 16, 'every condition shows with all datasets picked');
  assert.ok(!visibleConditions(['Politician Tracker']).includes('agency_group'));
});

test('owner codes and agency groups', () => {
  assert.equal(ownerOf('SP'), 'spouse');
  assert.equal(ownerOf('Joint'), 'joint');
  assert.equal(ownerOf('DC'), 'child');
  assert.equal(ownerOf(null), 'member');
  assert.equal(agencyGroup('Department of Defense'), 'defense');
  assert.equal(agencyGroup('Department of Veterans Affairs'), 'va');
  assert.equal(agencyGroup('National Aeronautics and Space Administration'), 'nasa');
  assert.equal(agencyGroup('General Services Administration'), 'other');
});

test('new conditions narrow matches; a rule saved without them is unchanged', () => {
  const pool = [
    {
      id: 'p1',
      level: 'trade',
      ticker: 'AAA',
      member: { bioguideId: 'X000001', name: '[Member A]', party: 'D', chamber: 'house' },
      side: 'purchase',
      owner: 'spouse',
      lagDays: 50,
      tradeDate: '2026-09-01',
      amountMin: 15000,
      flaggedAt: '2026-09-01',
      awards: [
        { date: '2026-09-10', amount: 200e6, agency: 'Department of Defense', group: 'defense' },
      ],
      insiders: [{ date: '2026-09-02' }],
      ret30: 6,
    },
    {
      id: 'p2',
      level: 'trade',
      ticker: 'BBB',
      member: { bioguideId: 'X000002', name: '[Member B]', party: 'R', chamber: 'senate' },
      side: 'sale',
      owner: 'member',
      lagDays: 10,
      tradeDate: '2026-09-20',
      amountMin: 1000,
      flaggedAt: '2026-09-20',
      awards: [
        {
          date: '2026-09-10',
          amount: 200e6,
          agency: 'Department of Veterans Affairs',
          group: 'va',
        },
      ],
      insiders: [],
      ret30: -2,
    },
  ];
  const datasets = ['Politician Tracker', 'Government Contracts'];
  const legacy = {
    datasets,
    window: '90D',
    conditions: [
      { id: 'trade_within_days', value: 30, enabled: true },
      { id: 'award_min', value: 100e6, enabled: true },
    ],
  };
  assert.equal(matchSignalRule(legacy, pool, { today: TODAY }).count, 2);
  const withCond = (c) => ({
    ...legacy,
    conditions: [...legacy.conditions, { ...c, enabled: true }],
  });
  const n = (c) => matchSignalRule(withCond(c), pool, { today: TODAY }).count;
  assert.equal(n({ id: 'trade_timing', value: 'before' }), 1);
  assert.equal(n({ id: 'trade_timing', value: 'after' }), 1);
  assert.equal(n({ id: 'trade_side', value: 'sell' }), 1);
  assert.equal(n({ id: 'owner', value: ['spouse', 'joint'] }), 1);
  assert.equal(n({ id: 'disclosure_lag', value: 45 }), 1);
  assert.equal(n({ id: 'return_floor', value: 5 }), 1);
  assert.equal(n({ id: 'agency_group', value: ['va'] }), 1);
  assert.equal(n({ id: 'chamber', value: 'senate' }), 1);
  assert.equal(n({ id: 'amount_floor', value: 250e3 }), 0);
  /* Disabled conditions do nothing. */
  assert.equal(
    matchSignalRule(
      {
        ...legacy,
        conditions: [...legacy.conditions, { id: 'chamber', value: 'senate', enabled: false }],
      },
      pool,
      { today: TODAY },
    ).count,
    2,
  );
});
