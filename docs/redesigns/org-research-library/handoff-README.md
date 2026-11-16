<!-- Read from the Claude Design project https://claude.ai/design/p/bb814a83-89a4-4601-96ba-6727e9104d01, file design_handoff_research_library/README.md (163 lines), with get_page_text while paging the editor; wrapped lines re-joined. Em dashes and en dashes below are Claude Design's own text, kept verbatim; the build must not copy them into UI copy or comments. -->

# Handoff: Research Library (organizational), redesign

Route: `/org-team-hub/research-library` · Audience: university student-managed investment funds.

## Overview

The Research Library is where a fund's analysts draft, submit and publish research notes, and where managers review and publish them. The page shows library health KPIs, a review queue, the full library, onboarding exemplars, and a side column of coverage signals (Sonar reports, coverage handoffs, stale tickers, ticker dossier). A document detail panel and a new-note editor open as overlays.
**Scope:** this README covers only the page body to the right of the Team Hub sidebar. The top navigation bar and the Team Hub sidebar already exist in the app and must not be changed.

## About the design files

`Research Library.dc.html` is a **design reference built in HTML**, not production code. Recreate it in the app's existing environment (React/Next.js, existing CSS variables in `theme-variables.css`) using its established patterns. The file renders the page twice, dark mode then light mode; both share the same markup and differ only by token values. Open it directly in a browser. The template (markup between `<x-dc>` tags) holds all layout and inline styles; the `<script data-dc-script>` class holds sample data.

## Fidelity

**High fidelity.** Colours, type, spacing and states are final. Recreate pixel-accurately with app tokens.

## Page geometry (desktop, 1440px)

- Content edges: x=32 (left edge of Walia ibex logo) to x=1408 (right edge of logout icon).
- Sidebar 200px (x=32 to 232), full-height 1px `--ez-rule` hairline at x=232, 24px clear space, page body from x=257 to x=1408 (1151px). Grid: `200px 1px minmax(0,1fr)`, body has padding-left 24px.
- Page body vertical order: KPI strip → tabs row → search line → filter row → two-column content.
- Two-column content: `grid-template-columns: minmax(0,1fr) 1px 336px; column-gap: 24px` → main column 766px, full-height hairline, side column 336px. Padding-top 32px.
- Overlay panels (below page in the reference; in product they are a right-side drawer / modal): `grid 3fr 2fr`, gap 64px, padding 48px 32px.
- State strip: 3 equal columns separated by 1px `--ez-rule` with 24px clear space each side.

## Components (page body)

### KPI strip

Row, `justify-content: space-between`, padding-bottom 24px.

