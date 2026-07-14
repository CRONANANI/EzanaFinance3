# Pitch Detail Page — Design Brief

**Product:** Ezana Finance — Organizational (University SMIF) Platform
**Route:** `/pitch/[id]` — opens from Pitch Pipeline
**Tabs:** Thesis · Supporting Data · Deliverables · Discussion
**For:** Claude Design

---

## Context

This is the page a member lands on when they open a pitch from the pipeline. It is the **single most important object in the product** — everything else (assignments, meetings, compliance, the rating system) either feeds it or consumes it.

**Current state:** four thin tabs. Thesis renders static text. Supporting Data is throwing `FMP HTTP 403`. Deliverables is a bare dropdown + text input. Discussion is an empty textarea.

**What it needs to become:** a living investment memo that carries the pitch from `Screening` through `IC Vote` to `In Portfolio` and finally to a scored, post-mortem'd outcome.

---

## Design System (locked)

| Token                 | Value                                    |
| --------------------- | ---------------------------------------- |
| Text typeface         | Plus Jakarta Sans                        |
| Numeric typeface      | JetBrains Mono, `tabular-nums`           |
| Primary accent        | Emerald `#10b981`                        |
| Premium / achievement | Gold-champagne `#d4a853`                 |
| Surface               | Dark — near-black page, elevated cards   |
| Green flag / bull     | Emerald                                  |
| Red flag / bear       | Red semantic token                       |
| Theming               | **Theme tokens only — no hardcoded hex** |

---

# GLOBAL — Page Shell (all four tabs)

The current header is too thin. A pitch header must carry state, stakes, and action.

### Revised header

```
← Back to Pipeline

┌──────────────────────────────────────────────────────────────────────────────┐
│  FSLR · First Solar                                    ● SCREENING           │
│  Energy & Utilities · Long · 12m horizon                                      │
│                                                                              │
│  $192.40  ▲ +1.2%      Target $265      Upside +37.8%      Conviction ●●●●○  │
│  ────────────────────────────────────────────────────────────────────────────│
│  Ava Doucet (Senior Analyst) · Marcus Chen (Junior Analyst)                  │
│  Desk: Energy & Utilities · Priya Raman (Senior PM)                          │
│  Submitted Feb 3 · 11 days in Screening ⚠                                    │
│                                                                              │
│  [ Advance to Deep Dive ]  [ Request Changes ]  [ Reject ]      ⋯            │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Additions:**

- **Live quote strip** — price, day change, target, implied upside. Pulled from FMP, refreshed. The pitch must never go stale.
- **Conviction dots** (1–5) — the field that feeds the Ezana Rating multiplier. Display it prominently; it's a public commitment.
- **Analyst + desk + PM** attribution from the org chart
- **Days-in-stage** with an aging warning (>10d)
- **Stage-appropriate primary action.** The button changes by stage:
  | Stage | Primary CTA |
  |---|---|
  | Screening | `Advance to Deep Dive` |
  | Deep Dive | `Submit for IC` |
  | Pitch Scheduled | `View IC Agenda` |
  | IC Vote | `Open Vote` |
  | In Portfolio | `Update Thesis` / `Flag Position` |

### Stage progress rail (below header)

```
 Idea ──── Screening ──── Deep Dive ──── Scheduled ──── IC Vote ──── Portfolio
  ✓            ●              ○              ○             ○            ○
