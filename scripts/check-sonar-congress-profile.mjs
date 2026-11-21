/**
 * The congressional profile report (Nov 21 2026): a quick ping about one member of Congress
 * renders the one-page profile inside the universal Sonar shell, and every figure on it
 * comes from the member dossier. Pins the pure helpers and the wiring.
 *   npm run test:sonar-congress-profile
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const C = await import('@/lib/sonar/congress-profile');
const L = await import('@/lib/sonar/exemplary/layouts');
const AC = await import('@/lib/sonar/answer-charts');
const W = await import('@/lib/sonar/workspace');
const LP = await import('@/lib/sonar/landing-politician');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const months = Array.from({ length: 36 }, (_, i) => {
  const y = 2023 + Math.floor((i + 11) / 12);
  const m = ((i + 11) % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
});
const series = months.map((_, i) => 40e6 + i * 400000);
const dossier = {
  kind: 'politician',
  name: 'Nancy Pelosi',
  holdings: [{ ticker: 'AB', share: 0.158 }],
  series,
  seriesMonths: months,
  recentTrades: [{ member: 'WBD' }],
  committees: [],
  similar: [{ name: 'James Comer', sharedCount: 3, shared: ['AAPL', 'AMZN', 'AVGO'] }],
  buys12m: [
    { ticker: 'INTC', count: 3, min: 250001, max: 6500000 },
    { ticker: 'BE', count: 2, min: 500001, max: 6000000 },
  ],
  sells12m: [{ ticker: 'AAPL', count: 1, min: 10000001, max: 50000000 }],
};

test('last name: suffixes and commas carry no identity', () => {
  assert.equal(C.lastNameOf('Nancy Pelosi'), 'Pelosi');
  assert.equal(C.lastNameOf('Gilbert Ray Cisneros, Jr.'), 'Cisneros');
  assert.equal(C.lastNameOf('John Smith III'), 'Smith');
  assert.equal(C.lastNameOf(''), '');
});

test('follow-ups: only what the dossier can answer, at most three, on the subject', () => {
  const qs = C.politicianFollowUps(dossier, [
    'Does the REOF activity indicate real estate allocation?',
    'What did Pelosi sell in December?',
  ]);
  assert.equal(qs.length, 3);
  assert.equal(qs[0], "What are Nancy Pelosi's largest estimated current holdings?");
  assert.match(qs[1], /Pelosi's disclosed portfolio changed over the last year/);
  assert.match(qs[2], /recent disclosed trades/);
  /* No committee seats: no committee question. Off-subject related questions never appear. */
  assert.ok(!qs.some((q) => /committee/i.test(q)));
  assert.ok(!C.politicianFollowUps(dossier, ['REOF?'], { max: 9 }).some((q) => /REOF/.test(q)));
  /* A related question that names the member fills space the dossier leaves. */
  const thin = { kind: 'politician', name: 'Nancy Pelosi' };
  assert.deepEqual(C.politicianFollowUps(thin, ['What did Pelosi sell in December?']), [
    'What did Pelosi sell in December?',
  ]);
  assert.deepEqual(C.politicianFollowUps({ kind: 'company', name: 'Apple' }), []);
  assert.deepEqual(C.politicianFollowUps(null), []);
});

test('trading lean: purchases against sales at range midpoints, never a forecast', () => {
  const lean = C.tradingLean(dossier);
  const buy = (250001 + 6500000) / 2 + (500001 + 6000000) / 2;
  const sell = (10000001 + 50000000) / 2;
  assert.equal(Math.round(lean.buy), Math.round(buy));
  assert.equal(Math.round(lean.sell), Math.round(sell));
  assert.ok(Math.abs(lean.score - (buy - sell) / (buy + sell)) < 1e-9);
  assert.equal(lean.label, 'Strong net selling');
  assert.equal(lean.buys, 5);
  assert.equal(lean.sells, 1);
  assert.equal(C.tradingLean({ buys12m: [], sells12m: [] }), null);
  assert.equal(C.tradingLean({ buys12m: [{ min: 1001, max: 15000 }] }).label, 'Strong net buying');
  /* An open-ended band ($50M+) counts at its floor. */
  assert.equal(C.tradingLean({ sells12m: [{ min: 50000001, max: null }] }).sell, 50000001);
});

