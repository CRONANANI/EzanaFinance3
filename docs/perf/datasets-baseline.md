# Dataset pages: performance baseline (Step 4.0)

**Status: code audit done; timings not yet measured.** The sandbox this was
written in cannot reach production: the egress proxy refuses `ezana.world`,
the Vercel project returns 404 for observability data, and runtime logs have
no request durations for these routes. Fill in the timing columns by running
the measure script from any machine with network access:

```
BASE_URL=https://ezana.world OUT=docs/perf/datasets-baseline-measured.md node scripts/perf/measure-datasets.mjs
```

Per route it runs 3 cold requests (cache-busting query) and 5 warm ones
(median TTFB and total HTML time), then one headless Chromium load at 1440 px
(FCP, LCP, TBT, JS KB). `LIGHTHOUSE=1` swaps in the Lighthouse desktop preset
when the `lighthouse` CLI is installed. Server-side, every data loader on the
dataset pages is now wrapped in `timed()` (`src/lib/perf/timed.js`), so each
render logs one line per loader to the Vercel function logs:

```
[timing] dataset:/datasets/institutional getInstitutionalOverview 182ms rows=40 kb=36.2
```

Search the runtime logs for `[timing] dataset:` to get the slowest loaders per
page (duration, row count, payload KB).

## Findings that apply to every dataset page

1. **The root layout forces dynamic rendering on every route.**
   `src/app/layout.js` exports `dynamic = 'force-dynamic'` and
   `revalidate = 0`, reads `cookies()` (via `getServerTheme`, for the theme
   class on `<html>`), reads `headers()` for `x-pathname` (route shell
   classes) and `x-nonce` (the per-request CSP nonce from
   `src/middleware.js`). Any one of those makes every page, dataset pages
   included, render on the server per request. A page-level
   `export const revalidate = 900` has no effect while the root layout does
   this. **The spec's static + ISR page pattern cannot work until this
   changes**, and changing it touches the theme flash fix, the CSP and every
   route in the app. Options, for Noah to choose:
   - (a) move the theme to a pre-paint inline script reading a cookie or
     localStorage on the client, derive shell classes on the client, and use
     a hash-based (not nonce-based) CSP for the dataset routes, so the
     datasets segment can be static; or
   - (b) keep the layout dynamic and make the per-request render cheap: data
     from cached snapshots (one cached read, no live aggregates) and
     functions co-located with the database. This gets warm TTFB close to
     the render cost alone (roughly 100 to 250 ms) but not CDN-cache TTFB.
2. **Region mismatch.** Supabase project `jhdzpadfzrhiekcfgtai` runs in
   **us-west-2 (Oregon)**. `vercel.json` sets no `regions` and no route sets
   `preferredRegion`, so functions run in Vercel's default **iad1
   (Washington, DC)**. Every database round trip crosses the country (about
   60 to 70 ms each), and pages with several sequential reads pay it several
   times. Fix: `"regions": ["pdx1"]` in `vercel.json` (Portland, next to
   us-west-2). It moves every function, crons included, so it is listed here
   for approval rather than applied.
3. **Client fetch waterfalls.** Several pages render an empty shell on the
   server (`<Suspense fallback={null}>` around a client component) and only
   start their API requests after hydration, so LCP waits for HTML, the JS
   bundle, hydration, then the API call (itself a dynamic function with its
   own database reads).

## Per page (from code)

"Server loaders" are the reads the page's server component awaits (now
timed). "Client API fetches" counts distinct `/api/*` routes the page's
client components request after hydration.