```

### Compliance gate strip (persistent, above tabs)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⚠ COMPLIANCE — 1 warning, 0 blockers                          [ Details ▾ ] │
│  ✓ Mkt cap $20.6B  ✓ ADV $412M  ✓ Not restricted  ✓ Long only               │
│  ⚠ Energy desk would reach 18.4% (soft limit 15%)                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

**A hard-rule failure disables the primary CTA.** This is the edge that makes the Compliance page real rather than decorative.

### Tab bar — with counts

```
Thesis    Supporting Data    Deliverables (3)    Discussion (12)
```

Add a fifth tab that appears **only after approval**:

```
Thesis  ·  Supporting Data  ·  Deliverables  ·  Discussion  ·  Performance
```

---

# TAB 1 — THESIS

Currently a static label/value list. It should be a **structured, versioned, reviewable memo.**

## New sections & features

### 1.1 Keep and enrich the existing fields

`Short Thesis` · `Full Thesis` · `Why Now` · `Target` · `Catalysts` · `Risks`

**Upgrade each:**

| Field           | Addition                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Full Thesis** | Rich text, not one line. Support headers, bullets, inline ticker links, footnoted sources.                                            |
| **Target**      | Break into **Bull / Base / Bear** with probability weights. A single number is a guess; three with weights is an underwriting.        |
| **Catalysts**   | Each becomes an **object**: name, expected date, status (`Pending` / `Hit` / `Missed`), impact estimate. Feeds notifications.         |
| **Risks**       | Each becomes an object: name, severity, **mitigant**, and a `Materialized?` flag set later. This is what makes post-mortems possible. |

### 1.2 New required sections

**Variant Perception** — _"What does the market believe that we think is wrong?"_
The single most important question in a pitch and the one most students skip. Make it required.

**Valuation** — method (DCF / Comps / SOTP / Sum-of-parts), key assumptions surfaced as editable cells, output linked to the model in Deliverables.

**Position Sizing Ask** — proposed % of AUM, with a live compliance check against the position limit.

**Falsification** — _"What would prove us wrong?"_
A specific, checkable condition. Not "the stock goes down." Something like "if 2026 bookings guide comes in below 18 GW."

> The Falsification field is the intellectual core of the whole platform. It converts a pitch from advocacy into a hypothesis. Make it required, make it specific, and surface it again at every thesis review.

### 1.3 Bull / Base / Bear panel

```
┌──────────────────────────────────────────────────────────────┐
│  VALUATION SCENARIOS                                         │
│                                                              │
│           TARGET      UPSIDE     PROB     WEIGHTED           │
│  Bull     $310        +61.1%     25%      +15.3pp            │
│  Base     $265        +37.8%     55%      +20.8pp            │
│  Bear     $140        −27.2%     20%       −5.4pp            │
│  ──────────────────────────────────────────────────────────  │
│  Expected                                  +30.7%            │
│                                                              │
│  ████████████████░░░░  Risk/Reward 2.3 : 1                   │
└──────────────────────────────────────────────────────────────┘
```

### 1.4 Catalyst timeline (visual)

```
 Feb 3        Apr 24         Jul 30            Q4 2026
 ├────────────┼──────────────┼─────────────────┤
 Pitch      Q1 earns      45X guidance      Capacity ramp
 submitted  ● PENDING     ● PENDING          ● PENDING
```

Catalysts with dates fire notifications to the analyst. A catalyst that passes without effect auto-prompts a thesis review.

### 1.5 Version history

Theses get edited. Every edit is versioned with a diff view. **You must be able to see what the thesis said on the day the IC voted on it** — that's what the vote was actually approving.

### 1.6 Peer review panel (right rail)

```
┌────────────────────────────┐
│ REVIEW                     │
│                            │
│ Priya Raman (Sr PM)        │
│ ● Approved · Feb 8         │
│ "Sizing feels rich given   │
│  policy risk. Cut to 3%."  │
│                            │
│ Sofia Marchetti (VP Res)   │
│ ◐ Changes requested        │
│ "Need a bear case on       │
│  module ASP compression."  │
│                            │
│ ○ Awaiting: Noah R-Leigh   │
└────────────────────────────┘
```

Reviewers auto-assigned from the org chart: desk Senior PM → VP Research → CIO for large sizing.

### 1.7 Completeness meter

```
Thesis completeness  ████████████░░░░  8 of 11 required sections
Missing: Variant Perception · Falsification · Bear case
```

**A pitch cannot advance to `Pitch Scheduled` at less than 100%.** Gate it.

---

# TAB 2 — SUPPORTING DATA

Currently: `FMP HTTP 403`. This tab should be the _reason the platform exists_ — the data a student would otherwise pull from four different sites.

> **Fix the 403 first.** Per prior work, FMP `/v3/` endpoints are deprecated → migrate to `/stable/`. Verify the key's plan tier covers the endpoints being called.

## Layout: sectioned scroll, or sub-tabs

```
Overview │ Financials │ Valuation │ Comps │ Ownership │ News
```

### 2.1 Overview

- Price chart (1D / 1M / 6M / 1Y / 5Y), with **the pitch entry point annotated** and catalyst dates marked
- Snapshot: market cap, EV, ADV, beta, 52w range, short interest, float
- **Relative performance vs. sector ETF** — XLE for this pitch. Benchmark-relative thinking is the whole rating system; teach it here.

### 2.2 Financials

- 5y income statement, balance sheet, cash flow — collapsible, JetBrains Mono, `tabular-nums`
- YoY growth columns
- Segment breakdown where available
- Quarterly toggle
- **Estimates vs. actuals** — last 8 quarters, beat/miss coloring

### 2.3 Valuation

- Multiples: P/E, EV/EBITDA, EV/Sales, P/B, FCF yield — **current vs. 5y median vs. sector median**
- The three-column comparison is the point. A number alone is meaningless.

### 2.4 Comps table

```
              MKT CAP   EV/EBITDA   P/E    REV GR   GM%    ROIC
