# Committee Assignments, build brief

## 1. What this page is

`/datasets/committees`, Capitol Watch dimension. It answers: who sits where
in Congress, who holds the gavel, which markets each committee oversees, and
where members trade in the sectors they oversee. It reads as a dataset, not
a phone book. Audience: retail investors, journalists, SMIF students. Tone:
Bloomberg or FT data desk; calm, neutral, never accusatory; no exclamation
marks, no em dashes.

## 2. What the redesign changes

| Today                                                   | Redesign                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Two separate views (By committee accordion, By member search) | One page; the view switch reorders it, and every card is live in both views                     |
| Accordion of committee cards                              | Committee Atlas: chamber-grouped tiles sized by seat count, with split bar, code and sector chips    |
| Chair and ranking member inside each accordion card       | Gavels card: the power list with headshots, party tags and codes, Chairs/Ranking toggle              |
| Roster on expand                                          | Committee Profile card: facing majority/minority columns by rank, subcommittee chips swap the roster |
| Sector chips only                                         | Oversight Map: committees to sectors, hover highlighting, sector click filters the page              |
| No seat analytics                                         | Seat Load: histogram of seats per member plus the most-seated list                                   |
| Belt trades only                                          | Trades in Overseen Sectors: summary split buy vs sell, filterable feed, quiet unmapped count         |
| hub_committee_ticker_stats unused here                    | Committee Holdings Matrix: committees x most-held tickers, buyers and sellers on hover               |
| No hearings surface                                       | Hearings card, shipping with its honest not-yet-available state                                      |
| Member result block                                       | Member Lookup: seat chips with rank and title, 24-month trade dot timeline, Politician Tracker link  |

## 3. What stays exactly as it is

- The shared datasets chrome. The ticker belt shows overseen-sector trades
  as `MEMBER (P-ST) · BUY · TICKER · $1K-$15K · COMMITTEE`, ranges as
  disclosed.
- Deep links `?committee=HSIF` and `?member=BIOGUIDE` keep working.
- `/api/committees`, `/api/committees/[thomasId]`,
  `/api/committees/member/[bioguideId]` and the daily ingest. The only new
  server work is the three small extensions in `06-DATA.md`.
- `committee-sectors.js` as the single editorial sector map.

## 4. Page order (desktop)

1. Header: kicker `DATASETS · COMMITTEE ASSIGNMENTS`, title
   `Committee assignments`, lead, `Rosters as of {date}` in mono.
2. Sticky controls: view switch (Committees / Members), chamber, party,
   sector chips, one grouped search.
3. Card 1 Congress at a Glance, full width.
4. Card 2 Committee Atlas (8/12) beside Card 3 Gavels (4/12).
5. Card 4 Committee Profile, full width (default House Energy and Commerce).
6. Card 5 Oversight Map (7/12) beside Card 6 Seat Load (5/12).
7. Card 7 Trades in Overseen Sectors, full width.
8. Card 8 Committee Holdings Matrix (7/12) beside Card 9 Hearings (5/12).
9. Card 10 Member Lookup, full width.
10. Sign-up band for signed-out visitors.
11. Source line and the sector-map note.

Members view: the controls stay; Member Lookup moves directly under them;
the committee cards follow below unchanged.

## 5. Copy

Use these strings verbatim.

| Where                    | Copy                                                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Lead                     | Who sits on each committee in Congress, who holds the gavel, which markets each committee oversees, and where members trade in the sectors they oversee. |
| Search placeholder       | Search committees or members…                                                                                              |
| Sector note              | Sector links are Ezana's reading of each committee's published jurisdiction.                                               |
| Gavels title             | Gavels                                                                                                                      |
| Trades footnote          | A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing.                                         |
| Matrix label             | Holdings inferred from disclosures                                                                                          |
| Matrix footnote          | Open positions are inferred from disclosures (bought and not fully sold). A holding on an overseeing committee is a fact pattern, not a finding. |
| Hearings empty (default) | Hearing schedules are not available yet.                                                                                    |
| Hearings empty detail    | Dates and committees are still being ingested. Until then, each committee profile links to its official site for its calendar. |
| Every error state        | This data is unavailable right now. Try again in a moment. + Retry                                                         |
| Source line              | Source: House Clerk and Senate records via the congress-legislators project; Periodic Transaction Reports. For educational purposes only. Not financial advice. |

Empty states are built from the live filter state and name the filters.

## 6. Fixtures and people

Committee names, thomas codes, seat counts and the sector map are public
structure; use them as data. People are `[Member name]` placeholders in
every fixture, story and screenshot; covered positions in examples are
generic ("Legislative Director, Office of Sen. [Name]"). The wireframe's
trade rows pair placeholders with plausible tickers and ranges; replace
with live data, never ship them.

## 7. Constraints

- Page-scoped `cmx-` classes; tokens from `03-TOKENS.css` only. `cmx-card`
  stays on the `ds-cards.css` no-outline list.
- Plus Jakarta Sans for UI text; JetBrains Mono tabular for numbers,
  tickers, dates and committee codes. At most two emphasis weights per card.
- Bootstrap Icons only, `aria-hidden` when decorative. Headshots lazy-load
  by bioguide id with the initials fallback and a shimmer circle, exactly
  as Politician Tracker does.
- No gold. Emerald for selected, focus and majority; chart blue for
  minority and neutral bars; sells and declines in `--echo-chart-red`,
  never `--danger`.
- Shimmer skeletons, no spinners; hover 0.15s, card 0.2s; all motion off
  under `prefers-reduced-motion`.
- `npm run check:copy` stays green; never name the storage layer.
