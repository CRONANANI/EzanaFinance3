/**
 * Company research redesign (Nov 2026): the pure helpers in
 * src/lib/research/company-research.js, plus the page wiring and token rules.
 *   node --no-warnings --test scripts/check-research-company.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TAB_TOOLS,
  analystCounts,
  analystUpsidePct,
  buildModelNarrative,
  fmtCompactMoney,
  fmtGap,
  fmtMoney,
  fmtMultiple,
  fmtSignedMoney,
  fmtSignedPct,
  largestRemainderPercents,
  median,
  parseNewsDate,
  peerRating,
  resolveTool,
  reverseDcfComparison,
  sectionForTool,
  sectionHasTools,
  sentimentBucket,
  shiftWacc,
  valuationGapPct,
  waccToDecimal,
} from '../src/lib/research/company-research.js';

test('tool picker: Models has 4 tools, Valuation 3, defaults and fallbacks', () => {
  assert.deepEqual(TAB_TOOLS.models.tools, ['dcf', 'threestatement', 'grpv', 'earnings']);
  assert.deepEqual(TAB_TOOLS.valuation.tools, ['valuation', 'comps', 'dcf']);
  assert.equal(resolveTool('models', null), 'dcf');
  assert.equal(resolveTool('models', 'grpv'), 'grpv');
  assert.equal(resolveTool('models', 'comps'), 'dcf', 'a tool the tab does not offer falls back');
  assert.equal(resolveTool('valuation', 'comps'), 'comps');
  assert.equal(resolveTool('news', 'dcf'), null);
  assert.equal(sectionHasTools('models'), true);
  assert.equal(sectionHasTools('overview'), false);
  assert.equal(sectionForTool('comps'), 'valuation');
  assert.equal(sectionForTool('grpv'), 'models');
  assert.equal(sectionForTool('nope'), null);
});

test('formats: money, compact caps, multiples, signed deltas', () => {
  assert.equal(fmtMoney(1012.344), '$1,012.34');
  assert.equal(fmtMoney(null), 'N/A');
  assert.equal(fmtSignedMoney(37.42), '+$37.42');
  assert.equal(fmtSignedMoney(-1.2), '-$1.20');
  assert.equal(fmtCompactMoney(2.19e12), '$2.19T');
  assert.equal(fmtCompactMoney(845.2e9), '$845.20B');
  assert.equal(fmtMultiple(66.44), '66.4x');
  assert.equal(fmtMultiple(-3), 'N/A', 'negative multiples are not meaningful');
  assert.equal(fmtSignedPct(4.4123, 2), '+4.41%');
  assert.equal(fmtSignedPct(-12.8), '-12.8%');
  assert.equal(fmtSignedPct(0), '0.0%');
  assert.equal(fmtGap(14.4), '+14.4% upside');
  assert.equal(fmtGap(-6.25), '-6.3% downside');
});

test('derived values are computed, never stored', () => {
  assert.ok(Math.abs(valuationGapPct(1012.34, 884.55) - 14.447) < 0.01);
  assert.ok(Math.abs(analystUpsidePct(1005.12, 884.55) - 13.63) < 0.01);
  assert.equal(valuationGapPct(100, 0), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([50.1, 38.7, 28.1, 29.4]), (29.4 + 38.7) / 2);
  assert.equal(median([null, undefined]), null);
});

test('analyst split always adds to 100 (largest remainder)', () => {
  const p = largestRemainderPercents([58, 13, 4]);
  assert.deepEqual(p, [78, 17, 5], 'ties go to the larger count');
  assert.equal(
    p.reduce((a, b) => a + b, 0),
    100,
  );
  for (const counts of [
    [1, 1, 1],
    [2, 2, 3],
    [10, 0, 0],
    [33, 33, 34],
  ]) {
    assert.equal(
      largestRemainderPercents(counts).reduce((a, b) => a + b, 0),
      100,
    );
  }
  assert.deepEqual(largestRemainderPercents([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(analystCounts({ strongBuy: 20, buy: 38, hold: 13, sell: 3, strongSell: 1 }), {
    buy: 58,
    hold: 13,
    sell: 4,
  });
  assert.equal(analystCounts({ strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 }), null);
});

test('peer rating: +/-15% band around the peer median', () => {
  assert.equal(peerRating(66.4, 34.05), 'premium');
  assert.equal(peerRating(28.1, 34.05), 'discount');
  assert.equal(peerRating(36, 34.05), 'inline');
  assert.equal(peerRating(null, 34), null);
});

test('reverse DCF wording is computed (fixes the mock: 31.5 vs 34.0 is below)', () => {
  assert.equal(reverseDcfComparison(31.5, 34.0), 'below');
  assert.equal(reverseDcfComparison(36.2, 34.0), 'above');
  assert.equal(reverseDcfComparison(34.8, 34.0), 'in line with');
  assert.equal(reverseDcfComparison(33.0, 34.0), 'in line with', 'exactly 1.0 pt is in line');
  assert.equal(reverseDcfComparison(null, 34), null);
});

test('WACC shift moves the blended rate by exactly the delta', () => {
  const a = { costOfEquity: 0.1, costOfDebt: 0.05, taxRate: 0.2 };
  const b = shiftWacc(a, 0.01);
  const we = 0.7;
  const wd = 0.3;
  const wacc = (x) => we * x.costOfEquity + wd * x.costOfDebt * (1 - x.taxRate);
  assert.ok(Math.abs(wacc(b) - wacc(a) - 0.01) < 1e-12);
  assert.equal(shiftWacc(a, 0), a);
  assert.equal(waccToDecimal(9.04), 0.0904);
  assert.equal(waccToDecimal(0.09), 0.09);
  assert.equal(waccToDecimal(null), null);
});

test('news: sentiment buckets and Alpha Vantage dates', () => {
  assert.equal(sentimentBucket('Somewhat-Bullish'), 'Positive');
  assert.equal(sentimentBucket('Bearish'), 'Negative');
  assert.equal(sentimentBucket('Neutral'), 'Neutral');
  assert.equal(sentimentBucket(''), null);
  assert.equal(parseNewsDate('20250127T153000').toISOString(), '2025-01-27T15:30:00.000Z');
  assert.equal(parseNewsDate(1737991800).toISOString(), '2025-01-27T15:30:00.000Z');
  assert.equal(parseNewsDate('nope'), null);
});

test('narrative quotes the same numbers as the panels', () => {
  const n = buildModelNarrative({
    ticker: 'NVDA',
    fairValue: 1012.34,
    price: 884.55,
    impliedGrowthPct: 31.5,
    baseGrowthPct: 34,
    pe: 66.4,
    peerMedianPe: median([50.1, 38.7, 28.1, 29.4]),
  });
  assert.match(n.summary, /\$1,012\.34/);
  assert.match(n.summary, /14\.4% above the current price of \$884\.55/);
  assert.match(n.reverse, /31\.5% annual revenue growth/);
  assert.match(n.reverse, /which is below the base case of 34\.0%/);
  assert.equal(n.findings.length, 3);
  assert.match(n.findings[0], /\+14\.4% upside/);
  assert.match(n.findings[2], /66\.4x P\/E versus a 34\.0x peer median/);
  assert.equal(n.rating, 'premium');

  const partial = buildModelNarrative({ ticker: 'X', fairValue: null, price: 10 });
  assert.equal(partial.summary, null);
  assert.equal(partial.reverse, null);
  assert.deepEqual(partial.findings, []);
});

test('wiring and token discipline', () => {
  const page = fs.readFileSync('src/app/(dashboard)/company-research/page.js', 'utf8');
  const dir = 'src/components/research/company';
  const files = fs.readdirSync(dir).map((f) => [f, fs.readFileSync(`${dir}/${f}`, 'utf8')]);
  for (const [name, src] of [['page', page], ...files]) {
    assert.ok(!src.includes(String.fromCharCode(8212)), `${name}: em dash`);
    assert.doesNotMatch(src, /lucide-react|@nivo|Math\.random/, `${name}: stack rules`);
    if (name !== 'page')
      assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${name}: hex colour`);
  }
  assert.doesNotMatch(page, /crx-tools-row|renderTools/, 'global tools band removed');
  assert.doesNotMatch(page, /AI-powered/, 'subtitle no longer says AI-powered');
  assert.match(page, /useCompanyResearch\(selectedStock\)/);
  assert.match(page, /<ToolPicker section=\{section\}/);
  assert.match(page, /sp\.set\('tool', want\)/, 'tool mirrored to the URL');
  const css = files.find(([f]) => f === 'research-company.css')[1];
  assert.match(css, /\.rc-rating--discount \{[^}]*--info/, 'Discount uses the info tone');
  assert.doesNotMatch(css, /\.rc-rating--discount \{[^}]*--negative/, 'Discount is never red');
  assert.match(css, /@container \(max-width: 360px\)/, 'PEG drops on narrow cards');
  const panel = fs.readFileSync('src/components/research/dcf/ReverseDCFPanel.jsx', 'utf8');
  assert.match(panel, /from '@\/lib\/research\/reverse-dcf'/, 'one reverse DCF solver');
});
