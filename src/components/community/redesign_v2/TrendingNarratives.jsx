'use client';

export function TrendingNarratives({ narratives = [] }) {
  if (!narratives.length) {
    return (
      <div className="ez-card ledger-card evo-narratives" style={{ marginBottom: 14 }}>
        <div className="cardhdr">Trending narratives</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>No narratives yet.</p>
      </div>
    );
  }

  return (
    <div className="ez-card ledger-card evo-narratives" style={{ marginBottom: 14 }}>
      <div className="cardhdr">Trending narratives</div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {narratives.map((n, i) => {
          const strength = n.strength ?? n.score ?? 0;
          return (
            <li key={n.id || i}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {n.title || n.label || n.name}
                </span>
                <span
                  className="ez-mono"
                  style={{ fontSize: 11, color: 'var(--emerald-ink)', fontWeight: 700 }}
                >
                  {strength}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: 'var(--line-soft)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="evo-narrative-strength-bar"
                  style={{
                    height: '100%',
                    width: `${Math.min(100, strength)}%`,
                    background: 'var(--emerald-ink)',
                    borderRadius: 999,
                  }}
                />
              </div>
              {n.summary && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  {n.summary}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
