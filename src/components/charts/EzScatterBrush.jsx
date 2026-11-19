'use client';

/**
 * EzScatterBrush: the 21st.dev "scatter brush" (Isaiah Bjork, MIT) on the
 * Ezana stack (plain JS, canvas, house tokens). Drag on the plot to brush a
 * region: points inside light up in emerald, the rest fade back, the marginal
 * histograms (top and right) show the selection against everything, and the
 * readout gives n, the means, Pearson r and, with `trend`, the least-squares
 * fit and r². Drag inside the brush to move it, drag an edge or corner to
 * resize, click empty space to clear. Keyboard: Enter or an arrow adds a
 * selection, arrows move it (Shift further), Alt with arrows resizes,
 * Escape clears.
 *
 * Props
 *   points   [{ id?, x, y, label? }]
 *   xLabel, yLabel, formatX, formatY
 *   xDomain?, yDomain?   [lo, hi]
 *   marginals (true), bins (24), trend (false), height (420), ariaLabel
 *   onBrushChange(brush | null, selectedIndexes)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ez-scatter-brush.css';

const LEFT = 48;
const BOTTOM = 40;
const MARGIN_H = 40;
const MARGIN_GAP = 8;
const TOP_TEXT = 28;
const RADIUS = 2.8;
const HANDLE = 8;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtR = (v) => (v < 0 ? `−${(-v).toFixed(2)}` : v.toFixed(2));

function niceDomain(lo, hi) {
  if (lo === hi) return [lo - 1, hi + 1];
  const span = hi - lo;
  const mag = 10 ** Math.floor(Math.log10(span / 5));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 6) || span / 5;
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}
function niceTicks(lo, hi, count) {
  const span = hi - lo || 1;
  const raw = span / Math.max(2, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function statsOf(points, idx) {
  const list = idx ?? points.map((_, i) => i);
  const n = list.length;
  if (!n) return { n: 0, mx: NaN, my: NaN, r: NaN, a: NaN, b: NaN, xMin: NaN, xMax: NaN };
  let sx = 0;
  let sy = 0;
  list.forEach((i) => {
    sx += points[i].x;
    sy += points[i].y;
  });
  const mx = sx / n;
  const my = sy / n;
  let cxy = 0;
  let cxx = 0;
  let cyy = 0;
  let xMin = Infinity;
  let xMax = -Infinity;
  list.forEach((i) => {
    const dx = points[i].x - mx;
    const dy = points[i].y - my;
    cxy += dx * dy;
    cxx += dx * dx;
    cyy += dy * dy;
    xMin = Math.min(xMin, points[i].x);
    xMax = Math.max(xMax, points[i].x);
  });
  const b = cxx ? cxy / cxx : NaN;
  return {
    n,
    mx,
    my,
    r: cxx && cyy ? cxy / Math.sqrt(cxx * cyy) : NaN,
    a: my - b * mx,
    b,
    xMin,
    xMax,
  };
}

const inBrush = (p, br) =>
  !br ||
  (p.x >= Math.min(br.x0, br.x1) &&
    p.x <= Math.max(br.x0, br.x1) &&
    p.y >= Math.min(br.y0, br.y1) &&
    p.y <= Math.max(br.y0, br.y1));

function resolveColor(el, value) {
  const probe = document.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  el.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0];
  probe.remove();
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function EzScatterBrush({
  points,
  xLabel = 'x',
  yLabel = 'y',
  formatX = (v) => v.toFixed(1),
  formatY = (v) => v.toFixed(1),
  xDomain,
  yDomain,
  marginals = true,
  bins = 24,
  trend = false,
  height = 420,
  ariaLabel = 'Scatter plot',
  onBrushChange,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const size = useRef({ w: 640, h: height });
  const plotRef = useRef({ l: 0, r: 0, t: 0, b: 0 });
  const pal = useRef(null);
  const drag = useRef(null);
  const [brush, setBrushState] = useState(null);
  const [hover, setHover] = useState(null);
  const [, setTick] = useState(0);
  const [announce, setAnnounce] = useState('');

  const dom = useMemo(() => {
    if (!points.length) return { x: [0, 1], y: [0, 1] };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      x: xDomain || niceDomain(Math.min(...xs), Math.max(...xs)),
      y: yDomain || niceDomain(Math.min(...ys), Math.max(...ys)),
    };
  }, [points, xDomain, yDomain]);

  const selected = useMemo(
    () => (brush ? points.map((p, i) => (inBrush(p, brush) ? i : -1)).filter((i) => i >= 0) : null),
    [points, brush],
  );
  const stats = useMemo(() => statsOf(points, selected), [points, selected]);

  const X = useCallback(
    (v) => {
      const p = plotRef.current;
      return p.l + ((v - dom.x[0]) / (dom.x[1] - dom.x[0])) * (p.r - p.l);
    },
    [dom],
  );
  const Y = useCallback(
    (v) => {
      const p = plotRef.current;
      return p.b - ((v - dom.y[0]) / (dom.y[1] - dom.y[0])) * (p.b - p.t);
    },
    [dom],
  );

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const p = pal.current;
    if (!ctx || !p) return;
    const { w, h } = size.current;
    const mH = marginals ? MARGIN_H + MARGIN_GAP : 0;
    const plot = { l: LEFT, r: w - mH - 8, t: (w < 560 ? TOP_TEXT + 18 : TOP_TEXT) + mH, b: h - BOTTOM };
    plotRef.current = plot;
    ctx.clearRect(0, 0, w, h);

    /* Grid and tick labels */
    const xt = niceTicks(dom.x[0], dom.x[1], Math.max(3, Math.floor((plot.r - plot.l) / 90)));
    const yt = niceTicks(dom.y[0], dom.y[1], Math.max(3, Math.floor((plot.b - plot.t) / 56)));
    ctx.strokeStyle = rgba(p.ink, 0.07);
    ctx.lineWidth = 1;
    ctx.beginPath();
    xt.forEach((v) => {
      const x = Math.round(X(v)) + 0.5;
      ctx.moveTo(x, plot.t);
      ctx.lineTo(x, plot.b);
    });
    yt.forEach((v) => {
      const y = Math.round(Y(v)) + 0.5;
      ctx.moveTo(plot.l, y);
      ctx.lineTo(plot.r, y);
    });
    ctx.stroke();
    ctx.font = `500 10.5px ${p.mono}`;
    ctx.fillStyle = rgba(p.muted, 0.95);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    xt.forEach((v) => ctx.fillText(formatX(v), X(v), plot.b + 8));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yt.forEach((v) => ctx.fillText(formatY(v), plot.l - 8, Y(v)));

    const B = brush;
    const n = points.length;

    /* Marginal histograms: everything as a ghost, the selection in emerald. */
    if (marginals && n) {
      const cx = new Array(bins).fill(0);
      const cy = new Array(bins).fill(0);
      const sx = new Array(bins).fill(0);
      const sy = new Array(bins).fill(0);
      points.forEach((pt) => {
        const bx = clamp(
          Math.floor(((pt.x - dom.x[0]) / (dom.x[1] - dom.x[0])) * bins),
          0,
          bins - 1,
        );
        const by = clamp(
          Math.floor(((pt.y - dom.y[0]) / (dom.y[1] - dom.y[0])) * bins),
          0,
          bins - 1,
        );
        cx[bx] += 1;
        cy[by] += 1;
        if (!B || inBrush(pt, B)) {
          sx[bx] += 1;
          sy[by] += 1;
        }
      });
      const mx = Math.max(1, ...cx);
      const my = Math.max(1, ...cy);
      const bwx = (plot.r - plot.l) / bins;
      const bwy = (plot.b - plot.t) / bins;
      for (let k = 0; k < bins; k += 1) {
        const x = plot.l + k * bwx + 1;
        const top = plot.t - MARGIN_GAP;
        ctx.fillStyle = rgba(p.ink, 0.12);
        ctx.fillRect(
          x,
          top - (cx[k] / mx) * MARGIN_H,
          Math.max(1, bwx - 2),
          (cx[k] / mx) * MARGIN_H,
        );
        const y = plot.b - (k + 1) * bwy + 1;
        const right = plot.r + MARGIN_GAP;
        ctx.fillRect(right, y, (cy[k] / my) * MARGIN_H, Math.max(1, bwy - 2));
        if (B) {
          ctx.fillStyle = rgba(p.accent, 0.7);
          ctx.fillRect(
            x,
            top - (sx[k] / mx) * MARGIN_H,
            Math.max(1, bwx - 2),
            (sx[k] / mx) * MARGIN_H,
          );
          ctx.fillRect(right, y, (sy[k] / my) * MARGIN_H, Math.max(1, bwy - 2));
        }
      }
    }

    /* Points: unselected first, selected on top. */
    for (let pass = 0; pass < 2; pass += 1) {
      points.forEach((pt) => {
        const sel = !B || inBrush(pt, B);
        if (pass === 0 ? sel : !sel) return;
        ctx.fillStyle = !B ? rgba(p.ink, 0.45) : sel ? rgba(p.accent, 0.88) : rgba(p.ink, 0.13);
        ctx.beginPath();
        ctx.arc(X(pt.x), Y(pt.y), RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    /* Zero line on y when the domain spans it (returns cross break-even). */
    if (dom.y[0] < 0 && dom.y[1] > 0) {
      ctx.strokeStyle = rgba(p.ink, 0.25);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(plot.l, Math.round(Y(0)) + 0.5);
      ctx.lineTo(plot.r, Math.round(Y(0)) + 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    /* Brush */
    if (B) {
      const bx0 = X(Math.min(B.x0, B.x1));
      const bx1 = X(Math.max(B.x0, B.x1));
      const by0 = Y(Math.max(B.y0, B.y1));
      const by1 = Y(Math.min(B.y0, B.y1));
      ctx.fillStyle = rgba(p.accent, 0.07);
      ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
      ctx.strokeStyle = rgba(p.accent, 1);
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(bx0) + 0.5,
        Math.round(by0) + 0.5,
        Math.round(bx1 - bx0),
        Math.round(by1 - by0),
      );
      ctx.fillStyle = rgba(p.accent, 1);
      [
        [bx0, by0],
        [bx1, by0],
        [bx0, by1],
        [bx1, by1],
      ].forEach(([hx, hy]) => ctx.fillRect(Math.round(hx) - 3, Math.round(hy) - 3, 6, 6));
      if (marginals) {
        ctx.strokeStyle = rgba(p.accent, 0.35);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(Math.round(bx0) + 0.5, by0);
        ctx.lineTo(Math.round(bx0) + 0.5, plot.t - MARGIN_GAP - MARGIN_H);
        ctx.moveTo(Math.round(bx1) + 0.5, by0);
        ctx.lineTo(Math.round(bx1) + 0.5, plot.t - MARGIN_GAP - MARGIN_H);
        ctx.moveTo(bx1, Math.round(by0) + 0.5);
        ctx.lineTo(plot.r + MARGIN_GAP + MARGIN_H, Math.round(by0) + 0.5);
        ctx.moveTo(bx1, Math.round(by1) + 0.5);
        ctx.lineTo(plot.r + MARGIN_GAP + MARGIN_H, Math.round(by1) + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    /* Trend: least squares over the selection, across the x range it covers. */
    const F = stats;
    if (trend && F.n >= 3 && Number.isFinite(F.b) && F.xMax > F.xMin) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(plot.l, plot.t, plot.r - plot.l, plot.b - plot.t);
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(F.xMin), Y(F.a + F.b * F.xMin));
      ctx.lineTo(X(F.xMax), Y(F.a + F.b * F.xMax));
      ctx.strokeStyle = rgba(p.stage, 0.85);
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.strokeStyle = B ? rgba(p.accent, 1) : rgba(p.ink, 0.9);
      ctx.lineWidth = 1.75;
      ctx.stroke();
      ctx.restore();
    }

    if (hover != null && points[hover]) {
      ctx.beginPath();
      ctx.arc(X(points[hover].x), Y(points[hover].y), 5.5, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(p.ink, 1);
      ctx.stroke();
    }
  }, [points, dom, brush, hover, marginals, bins, trend, stats, X, Y, formatX, formatY]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const css = getComputedStyle(wrap);
    pal.current = {
      accent: resolveColor(wrap, 'var(--brand-ezana-green)'),
      ink: resolveColor(wrap, 'var(--text-primary)'),
      muted: resolveColor(wrap, 'var(--text-muted)'),
      stage: resolveColor(wrap, 'var(--surface-card, var(--bg-primary))'),
      mono: css.getPropertyValue('--font-mono') || 'monospace',
    };
    const ctx = canvas.getContext('2d');
    const resize = () => {
      const w = Math.max(280, wrap.getBoundingClientRect().width);
      size.current = { w, h: height };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setTick((t) => t + 1);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);
    return () => ro?.disconnect();
  }, [height]);

  useEffect(() => {
    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  });

  const describe = (s) =>
    `${s.n} of ${points.length} selected${
      s.n
        ? `, mean ${xLabel} ${formatX(s.mx)}, mean ${yLabel} ${formatY(s.my)}${
            Number.isFinite(s.r) ? `, correlation ${fmtR(s.r)}` : ''
          }`
        : ''
    }`;

  const setBrush = (b, say = false) => {
    setBrushState(b);
    const sel = b ? points.map((p, i) => (inBrush(p, b) ? i : -1)).filter((i) => i >= 0) : [];
    onBrushChange?.(b, sel);
    if (say) setAnnounce(b ? describe(statsOf(points, sel)) : 'Selection cleared');
  };

  const local = (e) => {
    const r = wrapRef.current?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
  };
  const toData = (px, py) => {
    const p = plotRef.current;
    return {
      x: clamp(dom.x[0] + ((px - p.l) / (p.r - p.l)) * (dom.x[1] - dom.x[0]), dom.x[0], dom.x[1]),
      y: clamp(dom.y[0] + ((p.b - py) / (p.b - p.t)) * (dom.y[1] - dom.y[0]), dom.y[0], dom.y[1]),
    };
  };
  const modeAt = (px, py) => {
    if (!brush) return null;
    const l = X(Math.min(brush.x0, brush.x1));
    const r = X(Math.max(brush.x0, brush.x1));
    const t = Y(Math.max(brush.y0, brush.y1));
    const b = Y(Math.min(brush.y0, brush.y1));
    if (px < l - HANDLE || px > r + HANDLE || py < t - HANDLE || py > b + HANDLE) return null;
    const nl = Math.abs(px - l) < HANDLE;
    const nr = Math.abs(px - r) < HANDLE;
    const nt = Math.abs(py - t) < HANDLE;
    const nb = Math.abs(py - b) < HANDLE;
    if (nt && nl) return 'nw';
    if (nt && nr) return 'ne';
    if (nb && nl) return 'sw';
    if (nb && nr) return 'se';
    if (nl) return 'w';
    if (nr) return 'e';
    if (nt) return 'n';
    if (nb) return 's';
    return 'move';
  };
  const CURSOR = {
    move: 'move',
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
  };

  const onPointerDown = (e) => {
    const pt = local(e);
    if (!pt) return;
    const p = plotRef.current;
    if (pt.x < p.l - HANDLE || pt.x > p.r + HANDLE || pt.y < p.t - HANDLE || pt.y > p.b + HANDLE)
      return;
    drag.current = {
      mode: modeAt(pt.x, pt.y) || 'new',
      id: e.pointerId,
      sx: pt.x,
      sy: pt.y,
      start: brush,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setHover(null);
  };
  const onPointerMove = (e) => {
    const pt = local(e);
    if (!pt) return;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const a = toData(d.sx, d.sy);
      const b = toData(pt.x, pt.y);
      if (d.mode === 'new') {
        if (Math.abs(pt.x - d.sx) < 3 && Math.abs(pt.y - d.sy) < 3) return;
        setBrush({ x0: a.x, x1: b.x, y0: a.y, y1: b.y });
        return;
      }
      const sb = d.start;
      if (!sb) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const nb = {
        x0: Math.min(sb.x0, sb.x1),
        x1: Math.max(sb.x0, sb.x1),
        y0: Math.min(sb.y0, sb.y1),
        y1: Math.max(sb.y0, sb.y1),
      };
      if (d.mode === 'move') {
        const bw = nb.x1 - nb.x0;
        const bh = nb.y1 - nb.y0;
        const x0 = clamp(nb.x0 + dx, dom.x[0], dom.x[1] - bw);
        const y0 = clamp(nb.y0 + dy, dom.y[0], dom.y[1] - bh);
        setBrush({ x0, x1: x0 + bw, y0, y1: y0 + bh });
        return;
      }
      if (d.mode.includes('w')) nb.x0 = Math.min(nb.x1, nb.x0 + dx);
      if (d.mode.includes('e')) nb.x1 = Math.max(nb.x0, nb.x1 + dx);
      if (d.mode.includes('s')) nb.y0 = Math.min(nb.y1, nb.y0 + dy);
      if (d.mode.includes('n')) nb.y1 = Math.max(nb.y0, nb.y1 + dy);
      setBrush(nb);
      return;
    }
    if (wrapRef.current) wrapRef.current.style.cursor = CURSOR[modeAt(pt.x, pt.y)] || 'crosshair';
    let best = null;
    let bd = 16 * 16;
    points.forEach((p, i) => {
      const dd = (X(p.x) - pt.x) ** 2 + (Y(p.y) - pt.y) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    setHover(best);
  };
  const endDrag = (e) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const pt = local(e) || { x: d.sx, y: d.sy };
    const moved = Math.abs(pt.x - d.sx) > 3 || Math.abs(pt.y - d.sy) > 3;
    if (d.mode === 'new' && !moved) setBrush(null, true);
    else setAnnounce(describe(stats));
    drag.current = null;
  };
  const onKeyDown = (e) => {
    const [x0, x1] = dom.x;
    const [y0, y1] = dom.y;
    if (e.key === 'Escape') {
      if (!brush) return;
      e.preventDefault();
      setBrush(null, true);
      return;
    }
    if (!brush && (e.key === 'Enter' || e.key.startsWith('Arrow'))) {
      e.preventDefault();
      const bw = (x1 - x0) * 0.3;
      const bh = (y1 - y0) * 0.3;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      setBrush({ x0: cx - bw / 2, x1: cx + bw / 2, y0: cy - bh / 2, y1: cy + bh / 2 }, true);
      return;
    }
    if (!brush || !e.key.startsWith('Arrow')) return;
    e.preventDefault();
    const f = e.shiftKey ? 0.1 : 0.02;
    const dx = (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) * (x1 - x0) * f;
    const dy = (e.key === 'ArrowDown' ? -1 : e.key === 'ArrowUp' ? 1 : 0) * (y1 - y0) * f;
    const nb = {
      x0: Math.min(brush.x0, brush.x1),
      x1: Math.max(brush.x0, brush.x1),
      y0: Math.min(brush.y0, brush.y1),
      y1: Math.max(brush.y0, brush.y1),
    };
    if (e.altKey) {
      nb.x1 = clamp(nb.x1 + dx, nb.x0 + (x1 - x0) * 0.02, x1);
      nb.y1 = clamp(nb.y1 + dy, nb.y0 + (y1 - y0) * 0.02, y1);
    } else {
      const bw = nb.x1 - nb.x0;
      const bh = nb.y1 - nb.y0;
      nb.x0 = clamp(nb.x0 + dx, x0, x1 - bw);
      nb.x1 = nb.x0 + bw;
      nb.y0 = clamp(nb.y0 + dy, y0, y1 - bh);
      nb.y1 = nb.y0 + bh;
    }
    setBrush(nb, true);
  };

  const hp = hover != null ? points[hover] : null;
  const tip = (() => {
    if (!hp) return null;
    const x = X(hp.x);
    const y = Y(hp.y);
    const { w } = size.current;
    return {
      left: x + 176 > w ? x - 172 : x + 12,
      top: Math.max(4, Math.min(height - 80, y - 30)),
    };
  })();

  return (
    <div className="esb" style={{ height }}>
      <div
        ref={wrapRef}
        className="esb-stage"
        role="group"
        aria-roledescription="chart"
        aria-label={`${ariaLabel}. Drag to select a region. Enter or an arrow key adds a selection, arrows move it, Shift moves further, Alt with arrows resizes, Escape clears.`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
      >
        <canvas
          ref={canvasRef}
          className="esb-canvas"
          role="img"
          aria-label={`${ariaLabel}: ${describe(stats)}`}
        />
        <div className="esb-readout" aria-hidden="true">
          <span>
            n <b>{stats.n}</b>
            <span className="esb-faint"> / {points.length}</span>
          </span>
          <span>
            x̄ <b>{stats.n ? formatX(stats.mx) : '–'}</b>
          </span>
          <span>
            ȳ <b>{stats.n ? formatY(stats.my) : '–'}</b>
          </span>
          <span>
            r{' '}
            <b className={brush ? 'is-accent' : ''}>
              {Number.isFinite(stats.r) ? fmtR(stats.r) : '–'}
            </b>
          </span>
          {trend ? (
            <span>
              r² <b>{Number.isFinite(stats.r) ? (stats.r * stats.r).toFixed(2) : '–'}</b>
            </span>
          ) : null}
          {trend && Number.isFinite(stats.b) ? (
            <span>
              slope <b>{formatY(stats.b)}</b>
              <span className="esb-faint"> per {xLabel.toLowerCase()}</span>
            </span>
          ) : null}
        </div>
        <span className="esb-xlabel" aria-hidden="true">
          {xLabel} →
        </span>
        <span className="esb-ylabel" aria-hidden="true" style={{ top: height - BOTTOM }}>
          {yLabel} →
        </span>
        {hp && tip ? (
          <div className="esb-tip" style={{ left: tip.left, top: tip.top }}>
            {hp.label ? <div className="esb-tip__title">{hp.label}</div> : null}
            <div className="esb-tip__row">
              <span>{xLabel}</span>
              <b>{formatX(hp.x)}</b>
            </div>
            <div className="esb-tip__row">
              <span>{yLabel}</span>
              <b>{formatY(hp.y)}</b>
            </div>
          </div>
        ) : null}
      </div>
      <span className="esb-sr" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

export default EzScatterBrush;
