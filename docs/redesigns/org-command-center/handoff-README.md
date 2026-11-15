<!-- Transcribed by the Stage 2 agent from design_handoff_team_hub_command_center/README.md in the Claude Design project
https://claude.ai/design/p/4ed872fe-1d1d-4151-942c-ae96e6c5d8d9 (223 lines, read on screen page by page; blank lines and
soft-wrapped lines were re-joined by hand, wording is unchanged). Everything below this comment is Claude Design's text. -->

# Handoff: Team Hub Command Center (organizational, /org-team-hub)

## Overview

The Command Center is the home page of the Team Hub for university student-managed investment funds. It gives the council (executives, portfolio managers, analysts) a one-screen read on fund performance, what needs attention, upcoming dates, the past week's activity, sector team returns, setup progress, data health and council make-up. It ships in dark mode (default) and light mode.

## About the design files

The files in this bundle are design references built in HTML. They show the intended look and behaviour; they are not production code to copy. Recreate them in the target codebase (the Ezana Next.js app: React, Tailwind, `src/app/theme-variables.css`) using its existing patterns. Tokens in this bundle map 1:1 to that theme file.

## Fidelity

High fidelity. Colours, type, spacing and copy are final. Recreate pixel-accurately at 1440px.

## Files

- `Command Center Board.dc.html` - canvas showing 1a dark page, 1b light page, 2a to 2g sidebar examples. Open this file.
- `Command Center.dc.html` - the page (prop `mode`: `dark` or `light`).
- `Team Hub Sidebar.dc.html` - the shared sidebar component (props `role`, `layout`, `selected`, `loading`, `memberName`, `initials`).
- `colors_and_type.css` - design system tokens. One local change: the light-mode selector also matches `.light-mode` on any element so the light page can render beside the dark one. In the app, keep `html.light-mode, body.light-mode`.
- `assets/ezana-nav-logo.png` - nav brand mark.
- `support.js` - runtime that lets the `.dc.html` files open in a browser. Not part of the implementation.

Each `.dc.html` contains the full markup with inline styles (the HTML and CSS source). All styling is inline `style` attributes that resolve to the tokens below.

---

## Page layout (1440px)

```
x=0                                                                x=1440
| 32 | logo ... nav ......................................... logout | 32 |   top nav, 64px tall
| 32 | sidebar 200 | 24 | rule 1px | 24 | main 1127 ...................| 32 |
```

- Outer horizontal padding 32px. Content runs from x=32 (left edge of the logo) to x=1408 (right edge of the logout icon).
- Sidebar: 200px wide, x=32 to x=232; sidebar text starts at x=32.
- Vertical hairline: 1px `--border-primary`, full height from nav bottom to page bottom, at x=256 (24px clear on each side).
- Main column: x=281 to x=1408 (1127px). `padding-bottom: 64px`.
- Main rows are stacked with `padding: 32px 0` and a 1px `--border-primary` bottom hairline between rows (none after the last).
- Side-by-side sections: CSS grid `620px 1px minmax(0,1fr)` (row 5: `500px 1px minmax(0,1fr)`), `column-gap: 31.5px`, so 64px between sections with the 1px rule centred (31.5px clear each side, above the 24px minimum).
- Cards are flat: no fill, no border, no shadow, no radius. Sections are separated only by hairlines and whitespace.

### Top navigation (64px)

- `display:flex; align-items:center; padding:0 32px; border-bottom:1px solid var(--border-primary); background:var(--bg-primary)`.
- Left group, fixed 249px wide so the menu starts at the main-column line (x=281): logo (`ezana-nav-logo.png`, height 30px, `transform:scaleX(-1)`), `bi-bell`, `bi-check2-square`, 20px icons, `--text-secondary`, gap 24px.
- Menu, gap 32px, 14px/500 Plus Jakarta Sans, `--text-secondary`, hover `--text-primary`:
  `Team Hub` (`bi-building`, selected: `--emerald`, 600) / `Research` + `bi-chevron-down` 11px / `Trading` + chevron / `Sonar` filled pill (`bi-broadcast`, background `--emerald`, text `--bg-primary`, 600, padding 8px 20px, radius `--radius-pill`) / `Watchlist` / `Community` (`bi-people`) / `Learning Center` (`bi-book`).
