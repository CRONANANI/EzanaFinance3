# Ezana Fund Analytics page (organizational): how it works today

Page: Fund Analytics. Version: organizational (university student-managed investment funds). Brief: open brief (no goals or keep/drop notes were given).
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Fund Analytics is the council's performance and accountability page. It answers four questions: is the fund ahead of its benchmark, which sectors are over the policy cap, which holdings are helping or hurting, and whose pitches are working.

- Portfolio managers and executives use it before and during the council meeting to decide where to trim or add, which holdings lack analyst coverage, and what to tell stakeholders. Only they can export a report.
- Analysts use it to see where they rank and to open their own scorecard.
- Faculty advisors have no separate role on this page. They see what the role they were given (executive, portfolio manager or analyst) sees.
- How they get here: "Fund Analytics" in the Team Hub sidebar, and a shortcut and the sector desk on the Command Center home.
- What they do next: Org Chart (to assign coverage, the only direct link), then Pitch Pipeline, Compliance, Reports or Trading Desk from the sidebar.

The page sits inside the shared Team Hub shell: a 212px left sidebar listing the Team Hub pages, a 26px gap, then the page. At 1440px the page content runs from x = 270 to x = 1408 (1138px); the shell and the top navigation bar are described elsewhere and are not redesigned here.

## 2. What is on the page today

Desktop, top to bottom: a header row, a full-width strip, two columns (about 60 and 40 percent), then two full-width sections.

| Section                                    | What it shows                                                                                                                                                                                                                                | Controls and states                                                                                                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header row                                 | Small caps line "Analytics · (fund name)" and the title "Fund Analytics".                                                                                                                                                                    | Period selector and Export on the right.                                                                                                                                                                              |
| Period selector                            | This semester (default), YTD, Since inception. Text only, selected is emerald.                                                                                                                                                               | Reloads the page data; the page fades to 60 percent while loading. In practice only the chart changes (section 7).                                                                                                    |
| Export                                     | Outlined button with a download icon. Executives and portfolio managers only.                                                                                                                                                                | Saves a stakeholder report and opens a printable version in a new tab. Reads "Exporting..." while busy. No message if it fails.                                                                                       |
| Since last meeting strip                   | Clock icon, "Since last meeting", the meeting date and days ago. Five cells: Fund value (signed dollars), Return (signed points), Positions (number added), Pitches decided, New flags.                                                      | Hidden when the council has no meetings. New flags is always blank today.                                                                                                                                             |
| Performance (left)                         | Four stats: Fund value, Return, Benchmark, Alpha. Below, a line chart of fund return (emerald line, soft fill) against the benchmark (grey dashed) with a zero line. No axes, dates or scale. Legend: "Ezana fund" and the benchmark symbol. | Hover shows the date, fund value, fund return and benchmark return. If the benchmark is an estimate the legend reads "Pitch benchmark (est.)" with a tooltip. Empty: "Not enough history yet." (fewer than two days). |
| Analyst leaderboard (left)                 | Rank (top three styled), initials tile tinted by sector, name, sleeve or "No sleeve", then Pitch (count), Hit (percent), Avg α (alpha), Contribution (dollars with a small bar). Hint text: "click a row for the scorecard".                 | Click Pitch, Hit, Avg α or Contribution to sort; click again to reverse. No sort arrow. A row click, Enter or Space opens the scorecard. Analysts with no pitches are dimmed. Empty: "No analysts on the roster yet." |
| Top contributors and Top detractors (left) | Two lists side by side, up to five holdings each: ticker, sector, analyst name, dollar gain or loss, percent of total cost.                                                                                                                  | Empty: "No positions yet."                                                                                                                                                                                            |
| Concentration banner (right)               | Amber: "Concentration breach · (sector)", weight against the cap, and the weight in a pill. Otherwise: "All sectors within IPS limits" and the cap.                                                                                          | Hidden when the council has no sector cap rule.                                                                                                                                                                       |
| Insight line (right)                       | One generated sentence about alpha and concentration, for example "The fund is beating its benchmark by +2.10% this period".                                                                                                                 | None. Hidden when there is nothing to say.                                                                                                                                                                            |
| Sector vs. IPS target (right)              | One row per sector: colour dot, short name, weight bar, a marker at the cap, weight percent (amber when over), and "PM (name)" when known.                                                                                                   | Empty: "No positions to weight yet."                                                                                                                                                                                  |
| Pitch funnel (right)                       | Three bars: Submitted, Approved, Executed, with counts and conversion percent.                                                                                                                                                               | Empty: "No pitches submitted yet."                                                                                                                                                                                    |
| Coverage gaps (right)                      | "N unassigned", then holdings with no analyst: ticker, sector, an Assign button.                                                                                                                                                             | Assign opens the Org Chart page. It does not assign anyone. Empty: "Every holding has an analyst."                                                                                                                    |
| Cash tile (right)                          | Built, never shown. There is no cash figure.                                                                                                                                                                                                 | None.                                                                                                                                                                                                                 |
| Team attention map (full width)            | What members are reading about, in up to six groups (Sectors, Themes, Companies and people, Industries, Geographies, Asset classes), top five each, with a bar and the number of members.                                                    | Executives and permitted managers only. Hidden for everyone else and when there is too little activity.                                                                                                               |
| Pitch outcomes (full width)                | Table: Ticker, Analyst (or "Unassigned"), Return, Alpha, State (a coloured chip).                                                                                                                                                            | Every header sorts. Default is Alpha, highest first. Empty: "No pitches with outcomes yet."                                                                                                                           |

