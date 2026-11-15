# Ezana Command Center (Team Hub home): how it works today

Page: Command Center, the home of the Team Hub. Version: organizational (university student-managed investment funds). Brief: open brief.
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this. Screenshots of the live page are supplied separately.

## 1. Summary

The Command Center is the first page a council member sees after an organizational sign-in. It answers "how is the fund doing and what is due": fund value against a benchmark, sector teams ranked by return, upcoming dated items, and the council's tasks.

- Who uses it: every active member of a university investment council. Analysts check what is due and where their team ranks. Portfolio managers check their team and move tasks along. Executives, including the faculty advisor, check fund value, whether the numbers can be trusted, and whether the council is set up.
- Decision it supports: "what do I work on next, and does the fund need attention today". It is a routing page. Every section leads to a deeper Team Hub page.
- How they get to it: it is the landing page after sign-in or accepting an invite, the "Team Hub" item in the top navigation bar (it replaces Dashboard for council members), and the first sidebar item.
- What they do next: open the Trading Desk, Fund Analytics, Assignments, Meetings or another Team Hub page.
- Anyone who is not an active council member is sent to the retail home page.

## 2. What is on the page today

### Shared across all Team Hub pages: the sidebar (must stay consistent)

One shared component. It appears, identical, on every Team Hub page and on the Trading Desk, Competitions and Council Rankings pages. Whatever is drawn here must be reusable unchanged on all of them.

- A 212px column on the left, 26px from the content, pinned while the page scrolls, inside the normal page envelope.
- Top: a round avatar with the member's initials, the member's name (long surnames shortened, full name in a tooltip), and under it their title in small emerald caps (for example "VP · OPERATIONS"). With no title it shows the role. A skeleton shows while membership loads.
- One flat list of icon and label links, in this order: Command Center, Trading Desk, Fund Analytics, Assignments, Org Chart, Pitch Pipeline, Research Library, Sonar Research, Meetings, Recognition, Grades, Competitions, Council Rankings, Cohorts, Compliance, Reports, Team Permissions.
- Command Center is always a solid pill in the university's primary colour, on every page. The current page is a translucent pill in the same colour. Hover is a faint wash. Team Permissions is always emerald text.
- Plain-number counts on the right of some items, hidden at zero, refreshed every minute: Assignments (open over total, such as 5/19), Pitch Pipeline (active pitches), Research Library (published notes), Meetings (scheduled), Recognition (awards in the last 7 days), Grades (submissions awaiting review), Cohorts (applicants awaiting a decision), Compliance (open policy breaches, in red).
- Under 900px the sidebar moves above the content and its items wrap into rows.

### Roles and permissions, as the code defines them

Three roles exist: executive, portfolio manager, analyst. A faculty advisor is not a separate role. It is an executive whose title is "Faculty Advisor" and sees what executives see.

| Area                                         | Executive (incl. faculty advisor) | Portfolio manager | Analyst                                            |
| -------------------------------------------- | --------------------------------- | ----------------- | -------------------------------------------------- |
| Sidebar: Cohorts (and its count)             | Shown                             | Hidden            | Hidden                                             |
| Sidebar: Compliance (and its count), Reports | Shown                             | Shown             | Hidden                                             |
| Sidebar: the other 14 items                  | Shown                             | Shown             | Shown                                              |
| Fund data health section                     | Shown                             | Hidden            | Hidden                                             |
| Change a task's status                       | Any task                          | Any task          | Own tasks only                                     |
| Setup checklist "Set up" links               | All steps                         | All steps         | "Invite members" and "Assign sector coverage" only |
| Everything else on the page                  | Same                              | Same              | Same                                               |

Titles within a role: executives have a free-text title (President, VP of Research, Treasurer and so on). Portfolio managers are Senior PM, PM or Junior PM. Analysts are Senior Analyst, Analyst, Junior Analyst or Quantitative Analyst. Titles change finer permissions on other pages but nothing on this one. Hiding a sidebar item is a convenience. The server checks permission again on every page and action.

### The page (desktop, top to bottom, right of the sidebar)

**Header row.** Left: a caps line "Team Hub" plus the current cohort name, and a large title "Command Center". Right: an organization switcher (a dropdown shown only to members of two or more councils; choosing one reloads the app; on failure "Could not switch organization. Try again.") and a bordered search field, "Jump to anything", with a Cmd K hint. Cmd K or Ctrl K focuses it. Typing does nothing. There is no search behind it.

