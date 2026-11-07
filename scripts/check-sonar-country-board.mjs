/**
 * Sonar country answer board and resources belt (Nov 2026): the headline, the KPI tiles and
 * their sparklines, the dataset evidence rows, source coverage, the belt's resources, the
 * board's row packing, the flags, and the wiring (board on /datasets only, no borders).
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-country-board.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const B = await import('@/lib/sonar/country-board');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* A Turkey answer shaped like the live payload (Sep 2026 figures). */
const months = (n, from, step) =>
  Array.from({ length: n }, (_, i) => ({
    x: `${2024 + Math.floor((i + 9) / 12)}-${String(((i + 9) % 12) + 1).padStart(2, '0')}`,
    y: from + i * step,
  }));
const live = {
  rawQuery: "Is Turkey's lira under pressure?",
  query: "Is Turkey's lira under pressure?",
  remaining: 4,
  sources: [
    { id: 'oecd-macro', label: 'OECD Economic Outlook', used: true },
    { id: 'echo', label: 'Ezana Echo', used: true },
    { id: 'gov-contracts', label: 'Government contracts', used: false },
  ],
  evidence: [
    {
      dataset: 'sanctions',
      title: 'Turkish entity listing',
      snippet: 'Listed 2025.',
      url: 'https://example.org/x',
    },
  ],
  webSources: [{ url: 'https://www.austindailyherald.com/a', title: 'Mower County residents' }],
  newsColumns: [
    {
      title: 'Turkey economy',
      items: [
        {
          url: 'https://apa.az/n1',
          title: 'Erdogan says South Korea could partner',
          source: 'Apa.az',
        },
      ],
    },
    { title: 'Markets', items: [] },
  ],
  dossier: {
    kind: 'country',
    name: 'Turkey',
    iso3: 'TUR',
    keyIndicators: [
      {
        id: 'gdp',
        label: 'Real GDP growth',
        value: '3.70% change on previous year',
        period: '2025',
      },
      {
        id: 'cpi',
        label: 'Consumer price inflation',
        value: '29.7% on a year earlier',
        period: 'Sep 2026',
      },
    ],
    keyChart: {
      stories: [
        {
          slug: 'eo-gdpv_annpct',
          decimals: 1,
          points: [
            { year: 2021, value: 11.4 },
            { year: 2022, value: 5.5 },
            { year: 2023, value: 5.1 },
            { year: 2024, value: 3.2 },
            { year: 2025, value: 3.2 },
            { year: 2026, value: 3.4, proj: true },
          ],
        },
      ],
    },
    matches: {
      oecd: {
        area: 'TUR',
        headline: [
          {
            slug: 'eo-cpi_ytypct',
            short: 'Inflation',
            unit: '%',
            decimals: 1,
            latest: { value: 28.9, year: 2025 },
            peer: { rank: 2, of: 30 },
          },
          {
            slug: 'eo-unr',
            short: 'Unemployment',
            unit: '%',
            decimals: 1,
            latest: { value: 10.0, year: 2025 },
          },
        ],
      },
      empire: {
        rank: 10,
        of: 13,
        year: 2025,
        coverage: { present: 6, total: 8 },
        href: '/datasets/empire-rankings',
        top: [{ name: 'Infrastructure', rank: 6, of: 7, score: 65.9 }],
      },
      macro: {
        count: 8,
        publishers: [
          'Eurostat (ec.europa.eu/eurostat)',
          'International Monetary Fund, IMF Data (data.imf.org)',
        ],
      },
      echo: [
        {
          slug: 'central-banks-buying',
          title: 'Central Banks Are Buying',
          excerpt: 'Central banks bought more than 1,000 tonnes.',
        },
      ],
      markets: [
        {
          question: 'Will Turkey join the Abraham Accords before 2027?',
          probability: 0.03,
          platform: 'polymarket',
        },
      ],
    },
    intel: {
      iso3: 'TUR',
      iso2: 'TR',
      place: 'Türkiye',
      currency: { code: 'TRY', name: 'Turkish lira', short: 'lira' },
      focus: 'FX risk',
      overall: 'elevated',
      assessmentLabel: 'Elevated pressure',
      asOf: '2026-11-06',
      brief: {
        answer: "By Ezana's thresholds, pressure on the lira is elevated.",
        assessmentLine: 'TRY per US dollar, Sep 2026: 48.65.',
        drivers: [
          {
            title: 'Continued depreciation',
            text: 'TRY per USD is 48.65, up 17.7% year over year.',
          },
          { title: 'High and persistent inflation', text: '29.7% (Sep 2026).' },
        ],
        scenarios: [{ name: 'Stabilisation', conditions: 'x', implication: 'y' }],
        monitor: [{ indicator: 'Reserves', why: 'z' }],
        bottomLine: 'Pressure is elevated.',
      },
      kpis: [
        {
          id: 'fx',
          label: 'TRY per USD',
          value: '48.65',
          period: 'Sep 2026',
          change: 'dollar +17.7% in a year',
        },
        {
          id: 'inflation',
          label: 'Inflation',
          value: '29.7%',
          period: 'Sep 2026',
          change: 'falling from 33.3%',
        },
        {
          id: 'policy',
          label: 'Policy rate',
          value: '37.0%',
          period: 'Sep 2026',
          change: '-3.50 pp in a year',
        },
      ],
      rows: [{ id: 'depreciation', label: 'Exchange-rate depreciation', level: 'elevated' }],
      missing: ['sovereign CDS spreads', 'inflation expectations'],
      charts: {
        fxMonthly: { points: months(24, 30, 0.8) },
        inflation: { points: months(40, 70, -1) },
        policy: { points: months(40, 50, -0.3) },
      },
      transmission: { nodes: [{ id: 'a' }] },
      sources: [
        'Bank for International Settlements, BIS Statistics (data.bis.org)',
        'Caldara, Dario and Matteo Iacoviello (2022), "Measuring Geopolitical Risk," American Economic Review',
      ],
    },
  },
};

