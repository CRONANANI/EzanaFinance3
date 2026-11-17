# Learning Center page (council section): how it works today

Page: Learning Center. Version: organizational (a council-only section on the shared page, shown only to council members). Route: /learning-center (course pages and the badges page keep their own routes). Brief: keep the redesigned Learning Center working for everyone and add a council section for university investment councils.
Written from the code at commit a2de444 (main, November 16, 2026). The retail page was redesigned and shipped in November 2026; this describes that shipped version. The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The Learning Center is Ezana's personal learning hub: 121 short courses in five tracks (Stock Market & Investing, Cryptocurrency & Digital Assets, Betting Markets & Prediction Markets, Commodities, Risk Management & Trading Psychology), each track in four levels (Bronze, Silver, Gold, Platinum). Passing courses and daily quests earns a learning rating (LearningELO) with tiers, a streak and badges.

- Who uses it today: every signed-in user, retail, council and partner, through the same page. Nothing on it is council-specific.
- Who in a council would use the council section: new analysts (onboarding curriculum before they can pitch), all members (modules assigned to them with due dates), portfolio managers and executives (assign modules to a team or cohort, see completion), faculty advisors (tie modules to the participation grade and see who is behind).
- Decision the council section supports: "is each new member ready to pitch", "which assigned modules are overdue and for whom", and "how does learning feed the council's grades".
- How they get to it: the Learning Center link in the top navigation bar; Quant Lab also links to it as "Quant courses".
- What they do after: open a course, take its quiz, then return to the Team Hub (Assignments, Grades, Cohorts).

The redesign keeps the personal hub exactly as it works and adds a council section (or council cards) that only council members see.

## 2. What is on the page today

Desktop, top to bottom. No title block.

