'use client';

export function KpiCard({ icon, label, value, sub, tone = 'emerald', chevron = 'right', onClick }) {
  const tones = {
    emerald: { bg: 'var(--emerald-bg)', color: 'var(--emerald)' },
    positive: { bg: 'var(--positive-bg)', color: 'var(--positive)' },
    info: { bg: 'var(--info-bg)', color: 'var(--info)' },
    gold: { bg: 'var(--gold-bg)', color: 'var(--gold)' },
  };
  const t = tones[tone] || tones.emerald;
  return (
    <button
      type="button"
      onClick={onClick}
      className="ez-card"
      style={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--surface-card)',
        color: 'inherit',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: t.bg,
          color: t.color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <i className={`bi ${icon}`} style={{ fontSize: 16 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-faint)',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      </div>
      <i
        className={`bi ${chevron === 'down' ? 'bi-chevron-down' : 'bi-chevron-right'}`}
        style={{ fontSize: 12, color: 'var(--text-faint)' }}
      />
    </button>
  );
}
