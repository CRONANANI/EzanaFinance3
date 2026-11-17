'use client';

/**
 * The market chart of an exemplary brief: one listed company against its
 * benchmark, each rebased to 0% on the first session both traded in the
 * chosen range, with a dated event marker.
 *
 * Every point is a real daily close from /api/sonar/market-context (the
 * shared price helper). The maths is lib/sonar/market-context.js
 * (compareSeries, availableRanges); this component only draws. When no
 * prices come back it says so and offers Retry. It never draws a placeholder
 * line, and nothing in a brief can supply chart points.
 *
 * Inline SVG, no chart library. Axis labels are HTML over the plot so they
 * stay crisp while the plot stretches to the full canvas width.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  availableRanges,
  chartSummary,
  compareSeries,
  signedPct,
} from '@/lib/sonar/market-context';

const RANGES = ['5D', '1M', '3M', '6M', '1Y'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const W = 1000;
const H = 320;

export const dayLabel = (iso, { year = true } = {}) => {
  const [y, m, d] = String(iso || '')
    .slice(0, 10)
    .split('-')
    .map(Number);
  if (!y || !m || !d) return '';
  return `${MONTHS[m - 1]} ${d}${year ? `, ${y}` : ''}`;
};

/* Round percent steps: about four gridlines across the domain, zero always one of them. */
function domainFor(values) {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const raw = Math.max(max - min, 2) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo, hi: hi === lo ? lo + step : hi, ticks };
}

function tickLabel(v) {
  if (v === 0) return '+0%';
  const n = Number.isInteger(v) ? v : v.toFixed(1);
  return `${v > 0 ? '+' : ''}${n}%`;
}

function buildGeometry(cmp, eventDate) {
  const pts = cmp.series;
  const n = pts.length;
  const { lo, hi, ticks } = domainFor(
    pts.flatMap((p) => [p.subject, p.benchmark]).filter(Number.isFinite),
  );
  const x = (i) => (n < 2 ? W / 2 : (i / (n - 1)) * W);
  const y = (v) => (1 - (v - lo) / (hi - lo)) * H;
  const path = (key) =>
    pts
      .map((p, i) => (Number.isFinite(p[key]) ? `${i ? 'L' : 'M'}${x(i)},${y(p[key])}` : ''))
      .join('');
  const subject = path('subject');
  const hasBench = pts.some((p) => Number.isFinite(p.benchmark));
  /* X labels: the first session of each month on long ranges, evenly spaced days on short. */
  const span = (new Date(cmp.to) - new Date(cmp.from)) / 86400000;
  let xTicks = [];
  if (span > 45) {
    pts.forEach((p, i) => {
      if (!i || p.date.slice(0, 7) !== pts[i - 1].date.slice(0, 7)) {
        xTicks.push({ i, label: MONTHS[Number(p.date.slice(5, 7)) - 1] });
      }
    });
    const every = Math.max(1, Math.ceil(xTicks.length / 7));
    xTicks = xTicks.filter((_, k) => k % every === 0);
  } else {
    const count = Math.min(5, n);
    for (let k = 0; k < count; k += 1) {
      const i = count === 1 ? 0 : Math.round((k / (count - 1)) * (n - 1));
      xTicks.push({ i, label: dayLabel(pts[i].date, { year: false }) });
    }
  }
  /* The event sits on the first session on or after its date, when the range holds it. */
  let eventIndex = -1;
  if (eventDate && eventDate >= pts[0].date && eventDate <= pts[n - 1].date) {
    eventIndex = pts.findIndex((p) => p.date >= eventDate);
  }
  return {
    n,
    x,
    y,
    subject,
    area: `${subject}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`,
    bench: hasBench ? path('benchmark') : null,
    yTicks: ticks.map((v) => ({ v, top: (y(v) / H) * 100 })),
    xTicks: xTicks.map((t) => ({ ...t, left: (x(t.i) / W) * 100 })),
    zeroY: y(0),
    eventLeft: eventIndex >= 0 ? (x(eventIndex) / W) * 100 : null,
    eventX: eventIndex >= 0 ? x(eventIndex) : null,
  };
}