**This week in the fund.** Five small cards per page with previous and next arrows and a "Fund calendar" link (opens Meetings). Each card: date (NOV 18), title, team name or "Fund". It lists scheduled meetings, open tasks with a due date and open assignments with a due date, from today to 60 days ahead, soonest first, up to 25. A meeting card opens Meetings, an assignment card opens Assignments, a task card links back to this page. Loading: five skeleton cards. Empty: "Nothing scheduled yet. Meetings, tasks and assignment due dates will appear here."

**Fund value hero (one rounded panel, two columns).**

| Part                | Shows                                                                                                                                                                            | Controls                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Fund value          | Total fund value in whole dollars and three pills: return, alpha, and the benchmark symbol with its return. An estimated benchmark reads "Pitch benchmark (est.)" with a tooltip | The whole block is a button to the Trading Desk                  |
| Chart               | Fund value line with a soft fill, a dotted grey benchmark line when data exists, month ticks, a hover read-out of value and date                                                 | Time selector 1M, 3M, YTD, 1Y (default YTD)                      |
| My assignments, due | Up to five of the member's own open tasks with a due date: title and date, urgent ones highlighted                                                                               | Every row and the "Open Trading Desk" link open the Trading Desk |

Loading: skeletons. Chart empty (fewer than three snapshots): "No fund snapshots yet. The chart fills in as daily snapshots are recorded from Fund Analytics." Right column empty: "Nothing due. You're clear."

**Get your fund set up.** Shown only until all five steps are done. Header "N of 5 complete". Steps, each with a count and a tick when done: Add or import positions (opens Trading Desk), Create sector teams (Settings), Invite members (Settings), Assign sector coverage (Org Chart), Set IPS rules (Compliance). No loading or error state. It is simply absent.

**Sector desk.** Note "Ranked by ROI". One row per sector team that holds positions: rank, team name, a bar scaled to the best return (red when negative), signed return on cost, and the team's three largest tickers. Every row opens Fund Analytics. Loading: seven skeleton rows. Empty: "No sector sleeves yet. Import positions from the Trading Desk."

**Fund data health (executives only).** A status pill (Healthy, Needs attention, Stale) and five rows: Prices updated, Last snapshot, Unpriced positions (N of total, linking to the Trading Desk when above zero), Missing sector / team, Benchmark (with "est." when estimated). Loading: "Loading data health". Error: "Couldn't load data health." with no Retry.

**Bottom row (two panels).**

| Panel           | Shows                                                                                                                                           | Controls                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task management | "N open". The first seven tasks of the whole council, soonest due first: title, priority, description. Completed ones are struck through        | The status badge is a button cycling Pending, In progress, Completed, Pending. It changes instantly and reverts silently on failure. Disabled with an "Assigned to (name)" tooltip when not allowed |
| Deadlines       | A red "N overdue" badge or "On track". Up to four open tasks with a due date, overdue first: title, "Overdue" or "Due (date)", a priority badge | "Open task board" link, which opens Assignments                                                                                                                                                     |

Empty: "No tasks yet. Managers can assign work from the task board." and "No upcoming deadlines. Nothing due."

**Page-level states.** Route loading: a skeleton with a title, four stat tiles, a chart and six cards (not the real layout). While membership is checked: "Loading Team Hub". After 10 seconds: "Team Hub is taking longer than expected to load." with an outlined Retry button. On a crash: "We couldn't load Team Hub." with Retry and "Go to Command Center". No dialogs, menus or toasts. Data loads once per visit.

### Tablet and phone

- Under 1080px: calendar arrows disappear and the strip scrolls sideways.
- Under 900px: the sidebar moves above the content.
- Under 860px: the hero's right column drops under the chart, and the bottom panels stack.
- Under 620px: search goes full width and sector rows keep only rank, name and return.

## 3. What the user can do

- Open any Team Hub page from the sidebar
- Switch council (members of two or more)
- Page through upcoming items and open a meeting or assignment
- Open the Trading Desk from the fund value, the hero task rows or the link
- Change the chart period and hover for a value on a date
- Follow a setup step to where it is completed
- Open Fund Analytics from a sector row
- Advance a task's status
- Open Assignments from "Open task board"
- Easy to miss: the fund value block is a button. Cmd K only focuses the search field.
- Exists in the code but has no button: creating a task (allowed for executives and portfolio managers, but there is no form), and setting a task to "Review".

## 4. Data we have

