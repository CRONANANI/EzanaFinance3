# Council Rankings: build report (stage 3)

Branch `redesign/council-rankings`, commit f93ef26 (on e44317b). Not pushed.

## Built

- /council-rankings: actions line (Sample content, Show council data, one emerald "Report fund ratios" for executives and portfolio managers, text links to Competitions and Fund Analytics), a six-cell KPI strip for the viewer's council, a one-line weighting note, text tabs Overall / Competition / Fund (kept in ?sort=), a borderless search, and a flat table. The table shows the self-reported mark and the reported period under every council that has ratios, tier as text with an icon, signed ROI, Sharpe, a signed move with its date, and the viewer's own row in emerald text.
- "Your council": nearest councils (own gap N/A) beside "What moves the rating" (both parts, why a part reads 1000, which part is ahead, a link to where the weaker part changes).
- /council-rankings/[orgId] stays a separate page: overall, peak and tier; the two parts; competition contribution; fund contribution (signed ROI and alpha, drawdown shown negative, period, self-reported); rating history (part, rating after, date). It always shows that council's own data.
- Signed-out visitors and non-members see the table and a league KPI strip (councils ranked, highest rating, councils reporting, latest change).
- Report fund ratios: a ds Modal that sends to the existing route used by the Competitions form. The form stays at /org-competitions/council (untouched), and the dialog links there.
- Loading (route skeleton in the final layout), empty (one line, one action), inline error with Retry (refreshes the server data), and a no-results state for search.
- Sample content: GET /api/org/council-rankings/sample, the same master admin / demo account gate as Grades and Competitions (members only). Twelve invented councils, with "Sample council" at 3 of 12. Ratings come from the real model (fund relative to all reporting councils, a 60/40 blend, the real tiers). Sample content replaces the table and is never mixed with real rows. Ratio saves stay on the page. Sample council pages are gated on the server and return not found for anyone else.

## Fixes

Ties share a rank. ROI and alpha are signed. Move carries a date. The split bar is removed. The loading title mismatch is gone. The stored reason text is never shown: recalculations write machine text, and the seed writes event names. Changes now read "Recalculated, the competition (or fund) part moved more", which is exactly what the record supports.

## Left out

- The duplicate "Your council" summary line (the KPI strip carries the same figures).
- Opt-out (needs a stored setting).
- Comparing ratios on the same period (no data for it; the period is now shown on each row instead).
- Rank history.
- Prefill from Fund Analytics (the dialog links to it instead).
- The "not reporting reads 1000" rule is unchanged. It is a model change, so it is only described on the page.

## Seed with real university names (not changed)

- `supabase/migrations/20260824110000_seed_council_rankings_demo.sql` writes `council_elo`, `council_fund_metrics` and `council_elo_transactions` rows for 8 organization ids `7e510000-...-0003/0002/0013/0012/0019/0014/0018/0016`. Those organizations are real university rows from `20260628000100_seed_universities.sql` (Toronto, Waterloo, McGill, Queen's, UBC, Western, McMaster, Calgary).
- The standings are invented. The periods read "Demo · FY2026", `metadata.demo = true` is set, and the reasons name invented events ("Placed 1st at National IC Invitational"). design-status says these rows are live.
- The file has a commented TEARDOWN block that deletes exactly those 8 ids from the three tables. Nothing was run.
- To the page these rows are indistinguishable from real ones. The new UI hides their event-naming reasons, but their ratings and periods still show.

## Access

- /council-rankings is not in the protected route lists, so it is reachable signed out. Its three tables have public-read row policies ("public leaderboard"), so what it shows matches the description. I did not change who can see it.
- Names come from `organizations` via the existing service-role read (only name and university_name). No new service-role reads were added.
- The sample route and sample council pages require a signed-in member. The fund ratio route is unchanged (members, managers to write).

## Checks

lint:branding, lint:ds, lint:css, test:page-canvas, test:em-dash, test:council, test:org-competitions, the new test:council-rankings (9 tests), test:rls, test:security, test:org-a, test:org-b, test:middleware, depcruise, eslint and prettier all pass. lint:type still fails only on pre-existing files; this page's file is clean.

Harness (`/home/claude/harness-council-rankings`) shots: 1920, 1568, 1440 dark and light, 1280, 1024, 390; the detail page at 1440, 1280, 1024 and 390; plus live, analyst, signed-out, no own row, empty, error, loading and dialog states. At every width scrollWidth equals the viewport and no element passes the content edge.

## Untested

The real server pages, the Supabase reads, router.refresh() after a save or Retry, and the real sample route. The harness stubs these and renders the client components and the detail component with sample or "live" stand-in rows.

## Files

src/app/(dashboard)/council-rankings/{page.js, [orgId]/page.js, loading.js, council-rankings.css} (RankingsTable.jsx deleted); src/components/org/council-rankings/{RankingsPage, CouncilDetail, CouncilParts, ReportRatiosDialog}.jsx; src/lib/council-rankings-model.js; src/lib/org-council-rankings-sample.js; src/app/api/org/council-rankings/sample/route.js; scripts/check-council-rankings.mjs; package.json (one script).

No protected files were touched: the shell files and every layout.js, including council-rankings/layout.js, are unchanged.
