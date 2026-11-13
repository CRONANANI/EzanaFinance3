# Sonar answer templates

Every Sonar answer uses the same board layout: a quick ping on `/datasets`, a standard research report, and a deep research report. This folder holds the approved mock-ups the layout is built from, and the rules every new answer type must follow.

The mock-ups come from the founder. Each one shows the ideal answer for one real question. They set the layout, not the copy or the exact numbers: every figure on a real answer comes from Sonar's own data.

| #   | Question                                                    | File                                                                                                                        | Board                                        |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 01  | Is Turkey's lira under pressure?                            | `01-country-fx-turkey-lira.webp`                                                                                            | `SonarCountryBoard` (country intelligence)   |
| 02  | Which countries produce the most crude oil?                 | `02-ranking-crude-oil-producers.webp`                                                                                       | `ResearchBoard` (standard and deep research) |
| 03  | How will Jensen Huang's resignation affect Nvidia's shares? | `03-workspace-company-event-nvidia.webp` (image pending: the handoff's `sonar-reference.png` was not in the working folder) | the shared research workspace                |

Every other quick ping (a company, a member of Congress, a sector, an industry, flows, sanctions, a commodity, an open question) uses `SonarPingBoard`, which follows the same rows.

**Adding a template:** when a new mock-up is approved, add it here as `NN-<kind>-<subject>.webp` (about 1400 px wide, WebP), add a row to the table, and note under "Per-template notes" anything it adds to the rules.

## The layout, top to bottom

1. **Sources belt** (`SonarSourceBelt`). A slow conveyor of every resource the answer used, in this order: Ezana datasets, data publishers, web pages, news. It pauses on hover, on focus and with its Pause button, and stays still under reduced motion.
2. **Desk summary | Snapshot.** The answer card is 7 of 12 columns and holds:
   - the "Desk summary" eyebrow;
   - the headline;
   - one summary paragraph;
   - up to five bullets;
   - Run deep research, top right or in the actions row;
   - the link to the charts.

   The snapshot is 5 of 12 columns. It is whatever answers the question at a glance:
   - the country card with flag, KPI tiles and sparklines (01);
   - the top 5 (02);
   - the top matches (ping board).

3. **KPI strip.** Up to four tiles across the full width, each an icon, a mono value, a label and a source line.
4. **Key findings and evidence | Coverage or team.** On free answers, findings take the full row when the right-hand card is a locked section.
5. **Charts and data.** Every chart in its own card: two across (three for country intelligence charts), and an odd last card takes the whole row. Below the charts go the map, key chart and indicators, and the table.
6. **Methodology and limitations.** This is a locked (deep) section, but data gaps always stay visible in the free Evidence and sources section.
7. **Evidence and sources.** Category pills, web pages, and "Data not available".

## Research workspace (template 03, Nov 13 2026)

Every answer (ping board, country board, research board) sits in one three-column workspace, `SonarAnswerFrame`:

- **Left rail.** The Research menu, this report's sections, and the "Run deeper research" card. It stays sticky on wide screens: the answer below is long and the section highlight depends on it.
- **Centre.** The board.
- **Right rail** (the frame's `rail` prop, `SonarWorkspaceRail.jsx`). Next steps (`nextSteps()` in `lib/sonar/workspace.js`) and Related research (only Ezana Echo articles the answer matched, and later the reader's own saved research). A card with nothing real to show is not rendered.

At mid widths the right rail drops under the board; on phones the sections become a row of chips above it. Once an answer shows on `/datasets` and `/sonar`, the workspace spans the page canvas (logo's left edge to the logout icon's right edge).

Four decisions override the design reference:

1. **Locks stay.** The left rail lists every real section; deep ones stay greyed with a lock until an unlocked deep run.
2. **No outlines** on any card.
3. **The rest of the answer stays.** Snapshot, KPI strip, findings, charts, tables and deep sections keep rendering below the answer card.
4. **Everything shown works.** A feature that needs a backend arrives with it; until then it is not on the page.

Every Next step does something real: `deep` starts deep research, `run` sends a new question through the host's own ping path (a host without one gets no `run` steps), `section` scrolls to a section this answer already has.

## Side navigation: twelve sections, five free

Source: `lib/sonar/answer-sections.js`, `SonarAnswerFrame`.

The left rail has three groups: **Research** (Current analysis, then history, saved research and the library once those pages exist), **Current report** (this answer's free sections) and **Deep research** (open on an unlocked deep run, otherwise listed with a lock). Under them, the "Run deeper research" card carries the call to action for the reader and, when deep research is available, the same cost and quota line the deep research card shows.

| Free (everyone)      | Deep (deep research on Starter or higher, or an org or partner seat) |
| -------------------- | -------------------------------------------------------------------- |
| Desk summary         | Research team                                                        |
| Key metrics          | Methodology and limitations                                          |
| Key findings         | Scenarios                                                            |
| Charts and data      | What to monitor                                                      |
| Evidence and sources | Risks and counterevidence                                            |
|                      | Relationships                                                        |
|                      | Evidence explorer                                                    |

Rules for the navigation:

- Locked sections are always listed, greyed out with a lock, legible, and not clickable or focusable.
- Locked content is not rendered on the page.
- The call to action under the locked list depends on the reader:
  - a guest gets "Sign up free";
  - a free member gets "Get the Starter plan";
  - a Starter member on a quick or standard answer gets "Run deep research".
- Each section's first card carries the anchor `sa-<key>`.

## Rules that never change

- **Sonar card rule:** no outlines and no borders. Cards are a panel surface with a soft shadow, and tiles inside a card use a row tint.
- Every row is packed edge to edge (`boardSpans` and `packDetailRows`). There is never a lone narrow column beside empty space.
- 12 columns wide, 6 at mid width, 1 on a phone, keyed off the board's own width with container queries.
- Tokens only: no hex, radii from the scale, mono for numbers, sans for prose, Bootstrap Icons.
- No em dashes. Findings only, never advice. Every figure comes from the answer's data, and any derived figure says what it is calculated from.
- Flags are SVG files from `public/flags/3x2`, never emoji.

## Per-template notes

- **01 Turkey lira.** The country card leads with the flag, then the name, currency, pressure badge and as-of date, then four KPI tiles with sparklines. "Ezana thresholds" in the breakdown opens the thresholds explainer. Yes/no questions get a one-word lead in the headline ("Yes. Pressure on the lira is elevated.").
- **02 Crude oil.** A ranking question opens with its ranking: the headline names the leader and the next four, and the snapshot shows the top five with bars. The KPI strip counts what was ranked ("215 Countries ranked"), never "companies screened" on a country question. The top 10 table shows value and share of the top ten.
