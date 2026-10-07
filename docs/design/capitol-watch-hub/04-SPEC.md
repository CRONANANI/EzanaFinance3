# Capitol Watch hub, measured spec (final hybrid)

Measured from the approved board at 1440 wide. Colours are named by their
`03-TOKENS.css` property. Words in Plus Jakarta Sans; every number, ticker,
date and percentage in JetBrains Mono with `tabular-nums`.

## 1. Frame and rhythm

| | |
|---|---|
| Nav | 52px, shared component (`06-SHARED-NAV.md`) |
| Gutters | 40px; content max 1440, centred on wider screens |
| Section spacing | header top 28; Top signals 40 above; builder 28 above; Signals panel 44 above; heatmap row 24 above; portfolio 24 above; datasets 44 above; footer 36 above |
| Section heading | 22px / 700, tracking -.02em, with a 13px faint caption |
| Card | radius `--cwh-card-radius`, 1px `--cwh-card-border`, 2px `--cwh-card-accent` top |
| Mono-caps label | 10px, tracking .16em, `--cwh-faint` |

## 2. Header

`grid-template-columns: 560px minmax(0,1fr); gap: 36px; align-items: stretch`.

**Left column, gap 12:**

| Part | Spec |
|---|---|
| Eyebrow | bank icon 14 + mono 10.5px tracking .18em ink `DATASETS · CAPITOL WATCH` (+ SAMPLE DATA chip when fixtures are live) |
| Title | 34px / 700, tracking -.03em, line-height 1.05 |
| Purpose | 14.5px / 1.5 `--cwh-mute` |
| Stat strip | one bordered box, radius 10, three cells divided by hairlines; label + 18px / 700 mono value |
| EzanaQL bar | 48 tall pill; idle: 1px `--cwh-hair-strong`, tinted button; active: border emerald 60%, 3px `--cwh-focus-halo`, question in ink with ellipsis, solid `--cwh-emerald` Generate EzanaQL (36 tall, 12.5px / 700) |
| Prompts | "Try" 11.5px faint + chips 11.5px, padding 5 10, radius pill, 1px border |
| Query block | `--cwh-quiet`, radius 10, padding 10 12, mono 10.5px / 1.6 `--cwh-mute`, `EZANAQL` label in positive 700; below it Edit, Run (positive) and Saved reports (mute), 11.5px / 600 |
| Scope line | 11px / 1.5 faint |

**Right column, the result card** (fills, height matches the left column):

| Part | Spec |
|---|---|
| Head row | padding 12 16, hairline under; spark + `RESULT` label + question 13px / 600; right: `50 ROWS · 0.4S` mono 10.5px faint |
| Table | `grid-template-columns: minmax(0,1.5fr) 44px 40px 58px 50px 64px minmax(0,1fr)`, gap 10; head mono 9.5px tracking .12em; rows 12px, padding 7 0, dotted dividers; ticker mono 700 positive underlined with tint; type mono 700 (BUY positive, SELL `--cwh-sell`); amount mono 11px; first row may carry the hover tint |
| Overflow | table scrolls inside the card; head row sticky |
| Footer | padding 10 16, hairline above; explainer 11px faint; buttons 28 tall radius 7 (Save, CSV lock, JSON lock, Watchlist lock); Open full table ink fill, white 11.5px / 700, never wraps |

## 3. Top signals this week

**Head row:** heading; type filter pills (12px / 600, padding 6 11, active
ink fill); spacer; counter mono 12px (`1` ink 700, `OF 14` mute); two 36px
round arrow buttons with 1px border.

**Event card:** padding 24 26 20; `grid-template-columns: minmax(0,1fr) 700px; gap: 32px`.

Left column, gap 14:

| Part | Spec |
|---|---|
| Mark row | 26px rounded square `--cwh-emerald` with white icon; type label positive; `· FLAGGED OCT 6` mono 10px faint |
| Headline | 26px / 700, line-height 1.22, tracking -.02em |
| Reasons | label `WHY IT IS FLAGGED`; rows `grid 20px 1fr`, gap 10: check in a 20px tint circle; fact 13.5px (600 for the fact, mono 11.5 mute for date, faint for detail); dataset label mono 9.5px tracking .08em faint |
| Chips | linked datasets, mono 9.5px tracking .06em, padding 3 6, radius 4, `--cwh-tint` / positive, joined by 10px link icons |
| Footer | pinned to bottom, dotted top divider: strength dots (6px, emerald for linked, 12% ink otherwise) + `3 OF 5 DATASETS` mono 10px; actions right |

Right column, padding-left 28, hairline left, gap 12:

