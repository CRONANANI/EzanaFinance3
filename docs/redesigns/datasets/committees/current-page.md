# Ezana Committee assignments page: how it works today

Page: Committee assignments. Route: /datasets/committees. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this.

## 1. Summary

The page shows who sits on every committee and subcommittee of Congress, who holds each gavel, which market sectors each committee oversees, and where members trade in the sectors their own committees oversee.

- Users: retail investors, student analysts and journalists, many signed out, arriving from the Capitol Watch menu, its hub, the datasets overview, search and shared links.
- Next: a member in the Politician Tracker, a committee's official site, or the Capitol Watch hub.
- Data connected today: yes, live. Rosters come from a public-domain record of Congress refreshed daily; trades from congressional disclosure filings. No sample data and no admin or demo version today.
- Sample data rule: figures in the wireframe are sample content with invented names. On the live page only admin and demo accounts ever see sample data, labelled "Sample content"; everyone else sees real data or, if a source is disconnected, "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop: the green band (Capitol Watch active), then ten cards under one sticky control bar.

- Ticker in the band: up to 20 recent overseen-sector trades ("Member (P-ST)", "BUY · TICKER", range, committee); an item opens the member panel.
- Header: eyebrow "DATASETS · COMMITTEE ASSIGNMENTS", title, a one-sentence lead, and "Rosters as of (date)" on the right. Then the EzanaQL row to the Capitol Watch hub with Share.

### Sticky control bar

| Control | What it does |
| --- | --- |
| View: Committees, Members | Written to the address; no card changes (section 7) |
| Chamber: All, House, Senate, Joint | Filters most cards |
| Party: ALL, D, R, I | Filters gavels, seat load and trades |
| Search committees or members | Up to 5 committees and 6 members, grouped; arrows, Enter, Esc. Also narrows the atlas. "No committee or member matches." |
| Sector chips: All plus each mapped sector | Filters most cards |

### Cards

| # | Card | What it shows and does |
| --- | --- | --- |
| 1 | Congress at a glance | Committees, Subcommittees, Seats, Members holding a seat, and a majority versus minority bar with counts |
| 2 | Committee atlas (wide) | Tiles grouped by chamber, sized by seats: short name, code, majority bar, "N seats · N sub", two sector chips. Eight per chamber, then "+N more". A tile opens the profile |
| 3 | Gavels (narrow) | Chairs or Ranking members toggle. Headshot, name, party, committee, code; nine rows then "All N committees". Person opens the member panel, code opens the profile |
| 4 | Committee profile | Name, code, chamber, counts, Official site link. Jurisdiction, sector chips, subcommittee chips that swap the roster, and "N trades by this committee's members in its sectors in the last 3 months" (jumps to card 7 filtered). Majority and Minority roster columns with headshot, party, leader badge, ten each |
| 5 | Oversight map | Committees left, sectors right, curved links lit on hover. A sector sets the page filter; a committee opens its profile |
| 6 | Seat load | Column chart of seats per member; top five members by seats |
| 7 | Trades in overseen sectors | Summary: trades in the 3-month window, buys versus sells bar, members who traded, unmapped tickers, and "A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing." Table: Date, Member, Side, Ticker, Amount range, Sector, Committee; 25 per page. All, Buys, Sells toggle; committee dropdown |
| 8 | Holdings matrix | Committees against seven most held tickers; a cell counts members with an inferred open position. Hover: buyers, sellers since 180 days, four names |
| 9 | Hearings | Always "Hearing schedules are not available yet." over a faint weekday grid |
| 10 | Sign-up band (signed out) | "Follow the committees that move your sectors", Create free account, Sign in (outlined) |

Below: the source line and the sector mapping note.

### Member panel

A centred dialog (bottom sheet on phones): name, initials, party, seat, chamber, seat count, "Open in Politician Tracker"; seat chips (code, name, rank, leader badge); a 24-month dot timeline of overseen-sector trades (colour by side, size by range). Escape and Back close it.

### States

- Route loading: a centred title, five pill skeletons and a table skeleton. Each card has its own skeleton.
- Card error: "This data is unavailable right now. Try again in a moment." with Retry for that card only; each card loads and fails on its own.
- Empty: "No (things) match (filters). Reset the filters to see everything." or "No (things) are on record yet. They refresh daily from the public record."
- Panel: "Could not load this member." with Retry.

### Tablet and phone

Under 1100px paired cards stack. Under 720px: chamber chips plus a Filters chip opening a bottom sheet (44px targets); one column; the map becomes two lists, the matrix a ranked list.

