# Ezana US Equities page: how it works today, and the council version we want

Written from the code at commit a2de444 on main (16 November 2026). I did not run the page. Everything below describes what the code does for everyone today; the council section described in sections 1, 4, 5 and 9 does not exist yet.

## 1. Summary

US Equities is the stock research page. A member searches a company or clicks a heatmap tile and gets one company view: price, chart, models, valuation, earnings, news, peers, analyst ratings and key metrics. Industry and Portfolio views hold sector performance, a theme tool and four portfolio models. Reached from Research, then US Equities, from ticker links and from onboarding tasks.

Who in a council would use the council version, and for what decision:

| Council member                | Decision the page should support                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Analyst                       | Is this name already covered or held by the council, what has been written on it, and is it worth sourcing as a new pitch? |
| Portfolio manager             | How does this name sit inside my team's sleeve, would adding it break an investment policy rule, and who covers it?        |
| Executive and faculty advisor | Coverage gaps across the fund, which holdings have gone stale, and how the fund's names compare with the benchmark.        |

Today a council member sees the retail page plus one button (Send chart). The goal: keep the retail page working and add a council section or council cards, shown only to council members on the same route.

## 2. What is on the page today

Desktop, top to bottom.

**Search pill** (no visible title). Placeholder "Search company or ticker (e.g., NVDA, Apple Inc.)" with suggestions as you type. Inside the pill: a Company, Industry, Portfolio toggle and a filter icon whose menu depends on the view.

| View      | Filter groups                                                                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company   | Search results (All, Stocks, ETFs); Heatmap sectors (Technology, Finance, Healthcare, Consumer, Energy, Industrials, any number); Heatmap movers (All, Gainers, Decliners) |
| Industry  | Sectors (All, Advancing, Declining); Order                                                                                                                                 |
| Portfolio | Which of the four models show                                                                                                                                              |

Filters are remembered on the device and only narrow what is shown.

**Beginner banner** (beginners with no analyses yet): "New here? Let's analyze Apple together." opens Apple on the growth model.

**Company view, before a ticker is chosen**: one pinnable card, "Stock Market Heatmap", subtitle "S&P 500 · Performance YTD % · Tile size by return magnitude". Tiles grouped by sector; clicking a tile opens that company.

**Company view, once a ticker is chosen** (the heatmap hides):

- Hero card: logo, name, ticker, exchange, sector; buttons Heatmap (back), Add to watchlist, and Send chart (council members with the send to team grant). Price and day change, a Live or Market closed dot with as-of time, P/E, dividend yield, EPS, cap type, and a one-year price chart. Error: "Quote unavailable." with Retry.
- An education tip on diversification.
- Section tabs: Overview, Models, Valuation, Earnings, News, Peers, opening in place; any can be pinned to stay open. Models: DCF, three-statement, growth (GRPV), earnings. Valuation: method selector, comparable companies, DCF. DCF opens a workbench, the rest an analysis panel.
- Right rail: Analyst recommendations (buy, hold, sell split, average target), Key metrics (margins, growth, per share), News (with sentiment tags), Pins. Each has its own skeleton, empty and error state.
- Bottom row: Industry research (industry link and a peer treemap by market cap and day change) and Portfolio tools (four tiles into the Portfolio view).

**Course strip** at the bottom of the Company view: "Fundamental Analysis Mastery" with four courses and "View all courses".

**Industry view**: Obsidian (a written analysis of a typed theme, with top performers) and Sector performance with a date selector and a sector detail dialog.

**Portfolio view**: stress test, Modern Portfolio Theory, Black-Litterman and Monte Carlo cards, run on the member's own holdings or a labelled demo allocation.

**Dialogs and states**

- Add to watchlist: the member's lists with counts, Added marks, and create a list and add in one step; loading and empty lines. Signed-out members go to sign in.
- Send to team (council only): shares the one-year chart into a council conversation.
- Beginner spotlight: two steps (search pill, heatmap).

**Tablet and phone**: the rail drops below and cards stack. Not checked in a browser.

## 3. What the user can do

