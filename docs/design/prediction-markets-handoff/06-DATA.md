# Prediction Markets, data contract

What each card reads, what already exists, what is new, and what is still a
gap. Everything server-side goes through `@/lib/supabase` and lives in
`src/lib/prediction-markets/`; every route uses `withApiGuard`; every number
that is not a raw column comes from a pure function in
`src/lib/prediction-markets/page-model.js`.

## 1. What exists today

| Piece                                              | What it gives                                                                                                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.prediction_market_index`                   | One row per open market: `market_id, platform, question, probability (0..1), volume, volume_unit, liquidity, end_date, status, link, category, adj_ticker, embedding, indexed_at` |
| `20261018120000_prediction_market_trending.sql`    | Adds `volume_24h, price_change_24h, best_bid, best_ask, spread, yes_token_id, trending_score`                                                                      |
| Crons `index-prediction-markets`, `index-kalshi`   | Rewrite the index every two hours. About 2,150 Polymarket and 658 Kalshi open markets                                                                             |
| `src/lib/hive/store.js` `getOpenMarkets`           | Open markets by venue, ordered by volume. Feeds the table today                                                                                                   |
| `src/lib/prediction-markets/trending.js`           | `unitPrice`, `spreadOf`, `changeOf`, `isTrendingEligible`, `scoreTrendingBatch`, `TRENDING_RULES`                                                                  |
| `src/lib/prediction-markets/trending-store.js`     | `getTrendingMarkets({ venue, limit, category })`, fails open, never returns rows older than 6h                                                                    |
| `/api/prediction-markets/trending`                 | Public, cached 5 min, `{ venue, markets, updatedAt, stale }`                                                                                                       |
| `src/lib/congress/legislation-edge.js`             | Bill to market matcher, `computeEdge`, `edgeConfidence` (High >= 4, Medium >= 2, Low >= 1 pt net of half spread), `LEGISLATION_EDGE_DISCLAIMER`                    |
| `/api/congress/legislation-markets`                | Bill and market pairs for the Legislation section and Edge Board tab A                                                                                            |

Known facts that shape the design:

- **Liquidity**: populated for Polymarket, null for Kalshi.
- **Category**: Kalshi stores its event category. Polymarket rows mostly have
  `category = null` today.
- **History**: only 24h change is stored. There is no time series.
- **`adj_ticker`**: both crons write `null`. Nothing cross-venue is matched yet.

## 2. New pieces

### 2.1 Snapshot table (unlocks 7d and 30d)

One migration, additive and idempotent:

```sql
create table if not exists public.prediction_market_snapshots (
  market_id    text not null,
  platform     text not null,
  captured_at  timestamptz not null default now(),
  probability  numeric,
  volume       numeric,
  volume_24h   numeric,
  best_bid     numeric,
  best_ask     numeric,
  liquidity    numeric,
  primary key (market_id, captured_at)
);
create index if not exists pms_platform_time_idx
  on public.prediction_market_snapshots (platform, captured_at desc);
-- RLS on, service-role writes only, public select like the index table.
```

Both crons insert one row per active market per run (every 2h). Prune rows
older than 35 days in the same run. Rough size: 2,800 markets x 12 runs x 35
days, about 1.2M narrow rows.

From it: window change for Movers, Pulse and the Category Map; 7d and 30d
volume (volume now minus volume at the window start, per venue unit); the Hot
norm (30-day average daily volume).

Until it has 7 days of history: the window control ships with 7d and 30d
disabled, and every window-dependent figure uses the 24h columns.

### 2.2 Polymarket categories

The Polymarket cron fetches by tag. Save the tag id onto the row and map it to
the page taxonomy in one place, `normalizeCategory()` in the model:

| Page category | Polymarket tag id | Kalshi category                    |
| ------------- | ----------------- | ---------------------------------- |
| Politics      | 2                 | Politics                           |
| Elections     | 144               | Elections                          |
| Sports        | 1                 | Sports                             |
| Crypto        | 21                | (none today)                       |
| Economy       | 100328, 120       | Economics, Financials              |
| Geopolitics   | 100265            | World (if present)                 |
| Tech          | 1401              | Companies, Science and Technology  |
| Culture       | 596               | Entertainment                      |

A market with several tags takes the first match in the order above. Unmapped
markets count under All only.

### 2.3 Routes

| Route                                                               | Upstream                                                                                                                                            | Cache                  | Notes                                                                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/prediction-markets/history?venue=&id=&range=1d\|1w\|1m\|all` | Polymarket: `clob.polymarket.com/prices-history?market={yes_token_id}&interval=1w&fidelity=360` (verified live). Kalshi: market candlesticks endpoint (confirm during build) | s-maxage 60            | Return `{ points: [{ t, p }], volume: [{ t, v }] }`. Volume per period from snapshots when the venue does not supply it. Multi-outcome: one series per outcome token, max 4 |
| `GET /api/prediction-markets/leaderboard?venue=polymarket&window=day\|week\|month\|all&by=pnl\|vol&category=` | `data-api.polymarket.com/v1/leaderboard?category=POLITICS&timePeriod=WEEK&orderBy=PNL&limit=10` (verified live: rank, wallet, username, X handle, verified, image, PnL, volume) | s-maxage 600           | Map page category to the leaderboard category; fall back to overall when none maps                                             |
| `GET /api/prediction-markets/leaderboard?venue=kalshi&by=pnl\|vol`  | `api.elections.kalshi.com/v1/social/leaderboard?metric_name=projected_pnl\|volume&since_day_before=30&limit=10` (live for 30d; 7d returns empty; undocumented) | s-maxage 600           | Opt-in traders only. **Units unconfirmed**: return the raw number; the UI shows no currency until confirmed                   |
| `GET /api/prediction-markets/positions?wallet=`                     | Polymarket data API positions for a wallet (confirm the endpoint and fields during build)                                                           | s-maxage 300           | Top 3 by current size: question, side, size, avg price. Signed-in only; return 401 signed out so the gate is real, not cosmetic |

