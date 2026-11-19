# Ezana Branding and UI Guide

One guide for how Ezana looks and how its interface is built. Part A is the brand and design rules, for anyone drawing a screen (Claude Design, ChatGPT, a designer). Part B is the UI guide, for anyone building or rebuilding one (Claude Code, an engineer). Read both before a page is redesigned or a new page is built.

This guide replaces every earlier Ezana branding guide and design-system guide. If an older guide, a reference image, or a mock from another tool disagrees with it, this guide wins. Values were read from the live codebase (`src/app/theme-variables.css`, `src/styles/home-canvas.css`, `src/components/ds/`, the Dashboard and the top navigation). Last updated November 18, 2026.

The template for how the whole app looks is the `/home` page. The Dashboard (`/home-dashboard`) is the reference for component cards.

---

# Part A: Brand and design rules

## 1. Read this first: the rules that are broken most often

Wireframes drawn from generic dashboard habits get these wrong. Check every artboard and every build against this list.

1. **Cards are flat.** A component card has a transparent background and no border, no outline, no shadow, no rounded panel and no glow. Not in dark mode, not in light mode.
2. **The canvas runs from the Ezana logo to the logout icon.** Page content starts on the left edge of the logo and ends on the right edge of the logout icon in the top navigation bar.
3. **Card text sits on those two lines.** It is the text inside the cards that aligns to the logo and the logout icon, not an inset box around the text. Cards have no side padding at the page's outer edges.
4. **Toggles, tabs and time selectors are text only.** No track, no border, no fill. The selected option is emerald text. The others are grey text.
5. **Buttons have no outlines.** A secondary button is plain text. A primary button is a solid emerald fill with no border.
6. **Search pills have no border.** Transparent, no outline, no focus ring.
7. **No header block at the top of a page.** No eyebrow, no big title, no intro sentence. Go straight to the content.
8. **Bootstrap Icons only.** No other icon set, no emoji, no company logos.
9. **No em dashes anywhere.** Use a comma, a period, a colon or parentheses.
10. **No invented data.** Every number, ticker and name in a wireframe is labelled sample content, and nothing is drawn that the product has no data for.
11. **Nothing drawn ever sits on text.** A selection bar, a rule, a wash, a border or an icon never touches or overlaps a label. See section 6.6.
12. **Every dropdown is the Ezana standard dropdown.** A frosted, fully rounded trigger with a chevron, a frosted menu, and the selected item in bold emerald with a check. It is the one control allowed a border and a rounded trigger on the canvas. See section 6.7.

---

## 2. Brand at a glance

|                |                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Company        | Ezana Finance. Product at ezana.world.                                                                                                                                          |
| What it is     | A financial intelligence platform for retail investors and for university student-managed investment funds.                                                                     |
| Logo           | The Walia ibex mark, in emerald. It sits in the centre of the top navigation bar, where it opens the navigation dial, 54px tall on desktop. Never the old bird or pegasus mark. |
| Primary colour | Emerald `#10b981`.                                                                                                                                                              |
| Partner colour | Gold `#d4a853`. Used on the partner version of the app in place of emerald for accents and selected states.                                                                     |
| Modes          | Dark and light. Every screen must work in both. Draw dark first unless asked otherwise.                                                                                         |
| Versions       | Retail, partner and organizational (university funds). The same canvas, card and control rules apply to all three.                                                              |
| Feel           | An institutional research terminal laid out like a broadsheet: one ground, hairline rules, dense and calm. Bloomberg and the Financial Times, not a consumer fintech app.       |
| Voice          | Authoritative, plain, data-first. Descriptive, never advice.                                                                                                                    |

---

## 3. Page canvas and alignment

This is the rule with the least tolerance. Draw guides for it on every artboard.

### 3.1 The envelope

- The top navigation bar and the page content share one envelope: a maximum width of 1600px, centred, with 32px of padding on each side.
- At a 1440px-wide artboard the content runs from x = 32 to x = 1408 (1376px wide). At 1920px it is 1536px wide and centred.
- The navigation bar is 64px tall. Page content starts 24px below it.
- A page never narrows the envelope again. No inner max-width, no extra side padding on the page root.

### 3.2 The two alignment lines

- **Left line:** the left edge of the navigation bar's envelope, where the Ezana logo sat until it moved to the centre of the bar (Nov 18, 2026). Page content did not move. Wherever this guide says "the left edge of the logo", read this line.
- **Right line:** the right edge of the logout icon. This is the edge of the icon glyph itself, not of its 44px tap area. The glyph is about 22px wide and sits flush on the right line.

Everything on the page lives between these two lines, in the retail, partner and organizational versions.

