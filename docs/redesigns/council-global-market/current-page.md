# Ezana Global Market Analysis page: how it works today, and the council version we want

Written from the code at commit a2de444 on main (16 November 2026). I did not run the page. Everything below describes what the code does for everyone today; the council section described in sections 1, 4, 5 and 9 does not exist yet.

## 1. Summary

Global Market Analysis is a full-screen dark world terminal: a dotted world map, a sidebar of market panels, country power scores and heat layers, and a second view, The chain, a timeline of world events with a written event analysis. Reached from Research, then Global Market Analysis.

Who in a council would use the council version, and for what decision:

| Council member                | Decision the page should support                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyst                       | Which macro events this week touch the sectors I cover, and is there a macro angle worth writing up or pitching?                                              |
| Portfolio manager             | How exposed is my team's sleeve to a rate decision, a commodity move or a currency swing, and what should go on the next meeting agenda?                      |
| Executive and faculty advisor | How is the fund doing against its own benchmark (which may not be the S&P 500 for a Canadian council), and does the council have a written macro view at all? |

Today a council member sees the retail page plus one button (Send to team, inside the event analysis). The goal: keep the retail page working and add a council section or council cards, shown only to council members on the same route.

## 2. What is on the page today

The page fills the screen on its own dark terminal ground (it also has a light variant) with uppercase labels. Desktop, top to bottom.

**Ticker bar** (map view only): "LIVE" with a dot, then a scrolling strip of index and asset symbols with price and signed percent change. "LOADING MARKET DATA..." while empty. Refreshes every minute.

**Top bar**: a text toggle THE MAP and THE CHAIN; a gold link GLOBAL EMPIRE RANKINGS that opens a separate dataset page; and, when power layers are on, a Show me data button that opens the same dataset page with the chosen layers. A round help button on the side replays the tour.

**Map view**

- The world map with dots for 35 financial cities (each with its exchange and time zone). Clicking a dot opens the city panel. Clicking empty map closes panels.
- Sidebar: a Global Power Map popover with nine layers (trade, conflict risk, real interest rates, economic, military, energy, demographic, governance, infrastructure), with a "try this" arrow on first visit; buttons MARKETS, CENTRAL BANKS, INDICES, COMMODITIES, CURRENCIES; DATA LAYERS in two groups, ECONOMIC (GDP, debt, wealth, billionaires) and DEMOGRAPHIC (population, births), each a checkbox heat layer with a count badge; and ISR, which opens an event feed.
- Map controls: FILTER, ZOOM IN, ZOOM OUT, RESET (zoom and layers), SETTINGS.
- When power layers are on, a Power rank bar at the bottom of the map shows the top five countries with rank, flag, name and score bar.
- Category panel (one at a time, minimise or close) with tabs: Markets (major indices, sectors, futures, pre-market), Central banks (rate decisions, speeches), Indices and Currencies (global and six regions), Commodities (energy, metals, agriculture). Rows: name, value, signed change.
- City or country panel: name, power score for countries, regional news source links, Latest headlines (or an empty line).
- Filter panel (market status, regions, sentiment) and Settings panel (time zone, date format, ticker speed).
- ISR feed: world events plotted on the map with matched prediction market prices; each opens an article dialog.

**Chain view**: a timeline of events with title, country, impact, age, date, body, source link, a Markets button (related prediction markets) and Analyze. Analyze opens "Event analysis" (kicker "Confidential · Portfolio intelligence") with Event and Portfolio impact sections, Add to Debrief, related prediction markets, and Send to Team for council members with the grant.

**Other states**: a guided tour of ten steps on first visit (remembered per account), a toast after Add to Debrief, and a loading animation during analysis.

**Tablet and phone**: phone portrait shows "Rotate your device" with Back to dashboard; landscape shows the terminal compressed. Not checked in a browser.

## 3. What the user can do

- Switch The map and The chain; pan, zoom, reset.
- Open city or country panels and their news sources.
- Turn on power layers (top five ranking) and heat layers.
- Open, switch, minimise and close category panels.
- Open the ISR feed, an event article and its prediction markets.
- In the chain: expand markets, analyse an event, add to Debrief, send to the council (with the grant).
- Replay the tour; open Global empire rankings.
- Change Filter and Settings controls (no effect today; see section 7).

## 4. Data we have

**The page's own market data (everyone)**

| Field                                            | What it means                                       | Source                              | Freshness                     | Missing for               |
| ------------------------------------------------ | --------------------------------------------------- | ----------------------------------- | ----------------------------- | ------------------------- |
| Ticker bar                                       | Index and asset price and change                    | Market data provider, with fallback | Every minute, delayed         | None                      |
| Markets, indices, commodities, currencies panels | Name, value, signed change by tab and region        | Fixed list merged with live quotes  | About 2 minutes where matched | Unmatched rows stay fixed |
| Central banks                                    | Rate, last and next decision, speeches              | Fixed list in the app               | By hand                       | Unlisted banks            |
| Events                                           | Title, country, region, impact, time, body, source  | Economic calendar and news feeds    | Polled regularly              | Smaller economies         |
| Event analysis                                   | Written read and portfolio impact                   | Ezana analysis engine               | On request                    | None                      |
| Power scores                                     | 0 to 100 per country and layer, top five            | Ezana country data                  | Periodic                      | Small countries           |
| Heat layers                                      | GDP, debt, wealth, billionaires, population, births | Public datasets                     | Annual                        | Some countries            |
| City news                                        | Headlines per city and layer                        | News providers                      | Minutes to hours              | Smaller cities            |
| Prediction markets                               | Matched titles and prices                           | Prediction market data              | Minutes                       | Unmatched events          |

**Council data that exists today and could connect** (none is on this page yet)

