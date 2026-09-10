# Handoff: Pitch Detail page (redesign)

## Overview

A redesign of the **pitch detail page** — the page that opens from Pitch Pipeline (`/pitch/[id]`). It is
the single most important object in the org (SMIF) platform: a living investment memo that carries a
pitch from **Screening → IC Vote → In Portfolio** to a scored post-mortem. Ezana **dark mode**, Stripe ×
Bloomberg. Reference file: `Pitch Detail Views.dc.html`.

The prototype presents the **shared shell once**, then **3 variants for each of the 4 tab views**. Chosen
directions to build (confirm with me if different): **Thesis `1a` · Supporting Data `2a` · Deliverables
`3a` · Discussion `4a`.** The other variants per view are alternate directions — ignore for the build
unless referenced.

## About the design file

`Pitch Detail Views.dc.html` is a **design reference in HTML/JS** — not production code to copy. Recreate
in the Ezana codebase (Next.js / React) with `theme-variables.css` tokens, Plus Jakarta Sans / JetBrains
Mono, **Lucide** icons (the inline SVGs are Lucide-equivalent). The full written spec is
`pitch-detail-page-brief.md`, bundled in this package — it is the source of truth; this README is the
build orientation.

## ⚠️ Integration notes

1. **Shared left sidebar** — the standard org Command + Tools rail (Pitch Pipeline active), reused
   across every page.
2. **Theme tokens only — no hardcoded hex.** Dark mode. Emerald = green flag / bull / positive; red
   semantic token = red flag / bear / negative; gold-champagne = achievement (Performance/exit only).
3. **Use REAL data.** Every figure, member, comp, catalyst, and post is placeholder (FSLR · First Solar;
   35-member council org chart in the brief). Bind to real pitch / org-chart / market data.
4. **P0 — fix the FMP 403 first.** Supporting Data is dead without it: migrate `/v3/` → `/stable/`
   endpoints and confirm the key's plan tier covers them. Never surface a raw HTTP code — use the
   graceful error/cached state (variant 2c).
5. **Gating is the whole point.** Thesis completeness <100%, incomplete required deliverables, unresolved
   challenges, and hard compliance-rule failures **each block advancement** and disable the stage CTA.
   Without gates this is a document; with gates it's a process.

## Shared shell (all tabs)

- **Back to Pipeline**, then a **rich header**: `FSLR · First Solar`, sector · direction · horizon, a
  **stage pill**; a **live quote strip** (price + day change, target, implied upside, **conviction dots
  1–5**, sizing ask); **analyst / desk / PM attribution** from the org chart; **days-in-stage** with a
  > 10d aging warning; and a **stage-aware primary CTA** (Screening→Advance to Deep Dive, Deep Dive→Submit
  > for IC, Scheduled→View IC Agenda, IC Vote→Open Vote, Portfolio→Update Thesis / Flag Position) + Request
  > Changes + Reject.
- **Stage progress rail:** Idea ✓ → Screening ● → Deep Dive → Scheduled → IC Vote → Portfolio.
- **Persistent compliance gate strip** above the tabs: pass checks + soft warning; a **hard failure
  disables the primary CTA**.
- **Tab bar with counts:** Thesis · Supporting Data · Deliverables (n) · Discussion (n) · **Performance**
  (appears only after In Portfolio).

## Tab 1 — Thesis (build `1a`: guided memo + review/completeness rail)

Structured, versioned, reviewable memo. Fields: Short Thesis · Full Thesis (rich text) · Why Now ·
**Variant Perception (required)** · **Falsification (required, specific)** · Target as **Bull/Base/Bear
with probabilities + weighted expected + R:R** · Catalysts as objects (name, date, status Pending/Hit/
Missed, impact) on a timeline · Risks as objects (severity, mitigant, Materialized? flag) · Valuation
(method + assumptions) · Position Sizing Ask (live compliance check). Right rail: **completeness meter
(gates advancement at 100%)** + **peer-review panel** (reviewers auto-assigned from org chart: desk Sr PM
→ VP Research → CIO). Version history with diff — "what the thesis said the day IC voted." (Alt: 1b
underwriting-panel, 1c card grid.)

## Tab 2 — Supporting Data (build `2a`: sub-tabbed workspace)