| Route                                               | Page render mode                                  | Server loaders                                                                                           | Client API fetches                                                   | Causes found (4.1)                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| /datasets/committees                                | force-dynamic                                     | none                                                                                                     | 4 (`/api/committees`, `/trades` x2, `/matrix`; member panel on open) | 1, 3 (above-the-fold glance, atlas and gavels all wait for `/api/committees` after hydration), 6                           |
| /datasets/institutional                             | force-dynamic                                     | overview, open-quarter overview, filing curve, filing progress, then lag tax + convergence (second wave) | 0                                                                    | 1, 2 (aggregates already snapshotted in `titans_snapshots`; lag tax and convergence are live), 3 (two sequential waves), 6 |
| /datasets/government/contracts                      | revalidate 600 (overridden by layout)             | rollups, awards, coverage, recent feed (parallel)                                                        | 5                                                                    | 1, 3, 4 (award rows to the client), 6                                                                                      |
| /datasets/politician-tracker                        | dynamic (reads `searchParams`)                    | summary (cached), state trades                                                                           | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/activist                                  | force-dynamic                                     | activist overview (snapshot)                                                                             | 2                                                                    | 1, 6                                                                                                                       |
| /datasets/campaignfinancerecords                    | force-dynamic                                     | overview + cycles (parallel, 10 min cache)                                                               | 2                                                                    | 1, 4 (every member's figures in the first payload), 6                                                                      |
| /datasets/government/lobbying                       | force-dynamic + `searchParams`                    | first-paint views                                                                                        | 7                                                                    | 1, 3, 6                                                                                                                    |
| /datasets/government                                | force-dynamic                                     | contract awards with fallback                                                                            | 12                                                                   | 1, 3, 6                                                                                                                    |
| /datasets                                           | force-dynamic + `searchParams`                    | pulse (1.8 s budget)                                                                                     | 37 (hub cards)                                                       | 1, 3, 5 (chart cards), 6                                                                                                   |
| /datasets/[hub] (e.g. /datasets/capitol)            | revalidate 900 (overridden)                       | none                                                                                                     | 8                                                                    | 1, 3, 6                                                                                                                    |
| /datasets/sanctions                                 | force-dynamic                                     | 10 parallel reads, then newest additions + target activity, then page 1 (three waves)                    | 2                                                                    | 1, 2, 3, 6                                                                                                                 |
| /datasets/insider                                   | force-dynamic                                     | insider overview                                                                                         | 1                                                                    | 1, 6                                                                                                                       |
| /datasets/executive-compensation                    | force-dynamic                                     | exec comp table                                                                                          | 1                                                                    | 1, 4, 5, 6                                                                                                                 |
| /datasets/markets                                   | force-dynamic                                     | fundamentals table (500 rows)                                                                            | 1                                                                    | 1, 4, 6                                                                                                                    |
| /datasets/whale-moves                               | force-dynamic (and revalidate 900, contradictory) | whale moves + Burry watcher                                                                              | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/oecd-macro                                | revalidate 600 (overridden)                       | OECD latest, Empire scores, Empire matrix                                                                | 1                                                                    | 1, 6                                                                                                                       |
| /datasets/sec-filings                               | revalidate 600 (overridden)                       | insider, institutional, activist summaries                                                               | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/etf-holdings                              | force-dynamic                                     | ETF funds                                                                                                | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/patents                                   | force-dynamic                                     | patents                                                                                                  | 0                                                                    | 1, 5, 6                                                                                                                    |
| /datasets/supply-chain                              | force-dynamic                                     | supply chain                                                                                             | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/night-lights                              | force-dynamic                                     | night lights                                                                                             | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/commercial-real-estate                    | force-dynamic                                     | CRE                                                                                                      | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/crowd-forecasts                           | force-dynamic                                     | 150 open forecasts                                                                                       | 0                                                                    | 1, 4, 6                                                                                                                    |
| /datasets/geopolitical-risk                         | force-dynamic                                     | GPR series                                                                                               | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/world-bank                                | force-dynamic                                     | World Bank series                                                                                        | 0                                                                    | 1, 6                                                                                                                       |
| /datasets/political                                 | force-dynamic                                     | none                                                                                                     | 4                                                                    | 1, 3, 6                                                                                                                    |
| /datasets/alternative, /global, /prediction-markets | client or no data at render                       | none                                                                                                     | 0                                                                    | 1                                                                                                                          |
| /datasets/government/contracts/dossier/[slug]       | dynamic segment                                   | n/a                                                                                                      | n/a                                                                  | not measured (no stable sample slug)                                                                                       |

Cause numbers follow the spec's Step 4.1 list: 1 accidental dynamic
rendering, 2 live heavy queries, 3 waterfalls, 4 oversized payloads, 5 heavy
client JS, 6 region mismatch.

## What is in place now

- `scripts/perf/measure-datasets.mjs`, `scripts/perf/routes.mjs`,
  `scripts/perf/lab.mjs`: the measurement above.
- `src/lib/perf/timed.js` wrapped around every server loader on the dataset
  pages.
- `supabase/migrations/20261024200000_dataset_snapshots.sql`,
  `src/lib/datasets/snapshot.js` (`readSnapshot(key, tag)`),
  `src/lib/datasets/build-snapshots.js` (`BUILDERS`, `rebuild`, warm-up),
  `/api/cron/rebuild-dataset-snapshots`. `BUILDERS` is empty until Step 4.3;
  the cron is not scheduled until it has builders.
- `scripts/perf/budget.mjs` + `.github/workflows/perf-budget.yml`: fails a
  preview deployment that touches dataset code when any route's warm LCP
  exceeds 1.0 s or its first-load JS exceeds 200 KB. Needs the
  `VERCEL_AUTOMATION_BYPASS_SECRET` repo secret for protected previews.
- Vercel Speed Insights (`@vercel/speed-insights`) in the root layout for
  real-user LCP per route. Enable it in the Vercel project's Speed Insights
  tab if it is not already on.

## Stopped here, as Step 4.0 asks

Per-page changes (4.3) wait for the measured table and two decisions:
the root-layout option (a or b above) and the `pdx1` region move.
