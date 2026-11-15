# Handoff: Ezana Learning Center (retail) redesign

## Overview

Redesigned `/learning-center` page for the Ezana Finance retail app. One full desktop page at 1440px wide, dark mode default with a matching light mode. It shows the learner's LearningELO, rating history, a daily quest, their tracks, the active learning path with its course list, progress stats, recommendations, and reference loading / empty / error states.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behaviour, not production code to ship. Recreate them in the target codebase (the Ezana Next.js app, `src/app/learning-center`) using its existing patterns: Tailwind, the `theme-variables.css` tokens and existing primitives. All colours in the design come from the Ezana token set, so map `var(--token)` straight to the codebase variables of the same name.

## Fidelity

**High fidelity.** Final layout, colour, type, spacing and interactions. Recreate pixel-accurately.

## Global rules (from the Ezana branding audit)

- Flat sections: no card fill, border, shadow or radius. Sections are separated by 1px hairlines only.
- Content spans x=32 to x=1408 (page padding 0 32px; logo left edge to logout icon right edge). All horizontal rules sit inside that width.
- Side-by-side sections: 64px apart, with a 1px vertical rule centred in the gap (32px clear each side). KPI strip and inner 2x2 stat grid: 24px clear each side of each rule.
- Tabs, range selectors, toggles: text only. Selected = `--emerald` text, weight 600. No underline bar, pill, track or wash.
- Selected track row: emerald name + icon only. No accent bar, no background.
- One solid emerald button per group (Resume learning). Every other action is plain text (emerald for affirmative actions, `--text-primary` for neutral ones).
- Text fields are borderless (course filter has no box: icon + bare input on a hairline row).
- No boxes around chips, labels or tags.
- Icons: Bootstrap Icons only (`bootstrap-icons@1.11.3`). No Unicode glyphs (no arrows, ticks, ≥).
- Type: Plus Jakarta Sans for text; JetBrains Mono (tabular-nums) for every number, rating, course code, duration, ELO reward, count, date and countdown.
- Sentence case throughout (brand names such as Ezana Finance and Learning Center stay as proper nouns). No em dashes. Ranges use "to". Percentages signed with two decimals. Missing values render as `N/A`.

## Layout (top to bottom, 1440px frame)

### 1. Navigation bar (68px tall, bottom hairline `--border-hover`)

Left group (gap 24): logo mark 40px tall (mirrored with `scaleX(-1)`) + "Ezana Finance" 18/700 `--text-primary`; `bi-bell` with 7px `--negative` dot, `bi-clipboard-check` (18px, gap 20); 1×32 vertical rule; nav links 14/500 `--text-secondary`, gap 24, icon gap 6:
Dashboard `bi-bar-chart-line`, Research `bi-search` + `bi-chevron-down`, Trading `bi-graph-up-arrow` + chevron, **Sonar** `bi-broadcast` as a filled pill (bg `--emerald`, text `--bg-primary`, 600, padding 8×14, radius `--radius-pill`), Watchlist `bi-bookmark`, Community `bi-people`, Learning Center `bi-mortarboard` (active: `--emerald` text).
Right group: 1×32 rule, then 20px icons gap 20: `bi-person-circle`, `bi-gear-fill`, `bi-box-arrow-right` in `--negative`.

### 2. KPI strip (padding 28px 0, bottom hairline)

Flex row, gap 24, 1px rules (stretch) between items. No page title.

- LearningELO + `bi-info-circle` (label 14 `--text-secondary`), value `1,284` mono 28/600 `--text-primary`, delta `+48 (+3.90%) in 7D` mono 12 `--positive`.
- Current tier + info: `bi-award` + "Silver tier" 20/500.
- Current streak: `bi-fire` + `6 days` mono 20/500.
- Badges earned: `bi-award` + `9`.
- Active tracks: `bi-layers` + `3 / 5`.
- Rule, then actions (gap 24): primary button "Resume learning" with `bi-play-fill` (bg `--emerald`, text `--bg-primary`, 15/600, padding 13×22, radius `--radius-md`, hover bg `--emerald-hover`); text action "Saved courses (8)" 15/500 `--text-primary`, hover `--emerald`.
- "Sample content" 12 `--text-muted`, pushed right (`margin-left:auto`), top-aligned.

