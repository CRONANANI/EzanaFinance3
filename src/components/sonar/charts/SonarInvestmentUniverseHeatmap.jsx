'use client';

/**
 * SonarInvestmentUniverseHeatmap (Nov 28 2026), adapted from the 21st.dev "market heatmap"
 * for company and sector research: market-cap weighted performance, sector exposure,
 * institutional position value, federal award concentration, comparable universes.
 *
 * Tile area and tile colour are two separately labelled measures, both named in the key
 * (for example area: market capitalization, colour: daily price return). Area never uses an
 * arbitrary value: a tile without a positive size is left out of the map and listed under it.
 * It shares the squarified layout with the US Equities stock heatmap (lib/charts/squarify),
 * so the app keeps one treemap implementation; that page's heatmap keeps its own data and
 * interactions.
 *
 * Hover dims the rest; Enter or a click selects the tile for linked components; arrow keys
 * walk tiles from largest to smallest.
 *
 * payload.data: { tiles: [{ id, label, group?, area, color }], areaMeasure: { label, unit },
 *                 colorMeasure: { label, unit, diverging? = true, scale? } }
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { squarify } from '@/lib/charts/squarify';
import { formatFigure, num } from '@/lib/sonar/presentation/contracts';
import { useSonarSelection } from '../layout/SonarSelectionContext';
import './sonar-research-library.css';

const GAP = 2;

function fill(v, scale, diverging) {
  if (v === null) return 'color-mix(in srgb, var(--text-muted) 14%, transparent)';
  const strength = Math.round(Math.min(Math.abs(v) / scale, 1) * 62 + 14);
  const hue = !diverging || v >= 0 ? 'var(--emerald)' : 'var(--negative)';
  return `color-mix(in srgb, ${hue} ${strength}%, var(--surface-card, var(--bg-primary)))`;
}

export function SonarInvestmentUniverseHeatmap({ payload }) {
  const p = payload || {};
  const d = p.data || {};
  const box = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 360 });
  const [hot, setHot] = useState(null);
  const [selected, select] = useSonarSelection();

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { tiles, left } = useMemo(() => {
    const sized = [];
    const out = [];
    for (const t of d.tiles || []) {
      const a = num(t.area);
      if (a !== null && a > 0) sized.push({ ...t, weight: a, colorV: num(t.color) });
      else out.push(t);
    }
    sized.sort((a, b) => b.weight - a.weight);
    return { tiles: squarify(sized, 0, 0, size.w, size.h), left: out };
  }, [d.tiles, size]);

  const colorVals = tiles.map((t) => t.it.colorV).filter((v) => v !== null);
  const scale = num(d.colorMeasure?.scale) || Math.max(...colorVals.map(Math.abs), 0) || 1;
  const diverging = d.colorMeasure?.diverging !== false;
  const cm = d.colorMeasure || {};
  const am = d.areaMeasure || {};
  const fmtC = (v) => formatFigure(v, cm.unit);
  const fmtA = (v) => formatFigure(v, am.unit, { compact: true });

  const step = (e, i) => {
    const j =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? i + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? i - 1
          : null;
    if (j === null) return;
    e.preventDefault();
    const k = Math.max(0, Math.min(tiles.length - 1, j));
    box.current?.querySelectorAll('.srl-tile')[k]?.focus();
  };

  const hotTile = tiles.find((t) => String(t.it.id || t.it.label) === hot);

  return (
    <div>
      <div className="srl-keys" style={{ marginBottom: 8 }}>
        <span className="srl-key">
          <i className="bi bi-aspect-ratio" aria-hidden="true" />
          Area: {am.label}
        </span>
        <span className="srl-key srl-scale">
          Colour: {cm.label}
          <span className="srl-scale-bar" aria-hidden="true" />
          <span>{diverging ? `${fmtC(-scale)} to ${fmtC(scale)}` : `0 to ${fmtC(scale)}`}</span>
        </span>
      </div>
      <div ref={box} className={`srl-map${hot ? ' is-hovering' : ''}`}>
        <svg
          viewBox={`0 0 ${size.w} ${size.h}`}
          role="group"
          aria-label={p.title || 'Universe map'}
        >
          {tiles.map((t, i) => {
            const id = String(t.it.id || t.it.label);
            const w = Math.max(0, t.w - GAP);
            const h = Math.max(0, t.h - GAP);
            const isSel = selected === id;
            return (
              <g
                key={id}
                className={`srl-tile${hot === id ? ' is-hot' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={isSel}
                aria-label={`${t.it.label}${t.it.group ? `, ${t.it.group}` : ''}: ${am.label} ${fmtA(t.it.weight)}, ${cm.label} ${t.it.colorV === null ? 'N/A' : fmtC(t.it.colorV)}`}
                onMouseEnter={() => setHot(id)}
                onMouseLeave={() => setHot(null)}
                onFocus={() => setHot(id)}
                onBlur={() => setHot(null)}
                onClick={() => select(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select(id);
                  } else step(e, i);
                }}
              >
                <rect
                  x={t.x}
                  y={t.y}
                  width={w}
                  height={h}
                  rx={3}
                  fill={fill(t.it.colorV, scale, diverging)}
                  stroke={isSel ? 'var(--emerald-text)' : 'none'}
                  strokeWidth={isSel ? 2 : 0}
                />
                {w > 44 && h > 26 ? (
                  <>
                    <text className="srl-tile-label" x={t.x + 6} y={t.y + 15}>
                      {t.it.label}
                    </text>
                    {h > 40 ? (
                      <text
                        className="srl-tile-label"
                        x={t.x + 6}
                        y={t.y + 29}
                        style={{ fontWeight: 400 }}
                      >
                        {t.it.colorV === null ? 'N/A' : fmtC(t.it.colorV)}
                      </text>
                    ) : null}
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="srl-readout" aria-live="polite">
        {hotTile
          ? `${hotTile.it.label}: ${am.label} ${fmtA(hotTile.it.weight)}, ${cm.label} ${hotTile.it.colorV === null ? 'N/A' : fmtC(hotTile.it.colorV)}`
          : ' '}
      </p>
      {left.length ? (
        <p className="srl-labels">
          Not sized (no {am.label}): {left.map((t) => t.label).join(', ')}
        </p>
      ) : null}
    </div>
  );
}

export default SonarInvestmentUniverseHeatmap;
