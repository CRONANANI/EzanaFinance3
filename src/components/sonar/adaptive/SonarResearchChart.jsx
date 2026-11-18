'use client';

/**
 * Sonar research chart (Nov 17, 2026). The one chart component of the currency answer, built
 * in the home page's portfolio comparison chart language (components/home/
 * PortfolioComparisonChart.jsx): a change chip and the platform's range pills above, a quiet
 * dashed grid, one filled lead line with an end tag at its latest value, a crosshair tooltip,
 * and drag to measure.
 *
 * It draws stored observations only. Points are never smoothed, joined across gaps or
 * interpolated; a projection is drawn dashed; a reference (a median, the zero line) is a
 * dashed rule with its label.
 *
 * Drag to measure: press, drag, release. Each line reports its value at both ends and the
 * change: a percent change for levels (an exchange rate, an index, reserves), a change in
 * percentage points for rates. The readout stays until the next click.
 *
 * props
 *   series     [{ key, name, tone: 'lead' | 'reference', points: [{ x, y, proj? }] }]
 *   unit       'rate' | 'index' | 'usd' | '%' | 'pp' | 'number'
 *   refLine    { value, label } | null
 *   zero       draw the zero rule
 *   ranges, range, onRange   range pills (the platform's DateSelector)
 *   views, view, onView      view pills ({ id, label })
 *   height, label (accessible name)
 */
import { useCallback, useMemo, useRef, useState } from 'react';
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const minus = (s) => String(s).replace(/^-/, '−');

/** '2026-11-16' -> '16 Nov 2026'; '2026-09' -> 'Sep 2026'; '2025' stays. */
export function periodTick(x) {
  const s = String(x ?? '');
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s);
  if (!m) return s;
  const mon = MONTHS[Number(m[2]) - 1];
  return m[3] ? `${Number(m[3])} ${mon} ${m[1]}` : `${mon} ${m[1]}`;
}

/** A value in the chart's unit. */
export function formatValue(v, unit) {
  if (!isNum(v)) return 'n/a';
  const a = Math.abs(v);
  if (unit === 'usd') {
    if (a >= 1e12) return minus(`$${(v / 1e12).toFixed(2)}T`);
    if (a >= 1e9) return minus(`$${(v / 1e9).toFixed(1)}B`);
    if (a >= 1e6) return minus(`$${(v / 1e6).toFixed(1)}M`);
    return minus(`$${Math.round(v).toLocaleString('en-US')}`);
  }
  if (unit === '%') return minus(`${v.toFixed(1)}%`);
  if (unit === 'pp') return minus(`${v > 0 ? '+' : ''}${v.toFixed(1)} pp`);
  if (unit === 'index') return minus(v.toFixed(1));
  return minus(a >= 1000 ? Math.round(v).toLocaleString('en-US') : v.toFixed(a >= 100 ? 1 : 2));
}

/** How a change is read: percent for levels, percentage points for rates. */
const changeIsPoints = (unit) => unit === '%' || unit === 'pp';
function formatChange(from, to, unit) {
  if (!isNum(from) || !isNum(to)) return null;
  if (changeIsPoints(unit)) {
    const d = to - from;
    return minus(`${d >= 0 ? '+' : ''}${d.toFixed(1)} pp`);
  }
  if (from === 0) return null;
  const p = (to / from - 1) * 100;
  return minus(`${p >= 0 ? '+' : ''}${p.toFixed(1)}%`);
}

