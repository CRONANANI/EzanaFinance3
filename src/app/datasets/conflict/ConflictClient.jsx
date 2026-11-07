'use client';

/**
 * Armed Conflict Tracker (Nov 7): organized violence worldwide from the UCDP Georeferenced
 * Event Dataset. Every figure comes from the server (no sample data).
 *
 *   01 Headline measures   deaths (with UCDP's range), active conflicts, countries, civilians
 *   02 Conflict map        1 degree event cells over a country choropleth: 3M / 12M / 36M,
 *                          by violence type; beside it, the fastest-rising countries
 *   03 Country panel       opens on a map, table or ticker pick (shared with Sonar)
 *   04 Monthly deaths      36 months stacked by type, preliminary months hatched
 *   05 Countries           sortable ranking with region filter
 *   06 Conflicts | Regions the deadliest conflicts; deaths by region vs the prior year
 *   07 About this data     definitions, releases, coverage, attribution
 *
 * One selection (the country) is shared by the map, rising list, table, ticker and panel.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import ConflictCountryPanel from '@/components/conflict/ConflictCountryPanel';
import ConflictMonthlyChart from '@/components/conflict/ConflictMonthlyChart';
import { overviewKpis, risingCountries, tickerItems, dayLabel } from '@/lib/ucdp/view';
import ConflictMap from './ConflictMap';
import CountryTable from './CountryTable';
import { ConflictsCard, RegionsCard, AboutCard, RisingCard } from './Cards';
import './conflict-page.css';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function ConflictClient({ overview, initialMap, world, initialCountry = null }) {
  const [iso3, setIso3] = useState(initialCountry?.iso3 || null);
  const [country, setCountry] = useState(initialCountry);
  const [countryState, setCountryState] = useState(initialCountry ? 'ready' : 'idle');
  const panelRef = useRef(null);
  const reqId = useRef(0);

  const pick = useCallback((code) => setIso3((cur) => (cur === code ? null : code)), []);

  /* The country panel: one fetch per pick; the server's ?country= answer is reused. */
  useEffect(() => {
    if (!iso3) {
      setCountry(null);
      setCountryState('idle');
      return undefined;
    }
    if (country?.iso3 === iso3) return undefined;
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setCountryState('loading');
    fetch(`/api/datasets/conflict/country?iso3=${iso3}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (id !== reqId.current) return;
        if (res.status === 404) return setCountryState('none');
        if (!res.ok) return setCountryState('error');
        setCountry(await res.json());
        setCountryState('ready');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError' && id === reqId.current) setCountryState('error');
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso3]);

  /* Keep ?country= in the address so a pick can be shared. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (iso3) url.searchParams.set('country', iso3);
    else url.searchParams.delete('country');
    window.history.replaceState(null, '', url);
  }, [iso3]);

  useEffect(() => {
    if (iso3 && countryState === 'ready' && country?.iso3 === iso3 && !initialCountry) {
      panelRef.current?.scrollIntoView({
        behavior: reducedMotion() ? 'auto' : 'smooth',
        block: 'nearest',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryState, iso3]);

  const items = useMemo(() => tickerItems(overview), [overview]);
  const onTickerSelect = useCallback((it) => setIso3(it._iso3), []);
  usePublishTicker({
    items,
    onSelect: onTickerSelect,
    ariaLabel: 'Deadliest countries for organized violence over the last 12 months',
  });

  const kpis = overviewKpis(overview);
  const rising = risingCountries(overview);

  return (
    <div className="cfx-page">
      <header className="cfx-header">
        <p className="cfx-eyebrow">Datasets · Uppsala Conflict Data Program</p>
        <h1 className="cfx-title">Armed conflict tracker</h1>
        <p className="cfx-lead">
          Every recorded event of organized violence worldwide: where people are being killed, by
          whom, in which conflicts, and how that is changing month by month.
        </p>
      </header>

      <HubQueryLink dimension="lighthouse" />

      {!overview ? (
        <section className="cfx-card cfx-empty">
          <i className="bi bi-globe2" aria-hidden="true" />
          <p>Conflict data has not loaded yet. It refreshes weekly from UCDP.</p>
        </section>
      ) : (
        <div className="cfx-main">
          <p className="cfx-asof">
            Latest recorded event {dayLabel(overview.asof)}. Last 12 months:{' '}
            {dayLabel(overview.window?.from)} to {dayLabel(overview.window?.to)}.
          </p>

          <ul className="cfx-kpis" aria-label="Headline measures">
            {kpis.map((k) => (
              <li key={k.id} className="cfx-card cfx-kpi">
                <span className="cfx-kpi-label">{k.label}</span>
                <span className="cfx-kpi-value">{k.value}</span>
                {k.delta ? (
                  <span className={`cfx-delta ${k.delta.up ? 'is-up' : 'is-down'}`}>
                    {k.delta.text}
                  </span>
                ) : null}
                {k.sub ? <span className="cfx-kpi-sub">{k.sub}</span> : null}
              </li>
            ))}
          </ul>

          <div className="cfx-pair">
            <ConflictMap
              world={world}
              initial={initialMap}
              overview={overview}
              selected={iso3}
              onPick={pick}
            />
            <RisingCard rows={rising} selected={iso3} onPick={pick} />
          </div>

          {iso3 ? (
            <section
              className="cfx-card cfx-country"
              ref={panelRef}
              aria-live="polite"
              aria-labelledby="cfx-country-h"
            >
              {countryState === 'ready' && country ? (
                <ConflictCountryPanel
                  data={country}
                  onClose={() => setIso3(null)}
                  headingId="cfx-country-h"
                />
              ) : (
                <p className="cfx-note" id="cfx-country-h">
                  {countryState === 'loading'
                    ? 'Loading the country picture...'
                    : countryState === 'none'
                      ? 'UCDP has no recorded events for this country in the last three years.'
                      : 'The country picture could not be loaded. Try again shortly.'}
                </p>
              )}
            </section>
          ) : null}

          <section className="cfx-card" aria-labelledby="cfx-monthly-h">
            <div className="cfx-card-head">
              <h2 className="cfx-card-title" id="cfx-monthly-h">
                Deaths in organized violence by month
              </h2>
              <span className="cfx-chip">Worldwide · 36 months</span>
            </div>
            <ConflictMonthlyChart monthly={overview.monthly} months={36} height={220} />
          </section>

          <CountryTable overview={overview} selected={iso3} onPick={pick} />

          <div className="cfx-pair cfx-pair--even">
            <ConflictsCard conflicts={overview.conflicts} />
            <RegionsCard regions={overview.regions} />
          </div>

          <AboutCard overview={overview} />
        </div>
      )}
    </div>
  );
}
