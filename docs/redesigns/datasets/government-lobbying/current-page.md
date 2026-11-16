# Ezana Lobbying Activity page: how it works today

Page: Lobbying activity. Route: /datasets/government/lobbying. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main). The page was not run while writing this; screenshots are supplied separately.

## 1. Summary

Who pays to influence Washington, on which issues, through which firms, and how that reaches listed companies and members of Congress: ten cards under one sticky filter bar. One of the four reference pages of the dataset family.

- Who uses it: retail investors, student analysts and journalists, many signed out.
- How they get there: the Capitol Watch menu, the Capitol Watch hub, search engines, shared links.
- What they do next: open a client or firm, open a listed company, read a single filing, export filings, or query on the Capitol Watch hub with EzanaQL.
- Live data connected today: yes, live (Senate lobbying disclosures copied on a schedule; coverage per quarter is tracked and shown).
- Sample data rule: wireframe figures are sample content with invented names. On the live page only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, "This dataset's source is not connected yet." This page has no sample data today.

## 2. What is on the page today

Desktop, top to bottom. The app draws the navigation bar, the green category band (Capitol Watch active) and a ticker of the 24 latest filings (client, amount, first issue in caps). A ticker click opens that filing.

**Header.** Kicker "Datasets · Lobbying activity", title "Lobbying activity", a lead sentence, and on the right "Filings as of (date)" in mono. Then the EzanaQL row (link to the Capitol Watch hub, "on the Capitol Watch hub", Share).

### Sticky filter bar (two rows, full width)

| Control | What it does |
| --- | --- |
| Period | Segmented: two prior fiscal years, YTD, Quarter, 90 days (default last full year). Quarter reveals a quarter select from 2024 Q1. |
| Government entity | Segmented: All, Congress, Agencies, White House. |
| Min | Slider over stops $0 to $10M, commits after a short pause. |
| Public companies only | A switch chip. |
| Search clients or firms | Borderless search, commits on pause or Enter. |
| Reset | Text link, disabled with no filters. |
| Issue chips (second row) | "All", the top 12 issues, "All (n) issues" opening a searchable modal list. Hovering an issue prefetches. |

Each card refetches only when a filter it uses changes, dimming its last answer meanwhile; lower cards load near the viewport.

### Cards, in order

| Card | What it shows | Controls |
| --- | --- | --- |
| 1 Influence pulse (full width) | Five tiles: Disclosed spend, Filings, Distinct clients, Distinct firms, Revolving-door lobbyists, each with a YoY pill. | YoY shows a middle dot until both periods are 95 percent loaded, with a footer note. |
| 2 Spend leaderboard (7 of 12) | Top 15: rank, name, ticker tag (solid check verified, dashed badge name match), bar, spend, share. Footer with the period total. | Rank by Clients or Firms. A row opens the client or firm drawer. |
| 3 Share of filings by issue (5 of 12) | Each issue's share of filings, with a note that the source gives no dollars per issue and shares total more than 100 percent. | A row sets or clears the issue filter. |
| 4 Pressure map (full width) | Heatmap of the top 12 issues by the top 10 government bodies contacted; each cell is a filing count, legend Fewer to More filings. Hover shows the top three clients. | Row labels set the issue filter. |
| 5 Quarterly rhythm (half) | Bars of spend per quarter and a line of filing counts from 2024 Q1 to the end of this year. Unended quarters are dashed ghosts labelled "Not yet filed"; a quarter still inside its filing window is faded with the percent received. | None. |
| 6 Former officials now lobbying (half) | Share of filings naming a lobbyist with a prior covered government position, distinct lobbyists, firms ranked by them. Footer: a named position is a disclosure requirement, not a finding. | A firm row expands to show the covered positions as filed. |
| 7 Public company lens (full width) | Tiles for listed companies that lobbied: ticker, name, mapping badge, spend, filings, top issue, six-month sparkline, price and day change (quotes delayed). | A tile opens the company modal. |
| 8 Lobbying vs contracts (half) | Log-log scatter of lobbying spend against federal contract awards per listed company; name-matched companies are hollow dots. A list "Awards per lobbying dollar". Page filters do not apply. | Window 1y or 2y. |
| 9 Money to members (half) | Contributions reported by lobbyists and registrants: total, reports, type counts. Names as filed, never linked. | Type chips (multi-select); tabs Top honorees, Top committees, Largest items. |
| 10 Disclosures (full width) | Posted, Client, Firm, Amount (or "Registration"), Issues (three chips and a count), Lobbyists, View. | Modes Public companies, Largest, Most recent. Export CSV (signed in; signed out it is disabled with "Sign in to export CSV"). Previous and next page. View opens the filing. |

