# Ezana Prediction Markets page: how it works today

Page: Prediction Markets. Route: /datasets/prediction-markets. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

What real-money prediction markets are pricing, what is moving, and how much money stands behind each price, across two venues: here venue A (volume in dollars, publishes liquidity and positions) and venue B (volume in $1 contracts). The live page names them; the mock uses "Venue A" and "Venue B". Part of The Hive.

- Who uses it: retail investors, students and journalists reading crowd odds. Public, except trader positions (free account).
- How they get there: The Hive menu, the datasets overview, search, shared links.
- Next: chart a market, open it on its venue, filter, view top traders, or sign up.
- Data connected today: yes, live. Markets re-index every two hours (dropped after six hours stale); history and trader boards are fetched on demand. No sample data is shown.
- Sample data rule for the redesign: every figure in the wireframe is sample content with invented questions. On the live page only admin and demo accounts may ever see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom, a 12-column grid of cards.

| Section                      | What it shows and does                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band and ticker        | 12 largest 24-hour movers: venue, question, probability, point change. A click charts it.                                                                                                                                                                                                                                                                                                                                                                                                            |
| Header                       | Eyebrow, title, lead sentence; right: "Odds as of (time ET)", "Odds delayed" when stale, two venue chips. No EzanaQL row.                                                                                                                                                                                                                                                                                                                                                                            |
| Market pulse                 | Four tiles: Open markets (with venue split bar), Volume in the window (per venue, "Not summed"), Biggest mover (click charts it), Closing this week (seven day bars, peak day). Empty: "No open markets match" with Reset filters.                                                                                                                                                                                                                                                                   |
| Filter bar (sticky)          | Category chips with counts (All, Politics, Elections, Sports, Crypto, Economy, Geopolitics, Tech, Culture), Venue (All, A, B), Window (24h, 7d, 30d; longer windows disabled until history accrues), search. All in the URL.                                                                                                                                                                                                                                                                         |
| Price chart (8 columns)      | Toolbar: arrows and a dropdown to step through movers, Outcomes (This market, Field: up to four siblings), Range (1D, 1W, 1M, All). Body: question, venue, volumes, close date, big probability and change pill, a 0 to 100 percent line with the two largest moves marked by labelled diamonds, volume bars, hover and arrow-key inspection, and a one-sentence summary ("Probability rose from 41% to 48% over the past week"). Footer: source, updated time, bid, ask, spread, "Open on (venue)". |
| Movers (4 columns)           | Top 8 by Biggest moves or Most traded: rank, question, venue, volume, "Hot" tag (volume above 3x its 30-day norm), sparkline, probability, change. A row charts it. Empty: "A quiet window".                                                                                                                                                                                                                                                                                                         |
| Event horizon (12 columns)   | A 3M, 6M or 12M timeline: each market resolving in the window is a dot at its close date (height probability, size volume, colour category group). Under it, lanes of scheduled events: US macro releases, largest earnings reports, congressional committee meetings. A dot opens a "Market explainer" dialog: probability, volume, liquidity, scheduled events before it resolves (with why they are linked), related markets, and links.                                                          |
| Top traders (7 columns)      | Venue tabs. Venue A: window (Day, Week, Month, All), Rank by (Profit, Volume), narrowed by the page category. Venue B: fixed 30-day board. Ten rows: rank, avatar or generated pattern, name or short wallet with copy, verified tick, social handle, profit, volume, profit per volume. Venue A rows expand to the top 3 open positions, gated ("Sign up free to see open positions") when signed out.                                                                                              |
| Category map (5 columns)     | Treemap: area window volume, colour average move; venue switch (A, B, Both). A tile sets the category. Phones get a stacked bar and list.                                                                                                                                                                                                                                                                                                                                                            |
| Closing soon (6 columns)     | "This week's most uncertain" (three markets nearest 50%), then seven day columns of three pills each, fill showing how decided, and "+N more" that filters the table to that day.                                                                                                                                                                                                                                                                                                                    |
| Price conviction (6 columns) | Scatter of liquidity (log) against spread, dot size by volume, a shaded "Deep and tight: prices worth trusting" zone and a "Thin and wide: treat with care" label; venue B plots on volume, hollow.                                                                                                                                                                                                                                                                                                  |
| Open markets (12 columns)    | Event, Venue, Probability, Volume, Closes, sorted by volume; 7 rows then "View all open markets" and "Show more" (25 at a time); removable category and day chips. A question charts the market.                                                                                                                                                                                                                                                                                                     |
| Sign-up band                 | Signed out only: "Open the math behind every price", Sign up free, outlined Log in; both return to the same filters.                                                                                                                                                                                                                                                                                                                                                                                 |
| How we calculate this        | Three columns of method notes and a source line ending "Not financial advice."                                                                                                                                                                                                                                                                                                                                                                                                                       |

