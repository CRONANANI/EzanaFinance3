# ChatGPT notes: org Grades (/org-team-hub/grades)

ChatGPT ("Worked for 1m 58s") returned one image (1015 x 1550 px as served) and no chat text. The written list it was asked for is drawn inside the image as a three-column footer; it is transcribed first. The rest is the stage 2 agent's own reading of the image, labelled as such.

## Transcribed from the image footer

Sections shown:

- Council grade book with filters and subfilters
- Cohort controls and cohort summary
- Selected student record grouped by work kind
- Grade history with grader and date
- Rubric breakdown for the selected grade
- Visibility state and settings handoff
- Member view note (executive vs. member)
- Grade entry/edit dialog (with stored rubric)

Decisions you may reverse:

- Which subfilters are shown (e.g., with rubric, recently changed).
- Exact cohort summary columns (e.g., include or remove average).
- Amount of student detail shown by default (e.g., collapse grade history).
- Wording of visibility and member view notes.

Drawn beyond section 4:

- Added an executive/member access note to clarify role-based visibility.
- Included a stored rubric breakdown for graded work.
- Added a cohort summary for quick council context.
- Included members without grades and cohort filtering as executive workflows.
- Added a grade entry/edit dialog with last changed metadata.

## Stage 2 agent's own reading of the image (not ChatGPT's text)

Executive view, dark, real nav bar and Team Hub sidebar (Grades selected, count 1).

1. KPI strip across the top: Graded members 18/26, Average of scored work 88/100, No grade yet 4, No feedback 6, Visibility "Visible to members". On its right: "Sample content" label over a "Show council data" switch (drawn with a track, which breaks the rules), "Settings" as plain text, and one filled "Enter grade" button.
2. Three columns below a hairline.
   - Left rail (about 240px): text views "Council grades" (selected, emerald), "By cohort", "Members without grades"; a borderless search "Search members or feedback"; Cohort filter (All cohorts, 2026 analyst class, 2025 analyst class); Work kind filter (All, Pitch, Research note, Coverage, Participation, Overall); Cohort summary table (Cohort, Graded, Avg, No grade: 2026 analyst class 11/15 89/100 4; 2025 analyst class 7/11 86/100 0); Visibility state text ("Executives see all grades. Members see only their own record. If visibility is paused, members see a pause notice.") with "Go to Settings" link; a "States (examples)" annotation (Loading grades..., No grades for this cohort., Failed to load grades. Retry.).
   - Centre: "Council grade book" heading; text tabs All (selected), Needs feedback, With rubric, Recently changed; note "Executives see every grade. Members see only their own." with "Open Assignments" link; "Council summary (scored work)" by kind (Pitch 18 graded 89/100, Research note 17 86/100, Coverage 16 88/100, Participation 18 90/100); then the grades table: Student, Cohort, Work (icon + text), Score (91/100), Letter, Grader, Last changed, Feedback (truncated). Ten rows; the first (Amara Tesfaye, selected) is emerald text. One row (Daniel Park, Coverage) shows N/A score, N/A letter and N/A feedback.
   - Right column, split by a hairline: selected student record. Name "Amara Tesfaye", role Analyst, cohort 2026 analyst class; mini KPIs Average of scored work 89/100, Graded entries 4, Last changed Jan 19; Visibility "Visible to members"; "By work kind" table (Work kind, Score, Max, Letter, Date; includes an Overall row with a sigma icon); "Grade history" table (Work kind, Score, Letter, Grader, Date, Feedback); "Rubric breakdown (Pitch, 91/100)" (Thesis clarity 18/20, Evidence 18/20, Valuation 19/20, Risk framing 18/20, Delivery 18/20); "Member view" note describing what a member sees.
3. Overlay dialog "Enter or edit grade", subtitle "Last changed by M. Bekele on Jan 19": Student, Kind of work, Score, Out of (100), Letter (select), Feedback, "Rubric (read only)" table, Cancel (text) and Save grade (filled).
4. Footer with the three written lists above.

Problems to correct downstream (from the description, sections 4 to 8):

- Names: ChatGPT invented Ria Kapoor and Jordan Vale and used council members (M. Bekele, E. Rossi, S. Haile, C. Okoye, D. Park, I. Lindqvist) as graders. Graders must be executives; analysts and portfolio managers never grade here.
- Counts (18/26 members, 11/15, 7/11) do not match the nine-person sample council used on other org pages.
- The member view is described in a note, not drawn; the paused visibility state is not drawn for either role.
- Letters on grades entered on this page do not exist today unless the new letter input is built (section 9 default 8 says yes).
- "States (examples)" and the footer lists are annotations, not page sections.
- The switch track, the mono caps "VISIBLE TO MEMBERS" value and the dialog's per-field icons need the audit.