/* ------------------------------------------------------------------ headline */

test('the headline answers a yes/no pressure question in one word, then the level', () => {
  const intel = live.dossier.intel;
  assert.equal(
    B.boardHeadline({ intel, query: live.rawQuery }),
    'Yes. Pressure on the lira is elevated.',
  );
  assert.equal(
    B.boardHeadline({ intel, query: 'Turkish lira outlook' }),
    'Pressure on the lira is elevated.',
  );
  assert.equal(
    B.boardHeadline({ intel: { ...intel, overall: 'low' }, query: 'Is the lira weak?' }),
    'No. Pressure on the lira is low.',
  );
  /* Macro focus: the brief's first sentence. */
  assert.equal(
    B.boardHeadline({
      intel: { focus: 'Macro', brief: { answer: 'Growth slowed. Inflation fell.' } },
      query: 'x',
    }),
    'Growth slowed.',
  );
  assert.ok(!B.boardHeadline({ intel, query: live.rawQuery }).includes('—'), 'no em dash');
});

test('the executive answer body: the answer, the drivers as bullets, the detail behind a toggle', () => {
  const a = B.boardAnswer(live.dossier.intel);
  assert.equal(a.text, "By Ezana's thresholds, pressure on the lira is elevated.");
  assert.equal(a.bullets.length, 2);
  assert.equal(a.bullets[0].title, 'Continued depreciation');
  assert.equal(a.detail, 'TRY per US dollar, Sep 2026: 48.65.');
  const f = B.boardAnswer({ fallbackText: 'One.\n\nTwo.\n\nThree.' });
  assert.deepEqual([f.text, f.detail, f.bullets.length], ['One.', 'Two. Three.', 0]);
});

/* ------------------------------------------------------------------ KPI tiles */

test('four KPI tiles: rate, inflation, policy rate, then real GDP growth from the key chart', () => {
  const t = B.boardKpis(live.dossier);
  assert.deepEqual(
    t.map((x) => x.id),
    ['fx', 'inflation', 'policy', 'gdp'],
  );
  assert.equal(t[3].value, '3.2%', 'latest actual, never the projection year');
  assert.equal(t[3].period, '2025');
  assert.equal(t[3].kind, 'bars');
  assert.deepEqual(t[3].spark, [11.4, 5.5, 5.1, 3.2, 3.2]);
  assert.equal(t[2].kind, 'step');
  assert.equal(t[2].change, '−3.50 pp in a year', 'real minus sign');
  assert.ok(
    t[0].spark.length >= 2 && t[0].spark.length <= 13,
    'fx sparkline is the last year of monthly points',
  );
  assert.ok(t[1].spark.length <= 36);
  /* Without a key chart, the key indicators row supplies GDP. */
  const d2 = { ...live.dossier, keyChart: null, oecd: null };
  assert.equal(B.boardKpis(d2)[3].value, '3.70%');
});

