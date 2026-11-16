# Handoff: Org Chart page body (Team Hub)

<!-- Read from the Claude Design project https://claude.ai/design/p/2e8ae8ef-a4d8-4133-8cdf-a99d0df3cf92
     file design_handoff_org_chart/README.md, with get_page_text while paging the editor.
     Complete (editor lines 1 to 171). Blank lines and list indentation were restored by hand;
     wrapped lines were re-joined. Wording is Claude Design's. -->

## Overview

Redesigned Org Chart page for the organizational (university student-managed investment fund) version of Ezana, route `/org-team-hub/org-chart`. It shows the fund's reporting structure, sector coverage, flag routing, succession, sector team performance, a filterable roster, a member panel, a change rank dialog, a rank change log, and loading, empty and error states.

**Scope:** this README covers only the page body to the right of the Team Hub sidebar. The top navigation bar and the Team Hub sidebar already exist in the app and must not be rebuilt from this file.

## About the design files

`Org Chart.dc.html` is a design reference built in HTML: a prototype of intended look and behavior, not production code. Recreate it in the app's existing Next.js / React environment with its established components, Tailwind config and theme variables. `Org Chart Dark and Light.dc.html` shows dark (1a) and light (1b) side by side. Open either file in a browser (they need `support.js`, `tokens.css` and `assets/` next to them).

## Fidelity

High fidelity. Colours, type, spacing and interactions are final. Sample content (names, values, dates) is placeholder data.

## Layout (desktop, 1440px)

- Page body: x = 256 to 1408 (1152px wide). The sidebar column is x = 32 to 232 with a full-height 1px `--ez-rule-subtle` hairline at x = 232, then 24px clear space. Body right edge aligns with the right edge of the logout icon (x = 1408). Padding: 24px top, 64px bottom.
- 1. **KPI strip**: one flex row, `padding-bottom: 24px`, bottom hairline `--ez-rule-subtle`. Seven KPIs with 20px gap, then actions pushed right with `margin-left: auto` (Council settings and Invite members, 24px gap).
- 2. **Main grid** (32px below strip): `grid-template-columns: 840px 248px; column-gap: 64px`.
  - Left 840px track:
    - Top row: `grid-template-columns: 527px 1px 264px; column-gap: 24px` with Reporting structure, a vertical hairline `--ez-rule-subtle` and the middle column. Middle column stacks Sector coverage, Flag routing and Succession with 32px gaps.
    - Then Sector teams, Roster and Recent changes run full 840px width, each preceded by a top hairline `--ez-rule-subtle` and 32px padding.
  - Right 248px track: Member panel overlay, then the Change rank dialog below it (24px gap).
- 3. **State examples**: full 1152px, top hairline, `grid-template-columns: 1fr 1px 1fr 1px 1fr; column-gap: 24px` with vertical hairlines.

Cards are flat: no fill, border, shadow or radius. Only the member panel, the rank menu and dialogs are overlays with a solid surface.

## Components

### Section header

Title in Plus Jakarta Sans 18px/700, letter-spacing -0.01em, `--text-primary`. An optional count sits on the right, baseline-aligned, 12px `--text-muted`, with the number in JetBrains Mono ("11 sectors", "3 members", "5 changes").

### KPI strip

Each KPI: a 28×28 icon tile (radius `--radius-md`, fill `--emerald-bg`, 14px Bootstrap icon in `--emerald-text`), 10px gap, then a column with the label (12px `--text-muted`) above the value (JetBrains Mono 18px/600, `--text-primary`; Fund return uses `--positive`).

- Members 24 `bi-people`; Teams 11 `bi-diagram-3`; Leadership 5 `bi-star`; IC voters 8 `bi-check2-square`; Vacancies 1 `bi-person-dash`; Fund value $2,460,000.00 `bi-wallet2`; Fund return +46.10% `bi-graph-up-arrow`.
- Council settings: plain text button, 14px/500 `--text-secondary`, hover colour `--emerald-text`.
- Invite members: the only solid button in this group. Height 38px, padding 0 16px, radius `--radius-md`, background `--btn-primary-bg`, text `--btn-primary-fg` 14px/600.

### Reporting structure (org tree)

The header right side has "View: Executive (full access)" in 12px `--text-muted`. The tree canvas is 527×352px. Connectors are 1px `--ez-rule` lines, all grey with no colour.

