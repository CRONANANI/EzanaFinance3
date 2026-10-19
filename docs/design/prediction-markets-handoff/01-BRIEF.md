# Prediction Markets, build brief

## 1. What this page is

`/datasets/prediction-markets`, in The Hive dimension. Open event markets from
Polymarket and Kalshi: what the crowd prices, what is moving, where a price
disagrees with a reference, who trades best, and how much money stands behind
each price.

Audience: retail investors and student-managed investment funds. A research
surface, never a trading signal.

Tone: Bloomberg/FT, data first. No exclamation marks, no em dashes, no hype.

## 2. What the redesign changes

| Today                                                   | Redesign                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `DatasetDashboard` template: one highlight list + table | Eight purpose-built cards, each with its own visual form                                                  |
| One search box over the table                           | Sticky filter bar (category chips with live counts, venue, window, search) that drives every card         |
| No chart                                                | Hero price chart drawn by Ezana, loaded by clicking any market anywhere on the page                       |
| No movers                                               | Movers list with sparklines, change pills and a Hot flag                                                  |
| Legislation edge only, inside its own section           | Edge Board card: Ezana model vs market, and cross-venue gaps, with the math one click away                |
| No traders                                              | Top Traders card, Polymarket and Kalshi leaderboards                                                      |
| No category view                                        | Category Map treemap (area volume, colour average move), clicking sets the page filter                    |
| No calendar                                             | Closing Soon 7-day timeline plus "most uncertain" callout                                                 |
| No sense of how much a price is worth                   | Price Conviction scatter, liquidity vs spread                                                             |
| Loading is a line of text                               | Shimmer skeletons in each card's shape                                                                    |

## 3. What stays exactly as it is

- The shared datasets chrome and ticker (`DatasetChrome`). The page publishes
  ticker items only: the 12 biggest 24h movers as
  `VENUE · Question (truncated) · 28.5% · -3.0 PTS`.
- `getOpenMarkets` as the source for the open markets table, and the table's
  five columns: Event, Venue, Probability, Volume, Closes. Restyle only, and
  add the active category as a filter.
- `LegislationMarketsSection`: its data, compliance copy and confidence chips.
  Restyle to the card system and give its empty state the design in the
  wireframe (icon, one sentence, two links, a faded "what a pair looks like"
  row).
- The 2-hour index crons, `trending.js` scoring and `legislation-edge.js`
  maths. Extend, do not fork.
- Page metadata in `layout.js` (update the description to match the new lead).

## 4. Page order (desktop, top to bottom)

1. Shared chrome (mounted).
2. Header: kicker `DATASETS · PREDICTION MARKETS`, title `Prediction markets`,
   lead, `Odds as of {Oct 18, 2026 · 14:05 ET}` in mono, venue legend chips.
3. Sticky filter bar.
4. Card 1 Market Pulse, full width.
5. Card 2 Price Chart (8/12) beside Card 3 Movers (4/12).
6. Card 4 Edge Board, full width.
7. Card 5 Top Traders (7/12) beside Card 6 Category Map (5/12).
8. Card 7 Closing Soon (6/12) beside Card 8 Price Conviction (6/12).
9. Open markets table (existing, restyled).
10. Legislation markets (existing, restyled).
11. Sign-up band, signed-out visitors only.
12. Source and educational line.

## 5. Copy

Use these strings verbatim.

| Where                           | Copy                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Lead                            | What the crowd is pricing, what is moving, and how much money stands behind each price, across Polymarket and Kalshi.       |
| Search placeholder              | Search markets…                                                                                                             |
| Pulse volume note               | Units differ, so venues are not summed.                                                                                     |
| Chart empty                     | Select a market to see its price history.                                                                                   |
| Chart summary (pattern)         | Probability fell from 31.5% to 28.5% over the past week.                                                                    |
| Movers footer                   | Hot: volume above 3x its own 30-day norm                                                                                    |
| Edge method, tab A              | Market-implied probability vs the Ezana model estimate. Today: legislation, from the bill-passage model. EV% = (model - implied) / (1 - implied). |
| Edge method, tab B              | The same event priced on Polymarket and Kalshi. Net gap subtracts half of each venue's bid-ask spread.                      |
| Edge empty                      | No gaps above 1 point right now. Markets are pricing in line with our references.                                           |
| Edge gate (signed out)          | Sign up free to open the math                                                                                               |
| Traders, Kalshi window          | Kalshi publishes a 30-day leaderboard                                                                                       |
| Traders, Kalshi footnote        | Kalshi traders appear only if they opt in to the public leaderboard.                                                        |
| Traders footer                  | Rankings as published by each venue. Past performance does not predict future results.                                      |
| Traders gate                    | Sign up free to see open positions                                                                                          |
| Closing callout                 | This week's most uncertain                                                                                                  |
| Conviction explainer            | A price is only as informative as the money behind it.                                                                      |
| Conviction quadrants            | Deep and tight: prices worth trusting · Thin and wide: treat with care                                                      |
| Every error state               | This data is unavailable right now. Try again in a moment. + "Retry"                                                        |
| Every EV surface                | For educational purposes only. Not financial advice. Prediction-market participation is subject to eligibility and jurisdiction. |
| Legislation empty               | No open market names a bill right now. / Ezana pairs bills before Congress with markets that name them, then sets the market price beside our structural estimate of passage. Pairs appear here as soon as a venue lists one. |
| Sign-up band                    | Track markets you care about / Save markets to a watchlist, get alerts when a price moves, and open the math behind every gap on the Edge Board. / Sign up free · Log in |
| Source line                     | Source: Polymarket, Kalshi. Probabilities are market-implied and update every few minutes. For educational purposes only. Not financial advice. |

Empty states name the active filters ("No market in Tech moved more than 1
point in the last 24 hours. Try 7d or All categories."), so build them from the
filter state, not as fixed strings.

## 6. Compliance (binding)

- Allowed: market-implied probability, reference price, Ezana model estimate,
  structural estimate, gap, edge, net gap, EV%.
- Never: buy, sell (as advice), bet, wager, take YES/NO, stake, sizing, Kelly,
  projected profit, "opportunity" as a call to act.
- A trader's open position may show its side (YES/NO) because it describes what
  they hold, not what the reader should do.
- The educational line in `--text-faint` plus "How we calculate this" sits at
  the foot of the Edge Board and Legislation markets.
- The Ezana model on Tab A is labelled "Structural estimate" (it is a stage
  base rate).
- `npm run check:copy` must pass (no backend names in UI copy).

## 7. Constraints

- Shared chrome and `EzanaQLBar` (if this page mounts it) are untouched.
- Charts use recharts with presentation props from `CHART` in
  `src/lib/chart-theme.js`, axis ticks at 11px, or inline SVG for sparklines.
  No third-party iframes.
- Bootstrap Icons only; decorative icons `aria-hidden`.
- No new dependencies without approval in the plan.
- All reads through `@/lib/supabase`; new server reads live in
  `src/lib/prediction-markets/`; routes use `withApiGuard`.
- Gold and the partner palette never appear on this page. Top-3 trader medals
  are emerald (solid for 1, outlined for 2 and 3).