test('series change and month axis come from the series itself', () => {
  const ch = C.seriesChange(series, 12);
  assert.equal(ch.to, series[35]);
  assert.equal(ch.from, series[23]);
  assert.ok(Math.abs(ch.pct - ((series[35] - series[23]) / series[23]) * 100) < 1e-9);
  assert.equal(C.seriesChange(series.slice(0, 5), 12), null);
  assert.equal(C.seriesChange([0, ...series.slice(0, 12)], 12), null);
  assert.equal(C.monthLabel('2025-01'), "Jan '25");
  const ax = C.chartAxis(months, 6);
  assert.equal(ax[0].i, 0);
  assert.equal(ax[ax.length - 1].i, months.length - 1);
  assert.ok(ax.length <= 6);
  assert.deepEqual(C.chartAxis(['2025-01'], 6), []);
});

test('money is compact with two decimals; missing is N/A', () => {
  assert.equal(C.usdCompact(52210000), '$52.21M');
  assert.equal(C.usdCompact(850000), '$850.00K');
  assert.equal(C.usdCompact(null), 'N/A');
});

test('news: one list, alternating columns, deduplicated, empty columns skipped', () => {
  const rows = C.newsRows(
    [
      { items: [] },
      {
        items: [
          { url: 'a', title: 'A' },
          { url: 'b', title: 'B' },
          { url: 'c', title: 'C' },
        ],
      },
      {
        items: [
          { url: 'a', title: 'A again' },
          { url: 'd', title: 'D' },
        ],
      },
    ],
    4,
  );
  assert.deepEqual(
    rows.map((r) => r.url),
    ['a', 'b', 'd', 'c'],
  );
  assert.deepEqual(C.newsRows(null), []);
});

test('sections: only the ones the report renders', () => {
  assert.deepEqual(C.congressSections({ dossier, takeaways: ['a', 'b'], sourceCount: 5 }), [
    'answer',
    'findings',
    'charts',
    'sources',
  ]);
  assert.deepEqual(C.congressSections({ dossier: { kind: 'politician' } }), ['answer']);
});

test('periods: 1Y, 3Y, 5Y, 10Y and all time, in a fixed order', () => {
  const keys = (n) => C.seriesPeriods(n).map((p) => `${p.key}${p.available ? '' : '-'}`);
  assert.deepEqual(keys(36), ['1Y', '3Y', '5Y-', '10Y-', 'ALL TIME']);
  assert.deepEqual(keys(150), ['1Y', '3Y', '5Y', '10Y', 'ALL TIME']);
  assert.deepEqual(C.seriesPeriods(1), []);
  const one = C.sliceSeries(series, months, { key: '1Y', months: 12 });
  assert.equal(one.series.length, 13);
  assert.equal(one.months[12], months[35]);
  const all = C.seriesPeriods(36).at(-1);
  assert.equal(C.sliceSeries(series, months, all).series.length, 36);
});

test('key findings: the full brief beyond the summary, never repeating it', () => {
  const summary = [
    'Nancy Pelosi disclosed 27 trades in the past 12 months, with activity concentrated in technology and energy stocks [S1].',
  ];
  const brief = [
    'Nancy Pelosi disclosed 27 trades in the past 12 months, with activity concentrated in technology and energy stocks [S1].',
    'Ezana estimates her open portfolio at approximately $52.2M across 29 positions [S5]. The pattern reflects concentration in semiconductors and enterprise software.',
    'Members whose trading overlaps most include Matt Van Epps and James Comer [S7].',
  ];
  const f = C.briefFindings(brief, summary);
  assert.equal(f.length, 3);
  assert.ok(!f.some((x) => x.startsWith('Nancy Pelosi disclosed 27 trades')), 'no repeat');
  assert.match(f[0], /\$52\.2M across 29 positions \[S5\]\.$/);
  /* Takeaways fill in when the brief adds fewer than two. */
  assert.deepEqual(
    C.briefFindings(brief.slice(0, 1), summary, [
      'A new point about Intel buying.',
      'Another point about sales.',
    ]),
    ['A new point about Intel buying.', 'Another point about sales.'],
  );
});

