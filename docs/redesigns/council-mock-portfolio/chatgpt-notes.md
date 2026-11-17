# ChatGPT notes (council Mock Portfolio)

ChatGPT returned the image with no text ("Worked for 2m 4s"). The image is 971 x 1619 px (low resolution). The reading below is mine (the Stage 2 agent), not ChatGPT's.

## My reading of the wireframe, top to bottom

- Nav bar (stand-in, do not copy) with council name "North Harbor Student Investment Council" next to the logo. Rename to "Sample council" in the build.
- Sample content strip: "Sample content" label plus "This is simulated data ... It is a sandbox and never trades the real fund." Reset portfolio on the right.
- KPI strip, 7 cells: Sandbox value $104,820.00, Return +4.82%, Real fund return +46.73%, Benchmark SPY +10.08%, Open positions 5, Cash $39,400.00, Active thesis 1 / 3.
- "Council sandbox" header row with text tabs Overview (selected), My open pitches (4), Real fund reference, IPS guide; right note "Council only, visible to council members only"; a subline.
- Left column:
  - Portfolio performance (Portfolio / Selected asset, ranges 1W to ALL, Custom), all-time P&L +$4,820.00 (+4.82%), chart with three lines: Sandbox (emerald, area fill), Real fund (blue), SPY (dashed grey); legend with signed returns. Note: the chart's y-axis (to 8%) contradicts the +46.73% fund legend; build should rebase both over the same range.
  - Three-up row: What-if impact (AVGO buy: weight before 0.0%, after 4.2%, cash after $34,400.00, total exposure 67.1%), Risk snapshot (concentration 18.4%, max drawdown -3.2%, volatility 14.8%, beta 0.92), Thesis alignment (fit 78% "Moderate fit", three check reasons).
  - Open positions (5) with All / Winners / Losers; columns symbol, company, shares, avg cost, last, day %, unrealized P&L, market value, weight; row actions Load and Close (red text); NVDA row flagged "Above thesis single-name cap (15%)".
  - Activity and trade journal: All activity / Trades / Thesis notes, Export CSV; columns date, type, ticker, amount, note; "No more activity. Retry" line (looks like a misplaced state).
  - "Council features" band ("All content below is sample data"):
    1. Sandbox versus real fund: three KPIs (Sandbox since start +4.82%, Real fund since inception +46.73%, SPY +10.08%) and a legend.
    2. IPS snapshot: six rules (max single position 25%, max sector 35%, max single trade 8%, cash floor 5%, min market cap $5B, prohibited ticker MO), each with icon and "Pass" or "Would be blocked in the real fund" plus reason. Header note "This IPS is descriptive and never blocks sandbox orders."
    3. Sector weights: Financials / Healthcare / Technology / Industrials, sandbox vs real fund vs sector cap 35%.
    4. My open pitches (4): AVGO, COST, ISRG, ORCL with analyst, stage, expected return, "Load into ticket".
    5. Real fund reference: 12 holdings with company (sample), sector, team owner (read-only).
    6. Fund challenge standing: Campus Fund Challenge, rank 4 of 19, return +11.2%, next update, status Active.
- Right column (split by a hairline):
  - Investment thesis: tabs AI infrastructure growth / Dividend compounder / Macro rotation; objective, horizon, target sectors, position rules, max single-name weight 15%, risk tolerance; actions Edit, Delete (red), Make active, Build thesis.
  - Place order: borderless search, AVGO $1,012.40 +1.20% delayed quote, Buy / Sell text toggle, amount $5,000.00 with presets, estimated shares, cash after, projected weight, thesis check line.
  - Council IPS check (inside the ticket): "Descriptive only. Results do not disable the sandbox order." Rule rows with Pass, and one line about MO being blocked in the real fund.
  - Review buy order (solid emerald), paper trading note.
  - Market movers with Gainers / Losers, rows, and an error line "Market movers unavailable. Retry" (state example).
  - "Examples: states and empty content" strip (loading, empty, error). This is an annotation, not a section to build.

## Things to watch in the build

- The fund-reference and sector-weights tables use mono for company and sector names; only numbers and tickers should be mono.
- Sector weights in the wireframe do not add up and the real fund numbers are sample; compute from sample positions.
- Team owners in Real fund reference mix analysts and PMs; follow the shared sample council file.