- Search by name or ticker; open a company from a suggestion, from Enter, or from a heatmap tile.
- Switch Company, Industry, Portfolio (kept in the address bar).
- Filter each view (results, heatmap sectors and movers, sector direction and order, models shown) and reset.
- Open, switch and pin section tabs; choose a model or valuation tool (kept in the address bar so links land on it).
- Jump from Overview to News; open a peer as a new company.
- Go back to the heatmap.
- Add the ticker to an existing watchlist, or create a list and add.
- Send the price chart to the council (council members with the grant).
- Run Obsidian, open sector detail, run the portfolio models, open courses.
- Easy to miss: a ticker or legacy model in the address opens that company or tab directly.

## 4. Data we have

**The page's own market data (everyone)**

| Field                    | What it means                                       | Source                | Freshness        | Missing for         |
| ------------------------ | --------------------------------------------------- | --------------------- | ---------------- | ------------------- |
| Identity                 | Name, exchange, sector, industry, logo              | Market data provider  | On load          | Some ETFs           |
| Quote                    | Price, day change, as of, P/E, yield, EPS, cap type | Market data provider  | On load, delayed | P/E for loss makers |
| Analyst split and target | Wall Street ratings                                 | Market data provider  | Daily            | Small caps, ETFs    |
| Key metrics              | Margins, growth, per share                          | Market data provider  | Quarterly        | ETFs                |
| News                     | Headlines with sentiment                            | News providers        | Minutes to hours | Thin names          |
| Peers                    | Comparable companies and multiples                  | Market data provider  | Daily            | Some industries     |
| Heatmap                  | Year to date return per ticker                      | Fixed list in the app | Never updates    | Most stocks         |
| Sector performance       | Return by sector over a range                       | Market data provider  | Daily            | None                |
| Model output             | DCF, comps and other models                         | Ezana model engine    | On request       | Thin financials     |

**Council data that exists today and could connect** (none is on this page yet)

| Field                  | What it means                                                                                                                                          | Source                           | Freshness    | Missing for              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------------ | ------------------------ |
| Fund holdings          | Ticker, shares, cost, last price, sector, team; unpriced held at cost                                                                                  | Council position book            | Daily prices | Unpriced holdings        |
| Fund value and return  | Value, gain on cost, return against the council's benchmark                                                                                            | Position book, benchmark history | Daily        | New funds                |
| Team sleeves           | Cost, value, return per sector team                                                                                                                    | Position book                    | Daily        | Unassigned holdings      |
| Coverage               | Analyst per sector; per ticker the current analyst, last document, document count, stale after 90 days                                                 | Coverage, research library       | On change    | Unwritten tickers        |
| Ticker dossier         | All research on a ticker by date, analysts who covered it, earliest pitch, expected return, decision                                                   | Research library, pitches        | On change    | Uncovered names          |
| Pitches                | Stage (idea to exited), decision (including watchlist), expected return, owner                                                                         | Pitch pipeline                   | On change    | None                     |
| Policy rules           | Max position, max sector, max trade, cash floor, min and max positions, min market cap, prohibited ticker or sector; checkable against a proposed idea | Council policy                   | On change    | Cash floor never checked |
| Flags and threads      | Review flags and discussion per holding                                                                                                                | Trading Desk                     | On change    | None                     |
| Attribution            | Contribution by holding and by analyst (via pitches)                                                                                                   | Fund analytics                   | Daily        | Holdings without a pitch |
| Council versus council | Other councils' rating, return, Sharpe, alpha, drawdown, volatility                                                                                    | Council rankings                 | Per period   | Non-reporting councils   |
| Competitions           | Pitch competitions; fund challenge rank and return                                                                                                     | Competitions                     | On change    | None                     |
| Role and grants        | Analyst, portfolio manager, executive; send to team                                                                                                    | Membership                       | On sign-in   | None                     |

## 5. Data we do not have

Do not design around these.

