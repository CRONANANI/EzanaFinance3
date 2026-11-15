# Build report: Command Center (org) and the shared Team Hub shell

Branch `redesign/org-command-center`, commit `184dfcd`, worktree `/home/claude/wt/org-command-center`. Not pushed.

## What was built

### A. Shared shell (every Team Hub page, Trading Desk, Competitions, Council Rankings)

- `TeamHubShell` is now the only place the sidebar and frame are rendered. The four org layouts (`org-team-hub`, `org-trading`, `org-competitions`, `council-rankings`) each call it; before, each repeated the markup.
- `TeamHubSidebar`: 200px text-only column on the logo line, one full-height hairline with 24px clear on each side (from the navigation bar to the foot of the page), member block (40px initials, name, title or role in small emerald caps, skeleton while membership loads), 17 destinations in the same order with the same role rules (executive 17, portfolio manager 16, analyst 14), plain mono counts hidden at zero with breaches in red, refreshed every minute and on `ezana:org-nav-counts-refresh`.
- Selected item: emerald text and weight only. Hover: text colour only. Keyboard focus ring kept.
- Pinned while the page scrolls; on a short window the column scrolls on its own so no item is cut off.
- Under 900px: stacks above the page, items wrap as 44px links with inline counts, the vertical rule becomes a horizontal one.
- Icons follow the handoff table.
- Bug fixed on the way: Pitch Pipeline never read as current on `/org-team-hub/pitches` (the old match compared against `/pitch` exactly).

Shell files (later page builds must NOT edit these):

- `src/components/org/TeamHubShell.jsx`
- `src/components/org/TeamHubSidebar.jsx`
- `src/components/org/team-hub-nav.js`
- `src/components/org/team-hub-shell.css`
- `src/app/(dashboard)/org-team-hub/layout.js`
- `src/app/(dashboard)/org-trading/layout.js`
- `src/app/(dashboard)/org-competitions/layout.js`
- `src/app/(dashboard)/council-rankings/layout.js`

Interface:

- `<TeamHubShell fade={true} sidebar={...}>{children}</TeamHubShell>`. `fade` replays a 160ms fade of the page on route change (on for `/org-team-hub`, off for the other three, as before). `sidebar` passes optional props to the sidebar (previews and tests only).
- `<TeamHubSidebar selected role member loading counts />`, all optional overrides. With none, it reads the member and role from `useOrg()`, the current item from the route, and counts from `GET /api/org/nav-counts`.
- `team-hub-nav.js` exports `TEAM_HUB_NAV`, `teamHubNavFor(role)`, `isTeamHubNavActive(pathname, item)`, `teamHubCount(item, counts)` and the name helpers.
- CSS classes are `thub-*`. A page sits in `.thub-main`, which gives it 24px of top padding and no side padding. The old `.org-shell`, `.org-shell-main` and `.ohn-*` classes are gone (nothing else used them).
- What a page inherits: it starts 24px under the navigation bar, 24px right of the rule, and ends on the logout line. Pages that still add their own padding will sit further in until they are redesigned.

### B. Command Center body (`/org-team-hub`)

Code in `src/components/org/command-center/` (classes `tcc-*`), model in `src/lib/org-command-center.js`.

1. KPI strips and actions: Fund value, Return, Alpha, Benchmark, then Open tasks, Due this week, Open breaches (managers only), Team members. On the right: cohort label, sample label and switch, council switcher (two or more councils), Fund calendar, New task (managers).
2. Fund performance: dollar-axis chart with dotted "same cost in the benchmark" line, 1M 3M YTD 1Y, hover and arrow-key read-out, legend, read-out column, link to the Trading Desk.
3. Needs your attention: role label, Pending / In progress / Complete with counts, rows for tasks (scoped by role) plus, under Pending, the member's own assignments, the grading queue and open breaches (managers) and the next meeting. Late items and breaches lead. Task rows carry a status menu (Pending, In progress, In review, Complete) for the assignee and for managers.
4. Upcoming dates (Meetings and Assignments toggles, tasks always show, 60 days) and Seven-day digest.
5. Sector teams ranked by return, beside the Setup checklist until all five steps are done (then the Council snapshot takes its place).
6. Fund data health (analytics access) and Council snapshot.

Every section has a skeleton in its final layout, a one-line empty state with one action, and an inline error with Retry that reloads only its own data.

