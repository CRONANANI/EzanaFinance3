# Handoff: Cohorts (Team Hub, organizational)

(Transcribed from design_handoff_cohorts/README.md in the Claude Design project
https://claude.ai/design/p/7a7b6bdc-433f-4411-9e9f-54e6079610a4, read with get_page_text while paging
the editor. Wrapped lines re-joined.)

## Overview

Redesign of `/org-team-hub/cohorts` for university student-managed investment funds. One page manages a cohort's lifecycle: roster, graduation readiness, recruitment (blind applicant pipeline and rubric scoring), onboarding (gate before first live pitch, mentor load) and alumni (placement and frozen record). The design board shows all four tab states stacked on one page; **production uses four navigable tabs** (Roster, Recruitment, Onboarding, Alumni) with only one panel visible at a time.

## About the design files

The files here are **design references built in HTML**, not production code. Recreate them in the Ezana Next.js app (`src/app/(dashboard)/org-team-hub/cohorts/`) using its patterns: `TeamHubShell` / `TeamHubSidebar`, components from `@/components/ds`, tokens from `src/app/theme-variables.css`, and the flat canvas from `src/styles/home-canvas.css`. `cohorts.css` is a ready page-scoped stylesheet (prefix `coh-`) written to the Ezana Branding and UI Guide; use it as the starting point for the page CSS.

## Fidelity

**High fidelity.** Final layout, type, colour tokens, spacing, copy and states. All names and figures are **sample content**.

## Canvas and shell

- Artboard 1440px. Navigation bar and page share one envelope: max 1600px, 32px side padding. Content runs **x=32 (logo left edge) to x=1408 (logout glyph right edge)**.
- Navigation bar: the existing `Navbar` (org variant), unchanged. 64px, `--bg-primary`, one hairline below. Left: Walia ibex logo (`/logo-tight.png`, 54px tall), bell with count, checklist `4/19`. Centre: Team Hub (current, emerald text), Research, Trading, Sonar (filled emerald pill, white text), Watchlist, Learning Center. Right: `bi-person-circle`, `bi-gear-fill`, `bi-box-arrow-right` in `--negative`.
- Sidebar: existing `TeamHubSidebar`, 200px, then 24px, one full-height hairline, 24px, page. Cohorts is current (emerald text, 600). Do not hand-roll it.
- Page content width at 1440: 1127px (x=281 to x=1408). No header block (guide 13); the first row is the cohort control row.

## Layout, top to bottom

1. **Control row** (flex, space-between, 20px bottom padding, hairline). Left: `SAMPLE CONTENT` caps label (only while showing sample data); "Sample council data" with text toggle Show / Hide; 1px x 20px vertical hairline (24px each side); cohort selector `2026 analyst class` (700, primary) + `Active` (emerald) + `bi-chevron-down`. Right: New cohort (text), Set as current (text), **Graduate class** (primary, `bi-mortarboard`), ends on x=1408.
2. **KPI strip** (content width, 20px vertical padding, hairline): Current cohort `2026 analyst class` (18px sans 600) | Roster members `7` | Applicants `18` | Onboarding blocked `bi-exclamation-triangle 1` (warning) | Total alumni `4`. Label 12px/500 `--text-muted`; value 18px JetBrains Mono 600 `--text-primary`. Cells: 24px padding each side, hairline left border, first cell flush.
3. **Tabs** row (20px padding, hairline): Roster 7, Recruitment 18, Onboarding 3, Alumni 4. 16px/600, gap 32px, count mono 12px muted 8px after label. Selected = emerald text only. Right: "Term: academic year 2026-27 · Current" 13px muted.
4. **Roster** section. Header: "2026 analyst class · Roster" (22px/700) + right controls (gap 24px): borderless search "Search members", All statuses, All sectors, All roles (text + chevron), Table / Grid text toggle.
   - Split: table (flex 1, 24px right padding) | hairline | Selected member column (280px, 24px left padding).
   - Table columns `1.8 1.3 1 1 .6 1.1 1` fr, gap 16px, rows 52px: Member (26px initials avatar, `--emerald-bg-hover` ground, name 600) sorted ascending (`bi-arrow-up`), Role, Status (Active emerald, Onboarding muted, Graduating warning), Ezana rating (mono right, "Provisional" 11px warning beneath when fewer than 10 scored ideas), Pitches (mono right), Sector, Joined (mono right, `Sep 02, 2026`).
   - Caption: "Rating is provisional for fewer than 10 scored ideas. Missing rating: N/A."
   - Selected member: title 18px/700, 40px avatar, name 16px/700, "Analyst · Active"; key/value rows Ezana rating, Pitches, Sector coverage, Mentor, Joined; hairline; "Manager actions": Mark on leave, Begin graduation (text), Depart (negative text, confirms in a Modal). Caption about analyst visibility.
