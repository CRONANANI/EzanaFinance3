<!-- Copied from the Claude Design project handoff/README.md (project https://claude.ai/design/p/696b1cc4-8200-4d21-8dfa-6299e6eee81c), read on screen with get_page_text plus PageDown. Wrapped lines re-joined. -->

# Ezana Echo, organizational version: developer handoff

Route: `/ezana-echo` (council build). Desktop 1440px, dark default, light via `.light-mode`.

The public Echo front page is unchanged in structure; the **For our council** band is inserted between the Article of the month and Latest stories and renders only for authenticated council members.

## Files

- `source/Ezana Echo Council.dc.html` — canvas board: 1a dark (admin), 1b light (member), 1c to 1e council card states, 1f to 1i overlays.
- `source/Echo Page.dc.html` — the page itself (HTML, inline styles, logic class). Props: `theme`, `councilState`, `collapsed`, `isAdmin`, `overlay`, `only`.
- `source/colors_and_type.css` — design system tokens (copied from the Ezana Finance Design System; `.light-mode` scope added so light can be applied to any element, not only `html`/`body`).
- `source/assets/` — logo and article imagery (imagery cropped from the wireframe; replace with production photography at 2x).
- `source/support.js` — runtime for opening the `.dc.html` files directly in a browser. Not needed in production.

Open `Ezana Echo Council.dc.html` in a browser to review. All styles are inline on the elements, so each block can be lifted into React/Tailwind directly.

## Layout

- Page: `width 1440`, horizontal padding `64px` (`--space-16`), content width 1312. Every section aligns to the masthead's left and right lines (logo left edge, Subscribe right edge). The hero text has no inset; the hero image ends on the right line.
- Side-by-side sections: 64px between them. Where a vertical rule separates columns it sits in the middle (32px clear space each side, minimum 24px).
- Rules: section and column rules `1px var(--border-hover)`; row dividers `1px var(--border-primary)`.

Order, top to bottom:

1. **Masthead** (72px): pegasus mark (mirrored, 34px) + "Ezana Echo" wordmark (Plus Jakarta Sans 700 22px, "Echo" in `--emerald`); six section links centered (13px 500, nowrap); search icon button, **Team Hub** text link (replaces Login), **Subscribe** primary button.
2. **Dateline**: JetBrains Mono 12px `--text-muted`.
3. **Article of the month** (440px): eyebrow (mono 12, emerald), Past picks text button, "Cover" label, Newsreader 500 44/1.08 headline, 16px dek, byline row, **Read article** primary button. Image is right-aligned at 66% width with a `--bg-primary` to transparent fade over its left 42%.
4. **For our council** band (members only)
   - Header: title (28px 700), subline, "Council members only" note, **Open in Team Hub** link, Collapse/Expand toggle.
   - Fund strip, 5 columns: council and fund value; performance since inception vs SPY; holdings; sector teams; pipeline pitches. KPI values JetBrains Mono 18px. Each figure is labelled "Sample content".
   - People and featured research row: Analysts | Portfolio managers | Featured council research (4 items).
   - Council cards, 3 x 2 grid: Echo on our names, Required reading, Pitch prep reading / My saved articles, Council reads, Sector coverage. Cards are flat: no fill, border, shadow or radius; separation is by column rules only.
5. **Latest stories**: serif title, text tabs (All, Our names, six sections), region menu and time range (24H, 7D, 1M, 3M, 1Y, ALL) on a second row, right-aligned.
6. Feature block (left) | three stacked stories with thumbnails (right).
7. Row of three.
8. **Most read**: five ranked items with read counts.
9. **More stories**: selected story | Chart of the week (SVG line chart, indexed to 100).
10. **The Evening Brief** sign-up with consent tick box.
11. Footer: logo, All stories, Write for Echo, About Ezana Echo, publisher line.

## Components

| Component        | Spec                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary button   | `background --emerald`, text `--bg-primary`, radius `--radius-md`, padding 10px 18px, 600 14px. Hover `--emerald-hover`. One per group: Subscribe (masthead), Read article (hero), Subscribe (Evening Brief), Archive (dialog). |
| Text button      | No fill, border or underline. `--text-secondary`, hover `--emerald`. Used for Past picks, Collapse, Retry, Cancel, Archive row action, all tabs and selectors.                                                                  |
| Tabs / selectors | Text only. Selected = `--emerald` text; idle = `--text-secondary` (tabs) or `--text-muted` (time range). No underline bar, pill or track.                                                                                       |
| Text field       | Borderless and transparent; envelope icon as affordance; placeholder `--text-faint`. Search opens from the masthead icon.                                                                                                       |
| Labels and chips | Plain coloured text, no boxes (Cover, Feature, section eyebrows, statuses).                                                                                                                                                     |
| Card header      | Bootstrap icon 17px + title 16/600 + 12.5px description + "Sample content" at right (11px `--text-faint`).                                                                                                                      |
| Row              | 13px; grid per card; divider `--border-primary`; hover changes text colour to `--emerald` only (no wash, no accent bar).                                                                                                        |

## Tokens used

Colour: `--bg-primary`, `--bg-deep`, `--bg-overlay`, `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`, `--text-ghost`, `--emerald`, `--emerald-hover`, `--positive`, `--negative`, `--warning`, `--border-primary`, `--border-hover`, `--chart-line`, `--chart-fill-start`, `--chart-axis`.

Type: `--font-sans` (Plus Jakarta Sans, all interface text), `--font-mono` (JetBrains Mono, every number, date, ticker, read count), `--font-serif` (Newsreader, Echo headlines only).

Radius: `--radius-sm` (skeleton bars), `--radius-md` (buttons), `--radius-lg` (menus), `--radius-xl` (dialog). Shadow: `--shadow-xl` (menus, dialog).

**Missing token:** the design system has no token for primary button text. The design uses `--bg-primary` (`#0a0e13` dark, `#ffffff` light) as a stand-in. The codebase uses `--btn-primary-fg`; add it to the design system and swap it in. Note that white on light-mode `--emerald` (`#059669`) is about 3.8:1, below 4.5:1 for 14px text; `--btn-primary-fg` should resolve to `--bg-primary` in dark and a darker emerald fill or `--text-primary` in light.

## Icons (Bootstrap Icons 1.11.3)

`bi-search`, `bi-award`, `bi-chevron-down`, `bi-chevron-up`, `bi-person-circle`, `bi-arrow-right`, `bi-arrow-up-right`, `bi-lock`, `bi-graph-up`, `bi-book`, `bi-layers`, `bi-bookmark`, `bi-journal-text`, `bi-diagram-3`, `bi-archive`, `bi-globe2`, `bi-check2`, `bi-list-ol`, `bi-envelope`, `bi-square`, `bi-check-square`.

CDN: `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css`.

Note: the design system README recommends Lucide; this page uses Bootstrap Icons by brief, which the legacy Echo surfaces already load.

## States (every council card)

- **Loaded**: rows as drawn.
- **Loading**: skeleton in final layout. Bars match each column (ticker, title, date; title plus meta line; table columns). Bars `--text-ghost` at 50% (35% for meta), radius `--radius-sm`, height 10px (8px meta). Production: pulse opacity 0.35 to 0.6, 1.2s ease-in-out; static under `prefers-reduced-motion`. `aria-hidden` on bars, `aria-busy="true"` on the card.
- **Empty**: one line in `--text-muted` plus one text action:
  - Echo on our names: "No Echo articles mention our names yet." Browse all stories
  - Required reading: "No reading assigned this week." Assign reading
  - Pitch prep reading: "No pitches in the pipeline yet." Add a pitch
  - My saved articles: "You have not saved any articles." Browse latest stories
  - Council reads: "No council research published yet." Open Resource Library
  - Sector coverage: "No sector teams set up yet." Set up sector teams
- **Error**: one line in `--negative` with role `alert` plus **Retry** (emerald text). Retry puts that card alone back into loading, then loaded.
- Missing values render `N/A` (e.g. due date, read time).

## Overlays and dialogs

- **Past picks menu** (1f): anchored under the Past picks button. 400px, `--bg-primary`, 1px `--border-hover`, `--radius-lg`, `--shadow-xl`. Rows: month (mono) + serif title; footer link "All past picks". Close on outside click and Escape; arrow keys move focus.
- **Region menu** (1g): listbox under "Region: Global". Options Global, North America, Europe, Asia Pacific, Middle East and Africa, Latin America. Selected = emerald text + check. Choosing closes the menu and filters Latest stories.
- **Admin archive confirmation** (1h): opened by the Archive text action on a Council reads row (admins only, `isAdmin`). Scrim `--bg-overlay` over the page. Dialog 440px, `--radius-xl`, `--shadow-xl`, `role="dialog"`, `aria-modal`. Title "Archive this research?"; body names the item and says it can be restored from the Resource Library. Actions: Cancel (text), Archive (primary). Focus trapped; focus returns to the row action on close.
- **Council band collapsed** (1i): header stays; body is replaced by a one-line mono summary (council, fund value, performance, holdings, pitches). Expand restores. Persist per user (localStorage key `echo.council.collapsed`).

## Interactions

- Tabs: All, Our names (articles tagged with held or pipeline tickers), then the six sections. Single select.
- Time range: 24H to ALL, single select, default 1M.
- Consent tick box: `role="checkbox"`; Subscribe is disabled until the email is valid and the box is ticked.
- Hover: links and rows change text colour to `--emerald`; primary buttons change fill to `--emerald-hover`. No transforms.

## Navigation back to the Team Hub

Echo keeps its own masthead; the app navigation bar is not added. Council members return to the Team Hub in two places:

1. **Team Hub** in the masthead, in the slot the public page uses for Login. Visible on every Echo page for signed-in council members; signed-out visitors see Login.
2. **Open in Team Hub** in the council band header, linking to the council's hub view.

Opening Echo from the Team Hub should pass `?from=team-hub` so the browser back button and these links land on the same hub tab. The pegasus logo returns to the Echo front page, not the app.

## Audit against the brand guide

The design system does not contain a separate "Ezana Branding and UI Guide" document; the audit applied the rules in the brief together with the design system README and tokens. Changes made to the wireframe:

Data and copy

1. Northfield Capital Society renamed Sample council everywhere.
2. "Peer value" corrected to "Fund value"; SPY comparison corrected to +10.08% and labelled "vs SPY".
3. Holdings list replaced with JPM, SCHW, BAC, LLY, UNH, MRK, NVDA, MSFT, AAPL, CAT, GE, HON.
4. Pipeline CRST and ENCL replaced with COST and ORCL (AVGO, COST, ISRG, ORCL).
5. "Ezana council frames" retitled Echo on our names; MDA row removed; rows now use held and pipeline tickers only (JPM, NVDA, LLY, AVGO) with article titles from Echo.
6. MOM 1M columns removed; "Sample content" placeholder columns replaced with dates or read times.
7. Team notes and Council alerts cards removed (no data source). Research articles card removed; Council reads covers Resource Library research.
8. Sector coverage: Commodities row removed (four sector teams; Selam Haile is a portfolio manager).
9. Required reading: "Due Friday" replaced with mono date "Due Nov 13"; "No due date" replaced with "Due N/A"; placeholder status replaced with "Not started".
10. Council reads now shows type (Published or Exemplar) and author; "GLP" corrected to "GLP-1".
11. Dateline weekday corrected: November 10, 2026 is a Tuesday.
12. Typos fixed: "indeved" to "indexed", "Writer for Ezana" to "Write for Echo", "Our Markets" tab to "Our names".
13. Footer line replaced with "Ezana Echo is published by Ezana Finance. Nothing here is investment advice."
14. Region menu and 24H to ALL time range restored to Latest stories.
15. Evening Brief consent tick box added.

Casing and type

16. Sentence case applied: Article of the month, Latest stories, Chart of the week, eyebrows (were all caps), meta lines ("Aug 26, 2026 · 14 min read"), cover and feature headlines. Proper names keep capitals (Team Hub, The Evening Brief, Resource Library, section names).
17. JetBrains Mono applied to every number, date and ticker in interface text: dateline, KPI values, tickers, dates, read times, read counts, Most read ranks (were serif), chart axes, time range. Serif Echo headlines keep their numerals in Newsreader by brief ("Echo keeps its serif headlines").
18. KPI values set to JetBrains Mono 18px (fund value, performance, holdings, sector teams, pitches).
19. Signed percentages: +46.73%, +10.08%.

Components

20. Council band: wireframe card fills and the Evening Brief box (fill, emerald border, radius) removed; sections are flat and separated by rules.
21. Past picks: outlined pill replaced by a text button.
22. Read article: circular icon plus outlined pill replaced by one solid emerald primary button.
23. Masthead search: circular outlined button replaced by a bare icon button.
24. Subscribe buttons: pill radius changed to `--radius-md` per the design system button spec.
25. Cover and Feature: filled chips replaced by emerald text labels.
26. Latest stories tabs: emerald underline bar under All and the grey underline under Our names removed; selected tab is emerald text only.
27. Email field: outlined pill field replaced by a borderless field.
28. Red "Due Friday" changed to `--warning`; red is reserved for errors and losses.
29. Row hover changes text colour only.

Layout

30. Hero text and all council content moved onto the masthead's left and right lines (wireframe inset the hero text and some rows).
31. Side-by-side sections spaced at 64px, with vertical rules centred (32px clear space each side). Row of three gap raised from about 26px to 64px.
32. Featured council research sub-columns given 24px clear space either side of their rules.

Icons

33. All icons are Bootstrap Icons (wireframe used mixed outline icons).

## Light mode

Same markup with `.light-mode` on the page root. Tokens switch to the design system light values (white page, `#0f172a` text, `#059669` emerald, black-alpha borders). The hero fade uses `--bg-primary`, so it fades to white.

<!-- End of README (151 editor lines read). -->
