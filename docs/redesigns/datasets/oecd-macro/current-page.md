# Ezana OECD Macro Data page: how it works today

Page: OECD Macro Data. Route: /datasets/oecd-macro. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

A macro explorer over 20 harmonised OECD Economic Outlook indicators in six lenses (Growth, Households, Inflation, Rates, Government, External) for OECD and partner countries, with annual history from 1961. It also carries an "empire" mode that reuses Ezana's power dimension scores, so a visitor can compare countries on both.

- Who: investors and students comparing economies; journalists checking a figure.
- How they arrive: the Global Empire Lighthouse menu, the lighthouse hub's dataset card, the country panel on Global Empire Rankings (opens with that country preselected), search.
- What next: pick an indicator, rank countries, compare two to four countries head to head, read the history, share the view.
- Data connected today: yes, live. When the latest-values rollup is empty the page falls back, for everyone, to an older generic layout with ten placeholder rows. A parallel change will restrict that fallback to admin and demo accounts (labelled "Sample content") and show everyone else "This dataset's source is not connected yet."
- Sample data: wireframe figures are sample content with invented names.

## 2. What is on the page today

Desktop, top to bottom. No ticker and no EzanaQL row on the live layout. Sections are bordered, rounded cards with small caps tags (MATRIX, RANKING, HEAD-TO-HEAD, HISTORY) and an info button that opens a methodology note.

| Section          | What it shows                                                                                                                                                                                                                                                                                                                                                                                                          | Controls                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header strip     | "OECD Economic Outlook", "N COUNTRIES · 20 INDICATORS · 1961–2025".                                                                                                                                                                                                                                                                                                                                                    | "Filter countries" search, filters the matrix only.                                                                                                                                                                                        |
| Aggregates strip | OECD total, Euro area 17 and World for the selected indicator, with unit; tooltip shows full name, unit, year. Aggregates appear only here.                                                                                                                                                                                                                                                                            | Hover or focus a figure.                                                                                                                                                                                                                   |
| Pill row         | The 18 power dimensions with a category dot (pending ones disabled, tooltip "Data source pending"), or, if those scores are missing, the six OECD lenses.                                                                                                                                                                                                                                                              | Pick a dimension or lens.                                                                                                                                                                                                                  |
| Matrix           | Empire view: All shows one column per live dimension (score 0 to 100), rows ranked by mean score; one dimension shows its score plus the World Bank metrics behind it with raw values (stale values muted). Badge "(year) · WORLD BANK". Fallback: a heatmap of the lens's OECD indicators ranked by composite. Countries with too little data sit in an "Insufficient coverage" band. Crosshair hover with a tooltip. | A row sets country A; in the OECD fallback a column header sets the indicator and a cell sets both.                                                                                                                                        |
| Ranking          | OECD mode: countries best to worst on the selected indicator, bars diverging around zero for signed series, an OECD reference tick, "off-scale" flag for capped outliers, a scaling note. Empire mode: the composite for the chosen focus group with each country's coverage percent.                                                                                                                                  | Top 5 or All; a row sets country A.                                                                                                                                                                                                        |
| Head-to-head     | A radar of two to four countries (coloured lines) beside a compare table: values with rank chips, a direction-aware difference column for two countries, the best value marked for three or four.                                                                                                                                                                                                                      | Country selects, "+ Add", remove; mode toggle "OECD INDICATORS · 20" or "EMPIRE DIMENSIONS · 18"; Focus (All, Economic, Military, Social) or lens chips; clicking an axis opens a scoring explainer and, in OECD mode, sets the indicator. |
| History          | Lines for the selected indicator, countries A and B plus up to four pinned, crosshair reading every line; a right list of all countries to pin.                                                                                                                                                                                                                                                                        | Window: 1961–2025, Since 1990, Last 20Y; pin or unpin.                                                                                                                                                                                     |
| Eras strip       | Seven static labels: Postwar growth, Oil shocks, Disinflation, Globalisation, GFC and euro crisis, COVID and inflation spike, OECD projections.                                                                                                                                                                                                                                                                        | Info button.                                                                                                                                                                                                                               |

States: route skeleton (centred title, pills, table); history skeleton while its data loads; "No country matches (term)"; empire mode without scores shows "Empire dimension scores are temporarily unavailable" with the toggle kept. Fallback layout: centred title "OECD macro data", lead paragraph, EzanaQL row, three search boxes, an "OECD-area snapshot" card, a "Latest value per country, by indicator" table, "How we source it" and an "Explore in the app" button. Tablet and phone: sections stack and the matrix scrolls sideways inside its card; exact breakpoints not verified.

## 3. What the user can do

- Pick an indicator (matrix header in the fallback, radar axis, compare table row) or a dimension or lens
- Set country A from the matrix or ranking; choose and add up to four countries to compare
- Switch OECD and empire modes; change focus group or lens
- Show top 5 or all in the ranking; change the history window; pin up to four history lines
- Filter matrix countries by name; open methodology notes and axis explainers
- Easy to miss: almost every choice is written to the address, so any view can be shared.

## 4. Data we have

| Field                       | Meaning                                             | Public source             | Freshness                                                           | Gaps                                            |
| --------------------------- | --------------------------------------------------- | ------------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| Latest value, year          | Latest annual figure per country and indicator      | OECD Economic Outlook     | When the scheduled sync runs; the Outlook is published twice a year | Some indicators not reported for some countries |
| Prior value                 | The year before, for change                         | Same                      | Same                                                                | Same                                            |
| Rank within                 | Position among reporting countries, direction-aware | Ezana from the above      | Same                                                                | Non-reporting countries                         |
| Aggregates                  | OECD total, Euro area 17, World                     | Same                      | Same                                                                | Some indicators                                 |
| History                     | Annual series from 1961                             | Same                      | Same                                                                | Missing years break the line                    |
| Indicator label, unit, lens | 20 curated series in six lenses                     | Ezana catalogue           | Static                                                              | None                                            |
| Projection flag             | Years marked as OECD projections                    | Same                      | Same                                                                | See bugs                                        |
| Empire scores and metrics   | Power dimension scores and their World Bank inputs  | Ezana scoring, World Bank | Weekly                                                              | 7 pending dimensions                            |