FSLR          $20.6B      11.2x    18.4x   +27%    41.2%   14.1%
ENPH           $8.4B      14.8x    22.1x    −9%    46.8%   19.3%
SEDG           $2.1B         nm      nm    −31%    28.4%   −4.2%
RUN            $2.8B      19.4x       nm    +4%    35.1%    2.8%
NXT            $9.2B      16.1x    26.8x   +42%    31.6%   22.4%
─────────────────────────────────────────────────────────────────
Peer median    $8.4B      15.5x    22.1x    +4%    35.1%   14.1%
FSLR vs peers   —         −28%     −17%    +23pp   +6.1pp    —
```

Analyst can add/remove comps. The delta row is auto-computed.

### 2.5 Ownership

Institutional holders, insider transactions (last 12m), short interest trend.

### 2.6 News

Marketaux-fed, ticker-scoped, filterable by sentiment. Each item **pinnable to the Collection** for attachment in Deliverables or a Flag.

### 2.7 Pin-to-collection (cross-cutting)

Every chart, table row, and news item has a **📌 pin** affordance. Pinned items land in the member's Collection and can be attached to a memo, a flag, or a discussion post. This is what makes the "Attach from your collection" empty state in the Flag modal actually fill up.

### 2.8 Error states — do them properly

The current red `FMP HTTP 403` is a raw error leaking to the user.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠  Couldn't load market data for FSLR                       │
│                                                              │
│  The data provider returned an error. Financials, comps,     │
│  and valuation are unavailable right now.                    │
│                                                              │
│  [ Retry ]     Last successful load: Feb 12, 4:22pm          │
└──────────────────────────────────────────────────────────────┘
```

Show cached data with a staleness badge if any exists. Never show a bare HTTP code.

---

# TAB 3 — DELIVERABLES

Currently: a `Memo ▾` dropdown, a `File title` input, and an `Add` button. No upload, no list, no state.

## What it needs

### 3.1 Required deliverables checklist

The pitch template (faculty-configured per org) defines what's required. The tab should _show the requirement_, not just accept uploads.

```
┌───────────────────────────────────────────────────────────────────────┐
│  REQUIRED FOR IC SUBMISSION                            3 of 5 complete│
├───────────────────────────────────────────────────────────────────────┤
│  ✓  Investment Memo          FSLR_Memo_v3.docx      Ava D.   Feb 11   │
│  ✓  Valuation Model          FSLR_DCF_v2.xlsx       Ava D.   Feb 10   │
│  ✓  Pitch Deck               FSLR_IC_Deck.pptx      M. Chen  Feb 12   │
│  ○  Comps Sheet              — required —                    [Upload] │
│  ○  Risk Register            — required —                    [Upload] │
├───────────────────────────────────────────────────────────────────────┤
│  OPTIONAL                                                             │
│  ✓  Channel check notes      FSLR_channel.pdf       M. Chen  Feb 9    │
└───────────────────────────────────────────────────────────────────────┘
```

