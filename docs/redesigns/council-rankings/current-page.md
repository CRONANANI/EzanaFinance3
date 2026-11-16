# Ezana Council Rankings page (organizational): how it works today

Page: Council Rankings. Version: organizational (university student-managed investment funds). Route: /council-rankings, with one detail page per council. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026; the local copy could not be refreshed and was read as it stood). The page was not run; screenshots of the live page are supplied separately.

## 1. Summary

Council Rankings is a standing league table of investment councils across universities. Each council carries one rating, built from two parts: how its teams placed in judged pitch competitions, and the fund performance ratios its managers report. The table lists every rated council in rating order; a detail page explains one council's rating.

- What is ranked: councils against councils, one row per council, shown under the university's name. Not individuals, not teams.
- On what measure: a blended rating, 60 percent competition and 40 percent fund. Both parts start at 1000.
- Over what period: none. The competition part is all-time. The fund part uses whatever period each council typed in, so councils may be compared on different periods.
- Who uses it: executives, faculty advisors and portfolio managers (where do we stand, which half holds us back) and analysts (how does my council compare).
- Decision it supports: enter more judged events, or improve the fund's risk-adjusted return and report it.
- How they get to it: the Team Hub sidebar, and "View public leaderboard" on the Competitions page's "Council ranking" sub-page, which opens it in a new tab.
- What they do next: Competitions (enter an event, report fund ratios), Fund Analytics.
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon and text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

How it differs from Competitions: Competitions is about single events with an entry step, rules, dates, teams and that event's own standings. Council Rankings has no entry step, no dates and no events of its own; it is the permanent table that event results and reported ratios feed. The fund return challenge described on Fund Analytics ("Council standing") does not feed this rating at all.

Roles: the page is identical for every viewer. It does not know who is looking, so nobody's own council is marked, and no role sees more or less. Only executives and portfolio managers can change their council's fund ratios, and they do that on the Competitions page, not here.

Privacy as built: there is no opt-in and no opt-out. A council appears automatically the first time one of its teams receives a result in a judged competition, or a manager saves fund ratios. Its rating, tier, ratios and full rating history are then readable by every viewer. Dollar amounts are never stored or shown. The page is not on the list of pages that require sign-in, and the code calls it the public leaderboard; whether a signed-out visitor really reaches it was not checked.

## 2. What is on the page today

### 2.1 The table

Top to bottom:

1. Title block: small label "Ezana", large title "University Council Rankings", and a paragraph on the 60 and 40 weights (judged results are verified, fund ratios self-reported) ending "We show ROI and Sharpe, never dollar amounts."
2. "Rank by" row: three pill buttons, Overall (default), Competition, Fund. Choosing one re-sorts the table on screen by that rating. The choice is not kept in the page address.
3. The table, inside a bordered rounded panel, up to 200 councils:

| Column            | What it shows                                                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #                 | Row position in the current sort, starting at 1                                                                                                                   |
| Council           | University name as a link to the council's detail page, with a small amber "self-reported" pill when its fund ratios were typed in by the council (always, today) |
| Tier              | A coloured pill: Emerging, Competitive, Established, Elite or Dynasty                                                                                             |
| Rating            | The blended rating, bold                                                                                                                                          |
| Comp / Fund split | A two-colour bar: share of the rating coming from each part                                                                                                       |
| Comp              | Competition rating                                                                                                                                                |
| Fund              | Fund rating                                                                                                                                                       |
| ROI               | Reported return, one decimal with a percent sign, unsigned                                                                                                        |
| Sharpe            | Reported Sharpe ratio, two decimals                                                                                                                               |
| Move              | The size of the council's most recent rating change, green with a plus or red; N/A when none                                                                      |

4. Legend: two swatches, "Competition (judged)" and "Fund (ratios)".
5. Footer line: fund ratios are self-reported, competition results are verified by judges.

States. Empty: "Rankings will appear here once councils compete and report their ratios." Loading: a different title ("Rankings") over a bordered card of grey lines. Error: the shared Team Hub error screen. No dialogs, menus or toasts.

### 2.2 Council detail page

1. "All councils" back link.
2. Header: label "Ezana · Council Rankings", the university name, tier pill, and on the right the rating in large type with "rating · peak N".
3. "How this council earns its rating": a sentence on the weights, a wide two-colour bar labelled "Comp N%" and "Fund N%", and two filled cards, Competition and Fund, each with its rating and a one-line explanation.
4. "Competition contribution": rating changes tagged as competition, each with signed points, a reason and a date. Empty: the rating sits at the 1000 baseline until the council places in a judged event.
5. "Fund contribution" with the period label and the "self-reported" pill: five tiles, Sharpe (tagged "weighted most"), ROI, Alpha, Max drawdown, Volatility. Empty: the fund rating sits at the 1000 baseline until ratios are reported.
6. "Rating history": the last 40 rating changes with signed points, a coloured tag (competition or fund), a reason and a date.
7. The same footer.

