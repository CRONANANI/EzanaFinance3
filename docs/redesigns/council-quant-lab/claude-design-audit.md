# Claude Design audit (council Quant Lab, 2026-11-16)

Project: https://claude.ai/design/p/3ec4744f-ebe4-4b25-bfc2-21ec4534c5f7 ("Ezana Quant Lab Council Overview", files "Quant Lab Overview.dc.html" and "Quant Lab Overview Board.dc.html", 2 pages: dark and light, plus a states board for the six council cards and an overlays board).

Copied from the Claude Design chat summary.

## Audit changes

- Selected states: the sidebar Overview item, the Strategy selector and the Council tab are emerald text only, with no pill, box or underline.
- Statuses: the IPS results, assignment statuses and Reviewed column are coloured text with an icon instead of chips. Reviewed shows "Yes" or "No".
- Links: Open pitch has no underline. The arrow on Open assignments and the "|" in the IPS header became a Bootstrap icon and a middle dot.
- Missing values: the dash for Prohibited tickers is now N/A.
- Chart: area fill removed. SPY is a dashed grey line.
- Casing: table headers and "Also in Ezana" in sentence case; "Max dd" spelled out as "Max drawdown".
- Type: every number, ticker, date and version is JetBrains Mono, including tickers inside assignment titles. KPI values are 18px.
- Spacing: columns 64px apart with the rule centred; 24px clear space beside each KPI and Quick actions rule; content runs x=32 to x=1408.
- States: the wireframe's bottom states strip is removed from the page. Each council card has loading, empty and error states on its own board.
- Tokens and icons: every colour is a design system token, every icon Bootstrap Icons.
- Follow-up fix: the states and overlays boards were squashed; all four panels now keep their full 1440px width (also fixed in the handoff copy).

## Things Claude Design flagged

- No separate Branding and UI Guide file in the design system; it audited against the design system README and the brief.
- Missing token: there is no --btn-primary-fg token in the design system. The primary button falls back to --bg-primary for its text; the README says so and proposes values. (Repo uses --btn-primary-fg: the build must use that.)
- Logo: the design system only has a pegasus mark; the Walia ibex is a rough trace from the wireframe. Never copy it; the real nav bar is untouched in the build.
- Kept as drawn: the indigo Team Hub link and filled count badges on the nav (treated as part of the real nav bar).
- Inconsistent: "Max single trade 8%" shows Review for a 6.00% proposal, as drawn. Build should compute the real result (6.00% is under 8%, so passes).

## Overlays drawn

Strategy selector menu, My strategies row menu, IPS pre-check pitch picker (the selector menu and pitch picker also open on the page itself).
