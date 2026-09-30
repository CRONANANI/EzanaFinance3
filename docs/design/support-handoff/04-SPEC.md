# Support centre pages, measured spec

All numbers measured from the approved boards at 1440 wide. Colours are named
by their `03-TOKENS.css` property. Words in Plus Jakarta Sans; counts, read
times, dates and mono-caps labels in JetBrains Mono.

## 1. Frame

| | |
|---|---|
| Marketing nav | 64px, as today, mounted |
| Gutters | 40px each side; content max 1440, centred on wider screens |
| Header block | padding-top 26; crumb, 10 gap, eyebrow, 10, title, 10, subline, 18, pill, 10, Try chips (home) or Clear link (answered) |
| Body | 30px under the header (home), 26px (answered) |
| Bottom | 40px under the last block |

## 2. Header (both states)

| Part | Spec |
|---|---|
| Crumb | 12.5px `--hc-mute`; back chevron 11px; `Back to Help Center` then ` / ` in faint then `User Support` 600 in ink |
| Eyebrow | mono 10.5px, tracking .18em, `--hc-positive`: `HELP CENTER · USER SUPPORT` |
| Title | 34px / 700, tracking -.025em, line-height 1.1 |
| Subline | 14px `--hc-mute` |
| Pill | 760 x 56, radius pill, 1px `--hc-hair-strong`, padding 0 6 0 18; search icon 15px faint; text 15px (placeholder faint, value ink); Ask AI button 44 tall, padding 0 16, radius pill, 13px / 700, spark icon 12px; tinted at rest (`--hc-btn-tint-bg/fg`), solid emerald with white text when a question is present |
| Pill, answered | border `--hc-pill-active-border`, `box-shadow: 0 0 0 3px --hc-focus-halo` |
| Try row | "Try:" 12px faint, chips 12px `--hc-chip-fg`, padding 5 10, radius pill, 1px `--hc-chip-border`, gap 8 |
| Clear link | 12.5px `--hc-mute`, back chevron 10px, "Clear and browse" |

## 3. Home grid

```
grid-template-columns: 268px minmax(0, 1fr) 300px;
column-gap: 32px;
align-items: start;
```

Left rail: `border-right: 1px solid --hc-hair; padding-right: 20px`.
Right rail: `border-left: 1px solid --hc-hair; padding-left: 24px`.

### 3.1 Category rail (resting)

| Part | Spec |
|---|---|
| Header | flex, space-between, padding 0 12 6; `ALL CATEGORIES` mono 10px tracking .16em faint; count mono 10px faint |
| Row | flex, gap 12, padding 10 12, radius `--hc-rail-row-radius`; icon tile 30 x 30 radius 8 on `--hc-tint` with a 14px icon in `--hc-positive`; name 13px / 600, one line ellipsis; chevron 10px faint |
| Hover | background `--hc-tint` at half strength (4%) |
| Rows | 12, gap 4 |

### 3.2 Middle column (gap 26 between blocks)

**Start here**: heading 15px / 700 with caption 12.5px faint; 12 gap; three
cards in `repeat(3, minmax(0,1fr))`, gap 12. Card: padding 18 18 16, radius
`--hc-card-radius`, 1px `--hc-card-border`; icon tile 36 x 36 radius pill on
`--hc-tint` with a 16px icon; name 14px / 700; description 12px `--hc-mute`
/ 1.45; "View articles" 12px / 600 `--hc-positive` with a 10px chevron,
pushed to the bottom.

**Frequently asked questions**: heading 15px / 700; 12 gap; `1fr 1fr`, gap
8; row padding 14 18, radius 10 (use `--radius-md` if 10 is not a token),
1px `--hc-hair`, 13.5px / 500, chevron 12px faint right.

**Recently updated**: heading row with heading, caption "articles changed in
the last 30 days", spacer, "All updates" 12.5px / 600 link; 12 gap; list
with 1px `--hc-hair` on top; rows `grid-template-columns: minmax(0,1fr)
150px 88px 14px`, gap 12, padding 11 0, dotted `--hc-dotted` under; title
13.5px / 600 one line ellipsis; category 12px `--hc-mute`; date mono 11px
faint right; chevron 12px faint. Five rows.

**Help card**: padding 18 22, radius `--hc-panel-radius`, 1px `--hc-hair`,
one row: text block (title 15px / 700, body 12.5px `--hc-mute` / 1.5) then
buttons (Contact Support: padding 10 16, radius 8, `--hc-btn-primary-*`,
13px / 700, 10px chevron; Back to Help Center: padding 10 16, radius 8, 1px
`--hc-btn-secondary-border`, 13px / 600). Buttons never wrap at 1440.

### 3.3 Trending rail

