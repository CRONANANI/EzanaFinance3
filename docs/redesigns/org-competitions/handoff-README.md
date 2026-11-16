# Handoff: Org Competitions (/org-competitions)

## Overview

Redesigned Competitions page for the organizational (university student-managed investment fund) version of Ezana, inside the existing Team Hub sidebar shell. It covers: KPI strip, landing (obligations, entered, open to join, hosting, circuit deadlines, fund challenge standing, member trophies), one competition workspace (entrant view + host view), loading, empty and error states, and six dialogs. Dark mode is the default; a light mode is drawn with the same layout.

## About the design files

The files in this bundle are **design references built in HTML**. They show intended look and behavior; they are not production code. Recreate them in the target codebase (Next.js app in CRONANANI/cronanani) with its existing patterns, components and `theme-variables.css` tokens.

## Fidelity

High fidelity. Final colors, type, spacing and copy. Match pixel values below.

## Files

- `Org Competitions Page.dc.html` — the page (one artboard, `theme` prop = `dark` | `light`). All styles inline; data in the logic class at the bottom.
- `Org Competitions.dc.html` — canvas showing dark (1a) and light (1b) side by side.
- `tokens.css` — Ezana tokens (copy of `colors_and_type.css`; light scope also matches `[data-theme="light"]`).
- `assets/ezana-nav-logo.png` — brand mark used in the nav (see Assets note).
  Open the `.dc.html` files in a browser; `support.js` (runtime) must sit beside them.

## Global layout rules

- Artboard 1440px wide. Sidebar is the existing Team Hub shell and is not part of this design. Content spans **x = 32 to x = 1408** (left edge of logo to right edge of logout icon): `padding: 0 32px`, content width 1376px.
- Cards are flat: no fill, border, shadow or radius. Sections are separated by 1px hairlines `var(--border-primary)` and whitespace only.
- Side-by-side sections: **64px gap**; vertical rule centred in the gap so each side has ≥24px clear space (32px in practice). KPI separators: 24px either side.
- Vertical rhythm: 40px between stacked landing sections, 32px between workspace blocks, 64px + 32px padding-top (with top hairline) between major page sections.
- Row hover: **text colour only** → `var(--emerald)`. Never a background wash or row fill.
- Tabs, toggles, selectors: text only. Selected = `var(--emerald)` text, unselected = `var(--text-muted)`, hover → `var(--text-primary)`. No underline bar, pill or track.
- Buttons: one solid emerald primary per group (`background: var(--emerald)`, text `var(--bg-primary)`, 14px/600, padding 8px 16px, radius `var(--radius-md)` 8px, hover `var(--emerald-hover)`). Every other action is plain text (emerald 600 for actions, muted for Cancel).
- Fields: borderless. Label 12px `--text-muted` above value 14px `--text-primary`; placeholder `--text-faint`. No boxes, no underlines; focus to be shown by caret + label turning emerald.
- Chips/labels/counts: plain text, no boxes.
- Fonts: Plus Jakarta Sans for text; **JetBrains Mono (tabular-nums) for every number, date, time, score, rank, count and ticker**, including numbers inside sentences (e.g. "(≤ 10 pages)", "2 rounds · 8 teams").
- Copy: sentence case, no em dashes, signed percentages (`+3.12%`), `N/A` for missing values. Dates `Mmm DD, YYYY`, ranges `Nov 01 – Nov 28, 2026`.
- Icons: Bootstrap Icons only (`bootstrap-icons@1.11.3`), `currentColor`.

## Components (top to bottom)

### Navigation bar (real app bar), height 64px, bottom hairline

