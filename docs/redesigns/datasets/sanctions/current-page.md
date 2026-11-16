# Ezana Sanctions and Trade Policy page: how it works today

Page: Sanctions and Trade Policy Tracking. Route: /datasets/sanctions. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

A research page over the whole US Treasury Specially Designated Nationals list: every listed individual, company, vessel and aircraft, where they are based, which programs list them, how listing activity is changing, and the full record behind each name, with official notices and press coverage beside it.

- Who: investors checking counterparties, students, journalists.
- How they arrive: the Global Empire Lighthouse menu, the hub's "New on the US sanctions list" card, Sonar sanctions answers, search.
- What next: filter, open a record, export.
- Data connected today: yes, live, refreshed daily.
- Sample data: wireframe figures are sample content with invented names. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees real data or, with no source connected, "This dataset's source is not connected yet." This page shows no sample data today.

## 2. What is on the page today

Desktop, top to bottom. Filled cards; one shared filter (country, program, entry type, dates) that the map, treemap, rising list, timeline, jurisdictions and table all read or write.

- Frame: navigation, green band, ticker of the newest additions; an item opens that record.
- Header: eyebrow "Datasets · US Treasury OFAC", title "Sanctions & trade policy", a lead paragraph. Then the EzanaQL row.

| Section | What it shows | Controls |
| --- | --- | --- |
| Sanctions landscape | Four measures: Active listings (with an entry-type bar and "Synced" time), Listed last 30 days (against the 30 before, plus 90 and 365 days), Countries (share of records naming one), Largest program (share of program assignments). Under them a world map "Where listed parties are based" shaded by address country, with press-coverage markers for the past 30 days. | View Map or Ranked; Measure Count or Share. A country sets the filter and opens a panel: listing count and share, entry-type mix, up to eight programs, "Show (country) listings", "Clear country". A selected program shades the map. |
| Fastest-rising countries (beside the map) | Countries adding listings fastest, last 12 months against the 12 before (minimum ten), each with 24 monthly bars. | A row sets the country filter. |
| Programs by size | A treemap of programs coloured by theme, a detail line for the hovered program (name, code, theme, target, count, share). | Count or Share; theme chips (All themes plus each theme); a tile sets the program filter. |
| Sanctions activity timeline | New listings per month (per year for all time) by OFAC's publication date, with "Listed in period", "Busiest month", "Monthly average", and a side list of top programs or countries for the period. | Range 6M, 12M, 24M, All; Breakdown Total, By type (stacked), By program, By country; a bar picks a month; "Show in listings" applies it as a date range. |
| Program by jurisdiction explorer | Jurisdictions programs target, with bars; a row expands to its programs, "Who is listed", listings based there and new in the last 365 days. | Sort by Listings, Entities, Individuals, Vessels, Aircraft, Recent. |
| Sanctions intelligence feed (beside it) | Official: OFAC recent actions (title, date, link, keyword-matched type tags). Press: stories mentioning sanctions and the countries named, with a caveat that a mention is not a designation. | Source Official or Press. |
| Entity explorer | Every active record, newest listing first: Name, Type, Programs, Based in, Identifier, Listed. Flags such as "Secondary risk". Rows expand inline or open a side drawer. | Search by Name or alias, or by Identifier (IMO, passport, tax or registry number); Type tabs with counts; Listed From and To dates; toggles "Secondary sanctions risk" and "Has linked parties"; removable filter chips; Export CSV (signed in, up to 5,000 rows); Previous, "Page X of Y", Next. |
| Data integrity | Per source, latest attempt and success; six coverage meters (for example address country stated, listing date matched); what each date means. | None |

Record drawer: names and aliases (by source), programs, where based, identifiers (machine-extracted, labelled), secondary sanctions clauses verbatim, "Linked to" notes matched against the list (0, 1 or several matches shown as such), records naming this one, OFAC remarks, and dates (listed by OFAC, first seen in our import, last confirmed, remarks parsed). Links inside filter the page or open another record.

States: skeleton while loading; nothing loaded: "The sanctions list has not loaded yet. It refreshes daily from the US Treasury."; cards without listing dates say "OFAC listing dates are not loaded yet" instead of zero; table errors ("The listings could not be loaded. Try again shortly.", a rate-limit message); "No records match these filters."; export messages including "Exports need an account. Log in or join the waitlist." Tablet and phone: paired cards stack; breakpoints not verified.