**Incomplete required deliverables block advancement to `Pitch Scheduled`.** Same gating pattern as the thesis completeness meter.

### 3.2 File card

Each deliverable is a card, not a row of text:

```
┌────────────────────────────────────┐
│  📊  FSLR_DCF_v2.xlsx        v2    │
│      Valuation Model               │
│      ──────────────────────────────│
│      Ava Doucet · Feb 10 · 284 KB  │
│      ● Reviewed by P. Raman        │
│      ──────────────────────────────│
│      [ Preview ] [ Download ] [ ⋯ ]│
└────────────────────────────────────┘
```

### 3.3 Features to add

| Feature                     | Detail                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Actual file upload**      | Drag-and-drop zone. The current form has no file input at all.                                                                                     |
| **Version history**         | v1 → v2 → v3, with uploader and timestamp. Never overwrite silently.                                                                               |
| **In-browser preview**      | PDF, xlsx, pptx, docx. Do not force a download to read a memo.                                                                                     |
| **Template download**       | Each required deliverable offers the org's template as a starting point. Ties to Research Library templates.                                       |
| **Review state**            | `Draft` / `Submitted` / `Reviewed` / `Approved`. Reviewer from the org chart.                                                                      |
| **Inline comments**         | Comment on a specific page/cell of a memo or model.                                                                                                |
| **Auto-publish to Library** | On IC approval, the memo auto-publishes to the Research Library, tagged to FSLR + Energy & Utilities.                                              |
| **Model validation**        | Light checks on an uploaded xlsx: does it have a terminal value? A WACC cell? Are there hardcodes in formula rows? Surfaces common student errors. |

### 3.4 Pre-read pack

`[ Generate Pre-Read Pack ]` — bundles all deliverables into a single PDF for the IC meeting. Auto-attached to the meeting agenda item.

---

# TAB 4 — DISCUSSION

Currently: an empty textarea and a `Post` button. This is the most under-built tab and the one with the most pedagogical upside.

## Reframe

> **Discussion is not a comment section. It is the challenge record.**

An IC memo at a real fund gets attacked before it gets voted on. This tab should be where a nineteen-year-old learns to defend a thesis under fire — and where that defence is recorded.

### 4.1 Typed posts

Every post has a type, chosen at composition:

| Type                    | Icon | Purpose                                                      |
| ----------------------- | ---- | ------------------------------------------------------------ |
| **Question**            | ❓   | "What's the ASP assumption in 2027?" — requires an answer    |
| **Challenge**           | ⚔    | A substantive attack on the thesis — requires a **rebuttal** |
| **Supporting Evidence** | 📈   | New data that strengthens the case                           |
| **Concern**             | ⚠    | A risk not covered in the memo                               |
| **Answer**              | ↳    | Response from the analyst                                    |
| **Note**                | 💬   | Everything else                                              |

**Questions and Challenges have an open/resolved state.** The analyst must respond. Unanswered challenges surface on the pitch header and **block IC submission**.

```
┌──────────────────────────────────────────────────────────────┐
│  ⚔ CHALLENGE                                   ● UNRESOLVED  │
│  Sofia Marchetti · VP Research · 2d ago                      │
│                                                              │
│  The bear case assumes module ASPs hold at $0.31/W.          │
│  Chinese oversupply took ASPs down 22% in 2024. What         │
│  breaks if domestic content premium compresses to 15%?       │
│                                                              │
│  📎 SEIA module pricing data (pinned)                        │
│  ─────────────────────────────────────────────────────────── │
│  ▲ 6      💬 2 replies              [ Rebut ] [ Concede ]    │
└──────────────────────────────────────────────────────────────┘
```

**`Concede`** is a real, non-punitive button. An analyst who concedes a good challenge and revises the thesis should be _rewarded_, not penalized — that's the behavior the fund wants. Surface concessions positively in the rating's `M_process` score.

### 4.2 Threading & voting

- Replies nest one level
- Upvote surfaces the sharpest questions to the top — **the IC should walk into the meeting knowing the three hardest questions already**
- `@mention` a member (autocompletes from the org chart)

### 4.3 Sentiment poll (pre-IC straw poll)

