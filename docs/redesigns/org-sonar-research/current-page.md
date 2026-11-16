# Ezana Sonar Research page (organizational): how it works today

Page: Sonar Research. Version: organizational (university student-managed investment funds). Route: /org-team-hub/sonar. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Sonar is Ezana's research surface: a question returns a cited briefing drawn from the product's datasets, findings only, never advice. Sonar Research is the council's side of it: where research runs become reports the fund keeps, reviews, approves and attaches to pitches.

- Who uses it: analysts (run, save, submit), portfolio managers and executives (review, approve, read analytics), executives (set the budget). A faculty advisor is an executive.
- Decision it supports: for an analyst, is my research ready to submit and back a pitch. For a reviewer, does this report hold up, and what coverage is approved or stale. For an executive, how much deep research is left this month and who uses it.
- How they get to it: the Team Hub sidebar, a strip in the Research Library, a panel on each pitch, and "Open the report" after saving a run anywhere in Sonar.
- What they do next: a report, the Pitch Pipeline, the Research Library, or the main Sonar page.
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon and text links beside one hairline. The shell is already redesigned and live and is not part of this work.

How it differs from the main Sonar page. The main page is one member's search: a full-width dark hero with a question bar, quick pings, standard and deep research, and personal history and saved items. This page has none of that. It adds shared reports with versions, a review path, the fund's pooled budget and research analytics, and its form only starts deep research. A finished answer looks the same in both places.

Who can do what, as the code defines it:

| Action                                          | Analyst                                                     | Portfolio manager                     | Executive, faculty advisor |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- | -------------------------- |
| Reports listed                                  | Own, plus those shared with them, their desk or the council | The same, plus every submitted report | Same as portfolio manager  |
| Run research, save, comment, challenge          | Yes                                                         | Yes                                   | Yes                        |
| Submit, withdraw, delete a draft                | Author only                                                 | Author only                           | Author only                |
| Approve or return                               | Only with a granted permission                              | Yes, never their own                  | Yes, never their own       |
| Change title, sharing, pitch link               | Author                                                      | Any report they can open              | Any report they can open   |
| Per-member analytics                            | Own line only                                               | Everyone                              | Everyone                   |
| Per-member budget use, set pool and allocations | No                                                          | No                                    | Yes                        |

## 2. What is on the page today

Desktop, top to bottom, right of the sidebar.

**Header and tabs.** An emerald caps eyebrow ("Sonar for your fund"), a large "Sonar Research" title and an intro sentence. Then four tabs with icons: Reports (default), Research, Budget, Analytics. The tab is kept in the page address.

**Reports.** A filter row: search, a status menu (Draft, Under review, Approved, Superseded), a kind menu (Research, Fund fit, Challenge) and a "Mine" checkbox. Below, one bordered card per report, latest change first, up to 200: kind, ticker, a status chip, for fund fit a chip "Sonar view: Invest", "Watch" or "Pass", the title, 220 characters of the conclusion, then author, version, who can see it, "N% of claims verified" and the date. A card opens the report. Loading is a line of text. Empty is a dashed box: "No reports yet. Run research in Sonar and choose Save to your fund." An error is one red line.

**Research.** A form about 770px wide. Two outlined choices, "Should our fund invest?" (default) and "Open research question". Fund fit asks for a company or ticker and optional notes; open research asks for one question. Then a primary "Run deep research" and a line: 1 to 4 minutes, one run from the fund's monthly budget.

**Run screen.** Replaces the form: Back, a status line, a clock and Cancel (nothing is spent). When done, the Sonar answer takes over in its own layout, with "Save to your fund" under it. Budget used: a message with the reset date and "Quick answer", which leaves for the main Sonar page. Error: the message, "Try deep research again", "Quick answer". The screen is dark in light mode too.