Every card shares one frame: title, a subtitle naming the active filters (or "All filings"), a skeleton, an error line with Retry, an empty sentence naming the narrowest filter with a "Reset filters" chip, and a partial chip ("(quarter) is still being filed, (n)% received").

Signed out, a tinted band follows: "Free account", "Follow the money behind the markets", "Create a free account to export disclosures to CSV.", Sign up free and an outlined Log in.

Footer lines: the source, "Amounts are as reported by filers. For educational purposes only. Not financial advice.", and a coverage line in the form "Coverage: (year) complete · (year) Q1 (n)% ... · last sync (date)".

### Overlays

- **Filing modal** (?filing= in the URL): period, client, "via (firm)", Amount, Date filed, Filing type, lobbyists with covered positions, entities contacted, issues, up to three activity descriptions, a link to the original filing. Missing parts read "Not specified." Error with Retry.
- **Client or firm drawer** (from the leaderboard; not in the URL): kind label, disclosed spend and filings in this view, spend by quarter since 2024, issues cited, firms hired or clients, largest filings (each opens the filing).
- **Company modal** (from the lens; ?company= in the URL): ticker with mapping badge, name, price and day change, share price since 2024 with quarterly lobbying spend bars, then the same body as the drawer. "No price history is available for (ticker)." when missing.

Route loading shows title, pill and table skeletons.

### Tablet and phone

Under 1200px pulse tiles go three across and lens tiles two. Under 1100px paired cards stack. Under 640px issue chips scroll and a "Filters" chip with the active count opens a bottom sheet (44px targets, Reset, "Show (n) filings"); gutter 16px.

## 3. What the user can do

- Set period (fiscal year, YTD, a chosen quarter, 90 days), government entity group, minimum amount, public companies only, client or firm search; reset all
- Pick an issue (chip, all-issues modal, issue card row, pressure map row); clear it
- Rank the leaderboard by clients or firms; open a client or firm drawer
- Expand a firm to read former officials' positions
- Open a listed company with price and lobbying spend
- Switch the scatter window; switch contribution tabs and types
- Switch disclosure modes, page through filings, open a filing, export CSV (signed in)
- Open a filing from the ticker; open the original filing at the source
- Sign up or log in from the band (return link keeps filters); Share; EzanaQL on the hub

## 4. Data we have

| Field | Meaning | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Filing: client, firm, amount, type, posted date, period | One quarterly report or registration | Senate lobbying disclosures | Scheduled copy; coverage per quarter shown | Registrations have no amount; late filings keep arriving |
| Issues on a filing, activity text | Issue codes and descriptions | Senate lobbying disclosures | Same | No dollars per issue |
| Government entities contacted | Bodies named on a filing | Senate lobbying disclosures | Same | Sometimes not specified |
| Lobbyists and covered positions | Named lobbyists and prior roles as filed | Senate lobbying disclosures | Same | Free text, typos |
| Pulse totals, YoY, leaderboard, issue shares, pressure cells, quarterly series | Aggregates of the filings | Ezana aggregates | Cached | YoY gated on coverage; counts only for issues and bodies; nothing before 2024 |
| Ticker mapping | Client to listed ticker | Ezana matching | Periodic | Verified or name match; most clients unmapped |
| Price, day change, six-month and since-2024 candles | Market context | Market data | Delayed | No price history for some tickers |
| Contract awards per ticker | For the scatter | Federal award records | Daily | Listed companies with both only |
| Contributions (honoree, payee, committee, type, amount, date) | Lobbyist and registrant contributions | Semiannual contribution reports | Twice a year | Names as filed, cannot be joined to members |
| Coverage | Percent of filings received per quarter, last sync | Ingest status | Per load | None |

## 5. Data we do not have

Do not design around these. Wireframe figures are sample content; only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

- Dollars per issue or per government body; any spend split of one filing.
- Links from a contribution to a member record; voting records; outcomes, bills, meetings or contact logs.
- State-level or foreign-agent lobbying; anything before 2024; real-time filings.
- Influence scores, "return on lobbying" judgements, or verdicts about former officials.
- Ticker mapping for most private clients; company logos.

