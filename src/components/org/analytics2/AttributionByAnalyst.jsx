'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './analytics.css';

/** Horizontal bar of each analyst's total alpha contribution. Click → scorecard. */
export function AttributionByAnalyst({ data = [], onSelect }) {
  if (data.length === 0) {
    return <div className="an4-state" style={{ padding: '1.5rem' }}>No analyst attribution yet.</div>;
  }

  const chartData = data.map((a) => ({
    name: a.name,
    member_id: a.member_id,
    alpha: a.total_alpha == null ? 0 : Number(a.total_alpha.toFixed(2)),
  }));

  return (
    <div>
      <div className="an4-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(16,185,129,0.06)' }}
              contentStyle={{
                background: 'var(--bg-secondary, #0d1218)',
                border: '1px solid var(--border-primary)',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v) => [`${v >= 0 ? '+' : ''}${v}%`, 'Alpha']}
            />
            <Bar dataKey="alpha" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d) => onSelect?.(d.member_id)}>
              {chartData.map((d) => (
                <Cell key={d.member_id} fill={d.alpha >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="an4-table-wrap" style={{ marginTop: '0.5rem' }}>
        <table className="an4-table">
          <thead>
            <tr>
              <th>Analyst</th>
              <th className="r">Pitches</th>
              <th className="r">Avg return</th>
              <th className="r">Avg alpha</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.member_id} className="an4-row-click" onClick={() => onSelect?.(a.member_id)}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.name}</td>
                <td className="r an4-num">{a.pitches}</td>
                <td className={`r an4-num ${(a.avg_return ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>
                  {a.avg_return == null ? '—' : `${a.avg_return >= 0 ? '+' : ''}${a.avg_return.toFixed(1)}%`}
                </td>
                <td className={`r an4-num ${(a.avg_alpha ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>
                  {a.avg_alpha == null ? '—' : `${a.avg_alpha >= 0 ? '+' : ''}${a.avg_alpha.toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
