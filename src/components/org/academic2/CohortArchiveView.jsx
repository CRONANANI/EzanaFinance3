'use client';

import './academic.css';

function pct(n) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
}

/** Read-only historical view of an archived cohort's preserved snapshot. */
export function CohortArchiveView({ cohort, onClose }) {
  const snap = cohort?.archived_snapshot || {};
  const fund = snap.fund || {};
  const roster = snap.roster || [];
  const track = snap.pitch_track_record || [];

  return (
    <div className="ac3-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="ac3-modal ac3-root" role="dialog" aria-modal="true" style={{ maxWidth: 640 }}>
        <h2 className="ac3-modal-title">
          {cohort.name} <span className="ac3-pill ac3-pill--archived">archived</span>
        </h2>
        <p className="ac3-sub" style={{ marginTop: '-0.5rem' }}>
          Snapshot taken{' '}
          {cohort.archived_at ? new Date(cohort.archived_at).toLocaleDateString() : '—'}.
        </p>

        <div className="ac3-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', margin: '1rem 0' }}>
          <div className="ac3-card">
            <div className="ac3-meta">Fund value</div>
            <div className="ac3-num ac3-strong" style={{ fontSize: '1.1rem' }}>
              ${Math.round(fund.total_value || 0).toLocaleString()}
            </div>
          </div>
          <div className="ac3-card">
            <div className="ac3-meta">Hit rate</div>
            <div className="ac3-num ac3-strong" style={{ fontSize: '1.1rem' }}>
              {fund.hit_rate == null ? '—' : `${Math.round(fund.hit_rate * 100)}%`}
            </div>
          </div>
          <div className="ac3-card">
            <div className="ac3-meta">Avg alpha</div>
            <div className="ac3-num ac3-strong" style={{ fontSize: '1.1rem' }}>
              {pct(fund.avg_alpha_pct)}
            </div>
          </div>
          <div className="ac3-card">
            <div className="ac3-meta">Positions / pitches</div>
            <div className="ac3-num ac3-strong" style={{ fontSize: '1.1rem' }}>
              {fund.positions ?? 0} / {fund.pitch_count ?? 0}
            </div>
          </div>
        </div>

        <div className="ac3-label">Roster</div>
        <div style={{ marginBottom: '1rem' }}>
          {roster.length === 0 ? (
            <div className="ac3-meta">No roster recorded.</div>
          ) : (
            roster.map((m, i) => (
              <div key={i} className="ac3-row" style={{ padding: '0.5rem 0.7rem' }}>
                <span>
                  <span className="ac3-strong">{m.display_name}</span>{' '}
                  <span className="ac3-meta">· {m.title || (m.role || '').replace('_', ' ')}</span>
                </span>
                {m.graduated && <span className="ac3-pill ac3-pill--archived">graduated</span>}
              </div>
            ))
          )}
        </div>

        <div className="ac3-label">Pitch track record</div>
        <div className="ac3-table-wrap">
          <table className="ac3-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Decision</th>
                <th>Return</th>
                <th>Alpha</th>
              </tr>
            </thead>
            <tbody>
              {track.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ac3-meta">
                    No pitches recorded.
                  </td>
                </tr>
              ) : (
                track.map((t, i) => (
                  <tr key={i}>
                    <td className="ac3-num">{t.ticker}</td>
                    <td style={{ textTransform: 'capitalize' }}>{t.decision || '—'}</td>
                    <td className={`ac3-num ${(t.return_pct ?? 0) >= 0 ? 'ac3-pos' : 'ac3-neg'}`}>
                      {pct(t.return_pct)}
                    </td>
                    <td className={`ac3-num ${(t.alpha_pct ?? 0) >= 0 ? 'ac3-pos' : 'ac3-neg'}`}>
                      {pct(t.alpha_pct)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ac3-modal-actions">
          <button type="button" className="ac3-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
