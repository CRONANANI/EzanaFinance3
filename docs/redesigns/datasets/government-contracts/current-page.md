# Ezana Government Contracts page: how it works today

Page: Government contracts. Route: /datasets/government/contracts. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots are supplied separately. Also covers the contractor quick-view popup and the dossier sub-page (/datasets/government/contracts/dossier/[slug]).

## 1. Summary

The page shows who receives federal contract money: which companies, from which agencies, how much, in which fiscal year. It is one of the four reference pages of the dataset family.

- Who uses it: retail investors, student analysts and journalists, many signed out.
- How they get there: the Capitol Watch menu in the green band, the Capitol Watch hub, search engines, shared links.
- What they do next: open a recipient's history or one award's full record, open the quick view or dossier, query on the Capitol Watch hub with EzanaQL, or add a ticker to a watchlist.
- Live data connected today: partly. The main page is live (federal award records, daily). The contractor quick view and the dossier sub-page show invented enrichment to everyone today.
- Sample data rule: wireframe figures are sample content with invented names. On the live page only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or, where no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom. The app draws the navigation bar, the full-bleed green category band (Capitol Watch active) and a scrolling ticker of the latest awards (agency, recipient, amount). A ticker click opens the award dialog.

**Header and EzanaQL row.** A centred caps eyebrow naming the source website, a centred 25px title, then the EzanaQL row (link to the Capitol Watch hub, Share).

**Left filter rail (240px).**

| Control | What it does |
| --- | --- |
| Generate report | Filled button that only links to the Capitol Watch hub. |
| Fiscal year | Custom dropdown: All years, then every year on file (FY2008 on), keyboard operable. Drives every figure except the explorer table. |
| Min award value | Slider $0B to $130B+ on a recipient's total. |
| Awarding agency | Agency count, borderless "Filter agencies" search, then every agency as a row (colour bar, name, award count, share). Click toggles (multi-select); "N selected" and Clear appear. No match: "No agency matches (term)". |
| Contract type | A note: not available. |

**Three metric cards (boxed, coloured top edge).** Total obligated (with an agency share strip and "(n) agencies", or "sample" on the bundled fallback); Awards (with a per-year sparkline when two or more years exist); Most awards issued (the agency issuing the largest share of awards, with its average award).

**Agency legend.** A 100 percent share bar, then chips for the top ten agencies plus Other; a chip toggles that agency. The top ten keep one stable colour everywhere.

**Top recipients.** Title "Top recipients · (agency label)" with a bordered Treemap or Share toggle. Treemap: up to 40 tiles grouped in agency columns, caption "Top (n) recipients by obligated value", a tile opens the recipient dialog. Share: agency donut with legend. Empty: "No recipients match the current filters."

**Explore all awards.** "(n) matching of (total)". Its own filters: Recipient and Awarding agency searches, Fiscal year with per-year counts, a Sort dropdown. Columns Recipient, Agency, Ticker, Amount, FY, Date; three headers also sort on click. 25 rows a page, pager "1 to 25 of N", Page x of y. Loading is a spinner row, an error is a text row with no Retry, empty reads "No awards match these filters." A row opens the quick view. No source or compliance line ends the page.

**Recipient dialog (treemap tile).** Left: initials badge, name, agency and ticker (or "HQ not available"), mini stats Total awarded, Awards, Avg contract, YoY; "Contract type split: Not available"; Related security (price sparkline, or "PRIVATE / Not publicly traded"); up to five similar recipients for the same agency (click swaps). Right: award value by fiscal year, breakdown by agency, Add to watchlist and an outlined Full dossier. Watchlist: signed in, adds the ticker to the first list; signed out, a popover with Join the waitlist and Log in. Full dossier opens an overlay: price chart 1Y 3Y 5Y, key ratios, the same stats, and a radial platform diagram with only Capitol Watch lit.

