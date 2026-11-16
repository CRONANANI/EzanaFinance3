# Ezana Grades page (organizational): how it works today

Page: Grades. Version: organizational (university student-managed investment funds). Route: /org-team-hub/grades. Brief: open brief.
Written from the code at commit 8ffb5a2 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately. Access rules were read from the code and the database definitions in the repository, not from the live database.

## 1. Summary

Grades is where a council records a score and written feedback for a member, and where a member reads their own. One address shows two pages: executives get "Grade Book" (enter grades, see everyone's), every other member gets "My Grades" (their own only).

- Who uses it: executives, meaning the faculty advisor (an executive titled Faculty Advisor) and also student officers, as graders; analysts and portfolio managers as the graded.
- Decision it supports: for an advisor, what has each member earned and what should they hear; for a member, where do I stand and what should I fix.
- How they get to it: the Grades link in the Team Hub sidebar only.
- What they do next: Assignments (where work is reviewed), Fund Analytics (scorecards) or Settings (visibility, student record download).
- The page sits inside the shared Team Hub shell: a 200px sidebar of 17 icon and text links beside one hairline, already redesigned and live. The redesign covers only the page body to its right.

What a grade record is: one entry for one member, with a kind of work (Pitch, Research note, Coverage, Participation or Overall), a score, a maximum (100 unless changed), an optional letter, optional feedback, an optional rubric breakdown, the grader, the member's cohort, and the dates it was made and last changed. A member can have many entries. A record has no term, weight, draft state or title.

Who can do what, as the code defines it:

| Action                                 | Analyst  | Portfolio manager | Executive, faculty advisor                                       |
| -------------------------------------- | -------- | ----------------- | ---------------------------------------------------------------- |
| See grade records                      | Own only | Own only          | Every member's, whole council                                    |
| Enter a grade                          | No       | No                | Yes, for analysts and portfolio managers                         |
| Change a grade                         | No       | No                | Server accepts it; the page has no control                       |
| Delete a grade                         | No       | No                | No control and no server action                                  |
| Publish or hide                        | No       | No                | One council-wide switch in Settings; a saved grade shows at once |
| Download a student's record            | No       | No                | Yes, from Settings, logged                                       |
| Score an assignment (Assignments page) | No       | Yes               | Yes                                                              |

Confirmed from the code: portfolio managers score assignments on the Assignments page but cannot enter anything here, and the two are separate records. Scoring an assignment does not create or update a grade record, and this page never reads assignment scores. A grade record has a field that can point at a piece of work, and demonstration data fills it, but the page never sets or reads it.

## 2. What is on the page today

Desktop, top to bottom, right of the sidebar.

**Executive view, "Grade Book".**

| Section                              | What it shows and does                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title block                          | Eyebrow "Academic", title "Grade Book", sentence "Score analyst work and leave feedback. Students see only their own."                                                                             |
| Enter a grade (filled, rounded card) | Student picker (active analysts and portfolio managers, name only); kind of work picker (Pitch preselected); Score; "Out of", prefilled with 100; optional Feedback; a filled "Save grade" button. |
| Grades table                         | Student, Work, Score (as 91/100), Feedback (full text). Every grade ever entered in the council, newest first. No search, sort, filter, paging, dates, grader, letter or totals.                   |

Saving clears the form and reloads the table. A failed save shows a red line. There is no confirmation, edit or delete.

**Member view, "My Grades".**

| Section                                | What it shows                                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title block                            | "Academic", "My Grades", "Your scores and faculty feedback."                                                                                                              |
| Average (small filled card, top right) | One whole percentage: the plain average of score over maximum across the member's scored entries. Hidden when there are none.                                             |
| Grade list                             | One filled, rounded card per grade, newest first: kind of work, score as 91/100 with the letter in brackets when one exists, feedback beneath. No date, grader or rubric. |

**States.** Loading: the Command Center's skeleton flashes first (this route has none of its own), then the word "Loading", then "Loading grade book" or "Loading your grades". Empty: "No grades yet." in the table, or "No grades posted yet." for a member. Errors are one line with no Retry: "This page is for organizational members only.", "Failed to load grades.", "Could not connect." The page has no toasts, dialogs or menus.

**Tablet and phone.** No rules of its own: paired fields stay side by side and the table scrolls sideways. Under 900px the shell moves the sidebar above the page.

## 3. What the user can do

- Executive: enter a grade (member, kind of work, score, maximum, feedback); read every grade and feedback in the council.
- Member: read their own grades, letters, feedback and average.
- Executive, in Settings only: pause or resume members' sight of their own grades; download one student's record (grades, pitches, assignments) as a data file, logged.
- In the code with no control (executives): changing a grade's score, maximum, letter, feedback or rubric, which overwrites the grader's name; saving a letter or rubric with a new grade; tying a grade to a piece of work.
- Not possible anywhere: deleting a grade, exporting the grade book, a per-grade draft.

## 4. Data we have

| Field                               | Meaning                                                 | Public source          | Freshness             | Missing for                                                   |
| ----------------------------------- | ------------------------------------------------------- | ---------------------- | --------------------- | ------------------------------------------------------------- |
| Student name                        | Member the grade belongs to                             | Council roster         | On load               | Former members show as "Student"                              |
| Kind of work                        | Pitch, Research note, Coverage, Participation, Overall  | Grader                 | On load, after a save | None                                                          |
| Score, maximum                      | Points earned and points possible                       | Grader                 | On load, after a save | Score can be blank                                            |
| Letter                              | Free text such as A- or B+                              | Stored                 | On load               | Grades entered on this page (no input); shown to members only |
| Feedback                            | Written comment, up to 4,000 characters                 | Grader                 | On load               | Optional                                                      |
| Rubric breakdown                    | Named criteria with points, free form                   | Stored                 | Never shown           | Grades entered on this page                                   |
| Graded by, entered on, last changed | Executive who entered or last changed it, and the dates | Council roster, system | Sent, never shown     | Grader: former members                                        |
| Cohort                              | The member's cohort when graded                         | Council records        | Stored, never shown   | Members with no cohort                                        |
| Average                             | Unweighted mean percentage of a member's scored entries | Calculated             | On load               | No scored entries; executive view                             |
| Roster                              | Active analysts and portfolio managers, with role       | Council roster         | On load               | Executives only receive it                                    |
| Visibility setting                  | Whether members may see their own grades                | Council settings       | On load               | Sent to members only when paused; never shown                 |

Calculable for executives without new data: grades per member, kind and cohort; member, cohort and council averages; members with no grade yet; entries with no feedback.

## 5. Data we do not have

Do not design around these.

- A link to assignments, pitches or research notes. A grade cannot open the work it is about.
- Weights, a final or course grade, GPA, credit, a transcript, or a scale that turns a score into a letter.
- Terms on a grade (cohort is the only grouping), per-grade draft, publish, release date or "seen by student".
- A history of changes. Entering and changing grades is not written to the audit log; only the student record download is.
- A class distribution (a setting named for it exists and nothing uses it), class rank, percentile or curve.
- Notifications when a grade is posted. Nothing was found that sends one.
- Replies, disputes or regrade requests.
- Rubric templates (stored breakdowns are free form), bulk entry, import, grade book export.

## 6. Must keep working

Access rules that must all still hold:

1. Only active council members reach any Team Hub page; anyone else is sent to the home page before the page is drawn.
2. A member who is not an executive receives only their own grade records, enforced at the data layer, by the server and again on the page. Never send another member's grade, feedback, letter, average or rank to an analyst or portfolio manager, even inside a chart, a total or a hidden field.
3. Non-executives receive no roster from this page.
4. Only executives can enter or change a grade, checked by the server and by the data layer, never by a hidden button alone.
5. A grade can only be entered for a member of the same council, and every read and write stays inside the viewer's own council, which the server decides.
6. Portfolio managers have no grading rights here, whatever their rights on Assignments.
7. While the council has paused visibility, members receive no grades and executives still see everything.
8. The peer scorecard setting is separate and never permits showing grades.
9. The student record download stays executive only and logged.
10. Sample content goes only to master admin and demo accounts who are council members, labelled, never saved.

Also keep: the five kinds of work; a maximum that defaults to 100; feedback up to 4,000 characters; newest first by default; the letter shown to the member when present; the sidebar link and its count; the form clearing only after a successful save.

## 7. Problems with the current page

Access and privacy (most serious first):

- "Executive" is not "faculty". Student officers who hold the executive role see every member's grades and feedback, can enter and change them, can download any student's record, and can switch the faculty advisor controls. Settings lists grading as a faculty advisor ability; the code lets any executive.
- An executive can grade themselves or another executive: the picker lists only analysts and portfolio managers, but the server accepts any council member, former ones included.
- A changed grade leaves no trace: the earlier score is gone, the grader's name is replaced, nothing is logged.
- The visibility pause is applied by the page's server only. The data-layer rule still lets a member read their own records, so the pause is weaker than Settings claims. It exposes a member's own grade, not another's.
- Assignment scores are more widely readable than grade records. At the data layer any portfolio manager, a student, can read every assignment in the council with its score and comment, though the Assignments page lists less. A group assignment carries one score seen by every assignee. Bringing assignment scores here must not widen who sees them.
- The class distribution switch in Settings does nothing. A distribution of a small cohort would reveal individuals.
- No path was found by which an analyst or portfolio manager receives another member's grade record through this page.

Design problems:

- A title block opens the page; cards are filled and rounded; fields are boxed; the page adds its own padding and sits further in than the rebuilt pages.
- The executive view is a form and an endless table: no student record, cohort view, average, or list of who has no grade.
- The member view is a stack of cards with no dates, grader or rubric, although those are stored.
- "Faculty feedback" is printed even when a student officer wrote it.
- The sidebar count beside Grades is assignments awaiting review, which this page never shows; grading here and on Assignments has no visible relation.
- No skeleton of its own, no Retry, no confirmation after saving.

Bugs:

- When visibility is paused, or the server fails, a member reads "No grades posted yet." The server says which; the page ignores it.
- The average counts an Overall entry beside the entries it summarises, and weighs a 10 point entry like a 100 point one.
- Scores are not checked: negative values and scores above the maximum save. A maximum of 0 silently becomes 100.
- Save silently does nothing when the student or score is missing.
- Missing values show a dash, not N/A. Former members' grades sit under the name "Student".

## 8. Design rules the mock must follow

The page must match the rebuilt organizational pages (Command Center, Trading Desk, Fund Analytics, Assignments): the same KPI strip with page actions on its right, flat sections, text tabs with counts, a small "Sample content" label with a "Show council data" switch, and the same sample council (analysts Amara Tesfaye, Mikael Bekele, Elena Rossi; portfolio managers Selam Haile, Chidi Okoye; cohort "2026 analyst class"). Most often broken rules first.

1. Sections, rows and tiles are flat: no fill, border, shadow, glow or rounded panel, in either mode.
2. Content runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line; page content ends exactly on the right line.
3. Tabs, switches and toggles are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji or illustrations.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, score, count and letter grade.
9. Sentence case. No em dashes. Describe, never advise or judge a student. Never say "real-time".
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. A selected row is emerald text only.
12. Side-by-side sections 64px apart, stacked sections 20px apart. A side column is split off by one full-height hairline.
13. KPI strip: about 48px tall, as wide as its content, 12px grey label, 18px mono value, hairlines between cells.
14. Tables: 11px grey caps header, hairlines between rows, numbers right-aligned in mono.
15. Hairlines (1px, primary text at 7 to 10 percent) divide and never enclose.
16. Kind of work is text with an optional icon, never a filled chip. A score is never coloured red or green.
17. Draw the real navigation bar and sidebar; redesign neither.
18. Missing values read N/A. No figure without data from section 4.
19. Only overlays (dialogs, menus, tooltips) have a surface, border, shadow and radius.
20. Each section has a skeleton in its final layout, a one-line empty state and an inline error with Retry.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, destructive    | #ef4444          | #dc2626          |

## 9. Open questions for me

Each carries the default that will be used.

1. Should only the faculty advisor grade and see all grades, not every executive? Default: no change in this redesign (a permission decision); the page names the grader on every grade and the question is flagged.
2. Add editing a grade? Default: yes, for executives, using what the server already accepts, showing the student "last changed" and by whom. No history is promised.
3. Add deleting a grade? Default: no.
4. Show assignment scores here? Default: no. A plain link to Assignments in both directions.
5. Per-grade draft and publish? Default: no. Keep the council-wide pause and state it: executives see "Hidden from members" with a link to Settings, members see "Your council has paused grade visibility".
6. Class distribution for members? Default: not built for members. Executives get council and cohort averages only.
7. How is the average worked out? Default: unweighted, leaving out Overall entries, labelled "Average of scored work".
8. Letter and rubric when entering a grade? Default: letter yes; rubric read only where one exists.
9. Grade book export? Default: none new; a link to the logged student record download.
10. Sample content for master admin and demo accounts? Default: yes, labelled, never saved.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Grades. Route: /org-team-hub/grades. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the Team Hub sidebar as it is and design only the content to its right. Draw the executive view as the main mock (council grade book, one student's record, entering and editing a grade) and show how the member view differs: only their own grades, feedback, letters and average, never another member's name, score, rank or distribution. Every access rule in section 6 is a hard limit. Include 4 to 8 features tailored to university investment councils, built only on data in section 4: for example a student record grouped by kind of work, a view by cohort, members with no grade yet, the stored rubric breakdown, grader and date on every grade, the visibility state shown to both roles. Label all numbers, names and tickers as sample content and use invented sample names only. Show the key loading and empty states, including the paused visibility state. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
