/**
 * Sonar query understanding (Part A) and relevance gating (Part B).
 * The four reported failures of "give me a lyout of the semiconductor
 * industry in the USA" each have a test: the typo echoed, USA read as a
 * ticker, sports markets matched on "Liberty", and no industry layout.
 * Run: npm run test:sonar-understand (wired into npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const { understandDeterministic, EXAMPLES } = await import('../src/lib/sonar/understand/index.js');
const { gateMarkets, gateNews, isSportsMarket } = await import('../src/lib/sonar/relevance.js');
const { newsHeaderTitle, bannerQuery } = await import('../src/lib/sonar/display-copy.js');

const HERO = 'give me a lyout of the semiconductor industry in the USA';
const chosen = (u) => u.entities.map((e) => `${e.kind}:${e.id}`);
const has = (u, k) => chosen(u).includes(k);

/* ── the four reported failures ── */

test('failure 1: the typo is corrected and the display string replaces the raw text', () => {
  const u = understandDeterministic(HERO);
  assert.deepEqual(u.corrections, [{ from: 'lyout', to: 'layout' }]);
  assert.equal(u.corrected, 'give me a layout of the semiconductor industry in the USA');
  assert.equal(u.display, 'Semiconductor industry in the United States');
  assert.ok(!/lyout/.test(newsHeaderTitle({ query: u.display })));
  assert.ok(!/lyout/.test(bannerQuery(u)));
});

test('failure 2: USA after "in the" is the United States, never the ticker', () => {
  const u = understandDeterministic(HERO);
  assert.ok(has(u, 'country:US'));
  assert.ok(!u.entities.some((e) => e.kind === 'ticker'));
  /* The ticker reading survives only as an alternative (the ambiguity chip). */
  const usa = u.entities.find((e) => e.kind === 'country');
  assert.ok(!usa.alternatives || usa.alternatives.every((a) => a.confidence <= 0.15));
});

test('failure 3: sports markets and name-only Liberty matches are gated out', () => {
  const u = understandDeterministic(HERO);
  const kept = gateMarkets(
    [
      { question: 'Spread: Liberty (-8.5)', category: 'Sports' },
      { question: 'Liberty Flames vs. Old Dominion: O/U 51.5', category: null },
      { question: 'Will the US impose new export controls on AI chips by June?', category: null },
      { question: 'Will semiconductor tariffs take effect in 2026?', category: 'Economics' },
    ],
    u,
  );
  assert.deepEqual(
    kept.map((m) => m.question),
    [
      'Will the US impose new export controls on AI chips by June?',
      'Will semiconductor tariffs take effect in 2026?',
    ],
  );
  assert.ok(isSportsMarket({ question: 'Spread: Liberty (-8.5)' }));
});

test('failure 4: the intent is an industry layout of US semiconductors', () => {
  const u = understandDeterministic(HERO);
  assert.equal(u.intent, 'industry_layout');
  assert.ok(has(u, 'industry:semiconductors'));
  assert.ok(has(u, 'country:US'));
});

/* ── the ten few-shot examples ── */

for (const ex of EXAMPLES) {
  test(`example: ${ex.raw}`, () => {
    const u = understandDeterministic(ex.raw);
    assert.equal(u.intent, ex.intent, `intent for "${ex.raw}"`);
    for (const k of ex.entities) assert.ok(has(u, k), `missing ${k} in ${chosen(u).join(', ')}`);
    if (ex.corrected !== ex.raw && ex.raw.toLowerCase() !== ex.corrected.toLowerCase()) {
      assert.equal(u.corrected.toLowerCase(), ex.corrected.toLowerCase());
    }
  });
}

/* ── guard rules ── */

test('LYFT and $LYV are never corrected', () => {
  const u = understandDeterministic('lyout of LYFT and $LYV');
  assert.deepEqual(
    u.corrections.map((c) => c.from),
    ['lyout'],
  );
});

for (const q of ['banks in the USA', 'banks in USA', 'banks across the US', 'U.S. banks']) {
  test(`"${q}" resolves US as a country with no ticker chosen`, () => {
    const u = understandDeterministic(q);
    assert.ok(has(u, 'country:US'), chosen(u).join(', '));
    assert.ok(!u.entities.some((e) => e.kind === 'ticker'));
  });
}

test('"USA" alone is the ticker, with the country as an alternative', () => {
  const u = understandDeterministic('USA');
  assert.ok(has(u, 'ticker:USA'));
  const t = u.entities.find((e) => e.kind === 'ticker');
  assert.ok(t.alternatives.some((a) => a.kind === 'country' && a.id === 'US'));
  assert.equal(u.ambiguities.length, 1);
});

test('"what do US funds hold" reads US as a country', () => {
  const u = understandDeterministic('what do US funds hold');
  assert.ok(has(u, 'country:US'));
  assert.ok(!u.entities.some((e) => e.kind === 'ticker'));
});

test('"IT sector" is Information Technology, not the ticker IT or Italy', () => {
  const u = understandDeterministic('IT sector');
  assert.ok(has(u, 'sector:information_technology'), chosen(u).join(', '));
  assert.ok(!u.entities.some((e) => e.kind === 'ticker' || e.kind === 'country'));
});

test('the raw query is never rendered when it differs from display', () => {
  const u = understandDeterministic(HERO);
  const title = newsHeaderTitle({ query: u.display });
  assert.equal(title, 'What is moving around “Semiconductor industry in the United States”');
  assert.equal(bannerQuery(u), 'Semiconductor industry in the United States');
  assert.ok(!title.includes(HERO));
});

/* ── news gating ── */

test('news without an entity term in the title or lead is dropped', () => {
  const u = understandDeterministic(HERO);
  const kept = gateNews(
    [
      { title: 'Liberty All-Star Equity Fund declares distribution', summary: '' },
      { title: 'US chipmakers ramp new fabs under CHIPS Act', summary: '' },
      { title: 'Markets close higher', summary: 'Semiconductor stocks led gains as Nvidia rose.' },
    ],
    u,
  );
  assert.deepEqual(
    kept.map((n) => n.title),
    ['US chipmakers ramp new fabs under CHIPS Act', 'Markets close higher'],
  );
});
