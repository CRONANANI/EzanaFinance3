/**
 * Sonar exemplary briefs (Nov 16, 2026).
 *   npm run test:sonar-exemplary
 *
 * A hand-reviewed answer is served for the question it answers, however that
 * question is typed, and for nothing else. The brief cites every factual
 * line, carries no price data, and the page and the route are wired to it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const M = await import('@/lib/sonar/exemplary/match.js');
const X = await import('@/lib/sonar/exemplary/index.js');
const F = await import('@/lib/sonar/exemplary/freshness.js');
/* A moment while the NVIDIA brief is in date; the expiry tests move the clock. */
const FRESH = Date.parse('2026-11-16T15:00:00Z');
const { compareSeries } = await import('@/lib/sonar/market-context.js');

const brief = X.EXEMPLARY_BRIEFS.find((b) => b.slug === 'nvidia-ceo-transition-2026');
const tier = (q) => M.scoreBrief(q, brief).tier;

test('the question is served however it is typed', async () => {
  for (const q of [
    'how will jensen huangs resignation effect nvidia and the chip industry?',
    'How will Jensen Huang’s resignation affect NVIDIA and the chip industry?',
    "HOW WILL JENSEN HUANG'S RESIGNATION AFFECT NVIDIA AND THE CHIP INDUSTRY",
    'what does jensen huang stepping down mean for nvidia and chip stocks',
    'impact of jensen huang leaving nvidia on the semiconductor sector',
  ]) {
    assert.equal(tier(q), 'serve', q);
    const hit = await X.findExemplaryBrief(q, { now: FRESH });
    assert.equal(hit?.brief.slug, brief.slug, q);
    assert.equal(hit.via, 'lexical');
  }
});

test('a different question about the same event is never served', async () => {
  for (const q of [
    'why did jensen huang resign?',
    'who will replace jensen huang as nvidia ceo',
    'jensen huang net worth',
    'nvidia',
    'NVDA earnings',
  ]) {
    assert.equal(tier(q), 'none', q);
    assert.equal(await X.findExemplaryBrief(q, { now: FRESH }), null, q);
  }
});

test('the same kind of question about someone else is never served', async () => {
  for (const q of [
    'how will tim cooks resignation affect apple and the phone industry',
    'how will lisa su resignation affect amd and the chip industry',
    'how will the fed chair resignation affect the chip industry',
  ]) {
    assert.equal(tier(q), 'none', q);
  }
});

test('a borderline ping needs the embedding check and is not served without it', async () => {
  const q = 'jensen huang resignation nvidia impact';
  assert.equal(tier(q), 'borderline');
  assert.equal(await X.findExemplaryBrief(q, { now: FRESH }), null);
  /* No vector: not served. */
  assert.equal(
    await X.findExemplaryBrief(q, { embed: async () => null, getAdmin: () => ({}), now: FRESH }),
    null,
  );
  /* The table confirms the same brief: served. */
  const admin = (rows) => ({ rpc: async () => ({ data: rows, error: null }) });
  const yes = await X.findExemplaryBrief(q, {
    now: FRESH,
    embed: async () => [0.1],
    getAdmin: () => admin([{ slug: brief.slug, similarity: 0.94 }]),
  });
  assert.equal(yes?.via, 'semantic');
  /* The table names another brief, has no row, or is absent: not served. */
  for (const a of [
    admin([{ slug: 'something-else', similarity: 0.99 }]),
    admin([]),
    { rpc: async () => ({ data: null, error: { message: 'relation does not exist' } }) },
    {
      rpc: async () => {
        throw new Error('down');
      },
    },
  ]) {
    assert.equal(
      await X.findExemplaryBrief(q, { embed: async () => [0.1], getAdmin: () => a, now: FRESH }),
      null,
    );
  }
});

