'use client';

/**
 * Lobbying → Legislation — connects lobbying disclosure activity to what is
 * actually moving in Congress by surfacing the sectors with the strongest
 * Legislative Momentum (/api/congress/momentum). Self-contained inline styles
 * so it renders correctly inside the Inside-the-Capitol dashboard (which does
 * not load the marketing stylesheet).
 *
 * Informational only — "sectors where legislative activity is rising", never a
 * claim that lobbying caused an outcome and never investment advice. Honest
 * empty state; no mock data.
 */
import { useEffect, useState } from 'react';

const MUTED = '#8b949e';

function tone(ratio) {
  return ratio >= 0.66 ? '#22c55e' : ratio >= 0.33 ? '#f59e0b' : '#8b949e';
}

export function LobbyingToLegislationCard({ limit = 5 }) {
  const [state, setState] = useState({ loading: true, sectors: [] });

  useEffect(() => {
    let alive = true;
    fetch('/api/congress/momentum?window=90')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setState({ loading: false, sectors: Array.isArray(d?.sectors) ? d.sectors : [] });
      })
      .catch(() => alive && setState({ loading: false, sectors: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const { loading, sectors } = state;
  const top = sectors.slice(0, limit);
  const max = sectors.length ? sectors[0].score : 0;

  return (
    <div className="itc-card">
      <div className="itc-hdr">
        <h3>LOBBYING → LEGISLATION</h3>
      </div>
      <div className="itc-body itc-body-pad">
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: MUTED, lineHeight: 1.5 }}>
          Sectors where legislation is advancing fastest in Congress — context for where lobbying
          dollars are meeting live policy. Informational only, not investment advice.
        </p>
        {loading ? (
          <div
            style={{ padding: '1.25rem', textAlign: 'center', color: MUTED, fontSize: '0.82rem' }}
          >
            Loading legislative momentum…
          </div>
        ) : top.length === 0 ? (
          <div
            style={{ padding: '1.25rem', textAlign: 'center', color: MUTED, fontSize: '0.82rem' }}
          >
            No legislative momentum to show yet — sectors appear here as tracked bills advance.
          </div>
        ) : (
          top.map((s) => {
            const ratio = max > 0 ? Math.max(0, Math.min(1, s.score / max)) : 0;
            const c = tone(ratio);
            return (
              <div
                key={s.sector}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.5rem 0',
                  borderTop: '1px solid rgba(148,163,184,0.14)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e6edf3' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: MUTED }}>
                    {s.etf ? `${s.etf} · ` : ''}
                    {s.billCount} {s.billCount === 1 ? 'bill' : 'bills'} advancing
                  </div>
                </div>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 0 auto' }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 54,
                      height: 5,
                      borderRadius: 999,
                      background: 'rgba(148,163,184,0.18)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(ratio * 100)}%`,
                        height: '100%',
                        background: c,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: c,
                      fontVariantNumeric: 'tabular-nums',
                      minWidth: '2.5ch',
                      textAlign: 'right',
                    }}
                  >
                    {s.score.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
