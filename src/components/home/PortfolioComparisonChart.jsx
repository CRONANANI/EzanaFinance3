'use client';

/**
 * The home page's portfolio versus indices chart, drawn the way the company
 * research price chart is: a change chip and compact range buttons above, a
 * quiet grid, one filled lead line that turns red when it is down, an end
 * tag at the latest value, and drag to measure.
 *
 * Drag to measure: press on the chart, drag, release. Every visible line is
 * measured over that window (rebased to the window's first point, see
 * range-measure.js) and the result stays on screen until the next click.
 *
 * Data comes in as rows of percent-from-anchor readings, built by the page.
 * This component draws and measures; it fetches nothing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { DateSelector } from '@/components/ui/DateSelector';
import { formatPoints, formatSignedPct, measureWindow } from '@/lib/home/range-measure';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** The last finite reading of a series, or null. */
function lastReading(rows, key) {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (isNum(rows[i]?.[key])) return rows[i][key];
  }
  return null;
}

/** Pill on the right edge at the lead line's latest value. */
function EndTag({ viewBox, value, color }) {
  if (!viewBox || !isNum(value)) return null;
  const text = formatSignedPct(value);
  const w = text.length * 6.6 + 12;
  const x = viewBox.x + viewBox.width - w;
  const y = viewBox.y - 9;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={18} rx={4} style={{ fill: color }} />
      <text
        x={x + w / 2}
        y={y + 12.5}
        textAnchor="middle"
        style={{
          fill: 'var(--color-on-primary)',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {text}
      </text>
    </g>
  );
}

function ComparisonTooltip({ active, payload, formatTick }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bs-chart-tooltip">
      <div className="bs-chart-tooltip-date">{formatTick(row.at)}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="bs-chart-tooltip-val" style={{ color: entry.stroke }}>
          {entry.name}: {formatSignedPct(entry.value)}
        </div>
      ))}
    </div>
  );
}

/** The readout for a window: one row per visible line. */
function MeasureCard({ result, formatTick, settled }) {
  const lead = result.lead;
  const tone = !isNum(lead?.pct) ? 'flat' : lead.pct >= 0 ? 'up' : 'down';
  return (
    <div
      className={`bs-cmp-measure bs-cmp-measure--${tone}`}
      role={settled ? 'status' : undefined}
      aria-live={settled ? 'polite' : undefined}
    >
      <div className="bs-cmp-measure-range">
        {formatTick(result.from)} to {formatTick(result.to)}
      </div>
      <dl className="bs-cmp-measure-rows">
        {result.series.map((s) => (
          <div key={s.key} className="bs-cmp-measure-row">
            <dt>
              <span className="bs-cmp-measure-dot" style={{ background: s.color }} aria-hidden />
              {s.label}
            </dt>
            <dd
              className={
                !isNum(s.pct) ? 'is-na' : s.pct >= 0 ? 'bs-cmp-num is-up' : 'bs-cmp-num is-down'
              }
            >
              {formatSignedPct(s.pct)}
            </dd>
            <dd className="bs-cmp-num bs-cmp-measure-gap">
              {isNum(s.vsLead) ? formatPoints(s.vsLead) : ''}
            </dd>
          </div>
        ))}
      </dl>
      {result.series.length > 1 && isNum(lead?.pct) ? (
        <div className="bs-cmp-measure-note">Gap is against {lead.label}, in percentage points</div>
      ) : null}
      {settled ? <div className="bs-cmp-measure-note">Click the chart to clear</div> : null}
    </div>
  );
}

/**
 * props
 *   data        rows: { at, [seriesKey]: percent from the range anchor }
 *   series      [{ key, label, color, lead? }] in draw order. The first one
 *               flagged `lead` (else the first) is filled and carries the tag.
 *   timeframe   the active range label, shown in the chip
 *   ranges      range labels for the selector
 *   onTimeframeChange
 *   formatTick  (at) => string, for the axis, the tooltip and the readout
 *   loading
 */
