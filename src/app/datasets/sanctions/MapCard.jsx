'use client';

/**
 * "Where listed parties are based": the OFAC address-country choropleth,
 * kept from the original page, with:
 *   - Map / Ranked views (as before) and a Count / Share toggle; share is of
 *     listings that name any country, so the missing-country total stays
 *     visible and outside the denominator.
 *   - A selected-country panel: entry-type mix, the programs its listings
 *     fall under (from the summary's program x country counts) and actions.
 * Selecting a country sets the page's country filter (timeline, listings).
 * Address country is where a listed party is based, which is a different
 * thing from the jurisdiction a program targets (the explorer below).
 */
import { useMemo, useState } from 'react';
import SanctionsWorldMap from '@/components/sanctions/SanctionsWorldMap';
import { programMeta } from '@/lib/sanctions/programs';
import { ProgramChip, Seg, TYPES, TypeStrip, fmt, pctOf, shortDate } from './ui';

function RankedCountries({ countries, selected, onPick, limit = 15 }) {
  const rows = countries.slice(0, limit);
  const max = rows[0]?.total || 1;
  return (
    <ol className="snx-ranked">
      {rows.map((c, i) => (
        <li key={c.name}>
          <button
            type="button"
            className={`snx-ranked-row${selected === c.name ? ' is-on' : ''}`}
            aria-pressed={selected === c.name}
            onClick={() => onPick(c.name)}
          >
            <span className="snx-ranked-rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="snx-ranked-name">{c.name}</span>
            <span className="snx-ranked-bar" aria-hidden="true">
              {TYPES.map((t) =>
                c[t.key] ? (
                  <span
                    key={t.key}
                    style={{ width: `${(c[t.key] / max) * 100}%`, background: t.color }}
                  />
                ) : null,
              )}
            </span>
            <span className="snx-ranked-n">{fmt(c.total)}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function CountryPanel({ country, summary, withCountry, program, onProgram, onClear, onShow }) {
  const rec = summary.countries.find((c) => c.name === country);
  const programs = useMemo(() => {
    const out = [];
    for (const [code, byCountry] of Object.entries(summary.programCountries || {})) {
      const n = byCountry[country];
      if (n) out.push({ code, n });
    }
    return out.sort((a, b) => b.n - a.n);
  }, [summary.programCountries, country]);
  if (!rec) return null;
  return (
    <div className="snx-country" role="region" aria-label={`${country} details`}>
      <div className="snx-country-head">
        <b>{country}</b>
        <span className="snx-mono">
          {fmt(rec.total)} listings · {pctOf(rec.total, withCountry)} of those with a country
        </span>
        <button type="button" className="snx-focus-clear" onClick={onClear}>
          Clear country
        </button>
      </div>
      <TypeStrip
        counts={rec}
        total={rec.total}
        label={TYPES.map((t) => `${t.label} ${fmt(rec[t.key])}`).join(', ')}
      />
      <span className="snx-strip-legend snx-country-legend">
        {TYPES.map((t) => (
          <span key={t.key}>
            <i style={{ background: t.color }} aria-hidden="true" />
            {t.label} {fmt(rec[t.key])}
          </span>
        ))}
      </span>
      {programs.length ? (
        <div className="snx-country-programs">
          <span className="snx-country-label">Programs behind these listings</span>
          <span className="snx-chips">
            {programs.slice(0, 8).map((p) => (
              <span key={p.code} className="snx-country-prog" title={programMeta(p.code).label}>
                <ProgramChip code={p.code} active={program === p.code} onPick={onProgram} />
                <span className="snx-mono snx-muted">{fmt(p.n)}</span>
              </span>
            ))}
            {programs.length > 8 ? (
              <span className="snx-chip-more">+{programs.length - 8}</span>
            ) : null}
          </span>
        </div>
      ) : null}
      <button type="button" className="snx-action-btn" onClick={onShow}>
        Show {country} listings <i className="bi bi-arrow-down" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function MapCard({
  embedded = false,
  map,
  summary,
  filter,
  pulses,
  onPickCountry,
  onClearCountry,
  onPickProgram,
  onClearProgram,
  onShowListings,
}) {
  const [view, setView] = useState('map');
  const [metric, setMetric] = useState('count');
  const withCountry = summary.active - summary.noCountry;
  const mapFocus = useMemo(() => {
    if (!filter.program) return null;
    return { label: filter.program, counts: summary.programCountries?.[filter.program] || {} };
  }, [filter.program, summary.programCountries]);
  const focusMeta = filter.program ? programMeta(filter.program) : null;

  return (
    <section
      className={embedded ? 'snx-sub snx-sub--map' : 'snx-card snx-hero snx-hero--map'}
      aria-labelledby="snx-where"
    >
      <div className="snx-card-head">
        <div>
          {embedded ? (
            <h3 id="snx-where" className="snx-sub-title">
              Where listed parties are based
            </h3>
          ) : (
            <h2 id="snx-where" className="snx-card-title">
              Where listed parties are based
            </h2>
          )}
          <p className="snx-card-sub">
            Address countries OFAC publishes with each listing. Select a country to filter the page,
            or a program below to shade by it.
          </p>
        </div>
        <div className="snx-tl-controls">
          <Seg
            label="View"
            value={view}
            onChange={setView}
            options={[
              { key: 'map', label: 'Map', icon: 'bi-globe2' },
              { key: 'ranked', label: 'Ranked', icon: 'bi-bar-chart-steps' },
            ]}
          />
          {view === 'map' ? (
            <Seg
              label="Measure"
              value={metric}
              onChange={setMetric}
              options={[
                { key: 'count', label: 'Count' },
                {
                  key: 'share',
                  label: 'Share',
                  disabled: Boolean(mapFocus),
                  title: mapFocus ? 'Shown as counts while a program is selected' : undefined,
                },
              ]}
            />
          ) : null}
        </div>
      </div>

      {view === 'map' ? (
        <SanctionsWorldMap
          map={map}
          countries={summary.countries}
          focus={mapFocus}
          pulses={pulses}
          selected={filter.country}
          onPick={onPickCountry}
          metric={metric}
          shareBase={withCountry}
          compact
        />
      ) : (
        <>
          <RankedCountries
            countries={summary.countries}
            selected={filter.country}
            onPick={onPickCountry}
          />
          <span className="snx-strip-legend snx-ranked-legend">
            {TYPES.map((t) => (
              <span key={t.key}>
                <i style={{ background: t.color }} aria-hidden="true" />
                {t.label}
              </span>
            ))}
          </span>
        </>
      )}

      {focusMeta && view === 'map' ? (
        <p className="snx-focus">
          <span>
            Shaded by <b>{filter.program}</b> · {focusMeta.label}. Other countries are grey.
          </span>
          <button type="button" className="snx-focus-clear" onClick={onClearProgram}>
            Show every program
          </button>
        </p>
      ) : null}

      {filter.country ? (
        <CountryPanel
          country={filter.country}
          summary={summary}
          withCountry={withCountry}
          program={filter.program}
          onProgram={onPickProgram}
          onClear={onClearCountry}
          onShow={onShowListings}
        />
      ) : null}

      {pulses.length && view === 'map' ? (
        <ul
          className="snx-pulse-news"
          aria-label="Press coverage naming these countries, past 30 days"
        >
          {pulses.slice(0, 3).map((p) => (
            <li key={p.country}>
              <span className="snx-pulse-dot" aria-hidden="true" />
              <span className="snx-pulse-country">{p.country}</span>
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {p.title}
              </a>
              <span className="snx-mono snx-muted">
                Press{p.source ? ` · ${p.source}` : ''} · {shortDate(p.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="snx-fine">
        {fmt(summary.noCountry)} active listings ({pctOf(summary.noCountry, summary.active)}) carry
        no address country and are not on the map. A listing with addresses in several countries
        counts in each.
        {metric === 'share' && !mapFocus
          ? ` Shares are of the ${fmt(withCountry)} listings that name a country.`
          : ''}
      </p>
    </section>
  );
}