test('every factual line cites a listed primary source', () => {
  const ids = new Set(brief.sources.map((s) => s.id));
  assert.deepEqual([...ids], ['S1', 'S2', 'S3']);
  for (const s of brief.sources) {
    assert.match(
      s.url,
      /^https:\/\/(www\.sec\.gov|nvidianews\.nvidia\.com|investor\.nvidia\.com)\//,
    );
    assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
  }
  const cited = [
    ...brief.takeaways.flatMap((t) => t.cites),
    ...brief.timeline.flatMap((t) => t.cites),
    brief.baseline.cite,
  ];
  for (const c of cited) assert.ok(ids.has(c), `unknown citation ${c}`);
  for (const t of brief.timeline) assert.ok(t.cites.length, `${t.date} is uncited`);
  /* A takeaway is cited or labelled as interpretation, never neither. */
  for (const t of brief.takeaways) assert.ok(t.cites.length || t.note, t.title);
  assert.match(brief.verifiedAsOf, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(brief.provenance.some((p) => /Research as of/.test(p)));
});

test('a brief carries no chart points, and the page receives no matcher internals', () => {
  assert.deepEqual(Object.keys(brief.chart).sort(), [
    'benchmark',
    'defaultRange',
    'event',
    'kicker',
    'subject',
    'title',
  ]);
  const pub = X.publicBrief(brief);
  for (const k of ['variants', 'concepts', 'reviewAfter', 'expiresAt', 'expiryReason'])
    assert.ok(!(k in pub), k);
  assert.equal(pub.headline, brief.headline);
  assert.ok(X.embeddingText(brief).includes(brief.variants[0]));
  /* Both lines start at 0% on the same first session (the chart's baseline rule). */
  const rows = (start) =>
    ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'].map((date, i) => ({
      date,
      close: start * (1 + i / 10),
    }));
  const cmp = compareSeries(rows(100), rows(50), '5D');
  assert.equal(cmp.series[0].subject, 0);
  assert.equal(cmp.series[0].benchmark, 0);
  assert.equal(compareSeries([], [], '3M'), null);
});

test('the files follow the Ezana rules', () => {
  const files = [
    'src/lib/sonar/exemplary/index.js',
    'src/lib/sonar/exemplary/match.js',
    'src/lib/sonar/exemplary/briefs/nvidia-ceo-transition-2026.js',
    'src/components/sonar/exemplary/SonarExemplaryBrief.jsx',
    'src/components/sonar/exemplary/SonarExemplaryChart.jsx',
    'src/components/sonar/exemplary/sonar-exemplary-brief.css',
  ];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    assert.ok(!src.includes(String.fromCharCode(8212)), `${f}: em dash`);
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b/, `${f}: hex colour`);
    assert.doesNotMatch(src, /lucide-react/, `${f}: Bootstrap Icons only`);
    /* Nothing a reader sees names a vendor or the infrastructure. */
    if (!f.startsWith('src/lib/sonar/exemplary/index') && !f.endsWith('match.js')) {
      assert.doesNotMatch(src, /Supabase|BigQuery|Tavily|Polygon|Finnhub/, `${f}: vendor name`);
    }
  }
  const chart = fs.readFileSync(files[4], 'utf8');
  assert.match(chart, /\/api\/sonar\/market-context/);
  assert.match(chart, /No chart is drawn without real prices/);
});