export function PortfolioComparisonChart({
  data,
  series,
  timeframe,
  ranges,
  onTimeframeChange,
  formatTick,
  loading = false,
  height = 240,
}) {
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [measured, setMeasured] = useState(null); // { a, b } row indices
  /* The same two indices, readable at once: a quick flick can release the
     button before the last move has been rendered. */
  const dragRef = useRef({ start: null, end: null });

  /* The lead line first, so the readout compares everything with it. */
  const ordered = useMemo(() => {
    const leadIdx = Math.max(
      0,
      series.findIndex((s) => s.lead),
    );
    return series.length ? [series[leadIdx], ...series.filter((_, i) => i !== leadIdx)] : [];
  }, [series]);
  const lead = ordered[0] ?? null;

  /* A window belongs to the data it was drawn on. */
  const seriesSignature = ordered.map((s) => s.key).join('|');
  /* Keyed on the row count, not the array: a live price tick rebuilds the
     rows without moving them, and must not wipe the user's window. */
  const rowCount = data.length;
  useEffect(() => {
    dragRef.current = { start: null, end: null };
    setDragStart(null);
    setDragEnd(null);
    setMeasured(null);
  }, [timeframe, rowCount]);

  const indexOf = useCallback(
    (state) => {
      if (typeof state?.activeTooltipIndex === 'number') return state.activeTooltipIndex;
      const at = state?.activePayload?.[0]?.payload?.at;
      return at ? data.findIndex((r) => r.at === at) : -1;
    },
    [data],
  );

  const onDown = useCallback(
    (state) => {
      if (measured) {
        setMeasured(null);
        return;
      }
      const i = indexOf(state);
      if (i < 0) return;
      dragRef.current = { start: i, end: null };
      setDragStart(i);
      setDragEnd(null);
    },
    [measured, indexOf],
  );

  const onMove = useCallback(
    (state) => {
      if (dragRef.current.start == null) return;
      const i = indexOf(state);
      if (i < 0) return;
      dragRef.current.end = i;
      setDragEnd(i);
    },
    [indexOf],
  );

  const finish = useCallback(
    (state) => {
      const { start } = dragRef.current;
      if (start == null) return;
      /* Moves are throttled by the chart, so the release point is the truth
         when it is known (it is not when the pointer leaves the chart). */
      const released = indexOf(state);
      const end = released >= 0 ? released : dragRef.current.end;
      if (end != null && end !== start) setMeasured({ a: start, b: end });
      dragRef.current = { start: null, end: null };
      setDragStart(null);
      setDragEnd(null);
    },
    [indexOf],
  );

  const dragging = dragStart != null;
  const live = useMemo(
    () => (dragging && dragEnd != null ? measureWindow(data, dragStart, dragEnd, ordered) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seriesSignature stands in for ordered
    [dragging, dragStart, dragEnd, data, seriesSignature],
  );
  const settled = useMemo(
    () => (measured ? measureWindow(data, measured.a, measured.b, ordered) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seriesSignature stands in for ordered
    [measured, data, seriesSignature],
  );
  const leadLast = lead ? lastReading(data, lead.key) : null;
  const up = !isNum(leadLast) || leadLast >= 0;
  const leadColor = up ? 'var(--emerald)' : 'var(--negative)';
  /* The readout's dots match the lines as drawn. */
  const paint = (result) =>
    result && {
      ...result,
      series: result.series.map((s, i) => (i === 0 ? { ...s, color: leadColor } : s)),
    };
  const shown = paint(live || settled);
  const band = shown
    ? {
        x1: data[shown.startIndex]?.at,
        x2: data[shown.endIndex]?.at,
        up: !isNum(shown.lead?.pct) || shown.lead.pct >= 0,
      }
    : null;

  return (
    <div className="bs-cmp">
      <div className="bs-cmp-head">
        {isNum(leadLast) && lead ? (
          <span className={`bs-cmp-chip ${up ? 'is-up' : 'is-down'}`}>
            <i className={`bi ${up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} aria-hidden />
            <span className="bs-cmp-num">{formatSignedPct(leadLast)}</span>
            <span className="bs-cmp-chip-range">{timeframe}</span>
            <span className="bs-cmp-sr"> {lead.label}</span>
          </span>
        ) : (
          <span />
        )}
        <DateSelector ranges={ranges} value={timeframe} onChange={onTimeframeChange} size="xs" />
      </div>

      <div className="bs-cmp-body" style={{ height }}>
        {loading ? (
          <div className="bs-cmp-state">Loading chart…</div>
        ) : data.length > 1 && ordered.length ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 12, right: 4, left: 0, bottom: 0 }}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={finish}
                onMouseLeave={finish}
                style={{ cursor: dragging ? 'col-resize' : 'crosshair', userSelect: 'none' }}
              >
                <defs>
                  <linearGradient id="bsCmpLeadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={leadColor}
                      stopOpacity={CHART.gradientFromOpacity}
                    />
                    <stop
                      offset="100%"
                      stopColor={leadColor}
                      stopOpacity={CHART.gradientToOpacity}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray={CHART.gridDash}
                  stroke={CHART.gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="at"
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={50}
                  tickFormatter={formatTick}
                />
                <YAxis
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                />
                <Tooltip
                  content={<ComparisonTooltip formatTick={formatTick} />}
                  cursor={{ stroke: 'var(--border-primary)', strokeWidth: 1 }}
                  /* The readout replaces the hover tooltip while measuring. */
                  wrapperStyle={shown ? { visibility: 'hidden' } : undefined}
                />
                <ReferenceLine y={0} stroke="var(--border-primary)" strokeDasharray="3 4" />
                {isNum(leadLast) && (
                  <ReferenceLine
                    y={leadLast}
                    stroke="transparent"
                    ifOverflow="extendDomain"
                    label={<EndTag value={leadLast} color={leadColor} />}
                  />
                )}
                {band && band.x1 && band.x2 && (
                  <ReferenceArea
                    x1={band.x1}
                    x2={band.x2}
                    fill={band.up ? 'var(--emerald)' : 'var(--negative)'}
                    fillOpacity={0.09}
                    stroke={settled ? (band.up ? 'var(--emerald)' : 'var(--negative)') : 'none'}
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                  />
                )}
                {ordered
                  .slice()
                  .reverse()
                  .map((s) => {
                    const isLead = s.key === lead.key;
                    return (
                      <Area
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.label}
                        stroke={isLead ? leadColor : s.color}
                        strokeWidth={isLead ? 1.75 : 1.5}
                        fill={isLead ? 'url(#bsCmpLeadFill)' : 'transparent'}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                        isAnimationActive={false}
                        connectNulls
                      />
                    );
                  })}
              </AreaChart>
            </ResponsiveContainer>
            {shown ? (
              <MeasureCard result={shown} formatTick={formatTick} settled={Boolean(settled)} />
            ) : null}
          </>
        ) : (
          <div className="bs-cmp-state">No data for this range</div>
        )}
      </div>
      <p className="bs-cmp-hint">Drag across the chart to compare returns over any period.</p>
    </div>
  );
}

export default PortfolioComparisonChart;
