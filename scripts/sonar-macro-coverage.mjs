/**
 * Sonar macro coverage audit (Nov 2026). LIVE: reads the database with the service role.
 *
 *   node --env-file=.env.local --import ./scripts/register-sonar-loader.mjs \
 *     scripts/sonar-macro-coverage.mjs            # live: writes the snapshot, runs questions
 *   node --import ./scripts/register-sonar-loader.mjs \
 *     scripts/sonar-macro-coverage.mjs --offline  # coverage table from the committed snapshot
 *
 * 1. Writes scripts/fixtures/macro-prefixes.json: every (source, series_key prefix) held, with
 *    up to 12 sample rows (the coverage test in check-sonar-macro.mjs reads it).
 * 2. Runs the sample questions through the real readers and prints, per question, the
 *    families, sources and periods returned, and the macro leg's latency (p50 / p90).
 * 3. Prints every source with "reachable by Sonar: yes/no" and why.
 *
 * Read only. Prints no secrets.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const C = await import('../src/lib/sonar/macro/catalog.js');
const { routeMacro, isMacroRelevant } = await import('../src/lib/sonar/macro/route.js');
const { macroBrief } = await import('../src/lib/sonar/macro/series-store.js');
const { intlSanctionsEvidence } = await import('../src/lib/sonar/sanctions-intl.js');
const { ADAPTERS } = await import('../src/lib/macro-sync/index.js');
const { macroSeriesParams } = await import('../src/lib/sonar/engine/planner.js');

const OFFLINE = process.argv.includes('--offline');
const SNAPSHOT = new URL('./fixtures/macro-prefixes.json', import.meta.url);

export const QUESTIONS = [
  "Is Turkey's lira under pressure?",
  'How exposed is Germany to a Russian gas cutoff?',
  "What's happening with copper prices?",
  'Which countries produce the most crude oil?',
  'How are food prices in Kenya?',
  "What is Japan's policy rate?",
  'Highest inflation in Latin America',
  'Is household debt a risk in Canada?',
  'How has geopolitical risk changed this year?',
  'Is Rosneft sanctioned by the EU and UK?',
  'Which countries have the most UN sanctions listings?',
  'What could a Taiwan blockade mean for TSMC?',
  'Who owns Palantir?',
];

const pct = (xs, p) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null;
};

async function snapshotFromDb(db) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('macro_series_latest')
      .select('source, series_key, country_iso3, dataset, series_name, unit')
      .order('source')
      .order('series_key')
      .range(from, from + 999);
    if (error) throw new Error(`macro_series_latest: ${error.message} (run the migration first)`);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.source}|${r.series_key.split(':')[0]}`;
    if (!groups.has(k))
      groups.set(k, {
        source: r.source,
        prefix: r.series_key.split(':')[0],
        series: 0,
        samples: [],
      });
    const g = groups.get(k);
    g.series += 1;
    /* Every 7th row up to 12, so samples spread across the prefix. */
    if (g.samples.length < 12 && (g.series - 1) % 7 === 0) {
      const { source, ...rest } = r;
      g.samples.push(rest);
    }
  }
  return [...groups.values()];
}

function coverageTable(prefixes) {
  const bySource = new Map();
  for (const p of prefixes) {
    const key = `${p.source}|${p.prefix}`;
    let status;
    if (C.NOT_SURFACED[key])
      status = { reachable: false, why: `not surfaced: ${C.NOT_SURFACED[key]}` };
    else if (C.PARTLY_SURFACED[key])
      status = { reachable: true, why: `${C.PARTLY_SURFACED[key].family} (in part)` };
    else {
      const fams = [
        ...new Set(
          p.samples.map((s) => C.familyOf({ source: p.source, ...s })?.id).filter(Boolean),
        ),
      ];
      status = fams.length
        ? { reachable: true, why: fams.join(', ') }
        : { reachable: false, why: 'NO FAMILY (coverage test fails)' };
    }
    if (!bySource.has(p.source)) bySource.set(p.source, []);
    bySource.get(p.source).push({ prefix: p.prefix, series: p.series, ...status });
  }
  console.log('\nSOURCE COVERAGE (reachable by Sonar)');
  for (const id of Object.keys(ADAPTERS).sort()) {
    const list = bySource.get(id);
    if (!list) {
      console.log(`  ${id.padEnd(14)} no      no rows loaded yet`);
      continue;
    }
    const any = list.some((x) => x.reachable);
    console.log(
      `  ${id.padEnd(14)} ${any ? 'yes' : 'no '}     ${list.map((x) => `${x.prefix} [${x.why}]`).join('; ')}`,
    );
  }
}

async function runQuestions(db) {
  console.log('\nSAMPLE QUESTIONS');
  const latencies = [];
  for (const q of QUESTIONS) {
    const route = routeMacro(q);
    const t0 = Date.now();
    let items = [];
    if (isMacroRelevant(route, { text: q }))
      items = await macroBrief(db, route, { limit: 12, timeoutMs: 900 });
    if (/TSMC/.test(q)) {
      const p = macroSeriesParams({ rawQuery: q }, { countries: [] });
      items = await macroBrief(
        db,
        { ...p, families: ['geopolitical_risk', 'policy_rate', 'fx_usd', 'inflation_monthly'] },
        { timeoutMs: 900 },
      );
    }
    const ms = Date.now() - t0;
    latencies.push(ms);
    const intl = await intlSanctionsEvidence(db, { query: q, countries: [] }).catch(() => []);
    console.log(`\n  ${q}  (macro leg ${ms} ms)`);
    console.log(
      `    route: countries=${route.countries.join(',') || '-'} themes=${route.themes.join(',') || '-'} commodity=${route.commodity || '-'} ranking=${route.ranking ? `${route.ranking.family}/${route.ranking.order}${route.ranking.region ? `/${route.ranking.region}` : ''}` : '-'}`,
    );
    for (const it of items)
      console.log(
        `    ${it.meta.family.padEnd(18)} ${String(it.meta.iso3 || it.meta.scope).padEnd(10)} ${it.meta.source.padEnd(13)} ${it.meta.period}  ${it.title.slice(0, 90)}`,
      );
    for (const it of intl)
      console.log(`    ${String(it.meta.kind).padEnd(18)} ${it.text.slice(0, 160)}`);
    if (!items.length && !intl.length)
      console.log('    (no macro or international sanctions items)');
  }
  console.log(
    `\nMACRO LEG LATENCY  p50 ${pct(latencies, 0.5)} ms, p90 ${pct(latencies, 0.9)} ms (${latencies.length} questions)`,
  );
}

if (OFFLINE) {
  const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  console.log(`Offline: snapshot of ${snap.prefixes.length} prefixes (${snap.generatedAt}).`);
  coverageTable(snap.prefixes);
} else {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local), or pass --offline.',
    );
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const prefixes = await snapshotFromDb(db);
  writeFileSync(
    SNAPSHOT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        note: 'Every (source, series_key prefix) in public.macro_series_values with up to 12 sample rows. Regenerate with scripts/sonar-macro-coverage.mjs. The coverage test (npm run test:sonar-macro) requires each prefix to match a catalogue family or be listed in NOT_SURFACED.',
        prefixes,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`Wrote ${prefixes.length} prefixes to scripts/fixtures/macro-prefixes.json`);
  coverageTable(prefixes);
  await runQuestions(db);
}
