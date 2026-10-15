'use client';

/**
 * The OFAC sanctions choropleth, shared by the Sanctions & Trade Policy page
 * and Sonar's sanctions results. Countries are shaded by how many listings
 * have an address there.
 *
 *   focus   optional { label, counts: { [OFAC country]: n } }. When set (a
 *           program is selected), countries are shaded by that program's
 *           listings and every other country goes grey.
 *   pulses  optional [{ country, count, title, url, source, publishedAt }]:
 *           a pulsing dot on each country where major sanctions news broke
 *           in the past month, with the headline in its tooltip.
 *   onPick  optional; without it the map is read-only (Sonar).
 *   metric  'count' (default) or 'share': share expresses each country as a
 *           percentage of shareBase (listings that name any country). The
 *           shading is the same either way; only the units change.
 *
 * Several OFAC names fold into one outline (Gaza, West Bank and Palestinian
 * all draw as Palestine): their counts are summed, and a click picks the
 * largest. Tokens only.
 */
import { useMemo, useRef, useState } from 'react';
import { atlasName } from '@/lib/sanctions/programs';
import './sanctions-map.css';

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

const MAP_BINS = [
  { min: 1000, mix: 92, label: '1,000+' },
  { min: 250, mix: 72, label: '250 to 999' },
  { min: 50, mix: 52, label: '50 to 249' },
  { min: 10, mix: 34, label: '10 to 49' },
  { min: 1, mix: 18, label: '1 to 9' },
];
/* A program's counts are far smaller than the whole list's, so the focus
   view uses its own, lower bins. */
const FOCUS_BINS = [
  { min: 250, mix: 92, label: '250+' },
  { min: 50, mix: 72, label: '50 to 249' },
  { min: 10, mix: 52, label: '10 to 49' },
  { min: 3, mix: 34, label: '3 to 9' },
  { min: 1, mix: 18, label: '1 to 2' },
];
const fillFor = (n, bins) => {
  const b = bins.find((x) => n >= x.min);
  return b
    ? `color-mix(in srgb, var(--snx-map-ink) ${b.mix}%, var(--snx-map-empty))`
    : 'var(--snx-map-empty)';
};

function fold(rows, atlasSet) {
  const m = new Map();
  let unmapped = 0;
  for (const c of rows) {
    const a = atlasName(c.name, atlasSet);
    if (!a) {
      unmapped += c.total;
      continue;
    }
    const rec = m.get(a) || { total: 0, names: [], lead: c.name, leadN: 0 };
    rec.total += c.total;
    rec.names.push(c.name);
    if (c.total > rec.leadN) {
      rec.lead = c.name;
      rec.leadN = c.total;
    }
    m.set(a, rec);
  }
  return { m, unmapped };
}

const dayLabel = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