### 3.3 Card text on the lines

- The left-most text on the page (card titles, the first table column, the first KPI, labels) starts exactly on the left line.
- The right-most text or control (the last table column, a "Custom" label, a count, a right-aligned button) ends exactly on the right line.
- Cards therefore have **zero side padding** at the outer edges of the page.
- The first and last columns of a table drop their outer cell padding, so the header text and the cell text are flush with the card.
- A text-only control that ends a card header (a time selector, "Custom") is flush by its label, not by its invisible hit area.
- A filled button (for example Trade) is flush by the edge of its fill.

### 3.4 Space between cards

Because cards have no fill and no side padding, whitespace does the separating.

- Side-by-side cards: 64px between them.
- Stacked cards and rows: 20px between them, with 20px of padding above and below each card's content.

### 3.5 The side column

A page with a side column (an order ticket, a watchlist rail) splits it from the main content with **one vertical rule**.

- The rule runs the full height of the page content, not just the height of the side cards.
- There is 24px of clear space between the rule and the side column's text. The rule never touches text (rule 11).
- On the Watchlist page the rule is emerald (`--emerald`). On other pages it is the grey hairline until the owner asks for emerald there too.
- When the columns stack on a narrow screen, the vertical rule is removed and becomes a horizontal rule above the side column, with 16px of space under it.

### 3.6 What is allowed to break the canvas

- Modals, drawers, menus, tooltips and popovers.
- The inside of a chart (axis labels keep their own small inset).
- Reading columns: an Echo article body is set to a reading width, not the full canvas.
- Sonar, which is a full-bleed dark surface. Its results still align to the logo and the logout icon.

---

## 4. Component cards

### 4.1 The card

| Property           | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| Background         | Transparent. The page ground shows through. No grey fill, no green tint. |
| Border and outline | None.                                                                    |
| Shadow and glow    | None. No accent glow in a corner, no emerald-outlined "featured" card.   |
| Corner radius      | 0. There is no panel to round.                                           |
| Side padding       | 0 at the page's outer edges (section 3.3).                               |
| Vertical padding   | 20px.                                                                    |
| Hover              | No lift, no glow, no border change.                                      |

A card is defined by its title and by whitespace. Nested tiles inside a card (stat tiles, event tiles, an index box) are flat too.

### 4.2 Card header

- Title on the left: 18px, weight 700, primary text colour.
- Controls on the right: a time selector, a filter, a link button.
- An optional small info icon after the title (`bi-info-circle`) carries explanatory copy in a tooltip. Do not print explainer paragraphs under titles.
- A single straight hairline above or under the header is allowed (the `/home` pattern). The Dashboard leaves it out. Never draw a box, and never let the hairline curve at its ends.

### 4.3 Hairlines are the only lines

Use a 1px hairline (primary text colour at about 7 to 10 percent opacity) for:

- the rule above or under a card header, when used,
- the rule under a table header and between table rows,
- dividers between cells of a stat strip,
- the vertical rule before a side column (emerald on Watchlist, section 3.5).

Hairlines divide content. They never enclose it.

### 4.4 What keeps a solid surface

Overlays only: modals, dropdown menus, popovers, tooltips, toasts and the mobile menu. They sit above the page, so they keep a solid background, a border and a shadow.

---

## 5. KPI strips and stat tiles

- A KPI strip is compact: about 48px tall, not a row of tall boxes.
- It is only as wide as its content. It does not stretch to fill the row, and page-level action buttons share its row on the right.
- Each KPI: a 28px icon tile, a 12px grey label, an 18px value in the mono font. Cells are separated by vertical hairlines.
- The first KPI starts on the left line.
- Headline metric tiles with a sparkline (for example Bitcoin, Ethereum, Total market cap, Fear and Greed) are about 85px tall: label row on top, the value and its change line stacked on the left, a small sparkline (about 84 by 28) on the right. No coloured corner glow.

---

## 6. Controls

### 6.1 Time period selectors

Applies to every time selector in the app.

- Each period is a plain text button: transparent, no border, no outline, no pill, no grey track behind the group.
- The selected period is **emerald text only** (gold on the partner version). No fill behind it.
- Unselected periods are grey text that darkens on hover.
- Labels are short caps in the mono font, 12px: `1D 1W 1M 3M 6M 1Y 3Y 5Y 10Y ALL`. Use only the ranges the screen needs.
- **Custom** sits at the end of the row: a calendar icon (`bi-calendar3`) and the word "Custom", both always emerald, with no border.

### 6.2 Toggles, segmented controls and tabs