| Field                            | What it means                                                                                                                          | Public source                                    | Freshness                       | Missing for                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------- | --------------------------------- |
| Member name, title, role         | Who is signed in                                                                                                                       | Council roster                                   | On load                         | Title falls back to role          |
| University colours               | Primary, secondary, accent                                                                                                             | Council settings                                 | On load                         | Falls back to emerald             |
| Sidebar counts                   | Listed in section 2                                                                                                                    | Council records                                  | Every minute                    | Hidden at zero                    |
| Cohort name                      | Current cohort                                                                                                                         | Council records                                  | On load                         | Councils with no cohort           |
| Fund value, return on cost       | Total value and return of council positions                                                                                            | Council position book, priced with market quotes | On load, as of the last pricing | No positions                      |
| Benchmark return, symbol, source | The council's chosen index, or an estimate from past pitches                                                                           | Market prices or pitch records                   | On load                         | Can be missing                    |
| Alpha                            | Return minus benchmark                                                                                                                 | Calculated                                       | On load                         | When either is missing            |
| Daily fund snapshots             | Date, value, benchmark-equivalent value                                                                                                | Daily council snapshots                          | Daily                           | Fewer than three                  |
| Sector teams                     | Name, value, return on cost, top three tickers                                                                                         | Council position book                            | On load                         | Teams with no positions           |
| Tasks                            | Title, description, priority (low, medium, high, urgent), status, due date, assignee, assigner, mine, overdue, open and overdue counts | Council task list                                | On load                         | Due date and description optional |
| Meetings                         | Title, date, team, status                                                                                                              | Council meetings                                 | On load                         | None                              |
| Assignments                      | Title, due date, status                                                                                                                | Council assignments                              | On load                         | Due date optional                 |
| Setup steps                      | Five steps with counts and done flags                                                                                                  | Council records                                  | On load                         | None                              |
| Data health                      | Price freshness, last snapshot, unpriced count, missing sector and team counts, benchmark source, status                               | Position book and snapshots                      | On load                         | Non-executives                    |

Loaded by this page today but not shown, all real and usable: member count, team count, the member's count of open assignments, the count of open policy breaches, who the member oversees, counts of portfolio managers and analysts, and a seven-day digest (new pitches, votes cast, positions opened, new research notes, awards given, top five pitches by alpha).

On other Team Hub pages, to be checked before use here: pitch stages, attribution by analyst and sector, grades, competition standings, council rankings across universities, applicants, breach details.

This page has no sample-content layer today. It shows only what the council has stored.

## 5. Data we do not have

Do not design around these.

- Live fund value, intraday or "today's" change. History is daily.
- Chart periods beyond one year.
- Cash, buying power or pending orders on this page.
- Risk figures (volatility, beta, Sharpe, drawdown) and sector weights against policy limits.
- A real search or command palette.
- Notifications, an inbox, mentions or messages on this page.
- Task comments, subtasks, attachments or progress percent.
- Member presence or photos (initials only).
- Attendance, agendas or minutes.
- News, earnings dates or macro calendars.
- Brokerage sync status.
- Sidebar counts for Trading Desk, Org Chart, Competitions, Reports or Team Permissions.

## 6. Must keep working

- Only active council members reach any Team Hub page.
- The sidebar: the same 17 destinations in the same order, the role rules, the counts, the current-page state, the member's name and title above it, and one look on every page that uses it.
- The organization switcher for members of more than one council.
- Fund value, return, alpha and benchmark, with an estimated benchmark labelled as an estimate.
- Chart periods 1M, 3M, YTD, 1Y and the hover read-out.
- The setup checklist until all five steps are done, with manager-only steps shown as status to analysts.
- Fund data health for executives only.
- Task status changes limited to the assignee, executives and portfolio managers.
- Links out: Trading Desk, Fund Analytics, Assignments, Meetings, Org Chart, Compliance, Settings.
- Honest empty states. An empty council never sees invented figures.
- The slow-load message with a retry, and the crash screen.
- The sidebar stacking above content on narrow screens, with no sideways page scroll.

## 7. Problems with the current page

### Design problems

- It opens with a caps line and a big title, which the brand rules forbid.
- Sections are rounded panels with bordered tiles inside. Pills are everywhere (return, alpha, benchmark, status badges, sidebar items). The search field is bordered and Retry is outlined.
- "Tasks" and "assignments" are different things in the product, yet the hero column titled "My assignments" lists tasks, and "Open task board" opens Assignments. There is no task board.
- Tasks appear four times (calendar, hero, Task management, Deadlines), while pitches, compliance, grades and competitions do not appear at all.
- The task list shows the whole council's tasks with no assignee name or due date.
- The page is nearly identical for every role, though an analyst, a portfolio manager and a faculty advisor come for different things.
- "This week in the fund" covers 60 days, and its arrows say week but move five cards.
- The sector desk is a team ranking whose rows all lead to the same place.
- The sidebar puts fills and washes on text, against the selection rules.
- Fund value is in whole dollars. The rules ask for two decimals or a compact headline.

