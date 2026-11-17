# Claude Design audit (council Mock Portfolio)

Project: https://claude.ai/design/p/560d1cae-0ff3-414d-bd2c-0dfdd30207d9 (file "Mock Portfolio Council.dc.html", 2 pages)
Contents: page dark (1a) and light (1b), states board (2a), six dialogs (3a to 3f: reset portfolio, close position, review order, build or edit thesis, delete thesis, thesis note). A "council" toggle shows the page with or without the council section.

## Missing tokens (Claude Design added these to ezana-tokens.css with guessed values; use the codebase values)

- --btn-primary-fg: text on emerald buttons and the Sonar pill.
- --ez-rule: hairlines and vertical rules.
- --ez-rule-subtle: table row dividers and skeleton bars.

## Changes the audit made (as reported by Claude Design)

- Navigation bar: replaced the stand-in with "the real bar" (Sonar filled emerald pill, red logout, Trading as emerald text). Still a stand-in: never copy it in the build.
- Logo: the Walia ibex logo is not in the design system, drawn as a dashed placeholder.
- Council name: "North Harbor Student Investment Council" changed to "Sample council" everywhere.
- People: all names replaced with invented ones (Noor Haddad, Jonah Whitfield, Iris Calloway, Theo Marchetti). Build should use the shared sample council's names from src/lib/org-*-sample.js instead.
- Tabs and selectors: text only, emerald for selected; removed every underline bar and the boxed amount field; "Sample content" no longer boxed.
- Buttons: Review buy order is the only solid button; everything else plain text.
- Fonts: company, sector and owner names in the real fund table moved from mono to Plus Jakarta Sans; every number, ticker and date in mono, including numbers inside sentences.
- IPS results: icon plus text (passes, warning, would be blocked in the real fund), no filled chips. Max sector and prohibited ticker MO changed from amber warning to red "would be blocked". Em dashes in the IPS snapshot replaced with full stops.
- Spacing: KPI strip, three-up row and stat rows use 64px gaps with the rule centred; 24px clear space beside the vertical rule.
- Copy fixes: "All actitivy" to "All activity"; "Pass" to "Passes"; "would be marked would be blocked" to "would be marked as blocked".
- Removed annotations: the "Examples: states" strip and the "Market movers unavailable" line moved off the page onto the states board.
- Dialogs: overlay with solid panel, hairline border, rounded corners and shadow (overlays are the exception to flat cards). Delete thesis uses red text instead of a solid button.

## Open caveats reported

- Sandbox Financials weight read as 18% (could be 10% in the wireframe).
- Chart line endings follow the drawing and do not match the legend's since-inception figures.

## Follow-up fixes after its own review

- Board labels given their own dark background for readability.
- Chart intermediate dates drop the year ("Oct 15" to "Dec 15"); first and last show the year.
- Thesis label column 20px wider so "Max single-name weight" fits on one line.
- Reports no console errors; it did not re-run the full visual review after these fixes.
