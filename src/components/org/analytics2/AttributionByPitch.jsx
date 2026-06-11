'use client';

import { useMemo, useState } from 'react';
import './analytics.css';

function stateClass(state) {
  const s = (state || '').toLowerCase();
  if (s.includes('out') || s.includes('win')) return 'an4-state--outperforming';
  if (s.includes('under') || s.includes('loss')) return 'an4-state--underperforming';
  return 'an4-state--neutral';
}

/** Sortable table of pitches by return / alpha, colored by current_state. */
export function AttributionByPitch({ data = [] }) {
  const [sort, setSort] = useState({ key: 'alpha_pct', dir: 'desc' });

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const an = av == null ? -Infinity : Number(av);
      const bn = bv == null ? -Infinity : Number(bv);
      if (typeof av === 'string' || typeof bv === 'string') {
        return sort.dir === 'asc'
          ? String(av || '').localeCompare(String(bv || ''))
          : String(bv || '').localeCompare(String(av || ''));
      }
      return sort.dir === 'asc' ? an - bn : bn - an;
    });
    return arr;
  }, [data, sort]);

  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  if (data.length === 0) {
    return <div className="an4-state" style={{ padding: '1.5rem' }}>No pitches with outcomes yet.</div>;
  }

  const pctCell = (n) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`);

  return (
    <div className="an4-table-wrap">
      <table className="an4-table">
        <thead>
          <tr>
            <th onClick={() => toggle('ticker')}>Ticker</th>
            <th onClick={() => toggle('analyst')}>Analyst</th>
            <th className="r" onClick={() => toggle('return_pct')}>Return</th>
            <th className="r" onClick={() => toggle('alpha_pct')}>Alpha</th>
            <th onClick={() => toggle('current_state')}>State</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.pitch_id}>
              <td className="an4-num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.ticker}</td>
              <td>{p.analyst}</td>
              <td className={`r an4-num ${(p.return_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pctCell(p.return_pct)}</td>
              <td className={`r an4-num ${(p.alpha_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pctCell(p.alpha_pct)}</td>
              <td>
                {p.current_state ? (
                  <span className={`an4-state-chip ${stateClass(p.current_state)}`}>{p.current_state}</span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