**Save dialog.** "Save as" (a new report or a new version of one's own), title, "Who can see it" (Only me, the default; Selected members; My desk; Executives and portfolio managers; Whole organization), "Supports a pitch (optional)", "Save as draft". Afterwards a green line with "Open the report".

**Budget.** A bordered card: a large "12 of 100", "88 left", the reset date, a bar (amber at 90 percent), the viewer's own runs and allocation, and six bars for the last six months. Executives also get a field for the monthly pool, a table (Member and role, Runs this month, Share, Monthly allocation as a field) and "Save budget".

**Analytics.** A window choice (30 days, 90 days, 12 months, All time) as outlined buttons. Seven bordered tiles: Deep runs, Reports saved, Approved, Under review, Challenges, Claims verified, Tickers. A sortable member table: Member, Deep runs, Reports, Approved, Approval rate, Claims verified, Held under challenge, On pitches, Tickers. A row expands to eleven more (days to approval, citation coverage, sources per report, comments, fund fit views and so on). Then coverage: Sector, Ticker, Approved reports, Authors, Last approved, "(stale)" in amber after 120 days.

**Single report (its own address).** A bordered header card: kind, ticker, status, visibility, title, author, dates, reviewer, approved version, the reviewer's note in an amber box, links to its pitch, the report it challenges and its collections. Up to eight buttons by right: Submit for review, Withdraw to draft, Review (a note box with Approve, Return to the author), Mark superseded, Challenge the conclusion, Sharing and links, Collections, Delete draft. A challenge shows both conclusions side by side with a verdict. Then version buttons, the frozen Sonar answer, and a 320px sticky comments column: a menu for the part commented on (whole report, conclusion, each finding), a text box, the list with Resolve or Reopen, "Show N resolved".

**Tablet and phone.** Under 960px the comments column and paired conclusions stack. Under 900px the sidebar moves above the page. Tables scroll sideways.

## 3. What the user can do

- Search and filter reports; open one
- Start fund fit or open deep research; cancel; retry
- Save a run as a new report or a new version; set sharing and a pitch
- Author: submit, withdraw, delete a draft, mark superseded
- Reviewer: approve or return with a note; mark superseded
- Any reader of a report: comment on it or on one finding, challenge its conclusion, view older versions
- File a report in a Research Library collection
- Executives: set the monthly pool and per-member allocations
- Sort the member table, expand a member, change the window
- Easy to miss: a new version of an approved report returns it to draft; a challenge uses a budget run; Sonar decides the kind.
- In the code with no button: filter reports by ticker, collection or challenged report; reply to a comment; delete one's own comment.

## 4. Data we have

| Field                                            | Meaning                                                                   | Public source                               | Freshness         | Missing for                               |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------- | ----------------- | ----------------------------------------- |
| Title, question, kind                            | What was asked; research, fund fit or challenge                           | Author and Sonar                            | On load           | None                                      |
| Ticker, sector                                   | The company researched                                                    | Sonar's reading of the question             | On save           | Non-company questions; sector often blank |
| Status and dates                                 | Four statuses; saved, submitted, reviewed, approved                       | Member actions                              | After each action | None                                      |
| Visibility                                       | Who can read it                                                           | Author                                      | On load           | None                                      |
| Author, reviewer, note                           | Names and the review note                                                 | Council roster                              | On load           | Unreviewed reports                        |
| Versions                                         | Number, date, approved version                                            | Each save                                   | On load           | None                                      |
| Conclusion, confidence                           | Opening of the answer; high, medium or low                                | The saved answer                            | Frozen at save    | Runs with no conclusion                   |
| Fund fit view, mandate fit                       | Invest, watch or pass; fits, partial, outside                             | Sonar against the fund's mandate and policy | Frozen at save    | Other kinds                               |
| Challenge verdict                                | Holds, weakened, contradicted, cannot be tested                           | The challenge run                           | Frozen at save    | Non-challenges                            |
| Claims verified, citation coverage, source count | Share of claims that passed Sonar's checks; share cited                   | The saved answer                            | Frozen at save    | Older answers                             |
| Pitch, collections, challenges                   | Linked pitch ticker and company; collection names                         | Council records                             | On load           | Unlinked reports                          |
| Comments                                         | Text, author, date, version, part, resolved                               | Members                                     | On open           | None                                      |
| Budget                                           | Pool, used, left, reset date, six months of runs, own runs and allocation | Fund usage record                           | On load           | Others' lines, unless executive           |
| Analytics                                        | The totals and per-member figures in section 2                            | Calculated                                  | On load           | Rates with no base                        |
| Coverage                                         | Approved reports by sector and ticker, authors, last approval             | Calculated                                  | On load           | Reports with no sector                    |

## 5. Data we do not have

Do not design around these.

- Council notes and shared quick pings. Neither exists: only saved research runs are shared, and a quick ping cannot be saved to the fund.
- A sidebar count for this page.
- Notifications of any kind.
- Assigned reviewers, due dates, or a link from a report to an assignment or grade.
- Price targets, position sizes, ratings, or member-written text. A report is what Sonar produced and cannot be edited.
- Comments pinned beside a finding; differences between versions.
- Run cost in money or time; a history of budget changes.
- Per-desk or per-cohort analytics; comparison with other councils.
- Sample content. This page has none for demo accounts today.

## 6. Must keep working

- Only council members reach the page; others go to the home page.
- The role table in section 1, enforced on the server. Authors never approve their own report.
- The status path: draft, under review, approved, superseded; return and withdraw go back to draft; a superseded report is closed.
- Versions are frozen. A report is saved only from the member's own run made inside the council.
- The five visibility levels; "Selected members" needs at least one person. A challenge inherits the original's visibility.
- The two research starters, each drawing one deep run from the pool. Cancel and errors spend nothing.
- Executive-only budget settings, the pool's upper limit, an empty allocation meaning "draws from the pool".
- The tab in the page address and the direct address of a report. The Research Library strip and the pitch panel (its "Run research" link opens the Research tab) land here.
- Pitch link and collection filing from a report.
- Comment parts, resolve and reopen.
- Analytics windows; analysts see only their own line.
- The Sonar answer itself. Its layout is fixed by Sonar's own approved templates (desk summary, key figures, findings, charts, methodology, sources, section list). The redesign changes only the page around the answer and must not move, restyle or remove anything inside it.

## 7. Problems with the current page

Design problems:

- An eyebrow, title and intro open the page.
- Everything is boxed: cards, tiles, panels, comments, outlined buttons, filled chips, bordered search and menus. Tabs carry icons.
- The first screen is a flat list. It does not answer "what needs me": drafts, reports awaiting my review, reports returned to me.
- The budget hides in a tab, yet every run spends it; the Research form does not show what is left.
- The single report squeezes a wide Sonar answer between the sidebar and the comments column, under up to eight buttons, two primary.
- A comment names its finding only by a label.
- Analytics is a nine-column table with no link to the reports behind it.
- The run screen and saved answers stay dark in light mode.
- "Sonar view: Invest, Watch, Pass" reads as advice on a product that promises findings only.

Bugs and gaps:

- The budget message offers a standard answer, but this page cannot run one.
- "Quick answer" sends the member away to the main Sonar page.
- The Research tab opened from a pitch does not carry the pitch or ticker.
- Search covers only the newest 200 reports. Filters are not in the page address.
- Delete draft, Mark superseded and Withdraw act with no confirmation.
- Resolve shows for everyone; those without the right get an error.
- Comments ignore the version being viewed; Approve always names the current version.
- Missing values read "n/a". No skeletons and no Retry.

## 8. Design rules the mock must follow

The page must match the rebuilt organizational pages that are live (Command Center, Trading Desk, Fund Analytics, Assignments): the same compact KPI strip with page actions on its right, the "Sample content" label and switch, dialogs for forms, and for every section a skeleton, a one-line empty state and an inline error with Retry.

1. Sections, rows and tiles are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). Page content starts 24px right of the sidebar's hairline and ends exactly on the right line.
3. Tabs, toggles, window and mode choices are text only: no track, pill, fill, border or icon. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: red text, confirmed in a dialog.
5. Search has no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji or logos.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, count, version and ticker.
9. Sentence case. No em dashes. Describe, never advise.
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. A selected row is emerald text only.
12. Side-by-side sections 64px apart, stacked 20px apart. A side column is split off by one full-height hairline.
13. KPI strip: about 48px tall, as wide as its content, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
14. Tables: 11px grey caps header over a hairline, hairlines between rows, numbers right-aligned in mono.
15. Status, kind and visibility are text with an optional icon, never a filled chip. Stale carries a word and an icon, not colour alone.
16. Draw the real navigation bar and sidebar; redesign neither. Missing values read N/A.
17. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.
18. Where a Sonar answer appears, draw it as one labelled block that keeps its existing layout. Do not redraw its inside.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning, stale           | #fbbf24          | #d97706          |

## 9. Open questions for me

Each carries the default that will be used.

1. Lead with a "needs you" view? Default: yes; drafts, returned and awaiting review first, by role.
2. Keep four tabs? Default: Reports and Research share the first view; Budget becomes a strip figure with a settings dialog; Analytics stays.
3. Reword "Sonar view: Invest, Watch, Pass"? Default: keep the stored value, label it "Mandate screen", and say the committee decides.
4. Offer standard research here? Default: no; fix the message, link to the main Sonar page.
5. Carry the pitch and ticker into the Research form from a pitch? Default: yes.
6. Keep filters, search and the open version in the page address? Default: yes.
7. Redesign the single report too? Default: yes, its header, actions and comments; the answer is untouched.
8. Sample content for master admin and demo accounts? Default: yes, labelled, never saved, using the sample council of the other organizational pages.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Sonar Research. Route: /org-team-hub/sonar. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Do not redesign the Sonar answer: draw a finished answer as one labelled block and design only the page around it. Show how the page differs for an analyst and for a portfolio manager, executive or faculty advisor, respecting the role table in section 1, and draw the single report view and the save dialog. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a review queue, sector coverage with stale research marked, research attached to pitches, the pooled budget, challenge outcomes, research quality per analyst. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
