# Ezana Alternative Markets page: how it works today, and the council version we want

Written from the code at commit a2de444 on main (16 November 2026). I did not run the page. Everything below describes what the code does for everyone today; the council section described in sections 1, 4, 5 and 9 does not exist yet. Important: every number on this page today is fixed demonstration data built into the app (see sections 4 and 7).

## 1. Summary

Alternative Markets is the crypto and commodities research page. A Crypto or Commodities switch changes every card: headline metrics, a prices table, biggest winners and losers, a price chart, community sentiment, an on-chain snapshot (crypto only) and a news wire. It is reached from Research, then Alternative Markets ("Crypto & commodities"), in the top navigation.

Who in a council would use the council version, and for what decision:

| Council member                | Decision the page should support                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analyst                       | Does a commodity or crypto move matter for a sector I cover, and is there a primer or pitch to write (for example a commodity ETF or a commodity-sensitive equity)? |
| Portfolio manager             | Is an alternative idea even allowed by our investment policy, and how do commodity moves line up with my team's sleeve?                                             |
| Executive and faculty advisor | Teaching alternatives safely: what the council has written on them, what the policy permits, and how other councils approach them.                                  |

Many student-managed funds restrict direct crypto and commodity holdings, so the council version is about education, policy eligibility, research and pitch sourcing, not trading. Today a council member sees the retail page with no council features. The goal: keep the retail page working and add a council section or council cards, shown only to council members on the same route.

## 2. What is on the page today

Desktop, top to bottom. A hidden heading reads "Alternative Markets" for screen readers; there is no visible title.

**Marquee ticker**: a scrolling strip of the headline metrics and the first twelve table rows with price and signed 24 hour change.

**Header row**: a two-option switch, Crypto and Commodities; an Export button; a "+ Watchlist" button.

**Headline metrics**: four cards, each with an icon, label, value, signed change and a small sparkline.