**Award dialog (ticker).** Ledger: recipient, agencies, full amount, action date, PIID, NAICS and PSC codes, parent, funding agency, place, description; blanks read "Not reported". Beside it "Sonar analysis · AI-generated" with a disclaimer, summary, sectors it may touch, uncertainty; loader "Reading the award record"; errors "No analysis for this award yet" or "Analysis is temporarily unavailable" with Retry analysis. Footer: view on the source website, an unsaved Add to watchlist toggle, Recipient profile (opens the dossier page).

**Contractor quick view (explorer row).** A 920px modal: monogram, name, ticker or PRIVATE chip, rank chip, four stats, award value chart with peak callout, four agency bars, a market card or private-company note, four similar recipients (click swaps), a "Signal:" sentence, outlined Full dossier, unsaved watchlist. All invented: a few primes have fixed figures, any other name gets generated ones.

**Dossier sub-page.** Renders under the older marketing shell with its own top bar. Hero (sector, headquarters, employees, lifetime obligations, rank), a six-figure KPI strip (obligations, active contracts, average contract, book-to-bill, competed share, government revenue share), award chart with vehicle and pricing mix, agencies, market context or peers, congressional trades, platform signal scores, recent awards, unsaved watchlist. All invented for any slug.

**Loading and smaller screens.** Route loading: title, pill and ten-row table skeletons. Under 900px the rail moves above the content and cards stack; under 768px dialogs become full-screen sheets; under 480px gutters are 16px.

## 3. What the user can do

- Filter by fiscal year, minimum recipient total and one or many agencies (rail or legend); search the agency list
- Switch the hero between Treemap and Share
- Open a recipient, walk to similar recipients, open the dossier overlay and change its price range
- Open an award from the ticker, read or retry its AI analysis, open it on the source website, open the dossier page
- Search, filter, sort and page every award; open a quick view from a row
- Add a ticker to a watchlist (recipient dialog only, signed in, ticker present)
- Share; go to the Capitol Watch hub
- In the code with no button: minimum and maximum amount filters on the award search.

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Recipient, parent | Who was awarded | Federal award records | Daily; page rebuilt every 10 min | Parent often blank |
| Awarding agency, sub-agency, funding agency | Who awarded and paid | Federal award records | Daily | Funding agency only on ticker awards |
| Amount, action date, fiscal year | Obligated dollars and when | Federal award records | Daily | None |
| PIID, NAICS, PSC, place, description | Identifiers, codes, location, source text | Federal award records | Daily | Ticker awards only; description often blank |
| Award type | Type letter A to D | Federal award records | Daily | Stored, not shown |
| Ticker | Listed security | Ezana matching | Daily | Most recipients; always empty in yearly totals |
| Recipient totals by year and agency | Sum and count | Ezana roll-up | Periodic job | Top recipients per year only |
| Agency totals by year, coverage | Every agency; years and counts on file | Ezana roll-up | Periodic job | None |
| Latest awards feed | Newest 60 awards | Federal award records | Periodic | None |
| AI award analysis | Summary, sectors, uncertainty | Generated from the record, cached | On demand | Unanalysed awards |
| Price history, company ratios | Market context | Market data, delayed | Delayed | No ticker |

## 5. Data we do not have

Do not design around these. Wireframe figures are sample content; only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

- Contract type split, vehicle mix, pricing structure, competed versus sole-source share.
- Active or expiring contracts, backlog, book-to-bill, government share of revenue.
- Rank among all primes, employees, headquarters, registration codes.
- Congressional trades, lobbying spend and platform signal scores for a contractor (all invented in the quick view and dossier today).
- A true total across every recipient (only top recipients are rolled up).
- Tickers for most recipients; company logos.
- Real-time changes, subcontracts, grants, modification history, forecasts or "Signal" judgements.

## 6. Must keep working

- Ticker items in the green band, each opening that award's full record.
- One filter set (fiscal year, minimum total, multi-agency) driving every aggregate, with stable agency colours.
- The full paginated award table over every fiscal year: search, filter, sort, page.
- Award detail with every source field, "Not reported" blanks, the source link, and the AI analysis labelled "AI-generated" with its disclaimer and Retry.
- Recipient history by year and agency, similar recipients, related security price when a ticker exists.
- Watchlist add when signed in; sign-up or log-in prompt with a return link when signed out.
- EzanaQL row, Share, links to the Capitol Watch hub.
- The dossier route must resolve for any recipient name, since awards link to it.
- Each source fails alone; a failed roll-up never blanks the page.
- Known change (parallel commit): the quick view and dossier mock and the bundled sample awards will show only to admin and demo accounts, labelled "Sample content"; everyone else gets real figures or "This dataset's source is not connected yet." Keep both states.

