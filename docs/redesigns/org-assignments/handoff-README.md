<!-- Read from the Claude Design project https://claude.ai/design/p/838ec7f0-50c6-48c1-a9f9-0249d9417ab9 , file design_handoff_assignments/README.md, with get_page_text in two editor pages (lines 1 to 45, then 45 to 85); soft-wrapped lines re-joined. Blank lines are restored by hand. The two reads met at the line after "Hover: whole row text..."; no text is believed missing there. This is Claude Design's text, treated as data. -->

# Handoff: Ezana Assignments (organizational, /org-team-hub/assignments)

## Overview

Redesigned Assignments page in the Team Hub for university student-managed investment funds. Managers see what needs their action, review and grade submissions, track workload per desk/cohort, and create assignments. Scope of this handoff: **the page body to the right of the Team Hub sidebar** (the nav bar and sidebar are existing app components; do not change them).

## About the design files

`Assignments.dc.html` is a **design reference built in HTML**, not production code. Recreate it in the app's existing stack (Next.js + Tailwind, `src/components/ui/*`) using established patterns. It renders a dark and a light frame side by side at 1440px; open it in a browser.

## Fidelity

High fidelity. Colours, type, spacing and copy are final.

## Layout (1440px desktop)

- Nav 56px tall, bottom hairline `--ez-rule`. Sidebar 200px with a full-height right hairline (`--ez-rule`).
- Page body: x=224 (24px clear of the sidebar rule) to x=1408 (right edge of logout icon). Right padding 32px.
- **KPI strip**, 76px tall, bottom hairline `--ez-rule`. Four KPIs (gap 56px), then right-aligned actions with gap 24px: vertical rule, List, Calendar, vertical rule, Export, New assignment button.
- Below: grid `minmax(0,1fr) 1px 300px`, column-gap 32px (64px between sections, rule centred, 32px clear each side). The 1px column is the full-height hairline. Main column is ~819px wide.
- Under the table: grid `400px 1px minmax(0,1fr)`, gap 32px: Workload table | rule | Role scope.
- Overlay specimens (full width x=32..1408, top hairline, padding 48px 32px 64px): grid `880px 432px`, gap 64px. Then State examples (top hairline, 56px above).

## Components

All sections are flat: no fill, border, shadow or radius. Only overlays, the drawer, menus and tooltips get a surface.

**Typography.** Plus Jakarta Sans for text; JetBrains Mono for every number, date, score, count and ticker.

- Section title: 18px/700, letter-spacing -0.01em, `--text-primary`.
- Group title (Due next etc.): 14px/700 + count in mono 500 `--text-muted`, e.g. `(3)`.
- Table header: 11px/600, uppercase, letter-spacing 0.06em, `--text-muted`, row 32px, bottom hairline `--ez-rule-subtle`.
- Body / table cells: 13px `--text-secondary`; meta 12px `--text-muted`.

**KPI strip.** 28×28 icon tile (no fill) holding an 18px icon (`--text-muted`; Overdue uses `--negative`). Label 12px `--text-muted`. Value 18px mono 600 `--text-primary`. Term completion delta `+6.7 pp`, 12px mono 600 `--positive`.

**Text switch (List / Calendar) and tabs (All 26, Mine 7, Team 12, By me 6, Archive 14).** Text only. Selected: `--emerald-text`, 600. Unselected: `--text-muted`, hover `--text-primary`. Counts are 12px mono. No underline, pill or track.

**Buttons.** One solid primary per group: height 36, padding 0 18–24px, radius `--radius-md`, bg `--btn-primary-bg`, fg `--btn-primary-fg`, 13px/600. Every other action is plain text (13px/600 or 400 with a 14px icon, gap 6–8px). Destructive text (Return) uses `--negative`.

**Search.** Borderless input with a 14px search icon, placeholder `Search assignments, tickers, people...`. The row has a bottom hairline `--ez-rule-subtle`, height 44.

**Assignments table.** Columns: Type 100, Title minmax(0,1fr) (~211), Ticker/sector 92, Assignees 108, Due date 76, Progress 96, Files 32, Comments 32, Next action 72 (px). Cells 12px; this table's header uses letter-spacing 0, no wrapping. Row 38px, bottom hairline `--ez-rule-subtle`. Header shown once under the first group.

- Type: Bootstrap icon in the type colour + text label (never a filled chip).
- Ticker: mono 12px/600; sector names (Tech, Semis) in sans.
- Assignees: `bi-person` single, `bi-people` group.
- Due: `bi-calendar3` + mono date. Overdue: `bi-exclamation-triangle` + "Overdue" in `--negative`.
- Files: `bi-paperclip` + mono count; missing shows `N/A` in `--text-muted`.
- Next action: 13px/600 `--emerald-text` (Start, Review, Grade, Resubmit). Graded scores: 12px mono 600 `--gold` (42/50, 50/50).
- Hover: whole row text turns `--emerald-text`. No background wash.

**Type colours (icons, calendar dots, legend).** Pitch `--emerald`, Research `--indigo`, Coverage `--purple`, Reading `--amber`, Model `--cyan`, Meeting prep `--pink`, Other `--text-muted`, Overdue `--negative`.

