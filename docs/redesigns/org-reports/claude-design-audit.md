# Claude Design audit: org Reports

Project: https://claude.ai/design/p/3e5b0108-c7e2-4811-a77d-72e658579910 ("Ezana Reports Redesign"), canvas file Reports.dc.html.
Copied from Claude Design's chat summary (Nov 16, 2026), lightly condensed. Claude Design found no separate "Ezana Branding and UI Guide" file in the design system and audited against the design system README.md, Navbar.jsx, colors_and_type.css and the rules in the brief. Where the README conflicts with the brief (for example cards with faint border and shadow), it followed the brief.

## Artboards

- 1a, 1b: main page, dark and light.
- 1c, 1d: generate dialog (preview before save) and delete confirmation.
- 1e: comparison of two saved reports.
- 1f: full printable report (820px, white).
- 1g to 1j: loading, empty, error and analyst-access states.
- 1k: audit log.

## Changes the audit made

- Navigation bar: replaced the wireframe's bar and logo with the design system's. Team Hub selected in emerald text, Sonar a filled emerald pill, red logout icon. Removed the count badges and "View printable guide".
- Sidebar: Reports selected by emerald text only, no pill. Sentence-case labels. User is Selam Haile, Portfolio manager.
- Switches: all three are now text toggles (On/Off, Yes/No), selected value in emerald.
- Period label field: borderless; magnifier replaced with a pencil because it is not a search.
- Names: Jordan Hale, Selam Hale, Maya Tran and Luis Romero replaced with the Sample council roster. "Sample council investment council" is now "Sample council"; "Current term" is now "Fall 2026 midterm".
- Benchmark figures: SPY differs per report (+10.08%, +8.64%, +7.15%). Differences recalculated and shown in pts, not %.
- Window and labels: window written out (Feb 3, 2026 (earliest holding) to Nov 15, 2026) and stated for both fund and benchmark. Every return reads "Gain on cost, not time-weighted"; the same disclosure appears everywhere.
- Report tables: sector attribution uses the given sectors with a weight column and a 100.00% total. Pitch outcomes has an analyst column plus return, vs SPY and state.
- Report heading: "Method and disclosure" no longer orange; primary text colour.
- Pre-save checks: set in Plus Jakarta Sans; "Auther" typo fixed.
- Numbers: every number, date and ticker in JetBrains Mono; KPI values 18px.
- Spacing and alignment: content from x=32 to x=1408; side-by-side sections 64px apart with the rule centred; 24px beside smaller rules.
- Saved reports: Delete on every row, not just the first. Row hover changes text colour only.
- Surfaces and tokens: all sections flat; design system tokens only.

## Claude Design's own caveats

- No primary-fg token exists in the design system, so its primary button text uses the page background colour. (Build: use the repo's --btn-primary-fg token per the branding guide.)
- Light mode: white text on the light-mode emerald is about 3.8:1, below 4.5:1 for 14px text.
- Logo: it used the design system's brand mark, which its guide describes as a pegasus, not a Walia ibex. (Build: never touch the real nav bar.)
- It said a background check of the file was still running and it had not looked at the rendered page itself.
