# Ezana Geopolitical Risk Indices page: how it works today

Page: Geopolitical Risk Indices. Route: /datasets/geopolitical-risk. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

The academic Geopolitical Risk index (Caldara and Iacoviello), which measures how much the world's newspapers write about wars, threats and terrorism. The page shows the global index in its lead sentence and a table of 44 country indexes for the latest month against the month before.

- Who: investors watching country risk around holdings or trips into emerging markets, students and journalists.
- How they arrive: the Global Empire Lighthouse menu, the lighthouse hub (its dataset card and the "Highest geopolitical risk by country" cross-dataset card), Sonar country answers, search.
- What next: today, nothing on the page; rows open nothing. The natural next steps are the sanctions and conflict pages for the same country.
- Data connected today: yes, live, loaded weekly (the index itself is monthly).
- Sample data: wireframe figures are sample content with invented names. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees real data or, with no source connected, "This dataset's source is not connected yet." This page shows no sample data today.

## 2. What is on the page today

Desktop, top to bottom, in the generic older dataset layout. No ticker.

- Hero: small eyebrow "Datasets", a large centred title "Geopolitical risk index", and a lead: "How much the world's newspapers are writing about wars, threats and terrorism, country by country. The global index stood at (value) in (month)." Without the global figure it says "globally and for 44 countries".
- EzanaQL row: terminal icon, "Query this data with EzanaQL" (to the lighthouse hub), "on the Global Empire Lighthouse hub", Share.
- Search: one bordered, labelled box "Country search" (name or code), filtering the table.
- Highlight card (filled, rounded): badge "This month", title "Highest geopolitical risk", "Countries with the highest index in the latest month.", then the top five countries with "Country index, (month)" and the value. Empty: "Appears once the monthly country indexes are loaded."
- Table "Country indexes, latest month": Country, Index, Month before, Change (signed, two decimals, not coloured), Month. Sorted by index, highest first. No sorting controls, no paging, rows not clickable. Empty: "No index data loaded yet. It refreshes every Tuesday."
- "How we source it": the index, its method and citation, and the warning that country indexes are comparable over time for one country, not a ranking of how dangerous countries are.
- "Explore in the app" button (to log in), then the footer.

States: route skeleton (centred title, five pills, ten-row table); a failed read looks the same as no data; a crash shows the shared dataset error screen with Retry. Tablet and phone: the table scrolls sideways; breakpoints not verified.

## 3. What the user can do

- Filter countries by name or code
- Open EzanaQL on the lighthouse hub; share the page
- Click "Explore in the app"
- Nothing else: no sorting, no country detail, no chart, no export.

## 4. Data we have

| Field                       | Meaning                                                                           | Public source                                    | Freshness                    | Gaps                   |
| --------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------- | ---------------------- |
| Global index                | Share of newspaper articles about adverse geopolitical events and threats, scaled | Geopolitical Risk index (Caldara and Iacoviello) | Monthly index, loaded weekly | None                   |
| Country index               | Share of those articles that also name the country                                | Same                                             | Same                         | Only 44 countries      |
| Month before                | The prior month's country index                                                   | Same                                             | Same                         | None                   |
| Change                      | Latest minus prior, in index points                                               | Ezana from the above                             | Same                         | None                   |
| Month                       | Month of the latest reading                                                       | Same                                             | Same                         | None                   |
| Loaded, not shown           | Monthly history of the global and country indexes back to 1985                    | Same                                             | Same                         | Not on the page today  |
| Loaded elsewhere, not shown | Global "threats" and "acts" sub-indexes (monthly)                                 | Same                                             | Same                         | Not wired to this page |

## 5. Data we do not have

Do not design around these.

- Daily readings (the menu describes the dataset as "monthly and daily"; only monthly is loaded).
- Country indexes beyond the 44 the authors publish; sub-national risk.
- The articles or headlines behind the index, or event descriptions.
- A risk score, rating or "danger level"; the authors warn against ranking countries this way.
- Market impact, tickers or company exposure.
- Real-time anything.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts see sample data, labelled "Sample content".

## 6. Must keep working

- The route and the links in from the lighthouse hub cards and Sonar.
- The source citation and the "not a ranking of danger" caveat, kept visible.
- The EzanaQL row and Share.
- The empty state when nothing is loaded.
- Sample data only for admin and demo accounts, labelled.

## 7. Problems with the current page

### Design problems

- Generic older layout: centred title and lead, filled highlight card, bordered search, boxed table, large call-to-action button.
- The headline global figure is buried in a sentence.
- A monthly series with forty years of history is shown as two numbers per country.
- The Month column repeats the same month on every row.

### Bugs and gaps

- The highlight card titled "Highest geopolitical risk" ranks countries, which the page's own caveat says the index does not support.
- The menu promises daily data that is not loaded.
- Change is not signed by colour or icon, and a failed read looks the same as no data.
- Missing values are blank rather than N/A.

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

1. Keep a top five? Default: replace it with "largest rise since last month" and "highest against the country's own long-run average", which respect the caveat.
2. Use the history back to 1985? Default: yes, a global index chart and a country side panel chart (a backend read of data already loaded).
3. Show the threats and acts sub-indexes? Default: yes on the global chart, as a backend extension.
4. Daily data? Default: not shown; the menu text is corrected to monthly.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Geopolitical Risk Indices. Route: /datasets/geopolitical-risk. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a global index chart since 1985 with labelled spikes, a country side panel comparing the latest reading to its own history, biggest month-on-month movers, a country watch alert, and links to the sanctions and conflict pages for the same country. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
