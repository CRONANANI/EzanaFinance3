---
name: sonar-answer-layout
description: The one layout every Ezana Sonar answer uses (quick ping, standard and deep research) and how to add or change an answer type. Use whenever work touches how a Sonar answer is laid out, the side navigation's twelve sections, the locked deep sections, or a new founder mock-up of a Sonar answer.
---

# Sonar answer layout

Every Sonar answer is one board with a side navigation. The approved mock-ups and the rules are in
`docs/sonar/answer-templates/README.md`. Read it first, and open the template images it lists.

## Where it lives

- `src/lib/sonar/answer-sections.js`: the twelve sections (five free, seven deep), `sectionAccess`
  (who unlocks them, and the call to action for everyone else), `answerNav`, `anchorCells`, `canRender`.
- `src/components/sonar/SonarAnswerFrame.jsx`: the three-column research workspace around every
  board (left rail: Research menu, sections, deep research card; right rail via its `rail` prop).
- `src/components/sonar/SonarWorkspaceRail.jsx`: the right rail's Next steps and Related research.
- `src/components/sonar/SonarDeskSummary.jsx`: the Desk Summary card every board opens with, the
  related questions row and the loading skeleton; `SonarMarketContext.jsx` (one listed company
  against its benchmark) and `SonarAnswerQueryBar.jsx` (the centre column's query bar).
- `src/lib/sonar/answer-extras.js`: validation of the answer's `headline`, `summary`, `takeaways`
  and `related`, and the quick ping writer's trailer; `src/lib/sonar/desk-summary.js`: the card's
  view helpers. `GET /api/sonar/market-context` serves the closes.
- `src/lib/sonar/workspace.js`: next steps, follow-up context, the attachment guard, share tokens
  and the public snapshot whitelist.
- `src/lib/sonar/market-context.js`: the Market Context card's maths (subject against a benchmark).
- `src/lib/sonar/research-controls.js`: Research Controls (focus, horizon, data sources).
- Boards, each a set of cells `{ id, section, span, min, mid?, node }` packed by `boardSpans`:
  - `SonarCountryBoard` (country intelligence);
  - `SonarPingBoard` (every other quick ping);
  - `ResearchBoard` (standard and deep research).
- `src/components/sonar/useSonarPlan.js`: the reader's plan tier on the client. The research route
  also sends an `access` event with the run's depth and the reader's tier.

## Adding or changing an answer type

1. Map every card to one of the twelve section keys. Deep keys render only when
   `access.unlocked`, and the first cell of each section gets the `sa-<key>` anchor.
2. Keep the row order from the README: belt, answer and snapshot, KPI strip, findings, charts and
   data, methodology, sources.
3. Pack the rows with `boardSpans`. Never leave a lone narrow column.
4. Follow the Sonar card rule: no outlines or borders, tokens only, no em dashes, findings only.
   Data gaps stay visible on free answers.
5. Add tests in `scripts/check-sonar-answer-sections.mjs` (or the board's own check script), then
   run the design-review and a11y-review skills at 1440, 1024 and 375 px.
6. Founder rules added Nov 7 2026:
   - a country ranking's Top 5 snapshot is a dotted world map with the ranked countries lit
     (`src/lib/sonar/dot-map.js`, grid in `world-dots.js`), with the five listed under it;
   - on a finished research board, Back and the ping bar sit at the top of the sections
     column (`navTop`), never as a dark full-width bar above the answer;
   - KPI tiles are short and centred;
   - a currency answer leads its findings with computed Key findings
     (`src/lib/sonar/macro/fx-findings.js`), each linked to the chart that shows it, and never
     shows the same series in two charts.
7. When the founder sends a new mock-up, save it to `docs/sonar/answer-templates/` as
   `NN-<kind>-<subject>.webp`, add it to the README table, and record what it adds to the rules.