```
┌──────────────────────────────────────────────────────────────┐
│  STRAW POLL — non-binding, closes at IC                       │
│                                                              │
│  Buy      ████████████░░░░░░░░  12                            │
│  Pass     ██████░░░░░░░░░░░░░░   6                            │
│  Abstain  ███░░░░░░░░░░░░░░░░░   3                            │
│                                                              │
│  21 of 35 members · You voted: Buy                            │
└──────────────────────────────────────────────────────────────┘
```

Straw poll ≠ IC vote. It surfaces where the room is before the meeting, which lets the analyst prepare for the actual objections. Genuinely useful and cheap to build.

### 4.4 Anchoring on thesis sections

A discussion post can be **anchored to a specific thesis section** — challenge the Bear case, question the Catalyst list. The Thesis tab then shows an inline marker: `⚔ 1 open challenge`.

### 4.5 Resolution summary

Before IC, auto-generate:

```
DISCUSSION SUMMARY
  12 posts · 3 challenges (2 rebutted, 1 conceded) · 5 questions (all answered)
  Open items: 1 unresolved challenge from S. Marchetti (module ASP)
  Thesis revised twice in response (v2 Feb 9, v3 Feb 11)
```

Attached to the IC pre-read.

---

# TAB 5 — PERFORMANCE _(new — appears only after `In Portfolio`)_

The pitch must not die at approval. Everything the platform's rating system needs lives here.

```
┌──────────────────────────────────────────────────────────────┐
│  ENTRY  $192.40  Feb 14        CURRENT  $211.80              │
│  ────────────────────────────────────────────────────────────│
│  Position       +10.1%                                       │
│  XLE (bench)     +3.4%                                       │
│  Excess         +6.7pp  ▲                                    │
│  ────────────────────────────────────────────────────────────│
│  Held 63d · 3.2% of AUM · Target $265 (+25.1% to go)         │
└──────────────────────────────────────────────────────────────┘

CATALYST TRACKER
  ✓ Q1 earnings          Apr 24    HIT     +4.2% 1d move
  ○ 45X guidance clarity Jul 30    PENDING
  ○ Capacity ramp        Q4 2026   PENDING

RISK REGISTER
  ○ Policy reversal          Not materialized
  ⚠ Module oversupply        MATERIALIZED — flagged by M. Chen Mar 8

FALSIFICATION CHECK
  "Below 18 GW 2026 bookings guide"  →  Guide came in at 21.4 GW ✓ intact

THESIS REVIEW                                    Due in 27 days
  Last reviewed Feb 14 (at entry)
  [ Still Buy ]  [ Trim ]  [ Exit ]  ← forced quarterly re-affirm

FLAGS                                                    2 total
  🟢 M. Chen · Catalyst hit · Med conviction · Apr 24 · ACCEPTED
  🔴 L. Vukoje · Valuation stretched · Low · May 2 · REJECTED (rebutted)
```

On exit, this becomes the **post-mortem** and the **rated match** that feeds the Ezana Rating.

---

# MOCK DATA

## Org Chart — 35 Council Members

**Structure:** President & CIO (1) → VPs (3) → Senior PMs (7, one per desk) → Junior PMs (5) → Senior Analysts (8) → Junior Analysts (8) → Quant Researchers (3, cross-desk)

### Executive

| Name                   | Role            | Reports to   |
| ---------------------- | --------------- | ------------ |
| **Noah Raymond-Leigh** | President & CIO | —            |
| **Sofia Marchetti**    | VP Research     | Noah R-Leigh |
| **Daniel Chahfe**      | VP Portfolio    | Noah R-Leigh |
| **Isabel Lim**         | VP Operations   | Noah R-Leigh |

### The 7 Sector Desks

| Desk                        | Senior PM      | Reports to    |
| --------------------------- | -------------- | ------------- |
| **Technology**              | Priya Raman    | Daniel Chahfe |
| **Healthcare**              | Marcus Chen    | Daniel Chahfe |
| **Financials**              | Lazar Vukoje   | Daniel Chahfe |
| **Energy & Utilities**      | Ava Doucet     | Daniel Chahfe |
| **Consumer**                | Tobi Adeyemi   | Daniel Chahfe |
| **Industrials & Materials** | Chloe Bergeron | Daniel Chahfe |
| **Real Estate & Comms**     | Zein Bawab     | Daniel Chahfe |

