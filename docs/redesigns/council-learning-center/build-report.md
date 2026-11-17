# Build report: council Learning Center

Branch `redesign/council-learning-center`, commit d98be1c (not pushed). Worktree /home/claude/wt/council-learning-center.

## Built

- The hub at /learning-center is unchanged for everyone. Council members, once org loading has finished (`useOrg().isOrgUser` and not loading), get a "Council learning" band directly under the KPI strip. It follows the same gating as the Echo and Watchlist council builds. On phones the band comes straight after the KPI strip.
- Heading with text jump tabs: Assigned to me (n), Onboarding (n), My grades, plus Team progress (n) for managers and Advisor queue (n) for executives. Selected tab is emerald text.
- Context strip: learning context only (council, your role, cohort, open learning work, next due). The wireframe's fund figures were dropped.
- Cards (each has its own loading skeleton, one-line empty state and inline error with Retry):
  - Assigned to me: your own Reading assignments, read through Assignments' loader, plus council learning items assigned to you. The existing policy "Members read assignments" lets a member read their own rows, so no SQL was needed. Status is shown as words with icons. Other open assignments link to Assignments.
  - Onboarding gate: your cohort's checklist, read-only, with only your own completion. Ready to pitch is worked out from the gate tasks.
  - My grades: your own newest Participation and Overall grades, through the Grades loader. For executives the list is narrowed to their own entries. Only the member shape is sent, and no grades are sent while grade visibility is paused.
  - Council path: the council's learning material (members can read it), then the default starter order with your own counts. Clicking a step opens that level in the active path.
  - Team progress (executives and portfolio managers): Done / total, due in 7 days, overdue, and the Learning score from the council rating. No course progress.
  - Advisor queue (executives): overdue work plus work submitted or in review.
- API: GET /api/org/learning and /api/org/learning/sample. Both use the RLS-scoped client only, have no write paths and send 403 to non-members. Sample content is only sent to master admin and demo viewers (`isCommunityDemoViewer`).
- Sample: follows the hub's single "Sample content" switch. It is built from the Assignments, Grades (own-grades set), Cohorts (same checklist titles) and Recognition (`sampleLearningScores`, newly exported) samples, so the figures agree with those pages. Names are invented and nothing is saved.

## Fixes from the guide over the design

- Table headers are 11px caps.
- No filled button in the band (Resume learning stays the page's only one).
- No underline on tabs.
- Grade notes describe what is counted and never judge the student.
- Scores are not coloured.
- Tooltips open from the title's left edge, so nothing clips at 390px.

## Left out

- Silver, Gold and Platinum placeholder lists.
- Readiness beyond the gate.
- Links from assignments to courses.
- The fund figures in the context strip.
- Grade feedback text (the stored feedback stays on Grades).
- Toggling checklist items from this page (completion is recorded on Assignments and Cohorts).

## Untested

- Live data against production: no SQL was run. The repo's migrations and production may differ.
- Analysts may not be allowed to read onboarding task titles, because of the assignment row policy. They then read "Onboarding task", as on Cohorts.
- The harness bundled the real hub and band with stubbed nav, auth and org context and mocked fetch. A real Next build was not run.

## Checks

- lint:branding, lint:ds, lint:css, test:page-canvas, test:em-dash, test:learning-hub, new test:council-learning (9 tests).
- test:org-recognition, test:org-grades, test:org-assignments, test:org-cohorts, test:rls, test:security, depcruise.
- eslint: 0 errors. Prettier: clean.
- Screenshots: 390, 1024, 1280, 1440 (dark and light), 1568 and 1920 wide, plus analyst, PM, retail, empty, error, loading and partial-failure states. No sideways scroll and no right-edge clipping.

## Shared files touched

- LearningHub.jsx: adds the band, a pending-level ref and starter-path counts. Retail behaviour is unchanged.
- useLearningHub.js: adds `sampleKnown`.
- org-recognition-sample.js: one additive export.
- package.json: one script.
- No navigation, OrgContext or Team Hub shell files were touched.