Sub-tabs **Overview / Financials / Valuation / Comps / Ownership / News**. Overview = price chart
(1D–5Y) with **pitch entry annotated** + catalyst marks, snapshot (mkt cap, EV, ADV, beta, 52w, short
int, float), and **relative performance vs sector ETF (XLE)** — benchmark-relative framing is the rating
system. Financials = 5y statements, YoY, quarterly toggle, estimates-vs-actuals beat/miss. Valuation =
multiples **current vs 5y median vs sector median**. Comps = editable table with auto-computed delta row.
Ownership, News (Marketaux, sentiment filter). **Pin-to-collection** on every chart/row/news item (fills
the Flag modal's "attach from collection"). **Error states done properly** (variant 2c) — message +
retry + staleness badge + cached data, never a raw 403.

## Tab 3 — Deliverables (build `3a`: requirement checklist)

Show the _requirement_, not just an upload box. Faculty-configured template defines required vs optional;
**completeness count gates `Pitch Scheduled`**. Per item: name, file, uploader, date, **review state**
(Draft/Submitted/Reviewed/Approved from org chart). Features: **real drag-drop upload** (none today),
**version history** (never silent overwrite), in-browser preview (pdf/xlsx/pptx/docx), template download
(ties to Research Library), inline comments, **auto-publish to Library on IC approval**, light xlsx model
validation, and **Generate Pre-Read Pack** (bundles to the meeting agenda). (Alt: 3b file-card grid, 3c
split + version history.)

## Tab 4 — Discussion (build `4a`: challenge-record feed)

**Not a comment section — the challenge record.** Typed posts chosen at compose: Question · **Challenge** ·
Supporting Evidence · Concern · Answer · Note. **Questions & Challenges have open/resolved state; the
analyst must respond — unanswered challenges surface on the header and block IC submission.** Challenge
actions: **Rebut** / **Concede** — Concede is non-punitive and rewarded in the rating's process score.
Threading (1 level), upvote-to-surface, @mention (org chart), **pre-IC straw poll** (non-binding), posts
**anchorable to a thesis section** (shows inline marker on Thesis), and an auto **discussion summary** for
the IC pre-read. (Alt: 4b feed + straw-poll rail, 4c challenge kanban.)

## Tab 5 — Performance (post-`In Portfolio`, spec in brief; build after P0/P1)

Entry vs current vs **benchmark excess (pp)**, held days, % AUM, target gap; **catalyst tracker**
(Hit/Pending with move), **risk register** (materialized flags), **falsification check**, forced
**quarterly thesis re-affirm** (Still Buy / Trim / Exit), and the **flags** raised on the position. On
exit → post-mortem + the rated match that feeds the Ezana Rating.

## Priorities (from brief)

P0: fix FMP 403; rich header (quote/conviction/stage CTA/rail); compliance gate disables CTA; Thesis
Bull/Base/Bear + Variant Perception + **Falsification** + structured catalysts/risks; Deliverables **real
upload + required checklist + gating**; Discussion typed posts + **Challenge→Rebut/Concede with state**.
P1: comps/financials/valuation-vs-median + pin-to-collection; completeness meter + review rail; straw
poll + discussion summary; Performance tab. P2: version history + diff; in-browser previews; pre-read
generator; xlsx model validation.

## Design tokens (dark — from `theme-variables.css`; never hardcode)

Surfaces: page `--bg-primary`; cards `--bg-secondary`; nested `--bg-tertiary`. Text
`--text-primary` `#f0f6fc` / `--text-secondary` / `--text-muted` / `--text-faint`. Borders
`rgba(255,255,255,.05–.08)`. Emerald `--emerald`; red `--negative`; amber `--warning` (aging/soft
compliance/conceded); blue `--info` (questions); gold `--gold` (achievement). Radius: cards 11–14, pills
999, chips 5–6. Type: Plus Jakarta Sans (UI), JetBrains Mono `tabular-nums` (all numerics, tickers,
dates). Icons: **Lucide** only, no emoji/unicode glyphs.

## The three things that matter (don't cut these)

1. **Falsification** — required, specific; converts advocacy into a hypothesis.
2. **Challenge → Rebut/Concede** — the challenge record; unresolved blocks IC; concession is rewarded.
3. **Gating** — completeness, deliverables, challenges, compliance all block advancement.

## Files

- `Pitch Detail Views.dc.html` — the prototype (shared shell + 3 variants per view). Open in a browser to
  compare directions.
- `pitch-detail-page-brief.md` — the full written spec + all FSLR mock data + 35-member org chart.
- `support.js` — prototype runtime only; not part of the production build.
