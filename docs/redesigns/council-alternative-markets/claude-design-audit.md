# Claude Design audit (project "Ezana Alternative Markets redesign", 16 Nov 2026)

Project: https://claude.ai/design/p/a2b62d4e-69c7-4bdc-a1bd-9fae5cca18c0

Canvas "Alternative Markets.dc.html": dark page (1a), light page (1b), three dialogs (2a to 2c: Check a ticker against policy, Start a pitch from this asset, Send to team), loading / empty / error states for all six council cards (3a), audit list (4a). Earlier working file: "Alt Markets Page.dc.html".

Notes Claude Design reported:

- It could not find an "Ezana Branding and UI Guide" in the design system, so it audited against the brief's rules plus the design system tokens.
- The design system only has the pegasus logo, not the Walia ibex; the page uses the pegasus and the README says to swap in the ibex. (Build: never copy its nav bar.)
- No design system token for primary button text; it used --bg-primary and the README notes the app uses --btn-primary-fg. (Build: use --btn-primary-fg.)
- It changed one line in colors_and_type.css so light-mode colours apply to a wrapper element (for side-by-side artboards). Design-file only; not relevant to the app.

Changes the audit made (1 to 25):

1. Removed the page title, the "Sample research environment" pill and the intro sentence.
2. Replaced the made-up assets with the existing page's real ones, all labelled Sample content.
3. Drew no live dots, no "updated" or "delayed" claims and no alternatives exposure figure.
4. Cards are flat: no fill, border, shadow or radius.
5. Content runs from x=32 to x=1408.
6. 64px between side-by-side sections and 24px beside every vertical rule.
7. The Crypto and Commodities switch is text only and moved to the left, since the title is gone.
8. Removed the filled pill from the selected category tab and the selected chart range.
9. Export is a plain text button; Add to watchlist is the only solid button in the header.
10. Removed the boxes around tickers, Sample content labels, the Bullish label, pipeline stages, coverage owner names and news topics.
11. Headline values are 18px JetBrains Mono, and so is the chart price.
12. Table and list rows are flush and only change text colour on hover; removed the coloured dots in Movers.
13. Bootstrap Icons only.
14. Mono for every number, ticker, date, time and address.
15. Sentence case for table headers, bull and bear labels, titles and stage names.
16. Removed the em dashes from the meeting rows.
17. Percentages are signed, and missing values show N/A.
18. Navigation is the council member bar: Sonar as the emerald pill, Community removed, red logout, settings no longer emerald.
19. Policy review is now a ticker check that says, for example, "Not on the prohibited list". It notes there is no asset class rule set and never reads as a recommendation or approval.
20. Added sector sleeves to Council research context, with HON shown as not yet priced.
21. Council rankings shows return, Sharpe and rating for the three councils, plus Sample council's fund value.
22. The "· sample content" suffixes are now separate Sample content labels.
23. Sentiment bars have square ends.
24. Added Start a pitch and Send to team text buttons to the chart, to open those dialogs.
25. Noted the missing primary button text token.

Follow-up fixes after Claude Design's own check:

- Unreadable canvas: canvas sections now have the dark page background so headings, labels, states grid and audit list are readable.
- Flat chart line: the price chart line now uses the full chart height instead of flattening along the top.
  The handoff folder has the updated copies of both files.
