'use client';

import { useCallback, useEffect, useState } from 'react';
import { AttributionByAnalyst } from './AttributionByAnalyst';
import { AttributionBySector } from './AttributionBySector';
import { AttributionByPitch } from './AttributionByPitch';
import { AnalystScorecard } from './AnalystScorecard';
import './analytics.css';

const money = (n) => (n == null ? '—' : `$${Math.round(Number(n)).toLocaleString()}`);
const pct = (n) => (n == null ? '—' : `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`);

export function FundDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scorecardFor, setScorecardFor] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org/analytics/fund', { cache: 'no-store' });
      if (res.status === 403) {
        setError('This page is for organizational members only.');
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || 'Failed to load analytics.');
        return;
      }
      setData(json);
      setError('');
    } catch {
      setError('Could not connect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="an4-state">Loading fund analytics…</div>;
  if (error) return <div className="an4-state an4-error">{error}</div>;

  const perf = data.performance || {};
  const attr = data.attribution || {};

  return (
    <div className="an4-root">
      <div className="an4-header">
        <div>
          <p className="an4-eyebrow">Analytics</p>
          <h1 className="an4-title">Fund Analytics</h1>
          <p className="an4-sub">Performance and attribution across analyst, sector, and pitch.</p>
        </div>
      </div>

      <div className="an4-stats">
        <div className="an4-stat">
          <div className="an4-stat-lbl">Fund value</div>
          <div className="an4-stat-val">{money(perf.total_value)}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Return</div>
          <div className={`an4-stat-val ${(perf.return_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct(perf.return_pct)}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Benchmark</div>
          <div className="an4-stat-val">{pct(perf.benchmark_return_pct)}</div>
        </div>
        <div className="an4-stat">
          <div className="an4-stat-lbl">Alpha</div>
          <div className={`an4-stat-val ${(perf.alpha_pct ?? 0) >= 0 ? 'an4-pos' : 'an4-neg'}`}>{pct(perf.alpha_pct)}</div>
        </div>
      </div>

      <div className="an4-panels">
        <div className="an4-panel">
          <h3 className="an4-panel-title">Attribution by Analyst</h3>
          <AttributionByAnalyst data={attr.byAnalyst || []} onSelect={setScorecardFor} />
        </div>
        <div className="an4-panel">
          <h3 className="an4-panel-title">Attribution by Sector</h3>
          <AttributionBySector data={attr.bySector || []} />
        </div>
        <div className="an4-panel an4-panel--wide">
          <h3 className="an4-panel-title">Pitch Outcomes</h3>
          <AttributionByPitch data={attr.byPitch || []} />
        </div>
      </div>

      {scorecardFor && (
        <div
          className="ac3-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'var(--bg-overlay, rgba(0,0,0,0.6))',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '5vh 1rem',
            overflowY: 'auto',
          }}
          onClick={(e) => e.target === e.currentTarget && setScorecardFor(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 640,
              background: 'var(--bg-secondary, #0d1218)',
              border: '1px solid var(--border-primary)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
              <button type="button" className="an4-btn" onClick={() => setScorecardFor(null)}>
                Close
              </button>
            </div>
            <AnalystScorecard memberId={scorecardFor} embedded />
          </div>
        </div>
      )}
    </div>
  );
}