- Left (gap 28): logo 36px tall at x=32 (mirrored), `bi-bell` with count `9+` (mono 10px/600 `--negative`, no badge box), `bi-clipboard-check` with `4/19` (mono 10px `--emerald`).
- Centre (gap 28, 14px/500 `--text-muted`): Team Hub `bi-building` (active, emerald text), Research `bi-search` + `bi-chevron-down`, Trading `bi-graph-up` + chevron, **Sonar `bi-broadcast` as filled emerald pill** (bg `--emerald`, text `--bg-primary`, radius pill, padding 7px 16px, 600), Watchlist `bi-bookmark`, Learning Center `bi-mortarboard`.
- Right (gap 24, 20px icons): `bi-person-circle`, `bi-gear` (`--text-muted`), `bi-box-arrow-right` in `--negative` (red). Right edge at x=1408.

### KPI strip, 48px tall, margin-top 16, bottom hairline

- Five KPIs: Entered 3 · Hosting 1 · Open to join 6 · Next deadline Nov 18, 2026 · Fund challenges 2. Label 12px/16px `--text-muted`; value **JetBrains Mono 18px/600** `--text-primary`. Each KPI: padding-right 24 + margin-right 24 + 1px right rule.
- Right cluster (gap 24, 13px): `bi-info-circle` Sample content (muted) · Show council data **On** (text toggle, emerald "On" / "Off") · Council Rankings (text link) · Pitch circuit (text link) · **New competition** (the only primary button).

### Page tabs

Pitch competitions (selected) · Fund challenges. 15px/500, gap 32, 20px above.

### Landing, grid `minmax(0,1fr) 448px`, gap 64, rule in gap

Left column (864px):

- **Current obligations**: rows grid `20px 1fr auto`, padding 12, top hairline. Icon `bi-file-earmark-text` / `bi-calendar-event`, title 14/600, sub 13 muted, date mono 13 right, optional time below (muted).
- **Entered competitions** `3`: columns Competition (1.35fr) · Role 72 · Stage 112 (icon + text: `bi-upload` Submission, `bi-search` Research, `bi-easel` Presentation) · Next deadline 112 (mono) · Placement 80 (mono, `N/A` muted) · Format (1.25fr, 13px). Header 12px/500 muted, rows padding 10 + hairline.
- **Open to join** `6`: Competition · Registration window 200 (mono) · Admission 112 · Format · action 56 (Apply/Join, emerald text, opens Join or apply).
- **Hosting** `1`: Event (hosted) with `bi-people` · Readiness `bi-exclamation-circle` "4 of 5 ready" in `--warning` · Next milestone "Confirm judges · Nov 22, 2026" · Format "2 rounds · 8 teams".

Right rail (448px):