Every card has a skeleton, an error with Retry and its own empty copy. On phones venue, window and search move into a bottom sheet opened by a "Filters" chip; charting a market scrolls to the chart below 900px.

## 3. What the user can do

- Filter by category, venue, window and search (all in the URL, shareable).
- Chart any market from the ticker, pulse, movers, horizon, closing soon or table (?market=); step through movers; switch range and outcomes; inspect points.
- Re-rank movers; change the horizon; open a market explainer.
- Browse trader boards by venue, window and rank; copy a wallet; expand positions (signed in).
- Pick a category from the treemap; filter the table to a day.
- Open a market on its venue; sign up or log in, filters kept.

## 4. Data we have

| Field                                      | What it means                                                      | Public source                      | Freshness                                      | Gaps                                          |
| ------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------- | --------------------------------------------- |
| Question, category, close date, venue link | The market and where it trades                                     | The two venues' public market data | Every two hours; dropped after six hours stale | Category mapping is approximate across venues |
| Probability                                | Last traded YES price, or the bid-ask midpoint                     | Same                               | Two hours                                      | Market-implied, not a forecast                |
| Change 24h, 7d, 30d                        | Point change in probability                                        | Calculated from snapshots          | Two hours                                      | 7d and 30d need recorded history              |
| Volume total, 24h, 7d, 30d, 30-day norm    | Dollars (A) or contracts (B), never added                          | Same                               | Two hours                                      | Units differ                                  |
| Liquidity                                  | Money resting in the order book                                    | Venue A only                       | Two hours                                      | Missing for venue B                           |
| Bid, ask, spread                           | Best quotes                                                        | Same                               | Two hours                                      | Missing when no quotes                        |
| Price history, volume bars                 | Probability over 1D to All                                         | Venues, on demand                  | One-minute cache                               | Venue A volume bars build up over time        |
| Sibling outcomes                           | Up to four outcomes of the same event                              | Same                               | On demand                                      | Only where the event is known                 |
| Scheduled events                           | US macro releases, largest earnings, committee meetings            | Public calendars                   | About 30 minutes                               | A source can be unavailable; the card says so |
| Trader boards                              | Top 10 by profit or volume, name, wallet, verified, handle, avatar | Venues' published boards           | Ten-minute cache                               | Venue B: 30 days only, unit undocumented      |
| Trader positions                           | Top 3 open positions                                               | Venue A                            | On demand, signed in only                      | Venue A only                                  |

## 5. Data we do not have

Do not design around these:

- Live ticks or order books (refresh is every two hours).
- Ezana forecasts, fair values or "gap" signals (the Edge Board is retired).
- Links from a market to tickers or companies.
- Watchlists, saved markets or price alerts.
- Comments; trader history beyond the boards; venue B positions; resolved-market accuracy records.
- Sample data rule: the wireframe uses invented questions and trader names labelled "Sample content". Real visitors never see sample rows; with no source they would see "This dataset's source is not connected yet."

## 6. Must keep working

- URL state: category, venue, window, q and market.
- Venue units never summed; the two-hour refresh and "Odds delayed".
- Every way to chart a market, and the chart's ranges, outcomes, diamonds, summary, quotes and "Open on (venue)".
- Movers ranking, Hot tag, event horizon with its explainer dialog and calendar-unavailable notice.
- Trader boards with the positions gate.
- Treemap category pick, closing-day table filter, show more paging, the phone filter sheet.
- Sign-up and log-in links that return to the same filters; the method note and "Not financial advice."
- No sample data for ordinary visitors; sample content, if ever added, only for admin and demo accounts, labelled "Sample content".

