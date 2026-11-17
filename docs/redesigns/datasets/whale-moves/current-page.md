# Ezana Whale Moves page: how it works today

Page: Whale Moves. Route: /datasets/whale-moves. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this; screenshots of the live page are supplied separately.

## 1. Summary

Whale Moves ranks institutional and activist positions by conviction rather than size, using the Whale Score, Ezana's own 0 to 100 measure (not an SEC figure). Quarterly institutional holdings are scored on share of the manager's book, newness, fund concentration and size; activist stakes (Schedules 13D and 13G) on form, stake size and escalation. A "Burry Watcher" block shows one famous manager's last public holdings.

- Who uses it: retail investors and students asking "which big investors just made a real bet?"
- How they get there: the Titans Shadow menu in the green category bar, the Titans Shadow hub, search engines, shared links, and the 13D or 13G signal links on the Institutional Holdings page.
- What they do next: read the table and the method, or open EzanaQL. No row links anywhere.
- Data connected today: yes, live. Scores are computed hourly from SEC EDGAR filings and the page refreshes about every 15 minutes. Whether rows exist today was not checked.
- Sample data: a sample set exists in the code but shows only in local development, never on the live site. Figures in the wireframe are sample content with invented names; on the live page only admin and demo accounts will see sample data, labelled "Sample content"; everyone else sees real data or, if no source is connected, the honest empty state "This dataset's source is not connected yet."

## 2. What is on the page today

Desktop, in the older marketing page shell.

**Frame.** The navigation bar, the full-bleed green category band, and a ticker strip of the 20 top-scored moves: lead the tier ("Fresh conviction"), "Manager name → TICKER", the score. Not clickable. The shared dataset footer closes the page.

**Hero (centred).** Eyebrow "TITANS SHADOW · SEC EDGAR", title "Whale Moves", and a three-sentence lead.

**EzanaQL row.** Terminal icon, "Query this data with EzanaQL" linking to the Titans Shadow hub, and Share.

**Status note.** With no rows, a tinted note: "Scores appear once two quarters of 13F filings are loaded." plus one sentence on why.

**Highest-conviction moves this quarter.** Up to five bordered, filled, rounded cards: tier pill and score, manager, ticker chip and issuer, and a "why" line ("new · 14.2% of book" or "Schedule 13D at 8.1%"). Not clickable.

**Controls.** Three labelled bordered drop-downs and a count:

| Control | Options                                                      |
| ------- | ------------------------------------------------------------ |
| Filer   | All filers, Institutional (13F), Activist (Schedule 13D/13G) |
| Tier    | All tiers, then every tier present in the data               |
| Sort by | Whale Score, Position value, Conviction % (all high to low)  |
| Count   | "(n) shown"                                                  |

**Moves table.** Up to 120 moves, no paging.

| Column          | Content                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Filer           | Manager or activist name                                                                                      |
| Ticker / issuer | Ticker chip and issuer name                                                                                   |
| Tier            | Coloured pill (see below)                                                                                     |
| Conviction      | Institutional: percent of the manager's book. Activist: percent of the share class                            |
| Δ vs prior qtr  | Institutional: New, Doubled, Added, Trimmed, Exited or Flat, coloured. Activist: "Escalated" or the form name |
| Value           | Position value, compact dollars, or a dash                                                                    |
| Score           | A thin bar and the 0 to 100 number                                                                            |

Tiers: Fresh conviction, Doubling down, Activist stake (green); Adding, Quiet accumulation, New position (pale green); Holding (grey); Trimming, Heading for the exit (red). Empty: "No moves match the current filters." or "No scored moves yet. Scores appear once two quarters of 13F filings are loaded."

**Burry Watcher.** One bordered card on a well-known manager whose firm stopped filing in November 2025.

- Head: eyebrow with manager and firm, title "Burry Watcher", intro; then a "Not current positions." notice explaining these are from the final public 13F and that his paid newsletter is not reproduced.
- "Final 13F holdings": up to 12 lines: Issuer (with ticker), Type (Shares, Principal, Puts or Calls as small badges), Reported value, Share of reported value (bar and percent). Then totals, a note that option lines are notional, and a provenance line with form, dates, accession number and a filing link.
- Two columns: "On Ezana Echo" (articles mentioning him) and "In the news" (major-outlet headlines, last 90 days, new tab).
- Each part has its own unavailable and empty line.

