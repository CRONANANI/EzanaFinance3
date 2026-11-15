# Ezana Learning Center page: how it works today

Page: Learning Center. Version: retail. Brief: open brief (no goals or keep/drop notes were given).
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The Learning Center is the member's personal learning hub. It does not teach on the page itself. It shows where the member stands (a learning rating called LearningELO, a tier, a streak, badges), what to study next, and the list of courses in one track at a time. Every lesson opens on its own course page.

- Who uses it: retail investors, from first-time beginners to experienced members. The catalogue is 121 courses in 5 tracks, each track split into four levels.
- How they get to it: "Learning Center" in the top navigation bar, the mobile menu (which also lists Badges), learning notifications, links from the Dashboard, profile and Leaderboard, and keyword pop-ups in Ezana Echo articles. The Getting Started checklist sends new members straight to individual lessons, not to this page.
- What they do next: open a course (read the lesson, pass its quiz at 70 percent or more, earn rating), open the badges page, or come back the next day for the daily quest.
- Every number on the page is the member's own. There is no sample content on this page today for any account type.

Org and partner accounts: the page has no organizational or partner behaviour at this commit. A university council member sees exactly the retail page. An earlier version showed an "assigned learning" table for org members, but it was placeholder content and is no longer on the page, even though the org onboarding checklist still sends executives here to "assign learning content to your teams". Partners have a separate creator page for videos and articles on a different route; whether partners are meant to use this page is unclear from the code.

## 2. What is on the page today

Desktop, top to bottom. Three rows of flat sections. Each section has a hairline above it and a title. Rows wrap when the window narrows.

### Row 1

| Section                               | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Controls                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome (left, about 40 percent)      | A small emerald caps label "Learning Center", a very large heading "Welcome back, (first name)." and a sentence: "121 courses across 5 tracks. Keep building your investing expertise."                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | "Resume learning" (filled emerald, play icon): opens the most recently started unfinished course, or the next course in the selected track. Reads "Start learning" for a member who has never started anything, and then opens the first stocks course. "Saved courses (count)" (outlined): opens the Saved courses dialog. |
| LearningELO (right, about 60 percent) | Caps label "LearningELO · All tracks". The overall rating as a large number. A change chip for the last 7 days (arrow, signed points, signed percent when there is a base). A line: "Top X% in your network" (or "Follow other learners to see where you rank.") and "N to (next tier)". A tier chip on the right (Bronze, Silver, Gold or Platinum). Then the selected track's name with "+N rating from this track", and a four-cell strip for that track: Courses (done / total with a bar), Quizzes (passed / total, with average accuracy or "No quizzes yet"), Hours (this month), Next badge ("N courses left" with a bar, or "Track complete"). | None. The strip follows the track chosen in "Your tracks".                                                                                                                                                                                                                                                                  |

A beginner-only education card can appear between row 1 and row 2: "Understanding risk and diversification", with a disclaimer, "Open lesson" and "Dismiss". It shows only for members flagged as beginners who have tips on and have not dismissed it.

### Row 2

| Section                 | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Controls                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Rating history (widest) | An emerald area chart of the overall rating by day, ending at today's rating with a dot. Five y-axis ticks, date ticks on the x-axis. Hover tooltip: date, rating, that day's signed change, and up to three reasons (for example a completed course or a quest reward). Empty: "Complete a quiz to start your rating history."                                                                                                                                                                                                                                                                       | Range selector, text only: 1M, 3M, 6M, 1Y, ALL. Default 3M. Not saved between visits. |
| Tiers                   | The four rating tiers, highest first, each with a small diamond marker and its range: Platinum 2,520+, Gold 1,500 to 2,519, Silver 500 to 1,499, Bronze 0 to 499. The member's tier is highlighted and tagged "You". Footer: "N rating to (next tier)" or "Top tier reached."                                                                                                                                                                                                                                                                                                                         | None.                                                                                 |
| Daily quest             | Header shows "Resets in 14h 22m" (resets at midnight UTC). A featured lesson block: title, track, level, minutes, and a "Start" button. Under it, three tasks with read-only checkboxes and a reward each: "Finish 2 lessons today" (+10), "Pass a friend on the leaderboard" (+20; replaced by "Score 90% or more on a quiz" for members who follow nobody), "Open a lesson in another track" (+5). Multi-step tasks show progress like (1 / 2). Note: "Tasks tick themselves when you finish them." When all three are done: "Quest complete. You earned +35 ELO today. Next quest in (countdown)." | "Start" opens the featured lesson. Tasks cannot be ticked by hand.                    |

