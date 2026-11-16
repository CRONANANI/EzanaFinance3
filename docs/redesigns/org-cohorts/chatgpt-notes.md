# ChatGPT notes: org Cohorts redesign

Chat: https://chatgpt.com/c/6af3c68c-e3f8-83e9-9741-63815185f6ec (sent 2026-11-16, ChatGPT worked 11m 36s).

ChatGPT first drew a 1024 x 1536 generated image, then "refined" it into a rendered 1440 x 3399 PNG
(alt "Ezana Cohorts full-page redesigned wireframe") plus an HTML/CSS reference file
(ezana_cohorts_wireframe_1440.html, not downloadable here). The slices wireframe-part1..7.jpg are
from the final 1440 x 3399 PNG.

## ChatGPT's text (transcribed)

Title: Ezana Cohorts, redesigned wireframe. Follows Ezana's dark-mode branding and flat-canvas UI
system, with the existing 17-destination Team Hub sidebar preserved. 1440 x 3399px, full-page desktop
wireframe, organizational version.

Sections included:

1. Cohort overview: current class, roster size, recruitment activity, blocked onboarding, alumni
   count, and executive actions.
2. Roster: sortable member table, Ezana Ratings, provisional status, sector coverage, and member
   details.
3. Graduation readiness: graduating members, sector coverage, published handoffs, and
   missing-document warnings.
4. Recruitment: applicant pipeline, stage counts, source conversion, form management, and applicant
   evaluation dialog.
5. Onboarding: task completion, first-pitch eligibility gates, blocked members, and mentor
   assignments.
6. Alumni: cross-cohort records, placement outcomes, frozen ratings, career destinations, and
   engagement.
7. Graduation dialog: selected-cohort preview, handoff validation, and explicit override
   confirmation.
8. System states: loading skeletons, empty-state guidance, and errors with Retry.

Design decisions you can reverse:

- The roster is the default view. Recruitment, Onboarding and Alumni are shown further down the
  image as separate design states for review; the real application should keep them as four
  navigable tabs.
- Graduation readiness sits directly beneath the roster; applicant evaluation opens in a dedicated
  dialog; the Alumni tab starts with an "All classes" view instead of an empty current-cohort view.

New functionality or implementation changes (need work beyond the existing page):

- Cross-cohort alumni aggregation.
- Cohort and tab selection preserved in the URL.
- Cohort-specific graduation and onboarding scoping fixes.
- Separate creation and "Set as current" actions.
- Portfolio-manager access to the Cohorts sidebar destination.
- Demo-only sample content that never writes to council records.

All names, ratings, applicant counts, placements and dates are fictional. No public application
portal, successor system or other unsupported data source is introduced.

## My reading of the image (Claude, not ChatGPT)

- Top row: "Sample content" label, "Show council data" switch, text cohort selector
  "2026 analyst class Active" with chevron; right: "New cohort" (text), "Set as current" (text),
  "Graduate class" (solid emerald).
- KPI strip: Current cohort (2026 analyst class), Roster members 7, Applicants 18, Onboarding
  blocked 1 (amber), Total alumni 4.
- Text tabs with counts: Roster 7, Recruitment 18, Onboarding 3, Alumni 4; right "Term: Academic
  year 2026-27, Current".
- Roster: section title "2026 analyst class, Roster", borderless search, text filters (statuses,
  sectors, roles), Table/Grid text toggle. Hairline table: Member, Role, Status (coloured text),
  Ezana rating (with "Provisional" under it), Pitches, Sector, Joined. Right column "Selected member"
  panel with rating, pitches, coverage, mentor, joined, and manager actions Mark on leave, Begin
  graduation, Depart (red). Footnote on provisional and N/A.
- Graduation readiness (selected cohort only): Member, Role, Coverage, Handoff (Published / Missing),
  Research Library link, Graduation flag; summary "2 members flagged, 1 missing published handoff".
- Recruitment: Blind screening on, Funnel, Form builder, "+ Add applicant" (primary). Stage strip
  Applied 18, Screened 10, Interview 6, Pitch 4, Offer 2, Accepted 2. Candidate pipeline table
  (blind IDs A-0xx, stage, program, rubric average, Open/Review). Applicant evaluation overlay with
  the four 0 to 5 criteria, notes, locked-notes line, Save draft / Submit rubric, Advance, Send offer,
  Reject. Source conversion table (Campus events, Referrals, Other). Application form block
  (Collection Closed, 4 fields, "no public application page", Edit form).
- Onboarding: Gate enabled, Task settings, + Add task. KPIs Enrolled 3, Avg completion 87%, Fully
  onboarded 2, Blocked from first pitch 1. Task list with done/assigned and a gate task; members and
  gate status table (Ready / Blocked, gate incomplete) with mentor; Mentor load table by senior.
- Alumni (All classes): class, industry, engagement filters; "Print placement summary". KPIs Total
  alumni 4, Placed within 6 months 75%, Top destination "N/A, Tied", Engaged 3. Table of graduates
  with frozen final rating and pitches, employer and role, industry, engagement. Placement
  destinations counts and an Alumni detail block with Edit placement / Open archived track record.
- Graduation dialog overlay: lists graduating members with handoff status, missing-handoff warning,
  Cancel, Open Research Library, Graduate anyway (red).
- States strip: Loading roster skeleton, Empty alumni, Error recruitment with Retry. Footer
  sample-content disclaimer.
- Caveats spotted: the sidebar user is drawn as "Amina Cole, Executive, Sample" and the top bar
  icons are stand-ins (do not copy the bar). The applicant dialog is drawn inline as a panel rather
  than a true modal. "Top destination N/A, Tied" is an odd value to revisit.
