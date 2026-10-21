# Lobbying Activity, build brief

## 1. What this page is

`/datasets/government/lobbying`, Capitol Watch dimension. It answers one
question: who is paying to influence Washington, on what, and how that
touches public companies and the people they fund. Audience: retail
investors, journalists, SMIF students. Tone: Bloomberg or FT data desk;
no exclamation marks, no em dashes, no hype.

## 2. What the redesign changes

| Today ("Influence Ledger 2a")                               | Redesign                                                                                       |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Left filter rail                                              | Sticky horizontal filter bar that drives every card and round-trips through the URL             |
| Four stat cards                                               | Influence Pulse band: five KPI tiles with YoY change vs the same period last year               |
| Donut for issues                                              | Issue Landscape: ranked share bars, click sets the page filter                                  |
| No issue-by-entity view                                       | Pressure Map heatmap, 12 issues x 10 bodies, row and column totals, cell hover with top clients |
| No time view                                                  | Quarterly Rhythm: 12 quarters, spend bars + filings line, ghost "Not yet filed" bars            |
| Revolving-door count only                                     | Revolving Door card: share of filings, firms ranked, covered positions as filed on expand       |
| CompanyCard with gold accents and Lucide icons                | Public Company Lens grid + redesigned company modal: emerald only, Bootstrap Icons, verified vs Name match badges |
| Lobbying-ratio data on the Capitol hub only                   | Lobbying vs Contracts card on this page: log-log scatter + awards-per-dollar rank               |
| LD-203 contributions: data live, no UI                        | Money to Members card: totals, tabs (honorees, committees, largest items), type chips           |
| Filings table                                                 | Disclosures table with three modes, issue chips, CSV export for signed-in users                 |

## 3. What stays exactly as it is

- The shared datasets chrome and ticker belt. The page publishes the latest
  posted filings as `CLIENT · $AMOUNT · ISSUE`.
- The filing detail modal content and its link to the original filing on
  lda.gov. Restyle to the new card system only.
- The data health footer content (per-quarter coverage), restyled to a single
  quiet mono line.
- All existing `/api/lobbying/*` routes and the ETL. New needs are the three
  aggregates in `06-DATA.md`, nothing else.
- `src/lib/lobbying/entities.js` vocabularies and `period.js` scoping.

## 4. Page order (desktop)

1. Header: kicker `DATASETS · LOBBYING ACTIVITY`, title `Lobbying activity`,
   lead, `Filings as of {date}` in mono.
2. Sticky filter bar.
3. Card 1 Influence Pulse, full width.
4. Card 2 Spend Leaderboard (7/12) beside Card 3 Issue Landscape (5/12).
5. Card 4 Pressure Map, full width.
6. Card 5 Quarterly Rhythm (6/12) beside Card 6 Revolving Door (6/12).
7. Card 7 Public Company Lens, full width.
8. Card 8 Lobbying vs Contracts (6/12) beside Card 9 Money to Members (6/12).
9. Card 10 Disclosures table, full width.
10. Sign-up band for signed-out visitors.
11. Source line and data health line.

## 5. Copy

Use these strings verbatim.

| Where                      | Copy                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Lead                       | Who pays to influence Washington, on which issues, through which firms, and how that reaches public companies and the members they fund. |
| Search placeholder         | Search clients or firms…                                                                                                   |
| Pulse spend note           | Sum of reported amounts on activity reports. Registrations carry no dollar figure.                                         |
| Issue heading              | Share of filings by issue                                                                                                   |
| Issue footnotes            | The LDA does not report dollars per issue, so this shows activity, not spend. / Filings cite several issues, so shares total more than 100%. |
| Revolving Door title       | Former officials now lobbying                                                                                               |
| Revolving Door footnote    | Positions are shown exactly as the filer wrote them. A named position is a disclosure requirement, not a finding.          |
| Lens name-match tooltip    | Matched on exact client name, not hand-verified                                                                            |
| Scatter caption            | Correlation is not causation. Both figures are public disclosures.                                                         |
| Members note               | Names as filed by the contributor.                                                                                          |
| Members dates note         | Dates outside the filing period are clamped to it; filer typos exist in the source.                                        |
| Partial chip               | 2026 Q3 is still being filed, 64% received (percent from ingest-status, never hardcoded)                                   |
| Every error state          | This data is unavailable right now. Try again in a moment. + Retry                                                         |
| Source line                | Source: Senate LDA (lda.gov). Amounts are as reported by filers. For educational purposes only. Not financial advice.      |

Empty states are built from the live filter state, naming the filters, e.g.
"No filings match these filters. Defense · Independent agencies · $10M+ · 90
days is a narrow slice; widen the period or clear the minimum."

## 6. Fixtures and people

The wireframe's client and firm names are real, publicly known top lobbying
spenders with illustrative amounts; replace them with live data, never ship
them as fixtures. People are placeholders by design: `[Name as filed]`,
`[Lobbyist name]`, `[Committee as filed]`. Never attach an invented amount
or position to a real person anywhere, including stories and screenshots.

## 7. Constraints

- Page-scoped `lbx-` classes; tokens from `03-TOKENS.css` only. `lbx-card`
  stays on the `ds-cards.css` no-outline list.
- Plus Jakarta Sans for UI text, JetBrains Mono with `tabular-nums` for every
  number, ticker and date. One sans weight plus one emphasis weight per card.
- Bootstrap Icons only, `aria-hidden` when decorative. Remove `lucide-react`
  from this page entirely.
- No gold. Emerald for selected, focus, verified and positive; declines in
  `--echo-chart-red`, never `--danger`.
- Charts hand-rolled or recharts with `CHART` from `src/lib/chart-theme.js`,
  axis ticks 11px. Loading is shimmer in the card's own shape; durations
  hover 0.15s, card 0.2s, modal 0.35s; all off under `prefers-reduced-motion`.
- `npm run check:copy` stays green: UI copy names only "Senate LDA (lda.gov)".
