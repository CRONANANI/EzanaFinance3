'use client';

/**
 * History — multi-country time series, 1961–2025, for the selected indicator.
 * One request per indicator (`/api/datasets/oecd/history?slug=`) returns every
 * country's full series; results are cached in a ref so re-selecting an indicator
 * is instant. A skeleton shows while loading; the rest of the page stays
 * interactive because the fetch is scoped to this section.
 *
 * Lines: A and B always, plus up to 4 pinned (6 max). Each line splits at 2023 —
 * solid for actuals (≤2023), dashed for projections (2024–25), sharing the 2023
 * point so there is no gap. Missing years break the line rather than interpolate.
 *
 * Interaction (mirrors the empire-ranking hoveredIso grammar): hovering a line OR
 * its legend row raises that line and dims all others to 0.15; a mousemove
 * crosshair snaps to the nearest year and reads every visible country's value
 * (or just the hovered one). All line colours are CSS custom properties
 * (--oecd-line-1…8) so both themes stay legible.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PROJECTION_FROM_YEAR } from '@/lib/oecd-curated';
import { formatValue, isProjected, toNum } from '@/lib/oecd-scales';
import OecdProjBadge from './OecdProjBadge';
import OecdTip, { tipAt } from './OecdTip';

const W = 760;
const H = 300;
const PAD = { top: 16, right: 18, bottom: 26, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const SPLIT_YEAR = PROJECTION_FROM_YEAR - 1; // 2023 — last actual
const MAX_YEAR = 2025;
const PROV = 'Actuals through 2023; 2024–25 are OECD Economic Outlook projections.';

const WINDOWS = [
  { win: 1961, label: '1961–2025' },
  { win: 1990, label: 'Since 1990' },
  { win: 2005, label: 'Last 20Y' },
];

export default function OecdHistory({
  model,
  slug,
  series,
  a,
  b,
  pins,
  win,
  onChangeWin,
  onTogglePin,
}) {
  const cacheRef = useRef(new Map()); // slug -> rows
  const cardRef = useRef(null);
  const svgRef = useRef(null);
  const [rows, setRows] = useState(() => cacheRef.current.get(slug) || null);
  const [loading, setLoading] = useState(!cacheRef.current.has(slug));
  const [hoveredCc, setHoveredCc] = useState(null); // iso or null
  const [cross, setCross] = useState(null); // { year, tip }

  useEffect(() => {
    const cached = cacheRef.current.get(slug);
    if (cached) {
      setRows(cached);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    const ctrl = new AbortController();
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/datasets/oecd/history?slug=${encodeURIComponent(slug)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        const data = Array.isArray(json.rows) ? json.rows : [];
        cacheRef.current.set(slug, data);
        setRows(data);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [slug]);

  const byArea = useMemo(() => {
    const m = new Map();
    for (const r of rows || []) {
      const v = toNum(r.obs_value);
      if (v == null) continue;
      if (!m.has(r.ref_area)) m.set(r.ref_area, []);
      m.get(r.ref_area).push({ year: Number(r.year), value: v });
    }
    for (const arr of m.values()) arr.sort((x, y) => x.year - y.year);
    return m;
  }, [rows]);

  // Shown lines: A, B, then pins (dedup, cap 6). Colour by position. Precompute
  // path segments and a year→value map for the crosshair.
  const lines = useMemo(() => {
    const order = [];
    const seen = new Set();
    for (const iso of [a, b, ...pins]) {
      if (!iso || seen.has(iso)) continue;
      seen.add(iso);
      order.push(iso);
      if (order.length >= 6) break;
    }
    return order.map((iso, i) => {
      const pts = (byArea.get(iso) || []).filter((p) => p.year >= win && p.year <= MAX_YEAR);
      const ptMap = new Map(pts.map((p) => [p.year, p.value]));
      return {
        iso,
        name:
          model.bySlug[slug]?.[iso]?.name ||
          model.countries.find((c) => c.iso === iso)?.name ||
          iso,
        color: `var(--oecd-line-${i + 1})`,
        points: pts,
        ptMap,
        segs: buildSegments(pts),
      };
    });
  }, [a, b, pins, byArea, win, model, slug]);

  const domain = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const s of lines) {
      for (const p of s.points) {
        if (p.value < min) min = p.value;
        if (p.value > max) max = p.value;
      }
    }
    if (!Number.isFinite(min)) return { min: 0, max: 1 };
    if (min === max) {
      const d = Math.abs(min) || 1;
      return { min: min - d, max: max + d };
    }
    const pad = (max - min) * 0.08;
    return { min: min - pad, max: max + pad };
  }, [lines]);

  const xOf = (year) => PAD.left + ((year - win) / (MAX_YEAR - win || 1)) * PLOT_W;
  const yOf = (value) =>
    PAD.top + (1 - (value - domain.min) / (domain.max - domain.min || 1)) * PLOT_H;
  const crossesZero = domain.min < 0 && domain.max > 0;

  // Map a pointer event to the nearest year and build the crosshair tooltip.
  const onMove = (e) => {
    const svg = svgRef.current;
    const card = cardRef.current;
    if (!svg || !card) return;
    const sr = svg.getBoundingClientRect();
    const vbX = ((e.clientX - sr.left) / sr.width) * W;
    const raw = win + ((vbX - PAD.left) / PLOT_W) * (MAX_YEAR - win);
    const year = Math.max(win, Math.min(MAX_YEAR, Math.round(raw)));

    const proj = isProjected(year);
    const src = hoveredCc ? lines.filter((l) => l.iso === hoveredCc) : lines;
    const readouts = src
      .map((l) => ({ name: l.name, v: l.ptMap.get(year) }))
      .filter((r) => r.v != null)
      .sort((x, y) => y.v - x.v);

    const cr = card.getBoundingClientRect();
    const localX = e.clientX - cr.left;
    const localY = e.clientY - cr.top;
    setCross({
      year,
      tip: tipAt(localX, localY, card, {
        title: `${year}${proj ? ' · PROJ' : ''}`,
        lines: readouts.length
          ? readouts.map((r) => ({
              label: r.name,
              value: formatValue(r.v, series),
              tone: r.v >= 0 ? 'pos' : 'neg',
            }))
          : [{ label: 'No data', value: '—' }],
      }),
    });
  };
  const clearCross = () => setCross(null);

  return (
    <section className="oecd-card oecd-history-card" ref={cardRef}>
      <div className="oecd-section-head">
        <div className="oecd-section-head-l">
          <span className="oecd-section-tag">HISTORY</span>
          <h2 className="oecd-section-title">{series?.label}</h2>
          <span className="oecd-section-unit">{series?.unitLabel}</span>
          <span title={PROV}>
            <OecdProjBadge label="2024–25 PROJ" />
          </span>
        </div>
        <div className="oecd-seg" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w.win}
              type="button"
              className={win === w.win ? 'is-active' : ''}
              aria-pressed={win === w.win}
              onClick={() => onChangeWin(w.win)}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="oecd-history-body">
        <div className="oecd-history-chart">
          {loading ? (
            <div className="oecd-history-skeleton" aria-busy="true" aria-label="Loading history…" />
          ) : (
            <svg
              ref={svgRef}
              className="oecd-history-svg"
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={`${series?.label} history, ${win}–${MAX_YEAR}`}
              onMouseMove={onMove}
              onMouseLeave={clearCross}
            >
              <title>{PROV}</title>
              {/* projection band + boundary */}
              <rect
                className="oecd-history-projband"
                x={xOf(SPLIT_YEAR)}
                y={PAD.top}
                width={Math.max(0, W - PAD.right - xOf(SPLIT_YEAR))}
                height={PLOT_H}
              />
              <line
                className="oecd-history-projline"
                x1={xOf(SPLIT_YEAR)}
                y1={PAD.top}
                x2={xOf(SPLIT_YEAR)}
                y2={PAD.top + PLOT_H}
              />
              {/* zero line for signed indicators */}
              {crossesZero ? (
                <line
                  className="oecd-history-zero"
                  x1={PAD.left}
                  y1={yOf(0)}
                  x2={W - PAD.right}
                  y2={yOf(0)}
                />
              ) : null}
              {/* crosshair guide */}
              {cross ? (
                <line
                  className="oecd-history-crosshair"
                  x1={xOf(cross.year)}
                  y1={PAD.top}
                  x2={xOf(cross.year)}
                  y2={PAD.top + PLOT_H}
                />
              ) : null}
              {/* axis frame */}
              <line
                className="oecd-history-axis"
                x1={PAD.left}
                y1={PAD.top}
                x2={PAD.left}
                y2={PAD.top + PLOT_H}
              />
              <line
                className="oecd-history-axis"
                x1={PAD.left}
                y1={PAD.top + PLOT_H}
                x2={W - PAD.right}
                y2={PAD.top + PLOT_H}
              />
              {/* y labels */}
              <text
                className="oecd-history-tick oecd-num"
                x={PAD.left - 6}
                y={PAD.top + 4}
                textAnchor="end"
              >
                {formatValue(domain.max, series)}
              </text>
              <text
                className="oecd-history-tick oecd-num"
                x={PAD.left - 6}
                y={PAD.top + PLOT_H}
                textAnchor="end"
              >
                {formatValue(domain.min, series)}
              </text>
              {/* x labels */}
              <text
                className="oecd-history-tick oecd-num"
                x={PAD.left}
                y={H - 8}
                textAnchor="start"
              >
                {win}
              </text>
              <text
                className="oecd-history-tick oecd-num"
                x={W - PAD.right}
                y={H - 8}
                textAnchor="end"
              >
                {MAX_YEAR}
              </text>

              {/* lines — visible paths, then wide invisible hover targets */}
              {lines.map((s) => {
                const dim = hoveredCc && hoveredCc !== s.iso;
                const strong = hoveredCc === s.iso;
                const style = {
                  stroke: s.color,
                  opacity: dim ? 0.15 : 1,
                  strokeWidth: strong ? 2.5 : 1.6,
                };
                return (
                  <g key={s.iso}>
                    {s.segs.solid.map((seg, i) => (
                      <polyline
                        key={`s${i}`}
                        className="oecd-history-line"
                        points={seg
                          .map((p) => `${xOf(p.year).toFixed(1)},${yOf(p.value).toFixed(1)}`)
                          .join(' ')}
                        style={style}
                      />
                    ))}
                    {s.segs.dashed.map((seg, i) => (
                      <polyline
                        key={`d${i}`}
                        className="oecd-history-line oecd-history-line--proj"
                        points={seg
                          .map((p) => `${xOf(p.year).toFixed(1)},${yOf(p.value).toFixed(1)}`)
                          .join(' ')}
                        style={style}
                      />
                    ))}
                    {cross && s.ptMap.get(cross.year) != null && !dim ? (
                      <circle
                        className="oecd-history-dot"
                        cx={xOf(cross.year)}
                        cy={yOf(s.ptMap.get(cross.year))}
                        r={strong ? 3.5 : 2.5}
                        style={{ fill: s.color }}
                      />
                    ) : null}
                  </g>
                );
              })}
              {/* wide invisible hover targets so thin lines are grabbable */}
              {lines.map((s) => (
                <g
                  key={`hit-${s.iso}`}
                  onMouseEnter={() => setHoveredCc(s.iso)}
                  onMouseLeave={() => setHoveredCc(null)}
                >
                  {[...s.segs.solid, ...s.segs.dashed].map((seg, i) => (
                    <polyline
                      key={i}
                      className="oecd-history-hit"
                      points={seg
                        .map((p) => `${xOf(p.year).toFixed(1)},${yOf(p.value).toFixed(1)}`)
                        .join(' ')}
                    />
                  ))}
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* right-rail legend / pin controls — hover syncs with the chart */}
        <div className="oecd-history-rail">
          <div className="oecd-history-rail-head">Countries</div>
          <div className="oecd-history-rail-list">
            {model.countries.map((c) => {
              const idx = lines.findIndex((s) => s.iso === c.iso);
              const isShown = idx >= 0;
              const role = c.iso === a ? 'A' : c.iso === b ? 'B' : pins.includes(c.iso) ? '⌖' : '+';
              const locked = c.iso === a || c.iso === b;
              return (
                <button
                  type="button"
                  key={c.iso}
                  className={`oecd-history-railrow ${isShown ? 'is-shown' : ''} ${
                    locked ? 'is-locked' : ''
                  } ${hoveredCc === c.iso ? 'is-hover' : ''}`}
                  onClick={() => !locked && onTogglePin(c.iso)}
                  onMouseEnter={() => isShown && setHoveredCc(c.iso)}
                  onMouseLeave={() => setHoveredCc(null)}
                  disabled={locked}
                  aria-pressed={isShown}
                  title={locked ? `${c.name} (fixed as ${role})` : `Toggle ${c.name}`}
                >
                  <span
                    className="oecd-history-chip"
                    style={{ background: isShown ? lines[idx].color : 'transparent' }}
                    aria-hidden="true"
                  />
                  <span className="oecd-history-railname">{c.name}</span>
                  <span className="oecd-history-role oecd-num">{role}</span>
                </button>
              );
            })}
          </div>
          <p className="oecd-history-rail-note">A and B are fixed. Pin up to 4 more.</p>
        </div>
      </div>
      <OecdTip tip={cross?.tip} />
    </section>
  );
}

/**
 * Split a country's ordered points into contiguous runs (break on year gaps),
 * then within each run into a solid (≤2023) and dashed (≥2023) sub-path that
 * share the 2023 point, so actuals→projections connect without a gap.
 */
function buildSegments(points) {
  const runs = [];
  let cur = [];
  for (const p of points) {
    if (cur.length && p.year !== cur[cur.length - 1].year + 1) {
      runs.push(cur);
      cur = [];
    }
    cur.push(p);
  }
  if (cur.length) runs.push(cur);

  const solid = [];
  const dashed = [];
  for (const run of runs) {
    const s = run.filter((p) => p.year <= SPLIT_YEAR);
    const d = run.filter((p) => p.year >= SPLIT_YEAR);
    if (s.length >= 2) solid.push(s);
    if (d.length >= 2) dashed.push(d);
  }
  return { solid, dashed };
}