### Junior PMs (5 — on the larger desks)

| Name           | Desk       | Reports to   |
| -------------- | ---------- | ------------ |
| Hana Yoshida   | Technology | Priya Raman  |
| Elias Okonkwo  | Technology | Priya Raman  |
| Camille Fortin | Healthcare | Marcus Chen  |
| Rohan Mehta    | Financials | Lazar Vukoje |
| Nadia Haddad   | Consumer   | Tobi Adeyemi |

### Senior Analysts (8)

| Name            | Desk                    | Reports to     |
| --------------- | ----------------------- | -------------- |
| Julian Park     | Technology              | Hana Yoshida   |
| Simone Tremblay | Technology              | Elias Okonkwo  |
| Omar Farouk     | Healthcare              | Camille Fortin |
| Grace Nakamura  | Financials              | Rohan Mehta    |
| Theo Lindqvist  | Energy & Utilities      | Ava Doucet     |
| Bianca Rossi    | Consumer                | Nadia Haddad   |
| Kwame Boateng   | Industrials & Materials | Chloe Bergeron |
| Ines Delacroix  | Real Estate & Comms     | Zein Bawab     |

### Junior Analysts (8)

| Name            | Desk                    | Reports to      |
| --------------- | ----------------------- | --------------- |
| Felix Duarte    | Technology              | Julian Park     |
| Anya Kowalski   | Technology              | Simone Tremblay |
| Mateo Rivera    | Healthcare              | Omar Farouk     |
| Sana Qureshi    | Financials              | Grace Nakamura  |
| **Liam Gagnon** | Energy & Utilities      | Theo Lindqvist  |
| Yuki Tanaka     | Consumer                | Bianca Rossi    |
| Diego Salazar   | Industrials & Materials | Kwame Boateng   |
| Fatima Bello    | Real Estate & Comms     | Ines Delacroix  |

### Quant Researchers (3 — cross-desk)

| Name          | Role             | Reports to      |
| ------------- | ---------------- | --------------- |
| Viktor Petrov | Quant Researcher | Sofia Marchetti |
| Amara Nwosu   | Quant Researcher | Sofia Marchetti |
| Jonas Weber   | Quant Researcher | Sofia Marchetti |

---

## Featured Pitch — FSLR (matches the screenshots)

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| Ticker       | FSLR · First Solar                          |
| Desk         | Energy & Utilities                          |
| Direction    | Long · 12m horizon                          |
| Stage        | Screening (11 days)                         |
| Lead analyst | **Theo Lindqvist** (Senior Analyst, Energy) |
| Support      | **Liam Gagnon** (Junior Analyst, Energy)    |
| Desk PM      | **Ava Doucet** (Senior PM, Energy)          |
| Reviewers    | Ava Doucet → Sofia Marchetti (VP Research)  |
| Submitted at | $192.40                                     |
| Target       | $265 base (+37.8%)                          |
| Conviction   | 4 / 5                                       |
| Sizing ask   | 3.2% of AUM                                 |
| Benchmark    | XLE                                         |

**Short thesis:** IRA-backed backlog is under-appreciated.
**Full thesis:** Sold out through 2026 with domestic-content premium pricing.
**Why now:** 45X credits flowing; new capacity fully booked.
**Variant perception:** Street models domestic-content premium decaying to zero by 2027. We think it holds at 15–20% through 2028 because Chinese module capacity cannot qualify for 45X at any price.
**Falsification:** 2026 bookings guide below 18 GW, or domestic premium compressing below 12%.

**Scenarios**

|              | Target | Upside | Prob | Weighted   |
| ------------ | ------ | ------ | ---- | ---------- |
| Bull         | $310   | +61.1% | 25%  | +15.3pp    |
| Base         | $265   | +37.8% | 55%  | +20.8pp    |
| Bear         | $140   | −27.2% | 20%  | −5.4pp     |
| **Expected** |        |        |      | **+30.7%** |

