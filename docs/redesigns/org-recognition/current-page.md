# Recognition (organizational): the page as it exists today

Written from the code at commit 8ffb5a2 on main (15 November 2026). The page was not run: no browser, no database.

## 1. Summary

Recognition is two things on one page. The first is the Ezana Rating: a number for each council member, starting at 1250, that moves when their pitches are scored against the market. The second is badges and awards: short citations a manager gives a member by hand, plus two badges the system can work out from pitch outcomes. There are no nominations, peer shout-outs, reactions or comments: members cannot recognise each other.

- Who uses it: analysts (read their scorecard, compare with peers), portfolio managers and executives (rank the council, give awards). A faculty advisor is an executive with the title Faculty Advisor.
- Decision it supports: for an analyst, how good is my record and what moved it; for a manager or advisor, who has earned credit this term.
- How they get to it: the Team Hub sidebar, whose Recognition link counts awards given in the last 7 days. Nothing else links here.
- What they do next: the Pitch Pipeline, Fund Analytics or Grades, through the sidebar. The page links nowhere.
- The page sits inside the shared Team Hub shell, a 200px sidebar of 17 icon-and-text links beside one hairline, already redesigned and live. This redesign covers only the page body to its right.

| Action                                          | Analyst | Portfolio manager                              | Executive, faculty advisor |
| ----------------------------------------------- | ------- | ---------------------------------------------- | -------------------------- |
| See the ranking and any member's full scorecard | Yes     | Yes                                            | Yes                        |
| Give a badge or award by hand                   | No      | Yes, to any active member, themselves included | Same                       |
| Run auto-award, recompute ratings, edit weights | No      | Yes                                            | Yes                        |
| Edit or remove an award once given              | Nobody  | Nobody                                         | Nobody                     |

## 2. What is on the page today

Desktop, top to bottom.

**Header.** Small caps "Team Hub", the title "Recognition" and a one-line description of the Ezana Rating. Managers also get four buttons on the right: Recompute ratings, Auto-award, Weights (all outlined) and Award (filled). After Recompute or Auto-award, one emerald line reports the result, for example "Awarded 2 badge(s) from outcomes.", and stays until the next action.

**Left column, 236px wide.**

- Ranked. A dropdown with six lists: Top movers, All members, Vice Presidents, Portfolio Managers, Analysts, Quant Traders. Top movers adds a period selector (30D, QTD, YTD) and ranks by the signed change in rating over that period, leaving out anyone who did not move. The other lists rank by rating. Each row is a button: initials, name, a role tag (Analyst, Quant, PM, VP) and the value; members with fewer than 10 scored pitches are dimmed. A row opens that member's scorecard. States: "Loading...", an error line, "No rating movement in this period." or "No rated members yet."
- Recently earned. The eight newest badges and awards: an emoji, the title and the recipient's name, awards in gold. One opens the recipient's scorecard. Empty: "No badges earned yet."

**Right column: the scorecard** of the chosen member, the viewer by default.

- Export: opens the browser print dialog, showing only the scorecard.
- Head: initials, name, a "Provisional" chip under 10 scored pitches, role, number of rated theses, tier, "Org percentile", "All funds" percentile, and the rating as a large number (dimmed while provisional).
- A small line chart of the rating's history, or "No rating history yet."
- Rating breakdown, with a pill "Evaluated as [role]": six categories, each with its weight in percent and a score from 0 to 100 on a bar (emerald from 78, blue from 62, amber below) or the word "pending".
- Resolved theses: Ticker, Hold (days), Excess vs sector, Conviction (out of 5) and rating change, largest first. Empty: "No rated theses yet."
- Calibration: dots for declared conviction (1 to 5) against the share of those pitches that beat the benchmark, with a dashed ideal line, or "Calibration pending."
- Badges and awards: chips, awards first in gold, system badges marked "auto". The reason is a hover tooltip only.

**Award recognition dialog (managers).** Recipient (every member, with role), Badge (Analyst of the Month, Best Call, Most Accurate, Rising Star, Clutch Contributor, Best Deep Dive), Period (free text, "e.g. 2026-Q2"), Title (required), Reason, and a checkbox "Mark as a gold Award (distinct from a standard badge)". Cancel and Award badge.

**Rating weights dialog (managers).** For each of four roles (Analyst, Quant Trader, Portfolio Manager, Vice President): six categories, a number box from 0 to 100 each, a running total and a Save button. The total need not equal 100 and there is no reset to defaults.

**Page states.** A skeleton of a title, three stat tiles and six cards (none of which the page has), then "Loading recognition...". Errors: "Failed to load recognition.", "Could not connect.", and for non-members "This page is for organizational members only."

**Tablet and phone.** Under 860px the columns stack: ranking, recent badges, scorecard. The theses table scrolls sideways. Nothing else adapts.

## 3. What the user can do

