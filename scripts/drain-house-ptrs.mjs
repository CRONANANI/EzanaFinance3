/**
 * Drains the House PTR parse queue by calling the production cron route in a
 * loop, instead of waiting on its hourly schedule (40 filings a run). Used for
 * the one-off backfill of 2015 onward and for re-parsing after a parser fix.
 *
 *   CRON_SECRET=... node scripts/drain-house-ptrs.mjs
 *   CRON_SECRET=... node scripts/drain-house-ptrs.mjs --base=https://ezana.world --max-runs=200
 *
 * Stops when a run parses nothing, or after --max-runs, or after three runs in
 * a row that report errors. Each run is one serverless call that fetches up to
 * 40 PDFs from the House Clerk, throttled, so the Clerk sees the same polite
 * pace as the cron, only without the hour between batches.
 */
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const base = String(args.base || 'https://ezana.world').replace(/\/$/, '');
const maxRuns = Number(args['max-runs']) || 250;
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error('Set CRON_SECRET (the value from Vercel).');
  process.exit(1);
}

let totalFilings = 0;
let totalRows = 0;
let errorStreak = 0;
for (let run = 1; run <= maxRuns; run += 1) {
  const started = Date.now();
  let body = null;
  try {
    const res = await fetch(`${base}/api/cron/parse-house-ptrs?max=40`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    body = await res.json().catch(() => null);
    if (!res.ok && !body) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`run ${run}: ${e.message}`);
    errorStreak += 1;
    if (errorStreak >= 3) break;
    continue;
  }
  const parsed = body?.filings_parsed || 0;
  totalFilings += parsed;
  totalRows += body?.trade_rows || 0;
  console.log(
    `run ${run}: ${parsed} filings, ${body?.trade_rows || 0} trades, ` +
      `${((Date.now() - started) / 1000).toFixed(0)}s` +
      (body?.errors?.length ? `, errors: ${body.errors.slice(0, 3).join(' | ')}` : ''),
  );
  errorStreak = body?.errors?.length && !parsed ? errorStreak + 1 : 0;
  if (errorStreak >= 3) {
    console.error('Three runs in a row failed; stopping.');
    break;
  }
  if (!parsed && !body?.errors?.length) break; // queue empty
}
console.log(`done: ${totalFilings} filings, ${totalRows} trade rows`);