5. **Graduation readiness · Selected cohort only** (18px/700). Right: "2 members flagged · 1 missing published handoff". Columns `1.3 1.2 1 1 1.2 1`: Member, Role, Coverage, Handoff (`bi-check-lg Published` positive / `bi-exclamation-triangle Missing` warning), Research ("Research Library" link + `bi-arrow-right`), Graduation flag (right).
6. **Recruitment**. Design-state caps label + note. Header "Recruitment · 2026 analyst class" + Blind screening on (emerald text toggle, `bi-eye-slash`), Funnel (`bi-funnel`), Form builder (`bi-ui-checks`), **Add applicant** (primary, `bi-plus-lg`). Stage strip Applied 18, Screened 10, Interview 6, Pitch 4, Offer 2, Accepted 2. Candidate pipeline full width, columns `1 1 2 1 .7`: Applicant (blind ID, mono 600), Stage, Program, Rubric average (`4.3 / 5`, `N/A`), Action (Open / Review text button, right). Then a 64px-gap pair: Source conversion table (Source, Applied, Accepted, Conversion) and Application form (Collection Closed, Fields 4 configured, caption, Edit form link).
7. **Onboarding**. Header + Gate enabled (emerald text toggle, `bi-lock`), Task settings (`bi-sliders`), **Add task** (primary). KPIs Enrolled 3, Average completion 87%, Fully onboarded 2, Blocked from first pitch 1 (warning + icon). Pair (64px): Onboarding tasks list (icon + name, mono `3/3` right) | Members and gate status (`1.2 .5 1.6 1.1`) and Mentor load (`1.2 1.2 .6`).
8. **Alumni · All classes**. Filters All classes, All industries, All engagement; Print placement summary (text, `bi-printer`). KPIs Total alumni 4, Placed within 6 months 75%, Top destination **Tied** + caption "3 industries, 1 alumnus each", Engaged 3. Placement table `1.3 1.1 .8 .6 1.4 1.1 .9` with two-line cells (name / cohort, employer / role). Pair: Placement destinations | Alumni detail (selected alumnus) with Edit placement (text, `bi-pencil`) and Open archived track record (link).
9. **Section states** (board only): for each of the five sections, Loading (skeleton in the table's final grid), Empty, Error.
10. Footer caption (12px faint): sample-content disclaimer.

Spacing: sections separated by a hairline with 40px above and 24px below; stacked blocks 20px; side-by-side 64px; 24px beside any vertical rule.

## Dialogs (ds `Modal`)

Overlay `--bg-overlay`; dialog `--bg-secondary`, 1px `--border-primary`, `--radius-lg`, `--shadow-xl`; header 16px 18px with 15px/700 title and `bi-x-lg` close; body 18px; footer 14px 18px with top hairline. Focus trap, Escape and focus return come from `Modal`.

- **Applicant evaluation · A-023** (size 520px). "Interview stage · Candidate details available at this stage"; rubric rows Technical 4 / 5, Communication 4 / 5, Culture fit 5 / 5, Prior experience 4 / 5, Notes; `bi-lock` "Other reviewers' notes remain locked until your rubric is submitted." Footer left: Advance, Send offer (text), Reject (negative text). Footer right: Save draft (text), **Submit rubric** (primary). Opens from the pipeline Open / Review action.
- **Graduate 2026 analyst class** (size 640px). Irreversible-action description; one row per graduating member with handoff status; warning line with icon when a handoff is missing. Footer right: Cancel (text), Open Research Library (link), Graduate anyway (negative text). When no handoff is missing the destructive label reads "Graduate class". Opens from the Graduate class button.

## Interactions and behaviour

- Tabs: `Tabs` from ds styled text only; arrow-key navigation; `aria-selected`. Counts from `/api/org/nav-counts` style payloads; hide a zero.
- Row hover and selection: **text colour change to `--emerald-text` only**, 0.15s ease-out. No wash, no accent bar. Rows are buttons (keyboard reachable, `aria-selected`).
- Roster row click sets the Selected member. Alumni row click sets Alumni detail.
- Table / Grid toggle switches the roster between the table and a 3-column flat grid (avatar, name, role · status, rating).
- Council data Show / Hide swaps sample council data on and off (`aria-pressed`).
- Cohort selector opens a ds `Dropdown` of cohorts; changing it rescopes every panel. Graduation, readiness and onboarding only include members of the selected cohort.
- Filters are `Dropdown` triggers; search filters by member name client-side.
- Manager-only controls (Graduate class, Set as current, New cohort, Manager actions, Add task, Add applicant) are hidden for analysts; the server re-checks permission.
- Sortable headers are buttons with `aria-sort`.
- Motion: 0.15 to 0.2s colour transitions only; no lift, no glow. Respect `prefers-reduced-motion`.
- Responsive: pairs stack under 1100px; the roster side column moves below with a horizontal rule; tables scroll inside their section.

## States

- Loading: `SkeletonTable` / skeleton bars matching each grid (`coh-skel`, pulse 1.4s). No spinners.
- Empty: one line + one action. Roster "No members in this cohort yet." / Open recruitment. Graduation readiness "No members are flagged for graduation." / Review roster. Recruitment "No applicants for this cohort yet." / Add applicant. Onboarding "No onboarding tasks set for this cohort." / Add task. Alumni "No alumni found for this cohort." / Choose another cohort.
- Error: inline `bi-exclamation-triangle` + message in `--negative` + Retry text button. Messages: "Could not load roster." / "graduation readiness." / "applicant records." / "onboarding tasks." / "alumni records." The rest of the page keeps working.
- Top destination: Tied + caption when no single industry or employer leads; the leader's name when one leads; N/A only when there are no placements.

## State

`cohortId`, `activeTab`, `selectedMemberId`, `selectedAlumnusId`, `rosterView` ('table' | 'grid'), `councilData` (bool), filters (`status`, `sector`, `role`, `class`, `industry`, `engagement`, `query`), `evaluationApplicantId`, `graduateDialogOpen`, per-section `loading` / `error`.

## Tokens

Text `--text-primary` #f0f6fc / #0f172a, `--text-secondary` #e2e8f0 / #1e293b, `--text-muted` #8b949e / #64748b, `--text-faint` #6b7280 / #94a3b8. Ground `--bg-primary` #0a0e13 / #ffffff, `--bg-secondary` (modal). Emerald `--emerald` #10b981 / #059669 (fills), `--emerald-text` #34d399 / #047857 (text; the design file used `--emerald-hover`, which has these values), `--btn-primary-bg-hover` (`--emerald-dark` in the file). Status `--positive`, `--negative` #ef4444 / #dc2626, `--warning` #fbbf24 / #d97706. `--emerald-bg-hover` (avatar ground). Hairlines `--ez-rule` / `--ez-rule-subtle` (text-primary at about 7 to 10%). Overlay `--bg-overlay`, `--border-primary`, `--shadow-xl`, `--radius-lg` (modal), `--radius-md` (buttons), `--radius-sm` (skeleton). Fonts `--font-sans` Plus Jakarta Sans, `--font-mono` JetBrains Mono. Type: section 22/700, card title 18/700, body 13 to 14/500, caption 12, caps label 11/600/0.08em, KPI value 18/600 mono. Spacing 4, 8, 12, 16, 20, 24, 32, 40, 64.

## Icons (Bootstrap Icons only)

bi-bell, bi-list-check, bi-building, bi-search, bi-graph-up-arrow, bi-broadcast, bi-bookmark, bi-mortarboard, bi-chevron-down, bi-person-circle, bi-gear-fill, bi-box-arrow-right, sidebar set from `team-hub-nav.js`, bi-list-ul, bi-grid, bi-arrow-up, bi-check-lg, bi-exclamation-triangle, bi-arrow-right, bi-eye-slash, bi-funnel, bi-ui-checks, bi-plus-lg, bi-lock, bi-sliders, bi-circle, bi-printer, bi-pencil, bi-arrow-clockwise, bi-x-lg.

## Sample content and data notes

All people, cohorts, IDs, counts and employers are invented sample content. Figures reconcile (18 applicants = sum of sources; 87% = 13 of 15 tasks; 75% = 3 of 4 placed) with one exception: **Jordan Vale has 8 pitches but his frozen rating is not marked provisional.** Conversion and completion are rates and are shown unsigned.

## Decisions the owner may reverse

- Row hover is text colour only (guide 9 allows a faint wash).
- Graduate anyway is negative text, not a solid danger button (guide 21).
- Cohort names stay in sans although they contain a year.
- Design-state caps labels above each tab section exist only on the board.

## Must keep working

Server-side role checks, existing Team Hub nav counts and polling, the existing navbar, cohort archiving and frozen snapshots, Research Library links.

## Files

- `Cohorts Redesign.dc.html` board (all artboards and the audit list). Open in a browser next to `support.js`.
- `Cohorts Page.dc.html` the page, with props `mode` (dark | light), `dialog` (none | rubric | graduate), `clip`, `showGuides`. All markup and inline styles are the HTML source.
- `cohorts.css` page-scoped CSS for the build.
- `colors_and_type.css` tokens used by the design files (adds a `.light-mode` scope).
- `assets/logo-tight.png` Walia ibex mark (from `public/logo-tight.png`).

(End of README as read; the editor showed 87 lines. The HTML/CSS source files were not transcribed; they live in the project's design_handoff_cohorts folder.)