- Switch the ranked list and, on Top movers, the period.
- Open any member's scorecard from a ranked row or a recent badge.
- Export a scorecard through print.
- Hover a badge to read its reason (no touch or keyboard route).
- Managers: give a badge or a gold award by hand, recompute every rating, and change the weights for a role.
- Managers: run Auto-award. At most two badges per period: Best Call to the analyst whose pitch has the highest excess return, Most Accurate to the one with the highest share of pitches that beat the benchmark. A second run in the same period adds nothing.
- In the code with no button: recompute one member; auto-award for a named period; attach a pitch to a hand-given award.

## 4. Data we have

| Field                                                                                                   | What it means                                                                                                                                                                                                                                                                   | Where it comes from                                                                                                                    | Freshness                             | Missing when                          |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| Member name, role, title                                                                                | Who the member is                                                                                                                                                                                                                                                               | Council roster                                                                                                                         | Live                                  | Name reads "Member"                   |
| Rating role                                                                                             | Analyst, Quant Trader, Portfolio Manager or Vice President                                                                                                                                                                                                                      | From role and title: executives map to Vice President, any title containing "quant" to Quant Trader                                    | Live                                  | Never                                 |
| Ezana Rating                                                                                            | 1250 plus or minus points per scored pitch                                                                                                                                                                                                                                      | Excess return of each scored pitch (held between minus 25 and plus 40) times 18, up to 16 more or fewer when a conviction was declared | Only when a manager presses Recompute | Shows 1250 until first recompute      |
| Inactivity decay                                                                                        | Minus 25 after 30 idle days, not below 1250                                                                                                                                                                                                                                     | Daily job                                                                                                                              | Daily                                 | No rating yet                         |
| Tier                                                                                                    | Unranked, Trainee (1250), Junior Analyst (2000), Analyst (2500), Senior Analyst (3000), Portfolio Manager (3500), CIO (4000), Legend (4500)                                                                                                                                     | From the rating                                                                                                                        | With the rating                       | Unranked with no scored pitch         |
| Rated thesis count, provisional                                                                         | Scored pitches; provisional under 10                                                                                                                                                                                                                                            | Pitch outcomes                                                                                                                         | With the rating                       | Zero                                  |
| Rating history, and change over 30 days, quarter or year to date                                        | Each change with its reason (pitch scored, decay), summed per period                                                                                                                                                                                                            | Rating log                                                                                                                             | With the rating                       | Fewer than two changes                |
| Council percentile, all funds percentile                                                                | Share of rated members below this rating, in the council and across every council on Ezana                                                                                                                                                                                      | Computed                                                                                                                               | On load                               | Unrated, or one rated member          |
| Scored pitch: ticker, company, sector, hold days, excess return, benchmark return, conviction, points   | A pitch by the member, decided at least 30 days ago                                                                                                                                                                                                                             | Pitch Pipeline, priced each weekday against a broad market benchmark                                                                   | Weekdays                              | Conviction when not declared          |
| Category scores (0 to 100)                                                                              | Alpha from mean excess return; research output from notes written (8 is full marks); task efficiency from assignment submissions (6); engagement from notes plus badges received (10); learning from the platform learning rating; calibration from conviction against outcomes | Computed at recompute                                                                                                                  | With the rating                       | See section 5                         |
| Category weights                                                                                        | Percent per category per role, council override over platform default                                                                                                                                                                                                           | Set by managers                                                                                                                        | Live                                  | Never                                 |
| Badge or award: type, title, reason, period, gold flag, auto flag, recipient, giver, date, linked pitch | One recognition                                                                                                                                                                                                                                                                 | Managers or auto-award                                                                                                                 | Live                                  | Giver and pitch are stored, not shown |
| Awards in the last 7 days                                                                               | A count                                                                                                                                                                                                                                                                         | Computed                                                                                                                               | Live                                  | Zero                                  |

## 5. Data we do not have

Do not design around these.

- Nominations, peer shout-outs, reactions, comments or votes on awards.
- Any privacy setting, opt-out, private award or hidden rating.
- Editing or removing an award.
- A notification on being recognised. The setting "I receive recognition" exists; nothing sends it.
- Scores for execution quality, backtest research, risk management, allocation discipline, leadership and team uplift: always "pending". That is 42 percent of a Vice President's weights and 32 percent of a portfolio manager's or quant trader's.
- Excess return against a sector. The figure is against the broad market.
- Grades, attendance, votes cast or flag accuracy inside the rating or as award criteria.
- A member profile page, photos, streaks, points, levels or badge artwork.
- Rating history with true dates (see bugs), team or cohort ratings, council versus council tables.
- Sample content for this page. None exists yet.

## 6. Must keep working

- The role rules in section 1, checked on the server for every write.
- Giving a badge or gold award by hand, to an active member of the same council only.
- Auto-award (once per badge type per period), recompute, the daily decay, and weight overrides per council that never change the platform defaults.
- The six ranked lists, the three periods, opening a scorecard from a row or a badge, every scorecard part in section 2, and print export.
- No invented scores: a missing input reads pending, an unrated member is provisional.
- The sidebar count and the Command Center digest row "Awards given".
- The cohort roster reads the same rating; archiving a cohort freezes each rating into the alumni directory.
- The route address. Dialogs close on Esc.