### Row 3

| Section                             | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Controls                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Your tracks (left)                  | The five tracks, each with an icon tile, name, progress bar, done / total and a chevron: Stocks and Investing (31), Crypto and Digital (30), Betting Markets (22), Commodities (22), Risk and Psychology (16).                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Clicking a track selects it. The whole page follows: the ELO strip, the daily quest's featured lesson, Resume learning, the Active path and Recommended. The choice is put in the page address and also saved as the member's main track. |
| Active path (centre, widest)        | Title "Active path · (track)". A helper line ("Start with the Bronze tier.", "Continue your learning journey in the Silver tier." or "Pick up where you left off."). On the right "N / total complete" with a bar. A row of four level tabs with counts: Bronze, Silver, Gold, Platinum. Then the course list for that level. Each row: status mark (tick, play or empty circle), a course code such as B7, title, minutes, and a status: a "Completed" chip, a "Start" or "Resume" button on the one next course, or "Not started". A bookmark button ends each row. A track with nothing started shows "You have not started (track) yet." with a "Start track" button. | Level tabs switch the list (it opens on the first unfinished level; levels ahead are greyed but still open). Any row opens that course; nothing is locked. Bookmark saves or unsaves the course.                                          |
| Your progress (right, top)          | Four cells: Current streak (days), Best streak (days), Active tracks (N / 5, tracks with at least one finished course), Badges earned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | The badges number links to the badges page.                                                                                                                                                                                               |
| Recommended for you (right, bottom) | Up to three courses: one further along in the selected track, then the next course in other tracks. Each has an icon tile, title, track, level and minutes, and a round play button. Empty: "You have completed every course. Impressive."                                                                                                                                                                                                                                                                                                                                                                                                                                | Play opens the course. "View all" only jumps down to the Active path.                                                                                                                                                                     |

### Dialogs, messages and states

- Saved courses dialog: a list of saved courses (title, track, level, minutes). A row opens the course; an icon removes it. Empty: "Save a course with its bookmark and it will show up here."
- Toast: only one, "Could not update your saved courses. Try again.", with a dismiss button. Saving is instant and rolls back on failure.
- First-visit guided tips (beginners only): two spotlight steps, one on the Active path and one on Your tracks.
- Loading: five grey blocks (two, then three). They do not match the final layout and there is none for row 3.
- Page error (only when the course list fails to load): "The Learning Center could not load. Check your connection and try again." with a "Try again" button. A separate crash screen reads "This lesson hit a snag."
- If the rating, quest or streak fails to load, the page shows no error. It quietly shows a rating of 0, the empty chart line, "Quest tasks could not load. They refresh when you come back.", or streaks of 0.

### Tablet and phone

- Rows wrap by available width; there are no fixed tablet layouts.
- Under 768px: the ELO strip becomes two by two and course rows drop the minutes column.
- Under 640px: one column in this order: welcome, LearningELO, daily quest (and the beginner card), Active path, Your tracks, Your progress, Rating history, Tiers, Recommended. The tier chip moves above the rating.

## 3. What the user can do

- Resume the last course or start the first one
- Open the saved courses list; remove a saved course
- Change the rating history range
- Start the daily quest's featured lesson
- Select a track (also changes their main track)
- Switch level inside a track
- Open any course in the selected track and level
- Save or unsave a course
- Open the badges page from the badges count
- Open one of three recommended courses
- Dismiss the beginner education card or open its lesson
- Easy to miss: selecting a track silently changes what the daily quest and Resume learning point at; the badges count is the only link to badges on desktop; a link with a track in its address opens the page on that track.
- Exists in the code but has no button on this page: a learning leaderboard (friends or top 50, with a period); a friends learning activity feed; member-uploaded course videos; course descriptions (one line per course, never shown here); the reward each course pays; which days of this week the member was active.
- Not possible today: searching or browsing all 121 courses at once, filtering by level across tracks, or sorting.