Server-side fetches only; nothing calls a venue from the browser. Add the
upstream hosts where the security guard expects them, and keep
`npm run test:security` green.

### 2.4 Cross-venue matcher (Edge Board tab B), not built

Design and ship the tab with its empty state first. The matcher, when built:
nearest neighbours on the stored `embedding` across venues, then a strict check
that resolution date and outcome match, writing a shared `adj_ticker` onto both
rows plus a 1 to 3 match quality score. Pairs with quality 1 never show.

## 3. Card by card

| Card              | Source                                                                                                    | Notes                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Pulse             | index (counts, `end_date`), `volume_24h` or snapshots, `price_change_24h` or snapshots                    | `pulseStats(rows, window)` returns counts by venue, volume per venue (never summed), biggest mover, closing-7d by day |
| Price Chart       | `/history`                                                                                                | Default market: first Movers row. Annotations from `largestMoves(points, 2)`                                  |
| Movers            | index + snapshots; sparklines from `/history` (batch, 24 points) or snapshots                             | `rankMovers(rows, 'moves' \| 'traded')`, top 8. Eligibility: reuse `isTrendingEligible`                       |
| Edge Board A      | `/api/congress/legislation-markets` + `computeEdge`                                                       | Usually empty today: few markets name a bill. Label the model "Structural estimate"                          |
| Edge Board B      | matcher output                                                                                            | Empty state until 2.4 exists                                                                                  |
| Top Traders       | `/leaderboard`, `/positions`                                                                              | `efficiency(pnl, volume)`                                                                                     |
| Category Map      | index grouped by `normalizeCategory`                                                                      | Area: window volume per venue unit. Colour: average window move. `squarify(items, w, h)`                      |
| Closing Soon      | index where `end_date` within 7 days                                                                      | `closingByDay(rows, now, tz='America/New_York')`, `mostUncertain(rows, 3)`                                    |
| Conviction        | index: `liquidity` (Poly) or `volume` (Kalshi), `spread`                                                  | `convictionPoint(row)` returns x value, x basis, spread in points, size                                       |
| Open markets      | `getOpenMarkets` + category filter                                                                        | Unchanged columns                                                                                             |
| Ticker            | 12 largest absolute 24h movers                                                                            | Through `usePublishTicker`                                                                                    |

## 4. Model functions and tests

`src/lib/prediction-markets/page-model.js`, pure, no React, no formatting.
Tests in `scripts/check-prediction-markets.mjs` (`node --test`), wired into
`package.json` as `test:prediction-markets` and appended to `npm test`.

| Function                                  | Contract                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `netGap(a, b, halfSpread)`                | `abs(b - a) - halfSpread`, rounded to the micro-point like `edgeConfidence`                                                    |
| `evPct(model, implied)`                   | Delegate to `computeEdge`; never re-implement the formula                                                                      |
| `crossVenueGap(poly, kalshi)`             | Net gap after half of each venue's spread; tier via `edgeConfidence`; `none` under 1 pt                                       |
| `efficiency(pnl, volume)`                 | `pnl / volume`, null when volume is 0 or missing                                                                               |
| `decidedness(p)`                          | `abs(p - 0.5) / 0.5`, 0 at 50%, 1 at 0 or 100%                                                                                 |
| `isHot(row, norm)`                        | `volume_24h >= 3 x` the 30-day average daily volume; before snapshots, `volume_24h / volume >= 0.25` (the trending "fresh" share) |
| `rankMovers(rows, by, n=8)`               | By absolute change desc (ties: volume desc), or by window volume desc                                                          |
| `largestMoves(points, n=2)`               | Indices and signed deltas of the n largest absolute single-period moves                                                        |
| `squarify(items, w, h)`                   | Squarified treemap rects; areas proportional to value; deterministic                                                           |
| `pulseStats(rows, window)`                | See card table; volumes returned per venue with their unit                                                                     |
| `closingByDay(rows, now, tz)`             | Seven buckets starting today in ET; each `{ date, count, top3 }`, top3 by volume                                               |
| `mostUncertain(rows, n=3)`                | Smallest `abs(p - 0.5)` among markets resolving within 7 days                                                                  |
| `convictionPoint(row)`                    | `{ x, xBasis: 'liquidity' \| 'volume', spreadPts, size }`                                                                      |
| `normalizeCategory(row)`                  | Table 2.2                                                                                                                      |

Test the edges: a gap exactly at 1, 2 and 4 points net; implied 0 and 1;
Kalshi rows with null liquidity; markets with no spread; a squarify sum check
(rect areas equal input areas within 0.5%); ET day boundaries around midnight.
