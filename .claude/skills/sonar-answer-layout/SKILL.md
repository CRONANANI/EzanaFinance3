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
- `src/components/sonar/SonarAnswerFrame.jsx`: the side navigation beside every board.
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
6. When the founder sends a new mock-up, save it to `docs/sonar/answer-templates/` as
   `NN-<kind>-<subject>.webp`, add it to the README table, and record what it adds to the rules.