Same treatment as time selectors: text only, no track, no border, no dividers, no fill. Selected is emerald text, the rest grey. This covers view switches (Company / Industry / Portfolio), asset class switches (Crypto / Commodities), Gainers / Losers, filter tabs and tab rows inside cards.

An icon next to a label takes the label's colour: emerald when selected, grey when not.

### 6.3 Buttons

| Kind        | Look                                                                                              | Examples                                    |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Primary     | Solid emerald fill, white text, **no border**, 8px radius. No hover glow, no lift. One per group. | Trade, Add asset, Review order, Place order |
| Secondary   | Plain text, transparent, **no border**. Primary text colour, emerald text on hover.               | Create list, Deposit funds, Export, Cancel  |
| Text link   | Emerald text, optional trailing arrow.                                                            | View all courses, View full portfolio       |
| Icon button | A single Bootstrap Icon, no border, no fill. Grey, primary text colour on hover.                  | Row menu (`bi-three-dots-vertical`), star   |
| Destructive | Plain text in the negative colour, confirmed in a modal.                                          | Reset portfolio, Delete                     |

- Never draw an outlined ("ghost") button.
- Buttons on a page are compact: about 30 to 36px tall, 13px semibold text.
- A leading icon sits 6px before the label and takes the label's colour.
- One primary button per group. If two actions compete, one of them is a text button.
- A row of page actions reads: text buttons first, the primary button last, on the right line.

How to build each one is in section 21.

### 6.4 Search pills

Every search field in the app uses the US Equities search pill.

- No border, no outline, no fill, no shadow, at rest, on hover and when focused. The only focus cue is the text cursor.
- A search icon (`bi-search`) on the left, grey placeholder text, and a thin blinking bar where typing starts while the field is empty.
- Filters inside the pill, on the right, are text only: the selected one is emerald text and icon, the others are grey text and icon. No outline around the selected filter.
- A filter icon (`bi-sliders`) may sit at the far right, borderless.

### 6.5 Focus and touch

- Nothing shows an outline at rest. Buttons, toggles and tabs still show a ring when reached with the keyboard. Note this in the handoff rather than drawing rings everywhere.
- Touch targets are at least 44px on phones, even when the visible label is smaller.

### 6.6 Selection, and keeping marks off text

Rule 11 in full. Because text is flush with the canvas lines and with column edges, anything drawn at an edge lands on the text unless it is given room.

- **A selected row in a list is emerald text. Nothing else.** No accent bar on its left, no wash behind it. This is the rule for list rows, menu-like rows and side-column rows, where the label starts at the column edge.
- **No accent bar on any row whose text is flush with the row's edge.** A 2px bar at x = 0 and text at x = 0 overlap. This is the fault the Watchlist "My watchlists" card had.
- **A wash is only allowed where the row has its own padding.** A selected table row may carry a faint emerald wash, because table cells are padded. The wash must extend at least 12px past the text on both sides, or it is not used.
- **A rule beside text keeps its distance.** A vertical rule has at least 24px of clear space before the text it sits next to. A horizontal rule has at least 12px above or below.
- **Icons and badges do not crowd labels.** At least 6px between an icon and its label, 8px between a label and a badge or count.
- **Long labels truncate, they do not collide.** A label that would run into the control beside it ends in an ellipsis and shows the full text in a tooltip.

If a mock shows any mark touching a label, it is wrong, whatever tool drew it.

### 6.7 Dropdowns (the standard, Nov 2026)

Every dropdown in the app (a field that picks one value from a list) uses one design, built as `EzDropdown` (`src/components/ui/ez-dropdown.jsx`, styles in `src/styles/ez-dropdown.css`, loaded app-wide).

**Trigger**

- Fully rounded (`var(--radius-xl)` on a 36px control), a 1px border at 14% of the text colour, a translucent ground (60% of the page ground) with a 12px backdrop blur, and `var(--shadow-sm)`.
- Label in the body sans at 14px in the text colour; a placeholder in muted grey.
- A chevron on the right in muted grey that turns over when the menu is open. An optional leading icon (Bootstrap Icons, or a flag in the language selector only).
- Hover deepens the ground slightly. Keyboard focus shows a 2px emerald ring with a 2px offset. Disabled is 55% opacity.
- Sizes: `sm` 32px, `md` 36px (default), `lg` 44px. On phones every trigger and option is at least 44px tall with 16px text, so iOS does not zoom.

**Menu**

