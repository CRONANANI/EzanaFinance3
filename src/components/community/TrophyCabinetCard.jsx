'use client';

const TROPHIES = [
  { icon: '🥇', name: 'First Return', earned: true, color: '#d4a853' },
  { icon: '📈', name: '10% Month', earned: true, color: '#10b981' },
  { icon: '🏆', name: '25% Year', earned: false, color: '#6b7280' },
  { icon: '✍️', name: 'First Post', earned: true, color: '#3b82f6' },
  { icon: '🦋', name: 'Social Butterfly', earned: false, color: '#6b7280' },
  { icon: '⚡', name: 'Top Trader', earned: false, color: '#6b7280' },
  { icon: '🌐', name: 'Diversified', earned: true, color: '#8b5cf6' },
  { icon: '👑', name: 'Community Legend', earned: false, color: '#6b7280' },
  { icon: '💎', name: 'Consistent Earner', earned: false, color: '#6b7280' },
];

export function TrophyCabinetCard() {
  return (
    <div className="db-card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 800, color: 'var(--home-heading, #111827)' }}>
          🏆 Trophy Cabinet
        </h3>
        <span style={{ fontSize: '0.625rem', color: 'var(--home-muted, #6b7280)' }}>Your achievements</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        {TROPHIES.map((trophy) => (
          <div
            key={trophy.name}
            title={trophy.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px',
              borderRadius: '8px',
              border: `1px solid ${trophy.earned ? `${trophy.color}40` : 'rgba(107,114,128,0.12)'}`,
              background: trophy.earned ? `${trophy.color}10` : 'rgba(107,114,128,0.04)',
              opacity: trophy.earned ? 1 : 0.45,
              cursor: trophy.earned ? 'pointer' : 'default',
              minHeight: '58px',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1, filter: trophy.earned ? 'none' : 'grayscale(1)' }}>
              {trophy.icon}
            </span>
            <span
              style={{
                fontSize: '0.45rem',
                fontWeight: 600,
                color: trophy.earned ? 'var(--home-heading, #111827)' : 'var(--home-muted, #6b7280)',
                textAlign: 'center',
                lineHeight: 1.2,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {trophy.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