**Analyst scorecard dialog** (from a leaderboard row): six tiles (Hit rate, Avg return, Avg alpha, Pitches, Votes cast, Notes) and a "Calls" table (Ticker, Return, Alpha, State, with "pending" when there is no outcome yet). Close button, Esc or a click outside closes it. The page behind is not dimmed. States: "Loading scorecard...", an error line, and "You can only view your own scorecard." when the viewer lacks permission.

**Page states.** First load arrives with data already in place. The fallback skeleton shows a title block, a strip, and two columns of grey blocks; a second, different skeleton (title, four tiles, a chart, a table) shows during navigation. Any load failure replaces the whole page with one line ("Failed to load analytics." or "Could not connect.") and no Retry. There are no toasts and no menus.

**Tablet and phone.** Below 900px the two columns stack and the sidebar moves above the page. Contributors and detractors stack below 560px. The attention map goes to one column below 720px. The four headline stats stay four across at every width. Tables scroll sideways inside their own section.

## 3. What the user can do

- Change the period (three options). The choice is not kept in the page address and resets on reload.
- Hover the chart for a day's reading.
- Sort the leaderboard by four columns and the pitch outcomes table by five.
- Open and close an analyst scorecard, by mouse or keyboard.
- Export a stakeholder report (executives and portfolio managers).
- Jump to Org Chart from a coverage gap.
- Hover the benchmark legend to read why it is an estimate.
- Exists in code with no button: a manual "record today's fund snapshot" refresh for executives and portfolio managers.
- Exists in code but not placed on the page: a bar chart of alpha by analyst, and a bar chart of sector weight against sector contribution. The page already receives the numbers for both.
- Not possible today: search, filters, a custom date range, opening a ticker, downloading a spreadsheet.

## 4. Data we have

How the numbers are made, because it limits what can be drawn:

- Everything about the fund is computed from the council's real, active holdings: ticker, shares, average cost, latest price, sector and team. Value is shares times latest price. A holding with no price is carried at cost.
- Prices are refreshed once every weekday evening after the US close. Nothing is intraday.
- "Return" is the unrealised gain on current holdings over their cost. It is not time-weighted, and it ignores cash, dividends, deposits, withdrawals and anything already sold.
- Once every weekday the system records one row for the fund: date, fund value, total cost, return, benchmark return, alpha. These daily rows are the only time series the page has. History starts on the council's first recorded day.
- The benchmark is the index fund the council configured (default SPY). Its return is measured from the council's first recorded day. If index prices are unavailable, an estimate from pitch records is used and labelled as an estimate.

**A. Daily series (the only things that can be drawn as a line over time)**

| Field                   | Meaning                                                               | Freshness                             | Missing when                                                      |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| Fund value by day       | Total value of holdings at each weekday close                         | Daily, weekdays                       | Before the first recorded day; fewer than two days gives no chart |
| Fund return by day      | Cumulative return, re-based to zero at the start of the chosen period | Daily                                 | Same                                                              |
| Benchmark return by day | Cumulative benchmark return, re-based the same way                    | Daily                                 | Same; also when no benchmark figure existed that day              |
| Alpha by day            | Fund return minus benchmark return                                    | Daily, shown only as the latest value | Same                                                              |

