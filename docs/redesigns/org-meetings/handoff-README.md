<!-- Transcribed by the stage 2 agent from the README.md in the design_handoff_meetings folder of Claude Design project https://claude.ai/design/p/fc5003e5-f78f-490d-b883-44c86d1476e6 (JavaScript was blocked on claude.ai, so it was read with get_page_text and a zoomed screenshot while paging the editor; wrapped lines re-joined). All 124 source lines were captured. The HTML and CSS source stay in the Claude Design project and could not be downloaded here. -->

# Handoff: Ezana Meetings (Team hub, organizational)

## Overview

Redesigned Meetings page at `/org-team-hub/meetings` for university student-managed investment councils. Members see upcoming and past council meetings, reply to invitations, track quorum by role, open pre-read material, see the status of Investment Committee (IC) votes, and review completed meetings (recording, summary, tone by role, deliverables, attendance). Managers (PMs, executives, faculty advisors) can edit; analysts can only reply.

## About the design files

The files in this bundle are design references built in HTML. They show intended look and behavior; they are not production code. Recreate them in the target codebase (Ezana is Next.js + Tailwind + shadcn-style primitives) using its existing components, theme variables (`src/app/theme-variables.css`) and patterns.
`Meetings Page.dc.html` is the page. `Ezana Meetings.dc.html` is a review canvas that mounts it five times (dark, light, loading, empty, error). Open either file in a browser; `support.js` is the small runtime that renders them.
Each file has a template (markup with inline styles) and a `class Component` logic block at the bottom.

## Fidelity

High fidelity. Final colors, type, spacing, copy and interactions. Match pixel values below.

## Page layout (1440 px desktop)

- Outer horizontal padding 32 px. Content runs from x=32 (left edge of logo) to x=1408 (right edge of logout icon). Usable width 1376.
- Nav bar: height 72, three groups. Left 320 wide (logo 40×40, bell with `8+` red count, assignments icon with `4/19` emerald count). Center nav, gap 28. Right 320 wide, icons 20 px, gap 24, right-aligned.
- Below nav: `sidebar 168 | rule column 64 | main 1144`.
- Main: KPI strip (full main width), then `left rail 168 | 64 | center 624 | 64 | right rail 224`, then full-width completed meeting section.
- Rule columns: 64 px wide with a 1 px `--border-primary` line centered (31.5 px clear on each side). All side-by-side sections are 64 px apart; every vertical rule has at least 24 px clear space.
- Horizontal section dividers: 1 px `--border-primary`. Table row dividers: 1 px `--border-secondary`.
- Section vertical padding 20 px; completed section starts 32 px below with a top rule and 32 px padding.

## Components

### Navigation bar

- Items (14/500, gap 8 icon to label): Team hub (`bi-grid-1x2`, emerald text, current section), Research (`bi-search` + `bi-chevron-down` 10 px), Trading (`bi-graph-up` + chevron), Sonar (`bi-broadcast`, filled pill: `--emerald` bg, `--bg-primary` text, 600, padding 8×16, `--radius-pill`), Watchlist (`bi-bookmark`), Learning center (`bi-mortarboard`).
- Right: `bi-person-circle`, `bi-gear` (both `--text-muted`), `bi-box-arrow-right` in `--negative`.
- Logo: Walia ibex mark, 40×40 at x=32. The bundle uses an image placeholder; use the production ibex asset.
- Counts on icons are mono 11/600 text with no badge box, offset top -8, left 14.

### Team hub sidebar (168)

- Profile: 36 px emerald circle avatar with `N` (700/15, `--bg-primary`), name `Noah` 600 `--text-primary`, role `Executive` 12/500 emerald. 24 px below.
- Items: row padding 8×0, gap 12, icon `--text-muted`, label 14 `--text-secondary`, count mono 12 `--text-muted` right-aligned.
- Selected (Meetings): emerald text and icon, 600, no background.
- Order and icons: Command center `speedometer2`, Trading desk `bank`, Fund analytics `graph-up`, Assignments `journal-check` 4/6, Org chart `diagram-3`, Pitch pipeline `easel` 6, Research library `archive` 4, Sonar research `broadcast`, Meetings `calendar-event` 2, Recognition `award`, Grades `clipboard-data` 1, Competitions `trophy`, Council rankings `bar-chart-steps`, Cohorts `people`, Compliance `shield-check`, Reports `file-earmark-text`, Team permissions `key`.

### KPI strip

- Padding 20×0, bottom rule. Six KPIs spread with `justify-content: space-between` (min gap 20), then a 1 px rule (24 px gap each side), then Sample content, then actions.
- KPI: label 12 `--text-muted` nowrap; value mono 16/600 `--text-primary`.
- Next meeting: `bi-calendar3` 16 px left; value mono 14/600 emerald `Jul 27, 2025 14:00`.
- Upcoming (term) `5`, IC open `2`, Quorum at risk `bi-exclamation-triangle` + `1` in `--warning`, Completed (term) `9`, Analysis ready `bi-bar-chart` + `12` in emerald.
- Sample content: label 12 muted; `Show council data` 13 then text choices `On` / `Off` (600; selected emerald, other `--text-muted`).
- Actions, gap 24: Settings (plain text, `bi-gear`, 14/500, hover emerald). New meeting: the only filled button. `--emerald` bg, `--bg-primary` text, 14/600, padding 10×16, `--radius-md`, `bi-plus-lg`. Hover `--emerald-hover`, active `--emerald-dark`.

