# Handoff: Learning Center, council version

(Read from Claude Design project https://claude.ai/design/p/c350cdc6-4866-44f5-b6f4-bfb4ce430e8c, file design_handoff_learning_center_council/README.md, 100 lines, via get_page_text while paging the editor. Wrapped lines re-joined; blank lines between blocks were not captured.)

## Overview

Redesign of `/learning-center` for the organizational version. The shared Learning Center page gains a council-only section (Council learning band, council context strip and six cards) that renders only for council members. Retail and partner users see the same page without that section.

## About the design files

The files here are design references built in HTML. They show the intended look and behaviour; they are not production code. Rebuild them in the Next.js app with `@/components/ds` and the page's own `lc-` classes, following `docs/EZANA_BRANDING_GUIDE.md`.

Open `Learning Center Council.dc.html` in a browser (keep `support.js` beside it). It shows:

- 1a: full page, dark, 1440px. 1b: the same page, light.
- 2a to 2c: Saved courses dialog (populated, empty) and the save-failure toast.
- 3a, 3b: loading, empty and error frames for every council card and the context strip.
- 4a: the audit list.

`LC Council Page.dc.html` is the page itself (props: `theme`, `showCouncil`, `simulateSaveFailure`).

## Fidelity

High fidelity. Spacing, type, tokens and copy are final. All names and figures are sample content.

## Layout (1440px artboard)

- Envelope: nav and content share 32px side padding. Content runs from x = 32 (left edge of the Walia ibex glyph) to x = 1408 (right edge of the `bi-box-arrow-right` glyph). No inner max-width.
- Nav: 64px, hairline beneath. Content starts 24px below.
- Side-by-side cards: 64px apart. Where a vertical hairline divides them it sits centred in the gap (31.5px + 1px + 31.5px), so text is never closer than 24px to a rule.
- Cards: transparent, no border, shadow or radius, 20px vertical padding, 0 side padding. Header: icon + 18px/700 title, hairline (`--ez-rule`) under it. Rows divided by `--ez-rule-subtle`.

Order, top to bottom:

1. KPI strip (48px, content-width): LearningELO `128 in 7d`, Current tier `Bronze tier`, Current streak `3 days`, Badges earned `0`, Active tracks `0 / 5`. 28px icon slot, 12px/500 `--text-muted` label, 18px/600 JetBrains Mono value. Cells split by hairlines with 24px each side. Right side: `Sample content` (12px `--text-faint`), `Saved courses (0)` text button (`bi-bookmark`), `Start learning` primary (`bi-play-fill`), ending on x = 1408.
2. Council learning band (council only): 22px/700 heading, then text tabs `Assigned to me (3)`, `Onboarding (5)`, `Team progress (5)`, 32px apart, 48px after the heading.
3. Council context strip: `bi-people`, Sample council / University investment council | Fund value `$240,050.00`, Since inception `+46.73%`, SPY `+10.08%`, Positions `12` | Sector teams (Financials · Healthcare · Technology · Industrials) | Cohort `2026 analyst class` (right-aligned). The Positions tooltip lists the 12 tickers: JPM, SCHW, BAC, LLY, UNH, MRK, NVDA, MSFT, AAPL, CAT, GE, HON.
4. Row of three (416px each): Assigned to me (3) · Onboarding gate · 2026 analyst class · My grades.
5. Row of three: Council path · Team progress · Faculty/advisor queue.
6. Rating history (1fr) | Daily quest (416px, same column as the third card above).
7. Your tracks (240px) | Active path (1fr) | Your progress + Recommended for you (344px).

## Components

- **Assigned to me**: rows `20px icon | title | Due <mono date> | status (96px, right)`. Status words with icons: Due soon `bi-clock`, Overdue `bi-exclamation-triangle` (`--warning` icon, word in `--text-secondary`), Assigned `bi-circle`.
- **Onboarding gate**: five checkboxes (`bi-check-square-fill` in `--emerald-text` / `bi-square` in `--text-muted`). Footer: `Ready to pitch: No · 3 items remaining`, computed from the checklist (Yes at 0). Note line under it in 13px muted.
- **My grades**: Participation `18 / 20` `A-`, Overall `84 / 100` `B+`. Score and letter in mono, primary or secondary text, never red or green. Feedback lines describe what is counted.
- **Council path**: three steps with mono numerals (no circles), `bi-chevron-right` on the right line; Starter lessons (4) with `bi-play-fill` and mono durations. Subtitle lives in an info tooltip.
- **Team progress**: columns Member | Assigned complete | Due this week | Learning score (info). Number columns right-aligned, mono. Footnote: Private course progress is not shown.
- **Faculty/advisor queue**: two overdue rows (title, member · Due date), then the inline empty state `No additional review requests right now.` + `View all assignments` link.
- **Rating history**: period selector `1M 3M 6M 1Y ALL` (mono 12px, text only, `3M` selected). Step line in `--chart-line`, gradient `--emerald` 35% to 0, dashed gridlines in `--ez-rule`, 11px mono ticks. Side panel behind a hairline: Network position `128 of 2,519 in the Bronze tier`; Rating tiers with `bi-diamond-fill` in `--tier-platinum/gold/silver/bronze`; the user's tier in `--emerald-text`.
- **Daily quest**: `Resets in 23h 27m`; featured lesson with `Start` link; three checkbox quests with mono rewards in `--text-secondary`.
- **Your tracks**: five tracks (icon, name, 4px bar, mono count). Selected track is emerald text.
- **Active path**: title, status line, `0 / 31 complete` with bar; level tabs Bronze (0 / 8), Silver (0 / 9), Gold (0 / 8), Platinum (0 / 6); borderless filter field (`bi-search`) and `Saved (n)` toggle; course rows B1 to B8 (status icon, code, title + description, minutes, `+10 ELO`, `Start` or `Not started`, bookmark icon button).
- **Your progress**: 2x2 stats split by a hairline (Quizzes passed `0 / 31`, Quiz accuracy `N/A`, Estimated hours `0.0`, Track rating `0`), badge line + `View badges` link, Active days this week (Mon to Sun `bi-circle`), Best streak `0` days.
- **Recommended for you**: three rows with `bi-play-fill` on the right line.
- **Navigation**: ibex logo + Ezana, `bi-bell`, `bi-list-check` | Team Hub `bi-buildings`, Research and Trading with `bi-chevron-down`, Sonar (filled `--btn-primary-bg` pill, `--radius-xl`, `--btn-primary-fg` text, `bi-broadcast`), Watchlist `bi-bookmark`, Community `bi-people`, Learning Center `bi-mortarboard` (`--emerald-text`, `aria-current="page"`) | `bi-person-circle`, `bi-gear-fill`, `bi-box-arrow-right` in `--negative`. Build with the existing `Navbar.js`; do not restyle it.

## Interactions and behaviour

- Row hover on every list: text colour to `--emerald-text` in 0.15s. No wash, no accent bar, no lift.
- Tabs, level tabs, period selector, track list, Saved toggle: text only, selected in `--emerald-text`, others `--text-muted`. Expose `aria-selected` / `aria-pressed`. Keyboard focus: 2px `--border-focus` ring, 2px offset.
- Council tabs move focus and scroll to the matching card (Assigned to me, Onboarding gate, Team progress).
- Filter field filters courses by title or description as the user types. Saved toggle shows saved courses only. No match: one line plus `Show all courses`.
- Silver, Gold and Platinum have no course list in the design. Show `<Level> opens after the Bronze level badge.` until real data exists.
- Bookmark saves or removes a course and updates both Saved counts. On failure: the bookmark stays unsaved and a toast reads `Could not save <course>.` with Retry and dismiss, top right under the nav, 6 seconds, announced politely.
- Saved courses (KPI row) opens a `Modal`: list with Remove per row, text `Close`, primary `Browse courses`. Empty: one line. Escape and outside click close it; focus returns to the trigger.
- Onboarding and quest checkboxes toggle; the remaining count updates.

## States (every council card and the context strip)

- Loading: `Skeleton` bars in the final layout (`--ez-rule` fill, 2px radius), no spinners. Animation off under `prefers-reduced-motion`.
- Empty: one line, one action (copy in frames 3a, 3b).
- Error: `bi-exclamation-triangle` (`--warning`), short message, Retry text button in `--emerald-text`. The rest of the page keeps working.

## State and data

`councilTab`, `period`, `level`, `track`, `query`, `savedOnly`, `saved[]`, `onboardingChecks[]`, `questChecks[]`, `savedDialogOpen`, `saveErrorCourseId`. Council data (assignments, onboarding checklist, grades, path, team progress, queue, context) loads per card so each can fail alone. The council section renders only when the user is a council member.

## Tokens

From `src/app/theme-variables.css` and `src/styles/home-canvas.css` (both included):

- Ground and text: `--bg-primary` (#0a0e13 / #ffffff), `--text-primary` (#f0f6fc / #0f172a), `--text-secondary` (#e2e8f0 / #1e293b), `--text-muted` (#8b949e / #64748b), `--text-faint` (#6b7280 / #94a3b8).
- Emerald: `--emerald` (#10b981 / #059669), `--emerald-text` (#34d399 / #047857), `--chart-line`.
- Buttons: `--btn-primary-bg` (= `--emerald`), `--btn-primary-fg` (#ffffff), `--btn-primary-bg-hover` (= `--emerald-hover`).
- Rules: `--ez-rule` (text-primary at 7% dark / 10% light), `--ez-rule-subtle` (4.5% / 6%). Set by `.ez-canvas`.
- Status: `--positive`, `--negative`, `--warning`. Tiers: `--tier-bronze`, `--tier-silver`, `--tier-gold`, `--tier-platinum`.
- Overlays: `--border-primary`, `--radius-lg`, `--shadow-lg` (modal), `--shadow-md` (toast), `--bg-overlay`. Buttons `--radius-md`. Focus `--border-focus`.
- Type: `--font-sans` (Plus Jakarta Sans), `--font-mono` (JetBrains Mono, tabular figures). Sizes: section 22/700, card title 18/700, body 14 to 15/500, labels 12/500, KPI value 18/600 mono, table value 13 mono.
- Spacing: 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Light mode: the same tokens under `body.light-mode` (the reference uses `.force-light-theme`).

Note: the attached Ezana Finance Design System (`colors_and_type.css`) has no `--btn-primary-fg`, `--emerald-text` or `--ez-rule`. The repo has them; use the repo. The repo has no pill radius token: the Sonar pill uses `--radius-xl` (16px), which fully rounds its 30px height.

## Icons

Bootstrap Icons only: bi-bell, bi-list-check, bi-buildings, bi-search, bi-graph-up, bi-chevron-down, bi-broadcast, bi-bookmark, bi-bookmark-fill, bi-people, bi-mortarboard, bi-person-circle, bi-gear-fill, bi-box-arrow-right, bi-lightning-charge, bi-info-circle, bi-diamond-fill, bi-fire, bi-patch-check, bi-layers, bi-play-fill, bi-play-circle, bi-file-earmark-text, bi-clock, bi-exclamation-triangle, bi-circle, bi-check-square-fill, bi-square, bi-bar-chart, bi-stack, bi-chevron-right, bi-person, bi-clipboard-check, bi-inbox, bi-arrow-right, bi-hexagon, bi-bullseye, bi-droplet-half, bi-shield-check, bi-check2-circle, bi-x-lg.

## Assets

`public/waliaibex.png` (from the repo). Render at 74px square with -14px left and -10px top offsets so the glyph is 54px tall and its left edge is on x = 32.

## Sample content and open items

- Sample: Sample council, every member name, every figure, every date.
- Flagged: Stocks, Bonds, and ETFs Explained is 12 min in the course list but 15 min elsewhere; Current streak 3 days vs empty Active days and Best streak 0; LearningELO 128 equals network position 128.
- No data in the design: Silver, Gold and Platinum course lists.
- Owner may reverse: table headers kept in sentence case (guide uses 11px caps).
- Must keep working: the retail and partner Learning Center (no council section), course pages under `/learning-center/course/[courseId]`, badges.

## Files

- `Learning Center Council.dc.html`: board with all frames and the audit list.
- `LC Council Page.dc.html`: the page (HTML with inline styles and the interaction logic).
- `learning-center-council.css`: page-scoped `lc-` CSS equivalent for the build.
- `src/app/theme-variables.css`, `src/styles/home-canvas.css`: token sources.
- `support.js`: runtime needed to open the .dc.html files locally.
