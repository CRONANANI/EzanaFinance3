# Ezana Assignments page (organizational): how it works today

Page: Assignments. Version: organizational (university student-managed investment funds). Route: /org-team-hub/assignments. Brief: open brief.
Written from the code at commit 3f6c013 (main, November 15, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Assignments is where an investment council hands out work and follows it to a grade. A manager sets a pitch, research, sector coverage, a reading, a model or meeting prep, gives it to people, and it moves along a fixed path: assigned, in progress, submitted, under review, returned or complete, graded.

- Who uses it: analysts (do, submit, read feedback), portfolio managers (set work, review, grade) and executives. A faculty advisor is an executive with the title Faculty Advisor.
- Decision it supports: for an analyst, what do I owe and by when. For a manager or advisor, who is behind, what waits for my review, what score does it earn.
- How they get to it: the Team Hub sidebar, the Command Center (calendar items, task board link), the organizational home cards, a button on the Org Chart.
- What they do next: the Pitch Pipeline, the Grades page, or back to the Command Center.
- The page sits inside the shared Team Hub shell, a left sidebar of about 212px listing the Team Hub pages. The shell is described elsewhere and is not part of this redesign.

Who can do what, as the code defines it:

| Action                               | Analyst                        | Portfolio manager                                                      | Executive, faculty advisor |
| ------------------------------------ | ------------------------------ | ---------------------------------------------------------------------- | -------------------------- |
| Assignments listed                   | Ones assigned to them          | Assigned to them, created by them, or assigned to their direct reports | Same as portfolio manager  |
| Create, assign, save templates       | No                             | Yes, to anyone in the council                                          | Yes                        |
| Start, submit, resubmit              | Yes, as assignee               | Yes, as assignee (the server also accepts any manager)                 | Same                       |
| Comment, upload a file               | Yes, on anything they can open | Yes                                                                    | Yes                        |
| Delete a file                        | Own uploads only               | Any                                                                    | Any                        |
| Start review, return, approve, grade | No                             | Yes, on anything they can open                                         | Yes                        |
| Enter grades on the Grades page      | No                             | No                                                                     | Yes                        |

Nothing stops a manager grading work assigned to themselves, and a portfolio manager is not limited to their own desk when assigning.

## 2. What is on the page today

Desktop, top to bottom, right of the sidebar.

**Header row.** A small caps eyebrow ("Academic, university name") and a large "Assignments" title. On the right: a List or Calendar switch drawn as a segmented control (Calendar is the default, not remembered), an Export menu ("Download CSV", "Print / Save as PDF", disabled when empty), and a primary "New assignment" button shown only to managers. Under it, a scope note: "Your assignments." or "Your assignments and those you've delegated to your direct reports."

**Metrics strip.** Four bordered tiles: Open, Overdue (amber), Awaiting review, and "Completion, term" as a percentage with a signed change versus last term. All are counted from what this person can see, not the whole council.

**Calendar view (default).** A month calendar with a 285px list beside it.

| Element          | What it does                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Month navigation | Previous, Today, Next.                                                                                                                                                                |
| Day cells        | Six weeks, Sunday first, today marked. Up to three assignments due that day as coloured chips with the title. Colour is the type; overdue is red. A chip opens the assignment dialog. |
| "+N more"        | Opens the first assignment of that day, not the rest.                                                                                                                                 |
| Legend           | Pitch, Research, Coverage, Reading, Model, Overdue. Meeting prep and Other are missing.                                                                                               |

The calendar ignores the tabs and shows all dated work, including completed. Undated work never appears.

**Tabs and list.** All, Mine, Team (touching the viewer's desk), By me (assigned by the viewer), Archive (complete and graded; the others exclude it). Each has a count. A row, a bordered card today, shows a type chip, a status chip, the title, up to three assignee initials with "+N", the due date ("Due Nov 20", "Overdue Nov 3", "No due date"), a file count and a comment count. A row opens the dialog. Empty: "Nothing here" with "Browse all assignments", or "Nothing archived yet" with "View upcoming".

**List view.** The same tabs and rows at full width, plus a progress bar once work has started, a next-step control (Start or Submit for an assignee, Review or "Awaiting revision" for a manager, each of which only opens the dialog), and for graded work the score, for example 42/50.

**New assignment drawer (managers).** Slides in from the right, 460px wide.

| Field                         | Detail                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type                          | Pitch, Research, Coverage, Reading, Model, Meeting prep, Other.                                                                                                                      |
| Start from template           | Shown when templates exist. Fills type, title, instructions, sector, upload switch.                                                                                                  |
| Title, instructions, due date | Title is required. Due date is a single optional date.                                                                                                                               |
| Ticker, sector                | Ticker for Pitch. Sector (free text) for Pitch and Coverage.                                                                                                                         |
| Assign to                     | Members (searchable, name and role), Team, Cohort (current one marked), Role (titles on the roster), Whole org (clears other choices). Targets combine and show as removable tokens. |
| Switches                      | Require deliverable upload. Recurring (weekly or monthly). Save as template (with a name).                                                                                           |
| Buttons                       | Cancel, Assign. Errors show inline: "A title is required.", "Pick at least one assignee target."                                                                                     |

**Assignment dialog (everyone).** Centred, 620px wide. Header: type, status, title, due date, assignee names.

| Section                | What it shows                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Instructions, progress | The brief, and a percentage bar once started.                                                                                |
| Attachments            | Name, size, download, delete where allowed. "Upload file": PDF, Word, Excel, PowerPoint, CSV, PNG, JPG up to 25 MB.          |
| Version history        | One line per submission: v1, v2, submitter, time, optional note.                                                             |
| Review thread          | Comments oldest first; one written on a return carries a "Returned" flag. One text box serves comments and return feedback.  |
| Rubric (managers)      | Score, Out of, optional comment.                                                                                             |
| Actions                | Comment. Assignee: Start, then Submit. Manager: Start review, Return for revision (needs comment text), Approve, Save grade. |

**States.** Loading: a skeleton of title, calendar grid and three side cards. Page error: one line of text with no Retry ("Failed to load assignments.", "Could not connect."). The dialog shows the word "Loading" and red error text. There are no toasts; changes reload the board.

**Tablet and phone.** Under 1024px the calendar and list stack. Under 900px the sidebar moves above the page. Under 720px the tiles go two by two, then one per row. The calendar keeps seven columns at every width.

## 3. What the user can do

- Switch Calendar or List; move by month; jump to Today
- Filter by tab; open an assignment from a chip or row
- Export as CSV or print
- Managers: create and assign to members, teams, cohorts, roles or the whole council; use or save a template; mark recurring; require an upload
- Assignees: start, submit, resubmit after a return
- Everyone: comment, upload, download, delete own files
- Managers: start review, return with feedback, approve, grade
- Easy to miss: Export ignores the tab and exports everything; a pitch assignment with a ticker quietly creates a draft idea in the Pitch Pipeline.
- In the code with no button: setting the progress percentage; editing or deleting an assignment; saving a template on its own; tying a file to one submission.

## 4. Data we have

| Field                                          | Meaning                                                                  | Public source                | Freshness                  | Missing for                            |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------- | -------------------------- | -------------------------------------- |
| Title, instructions, type                      | The brief and one of seven kinds                                         | Assigning manager            | On load, after each action | Instructions optional                  |
| Ticker, sector                                 | Subject                                                                  | Manager                      | On load                    | Ticker: pitch. Sector: pitch, coverage |
| Due date                                       | Deadline, date only                                                      | Manager                      | On load                    | Optional                               |
| Status, overdue                                | Seven steps; overdue is calculated                                       | Member actions               | After each action          | Overdue needs a due date               |
| Assignees, targets                             | People (name, role) and how they were chosen                             | Council roster               | On load                    | None                                   |
| Assigned by, term                              | Manager name, cohort                                                     | Council records              | On load                    | Older rows, councils with no cohort    |
| Progress                                       | 0 to 100 percent                                                         | Stored value                 | On load                    | Stays 0 unless set elsewhere           |
| Files                                          | Count; name, size, uploader, time                                        | Member uploads               | Dialog open                | None                                   |
| Comments                                       | Count; text, author, time, returned flag                                 | Members                      | Dialog open                | None                                   |
| Submissions                                    | Version, submitter, time, note                                           | Assignees                    | Dialog open                | None                                   |
| Grade                                          | Score, maximum, comment                                                  | Grading manager              | After grading              | Ungraded work                          |
| Metrics                                        | Open, overdue, awaiting review, term completion, change versus last term | Calculated from visible work | On load                    | Change needs two terms                 |
| Tab counts                                     | Rows per tab                                                             | Calculated                   | Instant                    | None                                   |
| Roster, teams, cohorts, role titles, templates | Choices when assigning                                                   | Council records              | On load                    | Can be empty                           |

Stored but not shown back: the recurring setting, the require upload setting, the template used.

## 5. Data we do not have

Do not design around these.

- A link between an assignment's grade and the Grades page. They are separate records; no weighted average, course grade or transcript.
- Multi-criterion rubrics. A grade is one score, one maximum, one comment.
- Per-person status. A group assignment shares one status, one history and one grade.
- A link to a meeting. "Meeting prep" is only a label.
- Notifications or reminders. A preference exists, but nothing was found that sends it.
- Automatic repeats. "Recurring" is saved and nothing creates the next one.
- Enforcement of "require upload".
- Time of day on due dates, time spent, lateness in days.
- Weights, term point totals, class rank, grade distributions.
- Peer or anonymous grading.
- A council-wide view. Each person sees their own, their created and their direct reports' work.
- A log of status changes (who approved, when).
- Sample content. This page has none for demo accounts today.

## 6. Must keep working

- Only council members reach the page; others go to the home page.
- The role rules in section 1. Creating, reviewing and grading stay hidden from analysts and refused by the server.
- The status path. Returning requires written feedback. Overdue is calculated, never set.
- Every targeted person (member, team, cohort, role, whole council) is an assignee and can submit. Each submission is a new version.
- Combined targets, with Whole org exclusive. Templates: use and save.
- Files: type list, 25 MB limit, download, delete by uploader or manager.
- Tabs with counts equal to the rows shown. Calendar and List views.
- Export with columns Title, Type, Status, Assignees, Due date, Progress, Grade.
- A pitch assignment with a ticker seeds a Pitch Pipeline draft.
- The scope note.
- Connections that read this data. Sidebar: the Assignments badge (open over total, refreshed about every minute) and the Grades badge (work awaiting review). Command Center: open assignments due within 60 days sit on its calendar beside meetings and tasks and link here, as do its task board link and the home cards. Cohorts: onboarding tasks are assignments, and completing them gates a first pitch. Also member activity ratings (count submissions) and the student record export.
- Dialogs close on Esc.

## 7. Problems with the current page

Design problems:

- An eyebrow and title open the page.
- Everything is boxed: bordered tiles, calendar panel and row cards, a segmented switch with a track, outlined buttons, filled chips.
- The calendar is the default, yet analysts need "due next" and managers need "waiting for me". Both are lists.
- Tabs and calendar disagree, and completed work clutters the calendar.
- The next-step control exists only in List view and only opens the dialog.
- The dialog is one long column with up to seven buttons; Approve and Save grade are both primary. One text box does two jobs.
- Grading lives here and on Grades with no visible relation. A portfolio manager can grade here but not there.
- Nothing shows who in a group has delivered.
- Recurring and require upload vanish after creation.

Bugs and gaps:

- Start and Submit show only for one "primary" assignee. People assigned through a team, cohort, role or the whole council may submit but see no button.
- "+N more" opens the first assignment instead of listing the rest.
- The Command Center block "My assignments, due" and the home card "My assignments" list tasks, not assignments.
- The Org Chart's "Add member" button opens this page.
- The sidebar badge is not refreshed after an action here.
- Missing values show a dash, not N/A.
- No Retry on errors. Deleting a file is not confirmed.
- View, tab and open assignment are not in the page address, so one assignment cannot be linked.

## 8. Design rules the mock must follow

The most often broken rules come first.

1. Sections are flat: no fill, border, shadow, glow or rounded panel, in either mode. Rows and tiles are flat too.
2. The navigation bar runs from the logo's left edge (x = 32 at 1440px) to the logout icon's right edge (x = 1408). The sidebar starts on the left line. Page content sits right of the sidebar and its last text or button ends exactly on the right line. No inner width.
3. Tabs, the view switch and toggles are text only: no track, pill, fill or border. Selected is emerald text, the rest grey.
4. No outlined buttons. Primary: solid emerald, white text, 8px radius, 30 to 36px tall, one per group. Secondary: plain text. Destructive: plain red text, confirmed in a dialog.
5. Search has no border, fill or focus ring: an icon and grey placeholder.
6. No page title, eyebrow or intro sentence.
7. Bootstrap Icons only. No emoji, logos or illustrations.
8. Plus Jakarta Sans for interface text. JetBrains Mono for every number, date, score, count and ticker.
9. Sentence case. No em dashes. Describe, never advise. Never say "real-time".
10. Dark mode first; light mode must work.
11. Nothing drawn touches text. A selected row is emerald text only. Vertical rules keep 24px from text, horizontal rules 12px.
12. Side-by-side sections 64px apart; stacked sections 20px apart. A side column is split off by one full-height grey hairline.
13. KPI strip: about 48px tall, only as wide as its content, 28px icon tile, 12px grey label, 18px mono value, hairlines between cells. Page actions share its row on the right, primary last.
14. Tables: 11px grey caps header over a hairline, hairlines between rows, numbers right-aligned in mono.
15. Hairlines (1px, primary text at 7 to 10 percent) divide and never enclose.
16. Status and type are text with an optional icon, never a filled chip. Overdue carries the word and an icon, not colour alone.
17. Draw the real navigation bar and sidebar; redesign neither.
18. Missing values read N/A. Changes are signed. No chart or figure without data from section 4.
19. Only overlays (drawer, dialog, menus, tooltips) have a surface, border, shadow and radius.

| Colour                   | Dark             | Light            |
| ------------------------ | ---------------- | ---------------- |
| Page ground              | #0a0e13          | #ffffff          |
| Primary text             | #f0f6fc          | #0f172a          |
| Secondary text           | #e2e8f0          | #1e293b          |
| Muted text               | #8b949e          | #64748b          |
| Emerald, emerald as text | #10b981, #34d399 | #059669, #047857 |
| Negative, overdue        | #ef4444          | #dc2626          |
| Warning                  | #fbbf24          | #d97706          |
| Gold (graded)            | #d4a853          | #b8922f          |

## 9. Open questions for me

Each carries the default that will be used.

1. Make the list the default view? Default: yes, grouped by what needs the viewer's action; calendar second.
2. Should tabs filter the calendar, and completed work leave it? Default: yes.
3. Put view, tab and open assignment in the page address? Default: yes.
4. Show Start and Submit to every targeted assignee? Default: yes, a bug fix.
5. Show assignment grades on the Grades page? Default: no; a plain link to Grades only.
6. Block managers from grading their own work? Default: leave as is, flagged.
7. Show recurring and require upload on the assignment? Default: as labels, promising nothing automatic.
8. Sample content for master admin and demo accounts? Default: yes, labelled "Sample content", never saved.
9. Fix the Command Center and home blocks that list tasks as assignments? Default: out of scope, flagged.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this page. Execute the Ezana Autonomous Page Redesign workflow using the master prompt you wrote in this chat (ezana_autonomous_page_redesign_master_prompt.md) and the EZANA_BRANDING_AND_UI_GUIDE.md attached earlier in this chat. Page: Assignments. Route: /org-team-hub/assignments. Version: organizational. The attached screenshots show the existing page. Everything above this section is the description of the page's existing functionality. Design one full-page desktop mock at 1440px wide in dark mode and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5. Keep everything in section 6 working, and solve the problems in section 7. Use the defaults in section 9. Keep the existing Team Hub sidebar as it is and design only the content to its right. Show how the page differs for an analyst (work to do and submit) and for a portfolio manager or faculty advisor (work to review and grade), respecting the role table in section 1, and draw the assignment detail and the new assignment drawer. Include 4 to 8 features tailored to university investment councils (analysts, portfolio managers, executives, faculty advisors), built only on data in section 4: for example a review queue, workload by desk or cohort, pitch and coverage work shown with ticker and sector, a term completion summary, reusable templates. Label all numbers, names and tickers as sample content. Show the key loading and empty states. Finish with a written list of: every section you drew, every design decision I may want to reverse, and anything you drew that is not in section 4.
