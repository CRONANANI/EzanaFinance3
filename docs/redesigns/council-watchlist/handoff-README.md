# Handoff README: council Watchlist (fallback, written by the stage 2 agent)

There is NO real Claude Design handoff README for this page. Claude Design stopped at 90% of its usage quota before preparing the handoff package. Following the runbook fallback, this file is my own description of the built design, read from the Claude Design canvas (screenshots claude-design-1 to 6 in this folder). Treat it as lower authority than the branding guide and the description (current-page.md).

## Page frame (1440 wide, dark; a light theme prop exists)

- Nav bar: Claude Design's stand-in (wrong logo and wordmark). Do not copy it; never touch the real nav.
- Small "Sample content" label (info icon, muted) above the command bar.

## Personal watchlist (everyone)

1. Command bar: list name "My Watchlist" as a large title with mono count 8 and a chevron menu; right side: "+ Create list" (text), "Create smart rule" (lightning icon, text), "+ Add asset" (solid emerald, the only filled button).
2. Class tabs: Stocks (emerald text, selected), Bond ETFs, Commodities, Politicians, Crypto. Text only, no underline. (No counts drawn; the description asks for counts.)
3. Pulse strip, hairline above and below: Tracked assets 8 "in stocks"; New smart matches 3 "Last 7 days, shown in table"; Watchlist alerts 2 "Unread, all lists". Icon left of each cell, mono value. Market breadth and Disclosed trades cells are missing versus the description.
4. Securities table (left column, about 730 wide): select checkbox, star, Ticker (mono, sortable), Name, Last, 1D, 1W (mono, signed, green or red), Match reason, Alerts (bell + count), Notes (comment icon + count). Hairlines between rows. Selected row (AGRS) shown by emerald text and filled star only, no wash. Rows: NRBT, AGRS, MBIO, CPLN, VLTX, RVMK, LMNH, ORBX (invented).
5. Selected asset panel below the table, flat: "AGRS Aurora Grid Systems" (ticker mono), sector line "Industrial equipment · Utilities infrastructure", price $64.72 mono large, "+1.32% (+$0.84)" emerald, "As of" time muted mono. Three columns: chart with text ranges 1D 1W(selected, emerald) 1M 3M YTD 1Y and a green area line with price and date axes; "Thesis (my notes)" bullets; "Recent catalysts" dated mono list.
6. Side column right (about 345 wide): My watchlists (rows with mono counts and kebab menus, active list emerald, "+ New list"); Smart watchlists (rule name, condition line, mono match count, kebab, "+ New rule"); Signal explainer (Match, Alert, Smart list legend lines in emerald text with icons); Related catalysts (calendar icon, mono ticker, label, mono date right).

## Council section (council members only)

7. Header: hairline, people icon, "Council watch" heading, vertical rule, "Sample council" selector with chevron; one muted sentence below.
8. Council coverage list, full width: heading with list icon, "+ Add to coverage" text action right, muted subtitle. Columns: Company (name + mono ticker below), Sector, Owner, Backup, Status (icon + text: Active check in emerald, Monitoring eye in blue), Next catalyst (calendar icon, mono date, label), Priority (double chevron High in red, chevron Medium in amber). Sortable headers with chevrons.
9. Row of three flat cards, 64px gaps: Desk watch (Desk, Coverage, Unread table, mono numbers, unread in emerald); Assignment queue (icon rows: new coverage with "New" text, reassignment from and to, review request; muted time ago); Catalyst calendar (mono date, mono ticker, label).
10. Row of two: Shared notes and thesis flags (doc icon, title with mono ticker, author and time, flag text "High conviction" emerald shield or "Conflicting view" amber warning; "View all shared notes" emerald link with arrow); Team signals (mono ticker, icon, signal name, detail, mono age right).

## Tokens and type it used

- Hairlines --border-primary (repo: use --ez-rule, --ez-rule-subtle). Primary button text --bg-primary (repo: use --btn-primary-fg). Emerald text for selected and positive, red negative, amber warning.
- Plus Jakarta Sans text, JetBrains Mono for tickers, prices, percentages, dates and counts (except numbers inside sentences in Team signals).
- Bootstrap Icons throughout.

## Not designed (build them from the guide and the description)

- KPI value size was not confirmed on the canvas; build them at 18px mono as the guide requires.
- Dialogs: New list, Add asset, Smart rule editor, Monitoring note, Rename, Alerts, Delete list, Send to team.
- Loading skeleton, one-line empty state with one action, inline error with Retry for every council card.
- Light mode only exists as a theme prop (screenshot claude-design-6-light.jpg shows the top).
- Row hover rule (text colour only) was requested but not visible on a static canvas.
