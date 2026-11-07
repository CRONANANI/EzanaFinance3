'use client';

/**
 * The conflict map: countries shaded by deaths over the last 12 months, with UCDP events
 * binned to a 1 degree grid drawn as circles sized by deaths and coloured by the deadliest
 * violence type in the cell. Period (3M, 12M, 36M) and type controls refetch the cells; a
 * country click opens its panel. Ranked view for keyboard and screen-reader use.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { TYPES, TYPE_BY_ID, countryRows, fmt, mapPoints } from '@/lib/ucdp/view';

const PERIODS = [
  { id: 3, label: '3M' },
  { id: 12, label: '12M' },
  { id: 36, label: '36M' },
];
const TYPE_OPTIONS = [
  { id: 'all', label: 'All' },
  ...TYPES.map((t) => ({ id: t.id, label: t.label })),
];
const BINS = [
  { min: 10000, mix: 90, label: '10,000+' },
  { min: 1000, mix: 66, label: '1,000 to 9,999' },
  { min: 100, mix: 44, label: '100 to 999' },
  { min: 25, mix: 28, label: '25 to 99' },
  { min: 1, mix: 14, label: '1 to 24' },
];
const fill = (n) => {
  const b = BINS.find((x) => n >= x.min);
  return b
    ? `color-mix(in srgb, var(--echo-chart-red) ${b.mix}%, var(--cfx-map-empty))`
    : 'var(--cfx-map-empty)';
};

export function Seg({ label, options, value, onChange }) {
  return (
    <div className="cfx-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`cfx-seg-btn${value === o.id ? ' is-on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ConflictMap({ world, initial, overview, selected, onPick }) {
  const [months, setMonths] = useState(12);
  const [type, setType] = useState('all');
  const [view, setView] = useState('map');
  const [cells, setCells] = useState(initial?.cells || []);
  const [state, setState] = useState(initial ? 'ready' : 'error');
  const [hover, setHover] = useState(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (months === 12 && type === 'all') {
      setCells(initial?.cells || []);
      setState(initial ? 'ready' : 'error');
      return undefined;
    }
    const id = ++reqId.current;
    const ctrl = new AbortController();
    setState('loading');
    fetch(`/api/datasets/conflict/map?months=${months}&type=${type}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (id !== reqId.current) return;
        if (!res.ok) return setState('error');
        const body = await res.json();
        setCells(body.cells || []);
        setState('ready');
      })
      .catch((e) => {
        if (e?.name !== 'AbortError' && id === reqId.current) setState('error');
      });
    return () => ctrl.abort();
  }, [months, type, initial]);

  const byIso = useMemo(
    () => new Map((overview?.countries || []).map((c) => [c.iso3, c])),
    [overview],
  );
  const points = useMemo(() => mapPoints(cells), [cells]);
  const ranked = useMemo(() => countryRows(overview).slice(0, 20), [overview]);
  const hovered = hover ? byIso.get(hover) : null;

  return (
    <section className="cfx-card cfx-map-card" aria-labelledby="cfx-map-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-map-h">
          Where organized violence is happening
        </h2>
        <div className="cfx-controls">
          <Seg
            label="View"
            options={[
              { id: 'map', label: 'Map' },
              { id: 'ranked', label: 'Ranked' },
            ]}
            value={view}
            onChange={setView}
          />
          <Seg label="Period" options={PERIODS} value={months} onChange={setMonths} />
          <Seg label="Violence type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>
      </div>
      <p className="cfx-readout" aria-live="polite">
        {hovered
          ? `${hovered.country}: ${fmt(hovered.best)} deaths over 12 months (range ${fmt(hovered.low)} to ${fmt(hovered.high)}), ${fmt(hovered.events)} events.`
          : state === 'loading'
            ? 'Loading events...'
            : state === 'error'
              ? 'The event map could not be loaded.'
              : `${fmt(points.length)} grid cells with recorded events in the last ${months} months. Countries are shaded by deaths over the last 12 months.`}
      </p>
      {view === 'map' ? (
        <svg
          viewBox={`0 0 ${world.w} ${world.h}`}
          className={`cfx-map${state === 'loading' ? ' is-loading' : ''}`}
          role="img"
          aria-label="World map of deaths in organized violence"
        >
          {world.countries.map((c) => {
            const rec = c.iso3 ? byIso.get(c.iso3) : null;
            const on = selected && c.iso3 === selected;
            return (
              <path
                key={`${c.name}-${c.iso3}`}
                d={c.d}
                className={`cfx-country-shape${rec ? ' has-data' : ''}${on ? ' is-on' : ''}`}
                style={{ fill: fill(rec?.best || 0) }}
                onMouseEnter={() => rec && setHover(c.iso3)}
                onMouseLeave={() => setHover(null)}
                onClick={() => rec && onPick(c.iso3)}
              >
                <title>{rec ? `${rec.country}: ${fmt(rec.best)} deaths` : c.name}</title>
              </path>
            );
          })}
          {points.map((p) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r={p.r}
              className={`cfx-dot is-${TYPE_BY_ID[p.type]?.tone || 'none'}`}
              onClick={() => p.iso3 && byIso.get(p.iso3) && onPick(p.iso3)}
            >
              <title>{`${fmt(p.best)} deaths, ${fmt(p.events)} events near ${p.lat}°, ${p.lon}°`}</title>
            </circle>
          ))}
        </svg>
      ) : (
        <ol className="cfx-ranked">
          {ranked.map((r, i) => (
            <li key={r.iso3}>
              <button
                type="button"
                className={`cfx-ranked-row${selected === r.iso3 ? ' is-on' : ''}`}
                aria-pressed={selected === r.iso3}
                onClick={() => onPick(r.iso3)}
              >
                <span className="cfx-mono cfx-rank">{String(i + 1).padStart(2, '0')}</span>
                <span className="cfx-ranked-name">{r.country}</span>
                <span className="cfx-ranked-bar" aria-hidden="true">
                  {r.parts.map((t) =>
                    t.value ? (
                      <span
                        key={t.id}
                        className={`is-${t.tone}`}
                        style={{ width: `${(t.value / (ranked[0]?.best || 1)) * 100}%` }}
                      />
                    ) : null,
                  )}
                </span>
                <span className="cfx-mono">{fmt(r.best)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="cfx-legend">
        {BINS.slice()
          .reverse()
          .map((b) => (
            <span key={b.label} className="cfx-bin">
              <i style={{ background: fill(b.min) }} aria-hidden="true" />
              {b.label}
            </span>
          ))}
        <span className="cfx-legend-sep" aria-hidden="true" />
        {TYPES.map((t) => (
          <span key={t.id} className={`cfx-key is-${t.tone}`}>
            {t.label}
          </span>
        ))}
      </div>
    </section>
  );
}
