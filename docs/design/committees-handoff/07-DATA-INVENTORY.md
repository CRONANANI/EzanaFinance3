# Committee Assignments: data inventory and Claude Design brief

Page: `/datasets/committees`
Status in `docs/datasets/BUILD_QUEUE.md`: `todo`
Audited against `CRONANANI/cronanani` main at `a69a1dc` and the live database on Oct 21, 2026.

Part 1 is the factual inventory of what data we hold. Part 2 is the prompt to paste into Claude Design. Every card in Part 2 is drawn only from data in Part 1. Nothing is invented.

---

## Part 1. What data we have

### 1.1 Sources

- **Committees and seats**: the congress-legislators project (House Clerk and Senate records), synced daily by `/api/cron/ingest-committees`. Last sync Oct 21, 2026.
- **Member trades**: our congressional trade disclosures (`congress_trades`, `congress_open_positions`), the same data behind Politician Tracker.
- **Committee to sector map**: an editorial map in `src/lib/congress/committee-sectors.js`, written from each committee's published jurisdiction.

User-visible attribution: "House Clerk and Senate records, via the congress-legislators project" and, where trades appear, "Periodic Transaction Reports". Never name the storage layer in UI copy.

### 1.2 Volumes (live, Oct 21, 2026)

| Dataset | Count |
| --- | --- |
| Full committees | 49 (House 23, Senate 21, Joint 5) |
| Subcommittees | 181 (House 109, Senate 72) |
| Seats (committee plus subcommittee) | 3,895 (majority 2,160, minority 1,735) |
| Distinct members holding a seat | 531 |
| Leadership titles in use | Chair, Chairman, Chairwoman, Cochairman, Vice Chair (and variants), Ranking Member, Ex Officio |
| Committees with a sector mapping | 14 |
| Congressional trades on file | 53,834 (Jun 2014 to Sep 2026) |
| Inferred open positions | 4,474 |
| Committee meetings and hearings | 118 rows, but date and committee fields are empty (see gaps) |

### 1.3 Fields

`congress_committees`: `thomas_id` (e.g. HSIF), `parent_thomas_id`, `chamber` (house, senate, joint), `name`, `url`, `jurisdiction`, `is_subcommittee`, `synced_at`.

`congress_committee_members`: `committee_thomas_id`, `bioguide_id`, `member_name`, `side` (majority, minority), `rank` (seniority order within side), `title`.

Joined in by the API: party, state, district, chamber and headshot from the members directory.

### 1.4 Sector map (editorial)

| Committee | Sectors |
| --- | --- |
| House Armed Services (HSAS), Senate Armed Services (SSAS) | Defense |
| House Energy and Commerce (HSIF) | Energy, Pharma, Providers, Tech |
| House Financial Services (HSBA), Senate Banking (SSBK) | Banks, Fintech |
| Senate Energy and Natural Resources (SSEG) | Energy, Clean energy |
| House Natural Resources (HSII) | Energy |
| House Agriculture (HSAG), Senate Agriculture (SSAF) | Agriculture |
| Senate Commerce, Science, and Transportation (SSCM) | Tech, Autos, Industrials |
| House Transportation and Infrastructure (HSPW) | Industrials, Autos |
| Senate Environment and Public Works (SSEV) | Industrials |
| Senate HELP (SSHR) | Pharma, Providers |
| House Science, Space, and Technology (HSSY) | Tech, Semis |

Wherever a sector link shows, it carries the note: "Sector links are Ezana's reading of each committee's published jurisdiction." Subcommittees inherit their parent's sectors. Tickers the map cannot place are counted as unmapped, never guessed.

### 1.5 API routes and functions already built

| Route or function | Returns | On the page today |
| --- | --- | --- |
| `/api/committees` | Every committee with subcommittees, seat counts, majority and minority split, chair and ranking member, sectors; counts; `belt` (up to 20 trades in the last 3 months by members in sectors their committees oversee); `members` list for search | Yes |
| `/api/committees/[thomasId]` | One committee: roster (name, party, side, rank, title, headshot) and subcommittees | Yes, expandable card |
| `/api/committees/member/[bioguideId]` | A member's committees and subcommittees plus their trades over 24 months in overseen sectors, with an unmapped count. `?lite=1` for chips only | Yes, By member view |
| `hub_committee_ticker_stats` (database function) | Per committee and ticker: seats, members holding the ticker, holder names, buyers and sellers since a date | Capitol hub only, not here |
| `/api/congress/meetings` | Recent hearings | Not usable yet (see gaps) |