- Opens 8px below the trigger, at least as wide as the trigger (192px minimum), aligned to its start (or end with `align="end"`).
- `var(--radius-lg)` corners, the same border, a 92% opaque ground with a 20px backdrop blur, `var(--shadow-lg)`, 4px inner padding. Scrolls past 320px (or 60% of the screen).
- Options are 36px rows with `var(--radius-sm)` hover wash. The selected option is **bold emerald text with a check on the right**; nothing else marks it. An option may carry a grey hint line under its label.
- Fades in over 0.14s with a 2px drop; no motion under reduced motion.

**Colour adapts to the page, with no props.** The component resolves the page's own tokens on itself, so it is right on light pages, dark pages, and areas that stay dark in light mode (`.force-dark-theme`, and Sonar's search shell, which maps its own ground). Never pass colours in, and never hard-code a light or dark variant.

**Behaviour.** Enter, Space or Down opens it; arrows, Home and End move; Enter or Space picks; typing a letter jumps to the next match; Escape or a tap outside closes it and focus returns to the trigger. It is announced as a combobox with a listbox.

**Native selects.** Every existing `<select>` takes the same trigger look from `ez-dropdown.css` (appearance only; its width and layout stay with the page). The open list of a native select is drawn by the browser and cannot match, so new work uses `EzDropdown`, and pages move to it as they are touched. `class="ez-native-plain"` opts a select out, for rare cases such as a select inside a third-party widget.

**Not this control.** Time period selectors stay as text buttons (6.1), toggles and tabs stay text only (6.2), and action menus ("More", row menus) use the library's `Dropdown` and `MenuItem` (section 20).

---

## 7. Colour

Wireframes may show hex values. Handoffs must name the token, because the code never uses raw hex.

### 7.1 Ground and text

| Token              | Dark      | Light     | Use                                                                |
| ------------------ | --------- | --------- | ------------------------------------------------------------------ |
| `--bg-primary`     | `#0a0e13` | `#ffffff` | Page ground and navigation bar. Cards do not get their own colour. |
| `--text-primary`   | `#f0f6fc` | `#0f172a` | Titles, values                                                     |
| `--text-secondary` | `#e2e8f0` | `#1e293b` | Body text                                                          |
| `--text-muted`     | `#8b949e` | `#64748b` | Labels, unselected controls, axis text                             |
| `--text-faint`     | `#6b7280` | `#94a3b8` | Captions, timestamps                                               |

### 7.2 Emerald

| Token             | Dark      | Light     | Use                                            |
| ----------------- | --------- | --------- | ---------------------------------------------- |
| `--emerald`       | `#10b981` | `#059669` | Primary button fill, chart line, brand         |
| `--emerald-text`  | `#34d399` | `#047857` | Emerald used as text: selected controls, links |
| `--emerald-hover` | `#059669` | `#047857` | Primary button hover                           |

Emerald means two things only: positive or growing, and interactive (selected, hover, primary action). Do not use it as decoration, as a card tint or as a card border. The one structural use is the Watchlist side-column rule (section 3.5).

### 7.3 Gold, status and accents

| Token                    | Dark      | Light                 | Use                                                          |
| ------------------------ | --------- | --------------------- | ------------------------------------------------------------ |
| `--gold` / `--gold-text` | `#d4a853` | `#b8922f` / `#92731d` | Partner accent and selected states, the "Paper account" pill |
| `--positive`             | `#10b981` | `#059669`             | Gains                                                        |
| `--negative`             | `#ef4444` | `#dc2626`             | Losses, logout icon, destructive text                        |
| `--warning`              | `#fbbf24` | `#d97706`             | Cautions, caps being approached                              |
| `--cyan`                 | `#06b6d4` | same                  | Live data indicator                                          |
| `--purple`               | `#a78bfa` | same                  | Tertiary chart series                                        |

Colour is never the only signal. A gain or loss always carries a plus or minus sign. A warning always carries an icon and words.

---

## 8. Typography

| Family                          | Token          | Use                                                                                                                                |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Plus Jakarta Sans               | `--font-sans`  | All interface text: titles, labels, body, buttons, navigation                                                                      |
| JetBrains Mono, tabular figures | `--font-mono`  | Every number a user reads at a glance: prices, percentages, quantities, dates in tables, tickers, time-selector labels, axis ticks |
| Newsreader                      | `--font-serif` | Ezana Echo headlines only                                                                                                          |

Do not use Space Grotesk, IBM Plex Mono, Inter or any other family.

| Element                  | Size       | Weight     | Notes                            |
| ------------------------ | ---------- | ---------- | -------------------------------- |
| Card title               | 18px       | 700        | Slightly tight tracking          |
| Section heading          | 22px       | 700        |                                  |
| Body                     | 14 to 15px | 500        |                                  |
| Caption, KPI label       | 12px       | 500        | Grey                             |
| Caps label, table header | 11px       | 600        | Uppercase, tracking 0.08em, grey |
| Large value              | 24 to 36px | 600 to 700 | Mono                             |
| KPI value                | 18px       | 600        | Mono                             |
| Table value              | 13 to 14px | 500 to 600 | Mono                             |

