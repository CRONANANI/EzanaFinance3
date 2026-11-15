# Build report: Assignments (organizational)

Branch `redesign/org-assignments`, commit `2691cc7`, worktree `/home/claude/wt/org-assignments`. Not pushed. Route `/org-team-hub/assignments`.

## What was built

Code in `src/components/org/assignments/` (classes `oas-`, plus the Command Center's shared `tcc-` atoms so the Team Hub pages read as one). Rules in `src/lib/org-assignments-model.js` (pure: the server loader, the write route, the page, the sample bundle and the tests all read it). Sample in `src/lib/org-assignments-sample.js`.

1. KPI strip (same treatment as the three live org pages): Open, Overdue (red with a warning icon when above zero), Awaiting review, Term completion with the change from last term in points. On the same line: "Sample content" with its "Show council data" switch, List and Calendar as text, Export (CSV, print), New assignment (managers only, the one filled button).
2. Assigned work: the scope note from the server, a borderless search (title, ticker, sector, type, people, target labels), five text tabs with counts, then one list grouped by status. Managers get Awaiting review, Due next, Returned for revision; everyone else gets Returned for revision, Due next, Awaiting review. Archive shows Complete and graded. A line says how many rows wait on the viewer.
3. A row: type icon in the type colour, title (opens the detail), type with ticker and sector under it, who it was given to as stored ("Technology (team)", "Whole council", a name), due date (overdue carries the word and an icon), progress as status text, file and comment counts, next action or the score.
4. Next action: Start is sent from the row. Start review is sent, then the detail opens on the review tab. Submit, Resubmit and Grade open the detail where their input is. Only steps on the status path are offered, to people the server accepts.
5. Workload by team and cohort (managers): open, overdue, awaiting review per sector team and per cohort, counted from the work the manager can see, with a line saying so.
6. Side column: a compact month with dots and the month's dated work (choosing a day narrows the list), the legend with all eight entries; Review queue with the number of submissions on file; Templates with "Use".
7. Calendar view: the full month kept and restyled flat (hairlines between weeks, no cell boxes). It follows the open tab and the search, so completed work only shows under Archive. "+N more" and the day number list everything due that day under the grid. On a phone it keeps seven columns and shows dots.
8. Assignment detail (ds `Modal`): type, status, due date, assignee count, the Recurring and "File upload requested" labels; tabs Overview, Files, Comments, History, and Review and grade for managers. The footer has Upload file on the left and, on the right, one filled next step with the other steps as text (Return in red).
9. New assignment (ds `Modal`): type, template, title, instructions, due date, ticker (pitch), sector (pitch, coverage), Assign to (members with search, teams, cohorts, roles, whole council; targets combine, whole council stands alone), "Ask for a file upload", Recurring with Weekly or Monthly, Save as template.
10. View, tab and the open assignment are kept in the page address (`?view=calendar&tab=mine&a=<id>`).

Loading skeletons in the final layout (route `loading.js` and in-page), one-line empty states with one action, inline errors with Retry.

Sample content: `GET /api/org/assignments/sample` (new; same gate as the other org pages: `isCommunityDemoViewer` plus council membership). 23 assignments for the same sample council: the same nine members, four sector teams and the "2026 analyst class" cohort, including the four assignments the Command Center lists with the same ids, people, dates and statuses. File, comment and submission counts are derived from the rows; metrics and tab counts from the model. An analyst viewer gets only their own work and no templates. Start, submit, review, return, approve, grade, comment, upload, delete and assign on sample rows are applied on the page by the model with the server's rules; scripted checks confirm nothing is sent.

## Bugs fixed

- **Start and Submit for everyone the server accepts.** The cause was wider than the button. Target rows for a team, cohort, role or the whole council are hidden from the people they point at, so the loader decided such work was not theirs and left it out of the list, and the detail route reported "not the assignee". A member who is not a manager can only read an assignment row when it is theirs (the row policies admit the legacy assignee and the same targets the submit route accepts), so both now treat a readable row as the member's own. No service-role read was added.
- "+N more" opened the first assignment of the day.
- No Retry on errors; file delete was not confirmed (now a two-step confirm in the row); a failed comment or submit was silent.
- Missing values read N/A; the legend lists Meeting prep and Other.
- The sidebar counts refresh after an action here.
- One text box did two jobs: return feedback now has its own field, sent with the return as the route already accepts.

## Defaults taken (owner may reverse)

Listed in the commit message. In short: one score, one maximum, one comment; delivery as submission count and assignee count only; no attachment versions, Download all or enforced upload; Recurring kept as today (Weekly or Monthly, saved as a label, labelled as such); due date and instructions optional; five tabs for every role; return needs feedback; Approve and Save grade both kept; full calendar kept; scope note kept; guide over handoff on button text colour, KPI sizes, caps headers and hover.

Decisions of mine worth a look:

- Graded work shows only under Archive (the wireframe drew "Recently graded" under All). The description says the other tabs exclude it and counts must equal the rows shown.
- Type, ticker and sector sit under the title, not in their own columns. Beside the real 200px sidebar and the 300px side column the list is about 763px wide, which left under 100px for the title with the wireframe's nine columns.
- The section is titled "Assigned work" with a "N waiting on you" count. "Needs your action" was not true of every row.
- Save grade now asks for both a score and a maximum, and refuses a score above the maximum. Before, an empty grade could be saved.
- "Start review" on a row changes the status and opens the detail (before, the row control only opened the dialog).
- The brief said to leave out weekly or monthly recurrence choices and also that Recurring stays as it is today. Today it is a switch with Weekly or Monthly, and the server stores only those two values, so that was kept.
- The Command Center sample types "Coverage refresh" as research; here it is coverage. Everything else about that row matches.

## Left out, and why

- Grades here are not connected to the Grades page or to meetings: needs data-model decisions. Nothing links the two today.
- Multi-criterion rubric, per-person check marks and fractions, attachment versions, Download all, enforced upload: no data.
- "Role scope" block and "State examples" strip: annotations.
- "View all templates" as a page: there is none. The list expands in place past four.
- A council-wide workload view: each manager only sees their own, their created and their direct reports' work.
- Editing or deleting an assignment, setting progress, saving a template on its own: no button today, none added.
- Export still exports everything the member can see, whatever tab is open (as before).
- The Command Center and home blocks that list tasks as assignments, and the Org Chart's "Add member" button that opens this page: other pages, not edited.
- Removed files: the eight old `academic2/Assignment*.jsx` components and `assignments2.css` (only this page used them).

`sql.md` holds one optional policy change, not run and not required: it would let a member read the target rows of work given to them, so "Assigned to" lists everyone and not only the member. Until then an analyst assigned through a team sees their own name and "1 assignee" on that work.

## Checks (all pass)

`lint:branding`, `lint:ds`, `lint:css`, `lint:a11y`, `test:page-canvas`, `test:em-dash`, `check:org-emdash`, `check:no-em-dash`, `check:vendor-copy`, `check-home-canvas`, `test:security`, `test:org-assignments` (new, 13 tests, added to package.json), `test:org-command-center`, `test:org-trading-desk`, `test:org-fund-analytics`, `test:org-a`, `test:org-b`, eslint on changed files (0 errors, 0 warnings), prettier on changed files, pre-commit hook. `lint:arch`: 0 errors, 12 warnings, as on main. No existing test was edited.

Preview (`/home/claude/harness-org-assignments/`, real global CSS and shell, stubbed link, router and org context, mocked fetch): no page errors; `scrollWidth` equals the viewport at 390, 768 and 1024 in eight states, and at 1440 and 1920. 91 scripted checks pass (`interact.mjs`): tab counts equal rows; sample writes send nothing; return refused without feedback; grade validation; create validation, combined targets and the exclusive whole council; template fills the form; search; calendar day list; address updates; Esc closes; in council data one PATCH, POST or DELETE per action with the expected body; a failed write says so and keeps state; an analyst assigned through a team submits even when the detail route says "not the legacy assignee"; analyst sees no New assignment, review queue, templates or review tab; error Retry heals; non-member and unknown-link states; right edge on the logout line and one-line header at 1440 and 1920.

Screenshots here: `preview-dark.png`, `preview-light.png`, `preview-tablet.png`, `preview-phone.png`, `preview-detail-overlay.png`, `preview-detail-comments.png`, `preview-new-assignment.png`, `preview-calendar.png`, `preview-calendar-phone.png`, `preview-role-analyst.png`, `preview-role-portfolio-manager.png`, `preview-archive.png`, `preview-empty.png`, `preview-error.png`, `preview-loading.png`.

## Untested

- `npm run build` and the real Next.js runtime. Nothing ran against the database: the changed loader and detail route, the new sample route, the server page's demo-viewer check and `searchParams`.
- The bug fix rests on the row policies in the migrations (`members read own assignments`, `members read targeted assignments`). If the live database has another policy that lets a non-manager read rows that are not theirs, those rows would show Start or Submit and the server would refuse the click with a message.
- Real file upload, download and delete (mocked in the preview).
- CSV download and the print window in a real browser.
- The address update on the real site (verified in the preview on a file URL).
- The real navigation bar beside the page; partner (gold) scope; touch devices; screen readers.

## Shared files touched

- `package.json`: one script line.
- `src/app/api/org/assignments/_loader.js`, `route.js`, `[id]/route.js`: the bug fix, metrics and tab counts from the model, and the status path imported from the model instead of declared in the route. `tab_counts.all` in the payload now excludes archived work, matching what the page always showed; no other reader of that field was found.
- Nothing was exported from, or edited in, the Command Center, Trading Desk or Fund Analytics files.
- No shell file was edited: `git diff --stat main...HEAD` lists none of TeamHubShell, TeamHubSidebar, team-hub-nav, team-hub-shell.css or the four layouts.
