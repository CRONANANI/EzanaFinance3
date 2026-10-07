'use client';

/**
 * One trade near a contract award, as a price chart: daily closes around the
 * award, a dashed rule on the award date, a marker on the trade and the
 * 30-day holding window drawn heavier in the colour of its result. Hover,
 * touch or arrow keys move a crosshair with the date and close.
 */
import { useCallback, useId, useMemo, useRef, useState } from 'react';

const W = 480;
const H = 150;
const PAD = { top: 22, right: 12, bottom: 22, left: 44 };

const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
const fmtPx = (v) =>
  `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* Index of the first point on or after an ISO date (or -1). */
function indexOnOrAfter(points, iso) {
  if (!iso) return -1;
  for (let i = 0; i < points.length; i += 1) if (points[i][0] >= iso) return i;
  return -1;
}

export default function AwardTradeChart({
  ticker,
  side,
  points,
  awardDate,
  entryDate,
  exitDate,
  retPct,
  basis,
}) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const titleId = useId();

  const geo = useMemo(() => {
    if (!points?.length) return null;
    const closes = points.map((p) => p[1]);
    let lo = Math.min(...closes);
    let hi = Math.max(...closes);
    const padY = (hi - lo || hi || 1) * 0.08;
    lo -= padY;
    hi += padY;
    const n = points.length;
    const x = (i) => PAD.left + (n === 1 ? 0 : (i / (n - 1)) * (W - PAD.left - PAD.right));
    const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const path = (from, to) =>
      points
        .slice(from, to + 1)
        .map((p, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)},${y(p[1]).toFixed(1)}`)
        .join('');
    const iAward = indexOnOrAfter(points, awardDate);
    const iEntry = indexOnOrAfter(points, entryDate);
    const iExit = exitDate ? indexOnOrAfter(points, exitDate) : -1;
    const ticks = [lo + padY, (lo + hi) / 2, hi - padY];
    return { x, y, path, n, iAward, iEntry, iExit, ticks };
  }, [points, awardDate, entryDate, exitDate]);

  const pick = useCallback(
    (clientX) => {
      const svg = svgRef.current;
      if (!svg || !geo) return;
      const box = svg.getBoundingClientRect();
      const vx = ((clientX - box.left) / box.width) * W;
      const t = (vx - PAD.left) / (W - PAD.left - PAD.right);
      setHover(Math.max(0, Math.min(geo.n - 1, Math.round(t * (geo.n - 1)))));
    },
    [geo],
  );

  if (!geo) {
    return <p className="hub-chart-empty">Price history for {ticker} is still loading.</p>;
  }

  const { x, y, path, n, iAward, iEntry, iExit, ticks } = geo;
  const up = (retPct ?? 0) >= 0;
  const verb = side === 'buy' ? 'Bought' : 'Sold';
  const summary =
    `${ticker} daily closes from ${fmtDate(points[0][0])} to ${fmtDate(points[n - 1][0])}. ` +
    `Award on ${fmtDate(awardDate)}. ${verb}` +
    (entryDate ? ` ${fmtDate(entryDate)}` : '') +
    (basis === 'filing' ? ' (filing date)' : '') +
    (retPct != null ? `, ${retPct > 0 ? '+' : ''}${retPct.toFixed(1)}% after 30 days.` : '.');
  const h = hover != null ? points[hover] : null;
  const tipLeft = h ? (x(hover) / W) * 100 : 0;

  const onKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const start = hover ?? (iEntry >= 0 ? iEntry : 0);
    setHover(Math.max(0, Math.min(n - 1, start + (e.key === 'ArrowRight' ? 1 : -1))));
  };

  return (
    <figure className="hub-chart">
      <div className="hub-chart-plot">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <title id={titleId}>{summary}</title>
          {ticks.map((v) => (
            <g key={v}>
              <line
                className="hub-chart-grid"
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
              />
              <text className="hub-chart-tick" x={PAD.left - 6} y={y(v) + 4} textAnchor="end">
                {fmtPx(v).replace(/\.\d\d$/, '')}
              </text>
            </g>
          ))}
          <text className="hub-chart-tick" x={PAD.left} y={H - 6}>
            {fmtDate(points[0][0])}
          </text>
          <text className="hub-chart-tick" x={W - PAD.right} y={H - 6} textAnchor="end">
            {fmtDate(points[n - 1][0])}
          </text>

          {iAward >= 0 ? (
            <g>
              <line
                className="hub-chart-award"
                x1={x(iAward)}
                x2={x(iAward)}
                y1={PAD.top - 6}
                y2={H - PAD.bottom}
              />
              <text className="hub-chart-label" x={x(iAward)} y={PAD.top - 10} textAnchor="middle">
                Award
              </text>
            </g>
          ) : null}

          <path className="hub-chart-line" d={path(0, n - 1)} />
          {iEntry >= 0 && iExit > iEntry ? (
            <path
              className={`hub-chart-hold ${up ? 'is-up' : 'is-down'}`}
              d={path(iEntry, iExit)}
            />
          ) : null}

          {iExit >= 0 ? (
            <circle
              className={`hub-chart-dot ${up ? 'is-up' : 'is-down'}`}
              cx={x(iExit)}
              cy={y(points[iExit][1])}
              r="4"
            />
          ) : null}
          {iEntry >= 0 ? (
            <g>
              <circle
                className="hub-chart-dot is-trade"
                cx={x(iEntry)}
                cy={y(points[iEntry][1])}
                r="5"
              />
              <text
                className="hub-chart-label"
                x={x(iEntry)}
                y={y(points[iEntry][1]) + (side === 'buy' ? 18 : -10)}
                textAnchor="middle"
              >
                {verb}
              </text>
            </g>
          ) : null}

          {h ? (
            <g pointerEvents="none">
              <line
                className="hub-chart-cross"
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={H - PAD.bottom}
              />
              <circle className="hub-chart-dot is-hover" cx={x(hover)} cy={y(h[1])} r="4" />
            </g>
          ) : null}
          {/* Hit area larger than the line. */}
          <rect x={PAD.left} y={0} width={W - PAD.left - PAD.right} height={H} fill="transparent" />
        </svg>
        {h ? (
          <div
            className="hub-chart-tip"
            style={{ left: `${tipLeft}%` }}
            data-flip={tipLeft > 60 ? 'true' : undefined}
            aria-hidden="true"
          >
            <span>{fmtDate(h[0])}</span>
            <strong className="hub-mono">{fmtPx(h[1])}</strong>
          </div>
        ) : null}
      </div>
      <figcaption className="hub-chart-cap">
        <span className="hub-chart-key">
          <i className="hub-chart-swatch is-award" aria-hidden="true" /> Award date
        </span>
        <span className="hub-chart-key">
          <i className={`hub-chart-swatch ${up ? 'is-up' : 'is-down'}`} aria-hidden="true" /> 30
          days after the {basis === 'filing' ? 'filing' : 'trade'}
        </span>
      </figcaption>
    </figure>
  );
}
