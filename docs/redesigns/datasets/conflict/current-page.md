# Ezana Armed Conflict Tracker page: how it works today

Page: Armed Conflict Tracker. Route: /datasets/conflict. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

Organized violence worldwide from the Uppsala Conflict Data Program's georeferenced event data: where people are being killed, by whom, in which conflicts, and how that is changing month by month, with a country picture on demand.

- Who: investors gauging country risk around emerging-market holdings, students, journalists.
- How they arrive: Sonar country answers and the landing page's Sonar country stack (both open a country), the dataset ticker, search. The page is not in the green band's menus or on the lighthouse hub, so the band lights no dimension here.
- What next: open a country, read its conflicts and latest events, compare with the sanctions and geopolitical risk pages.
- Data connected today: yes, live, loaded weekly (monthly preliminary release plus the annual release).
- Sample data: wireframe figures are sample content with invented names. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees real data or, with no source connected, "This dataset's source is not connected yet." This page shows no sample data today.

## 2. What is on the page today

Desktop, top to bottom, filled cards. One selection (the country) is shared by the map, rising list, table, ticker and panel.

- Frame: navigation, green band, ticker of the deadliest countries over 12 months (dominant violence type, country, "N deaths"); an item opens that country.
- Header: eyebrow "Datasets · Uppsala Conflict Data Program", title "Armed conflict tracker", a lead sentence; then the EzanaQL row.
- As-of line: "Latest recorded event (date). Last 12 months: (from) to (to)."

| Section | What it shows | Controls |
| --- | --- | --- |
| Headline measures (four filled tiles) | Deaths in organized violence, last 12 months (with change against the prior 12 and "Range low to high"); Active state-based conflicts ("N at war level (1,000+ deaths)"); Countries with active conflict ("N countries recorded deaths"); Civilian deaths (share of all deaths). | None |
| Where organized violence is happening | Countries shaded by deaths over 12 months, with event cells on a 1 degree grid as circles sized by deaths and coloured by the deadliest violence type; legend bins 1 to 24 up to 10,000+. | Period 3M, 12M, 36M; Violence type All, State-based, Non-state, One-sided; Map or Ranked view; a country opens its panel. |
| Fastest rising (beside the map) | Up to six countries with 100 or more deaths that rose against the prior year. | A row opens the country. |
| Country panel (inserted when a country is picked) | Tiles: deaths last 12 months (with range), recorded events, civilian deaths (share), share of global deaths; monthly deaths by type; deadliest conflicts (up to 8); most active parties (up to 8); latest recorded events (10: date, pairing, type). | Close. |
| Deaths in organized violence by month | Worldwide, 36 months, stacked by violence type; preliminary months hatched. | None |
| Countries, last 12 months | Country, Deaths, Change, Events, Civilians, Main type, Deadliest conflict. Top 15, then "Show all N countries". | Sort by Deaths, Change, Events, Civilians; region filter (a native select); a row opens the country. |
| Deadliest conflicts, last 12 months | Ten conflicts: name, type, countries, number of pairings, last event, best estimate with low to high range, change on the prior year. | None |
| Deaths by region | Paired bars per region, last 12 months against prior 12. | None |
| About this data | What is counted, releases in use (monthly preliminary, revised later; annual), coverage, attribution. | None |

States: route skeleton; nothing loaded: "Conflict data has not loaded yet. It refreshes weekly from UCDP."; map: "Loading events..." and "The event map could not be loaded."; panel: "Loading the country picture...", "UCDP has no recorded events for this country in the last three years.", "The country picture could not be loaded. Try again shortly."; rising: "No country with 100 or more deaths rose against the prior year." Tablet and phone: pairs stack; breakpoints not verified.

## 3. What the user can do

- Open a country from the map, ranked view, rising list, table, ticker or address; close it (picking it again also closes)
- Change the map period and violence type; switch map and ranked views
- Sort the country table, filter by region, show all countries
- Open EzanaQL on the lighthouse hub; share the page
- In the code but with no button: none found. Conflicts, parties and events do not open anything.

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Deaths (best, low, high) | Estimated deaths in organized violence | Uppsala Conflict Data Program event data | Weekly load; recent months preliminary | Recent months revised later |
| Events | Recorded events with at least one death | Same | Same | Same |
| Civilian deaths | Deaths among civilians | Same | Same | Same |
| Violence type | State-based, non-state, one-sided | Same | Same | None |
| Country, region | Where the events happened | Same | Same | None |
| Conflict name, pairings, parties | Named conflicts and the pairs of actors | Same | Same | None |
| Event date, location cell | Event end date, binned to a 1 degree grid | Same | Same | Exact points not shown |
| Monthly deaths by type | 36 months worldwide and per country | Same | Same | Preliminary months hatched |
| Changes | Last 12 months against the prior 12 | Ezana from the above | Same | Countries with no prior deaths |
| Share of global deaths | Country deaths over the world total | Same | Same | None |

## 5. Data we do not have

Do not design around these.

- Protests, riots or non-lethal events; injuries; displacement or refugee numbers.
- Forecasts, risk scores or escalation predictions.
- Real-time events or alerts; the data is weekly at best and revised.
- Market, ticker or company exposure to a conflict.
- News stories or narrative summaries.
- History before the 36 months the page reads.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts see sample data, labelled "Sample content".

## 6. Must keep working

- The country parameter in the address (ISO3): opening, sharing and the links in from Sonar and the landing page.
- The shared country selection across map, rising list, table, ticker and panel.
- The country panel content, which Sonar reuses.
- Preliminary months marked as provisional; death ranges shown with the best estimate.
- Each section loading and failing on its own; the empty state when nothing is loaded.
- The ticker and its click; the EzanaQL row; the attribution in About this data.
- Sample data only for admin and demo accounts, labelled.

## 7. Problems with the current page

### Design problems

- Bordered filled cards and tiles, segmented controls on a grey track with an emerald fill, and chips break the family look; a title block with lead instead of the identity row.
- The country panel is inserted into the page instead of opening as a side panel.
- The page is missing from the menus and the lighthouse hub, so it is hard to find.
- Conflicts and parties are dead ends.

### Bugs and gaps

- Loading text uses three dots and names the source acronym in interface copy.
- Change values colour "worse" and "better", which reads as judgement; colour is the main signal.
- The country selection replaces the address without adding history, so Back does not close the panel.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the ones outside tools get wrong most often first.

1. Draw the family frame as it is: the 64px Ezana navigation bar, the full-bleed green category band (emerald gradient, about 48px, white labels, Global Empire Lighthouse as the active dimension in soft translucent white), then a ticker of the deadliest countries (mono violence type, white country, mint deaths), and the shared light grey dataset footer.
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

1. Add the page to the Global Empire Lighthouse menu and hub? Default: yes, as a taxonomy change shipped with the redesign.
2. Country detail as a side panel? Default: yes, a 720px drawer on the existing country parameter, Back closes it.
3. Should conflicts open a detail? Default: yes, a conflict side panel using data already loaded (pairings, deaths, countries, last event).
4. Keep the event cell map? Default: yes, as the ranked hero's companion, with the ranked view for keyboards.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Armed Conflict Tracker. Route: /datasets/conflict. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a conflict side panel, a two-country comparison of monthly deaths, a "new since last load" marker on events, a watch-a-country alert, and links to the sanctions and geopolitical risk pages for the same country. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