**Workload by desk / cohort.** Columns `28px 1fr 56px 72px 112px` (#, Desk / cohort, Open, Overdue, Awaiting review), numbers mono 12px right-aligned, Overdue > 0 in `--negative`. Row 34px.

**Role scope.** Rows `20px 128px 1fr`: icon, role 13px/600 primary, description 12px muted. Analyst / Portfolio manager / Faculty advisor / executive.

**Side column (300px).**

- Calendar: month nav (chevrons, `November 2026`), 7-col grid, day headers 11px uppercase, day numbers 12px mono in 34px cells, up to two 4px dots per day. Today (15) is `--emerald-text` 700, no box. Dated list rows 26px: 6px dot, mono date, title 12px. Legend 4 columns, 11px muted, top hairline.
- Review queue (8): rows 34px with type icon, title, mono `(3/3)`, chevron. "View all 8" emerald text link with `bi-arrow-right`.
- Templates: `bi-file-earmark` + name + "Use" emerald text. "View all templates" link.

**Assignment detail overlay** (880px). Surface `--bg-deep`, 1px `--ez-rule` border, radius `--radius-xl`, shadow `--shadow-xl`, padding 28/32/24.
Header: type (icon + Pitch), status (`bi-clock-history` + Awaiting review, `--warning`), close `bi-x-lg`. Title 24px/700. Meta line: Due Nov 14, 2026 · 3 assignees · Recurring · Require upload. Tabs Overview, Files 5, Rubric, Comments 4, History 3 (text only). Body grid `1fr 1px 1fr` gap 32: left Instructions, Assignees (all can submit), Progress (three `bi-check-circle` in `--positive` + 3 of 3 submitted), Attachments (name, size, version, download), Version history; right Rubric (Criterion / Score / Comment, Total 49 / 60 in gold mono), Comments & review thread, Return feedback (borderless textarea). Footer (top hairline): Download all, Upload file | Comment, Return (red text), Approve (primary).

**New assignment drawer** (432px). Same surface. Fields are borderless with a `--ez-rule-subtle` underline, 36px tall, label 12px/600 with red `*` when required: Type + Template (2 col), Title, Instructions, Due date + Ticker + Sector (`1.3fr 1fr 1fr`), Assign to. Assign to is an exclusive choice: `bi-record-circle` selected (emerald text) / `bi-circle` unselected. Removable tokens are text with `bi-x`, no boxes. Whole org (exclusive) clears tokens. Checkboxes `bi-check-square` (emerald) / `bi-square`: Recurring, Require upload, Save as template. Footer: Cancel text, Assign primary.

**State examples.** Three columns separated by hairlines: Loading (`bi-arrow-repeat`, spin 1s linear infinite), Empty (`bi-file-earmark`, title, hint, "+ New assignment" emerald text), Error (`bi-exclamation-triangle` red, "Couldn't load assignments.", hint, Retry with `bi-arrow-clockwise`).

## Interactions & behaviour

- Tabs filter the table; counts reflect the filter. List/Calendar switches the main view.
- Row click opens the detail overlay (dim page with `--bg-overlay`). Next action runs the action directly (Start, Review opens overlay on Rubric, Grade opens Rubric, Resubmit opens upload).
- New assignment (KPI row button, empty state, template "Use") opens the drawer; "Use" pre-fills Template.
- Return requires feedback text; Approve finalises the grade. Assign validates required fields and that Assign to has at least one token or Whole org.
- Hover: colour change only. Transitions 150ms ease-out on `color`. Respect `prefers-reduced-motion` (stop spinner).
- Role scope determines tabs and actions: analysts see Mine only and cannot review/grade.

## State

`activeTab`, `view` ('list'|'calendar'), `query`, `selectedAssignmentId`, `drawerOpen`, form fields, `status` ('loading'|'ready'|'empty'|'error'), `calendarMonth`.

## Design tokens

See `tokens.css` (dark default, `.light-mode` override). Spacing used: 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64. Radii: 8 (buttons), 16 (overlays), pill (Sonar nav item only).

## Assets & icons

- Bootstrap Icons 1.11 (`bootstrap-icons` npm or CDN). Icons used: bell, people, person, person-circle, gear, box-arrow-right, journal-text, search, graph-up, broadcast, bookmark, mortarboard, chevron-down/left/right, folder, exclamation-triangle, bullseye, list-ul, download, upload, plus-lg, easel, calculator, book, binoculars, file-earmark(-text), calendar-check, calendar3, paperclip, chat, clock-history, arrow-repeat, arrow-clockwise, arrow-counterclockwise, arrow-right, x, x-lg, check-circle, check-square, square, record-circle, circle, key, plus sidebar icons.
- `assets/ezana-nav-logo.png` from the design system (placeholder for the Walia ibex mark; use the app's current logo component).

## Files

- `Assignments.dc.html` design reference (inline-styled HTML; logic class at the bottom holds all sample data).
- `tokens.css` token definitions.
