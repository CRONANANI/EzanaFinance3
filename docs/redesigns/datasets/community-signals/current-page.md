# Ezana Platform community signals page: how it works today

Page: Platform community signals. Route: /datasets/community-signals. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit 9191552 (main). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

The page is meant to show, in aggregate and anonymously, what Ezana members are watching and discussing: which tickers are being added to watchlists and talked about most, and how that is changing. It is one of The Hive datasets and the only first-party one. It was just created.

- Who will use it: retail investors and student analysts curious what the Ezana community is paying attention to. Nothing is gated.
- How they get there: The Hive menu in the green band, The Hive hub, the datasets overview, search and shared links.
- What they will do next: follow a ticker to company research, read the discussion in Community, or go to the hub to query with EzanaQL.
- Data connected today: no, source not connected. The page reads nothing. Ezana does hold the underlying first-party activity (members' watchlists and community posts), but no aggregate feed for this page exists, and personal data must never appear here.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 2. What is on the page today

The page is new: one shared template filled with this dataset's settings, with no logic of its own. What a visitor sees depends on who they are.

Admin and demo accounts, desktop, top to bottom (shared dataset canvas, about 1400px centred with a 32px gutter):

| Section | What it shows and does |
| --- | --- |
| Green band | Shared chrome with The Hive lit. No ticker. |
| Identity row | Eyebrow "DATASETS · THE HIVE", name "Platform community signals", and on the right a grey "Sample content" label with an eye icon (hover: shown to admin and demo accounts only). No freshness line, no action. |
| EzanaQL row | "Query this data with EzanaQL on the The Hive hub" with Share. |
| One table | Title "Most added to watchlists this week" with "Sample content" on the right. Columns Ticker, Company, Watchlist adds, Posts and Change vs last week. Five invented rows. No sorting, filters, search, paging, row click or detail panel. Missing values print N/A. |
| Source line | "Planned source: aggregate, anonymous activity on Ezana (watchlist adds and posts)." plus a sample-content note and "Nothing here is investment advice." |

Everyone else, signed in or out: the identity row without the label, then a plug icon, "This dataset's source is not connected yet." and a text link "Back to datasets". No EzanaQL row, no description, nothing else.

States: the shared route skeleton, then a small skeleton (title bar and eight-row table) while the server says whether the viewer may see sample content. If that check fails the viewer gets the empty state. There is no data request, so no error state. Tablet and phone: the identity row wraps and the table scrolls sideways inside its section. On the The Hive hub and menu the dataset carries a "Not connected" tag and its planned source.

## 3. What the user can do

- Ordinary visitors: read that the source is not connected; go back to the datasets overview.
- Admin and demo accounts: read the sample table; use Share; follow the EzanaQL row to the hub.
- Everyone: use the green band menus to reach other datasets.
- Not possible today: sort, filter, search, open a record, export, follow, set an alert, see when data was last updated, or be told when the source connects.

## 4. Data we have

Live data: none. Nothing on this page is a real record today. The only thing rendered is the layout skeleton below, filled with invented rows for admin and demo accounts. These columns are the layout skeleton, not fields we hold:

| Column (skeleton) | What it would mean | Planned source |
| --- | --- | --- |
| Ticker | The ticker being watched | Ezana activity, aggregated |
| Company | Company name | Ezana company records |
| Watchlist adds | Times the ticker was added to any watchlist this week | Aggregate count |
| Posts | Community posts mentioning the ticker this week | Aggregate count |
| Change vs last week | Percent change in adds against the prior week | Calculated |

Freshness and gaps for every skeleton column: not connected, sample rows only.

First-party activity that exists and could become an aggregate source (counts only, never who):

| Field | What it means | Freshness | Limits |
| --- | --- | --- | --- |
| Watchlist entries | Each entry records a ticker, its asset type (stock, crypto, commodity or politician), name, sector and the date added | As members act | Private to each member today; only anonymous counts with a minimum threshold could ever be shown |
| Community posts | Public posts with an optional mentioned ticker, likes, comments, reposts and, for partners, a post format (analyst take, trade idea, market brief) | As members post | Ticker tagging is optional; volume may be small |
| Community pulse snapshots | Periodic figures: net sentiment, posts in the last hour, active investors, discussions started, the hottest ticker and its mentions, a sector breakdown | Computed on request in Community | Shown to signed-in members only today; sentiment is a simple keyword reading |
| Conviction reading | Per ticker, the share of last-day posts reading bullish or bearish by keywords | Last 24 hours | Keyword based; signed-in only today |

## 5. Data we do not have

Do not design around these:

- Any live aggregate on this page today.
- Anything that identifies a member: usernames, avatars, profiles, individual watchlists, individual posts quoted on this page, follower counts. This page must stay anonymous.
- Positions, holdings, trade sizes or portfolio weights of members.
- Counts for tickers with very few members (a minimum threshold will hide them).
- A model-based sentiment score: the existing reading is keyword based.
- Comparison with the wider public or social platforms (that is the Retail Sentiment dataset).
- Historical series longer than the activity itself; Ezana's community is young.
- Price or return outcomes of community favourites, leaderboards of who called it.
- Alerts or follows.
- Sample data rule: wireframe figures are sample content with invented names. Live, only admin and demo accounts see sample data, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 6. Must keep working

- The route, its search title and description, and The Hive lit in the green band; public access with no sign-in.
- The sample gate: only master admin and demo accounts see sample rows, labelled "Sample content" in the identity row and on every section; nothing done to them is saved; a failed check means ordinary viewer.
- The empty state for everyone else, "This dataset's source is not connected yet.", with one text action back to the datasets overview. Known change: ordinary visitors should also get the EzanaQL row and a one-line note of what the dataset will show.
- The EzanaQL row to the The Hive hub, Share, the source line ending "Nothing here is investment advice.", the shared footer, and the "Not connected" hub tag until real rows exist.
- Privacy: aggregate counts only, a minimum threshold before a ticker is listed, no member names or links to profiles.
- The Community page's own pulse and conviction views, which read the same posts, must keep working.

## 7. Problems with the current page

Design problems:

- The whole page is one bare table: no ranked hero, filters, freshness line, summary figures or detail panel.
- Ordinary visitors get one sentence and a link; nothing says what the dataset will hold or where it will come from.
- The 1400px canvas with its own inset instead of the x=32 to x=1408 lines; the source line is set at the micro size and is easy to miss.
- Watchlists can hold politicians as well as tickers; a real design must decide whether politician watching counts here.

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

Page note: anonymous aggregates only. Every count carries the period it covers. Bullish and bearish shares, if shown, are labelled "Keyword reading" and always carry the word, not only colour.

## 9. Open questions for me

Each question carries the default that will be used unless you say otherwise.

1. Minimum threshold before a ticker is listed? Default: at least 10 distinct members in the period.
2. Count politicians added to watchlists? Default: no, tickers only on this page.
3. What leads the page? Default: a ranked list of most added tickers this week with a weekly bar for each, beside a sector breakdown of adds.
4. Show the keyword sentiment reading? Default: yes, as a 100 percent split bar per ticker, labelled "Keyword reading".
5. Ticker detail in a side panel? Default: yes, with ?ticker= in the URL, showing weekly adds and posts and a link to the ticker's community discussion.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Platform community signals. Route: /datasets/community-signals. Version: retail, public dataset page. Data connected today: no, source not connected. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a most-added ranking with week-over-week change, a rising-fastest list, a sector breakdown of community attention, a ticker side panel linking to the community discussion and company research, a comparison against Retail Sentiment marked as future work, and a clear privacy note that all figures are anonymous aggregates above a threshold. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states, and the source-not-connected state. Finish with the written outputs listed in section 10 of the master prompt.
