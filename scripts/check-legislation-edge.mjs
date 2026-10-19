#!/usr/bin/env node
/* Bill-to-market matcher regression check (src/lib/congress/legislation-edge.js).
   The first cases are the exact false pairs the live section showed on
   Oct 18, 2026: ceremonial House resolutions paired with Bitcoin price
   markets through the single shared word "October".
   Usage: node --no-warnings --test scripts/check-legislation-edge.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contentTokens,
  shortTitle,
  titleMatchScore,
  isLegislativeMarket,
  isMarketableBill,
  edgeConfidence,
  computeEdge,
  matchBillsToMarkets,
} from '../src/lib/congress/legislation-edge.js';

const mkt = (question, yes, extra = {}) => ({
  question,
  slug: question.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  outcomes: '["Yes", "No"]',
  outcomePrices: JSON.stringify([String(yes), String(1 - yes)]),
  volume: 1000,
  spread: 0.01,
  ...extra,
});

const WILDLIFE = {
  id: '119-hres-1628',
  type: 'hres',
  title:
    'Supporting the designation of the week beginning on October 10, 2026, as "National Wildlife Refuge Week".',
  model_probability: 0.03,
};
const CHEMISTRY = {
  id: '119-hres-1626',
  type: 'hres',
  title:
    'Supporting the designation of the week of October 18 through 24, 2026, as "National Chemistry Week".',
  model_probability: 0.03,
};
const BTC80 = mkt('Will Bitcoin dip to $80,000 October 12-18?', 0.002);
const BTC78 = mkt('Will Bitcoin dip to $78,000 October 12-18?', 0.0025);

test('dates, numbers and generic words never count as evidence', () => {
  assert.deepEqual([...contentTokens(BTC80.question)], ['bitcoin', 'dip']);
  assert.ok(contentTokens('impeaching').has('impeach'));
  assert.ok(!contentTokens(WILDLIFE.title).has('october'));
  assert.ok(!contentTokens('Will the bill pass the Senate in 2026?').size);
});

test('the Oct 18 false pairs no longer match', () => {
  assert.equal(titleMatchScore(WILDLIFE.title, BTC80.question), 0);
  assert.equal(titleMatchScore(CHEMISTRY.title, BTC78.question), 0);
  assert.deepEqual(matchBillsToMarkets([WILDLIFE, CHEMISTRY], [BTC80, BTC78]), []);
});

test('ceremonial bills and ordinary resolutions are never candidates', () => {
  assert.equal(isMarketableBill(WILDLIFE), false);
  assert.equal(isMarketableBill(CHEMISTRY), false);
  assert.equal(
    isMarketableBill({
      type: 'sres',
      title: 'A resolution commemorating the 50th anniversary of ...',
    }),
    false,
  );
  assert.equal(
    isMarketableBill({ type: 'hconres', title: 'Expressing support for the withdrawal ...' }),
    false,
  );
  assert.equal(
    isMarketableBill({ type: 'hjres', title: 'Providing for congressional disapproval ...' }),
    true,
  );
  assert.equal(isMarketableBill({ type: 'hr', title: 'NO FAKES Act of 2026' }), true);
});

test('resolutions markets do trade stay in: impeachment, censure, expulsion', () => {
  const impeach = {
    id: '119-hres-1155',
    type: 'hres',
    title:
      'Impeaching Donald J. Trump, President of the United States, for high crimes and misdemeanors.',
    model_probability: 0.03,
  };
  assert.equal(isMarketableBill(impeach), true);
  const m = mkt('Will the House vote to impeach Donald Trump before 2027?', 0.04);
  const score = titleMatchScore(impeach.title, m.question);
  assert.ok(score >= 0.5, `impeachment market should pair, score ${score}`);
  assert.equal(matchBillsToMarkets([impeach], [m]).length, 1);
});

test('only legislative markets are candidates', () => {
  assert.equal(isLegislativeMarket(BTC80.question), false);
  assert.equal(isLegislativeMarket('Cowboys vs. Packers: O/U 53.5'), false);
  assert.equal(isLegislativeMarket('Will the NO FAKES Act become law in 2026?'), true);
  assert.equal(isLegislativeMarket('Government shutdown before November 15?'), true);
});

test('a short-title phrase in the question is a full-strength match', () => {
  assert.equal(shortTitle('NO FAKES Act of 2026'), 'no fakes act');
  assert.equal(shortTitle('To amend the Internal Revenue Code of 1986 ...'), null);
  assert.equal(
    titleMatchScore('NO FAKES Act of 2026', 'Will the NO FAKES Act become law in 2026?'),
    1,
  );
  assert.equal(
    titleMatchScore('Respect NATO Allies Act', 'Will Congress pass the Respect NATO Allies Act?'),
    1,
  );
});

test('one shared distinctive word is not enough', () => {
  assert.equal(
    titleMatchScore('Romance Scam Prevention Act', 'Will Congress ban crypto scam ads?'),
    0,
  );
});

test('two shared words with a strong Dice score match below phrase strength', () => {
  const s = titleMatchScore(
    'Targeting Online Sales of Fentanyl Act',
    'Will Congress act on online fentanyl sales this year?',
  );
  assert.ok(s >= 0.5 && s < 1, `score ${s}`);
});

test('best-first assignment: the stronger pair claims a contested market', () => {
  const nofakes = {
    id: '119-hr-8915',
    type: 'hr',
    title: 'NO FAKES Act of 2026',
    model_probability: 0.03,
  };
  const weak = {
    id: '119-hr-1',
    type: 'hr',
    title: 'Digital Replica Fakes Labeling Disclosure Act',
    model_probability: 0.03,
  };
  const m = mkt('Will the NO FAKES Act become law in 2026?', 0.08);
  const pairs = matchBillsToMarkets([weak, nofakes], [m]);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].bill.id, '119-hr-8915');
});

test('confidence tiers follow the engine, net of half the spread', () => {
  assert.equal(edgeConfidence(0.05, 0.01), 'high');
  assert.equal(edgeConfidence(0.03, 0.01), 'medium');
  assert.equal(edgeConfidence(0.015, 0.01), 'low');
  assert.equal(edgeConfidence(0.012, 0.01), 'none');
  assert.equal(edgeConfidence(-0.05, 0), 'high');
});

test('edges below the display floor are withheld', () => {
  const r = computeEdge(0.03, mkt('Will the X Y Act pass?', 0.025));
  assert.equal(r.confidence, 'none');
  assert.equal(r.edge, null);
  assert.equal(r.evPct, null);
  const r2 = computeEdge(0.55, mkt('Will the X Y Act pass?', 0.3));
  assert.equal(r2.confidence, 'high');
  assert.equal(r2.edge, 0.25);
});

/* Replay of Oct 18, 2026 live data: a sample of the Polymarket politics pool
   (tag_id 2) that passes the legislative gate, against real tracked bills.
   None of these markets is about a tracked bill, so the honest answer is no
   pairs, which the section renders as its empty state. */