How it connects elsewhere today:

| Place                              | Connection                                                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fund Analytics analyst leaderboard | Separate. It ranks by dollar contribution, hit rate and average alpha from the same pitch outcomes, never shows the Ezana Rating, and opens a different scorecard that an analyst may open only for themselves. No links either way. |
| Grades                             | None. Grades do not feed the rating and awards do not appear in Grades. A student sees only their own grades; every rating is open to the whole council.                                                                             |
| Assignments                        | The submission count feeds task efficiency.                                                                                                                                                                                          |
| Member profiles                    | No member profile page exists. The scorecard is the nearest thing and has no address, so nothing can link to one member.                                                                                                             |
| Command Center                     | The digest counts awards in 7 days. No names, no link.                                                                                                                                                                               |

## 7. Problems with the current page

**Design problems**

1. The name promises recognition, yet badges get two small corners and a rating scorecard fills the page.
2. The scorecard defaults to the viewer with no "you" marker.
3. Title block, outlined buttons, bordered cards, emoji, filled role tags and coloured chips all break the brand rules.
4. Four manager buttons, unexplained and unconfirmed.
5. An award's reason is only a tooltip. Giver, date and period are never shown.
6. The ranking is 236px wide, so names truncate.
7. No awards by term, team or person; no history beyond eight items.
8. The loading skeleton matches nothing on the page.

**Bugs**

1. The weights do nothing to the rating, which is built only from pitch outcomes and decay; they only change the percent printed beside each category.
2. Every recompute rewrites the rating log with today's date. Top movers then shows each member's lifetime change as this period's, the history has no real dates, and the decay clock restarts.
3. Decay raises a member who is below 1250 up to 1250.
4. "Excess vs sector" is excess over the broad market.
5. Auto-award ignores the period it names and reads every outcome ever, so one pitch can win each quarter. Most Accurate can go to someone with one pitch.
6. Rejected pitches are scored like accepted ones, as far as the code shows.
7. Receiving a badge raises the recipient's engagement score.
8. Faculty advisors and executives are rated and ranked as "Vice Presidents".
9. The recipient list includes inactive members, who are then refused.
10. Ratings never update when a pitch is scored; someone must press Recompute.

## 8. Design rules the mock must follow

The page must match the four rebuilt org pages (Command Center, Trading Desk, Fund Analytics, Assignments): a KPI strip first with page actions on its right, flat sections, text tabs, a "Sample content" label with its "Show council data" switch, and the same sample council (nine invented members, sector teams Financials, Healthcare, Technology and Industrials, the 2026 analyst class).

1. Sections, rows and tiles are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line. Content sits right of the sidebar and ends exactly on the right line.
3. Tabs, list switches, period selectors and toggles are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text.
5. Search is borderless: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, medal artwork, logos or illustrations. A badge is an icon and words.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, rating, score, count and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. A selected row is emerald text only. Vertical rules keep 24px from text, horizontal rules 12px.
12. Side-by-side sections 64px apart; stacked sections 20px apart. A side column is split off by one full-height hairline.
13. KPI strip: about 48px tall, as wide as its content, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells.
14. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned in mono.
15. Role, tier, provisional and award type are text with an optional icon, never a filled chip. Gold is allowed only as text or icon colour for a gold award.
16. Missing values read N/A, unscored categories "pending" with no bar. Changes are signed. No chart or figure without data from section 4.
17. Draw the real navigation bar and sidebar; redesign neither. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative                 | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |
| Gold (awards)            | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Lead with awards or with the rating? Default: an awards feed first, ranking beside it, scorecard opened from a row.
2. Let any member open any scorecard? Default: keep as is, flagged.
3. Add peer nominations? Default: only as "not available yet"; they need a database change.
4. Keep the Weights control though it does not move the rating? Default: keep it, labelled as display weights.
5. Fix the dating, decay, period and self-award bugs? Default: yes where no database change is needed.
6. Rate faculty advisors? Default: leave them out of the ranking, still able to give awards.
7. Put the chosen member in the page address, and link to and from the Fund Analytics leaderboard? Default: yes.
8. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Recognition. Route: /org-team-hub/recognition. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. This is an open brief. Keep the existing Team Hub sidebar as it is and design only the content to its right, matching the rebuilt org pages: a KPI strip, flat sections, text tabs and a "Sample content" label. Show the manager view (give an award, auto-award, recompute, weights) and say what an analyst sees instead, and draw the award dialog and one member's scorecard. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example an awards feed with reason, giver and period, a term honour roll, awards by sector team, the pitch behind each rating change, a plain account of how the rating is worked out. Use invented sample names only. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
