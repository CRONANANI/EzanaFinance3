'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { COMPARISON_STRATEGIES } from '@/lib/for-the-quants-mock-data';

const DATE_RANGES = [
  { id: '1M', label: '1M', days: 22 },
  { id: '3M', label: '3M', days: 66 },
  { id: '6M', label: '6M', days: 132 },
  { id: '1Y', label: '1Y', days: 252 },
  { id: '2Y', label: '2Y', days: 504 },
];

function generateEquityCurve(seed, n) {
  const pts = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    const jitter = Math.sin(i * 0.37 + seed * 0.13) * 0.65;
    v += Math.sin(i * 0.2 + seed) * 1.2 + 0.3 + jitter;
    v = Math.max(80, v);
    pts.push(parseFloat(v.toFixed(2)));
  }
  return pts;
}

function winnerFor(a, b, metric) {
  const va = parseFloat(String(a[metric]).replace(/[^0-9.\-]/g, ''));
  const vb = parseFloat(String(b[metric]).replace(/[^0-9.\-]/g, ''));
  if (isNaN(va) || isNaN(vb)) return null;
  if (metric === 'maxDd') return va > vb ? 'a' : vb > va ? 'b' : null;
  return va > vb ? 'a' : vb > va ? 'b' : null;
}

const METRICS = [
  { key: 'returnPct', label: 'Return' },
  { key: 'sharpe', label: 'Sharpe' },
  { key: 'maxDd', label: 'Max DD' },
  { key: 'winRate', label: 'Win Rate' },
  { key: 'trades', label: 'Trades' },
  { key: 'alpha', label: 'Alpha' },
];

export function StrategyComparisonCard() {
  const [selectedA, setSelectedA] = useState(COMPARISON_STRATEGIES[0].id);
  const [selectedB, setSelectedB] = useState(COMPARISON_STRATEGIES[1].id);
  const [dateRange, setDateRange] = useState('1Y');

  const stratA = COMPARISON_STRATEGIES.find((s) => s.id === selectedA) || COMPARISON_STRATEGIES[0];
  const stratB = COMPARISON_STRATEGIES.find((s) => s.id === selectedB) || COMPARISON_STRATEGIES[1];
  const days = DATE_RANGES.find((d) => d.id === dateRange)?.days || 252;

  const curveA = useMemo(
    () => generateEquityCurve(stratA.id.charCodeAt(4), days),
    [stratA.id, days],
  );
  const curveB = useMemo(
    () => generateEquityCurve(stratB.id.charCodeAt(4) + 5, days),
    [stratB.id, days],
  );

  const chartData = useMemo(() => {
    return curveA.map((va, i) => {
      const monthIdx = Math.floor((i / days) * 12);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return {
        day: i + 1,
        label: i % Math.floor(days / 6) === 0 ? months[monthIdx % 12] : '',
        [stratA.name]: va,
        [stratB.name]: curveB[i],
      };
    });
  }, [curveA, curveB, stratA.name, stratB.name, days]);

  const winsA = METRICS.filter((m) => winnerFor(stratA, stratB, m.key) === 'a').length;
  const winsB = METRICS.filter((m) => winnerFor(stratA, stratB, m.key) === 'b').length;

  return (
    <div className="db-card">
      <div className="db-card-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="ftq-section-title">
          <i className="bi bi-arrow-left-right" aria-hidden /> Strategy Comparison
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {DATE_RANGES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`ftq-tab ${dateRange === d.id ? 'active' : ''}`}
              onClick={() => setDateRange(d.id)}
              style={{ padding: '0.2rem 0.45rem', fontSize: '0.65rem' }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ftq-card-body-pad ftq-card-body-pad--flush-top">
        <div className="ftq-cmp-selectors">
          <div className="ftq-cmp-sel">
            <span className="ftq-cmp-label" style={{ color: stratA.color }}>
              Strategy A
            </span>
            <select
              className="ftq-vb-select"
              value={selectedA}
              onChange={(e) => setSelectedA(e.target.value)}
            >
              {COMPARISON_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <span className="ftq-cmp-vs">VS</span>
          <div className="ftq-cmp-sel">
            <span className="ftq-cmp-label" style={{ color: stratB.color }}>
              Strategy B
            </span>
            <select
              className="ftq-vb-select"
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
            >
              {COMPARISON_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ height: 180, marginTop: '0.5rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 8 }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => `$${v}`}
                domain={['auto', 'auto']}
              />
              <ReferenceLine y={100} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <Tooltip
                contentStyle={{
                  background: '#161b22',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  fontSize: '0.65rem',
                  padding: '6px 10px',
                }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`]}
              />
              <Line
                type="monotone"
                dataKey={stratA.name}
                stroke={stratA.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: stratA.color }}
              />
              <Line
                type="monotone"
                dataKey={stratB.name}
                stroke={stratB.color}
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: stratB.color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '0.5rem 0',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
            <span style={{ color: stratA.color }}>━ {stratA.name}</span>
            <span style={{ color: stratB.color }}>╌ {stratB.name}</span>
          </div>
          {winsA !== winsB && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: winsA > winsB ? `${stratA.color}18` : `${stratB.color}18`,
                color: winsA > winsB ? stratA.color : stratB.color,
                border: `1px solid ${winsA > winsB ? stratA.color : stratB.color}40`,
              }}
            >
              ★ {winsA > winsB ? stratA.name : stratB.name} wins {Math.max(winsA, winsB)}/
              {METRICS.length} metrics
            </span>
          )}
        </div>

        <div className="ftq-cmp-table">
          <div className="ftq-cmp-header-row">
            <span className="ftq-cmp-cell ftq-cmp-cell--label">Metric</span>
            <span className="ftq-cmp-cell" style={{ color: stratA.color }}>
              {stratA.name}
            </span>
            <span className="ftq-cmp-cell" style={{ color: stratB.color }}>
              {stratB.name}
            </span>
          </div>
          {METRICS.map((m) => {
            const winner = winnerFor(stratA, stratB, m.key);
            return (
              <div key={m.key} className="ftq-cmp-row">
                <span className="ftq-cmp-cell ftq-cmp-cell--label">{m.label}</span>
                <span className="ftq-cmp-cell" style={{ position: 'relative' }}>
                  {stratA[m.key]}
                  {winner === 'a' && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: '0.55rem',
                        color: stratA.color,
                        fontWeight: 800,
                      }}
                    >
                      ★
                    </span>
                  )}
                </span>
                <span className="ftq-cmp-cell" style={{ position: 'relative' }}>
                  {stratB[m.key]}
                  {winner === 'b' && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: '0.55rem',
                        color: stratB.color,
                        fontWeight: 800,
                      }}
                    >
                      ★
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
