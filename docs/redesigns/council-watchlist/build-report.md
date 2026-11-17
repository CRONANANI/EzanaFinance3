# Build report: council Watchlist (stage 3)

Branch `redesign/council-watchlist`, commit b91efbd (not pushed). No sql.md: no schema change was needed.

## Built

- Council watch section on /watchlist, under the personal watchlist. It renders only when useOrg().isOrgUser is true and org loading has finished, and it fetches nothing before then. It reuses useCouncilResearch, the same way the Echo and Quant Lab council builds do.
- KPI strip with six cells: names on watch, held, pitched only, unassigned, stale or no research, near a position cap.
- Council coverage table. It lists every held name plus every open pitch, built from real data (the 12 held names and the open pitches). Columns: name, held or pitched, team, owner with its source (handoff, sector coverage or pitch analyst, otherwise Unassigned), last research date with current, stale or none, weight against the stored position cap (Within, Nearing or Above), pitch stage linked to the pitch, and actions. The actions are Add to my list (or On my list), Send to team (permission-gated) and the Research Library dossier. Filters: All, My coverage and Gaps. You can sort by name, last research and weight. The table shows 12 rows, then "Show all".
- Desk watch: one row per sector team with held count, pitched count, sleeve weight, primary coverage and gaps.
- IPS watch (descriptive): the largest positions against the position cap, sectors against the sector cap the way Compliance reads them, and any pitched names on the prohibited list.
- Coverage assignments: open assignments of type Coverage, using the Assignments loader.
- Coming up: committee sessions with their pitch tickers, council meetings and coverage due dates in the next 30 days.
- New routes: GET /api/org/watchlist (each part can fail on its own) and /api/org/watchlist/sample (master admin and demo accounts only). Both run as the signed-in member through the user client.
- Model: src/lib/org-watchlist-model.js. Sample: src/lib/org-watchlist-sample.js, built from the existing pitch, assignments, meetings and compliance samples.
- Every card has loading, empty and error states, including a partial failure inside the extras part.
- Send to team is now a text action in the selected asset header, with the same permission. It was removed from the More menu.

## Defaults

- When a name is only pitched and has no handoff or sector coverage, the pitch analyst counts as its owner, labelled "Pitch analyst".
- In sample mode, Add to my list saves nothing and shows "Sample content. Nothing was saved."
- The council section sits below the personal watchlist. It does not swap out the table, and there is no "Council coverage" entry in the list menu (open question 1 is answered differently from its default).

## Left out (no data)

- Shared notes and thesis flags.
- Team signals: analyst upgrades, insider activity, valuation gaps, abnormal volume.
- Backup owner and priority.
- Unread counts by desk.
- Add to coverage: no existing route records coverage from this page. Reassignment stays in the Research Library and the org chart.
- Next catalyst per name.
- A council selector.

## Untested

- The live routes against production (column names come from existing loaders: org_pitches.ic_meeting_id, org_meetings.category and scheduled_at, org_ic_meetings).
- npm run build.
- The real dashboard layout and navigation. The harness bundled the whole page with stubbed auth, org and fetch, so the personal section shows skeletons because market data is not mocked.

## Shared files touched

- src/app/(dashboard)/watchlist/page.js
- src/components/watchlist/monitor/MonitorPanels.jsx (the Send to team action)
- package.json (adds test:council-watchlist)

No navigation, OrgContext or Team Hub shell files were touched.