Number rules:

- Money shows two decimals (`$4,919,865.21`). Whole-dollar figures are a drawing shortcut and should not be used. Large headline values may be compact (`$4.92M`).
- Changes are signed: `+9.33%`, `-0.92%`, `+$419,865.21`.
- Missing values read `N/A`. Never a dash, never a zero, never a made-up figure.

---

## 9. Tables

- No fill on the header row. Header labels are 11px caps in grey over one hairline.
- Rows are separated by hairlines. No zebra striping, no cell borders.
- Text columns are left-aligned. Number columns are right-aligned in the mono font.
- Tickers are mono and semibold. Company names are sans.
- The first and last columns are flush with the card edges (section 3.3).
- A row hover is a very faint wash (primary text at about 3 percent). A selected row may use a faint emerald wash, under the conditions in section 6.6. No accent bar on the row's edge.
- A wide table scrolls sideways inside its own card. The page never scrolls sideways.
- Pagination sits in a footer line under the table: "Showing 1 to 10 of 24 holdings" on the left, page buttons on the right.

---

## 10. Charts

- Main line in emerald with a soft gradient fill fading to transparent. Losses in the negative colour.
- A benchmark or comparison line is neutral grey and dotted, so it differs by pattern as well as by colour.
- Axis ticks are 11px grey mono. Gridlines are faint and dashed. No chart border, no chart background.
- A donut is centred in its card, with its total in the middle and its legend beneath. Legend rows share the row rhythm of the table beside them, and the last legend row ends level with the last table row.
- Echo articles use the Echo chart palette: blue neutral, green positive, orange watch or projected, a separate chart red for decline, purple tertiary.
- **No chart, sparkline or statistic without real data behind it.** If the product has no series for it, leave it out and say so in the handoff.

---

## 11. Icons and imagery

- Bootstrap Icons only (`bi-...`). Common ones: `bi-search`, `bi-sliders`, `bi-calendar3`, `bi-info-circle`, `bi-graph-up`, `bi-briefcase`, `bi-wallet2`, `bi-bar-chart-line`, `bi-download`, `bi-pencil`, `bi-arrow-right`, `bi-check-lg`, `bi-exclamation-triangle`, `bi-box-arrow-right` (logout), `bi-gear-fill` (settings), `bi-person-circle` (profile).
- Icons take the colour of the text beside them.
- No company logos. A ticker is shown as text, or as a small letter tile.
- No emoji and no decorative glyphs in copy.
- No photography or illustration inside the app. Echo articles are the exception.

---

## 12. Navigation bar

Draw it as it is. Do not redesign it inside a page wireframe.

- **Left:** the notifications bell and the checklist icon.
- **Centre:** the Ezana logo, on the bar's centre line. There are no section buttons in the bar. The logo opens the navigation dial (`NavDial`, `src/components/Layout/NavDial.jsx`): a radial menu with the logo at its hub and one wedge per section (Dashboard, Research, Trading, Sonar, Watchlist, Community, Learning Center). Research and Trading swap the ring for their own pages, and the hub then steps back. The dial is an overlay, so it keeps a solid ground, a hairline and a shadow.
- **Right:** profile, settings, logout (in the negative colour). The logout glyph's right edge is the right alignment line.
- 64px tall, on the same ground as the page, with one hairline beneath it.

---

## 13. Page structure

- **No header block.** App pages do not open with an eyebrow, a large title and an intro sentence. The first thing under the navigation bar is content: a search pill, a KPI strip, or the first card. A hidden heading is kept for screen readers, which the build handles.
- The Dashboard's short greeting line is the one exception.
- Page-level actions sit on the first content row, right-aligned, not in a separate banner.
- Order content by what the user came to do. Put the thing they act on (a ticket, a thesis, a search) above supporting detail.
- A page carries only the cards that earn their place. Do not pad the bottom of a page with summary, alert or "learn more" cards that repeat what the page already shows.

---

## 14. Copy

- No em dashes, in any text, ever. Write "3 to 5 years", not a dash range.
- Never name a data vendor, a database or any infrastructure in interface text. Describe the public source only.
- Describe, do not advise. Use "Lines up with", "Within", "Above", "Nearing", "Past". Never "should", "recommend", "good trade", "bad trade".
- Do not claim "real-time". Say when quotes were last updated.
- Sentence case for titles and buttons ("Portfolio snapshot", "View full portfolio"). Caps only for small labels and time-selector codes.
- Short labels. If a control needs a sentence to explain it, put the sentence in a tooltip.