/** Rows keyed by period, one column per series; a projection gets its own column. */
function toRows(series) {
  const by = new Map();
  const put = (x, key, y) => {
    const k = String(x);
    if (!by.has(k)) by.set(k, { at: k });
    by.get(k)[key] = y;
  };
  for (const s of series) {
    const pts = s.points.filter((p) => isNum(p.y));
    pts.forEach((p, i) => {
      if (p.proj) {
        put(p.x, `${s.key}__proj`, p.y);
        /* The dashed run starts at the last observed point, so the two meet. */
        const prev = pts[i - 1];
        if (prev && !prev.proj) put(prev.x, `${s.key}__proj`, prev.y);
      } else put(p.x, s.key, p.y);
    });
  }
  return [...by.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

function lastOf(rows, key) {
  for (let i = rows.length - 1; i >= 0; i -= 1) if (isNum(rows[i][key])) return rows[i][key];
  return null;
}
function firstOf(rows, key) {
  for (const r of rows) if (isNum(r[key])) return r[key];
  return null;
}
/** The nearest reading of a key at or after i (forward) or at or before i (back). */
function readingNear(rows, key, i, forward) {
  if (forward) {
    for (let k = i; k < rows.length; k += 1) if (isNum(rows[k][key])) return rows[k][key];
  } else {
    for (let k = i; k >= 0; k -= 1) if (isNum(rows[k][key])) return rows[k][key];
  }
  return null;
}

function EndTag({ viewBox, value, unit }) {
  if (!viewBox || !isNum(value)) return null;
  const text = formatValue(value, unit);
  const w = text.length * 6.6 + 12;
  const x = viewBox.x + viewBox.width - w;
  const y = viewBox.y - 9;
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={w} height={18} rx={4} style={{ fill: 'var(--emerald)' }} />
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

function ChartTooltip({ active, payload, unit, names }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const seen = new Set();
  return (
    <div className="src-tip">
      <div className="src-tip-date">{periodTick(row.at)}</div>
      {payload
        .filter((e) => isNum(e.value))
        .map((e) => {
          const base = String(e.dataKey).replace(/__proj$/, '');
          if (seen.has(base)) return null;
          seen.add(base);
          const proj = String(e.dataKey).endsWith('__proj') && !isNum(row[base]);
          return (
            <div key={e.dataKey} className="src-tip-val">
              <span className="src-tip-name">{names[base] || base}</span>{' '}
              {formatValue(e.value, unit)}
              {proj ? <span className="src-tip-proj"> projection</span> : null}
            </div>
          );
        })}
    </div>
  );
}

export function SonarResearchChart({
  series,
  unit = 'number',
  refLine = null,
  zero = false,
  ranges = null,
  range = null,
  onRange = null,
  views = null,
  view = null,
  onView = null,
  height = 220,
  label = '',
}) {
  const rows = useMemo(() => toRows(series), [series]);
  const lead = series.find((s) => s.tone !== 'reference') || series[0];
  const names = useMemo(() => Object.fromEntries(series.map((s) => [s.key, s.name])), [series]);
  const hasProj = (key) => rows.some((r) => isNum(r[`${key}__proj`]));
  const leadFirst = lead ? firstOf(rows, lead.key) : null;
  const leadLast = lead ? lastOf(rows, lead.key) : null;
  const windowChange = formatChange(leadFirst, leadLast, unit);
  const up = changeIsPoints(unit)
    ? isNum(leadLast) && isNum(leadFirst) && leadLast >= leadFirst
    : isNum(leadLast) && isNum(leadFirst) && leadLast >= leadFirst;

  const [drag, setDrag] = useState(null); // { a, b }
  const [measured, setMeasured] = useState(null);
  const dragRef = useRef({ a: null, b: null });
  const idx = (state) =>
    typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : -1;
  const onDown = useCallback(
    (state) => {
      if (measured) {
        setMeasured(null);
        return;
      }
      const i = idx(state);
      if (i < 0) return;
      dragRef.current = { a: i, b: null };
      setDrag({ a: i, b: null });
    },
    [measured],
  );
  const onMove = useCallback((state) => {
    if (dragRef.current.a == null) return;
    const i = idx(state);
    if (i < 0) return;
    dragRef.current.b = i;
    setDrag({ a: dragRef.current.a, b: i });
  }, []);
  const finish = useCallback((state) => {
    const { a } = dragRef.current;
    if (a == null) return;
    const released = idx(state);
    const b = released >= 0 ? released : dragRef.current.b;
    if (b != null && b !== a) setMeasured({ a: Math.min(a, b), b: Math.max(a, b) });
    dragRef.current = { a: null, b: null };
    setDrag(null);
  }, []);

  const win = measured || (drag && drag.b != null ? { a: Math.min(drag.a, drag.b), b: Math.max(drag.a, drag.b) } : null);
  const readout = win
    ? {
        from: rows[win.a]?.at,
        to: rows[win.b]?.at,
        lines: series.map((s) => {
          const f = readingNear(rows, s.key, win.a, true);
          const t = readingNear(rows, s.key, win.b, false);
          return { key: s.key, name: s.name, from: f, to: t, change: formatChange(f, t, unit), tone: s.tone };
        }),
      }
    : null;

  return (
    <div className="src">
      <div className="src-head">
        <div className="src-head-left">
          {windowChange && lead ? (
            <span className={`src-chip ${up ? 'is-up' : 'is-down'}`}>
              <i className={`bi ${up ? 'bi-arrow-up-right' : 'bi-arrow-down-right'}`} aria-hidden />
              <span className="src-num">{windowChange}</span>
              {range ? <span className="src-chip-range">{range}</span> : null}
              <span className="src-sr"> change in {lead.name} over the period shown</span>
            </span>
          ) : null}
          {views && views.length > 1 ? (
            <DateSelector
              ranges={views.map((v) => v.label)}
              value={views.find((v) => v.id === view)?.label}
              onChange={(l) => onView?.(views.find((v) => v.label === l)?.id)}
              showCustomDateButton={false}
              size="xs"
            />
          ) : null}
        </div>
        {ranges ? (
          <DateSelector
            ranges={ranges}
            value={range}
            onChange={onRange}
            showCustomDateButton={false}
            size="xs"
          />
        ) : null}
      </div>
      {series.length > 1 || refLine ? (
        <ul className="src-legend" aria-label="Legend">
          {series.map((s) => (
            <li key={s.key} className={`src-key${s.tone === 'reference' ? ' src-key--ref' : ''}`}>
              {s.name}
            </li>
          ))}
          {series.some((s) => hasProj(s.key)) ? <li className="src-key src-key--proj">Projection</li> : null}
          {refLine ? <li className="src-key src-key--median">{refLine.label}</li> : null}
        </ul>
      ) : null}
      <div className="src-body" style={{ height }} role="img" aria-label={label}>
        {rows.length > 1 && lead ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ top: 14, right: 4, left: 0, bottom: 0 }}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={finish}
                onMouseLeave={finish}
                style={{ cursor: drag ? 'col-resize' : 'crosshair', userSelect: 'none' }}
              >
                <defs>
                  <linearGradient id={`srcFill-${lead.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={CHART.gradientFromOpacity} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={CHART.gradientToOpacity} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray={CHART.gridDash} stroke={CHART.gridStroke} vertical={false} />
                <XAxis
                  dataKey="at"
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={56}
                  tickFormatter={periodTick}
                />
                <YAxis
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => formatValue(v, unit)}
                />
                <Tooltip
                  content={<ChartTooltip unit={unit} names={names} />}
                  cursor={{ stroke: 'var(--border-primary)', strokeWidth: 1 }}
                  wrapperStyle={readout ? { visibility: 'hidden' } : undefined}
                />
                {zero ? <ReferenceLine y={0} stroke="var(--border-primary)" strokeDasharray="3 4" /> : null}
                {refLine && isNum(refLine.value) ? (
                  <ReferenceLine
                    y={refLine.value}
                    stroke="var(--text-muted)"
                    strokeDasharray="2 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: refLine.label,
                      position: 'insideTopLeft',
                      fill: 'var(--text-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                    }}
                  />
                ) : null}
                {isNum(leadLast) ? (
                  <ReferenceLine
                    y={leadLast}
                    stroke="transparent"
                    ifOverflow="extendDomain"
                    label={<EndTag value={leadLast} unit={unit} />}
                  />
                ) : null}
                {readout && readout.from && readout.to ? (
                  <ReferenceArea
                    x1={readout.from}
                    x2={readout.to}
                    fill="var(--emerald)"
                    fillOpacity={0.09}
                    stroke={measured ? 'var(--emerald)' : 'none'}
                    strokeOpacity={0.35}
                    strokeDasharray="3 3"
                  />
                ) : null}
                {series
                  .slice()
                  .reverse()
                  .flatMap((s) => {
                    const isLead = s.key === lead.key;
                    const stroke = s.tone === 'reference' ? 'var(--text-muted)' : 'var(--emerald)';
                    const out = [
                      <Area
                        key={s.key}
                        type="linear"
                        dataKey={s.key}
                        name={s.name}
                        stroke={stroke}
                        strokeWidth={isLead ? 1.75 : 1.5}
                        strokeDasharray={s.tone === 'reference' ? '5 4' : undefined}
                        fill={isLead ? `url(#srcFill-${lead.key})` : 'transparent'}
                        dot={false}
                        activeDot={{ r: 3, strokeWidth: 0 }}
                        isAnimationActive={false}
                        connectNulls={false}
                      />,
                    ];
                    if (hasProj(s.key))
                      out.push(
                        <Area
                          key={`${s.key}__proj`}
                          type="linear"
                          dataKey={`${s.key}__proj`}
                          name={`${s.name} (projection)`}
                          stroke={stroke}
                          strokeWidth={1.5}
                          strokeDasharray="3 4"
                          strokeOpacity={0.75}
                          fill="transparent"
                          dot={false}
                          activeDot={{ r: 3, strokeWidth: 0 }}
                          isAnimationActive={false}
                          connectNulls={false}
                        />,
                      );
                    return out;
                  })}
              </AreaChart>
            </ResponsiveContainer>
            {readout ? (
              <div className="src-measure" role={measured ? 'status' : undefined} aria-live={measured ? 'polite' : undefined}>
                <div className="src-measure-range">
                  {periodTick(readout.from)} to {periodTick(readout.to)}
                </div>
                <dl className="src-measure-rows">
                  {readout.lines.map((l) => (
                    <div key={l.key} className="src-measure-row">
                      <dt>
                        <span className={`src-measure-dot${l.tone === 'reference' ? ' is-ref' : ''}`} aria-hidden />
                        {l.name}
                      </dt>
                      <dd className="src-num">
                        {formatValue(l.from, unit)} → {formatValue(l.to, unit)}
                      </dd>
                      <dd className="src-num src-measure-chg">{l.change || ''}</dd>
                    </div>
                  ))}
                </dl>
                {measured ? <div className="src-measure-note">Click the chart to clear</div> : null}
              </div>
            ) : null}
          </>
        ) : (
          <div className="src-state">Not enough observations to draw this chart</div>
        )}
      </div>
      <p className="src-hint">Drag across the chart to measure the change over any period.</p>
      <table className="sxb-sr">
        <caption>
          {label}
          {rows.length > 120 ? ' (latest 120 observations)' : ''}
        </caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(-120).map((r) => (
            <tr key={r.at}>
              <th scope="row">{periodTick(r.at)}</th>
              {series.map((s) => (
                <td key={s.key}>
                  {isNum(r[s.key])
                    ? formatValue(r[s.key], unit)
                    : isNum(r[`${s.key}__proj`])
                      ? `${formatValue(r[`${s.key}__proj`], unit)} (projection)`
                      : 'n/a'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SonarResearchChart;
