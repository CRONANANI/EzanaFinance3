# Handoff: Sonar Research (organizational, `/org-team-hub/sonar`)

<!-- Transcribed by the stage 2 agent from design_handoff_sonar_research/README.md in Claude Design project https://claude.ai/design/p/8039cbb8-10cb-49ca-bedc-e19f3a6309fa, read on screen with get_page_text while paging the editor (JavaScript is blocked on claude.ai). Wrapped lines rejoined. The HTML/CSS source files (.dc.html) could not be downloaded. -->

## Overview

Redesigned Sonar Research page for university student-managed investment funds. Analysts run, save and submit deep research; reviewers approve, return and comment; executives set the budget pool and allocations. This README covers **only the page body to the right of the Team Hub sidebar**. The top navigation bar and the Team Hub sidebar are existing app shell and must not be rebuilt; the Sonar answer is an existing component and is shown as a placeholder only.

## About the design files

The `.dc.html` files are **design references built in HTML**, not production code. Recreate them in the Ezana Next.js codebase using its existing patterns (Tailwind, `src/components/ui/*`, theme variables in `src/app/theme-variables.css`). Open `Sonar Research.dc.html` in a browser to see dark (1a) and light (1b) side by side; `SonarResearchPage.dc.html` is the page itself (prop `theme: 'dark' | 'light'`, `showOverlays: boolean`).

## Fidelity

High fidelity. Final colors, type, spacing and interactions. Match pixel values below.

## Page geometry (1440px desktop)

- Nav bar: full width, 64px high, content from x=32 (left edge of logo) to x=1408 (right edge of logout icon). Bottom hairline `--ez-rule`.
- Sidebar (existing): x=32 to x=232, 200px, right hairline `--ez-rule`, full height of the body.
- **Page body**: x=256 (24px right of the sidebar hairline) to x=1408. Width 1152px. Top padding 24px.
- Body columns: CSS grid `minmax(0,1fr) 1px 340px`, `column-gap: 32px`. Left column ≈747px, one full-height 1px hairline (`--ez-rule`), right column 340px. This gives 64px between the two columns with 32px (≥24px) clear space on each side of the rule.
- Overlays block: 48px below the columns. Report view at x=32, width 1168px. Save to fund dialog at x=992, width 416px, 40px lower than the report view, overlapping its right side (z-index above).

## Layout rules (from the Ezana branding and UI guide)

- Sections are flat: no fill, border, shadow or radius. Separation is by hairlines only (`--ez-rule` strong, `--ez-rule-subtle` row dividers).
- Only overlays (report view, dialog, dropdown menus) have surface `--bg-deep`, 1px `--ez-rule` border, shadow (`--shadow-xl` for panels, `--shadow-lg` for menus), radius (`--radius-xl` panels, `--radius-md` menus).
- Tabs, toggles and selectors are text only. Selected = `--emerald-text`; unselected = `--text-muted` (tabs, toggles) or `--text-secondary` (menu items). No underline bar, pill, track, radio dot or box.
- One solid primary button per group (`--btn-primary-bg` / `--btn-primary-fg`, radius `--radius-md`). Every other action is plain text (600 weight).
- Search and text fields are borderless and transparent; field rows are separated by `--ez-rule-subtle` list hairlines.
- No boxes around chips or labels. Status is icon + colored text.
- Row hover changes text color to `--emerald-text`. No background wash.
- Fonts: Plus Jakarta Sans for text; JetBrains Mono for every number, date, version, ticker and pitch ID.
- Copy: sentence case, no em dashes, `N/A` for missing values, signed percentages where percentages appear, no wording that reads as investment advice.
- Icons: Bootstrap Icons 1.11.3 only.

## Components (page body)

### 1. KPI strip

Flex row, `justify-content: space-between`, actions on the right.

