/**
 * @fileoverview
 * Client hook that fetches real Empire Rankings dimension scores from
 * `/api/empire/scores` and exposes them to cards on the Empire Rankings
 * page.
 *
 * Shape returned to consumers:
 *   {
 *     loading,
 *     error,                         // string | null
 *     hasData,                       // true iff scores.length > 0
 *     year,                          // year the API resolved
 *     scoresByCountryByDimension,    // Map<iso3, Map<dimension_id, score>>
 *     dimensions,                    // [{ id, name, has_data, ... }]
 *     countries,                     // [{ code, name, flag, region, ... }]
 *     dimensionsWithData,            // Set<dimension_id> — convenience
 *     pendingDimensions,             // [{ id, name, ... }] awaiting sources
 *   }
 *
 * When the backbone hasn't been synced yet (empty matview), `hasData` is
 * false and consumers fall back to whatever static data they already
 * render. This keeps the page usable in dev + pre-deploy states.
 */

'use client';

import { useEffect, useState } from 'react';

/**
 * @param {Object} [options]
 * @param {number} [options.year]                       Explicit year to request (else API picks latest).
 * @param {string[]} [options.countries]                Restrict to ISO-3 codes.
 * @param {string} [options.dimension]                  Restrict to a single dimension id.
 * @param {boolean} [options.enabled=true]              Gate the fetch.
 */
export function useEmpireScores(options = {}) {
  const { year, countries, dimension, enabled = true } = options;

  const [state, setState] = useState({
    loading: enabled,
    error: null,
    hasData: false,
    year: null,
    scoresByCountryByDimension: new Map(),
    dimensions: [],
    countries: [],
    dimensionsWithData: new Set(),
    pendingDimensions: [],
  });

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const params = new URLSearchParams();
        if (year != null) params.set('year', String(year));
        if (dimension) params.set('dimension', dimension);
        if (countries?.length) params.set('countries', countries.join(','));
        const qs = params.toString();

        const res = await fetch(`/api/empire/scores${qs ? `?${qs}` : ''}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const payload = await res.json();
        if (cancelled) return;

        /** @type {Map<string, Map<string, number>>} */
        const scoresByCountryByDimension = new Map();
        for (const row of payload.scores ?? []) {
          if (!scoresByCountryByDimension.has(row.country_iso3)) {
            scoresByCountryByDimension.set(row.country_iso3, new Map());
          }
          scoresByCountryByDimension.get(row.country_iso3).set(row.dimension_id, row.score);
        }

        const dimensionsWithData = new Set(
          (payload.dimensions ?? []).filter((d) => d.has_data).map((d) => d.id),
        );
        const pendingDimensions = (payload.dimensions ?? []).filter((d) => !d.has_data);

        setState({
          loading: false,
          error: null,
          hasData: (payload.scores ?? []).length > 0,
          year: payload.year ?? null,
          scoresByCountryByDimension,
          dimensions: payload.dimensions ?? [],
          countries: payload.countries ?? [],
          dimensionsWithData,
          pendingDimensions,
        });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, year, dimension, countries?.join(',')]);

  return state;
}
