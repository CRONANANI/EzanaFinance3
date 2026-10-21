# Lobbying Activity, data contract

What each card reads, what exists, and the only new server work. The full
inventory, volumes and field lists are in `07-DATA-INVENTORY.md`; this file
maps them to the ten cards. All reads are cache-only through
`@/lib/supabase`, rate limited like the existing `/api/lobbying/*` routes.

## 1. Card by card

| Card                  | Source                                                                        | Status                                                                                             |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1 Influence Pulse     | `/api/lobbying/summary` twice: current period and the same period last year   | Exists. YoY is two calls plus `yoyDelta` in the model; no route change                              |
| 2 Spend Leaderboard   | `/api/lobbying/top-spenders?by=client\|firm` + `/filings` for the drawer      | Exists                                                                                              |
| 3 Issue Landscape     | `/api/lobbying/by-issue`                                                       | Exists (counts and shares, never dollars)                                                           |
| 4 Pressure Map        | **New aggregate** (section 2.1)                                                | New                                                                                                 |
| 5 Quarterly Rhythm    | **New aggregate** (section 2.2) + `/ingest-status` for the partial flag        | New                                                                                                 |
| 6 Revolving Door      | **New aggregate** (section 2.3)                                                | New (today only a distinct-lobbyist count exists in summary)                                        |
| 7 Public Company Lens | `/filings?onlyPublic=1` grouped by ticker + `/api/market-data/quotes` + `stock-candles` | Exists; grouping in the model. Verified flag comes from the ticker map's hand-verified set |
| 8 Lobbying vs Contracts | `/api/datasets/capitol/lobbying-ratio?years=1\|2`                            | Exists (Capitol hub); reuse as is                                                                   |
| 9 Money to Members    | `/api/lobbying/contributions` (filter by period, type, min; order by amount or date) | Exists, first UI. Three-tab views are top-N queries over it (section 2.4)                     |
| 10 Disclosures        | `/api/lobbying/filings` (modes map to its existing sort and onlyPublic params) | Exists                                                                                              |
| Ticker belt           | `/api/lobbying/feed`                                                           | Exists                                                                                              |
| Data health line      | `/api/lobbying/ingest-status`                                                  | Exists                                                                                              |

Period mapping for Money to Members: the page period maps to LD-203
semiannual periods (`mid_year`, `year_end`) via `period.js`; when a page
period spans both, show both and say so in the card subtitle.

## 2. New server work (the only new work)

Three cache-only aggregate reads, shaped like the existing routes (rate
limit, honest zeros, `source: 'Senate LDA (lda.gov)'` in the payload).
Implementation choice (one route with a `view=` param or three routes) is
the builder's; keep them under `/api/lobbying/`.

### 2.1 Pressure (issues x entities)

Input: year/period, min amount, onlyPublic. Output: top 12 issues by filing
count, top 10 entity groups by filing count (use `canonicalEntity` /
`ENTITY_GROUPS` from `entities.js` to bucket), cell = count of filings naming
both, plus row totals, column totals, and for each cell the top 3 client
names by count. Counts only, never dollars. Cache 15 minutes under the
`hubs` tag like `hub-data.js` reads.

### 2.2 Rhythm (per-quarter series)

Input: issue, entity group, min, onlyPublic. Output: for each quarter from
2024 Q1 to the current quarter plus the rest of the current year: disclosed
spend (sum of `amount` on non-registration filings with amount > 0), filing
count, and a status from `getQuarterCoverage`: `complete`, `partial` (with
received percent), or `not_yet_filed` for future quarters. The chart never
invents a bar for `not_yet_filed`; it draws the ghost.

### 2.3 Revolving door

Input: year/period, issue, entity group. Output: share of filings naming at
least one lobbyist with a covered position, the distinct lobbyist count
(matches summary), and the top firms by distinct revolving-door lobbyists,
each with up to 5 `{ lobbyistName, coveredPosition }` pairs as filed.
Free-text positions pass through untouched.

### 2.4 Money to Members tabs

No new route: three parameterised reads of `/api/lobbying/contributions`
(or a small `view=` on it if the route grows a group-by): top honorees by
summed amount, top payees by summed amount, largest single items. Each
respects the type chips and min amount. `clampToPeriod` in the model clamps
item dates to the report's filing period before any date display.

## 3. Model functions and tests

`src/lib/lobbying/page-model.js`, pure, no React, no formatting. Tests in
`scripts/check-lobbying-page.mjs` (`node --test`), wired as
`test:lobbying-page` and appended to `npm test`.

| Function                              | Contract                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `yoyDelta(now, prior)`                | Signed percent, null when prior is 0 or missing (render a middle dot, never Infinity)            |
| `shareOfTotal(value, total)`          | Percent with one decimal, null-safe                                                               |
| `heatScale(count, max)`               | Opacity 0.05 to 0.88, 0 for zero cells                                                            |
| `issueShareRows(byIssue, n=12)`       | Ranked rows with share, count, and the multi-cite caveat flag                                     |
| `quarterSeries(rows, coverage, now)`  | 2024 Q1 onward with `complete/partial(pct)/not_yet_filed` status per quarter                      |
| `doorShare(filingsWithDoor, filings)` | Share for the lead number, null-safe                                                              |
| `awardsPerDollar(awards, lobbying)`   | Ratio rounded to whole dollars, null when lobbying is 0                                           |
| `clampToPeriod(date, year, period)`   | LD-203 dates clamped into the filing period (handles the 2004/2029 typos)                        |
| `mappingBadge(tickerRow)`             | `verified` for the hand-verified set, `name_match` otherwise, `none` when unmapped               |
| `fmtSpend(v)`                         | Keep the existing rule: B over $1B, comma-separated M, never a bare 4-digit $1284M                |

Test the edges: prior-period zero, a quarter with zero filings, heat cell of
0 and of max, a contribution dated 2004 inside a 2025 report, an unmapped
client, and `fmtSpend` at 999,999,999 and 1,000,000,000.

## 4. Honesty gates (CI-checkable)

- No dollars-per-issue anywhere: the issue and pressure payloads carry no
  amount fields at all, so the UI cannot show one.
- `amount > 0` and non-registration gating stays in SQL, as `top-spenders`
  does today.
- The verified set is the 29 hand-verified mappings; everything else from
  the 329-row map renders the Name match badge. Where precision matters and
  the design says verified only, exclude name matches rather than restyling
  them.
- Honoree strings render as filed; no joins to member records, no links.
