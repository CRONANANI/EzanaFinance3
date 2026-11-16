# Claude Design audit: council US Equities

Project: https://claude.ai/design/p/8b13fb0d-8c9f-4a07-8a0f-7b29008e0ef1 (file "US Equities Council.dc.html"). Copied from Claude Design's chat summary on 16 November 2026. Dashes in its text are rewritten here without em dashes.

## Three things Claude Design flagged first

- No primary button text token exists in the design system (nothing like a primary foreground token). It used --bg-primary as the button text colour instead. In light mode that gives white on #059669 at about 3.8:1, under 4.5:1. It suggests adding a dedicated token. (For the build: the repo guide has --btn-primary-fg; use that.)
- The Ezana Branding and UI Guide is not inside the design system, so it audited against the rules listed in the prompt.
- There is no Walia ibex logo in the design system; it used a pegasus mark as a stand-in. Never copy its nav bar or logo.

## Data corrections

- NVDA is one of 12 holdings: 200 shares at $121.40 cost, worth $31,130.00, 13.0% of the fund.
- The holding shows its own return (+28.21%) and its own contribution to the fund (+4.19 pp).
- Technology sleeve: added MSFT and AAPL rows and a total row; the sleeve adds up to 37.6% of the fund. The rail and the IPS check use the same figure.
- IPS check: only stored rules remain plus the note that the cash floor is recorded but not checked; liquidity and style rows removed. It raised the sample limits to 15% per position and 40% per sector so NVDA passes.
- HON shows as held and not yet priced (held at cost, value N/A).
- Other numbers: P/E 37.82 changed to 19.53 to match price and EPS; day change -4.42% to -4.43%; price target upside +31.8% to +31.7%; chart axis set to even $25 steps. (For the build: these are live market data fields, so the real values win; ignore these edits.)
- Heatmap NVDA tile changed from +184.0% to -19.4% and red to match the hero. (For the build: the heatmap is the fixed list in the app; do not invent tile values.)
- Price target labelled as street consensus so it is not read as a council target.

## Audit changes

Layout

- Content spans x=32 to x=1408.
- Side-by-side sections 64px apart, at least 32px clear beside each vertical rule.
- Sections flat with no boxes.

Selectors

- Section tabs, 1D to ALL ranges and the Company, Industry, Portfolio toggle are text only with no underline bar. "Custom" is no longer emerald because emerald now means selected.

Removed boxes

- NVDA ticker label; the red price change box and the YTD box; the $155.65 label on the chart; the Deep dive and Uncovered pills; the CN, WS, FT source tiles; the Pins count badge; the notification badges; the grey header bar on the heatmap.

Buttons

- Open pitch is the only primary button in its group; Open dossier is plain text. Each dialog has one primary button with a text Cancel.

Inputs

- Search, thematic search and dialog fields are borderless.

Icons

- All Bootstrap Icons; play and arrow characters became icons.

Fonts

- Every number, ticker and date in JetBrains Mono; KPI values 18px.

Copy

- Sentence case for table headers, heatmap sector labels, course and document titles, "Mega cap" and "Open research library".
- No em or en dashes: "NVDA long thesis", "Updated Nov 12, 2026", "AI infrastructure: channel checks", "12 to 18 mo", N/A in place of a dash.
- The executive perspective note had a broken sentence about analysts; completed. "NASDAQ" became "Nasdaq".

Navigation

- Community removed, Sonar a filled emerald pill, logout icon red. (Stand-in nav; never copy it.)

Rows

- Table row hover changes text colour only.

## Extras drawn

- Dark and light mode side by side; a Tweaks panel shows dark only, light only or both, and hides the states and dialogs boards.
- Loading, empty and error states for all eight council cards.
- Add to watchlist and Send to team dialogs drawn as overlays.
