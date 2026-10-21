# Committee Assignments, data contract

What each card reads, what exists, and the only new server work. The full
inventory is `07-DATA-INVENTORY.md`; this file maps it to the ten cards.
All reads are cache-only through `@/lib/supabase`, rate limited like the
existing routes, honest-zero on failure.

## 1. Card by card

| Card                 | Source                                                                                     | Status                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1 Congress at a Glance | `/api/committees` counts + majority/minority seat totals                                   | Exists (counts); split totals are a one-line addition to the same aggregate                   |
| 2 Committee Atlas    | `/api/committees` (committees with seat counts, splits, sectors, subcommittee counts)       | Exists                                                                                         |
| 3 Gavels             | `/api/committees` (chair and ranking member per committee)                                  | Exists                                                                                         |
| 4 Committee Profile  | `/api/committees/[thomasId]` (roster, titles, subcommittees)                                | Exists. The trades strip count comes from the member route's window totals for the roster, or the Card 7 summary filtered by committee |
| 5 Oversight Map      | `src/lib/congress/committee-sectors.js`                                                     | Exists (static editorial map; render client-side)                                             |
| 6 Seat Load          | **Extension 2.1**: seat counts per member                                                   | Small extension                                                                                |
| 7 Trades in Overseen Sectors | `/api/committees` `belt` + **Extension 2.2** for the summary and paging             | Belt exists (20 trades, 3 months); summary and paging are new                                  |
| 8 Holdings Matrix    | **Extension 2.3**: route over `hub_committee_ticker_stats`                                  | The database function exists (Capitol hub); this page needs a route                           |
| 9 Hearings           | `/api/congress/meetings`                                                                     | Exists but unusable (118 rows, no dates or committees). Ship the not-yet-available state; do not wire the rows |
| 10 Member Lookup     | `/api/committees/member/[bioguideId]` (+ `?lite=1` for chips) and the `members` search list | Exists                                                                                         |
| Ticker belt          | `/api/committees` `belt`                                                                     | Exists                                                                                         |

## 2. The three small extensions

### 2.1 Seats per member

Extend the `members` list `/api/committees` already returns for search with
`seatCount` (committee plus subcommittee seats), or add a tiny aggregate
read. Card 6 needs only the histogram buckets (1 to 10+) and the top 5 with
name, party, state and count.

### 2.2 Overseen-trades window summary and feed

The belt returns up to 20 recent trades. Card 7 additionally needs, for the
window and the active filters: trade count, buys, sells, distinct members,
unmapped-ticker count, and a paged feed (date, member, party, state, side,
ticker, amount range, sector, overseeing committee). Implement as a
parameterised extension of the belt read (committee, sector, side, page) or
one new route under `/api/committees/`; builder's choice. Amount stays the
disclosure range string; never parse it into a point value for display.

### 2.3 Holdings matrix route

Expose `hub_committee_ticker_stats` to this page: for the mapped
committees, the top tickers in their sectors with members holding, holder
names, and buyers and sellers since 180 days. Follow how the Capitol hub
calls the function today; cache 15 minutes. The payload carries counts and
names only, no dollar values, so the UI cannot show one.

## 3. Model functions and tests

`src/lib/congress/committees-page-model.js`, pure, no React, no formatting.
Tests in `scripts/check-committees-page.mjs` (`node --test`), wired as
`test:committees-page` and appended to `npm test`.

| Function                                | Contract                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `seatSplit(maj, min)`                   | Flex weights plus percent labels, null-safe                                                  |
| `atlasSizeClass(seats)`                 | `lg` at 55+, `md` at 35+, else `sm` (grid span and type size)                                |
| `seatHistogram(members)`                | Buckets 1..9 and 10+, summing to the member count                                            |
| `mostSeated(members, n=5)`              | By seat count desc, ties by name                                                             |
| `oversightLinks(map)`                   | `{ committees, sectors, links }` with per-sector committee counts, from committee-sectors.js |
| `heatScale(count, max)`                 | Opacity 0.1 to 0.85; 0.04 for zero cells                                                     |
| `tradeSummary(rows)`                    | `{ trades, buys, sells, members, unmapped }`                                                 |
| `rangeDotSize(range)`                   | Disclosure range bucket to 5..14px; unknown ranges get the minimum                           |
| `timelineLayout(trades, from, to)`      | X positions over 24 months, dates clamped to the window                                      |
| `hearingsAvailable(rows)`               | False unless rows carry a date AND a committee; gates Card 9's populated state               |
| `mappingNote()`                         | Returns the sector-note string so every surface renders the same sentence                    |

Test the edges: zero minority seats, a member with 10+ seats, an unmapped
ticker in the summary, a trade dated outside the 24-month window, the
meetings rows as they exist today (hearingsAvailable must be false), and
heatScale at 0 and max.

## 4. Honesty gates (CI-checkable)

- Sector note renders wherever sector chips or links appear (atlas,
  profile, oversight map, footer): one shared string from the model.
- The disclosure-pattern footnote renders on Cards 7, 8 and 10.
- "Holdings inferred from disclosures" labels the matrix header; the
  payload has no dollar fields.
- Amount ranges render as disclosed; `grep` the page for `$` formatting of
  trade amounts finds only range strings.
- Card 9's populated layout is unreachable while `hearingsAvailable` is
  false.