- Root: Noah Hale, 36px avatar, name 14px/600 plus "IC" (12px/600 `--emerald-text`), "President · R1" 12px muted (rank code in mono). Root is centred on x = 263.
- Bus at y = 70 from x = 88 to 440 with drops to three executives centred on columns at 88, 263 and 439: Isabel Lim IC (Vice President · R2, Investments), Joseph Machak IC (Executive · R2, Research), Ethan Miller (Executive · R2, Operations). Each has a 36px avatar and 3 lines.
- From Joseph Machak, a bus at y = 172 from x = 66 to 462 drops to four team columns, each 132px wide: Financials, Healthcare, Technology, Unassigned (labels 14px/600, centred).
- Team heads (y = 226): 28px avatar, name 13px/600 plus IC, "Sector Head · R3" 11px muted. The Healthcare head is a vacancy: 26px dashed `--text-muted` circle with `bi-dash`, "No sector head" / "(vacancy)".
- Members hang from a vertical spine at column x + 14 with 10px stubs, an 18px avatar and "Name · R4" in 12px, rows 30px apart. Financials: Chloe Lin, Daniel Park, Ryan Singh. Healthcare: Katie Tran, Marcus Ho. Technology: Alex Lee, Sophie Ng. Unassigned: Ben Wang, Ella Yoon.
- Avatars: circle, `--emerald-bg` fill, initials in `--emerald-text`, 600 weight.
- IC membership is always the word "IC", never colour alone.

### Sector coverage / Flag routing / Succession (264px column)

Rows have `min-height: 28px` with a bottom hairline `--ez-rule-subtle`, 13px `--text-secondary`.

- Sector coverage: grid `116px 1fr`. Eleven sectors. Uncovered rows (Energy, Healthcare, Utilities) show "N/A" (mono 12px `--text-muted`) · "Assign" (text button, `--emerald-text` 600).
- Flag routing: grid `72px 1fr`, gap 8. "Name (reason)" with the reason in 12px muted.
- Succession: name left, right "Term end <mono date> · Graduating" in 11px muted. "Graduating" uses `--warning` and is always spelled out.

### Tables (Sector teams, Roster, Recent changes)

- Header row: 11px/600, uppercase, letter-spacing 0.06em, `--text-muted`, padding-bottom 8px, bottom 1px `--ez-rule`.
- Body rows: min-height 34 to 36px, bottom 1px `--ez-rule-subtle`, 13px `--text-secondary`. All numbers, money, dates and rank codes use JetBrains Mono.
- **Row hover changes the text colour to `--emerald-text` and nothing else.** No background wash, no transform.
- Sector teams columns: `120 140 80 130 110 130 1fr`, covering Team, Sector head, Members, Team value, Team return, Coverage lead and Flag route. Total row: min-height 40, 600 weight, `--text-primary`. Returns are signed with `--positive`. Missing values show "N/A" in muted mono, never in a gain colour.
- Roster: filters are text buttons (All members, Leadership, PMs, Analysts, Unassigned) with 24px gaps, 13px/500. The selected one uses `--emerald-text`, others `--text-secondary`, with no underline, pill or track. The count on the right reads "24 of 24 members". Columns `112 48 100 90 108 88 104 80 40 1fr`: Member, Rank, Title, Team, Reports to, Coverage, Term end, Graduating ("Yes" in `--warning` / "No"), IC ("Yes" / "No"), Action ("View", or "Change rank" for Avery Reed, as text buttons in `--emerald-text`).
- Recent changes columns: `150 150 170 170 1fr`, covering Changed by, Member, From, To and When. Rank values render as "<mono code> (Label)".

### Member panel (overlay, 248px)

Surface `--bg-deep`, 1px `--ez-rule` border, radius `--radius-lg`, `--shadow-lg`, padding 16, 16px vertical gap. Sections are divided by 1px `--ez-rule-subtle` hairlines.

- Header: "Member panel" 18/700 and a close `bi-x-lg` (muted).
- Identity: 40px avatar, name 16/700, "IC" word, "R3 · Sector Head".
- Facts (12px): Team, Role group, Reports to "Isabel Lim (VP)", Direct reports "3" with `bi-chevron-right`.
- Fields (labels 12px muted). All fields are borderless text with no boxes:
  - Title "Sector Head" with `bi-pencil` edit.
  - Manager select "Isabel Lim" with `bi-chevron-down`.
  - Term dates "Aug 20, 2024" and "May 15, 2027" in mono, each with `bi-calendar3`, joined by an en dash.
  - Graduating is a text toggle "No / Yes" with the selected option in `--emerald-text`, others muted, and no track.
  - Sector coverage "Financials" with `bi-x` remove (no chip box) and `bi-chevron-down`.
  - Rank "R3 (Sector Head)" with chevron, and a "Change rank" text button.