## 4. Data we have

| Field                   | What it means                                                                           | Public source                                | Freshness                        | Missing for                         |
| ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------- | ----------------------------------- |
| First name              | For the greeting                                                                        | Member profile                               | On load                          | Falls back to no name               |
| Course catalogue        | 121 courses: title, one-line description, track, level, order, minutes, code            | Ezana curriculum                             | Fixed                            | None                                |
| Tracks                  | 5 tracks with names, icons and course totals                                            | Ezana curriculum                             | Fixed                            | None                                |
| Levels                  | 4 per track (Bronze, Silver, Gold, Platinum), with done and total                       | Curriculum plus member progress              | On load                          | None                                |
| Course status           | Not started, in progress, completed (quiz passed)                                       | Member progress                              | On load                          | None                                |
| Quiz score              | Latest score per course, pass mark 70 percent                                           | Member progress                              | On load                          | Courses with no attempt             |
| Overall LearningELO     | Sum of rating earned from courses and quests                                            | Member learning activity                     | On load and on return to the tab | New members read 0                  |
| Rating from a track     | Rating earned inside one track                                                          | Member learning activity                     | Same                             | None                                |
| 7-day change            | Points and percent versus 7 days ago                                                    | Member learning activity                     | Same                             | Percent missing when the base was 0 |
| Rating history          | One point per active day with change and up to three reasons                            | Member learning activity                     | Same                             | Members with no activity            |
| Tier and next tier      | Bronze, Silver, Gold, Platinum and points needed                                        | Derived from rating                          | Same                             | None                                |
| Network position        | "Top X%" among the people the member follows                                            | Ezana community                              | Same                             | Members who follow nobody           |
| Track stats             | Courses done, quizzes passed, average accuracy, hours this month, courses to next badge | Member progress                              | On load                          | Accuracy when no quiz taken         |
| Hours this month        | Listed minutes of courses finished this month, not measured time                        | Curriculum plus progress                     | On load                          | None                                |
| Current and best streak | Consecutive active days                                                                 | Member learning activity                     | On load                          | None                                |
| Active days this week   | Seven yes or no values, Monday to Sunday                                                | Member learning activity                     | On load                          | Not shown today                     |
| Active tracks           | Tracks with a finished course                                                           | Member progress                              | On load                          | None                                |
| Badges earned           | Count of learning badges                                                                | Member badges                                | On load                          | Badge names are not shown here      |
| Daily quest             | Three tasks with label, target, progress, done, reward; reset time                      | Ezana, worked out from the member's activity | On load and on return to the tab | Can fail to load                    |
| Featured lesson         | Next unfinished course in the selected track                                            | Curriculum plus progress                     | On load                          | When the track is complete          |
| Saved courses           | Courses the member bookmarked, newest first                                             | Member saves                                 | Instant                          | None                                |
| Recommended             | Up to three next courses by curriculum order                                            | Curriculum plus progress                     | On load                          | When everything is complete         |
| Course reward           | Rating paid per course by level: 10, 20, 35, 55                                         | Ezana rules                                  | Fixed                            | Not shown today                     |

Available elsewhere in the product but not on this page, treat as "ask first": the learning leaderboard and the friends activity feed. Each would need checking before it is designed in.

## 5. Data we do not have

Do not design around these.

- Time actually spent learning. "Hours" is an estimate from course lengths.
- Progress inside a course (percent read, current section). Only not started, in progress or completed.
- Estimated time to finish a track or reach a tier, and any forecast of rating.
- Course ratings, reviews, popularity, enrolment counts or difficulty scores.
- Course cover images, instructor names or photos.
- Personalised recommendations. "Recommended" is simply the next courses in order, so no "because you..." reasons.
- A streak calendar or heat map beyond the current week's seven days. No streak freezes.
- Rating history per track over time on this page (only the overall line), and no comparison line against friends.
- Names, avatars or ranks of other learners on this page. Only the "Top X%" figure.
- Quest history, weekly or monthly quests, or quest choice. One fixed set of three tasks per day.
- Certificates, deadlines, due dates or assignments, including for org members.
- Live or streaming updates. The page refreshes when the member returns to the tab.
- Search results for courses (there is no course search).
- Sample or demo content for this page.