## 3. What the user can do

- Filter by chamber, party and sector; search; open a committee profile and swap its roster to a subcommittee
- Open the member panel from almost any name or the ticker; jump to the Politician Tracker
- Filter the trade feed by side and committee and page it; open official sites; share and deep-link; sign up or in
- Easy to miss: map sectors set the page filter. No visible effect: the view switch.

## 4. Data we have

| Field | What it means | Public source | Freshness | Gaps |
| --- | --- | --- | --- | --- |
| Committee name, code, chamber | Every House, Senate and joint committee and subcommittee | Public-domain roster of Congress (House Clerk, Senate records) | Daily | None |
| Jurisdiction, site, seats, majority, minority | Coverage and seat counts | Same | Daily | Some subcommittees lack a site |
| Chair, ranking member, rank, title | Leaders and roster order | Same | Daily | Vacancies; some ranks |
| Member name, party, state, district, chamber | Identity | Same | Daily | None |
| Headshot | Member photo | Official photos | Static | Gavels and rosters only |
| Overseen sectors | Sectors per committee | Ezana's reading of published jurisdiction | Editorial | Many committees have none |
| Overseen-sector trades | Date, member, side, ticker, range, sector, committee | Congressional periodic transaction reports | Daily; 3-month card window | Unmapped tickers only counted |
| Window summary | Buys, sells, members, unmapped | Same | Daily | None |
| Committee and ticker holders | Members holding a ticker, inferred (bought, not fully sold); buyers and sellers since 180 days | Same | Daily | Counts and names, never dollars |
| Member timeline | 24 months of overseen-sector trades | Same | Daily | Ranges only |

## 5. Data we do not have

Do not design around these; show them only as clearly marked future features.

- Hearing schedules, markups or meeting dates.
- Votes, bill referrals or bills per committee.
- Dollar values of holdings or positions; trade returns or performance.
- Committee budgets, staff, past rosters or seat history.
- Company names or prices next to tickers.
- Lobbying or campaign money per committee.
- Real-time updates (rosters are daily).
- Live sample content: wireframe figures are invented and labelled "Sample content"; only admin and demo accounts would see sample data live.

## 6. Must keep working

- Filters, search text, selected committee and open member live in the address; filter changes replace history, opening a committee or member adds an entry so Back returns. Deep links scroll to the right card.
- Links: Politician Tracker, official committee sites, the Capitol Watch hub, sign-up and sign-in returning here. Ticker items open the member panel.
- The disclosure-pattern footnote, the inferred-holdings label and the mapping note stay.
- Keyboard and screen-reader access (the map's pair table); the phone bottom sheet.
- Sample data rule (known change): only admin and demo accounts may see sample content, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 7. Problems with the current page

### Design problems

- Ten cards in a long column; the glance card spends a full row on four counts.
- Rounded panels on a fill, bordered toggle tracks with filled selection, bordered tinted chips, and outlined Previous, Next, Retry, Reset and Sign in buttons.
- An intro paragraph instead of an identity row; labels down to 9.5px.
- The member panel is a centred dialog; Hearings fills half a row with nothing.
- No ticker lookup beyond the seven-column matrix.

### Bugs and gaps

- The view switch changes the address but nothing on the page.
- With no committee chosen, the profile silently shows House Energy and Commerce.
- Headshots exist but seat load, the trade table and the panel show initials.
- Three windows (3 months, 180 days, 24 months) are easy to confuse.
- Trade side, committee and page are not in the address; the placeholder ends in an ellipsis; the route skeleton does not match the layout.

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

Page-specific: the majority and minority bar carries text counts; each trade window is named on its card ("Last 3 months", "Since 180 days", "Last 24 months").

## 9. Open questions for me

1. Keep all ten cards? Default: keep every function; fold the glance into a ruled stat strip and shrink Hearings to a one-line "Not available yet".
2. What should the view switch do? Default: make it real; Members view shows a sortable member table (name, party, state, seats, leader roles, overseen-sector trades) from section 4 data.
3. Member panel as a right side panel? Default: yes, 480px, keeping its address parameter.
4. Default committee? Default: keep House Energy and Commerce, named as the default in the profile.
5. Signed-out band? Default: one line and one primary button.
6. Trade windows? Default: keep each, labelled on its card.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Committee assignments. Route: /datasets/committees. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a ticker lookup showing which committees' members hold or trade it, a two-committee comparison, a watch that flags new overseen-sector trades, and CSV export with a citation line. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
