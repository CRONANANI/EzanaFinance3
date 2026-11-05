/**
 * Sonar government-exposure pings (Nov 4): "How dependent is Palantir on
 * government spending? Examine its federal contract history, major contract
 * recipients, revenue exposure, and recent contract activity."
 *   npm run test:sonar-gov-exposure
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { understandQuery } = await import('@/lib/sonar/understand');
const { isInflection } = await import('@/lib/sonar/understand/spell');
const { evidenceBrief, summarizeContractRows, companyEvidence, congressWindow } =
  await import('@/lib/sonar/landing-pipeline');
const { detectGovExposure, classifySegments, buildMix, exposureEvidence } =
  await import('@/lib/sonar/revenue-mix');

const Q =
  'How dependent is Palantir on government spending? Examine its federal contract history, major contract recipients, revenue exposure, and recent contract activity.';

test('a plural is not a typo, so no "Search instead for" notice', async () => {
  const u = await understandQuery(Q, {});
  assert.deepEqual(u.corrections, [], JSON.stringify(u.corrections));
  assert.equal(isInflection('contract', 'contracts'), true);
  assert.equal(isInflection('awarded', 'award'), true);
  assert.equal(isInflection('lyout', 'layout'), false);
  const typo = await understandQuery('give me a lyout of the semiconductor industry', {});
  assert.ok(typo.corrections.length > 0, 'real typos are still corrected');
});

test('no brief opens with "Here is what Sonar found"', () => {
  const marked = [
    {
      corpus: 'market',
      marker: 'S1',
      snippet:
        'Palantir Technologies Inc. (PLTR) is a listed company trading on NASDAQ Global Select, listed since 2020-09-30. Last price $171.70.',
    },
    { corpus: 'analysts', marker: 'S2', snippet: 'Consensus target $218.89.' },
    { corpus: 'contracts', marker: 'S3', snippet: 'Obligations of $1.3B in fiscal 2026.' },
  ];
  for (const b of [evidenceBrief('Palantir', marked), evidenceBrief('X', [marked[2]])]) {
    assert.ok(b && !/Here is what Sonar found/.test(b), b);
  }
  assert.match(
    evidenceBrief('Palantir', marked),
    /^Palantir Technologies Inc\. \(PLTR\) is a listed company/,
  );
});

test('a government-exposure brief answers first: identity, mix, then contracts', () => {
  const b = evidenceBrief('Palantir', [
    {
      corpus: 'market',
      marker: 'S1',
      snippet:
        'Palantir Technologies Inc. (PLTR) is a listed company trading on NASDAQ Global Select, listed since 2020-09-30. Last price $171.70, down 2.11% on the day.',
    },
    {
      corpus: 'exposure',
      marker: 'S2',
      snippet: 'Government customers were 49.6% of segment revenue.',
    },
    { corpus: 'contracts', marker: 'S3', snippet: 'Federal obligations of $1.34B in fiscal 2026.' },
    { corpus: 'analysts', marker: 'S4', snippet: 'Consensus target $218.89.' },
  ]);
  const paras = b.split('\n\n');
  assert.match(
    paras[0],
    /^Palantir Technologies Inc\. \(PLTR\) is a listed company trading on NASDAQ Global Select, listed since 2020-09-30 \[S1\]\. Government customers/,
  );
  assert.ok(!/Last price/.test(paras[0]), 'price is not in the answer paragraph');
  assert.match(paras[1], /Federal obligations/);
});

test('the ping is detected as government exposure; ordinary pings are not', () => {
  assert.equal(detectGovExposure(Q), true);
  assert.equal(detectGovExposure('How exposed is Lockheed Martin to the defense budget?'), true);
  assert.equal(detectGovExposure('aapl'), false);
  assert.equal(detectGovExposure('What are analysts saying about Nvidia?'), false);
});

const PLTR_Q = (date, period, fy, gov, com) => ({
  date,
  period,
  fiscalYear: fy,
  data: { 'Government Segment': gov, 'Commercial Segment': com },
});
const ROWS = [
  PLTR_Q('2025-03-31', 'Q1', 2025, 487e6, 397e6),
  PLTR_Q('2025-06-30', 'Q2', 2025, 553e6, 451e6),
  PLTR_Q('2025-09-30', 'Q3', 2025, 633e6, 548e6),
  PLTR_Q('2025-12-31', 'Q4', 2025, 700e6, 600e6),
  PLTR_Q('2026-03-31', 'Q1', 2026, 820e6, 720e6),
  PLTR_Q('2026-06-30', 'Q2', 2026, 950e6, 890e6),
  PLTR_Q('2026-09-30', 'Q3', 2026, 1146e6, 1168e6),
];

test('segments classify government vs the rest, and never invent a split', () => {
  const c = classifySegments({ 'Government Segment': 1146e6, 'Commercial Segment': 1168e6 });
  assert.ok(Math.abs(c.govShare - 1146 / 2314) < 1e-9);
  assert.equal(classifySegments({ iPhone: 1, Services: 2 }), null, 'no government segment, no mix');
  assert.equal(
    classifySegments({ 'Public Cloud': 1, Licenses: 2 }),
    null,
    '"public" alone is not government',
  );
  assert.equal(buildMix(ROWS.slice(0, 3), { ticker: 'PLTR' }), null, 'fewer than four quarters');
});

test('the mix series derives shares and same-quarter growth', () => {
  const m = buildMix(ROWS, { ticker: 'PLTR' });
  assert.equal(m.latest.date, '2026-09-30');
  assert.ok(Math.abs(m.latest.govYoy - (1146 / 633 - 1)) < 1e-9, 'YoY is against Q3 2025');
  assert.equal(m.yearAgo.date, '2025-09-30');
  const ev = exposureEvidence(m, { name: 'Palantir' });
  assert.equal(ev[0].corpus, 'exposure');
  assert.match(
    ev[0].snippet,
    /\$1\.15B of government segment revenue and \$1\.17B of commercial segment revenue/,
  );
  assert.match(ev[0].snippet, /49\.5% of segment revenue, against 53\.6% a year earlier/);
  assert.match(ev[1].snippet, /has fallen over the period shown/);
});

const HIST = [
  {
    fiscal_year: 2025,
    awarding_agency: 'Department of Defense',
    total_amount: 716e6,
    award_count: 156,
  },
  {
    fiscal_year: 2025,
    awarding_agency: 'Department of Homeland Security',
    total_amount: 81.2e6,
    award_count: 9,
  },
  {
    fiscal_year: 2026,
    awarding_agency: 'Department of Defense',
    total_amount: 978.4e6,
    award_count: 90,
  },
  {
    fiscal_year: 2026,
    awarding_agency: 'Department of Homeland Security',
    total_amount: 162.5e6,
    award_count: 11,
  },
  {
    fiscal_year: 2027,
    awarding_agency: 'Department of Defense',
    total_amount: 50e6,
    award_count: 2,
  },
];

test('contract obligations add every subsidiary and skip the partial year in YoY', () => {
  const c = summarizeContractRows(HIST, 'Palantir Technologies and Palantir USG', {
    entities: ['Palantir Technologies', 'Palantir USG'],
    topAwards: [
      {
        agency: 'Defense',
        piid: 'W56KGU22F0017',
        recipient: 'PALANTIR USG INC',
        obligated: 400e6,
        ceiling: 1e9,
        fy: 2026,
        signed: '2025-05-20',
      },
    ],
  });
  assert.equal(c.measure, 'obligations');
  assert.equal(c.yoy.from, 2025);
  assert.equal(c.yoy.to, 2026, 'fiscal 2027 is in progress and excluded');
  assert.ok(c.byFyAgency.some((r) => r.fy === 2026 && r.agency === 'Defense'));
  const ev = companyEvidence({ contracts: c }, { name: 'Palantir', ticker: 'PLTR' }, { gov: true });
  const text = ev.map((e) => e.snippet).join(' ');
  assert.match(text, /Palantir \(as Palantir Technologies and Palantir USG\) received/);
  assert.match(text, /in federal contract obligations/);
  assert.match(text, /\$400\.0M obligated against a \$1\.0B ceiling/);
  assert.match(text, /A ceiling is the most that could be awarded, not committed money/);
});

test('the congress lean follows its stated rule', () => {
  const series = {
    first: '2021-06-18',
    trades: [
      ['2026-01-10', 'b', 1001, 15000, 0],
      ['2026-02-10', 'b', 1001, 15000, 1],
      ['2026-03-10', 'b', 15001, 50000, 1],
      ['2026-04-10', 's', 1001, 15000, 2],
      ['2026-04-12', 'x', 1001, 15000, 2],
    ],
    members: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
  };
  const w = congressWindow(series, { now: new Date('2026-11-04T00:00:00Z') });
  assert.equal(w.buys, 3);
  assert.equal(w.sells, 1);
  assert.equal(w.lean, 'net buying', '75% purchases');
  assert.equal(w.members, 3, 'exchanges are not counted as sentiment');
});

test('UI hooks are wired, tokens only, no em dash', () => {
  const jsx = readFileSync('src/components/landing/SonarSection.jsx', 'utf8');
  assert.match(jsx, /<SonarCongressSentiment/);
  assert.match(jsx, /<SonarGovExposure dossier=\{live\.dossier\} \/>/);
  for (const f of [
    'src/components/landing/SonarCongressSentiment.jsx',
    'src/components/landing/SonarGovExposure.jsx',
    'src/components/landing/sonar-congress-sentiment.css',
    'src/components/landing/sonar-gov-exposure.css',
    'src/lib/sonar/revenue-mix.js',
    'src/app/api/cron/enrich-contract-awards/route.js',
  ]) {
    const src = readFileSync(f, 'utf8');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${f}: hex`);
    assert.ok(!src.includes('—'), `${f}: em dash`);
  }
});