test('sparkline geometry stays inside its box', () => {
  const line = B.sparkGeometry([1, 3, 2, 5], { w: 72, h: 28 });
  assert.match(line.d, /^M[\d.]+ [\d.]+( L[\d.]+ [\d.]+){3}$/);
  const nums = line.d.match(/[\d.]+/g).map(Number);
  assert.ok(nums.every((n) => n >= 0 && n <= 72));
  assert.match(B.sparkGeometry([1, 2], { kind: 'step' }).d, / H[\d.]+ V[\d.]+$/);
  const bars = B.sparkGeometry([2, -1, 3], { kind: 'bars', w: 60, h: 20 }).bars;
  assert.equal(bars.length, 3);
  assert.ok(bars.every((b) => b.y >= 0 && b.y + b.h <= 20.01 && b.x + b.w <= 60.01));
  assert.equal(B.sparkGeometry([1]), null);
  assert.equal(
    B.thin(
      Array.from({ length: 300 }, (_, i) => i),
      48,
    ).length,
    48,
  );
  assert.equal(
    B.thin(
      Array.from({ length: 300 }, (_, i) => i),
      48,
    ).at(-1),
    299,
    'keeps the last point',
  );
});

/* ------------------------------------------------------------------ evidence and coverage */

test('dataset evidence: one row per contributing dataset, in order, cited extras last', () => {
  const rows = B.datasetEvidence(live);
  assert.deepEqual(
    rows.map((r) => r.id),
    ['oecd-macro', 'empire', 'macro', 'echo', 'prediction-markets', 'sanctions'],
  );
  assert.equal(rows[0].href, '/datasets/oecd-macro?a=TUR');
  assert.equal(rows[0].bullets[0], 'Inflation: 28.9% (2025, 2nd of 30)');
  assert.equal(
    rows[1].summary,
    "10th of 13 on Ezana's composite, 6 of 8 dimensions scored (2025).",
  );
  assert.equal(rows[3].href, '/echo/central-banks-buying');
  assert.match(rows[4].bullets[0], /3% yes \(polymarket\)$/);
  assert.equal(rows[5].external, true);
  const all = JSON.stringify(rows);
  assert.ok(!all.includes('—'), 'no em dash');
});

test('source coverage names each dataset, the web and the news', () => {
  const c = B.sourceCoverage(live);
  assert.deepEqual(
    c.map((x) => x.id),
    ['oecd-macro', 'empire', 'macro', 'echo', 'prediction-markets', 'sanctions', 'web', 'news'],
  );
  assert.equal(c[0].detail, 'Turkey, macro (matched)');
  assert.equal(c.at(-2).detail, '1 page read');
  assert.equal(c.at(-1).detail, '1 story');
});

/* ------------------------------------------------------------------ the belt */

test('the belt lists every resource once: datasets, publishers, web, news', () => {
  const r = B.pingResources(live);
  const kinds = r.map((x) => x.kind);
  assert.equal(kinds.indexOf('dataset'), 0, 'datasets lead');
  assert.ok(kinds.lastIndexOf('dataset') < kinds.indexOf('publisher'));
  assert.ok(kinds.indexOf('publisher') < kinds.indexOf('web'));
  assert.ok(kinds.indexOf('web') < kinds.indexOf('news'));
  assert.ok(
    !r.some((x) => x.label === 'Government contracts'),
    'an unused dataset is not a source',
  );
  assert.equal(new Set(r.map((x) => x.key)).size, r.length, 'no duplicates');
  const bis = r.find((x) => /Bank for International Settlements/.test(x.label));
  assert.equal(bis.href, 'https://data.bis.org');
  assert.equal(bis.sub, 'data.bis.org');
  const gpr = r.find((x) => /Caldara/.test(x.label));
  assert.equal(gpr.href, null, 'a citation without a host is not a link');
  assert.equal(r.find((x) => x.kind === 'news').sub, 'Apa.az');
  assert.deepEqual(B.pingResources(null), []);
  assert.equal(B.pingResources(live, { max: 3 }).length, 3);
});

test('citations parse into a name and a host', () => {
  assert.deepEqual(B.parseCitation('Eurostat (ec.europa.eu/eurostat)'), {
    label: 'Eurostat',
    host: 'ec.europa.eu',
  });
  assert.deepEqual(B.parseCitation('OECD Economic Outlook.'), {
    label: 'OECD Economic Outlook',
    host: null,
  });
  assert.equal(B.parseCitation(''), null);
});

/* ------------------------------------------------------------------ layout */

