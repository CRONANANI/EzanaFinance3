# Ezana World Bank Economic Indicators page: how it works today

Page: World Bank Economic Indicators. Route: /datasets/world-bank. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

A country table of the latest World Bank figures: real GDP growth, inflation, unemployment, central government debt and GDP per person, one row per country (regional and income-group aggregates left out), plus a top five of the fastest growing economies.

- Who: investors and students who want one country's macro basics fast, or a quick cross-country scan.
- How they arrive: the Global Empire Lighthouse menu, the lighthouse hub's dataset card, the country panel on Global Empire Rankings ("Underlying series"), search.
- What next: today, little; rows open nothing. The intended next steps are the country on Global Empire Rankings or the OECD page.
- Data connected today: yes, live. Eight indicators are loaded weekly from the World Bank (from 2000); the page shows five of them, latest year only.
- Sample data: wireframe figures are sample content with invented names. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees real data or, with no source connected, "This dataset's source is not connected yet." This page shows no sample data today.

## 2. What is on the page today

Desktop, top to bottom, in the generic older dataset layout. No ticker.

- Hero: small eyebrow "Datasets", a large centred title "World Bank economic indicators", a lead paragraph ("The macro picture for every country... across 8 indicators from 2000").
- EzanaQL row: terminal icon, "Query this data with EzanaQL" (to the lighthouse hub), "on the Global Empire Lighthouse hub", Share.
- Search: one bordered, labelled box, "Country search" (matches name or code), filtering the table as you type.
- Highlight card (filled, rounded): badge "Latest", title "Fastest growing economies", a sentence, then the top five countries by real GDP growth with "Real GDP growth, (year)" and the value. Empty: "Appears once the World Bank data is loaded."
- Table "Latest value per country", above it "Latest reported year per country, as of (date)": Country, GDP growth, Inflation, Unemployment, Debt (% of GDP), GDP per person (compact dollars), Year. Sorted by country name, all countries on one long page, no sorting, no paging, rows not clickable. Missing values are blank cells. Empty: "No World Bank data loaded yet. It refreshes every Monday."
- "How we source it": weekly refresh, aggregates left out, each figure is the latest year for that country and indicator so years can differ between columns, debt is reported for fewer countries.
- "Explore in the app" button (to log in), then the footer.

States: route skeleton (centred title, five pills, ten-row table); a failed read shows the same empty table message as no data (the read returns nothing on error); a crash shows the shared dataset error screen with Retry. Tablet and phone: the table scrolls sideways inside its box; breakpoints not verified.

## 3. What the user can do

- Filter countries by name or code
- Open EzanaQL on the lighthouse hub; share the page
- Click "Explore in the app"
- Nothing else: no sorting, no row detail, no export, no history.

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Country name and code | Every country the World Bank reports, aggregates excluded | World Bank indicators | Weekly load | None |
| Real GDP growth | Percent a year, latest reported year | Same | Weekly load; figures are annual, often a year or two behind | Some small economies |
| Inflation | Consumer prices, percent a year | Same | Same | Some countries |
| Unemployment | Percent of labour force | Same | Same | Some countries |
| Central government debt | Percent of GDP | Same | Same | Many countries |
| GDP per person | Current US dollars | Same | Same | Few |
| Year | Year of the GDP growth figure | Same | Same | Other columns may be a different year |
| Loaded, not shown | Current account balance (% of GDP), exports (% of GDP), total reserves (US dollars) | Same | Same | Not on the page today |
| Loaded, not shown | The prior year's value for every indicator, and annual history from 2000 | Same | Same | Not on the page today |

## 5. Data we do not have

Do not design around these.

- Quarterly or monthly figures, forecasts or projections.
- Indicators beyond the eight listed (no trade partners, no interest rates, no population on this page).
- Sub-national or regional and income-group breakdowns (aggregates are excluded).
- Market data, tickers or company links.
- Real-time anything; the data is annual.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts see sample data, labelled "Sample content".

## 6. Must keep working

- The route and its arrival from Global Empire Rankings' country panel.
- One row per country, aggregates left out.
- The honest per-column year rule (years can differ between columns) and the debt coverage note.
- The EzanaQL row and Share.
- The empty state when nothing is loaded.
- Sample data only for admin and demo accounts, labelled.

## 7. Problems with the current page

### Design problems

- Generic older layout: centred title and lead, filled highlight card, bordered search box, boxed table, large call-to-action button.
- A long unsorted table of about two hundred countries with no sorting, no paging and no detail.
- Three loaded indicators, the prior year and twenty-plus years of history are not used.
- The highlight card answers only one question (growth).

### Bugs and gaps

- "As of (date)" is the date of the page request, not the date of the last load.
- The Year column is only the GDP growth year; other columns can be from different years with no sign of it.
- Missing values are blank rather than N/A; a failed read looks the same as no data.
- The lead promises data "from 2000" that the page never shows.

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

1. Show all eight indicators? Default: yes, the three hidden ones become columns or a column picker.
2. Use the prior year and history? Default: yes, a change column and a country side panel with each indicator's history since 2000 (a backend read of data already loaded).
3. Country detail? Default: a side panel on a country parameter in the address, linking to the country on Global Empire Rankings and the OECD page.
4. Per-cell year? Default: shown as a faint mono suffix when it differs from the column's usual year.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: World Bank Economic Indicators. Route: /datasets/world-bank. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a sortable indicator table with year-on-year change, a biggest-movers leaderboard per indicator, a country side panel with history since 2000, a two or three country comparison, and a citation with CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
