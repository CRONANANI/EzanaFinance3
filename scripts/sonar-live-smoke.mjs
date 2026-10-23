/**
 * Sonar live smoke (sonar-ezanaql-coverage-prompt.md Step 9): 25 real
 * EzanaQL queries against production data — one per live dataset, the key
 * pairs, and the hero ping — saved as JSON for review, with per-ping
 * latency. Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY;
 * without them it exits 0 with a note (CI and the sandbox have no keys).
 *
 * Run: node --import ./scripts/register-sonar-loader.mjs scripts/sonar-live-smoke.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('[sonar-live-smoke] no Supabase env; skipping (run where the keys exist).');
  process.exit(0);
}

const { getAdminClient } = await import('../src/lib/supabase/index.js');
const { runEzanaQL } = await import('../src/lib/ezanaql/index.js');
const { parse } = await import('../src/lib/ezanaql/parser.js');
const { fromEzanaQL } = await import('../src/lib/sonar/cluster.js');
const { runSonarCluster } = await import('../src/lib/sonar/pipeline.js');
const { routeQuery } = await import('../src/lib/sonar/router.js');
const { getTemplate } = await import('../src/lib/sonar/templates.js');
const { runSweeps } = await import('../src/lib/sonar/sweeps.js');

const QUERIES = [
  'FROM gov.contracts ORDER BY award_value DESC LIMIT 25',
  'FROM capitol.congress_trades ORDER BY transaction_date DESC LIMIT 25',
  'FROM capitol.holdings ORDER BY est_value DESC LIMIT 25',
  'FROM capitol.lobbying ORDER BY amount DESC LIMIT 25',
  'FROM capitol.committee_seats LIMIT 50',
  'FROM capitol.campaign_finance ORDER BY receipts DESC LIMIT 25',
  'FROM prediction.markets ORDER BY volume DESC LIMIT 25',
  'FROM titans.holdings_13f ORDER BY filed_on DESC LIMIT 25',
  'FROM titans.activist_stakes ORDER BY filed_on DESC LIMIT 25',
  'FROM titans.whale_moves ORDER BY value DESC LIMIT 25',
  'FROM lighthouse.oecd WHERE year >= 2024 LIMIT 50',
  'FROM eyes.chokepoints ORDER BY date DESC LIMIT 25',
  'FROM eyes.ports ORDER BY date DESC LIMIT 25',
  'FROM eyes.patents ORDER BY patent_date DESC LIMIT 25',
  'FROM house.filings ORDER BY filing_date DESC LIMIT 25',
  'FROM gov.contracts SEMI JOIN capitol.congress_trades ON ticker ORDER BY award_value DESC LIMIT 25',
  'FROM capitol.congress_trades SEMI JOIN gov.contracts ON ticker ORDER BY transaction_date DESC LIMIT 25',
  'FROM capitol.congress_trades SEMI JOIN capitol.committee_seats ON bioguide_id LIMIT 50',
  'FROM titans.holdings_13f SEMI JOIN titans.activist_stakes ON filer_cik LIMIT 50',
  'FROM capitol.holdings SEMI JOIN gov.contracts ON ticker LIMIT 50',
  'FROM titans.whale_moves SEMI JOIN capitol.congress_trades ON ticker LIMIT 50',
  'FROM eyes.patents SEMI JOIN gov.contracts ON ticker LIMIT 50',
  'FROM capitol.campaign_finance SEMI JOIN capitol.committee_seats ON bioguide_id LIMIT 50',
  'FROM capitol.lobbying ORDER BY posted_on DESC LIMIT 25',
];

const admin = getAdminClient();
mkdirSync('docs/sonar/smoke', { recursive: true });
const latencies = [];

for (const [i, q] of QUERIES.entries()) {
  const t0 = Date.now();
  try {
    const execd = await runEzanaQL({ query: q, admin, userId: null });
    if (!execd.ok) throw new Error(execd.error);
    const cluster = fromEzanaQL({ ast: parse(q), result: execd.result, query: q });
    const out = await runSonarCluster(cluster, { compose: null });
    const ms = Date.now() - t0;
    latencies.push(ms);
    writeFileSync(
      `docs/sonar/smoke/${String(i + 1).padStart(2, '0')}.json`,
      JSON.stringify({ query: q, ms, out }, null, 2),
    );
    console.log(`ok   ${ms}ms  ${q.slice(0, 70)}`);
  } catch (e) {
    console.log(`FAIL ${Date.now() - t0}ms  ${q.slice(0, 70)} -> ${e.message}`);
  }
}

/* The hero, through the template engine. */
const t0 = Date.now();
try {
  const route = await routeQuery('steel industry in Canada');
  const template = getTemplate(route.template);
  const params = await template.sweepParams(route.entities, 'steel industry in Canada');
  const sweep = await runSweeps(template.datasets, params);
  const ms = Date.now() - t0;
  latencies.push(ms);
  writeFileSync(
    'docs/sonar/smoke/25-hero.json',
    JSON.stringify({ query: 'steel industry in Canada', route, ms, sweep }, null, 2),
  );
  console.log(`ok   ${ms}ms  steel industry in Canada (template: ${route.template})`);
} catch (e) {
  console.log(`FAIL hero -> ${e.message}`);
}

latencies.sort((a, b) => a - b);
const p = (q) => latencies[Math.min(latencies.length - 1, Math.floor(q * latencies.length))];
console.log(`\npings ${latencies.length} · p50 ${p(0.5)}ms · p95 ${p(0.95)}ms`);
