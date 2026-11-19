'use client';

/**
 * EzContourStrata: the 21st.dev "contour chart" on the Ezana stack (plain JS,
 * canvas, house tokens). A core ribbon traces the base series; translucent
 * strata stack from it up to a top series, so the thickness of the band at
 * any station is the gap between the two. Hovering snaps a crosshair to the
 * nearest station and opens a readout beside it; clicking pins it. Optional
 * annotation cards call out chosen stations. A data table opens below.
 *
 * Built for drawdown: base = cumulative return, top = high-water mark, gap =
 * drawdown from peak. Values are drawn exactly as given (no drift).
 *
 * Props
 *   stations   [{ id, label, base, top }]
 *   format     (v) => string, for base/top/gap values
 *   baseLabel, topLabel, gapLabel
 *   annotations [{ index, title, value, badge?, tone?: 'pos'|'neg'|'neu', sub }]
 *   height (420), defaultLayers (8), ariaLabel
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ez-contour-strata.css';

const PAD_TOP = 20;

function catmullRom(points, segments = 18) {
  if (points.length < 2) return points;
  const out = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    for (let s = 0; s < segments; s += 1) {
      const t = s / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function niceTicks(lo, hi, count = 5) {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

/** Resolve a CSS colour (token or value) to rgb components via the DOM. */
function resolveColor(el, value) {
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/[\d.]+/g) || [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));

