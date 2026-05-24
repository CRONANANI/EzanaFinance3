'use client';

const DEFAULT_PULSE = {
  netSentiment: 24,
  postsLastHour: 38,
  hottest: 'NVDA',
  hottestMentions: 142,
  sectors: [
    { name: 'Tech', sentiment: 32 },
    { name: 'Energy', sentiment: 8 },
    { name: 'Finance', sentiment: -4 },
    { name: 'Health', sentiment: 12 },
  ],
};

export function PulseBar({ compact = false, pulse = DEFAULT_PULSE }) {
  const p = pulse || DEFAULT_PULSE;
  const sentColor =
    p.netSentiment > 30
      ? 'var(--positive)'
      : p.netSentiment < -10
        ? 'var(--negative)'
        : 'var(--warning)';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: compact ? '10px 16px' : '14px 20px',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: 'var(--emerald)',
            boxShadow: '0 0 8px var(--emerald-glow)',
            animation: 'ez-pulse-dot 1.8s ease-in-out infinite',
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--emerald)',
            textTransform: 'uppercase',
          }}
        >
          Live Pulse
        </span>
      </div>
      <style>{`@keyframes ez-pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Sentiment
        </span>
        <span className="ez-mono" style={{ fontSize: 16, fontWeight: 700, color: sentColor }}>
          {p.netSentiment > 0 ? '+' : ''}
          {p.netSentiment}
        </span>
        <div
          style={{
            width: 100,
            height: 6,
            background: 'var(--bg-tertiary)',
            borderRadius: 999,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: `${Math.abs(p.netSentiment) / 2 + 5}%`,
              background: sentColor,
              transform: p.netSentiment >= 0 ? 'translateX(0)' : 'translateX(-100%)',
              borderRadius: 999,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -1,
              bottom: -1,
              width: 1,
              background: 'var(--text-faint)',
            }}
          />
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-secondary)' }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Posts/hr
        </span>
        <span
          className="ez-mono"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}
        >
          {p.postsLastHour}
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--border-secondary)' }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Hottest
        </span>
        <span
          className="ez-mono"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--emerald)' }}
        >
          ${p.hottest}
        </span>
        <span className="ez-mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
          {p.hottestMentions} mentions
        </span>
      </div>

      {!compact && p.sectors?.length > 0 && (
        <>
          <div style={{ width: 1, height: 24, background: 'var(--border-secondary)' }} />
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, overflow: 'hidden' }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}
            >
              Sectors
            </span>
            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
              {p.sectors.map((s) => {
                const c =
                  s.sentiment > 20
                    ? 'var(--positive)'
                    : s.sentiment < 0
                      ? 'var(--negative)'
                      : 'var(--warning)';
                return (
                  <div
                    key={s.name}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'var(--bg-tertiary)',
                      border: `1px solid ${c}`,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.name}
                    </div>
                    <div className="ez-mono" style={{ fontSize: 10, fontWeight: 700, color: c }}>
                      {s.sentiment > 0 ? '+' : ''}
                      {s.sentiment}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
