'use client';

/**
 * The company price chart in the Sonar band's fundamentals card.
 *
 * Nov 21: was a bare sparkline. It now carries a price axis, a month axis, a
 * marked end point labelled with the current price, and a crosshair on hover,
 * so it reads like the chart a real ping returns rather than a decoration.
 *
 * useLiveQuote pulls the current quote and the year-to-date closes from
 * /api/landing/live-quote when the card mounts, and again every minute while
 * the market is open and the tab is visible. The demo brief is cached, so
 * without it the chart would end at whatever the price was when the brief
 * was written.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const POLL_MS = 60 * 1000;

export function useLiveQuote(symbol) {
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!symbol) return undefined;
    let alive = true;
    let timer = null;
    const run = async () => {
      try {
        const res = await fetch(`/api/landing/live-quote?symbol=${encodeURIComponent(symbol)}`);
        const data = res.ok ? await res.json() : null;
        if (!alive) return;
        if (data && typeof data.price === 'number') setQuote(data);
        if (data?.open) timer = setTimeout(tick, POLL_MS);
      } catch {
        /* fail soft: the card keeps the series the brief came with */
      }
    };
    const tick = () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      run();
    };
    run();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [symbol]);
  return quote;
}

function usePixelBox() {
  const [box, setBox] = useState(null);
  const roRef = useRef(null);
  const setNode = useCallback((node) => {
    if (roRef.current) {
      roRef.current.disconnect();
      roRef.current = null;
    }
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setBox({ w: width, h: height });
    });
    ro.observe(node);
    roRef.current = ro;
  }, []);
  return [box, setNode];
}

/** Three to five round price levels covering [min, max]. */
function niceTicks(min, max, target = 4) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target + 0.5) || mag * 10;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtPrice = (v) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtTick = (v) => `$${v >= 1000 ? Math.round(v).toLocaleString('en-US') : Math.round(v)}`;
const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return `${MONTHS[m - 1]} ${day}, ${y}`;
};

const PAD = { top: 22, right: 8, bottom: 18, left: 40 };