- Right group (margin-left:auto, gap 24px): `bi-person-circle`, `bi-gear` (`--text-secondary`), `bi-box-arrow-right` in `--negative`. Logout right edge sits at x=1408.

### Row 1, KPI strip

- Flex row, align centre. KPI group `flex:1; justify-content:space-between; gap:20px`, then a 1px vertical rule (margin 0 24px, full row height), the cohort switcher, then the button (margin-left 24px).
- Each KPI cell: label 12px/500 `--text-muted` sentence case; value JetBrains Mono 16px/600 (gap 6px).
- Fund value `$240.05K` (`--text-primary`), Return `+46.13%` (`--positive`), Alpha `+36.15%` (`--positive`), Benchmark `SPY` (`--text-primary`) + `+10.08%` (`--positive`), Open tasks `8`, Due this week `5`, Open breaches `2` (`--negative`), Team members `21`.
- Cohort switcher: text button `2026 analyst class` (2026 in mono) 15px/600 `--text-primary` + `bi-chevron-down` 11px; `Sample content` 12px `--text-muted`; `Fund calendar` text link 13px/500 `--emerald`.
- `New task`: the only solid button in the row. Background `--emerald`, text `--bg-primary`, 14px/600, padding 10px 18px, radius `--radius-md`, hover background `--emerald-hover`. Right edge x=1408.

### Row 2, Fund performance (left 620px) and Needs your attention (right)

**Fund performance**

- Header: title 20px/600, letter-spacing -0.01em, `--text-primary`. Range selector right: `1M 3M YTD 1Y`, mono 13px, gap 20px, text only. Selected (`YTD`) is `--emerald` 600; others `--text-muted`, hover `--text-primary`. No underline, pill or track.
- Body grid `minmax(0,1fr) 1px 148px`, column-gap 24px, margin-top 24px.
- Chart (SVG, viewBox 400x216, 216px tall): y labels `+60% +40% +20% 0% -20%` mono 10px `--text-muted`; horizontal gridlines `--border-primary`; axes `--chart-axis`; month ticks `Jul Aug Sep Oct Nov`. Fund: 2px `--chart-line` line with area fill gradient `--emerald` 32% opacity to 0. SPY: 1.5px `--text-muted` dotted (`stroke-dasharray:1 4; stroke-linecap:round`). Fund ends at +46.13%, SPY at +10.08%.
- Legend under chart (aligned to plot left, 44px): solid swatch + `Fund +46.13%`, dotted swatch + `SPY +10.08%`, 12px, numbers in mono.
- Read-out column, gap 16px: label 12px/500 `--text-muted` + value mono 20px/600: Fund value `$240.05K`, Return on cost `+46.13%` (`--positive`), Alpha `+36.15%` (`--positive`), Benchmark `SPY` (16px). `Benchmark source: market prices` 12px `--text-muted`. `Open trading desk` + `bi-arrow-right` text link, 14px/500 `--emerald`, pinned to the bottom.

**Needs your attention**

