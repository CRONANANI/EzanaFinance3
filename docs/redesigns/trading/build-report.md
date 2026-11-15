# Build report: Trading, the brokerage account page (/trading, retail)

Branch `redesign/trading`, commits `984f6f4` (build) and `8967d75` (dashboard subpage restored), worktree `/home/claude/wt/trading`. Not pushed.

## Was any money-moving or order code path modified?

No. No API route, server module, request payload, validation, or any function that submits an order, cancels an order, closes a position, moves money, submits an application, or links or removes an account was edited. `git diff --stat main...HEAD` lists five files, none under `src/app/api`, `src/lib/trading/idempotent.js`, `order-validation.js`, `account-guard.js`, the application wizard, the old ticket, positions, order history or deposit components, the connect dialog, or the connect callback page.

The new page makes two GET requests (`/api/trading/portfolio`, which the old dashboard subpage made, and `/api/portfolio/holdings`, which Home makes) and the same three browser reads as the old page (account row, older account record, checklist marker). It sends no POST, DELETE, PUT or PATCH. `scripts/check-trading-account.mjs` asserts this.

## What was built

- `/trading` is one flat page on the home canvas: main column, one full-height hairline, an Accounts side column (320px). No title block, no cards, text-only actions, one filled button per group with `--btn-primary-fg`, `--ez-rule` hairlines, 18px section titles, 18px mono figure values.
- States: loading skeleton, signed out (Sign in), account lookup error with Retry, no account (United States only notice, three steps, the checklist gate with the same locked and unlocked button labels, routing to the unchanged application page), application in review, not approved, closed, active.
- Active: figure strip (equity, buying power, cash, open positions, "Figures loaded" time, Refresh, Mock trading) and a sortable positions table with a total row. A total reads N/A if any row lacks the figure.
- Linked outside accounts (new on this page): account rows (institution name, account name, last digits, type, balance, last synced), combined holdings table (sortable, intraday or end of day marker), totals, and one entry to the existing connect dialog ("Link account" when empty, "Link another account" otherwise). Loading, empty, error with Retry.
- `/trading/dashboard` is byte for byte what it is on main (restored in the second commit after the coordinator's review). Its stylesheet, trading.css, is unchanged. The only behaviour change around it: /trading no longer forwards active members there, because /trading now shows the same figures plus positions. The phone menu link still opens it, and its "Trading overview" link now reaches /trading and no longer loops.
- The real legal line, word for word with its FINRA and SIPC links, at the foot of every state.
- Mock trading is reachable in every state.
- Pure helpers in `src/lib/trading/account-view.js`, suite `scripts/check-trading-account.mjs` (10 tests).

## Left out, and why

1. Order entry (the whole right column of the design), including the confirm step and the market closed notice. The only existing submit handler (the unused ticket component) posts to an order route that looks up only the older account record, so accounts opened through the current application get "No brokerage account", and that route does not run the Getting Started checklist gate. A second, gated order route exists but nothing in the interface calls it, and wiring it would be a new way to place an order. This is a server-side decision for the owner, not a layout change.
2. Order history with All, Open, Closed and Cancel. Same older-record lookup; it could also show orders from a different account record than the positions beside it.
3. Close position. Same older-record lookup.
4. Deposit funds, Withdraw, Transfers. Same older-record lookup, and there is no way to link a bank in the interface. The Dashboard "Deposit funds" button still lands here with no deposit.
   The page states items 1 to 4 in one line: "Order entry, order history, deposits and withdrawals are not available on this page yet."
5. Remove a linked account. The one removal route takes a connection id that no route returns for the rows listed here, covers one connection type only, and does not remove the listed account rows.
6. Equity day change and any performance figure (ruled out by the description).
7. Institution directory (a second entry to the same dialog; the dialog is the directory).
8. The "State examples" strip (annotation; real states were built), the "Sample content" marker (no sample layer exists on this page), the handoff's navigation bar and its wrong company name.
9. The six feature cards, the pill badges, "Fund your account" as a step, "18 tasks" (the count is wrong today; the copy now says "required tasks"), and "We'll email you when it is approved" (no email is sent by the status webhook, so it now says to return to this page).
10. Per-account holdings: the data route returns holdings combined across accounts, so the table is combined and says so.

## Owner decisions

1. Ungated order route. `/api/alpaca/order` places real orders with no Getting Started checklist gate. The gated route, `/api/trading/orders`, is called by nothing in the interface. Decide which route order entry uses before any ticket is surfaced.
2. Older-record lookup. The order, positions (and close position) and transfer routes under `/api/alpaca/` look up only the older account record. Accounts opened through the current application are stored in the newer record, so those routes answer "No brokerage account" for them.
3. No bank-linking step. Deposits and withdrawals need a linked bank relationship and nothing in the interface creates one. Dashboard "Deposit funds" lands on /trading (as before), which has no deposit.
4. Linked-account removal does not work for the listed rows: the one removal route takes a connection id no route returns, covers one connection type, and leaves the listed account rows in place.
5. The linking callback page returns to Home, not to /trading, for the provider that redirects away.
6. The connect dialog still tells members they can place trades in a linked account; no such order path exists.

Correction to the review note that prompted the second commit: on main, /trading/dashboard does not let any member place or cancel orders, close positions or move money. It shows equity, buying power, cash and a position count and says the workspace ships later. The ticket, positions, order history and deposit components are rendered by no page on main (`git grep` finds them only in their own files and the index). So the first commit's redirect removed no capability; the page was restored anyway as asked. For the same reason the requested "Orders and transfers" link to that subpage was NOT added: the destination has neither. /trading keeps "Order entry, order history, deposits and withdrawals are not available on this page yet."

## Other findings (not changed)

- The application page still has an arrow character in its back link and no United States notice of its own; it was not touched because it hosts the application submit.
- The unlock button still reads the older checklist marker while the server checks the current checklist. The server still decides.

## Checks

| Check                                                                                                                                               | Result                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| lint:branding, lint:ds, lint:css, lint:a11y                                                                                                         | pass                                          |
| test:page-canvas (3), test:em-dash (5), check:no-em-dash, check:vendor-copy                                                                         | pass                                          |
| check-home-canvas (17), check-trading-account (10, new)                                                                                             | pass                                          |
| test:mobile (13), test:getting-started (8), test:platform-qa (21), test:reliability (78), test:security (20), test:mock-trading (45), test:retail-b | pass                                          |
| eslint on the changed folders                                                                                                                       | 0 errors, 0 warnings                          |
| prettier --check on changed files                                                                                                                   | pass                                          |
| depcruise                                                                                                                                           | 0 errors (12 warnings, none in the new files) |
| npm run build                                                                                                                                       | not run (runbook)                             |

No existing test was edited.

## Preview

Harness `/home/claude/harness-trading/` (mocked fetch and a stand-in account reader, preview only). No console errors in any state; scrollWidth equals the viewport at 390. Screenshots in this folder: preview-dark, preview-light, preview-tablet, preview-phone, and preview-no-account, no-account-locked, no-account-linked, in-review, refused, closed, active-no-linked, error, error-sections, error-linked, signed-out, loading, loading-sections, phone-light, phone-no-account. Clicks checked: locked button is disabled, unlocked button routes to the application, Link account opens the dialog (one entry on the page), header sort, Retry.

## Untested

- Nothing ran against the real app, database or broker. The account read, row access, the portfolio request and the linked accounts request were exercised only through mocks.
- The real connect dialog was replaced by a stand-in in the preview; its two flows were not run from this page.
- The broker's field names in the portfolio response (equity, buying_power, cash, the position fields) are taken from the old pages and the older positions route, not from a live response. A missing field shows N/A.
- The phone app's web-only notice, the partner (gold) scope, 1920px, keyboard order and screen readers.

## Shared files touched

None. No change to package.json (the new suite is not wired in: add `"test:trading-account": "node --no-warnings --test scripts/check-trading-account.mjs"` if wanted), home-canvas.css, the canvas tests, the navigation, the connect dialog or trading.css. The old ticket, positions, order history and deposit components and their CSS are still in the repo, unused as before.
