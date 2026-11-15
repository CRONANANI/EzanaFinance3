# Ezana Trading Desk page (organizational): how it works today

Page: Trading Desk (titled "Council Trading" on the page). Version: organizational (university student-managed investment funds). Route: /org-trading, with the flag inbox at /org-trading/inbox.
What I want from the redesign: "trading desk, make sure its differentiated from the mock trading page for the organizational version of the app". The Trading Desk is the fund's shared book and review workflow; Mock Trading is one member's private practice account. They must not look or work like the same page.
Keep or drop: nothing specified. Section 6 lists what must keep working.
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this. Screenshots of the live page are supplied separately.

## 1. Summary

The Trading Desk is where a council sees the fund's actual holdings and challenges them. It is a record of positions plus a written review loop called flags. It is not an order screen: nobody buys or sells here and no order is sent anywhere.

- Who uses it: executives see the whole fund. Portfolio managers (PMs) see their team's book. Analysts see positions in the sectors they cover. Faculty advisors have no role of their own in the code; they sign in under one of those three.
- Decision it supports: is each holding still earning its place? A member raises a green flag (thesis strengthening) or a red flag (thesis at risk) with a suggested action, and the covering analyst or sector head must answer in writing.
- How they get to it: "Trading Desk" in the Team Hub sidebar, the Team Hub home (including its "Unpriced positions" link), the mobile menu, and the fund setup step "Add or import positions".
- What they do next: answer a flag, discuss a position, or move to Fund Analytics, Pitch Pipeline or Compliance.
- Shell: the page sits inside the shared Team Hub shell, whose left sidebar lists every Team Hub page and marks Trading Desk as current. The shell is described elsewhere and is not part of this redesign.

The fund's order flow as the code defines it:

| Step                          | Who                                       | What actually happens                                                                                                                                                     |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propose a new idea            | Analysts, on the Pitch Pipeline page      | A pitch moves through stages to a committee vote. An accepted pitch does not create a position.                                                                           |
| Propose a change to a holding | Anyone allowed to flag                    | A flag carries a suggested action: Monitor, Size up, Trim, Exit or Re-underwrite. This is the nearest thing to a trade proposal here.                                     |
| Approve                       | Only the two people the flag is routed to | Accept, Acknowledge, Reject with a required written rebuttal, or Escalate to the investment committee. Accepting does not change the position.                            |
| Execute                       | Nobody, inside Ezana                      | Trades happen at the fund's real broker. Someone allowed to manage positions then records the result by hand, by spreadsheet, or by importing a linked brokerage account. |

## 2. What is on the page today

Three layouts, chosen by role.

### Executive view (newest design)

| Section         | What it shows                                                                                                                                                                                                        | Controls                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Header          | Caps line "TRADING" and the council name, title "Council Trading", a pill "Executive, can flag positions", one intro sentence                                                                                        | "Flag inbox" (outlined, with a count badge), "Add position" (filled, only if allowed) |
| Summary card    | Four zones: allocation donut by sector team with total book value; "Today" change and total unrealized gain or loss; each team's return on cost as ranked bars; four figures (Positions, Sectors, Flagged, Top book) | Hover on a donut slice                                                                |
| Sector chips    | "All sectors", one per team, "Unassigned" when needed                                                                                                                                                                | Filters the table                                                                     |
| Positions table | Ticker, Sector, Shares, Cost, Price, Market value, P/L percent, Review                                                                                                                                               | "Flag" per row; reads "Flagged" with a count and tints the row when open flags exist  |
| Empty           | "No positions yet. Add one or import your book."                                                                                                                                                                     | Add position                                                                          |

### PM and analyst view (older design)

| Section                                          | What it shows                                                                                      | Controls                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Header                                           | Bank icon, "Council Trading", council name, role, "Can flag positions"                             | "Flag Inbox" link                                        |
| Team card                                        | Team name, PM name, analyst count, team P/L percent, value, unrealized dollars                     | "Add Position" (only if allowed)                         |
| "Team Positions" (PM) or "My Coverage" (analyst) | Ticker with a flag count, Sector, Shares, Avg cost, Current, P/L percent, covering analyst         | "Flag" per row, disabled with a tooltip when not allowed |
| Discussion                                       | A dropdown to pick a holding, then its thread: comments, one level of replies, mentions, reactions | Comment, Reply                                           |
| "Other Team Positions" (analyst only, dimmed)    | Ticker, Sector, Shares, covering analyst                                                           | Read only                                                |