---

## 15. States

Every card needs these drawn or described, and built:

- **Loading:** skeleton bars in the card's final layout, so nothing jumps when data arrives. No spinners.
- **Empty:** one line of copy and one action.
- **Error:** a short inline message with Retry. The rest of the page keeps working.
- **Confirmation:** destructive or irreversible actions confirm in a modal.

---

## 16. Responsive behaviour

- Side-by-side cards stack when the row is too narrow, and each stacked card spans the full canvas.
- A side column moves under the main content, and its vertical rule becomes a horizontal one (section 3.5).
- A KPI strip drops to two columns, then one. Action buttons wrap beneath it, right-aligned.
- When a centred chart and its legend stack on a wide card, both stay centred.
- Tables scroll inside their card.
- On phones the navigation bar collapses to a menu button, and the canvas keeps the same left and right padding as the bar.

---

## 17. Motion

- State changes take 0.15 to 0.2 seconds. Nothing bounces or overshoots.
- No hover lift and no glow on cards or buttons.
- Everything must still read correctly with motion turned off.

---

## 18. What a wireframe handoff must contain

1. A full-page artboard at 1440px wide with the real navigation bar and two vertical guides: logo left edge and logout icon right edge.
2. Dark mode at minimum. Light mode for any new component.
3. A token and icon map: every colour named as a token from section 7, every icon as a Bootstrap Icon name.
4. A list of what is sample content. Flag any figure that is internally inconsistent.
5. Loading, empty and error states for each new card.
6. A list of anything drawn that the product has no data for today.
7. A list of design decisions the owner may want to reverse.
8. What on the current page must keep working that the wireframe does not show.

---

## 19. Do not

- Do not draw outlined, rounded, filled or shadowed cards.
- Do not draw an emerald-outlined or glowing "hero" card.
- Do not inset card text from the logo and logout lines.
- Do not draw pill or segmented controls with a track or a filled selected state. (The standard dropdown trigger in 6.7 is the one rounded, bordered control, and only for dropdowns.)
- Do not hand-roll a dropdown, or draw one any other way than section 6.7.
- Do not draw outlined buttons or bordered search fields.
- Do not add a page title block or explainer paragraphs under titles.
- Do not put an accent bar, a rule, a wash or a border on or against text.
- Do not use any icon set other than Bootstrap Icons, or any company logo.
- Do not use any typeface other than Plus Jakarta Sans, JetBrains Mono and (Echo only) Newsreader.
- Do not use an em dash.
- Do not draw placeholder charts, sparklines or statistics.
- Do not use colour as the only signal for gain, loss or warning.
- Do not redesign the navigation bar inside a page wireframe.

---

# Part B: UI guide for building pages

Part A says what a screen looks like. Part B says what to build it from. It applies to every new page and every rebuild.

## 20. The component library

Interface elements come from `src/components/ds` (`import { Button, Modal } from '@/components/ds'`). Do not hand-roll an element the library already has.

| Need                    | Component                                                                         | Notes                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                  | `Button`                                                                          | `variant`: primary, secondary, ghost, danger. `size`: sm, md, lg. `icon`, `loading`, `block`.                                                       |
| Icon-only button        | `IconButton`                                                                      | `icon` and a required `label` (read by screen readers).                                                                                             |
| Text field              | `Input`, `Textarea`                                                               | `label`, `hint`, `error`. The label is always present, visible or hidden.                                                                           |
| Dropdown field          | `EzDropdown` (`@/components/ui/ez-dropdown`)                                      | `options`, `value`, `onChange`, `label`, `size`, `align`, `block`. The standard (6.7). `Select` remains for existing forms and takes the same look. |
| Checkbox, on/off switch | `Checkbox`, `Toggle`                                                              | `label`, `checked`, `onChange`.                                                                                                                     |
| Menu                    | `Dropdown`, `MenuItem`, `MenuDivider`                                             | `MenuItem` takes `icon` and `danger`. Use for row menus and "More".                                                                                 |
| Dialog                  | `Modal`                                                                           | `title`, `footer`, `size`. Focus trap, Escape and focus return are built in.                                                                        |
| Tabs                    | `Tabs`                                                                            | Arrow-key navigation built in. Style as text only on canvas pages (section 6.2).                                                                    |
| Table                   | `Table`, `THead`, `TBody`, `TR`, `TH`, `TD`                                       | `numeric` on `TH` and `TD` right-aligns and sets the mono font.                                                                                     |
| Number, ticker          | `NumericValue`, `Ticker`                                                          | `sign`, `decimals`, `colorize`. Use for every figure so formatting stays consistent.                                                                |
| Tooltip                 | `Tooltip`                                                                         | Carries any explanation longer than a label.                                                                                                        |
| Status label            | `Badge`                                                                           | `tone` and optional `icon`. Text plus colour, never colour alone.                                                                                   |
| Inline message          | `Alert`                                                                           | `tone`: info, success, warning, danger. Use for inline errors with a Retry action.                                                                  |
| Empty and error states  | `EmptyState`, `ErrorState`                                                        | `title`, `description`, `action`. One line and one action.                                                                                          |
| Loading                 | `Skeleton`, `SkeletonText`, `SkeletonTable`, `SkeletonChart`, `SkeletonStatStrip` | Match the final layout. `Spinner` is not used on pages.                                                                                             |
| Screen-reader-only text | `VisuallyHidden`                                                                  | For the hidden page heading and icon-only controls.                                                                                                 |

