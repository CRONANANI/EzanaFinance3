/**
 * @fileoverview
 * Shared types for the pluggable Empire Rankings source-fetcher system.
 *
 * Each upstream data provider (World Bank, IMF, SIPRI, WIPO, UNESCO, WTO,
 * WJP, TI, GII, FRED, ACLED, V-Dem …) is adapted to a single interface so
 * the sync orchestrator and read API never need to know which source a
 * metric came from — it's all stored uniformly in `country_scores_raw` and
 * normalized in the `country_dimension_scores` view.
 *
 * Implementations live alongside this file (e.g. `./world-bank.js`).
 */

/**
 * @typedef {Object} FetchRequest
 * @property {string[]} iso3List   Country codes to fetch (['USA','CHN',...]).
 * @property {string[]} metricIds  Internal metric ids owned by this source.
 * @property {number}   yearStart  Inclusive lower bound for the year range.
 * @property {number}   yearEnd    Inclusive upper bound for the year range.
 */

/**
 * @typedef {Object} FetchedObservation
 * @property {string}        countryIso3     ISO-3 country code.
 * @property {string}        metricId        Internal metric id (maps into dimension_metric_map).
 * @property {number}        year            Observation year.
 * @property {number|null}   rawValue        Raw value as reported by the source; null → skip.
 * @property {string}       [unit]           Free-text unit (USD, percent, index_0_100, ...).
 * @property {string}       [sourceSeriesId] The source's native series code (e.g. WB indicator).
 */

/**
 * @typedef {Object} MetricRegistryEntry
 * @property {string} seriesId  Source's native series id.
 * @property {string} unit      Unit string for disclosures.
 */

/**
 * @typedef {Object} SourceFetcher
 * @property {string} sourceId
 *   Stable identifier matching `country_scores_raw.source` and
 *   `dimension_metric_map.source` (e.g. 'world_bank', 'imf', 'sipri').
 * @property {Record<string, MetricRegistryEntry>} metricRegistry
 *   Maps internal metric_id → source series metadata. The metric registry
 *   is the single source of truth for series-id mappings; nothing else in
 *   the codebase should hardcode upstream series codes.
 * @property {(req: FetchRequest) => Promise<FetchedObservation[]>} fetch
 *   Fetch observations for the given request. Implementations should:
 *     • swallow per-metric errors (log + skip) so one failure doesn't
 *       abort the whole sync run
 *     • return an empty array when the source is unreachable
 *     • never throw unless the source configuration is fundamentally wrong.
 */

export {};
