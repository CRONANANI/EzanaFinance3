# Build report: Sonar Research (organizational)

Branch `redesign/org-sonar-research`, commit `19ce19e`, worktree `/home/claude/wt/org-sonar-research` (cut from `939c85a`). Not pushed. Routes `/org-team-hub/sonar` and `/org-team-hub/sonar/[reportId]`.

## What was built

Code in `src/components/org/sonar/` (classes `osp-`, on the Command Center's shared `tcc-` atoms). Pure rules in `src/lib/org-sonar-research-model.js`; sample in `src/lib/org-sonar-research-sample.js`; sample route `GET /api/org/sonar-reports/sample` (same `isCommunityDemoViewer` gate as the other Team Hub pages).

1. KPI strip: Awaiting your review (reviewers) or Yours under review (others), Your drafts with "N returned", Approved in the analytics window, Deep runs left of the pool, Stale coverage. Right of it: "Sample content" and its "Show council data" switch (same behaviour as Pitch Pipeline), Open main Sonar, Budget settings (executives), Run deep research (the one filled button).
2. Text tabs Reports, Research, Analytics. Tab, search, filters and window are kept in the address (`?tab=&q=&status=&kind=&visibility=&ticker=&mine=&window=`).
3. Reports: Needs you (Awaiting your review, Returned to you with the reviewer's note, Your drafts); All reports with borderless search and text filters (status, kind, visible to, ticker, mine, Clear filters); Research on pitches (links to the pitch in the Pitch Pipeline). Side column behind one rule: Fund budget (left of pool, reset date, own runs and allocation, six-month bars), Coverage at risk (approved research older than 120 days; a ticker opens the filtered list), Research quality (analysts see only their own line, decided by the server).
4. Research: Fund fit / Open question text toggle, borderless fields, Supports a pitch, budget line. The run is the shared `DeepResearchRun`, unchanged, and stays mounted while another tab shows.
5. Analytics (from the description): window toggles, totals strip, sortable member table with expandable detail (fund fit counts as "Mandate screens"), the fund's coverage with "Stale, N days" as icon and word, Budget use this month plus Budget settings (executives).
6. Budget settings dialog (ds `Modal`, executives): pool and per-member allocations; empty allocation means "draws from the pool". Same PATCH route as before.
7. Single report at its own address (`?v=` for a version; back button works): header with kind, ticker, status, visibility as words and icons; author, reviewer, saved, approved version, claims verified; Mandate screen line; review note; pitch, original and collections links. One primary action: Submit for review (author), Review (reviewer, only on the current version) or Run the research again (returned report, author). Text actions: Withdraw to draft, Mark superseded, Challenge the conclusion, Sharing and links, Collections, Delete draft (red). Withdraw, Mark superseded and Delete draft confirm in a dialog. Review, sharing and collections are dialogs. Version text toggles. Challenge comparison and challenged list. The saved answer full width, unchanged. Comments below: part selector, replies, This version / All versions, Show resolved, Resolve/Reopen only where the row policy allows (comment author, reviewer, report author).
8. States: route `loading.js`, skeletons, one-line empty states with one action, inline errors with Retry per section.

## Fixes from section 7 of the description

- Budget message: `budgetMessage` now ends "Standard research does not use it." instead of offering a standard answer. The form is disabled with the reason and reset date when the pool or the member's allocation is used, and points to the main Sonar page explicitly.
- Quick answer: a dialog says it leaves for the main Sonar page; nothing happens silently.
- Pitch to research: the pitch panel's Run research carries `?pitch=`; the form fills the pitch ticker and Save to your fund preselects the pitch (a context default read by `SaveToOrg`). A returned report's rerun preselects "new version of" that report.
- Search beyond the newest 200: the reports route merges a database-side title/question/ticker match with the newest 200 (and falls back if that query fails). Filters are in the address.
- Approve names and applies to the current version and is offered only when reading it.
- N/A for missing values; skeletons and Retry everywhere.

## Defaults taken (also in the commit)

Tabs Reports/Research/Analytics with budget moved to the strip, side section, Analytics table and dialog; real kinds, statuses, visibility and comment parts; no "Assigned to me"; approved count uses the analytics window; returned = back to draft after a review; no Edit button; own address instead of an overlay; "Mandate screen" with Within mandate / Review / Outside mandate from the stored mandate fit, else the stored stance on the same three steps (server unchanged); research runs and challenges are off while sample content shows; wireframe's role legend and state strip left out.

## For the owner

- The saved Sonar answer keeps the dark ground it had before (wrapper `force-dark-theme` with the dark background). Without it, the answer's own styles render a grey Desk Summary card on white in light mode (tried; see the decision above). The live run screen is forced dark inside the shared `DeepResearchRun` (not edited). Both need a change inside the Sonar answer components to follow light mode.
- `SaveToOrg` (the save dialog) is still the old boxed style; only its defaults changed. It is also used on `/sonar/research` and inside the shared run.
- In the preview the answer shows the "Sign up free" deep-sections card because the harness has no plan context; real org seats unlock those sections as before.

## Left out, and why

Save dialog restyle (scope, shared use); deleting one's own comment (no route); comments pinned beside a finding and version diffs (no data); per-desk or cohort analytics; collections column in lists and coverage owner (not in the payloads); "Assigned to me" and term-based counts (no data). No `sql.md`: nothing needed a migration.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `test:org-sonar` (38, unchanged; budget message regexes still pass), `test:org-sonar-research` (new, 13), `test:org-research-methodology`, `test:org-a`, `test:org-b`, `test:org-pitch-pipeline`, `test:security`, `test:rls`, `test:sonar-saved`, eslint on changed folders (0 errors, 0 warnings), prettier, pre-commit hook. `lint:arch` 0 errors, 12 warnings as on main.

Preview harness `/home/claude/harness-org-sonar-research/` (real global CSS and Team Hub shell, stubbed link, router and org context, mocked fetch; nav bar is a stand-in): 24 states with no page errors; `documentElement.scrollWidth` equals the viewport at 390, 1024, 1440 and 1920. 21 scripted checks (`interact.mjs`): sample approve and budget save send nothing; live approve sends one PATCH with the note; withdraw confirms and Cancel sends nothing; authors get no Review on their own report; analysts get no Review and no Resolve on others' comments; Reply posts `parentId`; status, tab and window reach the address; sample research run is blocked with a message and no research call; pitch prefill; analysts have no Budget settings; Retry heals.

Screenshots in this folder: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-report.png`, `preview-report-light.png`, `preview-report-returned-analyst.png`, `preview-report-challenge.png`, `preview-report-phone.png`, `preview-review-dialog.png`, `preview-research.png`, `preview-research-from-pitch.png`, `preview-analytics.png`, `preview-analytics-phone.png`, `preview-budget-settings.png`, `preview-analyst.png`, `preview-analyst-analytics.png`, `preview-portfolio-manager.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`, `preview-filtered.png`.

## Untested

`npm run build` and the real Next.js runtime; nothing ran against the database. The merged search query (`.or(...ilike...)`) has not run against PostgREST (it falls back to the old behaviour if it errors). The new sample route, the server pages' demo-viewer check, live comment replies and resolve under the real row policy, the real research stream and save flow with the new defaults, `org_sonar_is_reviewer` versus the page's reviewer check (managers or the approve permission), touch devices, screen readers, the partner scope. Production may differ from the repo's migrations.

## Shared files touched

`src/components/org/sonar/SaveToOrg.jsx` (defaults from context only), `PitchSonarPanel.jsx` (link carries the pitch), `src/lib/org-sonar/budget.js` (message wording only; no quota change), `src/app/api/org/sonar-reports/route.js` (search merge; authorization unchanged), `package.json` (one script). Deleted: `SonarWorkspace.jsx`, `SonarReportView.jsx`, `SonarBudget.jsx`, `SonarAnalytics.jsx`. Not touched: TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css, the four layouts, anything under `src/components/org/research-library*`, `src/app/api/org/research-library` or its route, `src/components/sonar/**`, `src/lib/sonar/**`, `sonar-skills/**`.