export default function SonarExemplaryChart({ chart }) {
  const { subject, benchmark, event } = chart;
  const [state, setState] = useState({ status: 'loading', subject: [], bench: [] });
  const [range, setRange] = useState(chart.defaultRange || '3M');
  const [at, setAt] = useState(null);

  const load = useCallback(
    async (signal) => {
      setState((s) => ({ ...s, status: 'loading' }));
      try {
        const res = await fetch(
          `/api/sonar/market-context?symbol=${encodeURIComponent(subject.symbol)}&benchmark=${encodeURIComponent(benchmark.symbol)}`,
          { signal, credentials: 'include' },
        );
        const data = res.ok ? await res.json() : null;
        if (signal?.aborted) return;
        if (!data) setState({ status: 'error', subject: [], bench: [] });
        else if (!Array.isArray(data.subject) || data.subject.length < 2)
          setState({ status: 'empty', subject: [], bench: [] });
        else setState({ status: 'ready', subject: data.subject, bench: data.bench || [] });
      } catch (e) {
        if (e?.name !== 'AbortError') setState({ status: 'error', subject: [], bench: [] });
      }
    },
    [subject.symbol, benchmark.symbol],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const ranges = useMemo(() => {
    if (state.status !== 'ready') return [];
    const ok = new Set(availableRanges(state.subject, state.bench));
    return RANGES.filter((r) => ok.has(r));
  }, [state]);
  const activeRange = ranges.includes(range) ? range : ranges[ranges.length - 1] || null;
  const cmp = useMemo(
    () => (activeRange ? compareSeries(state.subject, state.bench, activeRange) : null),
    [state, activeRange],
  );
  const g = useMemo(() => (cmp ? buildGeometry(cmp, event?.date) : null), [cmp, event?.date]);

  useEffect(() => setAt(null), [activeRange]);

  const pick = (e) => {
    if (!g) return;
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * (g.n - 1));
    setAt(Math.max(0, Math.min(g.n - 1, i)));
  };
  const onKey = (e) => {
    if (!g) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      setAt((cur) => Math.max(0, Math.min(g.n - 1, (cur ?? (step > 0 ? -1 : g.n)) + step)));
    } else if (e.key === 'Home') setAt(0);
    else if (e.key === 'End') setAt(g.n - 1);
    else if (e.key === 'Escape') setAt(null);
  };
  const point = at == null || !cmp ? null : cmp.series[at];
  const hasBench = Boolean(g?.bench);

  return (
    <div className="sxb-market">
      <div className="sxb-section-top">
        <div>
          <p className="sxb-kicker">{chart.kicker}</p>
          <h2 className="sxb-section-title">{chart.title}</h2>
        </div>
        {ranges.length > 1 ? (
          <div className="sxb-ranges" role="group" aria-label="Chart range">
            {ranges.map((r) => (
              <button
                key={r}
                type="button"
                className="sxb-range"
                aria-pressed={r === activeRange}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {state.status === 'loading' ? (
        <div className="sxb-chart-state" role="status">
          <span className="sxb-chart-skeleton" aria-hidden="true" />
          <span className="sxb-sr">Loading market data</span>
        </div>
      ) : null}

      {state.status === 'error' || state.status === 'empty' || (state.status === 'ready' && !g) ? (
        <div className="sxb-chart-state sxb-chart-state--empty">
          <p>
            {state.status === 'error'
              ? 'Market data could not be loaded.'
              : `No daily prices are available for ${subject.symbol} right now.`}{' '}
            No chart is drawn without real prices.
          </p>
          <button type="button" className="sxb-textbtn" onClick={() => load()}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}

      {state.status === 'ready' && g ? (
        <>
          <div className="sxb-chart">
            <div className="sxb-chart-y" aria-hidden="true">
              {g.yTicks.map((t) => (
                <span key={t.v} style={{ top: `${t.top}%` }}>
                  {tickLabel(t.v)}
                </span>
              ))}
            </div>
            <div
              className="sxb-chart-plot"
              role="img"
              tabIndex={0}
              aria-label={`${chartSummary(cmp, subject.label, benchmark.label)}${
                g.eventLeft != null ? ` ${event.label} marked on ${dayLabel(event.date)}.` : ''
              }`}
              onPointerMove={pick}
              onPointerLeave={() => setAt(null)}
              onKeyDown={onKey}
              onBlur={() => setAt(null)}
            >
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                {g.yTicks.map((t) => (
                  <line
                    key={t.v}
                    className={t.v === 0 ? 'sxb-chart-zero' : 'sxb-chart-grid'}
                    x1="0"
                    x2={W}
                    y1={(t.top / 100) * H}
                    y2={(t.top / 100) * H}
                  />
                ))}
                <path className="sxb-chart-area" d={g.area} />
                {g.bench ? <path className="sxb-chart-bench" d={g.bench} /> : null}
                <path className="sxb-chart-subject" d={g.subject} />
                {g.eventX != null ? (
                  <line className="sxb-chart-event" x1={g.eventX} x2={g.eventX} y1="0" y2={H} />
                ) : null}
                {at != null ? (
                  <line className="sxb-chart-cross" x1={g.x(at)} x2={g.x(at)} y1="0" y2={H} />
                ) : null}
              </svg>
              {g.eventLeft != null ? (
                <span
                  className={`sxb-chart-eventlabel${g.eventLeft > 80 ? ' is-right' : ''}`}
                  style={{ left: `${g.eventLeft}%` }}
                >
                  {event.label}
                </span>
              ) : null}
              {point ? (
                <div
                  className={`sxb-chart-tip${(g.x(at) / W) * 100 > 70 ? ' is-right' : ''}`}
                  style={{ left: `${(g.x(at) / W) * 100}%` }}
                  aria-hidden="true"
                >
                  <span className="sxb-chart-tipdate">{dayLabel(point.date)}</span>
                  <span>
                    <i className="sxb-swatch" />
                    {subject.symbol} {signedPct(point.subject)}
                  </span>
                  {Number.isFinite(point.benchmark) ? (
                    <span>
                      <i className="sxb-swatch sxb-swatch--bench" />
                      {benchmark.symbol} {signedPct(point.benchmark)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="sxb-chart-x" aria-hidden="true">
              {g.xTicks.map((t) => (
                <span key={`${t.i}-${t.label}`} style={{ left: `${t.left}%` }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          <div className="sxb-legend">
            <span>
              <i className="sxb-swatch" aria-hidden="true" />
              {subject.label}
            </span>
            {hasBench ? (
              <span>
                <i className="sxb-swatch sxb-swatch--bench" aria-hidden="true" />
                {benchmark.label}
              </span>
            ) : null}
            <span className="sxb-legend-note">Normalized returns, common baseline</span>
          </div>
          <div className="sxb-chart-note">
            <span>
              Daily closing prices, rebased to 0% on {dayLabel(cmp.from)}. Prices through{' '}
              {dayLabel(cmp.to)}.
              {hasBench ? '' : ` ${benchmark.symbol} prices are not available, so it is not drawn.`}
            </span>
            {event?.date ? <span>Event marker: {dayLabel(event.date)}</span> : null}
          </div>
          <p className="sxb-sr" aria-live="polite">
            {point
              ? `${dayLabel(point.date)}: ${subject.symbol} ${signedPct(point.subject)}${
                  Number.isFinite(point.benchmark)
                    ? `, ${benchmark.symbol} ${signedPct(point.benchmark)}`
                    : ''
                }`
              : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}