## 7. Problems with the current page

Design problems:

- No compact identity row and no EzanaQL row; the header has a lead sentence.
- Bordered chips with filled selected states, bordered segmented controls, an outlined Log in, pill venue chips.
- Eight dense cards with similar weight; no single ranked hero.
- "Prices worth trusting" and "treat with care" read as advice.
- Venue colour dots and split bars do not always repeat the name.

Bugs:

- The sign-up band promises "the Edge Board", which no longer exists.
- The method note still explains gaps, EV% and a legislation reference that no card shows.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Ezana Branding and UI Guide. The rules outside tools break most often come first.

Dataset family look:

1. Draw the 64px Ezana navigation bar as it is. Under it, the full-bleed green category band (about 48px, emerald gradient, white labels: Home, the seven dimensions, sign-in on the right; the active dimension a soft translucent white highlight). When the page has a stream of records, the slow ticker sits inside the same band (small caps mono lead, white name, mint mono value, thin white rules). Draw the shared light grey dataset footer. Do not redesign any of these.
2. Light mode as rendered: white ground, dark ink, using only colours that exist as tokens in both themes.
3. Compact identity row, no hero: small caps mono eyebrow (11px, tracking 0.08em, muted) above the dataset name (22px, weight 700, sentence case); on the right, the mono freshness line and at most one primary action. Explanations go in an info tooltip (bi-info-circle). No intro paragraph.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", a muted "on the (dimension) hub", plain-text Share on the right.
5. Mono (JetBrains Mono, tabular) for every figure, ticker, date, rank, eyebrow, table header and axis label; Plus Jakarta Sans for names and prose. Card title 18px, section 22px, body 14px, caption 12px, KPI 18px mono, headline figure 24 to 28px mono.
6. Ruled tables: no header fill, 11px caps mono grey headers over one hairline, 1px row hairlines, rows 42 to 48px, no zebra, no boxed wrapper, numbers right aligned. Sort by clicking a header (emerald text plus bi-arrow-up or bi-arrow-down). Quiet pagination footer.
7. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
8. An honest source line in public terms at the bottom, ending "Nothing here is investment advice."

Corrections to the current pages (these override the screenshots):

9. Flat cards: no fill, border, shadow, glow or radius. Hairlines (primary text at about 8 percent) divide, never enclose. Only overlays have a surface.
10. Tabs, toggles, segmented controls, filters and time selectors are text only; selected is emerald text, the rest grey. Time ranges 12px mono caps.
11. No outlined or pill buttons. One solid emerald primary per group (white text, 8px radius); every other action is plain text.
12. Borderless search: bi-search icon, grey placeholder, no outline ever.
13. Nothing below 11px.
14. Content from x=32 to x=1408 at 1440px wide. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
15. Bootstrap Icons only; no emoji, logos or illustrations; skeletons, never spinners.
16. No em dashes. Sentence case. Describe, never advise. Never "real-time": show the last-updated time. No vendor or database names in the interface.
17. Selected rows: emerald text or a faint wash with 12px clearance; no edge bar; no mark touches text.
18. Signed changes, N/A for missing values, colour never the only signal.
19. Every card has a loading skeleton, a one-line empty state with one action, and an inline error with Retry.

Colours, light (dark): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at 8 percent; green band an emerald gradient with white text.

Page note: changes are signed points ("+7 pts"); name the venue next to any venue colour.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Name the venues in the mock? Default: no, "Venue A" and "Venue B" as sample labels; the live page keeps the real names.
2. What is the ranked hero? Default: Movers as a leaderboard beside the price chart, with Market pulse as a ruled stat strip above.
3. Keep all eight cards? Default: keep every function; cards may merge.
4. Add the EzanaQL row? Default: yes, pointing at The Hive hub.
5. Rewrite the conviction labels? Default: "Deep and tight" and "Thin and wide" with no judgement words.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Prediction Markets. Route: /datasets/prediction-markets. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a market side panel, a cross-venue comparison of one question, scheduled events on the chart, a watch list marked as future work and CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