- 6 KPI cells + sample content cell. Each cell: column, `gap 6px`, `padding 0 10px`; cells after the first have a 1px `--ez-rule-subtle` left hairline.
- Icon tile: 28×28, radius `--radius-md`, background `--emerald-bg`, icon 14px `--emerald-text`.
- Label: 12px/400 `--text-muted`, nowrap. Value: JetBrains Mono 18px/600 `--text-primary`, line-height 24px.
- Cells: Awaiting review `12` (bi-inbox) · My drafts `5` (bi-pencil-square) · Returned to me `3` (bi-arrow-return-left) · Approved this term `37` (bi-check2-circle) · Budget left `64 / 100` (bi-wallet2) · Stale coverage `8` + bi-exclamation-triangle 14px `--warning` (bi-hourglass-split) · Sample content (bi-eye) with text toggle `On` `Off` (13px/600, gap 10px).
- Actions (gap 16px): `Open main Sonar`, `Budget settings` (text, 13px/600 `--text-secondary`, hover `--emerald-text`), `Run deep research` primary (h36, padding 0 16px, 13px/700, bi-broadcast).

### 2. Role legend

20px below strip, 12px `--text-muted`. Three items, each with a 600 `--text-primary` lead: "Analyst view: run, save, submit", "Reviewer view: approve, return, comment", "Executive view: set budget pool and allocations". Separated by 1px×14px `--ez-rule` vertical rules with 24px margin each side.

### 3. Tabs

24px below legend. `Reports`, `Research`, `Analytics`, 14px/600, gap 32px, padding-bottom 12px, bottom hairline `--ez-rule-subtle`. Selected `--emerald-text`, others `--text-muted`.

### 4. Filter row

Padding 12px 0, bottom hairline `--ez-rule-subtle`, gap 24px.

- Borderless search (flex 1): bi-search 14px `--text-muted`, placeholder "Search reports, questions, tickers, authors", 13px.
- Menus: Status, Kind, Visibility, Ticker, Mine. 13px/500 `--text-secondary` + bi-chevron-down 10px. When a value other than All is set, the label reads `Status: Approved` in `--emerald-text`.
- Menu overlay: absolute, top 28px, left -12px, min-width 180px, padding 6px, items 7px 10px.
- Status: All, Draft, Under review, Approved, Returned, Superseded
- Kind: All, Company, Thematic, Fund fit, Open question
- Visibility: All, Team, Council, Fund
- Ticker: All + tickers in view
- Mine: All, Authored by me, Reviewing, Assigned to me
- Result count: mono 12px `--text-muted`, "58 results". `Clear filters`: text 600 `--emerald-text`.

### 5. Left column: Needs you

- Section title "Needs you" 18px/700 `--text-primary`, letter-spacing -0.01em.
- Table titles 15px/600 `--text-primary` with count in mono 500 `--text-muted`: "Awaiting my review (4)" (16px top), "Returned to me (3)", "Research archive (37)", "Recent research attached to pitches (5)" (32px top each).
- Table spec: `border-collapse: collapse; width: 100%`. Header 11px/600 uppercase, letter-spacing 0.06em, `--text-muted`, padding 8px 8px 8px 0, bottom 1px `--ez-rule`. Cells 13px, padding 10px 8px 10px 0, bottom 1px `--ez-rule-subtle`. Last column right aligned, padding-right 0. Report name 500 weight, wraps (column ~150px). Ticker mono 600. Version, claims, dates mono 12px. Pitch link: bi-link-45deg + mono 12px `--emerald-text`. Row action (`Review`, `Edit`) 600 `--emerald-text`.
- Awaiting my review columns: Report, Kind, Ticker, Author, Version, Claims verified, Pitch link, Updated, Action.
- Returned to me columns: Report, Kind, Ticker, Author, Version, Note (190px, `--text-muted`), Updated, Action.
- Research archive columns: Report, Status, Visibility, Author, Version, Collections, Challenges, Claims verified, Updated. Status = icon + text: Approved bi-check2-circle `--positive`; Under review bi-clock `--warning`; Draft bi-file-earmark `--text-secondary`; Superseded bi-layers `--text-muted`. Superseded row has an 11px `--text-muted` sub line "Mandate screen: fits (superseded)". Missing challenges = `N/A`.
- Recent research attached to pitches columns: Pitch, Report, Ticker, Kind, Added by, Updated.
- State lines (20px below, gap 10px, 13px `--text-muted`, 14px icons): bi-arrow-repeat "Loading more results"; bi-file-earmark "No reports match your filters. Try adjusting your filters."; bi-exclamation-triangle (`--warning`) "Couldn't load reports." + `Retry` text action.

