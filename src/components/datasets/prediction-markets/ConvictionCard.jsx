'use client';

/**
 * Card 8, Price Conviction: liquidity (log) against spread. A price is only
 * as informative as the money behind it. Kalshi publishes no liquidity, so
 * its markets plot on volume and draw hollow.
 *
 * Both axes fit the markets in view (Oct 20). The fixed $1K to $10M by
 * 0 to 10 pt frame clamped the deepest markets onto the right edge and the
 * sub-point spreads onto the floor, so every dot piled into the bottom-right
 * corner. The x axis now spans the decades the data covers (2nd to 98th
 * percentile) and the y axis is square-root scaled up to the 95th percentile
 * spread, which separates the tight spreads where most markets sit.
 */
import { useMemo, useState } from 'react';
import { ReferenceArea, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import {
  CATEGORY_LABEL,
  CONVICTION,
  convictionGroup,
  convictionLayout,
} from '@/lib/prediction-markets/page-model';
import { Card, CardHead, Skeleton, StateBox, cx } from './parts';
import { int, pct, usd, venueVolume } from './format';
import { useSize } from './use-size';

const PLOT_H = 320;
const TOP = 24;
const X_AXIS_H = 22;
const Y_AXIS_W = 44;
const TICK = { ...CHART.tick, fill: 'var(--text-faint)', fontFamily: 'var(--font-mono)' };
const Y_STEPS = [0.5, 1, 2, 3, 5, 10, 20, 50];

function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[i];
}

/** Axis frame that fits the plotted markets. Pure, so it is testable. */
function convictionFrame(points) {
  const xs = points
    .map((p) => p.rawX)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const ys = points.map((p) => p.spreadPts).sort((a, b) => a - b);
  const lo = quantile(xs, 0.02) ?? CONVICTION.xMin;
  const hi = quantile(xs, 0.98) ?? CONVICTION.xMax;
  const d0 = Math.floor(Math.log10(lo));
  let d1 = Math.ceil(Math.log10(hi));
  if (d1 <= d0) d1 = d0 + 1;
  const xTicks = [];
  for (let d = d0; d <= d1; d += 1) xTicks.push(10 ** d);
  const yTop = quantile(ys, 0.95) ?? CONVICTION.yMax;
  const yMax = Y_STEPS.find((v) => v >= yTop) ?? Y_STEPS[Y_STEPS.length - 1];
  const yTicks = [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax].map(
    (v) => Math.round(v * 100) / 100,
  );
  return { xMin: 10 ** d0, xMax: 10 ** d1, xTicks, yMax, yTicks };
}

function spreadTick(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(v < 1 ? 2 : 1).replace(/0+$/, '');
}
const GROUP_LABEL = {
  politics: 'Politics and elections',
  sports: 'Sports',
  crypto: 'Crypto',
  other: 'Other',
};

function Dot({ cx: x, cy: y, payload, onPick }) {
  if (x == null || y == null) return null;
  const hollow = payload.xBasis === 'volume';
  return (
    <circle
      cx={x}
      cy={y}
      r={payload.r}
      className={cx('pmk-cdot', `is-${payload.group}`, hollow && 'is-hollow')}
      onClick={() => onPick(payload.id)}
    />
  );
}

function Tip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="pmk-tooltip pmk-tooltip--static">
      <p className="pmk-tooltip-q">{p.question}</p>
      <p className="pmk-tooltip-cols pmk-num">
        <span>
          <span className="pmk-faint">Prob</span> {pct(p.prob)}
        </span>
        <span>
          <span className="pmk-faint">{p.xBasis === 'volume' ? 'Vol' : 'Liq'}</span>{' '}
          {p.xBasis === 'volume' ? venueVolume(p.rawX, p.venue) : usd(p.rawX)}
        </span>
        <span>
          <span className="pmk-faint">Spread</span> {p.spreadPts.toFixed(1)} pt
          {p.spreadPts === 1 ? '' : 's'}
        </span>
      </p>
    </div>
  );
}