- Scorecard (analyst + PM): 3-column grid. Hit rate 62.50% (neutral `--text-primary`), Avg return +18.40% and Avg alpha +6.70% (`--positive`), Pitches 16, Votes cast 48, Notes 12. Values in mono 14/600, labels 11px muted. For members without data, every value is "N/A" in muted.
- Competitions: `bi-trophy` (muted), "Spring Stock Pitch · 1st", "Fall Sector Challenge · 2nd".
- Contact: N/A.
- Message: a borderless input "Message Avery..." and a "Send" text button with `bi-send` in `--emerald-text`.

### Change rank dialog (overlay, 248px)

Same surface as the member panel.

- Rows: Member, Current rank, New rank (label column 92px).
- The New rank select is text-only in `--emerald-text` with a chevron. Its open menu is an overlay (`--bg-deep`, 1px `--ez-rule`, radius `--radius-md`, `--shadow-lg`, padding 4px 10px) with 30px options R2 (Executive), R3 (Sector Head) and R4 (Analyst). The selected option uses `--emerald-text` with no fill.
- Footer right: Cancel (text, `--text-secondary`) and Save (the solid primary, 36px high, padding 0 18px).

### State examples

- Loading (members): three 10px skeleton bars (`--ez-rule`, radius `--radius-sm`) at 56%, 96% and 80% width.
- Empty (no matching members): `bi-people` at 24px muted, "No members found" 15/600, "Try a different filter." muted.
- Error (unable to load): `bi-exclamation-triangle` at 24px `--negative`, "Could not load members", "Network error. Retry.", and a "Retry" text button in `--emerald-text`.

## Interactions & behavior

