# Watchlist page (council section): how it works today

Page: Watchlist. Version: organizational (a council-only section on the shared page, shown only to council members). Route: /watchlist. Brief: keep the existing Watchlist working for everyone and add a council section for university investment councils.
Written from the code at commit a2de444 (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The Watchlist is a personal market monitor: named lists of stocks, bond ETFs, commodities, crypto and members of Congress, with prices, a chart of the selected asset, a private "why I'm watching" note, related catalysts, and smart lists that add assets automatically when a rule matches.

- Who uses it today: every signed-in user. Every list, note and rule is private to its owner. Council members already get one extra action: "Send to team" on a stock, when their role allows it.
- Who in a council would use the council section: analysts (see the names they own coverage of, and what changed on them), portfolio managers (see coverage gaps in their sector sleeve and who owns each name), executives and faculty advisors (see that every held position and every pitch candidate has an owner and recent research).
- Decision the council section supports: "is every name we hold or are pitching covered by someone, is that coverage current, and what needs attention this week".
- How they get to it: Watchlist in the top navigation bar. After: US Equities research, a research note, the pitch, or mock trading.

The redesign keeps the personal watchlist exactly as it works and adds a council coverage list (or council cards) that only council members see.

## 2. What is on the page today

Desktop. No page title; the list selector is the first control.

**A. Command bar.** The active list's name as a menu (every list with its item count), a "Smart" mark when the list is a smart list, and actions: "Create list" (text), "Create smart rule" (text), "Add asset" (the filled button).

**B. Asset class tabs.** Stocks, Bond ETFs, Commodities, Politicians, Crypto, each with its count in the active list.

**C. Pulse row.** Tracked assets, Market breadth (advancers against decliners), Disclosed trades over a recent window, New smart matches (with a button to show only smart matches), Watchlist alerts (unread).

**D. Selected asset panel.** Breadcrumb (list, class, asset), name and ticker, price and day change, star, a "More actions" menu (Move to another list, Remove, and for council members with the right "Send to team"), the top four institutional holders, a price chart with ranges 1D, 1W, 1M, 3M, 6M, 1Y, 5Y and ALL, and for a politician their disclosed trades (ticker, amount, disclosed date). Inside the panel, the monitoring note: headline clamped to two lines and the review-by date, with Edit. Empty: "Pick a row in the table to see its chart and details here."

**E. Securities table.** For the active class: search, Starred only, Smart only, sortable columns (Ticker, Name, Price, Day change, a one-month trend line, and "Added", which reads Manual or the smart rule's reason), and pages. Row actions: open in research, move to list, and a menu with Ping Sonar, Open in mock trading (stocks and bond ETFs only), Star or Unstar, Remove. Empty list: a message with "Add asset" and "Create smart rule".

**F. Side column.**

- My watchlists: every list with colour, item count, smart mark; a menu per list to rename, set big-move alerts, or delete (confirmed). "New list".
- Smart watchlists: each rule with its conditions, new matches, "View matches", edit, pause; templates such as Top gainers, Congress buying, Tech dip, Active traders, Big trades. Conditions: day change, price, market cap, sector, congressional trades, party, chamber.
- Signal explainer: why the selected asset is on the list (the rule and matched values, a live re-check "Still matches as of" or "No longer matches"), or "Added manually" with the note.
- Related catalysts: earnings dates, congressional trades, government contract awards and economic releases for the selected asset, each with "Add to note".

**Dialogs.** New list, Add asset, Smart rule editor, Monitoring note (Hypothesis, Risks or opportunities, Metrics to watch, Catalysts, Review by), Rename, Alerts, Delete list, and for council members Send to team (choose a peer, add a note, send the ticker as a message).

**Toasts and states.** One toast at a time, Undo after Remove; skeletons, empty lines per card, inline errors.

**Tablet and phone.** The side column drops below; the table scrolls sideways.

## 3. What the user can do

| Action                                             | Who                                         | Notes                                    |
| -------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Create, rename, colour, delete a list              | Every user                                  | Delete confirmed                         |
| Add, remove, move, star an asset                   | Every user                                  | Remove has Undo                          |
| Create, edit, pause a smart rule; view matches     | Every user                                  |                                          |
| Write, edit, delete a monitoring note              | Every user                                  | Private; follows the asset across lists  |
| Set big-move alerts on a list                      | Every user                                  |                                          |
| Sort, search, filter; change chart range           | Every user                                  | Range kept in the page address           |
| Open in research, Ping Sonar, open in mock trading | Every user                                  |                                          |
| Send a stock to a teammate                         | Council members with the send to team right | Sends a message with the ticker attached |

Page address keeps the list, class, selected symbol and range. There is nothing else council-specific on this page.

## 4. Data we have

The page's own data, per user:

| Field                          | What it means                                             | Source in public terms | Freshness                             | Missing for               |
| ------------------------------ | --------------------------------------------------------- | ---------------------- | ------------------------------------- | ------------------------- |
| Lists and items                | Names, colours, assets, starred, added date, added reason | Saved by the user      | Immediate                             |                           |
| Quotes and day change          | Last price and change                                     | Market data feed       | Delayed quotes, refreshed on the page | Politicians have no price |
| One-month trend                | Small price line                                          | Daily closes           | Daily                                 |                           |
| Institutional holders          | Top holders of a stock                                    | Public filings         | Quarterly                             | Non-stock assets          |
| Disclosed congressional trades | Member, ticker, amount, date                              | Public disclosures     | As filed                              |                           |
| Catalysts                      | Earnings, contract awards, economic releases              | Public calendars       | Daily                                 | Some assets have none     |
| Monitoring note                | Hypothesis, risks, metrics, catalysts, review-by date     | Written by the user    | Immediate                             | Private                   |
| Smart rules and matches        | Conditions, last evaluation, matches                      | Rules engine           | On evaluation                         |                           |

Council data that exists and could connect (all scoped to the viewer's council):

| Field                         | What it means                                                                                           | Source in public terms      | Freshness              | Missing for               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------- | ------------------------- |
| Positions                     | Held names with sector, team, shares, cost, last price, value, weight                                   | The council's position book | Prices refreshed daily | Councils without holdings |
| Pitches                       | Pitch candidates with ticker, analyst, team, stage, expected return                                     | Pitch Pipeline              | Immediate              |                           |
| Coverage owner by ticker      | Current analyst per ticker, handoff history, last document date, stale after 90 days without a document | Research Library            | Immediate              | Tickers with no documents |
| Sector coverage               | Which member covers which sector, primary or secondary                                                  | Org chart                   | Immediate              |                           |
| Research documents per ticker | Count, latest title, author, status                                                                     | Research Library            | Immediate              |                           |
| Position discussion threads   | A council discussion per held ticker                                                                    | Trading Desk                | Immediate              | Names not held            |
| IPS rules                     | Max position, max sector, prohibited tickers and sectors, min market cap                                | Compliance                  | Immediate              |                           |
| Assignments of type Coverage  | Coverage tasks with ticker, due date, status                                                            | Assignments                 | Immediate              |                           |

## 5. Data we do not have

Do not design around these.

- A council-shared watchlist. Lists, notes and rules are private to each user; there is no shared list and no list owner other than its creator.
- An explicit "coverage owner" field per ticker outside the research handoffs and sector coverage above.
- Council alerts (a price or news alert sent to the whole council).
- Analyst ratings, price targets, consensus estimates, percent ownership, short interest.
- News headlines from outside publishers.
- Tick-by-tick prices, or a note shared between members.

## 6. Must keep working

- Everything in sections 2 and 3 for every user, retail and council.
- The page address (list, class, symbol, range) and shared links.
- Undo after Remove, confirmations before deleting a list or a note.
- Smart rule evaluation, the explainer's live re-check, catalysts with Add to note.
- Links to US Equities research, Sonar and mock trading.
- Send to team, only for council members with that right, stocks only.
- Onboarding targets on "Create list" and "Add asset".
- The council section never shows to non-council accounts.

## 7. Problems with the current page

Design problems:

- A council member's watchlist knows nothing about the council: held names and pitch candidates must be added by hand.
- Coverage ownership is buried in the Research Library's lineage view; nobody sees gaps at a glance.
- Four side cards of equal weight; Send to team hidden two menus deep.

Bugs:

- None found in the page code.

## 8. Design rules the mock must follow

The page must match the rebuilt pages: a compact KPI strip with page actions on its right, flat sections, text tabs with counts, and a small "Sample content" label. Most often broken first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408).
3. Tabs, class switches, ranges and toggles are text only. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: plain red text, confirmed.
5. Search has no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No company logos.
8. Plus Jakarta Sans for text. JetBrains Mono for every price, percentage, date, count and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Side-by-side sections 64px apart, stacked 20px; the side column split off by one full-height hairline.
12. KPI strip: about 48px tall, 12px grey label, 18px mono value, hairlines between cells.
13. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned. Hover changes text colour only.
14. Coverage states (covered, stale, unassigned, held, pitched) are text with an optional icon, never a filled chip and never colour alone.
15. Missing values read N/A. Percentages signed.
16. Only overlays have a surface, border, shadow and radius.
17. Each section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning, stale           | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. How does the council list appear? Default: a "Council coverage" entry at the top of the list menu and a text tab "Council" beside "My lists"; selecting it swaps the table for the coverage table.
2. Which names are on the council coverage list? Default: every held position plus every open pitch, read-only, built from council data (no new list is stored).
3. Who is the owner of a name? Default: the current analyst from research handoffs; if none, the primary analyst for the sector; otherwise "Unassigned".
4. Can members edit the council list? Default: no; managers reassign coverage in the Research Library and the org chart. A stored shared list needs a database change, left out and listed.
5. Add a council name to my own list? Default: yes, "Add to my list" on each row.
6. Make Send to team easier to reach? Default: a text action in the selected asset header for council members with the right.
7. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Watchlist. Route: /watchlist. Version: organizational (a council-only section on the shared page). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: one full-page desktop mock at 1440px wide in dark mode, output as an actual image. Keep all of the existing personal watchlist content (command bar, class tabs, pulse row, selected asset panel with the monitoring note, securities table, my watchlists, smart watchlists, signal explainer, related catalysts) and add the council section that only council members see. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Include 4 to 8 council features as flat component cards, specifically tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors) and to Ezana's mission of institutional-grade tools for student-managed funds, built only on data in section 4: for example a council coverage table (ticker, held or pitched, sector team, owner, last research date, stale or current, weight against the IPS cap, open pitch stage), coverage gaps (unassigned and stale names), my coverage (names I own), sector sleeve coverage by team, coverage handoffs this term, and IPS watch (names near the single position or sector cap). Use mock data from the same sample council as the other org pages, with invented names only: Sample council, fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 held positions (JPM, SCHW, BAC in Financials; LLY, UNH, MRK in Healthcare; NVDA, MSFT, AAPL in Technology; CAT, GE, HON in Industrials), pipeline pitches on AVGO, AXP, COST, ETN, GS, ISRG, LIN and ORCL, analysts Amara Tesfaye, Mikael Bekele, Elena Rossi, Jonas Weber and Tomas Alvarez, portfolio managers Selam Haile, Chidi Okoye, Ingrid Lindqvist and Daniel Park, IPS rules max single position 25% and max sector 35%. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