- Header: title + `Executive view` 13px `--text-muted` right-aligned.
- Filters (text only, gap 24px, 14px): `Pending` selected (`--emerald` 600), `In progress`, `Complete` (`--text-muted` 500, hover `--text-primary`).
- Rows: grid `20px minmax(0,1fr) 72px 92px 80px`, column-gap 12px, padding 14px 0, hairline between rows. Columns: icon 17px, title 14px/600 `--text-primary` over subtitle 12px `--text-muted`, owner 13px, date mono 12px, status (icon + word, 13px/500, never a pill).
  1. `bi-exclamation-triangle` (`--negative`) Overdue task / Update sector coverage / A. Tesfaye / Nov 10, 2026 / `bi-clock` Pending (`--negative`)
  2. `bi-clipboard-check` Assignment due / Healthcare sector note / M. Bekele / Nov 14, 2026 / `bi-clock` Pending (`--negative`)
  3. `bi-calendar-event` Upcoming meeting / Investment council / Exec team / Nov 15, 2026 / `bi-calendar-check` Scheduled (`--positive`)
  4. `bi-shield-check` Open breaches / 2 compliance items / Compliance / N/A (`--text-muted`) / `bi-exclamation-circle` Open (`--negative`)

### Row 3, Upcoming dates (left) and Seven-day digest (right)

- Upcoming dates header: title + text toggles `Meetings`, `Assignments` (both on, `--emerald` 600; off state is `--text-muted`).
- Rows: grid `104px 96px 152px minmax(0,1fr)`, gap 16px, padding 12px 0, 13px. Date mono 12px `--text-secondary`; type `--emerald` 500 (plain text, no chip); team `--text-secondary`; title `--text-primary`.
  Nov 12, 2026 Meeting Executive team Weekly exec sync / Nov 14, 2026 Assignment Healthcare team Sector note due / Nov 15, 2026 Meeting Investment council Council meeting / Nov 20, 2026 Task Research team Update pitch tracking / Dec 01, 2026 Assignment Technology team Coverage refresh.
- Seven-day digest header: title + `Last 7 days` 13px `--text-muted`. Rows: flex space-between, padding 11px 0, 14px; label `--text-secondary`, value mono `--text-primary`. New pitches 3, Votes cast 12, Positions opened 2, New research notes 6, Awards given 1, Top pitch by alpha `NVDA` (mono 600) `+12.48%` (`--positive`).

### Row 4, Sector teams ranked by return (left) and Setup checklist (right)

- Header link `Open fund analytics` + `bi-arrow-right`, `--emerald`.
- Table grid `24px 120px minmax(0,1fr) 84px 140px`, gap 16px. Header 12px/500 `--text-muted`: `#`, `Sector team`, `Return on cost`, `Value`, `Top tickers`. Rows padding 12px 0.
- Return cell: mono 13px `--positive` value (64px) + 3px `--emerald` bar, width proportional to return (max 112px = best team): 112, 89, 65, 35px.
- 1 Financials +60.50% $96.21K JPM SCHW BAC / 2 Healthcare +48.20% $72.36K LLY UNH MRK / 3 Technology +35.30% $51.81K NVDA MSFT AAPL / 4 Industrials +18.90% $19.67K CAT GE HON.
- Setup checklist: `3 of 5 complete` 13px `--text-muted`. Rows padding 11px 0, gap 12px. Done: `bi-check-circle-fill` `--emerald` + label `--text-secondary` + `Done` 13px `--text-muted`. To do: `bi-circle` `--text-muted` + label `--text-primary` + `Set up` + `bi-arrow-right` text link `--emerald`. Items: Add or import positions, Create sector teams, Invite members (done); Assign sector coverage, Set IPS rules (to do).

### Row 5, Fund data health (left 500px) and Council snapshot (right)

- Data health rows: `bi-check-circle-fill` 16px `--emerald`, label 14px, value right 12px. Price freshness `Updated 1d ago`, Last snapshot `Nov 12, 2026`, Unpriced positions `0 of 6`, Missing sector/team `0 of 0`, Benchmark source `SPY`, Overall status `Healthy` (15px/600 `--positive`). Per-row status icon swaps to `bi-exclamation-triangle-fill` `--warning` (stale) or `bi-x-circle-fill` `--negative` (failing).
- Council snapshot: inner grid `minmax(0,1fr) 1px minmax(0,1fr)`, gap 24px. Left list (icon `--text-muted`, label, mono value): `bi-people` Members 21, `bi-stack` Teams 4, `bi-person` Portfolio managers 4, `bi-people` Analysts 17. Right: `bi-diagram-3` I oversee / All sector teams; `bi-clipboard-check` My open assignments / `4/16` (mono).

