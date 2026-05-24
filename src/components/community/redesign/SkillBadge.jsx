'use client';

export function SkillBadge({ tier }) {
  const colors = {
    Oracle: { bg: 'var(--emerald-bg)', border: 'var(--emerald-border)', color: 'var(--emerald)' },
    Master: { bg: 'rgba(212,168,83,0.10)', border: 'var(--gold-border)', color: 'var(--gold)' },
    Journeyman: { bg: 'var(--info-bg)', border: 'rgba(59,130,246,0.25)', color: 'var(--info)' },
    Apprentice: {
      bg: 'rgba(167,139,250,0.10)',
      border: 'rgba(167,139,250,0.25)',
      color: 'var(--purple)',
    },
    Novice: { bg: 'transparent', border: 'var(--border-input)', color: 'var(--text-muted)' },
  };
  const c = colors[tier] || colors.Novice;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 7px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.color,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {tier}
    </span>
  );
}