test('trading lean bullets: bought, sold, net and latest filing, from the dossier', () => {
  const d = {
    ...dossier,
    recentTrades: [{ member: 'WBD', type: 'sale', range: '$50K–$100K', date: '2026-10-07' }],
  };
  const b = C.leanBullets(d);
  assert.equal(b.length, 4);
  assert.match(b[0], /^Bought: 5 purchases worth about \$6\.63M, led by INTC \(3 trades\)\.$/);
  assert.match(b[1], /^Sold: 1 sale worth about \$30\.00M, led by AAPL \(1 trade\)\.$/);
  assert.match(
    b[2],
    /Sales outweighed purchases by about \$23\.37M, so the lean reads strong net selling\./,
  );
  assert.equal(b[3], 'Latest filing: a sale of WBD ($50K–$100K) on 2026-10-07.');
  assert.deepEqual(C.leanBullets({}), []);
});

test('disclosed volume by period: the tracker measure, so the header changes with the period', () => {
  const ms = ['2024-01', '2025-06', '2026-10', '2026-11'];
  const v = LP.monthlyVolume(
    [
      { transaction_date: '2024-01-15', type: 'purchase', amount_mid: 8000 },
      { transaction_date: '2025-06-02', type: 'sale_partial', amount_mid: 32500 },
      { transaction_date: '2026-10-07', type: 'sale', amount_mid: 75000 },
      { transaction_date: '2026-11-03', type: 'purchase', amount_mid: 250000 },
      { transaction_date: '2019-01-01', type: 'purchase', amount_mid: 1 },
    ],
    ms,
  );
  assert.deepEqual(v.total, [8000, 32500, 75000, 250000]);
  assert.deepEqual(v.buy, [8000, 0, 0, 250000]);
  assert.deepEqual(v.sell, [0, 32500, 75000, 0]);
  assert.deepEqual(v.count, [1, 1, 1, 1]);
  assert.deepEqual(C.periodVolume(v, 2), { total: 325000, buy: 250000, sell: 75000, count: 2 });
  assert.deepEqual(C.periodVolume(v, 4), { total: 365500, buy: 258000, sell: 107500, count: 4 });
  assert.notDeepEqual(C.periodVolume(v, 1), C.periodVolume(v, 4));
  assert.equal(C.periodVolume(null, 12), null);
  const rep = read('src/components/sonar/congress/CongressProfileReport.jsx');
  assert.match(rep, /Disclosed volume, \$\{periodName\}/);
});

test('exemplary layout: a member of Congress gets the approved rows, in order', () => {
  const lay = L.exemplaryLayoutFor({ dossier: { kind: 'politician' } });
  assert.equal(lay.slug, 'congress-member-profile');
  assert.deepEqual(lay.rows, [
    ['desk'],
    ['portfolio', 'findings', 'lean'],
    ['similar', 'news', 'positions'],
  ]);
  for (const row of lay.rows) for (const k of row) assert.ok(L.LAYOUT_CARDS[k], k);
  assert.equal(L.exemplaryLayoutFor({ dossier: { kind: 'company' } }), null);
  assert.equal(L.exemplaryLayoutFor(null), null);
});

test('composer context: charts carry the numbers on screen; photos are checked by bytes', () => {
  const charts = AC.answerCharts({ dossier });
  assert.equal(charts.length, 2);
  assert.match(charts[0].text, /no market prices applied/);
  assert.ok(charts[0].text.includes(months[35]));
  assert.match(charts[1].text, /AB: 15\.8%/);
  assert.deepEqual(AC.answerCharts({}), []);
  assert.equal(W.checkImage({ name: 'a.png', type: 'image/png', size: 10 }).ok, true);
  assert.equal(W.checkImage({ name: 'a.svg', type: 'image/svg+xml', size: 10 }).ok, false);
  assert.equal(W.checkImage({ name: 'a.png', type: 'image/png', size: 5e6 }).ok, false);
  assert.equal(W.imageKindOfBytes([0x89, 0x50, 0x4e, 0x47]), 'png');
  assert.equal(W.imageKindOfBytes([0xff, 0xd8, 0xff, 0xe0]), 'jpeg');
  assert.equal(W.imageKindOfBytes([0x25, 0x50, 0x44, 0x46]), null);
});