### Row 6, State examples

- Title, then `Key interface states for the Team Hub Command Center.` 14px `--text-muted`. Three columns `1fr 1px 1fr 1px 1fr`, gap 31.5px.
- Loading (upcoming dates): four skeleton rows, `88px` + `1fr` bars, 10px tall, `--border-hover` fill, 20px vertical gap, 24px column gap. No radius.
- Empty state (no scheduled items): `bi-calendar` 28px, `No upcoming dates` 15px/600, `This council has no scheduled meetings, assignments, or tasks.` 13px `--text-muted`, primary button `Add item`.
- Error state (data health): `bi-exclamation-circle` 28px `--negative`, `Could not load fund data health`, `We were unable to fetch the latest data.`, primary button `Retry`.

---

## Shared component: Team Hub sidebar

Reused unchanged on the Command Center and 16 other Team Hub pages. Implement once (e.g. `components/team-hub/TeamHubSidebar.jsx`) and pass the current route as `selected`.

### Props

- `selected` (string, item label or route) - which item is active.
- `role`: `executive` | `pm` | `analyst`.
- `member`: `{ name, initials }`; `loading` while it resolves.
- `counts`: object keyed by item, numbers from the API.

### Desktop (900px and up)

- Width 200px, left column of the page shell, starts at the page's 32px content line (x=32), top aligned under the nav. Followed by 24px gap, the full-height 1px `--border-primary` rule, 24px gap, then content. The sidebar scrolls with the page (not fixed).
- Member block: `padding:32px 0 24px; border-bottom:1px solid var(--border-primary)`; flex, gap 12px.
  - Avatar: 40px circle, background `--emerald-bg-hover`, initials 14px/600 `--emerald`.
  - Name: 15px/600 `--text-primary`, letter-spacing -0.01em.
  - Role: 12px/600 uppercase, letter-spacing 0.1em, `--emerald`: `Executive`, `Portfolio manager`, `Analyst`.
  - Loading skeleton: 40px circle + two bars (110x12px and 70x10px, gap 8px), all `--border-hover`, no text. Items still render.
- Item list: `padding:16px 0 32px`, flex column. Each item is a link: height 40px, flex, gap 12px, icon 16px in a 16px box, label 14px/500 `--text-secondary`, count pushed right.

### The 17 items, in order

| #   | Label            | Bootstrap icon         | Count                                   |
| --- | ---------------- | ---------------------- | --------------------------------------- |
| 1   | Command Center   | `bi-speedometer2`      | none                                    |
| 2   | Trading Desk     | `bi-bank`              | none                                    |
| 3   | Fund Analytics   | `bi-graph-up`          | none                                    |
| 4   | Assignments      | `bi-clipboard-check`   | `4/16` (open / total)                   |
| 5   | Org Chart        | `bi-diagram-3`         | none                                    |
| 6   | Pitch Pipeline   | `bi-easel2`            | 6                                       |
| 7   | Research Library | `bi-archive`           | 4                                       |
| 8   | Sonar Research   | `bi-broadcast`         | none                                    |
| 9   | Meetings         | `bi-camera-video`      | 2                                       |
| 10  | Recognition      | `bi-award`             | 1                                       |
| 11  | Grades           | `bi-clipboard-data`    | 1                                       |
| 12  | Competitions     | `bi-trophy`            | none                                    |
| 13  | Council Rankings | `bi-bar-chart-steps`   | none                                    |
| 14  | Cohorts          | `bi-people`            | 3                                       |
| 15  | Compliance       | `bi-shield-check`      | 2, in `--negative`                      |
| 16  | Reports          | `bi-file-earmark-text` | none (count slot exists, hidden at 0)   |
| 17  | Team Permissions | `bi-key`               | none; label and icon always `--emerald` |

