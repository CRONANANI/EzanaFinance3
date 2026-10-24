# Sonar: "what ranking is india in the world economy"

## What happened (Step 0)

**Why only a card list.** The query was misunderstood before anything else
ran. The spell pass corrected "ranking" to "banking" (one edit apart; "rank"
to "bank" likewise), so the understanding layer read the ping as the
_banking industry in India_ (intent `industry_country`). Banking has no
industry registry, so no industry dossier was built; and because an industry
entity was present, country and company resolution were skipped. Production
logs (Oct 24, 20:54 to 20:56 UTC, region pdx1) show three such pings
answering with `resolved: null` and only contracts and Echo in retrieval: a
thin generic brief with no dossier, so no sourced matches, no news columns,
no charts and no follow-ups. On `/datasets` the "Matching dataset cards" block
rendered ABOVE the Sonar band and independently of it, so the one keyword
card ("ranking", "economy") was the only substantial thing on screen.

**The World Bank card.** `loadFastestGrowth` (hub dataset cards) read
`lighthouseLatest('worldbank', ['NY.GDP.MKTP.KD.ZG'])`: each country's OWN
latest year, so 2025 rows ranked next to 2022 and 2011 ones. Data comes from
`lighthouse_observations` (source `worldbank`, filled weekly by
`/api/cron/ingest-worldbank`, 2000 to 2025, aggregates dropped, territories
such as Northern Mariana Islands, Guam, Puerto Rico, Hong Kong and Macao kept
unlabelled). It stores GDP per capita and real growth, but not nominal GDP
or PPP.

**Global Empire Rankings.** Public explorer at `/datasets/oecd-macro`
(`?a=<ISO3>` selects a country; the dashboard page `/empire-ranking` is
auth-gated). Data: the `country_dimension_scores_mat` matview over the
`empire_*` tables, synced by `/api/cron/sync-empire-data`; read through
`getEmpireScoresForExplorer()` (`src/lib/empire-public-store.js`). Sonar
already calls it for country pings (`buildEmpire` in
`src/lib/sonar/landing-country.js`): composite rank of N, composite score,
every pillar's score (0 to 100) and rank, strongest and weakest pillars.

**Entity resolver.** "india" resolves to `country:IN` once the spell pass no
longer rewrites "ranking". A second bug surfaced on the way: lowercase ISO3
codes matched countries ("per" in "gdp per capita" -> Peru, "can" ->
Canada); codes now match only in capitals.

**Macro endpoints.** No FMP economics endpoint is used for country GDP; the
World Bank ingest above is the only macro source. The IMF DataMapper API
could not be reached from the build sandbox (egress refused), so its
response shape could not be verified and IMF projections are not added.

## What changed

- Understanding: rank and macro words protected from the spell pass; new
  intent `country_rank` with `metric` / `metricExplicit`; "fastest growing
  economies" and "top 10 economies" are `ranking` with a metric; country
  vs country "bigger than" is a `comparison`; six few-shot examples.
- Data: `macro_countries` / `macro_indicators` (migration
  `20261025140000_macro_indicators.sql`) and a weekly importer
  (`/api/cron/macro-worldbank`, Tuesdays 05:41 UTC) for nominal GDP, PPP, GDP
  per capita (both), real growth and population, 1990 onward, aggregates and
  territories flagged. It rebuilds the `macro:rankings` dataset snapshot.
- Ranking (`src/lib/sonar/macro/rank.js`): one common year per metric (the
  newest year with >= 85% of sovereign economies reporting), aggregates never
  rank, territories excluded by default and labelled when shown, ties share a
  rank, forecasts never mix into observed ranks.
- Until the importer has run, rankings are built from the World Bank series
  already stored (GDP per capita and growth) and the panel says so.
- Briefing: the country dossier (OECD, Empire, news, Echo, markets) plus a
  rank block (KPI tiles, six charts, follow-ups) and the country's basket
  (from the repo's region -> ticker map) for 13F and Congress matches. Every
  number in the brief is checked against the rank facts and sources; a brief
  with an unsupported number is replaced by a deterministic brief built from
  the same facts.
- Cards: shown only after the briefing lands, below it, and only when the
  card has a row for the searched entity (appended and highlighted) or the
  query names its exact metric. The growth card now ranks one common year.

## India, computed from stored data (Oct 25)

Common year **2025** (182 sovereign economies, territories excluded):

- GDP per capita: **140th of 182**, $2,702 (World Bank, current US$).
- Real GDP growth: **13th of 182**, 7.6%.

Nominal GDP and PPP ranks appear after the first `macro-worldbank` run.