- Roster filters set the active filter. Leadership is R1 or R2, PMs is R3, Analysts is R4, and Unassigned is team = Unassigned. The count shows filtered / 24. If a filter matches nothing, show the Empty state.
- "View" in a roster row opens the Member panel for that member. "Change rank" (or the panel's rank select / Change rank) opens the Change rank dialog for that member with the menu open.
- The rank menu toggles on click. Picking an option sets the new rank and closes the menu.
- Save: if the new rank differs from the current one, update the member's rank (the title follows the rank label), prepend an entry to Recent changes (changed by the current user, with a timestamp) and close. Cancel or close discards.
- The Graduating text toggle updates the member, and the roster Graduating column follows.
- "Assign" (sector coverage) opens an analyst picker. That picker isn't in this design, so use the app's existing select pattern.
- Close icons dismiss the panel or dialog.
- Hover: text colour shifts only (rows and text buttons change to `--emerald-text`). Primary buttons darken per the app's `primary/90`. There are no transitions longer than 150ms ease-out.
- Loading, empty and error apply to the roster data fetch. The error Retry refetches.

## State

`filter`, `selectedMemberId`, `panelOpen`, `dialog { open, memberId, menuOpen, nextRank }`, plus the member list and the rank change log from the API. Allowed ranks in the dialog are R2, R3 and R4.

## Design tokens

These are defined in `tokens.css`. The design system values come from Ezana `colors_and_type.css`. The app aliases are listed separately below.

| Token                       | Dark                       | Light                      |
| --------------------------- | -------------------------- | -------------------------- |
| --bg-primary                | #0a0e13                    | #ffffff                    |
| --bg-deep (overlay surface) | #0f1419                    | #ffffff                    |
| --text-primary              | #f0f6fc                    | #0f172a                    |
| --text-secondary            | #e2e8f0                    | #1e293b                    |
| --text-muted                | #8b949e                    | #64748b                    |
| --text-faint                | #6b7280                    | #94a3b8                    |
| --emerald                   | #10b981                    | #059669                    |
| --emerald-bg                | rgba(16,185,129,.08)       | rgba(16,185,129,.06)       |
| --positive                  | #10b981                    | #059669                    |
| --negative                  | #ef4444                    | #dc2626                    |
| --warning                   | #fbbf24                    | #d97706                    |
| --shadow-lg                 | 0 8px 32px rgba(0,0,0,.40) | 0 8px 24px rgba(0,0,0,.08) |

App aliases. Map these to the app's existing variables of the same name. If those differ, the app wins.

| Token            | Dark                  | Light              |
| ---------------- | --------------------- | ------------------ |
| --emerald-text   | #10b981               | #047857            |
| --btn-primary-bg | #10b981               | #047857            |
| --btn-primary-fg | #0a0e13               | #ffffff            |
| --ez-rule        | rgba(139,148,158,.24) | rgba(15,23,42,.14) |
| --ez-rule-subtle | rgba(139,148,158,.12) | rgba(15,23,42,.07) |

- Radii: `--radius-sm` 4px (skeleton), `--radius-md` 8px (buttons, icon tiles, menu) and `--radius-lg` 12px (overlays).
- Spacing: 4-base. 64px between side-by-side sections, 24px clear beside any vertical rule, and 32px between stacked sections.
- Type: Plus Jakarta Sans for all text (section titles 18/700, body 13, labels 12, table headers 11/600 uppercase). JetBrains Mono for every number, date, money value, percentage and rank code.

## Icons

Bootstrap Icons 1.11.3 only. Page body: `bi-people`, `bi-diagram-3`, `bi-star`, `bi-check2-square`, `bi-person-dash`, `bi-wallet2`, `bi-graph-up-arrow`, `bi-dash`, `bi-x-lg`, `bi-x`, `bi-chevron-right`, `bi-chevron-down`, `bi-pencil`, `bi-calendar3`, `bi-trophy`, `bi-send`, `bi-exclamation-triangle`.

## Content rules

- Sentence case throughout.
- No em dashes. Missing values are "N/A".
- Percentages are signed with two decimals, and money uses two decimals.
- Rank group is always written in words.
- N/A is never coloured as a gain.

## Files

- `Org Chart.dc.html`: page source (HTML with inline styles and logic class; prop `theme` = dark | light).
- `Org Chart Dark and Light.dc.html`: both themes side by side.
- `tokens.css`: token CSS (dark default, `[data-theme="light"]` overrides).
- `support.js`: runtime needed only to open the reference files.
- `assets/ezana-nav-logo.png`: nav logo (used by the nav only, outside scope).

## Audit changes (against the Ezana design system and the brief)

1. The KPI strip's vertical separators are removed. With 24px clearance on each side they don't fit 1152px, so the KPIs use 20px gaps. Labels sit above values to fit the 28px tiles plus 18px mono values.
2. Money uses two decimals ($2,460,000.00, $620,000.00, $0.00, $810,000.00, $1,430,000.00).
3. Percentages use two decimals and are signed where they're changes (+46.10%, +52.30%, +38.90%, +44.80%, +18.40%, +6.70%).
4. Hit rate (62.50%) is neutral instead of green, because it isn't a gain.
5. Every "–" placeholder is replaced with "N/A" in muted mono: sector teams, the Total row and roster Team / Reports to / Coverage.
6. The roster IC column uses the words "Yes" / "No" instead of a check mark or dash.
7. The graduating switch is a "No / Yes" text toggle, with no track.
8. Manager, rank, sector coverage and the new rank select are text-only with chevrons, and have no boxes.
9. Date fields and the message field are borderless.
10. The "Financials" coverage chip has no box: it's text plus a `bi-x` remove.
11. The "Sector Reed" title typo is corrected to "Sector Head", and the "Beading (members)" heading is corrected to "Loading (members)".
12. The sidebar role "EXECUTIVE" is now sentence case "Executive". Only Org Chart is emerald in the sidebar: Team Permissions was also emerald in the wireframe.
13. The emoji-style trophies are now `bi-trophy`, and all icons are Bootstrap Icons.
14. Primary button text is dark on emerald in dark mode and white on #047857 in light mode, for at least 4.5:1 contrast. One solid button per group: Invite members, Save. Send, Change rank, Council settings, Retry, Assign and Cancel are text.
15. The member panel, rank menu and dialog are the only solid surfaces. Every other section is flat, with no fill, border, shadow or radius.
16. Row hover changes colour only.
17. Missing scorecard values for members other than Avery show "N/A".
18. Navigation (shown for context only): the Team Hub active item is emerald instead of indigo, the filled gear is now an outline icon, Sonar is a filled emerald pill, and logout is red.