### 3. Rating history + Daily quest (grid `1fr 1px 458px`, gap 32, padding 32 0 40)

**Rating history** (inner grid `1fr 248px`, gap 40):

- Header: "Rating history" 22/600, tracking -0.01em. Range selector right-aligned above the chart: 1M 3M 6M 1Y ALL, mono 13, gap 28, unselected `--text-muted`, selected (3M) `--emerald` 600. Header margin-bottom 40.
- Chart: grid `52px 1fr` × rows `248px 28px`. Y labels 1,340 / 1,300 / 1,260 / 1,220 / 1,180 / 1,140 mono 12 `--text-muted`. Plot has left + bottom axis `--border-hover`, dashed gridlines `--border-primary`. X labels Aug 01, Aug 15, Sep 01, Sep 15, Oct 01, Oct 15, Oct 31. Area: `--chart-line` 2px stroke, gradient fill from `--chart-line` @45% to @4%.
- Side column (padding-top 56): "Current rating" 15; `1,284` mono 30/600; `+48 (+3.90%) in 7D` mono 13 `--positive`; "Top 18% in network" + info (18% mono); hairline (margin 20 0 18); "Rating tiers" 15/600 + info; 4 rows gap 10: 10px dot + name 14 + range mono 13 `--text-muted` right-aligned.
  - Platinum tier `2,520+` dot `--text-secondary`
  - Gold tier `1,500 to 2,519` dot `--warning`
  - Silver tier `500 to 1,499` dot `--text-muted`
  - Bronze tier `0 to 499` dot `--orange`

**Daily quest**:

- Header "Daily quest" 22/600; right "Resets in" 13 `--text-muted` + `16h 18m` mono `--text-primary`. Padding-bottom 20, hairline.
- Featured lesson (padding 20 0, hairline): `bi-play-fill` 22 `--emerald`; "What is the stock market?" 15/600; meta "Stocks and investing · Bronze level · 15 min" 13 `--text-muted`; text action "Start" 15/600 `--emerald`.
- Tasks (gap 22, padding 22 0, hairline), read-only `bi-square` 15 `--text-muted`, text 15, reward mono 13 `--positive` right:
  - Finish 2 lessons today (0 / 2), +10 ELO
  - Score 90% or more on a quiz, +20 ELO
  - Open a lesson in another track, +5 ELO
- Link "New to investing? Start the beginner path" 15/500 `--emerald`, `bi-mortarboard` before, `bi-arrow-up-right` after.

### 4. Tracks / Active path / Progress (grid `280px 1px 1fr 1px 320px`, gap 32, padding 32 0 40)

**Your tracks**: header "Your tracks" 22/600 + "5 tracks" 13 muted; hairline. Rows (padding 18 0, bottom `--border-input`, gap 20): icon 20px, name 15/500, progress bar (6px, track `--border-hover`, fill `--emerald`, pill radius) + count mono 13.
Stocks and investing `bi-graph-up-arrow` 8 / 31 (selected), Crypto and digital `bi-coin` 0 / 38, Betting markets `bi-bullseye` 0 / 22, Commodities `bi-droplet` 0 / 22, Risk and psychology `bi-shield` 0 / 16.

**Active path · Stocks and investing**: title 22/600, helper "Build your investing knowledge from the fundamentals to advanced topics." 13 muted. Right: `8 / 31 complete` mono 13 over a 160px progress bar.

- Level tabs (padding 28 0 18, hairline): Bronze level / Silver level / Gold level / Platinum level, 16, gap 40; selected emerald 600.
- Filter row (padding 16 0, hairline): `bi-search` 16 muted, borderless input placeholder "Filter courses by title or description" 15; right text action `bi-bookmark` "Saved (8)" 15/500.
- Course rows: grid `24px 28px 1fr 52px 60px 96px 20px`, gap 16, padding 14 0, bottom `--border-input`. Status mark 20px (`bi-play-circle` emerald for next, `bi-circle` muted for not started, `bi-check-circle-fill` emerald for done); code mono 13/600; title 15/600 + description 13 muted; minutes, ELO mono 13 right; status 14 ("Start" emerald 600 / "Not started" secondary / `bi-check2` "Completed" secondary); `bi-bookmark` 17.