test("Oct 18 live replay: no false pairs from today's politics pool", () => {
  const live = [
    mkt('Will the Republicans win the Texas Senate race in 2026?', 0.385),
    mkt('Will the Democratic Party control the House after the 2026 Midterm elections?', 0.905),
    mkt('Will the Republican Party control the Senate after the 2026 Midterm elections?', 0.365),
    mkt('Will oil be below $85 on November 2 and the Republicans win the Senate?', 0.032),
    mkt('Will the Republican Party win the TX-06 House seat?', 0.9925),
    mkt('Will an independent win the Nebraska Senate race in 2026?', 0.295),
    mkt('2026 Balance of Power: D Senate, R House', 0.0085),
  ];
  const bills = [
    WILDLIFE,
    CHEMISTRY,
    {
      id: '119-hr-7147',
      type: 'hr',
      title: 'Homeland Security and Further Additional Continuing Appropriations Act, 2026.',
      model_probability: 0.98,
    },
    { id: '119-hr-7557', type: 'hr', title: 'Respect NATO Allies Act', model_probability: 0.06 },
    {
      id: '119-s-4015',
      type: 's',
      title: 'Stop Militarizing Our Streets Act of 2026',
      model_probability: 0.06,
    },
    {
      id: '119-s-3018',
      type: 's',
      title:
        'A bill to permit visiting dignitaries and service members from Taiwan to display the flag of the Republic of China.',
      model_probability: 0.3,
    },
    {
      id: '119-hres-1155',
      type: 'hres',
      title:
        'Impeaching Donald J. Trump, President of the United States, for high crimes and misdemeanors.',
      model_probability: 0.03,
    },
  ];
  assert.deepEqual(matchBillsToMarkets(bills, live), []);
});
