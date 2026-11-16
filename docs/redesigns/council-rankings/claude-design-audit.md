# Claude Design audit: Council Rankings (organizational)

Project: https://claude.ai/design/p/28a9947f-3651-4b4c-8aa4-201c50da4db8 (file "Council Rankings.dc.html").
Copied from Claude Design's chat summary on 2026-11-16, lightly condensed.

Canvas: a dark row and a light row. Each row has three 1440px artboards: the rankings page, the council detail at its own address (reached by clicking a council name), and a board of loading, empty, error and no-results states plus the save dialog. Claude Design's background check found one bug ("Command Center" wrapping onto two lines in the sidebar); it fixed it without a second check.

## Changes the audit made

1. The Show council data switch is now a text toggle: emerald with "On" when on, grey with "Off" when off.
2. Every council row shows the self-reported mark (warning icon plus text, no chip). It also sits beside every fund rating and fund ratio block.
3. Event names like "Placed 1st in case challenge" are now generic reasons: "Recalculated after a judged result" or "Recalculated after fund ratios were updated".
4. The council detail is its own page at /council-rankings/sample-council, no longer stacked under the table.
5. The wireframe's loading and empty "example" rows and the three note lists at the bottom were removed; the full states are on the states board instead.
6. ROI values are signed (+22.6%). The viewer's own council's gap in Nearest councils shows N/A instead of a dash.
7. "Weaker fund (+55)" did not match the numbers (fund 1117 is 55 above competition 1062). It now reads "Fund ahead of competition by +55".
8. The period and ratio fields no longer have underlines.
9. All icons are Bootstrap Icons, including the arrow in "All councils".
10. KPI labels are Plus Jakarta Sans 11px caps, values 18px mono, strip 48px tall.
11. Table header is 11px grey caps. All number columns, including # and Date, are right-aligned and mono.
12. Row hover only changes the text colour.
13. Fund contribution metrics are all right-aligned (were mixed left, centre, right).
14. Side-by-side sections are 64px apart with the rule in the middle; every vertical rule has at least 24px of space each side.
15. The page body runs from x=257 to x=1408, so its right edge lines up with the logout icon.
16. Light mode uses only the design system's light tokens.

## Things Claude Design asked to check

- Logo: the design system has no Walia ibex mark, so it used a pegasus logo at x=32. (Build: never copy the stand-in nav bar.)
- The shell was not touched: sidebar highlight and nav count badges stay as drawn.
- Detail page data: clicking another council updates the header and fund ratios; alpha, max drawdown and volatility show N/A for them; contribution and history lists stay as Sample council's.
- Dialog styling: the design system has no modal component, so the save dialog was hand-built from tokens. (Build: use the real ds Modal.)
- One line of the copied stylesheet was changed so a single canvas section can use light colours.