## 6. Must keep working

- URL state: period, issue, entity, min, public and search are in the URL (defaults omitted) and update in place; ?filing= and ?company= push one history entry so Back closes them. Server-rendered first paint for the requested filters.
- The filter bar drives each card only through the filters that card uses, and the per-card subtitle states them.
- Honest coverage: partial-quarter chips, dashed "Not yet filed" quarters, YoY gated on coverage, the coverage footer line.
- Mapping honesty: verified versus name match badges everywhere a ticker appears.
- Former officials shown as filed with the disclaimer; contribution names as filed and never linked.
- Ticker items opening filings; the link to the original filing; CSV export when signed in; sign-up with a return link when signed out.
- Phone filter sheet with 44px targets; keyboard radio groups; the screen reader table behind the heatmap.
- Each card loads and fails alone, with Retry. EzanaQL row, Share, source and "not financial advice" lines.

## 7. Problems with the current page

Design problems:

- A title, kicker and lead sentence instead of a compact identity row.
- Segmented controls and issue chips drawn as bordered or filled pills; a switch chip; outlined ghost buttons; a tinted sign-up band with an outlined Log in.
- KPI tiles and lens tiles on grey fills; boxed cards in places; labels below 11px.
- Ten cards in one long column with no sense of priority; the pulse repeats what the leaderboard total says.
- The scatter ignores page filters among cards that obey them; the filter bar breaks out of the content lines.

Bugs and gaps:

- The client or firm drawer has no URL, so it cannot be shared and Back does not close it.
- Placeholders end in an ellipsis character ("Search clients or firms…", "Exporting…").
- Signed-out Log in goes to a chooser page that drops the return link, so the visitor loses their filters.

## 8. Design rules the mock must follow

1. Draw the frame as it is: 64px navigation bar, full-bleed emerald green category band (about 48px, white labels) with the filing ticker inside it, the shared light grey footer.
2. Light mode as rendered: ground #ffffff, primary text #0f172a, muted grey #64748b, faint grey #94a3b8; tokens that exist in both themes.
3. Compact identity row on the left line: 11px mono caps eyebrow "DATASETS · CAPITOL WATCH" (tracking 0.08em), name at 22px weight 700, "Filings through (date)" in mono and at most one primary action at the right. Then the EzanaQL row. No lead sentence.
4. Content from x=32 to x=1408 on a 1440px artboard; the sticky filter bar sits on the same lines.
5. Flat cards and tiles: no fill, border, shadow or radius; hairlines (primary text at about 8 percent). 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules.
6. Period, entity, mode and tab selectors and issue chips are text only; selected emerald text #047857, the rest grey; periods in 12px mono caps.
7. No outlined buttons: one solid emerald #059669 primary per group, others plain text. Borderless search with bi-search.
8. Mono for every figure, ticker, date, rank, eyebrow, header and axis label. 11px minimum.
9. Ruled tables: no header fill, 11px caps mono headers, 1px row rules, 42 to 48px rows, numbers right, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
10. Entity detail as a right side panel (480px) or drawer (up to 720px) with its own URL parameter; Back closes it.
11. Heatmap on a five-step emerald ramp; partial quarters lighter, future quarters dashed "Not yet filed"; negative #dc2626, warning #d97706, extra series info blue, cyan #06b6d4, purple #a78bfa.
12. Bootstrap Icons only, no logos or emoji; skeletons, never spinners; selected rows emerald text or a cleared faint wash.
13. Sentence case, no em dashes, never advice, no "real-time", no vendor names, signed changes, N/A for missing.

## 9. Open questions for me

1. Keep all ten cards? Default: yes, regrouped by priority; none removed.
2. Should the drawer get a URL? Default: yes, ?client= or ?firm=.
3. Should the scatter obey page filters? Default: no (data does not allow it), but label it clearly as unfiltered.
4. Keep the signed-out band? Default: yes, as one flat line with one primary button.
5. Default period? Default: last full year, as today.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Lobbying activity. Route: /datasets/government/lobbying. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example following a client, firm or issue for new filings, quarter over same quarter last year with partial quarters marked, a client's lobbying beside its federal contracts, rank changes since the last quarter, and a citation line with the source and retrieval date on export. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