### 6. Right column (sections 48px apart)

- **Start research**: title 18/700. Text toggle `Fund fit` / `Open question` (13/600, gap 24, 12px top). Three borderless field rows (padding 10px 0, bottom hairline subtle, icon + input): bi-search "Company or ticker (e.g., MTRX)" (becomes "Your question" in Open question mode), bi-file-text "Notes (optional)", bi-link-45deg "Linked pitch (optional, e.g., P-143)". Budget line 12px `--text-muted` "One deep run is used from the monthly fund pool." Primary `Run deep research` full width, h40.
- **Fund budget**: title + `Edit allocations` text action right. Key/value rows (padding 7px 0, subtle hairline; value mono 600 `--text-primary`): Pooled deep-research budget `64 / 100 left`, Reset date `Feb 01, 2026`, My allocation `10`, My runs `6 / 10`. "Usage (last 6 months)" 12px muted. Bars: flex, align-end, gap 20, height 104; each bar 28px wide, height = runs × 3px, fill `--emerald`, no radius; value above and month below in mono 11px. Aug 12, Sep 18, Oct 14, Nov 16, Dec 20, Jan 16.
- **Coverage at risk**: subtitle "Approved research stale after 120 days (8)". Table: Ticker (bi-exclamation-triangle `--warning` + mono 600), Last approved (mono 12), Days stale (mono 12/600 `--warning`, right), Owner (right). Rows padding 8px.
- **Research quality**: subtitle "Council members (executives and managers see all)". Table: Member, Reports approved, Claims verified, Challenges upheld (numbers right, mono 12).

### 7. Report view (overlay)

Padding 24px 28px 28px. Content max ~910px wide (right side sits under the dialog in this composite).

- Meta line 12px: bi-building Company · `MTRX` mono 600 · 1px×14px rule (24px margins) · bi-check2-circle Approved `--positive` · bi-lock Council. Close bi-x-lg 14px `--text-muted` right.
- Title 22px/700 `--text-primary`, letter-spacing -0.015em.
- Author: **Ivy Chen** · Reviewer: **Morgan Ellis** · Approved version: **`v2.1`** (labels `--text-muted`, values 600 `--text-primary`, gap 32).
- "Review note: well supported with clear sources and updated data."
- bi-link-45deg Pitch: `P-143` · bi-collection Collections: tech, fund fit (links `--emerald-text`).
- Action row (16px top, gap 20, 12px/600 `--text-secondary`): `Review` primary (h32), Submit for review, Withdraw to draft, Mark superseded, Challenge conclusion, Sharing and links ▾, Collections ▾, Delete draft (`--negative`).
- Version picker (text selector): "Version:" muted + `v2.1 (approved)` mono `--emerald-text` + chevron; menu lists v2.1 (approved), v2.0, v1.2, v1.0.
- Grid `560px 1px 320px`, column-gap 24px, 16px top:
  - Sonar answer placeholder: 340px tall, 1px dashed `--ez-rule`, centered label "Sonar answer". Mount the existing Sonar answer component here unchanged.
  - Hairline `--ez-rule`.
  - Comments: "Comments" 15/700 + `Hide resolved` / `Show resolved` text action. "Part:" + text selector (Whole report, Summary, Thesis, Evidence, Risks, Sources). Borderless comment field (bi-chat-left-text, "Add a comment"). Comment items (padding 14px 0, subtle hairline): 32px avatar circle `--emerald-bg` with initials 11/700 `--emerald-text`; name 600; timestamp mono 11 muted; body 13 `--text-secondary`; actions 12/600 `--emerald-text`: Resolve or Reopen, Reply. Resolved comment shows bi-check2 "Resolved" in `--positive` top right.

### 8. Save to fund dialog (overlay)

Width 416, padding 24. Title "Save to fund" 18/700 + close. Description muted. "Save as" grid (88px label column): text options `New report` / `New version (update existing)`. Title field (12px muted label, borderless input 14/600, value "MetroTech fund fit analysis"). Visibility text selector `Council` ▾. Checks as text + icon: bi-check2-square (on, `--emerald-text`) / bi-square (off, `--text-muted`): "Supports a pitch (link after saving)" (on), "Save as draft (do not submit for review)" (off). Footer right, gap 24: `Cancel` text, `Save` primary h36.

