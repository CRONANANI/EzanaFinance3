# Build report: council Alternative Markets (Stage 3)

Branch `redesign/council-alternative-markets`, commit 98322a4 (not pushed). Worktree `/home/claude/wt/council-alternative-markets`.

## Built

- Same route, `/alternative-markets`. The council cards render only when `useOrg().isOrgUser` is true and org loading has finished. They are loaded on demand with `next/dynamic`. The data hook the page always carries fetches nothing before that and imports no council model.
- **Council workspace band**, under the headline metrics. It follows the Crypto and Commodities switch.
  - Policy review: a borderless ticker field. It reads "X: On the prohibited list." or "X: Not on the prohibited list." against the stored rules, and always shows "No asset class rule set". "Open full check" opens a ds Modal that reads every active stored rule against the council's book (the US Equities `policyReadings`).
  - Research library: the council's documents on crypto or commodities, matched by ticker and topic words, primers first. Drafts show only to their author or a manager.
  - Pitch pipeline: open pitches on the mode, with stage and leads.
  - Learning links: three real Learning Center courses per mode.
  - Order: managers see policy first, analysts see research first.
- **Council context band**, after the chart row: coverage owners per sector team, sector sleeves (weight, tickers, HON "not yet priced"), the next three meetings, and council rankings (rank, rating and tier only).
- **Chart actions**:
  - Start a pitch goes to `/org-team-hub/pitches?new=pitch&ticker=X`. The Pitch Pipeline now opens its own submit dialog on arrival, prefilled with the ticker, and clears the parameters.
  - Send to team uses `OrgSendToTeamModal` and appears only with the `send_to_team` grant. It is disabled while sample content shows.
- **Data**:
  - `useCouncilResearch` is reused for the book, teams, coverage and rules.
  - New `GET /api/org/alternative-markets` (user client, own council; pitches leave without ballots or tallies).
  - New `GET /api/org/alternative-markets/sample`, gated by `isCommunityDemoViewer`. It returns the same sample council plus six documents and four pitches by its invented members.
- Every council card has a skeleton, a one-line empty state with one action, and an inline error with Retry.

## Fixes for everyone (retail too)

- The "Live" badges, "Updated 1m ago", "last 12h", "now", "Live ticker" and "Data delayed up to 60s" are replaced with "Illustrative" labels. The footer reads "Illustrative figures, not market data".
- Timeframe selectors that only changed a label are removed from Movers and the chart. The chart says "Illustrative line, not price history".
- Movers are now built from the table rows. Table rows, mover rows and a borderless asset select all change the chart. Each row has keyboard support and shows a selected state.
- "Join discussion" is now "Open Community", a real link.
- The invented 7d change and volume now read N/A. Negative changes carry a minus sign.
- Fear and greed now shows "Greed" (it showed "Neutral") and no fake +65.00% in the marquee. CRB reads "this week", not "vs. yesterday".
- The sort control moved to the 24h header (it was on Last). The selected tab resets when the asset class switches; before, Commodities could open on an empty tab.
- Phone: card headers wrap and the prices table and news fit at 390.

## Left out (no data)

- Tokenized commodities and Watchlist tabs.
- Commodity research board.
- Open research asks.
- Alternatives exposure, and any country, currency or asset-class figures.
- Other councils' return and Sharpe.
- The fund value line in rankings.
- Wiring live crypto and commodity feeds. The page stays honest about being illustrative.

## Untested

- Real Supabase reads, RLS on `org_pitches` and notes, and the sample route on a real session. The harness at `/home/claude/harness-council-alternative-markets` covers these with a mocked fetch.
- The pitch submit prefill in the real app.
- The real navigation bar.
- `npm run build`.
- Export still exports every row, whatever tab is selected (unchanged).

## Checks

All pass:

- lint:branding, lint:ds, lint:css
- test:page-canvas, test:em-dash
- the new test:council-alternative-markets (10 tests)
- test:org-pitch-pipeline, test:council-global-market, test:council-us-equities
- test:security, test:rls
- eslint (0 errors), prettier

Harness widths: 390, 1024, 1280, 1440 (dark and light), 1568 and 1920. Harness states: live, empty, error, slow, analyst, Commodities, retail and org loading. `scrollWidth` equals the viewport at every width. Retail and org loading made zero council calls.

## Shared files touched

- `src/app/(dashboard)/org-team-hub/pitches/page.js`, `PitchPipelinePage.jsx`, `SubmitPitchDialog.jsx` (for `?new=pitch&ticker=`).
- `am2.css` and the am2 components.
- `package.json` (one script).

No protected files were touched: no navigation, OrgContext, Team Hub shell or any layout.js. No SQL is needed.
