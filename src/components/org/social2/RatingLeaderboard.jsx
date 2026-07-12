'use client';

import { useCallback, useEffect, useState } from 'react';
import './recognition2.css';

const LIST_MODES = [
  { key: 'movers', label: 'Top movers' },
  { key: 'all', label: 'All members' },
  { key: 'vp', label: 'Vice Presidents' },
  { key: 'pm', label: 'Portfolio Managers' },
  { key: 'analyst', label: 'Analysts' },
  { key: 'quant', label: 'Quant Traders' },
];
const PERIODS = [
  { key: '30d', label: '30D' },
  { key: 'qtd', label: 'QTD' },
  { key: 'ytd', label: 'YTD' },
];
const ROLE_TAG = {
  analyst: { cls: 'analyst', label: 'Analyst' },
  quant_trader: { cls: 'quant_trader', label: 'Quant' },
  portfolio_manager: { cls: 'portfolio_manager', label: 'PM' },
  vp: { cls: 'vp', label: 'VP' },
};

const initials = (name) =>
  (name || 'M')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function RatingLeaderboard({ selectedMemberId, onSelect }) {
  const [listMode, setListMode] = useState('movers');
  const [period, setPeriod] = useState('30d');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMovers = listMode === 'movers';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ listMode });
      if (isMovers) qs.set('period', period);
      const res = await fetch(`/api/org/recognition/ratings?${qs}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load ratings.');
        setRows([]);
      } else {
        setRows(json.rows || []);
        setError('');
      }
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, [listMode, period, isMovers]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rec2-card">
      <h3 className="rec2-card-title">Ranked</h3>
      <select
        className="rec2-select"
        value={listMode}
        onChange={(e) => setListMode(e.target.value)}
        aria-label="Ranking mode"
      >
        {LIST_MODES.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>

      {isMovers && (
        <div className="rec2-periods" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className="rec2-period"
              aria-pressed={period === p.key}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="rec2-rows">
        {loading ? (
          <div className="rec2-empty">Loading…</div>
        ) : error ? (
          <div className="rec2-empty">{error}</div>
        ) : rows.length === 0 ? (
          <div className="rec2-empty">
            {isMovers ? 'No rating movement in this period.' : 'No rated members yet.'}
            <div className="rec2-empty-sub">Recompute ratings once theses have resolved.</div>
          </div>
        ) : (
          rows.map((r) => {
            const tag = ROLE_TAG[r.weight_role] || { cls: 'analyst', label: r.role };
            return (
              <button
                key={r.member_id}
                type="button"
                className={`rec2-row${r.is_provisional ? ' rec2-row--provisional' : ''}`}
                aria-selected={r.member_id === selectedMemberId}
                onClick={() => onSelect?.(r.member_id)}
              >
                <span className="rec2-avatar" aria-hidden>
                  {initials(r.name)}
                </span>
                <span className="rec2-row-main">
                  <span className="rec2-row-name">{r.name}</span>
                  <span className={`rec2-roletag rec2-roletag--${tag.cls}`}>{tag.label}</span>
                </span>
                {isMovers ? (
                  <span
                    className={`rec2-row-value ${r.delta >= 0 ? 'rec2-delta-pos' : 'rec2-delta-neg'}`}
                  >
                    {r.delta > 0 ? '+' : ''}
                    {r.delta}
                  </span>
                ) : (
                  <span className="rec2-row-value">{Math.round(r.rating)}</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