**How the Whale Score works.** A lead and four factor blocks (name, weight, bar, description): Conviction 40, Newness 30, Concentration 20, Absolute size 10. Activist weights are not shown.

**How we source it.** Two paragraphs on sources, the 45-day lag and the derived score, then a line naming the third-party ticker mapping service.

**Loading.** A skeleton of header, five cards, controls and table.

**Tablet and phone.** Highlight cards wrap. Under 560px controls tighten. The table scrolls sideways in its own region.

## 3. What the user can do

- Filter by filer type and by tier; sort by score, value or conviction
- Read the top five moves
- Read the Burry Watcher; open its filing, Echo articles and news
- Read how the score is built and sourced
- Share the page; open EzanaQL
- Not available: search, opening a manager or a stock, links to filings for moves, paging, export, and any URL state. Filters reset on reload.
- Stored but not shown: quarter, filing date, manager identifier and each score's factor breakdown.

## 4. Data we have

| Field                | What it means                                        | Public source                                    | Freshness                            | Missing for                                  |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------ | -------------------------------------------- |
| Filer name           | Manager or activist                                  | SEC Form 13F-HR, Schedules 13D and 13G           | Scored hourly; page about 15 minutes | None                                         |
| Kind                 | Institutional or activist                            | Same                                             | Same                                 | None                                         |
| Ticker, issuer       | The stock                                            | Same, ticker mapped from the security identifier | Same                                 | Unmapped securities (issuer only)            |
| Quarter, filed date  | Period and filing date                               | Same                                             | Same                                 | Stored, not shown                            |
| Position value       | Dollar value at quarter end                          | Form 13F-HR                                      | Same                                 | Activist rows often                          |
| Conviction           | Percent of the manager's book                        | Calculated from 13F                              | Same                                 | Activist rows                                |
| Change type          | New, Doubled, Added, Trimmed, Exited, Flat           | Calculated, quarter against quarter              | Same                                 | Activist rows                                |
| Percent of class     | Activist stake size                                  | Schedule 13D or 13G                              | Same                                 | Institutional rows                           |
| Form                 | 13D or 13G                                           | Same                                             | Same                                 | Institutional rows                           |
| Escalated            | Stake grew since the last filing                     | Calculated                                       | Same                                 | Institutional rows                           |
| Whale Score, tier    | 0 to 100 and its band                                | Ezana calculation                                | Same                                 | Moves under $100M or without a prior quarter |
| Burry final holdings | Issuer, ticker, type, value, share of reported value | His firm's final 13F                             | Fixed (no newer filing exists)       | None                                         |
| Echo articles, news  | Title, outlet, date, link                            | Ezana Echo; major outlets                        | Hourly; six-hourly                   | Can be empty                                 |

## 5. Data we do not have

Do not design around these.

- Current or live positions; everything is a past quarter end or a filing date.
- Short positions or cash.
- Price charts, returns since the move, or performance of any manager.
- Manager photos, logos or biographies.
- Score history over many quarters.
- Sector or industry.
- Any recommendation; the score describes a filing.
- Burry's current positions or newsletter.
- Wireframe figures are sample content with invented names; only admin and demo accounts will see sample data live, labelled "Sample content".

## 6. Must keep working

- The Whale Score, its tiers and the published weights, with the clear statement that it is an Ezana metric, not an SEC figure.
- Scores only once the prior quarter is loaded, and the honest status note when none are.
- Filer type and tier filters; sorting by score, value and conviction.
- Activist rows show percent of class and form; institutional rows show conviction and change.
- The Burry Watcher with its "Not current positions" notice, provenance, filing link, option note and empty states.
- The 45-day lag and sourcing note.
- The ticker strip, the EzanaQL row and Share.
- Institutional Holdings links here from its 13D and 13G signals; those links must keep landing here.
- Sample data rule: admin and demo accounts may see sample content labelled "Sample content", never saved; everyone else sees real data or "This dataset's source is not connected yet." Known change: a parallel commit applies this rule to every dataset page.

## 7. Problems with the current page

### Design problems

- A centred marketing hero with a three-sentence lead and a title-case title instead of the compact identity row.
- Highlight cards, tier pills, change chips and the Burry card are bordered, filled and rounded; tiers rely on colour.
- Bordered labelled drop-downs instead of text-only filters; sort is a drop-down, not header clicks.
- Nothing opens: no detail, no filing link per move.
- The Burry Watcher, about one person, takes as much space as the dataset.
- The score explainer is four boxed blocks.

