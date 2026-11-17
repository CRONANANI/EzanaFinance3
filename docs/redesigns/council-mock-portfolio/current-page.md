# Mock Portfolio page (council section): how it works today

Page: Mock Portfolio (Mock Trading). Version: organizational (a council-only section on the shared page, shown only to council members). Route: /trading/mock (an optional symbol in the page address preloads the order ticket). Brief: keep the existing Mock Portfolio working for everyone and add a council section for university investment councils.
Written from the code at commit a2de444 (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Mock Portfolio is a paper trading account: virtual cash (100,000 dollars by default), market buys and sells by dollar amount on stocks and bond ETFs, a performance chart against SPY, a risk snapshot, and up to three written investment theses that every order is checked against before it is placed.

- Who uses it today: every signed-in user. Each account is private to its owner.
- Who in a council would use the council section: analysts (rehearse a pitch as a sandbox position before it goes to committee, and learn how the council's IPS rules bite), portfolio managers (try a rebalance of their sleeve without touching the real fund), executives and faculty advisors (see that members practise inside the same rules as the real fund).
- Decision the council section supports: "if I traded this idea in the real fund, would it pass our investment policy, and how does my sandbox compare with the fund".
- How they get to it: Trading menu, Mock Portfolio, or "Open in mock trading" from the Watchlist. After: Pitch Pipeline or the Trading Desk.

The redesign keeps the whole sandbox exactly as it works and adds a council section (or council cards) that only council members see. The sandbox never trades the real fund.

## 2. What is on the page today

Desktop. No title block (a hidden heading "Mock Trading" for screen readers).

**A. Page action.** "Reset portfolio" (opens a dialog: enter a starting amount, default 100,000 dollars, confirm; trades and positions are cleared).

**B. Left column.**

- Portfolio performance: a switch Portfolio or Selected asset. Portfolio shows the account value over time with ranges 1W, 1M, 3M (default), 6M, 1Y and ALL, SPY as a dashed rebased line, and all-time profit and loss. Selected asset shows that ticker's price chart (default 1Y). Empty selected asset: "Search a ticker in Place order to chart it here."
- What-if impact: for the order being typed, the ticker's weight before and after, cash after, total exposure. Empty: "Enter an order in the ticket to see its effect."
- Risk snapshot: single-name concentration, max drawdown over three months, annualised volatility, beta against the S&P 500 (needs about a month of history).
- Thesis alignment: a ring with the fit score and a label for the order against the active thesis, with the reasons (sector, risk, concentration). Empty: a prompt to build a thesis.
- Positions: symbol, company, shares, average cost, last, day percent, unrealized profit and loss, market value, weight; a filter (All positions, Winners, Losers); sort by any column; rows above the active thesis's single-name cap are marked. Row actions: load into the order ticket, close the position (confirmation dialog with shares and estimated proceeds).
- Activity: the trade journal with tabs All activity, Trades and Thesis notes, a note column with a dialog ("Thesis note for", save), and "Export CSV".

**C. Right column.**

- Investment theses: up to three, as text tabs; the active one shows objective, time horizon, target sectors, position rules, portfolio alignment, risk tolerance, single-name cap and current trade fit. Actions: build, edit, delete (confirmed), make active. The build dialog offers templates (Blank, AI Infrastructure Growth, Dividend Compounder, Macro Rotation), name, objective, time horizon (under 1 year to 5+ years), risk tolerance (Conservative, Moderate, Aggressive), up to six sectors, position rules, max single-name weight (1 to 100 percent, default 15).
- Place order: search by company or ticker, the selected asset's price and change (or "No live price"), Buy or Sell, a dollar amount with presets, estimated shares, cash after, projected position weight, the thesis check line, "Review order". The review dialog restates the order, the thesis clauses, an optional note, and "Place order".
- Market movers: top gainers or losers today; a row loads the ticker into the order ticket.

**Toasts and states.** Toasts after trades, resets and thesis changes; skeletons; empty lines ("No trades yet."); "Market movers are unavailable right now."; a note when prices fail.

**Tablet and phone.** The right column drops below.

## 3. What the user can do

| Action                                                   | Who        | Notes                                    |
| -------------------------------------------------------- | ---------- | ---------------------------------------- |
| Buy or sell by dollar amount                             | Every user | Stocks and bond ETFs only; market orders |
| Review an order with a note                              | Every user |                                          |
| Close a position                                         | Every user | Confirmed                                |
| Reset the portfolio with a chosen starting amount        | Every user | Confirmed; clears history                |
| Build, edit, delete, activate a thesis                   | Every user | Up to three                              |
| Add a thesis note to a trade                             | Every user |                                          |
| Filter and sort positions                                | Every user |                                          |
| Export the journal as CSV                                | Every user |                                          |
| Load a ticker from movers, positions or the page address | Every user |                                          |

Fit scoring describes, never blocks. There is nothing council-specific on this page today.

## 4. Data we have

The page's own data, per user:

| Field                             | What it means                             | Source in public terms               | Freshness      | Missing for                     |
| --------------------------------- | ----------------------------------------- | ------------------------------------ | -------------- | ------------------------------- |
| Cash, positions, average cost     | The sandbox account                       | Ezana paper trading                  | Immediate      |                                 |
| Trades and notes                  | The journal                               | Ezana paper trading                  | Immediate      |                                 |
| Account value series              | Daily value                               | Ezana paper trading                  | Daily          | New accounts                    |
| SPY benchmark                     | Rebased to the account's first day        | Market data                          | Daily          |                                 |
| Quotes, day change, market movers | Prices                                    | Market data feed                     | Delayed quotes | Some tickers have no live price |
| Risk snapshot                     | Concentration, drawdown, volatility, beta | Computed from the value series       | Daily          | Needs about a month of history  |
| Theses and fit                    | Written theses and rule-based fit         | Written by the user, scored by Ezana | Immediate      |                                 |

Council data that exists and could connect (all scoped to the viewer's council):

| Field                           | What it means                                                                                                                                                              | Source in public terms      | Freshness                                     | Missing for                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------- | ------------------------------------------- |
| Fund positions                  | Real holdings with ticker, sector, team, shares, cost, last price, value, weight                                                                                           | The council's position book | Prices refreshed daily; unpriced rows at cost | Councils without holdings                   |
| Fund value series and benchmark | Daily fund value, return since inception, benchmark return                                                                                                                 | Fund snapshots              | Daily                                         | Short history for new councils              |
| IPS rules                       | Max single position, max sector, max single trade, min and max positions, min market cap, cash floor, prohibited tickers and sectors, each warning or block, active or not | Compliance                  | Immediate                                     |                                             |
| IPS check                       | Tests a ticker and size against the rules and the real holdings                                                                                                            | Compliance                  | On request                                    | Checks against the real fund, not a sandbox |
| IPS violations                  | Logged breaches and their resolution                                                                                                                                       | Compliance                  | Immediate                                     |                                             |
| Pitches                         | Ticker, analyst, team, stage, expected return                                                                                                                              | Pitch Pipeline              | Immediate                                     |                                             |
| Sector teams                    | Which team owns which sector sleeve                                                                                                                                        | Council roster              | Immediate                                     |                                             |
| Fund challenge standing         | Rank, return since entry, councils entered, end date                                                                                                                       | Competitions                | Daily                                         | Councils not entered                        |

## 5. Data we do not have

Do not design around these.

- A council-owned sandbox, or a sandbox shared between members. Each mock account is private.
- Copying the real fund into a sandbox as a starting point (no such action exists).
- Placing an order on the real fund from this page. Real fund changes go through the Trading Desk and pitches.
- Limit, stop or short orders, or options.
- Grades or rankings on members' sandbox returns, or a council leaderboard of mock portfolios.
- Attribution of the sandbox's return by sector or factor.
- Tick-by-tick prices.

## 6. Must keep working

- Everything in sections 2 and 3 for every user, retail and council.
- Dollar-amount market orders, review with note, close with confirmation, reset with a chosen amount.
- Theses (up to three), templates, fit scoring that never blocks, the single-name cap marks.
- The symbol in the page address preloading the ticket (used by the Watchlist).
- CSV export, journal tabs, thesis notes.
- SPY benchmark on the chart, risk snapshot rules.
- The sandbox never writes to the real fund. The council section never shows to non-council accounts.

## 7. Problems with the current page

Design problems:

- A council member practises in a sandbox that knows nothing about their council's investment policy, so the habits it builds may break the real rules.
- No comparison between the sandbox and the real fund.
- The thesis is a personal construct; the council's IPS is the real constraint and is not visible here.
- Many small cards of equal weight in the left column.

Bugs:

- None found in the page code.

## 8. Design rules the mock must follow

The page must match the rebuilt pages: a compact KPI strip with page actions on its right, flat sections, text tabs, and a small "Sample content" label. Most often broken first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408).
3. Tabs, switches, ranges and Buy or Sell are text only. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group (Review order). Secondary: plain text. Destructive: plain red text, confirmed.
5. Search has no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No company logos.
8. Plus Jakarta Sans for text. JetBrains Mono for every price, amount, percentage, date and ticker.
9. Sentence case. No em dashes. Describe, never advise. Always make clear the sandbox is simulated.
10. Dark mode first; light mode must work.
11. Side-by-side sections 64px apart, stacked 20px; a side column split off by one full-height hairline.
12. KPI strip: about 48px tall, 12px grey label, 18px mono value, hairlines between cells.
13. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned. Hover changes text colour only.
14. Charts: emerald for the sandbox, a second categorical colour for the real fund, a dashed grey line for SPY.
15. IPS results (passes, warning, blocked) are text with an icon, never a filled chip and never colour alone.
16. Missing values read N/A. Percentages signed.
17. Only overlays have a surface, border, shadow and radius.
18. Each section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, blocked        | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Where does the council section go? Default: a band under the page action row, "Council sandbox", with the IPS check folded into the order ticket and the review dialog.
2. Apply the IPS to sandbox orders? Default: yes, every active rule evaluated against the sandbox holdings plus the order, shown as passes, warning or blocked; it describes and never stops a sandbox order.
3. Compare with the real fund? Default: yes, sandbox return against fund return and SPY over the same range, and a weights comparison by sector.
4. Copy the real fund into the sandbox? Default: not built (needs a new action); listed.
5. Practise a pitch? Default: "My open pitches" card listing the viewer's pitches with "Load into ticket".
6. Show the fund challenge standing? Default: yes, read-only, when the council is entered.
7. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Mock Portfolio. Route: /trading/mock. Version: organizational (a council-only section on the shared page). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: one full-page desktop mock at 1440px wide in dark mode, output as an actual image. Keep all of the existing sandbox content (Reset portfolio, portfolio performance with SPY, what-if impact, risk snapshot, thesis alignment, positions, activity journal, investment theses, place order with review, market movers) and add the council section that only council members see. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Include 4 to 8 council features as flat component cards, specifically tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors) and to Ezana's mission of institutional-grade tools for student-managed funds, built only on data in section 4: for example sandbox versus real fund (return against the fund and SPY over the same range), IPS rules check on the order being typed and on the sandbox holdings, sector weights sandbox against the fund against the sector cap, my open pitches with Load into ticket, the real fund's holdings as a read-only reference, and the council's fund challenge standing. Use mock data from the same sample council as the other org pages, with invented names only: Sample council, fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions (JPM, SCHW, BAC in Financials; LLY, UNH, MRK in Healthcare; NVDA, MSFT, AAPL in Technology; CAT, GE, HON in Industrials), IPS rules max single position 25%, max sector 35% (block), max single trade 8%, cash floor 5%, min market cap $5B and prohibited ticker MO, pipeline pitches on AVGO, COST, ISRG and ORCL, analysts Amara Tesfaye and Elena Rossi, portfolio managers Selam Haile and Chidi Okoye, and a sandbox started at $100,000. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
