/**
 * Ezana Sonar — source-adapter contract (sonar-all-datasets spec, Step 2).
 *
 * A source adapter couples one live dataset (by its taxonomy slug) to a cheap
 * relevance pre-filter and an async search that returns cited findings. The
 * registry (./registry.js) maps the dataset taxonomy to these adapters so that
 * a new live dataset either gains an adapter or is listed, with a reason, in
 * the registry's EXCLUDED set — otherwise the coverage test fails.
 *
 * This is deliberately a thin contract over the repo's existing retrieval. An
 * adapter reuses the dataset page's own server fetcher (e.g. the sanctions
 * adapter calls searchSanctions from '@/lib/sanctions/research') rather than
 * re-implementing a query, and the orchestrator remains the fan-out engine.
 *
 * @typedef {Object} SonarQuery
 * @property {string}   raw            Original ping text.
 * @property {string[]} tickers        Recognised symbols, e.g. ['LMT','XOM'].
 * @property {string[]} countries      ISO-2 codes, e.g. ['US','IR'].
 * @property {string[]} people         Normalised person names.
 * @property {string[]} organizations  Normalised organization names.
 * @property {string[]} themes         e.g. ['sanctions','macro','energy'].
 * @property {{ from?: string, to?: string }} window  ISO dates.
 *
 * @typedef {Object} SonarFinding
 * @property {string}  sourceSlug      The adapter's taxonomy slug.
 * @property {string}  title           Short, factual headline (no advice).
 * @property {string}  summary         Findings only, never buy/sell language.
 * @property {string|null} date        ISO date of the underlying record.
 * @property {number}  relevance       0..1 (recency-weighted for designations).
 * @property {{ label: string, href: string }} citation  Deep link to the page.
 * @property {Record<string, any>} [meta]
 *
 * @typedef {Object} SonarSourceAdapter
 * @property {string}  slug            Must equal the taxonomy slug (href tail).
 * @property {string}  label           User-facing name (no backend names).
 * @property {string}  dimension       Taxonomy dimension label.
 * @property {'free'|'pro'|'org'} minTier
 * @property {(q: SonarQuery) => boolean} isRelevant      Cheap pre-filter.
 * @property {(q: SonarQuery, ctx?: object) => Promise<SonarFinding[]>} search
 * @property {number}  [timeoutMs]
 */

export {};