**Catalysts**

| Catalyst                  | Date         | Status  |
| ------------------------- | ------------ | ------- |
| Q1 earnings               | Apr 24, 2026 | Pending |
| 45X guidance clarity      | Jul 30, 2026 | Pending |
| Capacity ramp (Louisiana) | Q4 2026      | Pending |

**Risks**

| Risk                         | Severity | Mitigant                                                        |
| ---------------------------- | -------- | --------------------------------------------------------------- |
| Policy reversal (IRA repeal) | High     | Backlog contracted through 2026; 45X credits vest on production |
| Module oversupply            | Medium   | Domestic content requirement insulates from Chinese ASP         |
| Execution on Louisiana ramp  | Medium   | Management track record on Ohio expansion                       |

**Comps**

|               | Mkt cap | EV/EBITDA | P/E     | Rev gr | GM%     | ROIC    |
| ------------- | ------- | --------- | ------- | ------ | ------- | ------- |
| FSLR          | $20.6B  | 11.2x     | 18.4x   | +27%   | 41.2%   | 14.1%   |
| ENPH          | $8.4B   | 14.8x     | 22.1x   | −9%    | 46.8%   | 19.3%   |
| SEDG          | $2.1B   | nm        | nm      | −31%   | 28.4%   | −4.2%   |
| RUN           | $2.8B   | 19.4x     | nm      | +4%    | 35.1%   | 2.8%    |
| NXT           | $9.2B   | 16.1x     | 26.8x   | +42%   | 31.6%   | 22.4%   |
| _Peer median_ | _$8.4B_ | _15.5x_   | _22.1x_ | _+4%_  | _35.1%_ | _14.1%_ |

**Deliverables**

| File                    | Type            | Status              | Owner          | Date   |
| ----------------------- | --------------- | ------------------- | -------------- | ------ |
| FSLR_Memo_v3.docx       | Investment Memo | ✓ Reviewed          | Theo Lindqvist | Feb 11 |
| FSLR_DCF_v2.xlsx        | Valuation Model | ✓ Reviewed          | Theo Lindqvist | Feb 10 |
| FSLR_IC_Deck.pptx       | Pitch Deck      | ✓ Submitted         | Liam Gagnon    | Feb 12 |
| Comps Sheet             | —               | ○ Required, missing | —              | —      |
| Risk Register           | —               | ○ Required, missing | —              | —      |
| FSLR_channel_checks.pdf | Optional        | ✓ Submitted         | Liam Gagnon    | Feb 9  |

**Discussion (12 posts)**

| Type        | Author                        | Content (abbreviated)                                                                                                                     | State                                                          |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ⚔ Challenge | Sofia Marchetti (VP Research) | Bear case assumes ASPs hold at $0.31/W. Chinese oversupply took ASPs down 22% in 2024. What breaks if domestic premium compresses to 15%? | **Unresolved**                                                 |
| ⚔ Challenge | Viktor Petrov (Quant)         | Position correlates 0.71 with our existing NXT holding. Effective sector concentration is higher than the 18.4% headline.                 | Rebutted                                                       |
| ⚔ Challenge | Lazar Vukoje (Financials PM)  | 18.4x P/E for a business with binary policy exposure. What's the multiple in a repeal scenario?                                           | **Conceded** — thesis revised to add a policy-repeal bear case |
| ❓ Question | Grace Nakamura (Sr Analyst)   | What's the ASP assumption in the 2027 model year?                                                                                         | Answered                                                       |
| ❓ Question | Mateo Rivera (Jr Analyst)     | How does 45X interact with the ITC — can they stack?                                                                                      | Answered                                                       |
| 📈 Evidence | Amara Nwosu (Quant)           | SEIA Q4 module pricing shows domestic premium _widening_ to 24%, not compressing.                                                         | —                                                              |
| ⚠ Concern   | Kwame Boateng (Sr Analyst)    | Louisiana ramp has slipped twice in guidance. Not modelled.                                                                               | Open                                                           |
| ↳ Answer    | Theo Lindqvist                | (×3 responses)                                                                                                                            | —                                                              |
| 💬 Note     | Ava Doucet (Desk PM)          | Sizing feels rich given policy risk — recommend 3.0% not 3.2%.                                                                            | —                                                              |