- **Circuit deadlines** (sub: External pitch circuit events): timeline, 1px line `--border-hover` at x=7, markers `bi-circle-fill` (next) / `bi-circle` 12px emerald on page bg; text column 24px from marker column. Date mono 13/600, line 13 muted. Events: Granite Bay Pitch Classic, Harbor Lights Equity Open, Summit Ridge Value Cup, Redwood Analyst Challenge.
- **Fund challenges standing** (sub: 2 active challenges · Your council's performance): columns Challenge (1fr) · Rank of field 60 · Return since entry 64 (right, `--positive`) · Councils entered 60 (right) · End date 92 (right). Rows: Sample intercollegiate fund challenge 3 of 12, +3.12%, 12, Dec 18, 2026; Fall long/short challenge 2 of 9, +6.41%, 9, Dec 11, 2026. Matches the Fund Analytics council standing block.
- **Member trophies (this season)**: `bi-trophy-fill` Winner 1 member · `bi-trophy` Top 3 3 members · `bi-award` Participant 11 members. Icons muted.

### Competition workspace (top hairline, 64 above)

- `bi-arrow-left` Competition workspace (13 muted link) → title row: **North Shore Spring Invitational at section-title size (20px/600)** + `bi-info-circle` Sample content (12 muted) · right: Switch event `bi-chevron-down` (text selector).
- Tabs: Overview (selected) · Entry rules · Deliverables · Live board · Results · Host tools. 15/500, gap 32, padding 16 0, bottom hairline.
- Two columns `1fr 1fr`, gap 64, rule centred.

Entrant view (`bi-people`, 18/600):

- Key values (label 180px muted / value): Event, Admission, Registration window (mono), Ticker rule "5 tickers max (e.g., MSFT, LLY, JPM)", Side rule "Long only".
- Deliverables (you): `bi-check-circle-fill` emerald done / `bi-circle` muted; name; Due (mono right). Team registration Oct 28, 2026 · Investment thesis (≤ 10 pages) Nov 10, 2026 · Final pitch deck (≤ 20 slides) Nov 18, 2026.
- Team roster `4` + right "Recruiting consent `bi-info-circle` On" (text toggle). Rows: Avery Park (Lead), Riley Chen, Jordan Kim, Taylor Reed → Yes.
- Deliverables upload / paste: `bi-upload` Final pitch deck · N/A · Upload; `bi-file-earmark-text` Investment thesis · SampleCouncil_NS2026_Thesis.pdf · View.
- Results (revealed): Rank of field **2** (mono 28/700 emerald) "of 8 teams" | rule | "Criterion breakdown · weighted score 87 of 100", cells Thesis 28/30 · Analysis 26/30 · Presentation 17/20 · Q&A 16/20 (mono 15/600).
- Anonymous feedback `2`: quotes only, no judge label.

Host view (`bi-bank`):

- Readiness checklist "4 of 5": `bi-check-circle` emerald ×4, `bi-circle` muted (Rubric defined).
- Host actions (emerald text, gap 32): Advance stage · Approve requests · Post announcement · Add rules dates · Generate judge scoring link.
- Live board · Round 1 `bi-chevron-down`: Time (ET) 80 mono · Room 80 · Team · Status 128 (`bi-check-circle` Completed emerald; `bi-play-circle` In progress `--warning`; `bi-clock` Scheduled muted).
- Results workspace: Recompute · Reveal results (text). Columns Rank 20 · Team · Thesis 52 · Analysis 60 · Presentation 84 · Q&A 40 · Score 48, with a max-points row (30/30/20/20/100, mono 11 faint). Totals ≤ 100: Harborview 92, Sample council 87 (row text emerald/600, no fill), Northlake 84.

### Loading state

Skeletons in the final layout: KPI strip (5 × label 64×10 + value 96×16), tab bars, landing grid (3 left groups × 3 rows mirroring table columns; 3 rail groups × 3 rows). Bars `background: var(--emerald-bg)`, radius `--radius-sm`. In code add a 1.2s ease-in-out opacity pulse (0.5 → 1), disabled under `prefers-reduced-motion`.

### Empty and error states

One line + one text action per section (grid `184px 1fr auto`): see `emptyA` / `emptyB` arrays in the logic class for exact copy. Inline error: `bi-exclamation-triangle` "Could not load entered competitions." in `--negative` + Retry (emerald text). Error replaces the section's rows in place; Retry refetches that section only.

### Dialogs (ds Modal look; the only filled surfaces)

Overlay `var(--bg-overlay)`. Modal: bg `var(--bg-primary)`, 1px `var(--border-primary)`, radius `var(--radius-xl)` 16px, `var(--shadow-xl)`, padding 24, gap 16. Title 18/600, close `bi-x-lg` muted. Footer right-aligned: Cancel (muted text) + one primary.

1. New competition: Name, Format (Showcase · Single elimination · Round robin, text options), Theme, Description, Start date / End date (mono), Rules link → Create competition.
2. Join or apply (sub: event · admission): Team name, Contact email, Ticker (mono), Side (Long · Short), Deck link, Thesis, Note → Submit application.
3. Decline request? confirmation → Decline request as plain red text (`--negative`) beside Cancel; no filled button in this dialog (destructive confirmations are red text).
4. Hide results? confirmation → Hide results.
5. Judge scoring link: shown once; mono link + `bi-copy` Copy (→ `bi-check2` Copied) → Done.
6. Edit dates and rules link: Registration opens/closes, Final deck due, Presentations (mono), Rules link → Save changes.

## Interactions & state

- `councilData` (bool, default on): Show council data toggle; off hides council-specific values (fund standing, placements) and shows N/A.
- `pageTab`: pitch | fund. `workspaceTab`: overview | rules | deliverables | live | results | host.
- `recruitingConsent` (bool) per team.
- Switch event opens a text list of entered/hosted events; selecting reloads the workspace.
- New competition / Apply / Join / Add rules dates / Generate judge scoring link / Approve requests → decline / Reveal results ↔ Hide results open the dialogs above. Escape and overlay click close (not the judge link dialog until Done or Copy).
- Reversible actions: edit roster/lead, replace deliverables before deadline, advance round, recompute or hide results, update rules and dates. No Withdraw control appears anywhere: withdrawing has no data path today.
- Data: each section loads and errors independently using the app's existing data access.

## Design tokens used (dark / light)

- `--bg-primary` #0a0e13 / #ffffff · `--bg-overlay` rgba(0,0,0,0.6)
- `--text-primary` #f0f6fc / #0f172a · `--text-secondary` #e2e8f0 / #1e293b · `--text-muted` #8b949e / #64748b · `--text-faint` #6b7280 / #94a3b8
- `--border-primary` rgba(16,185,129,0.08) / rgba(0,0,0,0.08) · `--border-hover` rgba(16,185,129,0.20) / rgba(16,185,129,0.25)
- `--emerald` #10b981 / #059669 · `--emerald-hover` #34d399 / #047857 · `--emerald-bg` rgba(16,185,129,0.08) / 0.06
- `--positive` #10b981 / #059669 · `--negative` #ef4444 / #dc2626 · `--warning` #fbbf24 / #d97706
- `--radius-sm` 4 · `--radius-md` 8 · `--radius-xl` 16 · `--radius-pill` 9999 · `--shadow-xl` 0 20px 60px rgba(0,0,0,0.45) / 0 16px 48px rgba(0,0,0,0.10)
- Type: 12 (labels, headers) · 13 (table/meta) · 14 (body) · 15 (tabs) · 16 (sub-section) · 18 (KPI values, view titles, dialog titles) · 20 (section titles) · 28 (result rank). Spacing 4-base: 8, 12, 16, 24, 32, 40, 48, 64.

## Assets

- Bootstrap Icons 1.11.3 (CDN). Icons used: bell, clipboard-check, building, search, graph-up, chevron-down, broadcast, bookmark, mortarboard, person-circle, gear, box-arrow-right, info-circle, file-earmark-text, calendar-event, upload, easel, people, exclamation-circle, circle, circle-fill, trophy-fill, trophy, award, arrow-left, bank, check-circle, check-circle-fill, play-circle, clock, exclamation-triangle, x-lg, copy, check2.
- Logo: the design system ships only the pegasus mark (`ezana-nav-logo.png`). The production nav uses the Walia ibex mark; use the codebase's nav logo component at 36px tall, left edge x=32.

## Audit changes (vs. wireframe)

See the chat summary for the full list; all are reflected in the HTML.

---

Note from the stage 2 agent: the text above is the README copied in full from Claude Design's
design_handoff_org_competitions folder (via the editor's Copy button) on November 16, 2026. After
it was copied, a follow-up asked Claude Design for three corrections, which it confirmed it made
in the design and the README; they are applied above by hand: no Withdraw anywhere, Decline
request as plain red text, and no invented data endpoints.

Build notes (precedence: branding guide first):

- Never copy the nav bar or its pegasus logo; the real nav and Team Hub shell stay untouched.
- Hex and rgba values in the token list are reference only; use theme-variables.css tokens.
- Primary button text: the guide's --btn-primary-fg, not --bg-primary.
- Table headers: the description asks for an 11px grey caps header like the other rebuilt org pages; Claude Design changed them to sentence case. Follow the guide and the existing org pages.
- Winner trophy: the description's palette allows gold for Winner; Claude Design made all trophies neutral. Decide per the guide.
- Open to join gained Apply or Join text actions (entry into the Join or apply dialog).
- Fund challenges standing shows two challenges; real data only has the fund return competitions the council entered.
- Show council data off shows N/A for council values.