### 1.6 Current page

Two views, "By committee" (chamber filter, accordion of committee cards with split bar, chair, ranking member, sector chips, roster on expand) and "By member" (search, member result with committee list and overseen trades). Functional, but it reads as a directory, not a dataset.

### 1.7 Honesty rules (binding on design)

1. A trade in a sector a member's committee oversees is a fact pattern, not evidence of wrongdoing. Copy never implies misconduct.
2. Sector links are editorial and always carry the note above.
3. Open positions are inferred from disclosures (bought and not fully sold), and must be labelled "inferred from disclosures".
4. Trade amounts are disclosure ranges, shown as ranges, never as point values.
5. Honest empties, no placeholder numbers.

### 1.8 Gaps

- **Hearings**: `congress_meetings` holds 118 rows with no date, committee or related bills. A hearings card can be designed, but it ships with its empty state until the ingest is fixed.
- No history of assignments over time (only the current Congress).
- No link from committees to lobbying issue areas yet.

---

## Part 2. Prompt for Claude Design

Paste everything below the line into Claude Design.

---

You are designing a new layout and a new set of component cards for the **Committee Assignments** page of Ezana Finance (ezana.world), a financial intelligence platform for retail investors and university student-managed investment funds. The page lives at `/datasets/committees` inside the Capitol dimension. It answers: **who sits where in Congress, who holds the gavel, which markets each committee oversees, and where members trade in the sectors they oversee.** It should read as a dataset, not a phone book.

Tone: Bloomberg or FT data desk. Data first, calm, neutral, never accusatory. No exclamation marks, no hype, no em dashes anywhere in copy (use commas, colons, periods or parentheses).

### Design system (non-negotiable)

- Dark mode first, light mode through tokens. Backgrounds `--bg-primary`, cards `--surface-card`, hover `--surface-card-hover`, nested `--bg-tertiary`.
- Text tokens: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-ghost`. The tokens `--border-color` and `--text-tertiary` do not exist; never use them.
- Emerald `#10b981` (`--emerald`) for positive values and every interactive hover, selected and focus state. Dark emerald `#047857` for pressed.
- Charts use the `--echo-chart-*` palette: blue neutral, green positive or live, orange watch, `--echo-chart-red` for decline, purple tertiary. Party colours must come from existing party tokens used on Politician Tracker; do not invent new reds or blues.
- No gold anywhere on this page.
- Fonts: Plus Jakarta Sans for UI text; JetBrains Mono with `tabular-nums` for numbers, tickers, dates and committee codes; never mono for prose. At most two emphasis weights per card.
- Ezana standard card (radius 12px, 1.5rem padding, header with title and uppercase muted subtitle, divider in `--border-secondary`), **with no outline border on the outside of any card** (dataset-page rule).
- Page width: the shared dataset canvas (`--marketing-shell-max`), identical to Politician Tracker, Government Contracts and Prediction Markets.
- Bootstrap Icons only. Decorative icons `aria-hidden`. Headshots fall back to initials.
- Shimmer skeletons, no spinners. Respect `prefers-reduced-motion`.
- Never mention backend infrastructure in UI copy.
- No Tailwind, no TypeScript, no shadcn. Page-scoped CSS prefix `cmx-`.

### Reference pages

Politician Tracker and Government Contracts set the aesthetic (header, chrome, ticker belt, spacing). Every card here must be unique to committees. A member click anywhere should feel continuous with the Politician Tracker member panel.

### What stays

- Shared datasets chrome. The ticker belt shows the overseen-sector trades: `MEMBER (P-ST) · BUY · TICKER · $1K–$15K · COMMITTEE` (use the range as disclosed).
- Deep links `?committee=HSIF` and `?member=BIOGUIDE` keep working.

### Global controls (sticky)

Chamber: All, House, Senate, Joint. Sector: All plus the mapped sectors. Party. Search over committees and members (one box, grouped results). View switch: Committees / Members.

### Page order (desktop)

