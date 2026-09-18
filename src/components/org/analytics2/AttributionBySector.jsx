'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { CHART } from '@/lib/chart-theme';
import './analytics.css';

/** Sector weight vs. contribution to fund return. */
export function AttributionBySector({ data = [] }) {
  if (data.length === 0) {
    return (
      <div className="an4-state" style={{ padding: '1.5rem' }}>
        No sector data — add positions to a team portfolio.
      </div>
    );
  }

  const chartData = data.map((s) => ({
    sector: s.sector.length > 12 ? `${s.sector.slice(0, 11)}…` : s.sector,
    full: s.sector,
    weight: Number((s.weight_pct ?? 0).toFixed(1)),
    contribution: s.contribution_pct == null ? 0 : Number(s.contribution_pct.toFixed(1)),
  }));

  return (
    <div>
      <div className="an4-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
            <XAxis
              dataKey="sector"
              tick={CHART.tick}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={CHART.tick} />
            <Tooltip
              cursor={{ fill: 'rgba(16,185,129,0.06)' }}
              contentStyle={{
                background: 'var(--bg-secondary, #0d1218)',
                border: '1px solid var(--border-primary)',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v, k) => [`${v}%`, k === 'weight' ? 'Weight' : 'Contribution']}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="weight" name="Weight" fill={CHART.primaryStroke} radius={[3, 3, 0, 0]} />
            <Bar dataKey="contribution" name="Contribution" radius={[3, 3, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.contribution >= 0 ? 'var(--positive-bright)' : 'var(--negative)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="an4-table-wrap" style={{ marginTop: '0.5rem' }}>
        <table className="an4-table">
          <thead>
            <tr>
              <th>Sector</th>
              <th className="r">Weight</th>
              <th className="r">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.sector}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.sector}</td>
                <td className="r an4-num">{(s.weight_pct ?? 0).toFixed(1)}%</td>
                <td
                  className={`r an4-num ${(s.contribution_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}
                >
                  {s.contribution_pct == null
                    ? '—'
                    : `${s.contribution_pct >= 0 ? '+' : ''}${s.contribution_pct.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