## 5. Data we do not have

Do not design around these.

- Monthly or quarterly data, composite leading indicators or daily rates; everything is annual.
- Forecast ranges or confidence bands.
- Market prices, tickers or company links.
- Commentary or explanations of why a figure moved.
- Scores for pending dimensions.
- Real-time anything.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts may see sample data, labelled "Sample content".

## 6. Must keep working

- Address parameters: dim, ind, a, b, c, d (extra countries), pins, win, showAll, mode, focus. Old lens links must not break the page.
- Arrival from Global Empire Rankings with a country preselected.
- Aggregates never ranked or tabulated with countries; the insufficient-coverage band kept apart.
- Empire mode agrees with Global Empire Rankings and Sonar.
- Each section loads and fails on its own.
- Known change: the empty-rollup fallback becomes admin and demo only, labelled "Sample content"; everyone else gets the honest not-connected state.

## 7. Problems with the current page

### Design problems

- Bordered rounded cards, segmented controls with fills, coloured pill dots and a "+ Add" select break the family look; there is no identity row, freshness line or EzanaQL row.
- Two parallel products (OECD indicators and empire scores) share one page without saying which is which; the matrix silently changes meaning depending on what loaded.
- The fallback is a completely different layout.
- Country names in the ranking use mono; several labels are 9 to 10px.

### Bugs and gaps

- Projection labels disagree with the code: the code treats 2026 onward as projected, but the copy says "actuals through 2023; 2024–25 projections", the eras strip labels 2024–25 as projections, and the history's dashed projection segment can never appear.
- A failed history request shows an empty chart, not an error with Retry.
- The fallback placeholder rows use real country names and fake values, shown to everyone.
- Missing values use a dash rather than N/A.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the ones outside tools get wrong most often first.

1. Draw the family frame as it is: the 64px Ezana navigation bar, the full-bleed green category band (emerald gradient, about 48px, white labels, Global Empire Lighthouse as the active dimension in soft translucent white), and the shared light grey dataset footer.
2. Light mode, as rendered on the live site: white ground, dark ink, only colours that exist as tokens in both themes.
3. Compact identity row on the left line: 11px small caps mono eyebrow "DATASETS · GLOBAL EMPIRE LIGHTHOUSE", the dataset name as a 22px weight 700 heading in sentence case, the freshness line in mono and at most one primary action on the right. No hero, no centred title, no intro paragraph. One sentence may sit in a bi-info-circle tooltip. A small grey "Sample content" label sits near this row.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", muted "on the Global Empire Lighthouse hub", plain-text Share on the right.
5. Content runs from x=32 to x=1408 at 1440px, text on those lines with zero side padding.
6. Flat cards: no fill, border, outline, shadow, glow or radius; KPI tiles and scorecards too. Separate with whitespace and 1px hairlines. Only overlays (side panel, drawer, menus, tooltips, dialogs) have a surface.
7. Tabs, toggles, filters and time selectors are text only, no border, track, chip or fill; selected is emerald text, the rest grey; time ranges in 12px mono caps.
8. No outlined, ghost or pill buttons. One solid emerald primary button per group; every other action is plain text, emerald on hover.
9. Borderless search: bi-search icon, grey placeholder, no outline at rest, hover or focus.
10. JetBrains Mono for every figure, ISO code, date, rank, eyebrow, table header and axis label; Plus Jakarta Sans for names and prose. 11px minimum. Card title 18px, section title 22px, body 14px, caption 12px, KPI 18px mono.
11. Ruled tables: no header fill, 11px caps mono grey headers over one hairline, 1px row hairlines, 42 to 48px rows, numbers right in mono, sort by clicking a header (emerald with an arrow). No zebra, no boxed wrapper, no accent bar on a selected row.
12. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
13. Flat charts: no background or border, faint dashed gridlines, 11px mono ticks, direct labels. Emerald is the main series, comparison neutral grey dotted, decline in negative red, extra categories from the chart tokens. Partial or provisional periods drawn lighter or hatched and labelled.
14. 64px between side-by-side cards, 20px between stacked rows, 24px beside any vertical rule. Nothing drawn touches text.
15. Bootstrap Icons only; no emoji, flags, logos, photos or illustrations. Skeletons, never spinners.
16. Sentence case, no em dashes, describe never advise, never "real-time", no vendor or database names in the interface. Signed changes, missing values read N/A, colour never the only signal.
17. Every card has a skeleton, a one-line empty state with one action, and an inline error with Retry. Close with an honest source line and "Nothing here is investment advice."

Colours, light as rendered (dark in brackets): ground white #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative red #dc2626 (#ef4444); warning amber #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline = primary text at about 8 percent; green band = emerald gradient with white text.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Keep empire mode on this page? Default: yes, as a clearly labelled secondary view; the OECD indicators lead.
2. Which pill row leads? Default: the six OECD lenses; empire dimensions move into the empire view.
3. Keep the eras strip? Default: yes, as faint labelled bands on the history chart.
4. Projection boundary? Default: follow the data (years flagged as projected), and fix the copy.
5. Add a ticker? Default: no; the data is annual.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: OECD Macro Data. Route: /datasets/oecd-macro. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a country profile side panel across all 20 indicators, a largest-moves list from latest against prior, a peer group selector, honest projection labelling, and a citation with CSV export of the current view. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