### Bugs and gaps

- No URL state; filters cannot be shared.
- The "Δ" header and the ticker arrow may read oddly to screen readers.
- The source note names a third-party data service, which breaks the no-vendor-names rule.
- Links from Institutional Holdings drop the ticker; the page has no parameter to receive one.
- Only 120 moves load, with no search.

## 8. Design rules the mock must follow

Family look first, then the corrections outside tools get wrong most often.

1. Draw the frame as it is: the 64px Ezana navigation bar; the full-bleed green band (emerald gradient, white labels) with the dataset category bar, Titans Shadow active; under it the ticker strip of the top-scored moves (small caps mono lead, white name, mint mono value); the shared light grey dataset footer. Do not redesign them.
2. Light mode as rendered on the live site: white ground, dark ink, only colours that exist in both themes.
3. Compact identity row on the left line: small caps mono eyebrow "DATASETS · TITANS SHADOW" (11px, muted) above "Whale moves" (22px, weight 700, sentence case); on the right a mono freshness line and at most one primary action. No centred title or intro paragraph; one sentence may go in a bi-info-circle tooltip.
4. Under it, the slim EzanaQL row: bi-terminal, "Query this data with EzanaQL", muted "on the Titans Shadow hub", plain-text Share on the right.
5. Content runs from x=32 to x=1408 at 1440px, text on those lines with no side padding.
6. Flat cards: no fill, border, shadow or radius; whitespace and hairlines only. 64px between side-by-side cards, 20px between stacked rows, 24px beside vertical rules. Only overlays (side panel, menus, tooltips) have a surface.
7. Tabs, toggles, filters and time selectors are text only, selected in emerald text, the rest grey; time ranges in 12px mono caps.
8. No outlined or pill buttons: one solid emerald primary per group, everything else plain text, emerald on hover.
9. Borderless search: bi-search icon, grey placeholder, no outline at rest, hover or focus.
10. JetBrains Mono with tabular figures for every figure, ticker, date, rank, eyebrow and table header; Plus Jakarta Sans for names and prose. 11px minimum. Card title 18px, section title 22px, body 14px.
11. Ruled tables: 11px caps mono headers over one hairline, no header fill, 1px row hairlines, 42 to 48px rows, no zebra, cell borders or boxed wrapper, numbers right-aligned, sort by clicking a header (emerald with bi-arrow-up or bi-arrow-down).
12. Entity detail opens in a 480px right side panel with its own URL parameter; Back closes it.
13. Bootstrap Icons only; no emoji, logos or photos; tickers as mono text; colour is never the only signal.
14. Selected rows: emerald text or a faint wash with 12px clearance; no edge bar; no mark touches text.
15. Skeletons in the final layout, never spinners; a one-line empty state with one action; an inline error with Retry.
16. Sentence case. No em dashes. Describe, never advise. Never "real-time": show the last update. No vendor names in interface text. Signed changes, compact headline money ($4.92M), N/A or "Not reported" for missing values.

Colours, light (dark): ground white #ffffff (#0a0e13); primary text #0f172a (#f0f6fc); secondary text #1e293b (#e2e8f0); muted grey #64748b (#8b949e); faint grey #94a3b8 (#6b7280); emerald #059669 (#10b981); emerald text #047857 (#34d399); negative red #dc2626 (#ef4444); warning amber #d97706 (#fbbf24); cyan #06b6d4; purple #a78bfa; hairline = primary text at about 8 percent; green band = emerald gradient with white text.

## 9. Open questions for me

Each question carries the default that will be used.

1. Keep the Burry Watcher? Default: keep it as one compact section lower on the page; in the mock draw it as a single-manager watcher with an invented name, labelled sample content.
2. Side panels? Default: a manager panel and a stock panel, each with its own URL parameter, built from the moves data.
3. Filters as text? Default: Filer and tier as text-only selectors, sort by header click, all mirrored to the URL.
4. How many moves? Default: load up to 300 (the most the read allows) with 25 per page.
5. Keep the score explainer? Default: one info tooltip on the Score header plus a short method section at the bottom.
6. Show the quarter and filed date? Default: yes, as the mono meta line under the filer.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Whale Moves. Route: /datasets/whale-moves. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, such as a ranked hero of the top-scored moves, manager and stock side panels, a score factor breakdown per move, "several whales on one stock" grouping, follow a manager for new filings, and a CSV export with filing citations. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
