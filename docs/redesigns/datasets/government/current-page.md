# Ezana Government activity page: how it works today

Page: Government activity (index). Route: /datasets/government. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this.

## 1. Summary

The overview of federal government activity: the largest contract awards in Ezana's synced set, the top recipients this fiscal year, and sectors with rising legislative activity. It is the gateway to the Government Contracts page.

- Users: retail investors and students, often signed out, asking which listed companies win federal money.
- How they reach it: URL, search engines, the sitemap and the old dataset tab row. It is not in the green category band menus.
- Next: "View all contracts" (the Government Contracts page), an award or recipient detail popup, or "Explore in the app" (sign in).
- Data connected today: yes, live. Awards come from the federal spending record, synced daily, with a live call to the same source as a fallback. When both fail, a bundled sample of illustrative awards and recipients is shown to everyone, marked "Sample" (see the known change in section 6).
- Sample data rule: figures in the wireframe are sample content with invented names. Only admin and demo accounts ever see sample data on the live page, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, top to bottom. This route still renders inside the older marketing shell, not the dataset family frame: there is no green category band, no ticker and no EzanaQL row.

| Element | What it shows | Controls |
| --- | --- | --- |
| Top bar | "Back to home" with an arrow on the left, "Get started" button on the right | Links to home and sign in |
| Dataset tab row | Six pill tabs: Congressional and Political, Government activity (active), Institutional holdings, Alternative signals, Prediction markets, Global and macro | Links |
| Government sub-tabs | Overview (active), Government contracts | Links |
| Hero | Eyebrow "Datasets", large centred title "Government activity data", and a lead that promises contract awards, lobbying spend and patent filings | None |
| Search row | Two bordered fields: "Recipient search" ("Search by company…", matches recipient or ticker) and "Agency search" ("Search by agency…") | Filter only the 15 rows already in the table, as you type |
| Top recipients card | Badge "Live" or "Sample", trophy icon, "Top contract recipients this fiscal year", a description, five ranked rows: name, ticker and agency, total value | When live, a row opens the recipient popup |
| Awards table | "Recent federal contract awards" with a freshness note ("Federal contract data via (source), synced (date)." or the sample note). Columns Recipient, Awarding agency, Ticker (or a muted dash), Amount, Award date. 15 rows | When live, a row with an award id opens the award popup. "View all contracts" link below |
| Legislative tailwinds | Source badge, intro, up to six sectors: name, sector fund symbol, bill count, furthest stage, momentum level; a methodology line | None |
| How we source it | A bordered card: two paragraphs on source, sync and ticker matching | None |
| Call to action | "Explore in the app" solid emerald button | Opens sign in |

Then the shared dataset footer.

### Popups (centred dialogs)

- Award details: award type, recipient, description; Key facts (Total obligation, Base and all options, Date signed, Period of performance, Awarding and Funding agency); Classification (NAICS, PSC, Place of performance, Business categories, Parent award); Modification history; a link to the official record. Error "Details unavailable right now."; missing fields "Not disclosed".
- Recipient: name, meta; Key facts (Total awarded this FY, Ticker, Primary awarding agency); up to eight recent awards, each opening the award popup.

### States

- Route loading: centred title, pill and table skeletons. Empty search: "No matching records."
- Legislative tailwinds: "Loading legislative momentum…", and "No legislative momentum to show yet, sectors will appear here as tracked bills advance through Congress."
- Source failure: the bundled sample, badge "Sample", note "Sample of recent awards, full live dataset available in the app."; rows not clickable.

### Tablet and phone

Under 640px the search fields stack and long names wrap; the table keeps its columns.

## 3. What the user can do

- Filter the 15 shown awards by company or ticker and by agency
- Open a recipient's popup and then any of its recent awards
- Open an award's popup and follow the link to the official record
- Go to the full Government Contracts page ("View all contracts" or the sub-tab)
- Use the old tab rows; sign in from "Get started" or "Explore in the app"
- Easy to miss: only live rows are clickable; the search never goes beyond the 15 rows. Full-set search by recipient or agency exists behind the scenes with no control here.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Recipient | Company receiving the award | Federal spending record (U.S. Treasury) | Daily sync | Name as filed, not parent company |
| Awarding agency | Agency that made the award | Same | Daily | None |
| Ticker | Ezana's match of a recipient to a listed company | Ezana entity matching | Daily | Most recipients unmatched (dash) |
| Amount | Award value | Same | Daily | None |
| Award date | Action date | Same | Daily | None |
| Top recipients | Five recipients by total value across the synced set, with ticker and main agency | Derived | Daily | Synced set is a few hundred of the largest current-year awards |
| Award detail | Obligation, base and options, dates, period, funding agency, NAICS, PSC, place, business categories, parent award, modifications | Same record, fetched on open | On open | Many fields "Not disclosed" |
| Recipient recent awards | Up to eight recent awards for a recipient | Same | On open | None |
| Legislative tailwinds | Sectors with rising bill activity in 90 days, bill count, furthest stage, momentum, sector fund symbol | Congress.gov bill actions with Ezana's sector map | Daily | Empty until bills are tracked |

## 5. Data we do not have

Do not design around these; show them only as clearly marked future features.

- Lobbying spend and patent filings on this page, although the lead promises them (they live on their own dataset pages).
- Truly "recent" awards: the table holds the largest awards in the synced set, ordered by value, not by date.
- Full-history search, totals by agency over years, or fiscal-year trends on this page (the Government Contracts page has those).
- Stock prices, returns or any reaction of a ticker to an award.
- Parent-company roll-ups and tickers for most recipients.
- Real-time updates; the sync is daily.
- Live sample content for ordinary visitors after the known change: wireframe figures are invented and labelled "Sample content"; only admin and demo accounts would see sample data live.

