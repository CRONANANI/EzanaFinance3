# Claude Design audit: council Watchlist (partial)

Project: https://claude.ai/design/p/0d059c6a-ab9b-4527-955c-33e069e2015e (file "Watchlist Page.dc.html")

Claude Design stopped after the dark page because its usage quota reached 90% of the 5-hour limit. It did NOT produce the full written audit list, the light-mode overview page, the dialogs, the card states or the handoff package. The list below is its "audit findings so far", summarised from its chat message, plus one follow-up fix it reported.

## Changes and findings it reported

- Flat sections: cards have no boxes; tabs, the range selector and the council selector are text only with emerald for selected; one solid primary button per group; status, priority and conviction are text plus an icon; all avatars and the decorative wave removed.
- Light mode: a theme prop switches the same page to light. To do this it edited one line in its own copy of the design system's colour file so light colours can apply to part of a page.
- Missing tokens: the design system has no --ez-rule and no --btn-primary-fg. It used --border-primary for hairlines and --bg-primary for primary button text. In light mode that button text is about 3.8:1 contrast (below 4.5:1). Build must use --ez-rule and --btn-primary-fg from the repo.
- Logo: no Walia ibex asset in the design system, so its nav uses a stand-in mark. Do not copy its nav bar.
- Tickers: renamed RIVN to RVMK and LUMN to LMNH because the originals are real tickers.
- Copy: em dashes removed, headings in sentence case, "show in table" now "shown in table", the council named "Sample council".
- Colour: High priority is now red and Medium amber (design system pairing); the wireframe had High in green. Coloured status dots in catalyst lists removed; Related catalysts uses a confirmed or unconfirmed calendar icon.
- Known gap it left: numbers inside sentences (Team signals details) are still in Plus Jakarta Sans, not JetBrains Mono.
- Follow-up fix: added the AGRS chart's missing axes (62.00 to 66.00 price labels, gridlines, Jan 17 to Jan 24 dates). It skipped the full re-check for this fix.

## Not done (held by the quota)

- Light-mode page drawn beside the dark one (only the theme prop exists).
- The eight dialogs (New list, Add asset, Smart rule editor, Monitoring note, Rename list, Alerts, Delete list, Send to team).
- Loading, empty and error states for the six council cards.
- The full written audit list.
- The Claude Code handoff package (no design_handoff folder, no README).