**Straw poll:** Buy 12 · Pass 6 · Abstain 3 (21 of 35 voted)

**Compliance check**

| Rule                   | Result                     |
| ---------------------- | -------------------------- |
| Market cap ≥ $500M     | ✓ $20.6B                   |
| ADV ≥ $2M              | ✓ $412M                    |
| Not on restricted list | ✓                          |
| Long only              | ✓                          |
| Position ≤ 5% AUM      | ✓ 3.2% proposed            |
| Sector ≤ 15% (soft)    | ⚠ Energy would reach 18.4% |
| Analyst conflict       | ✓ None disclosed           |

---

## Additional Pitches (for pipeline context / other detail pages)

| Ticker   | Company            | Desk        | Stage           | Analyst         | Conviction | Target | Upside        |
| -------- | ------------------ | ----------- | --------------- | --------------- | ---------- | ------ | ------------- |
| **NVDA** | NVIDIA             | Technology  | IC Vote         | Julian Park     | 5          | $210   | +18.4%        |
| **UNH**  | UnitedHealth       | Healthcare  | In Portfolio    | Omar Farouk     | 4          | $155   | +14.8%        |
| **JPM**  | JPMorgan           | Financials  | Deep Dive       | Grace Nakamura  | 3          | $290   | +11.2%        |
| **CDNS** | Cadence Design     | Technology  | Deep Dive       | Simone Tremblay | 4          | $340   | +22.6%        |
| **COST** | Costco             | Consumer    | Pitch Scheduled | Bianca Rossi    | 4          | $1,140 | +9.4%         |
| **ETN**  | Eaton              | Industrials | Screening       | Kwame Boateng   | 3          | $402   | +16.1%        |
| **PLD**  | Prologis           | Real Estate | Rejected        | Ines Delacroix  | 2          | $128   | +6.8%         |
| **ISRG** | Intuitive Surgical | Healthcare  | In Portfolio    | Mateo Rivera    | 5          | $610   | +12.3%        |
| **AXP**  | American Express   | Financials  | Exited          | Sana Qureshi    | 4          | —      | Closed +19.4% |

---

# PRIORITY

| P      | Feature                                                                                     |
| ------ | ------------------------------------------------------------------------------------------- |
| **P0** | Fix FMP 403 → migrate to `/stable/` endpoints. Supporting Data is dead without it.          |
| **P0** | Rich header: live quote, conviction, analyst/desk, stage-aware CTA, stage rail              |
| **P0** | Compliance gate strip — hard failures disable the CTA                                       |
| **P0** | Thesis: Bull/Base/Bear, Variant Perception, **Falsification**, structured catalysts + risks |
| **P0** | Deliverables: **actual file upload**, required-checklist, versioning, gating                |
| **P0** | Discussion: typed posts, **Challenge → Rebut/Concede with resolution state**                |
| **P1** | Supporting Data: comps table, financials, valuation-vs-median, pin-to-collection            |
| **P1** | Thesis completeness meter + peer review rail                                                |
| **P1** | Straw poll · discussion summary for IC pre-read                                             |
| **P1** | Performance tab (post-approval): catalyst tracker, risk register, falsification check       |
| **P2** | Version history + diff view · in-browser previews · pre-read pack generator                 |
| **P2** | Model validation on xlsx upload                                                             |

---

# THE THREE THINGS THAT MATTER

**1. Falsification.** A required field stating what would prove the thesis wrong. It converts a pitch from advocacy into a hypothesis, and it's the one thing that makes a post-mortem honest rather than retrospective.

**2. Challenge → Rebut or Concede.** Discussion is not a comment section; it's the challenge record. An unresolved challenge blocks IC submission. A concession is rewarded, not punished. This is where a nineteen-year-old learns to defend a thesis under fire — and it's the artifact no other SMIF tool produces.

**3. Gating.** Thesis completeness, required deliverables, unresolved challenges, and hard compliance rules **all block advancement.** Without gates this page is a document. With gates it's a process.
