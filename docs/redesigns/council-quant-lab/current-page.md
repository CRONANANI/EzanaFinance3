# Quant Lab page (council section): how it works today

Page: Quant Lab, Overview. Version: organizational (a council-only section on the shared page, shown only to council members). Route: /for-the-quants (the seven workspaces under it keep their own routes). Brief: keep the existing Quant Lab working for everyone and add a council section for university investment councils.
Written from the code at commit a2de444 (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Quant Lab is Ezana's systematic research workbench: build a rules-based strategy, backtest it on historical prices, validate that the result survives data it was not fitted to, and study its risk. The Overview is the landing page: the user's strategies, their latest results and recent research activity.

- Who uses it today: any signed-in user. It is marked as a premium area in the Research menu. Every strategy and run is private to the person who made it.
- Who in a council would use the council section: analysts building quantitative support for a pitch, portfolio managers checking a sleeve's risk at today's weights, executives and faculty advisors reviewing a pitch's evidence before the committee votes.
- Decision the council section supports: "is the quantitative evidence behind this pitch sound enough to present", and "what does the risk of our real fund look like if we add this name".
- How they get to it: Research menu, Quant Lab. After: Strategy Lab, Backtesting or Risk & Portfolio, then Pitch Pipeline.

The redesign keeps the whole Overview and the sidebar working and adds a council band (or council cards) that only council members see.

## 2. What is on the page today

Desktop. The page sits inside the Quant Lab frame.

**A. Workspace sidebar (shared by every Quant Lab page).** Collapsible: Overview, Strategy Lab, Backtesting, Factor Research, Risk & Portfolio, Statistical Arbitrage, Datasets & Research, Paper Trading. Below them: Model library, Strategy leaderboard (both inside the lab), Prediction markets and Quant courses (the Learning Center).

**B. Toolbar.** A "Strategy" selector (name and version; "No strategies yet" when empty) and the primary button "Create strategy" (opens Strategy Lab with a new strategy).

**C. Summary strip.** Five cells: Strategies (count, active and archived), Active research (running backtests and validations, completed in the last day), Paper trading (always "n/a", "Not available yet"), Sharpe (best) with the strategy, version and window, and Max drawdown of the selected strategy's latest run.

**D. Strategy performance.** A line chart of the selected strategy's latest completed backtest against its benchmark, period options 3M, 6M, 1Y and Run, a "Drawdown" switch that adds the drawdown from peak, an "Open full results" link, and four figures computed from the same slice. Notes: "Curve and metrics read the same stored run." Empty: "Create a strategy to see its performance here." Loading and error lines.

**E. My strategies.** A paged list (six per page): strategy, version and type, return (sortable), Sharpe, max drawdown, status (Draft, Research, Archived), a validated mark, and a menu with "Open and edit" and "Backtest".

**F. Factor exposure.** A planned panel explaining that factor attribution is not built yet.

**G. Risk overview.** For the selected strategy's latest run: annualised volatility, beta against its benchmark, one-day 95% value at risk, 95% expected shortfall, average and peak gross exposure, with a method note. Link to Risk & Portfolio. Empty until a completed backtest exists.

**H. Research activity.** A feed of backtests and validations (completed, running, failed) with the strategy, how long ago and the result (return, or out-of-sample Sharpe for a validation). "View all" opens Backtesting.

**I. Recent backtests.** A table: run, strategy, window, return, Sharpe, status. "View all".

**J. Quick actions.** New strategy, Run backtest, Factor research, Risk analysis, and a disabled "Paper deploy" marked "Not available yet".

**K. From Sonar.** A planned panel: hypotheses saved in Sonar are not handed to Quant Lab yet; links to Datasets & Research.

**States.** "Loading your research.", "Your research could not be loaded." with Retry, and an empty line per panel.

**Tablet and phone.** Bands wrap; the sidebar collapses to icons.

**The workspaces (not redesigned here).** Strategy Lab, Backtesting (with validation: in-sample versus out-of-sample, cost sensitivity, parameter sweep, walk-forward), Factor Research, Risk & Portfolio (including the mock portfolio's risk at today's weights), Statistical Arbitrage, Datasets & Research, Paper Trading (planned). The Strategy leaderboard shows placeholder rows.

## 3. What the user can do

| Action                                               | Who            | Notes                       |
| ---------------------------------------------------- | -------------- | --------------------------- |
| Pick the working strategy                            | Signed-in user | Carried to other workspaces |
| Create a strategy                                    | Signed-in user | Opens Strategy Lab          |
| Switch chart period, show drawdown                   | Signed-in user |                             |
| Open full results, open and edit, backtest           | Signed-in user |                             |
| Sort My strategies by return, page through           | Signed-in user |                             |
| Open any workspace from the sidebar or quick actions | Signed-in user |                             |

Not possible today: share a strategy or run with anyone, attach a run to a pitch, paper deploy. There is nothing council-specific on this page.

## 4. Data we have

Quant Lab's own data, per user:

| Field                             | What it means                                                                                                                        | Source in public terms                          | Freshness   | Missing for                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------- | ---------------------------------------- |
| Strategies                        | Name, description, status, versions with their rules and benchmark                                                                   | Saved by the user                               | Immediate   | Private to the author                    |
| Backtest runs                     | Window, return, Sharpe, max drawdown, volatility, beta, value at risk, expected shortfall, gross exposure, daily curve, trade ledger | The lab's backtest engine on daily prices       | When run    | Strategies never run                     |
| Validation reports                | In-sample and out-of-sample results, cost sensitivity, parameter sweep, walk-forward folds                                           | The lab's validation engine                     | When run    |                                          |
| Portfolio risk at today's weights | Volatility, value at risk and concentration of a set of holdings                                                                     | The lab's risk engine on a year of daily closes | When opened | Only fed the user's mock portfolio today |

Council data that exists and could connect (all scoped to the viewer's council):

| Field                           | What it means                                                                                                                                               | Source in public terms      | Freshness              | Missing for                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------- | -------------------------------------------------- |
| Positions                       | Holdings with ticker, sector, team, shares, cost, last price, value, weight                                                                                 | The council's position book | Prices refreshed daily | Councils without holdings                          |
| Fund value series and benchmark | Daily fund value against the council's benchmark                                                                                                            | Fund snapshots              | Daily                  | New councils have a short history                  |
| Pitches                         | Ticker, analyst, team, stage, expected return, investment committee date, votes                                                                             | Pitch Pipeline              | Immediate              |                                                    |
| Pitch models checklist          | Required models per desk (for example DCF, three statement, comparables, earnings analysis) with uploaded, reviewed, version                                | Pitch Pipeline              | Immediate              | These are uploaded files, not Quant Lab strategies |
| IPS rules                       | Max single position, max sector, max single trade, min and max positions, min market cap, cash floor, prohibited tickers and sectors, each warning or block | Compliance                  | Immediate              |                                                    |
| IPS check                       | Tests a proposed ticker and size against the rules and current holdings                                                                                     | Compliance                  | On request             |                                                    |
| Assignments of type Model       | Tasks with due date, status and submissions                                                                                                                 | Assignments                 | Immediate              |                                                    |

## 5. Data we do not have

Do not design around these.

- Shared or council-owned strategies, runs or validations. Every strategy is visible only to its author, and there is no way to share one.
- A link from a backtest or validation to a pitch.
- Factor attribution of a strategy or of the fund (planned, not built).
- Paper deployment of a strategy (planned, not built).
- A real strategy leaderboard (the current one is placeholder rows).
- Hypotheses handed from Sonar into Quant Lab (planned, not built).
- Intraday or options data, grades or reviewer comments on a quant model.

## 6. Must keep working

- The full Overview as in section 2 for every user, and every workspace route under Quant Lab.
- The sidebar links, its collapse, and the working strategy carried between workspaces.
- Strategy selection, Create strategy, performance chart periods and drawdown, Open full results.
- The rule that the chart and its figures read the same stored run.
- "Not available yet" honesty for Paper trading, Factor exposure and From Sonar.
- The council section must never show to non-council accounts, and never expose one member's private strategy to another.

## 7. Problems with the current page

Design problems:

- Quant Lab is a solo tool. A council analyst cannot show a backtest to their portfolio manager inside Ezana.
- Three of the panels (Factor exposure, Paper trading, From Sonar) are placeholders that take up a full band.
- The risk engine can analyse holdings at today's weights, but only for the user's mock portfolio, never for the council's real fund.

Bugs:

- None found in the Overview code.

## 8. Design rules the mock must follow

The page must match the rebuilt pages: the Quant Lab sidebar stays, a compact KPI strip with page actions on its right, flat sections, text tabs, and a small "Sample content" label. Most often broken first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408).
3. Tabs, period selectors and toggles are text only. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text.
5. Search has no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only.
8. Plus Jakarta Sans for text. JetBrains Mono for every number, ratio, date and ticker.
9. Sentence case. No em dashes. Describe, never advise.
10. Dark mode first; light mode must work.
11. Side-by-side sections 64px apart, stacked 20px. A side column is split off by one full-height hairline.
12. KPI strip: about 48px tall, as wide as its content, 12px grey label, 18px mono value.
13. Lists: 11px grey caps header, hairlines between rows, numbers right-aligned.
14. Charts: emerald for the strategy or fund, dashed grey for the benchmark.
15. Statuses (Draft, Research, Archived, passes, warning, blocked) are text with an optional icon, never a filled chip and never colour alone.
16. Missing values read N/A. Percentages and ratios signed where they are returns.
17. Only overlays have a surface, border, shadow and radius.
18. Each section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Where does the council section go? Default: a band under the summary strip with text tabs Council and My research.
2. Share strategies with the council? Default: needs a database change (a share flag and a link to a pitch); written up for the owner, shown as "not available yet" until then.
3. Run the risk engine on the real fund? Default: yes, "Fund risk at today's weights" from the council's positions, read-only.
4. Test a pitch against the IPS from here? Default: yes, an "IPS pre-check" card for the viewer's open pitches using the existing check.
5. Show the pitch models checklist here? Default: yes, read-only for the viewer's open pitches, linking to Pitch Pipeline.
6. Replace the three placeholder panels? Default: fold them into one line, "Planned: factor exposure, paper deploy, Sonar handoff".
7. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Quant Lab, Overview. Route: /for-the-quants. Version: organizational (a council-only section on the shared page). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: one full-page desktop mock at 1440px wide in dark mode, output as an actual image. Keep the Quant Lab sidebar and all of the existing Overview content (toolbar with Create strategy, summary strip, strategy performance, my strategies, risk overview, research activity, recent backtests, quick actions) and add the council section that only council members see. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Include 4 to 8 council features as flat component cards, specifically tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors) and to Ezana's mission of institutional-grade tools for student-managed funds, built only on data in section 4: for example fund risk at today's weights (volatility, value at risk, largest weights from the real fund), IPS pre-check for my open pitches (each rule as passes, warning or blocked), pitch models checklist (required models uploaded and reviewed), my Model assignments with due dates, the fund against its benchmark beside my strategy's backtest, and sector sleeve concentration against the sector cap. Use mock data from the same sample council as the other org pages, with invented names only: Sample council, fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions (JPM, SCHW, BAC, LLY, UNH, MRK, NVDA, MSFT, AAPL, CAT, GE, HON) in four sector teams (Financials, Healthcare, Technology, Industrials), IPS rules such as max single position 25%, max sector 35% (block), max single trade 8% and cash floor 5%, pipeline pitches on AVGO, COST, ISRG and ORCL, analysts Amara Tesfaye, Mikael Bekele, Elena Rossi and Jonas Weber, portfolio managers Selam Haile and Chidi Okoye. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
