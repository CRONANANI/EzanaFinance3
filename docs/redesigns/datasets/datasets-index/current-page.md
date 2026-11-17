# Ezana Datasets overview page: how it works today

Page: Datasets overview (Sonar index). Route: /datasets. Version: retail (public dataset page). Brief: unlock and redesign; new design and new features requested, following the dataset family look.
Written from the code at commit caa179e (main, November 16, 2026). The page was not run while writing this.

## 1. Summary

The front door to every Ezana dataset. It pairs the Sonar search ("Ping") with a map of the seven data dimensions, a belt of the latest signals from live datasets, and a brief that opens for any signal. The same page also serves the signed-in Sonar route.

- Users: signed-out visitors from the landing page, search engines and shared links; signed-in members looking for a dataset or asking Sonar a question.
- How they reach it: Home in the green band on any dataset page, the landing page's search pill (it hands a question over and the page opens on the answer), dataset footers and links.
- Next: a dimension hub, a dataset page, a signal's full dataset page, or a Sonar answer.
- Data connected today: yes, live. Dimensions and dataset names, live or soon states and counts come from Ezana's dataset catalogue (33 datasets: 21 live, 12 on the roadmap). The signal belt and briefs read the live datasets and refresh every five minutes.
- Sample data rule: figures in the wireframe are sample content with invented names. Only admin and demo accounts ever see sample data on the live page, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet." This page has no sample data today; with no signals the belt is simply absent.

## 2. What is on the page today

Unlike every other dataset page, the overview paints its own dark evergreen ground (a deep green radial gradient with dotted mountain ranges and a faint perspective grid floor), and the navigation and green band sit transparently on it as one surface.

### Top band

The category bar shows Home and the sign-in actions but no dimension menus. Beside the logo runs a signal belt: one line per signal (dimension icon in its colour, headline, short meta) from up to 22 live datasets (trades, awards, insider buys, fund moves, patents, sanctions, lobbying, prediction markets, macro releases and more). Hover or focus pauses it; a signal opens its brief.

### Hero and Ping field

Eyebrow "AI-powered financial intelligence", title "Smarter insights. Better decisions.", lede "Real-time intelligence on markets, policy, companies and the global economy." Under it the Ping field inside a bracket frame, placeholder "Try a person, a bank, a policy, a company, or a trend...", with a split Ping button; it takes focus on load. When an account's daily allowance is known, a line shows "N of M pings left today" or "You are out of pings for today. Resets at midnight ET." (the field is then disabled).

### Sonar stage

An isometric slab with a radar screen, dotted globe, core, turning ring and four decorative panels labelled Markets, Policy, Companies and Economy (no values); an emerald beam runs from the Ping field to the cards. Seven dimension dots on the ring are buttons ("(Dimension), N of M datasets live") that select a dimension. Every few seconds a real signal flashes on the globe where it happened and traces to its dot (decorative; off for reduced motion).

### Dimension cards

A bus line with a chevron feeds seven cards in catalogue order: Capitol Watch, Titans Shadow, Eyes Above, Consumer Whispers, The Hive, Global Empire Lighthouse, Regulatory Winds. Each card: icon, name, a dashed rule, tagline. Choosing a card (or its dot) expands its dataset list, each dataset marked Live (filled circle, a link) or Soon (hollow circle, not a link), and "Open dimension" to its hub. Choosing it again or pressing Escape collapses it. While a brief is open, choosing a card opens that dimension's freshest signal instead.

### Signal brief (replaces the stage while open)

Kicker "Dimension / Dataset" and "Through (date)"; close; the headline; up to four stat tiles (for a trade: Range, Chamber, Traded, Filing lag); up to five Findings; context figures; one bar or line chart with direct labels; "More from (dataset)" with three signal chips; footer "Source: (public source). Findings only, never financial advice." and "Open (dataset)". Escape closes it.

### After a ping

The page gives way to a full-screen loading state, then the Sonar answer layout (cited briefing, matching dataset cards, a guest sign-up popup). That layout belongs to Sonar and is out of scope; only the hand-off must keep working. A ping silent for about 70 seconds shows an error with Retry and Back.

### States

- Route loading: the Sonar ping screen. No signals: no belt and no flashes; the page is otherwise complete. A brief closes if its signal leaves the feed.

### Tablet and phone

Cards run seven across, four under 1280px, two under 960px (where the belt hides and the stage shrinks), and on phones a sideways-swiping row of cards inside its own section.

## 3. What the user can do

- Ask Sonar a question (Ping) and land on the answer
- Open a signal from the belt; move to related signals; open its dataset
- Select a dimension from the stage or a card; read its dataset list; open a live dataset or the dimension hub
- Share a view: the selected dimension, the open signal and the ping all live in the address
- Easy to miss: choosing a card while a brief is open jumps to that dimension's freshest signal.

## 4. Data we have

