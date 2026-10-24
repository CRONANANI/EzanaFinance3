# Sonar query understanding: audit and fix

Query: `give me a lyout of the semiconductor industry in the USA`

## What went wrong, and why

| Symptom                                                                                                   | Root cause                                                                                                                                                                                                                                                          | Where                                                                                                                   |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| The typo "lyout" was echoed in the news header, loader caption, orbital hub, dossier term and sign-up CTA | Every one of those read the raw query string (`live.query`, `lastQuery`, `shownQuery`)                                                                                                                                                                              | `SonarResearchDeck.jsx` NewsAround title; `SonarSection.jsx` loader, hub label, dossier term; `SonarExperience.jsx` CTA |
| "USA" resolved to the ticker USA (Liberty All-Star Equity Fund)                                           | `looksLikeTicker()` treated any 2 to 5 letter all-caps token as a ticker and `tickerToken()` took the first one                                                                                                                                                     | `src/lib/sonar/landing-pipeline.js`                                                                                     |
| Sports markets ("Spread: Liberty (-8.5)") in Sourced matches                                              | `matchMarkets` fell back to the first word of the resolved name ("Liberty", 5+ characters) with `question ILIKE`. `prediction_market_index.category` is null on most rows (17,275 null; Sports 437, Entertainment 83), so a category filter alone cannot catch them | `matchMarkets`                                                                                                          |
| No industry layout                                                                                        | No intent layer: a ping was a country, a politician or a company, nothing else                                                                                                                                                                                      | `runLandingPipeline`                                                                                                    |

## What changed

**Part A: understanding layer** (`src/lib/sonar/understand/`)

- `normalise` / `tokenize`, a Damerau-Levenshtein spell pass over a finance lexicon (`spell.js`) that never touches `$TICKER`, all-caps tokens, quoted text, digits or stopwords.
- Ticker guard (`blocklist.js`): country codes, US state codes and common acronyms (US, USA, UK, EU, AI, IT, CEO, GDP, ETF ...) are a ticker only with a cue (`$`, "ticker", "shares of", "13F holders of") or when the whole ping is the token.
- Geography: a token after `in / across / within / for / of / from (the)` is a place (0.95). "USA" alone stays the ticker with the country offered as a chip.
- Industry taxonomy (`lexicons.js`), sectors, themes, policies, politicians.
- Intent + display string, e.g. "Semiconductor industry in the United States".
- `corrections` drive "Showing results for X. Search instead for Y"; `ambiguities` drive chips that re-ping with `force`.
- Optional LLM pass (`SONAR_UNDERSTAND_MODEL`, 1200 ms cap) only for pings the rules leave as open questions; it never changes entities.

**Part B: relevance gating** (`src/lib/sonar/relevance.js`)

- Markets: no sports/entertainment (category or text shape), and a subject term in the question or description. No first-word fallback. Never padded.
- News columns: a subject term in the title or first 200 characters, for any ping that is not one named entity.
- 13F, Congress and markets for an industry run over the registry basket; Echo is capped at two, "From Ezana Echo".
- v2 `sweepEcho` selected `slug, title, excerpt`; `echo_articles` uses `article_*` columns, so every v2 Echo sweep was empty. Fixed.

**Part C: Industry Layout**

- Registry tables (`supabase/migrations/20261024120000_industry_registry.sql`), seeded with structure and filing-verified companies only. No numbers.
- `src/lib/sonar/industries.js` (registry reader with code-seed fallback), `landing-industry.js` (industry dossier), `industry-layout-model.js` (pure helpers).
- Ten components in `src/components/sonar/industry/IndustryLayout.jsx`, first six open, one cross-filter (stage, state, business model).
- v2: `industry_layout` template with sections Structure, Major players, Where it operates, Concentration, Capital flows, Key dependencies, What to watch.

## What still needs sourced data

`industry_metrics`, `industry_facilities` and `industry_risks` are empty by design. Until rows with `source_url`, `as_of`, scope and measure type are approved, the overview, map, positioning, pipeline, financials, risk, end-market and workforce components show "Not yet sourced for this industry". The CHIPS award importers and the admin entry area (`docs/industry-data/plan.md`) fill them.

## Tests

`npm run test:sonar-understand` (the four reported failures, the ten examples, guard rules, display snapshot, gating) and `npm run test:industry-layout`.