**B. Current figures from holdings (single numbers or ranked lists, no history)**

| Field                                                 | Meaning                                                                                                    | Missing when                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Fund value, Return, Benchmark, Alpha (headline)       | The latest daily row                                                                                       | No daily rows yet                                              |
| Benchmark symbol and whether it is real or estimated  | Label for the benchmark                                                                                    | Never                                                          |
| Sector weight                                         | Sector value as a percent of fund value                                                                    | No holdings; holdings with no sector fall under "Unclassified" |
| Sector contribution                                   | Sector gain or loss as a percent of fund value or cost (received by the page, not shown today)             | No holdings                                                    |
| Sector cap                                            | The council's single maximum sector weight from its investment policy                                      | Council has no such rule                                       |
| Over cap flag, and the largest sector against the cap | Breach or within limits                                                                                    | No cap rule                                                    |
| Portfolio manager per sector                          | Name of the PM whose team mostly holds that sector                                                         | No team or PM linked                                           |
| Holding contribution                                  | Gain or loss in dollars and as a percent of total cost, with sector and the analyst who pitched the ticker | No holdings; analyst blank if nobody pitched it                |
| Coverage gaps                                         | Holdings whose ticker has no pitch by any analyst                                                          | Never (list can be empty)                                      |
| Number of holdings                                    | Count (received, not shown)                                                                                | Never                                                          |

**C. Pitch and analyst figures (current, no history)**

| Field                                                        | Meaning                                                                                                                                                                              | Missing when                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Pitch return, alpha, state                                   | Price change since the decision date, the same minus the S&P 500 fund over the same days, and one of outperforming, roughly in line, underperforming (more than 5 points either way) | Pitch undecided, or decided less than 30 days ago. Refreshed weekday mornings. |
| Pitch ticker, analyst name                                   | Who pitched what                                                                                                                                                                     | Analyst blank reads "Unassigned"                                               |
| Analyst pitch count, hit rate, average return, average alpha | Per analyst, across all their pitches (average return is received but not in the leaderboard)                                                                                        | Hit rate and averages blank until outcomes exist                               |
| Analyst contribution                                         | Summed dollar gain or loss of holdings whose ticker the analyst pitched                                                                                                              | Blank with no pitches                                                          |
| Analyst sleeve                                               | Their team's main sector, or team name                                                                                                                                               | No team                                                                        |
| Funnel counts                                                | Pitches submitted, approved, and approved pitches now held                                                                                                                           | Never (can be zero)                                                            |
| Scorecard extras                                             | Votes cast, research notes written, list of calls                                                                                                                                    | Subject to permission                                                          |

**D. Other**

| Field              | Meaning                                                                                                  | Missing when                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Since last meeting | Meeting date, days ago, change in fund value, change in return, holdings added, pitches decided          | No meetings. Holdings closed and flags raised are not recorded. |
| Attention map      | Topic, score, number of members, per group. Recomputed nightly. Only topics with at least three members. | Viewer not permitted; too little activity                       |
| Viewer             | Role, and whether they may export                                                                        | Never                                                           |
| Fund name          | Shown in the header                                                                                      | Falls back to the university name                               |

**E. Exists elsewhere in the product, not on this page today.** May be proposed as a new feature if marked as new: the other investment policy rules (maximum position size, number of holdings, prohibited tickers and sectors) and open violations (Compliance); data health for executives (holdings priced, holdings with no sector or team, time since last price update); the council's value, return and rank in open inter-university competitions; the council's configured term start and end dates; per-holding shares, cost and price (Trading Desk).

## 5. Data we do not have

Do not design around these.

- Risk measures of any kind: volatility, Sharpe, Sortino, beta, tracking error, information ratio, drawdown, value at risk, correlation. None is computed for this page.
- Time-weighted or money-weighted returns, and monthly or quarterly return tables.
- Return history per holding, per sector or per analyst. No sparklines in rows.
- Sector weight history over time on this page.
- Benchmark sector weights, active weights, and allocation, selection or interaction effects. Attribution here means gain or loss by sector, holding, analyst and pitch only.
- Per-sector targets. There is one cap for all sectors, despite the card title.
- Cash, dividends, realised gains, trade history, closed positions, turnover.
- Day change, intraday prices, or anything described as live.
- Factor, style, market cap, geography or asset class breakdowns of the fund.
- Flags raised and positions closed since the last meeting.
- Analyst photos, leaderboard rank history, pitch dates, price targets or conviction on this page.
- Any reading for a pitch decided less than 30 days ago.
- A sample content mode. Today every figure on this page is the council's own.

