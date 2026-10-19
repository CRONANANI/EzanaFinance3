'use client';

/**
 * Card 2, Price Chart: one market's probability over time, drawn by Ezana
 * (recharts, presentation props from CHART). No third-party iframe.
 * Any market anywhere on the page loads here through ?market=.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { largestMoves, outcomeLabel, seriesChange } from '@/lib/prediction-markets/page-model';
import { Card, ChangePill, Seg, Skeleton, StateBox, VenueChip, cx } from './parts';
import { useJson } from './use-json';
import {
  VENUE_LABEL,
  axisTick,
  date,
  dateTimeEt,
  pct,
  pctNumber,
  pts,
  timeEtSeconds,
  venueVolume,
} from './format';

const RANGES = [
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
  { value: '1m', label: '1M' },
  { value: 'all', label: 'All' },
];
const RANGE_PHRASE = {
  '1d': 'over the past day',
  '1w': 'over the past week',
  '1m': 'over the past month',
  all: 'over its full history',
};
const PLOT_H = 300;
const TOP = 16;
const X_AXIS_H = 22;
const Y_AXIS_W = 40;
const OUTCOME_STROKES = [
  'var(--pmk-line)',
  'var(--pmk-outcome-2)',
  'var(--pmk-outcome-3)',
  'var(--pmk-outcome-other)',
];
const TICK = { ...CHART.tick, fill: 'var(--text-faint)', fontFamily: 'var(--font-mono)' };

function useWidth(ref) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function xTicksFor(t0, t1, range) {
  if (!(t1 > t0)) return [t0];
  const n = range === '1d' ? 6 : range === '1w' ? 7 : 5;
  return Array.from({ length: n }, (_, i) => Math.round(t0 + ((t1 - t0) * i) / (n - 1)));
}

/* 9px diamond with its change label above, on a ground-coloured chip. */
function Diamond({ cx: x, cy: y, delta }) {
  if (x == null || y == null) return null;
  const up = delta > 0;
  const label = pts(delta);
  const w = label.length * 6.6 + 10;
  return (
    <g className={cx('pmk-anno', up ? 'is-up' : 'is-down')}>
      <rect x={x - 4.5} y={y - 4.5} width={9} height={9} transform={`rotate(45 ${x} ${y})`} />
      <rect className="pmk-anno-chip" x={x - w / 2} y={y - 30} width={w} height={18} rx={4} />
      <text x={x} y={y - 17} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function EndDot({ cx: x, cy: y }) {
  if (x == null || y == null) return null;
  return (
    <g className="pmk-enddot">
      <circle cx={x} cy={y} r={8} className="pmk-enddot-halo" />
      <circle cx={x} cy={y} r={4} className="pmk-enddot-core" />
    </g>
  );
}

function ChartSkeleton() {
  return (
    <div aria-busy="true" className="pmk-chart-skel">
      <span className="pmk-sr">Loading price history</span>
      <Skeleton width="70%" height={22} />
      <Skeleton width="40%" height={12} />
      <Skeleton width="100%" height={PLOT_H} radius={8} />
      <Skeleton width="100%" height={36} radius={8} />
    </div>
  );
}

function spreadLabel(spread) {
  const n = pctNumber(spread);
  return n === 'n/a' ? n : `${n} ${n === '1' ? 'pt' : 'pts'}`;
}

export function PriceChartCard({ marketId, movers, onLoad, universeState }) {
  const [range, setRange] = useState('1w');
  const [mode, setMode] = useState('one');
  const [hover, setHover] = useState(null);
  const url = marketId
    ? `/api/prediction-markets/history?id=${encodeURIComponent(marketId)}&range=${range}&outcomes=1`
    : null;
  const { data, error, loading, retry } = useJson(url);
  useEffect(() => {
    setHover(null);
    setMode('one');
  }, [marketId]);
  useEffect(() => setHover(null), [range]);

  const plotRef = useRef(null);
  const width = useWidth(plotRef);

  const market = data?.market?.id === marketId ? data.market : null;
  const points = useMemo(() => (market ? data.points || [] : []), [market, data]);
  const multi = mode === 'field' && Array.isArray(data?.series) && data.series.length > 1;
  const series = multi ? data.series.slice(0, 4) : null;
  const canField = Array.isArray(data?.series) && data.series.length > 1;

  const t0 = points.length ? points[0].t : 0;
  const t1 = points.length ? points[points.length - 1].t : 1;
  const right = multi ? 96 : 12;
  const innerW = Math.max(1, width - Y_AXIS_W - right);
  const innerH = PLOT_H - TOP - X_AXIS_H;
  const xOf = (t) => Y_AXIS_W + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
  const yOf = (p) => TOP + (1 - p) * innerH;

  const mainData = useMemo(() => points.map((pt) => ({ t: pt.t, v: pt.p * 100 })), [points]);
  const annos = useMemo(() => largestMoves(points, 2), [points]);
  const change = useMemo(() => seriesChange(points), [points]);
  const volume = useMemo(() => (market ? data.volume || [] : []), [market, data]);
  const maxVol = Math.max(1, ...volume.map((b) => b.v || 0));

  const hoverPt = hover != null ? points[hover] : null;
  const hoverPrev = hover != null && hover > 0 ? points[hover - 1] : null;
  const hoverBar =
    hoverPt && volume.length
      ? volume.reduce(
          (best, b, i) =>
            Math.abs(b.t - hoverPt.t) < Math.abs(volume[best].t - hoverPt.t) ? i : best,
          0,
        )
      : null;

  const moverIdx = movers.findIndex((m) => m.id === marketId);
  const step = (d) => {
    if (!movers.length) return;
    const i =
      moverIdx < 0
        ? d > 0
          ? 0
          : movers.length - 1
        : (moverIdx + d + movers.length) % movers.length;
    onLoad(movers[i].id);
  };

  const onMove = (e) => {
    if (!points.length || !plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = t0 + ((x - Y_AXIS_W) / innerW) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < points.length; i += 1) {
      if (Math.abs(points[i].t - t) < Math.abs(points[best].t - t)) best = i;
    }
    setHover(best);
  };
  const onKey = (e) => {
    if (!points.length) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const d = e.key === 'ArrowLeft' ? -1 : 1;
      setHover((h) =>
        Math.min(points.length - 1, Math.max(0, (h == null ? points.length - 1 : h) + d)),
      );
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHover(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHover(points.length - 1);
    } else if (e.key === 'Escape') {
      setHover(null);
    }
  };

  const summary = change
    ? `Probability ${change.change > 0 ? 'rose' : change.change < 0 ? 'fell' : 'held'} ${
        change.change === 0
          ? `at ${pct(change.to)}`
          : `from ${pct(change.from)} to ${pct(change.to)}`
      } ${RANGE_PHRASE[range]}.`
    : null;

  const tooltipLeft = hoverPt ? Math.min(Math.max(xOf(hoverPt.t) + 12, Y_AXIS_W), width - 168) : 0;
  const flipped = hoverPt && xOf(hoverPt.t) + 12 + 160 > width;

  let body;
  if (!marketId) {
    body =
      universeState === 'loading' ? (
        <ChartSkeleton />
      ) : (
        <StateBox title="Select a market to see its price history." minHeight={PLOT_H + 120}>
          Pick any market on this page, from Movers, Closing Soon or the table below.
        </StateBox>
      );
  } else if (error) {
    body = <StateBox kind="error" onRetry={retry} minHeight={PLOT_H + 120} />;
  } else if (!market || (loading && !points.length)) {
    body = <ChartSkeleton />;
  } else {
    body = (
      <>
        <div className="pmk-chart-header">
          <div className="pmk-chart-title">
            <h2 className="pmk-chart-q pmk-clamp2">{market.question}</h2>
            <p className="pmk-chart-meta">
              <VenueChip venue={market.venue} />
              <span className="pmk-num">
                24h vol {venueVolume(market.vol24h, market.venue)} · Vol{' '}
                {venueVolume(market.vol, market.venue)}
                {market.closes ? ` · Closes ${date(market.closes)}` : ''}
              </span>
            </p>
          </div>
          <div className="pmk-chart-now">
            {multi ? (
              <div className="pmk-outcomes">
                <p className="pmk-eyebrow">{series.length} outcomes shown</p>
                <ul className="pmk-outcome-legend">
                  {series.map((s, i) => (
                    <li key={s.id}>
                      <span className={cx('pmk-swatch', `pmk-swatch--${i}`)} aria-hidden="true" />
                      {outcomeLabel(s.question)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className="pmk-chart-p pmk-num">
                  {pctNumber(market.p)}
                  <span>%</span>
                </p>
                {change ? <ChangePill change={change.change} /> : null}
              </>
            )}
          </div>
        </div>

        <div
          className="pmk-plot"
          ref={plotRef}
          style={{ height: PLOT_H }}
          role="img"
          aria-label={`${market.question}. ${summary || ''}`}
        >
          <ResponsiveContainer width="100%" height={PLOT_H}>
            <ComposedChart margin={{ top: TOP, right, bottom: 0, left: 0 }}>
              <XAxis
                type="number"
                dataKey="t"
                domain={[t0, t1]}
                ticks={xTicksFor(t0, t1, range)}
                tickFormatter={(t) => axisTick(t, range)}
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: 'var(--pmk-card-border)' }}
                height={X_AXIS_H}
                allowDataOverflow
              />
              <YAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                width={Y_AXIS_W}
                allowDataOverflow
              />
              {[25, 50, 75].map((y) => (
                <ReferenceLine key={y} y={y} stroke="var(--pmk-grid)" ifOverflow="hidden" />
              ))}
              <ReferenceLine y={100} stroke="var(--pmk-card-border)" />
              {multi ? (
                series.map((s, i) => (
                  <Line
                    key={s.id}
                    data={s.points.map((pt) => ({ t: pt.t, v: pt.p * 100 }))}
                    dataKey="v"
                    type="linear"
                    stroke={OUTCOME_STROKES[i]}
                    strokeWidth={i === 0 ? 2 : 1.5}
                    strokeDasharray={i === 3 ? '4 3' : undefined}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                ))
              ) : (
                <>
                  <Area
                    data={mainData}
                    dataKey="v"
                    type="linear"
                    stroke="none"
                    fill="var(--pmk-area)"
                    fillOpacity={1}
                    isAnimationActive={false}
                    activeDot={false}
                  />
                  <Line
                    data={mainData}
                    dataKey="v"
                    type="linear"
                    stroke="var(--pmk-line)"
                    strokeWidth={CHART.primaryStrokeWidth}
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                  {annos.map((a) => (
                    <ReferenceDot
                      key={a.index}
                      x={points[a.index].t}
                      y={points[a.index].p * 100}
                      r={0}
                      shape={(props) => <Diamond {...props} delta={a.delta} />}
                    />
                  ))}
                  {points.length ? (
                    <ReferenceDot
                      x={points[points.length - 1].t}
                      y={points[points.length - 1].p * 100}
                      r={0}
                      shape={(props) => <EndDot {...props} />}
                    />
                  ) : null}
                </>
              )}
              {hoverPt ? (
                <ReferenceLine x={hoverPt.t} stroke="var(--pmk-mute)" strokeDasharray="3 3" />
              ) : null}
              {hoverPt ? (
                <ReferenceLine
                  y={hoverPt.p * 100}
                  stroke="var(--pmk-annotation)"
                  strokeDasharray="3 3"
                />
              ) : null}
              {hoverPt ? (
                <ReferenceDot
                  x={hoverPt.t}
                  y={hoverPt.p * 100}
                  r={5}
                  className="pmk-hoverdot"
                  fill="var(--pmk-line)"
                  stroke="var(--pmk-bg)"
                  strokeWidth={2}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>

          {multi
            ? series.map((s, i) => {
                const last = s.points[s.points.length - 1];
                if (!last) return null;
                return (
                  <span
                    key={s.id}
                    className={cx('pmk-endlabel', `pmk-endlabel--${i}`)}
                    style={{ top: yOf(last.p) - 8, left: width - right + 6 }}
                  >
                    {outcomeLabel(s.question).slice(0, 12)} {pct(last.p)}
                  </span>
                );
              })
            : null}

          {hoverPt ? (
            <>
              <span className="pmk-yflag pmk-num" style={{ top: yOf(hoverPt.p) - 9 }}>
                {pctNumber(hoverPt.p)}
              </span>
              <div
                className="pmk-tooltip"
                style={{
                  top: Math.max(4, yOf(hoverPt.p) - 70),
                  left: flipped ? xOf(hoverPt.t) - 172 : tooltipLeft,
                }}
              >
                <p className="pmk-num pmk-tooltip-time">{dateTimeEt(hoverPt.t)}</p>
                <p className="pmk-num pmk-tooltip-value">{pct(hoverPt.p)}</p>
                {hoverPrev ? (
                  <p className="pmk-num pmk-tooltip-sub">{pts(hoverPt.p - hoverPrev.p)} vs prior</p>
                ) : null}
                {hoverBar != null && volume[hoverBar]?.v ? (
                  <p className="pmk-num pmk-tooltip-faint">
                    Vol {venueVolume(volume[hoverBar].v, market.venue)}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          <div
            className="pmk-plot-hit"
            tabIndex={0}
            role="slider"
            aria-label="Explore the price history with the arrow keys"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hoverPt ? Math.round(hoverPt.p * 1000) / 10 : undefined}
            aria-valuetext={
              hoverPt ? `${dateTimeEt(hoverPt.t)}, ${pct(hoverPt.p)}` : summary || undefined
            }
            style={{ left: Y_AXIS_W, right, top: TOP, bottom: X_AXIS_H }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            onKeyDown={onKey}
            onBlur={() => setHover(null)}
          />
        </div>

        <div
          className="pmk-volbars"
          style={{ marginLeft: Y_AXIS_W, marginRight: right }}
          aria-hidden="true"
        >
          {volume.map((b, i) => (
            <span
              key={b.t}
              className={cx('pmk-volbar', i === hoverBar && 'is-on')}
              style={{ height: `${Math.max(b.v ? 2 : 0, (b.v / maxVol) * 36)}px` }}
            />
          ))}
        </div>
        {summary ? <p className="pmk-caption">{summary}</p> : null}
      </>
    );
  }

  return (
    <Card hero className="pmk-card--chart" label="Price chart">
      <div className="pmk-chart-toolbar">
        <div className="pmk-chart-nav">
          <span className="pmk-eyebrow">Price chart</span>
          <button
            type="button"
            className="pmk-icon-btn"
            aria-label="Previous mover"
            disabled={!movers.length}
            onClick={() => step(-1)}
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
          <label className="pmk-switcher">
            <span className="pmk-sr">Choose a mover to chart</span>
            <select
              value={moverIdx >= 0 ? movers[moverIdx].id : ''}
              onChange={(e) => e.target.value && onLoad(e.target.value)}
              disabled={!movers.length}
            >
              <option value="" disabled>
                {`– / ${movers.length} Movers`}
              </option>
              {movers.map((m, i) => (
                <option key={m.id} value={m.id}>
                  {`${i + 1} / ${movers.length} Movers · ${m.question.slice(0, 60)}`}
                </option>
              ))}
            </select>
            <span className="pmk-switcher-label pmk-num" aria-hidden="true">
              {moverIdx >= 0 ? moverIdx + 1 : '–'} / {movers.length} Movers
            </span>
            <i className="bi bi-chevron-down" aria-hidden="true" />
          </label>
          <button
            type="button"
            className="pmk-icon-btn"
            aria-label="Next mover"
            disabled={!movers.length}
            onClick={() => step(1)}
          >
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div className="pmk-chart-controls">
          {canField ? (
            <Seg
              label="Outcomes"
              value={mode}
              options={[
                { value: 'one', label: 'This market' },
                { value: 'field', label: 'Field' },
              ]}
              onChange={setMode}
            />
          ) : null}
          <Seg label="Range" value={range} options={RANGES} onChange={setRange} mono />
        </div>
      </div>

      <div className="pmk-card-body">{body}</div>

      {market ? (
        <footer className="pmk-foot">
          <span className="pmk-legal pmk-num">
            Source: {VENUE_LABEL[market.venue]} · Updated {timeEtSeconds(market.updatedAt)}
            {market.bid != null && market.ask != null
              ? ` · Bid ${pctNumber(market.bid)} · Ask ${pctNumber(market.ask)} · Spread ${spreadLabel(market.spread ?? market.ask - market.bid)}`
              : ''}
          </span>
          {market.url ? (
            <a className="pmk-link" href={market.url} target="_blank" rel="noopener noreferrer">
              Open on {VENUE_LABEL[market.venue]}
              <span className="pmk-sr"> (opens in a new tab)</span>
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          ) : null}
        </footer>
      ) : null}
    </Card>
  );
}
