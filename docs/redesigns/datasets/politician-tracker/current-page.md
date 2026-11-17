# Ezana Politician Tracker page: how it works today

Page: Politician tracker. Route: /datasets/politician-tracker. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots are supplied separately.

## 1. Summary

Every member of Congress with trades disclosed under the STOCK Act, House and Senate in one ranking: the top eight as portrait cards, then every sitting member in a list. A member opens a side panel with trades, estimated holdings, committees, similar traders and the federal contractors they trade. One of the four reference pages of the dataset family.

- Who uses it: retail investors, student analysts and journalists, many signed out.
- How they get there: the Capitol Watch menu in the green band, the Capitol Watch hub, Committee Assignments and Campaign Finance (both link straight to a member), search engines, shared member links.
- What they do next: open a member, follow a committee chip, open the source filing, or query on the Capitol Watch hub.
- Live data connected today: yes, live (daily ingest of House and Senate disclosures). A labelled fixture appears only when no source is configured at all.
- Sample data rule: wireframe figures are sample content with invented names. On the live page only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom. The app draws the navigation bar, the green category band (Capitol Watch active) and a ticker of the twelve newest disclosures (ticker, member name, BUY or SELL; no click action).

**Header.** Eyebrow "DATASETS · CONGRESS" (plus a "SAMPLE DATA" chip in fixture mode), title "Politician tracker", and a sentence: "Every member of the House and Senate, ranked by their disclosed trades."

The body is two columns: a wide left column and a 380px right column.

### Left column

**EzanaQL row:** link to query on the Capitol Watch hub, and Share.

**Toolbar:**

| Control         | What it does                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| Search a member | Name filter with a clear button; Esc clears.                                              |
| Chamber         | Both, House, Senate. Bordered segmented group, selection filled with ink.                 |
| Party           | ALL, D, R, I. Same style, mono.                                                           |
| Period          | 30D 90D 6M 1Y 2Y ALL (default 1Y). Changes which disclosures are loaded and every figure. |

**Status lines (when needed):** "Disclosures are temporarily unavailable. Try again shortly." with an outlined Retry; or, when an older snapshot is being served, "Last updated (date, time)" with Retry.

**Gallery heading:** "Top eight by (sort)", a caption "ring colour is chamber, letter tag is party", Replay tour. Under 1000px the sort words become a select.

**Top eight cards (four across, two rows, boxed):** rank, headshot with a chamber ring (House emerald, Senate blue), name, chamber chip, party and seat, disclosed volume ("midpoints", plus "(n)% of #1" when ranked by volume), a buy versus sell split bar, buys, trades and sells, up to three tickers. A card opens the member panel. Loading: eight skeleton cards. Empty with filters: "No members match. Try clearing the (search or filter)." with Clear filters. Empty period: "No disclosed trades in this period. Try a longer period."

**Every member list (rank 9 on):** columns #, Politician (small headshot, name, party, seat), Chamber, Disclosed volume (figure plus a bar scaled to the top member), Trades, Buys / Sells, Last trade, Top tickers. Members with no trades in the period follow a separator row "NO DISCLOSED TRADES, (period) · (n) MEMBERS". 50 rows render, more mount on scroll ("SHOW MORE · (n) REMAINING" fallback). A row opens the panel. Loading: skeleton rows. Footer: an explanatory sentence and "(n) MEMBERS · (n) WITH DISCLOSED TRADES".

### Right column

| Block               | What it shows                                                                                                                                                                                                                                                    | Controls                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Trades by state     | US map (dot size trades, tint volume), totals, busiest five states; a state lists its members.                                                                                                                                                                   | Window pills 1 year, 3 years, All time. A member opens the panel. Error line on failure. |
| Most held companies | Top ten tickers as a column chart, count of members holding on each cap. Note: positions are inferred from disclosures, which report ranges.                                                                                                                     | None. Empty: "No open positions inferred from the disclosures on file."                  |
| Rank by             | Disclosed volume, Most trades, Latest trade.                                                                                                                                                                                                                     | Segmented.                                                                               |
| House vs Senate     | Period heading, feed warnings ("HOUSE FEED UNAVAILABLE"), the window "(from) TO (to) · (n) DISCLOSURES", two boxed chamber cards (volume, members, trades), four split-bar rows (Active members, Disclosed trades, Trades per member, Disclosed volume), a note. | None.                                                                                    |