## 6. Must keep working

- Members only. A non-member is sent to the retail home before anything renders. Every active member may view the page.
- Export is for executives and portfolio managers only.
- Scorecard privacy: a member always sees their own; executives see anyone's; a portfolio manager sees their own team's; analysts see peers only if the council has turned that on. Otherwise the "own scorecard" message shows.
- The attention map stays limited to executives and permitted managers, keeps its three-member privacy floor, and says so.
- The default period (This semester) arrives with the page; the other two periods reload it.
- Nothing is invented. A section with no data shows an empty line or hides (strip with no meetings, banner with no cap rule, cash).
- The benchmark is named by its real symbol, and an estimate is labelled as an estimate.
- A person's real name is shown; a missing analyst reads "Unassigned".
- Leaderboard rows open the scorecard by mouse and keyboard. Esc closes it and focus returns to the row.
- Coverage gaps lead to Org Chart.
- Inbound links from the sidebar and the Command Center.
- The scorecard is also used in the member profile dialog, and reports are listed on the Reports page. Neither may break.
- The Team Hub sidebar and the top navigation bar are untouched.

## 7. Problems with the current page

### Design problems

- A title block (small caps line and big title) opens the page. The guide forbids it.
- Every section is a filled, rounded card; the strip and the banner are bordered boxes; Export and Assign are outlined buttons; the scorecard dialog is hand-built.
- Card titles are 11px uppercase labels with decorative emerald icons instead of 18px sentence case titles.
- The chart has no axes, dates or scale and is short. It cannot be read without hovering.
- The headline figures are buried inside the chart card, in whole dollars, not in a KPI strip.
- The right column is five small unrelated boxes. Analyst results are split between the leaderboard near the top and pitch outcomes at the very bottom.
- Sector contribution and analyst average return arrive with the page and are never shown.
- Cryptic headers ("Pitch", "Hit", "Avg α"), no sort arrows, and an instruction printed as text.
- Sectors use six decorative colours, including emerald, which the guide reserves for positive and interactive.
- The insight line gives advice ("Diversify before the cap review", "review the detractors below"). Copy must describe, not advise.
- The legend says "Ezana fund" for every council. The attention map prints "k-anonymous", which is jargon.
- Tickers lead nowhere. Two different loading skeletons, neither matching the layout.

### Bugs and gaps

- The period selector changes only the chart. The headline figures, the insight ("this period"), contributors, leaderboard and funnel are always all-time or current.
- On This semester and YTD the chart is re-based to the period start while the headline Return, Benchmark and Alpha stay since inception, so the two disagree.
- "This semester" is the trailing five months, not the council's configured term.
- Missing values print a short dash, not N/A. Pitch state prints raw text such as "roughly_inline".
- "New flags" is always blank, and "Positions" counts additions only.
- With fewer than five winners, Top contributors lists losing holdings coloured as gains.
- Hit rate means two things: positive return among decided pitches (leaderboard), positive alpha among pitches with outcomes (scorecard).
- Contribution credits whichever analyst pitched a ticker, even a rejected pitch, and only one analyst when several pitched it.
- "Coverage gap" means no pitch exists for the ticker, and Assign assigns nothing.
- Pitch alpha always uses the S&P 500 fund, even when the council's benchmark is different.
- Export saves a new report on every click, fails silently, and labels it with an internal period word.
- A blank return or alpha is coloured as a gain. The chart's screen reader label says fund value but the lines are returns.
- One failed load blanks the whole page, with no Retry.
- Every member sees every analyst's hit rate and alpha in the leaderboard, while scorecards are private by default. It is unclear whether that is intended.

## 8. Design rules the mock must follow

The rules outside tools get wrong most often come first.

