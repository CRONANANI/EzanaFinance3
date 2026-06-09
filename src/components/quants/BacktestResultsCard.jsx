'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { LATEST_BACKTESTS, LATEST_BACKTEST_BENCHMARK } from '@/lib/for-the-quants-mock-data';
import { BacktestExplainer } from '@/components/quants/BacktestExplainer';
import { DateSelector } from '@/components/ui/DateSelector';

const PERIODS = [
  { id: '1M', label: '1M', days: 22 },
  { id: '3M', label: '3M', days: 66 },
  { id: '6M', label: '6M', days: 132 },
  { id: '1Y', label: '1Y', days: 252 },
];

function generateCurve(seed, n, drift = 0.15) {
  const pts = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.37 + seed) * 1.1 + drift + Math.sin(i * 1.1 + seed * 2) * 0.5;
    v = Math.max(70, v);
    pts.push(parseFloat(v.toFixed(2)));
  }
  return pts;
}

function generateBenchmark(n) {
  const pts = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i * 0.22) * 0.7 + 0.08;
    v = Math.max(85, v);
    pts.push(parseFloat(v.toFixed(2)));
  }
  return pts;
}

function computeDrawdown(curve) {
  let peak = curve[0];
  return curve.map((v) => {
    if (v > peak) peak = v;
    return parseFloat((((v - peak) / peak) * 100).toFixed(2));
  });
}

export function BacktestResultsCard() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [period, setPeriod] = useState('1Y');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [showDrawdown, setShowDrawdown] = useState(false);

  const bt = LATEST_BACKTESTS[selectedIdx] || LATEST_BACKTESTS[0];
  const periodDays = PERIODS.find((p) => p.id === period)?.days || 252;

  const equityCurve = useMemo(
    () => generateCurve(bt.chartSeed, periodDays),
    [bt.chartSeed, periodDays],
  );
  const benchmarkCurve = useMemo(() => generateBenchmark(periodDays), [periodDays]);
  const drawdownCurve = useMemo(() => computeDrawdown(equityCurve), [equityCurve]);

  const chartData = useMemo(() => {
    return equityCurve.map((v, i) => ({
      day: i + 1,
      strategy: v,
      benchmark: benchmarkCurve[i],
      drawdown: drawdownCurve[i],
    }));
  }, [equityCurve, benchmarkCurve, drawdownCurve]);

  const finalReturn =
    equityCurve.length > 0 ? ((equityCurve[equityCurve.length - 1] - 100) / 100) * 100 : 0;
  const isPositive = finalReturn >= 0;

  const metrics = [
    { label: 'Return', value: bt.returnPct, tone: 'positive' },
    { label: 'Sharpe', value: bt.sharpe },
    { label: 'Max DD', value: bt.maxDd, tone: 'negative' },
    { label: 'Win Rate', value: bt.winRate },
    { label: 'Trades', value: bt.trades },
    { label: 'Alpha', value: bt.alpha, tone: 'positive' },
    { label: 'Sortino', value: (Number(bt.sharpe) * 1.3).toFixed(2) },
    {
      label: 'Calmar',
      value: (Math.abs(parseFloat(bt.returnPct)) / Math.abs(parseFloat(bt.maxDd))).toFixed(2),
    },
    { label: 'Profit Factor', value: (1 + parseFloat(bt.winRate) / 100).toFixed(2) },
  ];

  return (
    <div className="db-card">
      <div className="db-card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="ftq-section-title">
          <i className="bi bi-graph-up-arrow" aria-hidden /> Backtest Results
        </h3>
        <DateSelector
          ranges={PERIODS.map((p) => p.id)}
          value={period}
          onChange={setPeriod}
          size="xs"
        />
      </div>
      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <select
            className="ftq-vb-select"
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            style={{ maxWidth: 220 }}
          >
            {LATEST_BACKTESTS.map((b, i) => (
              <option key={b.id} value={i}>
                {b.strategyName}
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>Period: {bt.period}</span>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.7rem',
              color: '#9ca3af',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            <input
              type="checkbox"
              checked={showBenchmark}
              onChange={(e) => setShowBenchmark(e.target.checked)}
              style={{ accentColor: '#6b7280' }}
            />
            S&P 500
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.7rem',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={showDrawdown}
              onChange={(e) => setShowDrawdown(e.target.checked)}
              style={{ accentColor: '#ef4444' }}
            />
            Drawdown
          </label>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
            gap: '0.4rem',
            marginBottom: '0.75rem',
          }}
        >
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.6rem', color: '#6b7280', marginBottom: '0.15rem' }}>
                {m.label}
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  color:
                    m.tone === 'positive'
                      ? '#10b981'
                      : m.tone === 'negative'
                        ? '#f87171'
                        : '#d1d5db',
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: showDrawdown ? 130 : 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => `$${v}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#161b22',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  fontSize: '0.65rem',
                }}
                formatter={(v, name) => [
                  `$${Number(v).toFixed(2)}`,
                  name === 'strategy' ? bt.strategyName : 'S&P 500',
                ]}
              />
              <ReferenceLine y={100} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="strategy"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                fill="url(#btGrad)"
                dot={false}
                name="strategy"
              />
              {showBenchmark && (
                <Area
                  type="monotone"
                  dataKey="benchmark"
                  stroke="#6b7280"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  fill="none"
                  dot={false}
                  name="benchmark"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {showDrawdown && (
          <div style={{ height: 80, marginTop: '0.25rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 7 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => `${v}%`}
                  domain={['auto', 0]}
                />
                <Tooltip
                  contentStyle={{
                    background: '#161b22',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: '0.65rem',
                  }}
                  formatter={(v) => [`${Number(v).toFixed(2)}%`, 'Drawdown']}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  strokeWidth={1}
                  fill="url(#ddGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="ftq-bench" style={{ marginTop: '0.5rem' }}>
          Benchmark (S&amp;P 500): {LATEST_BACKTEST_BENCHMARK}
        </div>
        <BacktestExplainer />
      </div>
    </div>
  );
}