A compliance line closes the page: disclosures are public records under the STOCK Act, amounts are disclosed ranges, nothing here is investment advice.

### Member panel (right side, 480px, scrim behind)

Opened from a card, row, state map or similar member. Header "POLITICIAN TRACKER / (CHAMBER)", close. Focus trapped; Esc and Back close.

| Section                           | Content                                                                                                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity                          | Large headshot, name, chamber chip, party, seat.                                                                                                                                        |
| Stats                             | Trades, Buys, Sells, Volume (midpoints).                                                                                                                                                |
| Committees                        | Chips with committee and role, each opening Committee Assignments filtered to it. Hidden when none.                                                                                     |
| Portfolio, top holdings           | Estimated open positions sized from range midpoints over every disclosure on file, "(n) stocks · est. (total)".                                                                         |
| Sector breakdown                  | The same estimate by sector.                                                                                                                                                            |
| Trade activity                    | Buys and sells per month chart, then a table: Asset (ticker, name), Type (BUY, SELL, EXCH chips), Amount range, Traded date, source filing link. Ten rows, "Show all (n) trades".       |
| Trades most like                  | Members whose traded tickers overlap most: headshot, name, chamber, shared tickers, overlap percent. Empty: "No other member shares two or more of these tickers in the loaded window." |
| Government contractors they trade | Traded tickers that are top federal contractors: company, top agency, last award, fiscal-year total and award count, last trade side and date.                                          |
| Note                              | Public records, disclosed ranges, not investment advice.                                                                                                                                |

Each section has its own skeleton and failure line.

**Guided tour (first visit):** spotlights one card and waits for a click, then walks the panel sections. Replay from the gallery heading.

### Tablet and phone

Under 1000px the page is one column: cards two across, the right column under the cards. Under 640px search, chamber and party, and period each take a line, and the panel goes full width.

## 3. What the user can do

- Search a member; filter by chamber and party; change the period
- Rank by disclosed volume, most trades or latest trade
- Open a member (card, row, state map, similar member); swap members inside the panel
- Read monthly activity and every trade; open the source filing; show all trades
- Follow a committee chip to Committee Assignments
- Change the state map window; select a state
- Retry after an outage or a stale snapshot
- Clear filters from the empty state; replay the guided tour
- Share; open EzanaQL on the hub
- In the code with no button: the trade feed accepts a ticker filter that nothing here uses.

## 4. Data we have

| Field                                                                                            | Meaning                                        | Public source                          | Freshness                        | Gaps                                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------- | -------------------------------- | --------------------------------------------- |
| Member name, chamber, party, state, district                                                     | Who filed                                      | Congressional member records           | Daily                            | Former members may lack seat                  |
| Headshot                                                                                         | Official portrait                              | Public member portraits                | Static                           | Some members show initials                    |
| Trade: ticker, asset name, side, amount range, trade date, source link                           | One disclosed trade                            | House and Senate STOCK Act disclosures | Daily ingest; feed cached 15 min | Ticker missing for some assets (funds, bonds) |
| Disclosed volume                                                                                 | Sum of range midpoints                         | Ezana calculation                      | Per load                         | An estimate, never an exact sum               |
| Trades, buys, sells, last trade, top tickers, rank, percent of first, chamber comparison, window | Derived per member and per chamber             | Ezana calculation                      | Per load; summary cached 15 min  | None                                          |
| Feed status                                                                                      | House or Senate feed down                      | Ingest status                          | Per load                         | None                                          |
| Most held companies                                                                              | Members holding each ticker                    | Inferred from disclosures              | Per load                         | Inference, ranges only                        |
| Trades by state                                                                                  | Trades, members, volume by home state          | Ezana calculation                      | Cached                           | Trades without a home state                   |
| Estimated portfolio and sectors                                                                  | Open positions from midpoints                  | Inferred from all disclosures          | Per member                       | Not for fixture members; no prices applied    |
| Committees and roles                                                                             | Assignments                                    | Congressional committee records        | Periodic                         | Members with no seat                          |
| Trades most like                                                                                 | Ticker overlap between members                 | Ezana calculation                      | Per load                         | Needs two shared tickers                      |
| Contractors they trade                                                                           | Contract total, awards, top agency, last award | Federal award records                  | Daily                            | Only top contractors with tickers             |

## 5. Data we do not have

Do not design around these. Wireframe figures are sample content; only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