1. Sections are flat. No fill, border, outline, shadow, glow or rounded panel, in dark or light mode. A section is a title and whitespace. Tiles, banners and strips inside it are flat too.
2. Draw the real navigation bar and the real Team Hub sidebar and do not redesign either. Page content runs from the sidebar's content edge (x = 270 at 1440px) to the right edge of the logout icon (x = 1408). Text sits on those lines, with no side padding at the outer edges and no second inner width.
3. Period selectors, tabs and toggles are text only. No track, pill, fill, border or divider. Selected is emerald text, the rest grey. Period labels are short mono caps, 12px.
4. No outlined buttons. A primary button is a solid emerald fill, white text, 8px radius, no border, 30 to 36px tall, one per group. A secondary button (Export, Assign) is plain text.
5. Search, if added, has no border, fill, outline or focus ring.
6. No page title block, eyebrow or intro sentence. Start with content.
7. Bootstrap Icons only. No emoji, logos or illustrations. A ticker is text.
8. Two typefaces: Plus Jakarta Sans for interface text, JetBrains Mono for every number, ticker, date and axis tick.
9. Sentence case for titles (18px, weight 700) and buttons. Caps only for 11px table headers and period codes.
10. No em dashes anywhere.
11. Describe, never advise. No "should", "recommend", "diversify". Never say "real-time". Say when figures were last updated.
12. Dark mode first. Light mode must work.
13. Nothing drawn touches text. A selected row is emerald text only. A vertical rule keeps 24px from text, a horizontal rule 12px.
14. Side-by-side sections are 64px apart. Stacked sections are 20px apart with 20px above and below. A side column is split off by one full-height grey vertical hairline.
15. A KPI strip is about 48px tall and only as wide as its content: 28px icon tile, 12px grey label, 18px mono value, vertical hairlines between cells. Page actions share its row on the right.
16. Hairlines (1px, primary text at 7 to 10 percent) divide content and never enclose it.
17. Charts: main line emerald with a soft fill fading out; the benchmark neutral grey and dotted; 11px grey mono axis ticks; faint dashed gridlines; no border or background. No chart, sparkline or statistic without data in section 4.
18. Tables: no header fill, hairlines between rows, numbers right-aligned in mono, first and last columns flush with the section edges, wide tables scroll inside their section.
19. Values are signed (+9.33%, -0.92%). Money shows two decimals. Missing values read N/A. Colour is never the only signal: a breach carries an icon and words.
20. Only overlays (dialogs, menus, tooltips, toasts) have a solid surface, border, shadow and radius.

| Name                        | Dark    | Light   |
| --------------------------- | ------- | ------- |
| Page ground                 | #0a0e13 | #ffffff |
| Primary text                | #f0f6fc | #0f172a |
| Secondary text              | #e2e8f0 | #1e293b |
| Muted text                  | #8b949e | #64748b |
| Faint text                  | #6b7280 | #94a3b8 |
| Emerald                     | #10b981 | #059669 |
| Emerald as text             | #34d399 | #047857 |
| Positive                    | #10b981 | #059669 |
| Negative                    | #ef4444 | #dc2626 |
| Warning                     | #fbbf24 | #d97706 |
| Purple (third chart series) | #a78bfa | #a78bfa |

## 9. Open questions for me

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. Should the period apply to the whole page? Default: the headline figures and the chart follow the period; everything else is labelled "current holdings" or "all pitches".
2. Should This semester use the council's term dates? Default: keep the trailing five months and show the date range beside the selector.
3. Should every member see the full leaderboard? Default: yes, as today.
4. Should the alpha by analyst and sector contribution views return? Default: sector contribution yes, as a column beside sector weight; analyst alpha stays in the leaderboard.
5. May figures from part E of section 4 be brought onto this page? Default: yes, only for viewers who can already see them elsewhere, and listed as new.
6. Should risk measures be derived from the daily rows? Default: no, because the return is not time-weighted.
7. Should the insight line stay? Default: yes, reworded to describe only.
8. Should master admin and demo accounts get sample content here? Default: yes, labelled "Sample content", following the Community pattern.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Fund Analytics. Route: /org-team-hub/fund-analytics. Version: organizational (university student-managed investment funds). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. The page sits inside the Team Hub shell: draw the existing left sidebar and the top navigation bar unchanged and design only the content area to their right. The only line charts allowed are the four daily series in part A of section 4 (fund value, fund return, benchmark return, alpha); every other figure is a single current number or a ranked list, so draw it as a value, a bar or a table, never as a trend line or sparkline. Draw no risk measures. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives and faculty advisors), for example pitch outcomes, coverage, investment policy compliance, attribution by sector, holding and analyst, meeting preparation and council versus council standing, each built only from section 4 and marked as new when it comes from part E. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
