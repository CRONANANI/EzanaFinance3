# Ezana Government agency rulings and decisions page: how it works today

Page: Government agency rulings and decisions. Route: /datasets/agency-rulings. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit 9191552 (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page is meant to track major federal agency decisions: drug and device approvals and denials, environmental and other final rules, proposed rules and notices, and which listed companies they name. It is one of the four Regulatory Winds datasets and was just created.

- Who will use it: retail investors, student analysts and journalists watching regulatory catalysts for a company or a sector. Nothing is gated.
- How they get there: the Regulatory Winds menu in the green band, the Regulatory Winds hub, the datasets overview, search and shared links.
- What they will do next: open a decision, follow the ticker to company research, or go to the hub to query with EzanaQL.
- Data connected today: no, source not connected. The page reads nothing. Separately, Ezana already collects one narrow slice of the federal daily register (rules and notices from the export-control bureau) for its research assistant; that data is not public on any page and is not connected here.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 2. What is on the page today

The page is new: one shared template filled with this dataset's settings, with no logic of its own. What a visitor sees depends on who they are.

Admin and demo accounts, desktop, top to bottom (shared dataset canvas, about 1400px centred with a 32px gutter):

| Section      | What it shows and does                                                                                                                                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Green band   | Shared chrome with Regulatory Winds lit. No ticker.                                                                                                                                                                                     |
| Identity row | Eyebrow "DATASETS · REGULATORY WINDS", name "Government agency rulings and decisions", and on the right a grey "Sample content" label with an eye icon (hover: shown to admin and demo accounts only). No freshness line, no action.    |
| EzanaQL row  | "Query this data with EzanaQL on the Regulatory Winds hub" with Share.                                                                                                                                                                  |
| One table    | Title "Latest rulings and decisions" with "Sample content" on the right. Columns Decision, Agency, Ticker, Type and Date. Four invented rows. No sorting, filters, search, paging, row click or detail panel. Missing values print N/A. |
| Source line  | "Planned source: the federal daily register of agency rules and notices." plus a sample-content note and "Nothing here is investment advice."                                                                                           |

Everyone else, signed in or out: the identity row without the label, then a plug icon, "This dataset's source is not connected yet." and a text link "Back to datasets". No EzanaQL row, no description, nothing else.

States: the shared route skeleton, then a small skeleton (title bar and eight-row table) while the server says whether the viewer may see sample content. If that check fails the viewer gets the empty state. There is no data request, so no error state. Tablet and phone: the identity row wraps and the table scrolls sideways inside its section. On the Regulatory Winds hub and menu the dataset carries a "Not connected" tag and its planned source.

## 3. What the user can do

- Ordinary visitors: read that the source is not connected; go back to the datasets overview.
- Admin and demo accounts: read the sample table; use Share; follow the EzanaQL row to the hub.
- Everyone: use the green band menus to reach other datasets.
- Not possible today: sort, filter, search, open a record, export, follow, set an alert, see when data was last updated, or be told when the source connects.

## 4. Data we have

Live data: none. Nothing on this page is a real record today. The only thing rendered is the layout skeleton below, filled with invented rows for admin and demo accounts. These columns are the layout skeleton, not fields we hold:

| Column (skeleton) | What it would mean                                     | Planned public source                            |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Decision          | Short description of the ruling or decision            | Federal daily register; agency approval releases |
| Agency            | Agency that issued it                                  | Same                                             |
| Ticker            | Listed company the decision names, N/A for broad rules | Ezana matching                                   |
| Type              | Approval, denial, final rule, proposed rule, notice    | Same                                             |
| Date              | Publication or decision date                           | Same                                             |

Freshness and gaps for every skeleton column: not connected, sample rows only.

Data that exists in Ezana but is not connected (one agency only): export-control rule documents with document number, title, abstract, document type, publication date, effective date, topics and a link to the official page. They are collected daily and read only by the research assistant.

## 5. Data we do not have

Do not design around these:

- Any live ruling, approval, denial or rule on this page.
- Drug approval calendars or scheduled decision dates (planned approvals are not in the planned source).
- Comment counts, comment deadlines or docket participation (would need a second public source).
- Company matching for broad rules: most rules name no company.
- Economic impact estimates, sector impact scores or a "winners and losers" view.
- Court challenges to rules or rule reversals.
- State or foreign agency decisions.
- Price reaction after a decision.
- Full rule text or plain-language summaries.
- Alerts or follows.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 6. Must keep working

- The route, its search title and description, and Regulatory Winds lit in the green band; public access with no sign-in.
- The sample gate: only master admin and demo accounts see sample rows, labelled "Sample content" in the identity row and on every section; nothing done to them is saved; a failed check means ordinary viewer.
- The empty state for everyone else, "This dataset's source is not connected yet.", with one text action back to the datasets overview. Known change: ordinary visitors should also get the EzanaQL row and a one-line note of what the dataset will show.
- The EzanaQL row to the Regulatory Winds hub, Share, the source line ending "Nothing here is investment advice.", the shared footer, and the "Not connected" hub tag until real rows exist.
- Export-control rules collected for the research assistant must keep feeding it if this page is ever wired to the same source.

## 7. Problems with the current page

Design problems:

- The whole page is one bare table: no ranked hero, filters, freshness line, summary figures or detail panel.
- Ordinary visitors get one sentence and a link; nothing says what the dataset will hold or where it will come from.
- The 1400px canvas with its own inset instead of the x=32 to x=1408 lines; the source line is set at the micro size and is easy to miss.
- Approvals for one company and economy-wide rules share one table; the design needs a way to tell company-specific decisions from broad rules.

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

Page note: describe a decision, never call it positive or negative for a company. Distinguish proposed from final rules in words. Effective dates in the future are marked "Takes effect" with the date.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Which agencies first? Default: the drug regulator, the environmental regulator, the competition regulator and the commerce export-control bureau, each a text filter.
2. Include broad rules with no company? Default: yes, Ticker N/A, with a "Names a listed company" filter.
3. What leads the page? Default: a timeline of upcoming effective dates for final rules beside a ranked list of agencies by documents this month.
4. Decision detail in a side panel? Default: yes, with ?doc= in the URL, showing agency, type, dates, topics, abstract and the official link.
5. Wire the existing export-control documents first as a partial source? Default: no; keep them for the research assistant until a broader source is connected.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Government agency rulings and decisions. Route: /datasets/agency-rulings. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example an effective-date calendar for final rules, a proposed-to-final rule tracker, a company catalyst view of approvals and denials for one ticker, topic and agency filters, a decision side panel with abstract and official link, a follow-this-agency alert shown as future work, and CSV export with a citation line. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