Header: trend icon 13px `--hc-positive` + `TRENDING THIS WEEK` mono 10px
tracking .16em faint. List: rows `grid-template-columns: 24px minmax(0,1fr)`,
gap 10, padding 10 0, dotted divider; index mono 11px faint zero-padded;
title 13px / 600 / 1.35; category 11.5px `--hc-mute`. Six rows. Footer link
"All popular articles" 12.5px / 600, 10px above.

## 4. Answered grid

```
grid-template-columns: 232px minmax(0, 1fr) 320px;
column-gap: 28px;
align-items: start;
```

Left rail spans both rows (`grid-row: 1 / 3`); the help card sits in row 2
spanning columns 2 to 4 (`grid-column: 2 / 4`).

### 4.1 Category rail (matches)

Same rows as resting, with: header right label `MATCHES`; a row with matches
gets `background: --hc-rail-highlight` and its count mono 11px / 600
`--hc-rail-count` in place of the chevron; a row without matches gets
`opacity: --hc-rail-dim` and a middle dot. Under the list, 10px above, a
note 11px faint / 1.5: "Highlighted categories hold at least one article
relevant to your question." Rail `padding-right: 16px`.

### 4.2 Middle column (gap 18)

**Answer card**: padding 22 24, radius `--hc-panel-radius`, 1px `--hc-hair`,
gap 14.

| Part | Spec |
|---|---|
| Label row | spark 12px `--hc-positive`; `AI ANSWER` mono 10px tracking .16em `--hc-positive`; spacer; "from N help articles" 11.5px faint |
| Answer | 15px / 1.6 ink |
| Steps | `ol`, padding-left 18, gap 6, 13px `--hc-mute`, key terms 600 ink; only when the payload has steps |
| Sources | `SOURCES` mono 10px tracking .14em faint; chips: doc icon 12px `--hc-positive`, 12px / 500 ink, padding 6 10, radius pill, 1px `--hc-hair-strong`, gap 8, wrap |
| Footer | 1px `--hc-hair` above, padding-top 10; caveat 11.5px faint left; right: "Was this helpful?" 12px `--hc-mute` (nowrap) + two 30 x 30 buttons radius 8 with 13px thumb icons |

**Follow-up row**: label "Ask a follow-up" 12.5px `--hc-mute` nowrap; pill
field 40 tall radius pill 1px `--hc-hair-strong`, padding 0 16, 13px
placeholder faint; Ask button 40 tall padding 0 16 radius pill
`--hc-btn-tint-*` 13px / 700.

**Keep reading**: 1px `--hc-hair` above, padding-top 22; heading 15px / 700
+ caption 12.5px faint; 12 gap; cards `repeat(3, minmax(0,1fr))`, gap 10;
card padding 14 14 12, radius `--hc-card-radius`, 1px `--hc-hair`, gap 10:
header (icon tile 30 x 30 radius 8 tint with 14px icon, name 13.5px / 700,
spacer, count mono 11px faint), article links (space-between, padding 8 0,
dotted under, 13px / 500, 11px chevron faint, wrap allowed), footer link
"All {category} articles" 12px / 600.

### 4.3 Right column (gap 22)

**Related articles card**: padding 18 20, radius `--hc-panel-radius`, 1px
`--hc-hair`; heading 15px / 700 + "ranked by match" 12px faint; rows
`grid-template-columns: 34px minmax(0,1fr) 14px`, gap 12, padding 12 0,
dotted under: icon tile 34 x 34 radius 8 tint with 14px doc icon; title
13.5px / 600 / 1.3 (wraps, max 2 lines); meta row 11.5px `--hc-mute`
"Category · N min read" plus the `BEST MATCH` tag (mono 9px tracking .1em,
padding 2 6, radius 4, `--hc-tint-strong` / `--hc-positive`) on the first
row; chevron 12px faint. Six rows. "See all N results" 12.5px / 600, 10px
above.

**Still trending**: trend icon 13px faint + `STILL TRENDING` mono 10px
tracking .14em faint; the trending list style from 3.3, three rows.

### 4.4 Help card (row 2, columns 2 to 4)

The home help card, one row, padding 18 22.

## 5. Type scale

| Use | Font | Size / weight | Tracking |
|---|---|---|---|
| Title | Jakarta | 34 / 700 | -.025em |
| Section heading | Jakarta | 15 / 700 | |
| Card name | Jakarta | 14 / 700 | |
| Answer body | Jakarta | 15 / 400, 1.6 | |
| Row title | Jakarta | 13.5 / 600 | |
| Rail row | Jakarta | 13 / 600 | |
| Body, FAQs | Jakarta | 13.5 / 500 | |
| Captions | Jakarta | 11 to 12.5 / 400 | |
| Buttons | Jakarta | 13 / 600 to 700 | |
| Mono-caps labels | Mono | 10 to 10.5 | .14em to .18em |
| Counts, dates, read times | Mono | 10.5 to 11 | |
| Tag | Mono | 9 | .1em |

