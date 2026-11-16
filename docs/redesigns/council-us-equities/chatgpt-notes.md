# ChatGPT notes: council US Equities wireframe

Chat: https://chatgpt.com/c/6af3c68c-e3f8-83e9-9741-63815185f6ec (16 November 2026). The run took 9 minutes and the stream ended with "Connection interrupted. Waiting for the complete answer". The image arrived (1024 x 1536), but the written list I asked for (sections drawn, decisions to reverse, items not in section 4) never did, even after a reload.

## What ChatGPT wrote (progress notes only)

- It said it would redesign US Equities as the existing research workspace with a council layer, not as another fund dashboard. It would keep the company chart, research tabs, market tools and watchlist actions, and add coverage status, fund holdings, pitch history, policy checks and research handoffs from the sample council data. It would include the no-ticker state.
- It said the selected company stays the main research surface, with council information right under the search bar and in a right rail. It also drew a separate no-ticker heatmap state and portfolio model input controls, with sample figures marked apart from live data.

## My reading of the image (written by the Stage 2 agent, not by ChatGPT)

Top to bottom, 1440 wide, dark:

1. Navigation bar: Team Hub, Research, Trading, Sonar pill, Watchlist, Community, Learning Center. Community should not be in the council nav (section 8 rule 14). Do not copy the nav.
2. Search row: borderless search, Company / Industry / Portfolio text toggle (Company in emerald), filter icon.
3. Council band (KPI strip): "Sample content" label with "Show council data" link and a note; Fund value $240,050.00; Gain on cost +46.73% (not time-weighted); SPY +10.08% (benchmark history); Positions 12; Teams 4. The note uses an em dash, which must go.
4. Company hero (NVDA): name, ticker, exchange, sector; Heatmap, Add to watchlist, Send chart as text buttons; price $155.65, -$7.21 -4.42%, as-of line; P/E, EPS, dividend yield, cap type; one-year chart with 1D to ALL and Custom ranges.
5. Right rail top: "Council on this name" card: Held in fund (1,500 shares), Technology sleeve (43.2% of fund), Coverage analyst, Documents, Last document, Pitch stage (Deep dive), Expected return (+28.0%, 12 to 18 mo), Review flag (None); buttons Open pitch (filled) and Open dossier (text).
6. Section tabs Overview, Models, Valuation, Earnings, News, Peers.
7. Council position and sleeve: one row table (holding, shares, cost per share, latest price, market value, unrealized P&L, team).
8. Coverage and research lineage: dated documents with version, title, author, scope; link to Research Library.
9. Pitch pipeline and decision history: pitch, owner, stage chip, expected return, last action.
10. IPS idea check (descriptive): max single position, sector, style or mandate, liquidity (ADTV) rows with "Within limit" readings; note that the cash floor is recorded but not checked.
11. Contribution to fund: return on cost, fund return, contribution to fund return (pp), coverage analyst.
12. Coverage gaps and stale names: ticker, sector, status chip (Uncovered), last coverage, note.
13. Research workbench strip: DCF, 3 Statement, GRPV Growth, Earnings, Comps.
14. Rail continues: Analyst recommendations, Key metrics, News and sentiment, Pins (2).
15. Industry research (three links) and Portfolio tools with an "Input: Sample council fund" selector (stress test, MPT, Black-Litterman, Monte Carlo).
16. Learning Center course strip.
17. No-ticker view (illustrative): the same council KPI strip, the S&P 500 heatmap relabelled "Static YTD reference, not live" with app sector names (Financials, Consumer Discretionary), an Industry view card (Obsidian search and sector YTD returns) and a Portfolio view card (sample council fund input, value, positions, return on cost, versus SPY).
18. Role note (executive perspective) and a footer line "Sample data only, no real-time quotes, no trading".
19. State strip: loading skeleton, empty ("No coverage for this ticker." with Open Research Library), error ("Couldn't load this company." with Retry).

## Items in the image that break the description (description wins)

- Liquidity (ADTV) and Style or mandate rows in the IPS check are not policy rules we store; keep only max position, max sector, max trade, min and max positions, min market cap, prohibited ticker or sector, and the cash floor note.
- NVDA market value $233,475.00 is almost the whole $240,050.00 fund, which contradicts "Technology sleeve 43.2% of fund" and 12 positions. The build should derive sample numbers consistently from one sample book.
- Position unrealized P&L +46.73% and contribution figures copy the fund-level return; derive them per holding.
- HON is shown as "Uncovered" with "no holding", but HON is held and unpriced (held at cost). Coverage gaps should show uncovered or stale names honestly.
- News source names are invented; the real rail uses provider headlines.
- "Show council data" toggle is not specified; the sample label should be plain text.
- The heatmap is still the fixed list; the relabel ("static reference, not live") is a fair fix for the section 7 bug.
- Nothing from section 5 appears (no country, currency, asset class, council targets or trades). Good.