- Exact amounts, returns, profit and loss, live portfolio value, filing lag, or price charts for traded tickers.
- Any score, "conflict" flag, ethics rating or performance ranking.
- Spouse versus member filter; real-time alerts (data is daily); donations or lobbying ties on this page.

## 6. Must keep working

- URL state: ?member= opens the panel and pushes one history entry (swapping members replaces it, Back closes the panel); chamber, party, sort, period and search are mirrored to the URL with defaults omitted, and restored on first paint. ?member= accepts a slug or a member ID, because Committee Assignments and Campaign Finance link that way.
- Server-rendered first paint of the ranking for the requested filters.
- Every sitting member listed, traders first, then a labelled group with no trades; nothing hidden.
- "Disclosed volume" always labelled as range midpoints.
- Honest states: outage with Retry, stale snapshot with its time, per-feed warnings, empty period, empty filter with Clear filters.
- Ticker items in the green band.
- Member panel sections and their links: committee chips, source filings, similar members, contractor exposure; focus trap, Esc, return focus.
- Chamber shown by text as well as ring colour; party as a letter.
- Guided tour hooks on a card and on each panel section, and Replay tour.
- Compliance line.
- Known change (parallel commit): the fixture shown when no source is configured will appear only to admin and demo accounts, labelled "Sample content"; everyone else will see "This dataset's source is not connected yet." Keep both states.

## 7. Problems with the current page

Design problems:

- A title block with an intro sentence instead of a compact identity row.
- Segmented controls drawn as bordered groups with an ink-filled selection; outlined Retry and Clear buttons; boxed portrait cards and chamber cards.
- Rank by appears twice (rail and heading select) and the rail control sits far from the cards.
- The right column stacks three unrelated blocks; the map uses pill buttons.
- Labels below 11px; a separate inner width. No freshness line at the top; the window line is buried in the rail.

Bugs and gaps:

- Ticker items in the band do nothing when clicked.
- The guided tour targets a named real member and falls back to the first card.
- Clear filters resets search, chamber and party but not the period, so an empty period stays empty.

## 8. Design rules the mock must follow

1. Draw the frame as it is: 64px navigation bar, full-bleed emerald green category band (about 48px, white labels) with the disclosure ticker inside it, the shared light grey footer.
2. Light mode as rendered: ground #ffffff, primary text #0f172a, muted grey #64748b, faint grey #94a3b8; tokens that exist in both themes.
3. Compact identity row on the left line: 11px mono caps eyebrow "DATASETS · CAPITOL WATCH" (tracking 0.08em), name at 22px weight 700, freshness in mono and at most one primary action at the right. Then the EzanaQL row. No intro sentence.
4. Content from x=32 to x=1408 on a 1440px artboard.
5. Flat cards: no fill, border, shadow or radius. A portrait gallery is a row of flat columns divided by vertical hairlines. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
6. Toggles, filters and time selectors text only; selected emerald text #047857, the rest grey; periods 12px mono caps.
7. No outlined buttons: one solid emerald #059669 primary per group, others plain text. Borderless search with bi-search.
8. Mono for every figure, ticker, date, rank, eyebrow, header and axis label. 11px minimum.
9. Ruled tables: no header fill, 11px caps mono headers, 1px row rules, 42 to 48px rows, numbers right, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
10. The member panel stays a right side panel (480px) with ?member= in the URL.
11. Headshots are the one data image allowed. Party as D, R, I and chamber as House or Senate in text, never colour alone. House emerald, Senate info blue.
12. Bootstrap Icons only, no logos or emoji; skeletons, never spinners; selected rows emerald text or a cleared faint wash.
13. Flat charts, dashed gridlines, 11px mono ticks; buy emerald, sell negative #dc2626, warning #d97706, extra cyan #06b6d4, purple #a78bfa. Sentence case, no em dashes, never advice, no "real-time", no vendor names, N/A for missing.

## 9. Open questions for me

1. Keep the top eight portrait gallery? Default: yes, as flat hairline-divided columns.
2. Keep the state map on this page? Default: yes, compact, in the right rail.
3. Keep the guided tour? Default: yes, retargeted to the first card.
4. Should band ticker items open the member? Default: yes.
5. One Rank by control? Default: yes, as text in the gallery heading.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Politician tracker. Route: /datasets/politician-tracker. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example records for one ticker across all members, new disclosures since the last visit, a side-by-side comparison of two or three members, committee seats beside the sectors a member trades, and a CSV and citation export of the filtered view. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