export function EzContourStrata({
  stations,
  format = (v) => v.toFixed(2),
  baseLabel = 'Base',
  topLabel = 'Top',
  gapLabel = 'Gap',
  annotations = [],
  height = 420,
  defaultLayers = 8,
  ariaLabel = 'Contour chart',
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const dims = useRef({ w: 800, h: height, padLeft: 64, padBottom: 34 });
  const palette = useRef(null);
  const progress = useRef(1);
  const [layers, setLayers] = useState(defaultLayers);
  const [showNotes, setShowNotes] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [hover, setHover] = useState(null);
  const [pin, setPin] = useState(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [, setTick] = useState(0);
  const active = pin ?? hover;

  const domain = useMemo(() => {
    const vals = stations.flatMap((s) => [s.base, s.top]).filter(Number.isFinite);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const pad = (hi - lo || Math.abs(hi) || 1) * 0.12;
    lo -= pad;
    hi += pad;
    return { lo, hi, ticks: niceTicks(lo, hi, 5) };
  }, [stations]);

  const xOf = useCallback(
    (i) => {
      const { w, padLeft } = dims.current;
      return padLeft + (i / Math.max(1, stations.length - 1)) * (w - padLeft - 12);
    },
    [stations.length],
  );
  const yOf = useCallback(
    (v) => {
      const { h, padBottom } = dims.current;
      const plotH = h - PAD_TOP - padBottom;
      return PAD_TOP + plotH * (1 - (v - domain.lo) / (domain.hi - domain.lo || 1));
    },
    [domain],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !palette.current) return;
    const p = palette.current;
    const { w, h, padLeft, padBottom } = dims.current;
    const bottom = h - padBottom;
    const n = stations.length;
    ctx.clearRect(0, 0, w, h);

    /* Grid and axes */
    ctx.font = `500 11px ${p.mono}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    domain.ticks.forEach((t) => {
      const y = yOf(t);
      ctx.fillStyle = rgba(p.muted, 0.9);
      ctx.fillText(format(t), padLeft - 10, y);
      ctx.beginPath();
      ctx.moveTo(padLeft, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.strokeStyle = rgba(p.ink, 0.07);
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((w - padLeft) / 92))));
    stations.forEach((st, i) => {
      const x = xOf(i);
      const on = i === active;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, PAD_TOP);
      ctx.lineTo(Math.round(x) + 0.5, bottom);
      ctx.strokeStyle = on ? rgba(p.accent, 0.5) : rgba(p.ink, i === 0 ? 0.12 : 0.05);
      ctx.lineWidth = 1;
      ctx.stroke();
      if (showStations && (i % step === 0 || i === n - 1 || on)) {
        ctx.fillStyle = on ? rgba(p.accent, 1) : rgba(p.muted, 0.85);
        ctx.font = on ? `700 10px ${p.mono}` : `500 10px ${p.mono}`;
        ctx.fillText(st.label, x, bottom + 8);
      }
    });

    /* Reveal left to right on entrance. */
    const reveal = padLeft + (w - padLeft) * progress.current;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, reveal, h);
    ctx.clip();

    const baseNodes = stations.map((st, i) => ({ x: xOf(i), y: yOf(st.base) }));
    const smoothBase = catmullRom(baseNodes);
    for (let layer = layers; layer >= 1; layer -= 1) {
      const ratio = layer / layers;
      const nodes = stations.map((st, i) => ({
        x: xOf(i),
        y: yOf(st.base + (st.top - st.base) * ratio),
      }));
      const smooth = catmullRom(nodes);
      /* Near the base the strata are emerald; toward the top they warm. */
      const col =
        ratio < 0.5 ? mix(p.accent, p.warm, ratio * 2) : mix(p.warm, p.neg, (ratio - 0.5) * 2);
      ctx.beginPath();
      smooth.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      for (let i = smoothBase.length - 1; i >= 0; i -= 1)
        ctx.lineTo(smoothBase[i].x, smoothBase[i].y);
      ctx.closePath();
      ctx.fillStyle = rgba(col, 0.06 + (1 - ratio) * 0.1);
      ctx.fill();
      ctx.beginPath();
      smooth.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
      ctx.strokeStyle = rgba(col, layer === layers ? 0.55 : 0.18 + (1 - ratio) * 0.18);
      ctx.lineWidth = layer === layers ? 1.2 : 0.8;
      if (layer === layers) ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Core ribbon: the base series, with a soft emerald glow. */
    const half = Math.max(2.5, h * 0.006);
    ctx.beginPath();
    smoothBase.forEach((pt, i) =>
      i ? ctx.lineTo(pt.x, pt.y - half) : ctx.moveTo(pt.x, pt.y - half),
    );
    for (let i = smoothBase.length - 1; i >= 0; i -= 1)
      ctx.lineTo(smoothBase[i].x, smoothBase[i].y + half);
    ctx.closePath();
    ctx.shadowColor = rgba(p.accent, 0.55);
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(padLeft, 0, w, 0);
    grad.addColorStop(0, rgba(p.accent, 0.85));
    grad.addColorStop(1, rgba(p.accent, 1));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowBlur = 0;

    stations.forEach((st, i) => {
      const x = xOf(i);
      const on = i === active;
      if (on) {
        ctx.beginPath();
        ctx.moveTo(x, PAD_TOP);
        ctx.lineTo(x, bottom);
        ctx.strokeStyle = rgba(p.accent, 0.8);
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(x, yOf(st.top), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.warm, 1);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, yOf(st.base), 11, 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.accent, 0.22);
        ctx.fill();
      }
      if (showStations || on) {
        ctx.beginPath();
        ctx.arc(x, yOf(st.base), on ? 5 : 2.6, 0, Math.PI * 2);
        ctx.fillStyle = on ? rgba(p.ink, 1) : rgba(p.ink, 0.75);
        ctx.fill();
      }
    });
    ctx.restore();
  }, [stations, layers, showStations, active, domain, xOf, yOf, format]);

  /* Size, palette and entrance. */
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(stage);
    palette.current = {
      accent: resolveColor(stage, 'var(--brand-ezana-green)'),
      warm: resolveColor(stage, 'var(--amber)'),
      neg: resolveColor(stage, 'var(--negative)'),
      ink: resolveColor(stage, 'var(--text-primary)'),
      muted: resolveColor(stage, 'var(--text-muted)'),
      mono: css.getPropertyValue('--font-mono') || 'monospace',
    };
    const resize = () => {
      const r = stage.getBoundingClientRect();
      const w = Math.max(280, r.width);
      dims.current = { w, h: height, padLeft: w < 640 ? 52 : 64, padBottom: 34 };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
      setTick((t) => t + 1);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(stage);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    if (!reduce) {
      progress.current = 0;
      const t0 = performance.now();
      const tick = (t) => {
        progress.current = Math.min(1, (t - t0) / 900);
        progress.current = 1 - (1 - progress.current) ** 3;
        draw();
        if (progress.current < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, stations]);

  useEffect(() => {
    draw();
  }, [draw]);

  const nearest = (clientX) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = clientX - r.left;
    let best = null;
    let bd = Infinity;
    stations.forEach((_, i) => {
      const d = Math.abs(xOf(i) - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return bd <= Math.max(40, (dims.current.w - dims.current.padLeft) / stations.length)
      ? best
      : null;
  };

  /* Callout placement: a trough's card sits below the ribbon, the others
     above the top line; cards that would collide stack down instead. */
  const NOTE_W = 220;
  const NOTE_H = 104;
  const placedNotes = (() => {
    const { w } = dims.current;
    const out = [];
    [...annotations]
      .filter((a) => stations[a.index])
      .sort((a, b) => a.index - b.index)
      .forEach((a) => {
        const sx = xOf(a.index);
        const s0 = stations[a.index];
        const flip = sx > w * 0.62;
        const x0 = flip ? sx - NOTE_W : sx - 6;
        let top =
          a.tone === 'neg' && yOf(s0.base) + 18 + NOTE_H < height - 40
            ? yOf(s0.base) + 18
            : yOf(s0.top) - NOTE_H - 6;
        top = Math.max(6, Math.min(height - NOTE_H - 40, top));
        for (let guard = 0; guard < 6; guard += 1) {
          const hit = out.find(
            (o) => Math.abs(o.x0 - x0) < NOTE_W + 8 && Math.abs(o.top - top) < NOTE_H + 6,
          );
          if (!hit) break;
          top =
            hit.top + NOTE_H + 8 <= height - NOTE_H - 40
              ? hit.top + NOTE_H + 8
              : hit.top - NOTE_H - 8;
          top = Math.max(6, top);
        }
        out.push({ a, x0, top, flip, left: sx - 6, right: w - sx - 6 });
      });
    return out;
  })();

  const st = active != null ? stations[active] : null;
  const tip = (() => {
    if (!st) return null;
    const { w } = dims.current;
    const x = xOf(active);
    const boxW = 232;
    return {
      left: x + boxW + 20 > w ? Math.max(8, x - boxW - 14) : x + 14,
      top: Math.max(8, Math.min(height - 170, yOf(st.base) - 70)),
    };
  })();
  const prev = active > 0 ? stations[active - 1] : null;

  const pinTo = (i) => setPin((p) => (p === i ? null : i));

  return (
    <div className="ecs">
      <div
        ref={stageRef}
        className="ecs-stage"
        style={{ height }}
        role="group"
        tabIndex={0}
        aria-label={`${ariaLabel}. Arrow keys move between stations, Enter pins one.`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const cur = active ?? (e.key === 'ArrowRight' ? -1 : stations.length);
            const next = Math.max(
              0,
              Math.min(stations.length - 1, cur + (e.key === 'ArrowRight' ? 1 : -1)),
            );
            setPin(null);
            setHover(next);
          } else if (e.key === 'Enter' && active != null) {
            e.preventDefault();
            pinTo(active);
          } else if (e.key === 'Escape') {
            setPin(null);
            setHover(null);
          }
        }}
      >
        <canvas
          ref={canvasRef}
          className="ecs-canvas"
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(e) => setHover(nearest(e.clientX))}
          onMouseLeave={() => setHover(null)}
          onClick={() => {
            if (hover != null) pinTo(hover);
          }}
          onTouchMove={(e) => e.touches?.[0] && setHover(nearest(e.touches[0].clientX))}
        />

        {showNotes
          ? placedNotes.map(({ a, left, right, top, flip }) => (
              <button
                key={a.title}
                type="button"
                className={`ecs-note${flip ? ' is-flip' : ''}`}
                style={flip ? { right, top } : { left, top }}
                onClick={() => pinTo(a.index)}
              >
                <span className="ecs-note__lead">
                  <span className="ecs-note__dot" />
                  <span className="ecs-note__rule" />
                  <span className="ecs-note__title">{a.title}</span>
                </span>
                <span className="ecs-note__card">
                  <span className="ecs-note__row">
                    <span className="ecs-note__value">{a.value}</span>
                    {a.badge ? (
                      <span className={`ecs-badge is-${a.tone || 'neu'}`}>{a.badge}</span>
                    ) : null}
                  </span>
                  {a.sub ? <span className="ecs-note__sub">{a.sub}</span> : null}
                </span>
              </button>
            ))
          : null}

        {st && tip ? (
          <div className="ecs-tip" style={{ left: tip.left, top: tip.top }} role="status">
            <div className="ecs-tip__head">
              <span className="ecs-tip__label">{st.label}</span>
              {pin != null ? <span className="ecs-tip__pin">Pinned</span> : null}
            </div>
            <dl className="ecs-tip__grid">
              <dt>{baseLabel}</dt>
              <dd>{format(st.base)}</dd>
              <dt>{topLabel}</dt>
              <dd>{format(st.top)}</dd>
              <dt>{gapLabel}</dt>
              <dd className={st.top - st.base > 1e-9 ? 'is-neg' : ''}>
                {st.top - st.base > 1e-9
                  ? `−${format(st.top - st.base).replace(/^[+−-]/, '')}`
                  : 'At peak'}
              </dd>
              {prev ? (
                <>
                  <dt>Since previous</dt>
                  <dd className={st.base - prev.base >= 0 ? 'is-pos' : 'is-neg'}>
                    {st.base - prev.base >= 0 ? '+' : '−'}
                    {format(Math.abs(st.base - prev.base)).replace(/^[+−-]/, '')}
                  </dd>
                </>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>

      {showNotes && annotations.length ? (
        <div className="ecs-notes-mobile">
          {annotations.map((a) => (
            <button
              key={a.title}
              type="button"
              className="ecs-mnote"
              onClick={() => pinTo(a.index)}
            >
              <span className="ecs-note__title">{a.title}</span>
              <span className="ecs-note__row">
                <span className="ecs-note__value">{a.value}</span>
                {a.badge ? (
                  <span className={`ecs-badge is-${a.tone || 'neu'}`}>{a.badge}</span>
                ) : null}
              </span>
              {a.sub ? <span className="ecs-note__sub">{a.sub}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ecs-bar" role="toolbar" aria-label="Chart controls">
        <button
          type="button"
          className="ecs-bar__btn"
          aria-pressed={showNotes}
          onClick={() => setShowNotes((v) => !v)}
        >
          <span className="ecs-bar__dot" style={{ opacity: showNotes ? 1 : 0.3 }} /> Annotations
        </button>
        <span className="ecs-bar__sep" aria-hidden="true" />
        <button
          type="button"
          className="ecs-bar__btn"
          aria-pressed={showStations}
          onClick={() => setShowStations((v) => !v)}
        >
          <span className="ecs-bar__dot" style={{ opacity: showStations ? 1 : 0.3 }} /> Stations
        </button>
        <span className="ecs-bar__sep" aria-hidden="true" />
        <label className="ecs-bar__range">
          Strata
          <input
            type="range"
            min={4}
            max={12}
            value={layers}
            onChange={(e) => setLayers(Number(e.target.value) || defaultLayers)}
          />
          <span className="ecs-bar__val">{layers}</span>
        </label>
        <span className="ecs-bar__sep" aria-hidden="true" />
        <button
          type="button"
          className="ecs-bar__btn ecs-bar__btn--accent"
          aria-expanded={tableOpen}
          onClick={() => setTableOpen((v) => !v)}
        >
          <i className="bi bi-table" aria-hidden="true" /> Data table
        </button>
      </div>

      {tableOpen ? (
        <div className="ecs-table-wrap">
          <table className="ecs-table">
            <thead>
              <tr>
                <th scope="col">Station</th>
                <th scope="col">{baseLabel}</th>
                <th scope="col">{topLabel}</th>
                <th scope="col">{gapLabel}</th>
              </tr>
            </thead>
            <tbody>
              {stations.map((s, i) => (
                <tr
                  key={s.id ?? s.label}
                  className={pin === i ? 'is-pinned' : undefined}
                  onClick={() => pinTo(i)}
                >
                  <th scope="row">{s.label}</th>
                  <td>{format(s.base)}</td>
                  <td>{format(s.top)}</td>
                  <td className={s.top - s.base > 1e-9 ? 'is-neg' : ''}>
                    {s.top - s.base > 1e-9
                      ? `−${format(s.top - s.base).replace(/^[+−-]/, '')}`
                      : 'At peak'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export default EzContourStrata;