A council with no rating gets the standard not found page.

### 2.3 Tablet and phone

The table keeps all ten columns and scrolls sideways. Under 560px the detail page's two cards stack and the history tag is hidden. The sidebar stacks above the page under 900px.

## 3. What the user can do

- Re-sort the table by overall, competition or fund rating.
- Open a council's detail page; go back to the table.
- Hover the split bar for the two percentages.
- Nothing else: no search, filter or export.
- Report fund ratios: on the Competitions page only, with no link from here.
- Jump to the viewer's own council: not possible.

## 4. Data we have

| Field                                           | Meaning                                                                                                                                                                                                                                  | Source                                                | Freshness                                                 | Missing when                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Council name                                    | University name, else the council's own name                                                                                                                                                                                             | Council record                                        | On load                                                   | Never                                                                      |
| Overall and peak rating                         | 60 percent competition rating plus 40 percent fund rating; the highest it has reached                                                                                                                                                    | Calculated                                            | Once a day, and when a host publishes competition results | Council never competed or reported                                         |
| Competition rating                              | Starts at 1000. In every judged pitch competition with results, oldest first, a council's best placed team is compared with every other council's. Finishing above a higher rated council gains more; below a lower rated one costs more | Published judges' results                             | Same                                                      | Stays 1000 until the council places in an event with at least two councils |
| Fund rating                                     | A score from the reported ratios: Sharpe counts most, then alpha, then return, less max drawdown. It is placed relative to all reporting councils: the average gets 1000, each standard deviation is 200 points                          | Ratios typed by the council's managers                | Same                                                      | Stays 1000 until ratios are saved                                          |
| Tier                                            | Emerging below 1020, Competitive from 1020, Established from 1120, Elite from 1250, Dynasty from 1400                                                                                                                                    | From the overall rating                               | Same                                                      | Never                                                                      |
| Return, Sharpe, alpha, max drawdown, volatility | The council's reported ratios                                                                                                                                                                                                            | Typed by managers                                     | When they save                                            | Any left blank; all, if never reported                                     |
| Period label                                    | Free text the council typed, for example a year                                                                                                                                                                                          | Typed by managers                                     | When they save                                            | If left blank                                                              |
| Self-reported flag                              | Marks ratios as typed in, not verified                                                                                                                                                                                                   | Automatic                                             | Always on today                                           | Never                                                                      |
| Rating change                                   | Signed points, part (competition or fund), reason text, rating before and after, date                                                                                                                                                    | Written when a recalculation moves the overall rating | Daily                                                     | Until the rating first moves                                               |
| Move                                            | Points of the latest rating change                                                                                                                                                                                                       | From the history                                      | Daily                                                     | No change yet                                                              |

Notes a designer must respect:

- The reason on a real rating change is a generic line naming the two ratings after the recalculation. It does not name the competition or the placement. Only demonstration rows carry a line such as "Placed 1st at" an event.
- A rating change is tagged with whichever part moved more; it is not split between the two.
- The fund rating is relative, so it moves when other councils report, even if a council's own ratios did not change.
- A setup script in the code fills the table with eight demonstration councils named after real Canadian universities, with invented standings. Whether it has been run on the live product was not checked. Sample content must use invented council names instead.

## 5. Data we do not have

Do not design around these.

- The viewer's own council as a known row, in the current build. (The redesign may add it; the membership is known elsewhere in the product.)
- Rank history: no stored rank over time. Only rating points, and only when they changed.
- A season, term or year selector. Nothing is stored per period.
- Region, conference or any grouping of councils; fund size, holdings or dollar figures, by design.
- Verified performance: ratios are not checked against the fund's record on Ezana.
- Which competition and placement produced a rating change (see section 4), a council's list of events entered, wins or trophies on this page.
- Member counts, logos, crests or any council profile; head to head records.
- The fund return challenge's standings; they are separate and do not feed this rating.

## 6. Must keep working

- The table address and the per council detail address; the sidebar entry; the link from the Competitions page.
- Sorting by overall, competition and fund.
- Every council name opens its detail page; a council without a rating gives not found.
- The self-reported mark wherever fund ratios or the fund rating appear.
- Never show a dollar amount.
- The explanation of the two parts and their weights; the rating history on the detail page.
- A council that has not competed or not reported reads as 1000 for that part, with words saying why.

## 7. Problems with the current page

Design problems