### Left rail (168)

- Tabs Upcoming / Past / Term view: 14/600, gap 16, text only. Selected emerald, others muted. No underline.
- Categories: heading 13/600. Rows 14, padding 5×0: name left, mono 12 count right. All 5, IC 2, Sector 1, General 1, Exec 1, Education 0. Selected emerald 600. No radio circles.
- Term navigator: `bi-chevron-left` / `bi-chevron-right` muted, term name 600 centered, start and end date mono 11 muted on two lines.
- Pipeline IC sessions (read-only): `bi-file-earmark-text`, title 13 primary, meta 11 faint (`IC (pipeline) · Aug 5, 2025`), `bi-link-45deg`. Items: HC: Biosimilars thesis (Aug 5, 2025), TECH: AI infra update (Aug 12, 2025), INDU: U.S. reshoring (Aug 19, 2025).

### Center column (624)

1. Upcoming meetings (soonest first): 5-column grid, gap 16. Title 13/600, date mono 12. Selected emerald, others secondary/muted. Council meeting Jul 27 14:00, Weekly executive sync Jul 29 10:00, Healthcare review Aug 3 14:00, Industrials deep dive Aug 10 14:00, Term kickoff (Exec) Aug 14 10:00.
2. Header: `bi-people` 20, `Council meeting` 24/700 −0.02em, permalink `bi-link-45deg` emerald link. Meta row 13, gap 24, no pipes: `bi-calendar3` Jul 27, 2025 14:00–16:00 · `bi-geo-alt` Miller Hall 3.02 · IC · Scheduled · Quorum: 60%.
3. Manager controls (15/600) + `(analysts: reply only)` 12 faint. Text actions 13/500 secondary, hover emerald, gap 24: Edit details `pencil`, Link pitch `link-45deg`, Mark attendance `person-check`, Set quorum `bullseye`, Mark completed `check-lg`. Note 12 muted with `bi-info-circle`: "Analysts can reply only. Managers (PMs / executives / faculty advisors) can edit agenda and attendees."
4. Agenda: grid `24 | 1fr | 80 | 120 | 40 | 80`, column gap 12. Header 12 faint, rows 13 padding 7×0. Pitch column: emerald mono link `bi-arrow-up-right HC-001` or `N/A` faint mono.
5. Attendees and replies (392) | rule 64 | Quorum tracker (168). Attendee grid `118 | 112 | 76 | 1fr`. Reply status: Yes `check-lg` `--positive`, Maybe `three-dots` `--warning`, No `x-lg` `--negative`. Tracker: role (n/m), mono %, status icon; Overall: 5/7 (71%) and "Meets quorum (≥ 60%)" in positive.
6. Your reply: Yes / Maybe / No text choice, 14/600, gap 24. Selected emerald, others muted.
7. Pre-read pack: rows with file icon, title, type (muted), emerald `bi-arrow-up-right`.
8. Investment committee vote: Status: Open (blind session), Ballots cast: 4, Quorum: Met (≥ 60%) in positive, Your vote: Pass. Nothing else is shown (blind session).

### Right rail (224)

- Next meeting brief: 13/1.6 paragraph.
- Quorum and replies by role: grid `1fr | 44 | 48 | 52`, 12 px, mono numbers, status icons; Overall row 600 with top rule.
- Read-only IC sessions (linked to pipeline): title 13, meta 11 faint (`Pipeline · Aug 5, 2025 · HC-001`), emerald arrow.
- Completed record (recent): Weekly executive sync (Jul 22, 2025 · General), Technology sector review (Jul 15, 2025 · Sector), Council meeting (Jul 8, 2025 · IC). Link "View all completed meetings" + `bi-arrow-right`.

### Completed meeting (full main width, 1144)

- Label `bi-check-circle Completed meeting` 13/600 positive, gap 24, title `Weekly executive sync` 24/700. Meta: Jul 22, 2025 10:00–11:00 · Miller Hall 3.02 · General · Completed.
- Two columns `1fr 1fr`, gap 64.
  - Left: Recording (Source: Zoom, emerald link `bi-play-fill Watch recording (54:18)`); AI meeting analysis (summary) paragraph max 460; Tone by role: grid `144 | 1fr | 56`, bar 6 px tall, track `--emerald-bg`, fill `--emerald`, square ends, signed mono values +0.62 / +0.48 / +0.36 in positive.
  - Right: Agenda recap `24 | 1fr | 120 | 80` (Outcome: Discussed, Discussed, Agreed in positive, Assigned); Deliverables discussed `48 | 1fr | 16`.