export default function SonarPriceChart({ points, dates, label = 'Price' }) {
  const [box, setNode] = usePixelBox();
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    if (!Array.isArray(points) || points.length < 2 || !box) return null;
    const W = box.w;
    const H = box.h;
    const pw = Math.max(10, W - PAD.left - PAD.right);
    const ph = Math.max(10, H - PAD.top - PAD.bottom);
    const lo = Math.min(...points);
    const hi = Math.max(...points);
    const ticks = niceTicks(lo, hi, ph < 90 ? 3 : 4);
    const yMin = Math.min(lo, ticks[0]);
    const yMax = Math.max(hi, ticks[ticks.length - 1]);
    const ySpan = yMax - yMin || 1;
    const x = (i) => PAD.left + (i / (points.length - 1)) * pw;
    const y = (v) => PAD.top + ph - ((v - yMin) / ySpan) * ph;
    const line = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${PAD.left},${PAD.top + ph} ${line} ${x(points.length - 1).toFixed(1)},${PAD.top + ph}`;

    /* Month axis: the first trading day of each month, thinned to fit. With
       no dates (an older cached brief), the ends are labelled instead. */
    let xTicks = [];
    if (Array.isArray(dates) && dates.length === points.length) {
      let prev = '';
      dates.forEach((d, i) => {
        const ym = d.slice(0, 7);
        if (ym !== prev) {
          xTicks.push({ i, text: MONTHS[Number(d.slice(5, 7)) - 1] });
          prev = ym;
        }
      });
      const room = Math.max(2, Math.floor(pw / 34));
      const every = Math.ceil(xTicks.length / room);
      xTicks = xTicks.filter((_, k) => k % every === 0);
    } else {
      xTicks = [
        { i: 0, text: 'Jan' },
        { i: points.length - 1, text: 'Now', end: true },
      ];
    }

    return { W, H, ph, ticks, x, y, line, area, xTicks };
  }, [points, dates, box]);

  const last = Array.isArray(points) && points.length ? points[points.length - 1] : null;

  const onMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const pw = geo.W - PAD.left - PAD.right;
    const i = Math.round(((px - PAD.left) / pw) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const endI = Array.isArray(points) ? points.length - 1 : 0;

  return (
    <div
      className="snr-spark snr-pchart"
      ref={setNode}
      role="img"
      aria-label={
        last != null
          ? `${label} chart, year to date. Latest ${fmtPrice(last)}${dates?.length ? ` on ${fmtDate(dates[endI])}` : ''}.`
          : `${label} chart`
      }
    >
      {geo ? (
        <svg
          viewBox={`0 0 ${geo.W} ${geo.H}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="snr-pchart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--snr-mint)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--snr-mint)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Price axis: recessive gridlines with their levels on the left. */}
          {geo.ticks.map((t) => (
            <g key={t}>
              <line
                className="snr-pchart-grid"
                x1={PAD.left}
                x2={geo.W - PAD.right}
                y1={geo.y(t)}
                y2={geo.y(t)}
              />
              <text className="snr-pchart-tick" x={PAD.left - 6} y={geo.y(t)} dy="0.32em" textAnchor="end">
                {fmtTick(t)}
              </text>
            </g>
          ))}

          {/* Time axis. */}
          <line
            className="snr-pchart-axis"
            x1={PAD.left}
            x2={geo.W - PAD.right}
            y1={PAD.top + geo.ph}
            y2={PAD.top + geo.ph}
          />
          {geo.xTicks.map((t) => (
            <text
              key={`${t.i}-${t.text}`}
              className="snr-pchart-tick"
              x={geo.x(t.i)}
              y={geo.H - 4}
              textAnchor={t.end ? 'end' : t.i === 0 ? 'start' : 'middle'}
            >
              {t.text}
            </text>
          ))}

          <polygon points={geo.area} fill="url(#snr-pchart-fill)" />
          <polyline
            points={geo.line}
            fill="none"
            stroke="var(--snr-mint)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Hover crosshair. */}
          {hover != null && hover !== endI ? (
            <g>
              <line
                className="snr-pchart-cross"
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={PAD.top}
                y2={PAD.top + geo.ph}
              />
              <circle className="snr-pchart-hdot" cx={geo.x(hover)} cy={geo.y(points[hover])} r="3.5" />
            </g>
          ) : null}

          {/* The end point: the current price, marked and labelled. */}
          <circle className="snr-pchart-halo" cx={geo.x(endI)} cy={geo.y(last)} r="8" />
          <circle className="snr-pchart-dot" cx={geo.x(endI)} cy={geo.y(last)} r="4" />

          {/* The price on the end point, in a pill beside it. */}
          {(() => {
            const ex = geo.x(endI);
            const ey = geo.y(last);
            const text = fmtPrice(last);
            const w = text.length * 6.9 + 12;
            const above = ey - 22 >= 2;
            const ty = above ? ey - 12 : ey + 20;
            return (
              <g className="snr-pchart-endtag" opacity={hover != null && hover !== endI ? 0.35 : 1}>
                <rect x={ex - w + 4} y={ty - 12} width={w} height={17} rx="4" />
                <text x={ex - 2} y={ty} textAnchor="end">
                  {text}
                </text>
              </g>
            );
          })()}

          {/* Hover read-out, top left of the plot: the hovered day. */}
          {hover != null && hover !== endI ? (
            <text className="snr-pchart-readout" x={PAD.left + 2} y={12}>
              <tspan className="snr-pchart-readout-v">{fmtPrice(points[hover])}</tspan>
              {dates?.[hover] ? (
                <tspan className="snr-pchart-readout-d" dx="6">
                  {fmtDate(dates[hover])}
                </tspan>
              ) : null}
            </text>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