| Code | Title                             | Description                                        | Min | ELO | Status      |
| ---- | --------------------------------- | -------------------------------------------------- | --- | --- | ----------- |
| B1   | What is the stock market?         | Learn what the stock market is and how it works.   | 15  | +10 | Start       |
| B2   | Stocks, bonds, and ETFs explained | Understand the key differences and use cases.      | 15  | +10 | Not started |
| B3   | How to read a stock quote         | Break down key fields in a stock quote.            | 12  | +5  | Not started |
| B4   | Understanding market indices      | Learn what market indices are and why they matter. | 15  | +10 | Not started |
| B5   | Your first investment             | Take the first steps to make an investment.        | 20  | +15 | Not started |
| B6   | The power of compound interest    | See how compounding can grow your wealth.          | 12  | +10 | Not started |
| B7   | Risk vs reward                    | Understand the trade-off between risk and return.  | 15  | +10 | Completed   |
| B8   | Reading financial news            | Learn to get useful insights from financial news.  | 10  | +5  | Completed   |

**Your progress**: title + hairline; 2x2 stat grid (`1fr 1px 1fr`, column gap 24, row gap 20): `bi-fire` Current streak `6 days`, `bi-trophy` Best streak `14 days`, `bi-layers` Active tracks `3 / 5`, `bi-award` Badges earned `9` (labels 14, values mono 20/600 indented 24). "View badges" + `bi-arrow-right` emerald 14, right-aligned. Hairline-bounded block "Active days this week" + info, 7 columns Mon to Sun (12 muted) with 12px dots: Mon Tue Wed Fri `--emerald`, Thu Sat Sun `--text-ghost`.
**Recommended for you**: title + hairline; 3 rows (padding 14 0): title 15/600, meta "{track} · Bronze · 15 min" 13 muted, `bi-play-fill` 20 emerald.

- Stocks, bonds, and ETFs explained · Stocks and investing
- What is cryptocurrency? · Crypto and digital
- What are prediction markets? · Betting markets

### 5. State examples (padding 32 0 40, bottom hairline)

Title "State examples" 22/600. Grid of 3 equal columns with rules (gap 32).

- **Loading state (course list)**: 3 skeleton rows: 40px circle + 12px bars (100% and 62%), fill `--text-ghost`, gap 24.
- **Empty state (saved courses)**: centred `bi-bookmark` 32, "No saved courses yet" 17/600, "Save courses to find them here later." 14 muted, link "Browse the course catalogue" + `bi-arrow-right` emerald.
- **Error state (rating history)**: `bi-exclamation-triangle` 32 `--negative`, "Could not load rating history", "There was a problem fetching your data.", text action "Retry" emerald 600.

### 6. Footer

"All names, ratings, counts, course codes and progress shown are sample content." 13 `--text-muted`, padding 24 0 40.

## Interactions & behaviour

- Range selector: click sets selected range (emerald). Production: refetch rating series for the range.
- Track rows: click selects a track; active path title and completion update.
- Level tabs: click selects a level; production filters the course list by level.
- Course filter: live, case-insensitive match on title + description. Empty result shows "No courses match this filter."
- Saved (8): toggles a saved-only filter.
- Bookmark icon: toggles saved (`bi-bookmark` ↔ `bi-bookmark-fill` in emerald).
- Hover: primary button `--emerald-hover` bg; text actions shift to `--emerald-hover`; no transforms, no shadows.
- Quest tasks are read-only status, not inputs.
- Loading: replace each list with skeleton rows matching row height. Error: replace the module body with the error block; Retry refetches. Missing numeric values render `N/A`.

## State