1. Header: kicker `DATASETS · COMMITTEE ASSIGNMENTS`, title `Committee assignments`, lead, `Rosters as of {date}` in mono.
2. Sticky controls.
3. Card 1 Congress at a Glance, full width.
4. Card 2 Committee Atlas (8/12) beside Card 3 Gavels (4/12).
5. Card 4 Committee Profile, full width (opens from any committee click, default House Energy and Commerce).
6. Card 5 Oversight Map (7/12) beside Card 6 Seat Load (5/12).
7. Card 7 Trades in Overseen Sectors, full width.
8. Card 8 Committee Holdings Matrix (7/12) beside Card 9 Hearings (5/12).
9. Card 10 Member Lookup, full width.
10. Sign-up band for signed-out visitors.
11. Source line and the sector-map note.

Tablet 2 columns, phone 1 column; the Atlas becomes a list, the Matrix becomes a ranked list.

### Cards (design each one; data source in brackets)

**1. Congress at a Glance** `[/api/committees counts]`
KPI band: 49 committees, 181 subcommittees, 3,895 seats, 531 members, majority vs minority seat split as one thin proportional bar. Counts change with the chamber control.

**2. Committee Atlas** `[/api/committees]`
A visual map of all committees, not an accordion. Each committee is a tile sized by seat count, grouped by chamber, showing short name, code in mono, majority and minority split bar, subcommittee count, and sector chips if mapped. Unmapped committees are calmer in tone. Click a tile to load Card 4.

**3. Gavels** `[committee chairs and ranking members]`
Who holds power: list of chairs and ranking members by committee, each with headshot, party and state tag, and the committee code. Toggle Chairs / Ranking members. Click a person opens Card 10 for them.

**4. Committee Profile** `[/api/committees/[thomasId]]`
The selected committee in depth: name, chamber, jurisdiction text, sector chips with the editorial note, link to the official site. Roster drawn as two facing columns (majority left, minority right) ordered by rank, leadership titles badged. Subcommittees as a row of selectable chips that swap the roster. A small strip: "Members of this committee traded N times in its sectors over 24 months" linking to Card 7 filtered.

**5. Oversight Map** `[sector map]`
Committees on the left, sectors on the right, links between them (bipartite or chord). Hover a sector to highlight every committee that oversees it; hover a committee to see its sectors. Always shows the editorial note. Clicking a sector sets the page sector filter.

**6. Seat Load** `[seats per member]`
Distribution of how many seats each member holds (histogram), with the most-seated members listed beside it. Answers who is spread widest across committees.

**7. Trades in Overseen Sectors** `[belt + member route]`
A feed and a summary. Summary: trades in the window by members in sectors their committees oversee, split buy vs sell. Feed rows: date, member, party and state, side, ticker, amount range, sector, the committee that oversees it. Filter by committee, sector, side. Footnote: "A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing." Unmapped tickers counted and shown as a quiet number.

**8. Committee Holdings Matrix** `[hub_committee_ticker_stats]`
Rows: mapped committees. Columns: the most-held tickers in their sectors. Cell: members of that committee holding the ticker (inferred from disclosures), with buyers and sellers since 180 days on hover and holder names in the tooltip. Label: "Holdings inferred from disclosures."

**9. Hearings** `[/api/congress/meetings]`
Design a 14-day hearing timeline by committee, with bill chips where available. It ships with its empty state first: "Hearing schedules are not available yet." with a link to the committee's official site from Card 4.

**10. Member Lookup** `[/api/committees/member/[bioguideId]]`
Search a member: headshot, party, state and district, every committee and subcommittee as chips with rank and title, and their 24-month trades in overseen sectors as a compact timeline (dot per trade, colour by side, size by range). Link out "Open in Politician Tracker".

### States to design for every card

Loading skeleton, populated, filtered-to-empty (message names the filters), and error ("This data is unavailable right now. Try again in a moment." with Retry). Card 9 also needs its not-yet-available state as the default.

### Copy

| Where | Copy |
| --- | --- |
| Lead | Who sits on each committee in Congress, who holds the gavel, which markets each committee oversees, and where members trade in the sectors they oversee. |
| Search placeholder | Search committees or members… |
| Sector note | Sector links are Ezana's reading of each committee's published jurisdiction. |
| Source line | Source: House Clerk and Senate records via the congress-legislators project; Periodic Transaction Reports. For educational purposes only. Not financial advice. |

### Deliverables

1. Desktop (1440) and phone (390) full-page mockups, dark and light.
2. Each card at its own frame with all states.
3. A short spec per card: grid span, data fields used, interactions, empty copy.
4. An interactions list (committee click, member click, filter changes, deep links).
5. A tokens sheet using only existing tokens; flag anything that would need a new token rather than inventing one.
