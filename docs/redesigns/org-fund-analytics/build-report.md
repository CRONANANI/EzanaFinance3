# Build report: Fund Analytics (organizational)

Branch `redesign/org-fund-analytics`, commit `e33b873`, worktree `/home/claude/wt/org-fund-analytics`. Not pushed. Route `/org-team-hub/fund-analytics`.

## What was built

Code in `src/components/org/fund-analytics/` (classes `ofa-`, plus the Command Center's shared `tcc-` atoms so the Team Hub pages read as one). Calculations in `src/lib/org-fund-analytics-model.js` (pure: the server loader, the sample bundle and the tests all run it). Sample in `src/lib/org-fund-analytics-sample.js`.

1. KPI strip (same treatment as the two live org pages; six figures, three to a line): Fund value, Return, Benchmark, Alpha, Holdings, Sectors over cap. On the right: fund name, "Sample content" with its "Show council data" switch, the period selector (SEMESTER, YTD, INCEPTION as mono caps) with its date range beneath, and "Save and open report" (executives and portfolio managers).
2. Two lines under it: the insight line (reworded to describe only) and one sentence saying what the headline figures cover.
3. Performance: the one chart, fund return against benchmark return, with a percent axis, dates, dashed gridlines, a legend with the latest values, and a hover, touch and arrow-key read-out (date, fund return, benchmark return, fund value). Beside it, Current holdings by sector: the cap line (warning icon and words when a sector is over, wired to the real rule), then Sector, Weight, a bar with the cap marked, Contribution and Manager.
4. Analyst leaderboard (Rank, Analyst, Sleeve, Pitches, Hit rate, Avg return, Avg alpha, Contribution; every header sorts and shows its arrow; a row click or the name button opens the scorecard). Beside it, Coverage gaps ("Assign in org chart" opens Org Chart) and Pitch funnel (Submitted, Approved, Executed).
5. Holding attribution: Top contributors and Top detractors.
6. Pitch outcomes: sortable, state as an arrow and words, pending pitches last, 10 rows then "Show all".
7. Team attention map: executives and permitted managers only (it hides for everyone else and when there is too little activity), six groups, the 3 member floor explained in plain words.
8. Council standing (new), Fund data health (the Command Center's section, for members with analytics access), Since last meeting.
9. Scorecard dialog (ds `Modal`): six tiles and the Calls table, with loading, error with Retry, and the "You can only view your own scorecard." state. Esc, a click outside or Close dismisses it and focus returns to the row's name button.

Every section has a skeleton in its final layout, a one-line empty state with one action, and an inline error with Retry. The route `loading.js` matches the page.

Period-scoped headline: the data supports it, so it was fixed properly. Return, benchmark and alpha come from the same daily records as the chart. A window that starts inside the history is re-based to zero (the headline is the change over the window, in points, and the page says so). A window that covers the whole history uses the stored figures, so a young fund reads the same on all three periods and matches the Command Center and Trading Desk. With no daily records, the current book's figures stand in and are labelled.

Council standing is built from data that already exists: `GET /api/org/competitions` (the council's entry, rank and return) and `GET /api/org/competitions/:id/leaderboard` (field size). It shows the competition name, rank "3 of 9", return since entry, councils entered and the end date, or a one-line empty state.

Sample content: `GET /api/org/analytics/sample` (new; same gate as the other two org pages: `isCommunityDemoViewer` plus council membership). It is the same fund: the Trading Desk bundle's 12 positions, roster, four sector teams, daily records and totals ($240,050.00, +46.73%, SPY +10.08%). Added on top: 15 pitches behind the holdings, a 35% sector cap (Financials is 40.08%, so the warning shows), a meeting nine days ago, a competition entry and an attention map. Every figure is computed by the live model. The attention map and data health are only in the bundle for members who can see them live. Nothing is sent while it shows; export is off with a message.

The page asks for sample content only when the server page says the viewer is a master admin or demo account, so ordinary members still get first paint with data and no extra request.

## Bugs fixed

- Headline figures and chart disagreed on This semester and YTD (and on Since inception when the first record already had a return).
- A losing holding could be listed under Top contributors.
- Hit rate meant two things. The leaderboard now uses the scorecard's rule (share of pitches with a reading that beat the benchmark), so a row and its scorecard agree.
- A rejected pitch could take a holding's credit from an approved one. An approved pitch now wins.
- Missing values printed a dash and were coloured as gains; pitch state printed raw text; an analyst with no pitches showed $0 contribution (now N/A).
- One failed load blanked the page with no Retry. Export failed silently and saved an internal period word; it now saves "Fund Analytics, This semester (dates)" and reports success or failure, with links to the printable version and Reports.
- The loader read positions five times and pitches three times per request; each source is now read once.
- The chart's screen reader label named fund value while drawing returns.

## Defaults taken (owner may reverse)

Listed in the commit message. In short: one sector cap wired to the real rule; sector contribution as a percent of fund value; no sector colours; each headline figure once; Since last meeting once (its own block, so the sixth KPI is "Sectors over cap"); estimate wording only for a real estimate, as "Pitch benchmark (est.)"; attention map, scorecard states, insight line, date range and the "Current holdings" and "All pitches" labels kept; mono caps period codes (guide over wireframe); This semester stays the trailing five months with its dates shown; export unchanged in behaviour and labelled "Save and open report"; "Assign in org chart" with no preselection; funnel keeps Submitted, Approved, Executed; full leaderboard for every member, scorecard privacy unchanged; the two rule changes above (hit rate, holding credit).

## Left out, and why

- Risk measures, sparklines, per-row trend lines, per-sector caps, cash, flags raised and positions closed since the last meeting: no data.
- The wireframe's duplicated headline row above the chart, the Since last meeting KPI cell, the "New" title prefixes and the State examples strip.
- `FundChart` from the Command Center is not reused: it draws fund value in dollars and builds its own geometry. This page's chart draws returns in percent with the same chart classes. Nothing was exported from the other two pages.
- "Record today's fund snapshot" still has no button (as before; the route option is unchanged).
- Period is still not kept in the page address.
- Pitch alpha still uses the S&P 500 fund whatever the council's benchmark is (a server calculation outside this page); the column tooltip says so.
- "Coverage gap" still means no pitch on file for the ticker; the copy now says exactly that.
- Removed files: the old `analytics2` components only this page used (19 files). `AnalystScorecard.jsx`, `ReportCenter.jsx` and `analytics.css` stay, so the member profile dialog and the Reports page are untouched.
- No `sql.md`: nothing needed a migration.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `check-home-canvas` (17), `test:org-fund-analytics` (new, 14 tests, added to package.json), `test:org-command-center`, `test:org-trading-desk`, `test:org-a`, `test:org-b`, eslint on changed files (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, as on main. `check:copy` fails on main already (`src/lib/macro-sync/rotate.js`), unrelated. No existing test was edited.

Preview (`/home/claude/harness-org-fund-analytics/`, real global CSS and shell, stubbed link, router and org context, mocked fetch): no page errors; `scrollWidth` equals the viewport at 390, 768, 1024, 1440 and 1920 in sample, council and empty data. 68 scripted checks pass (`interact.mjs`): sample sends nothing (period change, export, scorecard); council data arrives with the page with no fetch and no sample probe; a new period is fetched once and kept; the KPI return equals the chart's last value on every period; export posts once with the honest label and reports failure; a failed period shows Retry and heals; scorecard opens by click, row click and Enter, closes by Esc and outside click, focus returns; the own-scorecard and error states; analyst sees no export, attention map or data health; the estimate label appears only for an estimate; no cap rule means no warning; sorting and arrows; left edge 24px right of the sidebar rule and right edge on the logout line at 1440 and 1920; 44px touch targets on text toggles at phone width.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-scorecard-dialog.png`, `preview-scorecard-own-only.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`, `preview-role-analyst.png`, `preview-council-data-period.png` (a longer history, so the period is re-based).

## Untested

- `npm run build` and the real Next.js runtime. Nothing ran against the database: the rewritten loader (same queries as before, now once each), the new sample route, the server page's demo-viewer check, and the live routes as the page calls them.
- The server loader is only covered through its pure model; its queries were kept as they were but not executed.
- Council standing against real competition rows (the two routes are unchanged; the page was tested with mocked answers).
- The real navigation bar beside the page; partner (gold) scope; touch devices; screen readers.
- The printable report opening in a real browser (pop-up blockers may stop it; the message carries a link for that case).

## Things worth knowing

- The Command Center sample says 12 of 12 positions are priced, while the Trading Desk sample has one unpriced (HON). This page counts from the book, so its data health reads 1 of 12 unpriced. The Command Center sample also lists "Set IPS rules" as not done, while this page's sample has a sector cap so the cap warning can be shown.
- In the sample every period shows the same figures, because the shared sample fund has 137 days of records, shorter than every window. The page says so in its coverage line.
- The app turns every `table` into a scrolling block under 768px; `.ofa-table` sets `display: table` and scrolls inside `.ofa-scroll`.

## Shared files touched

- `package.json`: one script line.
- `src/lib/org-fund-analytics.js`: rewritten on top of the pure model (used only by this page and its API route).
- No Command Center or Trading Desk file was edited. No shell file was edited: `git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css or the four layouts.
