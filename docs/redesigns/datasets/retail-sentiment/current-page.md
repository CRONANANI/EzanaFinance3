# Ezana Retail sentiment page: how it works today

Page: Retail sentiment. Route: /datasets/retail-sentiment. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit 9191552 (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page is meant to show which tickers retail investors are discussing most on public forums and social platforms, how fast mentions are growing, and the tone of the discussion. It is one of The Hive datasets and was just created.

- Who will use it: retail investors, student analysts and journalists tracking crowd attention around a stock. Nothing is gated.
- How they get there: The Hive menu in the green band, The Hive hub, the datasets overview, search and shared links.
- What they will do next: follow a ticker to company research, compare with what Ezana members are watching, or go to the hub to query with EzanaQL.
- Data connected today: no, source not connected. The page reads nothing, and Ezana stores no outside social or forum data. The only forum-related tables in the database are for posting Ezana's own articles out to forums (a list of forums with a tone note and a log of posts); they hold no sentiment or mention data.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 2. What is on the page today

The page is new: one shared template filled with this dataset's settings, with no logic of its own. What a visitor sees depends on who they are.

Admin and demo accounts, desktop, top to bottom (shared dataset canvas, about 1400px centred with a 32px gutter):

| Section | What it shows and does |
| --- | --- |
| Green band | Shared chrome with The Hive lit. No ticker. |
| Identity row | Eyebrow "DATASETS · THE HIVE", name "Retail sentiment", and on the right a grey "Sample content" label with an eye icon (hover: shown to admin and demo accounts only). No freshness line, no action. |
| EzanaQL row | "Query this data with EzanaQL on the The Hive hub" with Share. |
| One table | Title "Most discussed tickers" with "Sample content" on the right. Columns Ticker, Mentions, Bullish share, Mentions vs last week and Date. Four invented rows. No sorting, filters, search, paging, row click or detail panel. Missing values print N/A. |
| Source line | "Planned sources: public investor discussion forums and social posts, aggregated." plus a sample-content note and "Nothing here is investment advice." |

Everyone else, signed in or out: the identity row without the label, then a plug icon, "This dataset's source is not connected yet." and a text link "Back to datasets". No EzanaQL row, no description, nothing else.

States: the shared route skeleton, then a small skeleton (title bar and eight-row table) while the server says whether the viewer may see sample content. If that check fails the viewer gets the empty state. There is no data request, so no error state. Tablet and phone: the identity row wraps and the table scrolls sideways inside its section. On the The Hive hub and menu the dataset carries a "Not connected" tag and its planned source.

## 3. What the user can do

- Ordinary visitors: read that the source is not connected; go back to the datasets overview.
- Admin and demo accounts: read the sample table; use Share; follow the EzanaQL row to the hub.
- Everyone: use the green band menus to reach other datasets.
- Not possible today: sort, filter, search, open a record, export, follow, set an alert, see when data was last updated, or be told when the source connects.

## 4. Data we have

Live data: none. Nothing on this page is a real record today. The only thing rendered is the layout skeleton below, filled with invented rows for admin and demo accounts. These columns are the layout skeleton, not fields we hold:

| Column (skeleton) | What it would mean | Planned public source |
| --- | --- | --- |
| Ticker | Ticker being discussed | Public forum mentions, aggregated by a third-party counter |
| Mentions | Mentions in the latest day or period | Same |
| Bullish share | Share of mentions reading positive | Would need a sentiment reading |
| Mentions vs last week | Percent change in mentions | Calculated |
| Date | Date of the reading | Same |

Freshness and gaps for every skeleton column: not connected, sample rows only.

No retail sentiment data exists in Ezana. The forum-posting configuration (forum names, on or off, tone note) and its post log describe Ezana's own outbound posts, not investor sentiment, and must not be used as a source.

## 5. Data we do not have

Do not design around these:

- Any live mention count or sentiment reading.
- Individual posts, usernames, quotes or links to specific posts: show aggregates only.
- A trustworthy bullish or bearish split: the planned counter may supply mentions and rank only; tone would need its own method.
- Per-platform breakdown, unless the source provides it.
- Intraday or hourly mention series.
- Bot or spam filtering scores, or a measure of coordinated activity.
- Price reaction, short interest or options activity tied to mention spikes (other datasets, not joined).
- Long history: a new source starts with no back data.
- Alerts or follows.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 6. Must keep working

- The route, its search title and description, and The Hive lit in the green band; public access with no sign-in.
- The sample gate: only master admin and demo accounts see sample rows, labelled "Sample content" in the identity row and on every section; nothing done to them is saved; a failed check means ordinary viewer.
- The empty state for everyone else, "This dataset's source is not connected yet.", with one text action back to the datasets overview. Known change: ordinary visitors should also get the EzanaQL row and a one-line note of what the dataset will show.
- The EzanaQL row to the The Hive hub, Share, the source line ending "Nothing here is investment advice.", the shared footer, and the "Not connected" hub tag until real rows exist.
- Ezana's outbound article-posting setup is unrelated and must stay untouched.
- Aggregates only; no individual posts or authors.

## 7. Problems with the current page

Design problems:

- The whole page is one bare table: no ranked hero, filters, freshness line, summary figures or detail panel.
- Ordinary visitors get one sentence and a link; nothing says what the dataset will hold or where it will come from.
- The 1400px canvas with its own inset instead of the x=32 to x=1408 lines; the source line is set at the micro size and is easy to miss.
- "Bullish share" is drawn as if the planned source supplies tone; it may not, so the design must survive without it.

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
6. Family look: the 64px Ezana bar and the full-bleed green category band (The Hive lit) as they are, a ticker in the band once records flow, the shared grey footer. Light mode as rendered, tokens that exist in both themes.
7. Compact identity row (11px mono eyebrow, 22px name, freshness line, "Sample content" label, at most one primary action), then the slim EzanaQL row to the The Hive hub with Share.
8. Mono for every figure, ticker, date, header and axis label; Plus Jakarta Sans for names and prose.
9. Ruled tables: no header fill, 11px caps mono headers, 1px hairlines, rows 42 to 48px, numbers right, sort by header click, quiet pagination.
10. Detail in a 480px side panel with its own URL parameter. Selected rows in emerald text or a cleared faint wash, no edge bar.
11. Signed changes, N/A for missing, colour never alone. Every card gets a skeleton, a one-line empty state and an inline error with Retry; draw the "source not connected" state as its own frame.
12. A source line in public terms ending "Nothing here is investment advice."

Colours, light (dark): ground #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative #dc2626 (#ef4444); warning #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline primary text at 8 percent.

Page note: mentions are attention, not opinion. If tone is shown, label it with its method and always pair the colour with the word. Never call a spike a signal to act.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Show a bullish share before a sentiment method is chosen? Default: no; show mentions, rank and change only, with tone drawn as future work.
2. Which period leads? Default: last 24 hours, with 7D and 30D as text toggles.
3. What leads the page? Default: a ranked list of most-mentioned tickers with rank change, beside a list of fastest-rising mentions.
4. Ticker detail in a side panel? Default: yes, with ?ticker= in the URL, showing mention history and rank history.
5. Compare with Ezana community activity? Default: yes, as a future feature linking to Platform community signals.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Retail sentiment. Route: /datasets/retail-sentiment. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a most-mentioned ranking with rank change, a fastest-rising list, a mention-spike marker against each ticker's own average, a ticker side panel with mention and rank history, a public crowd versus Ezana community comparison marked as future work, and a tone reading drawn as future work until a method exists. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
