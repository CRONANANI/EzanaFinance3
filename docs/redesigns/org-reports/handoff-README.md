# Handoff: Ezana Reports (organizational Team Hub)

(Transcribed from design_handoff_org_reports/README.md in Claude Design project https://claude.ai/design/p/3e5b0108-c7e2-4811-a77d-72e658579910, read with get_page_text while paging the editor; wrapped lines re-joined. Content is Claude Design's, unedited apart from line joins.)

## Overview

Redesigned Reports page at `/org-team-hub/reports` for university student-managed investment funds ("investment councils"). Executives, portfolio managers and faculty advisors generate frozen stakeholder reports for deans, donors and advisory boards, open their printable versions, compare saved snapshots, and delete old ones. Analysts are told the page is for managers only.

## About the design files

The files in this bundle are **design references built in HTML**. They show the intended look and behaviour; they are not production code to ship. Recreate them in the target codebase (the Ezana Next.js app) with its existing patterns, components and theme variables (`src/app/theme-variables.css`). If no environment exists, pick the most suitable framework and build there.

## Fidelity

**High fidelity.** Final colours, type, spacing, copy and interactions. Recreate to the pixel at 1440px wide.

## Global rules (from the audit, binding)

- Flat sections: no card fill, border, shadow or radius. Hierarchy comes from type and hairline rules.
- Horizontal alignment: content runs from x=32 (left edge of the logo) to x=1408 (right edge of the logout icon). Page padding is 32px.
- 64px between side-by-side sections; when a vertical rule separates them it sits centred, leaving 32px clear each side (24px minimum beside any vertical rule).
- Tabs, toggles and selectors are text only: selected = `--emerald` text, unselected = `--text-muted`. No underline bar, pill or track.
- One solid emerald primary button per group; its text uses `--bg-primary` (the design system has no primary-fg token). Every other button is plain text.
- Search and text fields are borderless (no border, no fill, no focus ring box). Icon + input only.
- No boxes around chips or labels.
- Icons: Bootstrap Icons only (`bootstrap-icons@1.11.3`).
- Type: Plus Jakarta Sans for text; JetBrains Mono for every number, date and ticker.
- KPI values: 18px JetBrains Mono.
- Row hover changes text colour only (to `--emerald`). Never a background wash or accent bar.
- Sentence case. No em dashes. Signed percentages (`+46.73%`), differences in points (`+36.65 pts`), `N/A` for missing values.
- Every return is labelled "Gain on cost, not time-weighted". Every difference to benchmark states that fund and benchmark use the same window.
- Disclosure, used verbatim in the preview, printable report, every saved row and the dialogs:
  "Gain on cost of current holdings, not time-weighted. Benchmark measured over the same dates. Unaudited, student-prepared, descriptive only. Past results do not predict future outcomes."

## Screens / views

### 1a / 1b. Main page (dark default, light via `.light-mode`)

Width 1440. Structure top to bottom:

**Navigation bar** (`Ezana Nav.dc.html`), height 64, padding 0 32, background `--bg-primary`, 1px bottom border `--border-primary`.

- Left: brand mark `assets/ezana-nav-logo.png` 28px high, mirrored (`scaleX(-1)`), "Ezana Finance" 16/700 `--text-primary`, -0.01em; then bell icon (`bi-bell`, 18px, `--text-muted`) with a 7px `--negative` dot. Gap 24.
- Centre links, 14px, gap 24, icon + label gap 8: Team Hub (`bi-people`, active: `--emerald`, 600), Research (`bi-search`, `bi-chevron-down` 10px), Trading (`bi-graph-up-arrow`, chevron), **Sonar** (`bi-broadcast`) as filled pill: background `--emerald`, text `--bg-primary`, 600, padding 8/16, radius `--radius-pill`; Watchlist (`bi-bookmark`), Learning center (`bi-mortarboard`). Inactive `--text-muted`, hover `--text-primary`.
- Right, 20px icons, gap 20: profile `bi-person-circle`, settings `bi-gear` (`--text-muted`), logout `bi-box-arrow-right` in `--negative`; its right edge lands at x=1408.

**Body**: padding 32 32 64, sections stacked with 48 gap.

Top block: grid `224px 1px 1fr`, column-gap 32 (sidebar, rule `--emerald-border`, main column starting at x=321).

**Sidebar** (`Team Hub Sidebar.dc.html`, 224 wide):

- User: 40px circle `--emerald-bg-hover` with initials in `--emerald` 14/700; name 15/600 `--text-primary`; role 12px `--emerald` ("Portfolio manager").
- Items 14px, padding 8/0, gap 4, icon 16px `--text-muted`, label `--text-secondary`, counts JetBrains Mono 12px `--text-muted` right-aligned. Hover: text `--emerald`. Selected (Reports): text and icon `--emerald`, 600, `aria-current="page"`, no background.
- Items and icons: Command center `bi-speedometer2`, Trading desk `bi-bank`, Fund analytics `bi-graph-up`, Assignments `bi-clipboard-check` 4/6, Org chart `bi-diagram-3`, Pitch pipeline `bi-easel` 6, Research library `bi-journal-bookmark` 4, Sonar research `bi-broadcast`, Meetings `bi-camera-video` 2, Recognition `bi-award`, Grades `bi-journal-check` 1, Competitions `bi-trophy`, Council rankings `bi-bar-chart-steps`, Cohorts `bi-people`, Compliance `bi-shield-check`, Reports `bi-file-earmark-text`, Team permissions `bi-key`.

**Main column** (flex column, gap 32):

1. Header row (space-between). Left, gap 24: "Sample content" (600, `--emerald`; reads "Council data" when the toggle is On) | 1x20 rule | "Show council data" + text toggle "On" / "Off" (gap 12, 600). Right, gap 24: primary button "Generate report" (padding 10/18, radius `--radius-md`, 14/600, hover `--emerald-hover`), then "Refresh" plain text (`--text-secondary`, hover `--emerald`).
2. KPI strip: grid of 5 equal columns. Each item: Bootstrap icon 20px `--emerald`, label 13px `--text-muted`, value 18px mono. Items 2 to 5 have a 1px left rule `--emerald-border` and 24px padding each side of each rule.
   - Reports saved `bi-file-earmark-text` 3 · Latest fund value `bi-stack` $240,050.00 · Gain on cost `bi-graph-up-arrow` +46.73% (`--positive`) · SPY `bi-bar-chart` +10.08% (`--positive`) · Positions `bi-box` 12.
   - Caption 12px `--text-muted`: "From the latest report, Nov 15, 2026. Gain on cost, not time-weighted. Fund and SPY window: Feb 3, 2026 (earliest holding) to Nov 15, 2026."
3. 1px rule `--emerald-border`.
4. Two columns: grid `1fr 1px 1.25fr`, column-gap 32 (left about 454, right about 568).
   - **Left, "Generate report"** (h2 20/600, -0.01em), gap 24:
     - Period label: label 13px `--text-muted`; borderless input with `bi-pencil` icon, 14px `--text-primary`, placeholder "Period label, e.g. Fall 2026" in `--text-ghost`. Default "Fall 2026 midterm".
     - Text toggles in a 3-column grid: "Include roster Yes No", "Include analyst names Yes No".
     - Hairline `--border-primary`.
     - "What will be saved" (h3 16/600) key/value grid `168px 1fr`, gap 8/16, 13px; keys `--text-muted`, values `--text-primary`: Council name Sample council; Period label (live); Cohort 2026 analyst class; Generated by Selam Haile; Fund value $240,050.00; Gain on cost of current holdings +46.73% + note "Gain on cost, not time-weighted. Since inception."; Window Feb 3, 2026 (earliest holding) to Nov 15, 2026; Benchmark SPY +10.08% "same window, gain on cost, not time-weighted"; Difference to benchmark +36.65 pts "fund and benchmark use the same window"; Positions held 12; Sector attribution "By sector, contribution to gain on cost"; Pitch outcomes "Top 3 pitches with analyst"; Roster Included/Not included; Analyst names Included/Not included.
     - Hairline.
     - "Pre-save checks": `bi-check2` `--emerald` + 13px text: Unpriced holdings: 1 valued at cost · Benchmark source: SPY price history · Missing sectors: 0 · Author visibility: included · Roster visibility: included.
     - Primary "Generate stakeholder report" (15/600, padding 12/20) opens the generate dialog.
     - 13px `--text-muted`: "Managers only. Analysts cannot open or generate reports." / "Openable by executives, portfolio managers, and faculty advisors."
   - **Right, "Latest printable report preview"** + "Open printable report" text link (600 `--emerald`). Below, the 820px printable report scaled to the column (zoom 0.6927, about 568/820).
5. **Saved reports (3)**, full width (x=32 to 1408), top rule `--emerald-border` with 32 padding-top. Grid columns `2.4fr 1.15fr .95fr 1fr 1fr 1fr 1fr .95fr .9fr .6fr 1.75fr`, gap 16. Header 12px `--text-muted`: Report, Period, Generated, Generated by, Cohort, Fund value, Gain on cost (not time-weighted), Benchmark, Difference, Positions, Actions. Each row 14px, padding 14/0, bottom hairline; under it a 12px `--text-muted` disclosure line with the row window. Actions: "Open printable report" (`--emerald` 600) and "Delete" (`--negative` 600), gap 16.
   - Fall 2026 midterm · Nov 15, 2026 · Selam Haile · $240,050.00 · +46.73% · SPY +10.08% · +36.65 pts · 12 · window Feb 3, 2026 (earliest holding) to Nov 15, 2026
   - Fall 2026 · Oct 31, 2026 · Chidi Okoye · $232,410.00 · +41.28% · SPY +8.64% · +32.64 pts · 11 · Feb 3, 2026 to Oct 31, 2026
   - Advisory board edition · Sep 30, 2026 · Ingrid Lindqvist · $225,320.00 · +37.90% · SPY +7.15% · +30.75 pts · 12 · Feb 3, 2026 to Sep 30, 2026
   - Report names: "Sample council fund report, {period}". Cohort: 2026 analyst class.
6. **Compare saved reports**: grid `320px 1fr 1fr`, column-gap 64. Rows: Fund value; Gain on cost of current holdings, not time-weighted; Benchmark, same window (SPY value + window); Difference to benchmark, same window; Positions; Unpriced holdings (1 (valued at cost) / 0); Roster included; Analyst names included.
7. **States** summary: 4 columns with rules (loading `bi-arrow-repeat`, empty `bi-file-earmark-text`, managers only `bi-lock`, error `bi-exclamation-triangle` in `--negative` with "Retry").

### 1c. Generate dialog

Overlay `--bg-overlay` over the page. Modal 640 wide, background `--bg-primary`, 1px `--border-primary`, radius `--radius-xl`, shadow `--shadow-xl`, padding 32, gap 24. Title "Generate stakeholder report" 20/600; subtitle "Check what will be saved. A saved report is frozen and cannot be edited later."; close `bi-x-lg`. Borderless period field. 3x2 figure grid (12px label, 18px mono value): Fund value, Gain on cost not time-weighted, SPY same window, Difference to benchmark, Positions, Unpriced holdings. Window sentence. Two columns: Pre-save checks | Choices (Include roster Yes/No, Include analyst names Yes/No). Disclosure 12px. Footer right-aligned, gap 24: "Cancel" text, primary "Save and open report". Save freezes the snapshot, closes the dialog and opens the printable report.

### 1d. Delete confirmation

Same modal look, 480 wide, `role="alertdialog"`. "Delete saved report"; "Sample council fund report, Fall 2026, generated Oct 31, 2026 by Chidi Okoye, will be deleted for everyone in Sample council."; "This cannot be undone." (`--text-muted`). Footer: "Cancel" text, "Delete" 600 `--negative` text. No primary button.

### 1e. Comparison

Full-width view of the compare table, with text selectors above each column (Left / Right: Fall 2026 midterm, Fall 2026, Advisory board edition; selected in `--emerald`), column headers with name + "Generated {date} by {name}", an extra Window row, disclosure under each column, and "Back to reports".

### 1f. Printable report

White light document, 820 wide, padding 56, rendered with light tokens (`.light-mode`). Sections: header (logo + Ezana Finance | `bi-bank` Sample council); title 28/700 "Sample council fund report, Fall 2026 midterm"; meta line (period, cohort, generated date and author); Fund summary 5-up (16px mono values) + caption with window and unpriced note; Performance versus benchmark table (gain on cost, SPY, difference same window, window row); Attribution by sector (Sector, Weight, Contribution: Financials 40.08% +22.17%, Healthcare 30.14% +14.38%, Technology 21.58% +8.26%, Industrials 8.19% +1.91%, Total 100.00% +46.73%; "Rows rounded."); Pitch outcomes (Ticker, Analyst, Return, vs SPY, State: NVDA Elena Rossi +35.30% +25.22 pts Outperforming; LLY Amara Tesfaye +28.10% +18.02 pts Outperforming; JPM Mikael Bekele +9.60% -0.48 pts In line); Roster (portfolio managers Selam Haile, Chidi Okoye, Ingrid Lindqvist, Daniel Park; analysts Amara Tesfaye, Mikael Bekele, Elena Rossi); Method and disclosure; footer with generated date and page count. Hide roster/analyst names when those choices were No.

### 1g to 1j. Page states (full layout, nav + sidebar)

- **Loading (1g)**: `aria-busy="true"`. Skeleton bars in the final layout (header, KPI strip, both columns, preview block). Bars `--emerald-bg`, preview `--emerald-bg-subtle`, radius `--radius-sm` (buttons `--radius-md`). "Loading reports" with `bi-arrow-repeat`.
- **Empty (1h)**: KPI values 0 and N/A in `--text-muted`. One line: "No reports saved yet. The first saved report will appear here." + text action "Generate report".
- **Error (1i)**: KPIs N/A. `role="alert"` line with `bi-exclamation-triangle` `--negative`: "We could not load saved reports. Check your connection, then try again." + "Retry" text.
- **Analyst access (1j)**: sidebar user Elena Rossi, Analyst. `bi-lock` "Reports are for managers only." + "Executives, portfolio managers and faculty advisors can generate and open stakeholder reports. Ask a portfolio manager in Sample council for a copy." No actions, no data fetched.

## Interactions & behaviour

- Show council data On/Off swaps sample content for live council data; the header label follows.
- Include roster / Include analyst names update "What will be saved", the pre-save checks, the dialog and the generated document.
- Period label is live in "What will be saved" and becomes the report name suffix.
- Generate report (header) and Generate stakeholder report (left column) both open the generate dialog (1c). Save and open report persists a frozen snapshot, prepends it to Saved reports and opens its printable view.
- Open printable report opens the printable view in a new tab with print styles.
- Delete opens 1d; confirming removes the row and updates the KPI count.
- Refresh refetches; Retry refetches after an error.
- Hover: links and text buttons go to `--emerald` / `--emerald-hover`; table rows change text colour only. Primary button hover background `--emerald-hover`. No transforms, no transitions longer than 150ms ease-out.
- Esc and Cancel close dialogs; focus is trapped inside and returns to the trigger.

## State management

`showCouncilData:boolean`, `periodLabel:string`, `includeRoster:boolean`, `includeAnalystNames:boolean`, `reports:Report[]`, `status:'loading'|'ready'|'empty'|'error'`, `role` (manager vs analyst gates the page), `dialog:null|'generate'|{delete:reportId}`, `compare:[reportIdA, reportIdB]` (defaults: two most recent).

Report snapshot: id, name, period, generatedAt, generatedBy, cohort, fundValue, gainOnCost, benchmarkTicker, benchmarkReturn, windowStart, windowEnd, differencePts, positions, unpricedCount, sectors[{name, weight, contribution}], pitches[{ticker, analyst, return, vsBenchmarkPts, state}], roster?, includeAnalystNames.

## Design tokens (from the Ezana design system, `tokens.css`)

Dark / light:

- `--bg-primary` #0a0e13 / #ffffff · `--bg-overlay` rgba(0,0,0,.6) / rgba(0,0,0,.4)
- `--text-primary` #f0f6fc / #0f172a · `--text-secondary` #e2e8f0 / #1e293b · `--text-muted` #8b949e / #64748b · `--text-ghost` #4b5563 / #cbd5e1
- `--emerald` #10b981 / #059669 · `--emerald-hover` #34d399 / #047857 · `--emerald-border` rgba(16,185,129,.15) / .20 · `--emerald-bg` rgba(16,185,129,.08) / .06 · `--emerald-bg-hover` rgba(16,185,129,.12) · `--emerald-bg-subtle` rgba(16,185,129,.04)
- `--border-primary` rgba(16,185,129,.08) / rgba(0,0,0,.08) · `--border-secondary` .06 / .05 · `--border-input` .10 / rgba(0,0,0,.12)
- `--positive` #10b981 / #059669 · `--negative` #ef4444 / #dc2626
- Radius: `--radius-sm` 4, `--radius-md` 8, `--radius-xl` 16, `--radius-pill` 9999
- Shadow: `--shadow-xl` 0 20px 60px rgba(0,0,0,.45) (modals only)
- Spacing used: 4, 8, 12, 16, 24, 32, 48, 64
- Type: Plus Jakarta Sans (12, 13, 14, 15, 16, 20, 28; weights 400/600/700); JetBrains Mono (12, 13, 14, 16, 18)

## Assets

- `assets/ezana-nav-logo.png` from the Ezana design system (brand mark; the brief calls it the Walia ibex). Render mirrored per the design system.
- Bootstrap Icons 1.11.3 (CDN or the `bootstrap-icons` package).
- Google Fonts: Plus Jakarta Sans, JetBrains Mono.

## Files

- `Reports.dc.html`: main page (dark + light), dialogs, comparison, printable report, states, audit log
- `Ezana Nav.dc.html`: navigation bar
- `Team Hub Sidebar.dc.html`: sidebar (props userName, userRole, initials)
- `Printable Report.dc.html`: 820px printable document
- `tokens.css`: design tokens (dark default, `.light-mode` scope)
- `support.js`: runtime that lets the `.dc.html` files open directly in a browser
- `assets/ezana-nav-logo.png`

## Known caveats

- Light mode primary button text is white on #059669 (about 3.8:1). If AA at 14px is required, darken the light primary or add a primary-fg token in the design system.
- The design system guide recommends Lucide icons and bordered cards; this page follows the brief (Bootstrap Icons, flat sections).
