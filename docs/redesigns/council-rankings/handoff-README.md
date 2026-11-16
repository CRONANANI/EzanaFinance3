# Council Rankings handoff (fallback description, NOT Claude Design's README)

The real handoff README in Claude Design (project https://claude.ai/design/p/28a9947f-3651-4b4c-8aa4-201c50da4db8,
"Download Council Rankings handoff") could not be read: after generation finished, every browser
action was blocked by the permission classifier returning no verdict. This file is the agent's own
description from the canvas screenshots (claude-design-1.jpg, claude-design-2.jpg) and Claude
Design's chat summary (claude-design-audit.md). Re-read the real README if the build needs exact
spacing or token names.

## Artboards

Dark row and light row, each with three 1440px artboards:

1. Rankings page (/council-rankings).
2. Council detail at its own address (/council-rankings/sample-council), reached by clicking a council name.
3. States board: loading skeletons, empty states, inline errors with Retry, search no-results, and the fund ratio save confirmation dialog.

## Rankings page, top to bottom (dark artboard, as seen)

- Page actions row: "Sample data" grey text, divider, "Show council data On" as an emerald text toggle (grey "Off" when off). Right side: one solid emerald "Report fund ratios" button, then plain text "Competitions" and "Fund Analytics".
- KPI strip, 48px, six cells separated by thin vertical rules: Your council rank 3 / 12; Overall rating 1084; Competition rating 1062; Fund rating 1117 with an amber warning icon (self-reported); Gap to next council 27; Points to next tier 116. Labels 11px caps Plus Jakarta Sans, values 18px JetBrains Mono.
- Methodology line (muted): one standing table, 60% competition and 40% fund, judged results verified, fund ratios self-reported, ROI and Sharpe shown but never dollar amounts. Hairline below.
- Table toolbar: text tabs Overall (emerald) / Competition / Fund; borderless "Search councils" with a search icon; right-aligned muted "Sorted by overall rating, high to low".
- Table: header 11px grey caps (#, Council, Tier, Rating, Comp, [self-reported], Fund, ROI, Sharpe, Move, Date). Every row carries "self-reported" with an amber warning icon placed just before the Fund value. Numbers mono and right-aligned; ROI signed (+22.6%); Move green/red signed; dates "Aug 03, 2026" mono. Sample council row (rank 3) is entirely emerald text. Hairlines between rows, no enclosing box, hover = text colour only. 12 invented councils (Northshore Investment Council ... Maplewood Asset Society).
- "Your council" summary line: Rank 3 / 12 | Overall 1084 | Fund ahead of competition by +55 | Gap to next 27 | Points to next tier 116.
- Two columns 64px apart with a vertical rule: left "Nearest councils" mini table (#, Council, Tier, Rating, Gap: +27 green, N/A for own row, -27 red; own row emerald); right "What moves the rating": Competition rating (60%) 1062 "From judged competition results"; Fund rating (40%) 1117 "From self-reported fund ratios" with self-reported mark.
- "Managers only: report fund ratios" with self-reported mark; "Fund Analytics" emerald text link on the right. Inline borderless fields (no underline): Period FY2026 Q2 with chevron, Return +17.8%, Sharpe 1.71, Alpha +6.1%, Max drawdown -8.2%, Volatility 11.0%, and a solid emerald "Save" button at the right edge.

## Detail page (from the summary; not screenshotted)

All councils back link (Bootstrap arrow icon); council name; Overall rating, Peak rating, Tier; weighting sentence; Competition (60%) and Fund (40%) side by side; Competition contribution (generic reasons: "Recalculated after a judged result") and Fund contribution (period, self-reported mark, Sharpe, ROI, Alpha, Max drawdown, Volatility, all right-aligned) side by side; Rating history (signed points, part, generic reason, date). Other councils show N/A for alpha, max drawdown and volatility in the prototype.

## Build notes

- Do not copy Claude Design's nav bar (pegasus stand-in logo). Never touch the Team Hub shell.
- Build the save confirmation with the ds Modal (Claude Design hand-built one; its design system lacks a modal).
- The guide wins over the handoff where they differ (see RUNBOOK stage 3).
- The Show council data control was drawn as a text toggle ("On"/"Off"); match the other rebuilt org pages' sample switch.