`Card`, `CardHeader`, `PageHeader` and `Eyebrow` exist in the library for overlays and legacy pages. **Do not use them on a canvas page**: cards there are flat sections (section 22) and there is no page header block (section 13).

## 21. Buttons, as built

| Kind        | Build it with                                                                                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary     | `<Button variant="primary" icon="bi-plus-lg">Add asset</Button>`, or a page-scoped class filled with `var(--btn-primary-bg)` and `var(--btn-primary-fg)`, `var(--radius-md)`, no border. |
| Secondary   | A page-scoped text button: transparent, no border, zero side padding where it sits on a canvas line, `var(--text-secondary)`, `var(--emerald-text)` on hover.                            |
| Text link   | `next/link` styled as emerald text (`var(--emerald-text)`), optional `bi-arrow-right` after the label.                                                                                   |
| Icon button | `<IconButton icon="bi-three-dots-vertical" label="Actions for clean energy" />`.                                                                                                         |
| Destructive | `<MenuItem danger>` inside a menu, or a text button in `var(--negative)`. Always confirmed in a `Modal`.                                                                                 |
| In a modal  | Footer, right-aligned: a text Cancel, then one primary button. Destructive confirm uses `variant="danger"`.                                                                              |

States every button has: hover (0.15s colour change only), keyboard focus (2px ring in `var(--border-focus)`, 2px offset), disabled (55 percent opacity, not clickable), loading (`loading` prop, which also disables it).

**Known gaps between this guide and the library today.** The library predates the flat canvas, so on canvas pages do not use these as they ship:

- `Button variant="secondary"` draws a border. The guide says no outlined buttons. Use the page-scoped text button above.
- `Button variant="primary"` lifts 1px and glows on hover. The guide says no lift and no glow. Cancel both on canvas pages (`transform: none; box-shadow: none`).
- `Button variant="ghost"` shows a faint wash on hover. The guide says emerald text on hover.

The Watchlist page (`.wlm-btn`, `.wlm-btn--text`, `.wlm-btn--accent` in `src/app/(dashboard)/watchlist/watchlist.css`) is the reference for buttons built to this guide. Bringing the library itself in line is open work.

## 22. Building a card on the canvas

A card is a `<section>` with a heading and no surface.

- Give the page root the classes `dashboard-page-inset ez-canvas`, and import `@/styles/home-canvas.css` **last** among the page's CSS imports.
- Each card: a `<section aria-labelledby="...">` with an `<h2>` title. No background, border, shadow or radius.
- Prefix every class with the page's own short prefix (`wlm-`, `bs-`, `mock-`, `lc-`). No new global classes and no new global tokens.
- **Radius trap:** `src/app/terminal-theme.css` rounds every element whose class name contains `-card` to 16px. A flat card whose class contains `-card` and carries a hairline will show curved ends. Set `border-radius: 0 !important` on it, as `.wlm-card` does, or avoid `-card` in the class name.
- Selection states follow section 6.6. Never `box-shadow: inset 2px 0 0 ...` on a row whose text is flush with its edge.
- A side column carries the page's side-column class (`wl-side`, `mock-right-col`, `rc-right`) so `home-canvas.css` draws its rule and its 24px of padding.

## 23. Forms, menus and dialogs

- **Fields** always have a label. Hints sit under the field in grey. An error replaces the hint, in the negative colour, with the field marked invalid.
- **Validation** runs on submit and then live on the field that failed. The message says what to change.
- **Menus** open from an icon button or a labelled trigger, close on Escape and on outside click, and return focus to the trigger. Destructive items are last, after a divider.
- **Dropdown fields** are `EzDropdown` (section 6.7): a label above it (or `label` for screen readers when the row already names it), the selected value in bold emerald with a check inside the menu.
- **Dialogs** have one title, one primary action and a text Cancel. Destructive dialogs name what will be lost ("Delete clean energy and its 8 items?").
- **Toasts** confirm an action in one line, last about 3.5 seconds, and offer Undo for a removal (6 seconds).

