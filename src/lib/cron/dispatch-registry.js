/**
 * Jobs run by the ingestion dispatcher (/api/cron/dispatch, one Vercel cron every minute).
 * See dispatch.js for the contract. Adding an ingestion job here costs no Vercel cron slot.
 *
 * Migration audit (Nov 28 2026). Moved here from vercel.json:
 *   - sonar-model-bench lanes 0-5: were six "* * * * *" entries with the same query
 *     strings; each lane keeps its own cron lock (cronRoute locks per query string) and its
 *     own shard, maxDuration 300, lock TTL 300. Same frequency, same lock keys. They answer
 *     { idle } quickly when no suite is active.
 * Added (never scheduled before, so no prior frequency to preserve):
 *   - sync-company-industry: EDGAR SIC backfill, resumable (missing tickers first, then rows
 *     older than 90 days). Hourly at :00, a minute no other SEC job starts on
 *     (they start at :04/:05/:10/:15/:20/:25/:30/:35/:40/:45/:50/:55), 1200 companies a run
 *     at the shared 6-a-second SEC throttle (about 200s). ticker_sectors holds about 6,500
 *     tickers, so the first backfill finishes in about six hours; later runs refresh stale rows.
 * Every other cron stays in vercel.json until audited individually.
 *
 * Fields: id, path (an /api/cron/ route, query allowed), schedule (UTC cron), group and
 * groupLimit (shared upstream concurrency), retries (fast failures only), ackMs (how long
 * the dispatcher waits before reporting a running job as started), until (optional end).
 */
/* Nov 28 2026: the sonar-model-bench lanes are unscheduled. The Anthropic API credits are
   exhausted, so no benchmark that calls a model runs. The route still exists for a manual,
   owner-approved run; re-add the lanes here only with a funded budget. */

export const DISPATCH_JOBS = [
  {
    id: 'sync-company-industry',
    path: '/api/cron/sync-company-industry?max=1200',
    schedule: '0 * * * *',
    group: 'sec-edgar',
    groupLimit: 1,
    retries: 1,
  },
  /* Sonar 6.4 hardening: stored daily closes for valuation screens (FMP quotes after the
     US close). Off until SONAR_PRICE_SYNC is set: about 6,000 quotes a trading day is an
     FMP budget decision for the owner. */
  {
    id: 'sync-screen-prices',
    path: '/api/cron/sync-screen-prices?max=1500',
    schedule: '15,45 21,22,23 * * 1-5',
    group: 'fmp',
    groupLimit: 1,
    retries: 1,
    enabledEnv: 'SONAR_PRICE_SYNC',
  },
];