`range` ('1M'|'3M'|'6M'|'1Y'|'ALL'), `selectedTrackId`, `selectedLevel`, `query`, `savedOnly`, `savedCourseIds`. Data: learner summary (ELO, delta, tier, streaks, badges, percentile), rating series, daily quest, tracks with progress, courses per track/level, active days, recommendations.

## Design tokens (all from `colors_and_type.css`)

Dark / light:

- `--bg-primary` #0a0e13 / #ffffff (page, and text on emerald button)
- `--text-primary` #f0f6fc / #0f172a · `--text-secondary` #e2e8f0 / #1e293b · `--text-muted` #8b949e / #64748b · `--text-ghost` #4b5563 / #cbd5e1
- `--emerald` #10b981 / #059669 · `--emerald-hover` #34d399 / #047857 · `--positive` #10b981 / #059669 · `--negative` #ef4444 / #dc2626
- `--warning` #fbbf24 / #d97706 · `--orange` #f97316
- `--border-hover` rgba(16,185,129,.20) / rgba(16,185,129,.25) (section rules, vertical rules, bar tracks)
- `--border-input` rgba(16,185,129,.10) / rgba(0,0,0,.12) (list row separators)
- `--border-primary` rgba(16,185,129,.08) / rgba(0,0,0,.08) (chart gridlines)
- `--chart-line` #10b981 / #059669
- Radius: `--radius-md` 8px (button), `--radius-pill` (Sonar pill, progress bars, skeletons)
- Spacing (4-base): 24 / 32 / 40 / 64 as above
- Fonts: `--font-sans` Plus Jakarta Sans, `--font-mono` JetBrains Mono
- Type: titles 22/600 -0.01em; body 15; meta 13; labels 14; KPI values mono 20 to 30.
  Light mode = same markup with `.light-mode` on the page root (tokens re-scope).

## Assets

- `assets/ezana-nav-logo.png`: from the Ezana design system. The wireframe shows a Walia ibex mark; the design system only ships the pegasus mark, so the pegasus is used as a stand-in. Swap in the ibex asset when available (same 40px height, left edge at x=32).
- Icons: Bootstrap Icons 1.11.3 (CDN `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`).

## Audit changes applied (wireframe vs Ezana guide)

1. Rating tier ranges rewritten with "to" and the specified bounds; "≥ 2,500" replaced by "2,520+".
2. Percentages normalised to two decimals and signed: +3.9% to +3.90%.
3. Course and recommendation titles converted to sentence case (e.g. "What is the Stock Market?" to "What is the stock market?", "Risk vs Reward" to "Risk vs reward").
4. Selected track row: left emerald accent bar and tinted wash removed; now emerald icon + name only.
5. Course filter: input box border and radius removed; borderless field on a hairline row.
6. Unicode arrows and ticks (→, ↗, ✓) and the play triangle replaced with Bootstrap Icons (`bi-arrow-right`, `bi-arrow-up-right`, `bi-check2`, `bi-play-fill`).
7. All numbers, counts, durations, rewards, dates and the countdown set in JetBrains Mono (including inline numbers like "2 lessons", "90%", "18%", "(8)", "5 tracks").
8. Primary button text changed from white to `--bg-primary` for contrast on emerald (white on #10b981 fails 4.5:1).
9. Vertical rules given 32px clear space each side (64px between sections); KPI and stat-grid rules 24px each side.
10. Content edges locked to x=32 and x=1408; all hairlines inset to match.
11. All colours mapped to tokens; tier markers use `--text-secondary`, `--warning`, `--text-muted`, `--orange` (no ad-hoc hex).
12. Light mode added through token re-scoping only.

## Files

- `Learning Center.dc.html`: the page (HTML template + logic). Prop `theme` = `dark` | `light`.
- `Learning Center - Dark and Light.dc.html`: both modes side by side.
- `colors_and_type.css`: token stylesheet (light-mode scope extended to `.light-mode` on any element).
- `assets/ezana-nav-logo.png`
- `support.js`: runtime needed to open the `.dc.html` files in a browser.