test('the board packs every row edge to edge, at 12 and 6 columns', () => {
  const cells = [
    { id: 'exec', span: 7, min: 6 },
    { id: 'intel', span: 5, min: 5 },
    { id: 'breakdown', span: 6, min: 5 },
    { id: 'coverage', span: 6, min: 5 },
    { id: 'evidence', span: 7, min: 6 },
    { id: 'news', span: 5, min: 4 },
    { id: 'charts', span: 12, min: 12 },
    { id: 'map', span: 12, min: 12 },
    { id: 'story', span: 6, min: 5 },
    { id: 'indicators', span: 6, min: 5 },
    { id: 'scenarios', span: 7, min: 6 },
    { id: 'monitor', span: 5, min: 4 },
    { id: 'missing', span: 12, min: 12 },
  ];
  /* Drop any one section: the rows still close. */
  for (let drop = -1; drop < cells.length; drop++) {
    const list = cells.filter((_, i) => i !== drop);
    const spans = B.boardSpans(list);
    for (const key of ['wide', 'mid']) {
      const cols = key === 'wide' ? 12 : 6;
      let used = 0;
      for (const c of list) {
        const s = spans.get(c.id)[key];
        assert.ok(s >= 1 && s <= cols);
        used += s;
        if (used === cols) used = 0;
        assert.ok(used < cols, `${key}: a row overflows`);
      }
      assert.equal(used, 0, `${key}: the last row is full (dropped ${drop})`);
    }
  }
  const s = B.boardSpans(cells);
  assert.deepEqual(
    ['exec', 'intel'].map((id) => s.get(id).wide),
    [7, 5],
  );
  assert.deepEqual([1, 2, 3, 4].map(B.chartColumns), [1, 2, 3, 2]);
  /* A pinned mid width (the key indicators table) takes the whole 6-column row. */
  const pinned = B.boardSpans([
    { id: 'story', span: 6, min: 5, mid: 6 },
    { id: 'indicators', span: 6, min: 5, mid: 6 },
  ]);
  assert.deepEqual([pinned.get('story').mid, pinned.get('indicators').mid], [6, 6]);
  assert.deepEqual([pinned.get('story').wide, pinned.get('indicators').wide], [6, 6]);
});

/* ------------------------------------------------------------------ assets and wiring */

test('flags: the vendored set covers the codes Sonar answers for', () => {
  for (const c of ['TR', 'DE', 'US', 'GB', 'BR', 'JP', 'NG', 'ZA', 'IN', 'CN', 'AR', 'RU']) {
    assert.ok(existsSync(new URL(`../public/flags/3x2/${c}.svg`, import.meta.url)), `${c}.svg`);
  }
  assert.ok(existsSync(new URL('../public/flags/LICENSE', import.meta.url)));
  const flag = read('src/components/sonar/CountryFlag.jsx');
  assert.match(flag, /\/flags\/3x2\/\$\{code\}\.svg/);
  const pipe = read('src/lib/sonar/landing-pipeline.js');
  assert.match(pipe, /iso2: \(intel\.iso3 && countries\.alpha3ToAlpha2\(intel\.iso3\)\) \|\| null/);
});

test('board wiring: /datasets only, the belt above, no borders on any board card', () => {
  const band = read('src/components/landing/SonarSection.jsx');
  assert.match(
    band,
    /const board =\s*isPage &&\s*stage2 &&\s*answerReady &&\s*live\?\.dossier\?\.kind === 'country' &&\s*hasCountryIntel\(live\.dossier\)/,
  );
  /* Nov 6: every answer on /datasets is a board (country or ping), so the matches column
     gives way to either. */
  assert.match(band, /hasPinged && live && !anyBoard \?/);
  assert.match(band, /kind === 'country' && !board \?/);
  assert.match(band, /<SonarSourceBelt live=\{live\} \/>/);
  assert.match(band, /deepAction=\{deepAction \|\| afterAnswer\}/);

  for (const f of [
    'src/components/landing/sonar-country-board.css',
    'src/components/landing/sonar-source-belt.css',
  ]) {
    const css = read(f);
    assert.ok(!/border(-[a-z]+)?:\s*\d+px solid/.test(css), `${f}: no 1px outlines`);
    assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), `${f}: no hex`);
  }
  const board = read('src/components/landing/SonarCountryBoard.jsx');
  assert.ok(!board.includes('—'), 'no em dash in the board');
  /* The dataset cards fetch on their own; until they land (or when none match) their cell
     stays mounted but leaves the packing, so it never holds half a row open. */
  assert.match(board, /hidden: !news && !extraFilled/);
  assert.match(board, /boardSpans\(cells\.filter\(\(c\) => !c\.hidden\)\)/);
  assert.match(
    read('src/components/landing/sonar-country-board.css'),
    /\.snr-bd-cell\[hidden\]\s*\{\s*display: none;/,
  );
  const belt = read('src/components/landing/SonarSourceBelt.jsx');
  assert.match(belt, /aria-pressed=\{paused\}/, 'the belt has a pause control');
  assert.match(
    read('src/components/landing/sonar-source-belt.css'),
    /prefers-reduced-motion: reduce/,
  );
});
