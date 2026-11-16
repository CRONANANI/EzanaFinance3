# Build report: council US Equities (/company-research, council members only)

Branch `redesign/council-us-equities` (worktree /home/claude/wt/council-us-equities), cut from main at 1024626. Commit 4e076d2 (not pushed). Built 16 November 2026.

## What was built

- **Same route, retail unchanged.** `src/app/(dashboard)/company-research/page.js` gains council sections. Each one is rendered only when `councilReady = isOrgUser && !orgLoading`. Nothing council-specific is drawn or fetched while membership is resolving, and nothing at all for non-members. The retail markup, controls, address bar parameters, pins, onboarding, watchlist and Send chart are untouched. The sections are loaded with `next/dynamic`, and the hook the page always carries does not import the council model.
- **Where they sit** (description, open question 1):
  - KPI band under the search pill on every view: Sample content / Show council data, fund value, gain on cost (not time-weighted), benchmark (from the latest fund snapshot, labelled when it is an estimate), positions (with the not-yet-priced count) and teams.
  - Company view before a ticker is chosen: Coverage gaps and stale names under the heatmap.
  - With a ticker open, "Council on this name" sits at the top of the rail. It shows held, team sleeve, weight, coverage analyst, documents, last document, pitch stage and expected return. Open pitch (the one filled button, `--btn-primary-fg`) goes to `/org-team-hub/pitches?pitch=<id>` and only shows when a pitch exists. Open dossier goes to `/org-team-hub/research-library?view=ticker&symbol=X`.
  - With a ticker open, these sections sit under the section tabs: Council position and sleeve (the name first, then its team, with a sleeve total and weight), Policy check | Contribution to fund, Coverage and research history, Pitch history, and Coverage gaps. They are ordered by role: analysts see research and pitches first, PMs the position, executives and faculty the position and policy.
  - Industry and Portfolio views: Council team sleeves.
- **Data, as the signed-in member** (new `GET /api/org/company-research` and `?ticker=`). It uses `getUserClient` only and is read-only. The book comes from `getOrgPositionBook`, plus teams, members, sector coverage, coverage lineage, IPS rules, research dates per ticker and the latest snapshot's benchmark. The ticker part returns documents and pitches (no tallies or ballots). Rules are in `src/lib/org-company-research-model.js`.
- **Policy check is descriptive.** It shows the council's real stored, active limits read against its own book: Within / Nearing / Above / Below / Not listed / Prohibited. Max single trade reads "At pitch" because it needs a proposed size. The cash floor reads "Recorded only, not checked". The design's 15% and 40% are not used.
- **Sample content** (`src/lib/org-company-research-sample.js`, `GET /api/org/company-research/sample`, gated by `isCommunityDemoViewer`, labelled, nothing writes): the same sample council assembled from the Trading Desk, Command Center, Research Library, Pitch Pipeline and Compliance samples ($240,050.00, +46.73%, SPY +10.08%, 12 positions, HON unpriced). Open pitch on a sample lands on the same sample pitch.
- **States:** every council section has skeleton bars, a one-line empty state with one real link (Trading Desk, Compliance, Research Library, Pitch Pipeline, Coverage lineage), and an inline error with Retry.

## Fixes against the design (guide and description win)

- I used the real market figures and the existing heatmap list, and ignored Claude Design's P/E, change, tile and chart edits. I did not copy the stand-in nav or logo.
- "Set up fund" and "Open IPS settings" are dropped and replaced by real destinations: Open Trading Desk and Open Compliance. "Show council data" is a real switch between the sample and the council's own records.
- No country, currency, asset-class or council target figures. The sample is derived from one book (NVDA is 160 shares, 8.8% of fund, Technology sleeve 21.6%), not from the wireframe's inconsistent numbers.
- There are no explainer lines under titles (guide 4.2). Uncovered and Stale carry an icon and words, not colour alone.

## Flicker finding (not fixed: protected file)

`OrgContext` starts with `isOrgUser=false` and `isLoading=true`. On any error or the 8-second timeout of `/api/org/status`, it falls back to non-org. `Navbar.js` reads `isOrgUser` without `isLoading`, so the nav draws retail first and then switches. A slow or failed status call (the stage 2 session hit `reason=timeout`) leaves it on retail for that load. This page now waits for `!isLoading`. The nav fix belongs in the top navigation, which this build may not touch.

## Checks

`lint:branding`, `lint:ds`, `lint:css`, `test:page-canvas`, `test:em-dash`, `test:research-company`, `test:research-filters`, `test:research-sections`, `test:security`, `test:org-compliance`, `test:org-research-library`, `check-home-canvas`, and the new `test:council-us-equities` (10 tests) all pass. eslint shows 0 errors; the one warning is pre-existing (page.js searchParams effect). Prettier and depcruise are clean. `npm run build` was not run.

Harness `/home/claude/harness-council-us-equities/` bundles the real page. Checked at 390, 1024, 1280, 1440 (dark and light), 1568 and 1920, in these states: no ticker, Industry, Portfolio, analyst, unheld name (TSLA), live, empty, error (Retry heals), slow, org loading and retail. `scrollWidth` equals the viewport everywhere, and content runs from the logo line to the logout line. Wide tables scroll inside their section at 390. The `.crx-tab` overflow at 390 is also present in retail. Retail and org-loading made zero council calls and drew zero council sections.

## Left out

- Running the portfolio models on the council fund. Each model card fetches personal holdings internally, so this needs a model input change. Team sleeves are shown on the Portfolio view instead.
- Review flag in the rail (needs a Trading Desk read).
- Council versus council, attribution by analyst, the research workbench strip and the illustrative no-ticker composite.

## Untested

- Against a real database: RLS answers, the `org_fund_snapshots` benchmark columns and `select('*')` on pitches. Production may differ from the repo migrations.
- Real Next.js rendering and the real nav. The rail council card sits 24px from the rule, while the existing `rc-card`s keep their own inset.

## Shared files touched

`src/app/(dashboard)/company-research/page.js` and `package.json` (one script). No navigation, Team Hub shell, layout.js or OrgContext file was touched. No SQL is needed.
