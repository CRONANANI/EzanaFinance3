/**
 * SocialLedgerSection — "Social investing / live ELO" landing section
 * (design concept 4a, "The Ledger").
 *
 * Three stacked pieces: centered copy → two-column ledger (event feed +
 * rating chart with cohort filters) → full-width Season Standings band.
 * The chart is a recharts AreaChart built to the same spec as the "Lately
 * on Ezana" chart on the home page. Feed rows run on a 14s CSS master loop
 * and LIVE dots pulse at 2s; prefers-reduced-motion shows the fully-rendered
 * static state. Data is static marketing content, with no fetching.
 */

'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import './social-ledger.css';

// Eight weekly rating points. Your line is constant across cohorts and ends on
// the 1498 the header reads; the two grey comparison series swap per cohort.
const WEEKS = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08'];
const YOU_SERIES = [1408, 1416, 1410, 1428, 1440, 1452, 1484, 1498];

const COHORTS = {
  friends: {
    label: 'Friends',
    caption: 'vs. 3 friends',
    a: [1496, 1502, 1498, 1508, 1510, 1516, 1522, 1524],
    b: [1420, 1428, 1424, 1436, 1448, 1444, 1456, 1466],
  },
  whales: {
    label: 'Whales',
    caption: 'vs. 13F whales',
    a: [1508, 1504, 1510, 1502, 1514, 1518, 1516, 1528],
    b: [1448, 1450, 1444, 1458, 1454, 1464, 1472, 1478],
  },
  politicians: {
    label: 'Politicians',
    caption: 'vs. Congress',
    a: [1472, 1478, 1470, 1482, 1476, 1490, 1496, 1502],
    b: [1428, 1422, 1432, 1426, 1438, 1434, 1446, 1450],
  },
};

const buildChartData = (cohort) =>
  WEEKS.map((wk, i) => ({
    wk,
    you: YOU_SERIES[i],
    a: COHORTS[cohort].a[i],
    b: COHORTS[cohort].b[i],
  }));

const STANDINGS = [
  { rank: '01', name: 'Daniel R.', elo: '1512', delta: '—', deltaKind: 'flat', variant: 'top' },
  {
    rank: '02',
    name: 'You',
    handle: '@axum',
    elo: '1498',
    delta: '+24',
    deltaKind: 'up',
    variant: 'you',
  },
  { rank: '03', name: 'Maya K.', elo: '1470', badge: 'NEW' },
  { rank: '04', name: 'Priya S.', elo: '1441', delta: '-5', deltaKind: 'down' },
];