Empty lines cover: no team assigned, no coverage assigned, no positions in covered sectors, no team positions.

### Flag dialog

Titled "Flag position", or "Thesis update" when the member is the covering analyst. Left, read only: P/L, sector benchmark, Shares, percent of fund, Held (always empty), Cost, the pitch thesis on file, an evidence picker (pinned research items, "Chart snapshot"), and "Routes to" with both recipients. Right: flag type (Green or Red), Reason (depends on colour), Conviction (Low, Med, High), Suggested action, Message (40 characters minimum), "Escalate to IC", Response due (24 hours, 3 days, 1 week), personal holding disclosure. A header switcher changes position. If another member has an open flag on the ticker, a second dialog offers "Raise a separate flag" or Cancel.

### Add position dialog

Manual entry (ticker, name, shares, average cost, sector, notes), Upload CSV (template download, up to 1,000 rows, skipped rows listed), or Connect brokerage (import one of the member's own linked accounts). Others see "Permission required".

### Flag inbox (sub-page)

Title block "Flag Inbox" with "Back to Trading". Three filters: Inbox (open flags routed to me), Sent (flags I raised), Resolved (answered flags I am part of). Each row: colour bar, ticker, raiser and recipient, age, subject, preview. Selecting one opens a detail panel beside the list with every flag field, a "Response due in" countdown (amber under six hours, then "overdue"), the comment thread, four answer buttons for routed recipients, a comment box while open, and a resolution note once answered. Each filter has a one-line empty state.

### Tablet and phone

The executive summary card goes two by two under 1080px and one column under 640px; its table scrolls sideways. The flag dialog becomes one column under 640px. Nothing else adapts.

## 3. What the user can do

- Filter positions by sector team (executive)
- Open the inbox; switch Inbox, Sent, Resolved
- Raise a green or red flag; switch position inside the dialog
- Answer a routed flag: Accept, Acknowledge, Reject with rebuttal, Escalate
- Comment on an open flag (any council member)
- Discuss a holding: comment, reply, mention, react (PM and analyst views)
- Add positions by hand, CSV or linked brokerage account
- Easy to miss: a covering analyst flagging their own name files a "Thesis update" routed to the sector head.
- In the code with no button: remove a position; add evidence to an existing flag; a per-member flag accuracy table. There is no way to edit a position or record a sale.

Permissions by role:

| Role                          | Sees                                    | Can flag        | Can add positions | Can grant rights       |
| ----------------------------- | --------------------------------------- | --------------- | ----------------- | ---------------------- |
| Executive                     | Whole fund                              | Yes             | Yes               | Yes, to direct reports |
| Senior PM, PM                 | Own team                                | Yes             | Yes               | Yes, to direct reports |
| Junior PM                     | Own team                                | Yes             | Yes               | No                     |
| Senior analyst                | Covered sectors; rest of team read only | Yes             | Only if granted   | No                     |
| Analyst, junior, quantitative | Same                                    | Only if granted | Only if granted   | No                     |

Answering is not a role right: only the two members a flag is routed to can answer it. The system decides routing, never the person flagging. Covering analyst: the analyst on the latest pitch for the ticker, else the sector's primary analyst, else any analyst on the team. Sector head: the team's PM. If neither exists, an executive. Limits: 10 flags per member per week, and one flag per ticker per member every 14 days.

## 4. Data we have

| Field                                                                                                                                                    | What it means                                                                                            | Public source                      | Freshness                       | Missing for                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | -------------------------------------- |
| Position: ticker, name, shares, average cost, sector, notes, entry method, date added                                                                    | One holding                                                                                              | Entered or imported by the council | When saved                      | Name, sector, notes optional           |
| Current price and when priced                                                                                                                            | Latest stored price                                                                                      | Market closing prices              | Each weekday after the US close | New imports until next refresh         |
| Market value, cost, unrealized P/L (dollars, percent), percent of fund                                                                                   | Computed                                                                                                 | Fund book                          | With price                      | Unpriced positions carried at cost     |
| Sector team: name, value, return on cost, top three holdings                                                                                             | One team's sleeve                                                                                        | Fund book, council teams           | With price                      | Positions with no team                 |
| Fund value by day, with benchmark value                                                                                                                  | Daily history                                                                                            | Daily fund record                  | Each weekday                    | Under two days of history              |
| "Today" change                                                                                                                                           | Last two daily records compared                                                                          | Daily fund record                  | Each weekday                    | N/A under two records                  |
| Open compliance breaches (count)                                                                                                                         | Uncleared policy breaches                                                                                | Council compliance records         | On load                         | Loaded, not shown here                 |
| Covering analyst, sector head                                                                                                                            | Who is accountable                                                                                       | Org chart, coverage, pitches       | On load                         | Uncovered positions                    |
| Pitch thesis (short)                                                                                                                                     | Thesis on file                                                                                           | Latest pitch                       | On load                         | Tickers never pitched                  |
| Sector benchmark label                                                                                                                                   | What a flag is judged against                                                                            | Fixed list                         | Fixed                           | Unlisted sectors                       |
| Flag fields: colour, reason, conviction, suggested action, message, deadline, escalation, conflict, status, raiser, recipients, times, position snapshot | One review record                                                                                        | Council members                    | On load                         | None                                   |
| Flag answer, rebuttal, comments, evidence labels                                                                                                         | The written trail                                                                                        | Council members                    | On load                         | Evidence is a label, not a file        |
| Flag outcome                                                                                                                                             | Right or wrong 90 days later, versus benchmark                                                           | Market closing prices              | Daily                           | Flags under 90 days. Stored, not shown |
| Flag accuracy per member                                                                                                                                 | Flags raised, percent correct, green and red split, average conviction, rejected flags that proved right | Computed                           | On request                      | Stored, not shown                      |
| Position discussion                                                                                                                                      | Comments, replies, mentions, reactions                                                                   | Council members                    | On open                         | Executive view                         |
| Member rights                                                                                                                                            | Flag, manage positions, grant                                                                            | Role defaults plus grants          | On load                         | None                                   |

## 5. Data we do not have

Do not design around these.

- Orders: ticket, status, fills, working orders, blotter.
- A trade history, realized gains, dividends, cash balance or buying power. Only current holdings exist.
- Intraday prices, per-position price charts or day change, holding period.
- Target weights, drift or policy limit meters per position (compliance rules live on another page; ask first).
- Votes or approvals on a flag (committee votes exist only for pitches; ask first), or a committee queue for escalated flags.
- A fund-wide list of all flags, unread counts, or a sidebar badge.
- An audit trail of position changes.
- Analyst ratings, price targets, news or scores.
- Any link from Mock Trading to the fund. Paper trades never reach the fund book.

## 6. Must keep working

- Three role scopes: whole fund, own team, covered sectors.
- System-decided routing, the Thesis update path, the executive fallback.
- Only routed recipients answer; rejection needs a written rebuttal; any member comments while a flag is open.
- Flag limits, the duplicate warning, the 40 character minimum, colour-specific reasons, conflict disclosure.
- The inbox address with Inbox, Sent, Resolved, and the way back.
- Add position in three modes, only for members with the right.
- Every figure from the one fund book, matching the Team Hub home and Fund Analytics.
- Unpriced positions carried at cost, never guessed.
- The Team Hub shell, the inbound links in section 1, and the "members only" message.
- Keyboard use of the position switcher and focus handling in dialogs.

## 7. Problems with the current page

### It is too easy to confuse with Mock Trading

|             | Trading Desk                                               | Mock Trading, as a council member sees it                                                        |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Purpose     | Oversee and challenge the fund's real holdings             | Practise placing trades alone                                                                    |
| Data        | The council's shared book, entered or imported by managers | One member's private paper account starting at $100,000                                          |
| Main action | Raise or answer a flag                                     | Buy or sell through an order ticket with a review step                                           |
| People      | Named analysts, sector heads, deadlines, written answers   | Nobody else; identical to the retail page, no council content                                    |
| Also shows  | Allocation by team, team returns                           | Performance versus a benchmark, what-if and risk cards, personal theses, activity journal, reset |

Both pages light up "Trading" in the top navigation. The mobile menu describes this page as "Mock books and flags". The sidebar says "Trading Desk" and the page says "Council Trading". The redesign must make the difference obvious at a glance: no order ticket, no buy or sell, no paper cash, no reset. Lead with the fund, its teams, the people accountable and the flags awaiting an answer, and say plainly that trades are executed at the fund's broker and recorded here.

### Design problems

- Three visual languages on one route, all breaking the branding rules: title blocks, filled and bordered cards, outlined buttons, pill chips, title case.
- The flag workflow, the point of the page, is hidden behind a link.
- Executives get no discussion or covering analyst; PMs and analysts get no allocation or team comparison.
- Flag outcomes, member accuracy, fund value history and compliance breaches exist and are never shown.
- Whole dollars and one-decimal percentages.

### Bugs and gaps

- The executive view draws zeros while loading, and a failed load looks like an empty fund. The route skeleton shows a chart the page does not have.
- "Flagged" and the inbox badge count only the viewer's own flags, not the fund's.
- A position added from the executive desk gets no team and lands in "Unassigned".
- A duplicate entry says "edit the existing position", but there is no edit or remove control.
- Overdue flags stay open forever.
- Missing values show a dash, not N/A; an unpriced position shows +0.0% in the PM and analyst tables.
- The add position dialog names data vendors and a raw permission key.
- Discarding a flag draft uses a browser prompt. "Chart snapshot" attaches a label, not a chart.

## 8. Design rules the mock must follow

1. Cards are flat: no fill, border, shadow, glow or rounded panel, in dark or light mode.
2. Content runs from the Ezana logo's left edge to the logout icon's right edge (x = 32 to 1408 at 1440px). The Team Hub sidebar occupies the left of that span; draw it as it is, start page content after it, end on the right line.
3. Tabs, toggles and filters are text only, including sector filters and Inbox, Sent, Resolved. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring.
6. No page title block, eyebrow, role pill or intro sentence.
7. Bootstrap Icons only. No emoji or logos. A ticker is text.
8. Plus Jakarta Sans for interface text; JetBrains Mono for numbers, tickers, dates and times.
9. Sentence case. No em dashes.
10. Describe, never advise. A suggested action is labelled as a member's view. Never say "real-time"; prices are as of the last close.
11. Dark mode first; light mode must work.
12. Nothing drawn touches text. A selected row is emerald text only.
13. Side-by-side sections 64px apart, stacked 20px. A side column is split by one full-height grey hairline, 24px from text.
14. KPI strip about 48px tall, as wide as its content: 12px grey label, 18px mono value, hairlines between cells, page actions on its right.
15. Tables: 11px caps grey headers, hairlines between rows, numbers right-aligned in mono, no zebra.
16. No chart without real data. A donut has its total in the middle and legend beneath.
17. Money has two decimals; changes are signed; missing values read N/A. Green and red flags also carry words.
18. Do not redesign the top navigation bar or the Team Hub sidebar.
19. Only overlays have a solid surface, border, shadow and radius.
20. Every section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Name            | Dark    | Light   |
| --------------- | ------- | ------- |
| Page ground     | #0a0e13 | #ffffff |
| Primary text    | #f0f6fc | #0f172a |
| Secondary text  | #e2e8f0 | #1e293b |
| Muted text      | #8b949e | #64748b |
| Faint text      | #6b7280 | #94a3b8 |
| Emerald         | #10b981 | #059669 |
| Emerald as text | #34d399 | #047857 |
| Negative        | #ef4444 | #dc2626 |
| Warning         | #fbbf24 | #d97706 |
| Gold            | #d4a853 | #b8922f |

## 9. Open questions for me

Each carries the default that will be used.

1. One layout for all roles? Default: yes, scoped by role.
2. Move the flag inbox onto the desk? Default: yes, as a section; the inbox address keeps working.
3. Page name? Default: "Trading Desk" everywhere, no visible title block.
4. Show flag outcomes and member accuracy? Default: yes, both are computed.
5. Show fund value history and open compliance breaches? Default: yes, both are loaded.
6. Edit, record sale, remove? Default: remove only, confirmed, for members who manage positions.
7. Design a real order or approval workflow? Default: no. State that trades are executed at the fund's broker.
8. Sample content for demo and admin accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Trading Desk. Route: /org-trading (with its flag inbox at /org-trading/inbox). Version: organizational (university student-managed investment funds). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states.

Page-specific asks. First, this page must be clearly differentiated from the Mock Trading (paper trading) page that the same council member can open. Mock Trading is a private practice account with an order ticket, buy and sell, paper cash and a reset. The Trading Desk is the fund's shared book with named accountability and a written review workflow. Draw no order ticket, no buy or sell buttons and no paper cash; lead with the fund, its sector teams, the people responsible and the flags awaiting an answer; and state in one short line that trades are executed at the fund's broker and recorded here. Second, draw the Team Hub sidebar as it is and do not redesign it. Third, include 4 to 8 features tailored to university investment councils, built only on section 4 data, for example: a queue of flags awaiting response with deadlines, the covering analyst and sector head on every position, flag outcomes and member flag accuracy for grading, the thesis on file beside each holding, fund value against its benchmark, open compliance breaches, and coverage gaps. Show how the page differs for an executive, a portfolio manager and an analyst.

Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
