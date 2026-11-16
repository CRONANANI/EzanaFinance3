# Reports (organizational) build report

Branch `redesign/org-reports`, commit 24f7e89 (not pushed). Worktree /home/claude/wt/org-reports.

## Built

- New page in `src/components/org/reports/` (ReportsPage, useReportsData, ReportDialogs, reports.css); `page.js` is now a server component (sample gate), new `loading.js`. Old `analytics2/ReportCenter.jsx` removed (only this page used it).
- KPI strip from the latest report plus Sample content / Show council data / Refresh / Generate report; caption with method and dates.
- Generate column (borderless period field, Include roster and Include analyst names as Yes/No text toggles, what will be saved, access statement, primary "Check and save report") beside the latest printable report, previewed in a sandboxed srcdoc frame rendered by the same generator as the printable route.
- Saved reports table (author, cohort, frozen figures, Open printable report, Delete, per-row disclosure with compared dates). Stacks below 960px of page column.
- Compare saved reports (text pickers, the 6 most recent).
- Generate dialog (ds Modal): dry run figures, pre-save checks, choices, disclosure, Save and open report. Delete dialog (ds Modal), red text action.
- States: skeletons, empty with action, inline error with Retry, managers-only and export-restricted lines.
- Printable document (`src/lib/org-reports-document.js`): light, flat, disclosure and method block, no "Confidential", print only from the button, no `.html` filename, roster and analyst names hidden when left out, sample label on sample reports.

## Honesty

- Gain on cost always labelled "not time-weighted".
- Difference to benchmark only over the same dates and weights (`comparedWindow` in `src/lib/org-reports-model.js`): each current priced holding from its first close on or after it was recorded to the end date, and the benchmark on the same days. Holdings without prices at both ends are left out of both sides and counted. No history means N/A.
- Reports saved before this: benchmark marked "earlier method, other dates", difference N/A, other new fields N/A.
- Pitch rows show "vs SPY" in points over each pitch's own dates; `org-attribution.js` now also returns decision_at and computed_at (additive).
- Sample: $240,050.00, +46.73%, SPY +10.08%, 12 positions, 1 unpriced. Holdings over the compared dates come to +48.05%, so the difference is +37.97 pts, not +36.65. The older reports use SPY +8.64% and +7.15%.

## Data, no SQL needed

`org_reports.payload` is jsonb, so version 2 payloads store: the include choices, the author name, the unpriced count, the window, the comparison and the pitch dates. When roster or analyst names are left out, they are not written. POST `dry_run` saves nothing. New DELETE `/api/org/reports/:id`; RLS "managers write reports" already allows it.

## Export setting fixed

`canExportReports` (role plus `who_can_export_reports`) is enforced on the server for list, generate, open (printable) and delete. Analysts and restricted PMs get no rows and a plain line. The printable route gives a short HTML page, not raw error text. Covered by `test:org-reports`.

## Section 6 kept

Route and sidebar unchanged. Fund Analytics "Save and open report" POST still works: the include flags default to on, and the label is used. An empty label still saves "Current Term". Old reports still open. Same-council and not-found checks kept, and the printable page loads nothing from third parties.

## Left out

University logo on the report (an outside URL would break the no-third-party rule; it needs a same-origin proxy). Share links, email, scheduling. Compare picker is limited to the 6 most recent reports.

## Untested

Real Supabase and FMP: the dry run's price history, the delete with RLS, governance reads. Next.js server render (`npm run build` was not run). The browser popup after save (it may be blocked; the notice keeps a link). The harness used a stubbed fetch and a stand-in nav.

## Shared files touched

`package.json` (one script), `scripts/check-branding.mjs` (one exclusion for the standalone document generator), `src/lib/org-attribution.js` (additive fields), `src/lib/org-role-matrix.js` (docs). No Team Hub shell, sidebar, nav or layout files.