- 5 KPIs, 24px gap, no dividers (the wireframe's dividers were removed so all five fit on one line with the required 24px clear space). Labels and captions `white-space: nowrap`.
- Each KPI: 28×28 icon tile (no fill, no border; Bootstrap icon 16px, `--emerald-text`), then a stack: label 12px `--text-muted`; value **JetBrains Mono 18px/600** `--text-primary`; caption "(sample content)" 11px `--text-faint`.
- KPIs & icons: Published 38 `bi-journal-check` · Under review 6 `bi-hourglass-split` · My drafts 4 `bi-pencil-square` · Open review blocks 3 `bi-exclamation-octagon` · Stale tickers 5 `bi-clock-history`.
- Right group (gap 24px): "Sample content" 11px `--text-faint` over "Show council data" 13px + text toggle "On" / "Off" (selected = `--emerald-text` 600, other = `--text-muted`); "Export" plain text 13px/500 with `bi-box-arrow-up`; **New note** solid button: `--btn-primary-bg` / `--btn-primary-fg`, 13px/600, padding 10px 16px, radius 8px, `bi-plus-lg`. This is the only solid button in the group.

### Tabs row

Text tabs Library / Ticker / Lineage, 14px/600, gap 32px. Selected `--emerald-text`, others `--text-muted`. No underline bar, no pill. Row bottom 1px `--ez-rule`, padding 4px 0 14px.
Right: role note 12px `--text-muted`: "Manager view: review/publish" | 14px `--ez-rule` rule (24px clear each side) | "Analyst: drafts, submit for review".

### Search line

Borderless. `bi-search` (`--text-muted`) + placeholder "Search titles, abstracts, bodies, tickers, tags" 14px `--text-faint`, padding 16px 0. No box, no fill.

### Filter row

Top 1px `--ez-rule-subtle`, bottom 1px `--ez-rule`, padding 12px 0 16px. Six text selectors Type, Sector, Status, Term, Author, Ticker (13px/500 `--text-secondary` + `bi-chevron-down` 10px `--text-muted`), gap 32px. Right: search mode "Semantic" (selected, `--emerald-text`) / "Keyword" (`--text-muted`), 13px/600, gap 24px.

### Section header (shared)

Title 18px/700 `--text-primary`. Optional subtitle 12px `--text-muted` (numbers in mono). Optional right link 12px/600 `--emerald-text` + `bi-arrow-right`. Sections in the main column are separated by 1px `--ez-rule-subtle` and 32px padding.

### Table (shared)

- `table-layout: fixed`, full width, no outer border, no fill.
- Header: 11px/600, uppercase, letter-spacing 0.04em, `--text-muted`, padding-bottom 10px, bottom 1px `--ez-rule`. Last column right-aligned.
- Rows: padding 10–11px vertical, 8px right gutter, bottom 1px `--ez-rule-subtle`.
- Document/title cell 13px/600 `--text-primary`; text cells 13px `--text-secondary`; tickers mono 12px/600 `--text-primary`; numbers/dates/versions mono 12px `--text-secondary`.
- **Row hover: colour change only** — title cell turns `--emerald-text`. No background wash.

### Needs review

Subtitle "Awaiting review, 3 documents (sample content)". Columns (px, border-box): Document 190, Type 54, Ticker 54, Author 88, Version 58, Updated 96, Open blocks 104, Action rest (right-aligned). Open blocks in `--warning` ("2 open blocks"; count in mono). Action "Review" + `bi-arrow-right`, `--emerald-text` 600.

### Research library

Columns (px, border-box): Document 180, Type 48, Ticker 52, Status 90, Visibility 76, Term 64, Ver. 34, Files 38, Comments 70, Updated rest. Pinned rows first, with `bi-pin-angle-fill` 12px in `--gold` in a 12px slot before the title (unpinned rows keep the empty slot so titles align). Status is plain text: Published `--text-secondary`, Exemplar `--gold`, Under review `--warning`, Superseded `--text-faint`.

### Published exemplars

Subtitle "Cohort onboarding, 2 documents (sample content)". Columns: Document 340, Type 90, Ticker 90, Term 110, Updated rest. Gold pin before each title.

### Side column

- **Sonar research reports**: link "All reports". Subtitle "Latest from Sonar (sample content)". Columns Report 150, Status 90, Ver. 40, Verified (mono, e.g. 18/18).
- **Coverage handoffs**: link "Record handoff". Subtitle "Analyst coverage transitions (sample content)". Columns Ticker 50, From 80, To 80, Term 62, row link "Handoff →".
- **Stale coverage**: subtitle "No new document in ≥ 90 days (sample content)". Columns Ticker 60, Last document 116, Days 56 (mono 600 `--warning`), "90-day rule" 11px `--text-muted` right-aligned.
- **Quick dossier for ORIN** (ticker in mono `--emerald-text`): subtitle "Key research context (sample content)". Key/value rows `160px 1fr`, 8px padding, bottom `--ez-rule-subtle`: Documents 6, Distinct authors 4, First year 2024, Linked pitches 2. Links "Open dossier", "Summarize ticker" (gap 32px).

### Document detail panel (overlay)

Surface: `--bg-deep`, 1px `--ez-rule`, radius 12px, `--shadow-lg` (only overlays have a surface).

- Header 18px 24px padding, bottom `--ez-rule`: `bi-file-earmark-text` + "Document detail" 16px/700; close `bi-x-lg`.
- Body padding 24px, gap 24px.
- Title block `grid minmax(0,1fr) 1px 240px`, gap 24px: title 24px/700; meta row (gap 20px) ORIN (mono) · Report · v3 (mono) · Under review (`--warning` 600) · (sample content). Right of rule: "Review blockers (2)" `bi-exclamation-triangle` 14px/700 `--warning`; bullets "Missing abstract", "2 unresolved review comments".
- Text tabs Document (selected) / Files (2) / Versions (3) / Review (2); bottom `--ez-rule`.
- Summary & Source: label 11px uppercase `--text-muted`; body 14px/1.65 `--text-secondary`, max 680px.
- Files (2) table: Name 290px, nowrap with ellipsis (file icon `bi-file-earmark-spreadsheet` / `bi-file-earmark-pdf`), Uploader 130px, Kind 90px, Size 90px (mono), "Download" + `bi-download` (`--emerald-text`).
- Review thread (2): rows `28px 1fr auto`, gap 16px: `bi-chat-left`; author 14px/700 + timestamp mono 11px `--text-muted`; body 13px; "Open block" 12px/600 `--warning` text (no pill).
- Actions: **Publish** solid primary (`bi-upload`) **disabled** at opacity 0.4, `cursor: not-allowed`, with note "Resolve all review blockers to publish" 12px `--text-muted`. Right (gap 24px, plain text 13px/600): Resolve `bi-check2` (`--emerald-text`), Edit `bi-pencil`, Export PDF `bi-download`, Supersede `bi-arrow-repeat` (`--text-secondary`).

### New research note panel (overlay)

Same surface/header (`bi-file-earmark-plus`). Body gap 22px.

- Field = label (11px/600 uppercase `--text-muted`) + borderless value line (14px, padding 6px 0 8px) with a single 1px `--ez-rule-subtle` rule below. No box, no fill. Placeholders `--text-faint`.
- Selectors are text + `bi-chevron-down` 11px.
- Rows: Type (Report) | Template (Investment thesis); Title; Abstract (min-height 64px, "Add a 2-5 sentence abstract (required for publishing)"); Body (min-height 88px); Ticker (ORIN, mono) | Sector (Technology) | Term (2026 S2, mono); Visibility text options Whole org (selected) / My team / Private; Source; Linked pitch (optional) "Select a pitch…".
- "Attachments are available after the first save." with `bi-paperclip`, 13px `--text-muted`.
- Footer: top `--ez-rule`, right-aligned, gap 24px: "Save draft" plain text; **Save and publish** solid primary.

### State examples strip

- Loading: `bi-arrow-repeat` (spin in product) + "Loading documents…"
- Empty: `bi-search` + "No documents match your filters" + link "Clear filters"
- Error: `bi-exclamation-triangle` (`--warning`) + "Could not load library" + link "Retry"
  These replace the tables' body area when applicable (loading: keep headers; empty/error: centred message in the main column).

## Interactions & behavior

- Tabs (Library / Ticker / Lineage), detail tabs, search mode, visibility, council-data toggle: single-select text controls; selected = `--emerald-text`.
- Filter selectors open dropdown menus (existing app menu component); active filter values append to label, e.g. "Status: Under review".
- Search: debounced (300ms) query against titles, abstracts, bodies, tickers, tags; Semantic vs Keyword switches backend mode.
- Row click (any table) opens Document detail. "Review" opens detail on the Review tab.
- New note opens editor. Save draft → creates draft (enables attachments). Save and publish → validates (title, abstract required) then publishes; managers only.
- Publish is disabled while review blockers > 0. Resolve marks the selected open block resolved. Supersede creates a new version linking the old one (old becomes Superseded).
- Role: Managers see review/publish actions; analysts see drafts and "Submit for review" instead of Publish.
- Hover: rows change title colour to `--emerald-text`; links go `--emerald-text` → `--emerald`. No background washes, no transitions longer than 150ms.
- Overlays: Esc and `bi-x-lg` close; focus trapped while open.

## State management

`activeTab`, `query`, `searchMode`, `filters{type,sector,status,term,author,ticker}`, `showCouncilData`, `documents` + `loading` + `error`, `reviewQueue`, `selectedDocId`, `detailTab`, `editorOpen`, `draft{type,template,title,abstract,body,ticker,sector,term,visibility,source,linkedPitchId}`, `role`.

## Design tokens

| Token                       | Dark                       | Light                      |
| --------------------------- | -------------------------- | -------------------------- |
| --bg-primary                | #0a0e13                    | #ffffff                    |
| --bg-deep (overlay surface) | #0f1419                    | #ffffff                    |
| --text-primary              | #f0f6fc                    | #0f172a                    |
| --text-secondary            | #e2e8f0                    | #1e293b                    |
| --text-muted                | #8b949e                    | #64748b                    |
| --text-faint                | #6b7280                    | #94a3b8                    |
| --emerald                   | #10b981                    | #059669                    |
| --emerald-text              | #34d399                    | #047857                    |
| --positive                  | #10b981                    | #059669                    |
| --negative                  | #ef4444                    | #dc2626                    |
| --warning                   | #fbbf24                    | #d97706                    |
| --gold (pins, Exemplar)     | #d4a853                    | #b8922f                    |
| --btn-primary-bg            | #10b981                    | #059669                    |
| --btn-primary-fg            | #0a0e13                    | #ffffff                    |
| --ez-rule                   | rgba(240,246,252,0.10)     | rgba(15,23,42,0.12)        |
| --ez-rule-subtle            | rgba(240,246,252,0.06)     | rgba(15,23,42,0.07)        |
| --shadow-lg                 | 0 8px 32px rgba(0,0,0,.40) | 0 8px 24px rgba(0,0,0,.08) |

If the app already defines `--emerald-text`, `--btn-primary-*`, `--ez-rule*`, use the app values; the values above are the reference defaults.
Type: Plus Jakarta Sans for all text; JetBrains Mono for every number, date, version, file size and ticker. Scale: section title 18/700, panel doc title 24/700, body 14, table cell 13, table header & field label 11/600 uppercase 0.04em, meta 12, caption 11, KPI value mono 18/600.
Spacing: 64px between side-by-side sections, 24px clear beside any vertical rule, 32px between stacked sections, 24px overlay padding. Radius: 8px buttons, 12px overlay panels only.

## Icons

Bootstrap Icons 1.11 only: search, chevron-down, arrow-right, plus-lg, box-arrow-up, journal-check, hourglass-split, pencil-square, exclamation-octagon, clock-history, pin-angle-fill, file-earmark-text, file-earmark-plus, file-earmark-spreadsheet, file-earmark-pdf, x-lg, exclamation-triangle, download, upload, chat-left, check2, pencil, arrow-repeat, paperclip.

## Audit changes applied (wireframe → Ezana guide)

1. KPI vertical dividers removed so the strip fits on one line. KPI labels changed from uppercase to sentence case 12px; 28px no-fill icon tiles added; values in mono 18px.
2. "Show council data" switch track replaced by text toggle On / Off.
3. Export kept as plain text; New note is the single solid primary.
4. Tab underline bars (page and detail panel) removed; selection is emerald text only.
5. Search mode "Semantic" filled pill removed; text only.
6. Mono uppercase subtitles ("AWAITING REVIEW, 3 DOCUMENTS…", "COHORT ONBOARDING, …") set in sentence case Plus Jakarta Sans; em dashes replaced with commas.
7. Emerald row wash on the first Needs review row removed; hover is colour only.
8. Uppercase links "ALL REPORTS →", "RECORD HANDOFF →" set in sentence case; text arrows replaced with `bi-arrow-right`.
9. "Quick dossier, ORIN" heading → "Quick dossier for ORIN" (em dash removed).
10. Warning glyph removed from "Under review" status; statuses are plain coloured text.
11. All dates, versions, counts, sizes, terms and tickers switched to JetBrains Mono (several were sans in the wireframe).
12. Exemplar titles no longer gold text; gold kept for pin icons and Exemplar status.
13. Detail panel: ORIN and Under review pills and Open block pills removed (plain text).
14. Outlined buttons Resolve, Edit, Export PDF, Supersede, Save draft converted to plain text; Publish (disabled) and Save and publish are the only solid buttons in their groups; grey disabled fill replaced by emerald at 40% opacity.
15. Boxed inputs and selects in the editor replaced with borderless fields over a single hairline; radio circles replaced by text options.
16. Em dashes removed from state strip copy; "Clear filters" and "Retry" are separate links. Spinner drawn with `bi-arrow-repeat`.
17. Content edges set to x=32 / x=1408; 24px clear space added beside every vertical rule (sidebar, column split, KPI dividers, role note, review blockers, state strip); 64px gap between the overlay panels.
18. "2–5" / "3–5" en dash ranges written as "2-5" / "3-5".
19. Only design-system tokens used; light mode added with the same layout.

## Assets

`assets/ezana-nav-logo.png` (Walia ibex mark, from Ezana Finance Design System). Fonts from Google Fonts. Icons from Bootstrap Icons CDN.

## Files

- `Research Library.dc.html` — full HTML/CSS source (inline styles; token definitions in the `<style>` block under `[data-theme]`; sample data in the logic class).
- `assets/ezana-nav-logo.png`
