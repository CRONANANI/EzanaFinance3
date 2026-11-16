# ChatGPT notes: Council Rankings (organizational)

ChatGPT returned the image with no text in the chat (worked for 1m 45s). The three closing lists were drawn inside the image itself. Below is my (the agent's) reading of the image, slices wireframe-part1.jpg to wireframe-part4.jpg, top to bottom.

## Layout as drawn

1. Page actions row: "Sample data" label, a "Show council data" switch (on); on the right one solid emerald "Report fund ratios" button, then plain-text links "Competitions" and "Fund Analytics".
2. KPI strip (six cells, mono values): Your council rank 3 / 12; Overall rating 1084; Competition rating 1062; Fund rating 1117; Gap to next council 27; Points to next tier 116.
3. One-line methodology note: 60% competition, 40% fund, judged results verified, fund ratios self-reported, ROI and Sharpe but never dollar amounts.
4. Rankings table: text tabs Overall (emerald, selected) / Competition / Fund; borderless search "Search councils"; right note "Sorted by overall rating, high to low". Columns: #, Council, Tier (text), Rating, Comp, Fund, ROI, Sharpe, Move (signed, green/red), Date (of the move). 12 invented councils (Northshore Investment Council, Westbridge Capital Forum, Sample council at rank 3 in emerald text, Cedar Point Equity Society, Aurora Student Fund, Ridgeview Capital Collective, Lakeside Investment Group, Pinecrest Markets Society, Oakridge Capital Council, Summit Quant Society, Harborview Investment Club, Maplewood Asset Society). Some rows carry an amber warning icon plus "self-reported" text beside the tier.
5. "Your council" summary line: Rank 3 / 12, Overall 1084, Weaker fund (+55), Gap to next 27, Points to next tier 116.
6. Two columns split by a vertical rule: left "Nearest councils" (ranks 2, 3, 4 with tier, rating, gap +27 / dash / -27); right "What moves the rating" (Competition rating 60% 1062 from judged results; Fund rating 40% 1117 from self-reported ratios).
7. "Managers only: report fund ratios (self-reported)": inline underlined fields Period (FY2026 Q2 dropdown), Return, Sharpe, Alpha, Max drawdown, Volatility, a solid "Save" button, and a "Fund Analytics" text link on the right.
8. Council detail (same page, below a rule): "All councils" back link, "Sample council" title, right-side Overall rating 1084 | Peak rating 1112 | Tier Competitive; one weighting sentence; two columns Competition (60%) 1062 and Fund (40%) 1117 with one-line explanations.
9. Two columns: "Competition contribution" (signed points, reason, date; e.g. +36 Placed 1st in case challenge) and "Fund contribution" (Period FY2026 Q2, self-reported with warning icon; Sharpe 1.71, ROI 17.8%, Alpha +6.1%, Max drawdown -8.2%, Volatility 11.0%).
10. "Rating history": signed points, part (fund / competition), reason, date, five rows.
11. State examples: "Loading council rankings..." with spinner; empty "No council data yet. Check back after the first ratings are posted."
12. Three lists (drawn in the image):

- Sections shown: KPI strip and page actions with sample data switch; methodology note; rankings table with tabs, search and sorting; your council summary; nearest councils; managers only ratio reporting; what moves the rating; council detail; loading and empty states; summary notes.
- Decisions you may reverse: own council summary shown by default; fund ratio reporting on this page; nearest councils table; detail view on the same page; default metrics and their order; number of history and contribution items.
- Drawn beyond section 4: full council detail for Sample council; competition contribution list with example results; detailed rating history; loading and empty states; the three summary lists.

## Points to watch in the build (agent's observations)

- Detail is drawn on the same page as the table; section 9 default 5 keeps it a separate page at the same address.
- Competition contribution reasons name events ("Placed 1st in case challenge"); real data has only generic recalculation text (section 4), so only sample rows may read like that.
- "Self-reported" appears on only some rows; today it applies to every council with ratios.
- Max drawdown is drawn signed negative (-8.2%); the period dropdown implies fixed periods, while the stored period is free text.
- No error state drawn; the KPI and table use a vertical rule between KPI cells.
- Real university names from the live seed were not used; all councils are invented.