## 3. What the user can do

- Pick a country (map, ranked list, rising list) or program (treemap, chips, record) to filter the whole page; clear either
- Switch map views and measures; change timeline range and breakdown, apply a month to the listings; sort jurisdictions; switch the feed source
- Search by name, alias or identifier; filter by type, dates, secondary risk, linked parties, "linked to" a name; remove chips; page through
- Open a record (row, ticker, link inside another record); export CSV when signed in
- Easy to miss: "linked to (name)" filtering exists only from inside a record.

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Record name, aliases | Primary and alternate names | US Treasury sanctions list | Daily | None |
| Entry type | Individual, entity, vessel, aircraft | Same | Daily | None |
| Programs | Program codes, plus curated name, theme, target jurisdiction | Same; Ezana descriptions | Daily | Some codes lack a description |
| Address countries, localities | Where the party is based | Same | Daily | Many records name none |
| Listing date | OFAC's publication date | Same (advanced file) | Daily | Not matched for every record |
| Identifiers, facts | IMO, passport, tax and registry numbers, birth dates | Machine-extracted from remarks | Daily | Not verified |
| Secondary risk, linked to | Clauses and links quoted from remarks | Same | Daily | Matches are by name |
| Activity counts | Listings per month, 30, 90, 365 days, rising countries | Ezana from listing dates | Daily | Needs listing dates |
| Official actions | OFAC recent actions | US Treasury | Daily | Type tags are keyword matches |
| Press stories, press markers | Sanctions stories and countries named, past 30 days | News publishers | Daily | Reporting, not designations |
| Source status, coverage | Load attempts and coverage meters | Ezana load log | Each load | None |

## 5. Data we do not have

Do not design around these.

- Removed or delisted records (only active records are shown; removal dates exist but are not used).
- Other countries' or bodies' sanctions lists (EU, UK, UN).
- Ownership chains, parent companies or ticker links for listed entities.
- Trade or tariff data, despite "trade policy" in the name.
- Verified identity matches; matches are by name only.
- Real-time anything.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts see sample data, labelled "Sample content".

## 6. Must keep working

- One shared filter driving every section; every section loading and failing on its own.
- Name, alias and identifier search; type, date, risk and linked filters; paging from one server query so counts and rows agree.
- The record drawer with machine-extracted data labelled as such and links verbatim.
- CSV export for signed-in users only, up to 5,000 rows.
- Official and press kept apart, with the press caveat; address country and targeted jurisdiction labelled as different things.
- The ticker and its click; the EzanaQL row; links in from the hub and Sonar.
- Sample data only for admin and demo accounts, labelled.

## 7. Problems with the current page

### Design problems

- Filled cards, segmented controls with icons, coloured theme chips and colour-coded type strips break the family look.
- Very dense: eight sections, several pairs forced to equal height with inner scrolling.
- A title block with lead instead of the identity row.
- The first view is measures and a map; the table, which most visitors need, is far down.

### Bugs and gaps

- The shared filter and the open record are not in the address, so no view can be shared or restored with Back.
- The menu promises additions and removals; removals are not shown.
- Lowercase "n/a", ellipses in loading text, and a multiplication sign in a card title.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the ones outside tools get wrong most often first.

1. Draw the family frame as it is: the 64px Ezana navigation bar, the full-bleed green category band (emerald gradient, about 48px, white labels, Global Empire Lighthouse as the active dimension in soft translucent white), then a ticker of the newest additions (mono program code, white name, mint country), and the shared light grey dataset footer.
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

1. Section order? Default: identity row and filter bar, a ranked hero (programs or countries), the record table high, analysis cards below.
2. Put the filter and the open record in the address? Default: yes (country, program, type, dates, search, record).
3. Show removals? Default: yes, as a "Removed" view, a backend extension on data already stored.
4. Keep the press feed? Default: yes, separate from official actions, with the caveat.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Sanctions and Trade Policy Tracking. Route: /datasets/sanctions. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a "new since your last visit" marker, a removals view, a watch-a-name or watch-a-program alert, a shareable filtered view with citation and export, and a record side panel with linked parties drawn as evidence, never a verdict. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
