# Ezana Global Empire Rankings page: how it works today

Page: Global Empire Rankings. Route: /datasets/global-empire-lighthouse. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.

Written from the code at commit caa179e (main). The page was not run while writing this.

## 1. Summary

The home page of the Global Empire Lighthouse dimension. It ranks about 60 countries on Ezana's own composite of power dimensions (economic output, growth, debt, trade, education, innovation, infrastructure, military spending, inequality, cost competitiveness, resource efficiency), inspired by the Changing World Order framework. Below the rankings it carries what the old dimension hub carried: cards for the other lighthouse datasets, the dimension's EzanaQL bar and four cross-dataset cards.

- Who: retail investors, students and journalists, many signed out.
- How they arrive: the green band (this page is the hub), the old Empire Rankings address (redirected), "Show me data" on Global Market Analysis, Sonar and Echo articles.
- What next: open a country, compare countries, follow the series to the World Bank or OECD pages, or run EzanaQL.
- Data connected today: yes, live. Scores rebuild weekly from World Bank indicators; 11 of 18 dimensions are scored, 7 are listed as pending.
- Sample data: wireframe figures are sample content with invented names. On the live page only admin and demo accounts may see sample data, labelled "Sample content"; everyone else sees real data or, with no source connected, "This dataset's source is not connected yet." This page shows no sample data today.

## 2. What is on the page today

Desktop, top to bottom, in a column up to 1320px wide. It wears the older in-app Empire Rankings look: filled rounded cards on a two-column grid, gold accents, bordered chip groups.

- Frame: navigation bar, green band, and a ticker of the top 30 countries ("#1  Country  71.4"); an item opens that country.
- Hero: "Back to Global Market Analysis" link, globe icon tile, title, a lead sentence ("Power measured across 11 of 18 dimensions for N ranked countries, built only from sourced data."), and a badge "LIVE · 11/18 DIMENSIONS · (year)" or "REFRESHING".
- Layers banner (only when arriving with layers): "Showing data for your selected Global Power Map layers", the layer names as tags, dismiss button.

| Card | What it shows | Controls |
| --- | --- | --- |
| Global Power Rankings | Horizontal bars of the composite (0 to 100), ISO codes on the axis; bar 1 gold, 2 to 3 emerald, then two grey tiers. Tooltip: rank, name, score. | Scope (World, G20, G7, BRICS, NATO), Show (Top 5, 10, All), Sort (Strongest, Weakest). A bar opens the country. |
| Country panel | Inserted under the rankings: "Nth of N on the composite · score · X of 11 live dimensions · year" (or "Not ranked"); a radar against the leader; "Ranks highest in" and "Ranks lowest in" (three each); links to the World Bank page and the country on the OECD page. | Close. A dimension link opens that dimension's table with the country highlighted. |
| Country Scorecards | Tiles per ranked country: ISO code, name, "9/11 dims", rank, composite, a bar. | Scope, Sort by (Rank, Name, Coverage). A tile opens the country. |
| Power Dimension Comparison | Radar of two countries across live dimensions, default the top two. | A and B selects, Focus (All, Economic, Military, Social). Under three axes: "Fewer than three live dimensions in this focus." |
| Spotlight cards | Half-width ranked bars for Debt Burden, Military Strength, Trade, Innovation and Technology, Infrastructure. | Scope select, Top 5 or 10, Sort. |
| Every Dimension | Dimension pills grouped by category (Economic, Fundamentals, Social), then the full table: Rank, Country (a "Your search" tag on the open one), Score. Scrolls inside its box. | Pills. A row opens the country. |
| Composite Ranking | Rank, Country, Composite, Coverage, Strongest, Weakest. Countries under 70 percent coverage follow unranked ("n/a, too few dimensions"). | A row opens the country. |
| Pending Dimensions, How We Score It | The 7 unscored names; the method (weekly load, 0 to 100 blend, lower-is-better inverted, 70 percent rule, not an official index). | None |

Below the cards (the old hub): dataset cards for the other lighthouse datasets (two marked Soon; live ones show a lead figure, freshest date and "Open"), the EzanaQL bar with example prompts, and four cross-dataset cards (OECD moves, World Bank moves, risk leaders, new sanctions) whose rows offer "Watchlist / Save" and "Query this".

States: a generic skeleton while loading; with no scores, "Rankings are refreshing. Scores load from the World Bank every Monday."; a crash shows the shared "This dataset hit a snag" screen with Retry; card empties such as "No countries in the selected scope." Tablet and phone: one column, charts and tables scroll inside their boxes (breakpoints not verified).

## 3. What the user can do

