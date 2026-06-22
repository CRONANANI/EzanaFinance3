# Ezana Echo — Article Production Protocol

> **Skill purpose**: Define the exact format, structure, tone, and technical requirements for every article published on the Ezana Echo editorial platform. The gold standard template is the Iran War commodities article (`ezana-echo-article-iran-commodities-2026.js`). All articles must follow this protocol.

---

## 1. ARTICLE DATA STRUCTURE

Every article is a JavaScript module exporting a single object with these required fields:

| Field           | Type                                    | Description                                                                                                |
| --------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `id`            | `string`                                | URL-safe slug (e.g., `'africa-billion-dollar-companies-2026'`)                                             |
| `title`         | `string`                                | Full headline, 10–20 words, specific and data-driven                                                       |
| `excerpt`       | `string`                                | 2–3 sentence summary (40–60 words) with key data points                                                    |
| `heroImage`     | `{ src, alt, caption }`                 | Hero image with descriptive alt text and editorial caption                                                 |
| `contentBlocks` | `Block[]`                               | Array of content blocks (see Section 2)                                                                    |
| `entities`      | `{ people: Entity[], terms: Entity[] }` | Structured metadata for the Metadata sidebar (see Section 9). **Required as of the layout update.**        |
| `author`        | `string`                                | Author name or `'Ezana Finance Editorial'`                                                                 |
| `category`      | `string`                                | One of: `'markets'`, `'macro'`, `'geopolitics'`, `'technology'`, `'commodities'`, `'crypto'`, `'analysis'` |
| `tickers`       | `string[]`                              | Related ticker symbols (5–10 tickers)                                                                      |
| `readTime`      | `number`                                | Estimated read time in minutes (target: 8–14 minutes)                                                      |
| `publishedAt`   | `string`                                | ISO date string (YYYY-MM-DD)                                                                               |
| `featured`      | `boolean`                               | Whether to feature on the Echo landing page                                                                |
| `likes`         | `number`                                | Initial likes count (0 for new articles)                                                                   |
| `comments`      | `number`                                | Initial comments count (0)                                                                                 |
| `reads`         | `number`                                | Initial reads count (0)                                                                                    |
| `listMeta`      | `string`                                | Date string for list display (e.g., `'26 Apr 2026'`)                                                       |

---

## 2. CONTENT BLOCK TYPES

Articles use `contentBlocks` — an array of typed blocks that the `EchoArticleClient` renderer supports:

### `paragraph`

```js
{ type: 'paragraph', text: 'Body text with optional [[kw:keyword-id]]display text[[/kw]] markup and [[person:person-id]]Person Name[[/person]] markup.', anchorId: 'optional-stable-anchor' }
```

- **Volume**: 3–5 sentences per paragraph (60–120 words)
- **Tone**: Professional financial journalism — Bloomberg/FT style. Authoritative, data-driven, no hedging language. First sentence states the fact; subsequent sentences provide context and analysis.
- **Keywords**: Use `[[kw:keyword-id]]visible text[[/kw]]` to link to the Echo keyword popup system AND to mark a political/economic term that should appear (highlighted green) in the Metadata sidebar. 2–4 keywords per article maximum.
- **People**: Use `[[person:person-id]]Visible Name[[/person]]` to mark the FIRST significant mention of a notable person. This both (a) gives the mention a scroll anchor and (b) registers the person in the Metadata sidebar. Mark each person once (their first substantive mention).
- **anchorId** (optional): A stable id used as a scroll target. Auto-generated from the first `kw`/`person` in the block if omitted, but set it explicitly when an entity's canonical reference is in this block.

### `heading`

```js
{ type: 'heading', text: 'Section title', level: 2, anchorId: 'optional' }
```

- **Level 2** (`h2`) for major sections. **Level 3** (`h3`) for subsections within a section.
- **Frequency**: One h2 every 2–4 paragraphs (5–7 sections per article).
- **Style**: Lowercase except first word and proper nouns. Descriptive, not clickbait.

### `stat-grid`

```js
{ type: 'stat-grid', stats: [{ label: 'Metric name', value: '+557%', change: 'Context note' }] }
```

- **Placement**: One stat-grid near the top of the article (after the opening paragraph) summarizing key data points.
- **Count**: 3–5 stats per grid.

### `chart`

```js
{
  type: 'chart',
  variant: 'line' | 'bar' | 'horizontal-bar',
  title: 'Chart title',
  caption: 'Full description with source attribution.',
  data: [{ x: 'label', seriesKey: value }],
  series: [{ key: 'seriesKey', label: 'Display Label', color: 'var(--echo-chart-red)' }],
  annotations: [{ x: 'label', label: 'Event marker' }],  // optional
  yLabel: 'Unit label',  // optional
}
```