| Field                                 | What it means                                                                                               | Public source                    | Freshness                     | Gaps                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------- | -------------------------------------------- |
| Dimension name, icon, tagline, colour | The seven dimensions                                                                                        | Ezana dataset catalogue          | With each release             | None                                         |
| Dataset name, live or soon, link      | Every dataset per dimension                                                                                 | Same                             | With each release             | Soon datasets have no page                   |
| Live counts                           | Datasets live per dimension and overall                                                                     | Same                             | With each release             | None                                         |
| Signal headline, meta, dimension      | One recent finding from a live dataset (a disclosed trade, an award, an insider buy, a new sanctions entry) | Each dataset's own public source | Every five minutes while open | Slow datasets can be missing on a given read |
| Signal stats and findings             | Up to four figures and five plain findings                                                                  | Same                             | Same                          | Varies by dataset                            |
| Dataset context and chart             | Headline figures and one chart series per dataset                                                           | Same                             | Same                          | Some datasets have no chart                  |
| Through date                          | Last date covered by the dataset                                                                            | Same                             | Same                          | Some datasets                                |
| Pings left today                      | The account's remaining Sonar allowance                                                                     | Ezana account                    | On load                       | Not shown when unknown                       |

## 5. Data we do not have

Do not design around these; show them only as clearly marked future features.

- An activity series per dimension (the cards draw a dashed rule because none exists; never draw a sparkline).
- Record counts or latest-data dates per dimension on this page (the hubs have them).
- Any values for the Markets, Policy, Companies and Economy panels; they are decoration.
- A searchable list of all datasets by name, tag or source.
- Real-time anything; the belt refreshes every five minutes. The lede's "real-time" claim is not true.
- Visitor history (recent pings are not shown here) or personalised recommendations.
- Live sample content: wireframe figures are invented and labelled "Sample content"; only admin and demo accounts would see sample data live.

## 6. Must keep working

- The Ping field and the hand-off from the landing page (a question in the address opens straight on the answer), the loading screen, and the answer layout, which this redesign does not touch.
- The same page renders the signed-in Sonar route; nothing may break it.
- The address keeps the selected dimension, the open signal and the ping, without adding history entries.
- Every dimension reachable in one action, with each dataset's Live or Soon state in text and icon, never colour alone; Live datasets link to their pages; every dimension links to its hub.
- Signal briefs with their source line and "Findings only, never financial advice."
- Five-minute signal refresh, belt pause on hover and focus, reduced motion.
- Sample data rule (known change): only admin and demo accounts may see sample content, labelled "Sample content"; everyone else sees real data or "This dataset's source is not connected yet."

## 7. Problems with the current page

### Design problems

- The page is dark while every other dataset page renders light; it does not look like the family.
- A marketing hero ("Smarter insights. Better decisions.") and a lede that claims real-time intelligence.
- Most of the first screen is decoration: the slab, globe, beam and four panels that look like data but carry none.
- The datasets themselves are hidden: a visitor must open a card to see any dataset name, and no screen lists all 33.
- The dimension menus are removed from the green band on this page only.
- A bespoke Ping frame; the placeholder ends in three dots.

### Bugs and gaps

- Cards and stage dots duplicate the same control; the selection is easy to lose.
- Soon datasets appear in the same list as live ones with only a small hollow circle to tell them apart.

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

Page-specific: this page is the one place the dataset family may keep a deep evergreen band (the Sonar stage), drawn as one contained green section in the light page, never the whole ground. Dimension colours appear only as small icon tints with text labels.

## 9. Open questions for me

1. Light or dark? Default: light page as rendered for the family, with the Sonar stage kept as one deep green band.
2. Keep the Ping as the first thing on the page? Default: yes, compact, under a compact identity row ("Datasets", 33 datasets, 21 live).
3. Keep the orbital stage? Default: it may shrink to a band; the seven dimension selectors must stay one click away.
4. Show every dataset without a click? Default: yes, a ruled index of all datasets grouped by dimension, each with Live or Soon in text and its public source.
5. Bring back the dimension menus in the green band? Default: yes, as on every other dataset page.

## 10. Prompt to paste into ChatGPT

Ezana Finance: Redesign this dataset page. Follow the Ezana dataset page redesign master prompt (DATASET_MASTER_PROMPT.md) and the Ezana Branding and UI Guide, both pasted earlier in this chat. Page: Datasets overview (Sonar index). Route: /datasets. Version: retail, public dataset page. Data connected today: yes, live. The attached screenshots show the existing page. Everything above this section describes the page's existing functionality and data. Design one full-page desktop mock at 1440px wide in light mode, as rendered on the live site, and output it as an actual image. Follow section 8 exactly. Use only data listed in section 4. Draw nothing from section 5 except as clearly marked future features. Keep everything in section 6 working and solve the problems in section 7. Use the defaults in section 9. Propose and draw 4 to 8 new features and functions that would be genuinely useful for this specific dataset, for example a full ruled index of every dataset with Live or Soon and its source, a filter by dimension or source type, a latest-signals list with its through dates, suggested Sonar questions drawn from the open signal, and a "new since your last visit" marker. Use invented sample names only and label all numbers, names and tickers as sample content. Show the key loading, empty and error states. Finish with the written outputs listed in section 10 of the master prompt.