| Part | Spec |
|---|---|
| Head | ticker mono 17 / 700, company 13 mute, right `DAILY CLOSE, 60 DAYS` mono 10 faint |
| Chart | 672 x 210: baseline hairline; full series 1.4px at 32% ink; award line dashed 3 3 at 45% ink with `AWARD` label; trade marker 3.6r white with 1.6px ink stroke and `TRADE` label; 30 days after the trade 2.4px `--cwh-emerald` (gain) or `--cwh-negative` (loss) |
| Ticks | five dates, mono 9.5px faint, space-between |
| Facts | 4 cells, hairline top, divided by hairlines; label + 16px / 700 mono value; returns coloured by sign |
| Legend | mono 9.5px faint: dashed AWARD DATE, ring TRADE, bar 30 DAYS AFTER THE TRADE |
| Note | 11px / 1.5 faint, includes sources |

**Preview strip:** `repeat(5, minmax(0,1fr))`, gap 12. Each a button: padding
12 14, radius 10, 1px border (active: emerald border + 3px tint halo); row of
icon, type label mono 9px, position number; headline 12px / 600, 2-line clamp;
sparkline full width x 22 (emerald up, red down).

## 4. Rule builder

**Head row:** title 18px / 700 + caption 13px faint stacked; right: `My
signals` label + chips (tint, positive 11.5 / 600, bolt icon) + divider +
Collapse.

**Panel:** one card, `grid-template-columns: minmax(0,1.25fr) minmax(0,1fr) 380px`,
columns divided by hairlines, each padding 20 22, step badge 20px ink square
with white mono number + 14px / 700 title.

| Step | Spec |
|---|---|
| 1 | explainer 12px mute; tiles `repeat(5, minmax(0,1fr))` gap 8: button, padding 12, radius 10, 1.5px border (selected: emerald border, tint fill, emerald 18px check box; unselected: hair border, empty box), icon 14, name 12.5 / 700, sub 11 mute. `FROM OTHER DIMENSIONS` chips: pill, 1px border, icon 12 + 12px / 600 + mono `+`. OVERLAP box: `--cwh-quiet`, radius 8, label + linked chips |
| 2 | condition rows (inline-flex, padding 7 10, radius 8, 1px border): check (or empty box when off, row text faint), label 12.5px, inline value mono 700 in a tint chip with a 9px chevron (never wraps). Link "Describe it in plain English instead" 12px / 600 positive with spark |
| 3 | background slightly lifted (`--cwh-quiet` at half); count mono 30 / 700 + caption 13 mute; three match rows `44px 1fr 54px` 11.5px with return; "+N more"; NAME label + 36px field; Save to My signals (emerald fill, white, lock icon when signed out) and Alert me (outline, lock); honesty note 10.5px faint |

## 5. Signals across datasets

Card with a tab row (padding 8 10 0, hairline under; tabs 13px / 600, padding
10 14, letter prefix mono 10px; active ink with 2px emerald inset underline).
Body padding 16 20, gap 12: module head (16px / 700 + 12px mute sub, trader
type pills right), table, footer.

**Tab A table:** `grid-template-columns: minmax(0,1.5fr) 64px 96px 74px 90px 120px 180px`,
gap 12; head mono 9.5px tracking .12em; rows padding 10 0, dotted; trader name
600 + type tag (POLITICIAN on tint, others on 6% ink) + party tag; ticker mono
700; trade side mono 700 (BUY positive, SELL `--cwh-sell`) + date; 30D right,
signed colour; award mono 600; award date mono 11 mute + agency; chart 180 x 34
(same marks as the event chart, no labels).

**Footer (every tab):** hairline top; italic measurement note 10.5px faint;
window (clock icon) and sources (doc icon) 11px faint.

## 6. Heatmap and leaderboard

Row: `grid-template-columns: minmax(0,1fr) 540px; gap: 20px; align-items: stretch`.

**Heatmap card**, padding 16 18:
- grid `170px repeat(7, 80px)`, gap 3; sector heads mono 9.5px tracking .08em
  faint; committee labels 11.5px; cells 28 tall, radius 4, background emerald
  at `0.06 + v / max * 0.8`, value mono 10px / 600 (white above the
  threshold).
- Selected cell: 2px ink outline, offset 1.
- Detail box: `--cwh-quiet`, radius 10, padding 14 16,
  `grid 220px 1fr`, gap 20: SELECTED label, committee by sector 14 / 700,
  share mono 22 / 700 + `N of M members`; holders list rows
  `1fr 120px 70px` (name + party, tickers mono 700, LAST date mono 10.5 mute),
  Query this cell link.

**Leaderboard card**, padding 16 18:
- head with sub, locked badge as legend at right.
- rows `22px minmax(0,1.6fr) 60px 46px 64px 54px 54px`, gap 10; rank mono 700
  (first ink, rest faint); trader name (nowrap, ellipsis) over tags row: type,
  party, Quick Step badge when earned; score mono 700; N; avg 30D positive
  600; hit %; best ticker mono 600.
