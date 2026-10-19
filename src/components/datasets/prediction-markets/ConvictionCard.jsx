'use client';

/**
 * Card 8, Price Conviction: liquidity (log) against spread. A price is only
 * as informative as the money behind it. Kalshi publishes no liquidity, so
 * its markets plot on volume and draw hollow.
 */
import { useMemo, useState } from 'react';
import {
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import {
  CATEGORY_LABEL,
  CONVICTION,
  convictionGroup,
  convictionLayout,
} from '@/lib/prediction-markets/page-model';
import { Card, CardHead, Skeleton, StateBox, cx } from './parts';
import { int, pct, usd, venueVolume } from './format';

const PLOT_H = 320;
const TICK = { ...CHART.tick, fill: 'var(--text-faint)', fontFamily: 'var(--font-mono)' };
const X_TICKS = [1e3, 1e4, 1e5, 1e6, 1e7];
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
  const pts = useMemo(() => convictionLayout(rows, win, 300), [rows, win]);
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
        x: Math.min(CONVICTION.xMax, Math.max(CONVICTION.xMin, p.x)),
        y: Math.min(CONVICTION.yMax, p.spreadPts),
        spreadPts: p.spreadPts,
        r: p.r,
      })),
    [pts],
  );
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
            <span className="pmk-conv-label pmk-conv-label--thin">
              Thin and wide: treat with care
            </span>
            <span className="pmk-conv-label pmk-conv-label--deep">
              Deep and tight: prices worth trusting
            </span>
            <div
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
              <ResponsiveContainer width="100%" height={PLOT_H}>
                <ScatterChart margin={{ top: 24, right: 12, bottom: 0, left: 0 }}>
                  <ReferenceArea
                    x1={CONVICTION.trustLiquidity}
                    x2={CONVICTION.xMax}
                    y1={0}
                    y2={CONVICTION.trustSpreadPts}
                    fill="var(--pmk-trust-zone)"
                    fillOpacity={1}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                  <XAxis
                    type="number"
                    dataKey="x"
                    scale="log"
                    domain={[CONVICTION.xMin, CONVICTION.xMax]}
                    ticks={X_TICKS}
                    tickFormatter={(v) => usd(v)}
                    tick={TICK}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--pmk-card-border)' }}
                    allowDataOverflow
                    height={22}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0, CONVICTION.yMax]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    tickFormatter={(v) => (v === 10 ? '10+' : String(v))}
                    tick={TICK}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--pmk-card-border)' }}
                    width={44}
                    allowDataOverflow
                  />
                  <Tooltip content={<Tip />} cursor={false} isAnimationActive={false} />
                  <Scatter
                    data={data}
                    isAnimationActive={false}
                    shape={(props) => <Dot {...props} onPick={onLoad} />}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="pmk-conv-axes pmk-legal pmk-num">
              <span>Bid-ask spread, pts (y)</span>
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