New task dialog (ds `Modal`): title, description, assignee (council roster, loaded when the dialog opens), due date, priority. Saves through the existing task route.

Sample content: `GET /api/org/team-hub/sample` returns a bundle only to master admin and demo accounts (`isCommunityDemoViewer`) who are council members. The page shows "Sample content" and a "Show council data" switch. Status changes and new tasks made while it shows stay on the page and are never sent. All sample figures are derived from the sample sleeves and rows, not typed twice.

## Bugs fixed

- Chart loaded the oldest 64 snapshots (confirmed in `summary/_loader.js`: ascending order with a limit). Now newest 366, reversed. The Org Chart page uses the same loader and gets the same fix.
- A failed section no longer shows its empty state. A failed status change reverts with a message.
- "In review" no longer jumps to Pending; there is no blind cycle any more.
- Missing values read N/A and are never coloured as gains.
- Task dates in the calendar no longer link back to this page.
- Fund data health now shows for a non-executive granted analytics access (the server already allowed it).

## Defaults taken (reversible)

Listed in the commit message: emerald-only selection, pinned sidebar, title first, cohort as a label, New task built, dollar axis, one body for all roles, search removed, KPI as two strips of four, guide over handoff on button text colour, caps table header, 18px values and one-line states.

## Left out, and why

- Cohort switcher that filters widgets: no data layer supports it.
- Jump-to search: removed. Every destination it could reach is in the sidebar.
- Per-row sector links: replaced by one "Open fund analytics" link (all rows went to the same place).
- The fund value block as a button: replaced by the "Open trading desk" link.
- "This week in the fund" card strip with arrows, "Task management" and "Deadlines" panels: merged into Needs your attention and Upcoming dates. Assignments stays reachable from the sidebar, the attention list and the snapshot.
- The wireframe's State examples strip, "Add item" button and percent axis.
- Sidebar counts are always the council's real counts, even while the page shows sample content.
- The old page skeleton with a title block: replaced by one in the page's layout.
- No `sql.md`: nothing needed a migration.

## Checks

All pass: `lint:branding`, `lint:ds` (also run on the changed folders), `lint:css`, `test:page-canvas`, `test:em-dash`, `test:org-command-center` (new, 7 tests, added to package.json), `test:org-a`, `test:org-b`, `check:org-emdash`, `check-home-canvas` (17), `lint:a11y`, eslint on changed files (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, none in changed files. No existing test was edited.

Preview (`/home/claude/harness-org-command-center/`, real global CSS and dashboard envelope, stubbed link, router and org context, mocked fetch): 15 screenshots with no page errors, `scrollWidth` equal to the viewport at 390, 1024, 1440 and 1920. 27 scripted checks pass (`interact.mjs`): status menu, sample writes stay local, PATCH and POST sent once in live mode, failed PATCH reverts, validation, retry heals one section, role item counts 14/16/17, analyst sees no New task, breaches or health, alignment at 1440 and 1920 (sidebar on the left line, button on the right line, 24px either side of the rule, rule from navigation bar to page foot), pinned sidebar, loading states.

Screenshots in this folder: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-other-page-1.png` (Assignments in the new shell), `preview-other-page-2.png` (Fund Analytics in the new shell, empty data).

## Untested

- `npm run build` and the real Next.js runtime (server layout gate, the new route, the loader change against a database). Nothing was run against Supabase.
- The real navigation bar beside the shell (the preview uses a stand-in at the same 64px and envelope).
- The type of the task due date column. The dialog sends the chosen day as `YYYY-MM-DDT23:59:59Z`, which a date or a timestamp column both accept; not verified against the live table.
- Trading Desk, Competitions, Council Rankings and the other 12 Team Hub pages were not bundled. They use the same shell call as the two that were.
- The council switcher menu with a real second council (rendered in the preview, switching not exercised).
- Partner (gold) scope, real touch devices, screen readers.

## Notes for later page builds

- Stale comments naming "OrgHubNav" remain in `org-trading/loading.js`, `org-team-hub/pitches/loading.js` and `ds/Skeleton.jsx` (left so those files stay untouched for their own builds).
- `teamHubEyebrow` in `src/lib/org-team-calendar.js` is now used only by its test.
- The app adds 44px minimum heights to buttons under 768px, which changes inline text buttons to flex boxes. Give text toggles their own `display: inline-flex` and a gap.
