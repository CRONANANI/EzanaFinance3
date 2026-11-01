'use client';

/**
 * The chart behind a commodity figure in a Sonar brief (Nov 1). Clicking
 * "tungsten up 557%" or "oil 40 to 55%" in the research brief opens this card
 * at the top of the right-hand stack: the commodity's daily closes from the
 * brief's own start date, the change over that window computed from the
 * data, and the figure the brief stated, side by side, so the reader can
 * check one against the other.
 *
 * One series, so no legend: the title names it. 2px line on the band's mint,
 * recessive axes (first and last date, low and high), a crosshair and tooltip
 * on hover or arrow keys, and a visually hidden table for screen readers.
 * Commodities with no traded price chart a listed proxy, said in words.
 * No vendor name appears in the copy.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { COMMODITY_BY_ID } from '@/lib/sonar/commodity-stats';
import './sonar-commodity-chart.css';

const W = 320;
const H = 132;
const PAD = { l: 4, r: 4, t: 10, b: 18 };

const fmtDay = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
const fmtShort = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
const fmtPrice = (v) =>
  v >= 1000
    ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPct = (p) => `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;

export function SonarCommodityChart({ stat, from, onClose }) {
  const meta = COMMODITY_BY_ID[stat?.id];
  const [state, setState] = useState({ status: 'loading', data: null });
  const [hover, setHover] = useState(null);
  const plotRef = useRef(null);

  useEffect(() => {
    if (!meta) return undefined;
    const ctrl = new AbortController();
    setState({ status: 'loading', data: null });
    setHover(null);
    const qs = new URLSearchParams({ c: meta.id });
    if (from) qs.set('from', from);
    fetch(`/api/sonar/commodity-series?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setState(
          data?.points?.length >= 2
            ? { status: 'ok', data }
            : { status: 'empty', data: data || null },
        );
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: 'empty', data: null });
      });
    return () => ctrl.abort();
  }, [meta, from]);

  const geom = useMemo(() => {
    const pts = state.data?.points || [];
    if (pts.length < 2) return null;
    const vals = pts.map((p) => p.v);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = hi - lo || hi || 1;
    const x = (i) => PAD.l + (i / (pts.length - 1)) * (W - PAD.l - PAD.r);
    const y = (v) => PAD.t + (1 - (v - lo) / span) * (H - PAD.t - PAD.b);
    const line = pts
      .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`)
      .join('');
    const area = `${line}L${x(pts.length - 1).toFixed(1)} ${H - PAD.b}L${x(0).toFixed(1)} ${H - PAD.b}Z`;
    return { pts, lo, hi, x, y, line, area };
  }, [state.data]);

  if (!meta) return null;
  const data = state.data;
  const change = typeof data?.changePct === 'number' ? data.changePct : null;
  const active = geom && hover != null ? geom.pts[hover] : null;

  const pick = (clientX) => {
    const el = plotRef.current;
    if (!el || !geom) return;
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.round(t * (geom.pts.length - 1)));
  };
  const onKey = (e) => {
    if (!geom) return;
    const n = geom.pts.length - 1;
    const cur = hover ?? n;
    if (e.key === 'ArrowLeft') setHover(Math.max(0, cur - 1));
    else if (e.key === 'ArrowRight') setHover(Math.min(n, cur + 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n);
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };

  return (
    <section className="snr-fund snrc" aria-label={`${meta.label} price chart`}>
      <div className="snr-fund-head">
        <span className="snr-fund-ticker">{meta.label}</span>
        {data?.symbol ? <span className="snr-range-chip">PROXY {data.symbol}</span> : null}
        <span className="snr-rule-soft" aria-hidden="true" />
        <button type="button" className="snrc-close" onClick={onClose} aria-label="Close chart">
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="snrc-figures">
        <div className="snrc-fig">
          <span className="snrc-fig-label">The brief says</span>
          <span className="snrc-fig-value">{stat.figure}</span>
        </div>
        <div className="snrc-fig">
          <span className="snrc-fig-label">
            {data?.from ? `Since ${fmtShort(data.from)}` : 'Over the window'}
          </span>
          <span
            className={`snrc-fig-value${change == null ? '' : change >= 0 ? ' is-up' : ' is-down'}`}
          >
            {change == null ? (state.status === 'loading' ? '...' : 'n/a') : fmtPct(change)}
          </span>
        </div>
        <div className="snrc-fig">
          <span className="snrc-fig-label">Last close</span>
          <span className="snrc-fig-value">{data?.last ? fmtPrice(data.last.v) : '...'}</span>
        </div>
      </div>

      {state.status === 'loading' ? (
        <div className="snrc-plot snrc-plot--skeleton" aria-hidden="true" />
      ) : geom ? (
        <div
          ref={plotRef}
          className="snrc-plot"
          tabIndex={0}
          role="img"
          aria-label={`${meta.label}: ${fmtPrice(geom.pts[0].v)} on ${fmtDay(geom.pts[0].d)} to ${fmtPrice(
            geom.pts[geom.pts.length - 1].v,
          )} on ${fmtDay(geom.pts[geom.pts.length - 1].d)}. Use the arrow keys to read each day.`}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <line className="snrc-base" x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} />
            <path className="snrc-area" d={geom.area} />
            <path className="snrc-line" d={geom.line} vectorEffect="non-scaling-stroke" />
            {active ? (
              <line
                className="snrc-cross"
                x1={geom.x(hover)}
                x2={geom.x(hover)}
                y1={PAD.t - 4}
                y2={H - PAD.b}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
          {active ? (
            <>
              <span
                className="snrc-dot"
                style={{
                  left: `${(geom.x(hover) / W) * 100}%`,
                  top: `${(geom.y(active.v) / H) * 100}%`,
                }}
              />
              <span
                className={`snrc-tip${hover > geom.pts.length * 0.6 ? ' snrc-tip--left' : ''}`}
                style={{ left: `${(geom.x(hover) / W) * 100}%` }}
              >
                <span className="snrc-tip-day">{fmtDay(active.d)}</span>
                <span className="snrc-tip-val">{fmtPrice(active.v)}</span>
              </span>
            </>
          ) : null}
          <span className="snrc-axis snrc-axis--hi">{fmtPrice(geom.hi)}</span>
          <span className="snrc-axis snrc-axis--lo">{fmtPrice(geom.lo)}</span>
          <span className="snrc-axis snrc-axis--from">{fmtDay(geom.pts[0].d)}</span>
          <span className="snrc-axis snrc-axis--to">{fmtDay(geom.pts[geom.pts.length - 1].d)}</span>
        </div>
      ) : null}
      {geom ? (
        <table className="snrc-sr">
          <caption>{meta.label} daily closes</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Close</th>
            </tr>
          </thead>
          <tbody>
            {geom.pts.map((p) => (
              <tr key={p.d}>
                <td>{p.d}</td>
                <td>{fmtPrice(p.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {state.status === 'empty' ? (
        <p className="snrc-empty">
          No price series for {meta.label.toLowerCase()} came back right now.
        </p>
      ) : null}

      {data?.proxy ? <p className="snrc-note">{data.proxy}</p> : null}
      <p className="snrc-note">
        Closing prices. The change is measured from the first close in the window to the latest, so
        it can differ from the brief&rsquo;s figure, which comes from its cited sources.
      </p>
    </section>
  );
}

export default SonarCommodityChart;
