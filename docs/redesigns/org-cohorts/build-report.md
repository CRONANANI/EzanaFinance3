# Build report: org Cohorts

Branch `redesign/org-cohorts`, commit 9d986c7 (not pushed). Worktree `/home/claude/wt/org-cohorts`.

## Built

- New page `src/components/org/cohorts/` (CohortsPage, RosterTab, RecruitmentTab, OnboardingTab, AlumniTab, CohortDialogs, ApplicantDialogs, parts, useCohortsSource, cohorts.css) replacing `academic2/CohortManager` and its five tab components (deleted, nothing else imported them).
- No header block. Row 1: Sample content label and "Show council data", text cohort selector (ds Dropdown), New cohort / Set as current / Track record as text, Graduate class as the one filled button.
- KPI strip (18px mono values): current cohort, roster members, applicants, onboarding blocked, total alumni. All loaded up front (counts no longer wait for a tab). Text tabs with counts, term line, `?cohort=&tab=` in the address.
- Roster table or grid, selected member column behind one rule, manager lifecycle actions, Depart reason in a ds Modal with the danger button. Graduation readiness for this cohort only.
- Recruitment: stage strip, pipeline table (in progress / rejected and declined with reasons), funnel and sources, application form block; applicant evaluation (rubric 0 to 5 with notes, locked peer notes, decisions, inline reject/decline reason), accept and provision, add applicant, form builder all ds Modals.
- Onboarding: figures, tasks with outstanding names and remove (confirm), members and gate status with mentor menus, per-member checklist, mentor load.
- Alumni: all classes first, filters, figures (top destination "Tied" with caption, N/A only with no placements), placement table, destinations, detail with Edit placement and archived track record; print kept.
- Loading skeletons, one-line empty states, inline errors with Retry for every section; route `loading.js` matches.
- Sample content: `GET /api/org/cohorts/sample` (master admin / demo members only), `src/lib/org-cohorts-sample.js` with `sampleRespond` answering every page request with the routes' rules, never saved. Same sample council; invented extra people only.

## Fixes (with tests in `scripts/check-org-cohorts.mjs`, `npm run test:org-cohorts`, 18 passing)

- Graduation now takes only flagged members of the cohort being graduated (`src/lib/org-cohort-graduation.js`, shared by the new `GET /api/org/cohorts/:id/graduation` and the archive route). The dialog lists exactly them and sends `expected_member_ids`; the route returns 409 `roster_changed` if the list moved. Snapshot roster is the cohort's members.
- New cohort is created recruiting and not current; Set as current is explicit (section 9 default 2).
- Org Chart flag shows Graduating on the roster; onboarding lists only this cohort's members.
- Blind screening: initials no longer leak, blind ID `A-XXXX` (last four characters of the record id, same for every viewer), stage-move PATCH response redacted, provisioning requires an offer. Pure ATS rules moved to `src/lib/org-ats.js`.
- No public application link rendered. Alumni destinations only from stored industries (placement route no longer invents "Undisclosed").
- Gold removed; destructive confirms use the solid danger button; browser prompts and alerts gone.

## Checks

lint:branding, lint:ds, lint:css, lint:a11y, test:page-canvas, test:em-dash, check:no-em-dash, check:org-emdash, check:vendor-copy, test:security, test:rls, test:org-a, test:org-b, test:org-assignments, test:org-grades, test:org-command-center, test:org-cohorts, depcruise, eslint and prettier on changed files. Harness `/home/claude/harness-org-cohorts`: 390, 1024, 1280, 1440 (dark, light), 1568, 1920; scrollWidth equals viewport at every width, page right edge on the logout line; 11 scripted interactions pass.

## Left out

- Portfolio managers' sidebar link (shell file `team-hub-nav.js`, not touched).
- Moving members between cohorts (no route for it today).
- Settings archive skipping the handoff override (settings page, outside this build).
- Changing the onboarding gate from this page (shown as status; set at creation).
- Separate "Funnel" button: the funnel is always visible beside the form block.

## Untested

- Real routes against production data and RLS (only mock and harness). Analysts may see fewer research notes than managers, so handoff status is shown only to executives and portfolio managers.
- `npm run build` (not runnable here).

## Shared files touched

Applicant, cohort, alumni placement API routes listed in the commit; `package.json` (one script). No Team Hub shell or layout files. No SQL needed.