## 6. Must keep working

- The selected track lives in the page address, so a shared link or the back button restores it. Without one, the page opens on the member's main track (beginners open on stocks).
- Selecting a track updates every section together and saves it as the main track, which the daily quest follows.
- Every course is open to everyone. Order drives "next" and "recommended" but never locks a course.
- Exactly one course per track is "next" and carries the Start or Resume button.
- Resume learning logic: latest unfinished course, else next in track, else first stocks course for a brand-new member.
- Quest tasks are worked out by the server and cannot be ticked by the member. The countdown runs to midnight UTC.
- The rating headline, the tier chip, the tier list and "N to next tier" always agree, and the chart ends at the headline rating.
- Saving a course is instant, rolls back on failure with a message, and the saved list stays reachable.
- Links out: each course page, the badges page, the beginner diversification lesson.
- The beginner education card and the two first-visit spotlight steps, which point at the Active path and at Your tracks. Those two sections must stay findable.
- Org onboarding checklists send executives and analysts to this page ("Explore the learning center", "Start a learning module").
- Keyboard use and screen-reader labels on bars, the chart and status marks. Reduced-motion setting turns off chart animation.
- Phone priority order: what to do next (quest, path) comes before history and tiers.

## 7. Problems with the current page

### Design problems

- The page opens with a title block: a caps label, a display-size greeting and an intro sentence. The branding guide forbids exactly this, and it takes 40 percent of the top row.
- Several controls break the rules: an outlined "Saved courses" button, level tabs drawn as outlined pills with a filled selected state, a selected track with an emerald wash and an accent bar against its text, filled chips ("Completed", the 7-day change, "You"), a bordered tinted tier chip, a tinted panel behind the quest's featured lesson, and round tinted play buttons.
- Up to five filled emerald buttons can show at once (Resume learning, quest Start, path Start, Start track, plus play buttons). The same "next course" is offered in three places.
- Levels inside a track and rating tiers share the same four names (Bronze to Platinum) but mean different things. The helper line even says "Bronze tier" for a course level.
- No way to see the whole catalogue. Members browse one track and one level at a time, and course descriptions are never shown.
- "Tiers" is a static legend that takes a third of row 2. "Your progress" holds four small numbers, two of which repeat ideas shown elsewhere.
- The ELO section mixes overall figures (rating, tier, network) with one track's figures (the strip) without a clear break.
- A quest task says "Pass a friend on the leaderboard" but the page has no leaderboard and no friends list.
- "View all" in Recommended does not show recommendations; it jumps to the Active path.
- The only route to badges is a small number.
- Nothing on the page serves org members, although org checklists point here.

### Bugs and gaps

- If the rating, quest or streak fails to load, the page shows zeros or a soft message with no Retry, so a failure looks like "no progress". Only the course list has an error state.
- The loading skeleton does not match the final layout and skips row 3.
- Tier ranges are printed with a dash character between the two numbers; the copy rules ask for "to".
- A 7-day change of zero shows an up arrow and "+0".
- For beginners the page always opens on stocks, ignoring their saved main track.
- The server also picks a featured quest lesson, but the page ignores it and shows its own pick. The two can differ. Unclear which is intended.
- The learning leaderboard elsewhere in the product uses different tier cut-offs (and a Diamond tier) from this page, so a member can be shown two different tiers.
- "Hours this month" is labelled as hours but is an estimate.
- The badges page it links to uses older styling and an arrow glyph in its back link.

## 8. Design rules the mock must follow

The rules outside tools get wrong most often come first.