## Interactions and behavior

- Tabs, Fund fit / Open question, Sample content On/Off, Save as, checks: click sets selection; selected text turns `--emerald-text`. No transitions beyond instant color change.
- Filter menus: click label toggles menu; selecting closes it and updates label + result count. `Clear filters` resets all menus.
- Sample content Off: all tables empty, each shows "No sample content. Turn sample content on to preview rows."; result count `0`.
- Row hover: text color to `--emerald-text`; whole row clickable (opens report view). Text actions hover to `--emerald-text`. Links underline on hover.
- Comments: Resolve/Reopen toggles resolved state; Hide resolved filters resolved comments out.
- Version and Part pickers open menus; selecting closes them.
- Report view and dialog are modal overlays (dim with `--bg-overlay` in production; dim omitted in the composite reference). Escape and the close icon dismiss.
- Loading: inline "Loading more results" line at the end of the list (infinite scroll). Error: inline line with Retry.
- Role-based visibility: analyst sees run/save/submit; reviewer sees Review/return/comment; executive sees Budget settings and Edit allocations.

## State

`tab`, `mode` (fund|open), `sample`, `openMenu`, `filters{status,kind,visibility,ticker,mine}`, `saveAs` (new|version), `supports`, `draft`, `resolved{commentId:boolean}`, `showResolved`, `version`, `versionOpen`, `part`, `partOpen`. Data: reports list (paginated, filtered server side), returned list, archive, pitch attachments, budget pool (pool, used, reset date, allocation, my runs, 6-month usage), stale coverage (threshold 120 days), member quality stats, comments per report part.

## Design tokens

App token names, mapped to Ezana design-system values.

| Token                                           | Dark                         | Light                        |
| ----------------------------------------------- | ---------------------------- | ---------------------------- |
| `--bg-primary`                                  | #0a0e13                      | #ffffff                      |
| `--bg-deep` (overlay surface)                   | #0f1419                      | #ffffff                      |
| `--text-primary`                                | #f0f6fc                      | #0f172a                      |
| `--text-secondary`                              | #e2e8f0                      | #1e293b                      |
| `--text-muted`                                  | #8b949e                      | #64748b                      |
| `--text-faint`                                  | #6b7280                      | #94a3b8                      |
| `--emerald`                                     | #10b981                      | #059669                      |
| `--emerald-text`                                | #10b981                      | #047857                      |
| `--emerald-bg` (icon tiles, avatars)            | rgba(16,185,129,0.08)        | rgba(16,185,129,0.06)        |
| `--positive`                                    | #10b981                      | #059669                      |
| `--negative`                                    | #ef4444                      | #dc2626                      |
| `--warning`                                     | #fbbf24                      | #d97706                      |
| `--btn-primary-bg`                              | #10b981                      | #065f46                      |
| `--btn-primary-fg`                              | #0a0e13                      | #ffffff                      |
| `--ez-rule`                                     | rgba(16,185,129,0.20)        | rgba(0,0,0,0.12)             |
| `--ez-rule-subtle`                              | rgba(16,185,129,0.10)        | rgba(0,0,0,0.08)             |
| `--shadow-lg`                                   | 0 8px 32px rgba(0,0,0,0.40)  | 0 8px 24px rgba(0,0,0,0.08)  |
| `--shadow-xl`                                   | 0 20px 60px rgba(0,0,0,0.45) | 0 16px 48px rgba(0,0,0,0.10) |
| `--radius-md` / `--radius-xl` / `--radius-pill` | 8px / 16px / 9999px          | same                         |

Type: Plus Jakarta Sans (400/500/600/700); JetBrains Mono (400–700, tabular). Sizes: 22 report title, 18 section titles/700, 15 table titles/600, 14 tabs, 13 body/table cells, 12 meta/labels, 11 table headers (uppercase, 0.06em). Spacing: 4-base (6, 8, 10, 12, 16, 20, 24, 32, 48, 64).

CSS reference (token scope used in the prototype):