- Quick Step badge: pill, ink fill, white mono 9.5px / 600 tracking .06em,
  11px bolt filled and stroked `--cwh-gold`. Locked: dashed border, faint,
  outline bolt.
- Explainer: `--cwh-gold-tint`, radius 10, padding 10 12, 16px gold bolt +
  11.5px / 1.5 mute text with "Quick Step" in ink 700.

## 7. Congress's portfolio

Card, padding 16 20. Two columns, gap 0 40. Each: head row (#, TICKER, MEMBERS
HOLDING, EST. VALUE) then 8 rows `20px 52px minmax(0,1fr) 84px 120px`, gap 10,
padding 6 0: rank mono 10.5 faint; ticker mono 12.5 / 700; bar 10 tall, radius
3, emerald fill on 5% ink track, width = members / max; count mono 11 (bold
number + faint "members"); range mono 10.5 mute right. Filters: All /
Democrats / Republicans | House / Senate.

## 8. Dataset cards and footer

`repeat(5, minmax(0,1fr))`, gap 12. Card padding 14 16: icon + title 13 / 700;
lead figure mono 22 / 700; label 11.5 mute; second figure mono 10.5 faint;
footer with dotted top: freshness mono 10 faint, Open positive 12 / 600.
Sources footer: padding 20 40, hairline top, 11.5px faint.

## 9. Type scale

| Use | Font | Size / weight |
|---|---|---|
| Page title | Jakarta | 34 / 700 |
| Event headline | Jakarta | 26 / 700 |
| Section heading | Jakarta | 22 / 700 |
| Builder heading | Jakarta | 18 / 700 |
| Module title | Jakarta | 16 / 700 |
| Step title | Jakarta | 14 / 700 |
| Body, rows | Jakarta | 12 to 13.5 |
| Captions, notes | Jakarta | 10.5 to 12 |
| Big figures | Mono | 22 to 30 / 700 |
| Table figures | Mono | 11 to 12.5 |
| Labels, ticks, tags | Mono | 9 to 10.5, tracking .06 to .18em |

## 10. Responsive

| Width | Change |
|---|---|
| 1440 | As drawn |
| 1200 | Header left column 500; event chart column 560; heatmap cells 64 |
| 1000 | Header stacks: left column full width, result card below it at 8 rows. Event card stacks: chart under the text. Preview strip scrolls horizontally. Builder steps stack 1, 2, 3. Heatmap and leaderboard stack. Portfolio becomes one column of 16. Dataset cards scroll horizontally. Signals tab row scrolls horizontally |
| 640 | Follow `reference/mobile-pattern.html`: collapsed nav (back, Capitol Watch menu, Join, menu), compact header, swipeable event cards with a dot pager, tab A rows as stacked cards with the chart full width, datasets as a list. Builder becomes a bottom sheet opened from "Build a signal". Heatmap scrolls horizontally inside its card with the committee column sticky |
| 375 | 16px gutters, tap targets 44, no horizontal page scroll |

## 11. Data contract (new shapes; existing endpoints keep theirs)

```ts
HighSignalEvent {
  id, kind: 'trade_before_award' | 'committee_overlap' | 'lobbied_then_won' | 'insider_same_month' | 'late_filing' | 'user_rule',
  flaggedAt, headline,            // plain English, generated from the linked records
  ticker, company,
  reasons: { dataset, fact, date?, amount?, detail? }[],   // one per linked dataset
  linkedDatasets: string[],       // strength = linkedDatasets.length
  prices?: { date, close }[],     // 60 trading days around the award
  tradeDate?, awardDate?, return30d?, measuredFrom: 'trade_date' | 'filing_date',
  facts: { label, value, sign?: 'pos' | 'neg' }[],
  sources: string[],
  ruleId?                         // when produced by a user rule
}

SignalRule {
  id, name, datasets: string[],   // at least two
  conditions: { id, value, enabled }[],
  window: '30D' | '90D' | '180D' | '12M',
  alerts: boolean
}

HeatmapCell { committee, sector, share, holders: number, members: number,
  holderRows: { member, party, tickers: string[], lastTrade }[] }

PortfolioRow { ticker, members, estLow, estHigh }   // sums of disclosed range bounds
```

Pure functions (no React, tested): `rankHighSignalEvents`,
`matchSignalRule`, `heatmapCell`, `congressPortfolio`. Components render;
they do not compute.

## 12. Fixture

The board's fixture uses placeholder people, real tickers and illustrative
figures, except the stat strip and dataset card figures, which come from the
live page on Oct 7, 2026. Keep it for stories and tests; it never ships as
data.