## 24. Tokens to build with

Colour, type, radius and spacing come from tokens in `src/app/theme-variables.css`. Never a raw hex, and never a hex fallback inside `var()`.

| Group        | Tokens                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Text         | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-faint`                                                                             |
| Brand        | `--emerald`, `--emerald-text`, `--emerald-hover`, `--emerald-bg-subtle`, `--emerald-bg`, `--emerald-border`                                      |
| Status       | `--positive`, `--negative`, `--warning`, with `--positive-bg` and `--negative-bg` for tiles                                                      |
| Buttons      | `--btn-primary-bg`, `--btn-primary-fg`, `--btn-primary-bg-hover`                                                                                 |
| Canvas rules | `--ez-rule` (hairline), `--ez-rule-subtle` (between rows), `--ez-hover` (row hover), from `home-canvas.css`                                      |
| Focus        | `--border-focus`                                                                                                                                 |
| Radius       | `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px, `--radius-xl` 16px. Buttons and inputs use `md`. Overlays use `lg`. Cards use none.    |
| Type         | The `--type-*` ramp (card title, section, body, caption, label, value-lg, value-sm) and `--weight-regular`, `--weight-medium`, `--weight-strong` |
| Fonts        | `--font-sans`, `--font-mono`, `--font-serif`                                                                                                     |
| Shadows      | `--shadow-md` for menus, `--shadow-lg` for modals. Never on a card.                                                                              |
| Spacing      | 4, 8, 12, 16, 24, 32, 48 and 64px steps. 64px between side-by-side cards, 20px between stacked cards, 24px beside a side-column rule.            |

These tokens do not exist and must never be used: `--border-color`, `--text-tertiary`, `--mono`, `--sans`.

Charts read their presentation props from `CHART` in `src/lib/chart-theme.js`.

## 25. Accessibility

- Every control is reachable and usable with the keyboard, in a sensible order.
- Every icon-only control has a label. Decorative icons carry `aria-hidden="true"`.
- Selected and current items are marked for screen readers (`aria-current`, `aria-selected`, `aria-pressed`), not by colour alone.
- Sortable column headers are buttons and carry `aria-sort`.
- Regions that update on their own (a refreshed explainer, a toast) are announced politely.
- Text meets contrast in dark and light modes. Check the partner (gold) scope too.
- `prefers-reduced-motion` turns off transitions and skeleton animation.

## 26. Where things live

| What                              | Path                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| Design tokens                     | `src/app/theme-variables.css`                                                      |
| Component library                 | `src/components/ds/`                                                               |
| Flat canvas rules (the template)  | `src/styles/home-canvas.css`, `src/app/(dashboard)/home/`                          |
| Card reference                    | `src/app/(dashboard)/home-dashboard/`                                              |
| Buttons and side-column reference | `src/app/(dashboard)/watchlist/watchlist.css`                                      |
| Search pill reference             | The US Equities page                                                               |
| Standard dropdown                 | `src/components/ui/ez-dropdown.jsx`, `src/styles/ez-dropdown.css` (section 6.7)    |
| Chart presentation props          | `src/lib/chart-theme.js`                                                           |
| Guards                            | `npm run lint:branding`, `lint:ds`, `lint:css`, `test:page-canvas`, `test:em-dash` |

## 27. Checklist before a page ships

1. Page root is on the canvas, and `home-canvas.css` is the last CSS import.
2. Left-most and right-most text sit on the logo and logout lines at 1440px and 1920px.
3. No card has a fill, border, shadow or radius. No hairline curves at its ends.
4. Tabs, toggles and time selectors are text only, emerald when selected.
5. One primary button per group. No outlined buttons. No hover lift or glow.
6. No mark touches text: no accent bar on flush rows, 24px beside a vertical rule (section 6.6).
7. Every element comes from `@/components/ds` where the library has it.
8. Tokens only. No raw hex, no tokens from the "do not exist" list.
9. Bootstrap Icons only. No em dashes. No vendor or infrastructure names in copy.
10. Loading, empty and error states exist for every card.
11. Works in dark and light, in the partner scope, with the keyboard, and at phone width with no sideways scroll.
12. Every figure on the page is real data. Nothing is a placeholder.
13. Every dropdown is `EzDropdown` (or a native select carrying the standard look), checked in light, dark and on Sonar (section 6.7).