```css
[data-ez-page] {
  --emerald: #10b981;
  --emerald-hover: #34d399;
  --emerald-dark: #047857;
  --emerald-bg: rgba(16, 185, 129, 0.08);
  --bg-primary: #0a0e13;
  --bg-deep: #0f1419;
  --text-primary: #f0f6fc;
  --text-secondary: #e2e8f0;
  --text-muted: #8b949e;
  --text-faint: #6b7280;
  --border-input: rgba(16, 185, 129, 0.1);
  --border-hover: rgba(16, 185, 129, 0.2);
  --positive: #10b981;
  --negative: #ef4444;
  --warning: #fbbf24;
  --emerald-text: var(--emerald);
  --btn-primary-bg: var(--emerald);
  --btn-primary-fg: var(--bg-primary);
  --ez-rule: var(--border-hover);
  --ez-rule-subtle: var(--border-input);
}
[data-ez-page][data-ez-theme='light'] {
  --emerald: #059669;
  --emerald-hover: #047857;
  --emerald-dark: #065f46;
  --bg-primary: #fff;
  --bg-deep: #fff;
  --text-primary: #0f172a;
  --text-secondary: #1e293b;
  --text-muted: #64748b;
  --text-faint: #94a3b8;
  --border-primary: rgba(0, 0, 0, 0.08);
  --border-input: rgba(0, 0, 0, 0.12);
  --positive: #059669;
  --negative: #dc2626;
  --warning: #d97706;
  --emerald-text: var(--emerald-hover);
  --btn-primary-bg: var(--emerald-dark);
  --ez-rule: var(--border-input);
  --ez-rule-subtle: var(--border-primary);
}
```

In the codebase, use the existing `theme-variables.css` values for these names where they already exist.

## Icons (Bootstrap Icons 1.11.3)

inbox, pencil-square, arrow-return-left, check2-circle, wallet2, hourglass-split, eye, exclamation-triangle, broadcast, search, chevron-down, link-45deg, clock, file-earmark, layers, arrow-repeat, file-text, building, lock, collection, x-lg, chat-left-text, check2, check2-square, square.

## Audit changes applied to the wireframe

1. All lowercase copy changed to sentence case (KPI labels, buttons, filters, placeholders, dialog).
2. Body inset to x=256 to x=1408; column split given 32px clear space each side of the rule (64px between columns).
3. Nav bar aligned to x=32 to x=1408; Sonar drawn as a filled emerald pill (was outlined); logout icon red; profile and settings icons emerald.
4. KPI strip: 28px emerald-tint icon tiles added, labels 12px, values JetBrains Mono 18px, hairlines between cells.
5. Sample content switch track replaced with text toggle On / Off.
6. Underline bars removed from Reports tab and Fund fit toggle; selection is emerald text only.
7. Boxes removed from the comment field, version picker, part selector, dialog title field and visibility select.
8. Radio buttons and checkboxes in the dialog replaced with text selectors and Bootstrap check icons.
9. Primary button text changed from white to `--btn-primary-fg` (white on #10b981 failed contrast); light mode primary uses `--emerald-dark`.
10. Author and reviewer names changed from monospace to Plus Jakarta Sans; comment timestamps, budget figures, dates, versions, counts and pitch IDs set in JetBrains Mono.
11. Missing challenge value "–" changed to N/A.
12. Unicode check mark and warning glyphs replaced with Bootstrap Icons.
13. Underlines removed from pitch links and the "hardware" collection (now consistent plain text / emerald links, underline on hover only).
14. Sonar answer placeholder text replaced with the single label "Sonar answer"; its filled panel replaced with an unfilled dashed outline.
15. Table headers set to 11px uppercase in `--text-muted` (wireframe grey failed 4.5:1).
16. Delete draft styled as destructive text (`--negative`).
17. Ellipses removed from "Loading more results" and "Add a comment" placeholders.

## Assets

- `assets/ezana-nav-logo.png` from the Ezana design system. The wireframe shows the Walia ibex mark; swap in the production ibex logo from the codebase.

## Files

- `SonarResearchPage.dc.html`: full page (template + logic). Props `theme`, `showOverlays`.
- `Sonar Research.dc.html`: dark and light side by side.