| Field                    | What it means                                                                                                    | Source                           | Freshness    | Missing for                   |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------ | ----------------------------- |
| Fund holdings            | Ticker, shares, cost, last price, sector, team; unpriced held at cost                                            | Council position book            | Daily prices | Unpriced holdings             |
| Fund value and benchmark | Value, gain on cost, return against the council's own benchmark (default SPY, can be another index)              | Position book, benchmark history | Daily        | New funds                     |
| Team sleeves             | Value and weight per sector team                                                                                 | Position book                    | Daily        | Unassigned holdings           |
| Coverage                 | Analyst per sector                                                                                               | Coverage                         | On change    | Unassigned sectors            |
| Research library         | Documents by type (note, pitch memo, model, primer, post-mortem, IC minutes, reading), ticker, sector, free tags | Research library                 | On change    | Untagged documents            |
| Pitches                  | Stage, decision, expected return, owner, sector                                                                  | Pitch pipeline                   | On change    | None                          |
| Meetings                 | Upcoming meetings and agenda items (discussion, pitch, review, vote, update)                                     | Meetings                         | On change    | None                          |
| Policy rules             | Max position, max sector, prohibited sector and others; checkable against holdings                               | Council policy                   | On change    | No geography or currency rule |
| Council versus council   | Other councils' return, Sharpe, alpha, drawdown, volatility, rating                                              | Council rankings                 | Per period   | Non-reporting councils        |
| Debrief and send to team | Saved analyses; items shared to council conversations                                                            | Debrief, messages                | On change    | None                          |
| Role and grants          | Analyst, portfolio manager, executive; send to team                                                              | Membership                       | On sign-in   | None                          |

## 5. Data we do not have

Do not design around these.

- Country, region or currency of a holding (the book knows ticker, sector and team only), so no fund exposure map or currency figure.
- Revenue by geography, or a holding's sensitivity to rates, oil or currencies.
- Links from an event to tickers; events carry country and topic only.
- A council house view field; the closest is a tagged research document.
- Policy rules about geography, currency or asset class.
- Live updating of central bank data (it is a fixed list).
- Real-time ticks; quotes are delayed.

## 6. Must keep working

- Everything in sections 2 and 3, for everyone. The council section is additive and never covers the map.
- The tour (remembered per account) and its replay button; the phone rotate prompt.
- Escape closes panels; clicking empty map clears selection.
- Add to Debrief; Send to Team only with the grant; the Global empire rankings link.
- No council sees another council's data; nothing done to sample rows is saved.

## 7. Problems with the current page

Design problems

- Nothing connects the world to the council's book; a manager cannot see which events touch their sleeve.
- The terminal style (uppercase, glows, coloured panels, medals and flag emoji, outlined buttons) departs from the branding.
- Many floating panels and no summary of what matters today.

Bugs and gaps

- The Filter panel and the Settings panel change nothing: their choices are not used anywhere and are lost when the panel closes.
- The ticker bar says LIVE although quotes are delayed.
- The event analysis dialog says "Portfolio impact" but is not given the council's or the member's holdings.
- Central bank rows are a fixed list and can be out of date.

## 8. Design rules the mock must follow

Most often broken first.

1. Cards are flat: no fill, border, outline, shadow, glow or rounded panel, in either mode. A card is a title and whitespace.
2. Content runs from the logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px); card text sits on those lines. The map may run full width; the council section follows these rules even though the existing terminal does not yet.
3. Tabs, toggles and time selectors are text only: selected is emerald text, the rest grey. Ranges are mono caps (1M 3M 1Y ALL).
4. No outlined buttons. Primary is solid emerald, white text, 8px radius, one per group; secondary is plain text; icon buttons are bare.
5. Borderless search. No page title block, eyebrow or intro sentence.
6. Bootstrap Icons only, no emoji, flags or medals. Plus Jakarta Sans for text, JetBrains Mono for every number, ticker and date.
7. Sentence case, no em dashes, describe and never advise, never "real-time" or "live" for delayed data.
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

1. Where does the council section sit? Default: a third view, Council, beside The map and The chain in the top toggle; a scrolling page of cards under the ticker bar. Map and chain stay as they are.
2. Should anything council-related appear on the map itself? Default: no in this pass, because holdings have no country.
3. Analysts versus managers? Default: analysts see events and research for their sectors; portfolio managers their sleeve; executives and faculty advisors the whole fund, benchmark and council versus council.
4. Event to holding links: default is by sector only (an event topic matched to a sector team), described as a sector match and never as an impact estimate.
5. Restyle the existing terminal? Default: no in this pass; only the Council view follows section 8. Fixing the dead Filter and Settings panels is in scope.
6. Sample content: default yes for master admin and demo accounts only, labelled "Sample content", never saved. Real councils see honest empty states.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Global Market Analysis. Route: /market-analysis. Version: organizational (university student-managed investment funds), as a council-only section on the same route. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: keep all of the existing retail page's content (the map, the chain, the panels and the tour), and add 4 to 8 council features as component cards specifically tailored to university investment councils and Ezana's mission (for example this week's events matched to sector teams, the fund against its own benchmark, sleeve weights beside commodity and rate moves, the council's macro research, an agenda builder from events, a descriptive sector exposure check, council versus council). Use mock data for demos from one sample council: "Sample council", fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions across four sector teams (Financials: JPM, SCHW, BAC; Healthcare: LLY, UNH, MRK; Technology: NVDA, MSFT, AAPL; Industrials: CAT, GE, HON, with HON not yet priced), invented members such as Amara Tesfaye, Mikael Bekele, Selam Haile, Chidi Okoye, Ingrid Lindqvist and Daniel Park, and invented rival councils such as Northshore Investment Council and Westbridge Capital Forum. Use invented names only. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
