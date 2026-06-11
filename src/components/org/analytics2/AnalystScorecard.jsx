'use client';

import { useEffect, useState } from 'react';
import './analytics.css';

const pct1 = (n) => (n == null ? '—' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`);

/** One member's scorecard. `memberId` is an org_members.id. Role-gated by the API. */
export function AnalystScorecard({ memberId, embedded = false }) {
  const [scorecard, setScorecard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!memberId) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/org/analytics/scorecard/${memberId}`, { cache: 'no-store' });
        if (res.status === 403) {
          if (!cancelled) setError('You can only view your own scorecard.');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || 'Failed to load scorecard.');
          return;
        }
        setScorecard(data.scorecard);
        setError('');
      } catch {
        if (!cancelled) setError('Could not connect.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  if (loading) return <div className="an4-state">Loading scorecard…</div>;
  if (error) return <div className="an4-state an4-error">{error}</div>;
  if (!scorecard) return <div className="an4-state">No scorecard.</div>;

  const s = scorecard;

  return (
    <div className="an4-root">
      {!embedded && (
        <div className="an4-header">
          <div>
            <p className="an4-eyebrow">Analyst Scorecard</p>
            <h1 className="an4-title">{s.name}</h1>
            <p className="an4-sub" style={{ textTransform: 'capitalize' }}>
              {s.sub_role || (s.role || '').replace('_', ' ')}
            </p>
          </div>
        </div>
      )}

      <div className="an4-scorecard-top">
        <div className="an4-stat">
          <div className="an4-stat-lbl">Hit rate</div>
          <div className="an4-big">{s.hit_rate == null ? '—' : `${Math.round(s.hit_rate)}%`}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Avg return</div>
          <div className={`an4-big ${(s.avg_return ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct1(s.avg_return)}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Avg alpha</div>
          <div className={`an4-big ${(s.avg_alpha ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct1(s.avg_alpha)}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Pitches</div>
          <div className="an4-big">{s.pitch_count}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Votes cast</div>
          <div className="an4-big">{s.votes_participated}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Notes</div>
          <div className="an4-big">{s.notes_authored}</div>
        </div>
      </div>

      <div className="an4-panel">
        <h3 className="an4-panel-title">Calls</h3>
        {s.calls.length === 0 ? (
          <div className="an4-state" style={{ padding: '1.25rem' }}>No pitches yet.</div>
        ) : (
          <div className="an4-table-wrap">
            <table className="an4-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="r">Return</th>
                  <th className="r">Alpha</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {s.calls.map((c, i) => (
                  <tr key={`${c.ticker}-${i}`}>
                    <td className="an4-num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.ticker}</td>
                    <td className={`r an4-num ${(c.return_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct1(c.return_pct)}</td>
                    <td className={`r an4-num ${(c.alpha_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct1(c.alpha_pct)}</td>
                    <td>{c.current_state || (c.has_outcome ? '—' : 'pending')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
