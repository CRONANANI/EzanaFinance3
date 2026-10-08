'use client';

/**
 * Daily closes around a contract award: the full series quiet, a dashed rule
 * on the award date, a ring on the trade, and the 30 days after the trade
 * drawn heavier in emerald (gain) or red (loss). The full size has labels, a
 * crosshair on hover and arrow keys, and five date ticks; the mini (the
 * signals table) has the same marks and nothing else.
 */
import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { DASH, longDate, monthDay } from './cwh-format';

const SIZES = {
  full: { w: 672, h: 210, pad: { top: 18, right: 4, bottom: 6, left: 4 } },
  mini: { w: 180, h: 34, pad: { top: 3, right: 2, bottom: 3, left: 2 } },
};

const norm = (points) =>
  (points || [])
    .map((p) => (Array.isArray(p) ? { date: p[0], close: Number(p[1]) } : p))
    .filter((p) => p?.date && Number.isFinite(p.close));

const onOrAfter = (pts, iso) => {
  if (!iso) return -1;
  for (let i = 0; i < pts.length; i += 1) if (pts[i].date >= iso) return i;
  return -1;
};

const plus30 = (iso) => new Date(Date.parse(iso) + 30 * 86400000).toISOString().slice(0, 10);

export default function EventChart({
  ticker,
  points,
  tradeDate,
  awardDate,
  retPct = null,
  size = 'full',
  emptyText,
}) {
  const S = SIZES[size] || SIZES.full;
  const full = size === 'full';
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const titleId = useId();
  const pts = useMemo(() => norm(points), [points]);

  const geo = useMemo(() => {
    if (pts.length < 2) return null;
    const closes = pts.map((p) => p.close);
    let lo = Math.min(...closes);
    let hi = Math.max(...closes);
    const padY = (hi - lo || hi || 1) * 0.08;
    lo -= padY;
    hi += padY;
    const n = pts.length;
    const { w, h, pad } = S;
    const x = (i) => pad.left + (i / (n - 1)) * (w - pad.left - pad.right);
    const y = (v) => pad.top + (1 - (v - lo) / (hi - lo)) * (h - pad.top - pad.bottom);
    const path = (a, b) =>
      pts
        .slice(a, b + 1)
        .map((p, k) => `${k ? 'L' : 'M'}${x(a + k).toFixed(1)},${y(p.close).toFixed(1)}`)
        .join('');
    const iAward = onOrAfter(pts, awardDate);
    const iTrade = onOrAfter(pts, tradeDate);
    let iExit = tradeDate ? onOrAfter(pts, plus30(tradeDate)) : -1;
    if (iTrade >= 0 && iExit < 0) iExit = n - 1;
    const ret =
      retPct != null
        ? retPct
        : iTrade >= 0 && iExit > iTrade
          ? (pts[iExit].close / pts[iTrade].close - 1) * 100
          : null;
    const ticks = [0, 1, 2, 3, 4].map((k) => pts[Math.round((k / 4) * (n - 1))].date);
    return { x, y, path, n, iAward, iTrade, iExit, ret, ticks };
  }, [pts, S, awardDate, tradeDate, retPct]);

  const pick = useCallback(
    (clientX) => {
      const svg = svgRef.current;
      if (!svg || !geo) return;
      const box = svg.getBoundingClientRect();
      const t = (clientX - box.left) / box.width;
      setHover(Math.max(0, Math.min(geo.n - 1, Math.round(t * (geo.n - 1)))));
    },
    [geo],
  );

  if (!geo) {
    return full ? (
      <div className="cwh-chart-empty" style={{ aspectRatio: `${S.w} / ${S.h}` }}>
        <i className="bi bi-graph-up" aria-hidden="true" />
        <span>
          {emptyText ||
            `Price history for ${ticker || 'this company'} is loading. The chart fills once daily closes arrive.`}
        </span>
      </div>
    ) : (
      <span className="cwh-mini-empty" aria-label="Price history is loading">
        {DASH}
      </span>
    );
  }

  const { x, y, path, n, iAward, iTrade, iExit, ret, ticks } = geo;
  const upward = (ret ?? 0) >= 0;
  const summary =
    `${ticker} daily closes from ${longDate(pts[0].date)} to ${longDate(pts[n - 1].date)}.` +
    (awardDate ? ` Award on ${longDate(awardDate)}.` : '') +
    (tradeDate ? ` Trade on ${longDate(tradeDate)}.` : '') +
    (ret != null ? ` ${ret > 0 ? '+' : ''}${ret.toFixed(1)}% in the 30 days after the trade.` : '');
  const hp = hover != null ? pts[hover] : null;

  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    e.stopPropagation();
    const start = hover ?? (iTrade >= 0 ? iTrade : 0);
    setHover(Math.max(0, Math.min(n - 1, start + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  return (
    <figure className={`cwh-chart cwh-chart--${size}`}>
      <div className="cwh-chart-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${S.w} ${S.h}`}
          role="img"
          aria-labelledby={titleId}
          tabIndex={full ? 0 : undefined}
          onPointerMove={full ? (e) => pick(e.clientX) : undefined}
          onPointerDown={full ? (e) => pick(e.clientX) : undefined}
          onPointerLeave={full ? () => setHover(null) : undefined}
          onKeyDown={full ? onKey : undefined}
          onBlur={full ? () => setHover(null) : undefined}
        >
          <title id={titleId}>{summary}</title>
          {full ? (
            <line className="cwh-chart-base" x1={0} x2={S.w} y1={S.h - 0.5} y2={S.h - 0.5} />
          ) : null}
          {iAward >= 0 ? (
            <g>
              <line
                className="cwh-chart-award"
                x1={x(iAward)}
                x2={x(iAward)}
                y1={full ? 6 : 0}
                y2={S.h}
                vectorEffect="non-scaling-stroke"
              />
              {full ? (
                <text className="cwh-chart-label" x={x(iAward) + 4} y={12}>
                  AWARD
                </text>
              ) : null}
            </g>
          ) : null}
          <path className="cwh-chart-line" d={path(0, n - 1)} vectorEffect="non-scaling-stroke" />
          {iTrade >= 0 && iExit > iTrade ? (
            <path
              className={`cwh-chart-hold ${upward ? 'is-up' : 'is-down'}`}
              d={path(iTrade, iExit)}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {iTrade >= 0 ? (
            <g>
              <circle
                className="cwh-chart-trade"
                cx={x(iTrade)}
                cy={y(pts[iTrade].close)}
                r={full ? 3.6 : 2.4}
                vectorEffect="non-scaling-stroke"
              />
              {full ? (
                <text
                  className="cwh-chart-label"
                  x={x(iTrade)}
                  y={y(pts[iTrade].close) - 9}
                  textAnchor="middle"
                >
                  TRADE
                </text>
              ) : null}
            </g>
          ) : null}
          {hp ? (
            <g pointerEvents="none">
              <line
                className="cwh-chart-cross"
                x1={x(hover)}
                x2={x(hover)}
                y1={0}
                y2={S.h}
                vectorEffect="non-scaling-stroke"
              />
              <circle className="cwh-chart-hover" cx={x(hover)} cy={y(hp.close)} r="3.5" />
            </g>
          ) : null}
        </svg>
        {hp ? (
          <div
            className="cwh-chart-tip"
            style={{ left: `${(x(hover) / S.w) * 100}%` }}
            data-flip={x(hover) / S.w > 0.6 ? 'true' : undefined}
            aria-hidden="true"
          >
            <span>{monthDay(hp.date)}</span>
            <strong>${hp.close.toFixed(2)}</strong>
          </div>
        ) : null}
      </div>
      {full ? (
        <div className="cwh-chart-ticks" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={`${t}-${i}`}>{monthDay(t)}</span>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