1. Cards are flat. No fill, border, outline, shadow, glow or rounded panel, in dark or light mode. A card is a title and whitespace. Tiles inside a card are flat too.
2. Content runs from the left edge of the Ezana logo to the right edge of the logout icon. At 1440px that is x = 32 to x = 1408. Text sits on those lines, with no side padding at the outer edges and no second inner width.
3. Tabs, toggles, level switches and time selectors are text only. No track, pill, fill, border or divider. Selected is emerald text, the rest grey. Range labels are short mono caps (1M 3M 6M 1Y ALL).
4. No outlined buttons. A primary button is a solid emerald fill, white text, 8px radius, no border, 30 to 36px tall, one per group. A secondary button is plain text. An icon button is a bare icon.
5. Search, if added, has no border, fill, outline or focus ring. A search icon on the left and grey placeholder text.
6. No page title block, eyebrow or intro sentence. Start with content.
7. Bootstrap Icons only. No emoji, no illustrations, no course cover art, no medals or mascots.
8. Two typefaces: Plus Jakarta Sans for interface text, JetBrains Mono for every number, rating, course code, countdown and date.
9. Sentence case for titles and buttons.
10. No em dashes anywhere. Ranges read "500 to 1,499".
11. Describe, never advise. No "should" or "recommend" as investment guidance. Never say "real-time".
12. Dark mode first. Light mode must work.
13. Nothing drawn touches text. A selected list row (a track, a tier) is emerald text only, with no accent bar and no wash. A vertical rule keeps 24px from text, a horizontal rule 12px.
14. Side-by-side sections are 64px apart. Stacked sections are 20px apart with 20px above and below. A side column is split off by one full-height grey vertical hairline with 24px of clear space.
15. A KPI strip is about 48px tall and only as wide as its content: 28px icon tile, 12px grey label, 18px mono value, vertical hairlines between cells. Page actions share its row on the right.
16. Hairlines (1px, primary text at about 7 to 10 percent) divide content and never enclose it.
17. Charts: emerald line with a soft fade, faint dashed gridlines, 11px grey mono axis ticks, no border or background. No chart or statistic without real data behind it.
18. Draw the real navigation bar and do not redesign it: 64px tall, the emerald Walia ibex logo with bell and checklist on the left, Dashboard, Research, Trading, Sonar (filled emerald pill), Watchlist, Community, Learning Center in the centre, and profile, settings and red logout on the right, with one hairline below.
19. Values are signed (+18, -0.9%). Missing values read N/A. Colour is never the only signal: a tier is always named in words, a completed course always has a tick or the word.
20. Every state is drawn: skeletons in the final layout, a one-line empty state with one action, an inline error with Retry per section. Only overlays (dialogs, menus, tooltips, toasts) have a solid surface, border, shadow and radius.

Colours:

| Name            | Dark    | Light   |
| --------------- | ------- | ------- |
| Page ground     | #0a0e13 | #ffffff |
| Primary text    | #f0f6fc | #0f172a |
| Secondary text  | #e2e8f0 | #1e293b |
| Muted text      | #8b949e | #64748b |
| Faint text      | #6b7280 | #94a3b8 |
| Emerald         | #10b981 | #059669 |
| Emerald as text | #34d399 | #047857 |
| Positive        | #10b981 | #059669 |
| Negative        | #ef4444 | #dc2626 |
| Warning         | #fbbf24 | #d97706 |
| Gold            | #d4a853 | #b8922f |

Tier marker colours, the same in both modes: bronze #cd7f32, silver #cbd1d6, gold #f3c969, platinum #cfe6e0. They may only appear as a small marker next to the tier's name.

## 9. Open questions for me

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. Should the greeting hero stay? Default: no. Replace it with a compact strip (rating, tier, streak, badges) with Resume learning and Saved courses on the same row.
2. Should course levels keep the names Bronze to Platinum, which clash with rating tiers? Default: keep the names, but always label them "level" and the rating ones "tier".
3. Should the page get a way to browse or search the whole catalogue? Default: yes, a text filter over course titles and descriptions inside the path section, using data that already exists.
4. May the learning leaderboard and friends activity come back onto this page? Default: no, not in this pass. The "pass a friend" quest task stays as it is.
5. Should selecting a track keep changing the member's main track? Default: yes, unchanged.
6. Should the Tiers legend keep its own section? Default: it may shrink into the rating section or a tooltip.
7. Should master admin and demo accounts get sample content here? Default: yes, labelled "Sample content", following the Community pattern, with nothing saved.
8. Org members: default is no change in this retail pass; a council-only section on the same route is handled separately.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Learning Center. Route: /learning-center. Version: retail. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