- Open a country (ticker, bar, scorecard, table row, address) and close it
- Change scope, Top N and sort on the rankings, spotlights and scorecards
- Compare any two countries on the radar, change its focus
- Pick a dimension and read its full table; jump there from a country's strongest or weakest list
- Follow links to the World Bank page and the country on the OECD page
- Dismiss the layers banner; open lighthouse datasets; run EzanaQL; save a row
- Easy to miss: card settings persist in this browser, not in the address.

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Composite score and rank | Mean of live dimension scores, 0 to 100 | Ezana scoring of World Bank indicators | Weekly | Under 70 percent coverage: unranked |
| Coverage | Live dimensions scored, out of 11 | Same | Weekly | None |
| Strongest, weakest dimension | Best and worst by rank | Same | Weekly | Unranked countries |
| Dimension score and rank | One dimension, 0 to 100, higher is stronger; ties share a rank | Weighted World Bank series | Weekly | 7 pending dimensions |
| Scoring year | Latest year with scores | Same | Weekly | One year only |
| Country, ISO code | About 60 included countries | Ezana country list | Static | Others |
| Group membership | G20, G7, BRICS, NATO | Public membership lists | 2026 | Other blocs |
| Dataset card figures | Lead number and freshest date per lighthouse dataset | Those datasets | Per dataset | Soon datasets |
| Cross-dataset rows | OECD moves, World Bank moves, risk leaders, new sanctions | Those datasets | Per dataset | Empty until loaded |

## 5. Data we do not have

Do not design around these.

- History: one scoring year only, so no trend lines, sparklines or rank change since last year.
- Scores for the pending dimensions (Internal Conflict, Markets and Financial Center, Reserve Currency, Geology, Character and Social Contracts, Rule of Law, Acts of Nature).
- Raw indicator values behind a score (they live on the World Bank and OECD pages).
- Projections, a cycle position, flags or portraits; real-time anything; countries beyond the list.
- Sample data rule: wireframes use invented names labelled sample content; live, only admin and demo accounts see sample data, labelled "Sample content".

## 6. Must keep working

- Address: country (ISO3) opens a country; dim selects a dimension; layers maps to a dimension or the composite. Old section anchors still land somewhere sensible.
- The redirect from the old Empire Rankings address and the links in from Sonar, Echo and Global Market Analysis.
- The 70 percent rule, ranked and unranked kept apart, pending dimensions never scored.
- Scores agree with the OECD page's empire mode and Sonar's empire rows (one shared model).
- Links out (World Bank page, OECD page for a country, lighthouse datasets, EzanaQL and its saves), the ticker, the refreshing state; sample data only for admin and demo, labelled.

## 7. Problems with the current page

### Design problems

- It looks like another product: gold-on-dark filled rounded cards and a centred hero with icon tile, back link and badge, not the family identity row.
- Bordered chip groups with gold fill for the selection, plus native select boxes.
- The same composite is ranked three times (bars, scorecards, table); spotlight cards repeat the Every Dimension table.
- The country panel is a card pushed into the grid, not a side panel.
- Hub content sits after a long scroll; no EzanaQL row at the top; title case titles; no mono freshness date.

### Bugs and gaps

- Shared links do not reproduce card settings (browser storage only).
- The radar's Focus groups (Economic, Military, Social) differ from the categories used elsewhere on the page.
- "n/a" in lowercase and dashes instead of N/A.
- The open country's scorecard gets a coloured edge bar, which the guide forbids.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the ones outside tools get wrong most often first.

1. Draw the family frame as it is: the 64px Ezana navigation bar, the full-bleed green category band (emerald gradient, about 48px, white labels, Global Empire Lighthouse as the active dimension in soft translucent white), then a ticker of the top 30 countries (mono rank, white name, mint mono score), and the shared light grey dataset footer.
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

This run is automated, so each question carries the default that will be used unless you say otherwise.

1. Should the old hub content (dataset cards, EzanaQL bar, cross-dataset cards) stay on this page? Default: yes, kept and moved higher, because this page is the dimension hub.
2. Keep the ranked bars, scorecards and composite table, or merge them? Default: one ranked hero plus one full composite table; scorecards removed.
3. Keep five spotlight cards? Default: replace them with the dimension selector driving one ranked view plus the full table; old section anchors land on that view.
4. Should the country detail become a side panel? Default: yes, a 480px right panel on the existing country parameter.
5. Should card settings move into the address? Default: yes for scope and selected dimension; Top N and sort may stay local.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Global Empire Rankings. Route: /datasets/global-empire-lighthouse. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a two or three country comparison, a group view (G7 against BRICS), a per-dimension "what drives this score" link to the World Bank series, and a citation with CSV export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