### Counts

- Plain numbers, JetBrains Mono 12px, tabular-nums, `--text-muted`, right-aligned. No badge, pill, dot or box.
- Hidden when zero. For Assignments (`open/total`), hide when open is 0.
- Compliance count uses `--negative` (open breaches).

### States

- Default: `--text-secondary` label and icon.
- Hover: label and icon go to `--text-primary`. No background tint, no underline. Emerald items hover to `--emerald-hover`.
- Selected: label and icon `--emerald`, weight 600. Text colour only: no bar, pill, background or border. `aria-current="page"`.
- Focus-visible: 2px `--border-focus` outline, offset 2px.

### Role visibility

- Executive: all 17 items.
- Portfolio manager: hides Cohorts (16 items).
- Analyst: hides Cohorts, Compliance and Reports (14 items).

Hidden items are removed from the DOM, not disabled. Route guards must enforce the same rule.

### Tablet and phone (under 900px)

- The sidebar moves above the page content as a full-width block; the vertical rule is removed and replaced by a 1px `--border-primary` bottom hairline (`padding:24px 0 16px`).
- Member block becomes one row (avatar, name, role), gap 12px between it and the items.
- Items wrap into rows: `display:flex; flex-wrap:wrap; column-gap:20px`; each item `inline-flex`, gap 8px, height 44px (touch target), `white-space:nowrap`, count shown inline after the label.
- Page padding: 32px on tablet, 16px on phone. Nothing exceeds the viewport, so there is no sideways scroll (`max-width:100%`, no fixed widths).
- See board examples 2a (768px) and 2b (390px).

```css
.team-hub-shell {
  display: flex;
  padding: 0 32px;
}
.team-hub-sidebar {
  width: 200px;
  flex-shrink: 0;
  margin-right: 24px;
}
.team-hub-main {
  flex: 1;
  min-width: 0;
  border-left: 1px solid var(--border-primary);
  padding-left: 24px;
}
@media (max-width: 899px) {
  .team-hub-shell {
    flex-direction: column;
  }
  .team-hub-sidebar {
    width: 100%;
    margin-right: 0;
    border-bottom: 1px solid var(--border-primary);
  }
  .team-hub-sidebar nav {
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: 20px;
  }
  .team-hub-sidebar nav a {
    height: 44px;
  }
  .team-hub-main {
    border-left: 0;
    padding-left: 0;
  }
}
@media (max-width: 639px) {
  .team-hub-shell {
    padding: 0 16px;
  }
}
```

---

## Interactions and behaviour

- Range selector (1M, 3M, YTD, 1Y): single select, re-fetches fund and SPY series; read-out values stay as of today.
- Needs your attention filters: single select, filters rows by status.
- Upcoming dates toggles: multi select; tasks always show.
- Cohort switcher: dropdown menu of cohorts; changes every widget's data.
- Text links: `--emerald`, hover `--emerald-hover`, no underline. Primary buttons hover to `--emerald-hover`, press `--emerald-dark`.
- Transitions: colour 150ms ease-out. No scale or shadow effects.
- Each widget loads independently and owns its loading skeleton, empty state and error state (see row 6). Retry re-runs only that widget's request.
- Missing values render `N/A` in mono `--text-muted`. Percentages are always signed with two decimals.

## State

- `range`, `attentionFilter`, `dateTypes`, `cohortId` (page level).
- Per widget: `{ status: 'loading' | 'ready' | 'empty' | 'error', data }`.
- Sidebar: `member`, `role`, `counts`, `selected` (from route).

## Design tokens (dark / light)