## 6. Responsive

| Width | Change |
|---|---|
| 1440 | As drawn |
| 1200 | Home grid `240px 1fr 280px`, gap 24; answered `220px 1fr 300px`; Keep reading stays 3 columns |
| 1000 | Rails collapse: the category rail becomes a horizontal scroll strip of pills under the header (chips with counts in the answered state), trending moves under the middle column as a 2-column list; Keep reading 3 columns; Related and Still trending under the answer, full width |
| 640 | Everything one column: pill full width with 16 gutters, Try chips scroll horizontally, Start here cards stack, FAQs one column, Recently updated rows drop the category column, Keep reading cards stack, Related rows keep their layout |
| 375 | Same as 640; Ask AI becomes icon-only (spark, `aria-label="Ask AI"`) inside the pill; help card stacks its buttons; tap targets 44 |

No horizontal page scroll at any width. The category strip at 1000 and
below is the same component in a third mode (`strip`).

## 7. Fixture (User Support, from the current page)

**Categories** (name, description, icon):
Getting Started, Learn the basics of Ezana Finance, book ·
Inside the Capitol, Track and analyze congressional trades, capitol ·
Portfolio & Trading, Manage investments and place trades, wallet ·
Watchlists & Alerts, Track tickers and get price alerts, bell ·
Research Tools, Company research, market analysis, quant tools, chart ·
Account & Security, Account settings and security, shield ·
Billing & Subscriptions, Plans, payments, and invoices, card ·
Community, Connect with other investors, people ·
Learning Center, Courses and educational content, grad ·
Global Analysis, Empire Rankings, Big Cycle, geopolitics, globe ·
Teams & Organizations, Team hub, seats, roles, and shared workspaces, org ·
Legal & Disclosures, Terms, privacy, and disclosures, scale.

Map the icon names to Bootstrap Icons: book → `bi-book`, capitol →
`bi-bank`, wallet → `bi-wallet2`, bell → `bi-bell`, chart → `bi-bar-chart`,
shield → `bi-shield`, card → `bi-credit-card`, people → `bi-people`, grad →
`bi-mortarboard`, globe → `bi-globe`, org → `bi-diagram-3`, scale →
`bi-scales` (use the closest available if a name is missing).

**Trending**: Creating Your Ezana Finance Account (Getting Started) · Your
First 5 Steps on Ezana (Getting Started) · Login Streak & 30-Day Multiplier
Reward (Getting Started) · How Congressional Trading Data Works (Inside the
Capitol) · Understanding Congressional Disclosures (Inside the Capitol) ·
Following Specific Politicians (Inside the Capitol).

**FAQs**: How do I connect my brokerage account? · What is congressional
trading data? · Can I export my portfolio data? · How do I contact support?

**Recently updated** (illustrative): Managing External Brokerage
Connections, 2 days · Teams: inviting members and roles, 6 days ·
Understanding Congressional Disclosures, 12 days · Two-factor
authentication, 19 days · Exporting your portfolio as CSV, 24 days.

**Sample question**: "how do I connect my brokerage account". Answer text as
on the current page. Sources: Connecting Your External Brokerage Account ·
Managing External Brokerage Connections · Opening an Ezana Brokerage
Account. Matches by category: Getting Started 8, Portfolio & Trading 9,
Research Tools 2, Account & Security 3, Billing & Subscriptions 1, Legal &
Disclosures 1. Related (beyond sources): Which brokerages are supported ·
Why my holdings are not updating · Data security and brokerage permissions.
Keep reading: Portfolio & Trading (Which brokerages are supported, Why my
holdings are not updating, Switching from Plaid to SnapTrade) · Account &
Security (Data security and brokerage permissions, Revoking a brokerage
connection, Two-factor authentication) · Getting Started (Your First 5 Steps
on Ezana, Creating Your Ezana Finance Account).

Everything illustrative above is replaced by the live help-centre source;
the fixture exists for Storybook and tests.

## 8. Pure functions (no React, tested)

```js
categoriesFor(audience)                       // canonical order, with article counts
matchesByCategory(answer)                     // { [category]: count } of distinct matched articles
relatedArticles(answer, n = 6)                // sources first, then matches by score desc, dedup
keepReading(answer, { categories: 3, perCategory: 3 })  // excludes sources
stillTrending(trending, answer, n = 3)        // excludes sources and related
startHere(audience)                           // the three most-opened categories
```