**A. KPI strip with page actions.** LearningELO with its seven-day change, Current tier (tier colour mark and name), Current streak, Badges earned (opens the badges page), Active tracks. Each has a small info tip. On the right: "Saved courses" (text, opens a dialog) and "Resume learning" (the page's only filled button, opens the next course in the main track). For master admin and demo accounts a small "Sample content" label with a Hide switch.

**B. Row 2.**

- Rating history: a stepped emerald area chart of the rating over time, range options 1M, 3M, 6M, 1Y and ALL, with the network position, points to the next tier and a tiers legend (Bronze from 0, Silver from 500, Gold from 1,500, Platinum from 2,520).
- Daily quest: a featured lesson with Start or Resume, three tasks with status marks that tick themselves when done, and a countdown to the next quest.

**C. Row 3.**

- Your tracks: the five tracks with progress; choosing one makes it the main track and puts it in the page address.
- Active path: level tabs with counts (Bronze, Silver, Gold, Platinum), a course filter, a Saved toggle, and course rows (title, description, minutes, reward of 10, 20, 35 or 55 rating points by level, status, bookmark). With a filter or Saved on, the list spans all tracks.
- Side column: Your progress for the selected track (quizzes passed, quiz accuracy, estimated hours, track rating, courses to the next level badge, View badges, active days this week, best streak) and Recommended for you (the next courses in curriculum order).

**D. Beginner card.** For new investors, a basics card and a "start the beginner path" action until the first level is done; two onboarding spotlight targets.

**Dialogs and toasts.** Saved courses (list, remove, browse); saving rolls back with a toast on failure.

**States.** Each source (courses, rating, quest, streak, saved) loads, fails and retries on its own: skeletons in the final layout, one-line empty states with one action, inline errors with Retry, and N/A instead of zero for a failed value.

**Tablet and phone.** Sections stack: summary, quest, path, tracks, progress, history, recommended.

**Course pages (not part of this redesign).** Chapters, visuals, a quiz; passing awards the reward.

## 3. What the user can do

| Action                                        | Who                            | Notes                             |
| --------------------------------------------- | ------------------------------ | --------------------------------- |
| Resume learning                               | Every user                     | Next course in the main track     |
| Choose a track (becomes main track)           | Every user                     | Kept in the page address          |
| Switch level, filter courses, show saved only | Every user                     |                                   |
| Open a course, take its quiz                  | Every user                     |                                   |
| Save or unsave a course                       | Every user                     | Optimistic, rolls back on failure |
| Start the daily quest lesson                  | Every user                     | Tasks tick themselves             |
| Open badges                                   | Every user                     |                                   |
| Hide sample content                           | Master admin and demo accounts | Remembered in the browser         |

There is nothing council-specific on this page today.

## 4. Data we have

The page's own data, per user:

| Field                                        | What it means                                                | Source in public terms      | Freshness | Missing for           |
| -------------------------------------------- | ------------------------------------------------------------ | --------------------------- | --------- | --------------------- |
| Curriculum                                   | 121 courses: track, level, title, description, minutes, quiz | Ezana's curriculum          | Fixed     |                       |
| Course progress                              | Started, passed, quiz score per course                       | Recorded as the user learns | Immediate |                       |
| LearningELO, tier, history, network position | Rating from passed courses and quests                        | Ezana rating                | Immediate | New users start empty |
| Streak, active days                          | Days with learning                                           | Ezana activity              | Daily     |                       |
| Daily quest                                  | Featured lesson and three tasks                              | Server-evaluated each day   | Daily     |                       |
| Badges                                       | Earned per track and level                                   | Ezana badges                | Immediate |                       |
| Saved courses                                | Bookmarks                                                    | Saved by the user           | Immediate |                       |

Council data that exists and could connect (all scoped to the viewer's council):

| Field                             | What it means                                                                                                                                                                                                       | Source in public terms | Freshness                 | Missing for                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Assignments                       | Tasks of type Reading, Research, Coverage, Model, Pitch, Meeting prep or Other, given to a member, team, cohort or the whole council, with due date, status (assigned, submitted, graded), submissions and comments | Assignments            | Immediate                 | An assignment holds a title and description; it cannot point at a course |
| Onboarding tasks per cohort       | Assignments marked as onboarding, with a completion matrix per member and an optional gate                                                                                                                          | Cohorts                | Immediate                 |                                                                          |
| Cohorts                           | Analyst classes with roster and lifecycle                                                                                                                                                                           | Cohorts                | Immediate                 |                                                                          |
| Grades                            | One record per member per kind of work (Pitch, Research note, Coverage, Participation, Overall): score, maximum, letter, feedback, rubric                                                                           | Grades                 | Immediate                 | No weights, terms or score-to-letter scale                               |
| Council rating, Learning category | Each member's council rating includes a Learning score read from their LearningELO                                                                                                                                  | Recognition            | Recomputed by the council | Members with no rating stay pending                                      |
| Members, roles, teams, titles     | Analyst, portfolio manager, executive, faculty advisor                                                                                                                                                              | Council roster         | Immediate                 |                                                                          |
| Council learning content          | A council-uploaded item (document, video, presentation, article, quiz) and its assignment to members with status and due date                                                                                       | Stored for councils    | Exists                    | No screen reads or writes it today                                       |

## 5. Data we do not have

Do not design around these.

- A link from an assignment to a specific Ezana course, or automatic completion of an assignment when the course is passed.
- A manager's view of other members' course progress, quiz scores or LearningELO. Course progress is private to each user; only the council rating's Learning score is shared.
- Council-authored courses inside the curriculum.
- Weighted grades, a term or a letter scale.
- Certificates, time-on-task, proctored quizzes, a council leaderboard of learning ratings.

## 6. Must keep working

- Everything in sections 2 and 3 for every user, retail, council and partner.
- Track in the page address and as main track; one next course per track; Resume learning.
- Server-evaluated quest with countdown; rating, tier and chart agreeing.
- Optimistic save with rollback and toast; links to course pages, badges and the beginner lesson; the beginner card and both spotlight targets.
- Per-source loading, empty and error states; phone section order; reduced motion.
- Sample content only for master admin and demo accounts, with Hide.
- The council section never shows to non-council accounts, and never shows one member's private course progress to another.

## 7. Problems with the current page

Design problems:

- For a council member the hub is purely personal: nothing shows what the council expects them to learn, by when, or how it counts.
- Onboarding lives in Cohorts and grades in Grades; a new analyst has to visit three pages to know if they are on track.
- The 121-course catalogue has no council curation; managers cannot point members at a path.

Bugs:

- None found in the page code.

## 8. Design rules the mock must follow

The page must match the rebuilt Learning Center and the org pages: the existing KPI strip with page actions on its right, flat sections, text tabs with counts, and the "Sample content" label. Most often broken first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408).
3. Tabs, level switches, ranges and toggles are text only. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group (Resume learning stays the page's primary). Secondary: plain text.
5. Search and filters have no border, fill or focus ring.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji or illustrations.
8. Plus Jakarta Sans for text. JetBrains Mono for every number, date, count, score and letter grade.
9. Sentence case. No em dashes. Describe, never judge a student.
10. Dark mode first; light mode must work.
11. Side-by-side sections 64px apart, stacked 20px; a side column split off by one full-height hairline.
12. KPI strip: about 48px tall, 12px grey label, 18px mono value, hairlines between cells.
13. Lists: 11px grey caps header, hairlines between rows, numbers right-aligned. Hover changes text colour only.
14. Status (assigned, submitted, graded, overdue, done) is text with an optional icon, never a filled chip and never colour alone. A score is never coloured red or green.
15. Tier colours only for tier marks.
16. Missing values read N/A.
17. Only overlays have a surface, border, shadow and radius.
18. Each section has a skeleton, a one-line empty state with one action, and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, overdue        | #ef4444          | #dc2626          |
| Warning, due soon        | #fbbf24          | #d97706          |
| Gold                     | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Where does the council section go? Default: a band directly under the KPI strip, "Council learning", with text tabs Assigned to me, Onboarding, and (for managers) Team progress.
2. Assigned modules without a course link? Default: show Reading and onboarding assignments as text with due date and status, opening the assignment; linking an assignment to a course needs a database change, written up for the owner.
3. Team progress for managers? Default: assignment completion per member and the council rating's Learning score only; private course progress is never shown.
4. Tie to grades? Default: show the viewer's own Participation and Overall grades read-only with a link to Grades; no weights invented.
5. Use the unused council learning content? Default: left out (no screen manages it), listed in the build report.
6. Curated council path? Default: a "Council path" card listing the recommended curriculum order for a new analyst (Stock Market & Investing Bronze and Silver, then Risk Management Bronze) as a fixed default, editable later.
7. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Learning Center. Route: /learning-center. Version: organizational (a council-only section on the shared page). The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design the council version of this page: one full-page desktop mock at 1440px wide in dark mode, output as an actual image. Keep all of the existing redesigned Learning Center content (KPI strip with Saved courses and Resume learning, rating history, daily quest, your tracks, active path, your progress, recommended for you) and add the council section that only council members see. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Include 4 to 8 council features as flat component cards, specifically tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors) and to Ezana's mission of institutional-grade tools for student-managed funds, built only on data in section 4: for example assigned to me (Reading and onboarding assignments with due dates and status), onboarding checklist and gate for my cohort, readiness to pitch, my grades for participation and overall, team progress for managers (completion per member and the Learning score from the council rating), a council path for new analysts, and overdue work for faculty advisors. Use mock data from the same sample council as the other org pages, with invented names only: Sample council, fund value $240,050.00, +46.73% since inception against SPY +10.08%, 12 positions, four sector teams (Financials, Healthcare, Technology, Industrials), the 2026 analyst class cohort, analysts Amara Tesfaye, Mikael Bekele, Elena Rossi, Jonas Weber and Tomas Alvarez, portfolio managers Selam Haile and Chidi Okoye, and assignments such as "Read the investment policy statement" and "Bank sector primer". Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