## 6. Must keep working

- "View all contracts" and the route to the Government Contracts page.
- Award and recipient popups with every field and the official-record link; "Not disclosed" for missing fields.
- The legislative tailwinds read with its informational wording ("Informational only, not investment advice") and honest empty line.
- Ticker shown only when Ezana has matched it; never an invented symbol.
- Server-rendered first view (data visible to search engines) and the synced-on freshness note.
- Known change, being made in a parallel commit: the bundled sample is shown to everyone today when the source fails. After the change only admin and demo accounts see it, labelled "Sample content"; everyone else gets "This dataset's source is not connected yet." with a link back to the datasets overview.

## 7. Problems with the current page

### Design problems

- It is one of the few dataset pages still in the old marketing shell: "Back to home" bar, two rows of pill tabs, no green band, no EzanaQL row. It does not look like the family.
- A large centred title and a lead paragraph that promises lobbying and patents the page does not show.
- Bordered fields and shadowed cards, a pill badge, a trophy title icon, non-Bootstrap icons.
- The search fields look like they search the dataset but only filter 15 rows.
- "How we source it" is a full card of prose naming the provider.
- One primary action ("Explore in the app") points to sign in rather than to the data.

### Bugs and gaps

- The "Recent federal contract awards" table is ordered by amount, not date.
- The sourcing text has broken quotation marks where a dash was removed.
- The sample shows real company names with illustrative figures.
- Placeholders end in an ellipsis; the route skeleton does not match.

## 8. Design rules the mock must follow

From the dataset page master prompt and the Branding and UI Guide; the rules outside tools break most often come first.

1. Flat cards: no fill, border, shadow, radius or coloured top edge. Whitespace and 1px hairlines (primary text at about 8 percent) only. Only overlays (side panel, dialog, menu, tooltip, sheet) have a surface.
2. Tabs, toggles, filters and time selectors are text only, no track, pill or fill; selected is emerald text. Time ranges are 12px mono caps.
3. No outlined, ghost or pill buttons: one solid emerald primary per group, every other action plain text.
4. Borderless search: icon and grey placeholder, no outline at rest, hover or focus.
5. Nothing below 11px. Content runs from x=32 to x=1408 at 1440px; 64px between side-by-side cards, 20px between stacked rows, 24px clear beside vertical rules. Nothing touches text; a selected row is emerald text or a faint wash with 12px clearance.
6. Bootstrap Icons only; no emoji, logos, illustrations or spinners (skeletons only). Member headshots are the one data image.
7. No em dashes. Sentence case. Describe, never advise; never "real-time", show the update time. No vendor or database names in interface text.
8. Frame drawn as it is: the 64px Ezana navigation bar, the full-bleed green category band (about 48px, emerald gradient, white labels, Home, the seven dimension menus, sign-in actions, active dimension as a soft white highlight), an optional ticker of latest records inside the band, and the light grey dataset footer.
9. Light mode as rendered (white ground, dark ink), using only tokens that exist in both themes.
10. Compact identity row: 11px mono caps eyebrow, dataset name at 22px weight 700, freshness line in mono and at most one primary action on the right. No hero or intro paragraph; explanation goes in an info tooltip. Directly under it the EzanaQL row: terminal icon, "Query this data with EzanaQL", muted "on the [dimension] hub", plain-text Share.
11. Mono (tabular) for every figure, ticker, date, rank, count, eyebrow, header and axis label; Plus Jakarta Sans for names and prose. Card title 18px, section 22px, body 14px, caption 12px, KPI 18px mono.
12. Ruled tables: no header fill, 11px caps mono headers over one hairline, 1px row rules, rows 42 to 48px, no zebra or cell borders, entity first with a mono meta line, numbers right aligned, header-click sorting with an emerald arrow.
13. Entity detail in a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
14. Party and chamber as text (D, R, I; House, Senate), never colour alone. Signed changes, compact money ($4.92M), missing values N/A.
15. Every card: a skeleton, a one-line empty state with one action, an inline error with Retry. Charts flat: dashed faint gridlines, 11px mono ticks, direct labels, emerald main series, grey comparison.
16. All names and figures are invented sample content, labelled "Sample content" near the identity row.

Colours (light, as rendered; dark in brackets): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at about 8 percent; green band emerald gradient with white labels and mint values.

Page-specific: draw the green band with Capitol Watch active (Government Contracts sits under Capitol Watch); recipients are names with a mono ticker, never a logo; amounts are compact ($1.24B) with full values in the popup.

## 9. Open questions for me

1. Should this page join the dataset family frame (green band, identity row, EzanaQL row) and drop the old tab rows? Default: yes; the sub-navigation becomes text links to Government Contracts and Lobbying Activity.
2. What is the page's job next to the Government Contracts page? Default: a one-screen overview of federal money flowing to listed companies, every section linking into the full contracts page.
3. Keep the promise of lobbying and patents? Default: only as links to those dataset pages, not as data drawn here.
4. Rename the awards table? Default: "Largest awards in the latest sync", sorted by amount, with a date sort available.
5. Keep "How we source it"? Default: replace with the one-line source and compliance line at the bottom.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Government activity (index). Route: /datasets/government. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a ranked bar list of top recipients with ticker linkage, an agency breakdown of the synced awards, a matched-ticker filter, links from each sector in the legislative tailwinds to the contractors in it, and a CSV export with a citation line. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
