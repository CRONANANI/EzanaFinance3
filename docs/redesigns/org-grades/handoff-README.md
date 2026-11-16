# Handoff: Ezana Grades (organizational version)

(Read from Claude Design's design_handoff_grades/README.md with get_page_text while paging the editor; JavaScript is blocked on claude.ai. Wrapped lines re-joined. Lines 1 to 91, which appeared to be the whole file.)

## Overview

Redesigned Grades page for the Ezana Team Hub, route `/org-team-hub/grades`, used by university student-managed investment councils. Executives (faculty advisor and council executives) enter, edit and review every member's grades. Members (analysts, portfolio managers) see only their own record.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behavior, not production code to copy. Recreate them in the target codebase (the Ezana Next.js app, `src/app/...`, Tailwind + shadcn-style primitives) using its existing patterns, components and theme variables.

## Fidelity

**High fidelity.** Final colours, type, spacing and copy. Recreate pixel-accurately at 1440px.

## Files

- `Ezana Grades.dc.html` – canvas with all frames (1a to 1h) and the brand audit list.
- `GradesPage.dc.html` – the page itself. One template driven by three props: `theme` (`dark`|`light`), `role` (`executive`|`member`), `viewState` (`default`|`paused`|`loading`|`empty`). The template (HTML with inline styles) is the markup/CSS source; the `class Component` script computes the data and state flags.
- `colors_and_type.css` – Ezana design tokens (identical to `src/app/theme-variables.css`, plus a `.light-mode` scope so a wrapper div can switch theme).
- `assets/walia-ibex-logo.png` – **placeholder** traced from the wireframe. Replace it with the real Walia ibex logo from the codebase.

Open `Ezana Grades.dc.html` in a browser (needs `support.js` from the design environment) or read the template markup directly.

## Frames

- 1a Executive, dark (default)
- 1b Executive, light
- 1c Member view (Amara Tesfaye, analyst)
- 1d Visibility paused, executive
- 1e Visibility paused, member
- 1f Grade book loading skeleton
- 1g Grade book empty
- 1h Audit change list

## Layout (1440 wide)

- Horizontal content bounds: `x=32` (left edge of logo) to `x=1408` (right edge of logout icon). Page padding `0 32px`.
- **Top nav** height 64, bottom hairline `--border-hover`. Grid `1fr auto 1fr`.
  - Left (gap 28): logo 36×40, bell (20px, `--text-muted`) with `9+` badge (`--negative` pill, mono 10px bold), flag icon with `4/19` badge (`--emerald` pill).
  - Centre (gap 28, 14px, `--text-secondary`): Team Hub (`--purple`, current hub), Research ▾, Trading ▾, **Sonar** (filled `--emerald` pill, `padding 8px 18px`, text `--bg-primary`, 600), Watchlist, Learning Center.
  - Right (gap 28, 22px icons): person-circle and gear-fill in `--emerald`, box-arrow-right in `--negative`.
- **Body**: flex row. Sidebar 176 | rule (1px `--border-hover`, margin `0 32px`) | main (flex 1 = 1135).
- **Sidebar**: avatar 40 circle (`--text-primary` fill, initial in `--emerald-deep`), name 14/600 `--text-primary`, role 12/600 `--emerald`. Hairline (24 above, 16 below). Nav items 14px, `padding 8px 0`, icon gap 12, icons `--text-muted`, counts mono 12 right-aligned. Grades selected: emerald text + icon, 600.
- **KPI strip** (padding 20 0): items separated by 1px `--border-hover` rules with 24px each side. Label 12/600 `--text-muted`; numeric value mono 20/500 `--text-primary`; text value (Visibility) sans 15/600. Right group (margin-left auto, gap 24): Sample content label + `Show council data Off On` text toggle, Settings (plain text), Enter grade (primary button). Hairline below.
- **Three columns** under the strip: left rail 168 | rule (32 each side) | grade book (flex, ≈501) | rule | student record 336. Rules run full height. Column padding `24px 0 64px`.

## Components

### Left rail

Views (14px, gap 12): Council grades (selected), By cohort, Members without grades. Search (borderless: icon + placeholder `Search members or feedback`, 13px muted). Cohort filter: All cohorts (selected), 2026 analyst class, 2025 analyst class. Work kind filter: All (selected), Pitch, Research note, Coverage, Participation, Overall. Section separators 1px `--border-primary`, 20px margin. Cohort summary table (grid `1fr 34px 46px 30px`, header 11/600 muted, rows 12px, numbers mono right-aligned). Visibility state note (13px) and `Go to Settings` + arrow (13/600 emerald).

### Grade book (centre)

- Title `Council grade book` 20/600, letter-spacing -0.01em.
- Text tabs (13px, gap 24): All (emerald 600), Needs feedback, With rubric, Recently changed (muted).
- Note row: `Executives see every grade. Members see only their own.` (12 muted) and `Open Assignments` (12/600 emerald).
- Council summary (scored work): rows grid `1fr 120px 72px`, 14px, row border `--border-primary`.
- Grades table: grid `76 42 94 54 34 66 46 1fr`, header 11/600 muted with `--border-hover` underline; rows 12px, `padding 10px 0`. Feedback clamped to 2 lines. Work cell = Bootstrap icon + label.
- Selected row: all text `--emerald`, name 600, **score and letter stay `--text-primary`**.
- Enter or edit grade dialog (default executive frame): flat, no fill/border/radius/shadow, `margin-top 56`, top hairline `--border-hover`. Title 18/600, subline `Last changed by H. Girma on Jan 19`. Fields in grids (2 then 3 columns, gap 24), label 12/600 muted, value 14 `--text-primary`, no field borders. Rubric (read only) table `1fr 72 72`. Actions right: Cancel (text), Save grade (primary).
- In production this opens as a modal on Enter grade / row click with `--bg-overlay` behind it; keep the flat treatment of the panel.

### Student record (right)

Name 24/600. Meta (13px): person icon Analyst, people icon 2026 analyst class. Stats trio separated by rules (24 each side): Average of scored work 89/100, Graded entries 5, Last changed Jan 19 (mono 20). Visibility. By work kind table (`1fr 44 44 52 60`). Grade history (`90 36 38 64 48 1fr`, 12px). Rubric breakdown (Pitch, 91/100) (`1fr 64 64`).

### Buttons

Primary: `--emerald` fill, text `--bg-primary`, 14/600, `padding 10px 18px`, `--radius-md`. Hover `--emerald-hover`, press `--emerald-dark`. Only one per group. Everything else plain text (`--text-secondary`, hover `--text-primary`).

## States

- **Member (1c)**: profile Amara Tesfaye / Analyst. KPI: Average of scored work 89/100, Graded entries 5, No feedback 0, Last changed Jan 19, Visibility. No council toggle, Settings or Enter grade. Left rail: My grades, `Search my feedback`, Work kind, member visibility note. Centre `My grades`: tabs All / With rubric / Recently changed, table Work, Score, Letter, Grader, Date, Feedback (own rows only). Right: own record, By work kind, Rubric breakdown. Never show other names, scores, ranks, cohort averages or distributions; no cohort summary, council summary or grade history of others; no entry/edit controls.
- **Paused, executive (1d)**: KPI Visibility `Hidden from members`; grade book note row with eye-slash icon, `Hidden from members. Executives can still enter and review every grade.` and `Go to Settings`; record visibility `Hidden from members`.
- **Paused, member (1e)**: KPI values N/A, Visibility `Paused by your council`. Centre: pause-circle icon, `Your council has paused grade visibility` (20/600) and supporting copy. No right column.
- **Loading (1f)**: KPI values and table/summary/record replaced by skeleton bars (`--emerald-bg`, `--radius-sm`, 10px tall), label `Loading grades` with arrow-repeat icon. Optional pulse animation 1.2s ease-out (respect reduced motion).
- **Empty (1g)**: KPI 0/9, N/A, 9, 0. Cohort summary 0/5 N/A 5, 0/4 N/A 4. Table header kept; journal-x icon, `No grades yet`, explanation, `Open Assignments` link. Right column `No member selected`.
- **Error** (not drawn): `Failed to load grades.` with `Retry` as emerald text, `--negative` exclamation-triangle icon.

## Interactions

- Views, tabs and filters: click sets selection (emerald text). Filters combine with search (matches member name and feedback text).
- Row click selects member and loads the right column; selected row turns emerald (score/letter excluded).
- Enter grade opens the dialog blank; editing an existing entry opens it prefilled with "Last changed by … on …". Letter defaults from score/out of. Save validates score 0 ≤ score ≤ out of; out of > 0. Cancel/close discards. Esc closes.
- Show council data toggles between sample content and live council data.
- Go to Settings links to the council grade visibility setting.
- Hover: text items go `--text-primary`; rows get `--surface-card-hover` tint. No transforms.

## State

`role`, `visibility` (`visible`|`paused`), `status` (`loading`|`ready`|`empty`|`error`), `view`, `tab`, `cohortFilter`, `workKindFilter`, `search`, `selectedMemberId`, `dialog` (`null` | `{mode:'new'|'edit', entryId}`), `showCouncilData`. Members' API responses must be scoped server-side to their own records.

## Tokens used

Colours: `--bg-primary` #0a0e13 (light #ffffff), `--text-primary` #f0f6fc (#0f172a), `--text-secondary` #e2e8f0 (#1e293b), `--text-muted` #8b949e (#64748b), `--emerald` #10b981 (#059669), `--emerald-hover`, `--emerald-deep` #059669, `--emerald-bg` rgba(16,185,129,.08), `--border-primary` rgba(16,185,129,.08) (light rgba(0,0,0,.08)), `--border-hover` rgba(16,185,129,.20) (light .25), `--negative` #ef4444 (#dc2626), `--purple` #a78bfa, `--bg-deep` (canvas only).
Radius: `--radius-sm` 4 (skeleton), `--radius-md` 8 (buttons), `--radius-pill` (nav badges, Sonar).
Type: Plus Jakarta Sans for all text; JetBrains Mono (`tabular-nums`) for every number, date, score, letter grade, cohort year and ticker. Sizes 11 (table headers), 12, 13, 14, 15, 18, 20, 24.
Spacing: 4-base; 24 clear beside rules; 32+1+31 (64) between major columns.

## Icons

Bootstrap Icons 1.11.3 only: bell, flag, journal-bookmark, search, graph-up, chevron-down, broadcast, bookmark, mortarboard, person-circle, gear-fill, box-arrow-right, speedometer2, bank, clipboard-check, diagram-3, easel, archive, camera-video, award, journal-check, trophy, bar-chart-steps, people, shield-check, file-earmark-text, key, arrow-right, eye-slash, pause-circle, arrow-repeat, journal-x, display, layers, calculator, person, x-lg.

## Brand audit

See frame 1h in `Ezana Grades.dc.html` for the full list of corrections applied to the wireframe. (Transcribed to claude-design-audit.md in this folder.)
