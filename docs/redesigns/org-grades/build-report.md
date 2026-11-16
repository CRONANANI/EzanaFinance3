# Build report: org Grades (/org-team-hub/grades)

Branch `redesign/org-grades`, commit `ed3db5e` (not pushed).

## Built

- Executive view: KPI strip (graded members, average of scored work, no grade yet, no feedback, visibility) with Sample content toggle, Settings link and one filled Enter grade button. Rail: views (Council grades, By cohort, Members without grades), borderless search, work kind filter, cohort list with graded/average/no-grade counts that doubles as the cohort filter, visibility note with Go to Settings (student record downloads stay in Settings). Grade book: text tabs with counts (All, Needs feedback, With rubric, Recently changed = last changed within 14 days), council summary by scored kind, grade table (newest entered first, 25 per page with Show more). Side: the selected member's record (average, entries, last changed, visibility, latest by work kind, every grade with Change, rubric breakdown for the selected grade). Chosen member kept in `?member=`.
- Member view: own grades only (work, score, letter, grader, date, feedback), tabs All / With rubric / Recently changed, own record, rubric. Paused: pause notice, N/A figures, no record.
- Enter grade / Change grade dialog on the ds `Modal`: member, kind, score, out of, optional letter (typed, never auto-filled), feedback with count, read-only stored rubric, "Last changed by X on date". Validation in dialog and route.
- States: route `loading.js` and page skeletons in final layout, one-line empties with one action, inline error with Retry (not drawn, built).
- Sample content (`src/lib/org-grades-sample.js`, `GET /api/org/grades/sample`): master admin and demo accounts only, same nine-person sample council, graders are invented executives (Hana Girma, faculty advisor, and the viewer or Rahel Mensah). A non-executive viewer's bundle holds only their own grades in the member shape. Writes on sample rows stay on the page.

## Fixes

- Members receive only their own grades (explicit `student_id` filter on top of RLS) in a trimmed shape: no roster, cohorts, `student_id`, `graded_by`, `cohort_id`, `work_id`; nothing while paused.
- Overall excluded from every average; scores checked (0 to max, max above 0); empty save now shows errors.
- Server refuses grading anyone who is not an active analyst or portfolio manager of the council (matches the picker). Who may grade is unchanged.
- Former members keep their name; N/A for missing values; the old "Faculty feedback" wording dropped.
- Error responses no longer echo database messages.

## Guide over design

KPI and record values 18px mono (design drew 20px). Row hover is a text colour change only (the canvas table hover wash and dotted lines are overridden). Table headers 11px caps grey (guide) rather than the design's sentence case. Primary button uses `--btn-primary-*`. Dialog is a real overlay, not the flat in-column panel. Claude Design's nav bar and logo ignored. Only tokens in theme-variables.css / home-canvas.css.

## Left out

- Grade change history (none exists): proposed table and trigger in `sql.md`, not shown in the UI.
- Database enforcement of the visibility pause: RLS fix in `sql.md`.
- Class distribution, notifications, delete, export, assignment scores (by default).
- The sidebar count beside Grades (assignments awaiting review) is a shell matter; not changed.

## Open owner decisions (current behaviour kept)

1. Who may grade: any executive, including student officers, as today.
2. No audit log of grade changes; changing a grade overwrites the grader.
3. Visibility pause enforced only in the route until `sql.md` part 1 is applied (it also stops former members reading their own grades directly; drop one line to keep that).

## Untested

Real database and auth (harness mocks fetch); the live RLS policies (read from repo migrations, production may differ); `npm run build` not run (blocked here); touch devices.

## Files

New: `src/components/org/grades/{GradesPage,GradeDialog,StudentRecord}.jsx`, `useGradesData.js`, `grades.css`; `src/lib/org-grades-model.js`, `src/lib/org-grades-sample.js`; `src/app/api/org/grades/_loader.js`, `sample/route.js`; `src/app/(dashboard)/org-team-hub/grades/loading.js`; `scripts/check-org-grades.mjs`. Changed: `grades/page.js` (server page), `api/org/grades/route.js`, `package.json` (test:org-grades). Deleted: `academic2/GradeBook.jsx`, `academic2/MyGrades.jsx` (unused now). No shell, layout or protected files touched. Harness: `/home/claude/harness-org-grades/`.
