# Build report: Trading Desk (organizational)

Branch `redesign/org-trading-desk`, commit `c0e9bbe`, worktree `/home/claude/wt/org-trading-desk`. Not pushed. Routes `/org-trading` and `/org-trading/inbox`.

## What was built

Code in `src/components/org-trading/desk/` (classes `otd-`, plus the Command Center's shared `tcc-` atoms so the two pages read as one), model in `src/lib/org-trading-desk.js`, sample in `src/lib/org-trading-desk-sample.js`.

1. KPI strip (same treatment as the Command Center): Fund value, Benchmark, Today, Unrealized gain (scoped), Awaiting your response, Open flags on the fund, Open breaches (executives and portfolio managers), Unpriced positions. Actions on the right: sample label and switch, Add position (text, only with the manage right, including granted analysts), Flag inbox (filled link to `/org-trading/inbox`, with the inbox count).
2. One line under it: the desk records holdings, no orders are placed here, trades are executed at the fund's broker and recorded by hand, by spreadsheet or from a linked brokerage account. "Prices as of" uses the book's latest pricing date.
3. Fund book: allocation donut by sector team (total in the middle, legend beneath, chart-cat tokens, unsigned shares), fund value against the benchmark (the Command Center chart, reused), sector teams ranked by return.
4. Flag queue: Inbox, Sent, Resolved; rows show ticker, flag colour in words, suggested action, raiser, the two routed members by name, time left (amber under six hours, then overdue) and the message. The detail shows every field, the comment trail, the answer row for routed recipients only (Accept filled, Acknowledge, Reject with rebuttal, Escalate to IC), a comment box while open, and the 90 day outcome once answered. It states that an answer does not change the position.
5. Holdings and accountability: ticker, sector team, covering analyst, sector head, thesis, shares, average cost, price, market value, P/L in dollars and percent, percent of fund, Review. Review reads Raise flag, or the open state (Red flag, Green flag, N open flags), which narrows the flag queue to that ticker. Row menu: Raise flag, Discuss, Remove position. Text sector filters and a borderless search.
6. Position discussion (comments, one reply level, member mentions, likes) for every role.
7. Member flag accuracy (council for managers, own line for others) and Compliance and coverage gaps.
8. `/org-trading/inbox`: the same queue, list and detail side by side, with "Back to Trading Desk".

Role scope is real, through the existing checks: executive whole fund, portfolio manager own team, analyst covered sectors with "Rest of team (read only)". Flag, add and remove follow `canFlagPositions` and `canManagePositions`; the server routes are unchanged and still check.

Every section has a skeleton in its final layout, a one-line empty state and an inline error with Retry. The route `loading.js` now matches the page.

Remove position: built. The working route already existed (`DELETE /api/org/positions?id=`, a soft archive gated by the manage right). Per row, confirmed in a ds `Modal`.

Sample content: `GET /api/org-trading/sample` (new; same gate as the Command Center: `isCommunityDemoViewer` plus council membership). It is the Command Center's sample fund: 12 positions that sum to its four sleeves and to $240,050.00 to the cent (a test asserts it). The accuracy table is computed from the sample flags. Raising, answering, commenting, liking, adding and removing on sample rows stay on the page; scripted checks confirm no write request is sent.

## Bugs fixed

- Zeros while loading, and a failed load looking like an empty fund.
- "Flagged" counted only the viewer's flags; holdings now read the fund's open flags (existing route, up to 100).
- A position added by an executive got no team; it now goes to the sector filter in view.
- Missing values read N/A; an unpriced position shows no gain instead of +0.0%.
- Add position dialog named data vendors and a raw permission key.
- Flag composer: browser prompt on discard replaced by an inline confirm, "Held" (always empty) removed, sentence case, signed two-decimal figures.

## Defaults taken (owner may reverse)

Listed in the commit message. In short: real suggested actions, named recipients, Low/Med/High conviction, evidence as labels, benchmark as the data names it, dollar-axis chart, Flag inbox as a link to its page and the primary action, section title "Flag queue", fund book fund-level for every role, Role scope and State examples strips not drawn, guide over handoff on button text colour, 18px titles and caps table headers, no row hover wash.

## Left out, and why

- Thesis on file for members without the flag right: the payload carrying it is served only to members who can flag, so it reads N/A (with a tooltip). Changing that needs a server decision.
- Evidence document links, team recipients, "Consensus", five-point conviction, per-position charts: no data.
- "Remove position" as a page-level button (design): it is per row instead.
- Mobile menu copy "Mock books & flags" (`MobileAuthNavDrawer.js`) and the Settings label "Council Trading": not edited (navigation, and another page). Both are one-string changes worth making for the Mock Trading distinction.
- Legacy `.ot-` rules remain in `org-trading.css` because the company research and market analysis pages import that file. Only the old executive desk block (`.ctd-`) was removed.
- CSV and brokerage import are disabled while sample content shows (they write to the real book).
- No `sql.md`: nothing needed a migration.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `test:org-trading-desk` (new, 10 tests, added to package.json), `test:org-command-center`, `test:org-a`, `test:org-b`, eslint on changed files (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, as before. `check:copy` fails on main already (`src/lib/macro-sync/rotate.js`), unrelated. No existing test was edited.

Preview (`/home/claude/harness-org-trading-desk/`, real global CSS and shell, stubbed link, router, org context and browser data client, mocked fetch): no page errors, `scrollWidth` equals the viewport at 390, 768, 1024, 1440 and 1920. 58 scripted checks pass (`interact.mjs`): sample writes stay local, reject needs a rebuttal, non-routed members get no answer row, PATCH and DELETE sent once in live mode, failures say so and keep state, role scopes and rights (executive, PM, analyst, granted senior analyst, no team, non-member), retry heals one section, inbox route lists, alignment on the right line.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-inbox.png`, `preview-role-portfolio-manager.png`, `preview-role-analyst.png`, `preview-empty.png`, `preview-error.png`, `preview-flag-dialog.png`.

## Untested

- `npm run build` and the real Next.js runtime. Nothing ran against the database: the new sample route, and every live route as called by the new page (the routes themselves are unchanged).
- The live flag routes return an empty list on a query error, so that case shows as empty, not as an error.
- The real navigation bar beside the page; partner (gold) scope; touch devices; screen readers.
- CSV and brokerage import forms (unchanged apart from copy), and the pinned research picker with real items.
- Likes use the existing reactions route with the thumbs-up value; reactions of other kinds made on the old page are not counted.

## Shared files touched

- `src/components/org/command-center/FundPerformance.jsx`: one word, `FundChart` is now exported so the desk reuses it.
- `package.json`: one script line.
- No shell file was edited (`git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css or the four layouts).