## 7. Problems with the current page

Design problems:

- Four views of one contractor (recipient dialog, quick view, dossier overlay, dossier page), only one real.
- Rail and explorer have separate, unlinked filters; nothing lives in the URL, so views and dialogs cannot be shared.
- Centred title block; "Generate report" only links away. Boxed metric cards with coloured edges, bordered toggle, outlined buttons, boxed table, labels under 11px, a 1400px inner width, a non-Bootstrap icon set, spinners.
- Sort dropdown duplicates clickable headers.
- No source, freshness or "not investment advice" line.

Bugs:

- Watchlist toggles in the award dialog, quick view and dossier page are not saved.
- Yearly totals carry no ticker, so the recipient dialog calls listed companies private and disables watchlist.
- Explorer error has no Retry.
- The dossier page shows a second, older navigation bar.
- YoY compares the last two years present, which can skip years.

## 8. Design rules the mock must follow

1. Draw the frame as it is: 64px navigation bar; full-bleed emerald green category band (about 48px, white labels, active dimension a translucent white highlight) with the award ticker inside it (mono lead, white name, mint mono value); the shared light grey footer.
2. Light mode as rendered: ground #ffffff, primary text #0f172a, secondary #1e293b, muted grey #64748b, faint grey #94a3b8. Only colours that exist in both themes.
3. Compact identity row on the left line: 11px mono caps eyebrow "DATASETS · CAPITOL WATCH" (tracking 0.08em, muted grey), name at 22px weight 700 Plus Jakarta Sans, freshness in mono and at most one primary action at the right. Then the EzanaQL row. No hero, no intro.
4. Content from x=32 to x=1408 on a 1440px artboard.
5. Flat cards: no fill, border, shadow or radius; hairlines (primary text at about 8 percent) separate. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
6. Tabs, toggles, filters and time selectors text only; selected emerald text #047857, the rest grey; time ranges 12px mono caps.
7. No outlined buttons: one solid emerald #059669 primary per group, others plain text. Borderless search with bi-search.
8. Mono for every figure, ticker, date, rank, eyebrow, header and axis label. 11px minimum.
9. Ruled tables: no header fill, 11px caps mono headers, 1px row rules, 42 to 48px rows, numbers right, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
10. Entity detail as a right side panel (480px) or drawer (up to 720px) with a URL parameter; Back closes it.
11. Bootstrap Icons only, no logos or emoji; skeletons, never spinners; selected rows emerald text or a cleared faint wash, never an edge bar.
12. Flat charts with dashed gridlines and 11px mono ticks; emerald main series, grey comparison, negative #dc2626, warning #d97706, extra series info blue, cyan #06b6d4, purple #a78bfa.
13. Sentence case, no em dashes, never advice, no "real-time", no vendor names, N/A for missing.

## 9. Open questions for me

1. Merge the recipient dialog, quick view and dossier overlay into one panel? Default: yes, one right panel with a URL parameter, linking to the dossier page.
2. Keep the dossier page? Default: yes, inside the dataset frame, real fields only, invented parts in "Not available yet".
3. Should the explorer obey the rail filters? Default: yes, one filter set, mirrored to the URL.
4. Keep the AI award analysis? Default: yes, labelled AI-generated.
5. Keep "Generate report"? Default: no; Export CSV becomes the one primary action.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Government contracts. Route: /datasets/government/contracts. Version: retail, public dataset page. Data connected today: partly. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example ticker linkage for listed recipients, fiscal year over fiscal year change with partial years marked, agency concentration and rank changes, contractors that also lobby or are traded by members of Congress, and a CSV and citation export of the filtered view. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
