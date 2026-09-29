# Datasets page chrome, shared and fixed

Every page under `/datasets/*` wears the same top. This file is the contract for
it. The Government Contracts page defines it today; House Financial Disclosures
adopts it unchanged; every dataset page that follows adopts it unchanged. If a
dataset page needs something different up here, that is a change to this
contract, made once, not a local override.

Build it as **one shared component** (suggested `DatasetsChrome`) that every
dataset page mounts, with the ticker items as its only variable input. Do not
copy the markup page to page.

---

## 1. The dimension bar

| Property | Value |
|---|---|
| Height | 44px |
| Background | `#064e3b`, solid, full viewport width |
| Text | `#ffffff`, Plus Jakarta Sans 13px / 500 |
| Horizontal padding | 28px |
| Left | `Home` with a left-chevron glyph, then a 40px gap |
| Centre | the seven dimension triggers, centred as a group, 18px apart |
| Right | `Log in` (ghost pill, 1px `rgba(255,255,255,.45)` border, 7px 16px) then `Sign up` (solid `#10b981`, white 700 text, 8px 16px), both `border-radius: 9999px` |

**Dimension triggers.** Each is a 6px coloured dot, the dimension name, and a
down-chevron that opens that dimension's datasets menu. The active dimension
(the one the current page belongs to) is wrapped in a pill:
`background: rgba(255,255,255,.14); padding: 6px 12px; border-radius: 9999px;
font-weight: 600`. Inactive triggers have no pill.

Dot colours, fixed and never reassigned:

| Dimension | Dot |
|---|---|
| Capitol Watch | `#6ee7b7` |
| Titans Shadow | `#c4b5fd` |
| Eyes Above | `#67e8f9` |
| Consumer Whispers | `#fcd34d` |
| The Hive | `#f9a8d4` |
| Global Empire Lighthouse | `#93c5fd` |
| Regulatory Winds | `#d9f99d` |

Both Government Contracts and House Financial Disclosures belong to Capitol
Watch, so both show that pill.

Signed in, `Log in` and `Sign up` are replaced by `Dashboard` in the ghost pill
style. Nothing else changes.

## 2. The ticker, the conveyor belt

| Property | Value |
|---|---|
| Height | 32px, directly under the dimension bar, no gap |
| Background | `#032a21`, full viewport width |
| Text | JetBrains Mono 10.5px, `letter-spacing: .06em`, uppercase labels |
| Colours | label `rgba(255,255,255,.75)`, subject `#ffffff` 600, value `#6ee7b7` 600, secondary `rgba(255,255,255,.5)` |
| Item padding | 0 18px, items separated by a 1px `rgba(255,255,255,.14)` rule |
| Motion | continuous leftward scroll, linear, about 40s for one pass of the list, paused on hover and on `prefers-reduced-motion` |
| Behaviour | every item is a link into that page's detail view |

**Item shape is per dataset; the styling is not.** Each page supplies an array
of items; the component renders them identically.

- Government Contracts: `AGENCY · RECIPIENT · $AMOUNT`, opens the award modal.
- House Financial Disclosures: `MEMBER · TICKER · BUY or SELL · bracket`, or
  `MEMBER · FILING TYPE · FILED date`, opens the trade or the filing.

The subject (recipient, member) is rendered in Plus Jakarta Sans 600 inside the
mono line, exactly as the contracts ticker does today, so proper names do not
read as code.

## 3. Below the chrome

The chrome ends at **76px** from the top of the page. Everything under it is the
page's own, on the standard white canvas, with the page's eyebrow and title
centred:

- Eyebrow: JetBrains Mono 10.5px, `.18em`, `#047857`, `DATASETS · <SOURCE>`.
  Contracts says `USASPENDING.GOV`; House says `HOUSE CLERK`.
- Title: Plus Jakarta Sans 32px / 700, `letter-spacing: -.025em`, centred.
- 28px between the chrome and the eyebrow.

A `SAMPLE DATA` chip (`#fef3c7` on `#92400e`, mono 10.5px) sits inline after
the eyebrow whenever the page is showing sample rather than live data. It is
part of the shared pattern so it looks the same everywhere.

## 4. What is deliberately not shared

The EzanaQL builder's placement, the filter rail, the metric row and everything
below are each page's own decision. Two dataset pages can lay those out
differently as long as the 76px chrome and the centred eyebrow and title match.

## 5. Acceptance for the chrome

- [ ] One component, mounted by every `/datasets/*` page, ticker items as the
      only prop that changes.
- [ ] Nav 44 + ticker 32 = 76px on every dataset page, measured.
- [ ] The active dimension pill follows the page; Contracts and House both
      light Capitol Watch.
- [ ] Dot colours match the table above on every page.
- [ ] Ticker pauses on hover and under `prefers-reduced-motion`.
- [ ] Every ticker item is a real link with an accessible name.
- [ ] Eyebrow and title are centred and use the sizes above on every page.
- [ ] Removing a local override on any dataset page changes nothing, because
      there are none.
