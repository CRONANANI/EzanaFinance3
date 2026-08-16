# Ezana Echo — Article Authoring Checklist

Every new Echo article (`src/lib/ezana-echo-article-*.js`) MUST satisfy this
checklist before it ships. The metadata card renders the seven core categories
on **every** article; an empty core dimension shows as an em-dash in the UI and
logs a warning during the curated seed — treat that warning as a publishing
defect, not noise.

## The honesty rule (outranks everything below)

A metadata value must be justified by the article's **own text**. Never invent
an entity to fill a slot. If the article genuinely mentions no institution (for
example), leave the array empty and add a one-line code comment explaining why —
the sidebar still shows the category as an em-dash, which is the honest outcome.

## 1. Seven core metadata dimensions — non-empty

Each of these must be present and non-empty (or carry an explicit justifying
comment if honestly empty):

| Dimension      | Location            | What it holds                                         |
| -------------- | ------------------- | ----------------------------------------------------- |
| `tickers`      | top-level key       | Market symbols of companies discussed (US-listed/ADR) |
| `sectors`      | `meta.sectors`      | GICS sectors the piece is about                       |
| `industries`   | `meta.industries`   | GICS sub-industries named/implied by the text         |
| `institutions` | `meta.institutions` | Named non-government orgs/companies/labs/exchanges    |
| `geos`         | `meta.geos`         | Countries/regions in the text                         |
| `assetClasses` | `meta.assetClasses` | Equities / Commodities / Fixed Income / …             |
| `themes`       | `meta.themes`       | Cross-cutting narratives (e.g. Geopolitics)           |

Government bodies (CDC, OPEC, a central bank) belong in `meta.government`, **not**
`institutions`. An article that names only government actors may honestly leave
`institutions` empty.

## 2. Optional dimensions — fill where the text supports them

`meta.investors`, `meta.government`, `meta.datasets`, and `meta.markets` render
only when non-empty. Populate them whenever the article's text justifies it;
otherwise leave them empty (they stay hidden).

## 3. Registration steps

A new article must be registered in all of:

- The legacy mock (`src/lib/ezana-echo-mock.js`) — for any code still reading it.
- The curated seed `SOURCE` array (`src/lib/echo/curated-seed.js`).
- The subcategory / keyword maps the reader uses for `[[kw:]]` inline entities.
- Per the repo's standing preference, upsert the row into `public.echo_articles`
  via Supabase MCP so it is live immediately (see `CLAUDE.md`).

## 4. Enforcement backstop

`curated-seed.js` logs a non-fatal warning for any article missing a core
dimension:

```
[echo] curated seed: "<article-id>" has empty core metadata dims: institutions, tickers
```

This appears in Vercel logs on every seed pass. A warning for a NEW article is a
defect — fix the article module (add the text-justified value, or a justifying
comment for a defensible empty).

## 5. Figure standard: 6 to 10 figures, evenly distributed

Every published Echo article carries a **minimum of 6 and a maximum of 10
figures** from the signature catalog. Legacy `chart` blocks count toward the
total; `stat-grid`, `callout`, `quote`, and `image` blocks do not.

Figures must be **evenly distributed** through the body:

- The first figure appears in the **top third** of the article.
- **No two figures are adjacent** (at least one prose block between figures).
- **No run of more than 6 consecutive non-figure blocks** anywhere in the body.

FIG. 1 is normally the primary story figure (usually a time-series).

**Standing exception:** `ezana-echo-article-peter-thiel-2026.js` is frozen at
its 4 figures (labelled through `FIG. 5`) as an SEO-canonical page. Do not
trim it, do not extend it, and do not count it against this standard. The
enforcement script hard-codes it as an exception.

**Applies historically.** This standard governs new articles immediately, and
all previously published articles are being retrofitted to it in batches on
`feat/echo-figure-retrofit-*` branches. Until that retrofit finishes, most of
the existing catalog fails the check, which is why the check runs manually and
in retrofit QA rather than in the commit hook.

Enforcement: `npm run check:echo-figures` (or
`node scripts/check-echo-figure-count.mjs`). It exits 1 on any violation; pass
`--report` for inventory mode, which lists violations and always exits 0. The
script reads block `type:` values in source order, so it sees the real body
sequence rather than a declared count.

Beyond the original figure types, six branded chart types are available —
`radial-stack`, `variable-pie`, `bubble-field`, `multi-axis`, `tile-grid`,
`market-treemap` — with schemas and examples in `docs/ECHO_FIGURES_V2.md`. Every
figure's data must be justified by the article's own text (the honesty rule
above); never invent values to fill a chart type.

## 6. Partner byline (optional)

Paid content partners declare a top-level `partner` field on the article
module:

| Field     | Type               | Description                                              |
| --------- | ------------------ | -------------------------------------------------------- |
| `partner` | `{ name, handle }` | Content-partner byline; omit entirely for staff articles |

- `name` is the partner's full name (also used for the article's `author`
  string); `handle` (e.g. `'@stephthefounder'`) is preferred for display.
- The curated seed folds `partner` into the existing `article_meta` JSONB — no
  schema change, no dedicated column. The metadata card ignores it; the hub
  feed card renders a "PARTNER · @handle" chip on the hero image.
- Disclosure is deliberate: the chip always says "Partner" explicitly. See the
  "Partner Bylines" section in `Ezana_Echo_Skills.md` for the full standard.
