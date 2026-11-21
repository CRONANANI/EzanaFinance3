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

test('wiring: the ping board, the report and the shell', () => {
  const pb = read('src/components/landing/SonarPingBoard.jsx');
  assert.match(pb, /const congress = !lead && live\?\.dossier\?\.kind === 'politician'/);
  assert.match(pb, /<CongressProfileReport/);
  assert.match(pb, /<CongressEvidence/);
  assert.match(pb, /politicianFollowUps\(live\.dossier, live\?\.related\)/);
  const rep = read('src/components/sonar/congress/CongressProfileReport.jsx');
  for (const id of ['sa-answer', 'sa-findings', 'sa-charts', 'sa-sources'])
    assert.ok(rep.includes(`id="${id}"`), id);
  assert.ok(!rep.includes('—'), 'no em dash');
  assert.ok(!/Math\.random/.test(rep));
  const css = read('src/components/sonar/congress/congress-profile-report.css');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'no hex');
  const borders = [
    ...css.matchAll(/(?:^|[\s;{])border(?:-(?!radius|collapse)[a-z-]+)?\s*:\s*([^;]+);/gm),
  ].map((m) => m[1].trim());
  assert.ok(
    borders.every((v) => v === '0' || v === 'none'),
    `no outlines (${borders.join(', ')})`,
  );
  const frame = read('src/components/sonar/SonarAnswerFrame.jsx');
  assert.match(frame, /deepState/);
  assert.match(frame, /san-status--\$\{deepState\}/);
  const fcss = read('src/components/sonar/sonar-answer-frame.css');
  assert.ok(!/overflow-y: auto/.test(fcss), 'no nested scroll in the side navigation');
});