- Overlap with Competitions: the council's own rating tiles and the form for the fund ratios that drive this table live on a "Council ranking" sub-page of Competitions, which links here as the "public leaderboard". Two pages share the words "council ranking", the inputs to this page are edited on the other one, and Fund Analytics has a "Council standing" block that is about a third thing (a fund return challenge). A reader cannot tell which page answers "how do we rank".
- The viewer's council is not marked or summarised; a member must scan up to 200 rows for it.
- No KPI strip, no search, no way to see the councils just above and below.
- The split bar says almost nothing: both parts start near 1000 and the weights are fixed, so nearly every row shows about 60 and 40.
- "Move" has no period, so a change from months ago looks current.
- Title block, pill toggles, tier pills, a bordered table panel and filled cards break the current rules; nothing matches the rebuilt Team Hub pages.
- No sample content label; no path from a weak half to the action that fixes it.

Bugs and unsound rules

- Ratios from different periods are compared as if they covered the same period.
- A council that reports nothing keeps a fund rating of 1000, the average, so not reporting beats reporting a poor year.
- Ties get different row numbers; the number is only the row position.
- Return is shown unsigned.
- Rating change reasons are machine text, so "Competition contribution" never says which event.
- The loading screen shows a different title from the page.
- Fund ratios are typed by hand although Fund Analytics already calculates the fund's return and risk.
- No opt-out: a council cannot hide itself or its ratios.

## 8. Design rules the mock must follow

The page must match the four rebuilt organizational pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip first with page actions on its right, flat sections, text tabs, a small "Sample content" label with a "Show council data" switch, and the same sample council ("Sample council", the one shown ranked 3 of 12 in "Sample intercollegiate fund challenge" on Fund Analytics). Other councils in the mock carry invented names, never real universities.

1. Sections, rows and tiles are flat: no fill, border, shadow or rounded panel, in either mode. The table has no enclosing box.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line; page content ends on the right line.
3. The rank-by control and any tabs are text only: no track, pill, border or underline. Selected is emerald text.
4. No outlined buttons. One solid emerald button per group; other actions are plain text.
5. Search has no border or fill: an icon and grey placeholder.
6. No page title, eyebrow or intro paragraph. The weighting is explained in one short line or a tooltip.
7. Bootstrap Icons only. No emoji, medals, crests or logos.
8. Plus Jakarta Sans for text; JetBrains Mono for every rating, rank, ratio, date and count.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. KPI strip about 48px tall with 18px mono values; tables with an 11px grey caps header, hairlines between rows, numbers right-aligned.
12. Tier and "self-reported" are text with an optional icon, never a filled chip, never colour alone. The viewer's own row is marked by emerald text, not a wash.
13. Missing values read N/A. Return, alpha and rating changes are signed.
14. Hairlines divide and never enclose. Side-by-side sections sit 64px apart.
15. Only dialogs, drawers, menus and tooltips have a surface.
16. Draw the real navigation bar and sidebar; redesign neither.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning (self-reported)  | #fbbf24          | #d97706          |
| Gold (top tier)          | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Mark and summarise the viewer's own council (rank, rating, both parts, gap to the next council)? Default: yes, in the KPI strip and as a marked row.
2. Move the council's rating tiles and the fund ratio form from Competitions to this page? Default: yes, as a "Your council" section for executives and portfolio managers, with one link left on Competitions.
3. Keep the split bar? Default: no; show the two ratings as numbers.
4. Should councils be able to hide from the table? Default: not built now; flagged, since it needs a new stored setting.
5. Keep the detail as a separate page? Default: yes, same address, redesigned flat.
6. Give "Move" a date? Default: yes, show the date of the change beside it.
7. Offer to fill fund ratios from Fund Analytics? Default: no; show a plain link to Fund Analytics and keep manual entry.
8. Sample content for master admin and demo accounts? Default: yes, labelled, invented council names, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Council Rankings. Route: /council-rankings. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Draw the league table in full with the viewer's own council marked, and the detail of one council (how the rating is earned, competition part, fund part with the reported ratios, rating history). Keep this page clearly distinct from Competitions: Council Rankings is the standing table of all councils on one blended rating, with no entry step, no event dates, no teams and no deliverables; Competitions is where a council enters or hosts single events and sees that one event's standings. Do not draw event lists, join buttons, schedules or an event leaderboard here; link to Competitions in plain text where an action belongs there. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a your council summary with rank and gap to the next council, the councils directly above and below, which part of the rating is weaker, reported ratios with period and the self-reported mark, points to the next tier, rating history, and a managers only place to report fund ratios. Use invented council names only, never real universities. Label all numbers and names as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