- **Frequency**: 2–4 charts per article. Charts are the primary visual element.
- **Variants**: `line` for time series, `bar` for comparison, `horizontal-bar` for ranked lists.
- **Colors**: Use CSS variables: `var(--echo-chart-red)`, `var(--echo-chart-orange)`, `var(--echo-chart-green)`, `var(--echo-chart-blue)`, `var(--echo-chart-purple)`. Fallback hex values in the variable definition.
- **Captions**: Always include source attribution and date range.

### `callout`

```js
{ type: 'callout', label: 'Descriptive label', value: '+557%', context: '1–2 sentence explanation.' }
```

- **Frequency**: 1–2 per article for standout data points.

### `quote`

```js
{ type: 'quote', text: 'Quoted text without quotation marks.', source: 'Speaker or publication, date' }
```

- **Frequency**: 0–2 per article. Use for analyst quotes, official statements, or research citations.

### `network-pie` (custom interactive, article-specific)

```js
{ type: 'network-pie', title: '...', caption: '...' }
```

- Used by the Peter Thiel article for the interactive figures-by-sphere donut. Component-backed; not a general chart variant.

---

## 3. ARTICLE VOLUME AND STRUCTURE

### Target Length

- **Word count**: 1,800–3,000 words (8–14 minute read time). Extended pieces (e.g., network/chronology features) may run longer; note the higher `readTime`.
- **Content blocks**: 20–35 blocks total
- **Paragraphs**: 12–20 paragraphs
- **Sections (h2)**: 5–8 sections

### Required Structure (in order)

1. **Opening paragraph** — State the core thesis with the most important data point. No preamble.
2. **Stat grid** — 3–5 key metrics summarizing the article.
3. **Section 1** — The primary story (deepest analysis, 3–5 paragraphs + chart).
4. **Section 2** — Secondary story or supporting analysis (2–3 paragraphs + chart).
5. **Section 3** — Third dimension or broader context (2–3 paragraphs).
6. **Section 4** — Downstream effects / implications (2–3 paragraphs + chart if applicable).
7. **Section 5** — Market positioning / "how to trade this" (1–2 paragraphs with specific tickers).
8. **Closing paragraph** — Forward outlook with base case / bear case framing. Reference Ezana platform tools.

### Tone Rules

- **Voice**: Third-person authoritative. No "I", no "we think", no "in my opinion."
- **Data density**: Every paragraph should contain at least one specific number, percentage, or data point.
- **No hedging**: Don't write "it seems like" or "perhaps." State the analysis directly. Use "is likely" or "the base case is" when expressing forward-looking views.
- **Accessible complexity**: Explain technical concepts inline (not in footnotes). Assume the reader is an engaged retail investor, not a Wall Street analyst.
- **No clickbait**: Headlines and section titles are descriptive and specific.

---

## 4. VISUAL REQUIREMENTS

- **Hero image**: Every article must have a hero image with `src`, `alt`, and `caption`.
- **Charts**: Minimum 2 charts per article. At least one should be a time-series line chart showing the data narrative visually.
- **Stat grid**: Exactly one, placed after the opening paragraph.
- **Callouts**: 1–2 for standout metrics that deserve visual emphasis.
- **No external embeds**: All visuals are rendered inline by the Echo renderer using SVG/Recharts. No iframes, no external images in the body.

---

## 5. REGISTRATION

After creating the article file, register it in `src/lib/ezana-echo-mock.js`:

1. Import the article: `import { articleExport } from './ezana-echo-article-[slug].js';`
2. Add to ARTICLES array: `const ARTICLES = [..., articleExport];`
3. Add to ECHO_TRENDING if it should appear in trending/bookmarks.
4. Add mock comments in ECHO_MOCK_COMMENTS_BY_ARTICLE.

---

## 6. FILE NAMING CONVENTION

```
src/lib/ezana-echo-article-[topic-slug].js
```

---

## 7. KEYWORD INTEGRATION

Articles can link to the Echo keyword popup system using inline markup:

```
[[kw:keyword-id]]display text[[/kw]]
```

Keywords are defined in `src/lib/echo-keywords.js`. Keyword-marked spans render in the Echo green accent and, on hover/click, open the keyword popup. As of the layout update, every `kw` term ALSO appears in the Metadata sidebar's "Terms" group and is click-to-scroll linked back to its in-article anchor.

If the article introduces a new concept that warrants a keyword popup, add the keyword definition there with:

- `term`: Display name
- `definition`: 2–3 sentence explanation
- `details`: Extended explanation with data
- `table` or `stats`: Optional structured data for the popup

---

## 8. ARTICLE PAGE LAYOUT (updated)

The Echo article page (`EchoArticleClient` / the article route) uses a three-zone layout. **All articles share this layout automatically** — it is implemented once in the renderer, not per article.

### Zone A — Title band (top, full attention)