export function SocialLedgerSection() {
  const [cohort, setCohort] = useState('friends');
  const active = COHORTS[cohort];

  return (
    <section className="sled-section" aria-labelledby="sled-heading">
      {/* ── 1. Copy block ── */}
      <div className="sled-copy">
        <p className="sled-eyebrow">Social investing</p>
        <h2 id="sled-heading" className="sled-heading">
          Every move is on the record.
        </h2>
        <p className="sled-sub">
          Add a friend and your ratings start writing themselves: wins, streaks and research, each
          one a line in the ledger.
        </p>
      </div>

      {/* ── 2. Two-column ledger ── */}
      <div className="sled-ledger">
        {/* Left: event feed. Rows enter one by one on the 14s master loop and
            distribute across the chart column's full height. */}
        <div className="sled-feed">
          <div className="sled-row">
            <span className="sled-avatar">M</span>
            <span className="sled-row-body">
              <strong>Maya K.</strong> sent you a friend request
            </span>
            <span className="sled-time">09:41</span>
          </div>
          <div className="sled-row sled-row--wash">
            <span className="sled-avatar sled-avatar--check">✓</span>
            <span className="sled-row-body">
              Accepted: <strong>Maya joined your rankings</strong> at{' '}
              <span className="sled-num">1470</span>
            </span>
            <span className="sled-time">09:42</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+12</span>
            <span className="sled-row-body">
              Top 10% weekly P&amp;L · <span className="sled-num">1462 → 1474</span>
            </span>
            <span className="sled-time">FRI</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+24</span>
            <span className="sled-row-body">
              Won &lsquo;Q3 Momentum Sprint&rsquo; · <span className="sled-num">1474 → 1498</span>
            </span>
            <span className="sled-time">MON</span>
          </div>
          <div className="sled-row sled-row--wash">
            <span className="sled-delta">▲ 02</span>
            <span className="sled-row-body">
              You passed Priya S. · now <strong>#2 in your circle</strong>
            </span>
            <span className="sled-time">MON</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+5</span>
            <span className="sled-row-body">
              7-day login streak · <span className="sled-num">1498 → 1503</span>
            </span>
            <span className="sled-time">TUE</span>
          </div>
          <div className="sled-row">
            <span className="sled-delta">+8</span>
            <span className="sled-row-body">
              Research post upvoted · <span className="sled-num">consensus signal</span>
            </span>
            <span className="sled-time">WED</span>
          </div>
          <div className="sled-row sled-row--wash">
            <span className="sled-avatar">P</span>
            <span className="sled-row-body">
              <strong>Priya S.</strong> challenged you to &lsquo;Season 4 Sprint&rsquo;
            </span>
            <span className="sled-time">NOW</span>
          </div>
        </div>

        {/* Right: rating chart. No card and no border; it sits on the page. */}
        <div className="sled-chart">
          <div className="sled-chart-head">
            <span className="sled-chart-label">Your rating · @axum</span>
            <div className="sled-chart-controls">
              {Object.entries(COHORTS).map(([key, c]) => (
                <button
                  key={key}
                  type="button"
                  className={`sled-pill${cohort === key ? ' is-active' : ''}`}
                  aria-pressed={cohort === key}
                  onClick={() => setCohort(key)}
                >
                  {c.label}
                </button>
              ))}
              <span className="sled-live">
                <i className="sled-live-dot" aria-hidden />
                LIVE
              </span>
            </div>
          </div>

          <div className="sled-rating">
            <span className="sled-rating-value">1498</span>
            <span className="sled-rating-delta">+36 this week</span>
            <span className="sled-rating-vs">{active.caption}</span>
          </div>

          {/* key={cohort} remounts the chart so the 400ms draw restarts on
              cohort switch, the same behavior the old SVG had. */}
          <div className="sled-chart-wide">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart key={cohort} data={buildChartData(cohort)}>
                <defs>
                  <linearGradient id="sledFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray={CHART.gridDash}
                  stroke={CHART.gridStroke}
                  vertical={false}
                />
                <XAxis
                  dataKey="wk"
                  tick={CHART.tick}
                  axisLine={{ stroke: 'var(--border-primary)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={CHART.tick}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  domain={['dataMin - 16', 'dataMax + 16']}
                />
                <Tooltip
                  content={({ active: isActive, payload }) => {
                    if (!isActive || !payload?.length) return null;
                    return (
                      <div className="sled-chart-tooltip">
                        <div className="sled-chart-tooltip-date">{payload[0].payload.wk}</div>
                        {payload.map((entry) => (
                          <div
                            key={entry.dataKey}
                            className="sled-chart-tooltip-val"
                            style={{ color: entry.stroke }}
                          >
                            {entry.name}: {entry.value}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="you"
                  name="You"
                  stroke="var(--emerald)"
                  strokeWidth={2}
                  fill="url(#sledFill)"
                  isAnimationActive
                  animationDuration={CHART.animationDuration}
                />
                <Area
                  type="monotone"
                  dataKey="a"
                  name="Leader"
                  stroke="var(--text-faint)"
                  strokeWidth={1.5}
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="b"
                  name="Median"
                  stroke="var(--text-ghost)"
                  strokeWidth={1.5}
                  fill="transparent"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 3. Season standings band (full-width) ── */}
      <div className="sled-band">
        <div className="sled-band-inner">
          <div className="sled-band-head">
            <span className="sled-eyebrow sled-eyebrow--left">Season 4 standings</span>
            <span className="sled-live">
              <i className="sled-live-dot" aria-hidden />
              LIVE
            </span>
          </div>

          <div className="sled-tiles">
            {STANDINGS.map((p) => (
              <div
                key={p.rank}
                className={[
                  'sled-tile',
                  p.variant === 'top' && 'sled-tile--top',
                  p.variant === 'you' && 'sled-tile--you',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="sled-tile-rank">{p.rank}</span>
                <span className="sled-tile-name">
                  {p.name}
                  {p.handle ? <span className="sled-tile-handle"> {p.handle}</span> : null}
                </span>
                {p.badge ? (
                  <span className="sled-tile-badge">{p.badge}</span>
                ) : (
                  <span className={`sled-tile-delta sled-tile-delta--${p.deltaKind}`}>
                    {p.delta}
                  </span>
                )}
                <span className="sled-tile-elo">{p.elo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SocialLedgerSection;
