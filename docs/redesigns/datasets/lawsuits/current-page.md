# Ezana Lawsuits and legal proceedings page: how it works today

Page: Lawsuits and legal proceedings. Route: /datasets/lawsuits. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit 9191552 (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page is meant to track new lawsuits involving listed companies: securities class actions, patent fights, consumer and privacy cases, and settlements. It is one of the four Regulatory Winds datasets and was just created.

- Who will use it: retail investors, student analysts and journalists checking legal exposure for a company or a sector. Nothing is gated.
- How they get there: the Regulatory Winds menu in the green band, the Regulatory Winds hub, the datasets overview, search and shared links.
- What they will do next: open a case, follow the ticker to company research, or go to the hub to query with EzanaQL.
- Data connected today: no, source not connected. The page reads nothing, and Ezana stores no court or docket data anywhere today. The planned source is public federal court dockets and their free mirrors.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 2. What is on the page today

The page is new: one shared template filled with this dataset's settings, with no logic of its own. What a visitor sees depends on who they are.

Admin and demo accounts, desktop, top to bottom (shared dataset canvas, about 1400px centred with a 32px gutter):

| Section | What it shows and does |
| --- | --- |
| Green band | Shared chrome with Regulatory Winds lit. No ticker. |
| Identity row | Eyebrow "DATASETS · REGULATORY WINDS", name "Lawsuits and legal proceedings", and on the right a grey "Sample content" label with an eye icon (hover: shown to admin and demo accounts only). No freshness line, no action. |
| EzanaQL row | "Query this data with EzanaQL on the Regulatory Winds hub" with Share. |
| One table | Title "New filings against listed companies" with "Sample content" on the right. Columns Case, Ticker, Type, Court and Date. Five invented rows. No sorting, filters, search, paging, row click or detail panel. Missing values print N/A. |
| Source line | "Planned source: public federal court dockets." plus a sample-content note and "Nothing here is investment advice." |

Everyone else, signed in or out: the identity row without the label, then a plug icon, "This dataset's source is not connected yet." and a text link "Back to datasets". No EzanaQL row, no description, nothing else.

States: the shared route skeleton, then a small skeleton (title bar and eight-row table) while the server says whether the viewer may see sample content. If that check fails the viewer gets the empty state. There is no data request, so no error state. Tablet and phone: the identity row wraps and the table scrolls sideways inside its section. On the Regulatory Winds hub and menu the dataset carries a "Not connected" tag and its planned source.

## 3. What the user can do

- Ordinary visitors: read that the source is not connected; go back to the datasets overview.
- Admin and demo accounts: read the sample table; use Share; follow the EzanaQL row to the hub.
- Everyone: use the green band menus to reach other datasets.
- Not possible today: sort, filter, search, open a record, export, follow, set an alert, see when data was last updated, or be told when the source connects.

## 4. Data we have

Live data: none. Nothing on this page is a real record today. The only thing rendered is the layout skeleton below, filled with invented rows for admin and demo accounts. These columns are the layout skeleton, not fields we hold:

| Column (skeleton) | What it would mean | Planned public source |
| --- | --- | --- |
| Case | Case caption, such as a plaintiff versus a company, or "In re" a matter | Public federal court dockets |
| Ticker | Listed company the case names | Ezana matching of party names to companies |
| Type | Securities class action, patent infringement, consumer protection, privacy, settlement | Docket nature-of-suit codes |
| Court | Federal district court abbreviation | Docket |
| Date | Filing date | Docket |

Freshness and gaps for every skeleton column: not connected, sample rows only.

No other litigation data exists in Ezana. Related data on other pages that a future version could link to: patent records (Patent Activity), insider filings (Insider Trading) and company research by ticker.

## 5. Data we do not have

Do not design around these:

- Any live case, docket entry, filing or court document.
- Claimed damages, settlement amounts or judgment values (often absent even in the public record).
- Case outcomes, rulings, appeal status or a case timeline.
- State court cases, arbitration, or cases outside the United States.
- Party-to-ticker matching: no matching exists; a future version would need "Name match" versus "Verified" labels.
- Lawyer, judge or law-firm rankings.
- Estimated financial impact on a company, risk scores or a litigation exposure index.
- Price reaction after a filing.
- Full complaint text or summaries.
- Alerts or follows for a company's new cases.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 6. Must keep working

- The route, its search title and description, and Regulatory Winds lit in the green band; public access with no sign-in.
- The sample gate: only master admin and demo accounts see sample rows, labelled "Sample content" in the identity row and on every section; nothing done to them is saved; a failed check means ordinary viewer.
- The empty state for everyone else, "This dataset's source is not connected yet.", with one text action back to the datasets overview. Known change: ordinary visitors should also get the EzanaQL row and a one-line note of what the dataset will show.
- The EzanaQL row to the Regulatory Winds hub, Share, the source line ending "Nothing here is investment advice.", the shared footer, and the "Not connected" hub tag until real rows exist.
- Case captions are public record but the people named in them are often private individuals: in any design, lead with the company and the case type, not the individual plaintiff.

## 7. Problems with the current page

Design problems:

- The whole page is one bare table: no ranked hero, filters, freshness line, summary figures or detail panel.
- Ordinary visitors get one sentence and a link; nothing says what the dataset will hold or where it will come from.
- The 1400px canvas with its own inset instead of the x=32 to x=1408 lines; the source line is set at the micro size and is easy to miss.
- The sample type list mixes a case category (class action) with an event (settlement), which a real filter would need to separate.

Bugs:

- The EzanaQL row is hidden from ordinary visitors although the hub is public.
- A failed sample check shows an admin the empty state with no hint why.

## 8. Design rules the mock must follow

From the dataset master prompt and the Branding and UI Guide; the most often broken first.

1. Flat cards: no fill, border, shadow or radius; hairlines divide, never enclose. Only overlays have a surface.
2. Content from x=32 to x=1408 at 1440px. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
3. Tabs, toggles, filters and time selectors text only, selected in emerald text. No outlined or pill buttons: one solid emerald primary per group, the rest plain text. Borderless search.
4. Nothing below 11px. Bootstrap Icons only, no emoji or logos, skeletons not spinners.
5. No em dashes, sentence case, describe never advise, no "real-time", no vendor or database names.
6. Family look: the 64px Ezana bar and the full-bleed green category band (Regulatory Winds lit) as they are, a ticker in the band once records flow, the shared grey footer. Light mode as rendered, tokens that exist in both themes.
7. Compact identity row (11px mono eyebrow, 22px name, freshness line, "Sample content" label, at most one primary action), then the slim EzanaQL row to the Regulatory Winds hub with Share.
8. Mono for every figure, ticker, date, header and axis label; Plus Jakarta Sans for names and prose.
9. Ruled tables: no header fill, 11px caps mono headers, 1px hairlines, rows 42 to 48px, numbers right, sort by header click, quiet pagination.
10. Detail in a 480px side panel with its own URL parameter. Selected rows in emerald text or a cleared faint wash, no edge bar.
11. Signed changes, N/A for missing, colour never alone. Every card gets a skeleton, a one-line empty state and an inline error with Retry; draw the "source not connected" state as its own frame.
12. A source line in public terms ending "Nothing here is investment advice."

Colours, light (dark): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at 8 percent.

Page note: never imply guilt or a likely outcome. Use neutral status words (Filed, Pending, Dismissed, Settled) and "Name match" versus "Verified" for the ticker link.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Federal cases only to start? Default: yes, federal district courts, labelled as such.
2. Show cases with no matched ticker? Default: yes, with Ticker N/A, filterable to "Listed companies only".
3. What leads the page? Default: a ranked list of companies by new cases in the last 90 days, beside a bar chart of new filings by case type per month.
4. Case detail in a side panel? Default: yes, with ?case= in the URL, showing parties, court, type, filing date, docket link and the match label.
5. Show settlement amounts? Default: only when the docket states one, otherwise N/A.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Lawsuits and legal proceedings. Route: /datasets/lawsuits. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a company legal-exposure view (open cases by type for one ticker), new filings by case type over time, a case side panel with docket entries and a link to the public docket, "Name match" versus "Verified" ticker labels, a follow-this-company alert shown as future work, and links to Patent Activity for patent cases. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
