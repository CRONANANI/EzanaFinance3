# Design status: council Global Market Analysis (Stage 2)

Stage 2 is done. Claude Design project: https://claude.ai/design/p/d2cce7e8-0826-44c1-804f-a3ed5ec32624 (board "Council Market Analysis.dc.html": 1a dark page, 1b light page, 1c states board for all 10 cards, 1d to 1g dialogs, 1h audit list; page source "CouncilPage.dc.html"; handoff folder design_handoff_council_view). The live page loaded signed in with the org account (council nav: Team Hub, Sonar pill). /market-analysis has no council view yet, so the screenshots show the retail terminal, which is the shared page today. I sent ChatGPT three screenshots: the map, the map with the Markets panel open, and the chain. They held no personal names. The chain headlines are public news, so nothing needed swapping. ChatGPT (owner's chat) returned one 933 x 1685 image in about 2 minutes and wrote no text, so chatgpt-notes.md is my own reading of the image. I sent all six slices to Claude Design. It found no usage warning and took about 8 minutes. The README was read in full (94 lines) with get_page_text plus PageDown. JavaScript is blocked on claude.ai.

Caveats for the build:

- Claude Design found no "Ezana Branding and UI Guide" in the design system. It audited against the brief, the design-system README and the tokens.
- No primary button text token exists. It used --bg-primary, which fails 4.5:1 in light mode. Use --btn-primary-fg from the repo guide.
- Its nav uses a stand-in pegasus logo. Do not copy its nav bar.
- The handoff's KPI values are 18px mono, but its Fund against benchmark metric values are 24px mono. Use 18px.
- Dialogs have a 1px border and no radius. Use the ds Modal.
- The "Delayed quotes" note replaces LIVE.
- No holding country, currency or asset-class figures are drawn.
- Sample dates are November 2026. Council and rival names are invented. Debrief headlines are invented.
- The "Related market watch" and "Market context" text are descriptive sample copy, not linked data.
- Check that the sample members match the shared src/lib/org-*-sample.js council.