- Second row: Attendees (read-only) with Attended check column | Final IC vote: "N/A. This was not an IC session."

### New meeting dialog

- Scrim `--bg-overlay` over the whole page. Dialog 480 wide, padding 24/32/32, `--bg-primary` fill, `--shadow-xl`, no border, no radius. In the reference it is anchored at x=648, y=1440 so the review canvas mirrors the wireframe; in production center it in the viewport.
- Title 20/700, close `bi-x-lg` muted.
- Fields: grid `144 | 1fr`, gap 16×20. Label 13 muted with icon (`tags`, `calendar-plus`, `geo-alt`, `bullseye`, `link-45deg`). Values 14 primary, borderless and unfilled. Category shows `bi-chevron-down`; Quorum shows `%` suffix. Numeric values mono.
- Invited members (7): names as text with `bi-x` remove icon, wrap gap 10×20, no chip boxes.
- Footer: Cancel (plain text) and Create meeting (filled emerald, padding 10×20).

## Interactions and behavior

- Tabs, categories, upcoming strip, Your reply, Show council data: click selects; selected text turns `--emerald`. No animation.
- Category with count 0 (Education) shows the empty state in the center column.
- Show council data Off: center shows "Council data is hidden", right rail and completed section are replaced by a one-line state.
- Term navigator steps through terms (Spring 2025, Fall 2025, Spring 2026 in the mock).
- New meeting opens the dialog; Cancel, close and Create meeting close it. Create should validate Category and Scheduled time as required; Quorum 1–100; Pitch link must match an existing pitch ID.
- Permalink copies the meeting URL.
- Role gating: analysts do not see the Manager controls actions; they keep Your reply.
- Hover: text actions go emerald; primary goes `--emerald-hover`; press `--emerald-dark`. No transforms.

## States

Shown in the canvas as real page states:

- Loading: `bi-hourglass-split` muted, "Loading meetings", body "Fetching this term's meetings, replies and IC sessions." Right rail shows a one-line "Loading meetings". Completed section hidden.
- Empty (category): `bi-info-circle`, "No meetings in this category", "Choose another category, or create one with New meeting." Rail and completed section stay.
- Error: `bi-exclamation-circle` `--negative`, "Failed to load meetings", body text, plain text Retry with `bi-arrow-clockwise` in emerald.

## State management

`tab` (upcoming | past | term), `category`, `selectedMeetingId`, `myReply` (yes | maybe | no), `showCouncilData` (bool), `termIndex`, `dialogOpen`, `loadState` (loading | ready | error). Data: meetings for the term with agenda, invitees and replies, pre-reads, IC vote summary (status, ballots cast, quorum met, my vote only), pipeline IC sessions, completed meetings with recording, analysis, tone, deliverables and attendance.

## Design tokens (dark / light)

- `--bg-primary` #0a0e13 / #ffffff; `--bg-overlay` rgba(0,0,0,0.6)
- `--text-primary` #f0f6fc / #0f172a; `--text-secondary` #e2e8f0 / #1e293b; `--text-muted` #8b949e / #64748b; `--text-faint` #6b7280 / #94a3b8
- `--emerald` #10b981 / #059669; `--emerald-hover` #34d399 / #047857; `--emerald-dark` #047857 / #065f46; `--emerald-bg` rgba(16,185,129,0.08) / rgba(16,185,129,0.06)
- `--positive` #10b981 / #059669; `--negative` #ef4444 / #dc2626; `--warning` #fbbf24 / #d97706
- `--border-primary` rgba(16,185,129,0.08) / rgba(0,0,0,0.08); `--border-secondary` rgba(16,185,129,0.06) / rgba(0,0,0,0.05)
- `--shadow-xl` 0 20px 60px rgba(0,0,0,0.45) / 0 16px 48px rgba(0,0,0,0.10)
- `--radius-md` 8px (primary buttons), `--radius-pill` (Sonar)
- Fonts: Plus Jakarta Sans (all text), JetBrains Mono (every number, date, time, percentage, ID, ticker; tabular).
- Type sizes used: 11, 12, 13, 14, 15, 16, 20, 24. Spacing: 4-base (4, 8, 12, 16, 20, 24, 32, 64).
- Light mode is the same page with `data-theme="light"` (in production, `body.light-mode`).

## Icons

Bootstrap Icons 1.11.3 (`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`). All names listed per component above.

## Assets

- Walia ibex logo: placeholder in the mock; use the production asset.
- No other imagery.

## Files

- `Meetings Page.dc.html`: the page (template + logic + props `theme`, `pageState`, `dialogOpen`, `dialogTop`).
- `Ezana Meetings.dc.html`: review canvas with all five variants.
- `colors_and_type.css`: Ezana tokens, with a `[data-theme="light"]` scope added.
- `image-slot.js`, `support.js`: runtime for the mock only. Do not port.