| Crypto                                                                                       | Commodities                                   |
| -------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Bitcoin, Ethereum, Total market cap, Fear and greed (with a mood label and last week's mood) | Oil (WTI), Gold, Wheat, Commodity index (CRB) |

**Row 2, two columns**

- Prices table ("Crypto prices" or "Commodity prices", with today's date). Tabs: All, Top 20, DeFi, Layer 1, Memecoins, or All, Energy, Metals, Agriculture; the second is selected on load. Columns: rank, asset, price, 24h (sortable), 7d, market cap, 24 hour sparkline. Nineteen crypto rows or twelve commodity rows (oil, gas, metals, grains, coffee).
- Movers: a timeframe selector (1H, 1D, 7D, 1M, 3M, YTD, 1Y), then Biggest winners and Biggest losers lists with symbol, name, price and signed change.

**Row 3, two columns**

- Price chart for the table's first row: asset selector, price and change, timeframes (1D, 5D, 1M, 3M, 6M, YTD, 1Y), a line, and high, low, open, volume.
- Community sentiment, "Top discussions · now": three topics (for example "Oil & OPEC decision") with post counts, a bull versus bear bar, and "Join discussion →".

**On-chain snapshot** (crypto only), "Updated 1m ago": Bitcoin and Ethereum network figures, and Whale activity (three large transfers).

**News wire**, "All sources · last 12h": time, topic (guessed from the headline), headline, source.

**Footer**: "Ezana · Alternative Markets Research" and "Data delayed up to 60s · for informational purposes only".

**States**: there are no loading, empty or error states, because nothing is fetched.

**Tablet and phone**: below 1200px and again below 900px the two-column rows stack into one column and some table columns hide. Exact behaviour was not checked in a browser.

## 3. What the user can do

- Switch Crypto and Commodities.
- Switch prices table tabs; sort by 24 hour change (click again to reverse).
- Export the prices table as a spreadsheet file named with the asset class and date (all rows, whatever tab is selected).
- "+ Watchlist" goes to the Watchlist page; it does not add anything.
- Change the movers timeframe and the chart timeframe (the label changes; the data does not).
- Buttons with no effect today: the chart's asset selector, "Join discussion", and clicking a table or mover row.

## 4. Data we have

**The page's own market data (everyone)**

| Field                                           | What it means                                 | Where it comes from                                     | Freshness     | Missing for |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------------- | ------------- | ----------- |
| Headline metrics, table rows, movers            | Prices and changes for crypto and commodities | Fixed demonstration data in the app                     | Never updates | Everything  |
| Sparklines, chart line, high, low, open, volume | Price shape                                   | Drawn from the fixed price and change, not from history | Never updates | Everything  |
| 7 day change                                    | Week change                                   | Derived from the 24 hour figure when missing            | Never updates | Everything  |
| Community sentiment                             | Topics, post counts, bull share               | Fixed demonstration data                                | Never updates | Everything  |
| On-chain and whale activity                     | Network figures and transfers                 | Fixed demonstration data                                | Never updates | Everything  |
| News wire                                       | Headlines and sources                         | Fixed demonstration data                                | Never updates | Everything  |

Live data the product already has elsewhere and could connect here: latest quotes and daily change for major cryptocurrencies (a market data provider, used elsewhere in the app); live spot prices for energy, metals and agriculture and currency quotes (refreshed about every 2 minutes on Global Market Analysis); personal watchlists that already accept crypto and commodity items.

**Council data that exists today and could connect** (none is on this page yet)

| Field                    | What it means                                                                                                                                            | Source                           | Freshness    | Missing for                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------ | ---------------------------------------- |
| Fund holdings            | Ticker, shares, cost, last price, sector, team; unpriced held at cost                                                                                    | Council position book            | Daily prices | Unpriced holdings                        |
| Fund value and benchmark | Value, gain on cost, return against the council's benchmark                                                                                              | Position book, benchmark history | Daily        | New funds                                |
| Team sleeves             | Value and weight per sector team                                                                                                                         | Position book                    | Daily        | Unassigned holdings                      |
| Policy rules             | Max position, max sector, max trade, cash floor, min and max positions, min market cap, prohibited ticker or sector; checkable against a proposed ticker | Council policy                   | On change    | No asset class rule                      |
| Research library         | Documents by type (note, pitch memo, model, primer, post-mortem, IC minutes, reading, competition, external), ticker, sector, free tags                  | Research library                 | On change    | Untagged documents                       |
| Pitches                  | Any ticker (an exchange traded fund can be pitched), stage, decision, expected return, owner                                                             | Pitch pipeline                   | On change    | None                                     |
| Coverage                 | Analyst per sector                                                                                                                                       | Coverage                         | On change    | Unassigned sectors                       |
| Meetings                 | Upcoming meetings and agenda items                                                                                                                       | Meetings                         | On change    | None                                     |
| Courses                  | Learning Center courses by track                                                                                                                         | Learning Center                  | Static       | Unclear which alternatives lessons exist |
| Council versus council   | Other councils' return, Sharpe, alpha, drawdown, volatility, rating                                                                                      | Council rankings                 | Per period   | Non-reporting councils                   |
| Role and grants          | Analyst, portfolio manager, executive; send to team                                                                                                      | Membership                       | On sign-in   | None                                     |

## 5. Data we do not have

Do not design around these.

- Any live data on this page today. Until the page is wired to the live feeds listed in section 4, a mock may only show the fixed figures as sample content.
- Asset class on a council holding. The book cannot tell a commodity fund from a stock, so "fund alternatives exposure" cannot be computed.
- An investment policy rule for asset class (for example "no direct crypto"). Today it can only be expressed as prohibited tickers or a prohibited sector.
- Commodity or crypto sensitivity of any equity (for example how much a holding moves with oil).
- Real community discussions, real on-chain data or whale transfers.
- A council-shared watchlist; watchlists are personal, and the council equivalent is a pitch with the decision "watchlist".
- Real-time ticks.

## 6. Must keep working

- Everything in sections 2 and 3, for everyone. The council section is additive.
- The switch changing every card at once.
- Export, with every cell escaped against formula injection.
- The Watchlist link and the informational purposes footer (its "delayed up to 60s" claim must become true or go).
- No council sees another council's data; nothing done to sample rows is saved.

## 7. Problems with the current page

Design problems

- Nothing speaks to a council: no policy eligibility, no research, no link to the fund's sectors.
- Coloured accents per card (gold, purple, cyan), filled segmented switches and an outlined Export button depart from the current branding.
- Sentiment, on-chain and whale cards look like live intelligence but are fixed text.

Bugs and gaps

- All figures are fixed and stale (for example Bitcoin shown at $39,280 and gold at $404.13), while the footer says "Data delayed up to 60s" and the on-chain card says "Updated 1m ago".
- Timeframe selectors on movers and the chart change only the label.
- The asset selector, "Join discussion" and row clicks do nothing.
- "+ Watchlist" navigates away instead of adding.
- Export ignores the selected tab.

## 8. Design rules the mock must follow

Most often broken first.

1. Cards are flat: no fill, border, outline, shadow, glow or rounded panel, in either mode. A card is a title and whitespace.
2. Content runs from the logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px); card text sits on those lines.
3. Tabs, toggles and time selectors are text only: selected is emerald text, the rest grey. Ranges are mono caps (1M 3M 1Y ALL).
4. No outlined buttons. Primary is solid emerald, white text, 8px radius, one per group; secondary is plain text; icon buttons are bare.
5. Borderless search. No page title block, eyebrow or intro sentence.
6. Bootstrap Icons only, no emoji or coin logos. Plus Jakarta Sans for text, JetBrains Mono for every number, ticker and date.
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

1. Where does the council section sit? Default: a council band directly under the headline metrics, above the prices table, that follows the Crypto and Commodities switch.
2. Analysts versus managers? Default: analysts see research, primers and pitch ideas for the sectors they cover; portfolio managers also see policy eligibility and their team's sleeve; executives and faculty advisors see the whole fund, the policy and council versus council context.
3. Policy eligibility wording: default is descriptive ("Not on the prohibited list; no asset class rule set") and never a recommendation or a block.
4. Wire the live crypto and commodity feeds as part of this work? Default: yes, where they exist; sentiment, on-chain and whale cards stay labelled sample content until real sources exist.
5. Sample content: default yes for master admin and demo accounts only, labelled "Sample content", never saved. Real councils see honest empty states.
6. Retail page: default unchanged in layout in this pass, apart from fixing the false freshness labels.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Alternative Markets. Route: /alternative-markets. Version: organizational (university student-managed investment funds), as a council-only section on the same route. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: keep all of the existing retail page's content (the Crypto and Commodities switch, metrics, prices table, movers, chart, sentiment, on-chain and news), and add 4 to 8 council features as component cards specifically tailored to university investment councils and Ezana's mission (for example a descriptive policy eligibility check for an alternative ticker, commodity moves beside the sector sleeves, the council's alternatives primers, pitch sourcing for commodity funds, a teaching card linking Learning Center lessons, council versus council). Use mock data for demos from one sample council: "Sample council", fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions across four sector teams (Financials: JPM, SCHW, BAC; Healthcare: LLY, UNH, MRK; Technology: NVDA, MSFT, AAPL; Industrials: CAT, GE, HON, with HON not yet priced), invented members such as Amara Tesfaye, Tomas Alvarez, Selam Haile, Chidi Okoye, Daniel Park and Jonas Weber, and invented rival councils such as Northshore Investment Council and Westbridge Capital Forum. Use invented names only. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