- `--bg-primary` #0a0e13 / #ffffff (page, nav, button text)
- `--text-primary` #f0f6fc / #0f172a; `--text-secondary` #e2e8f0 / #1e293b; `--text-muted` #8b949e / #64748b; `--text-faint` #6b7280 / #94a3b8
- `--emerald` #10b981 / #059669; `--emerald-hover` #34d399 / #047857; `--emerald-bg-hover` rgba(16,185,129,0.12)
- `--positive` #10b981 / #059669; `--negative` #ef4444 / #dc2626; `--warning` #fbbf24 / #d97706
- `--border-primary` rgba(16,185,129,0.08) / rgba(0,0,0,0.08) (all hairlines); `--border-hover` rgba(16,185,129,0.20) / rgba(16,185,129,0.25) (skeletons); `--border-focus` rgba(16,185,129,0.40) / 0.50
- `--chart-line` #10b981 / #059669; `--chart-axis` #4b5563 / #94a3b8
- Radii used: `--radius-md` 8px (buttons), `--radius-pill` (Sonar nav item), 50% (avatar). No card radius.
- Shadows: none.
- Spacing: 4px base; 12, 16, 20, 24, 32, 64px used.
- Type: Plus Jakarta Sans (all text; 12, 13, 14, 15, 20px; 500/600). JetBrains Mono (every number, ticker, date; 10, 12, 13, 16, 20px).

## Icons

Bootstrap Icons 1.11.3 only (`https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`, or the `bootstrap-icons` npm package). Used: bell, check2-square, building, chevron-down, broadcast, people, book, person-circle, gear, box-arrow-right, arrow-right, exclamation-triangle, clipboard-check, calendar-event, shield-check, clock, calendar-check, exclamation-circle, check-circle-fill, circle, stack, person, diagram-3, calendar, plus the sidebar set above.

## Assets

- `assets/ezana-nav-logo.png` from the Ezana Finance design system. The wireframe draws a Walia ibex mark; the design system only contains the pegasus mark, so it is used as a stand-in. Swap in the ibex asset at the same 30px height when available.

## Audit against the Ezana branding and UI guide

Changes made to the wireframe while keeping its layout:

1. Nav: Team Hub selected state changed from purple to emerald text; Sonar pill text changed from white to `--bg-primary` for contrast on emerald; logout icon set to `--negative`.
2. Sidebar: Command Center selected state changed from purple to emerald text only; counts changed from mixed emerald/white to plain `--text-muted` mono numbers (Compliance stays red); counts of zero hidden.
3. Content alignment: logo and sidebar text start at x=32, logout and New task end at x=1408; nav menu starts on the main-column line.
4. Vertical rules: every rule now has at least 24px clear space each side (sidebar rule 24px; section rules 31.5px for a 64px section gap; inner rules 24px). The hairlines between the eight KPI cells were removed because 24px around seven rules would not fit at 1440px; cells are spaced by a 20px gap instead.
5. KPI and read-out labels changed from ALL CAPS to sentence case; table headers in the sector table likewise. Role eyebrow keeps small caps as specified.
6. Fund calendar changed from white text to an emerald text link to match other links.
7. Needs your attention: the three filters lost their dropdown chevrons and became a text-only single select (Pending selected in emerald, others muted).
8. Status words now carry an icon (clock, calendar-check, exclamation-circle). `Open breaches` KPI value and Open status use `--negative`.
9. Benchmark `+10.08%` coloured `--positive` like every other positive delta.
10. Month ticks changed from `JUL AUG ...` to `Jul Aug ...` (sentence case); y labels and ticks kept in mono.
11. `I oversee / All sector teams` value changed from mono to Plus Jakarta Sans (it is text, not a number); `4/16`, `1d`, `0 of 6`, `3 of 5`, `2026`, `7` and `2` set in mono.
12. Skeleton bars, cards and rows use no radius, fill or shadow (skeleton bars are the only fills, using `--border-hover`).
13. All icons drawn with Bootstrap Icons; all colours resolve to design-system tokens; no em dashes in copy.
14. Primary buttons (New task, Add item, Retry) use `--radius-md` and `--bg-primary` text; one per group. All other actions are text links.
