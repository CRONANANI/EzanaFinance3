/**
 * Ezana Echo home: bento packing, feed filters, URL round-trip and the Chart
 * of the Week extractor. Run directly:
 *   node scripts/check-echo-home.mjs   (wired as `npm run test:echo-home`)
 * Self-contained node:test file per docs/decisions/004-node-test-check-scripts.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { packPage, packTiles, PAGE_SIZE } from '../src/lib/echo/bento-layout.js';
import {
  DEFAULT_FILTERS,
  emptyMessage,
  filterStories,
  filtersToSearch,
  isDefaultFilters,
  mostRead,
  parseFilters,
  shortDate,
  toStory,
} from '../src/lib/echo/home-feed.js';
import {
  CHART_OF_THE_WEEK,
  buildChartOfTheWeek,
  chartFromFigure,
} from '../src/lib/echo/chart-of-the-week.js';

// ── packing (the handoff's tests, unchanged) ───────────────────────────────
const story = (id, extra = {}) => ({
  id,
  title: `Story ${id}`,
  section: 'crypto',
  date: 'AUG 20',
  mins: 8,
  image: `/img/${id}.jpg`,
  dek: `Dek ${id}`,
  ...extra,
});
const ten = () => Array.from({ length: 10 }, (_, i) => story(i + 1));
const chart = { takeaway: 'x', sourceTitle: 'y', href: '#', series: [] };

test('page 1 with a chart yields 11 tiles in pattern order', () => {
  const tiles = packPage(ten(), { page: 1, chart });
  assert.equal(tiles.length, 11);
  assert.deepEqual(
    tiles.map((t) => t.kind),
    [
      'feature',
      'image',
      'text',
      'chart',
      'image',
      'image',
      'image',
      'text',
      'dark',
      'image',
      'image',
    ],
  );
});

test('without a chart the chart slot is dropped', () => {
  const tiles = packPage(ten(), { page: 1, chart: null });
  assert.equal(tiles.length, 10);
  assert.ok(!tiles.some((t) => t.kind === 'chart'));
});

test('pages after the first never carry a chart', () => {
  assert.ok(!packPage(ten(), { page: 2, chart }).some((t) => t.kind === 'chart'));
});

test('feature takes the first story with an image and keeps the rest in order', () => {
  const s = ten();
  s[0].image = null;
  s[1].image = null;
  const tiles = packPage(s, { page: 1 });
  assert.equal(tiles[0].kind, 'feature');
  assert.equal(tiles[0].story.id, 3);
  assert.deepEqual(
    tiles.slice(1, 3).map((t) => t.story.id),
    [1, 2],
  );
});

test('an image slot without an image becomes a neutral text tile', () => {
  const s = ten();
  s[1].image = null;
  const tiles = packPage(s, { page: 1 });
  assert.equal(tiles[1].kind, 'text');
  assert.equal(tiles[1].tone, 'neutral');
});

test('dark slot prefers a story with a dek', () => {
  const s = ten().map((x) => ({ ...x, dek: '' }));
  s[9].dek = 'Has a dek';
  assert.equal(packPage(s, { page: 1 }).find((t) => t.kind === 'dark').story.id, 10);
});

test('fewer stories than slots renders only what exists', () => {
  const tiles = packPage(ten().slice(0, 3), { page: 1, chart });
  assert.equal(tiles.filter((t) => t.story).length, 3);
  assert.ok(tiles.every((t) => t.story || t.kind === 'chart'));
});

test('feature with no image anywhere falls back to a text tile', () => {
  const s = ten().map((x) => ({ ...x, image: null }));
  const lead = packPage(s, { page: 1 })[0];
  assert.equal(lead.kind, 'text');
  assert.equal(lead.tone, 'lead');
  assert.deepEqual([lead.cols, lead.rows], [2, 3]);
});

test('packTiles splits into pages and keys are unique', () => {
  const all = Array.from({ length: 25 }, (_, i) => story(i + 1));
  const tiles = packTiles(all, { chart });
  assert.equal(tiles.filter((t) => t.story).length, 25);
  assert.equal(new Set(tiles.map((t) => t.key)).size, tiles.length);
  assert.equal(Math.max(...tiles.map((t) => t.page)), Math.ceil(25 / PAGE_SIZE));
});

test('exactly one dark tile per full page, at most one chart overall', () => {
  const tiles = packTiles(
    Array.from({ length: 20 }, (_, i) => story(i + 1)),
    { chart },
  );
  assert.equal(tiles.filter((t) => t.kind === 'dark' && t.page === 1).length, 1);
  assert.equal(tiles.filter((t) => t.kind === 'dark' && t.page === 2).length, 1);
  assert.equal(tiles.filter((t) => t.kind === 'chart').length, 1);
});

// ── feed model ────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-04T12:00:00Z');
const card = (id, extra = {}) => ({
  id,
  title: `Title ${id}`,
  excerpt: `Excerpt ${id}`,
  category: 'crypto',
  heroImage: { src: `/x/${id}.png`, alt: 'alt' },
  readTime: 9,
  views: 0,
  geos: ['United States'],
  tickers: [],
  tags: [],
  publishedAt: '2026-08-11T00:00:00Z',
  ...extra,
});

test('toStory maps a hub card to the tile shape', () => {
  const s = toStory(card('stablecoin-settlement-layer-2026', { tickers: ['USDC'] }));
  assert.equal(s.tag, 'Stablecoins');
  assert.equal(s.date, 'AUG 11');
  assert.equal(s.mins, 9);
  assert.equal(s.image, '/x/stablecoin-settlement-layer-2026.png');
  assert.equal(s.href, '/ezana-echo/stablecoin-settlement-layer-2026');
  assert.ok(s.searchText.includes('usdc'));
});

test('a story without a subcategory is tagged with its short section', () => {
  assert.equal(
    toStory(card('empire-rankings-1500-2026', { category: 'global-emerging' })).tag,
    'Global',
  );
});

test('shortDate is UTC and never shifts a day', () => {
  assert.equal(shortDate('2026-10-02T00:30:00Z'), 'OCT 02');
  assert.equal(shortDate(null), '');
});

test('filters combine section, region, range and search', () => {
  const stories = [
    toStory(
      card('a', { category: 'crypto', geos: ['Brazil'], publishedAt: '2026-10-01T00:00:00Z' }),
    ),
    toStory(
      card('b', {
        category: 'crypto',
        geos: ['United States'],
        publishedAt: '2026-05-01T00:00:00Z',
      }),
    ),
    toStory(card('c', { category: 'tech-founders', geos: ['Japan'], title: 'Yen carry' })),
  ];
  const ids = (f) => filterStories(stories, { ...DEFAULT_FILTERS, ...f }, NOW).map((s) => s.id);
  assert.deepEqual(ids({}), ['a', 'b', 'c']);
  assert.deepEqual(ids({ section: 'crypto' }), ['a', 'b']);
  assert.deepEqual(ids({ region: 's-america' }), ['a']);
  assert.deepEqual(ids({ range: '30d' }), ['a']);
  assert.deepEqual(ids({ range: '90d', section: 'crypto' }), ['a']);
  assert.deepEqual(ids({ q: 'yen' }), ['c']);
  assert.deepEqual(ids({ region: 'oceania' }), []);
});

test('URL round-trip omits defaults and rejects junk', () => {
  assert.equal(filtersToSearch(DEFAULT_FILTERS), '');
  assert.ok(isDefaultFilters(DEFAULT_FILTERS));
  const f = { section: 'crypto', region: 'asia', range: '7d', q: 'gold' };
  assert.deepEqual(parseFilters(new URLSearchParams(filtersToSearch(f).slice(1))), f);
  assert.deepEqual(
    parseFilters(new URLSearchParams('section=nope&region=mars&range=5y')),
    DEFAULT_FILTERS,
  );
});

test('empty message names the filters and suggests a wider range only when there is one', () => {
  assert.equal(
    emptyMessage({ section: 'crypto', region: 'oceania', range: '7d', q: '' }),
    'No stories in Crypto in Oceania for the last 7 days. Try a wider range.',
  );
  assert.ok(!emptyMessage({ ...DEFAULT_FILTERS, region: 'oceania' }).includes('wider'));
  assert.ok(!/—/.test(emptyMessage({ ...DEFAULT_FILTERS, q: 'x' })));
});

test('most read ranks by views and drops zero-view stories', () => {
  const s = [
    toStory(card('a', { views: 5 })),
    toStory(card('b', { views: 0 })),
    toStory(card('c', { views: 50 })),
  ];
  assert.deepEqual(
    mostRead(s).map((x) => x.id),
    ['c', 'a'],
  );
});

// ── Chart of the Week ─────────────────────────────────────────────────────
test('trajectory figures yield ordered y series', () => {
  const c = chartFromFigure({
    type: 'trajectory',
    series: [
      {
        label: 'GPFG',
        data: [
          { x: 2016, y: 2 },
          { x: 2015, y: 1 },
          { x: 2017, y: 3 },
        ],
      },
    ],
  });
  assert.deepEqual(c.series[0].points, [1, 2, 3]);
  assert.equal(c.series[0].kind, 'main');
  assert.equal(c.independent, false);
});

test('multi-axis figures scale each series independently', () => {
  const c = chartFromFigure({
    type: 'multi-axis',
    series: [
      { label: 'Volume', values: [1, 2, 3] },
      { label: 'Count', values: [100, 200, 300] },
    ],
  });
  assert.equal(c.independent, true);
  assert.deepEqual(
    c.series.map((s) => s.kind),
    ['main', 'compare'],
  );
});

test('unsupported or empty figures are not drawn', () => {
  assert.equal(chartFromFigure({ type: 'lifelines', series: [] }), null);
  assert.equal(chartFromFigure({ type: 'trajectory', series: [{ data: [{ x: 1, y: 1 }] }] }), null);
  assert.equal(chartFromFigure(null), null);
});

test('the configured pick resolves from its article by FIG. prefix', () => {
  const article = {
    slug: CHART_OF_THE_WEEK.slug,
    title: 'Twelve Funds',
    contentBlocks: [
      { type: 'paragraph', text: 'x' },
      {
        type: 'trajectory',
        figureLabel: `${CHART_OF_THE_WEEK.figure} · TWENTY THOUSAND BILLION KRONER`,
        series: [
          {
            label: 'GPFG',
            data: [
              { x: 2015, y: 7.48 },
              { x: 2026.5, y: 22.68 },
            ],
          },
        ],
      },
    ],
  };
  const c = buildChartOfTheWeek(CHART_OF_THE_WEEK, article);
  assert.equal(c.href, `/ezana-echo/${CHART_OF_THE_WEEK.slug}`);
  assert.equal(c.sourceTitle, 'Twelve Funds');
  assert.deepEqual(c.series[0].points, [7.48, 22.68]);
  assert.equal(buildChartOfTheWeek(CHART_OF_THE_WEEK, { ...article, slug: 'other' }), null);
  assert.equal(buildChartOfTheWeek(CHART_OF_THE_WEEK, { ...article, contentBlocks: [] }), null);
});
