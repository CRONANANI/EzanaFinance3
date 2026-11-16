# Build report: Org chart (organizational)

Branch `redesign/org-chart`, worktree `/home/claude/wt/org-chart`. Not pushed. Route `/org-team-hub/org-chart` (`/org-team-hub/hierarchy` still forwards here).

Commits:

1. `96be3ad` feat(org): flat-canvas Org chart with sector coverage assignment, flag routing, unassigned members and sample content
2. `8adcc3d` fix(org): fund charts start at the first meaningful record and never overlap date labels (the owner's requested fix to the shared fund charts, kept separate)

## What was built

Code in `src/components/org/org-chart/` (classes `ooc-`, on the Command Center's shared `tcc-` atoms so the five Team Hub pages read as one). Rules in `src/lib/org-chart-model.js` (pure: the loader, the page, the sample and the tests read it). Sample in `src/lib/org-chart-sample.js`.

1. KPI strip: Members, Sector teams, Leadership, IC voters, No sector head ("N of teams", amber with a warning icon when above zero), Sectors covered ("N of 11"), Fund value, Fund return. On the right: "Sample content" with "Show council data", then Invite members (executives; the one filled button).
2. Reporting structure: Leadership (every executive, with who they report to), then one column per sector team: the sector head, then the team's other members under a spine, with rank in words and "IC" for committee members. A team without a portfolio manager shows a dashed "No sector head, No portfolio manager on this team". An "Unassigned" column lists members with no team, on the leadership team, or on a deleted team, with the reason. A line says what the viewer can change.
3. Sector coverage (beside it): the eleven sectors, who covers each (names open the member), and Assign or Change for executives and portfolio managers.
4. Sector teams table: Team, Sector head (with "Highest rank on the team: X" where that is not the routing head), Members, Team value, Team return; Unassigned and Leadership lines; Total. Money from the fund book via the Team Hub summary, which can fail separately (inline error with Retry; members still show).
5. Flag routing: one paragraph on the real rule and one line per team plus "No team on the holding", from `resolveFlagRouting`, a line-for-line mirror of `resolveFlagRoutingDb` and the executive fallback. A team with no portfolio manager reads "No portfolio manager to route to", and where nobody on the team can receive a flag the line names the executive it falls to (or says no one can).
6. Roster: text filters All members, Leadership, Portfolio managers, Analysts, Unassigned; Member, Rank, Title (custom title only), Team, Reports to, Coverage, Term end, Graduating, IC, Action (Change rank where the rank rules allow, View). Own row in emerald text. Scrolls inside itself on narrow screens.
7. Succession: members with a term end or the graduating marker, soonest first, with the sectors a graduating member covers. Beside it, Recent rank changes (latest 12 from the rank log).
8. Member panel (ds `Modal`, opened from any person): rank and title, role group, IC, Change rank (when allowed), team, reports to, coverage, term, graduating, Contact N/A, direct reports (each opens), an edit form for executives and portfolio managers (title, manager with loops refused, term start and end, graduating, all eleven sectors), scorecard tiles and calls (existing scorecard route and its privacy), competition placements (existing badges route), and a message box (existing messages route; not on one's own panel).
9. Change rank (ds `Modal`): only the ranks the viewer may give, each with its role group; the note says what follows the rank. Opened from the roster or the panel (returns to the panel after).
10. Coverage dialog (ds `Modal`): who covers one sector, grouped by role group, with a note that routing only picks analysts.

Loading skeletons in the final layout (route `loading.js` and in-page), one-line empty states with one action, inline errors with Retry in every section. The members-only message stays.

Sample content: `GET /api/org/chart/sample` (new; `isCommunityDemoViewer` plus council membership, as on the other org pages). The same council as the Command Center, Trading Desk, Fund Analytics and Assignments: the same nine members and the viewer, the same four teams, sleeves and totals ($240,050.00, +46.73%, from the Trading Desk builder), the same scorecards (from the Fund Analytics builder). Added here: ranks matching each member's label, reporting lines, four covered sectors, term dates, two graduating members, four rank changes, one competition placement. Edit rights come from the real rules (a president viewer can re-rank all nine; an analyst nobody). Rank changes, edits, coverage and messages on sample rows stay on the page; scripted checks confirm no request is sent. No real people's names (the two in the design files were not used; a test guards it).

## Conflicts decided before the build (in the commit as defaults the owner may reverse)

- Ten named ranks with the server's rules; no R1 to R4, no "Sector Head" rank.
- Member panel and change rank are overlays; the width goes to the chart.
- One page for all roles, gated by existing checks.
- Number formats as on the other rebuilt org pages.
- "Coverage lead" and "Coverage: All" dropped.
- Sector coverage assignment restored on the existing chart PATCH route (executives and portfolio managers), from the panel and the Sector coverage section; title, manager, term dates and graduating in the panel. The route's authorization was not changed.
- "Invite members" goes to `/settings?tab=organization`. Verified: the settings page reads `?tab=`, the Organization tab exists for executives (`OrgAdminPanel`), and it contains Invite and Onboarding (`InviteOnboarding`, which calls `/api/org/invites`). It is shown only to executives, because non-executives do not get that tab. (Members granted invite rights who are not executives still have no tab to reach; the old button was also manager-only.)
- Flag routing uses the routing truth (the team's first portfolio manager); "No sector head" marks a team with none.
- Unassigned group shown.
- Recent changes built: `org_role_changes` has the row policy "Org members read role changes" (every active member of the council may read), in `20260625000000_org_hierarchy_tiers.sql` and rewritten in `20260727000000_fix_org_rls_recursion.sql`. Read in the loader with the member's own client. If that read fails, the section says so with Retry.
- Contact reads N/A; the member payload was not widened (a test checks the selected fields).

## Decisions of mine worth a look

- The structure is a column per team rather than a drawn tree with elbow connectors. With the real 200px sidebar and coverage beside it, four to six team columns fit; elbows to a single executive would assert a reporting line the data often does not have (team heads report to different people). Each person shows "Reports to X" instead.
- Members are now loaded earliest joined first (the loader orders by `joined_at`), so "first portfolio manager" and "first analyst" match routing's choice. Routing itself orders by `created_at` on `org_members`; the live table has `joined_at` and no `created_at` column in the schema I checked, so routing's ordering there should be looked at separately (not changed).
- Covering members outside the analyst group are listed and editable, with a note that routing will not pick them.
- The rank log shows 12 rows; there is no "show more".
- "Show council data" leaves sample content; the page also offers "Show sample content" back.
- Only the custom title shows in the Title column (N/A when it equals the rank).

## Chart fix (second commit)

Shared `FundChart` (Command Center, also the Trading Desk) and the Fund Analytics percent chart.

- Start rule, in the pure models (`src/lib/org-command-center.js`): a record is meaningful when its value is at least 5% of the largest value in the whole history (`MEANINGFUL_SHARE`, `firstMeaningfulIndex`). Only the leading run below that (or with no value) is dropped; a later dip stays; with no usable value nothing is dropped. `buildFundChart` applies it to the snapshots (and returns `skipped`). `scopeFundSeries` applies it to the daily records before scoping, so Fund Analytics' headline and chart still start from the same record; inception still uses the stored figures.
- Ticks: `placeXTicks` estimates label widths, anchors at start near the left edge and at end near the right edge, keeps a label only when it starts 12px after the last kept one, and prefers the newest date. Both charts render its anchor. `buildReturnChart` also drops repeated dates on short series.
- 4 new tests (2 per suite); no existing assertion changed. Before and after: `preview-chart-fix-before.png`, `preview-chart-fix.png` (a series whose first three records hold $12.40, $40.00, $310.00).

## Left out, and why

- Secondary coverage: every saved record is primary (as before).
- Photos, contact details, head-count targets, workload: no data.
- The wireframe's state examples and annotation strips; the old Radial and Columns layouts, the performance tape, the committee overlay toggle (IC is a word on every voter).
- `src/components/org/orgchart2/` (OrgChartTree, SectorCoverageMap) has no importer; left in place.
- No `sql.md`: nothing needed a migration.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas` (updated: it pointed at the deleted `org-final.css` root, now at `.ooc-page` in `org-chart.css`), `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `test:org-chart` (new, 10 tests, added to package.json), `test:org-command-center` (9), `test:org-fund-analytics` (16), `test:org-trading-desk` (10), `test:org-assignments` (13), `test:org-a`, `test:org-b`, `test:security`, eslint on changed files (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, as on main.

Preview harness `/home/claude/harness-org-chart/` (real global CSS and Team Hub shell, stubbed link, router and org context, mocked fetch; navigation bar is a stand-in): no page errors; `scrollWidth` equals the viewport at 390, 768, 1024, 1440 and 1920, in sample, council and empty data, and with the panel open on a phone. 77 scripted checks pass (`interact.mjs`): sample writes send nothing (edit, coverage, rank, message); edit sends one PATCH with only changed fields; date and manager-loop validation; server refusals shown; rank PATCH to the role route and the log refreshes; coverage sends one PATCH per changed member; roles (analyst has no edit, coverage, rank or invite; portfolio manager can assign coverage, re-rank only some members, only ranks below their own, and has no invite; senior analyst renders with no coverage edit); unassigned group and reasons; no-sector-head KPI and routing lines; error states heal on Retry; summary failure is separate; members-only state; invite button on the logout line.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-member-panel.png`, `preview-member-panel-scorecard.png`, `preview-member-panel-phone.png`, `preview-coverage-assignment.png`, `preview-change-rank.png`, `preview-role-analyst.png`, `preview-role-analyst-panel.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`, `preview-chart-fix.png`, `preview-chart-fix-before.png`.

## Untested

- `npm run build` and the real Next.js runtime; nothing ran against the database through the app: the changed loader (teams, rank log, ordering), the new sample route, the server page's demo-viewer check, and the existing PATCH routes as the page calls them.
- The live rank log read under the real row policy (confirmed from the migrations and a read-only policy listing, not by signing in).
- Real messaging, scorecard and badges routes (mocked).
- The real navigation bar; partner (gold) scope; touch devices; screen readers.

## Shared files touched

- `src/app/api/org/chart/_loader.js`: adds `teams` and `changes` to the GET payload, orders members by join date, takes the sector list and manager roles from the model. GET and PATCH authorization unchanged; the old OrgMemberProfileModal (still used nowhere else but kept) reads the same payload fields it did.
- `src/lib/org-command-center.js`, `src/lib/org-fund-analytics-model.js`, `src/components/org/command-center/FundPerformance.jsx`, `src/components/org/fund-analytics/Performance.jsx`: the chart fix only (second commit).
- `package.json`: one script. `scripts/check-page-canvas.mjs`: one path. `scripts/check-org-command-center.mjs`, `scripts/check-org-fund-analytics.mjs`: new tests appended.
- No shell file was edited: `git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css or the four layouts.