export default function SanctionsWorldMap({
  map,
  countries,
  focus = null,
  pulses = [],
  selected = '',
  onPick,
  compact = false,
  metric = 'count',
  shareBase = null,
  label = 'World map shaded by the number of OFAC listings with an address in each country.',
}) {
  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null);
  const atlasSet = useMemo(() => new Set(map.countries.map((c) => c.name)), [map]);
  const base = useMemo(() => fold(countries, atlasSet), [countries, atlasSet]);
  const focused = useMemo(
    () =>
      focus
        ? fold(
            Object.entries(focus.counts || {}).map(([name, total]) => ({ name, total })),
            atlasSet,
          )
        : null,
    [focus, atlasSet],
  );
  const shade = focused || base;
  const bins = focused ? FOCUS_BINS : MAP_BINS;
  const centre = useMemo(() => {
    const m = new Map();
    for (const c of map.countries) if (c.cx != null) m.set(c.name, [c.cx, c.cy]);
    for (const p of map.points) m.set(p.name, [p.x, p.y]);
    return m;
  }, [map]);
  const pulseDots = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const p of pulses) {
      const a = atlasName(p.country, atlasSet);
      const at = a && centre.get(a);
      if (!at || seen.has(a)) continue;
      seen.add(a);
      out.push({ ...p, atlas: a, x: at[0], y: at[1] });
    }
    return out;
  }, [pulses, atlasSet, centre]);

  const place = (e) => {
    const box = wrapRef.current?.getBoundingClientRect();
    return box ? { x: e.clientX - box.left, y: e.clientY - box.top } : null;
  };
  const move = (e, name) => {
    const at = place(e);
    if (!at) return;
    const rec = shade.m.get(name);
    setTip({
      ...at,
      name: rec?.names.length === 1 ? rec.names[0] : name,
      line: focused
        ? `${fmt(rec?.total || 0)} ${focus.label} listings`
        : `${asShare ? `${pct(rec?.total || 0)} of listings with a country · ` : ''}${fmt(
            rec?.total || 0,
          )} listings${onPick ? ' · click to filter' : ''}`,
    });
  };
  const movePulse = (e, p) => {
    const at = place(e);
    if (!at) return;
    setTip({
      ...at,
      name: p.country,
      line: `${p.count > 1 ? `${p.count} stories · ` : ''}${p.title}`,
      news: true,
    });
  };
  const pick = (name) => {
    if (!onPick) return;
    const rec = base.m.get(name);
    if (rec) onPick(rec.lead);
  };
  const asShare = metric === 'share' && shareBase > 0 && !focused;
  const pct = (n) => {
    const v = (n / shareBase) * 100;
    return `${v >= 1 ? v.toFixed(1) : v.toFixed(2)}%`;
  };
  const selectedAtlas = selected ? atlasName(selected, atlasSet) : null;
  const clickable = Boolean(onPick);

  return (
    <div
      className={`snx-map${focused ? ' is-focus' : ''}${compact ? ' is-compact' : ''}`}
      ref={wrapRef}
      onMouseLeave={() => setTip(null)}
    >
      <svg
        className="snx-map-svg"
        viewBox={`0 0 ${map.w} ${map.h}`}
        role="img"
        aria-label={
          focused
            ? `World map shaded by ${focus.label} listings per country; countries without one are grey.`
            : label
        }
      >
        {map.countries.map((c) => {
          const rec = shade.m.get(c.name);
          const inBase = base.m.has(c.name);
          return (
            <path
              key={c.name}
              d={c.d}
              className={`snx-map-country${rec ? ' has-data' : ''}${
                focused && !rec ? ' is-muted' : ''
              }${clickable && inBase ? ' is-clickable' : ''}${
                selectedAtlas === c.name ? ' is-on' : ''
              }`}
              style={rec ? { fill: fillFor(rec.total, bins) } : undefined}
              onMouseMove={rec || inBase ? (e) => move(e, c.name) : undefined}
              onClick={clickable && inBase ? () => pick(c.name) : undefined}
            />
          );
        })}
        {map.points.map((p) => {
          const rec = shade.m.get(p.name);
          if (!rec) return null;
          return (
            <circle
              key={p.name}
              cx={p.x}
              cy={p.y}
              r="1.7"
              className={`snx-map-dot${clickable ? ' is-clickable' : ''}${
                selectedAtlas === p.name ? ' is-on' : ''
              }`}
              style={{ fill: fillFor(rec.total, bins) }}
              onMouseMove={(e) => move(e, p.name)}
              onClick={clickable ? () => pick(p.name) : undefined}
            />
          );
        })}
        {pulseDots.map((p) => (
          <g
            key={`pulse-${p.atlas}`}
            className="snx-map-pulse"
            transform={`translate(${p.x} ${p.y})`}
            onMouseMove={(e) => movePulse(e, p)}
          >
            <circle className="snx-map-pulse-ring" r="2" />
            <circle className="snx-map-pulse-core" r="1.15" />
          </g>
        ))}
      </svg>
      {tip ? (
        <span
          className={`snx-map-tip${tip.news ? ' is-news' : ''}`}
          role="tooltip"
          style={{ left: tip.x, top: tip.y }}
        >
          <b>{tip.name}</b>
          <span>{tip.line}</span>
        </span>
      ) : null}
      <div className="snx-map-legend" aria-hidden="true">
        <span className="snx-map-legend-label">
          {focused
            ? `${focus.label} listings`
            : asShare
              ? 'Share of listings with a country'
              : 'Listings based there'}
        </span>
        {[...bins].reverse().map((b) => (
          <span key={b.label} className="snx-map-legend-bin">
            <i style={{ background: fillFor(b.min, bins) }} />
            {asShare ? `${pct(b.min)}+` : b.label}
          </span>
        ))}
        {pulseDots.length ? (
          <span className="snx-map-legend-bin snx-map-legend-news">
            <i className="snx-map-legend-pulse" />
            Sanctions news, past 30 days
          </span>
        ) : null}
      </div>
      {pulseDots.length ? (
        <ul className="snx-map-news-sr">
          {pulseDots.map((p) => (
            <li key={p.atlas}>
              {p.country}: {p.title}
              {dayLabel(p.publishedAt) ? ` (${dayLabel(p.publishedAt)})` : ''}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