export function ConvictionCard({ className, state, rows, win, filters, onLoad, onRetry }) {
  const [focusTable, setFocusTable] = useState(false);
  const [plotRef, plotSize] = useSize();
  const pts = useMemo(() => convictionLayout(rows, win, 300), [rows, win]);
  const frame = useMemo(
    () => convictionFrame(pts.map((p) => ({ rawX: p.x, spreadPts: p.spreadPts }))),
    [pts],
  );
  const data = useMemo(
    () =>
      pts.map((p) => ({
        id: p.row.id,
        question: p.row.question,
        venue: p.row.venue,
        prob: p.row.p,
        group: convictionGroup(p.row),
        xBasis: p.xBasis,
        rawX: p.x,
        x: Math.min(frame.xMax, Math.max(frame.xMin, p.x)),
        y: Math.min(frame.yMax, p.spreadPts),
        spreadPts: p.spreadPts,
        r: p.r,
      })),
    [pts, frame],
  );
  const zoneX1 = Math.max(CONVICTION.trustLiquidity, frame.xMin);
  const showZone = zoneX1 < frame.xMax;
  const zoneY2 = Math.min(CONVICTION.trustSpreadPts, frame.yMax);
  const plotW = plotSize.w;
  const plotH = plotSize.h > 0 ? plotSize.h : PLOT_H;
  const top20 = useMemo(
    () =>
      [...data]
        .filter((d) => d.xBasis === 'liquidity')
        .sort((a, b) => b.rawX - a.rawX)
        .slice(0, 20),
    [data],
  );
  const catName =
    filters.category && filters.category !== 'all' ? CATEGORY_LABEL[filters.category] : 'this view';

  return (
    <Card className={cx('pmk-card--conviction', className)} label="Price conviction">
      <CardHead
        title="Price conviction"
        sub={
          <>
            Liquidity vs spread · {win} · <span className="pmk-num">{int(data.length)}</span>{' '}
            markets
          </>
        }
      >
        <p className="pmk-explainer">A price is only as informative as the money behind it.</p>
      </CardHead>
      <div className="pmk-card-body">
        {state === 'loading' ? (
          <div aria-busy="true">
            <span className="pmk-sr">Loading price conviction</span>
            <Skeleton height={PLOT_H} radius={8} />
          </div>
        ) : state === 'error' ? (
          <StateBox kind="error" onRetry={onRetry} minHeight={PLOT_H} />
        ) : data.length < 5 ? (
          <StateBox title="Not enough quotes to plot" minHeight={PLOT_H}>
            {`Fewer than 5 markets in ${catName} have a live bid and ask. Widen the category to compare liquidity and spread.`}
          </StateBox>
        ) : (
          <div className="pmk-conv">
            <div
              ref={plotRef}
              className="pmk-conv-plot"
              role="img"
              aria-label={`Scatter of ${data.length} markets, liquidity against bid-ask spread. ${
                data.filter(
                  (d) =>
                    d.xBasis === 'liquidity' &&
                    d.rawX >= CONVICTION.trustLiquidity &&
                    d.spreadPts <= CONVICTION.trustSpreadPts,
                ).length
              } sit in the deep and tight zone.`}
            >
              <span className="pmk-conv-label pmk-conv-label--thin" aria-hidden="true">
                Thin and wide: treat with care
              </span>
              {showZone ? (
                <span className="pmk-conv-label pmk-conv-label--deep" aria-hidden="true">
                  Deep and tight: prices worth trusting
                </span>
              ) : null}
              {plotW > 0 ? (
                <div className="pmk-conv-canvas">
                  <ScatterChart
                    width={plotW}
                    height={plotH}
                    margin={{ top: TOP, right: 12, bottom: 0, left: 0 }}
                  >
                    {showZone ? (
                      <ReferenceArea
                        x1={zoneX1}
                        x2={frame.xMax}
                        y1={0}
                        y2={zoneY2}
                        fill="var(--pmk-trust-zone)"
                        fillOpacity={1}
                        stroke="none"
                        ifOverflow="hidden"
                      />
                    ) : null}
                    <XAxis
                      type="number"
                      dataKey="x"
                      scale="log"
                      domain={[frame.xMin, frame.xMax]}
                      ticks={frame.xTicks}
                      tickFormatter={(v) => usd(v)}
                      tick={TICK}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--pmk-card-border)' }}
                      allowDataOverflow
                      height={X_AXIS_H}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      scale="sqrt"
                      domain={[0, frame.yMax]}
                      ticks={frame.yTicks}
                      tickFormatter={(v) =>
                        v === frame.yMax ? `${spreadTick(v)}+` : spreadTick(v)
                      }
                      tick={TICK}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--pmk-card-border)' }}
                      width={Y_AXIS_W}
                      allowDataOverflow
                    />
                    <Tooltip content={<Tip />} cursor={false} isAnimationActive={false} />
                    <Scatter
                      data={data}
                      isAnimationActive={false}
                      shape={(props) => <Dot {...props} onPick={onLoad} />}
                    />
                  </ScatterChart>
                </div>
              ) : null}
            </div>
            <p className="pmk-conv-axes pmk-legal pmk-num">
              <span>Bid-ask spread, pts, square-root scale (y)</span>
              <span>Liquidity, log scale (x)</span>
            </p>
            <button
              type="button"
              className="pmk-link pmk-conv-table-toggle"
              aria-expanded={focusTable}
              onClick={() => setFocusTable((v) => !v)}
            >
              {focusTable ? 'Hide' : 'Show'} the 20 deepest markets as a table
            </button>
            <table className={cx('pmk-conv-table', !focusTable && 'pmk-sr')}>
              <caption className="pmk-sr">
                The 20 markets with the most liquidity in this view
              </caption>
              <thead>
                <tr>
                  <th scope="col">Market</th>
                  <th scope="col">Prob</th>
                  <th scope="col">Liquidity</th>
                  <th scope="col">Spread</th>
                </tr>
              </thead>
              <tbody>
                {top20.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <button type="button" className="pmk-table-q" onClick={() => onLoad(d.id)}>
                        {d.question}
                      </button>
                    </td>
                    <td className="pmk-num">{pct(d.prob)}</td>
                    <td className="pmk-num">{usd(d.rawX)}</td>
                    <td className="pmk-num">{d.spreadPts.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <footer className="pmk-foot">
        <span className="pmk-conv-legend pmk-legal">
          {Object.entries(GROUP_LABEL).map(([k, label]) => (
            <span key={k}>
              <span className={cx('pmk-cdot-key', `is-${k}`)} aria-hidden="true" />
              {label}
            </span>
          ))}
          <span>
            <span className="pmk-cdot-key is-hollow" aria-hidden="true" />
            Kalshi: volume on x
          </span>
        </span>
        <span className="pmk-legal">Dot size: {win} volume</span>
      </footer>
    </Card>
  );
}