- A council-shared watchlist (watchlists are personal; the council equivalent is a pitch decided "watchlist").
- Council-written target prices, ratings or conviction scores (a pitch's expected return is the only number).
- Trade history, fills or placing a trade from this page.
- A live heatmap.
- Holding country, currency, asset class or lots.
- Other councils' holdings.
- Faculty comments or grades on a ticker (grades exist for assignments only).
- Real-time ticks.

## 6. Must keep working

- Everything in sections 2 and 3, for everyone. The council section is additive.
- Address bar parameters (view, tool, legacy model, ticker) and the back button.
- Section pins and the heatmap's dashboard pin.
- Onboarding tasks (search, open a company, open a peer), the beginner banner and spotlight.
- Watchlist adds saved to the account; Send chart only with the send to team grant.
- No council sees another council's data; nothing done to sample rows is saved.

## 7. Problems with the current page

Design problems

- No sign that a name is held, covered, pitched or prohibited; members must visit Trading Desk, Research Library or Compliance.
- The empty Company view says nothing about the council's book.
- Portfolio models never run on the council fund.
- The rail is all outside opinion; the council's own research is invisible.

Bugs and gaps

- The heatmap says "Performance YTD %" but is a fixed list that never refreshes.
- Heatmap sector names (Finance, Consumer) differ from the app's (Financials, Consumer Discretionary).
- Industry and Portfolio views drop the course strip and beginner help.

## 8. Design rules the mock must follow

Most often broken first.

1. Cards are flat: no fill, border, outline, shadow, glow or rounded panel, in either mode. A card is a title and whitespace.
2. Content runs from the logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px); card text sits on those lines.
3. Tabs, toggles and time selectors are text only: selected is emerald text, the rest grey. Ranges are mono caps (1M 3M 1Y ALL).
4. No outlined buttons. Primary is solid emerald, white text, 8px radius, one per group; secondary is plain text; icon buttons are bare.
5. Borderless search. No page title block, eyebrow or intro sentence.
6. Bootstrap Icons only, no emoji or logos drawn as art. Plus Jakarta Sans for text, JetBrains Mono for every number, ticker and date.
7. Sentence case, no em dashes, describe and never advise, never "real-time".
8. Dark mode first; light mode must work.
9. Nothing drawn touches text. Hairlines (1px, text at 7 to 10 percent) divide and never enclose. Side-by-side sections 64px apart, stacked 20px; a side column sits behind one full-height hairline with 24px clear.
10. KPI strip about 48px tall: 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
11. Charts: emerald line with soft fade, faint dashed gridlines, 11px grey mono ticks, never without data.
12. Signed values; N/A when missing; colour never the only signal.
13. Every state drawn: skeletons, one-line empty state with one action, inline error with Retry. Only overlays get a surface, border, shadow and radius.
14. Draw the real navigation bar unchanged. For a council member: logo, bell and checklist left; Team Hub (in place of Dashboard), Research, Trading, Sonar (filled emerald pill), Watchlist, Learning Center centre; profile, settings and red logout right; one hairline below.

Colours (dark / light): ground #0a0e13 / #ffffff; primary text #f0f6fc / #0f172a; muted #8b949e / #64748b; emerald #10b981 / #059669, as text #34d399 / #047857; negative #ef4444 / #dc2626; warning #fbbf24 / #d97706; gold #d4a853 / #b8922f.

## 9. Open questions for me

Each carries the default that will be used.

1. Where does the council section sit? Default: a council band under the search pill, above the heatmap; with a ticker open, a "Council on this name" card at the top of the rail. Industry and Portfolio get one council card each.
2. Analysts versus managers? Default: analysts see their coverage and pitches first; portfolio managers their team's sleeve; executives and faculty advisors the whole fund and the policy check. No control a role cannot use.
3. Council fund as a portfolio model input? Default: yes, read only, beside the personal portfolio.
4. Policy check: descriptive ("Within max single position, 4.1% of fund"), never a block or advice.
5. Sample content: default yes for master admin and demo accounts only, labelled "Sample content", never saved. Real councils see honest empty states.
6. Retail page: default unchanged in this pass.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: US Equities. Route: /company-research. Version: organizational (university student-managed investment funds), as a council-only section on the same route. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: keep all of the existing retail page's content and controls, and add 4 to 8 council features as component cards specifically tailored to university investment councils and Ezana's mission (for example coverage on the open ticker, the council's position and sleeve, the ticker dossier and pitch history, a descriptive policy check, pitch sourcing from uncovered names, attribution, council versus council). Use mock data for demos from one sample council: "Sample council", fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions across four sector teams (Financials: JPM, SCHW, BAC; Healthcare: LLY, UNH, MRK; Technology: NVDA, MSFT, AAPL; Industrials: CAT, GE, HON, with HON not yet priced), invented members such as Amara Tesfaye, Mikael Bekele, Selam Haile, Chidi Okoye, Elena Rossi and Jonas Weber, and invented rival councils such as Northshore Investment Council and Westbridge Capital Forum. Use invented names only. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