- The **title and subheading (excerpt) sit at the top of the page, directly below the global top navigation bar.** No large hero gap above the title.
- The title band is horizontally **wider-margined than the body: its content max-width is ~25% narrower than the body column on each side is wide** — i.e., the title/subheading are inset further from the page edges than the body text. Concretely: if the body column is `--echo-body-max` wide, the title band uses `--echo-title-max = --echo-body-max * 0.75`, centered. This makes the title/subheading a tighter, more focused measure than the body.
- Order within the band: category pill → title → subheading/excerpt → byline + date + read time. **The ticker buttons are NO LONGER here** (they move to the Metadata sidebar).

### Zone B — Metadata sidebar (left, sticky)

- A sticky component card pinned to the **left, top-aligned directly beneath the Ezana logo** in the top nav (i.e., the card's top edge lines up under the logo, left-aligned to the same gutter).
- Contents, in order:
  1. **"Metadata" header** — the word "Metadata" is hover/click-interactive and opens a small popover explaining the personalization model (see Section 10).
  2. **Tickers** group — the ticker buttons that previously sat above the body.
  3. **People** group — every `[[person:...]]` entity, click-to-scroll to its anchor.
  4. **Terms** group — every `[[kw:...]]` term, rendered in the Echo green accent, click-to-scroll to its anchor.
- On viewports below ~1024px the sidebar collapses to a horizontal strip above the body (tickers/people/terms wrap as chips), preserving click-to-scroll.

### Zone C — Body (center/right)

- The article `contentBlocks`, rendered at `--echo-body-max` width.
- Each entity's anchor lives on the block where it is first marked, so click-to-scroll from the sidebar lands on the correct paragraph with a brief highlight pulse.

### Scroll + anchor behavior

- Clicking a person, term, or ticker in the sidebar smooth-scrolls (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) to the marked anchor and applies a short highlight pulse (`--echo-anchor-pulse`, ~1.2s, respects `prefers-reduced-motion`).
- Anchors are derived from `[[person:id]]` / `[[kw:id]]` markup; the renderer assigns `id="echo-anchor-{type}-{id}"` to the first marked occurrence.

---

## 9. ENTITIES SCHEMA (Metadata sidebar source)

Every article exports an `entities` object. The renderer cross-references these against the inline markup to build the sidebar and wire scroll anchors.

```js
entities: {
  people: [
    {
      id: 'peter-thiel',          // matches [[person:peter-thiel]] in a block
      label: 'Peter Thiel',       // display name in the sidebar
      role: 'Investor, Palantir co-founder', // one-line descriptor (optional)
    },
  ],
  terms: [
    {
      id: 'mimetic-desire',       // matches [[kw:mimetic-desire]] in a block AND echo-keywords.js
      label: 'Mimetic desire',    // display label in the sidebar (green)
    },
  ],
}
```

Rules:

- Every `id` in `entities.people` must have exactly one `[[person:id]]...[[/person]]` marked occurrence in `contentBlocks` (its scroll target).
- Every `id` in `entities.terms` should correspond to a `[[kw:id]]` occurrence and (ideally) an `echo-keywords.js` entry for the popup.
- Keep people to the notable named figures (5–15) and terms to the 2–8 political/economic concepts worth surfacing. Do not register every proper noun.
- People are listed in order of narrative importance (or first appearance); terms in first-appearance order.

---

## 10. METADATA PERSONALIZATION EXPLAINER

The "Metadata" header in the sidebar is interactive. On hover (desktop) or tap (touch), it opens a small popover with this explanation (copy is fixed; keep it accurate and non-overpromising):

> **Why metadata?** Ezana uses the people, terms, and tickers in each article as signals to tailor your experience — the news, alerts, and articles we surface next. Your affinity to a given topic strengthens the more you engage with it: reading the full article, rating it **Signal over Noise** at the end, and interacting with its charts and interactive components all increase your ties to that metadata. The goal is a feed that reflects what you actually follow, not what's loudest.

Implementation: the popover is a standard Echo popover (same component family as the keyword popup), dismissible on outside-click / Escape, `aria-describedby` wired to the trigger, keyboard-focusable.

---

## 11. QUALITY CHECKLIST

Before publishing an article, verify:

- [ ] Title is 10–20 words, specific, data-driven
- [ ] Excerpt is 40–60 words with key numbers
- [ ] Hero image has alt text and caption
- [ ] Stat grid has 3–5 metrics with context
- [ ] 5–8 sections with h2 headings
- [ ] 2–4 charts with titles, captions, and source attribution
- [ ] Every paragraph has at least one data point
- [ ] Tickers array has 5–10 relevant symbols
- [ ] Read time is calculated (words ÷ 230)
- [ ] Category is set correctly
- [ ] **`entities.people` and `entities.terms` populated; each id has a matching `[[person:id]]` / `[[kw:id]]` marked occurrence in the body**
- [ ] **Notable people marked once with `[[person:id]]`; political/economic terms marked with `[[kw:id]]`**
- [ ] Article is imported and registered in ezana-echo-mock.js
- [ ] Renders correctly in the three-zone layout (title band up top, Metadata sidebar left, body center) in light + dark mode

```

```