test('the route serves it before anything is reserved, and the host draws it', () => {
  const route = fs.readFileSync('src/app/api/sonar/landing-query/route.js', 'utf8');
  const at = route.indexOf('findExemplaryBrief(query');
  assert.ok(at > 0 && at < route.indexOf('reservePing(admin'), 'lookup precedes the reservation');
  assert.match(route, /body\.formats\.includes\('exemplary'\)/);
  assert.match(route, /exemplary: publicBrief\(curated\.brief\)/);
  const band = fs.readFileSync('src/components/landing/SonarSection.jsx', 'utf8');
  assert.match(band, /typeof onExemplary === 'function' \? \['exemplary'\] : \[\]/);
  assert.match(band, /onExemplary\(q, data\.exemplary\)/);
  const host = fs.readFileSync('src/components/sonar/SonarExperience.jsx', 'utf8');
  assert.match(host, /onExemplary=\{showExemplary\}/);
  assert.match(host, /<SonarExemplaryBrief/);
  const sql = fs.readFileSync(
    'supabase/migrations/20261122090000_sonar_exemplary_briefs.sql',
    'utf8',
  );
  assert.match(sql, /embedding\s+vector\(384\)/);
  assert.match(sql, /match_sonar_exemplary_briefs/);
  assert.match(sql, /revoke all on public\.sonar_exemplary_briefs from anon, authenticated/);
});

test('a brief is withdrawn when its event passes, and the ping runs as live research', async () => {
  const q = 'how will jensen huangs resignation effect nvidia and the chip industry?';
  const none = new Set();
  const before = Date.parse('2026-11-17T20:59:00Z');
  const after = Date.parse('2026-11-17T21:00:00Z');
  assert.equal(F.briefFreshness(X.EXEMPLARY_BRIEFS[0], { now: before, retired: none }).fresh, true);
  const gone = F.briefFreshness(X.EXEMPLARY_BRIEFS[0], { now: after, retired: none });
  assert.deepEqual(
    [gone.fresh, gone.reason, gone.expiresAt],
    [false, 'event', '2026-11-17T21:00:00.000Z'],
  );
  assert.ok(await X.findExemplaryBrief(q, { now: before }));
  const seen = [];
  assert.equal(await X.findExemplaryBrief(q, { now: after, onStale: (i) => seen.push(i) }), null);
  assert.equal(seen[0].slug, X.EXEMPLARY_BRIEFS[0].slug);
  assert.equal(seen[0].reason, 'event');
  /* The embedding path cannot bring a withdrawn brief back. */
  const admin = { rpc: async () => ({ data: [{ slug: seen[0].slug, similarity: 0.99 }] }) };
  assert.equal(
    await X.findExemplaryBrief('what does jensen huang stepping down mean for nvidia', {
      embed: async () => [0.1],
      getAdmin: () => admin,
      now: after,
    }),
    null,
  );
});

test('review dates, retirement by slug and undated briefs', () => {
  const none = new Set();
  const b = { slug: 'x', reviewAfter: '2026-12-01' };
  const at = (iso) => F.briefFreshness(b, { now: Date.parse(iso), retired: none });
  assert.equal(at('2026-11-30T23:59:59Z').fresh, true);
  assert.deepEqual(
    [at('2026-12-01T00:00:00Z').fresh, at('2026-12-01T00:00:00Z').reason],
    [false, 'review'],
  );
  /* An exact event instant wins over the review day. */
  const e = { ...b, expiresAt: '2026-11-20T14:30:00Z' };
  assert.equal(
    F.briefFreshness(e, { now: Date.parse('2026-11-20T14:30:00Z'), retired: none }).reason,
    'event',
  );
  assert.equal(F.briefFreshness(b, { now: 0, retired: new Set(['x']) }).reason, 'retired');
  assert.deepEqual([...F.retiredSlugs({ SONAR_EXEMPLARY_RETIRED: ' a, b ,' })], ['a', 'b']);
  for (const bad of [{ slug: 'y' }, { slug: 'y', reviewAfter: 'soon' }]) {
    assert.equal(F.briefFreshness(bad, { now: 0, retired: none }).reason, 'undated');
  }
  /* Every shipped brief carries a usable date. */
  for (const brief of X.EXEMPLARY_BRIEFS) {
    assert.notEqual(
      F.briefFreshness(brief, { now: 0, retired: none }).reason,
      'undated',
      brief.slug,
    );
  }
  const route = fs.readFileSync('src/app/api/sonar/landing-query/route.js', 'utf8');
  assert.match(route, /exemplary_stale/);
});