### Bugs and gaps

- The search field does nothing.
- Hero task rows open the Trading Desk, not the task. Calendar task cards link back to this page.
- A task in "Review" jumps to "Pending" when clicked. Completed tasks cycle back to Pending with no confirmation. A failed update reverts with no message.
- A section whose data fails shows its empty state, so a failure looks like an empty fund. No section has Retry.
- The chart appears to read the oldest 64 daily snapshots, not the newest, so it may stop advancing for older councils. Unverified without data.
- Missing values show a dash, not N/A, and a missing return shows in the positive colour.
- Fund data health is hidden from a non-executive who was granted fund analytics access, although the server would allow it.
- The Assignments sidebar count is open over total, which reads like completed over total.
- The route skeleton does not match the page.

## 8. Design rules the mock must follow

The rules outside tools get wrong most often come first.

1. Sections are flat. No fill, border, shadow, glow or rounded panel, in dark or light mode. A section is a title and whitespace. Tiles inside it are flat too.
2. Content runs from the left edge of the Ezana logo to the right edge of the logout icon: x = 32 to x = 1408 at 1440px. Sidebar text starts on the left line. The right-most text ends on the right line.
3. The sidebar is a side column: one full-height vertical hairline with 24px of clear space. A selected item is coloured text only, with no pill, wash or accent bar.
4. Tabs, toggles and time selectors are text only. Selected is emerald text, the rest grey.
5. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
6. Search has no border, fill or focus ring.
7. No page title block, eyebrow or intro sentence. Start with content.
8. Bootstrap Icons only. No emoji, logos or illustrations. A ticker is text.
9. Plus Jakarta Sans for interface text. JetBrains Mono for every number, ticker and date.
10. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
11. Dark mode first. Light mode must work.
12. Status is text with an icon, never a filled pill or colour alone. Values are signed (+9.33%, -0.92%). Missing values read N/A. Money shows two decimals or a compact headline ($1.24M).
13. Side-by-side sections are 64px apart, stacked sections 20px. Hairlines (1px, primary text at 7 to 10 percent) divide and never enclose, and keep 12px from text.
14. A KPI strip is about 48px tall and only as wide as its content: 28px icon tile, 12px grey label, 18px mono value, vertical hairlines between cells.
15. Charts: emerald line with a soft fade, dotted grey benchmark, 11px grey mono ticks, no border. No chart or statistic without data from section 4.
16. Draw the real navigation bar and do not redesign it: 64px tall, the emerald Walia ibex logo with bell and checklist on the left; Team Hub (in place of Dashboard), Research, Trading, Sonar (filled emerald pill), Watchlist, Community, Learning Center in the centre; profile, settings and red logout on the right; one hairline below.
17. Every section has loading (skeleton in final layout), empty (one line, one action) and error (short message with Retry) states.
18. Only overlays (dialogs, menus, tooltips, toasts) have a solid surface, border, shadow and radius.

| Colour          | Dark    | Light   |
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

Each council also has its own primary colour. Today it only tints the sidebar.

## 9. Open questions for me

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. May the shared sidebar be restyled? Default: yes, to text-only items beside a hairline, keeping all 17 destinations, the order, counts and role rules, and applied to every page that uses it.
2. Does the university colour stay in the sidebar? Default: yes, as the selected item's text colour where legible, otherwise emerald.
3. Should the page differ by role? Default: yes. One layout, with sections ordered and filtered by role from data that already exists.
4. Should the search field stay? Default: remove it until a real search exists.
5. Should tasks be created here? Default: yes, a short "New task" form for executives and portfolio managers, since saving already works.
6. Should the seven-day digest and the unused counts be shown? Default: yes.
7. Should admin and demo accounts get sample content here? Default: yes, labelled "Sample content", never saved.
8. Should task rows open something? Default: no. Only the status control acts.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Command Center (the Team Hub home). Route: /org-team-hub. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. This is an open brief for a university student-managed investment fund (an investment council): include 4 to 8 features tailored to investment councils and to the people who use this page (analyst, portfolio manager, executive, faculty advisor), such as a role-aware "needs your attention" list, pitch and coverage status, IPS compliance status, team attribution, grading and assignment queues, recruiting, and council versus council standing, each built only from data in section 4. The left sidebar is shared by every Team Hub page: draw it once, in a form that can be reused unchanged on all of them, with all 17 destinations and the member's name and role above it. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
