# Build report: council Mock Portfolio (/trading/mock)

Branch `redesign/council-mock-portfolio`, commit 9904cdc (not pushed). Worktree `/home/claude/wt/council-mock-portfolio`.

## What was built

The paper account looks and works exactly as before for everyone: orders, review, close, reset, theses, journal, CSV and the symbol preload all use their existing routes and markup. Council members get a "Council sandbox" layer once org loading has finished (`useOrg().isOrgUser && !isLoading`). It follows the watchlist and learning council builds and reuses `useCouncilResearch`.

- **Header, under the Reset row.** It shows the council name, "Visible to council members only", that the sandbox is simulated, the sample switch and a Trading Desk link. Below that is a compact strip: sandbox value, sandbox return, real fund since inception, fund benchmark, open pitches (mine if any) and fund challenge rank. Values are 18px mono.
- **Council IPS check, in the ticket (above Review) and in the review dialog.** It runs the council's stored active rules against the sandbox after the typed order.
  - Prohibited ticker and sector, minimum market cap, max single trade and max positions go through the compliance engine's `evaluateProposal`.
  - Largest position, sector cap, minimum positions and cash floor are read from the sandbox after the order, as a share of its total value.
  - Results show as an icon plus text: Passes, Warning, Would be blocked in the real fund, or Not tested (missing sector or market cap).
  - The cash floor shows at most as a warning, because the real fund never checks it.
  - The check has no callbacks into the order, never logs, and never blocks or changes anything.
- **Council features band, at the bottom of the left column.**
  - Sandbox versus real fund: an SVG chart where sandbox, fund daily values and the S&P 500 all start at 0% over the sandbox series' window (1M to ALL). It says so when the fund has no history for the range, or when its history starts later.
  - IPS snapshot of the sandbox holdings.
  - Sector weights: sandbox against fund against the lowest stored sector cap, all computed.
  - Pitches (Mine / All open). "Load into ticket" fills the ticket and scrolls to it, and never submits.
  - Real fund holdings, read-only.
  - Fund challenge standing, from the Competitions loader (rank and return since entry only).
- **States.** Every card has a skeleton, a one-line empty state with one action, and an inline error with Retry.
- **Sample content (master admin and demo only).**
  - It is labelled, built from the shared sample council bundles (12 tickers, pipeline pitches, 3 of 12 standing), uses invented names, and is never saved.
  - While it shows, the cards read a five-name sample sandbox. The order check still reads the viewer's real paper account.

New files: `GET /api/org/mock-portfolio` and `/sample` (RLS user client, members only, read-only), `src/lib/org-mock-portfolio-model.js`, `src/lib/org-mock-portfolio-sample.js`, `src/components/trading/mock/council/*`, and `scripts/check-council-mock-portfolio.mjs` (`test:council-mock-portfolio`).

Shared files touched:

- `page.js`: gating, the hook, three lazy council pieces, and the sector lookup now also runs for council members and keeps the market cap.
- `OrderTicket.jsx` and `ReviewOrderModal.jsx`: optional `extra` slot, null for everyone else.
- `mock-trading.css`: one-line fix, see below.
- `package.json`: the new test script.

## Fixes

- **Retail phone overflow (pre-existing).** Below 1024px `.mock-layout` wrapped as a column, which stretched every card to the widest content and pushed cards off the right edge at 390px. It is now `nowrap`. This changes the retail page too.
- **Guide beat the handoff:** 18px KPI values instead of 22px, repo tokens, ds `Modal`, no stand-in nav.

## Checks

These all pass: lint:branding, lint:ds, lint:css, test:page-canvas, test:em-dash, test:mock-trading (unchanged, 45 pass), test:council-mock-portfolio (13), test:council-watchlist, test:council-us-equities, test:rls, test:security, test:retail-a, depcruise, eslint (0 errors) and prettier.

Harness (`/home/claude/harness-council-mock-portfolio`): no overflow outside table scrollers at 390, 1024, 1280, 1440 (dark and light), 1568 and 1920. It also covers live, empty, error, slow, retail, org-loading and analyst modes, plus order and review probes (MO buy reads "Would be blocked in the real fund"). Retail makes no council calls.

## Left out

- Copying the fund into the sandbox, a shared council sandbox, sandbox grading or leaderboard, and sandbox attribution (section 5).
- The non-Overview tabs: they had no distinct content.

## Untested

- Live data against production: the real book's sector names and snapshot history were only exercised in the harness.
- The market-data sector to fund-name mapping on real councils.
- `npm run build` (not run, per the runbook).

No SQL needed. No protected files touched (top nav, OrgContext, Team Hub shell and layouts).
