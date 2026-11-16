# Design status: council US Equities (16 November 2026)

Stage 2 is complete. Claude Design project: https://claude.ai/design/p/8b13fb0d-8c9f-4a07-8a0f-7b29008e0ef1 (file "US Equities Council.dc.html", handoff folder design_handoff_us_equities_council). What worked: I uploaded two full-scale screenshots of /company-research, one with NVDA open and one with no ticker, to the owner's ChatGPT chat with the description pasted in. No real member names were visible, so nothing needed swapping. ChatGPT returned one 1024 x 1536 dark wireframe, saved in five slices (wireframe-part1 to part5). Claude Design rebuilt it in dark and light mode, fixed the sample data, drew loading, empty and error states for all eight council cards, drew the Add to watchlist and Send to team dialogs, and wrote the handoff README, which I read in full (87 lines). Claude Design showed no usage warning.

What did not work, and caveats:

- The live page loaded in light mode. The navigation bar switched between the council nav (Team Hub) and the retail nav (Dashboard, Community) between loads. After the two screenshots, the Ezana tab was sent to the sign-in page ("reason=timeout"). I did not touch the sign-in page and closed that tab. The owner may need to sign in to ezana.world again.
- ChatGPT's stream ended with "Connection interrupted" after 9 minutes. The image arrived, but the written list of sections, reversible decisions and items outside section 4 never came. chatgpt-notes.md holds ChatGPT's two progress notes plus my own reading of the image, labelled as mine.
- ChatGPT listed no dialogs. I asked Claude Design for the two existing dialogs.
- Claude Design found no primary button text token in its design system and used --bg-primary (white on #059669 in light mode, about 3.8:1). The repo guide has --btn-primary-fg: use that.
- Claude Design's nav bar uses a pegasus stand-in logo. Never copy its nav.
- Claude Design changed some live market figures (P/E 19.53, -4.43%, the heatmap NVDA tile at -19.4%). Those come from real market data or the fixed heatmap list, so the build must use the real values and ignore these edits.
- Its sample IPS limits (15% position, 40% sector, 5% trade, 8 to 25 positions, $10.00B min cap) are invented sample values.
- The "Show council data" toggle and the empty-state actions "Set up fund" and "Open IPS settings" need real destinations, or they should be dropped.
- Claude Design said a background check of the page was still running when I read the result.
