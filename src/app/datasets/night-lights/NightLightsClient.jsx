'use client';

/**
 * Satellite Imagery: monthly night-time light brightness per region from NASA
 * Black Marble (VNP46A3). A card per region, a world map with a dot per
 * region coloured by its year-over-year change, and a monthly chart for the
 * selected region. Brightness is a proxy for activity, not a measure of it.
 */
import { useMemo, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import {
  DASH,
  SeriesChart,
  Sparkline,
  fmtMonth,
  fmtNum,
  fmtSigned,
  pctChange,
  tone,
} from '@/components/datasets/eyes/eyes-bits';
import './night-lights.css';

/* Must match src/lib/eyes/world-path.js (kept literal so the topology stays on the server). */
const MAP_TOP = 85;
const MAP_BOTTOM = -65;
const MAP_H = MAP_TOP - MAP_BOTTOM;

const KIND = { port: 'Port', industrial: 'Industrial', energy: 'Energy', metro: 'City' };

const monthMinus = (iso, n) => {
  const d = new Date(`${String(iso).slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
};

function summarise(r) {
  const pts = r.points.filter((p) => p.value != null);
  const last = pts[pts.length - 1];
  if (!last) return { ...r, last: null, yoy: null, vs3: null, spark: [] };
  const yearAgo = pts.find((p) => p.month.slice(0, 7) === monthMinus(last.month, 12).slice(0, 7));
  const prior = pts.slice(-4, -1);
  const avg3 = prior.length === 3 ? prior.reduce((s, p) => s + p.value, 0) / 3 : null;
  const [minLon, minLat, maxLon, maxLat] = r.bbox || [];
  return {
    ...r,
    last,
    yoy: pctChange(last.value, yearAgo?.value),
    vs3: pctChange(last.value, avg3),
    spark: pts.slice(-24).map((p) => p.value),
    lon: minLon != null ? (minLon + maxLon) / 2 : null,
    lat: minLat != null ? (minLat + maxLat) / 2 : null,
  };
}

function Delta({ v, label }) {
  return (
    <span>
      {label}{' '}
      {v == null ? (
        <span className="ntl-muted">{DASH}</span>
      ) : (
        <span className={`ntl-mono ntl-${tone(v)}`}>{fmtSigned(v)}</span>
      )}
    </span>
  );
}

function WorldMap({ regions, selected, onSelect, landPath }) {
  const placed = regions.filter((r) => r.lon != null && r.lat != null);
  return (
    <figure className="ntl-card ntl-map" style={{ margin: 0 }}>
      <figcaption className="ntl-card-title">
        Regions, coloured by change against a year ago
      </figcaption>
      <svg
        className="ntl-map-svg"
        viewBox={`0 0 360 ${MAP_H}`}
        role="group"
        aria-label="World map of the tracked regions"
      >
        {[-60, -30, 0, 30, 60].map((lat) => (
          <line
            key={`lat${lat}`}
            className="ntl-grat"
            x1="0"
            x2="360"
            y1={MAP_TOP - lat}
            y2={MAP_TOP - lat}
          />
        ))}
        {[-120, -60, 0, 60, 120].map((lon) => (
          <line
            key={`lon${lon}`}
            className="ntl-grat"
            x1={lon + 180}
            x2={lon + 180}
            y1="0"
            y2={MAP_H}
          />
        ))}
        {landPath ? <path className="ntl-land" d={landPath} /> : null}
        {placed.map((r) => {
          const cls =
            r.yoy == null ? 'is-none' : r.yoy > 0 ? 'is-up' : r.yoy < 0 ? 'is-down' : 'is-none';
          const label = `${r.name}: ${r.yoy == null ? 'no year-over-year change yet' : `${fmtSigned(r.yoy)} against a year ago`}`;
          return (
            <g key={r.id}>
              <circle
                className={`ntl-dot ${cls}${selected === r.id ? ' is-selected' : ''}`}
                cx={r.lon + 180}
                cy={MAP_TOP - r.lat}
                r={selected === r.id ? 3.6 : 2.6}
                tabIndex={0}
                role="button"
                aria-label={label}
                aria-pressed={selected === r.id}
                onClick={() => onSelect(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(r.id);
                  }
                }}
              >
                <title>{label}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <p className="ntl-legend-row">
        <span>
          <span className="ntl-key is-up" aria-hidden="true" /> Brighter
        </span>
        <span>
          <span className="ntl-key is-down" aria-hidden="true" /> Dimmer
        </span>
        <span>
          <span className="ntl-key is-none" aria-hidden="true" /> No comparison yet
        </span>
      </p>
    </figure>
  );
}

export default function NightLightsClient({ data, error, landPath }) {
  const regions = useMemo(() => (data?.regions || []).map(summarise), [data]);
  const withData = useMemo(() => regions.filter((r) => r.last), [regions]);
  const [sel, setSel] = useState(null);
  const selectedId = sel || withData[0]?.id || null;
  const selected = regions.find((r) => r.id === selectedId) || null;

  const select = (id) => {
    setSel(id);
    if (typeof document !== 'undefined') {
      document
        .getElementById(`ntl-card-${id}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const tickerItems = useMemo(
    () =>
      withData
        .filter((r) => r.yoy != null)
        .map((r) => ({
          id: r.id,
          lead: 'Night lights vs year ago',
          main: r.name,
          value: fmtSigned(r.yoy),
        })),
    [withData],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Night lights by region' });

  return (
    <div className="ntl-page">
      <header className="ntl-header">
        <p className="ntl-eyebrow">DATASETS · EYES ABOVE</p>
        <h1 className="ntl-title">Satellite Imagery: Night Lights</h1>
        <p className="ntl-sub">
          How bright ports, industrial areas, energy basins and cities glow at night, month by
          month, as seen by NASA&apos;s VIIRS satellites.
        </p>
        {data?.through ? (
          <p className="ntl-through">
            Data through <strong>{fmtMonth(data.through)}</strong>
          </p>
        ) : null}
      </header>

      <HubQueryLink dimension="eyes" />

      {error ? (
        <p className="ntl-empty" role="alert">
          Night-lights data could not be loaded right now. Please try again shortly.
        </p>
      ) : !withData.length ? (
        <p className="ntl-empty">
          No night-lights months are loaded yet. Monthly composites are processed once a month, a
          few weeks after each month ends.
        </p>
      ) : (
        <>
          <div className="ntl-grid ntl-section">
            <WorldMap
              regions={withData}
              selected={selectedId}
              onSelect={select}
              landPath={landPath}
            />
            {selected ? (
              <figure className="ntl-card" style={{ margin: 0 }} aria-live="polite">
                <figcaption className="ntl-card-title">
                  {selected.name}{' '}
                  <span className="ntl-tag">{KIND[selected.kind] || selected.kind}</span>
                </figcaption>
                <p className="ntl-note">Mean radiance, nW/cm²/sr, monthly</p>
                <SeriesChart
                  data={selected.points.filter((p) => p.value != null)}
                  xKey="month"
                  lines={[{ key: 'value', label: 'Mean radiance', stroke: 'var(--cyan)' }]}
                  yFmt={(v) => fmtNum(v, 1)}
                  tipLabel={fmtMonth}
                  height={240}
                  label={`${selected.name} night-lights brightness by month`}
                />
              </figure>
            ) : null}
          </div>

          <section className="ntl-section" aria-labelledby="ntl-regions-h">
            <h2 id="ntl-regions-h" className="ntl-section-title">
              Regions
            </h2>
            <p className="ntl-note">
              Latest month&apos;s mean radiance, against the same month a year earlier and the
              average of the three months before.
            </p>
            <div className="ntl-cards">
              {regions.map((r) => (
                <button
                  key={r.id}
                  id={`ntl-card-${r.id}`}
                  type="button"
                  className={`ntl-scard${selectedId === r.id ? ' is-active' : ''}`}
                  onClick={() => setSel(r.id)}
                  aria-pressed={selectedId === r.id}
                  disabled={!r.last}
                >
                  <span className="ntl-scard-title">
                    {r.name} <span className="ntl-tag">{KIND[r.kind] || r.kind}</span>
                  </span>
                  <span className="ntl-scard-value">
                    {r.last ? fmtNum(r.last.value, 2) : DASH}
                    <span className="ntl-muted"> nW/cm²/sr</span>
                  </span>
                  <span className="ntl-scard-meta">
                    <span className="ntl-mono">
                      {r.last ? fmtMonth(r.last.month) : 'Not loaded yet'}
                    </span>
                    {r.country ? <span>{r.country}</span> : null}
                  </span>
                  <span className="ntl-scard-meta">
                    <Delta v={r.yoy} label="vs year ago" />
                    <Delta v={r.vs3} label="vs prior 3 mo" />
                  </span>
                  <Sparkline className="ntl-spark" values={r.spark} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <footer className="ntl-foot">
        <p>
          Monthly night-time light brightness from NASA&apos;s Black Marble (VIIRS) satellites, a
          proxy for economic activity: brightness changes with industrial output, flaring, outages
          and conflict. Cloud-free monthly composites; values are radiance in nW/cm²/sr averaged
          over the region&apos;s area.
        </p>
        <p>
          Sources: NASA Black Marble (VNP46A3); World Bank blackmarblepy. Land outlines: Natural
          Earth via world-atlas.
        </p>
      </footer>
    </div>
  );
}