test('wiring: the ping board, the report, the shell and the composer', () => {
  const pb = read('src/components/landing/SonarPingBoard.jsx');
  assert.match(pb, /const layout = lead \? null : exemplaryLayoutFor\(live\)/);
  assert.match(pb, /rows=\{layout\.rows\}/);
  assert.match(pb, /<CongressProfileReport/);
  assert.match(pb, /workspaceTools\(/);
  assert.match(pb, /politicianFollowUps\(live\.dossier, live\?\.related\)/);
  const rep = read('src/components/sonar/congress/CongressProfileReport.jsx');
  for (const id of ['sa-answer', 'sa-findings', 'sa-charts'])
    assert.ok(rep.includes(`id="${id}"`), id);
  assert.match(rep, /\{dossier\.name\} portfolio\n/);
  assert.ok(!/portfolio analytics/i.test(rep), 'no "analytics" in the card title');
  assert.ok(!rep.includes('—'), 'no em dash');
  assert.ok(!/Math\.random/.test(rep));
  const css = read('src/components/sonar/congress/congress-profile-report.css');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'no hex');
  assert.match(css, /\.cpr \.cpr-headline \{[^}]*white-space: nowrap/);
  const borders = [
    ...css.matchAll(/(?:^|[\s;{])border(?:-(?!radius|collapse)[a-z-]+)?\s*:\s*([^;]+);/gm),
  ].map((m) => m[1].trim());
  assert.ok(
    borders.every((v) => v === '0' || v === 'none'),
    `no outlines (${borders.join(', ')})`,
  );
  const frame = read('src/components/sonar/SonarAnswerFrame.jsx');
  assert.match(frame, /deepState/);
  assert.match(frame, /<SonarToolsRow items=\{tools\} \/>/);
  assert.match(frame, /san-topline/, 'composer and tools share one top line');
  for (const f of [
    'src/components/landing/SonarPingBoard.jsx',
    'src/components/landing/SonarCountryBoard.jsx',
    'src/components/sonar/research/ResearchBoard.jsx',
  ]) {
    const src = read(f);
    assert.match(src, /queryBar=\{queryBar\}/, f);
    assert.match(src, /followUps=\{<SonarRelatedQuestions/, f);
  }
  assert.ok(!/san-rail/.test(frame.split('{rail ?')[0]), 'no right rail column before the answer');
  const fcss = read('src/components/sonar/sonar-answer-frame.css');
  assert.ok(!/overflow-y: auto/.test(fcss), 'no nested scroll in the contents menu');
  assert.match(
    fcss,
    /box-shadow: inset 2px 0 0 var\(--san-emerald\)/,
    'Echo-style current section',
  );
  assert.ok(!/Read the full brief/.test(rep), 'no expander repeating the summary');
  assert.match(rep, /Key findings/);
  assert.match(rep, /'All time'/);
  const tcss = read('src/components/sonar/sonar-tools-row.css');
  assert.ok(
    !/animation:\s*stl-in/.test(tcss),
    'no entrance animation (the live band pauses it at opacity 0)',
  );
  const qcss = read('src/components/sonar/sonar-answer-query-bar.css');
  assert.ok(!/animation:\s*sqb-in/.test(qcss), 'no paused menu animation');
  assert.match(qcss, /min-height: 40px/, 'the composer matches the tools row height');
  assert.ok(!/free ping/.test(rep), 'no pings-left line');
  assert.match(rep, /meta=\{actions\}/, 'Save sits at the top right of the desk summary');
  const sds = read('src/components/sonar/SonarDeskSummary.jsx');
  assert.ok(!/MODE_LABEL/.test(sds), 'no "Quick ping" line on any desk summary');
  const tools = read('src/components/sonar/SonarToolsRow.jsx');
  assert.ok(!/stl-sum/.test(tools), 'tool headers carry no summary line');
  assert.match(tools, /'Research controls'/);
  assert.match(tools, /'Evidence and sources'/);
  assert.match(tools, /'Next steps'/);
  const bar = read('src/components/sonar/SonarAnswerQueryBar.jsx');
  assert.match(bar, /Add photos/);
  assert.match(bar, /Saved EzanaQL queries/);
  assert.ok(!/model selector|modelId|effort/i.test(bar.replace(/no model selector/i, '')));
  const rel = read('src/components/sonar/SonarDeskSummary.jsx');
  assert.ok(!/bi-stars/.test(rel), 'no star icon on the follow-ups');
  const cat = read('src/components/datasets/CategoryBar.jsx');
  assert.ok(!/Search the datasets with Sonar/.test(cat), 'no search icon in the bar');
  assert.match(cat, /dscat-logo--center/);
});
