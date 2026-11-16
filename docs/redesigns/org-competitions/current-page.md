# Ezana Competitions page (organizational): how it works today

Page: Competitions. Version: organizational (university student-managed investment funds). Route: /org-competitions and its sub-pages. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026; the local copy could not be refreshed, so it was read as it stood). The page was not run; screenshots of the live page are supplied separately.

## 1. Summary

"Competitions" in the code is three different things, and only two are on this page.

1. Pitch competitions (this page). A council hosts a judged stock pitch event for other councils: rounds, rooms, teams, outside judges, a rubric, a live running order, a scoreboard and published results. Nothing here measures fund return; teams are ranked by judges' scores.
2. Pitch circuit (a sub-page). A hand-kept, read-only directory of eight real external pitch competitions with dates, eligibility and prizes.
3. Fund return competitions (NOT on this page). Councils enter their real fund and are ranked by percentage return since entry. It lives on an older page that no menu links to. Fund Analytics' "Council standing" block reads this third kind, yet its "Open competitions" link lands here, where it cannot be seen.

- Who uses it: executives and portfolio managers of a host council (run an event), members of a visiting council (register, hand in deliverables, read results), analysts (read only, plus their own team's work). A faculty advisor is an executive with that title.
- Decision it supports: for a host, is the event ready and who is admitted; for an entrant, what can we enter, what do we owe, how did we place.
- How they get to it: the Team Hub sidebar, the Fund Analytics link, a public event page's Register button. Next: Pitch Pipeline, Council Rankings, Fund Analytics.
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon and text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

Who can do what: every member sees the list and "Open to join". Only executives and portfolio managers create a competition, and only the host's edit it, advance its stage, see the scoreboard, reveal results and decide requests. Any member of another council, analysts included, can register its team (no role check). Entrants read only their own team's result, after reveal. Only managers edit their council's fund ratios.

## 2. What is on the page today

Every screen opens with an eyebrow, a large title and an intro sentence, and uses bordered, filled, rounded cards, pills and outlined buttons.

### 2.1 List (landing screen)

- Header "Host Command Center", "Pitch competitions". Buttons: "Pitch circuit", "Council ranking", and for managers "New competition" (filled).
- Card grid of competitions the council hosts or has a team in: stage pill (Draft, Open, In progress, Judging, Complete, Archived), "Host" or "Participant" tag, name, theme, format.
- "Open to join": open competitions of other councils not yet entered, with start date; each opens the join form. Hidden when empty.
- New competition dialog: name, format (Showcase, Single elimination, Round robin), theme, description.
- Empty: "No competitions yet." with, for managers, "Create your first competition". Loading: six card skeletons. Error: the shared Team Hub error screen. Non-members: a members only line.

### 2.2 Competition detail

- Name, stage, and outlined link buttons to the sub-pages below.
- Four icon tabs, read only for visitors. Overview: four tiles (Teams, Submitted, Judges, Rooms), a readiness checklist of five ticks (a round, a room, a team invited, a judge, a rubric), one filled button that moves the stage forward ("Open registration", blocked until the checklist is done, then "Start competition", "Move to judging", "Mark complete"), and Announcements. Structure: add and remove rounds and rooms, assign teams and judges to rooms. Invitations: invite a team (name, email, ticker, side), add a judge (name, email, firm, title), create a judge's private scoring link, shown once. Rubric: criterion, description, weight, max score; five defaults.

### 2.3 Sub-pages of one competition

| Sub-page          | Who                                              | What it holds                                                                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Join              | Members of other councils                        | A notice when own council hosts, already entered, request pending, registration closed or invite only. Otherwise a form: team name, contact email, ticker (free, from the host's pool, or hidden), side, and for applications a deck link, thesis and note. |
| Onboarding config | Host managers                                    | Admission mode (Invite only, Open sign-up, Request to join, Application), max teams, teams per council (default 1), registration window, ticker and side rules, required deliverables (deck, thesis, model), eligibility note, public page, sponsors.       |
| Join requests     | Host managers                                    | Team, contact, thesis, deck link, note. Approve (creates the team) or decline.                                                                                                                                                                              |
| My deliverables   | The visiting team                                | Per required item an upload or pasted thesis. Team members, each with an opt-in (off by default) letting judges, or judges and sponsors, see their pitch.                                                                                                   |
| Live board        | All with access                                  | Rounds, rooms and teams with times and status (Upcoming, On deck, Presenting, Complete), refreshed every 15 seconds. Host managers step things forward. On deck banner. "Projector mode".                                                                   |
| Scoreboard        | Host managers                                    | Teams with judges submitted and weighted score; Refresh, Recompute, "Reveal results" or "Hide results".                                                                                                                                                     |
| Results           | Host: all teams. Visitors: own team after reveal | Standings (rank, team, total), then per team the criterion breakdown and anonymous feedback.                                                                                                                                                                |

Publishing results awards trophies to team members and their portfolio managers (Winner, Top 3, Participant) and refreshes the council's rating on Council Rankings.

### 2.4 Other screens

- Pitch circuit: summary strip, academic year timeline, filters (All, In season, Canada, United States, Virtual finals), search, a card per external event, and a detail page.
- Council ranking sub-page: four tiles (Rating with tier, Competition, Fund, Peak), "View public leaderboard" (opens Council Rankings in a new tab), and a "Fund ratios" form: period label, return, Sharpe, max drawdown, volatility, alpha. Locked for non-managers.
- Fund return competition (separate, unlinked page): rows of competitions with an "entered" mark, "Leaderboard", and for managers "Enter". The leaderboard shows rank, university, return and fund value in dollars for every entered council, the viewer's row marked "you".

Tablet and phone: under about 780px layouts and grids fall to one column; the sidebar stacks above the page under 900px; tables scroll sideways.

## 3. What the user can do

- Host managers: create a competition; build rounds, rooms, teams, judges and rubric; assign teams and judges to rooms; copy a judge's one-time scoring link; set entry rules, deliverables, public page and sponsors; post announcements; move the stage forward one step (no button goes back or archives); approve or decline requests; step the live board; recompute, reveal or hide results.
- Entrants: join, request or apply with a team (one per council unless the host raises it); upload deliverables; add members; set or revoke recruiting consent; follow the live board; read their result, breakdown and feedback.
- Anyone: open, search and filter the pitch circuit; projector mode. Managers: save fund ratios.
- In code but with no button here: enter the fund in a return competition and open its leaderboard; set a hosted competition's start date, end date or rules link.

## 4. Data we have

| Field                                                                  | Meaning                                                                                                                                                                                | Source and freshness                                                   | Missing when                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| Name, theme, description, format, stage, host or participant           | The event and the council's role in it                                                                                                                                                 | Host entry and action                                                  | Theme, description optional                         |
| Start and end date, rules link                                         | Event dates and rules                                                                                                                                                                  | Stored fields                                                          | Usually empty: no control sets them                 |
| Entry rules and requests                                               | Admission mode, registration window, max teams, teams per council, ticker rule and pool, side rule, eligibility note, required deliverables with due date; join requests and decisions | Host settings                                                          | Optional                                            |
| Schedule and teams                                                     | Rounds, rooms, location, times, room status; team name, council, ticker, side, status, room, presentation status; counts of each                                                       | Host entry and registration; 15 second refresh on the live board       | Until built                                         |
| Judges and rubric                                                      | Judge name, email, firm, title (host only); criterion, description, weight, max score                                                                                                  | Host entry                                                             | Never                                               |
| Weighted score, judges submitted, rank                                 | Mean of submitted judges' weighted totals on a 0 to 100 scale; rank by score                                                                                                           | Judges' scorecards, on recompute                                       | Until a judge submits                               |
| Breakdown and feedback                                                 | Score per criterion, anonymous comments                                                                                                                                                | Judges; visitors after reveal                                          | If none written                                     |
| Announcements, deliverables, team members with consent scope, trophies | Host messages; what a team handed in; who pitched and what they share; Winner, Top 3, Participant                                                                                      | Host and team entry; trophies on reveal                                | Until added                                         |
| Pitch circuit entries                                                  | Name, host, region, city, mode, eligibility, team size, idea rules, prizes, rounds, key dates, links                                                                                   | Organizers' pages, checked by hand each term                           | Unpublished fields                                  |
| Council rating                                                         | Overall, competition, fund, peak, tier                                                                                                                                                 | Recalculated daily and on each reveal                                  | Until the council competes or reports               |
| Fund ratios                                                            | Return, Sharpe, max drawdown, volatility, alpha, period label                                                                                                                          | Typed by managers                                                      | Until entered                                       |
| Fund return competition                                                | Name, description, status, start, end; the council's rank, return since entry, councils entered                                                                                        | Recalculated each weekday evening from the fund's recorded daily value | Rank and return empty until a starting value exists |

How the fund return competition works: an executive or portfolio manager enters the council with one click. Return is the fund's value now against its value on the later of the competition's start and the entry day, as a percentage. Only councils with a return are ranked; ties share a rank; only competitions marked active are refreshed. Fund Analytics' "Council standing" shows exactly this: competition name, rank of field, return since entry, councils entered, end date.

## 5. Data we do not have

Do not design around these.

- Prize money, entry fees, payments.
- Brackets: the formats are labels only; no matches or seeds.
- Judge names or individual judges' scores for entrants; other teams' scores, deliverables or members.
- Return charts, risk figures or holdings of other councils.
- A way to create a fund return competition; how one comes to exist is unclear in the code.

## 6. Must keep working

- Every sub-page address (detail, join, config, requests, deliverables, live, scoreboard, results, circuit, council); the public event page and Fund Analytics link here.
- The role rules in section 1, checked again on the server. Only the host sees judges and all scores. Drafts are host only.
- Join rules: window, capacity, per council limit, pool ticker, side rule, one pending request per council.
- Judge links shown once; the judges' own page is outside this redesign.
- Reveal awards trophies and refreshes the council rating.
- Recruiting consent stays opt-in; fund ratios never take dollar amounts.

## 7. Problems with the current page

Design problems

- Three unrelated things share the word "competition", and the one Fund Analytics points to is not here.
- Overlap with Council Rankings: this page holds a "Council ranking" sub-page with the council's rating tiles and the form for the fund ratios that drive the ranking, plus a button that opens Council Rankings in a new tab. The rating appears on both pages and the ranking's inputs are entered here, not there, so a reader cannot tell which page answers "how do we rank".
- The landing screen is framed as a host tool though most councils are entrants, and a council's own state (events entered, requests pending, deliverables due, next presentation, latest result) is spread over five screens.
- Eight sub-pages behind look-alike buttons; title blocks, cards and pills break the current rules; no sample content.
- Fund ratios are typed by hand although Fund Analytics already calculates the fund's return and risk.

Bugs

- The Fund Analytics link lands on a page that does not show the competition it describes; the return competition page has no link anywhere.
- "Enter" is offered on return competitions of any status, and the server does not check.
- The return leaderboard shows every council's fund value in dollars, against the rule that dollars are never shown.
- Any member can register the council for a pitch competition; a return competition needs a manager.
- Start and end dates cannot be set on screen.
- Copy says "executives and VPs" for portfolio managers; decline and hide results use browser prompts; nothing archives or reopens a competition.

## 8. Design rules the mock must follow

The page must match the four rebuilt organizational pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip first with page actions on its right, flat sections, text tabs, a small "Sample content" label with a "Show council data" switch, and the same sample council ("Sample council", ranked 3 of 12 in "Sample intercollegiate fund challenge").

1. Sections, rows and tiles are flat: no fill, border, shadow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line; page content ends on the right line.
3. Tabs, filters and toggles are text only: no track, pill, border or underline. Selected is emerald text.
4. No outlined buttons. One solid emerald button per group; other actions are plain text; destructive is plain red text confirmed in a dialog.
5. Search and fields have no border or fill.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, illustrations or crests. Plus Jakarta Sans for text; JetBrains Mono for every number, date, score, rank and ticker.
8. Sentence case. No em dashes. Describe, never advise. Dark mode first; light mode must work.
9. KPI strip about 48px tall with 18px mono values; tables with an 11px grey caps header and hairlines between rows; hairlines divide and never enclose; side-by-side sections sit 64px apart.
10. Stage, status and placement are text with an optional icon, never a filled chip or colour alone.
11. Missing values read N/A. Percentages are signed.
12. Only dialogs, drawers, menus and tooltips have a surface.
13. Draw the real navigation bar and sidebar; redesign neither.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |
| Gold (winner)            | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Bring the fund return competition onto this page? Default: yes, as a second text tab ("Fund challenges") beside "Pitch competitions", so the Fund Analytics link is true.
2. Show other councils' fund value in dollars? Default: no.
3. Lead as entrant or host? Default: entrant first.
4. Keep the rating tiles and fund ratio form here? Default: move both to Council Rankings and leave one plain link.
5. Who may register the council? Default: leave as is, flagged.
6. Add start date, end date and rules link controls? Default: yes.
7. Fold the sub-pages into text tabs? Default: yes.
8. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Competitions. Route: /org-competitions. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Draw the landing screen in full (KPI strip, events entered with stage, next deadline and placement, open to join, hosting, fund challenges, circuit deadlines) and one competition's detail with text tabs, as an entrant and as a host. Keep this page clearly distinct from Council Rankings: Competitions is about single events a council enters or hosts, with rules, dates, teams, deliverables and that one event's standings; Council Rankings is the standing league table of all councils on a blended rating. Do not draw a league table of all councils here, and show the council's rating only as one plain link to Council Rankings. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a what is due strip, an entry checklist from the host's rules, a host readiness checklist, judged results with breakdown and feedback, member trophies, a fund challenge standing matching the Fund Analytics block, circuit deadlines. Use invented names only. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
