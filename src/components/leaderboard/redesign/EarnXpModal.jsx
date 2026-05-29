'use client';

import { useEloTheme } from './EloThemeContext';

const XP_ACTIVITIES = [
  { activity: 'Complete a Learning Center course', points: '+150 ELO' },
  { activity: 'Pass a course quiz on first attempt', points: '+75 ELO' },
  { activity: 'Daily login streak (per day)', points: '+25 ELO' },
  { activity: 'Finish all daily quests', points: '+50 ELO' },
  { activity: 'Post quality analysis in Community', points: '+30 ELO' },
  { activity: 'Win a seasonal competition (top 3)', points: '+200–500 ELO' },
  { activity: '30-day streak multiplier bonus', points: '1.5× awards' },
];

export function EarnXpModal({ open, onClose }) {
  const { page, brand } = useEloTheme();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="earn-xp-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: page.surface,
          border: `1px solid ${page.border}`,
          borderRadius: 12,
          padding: 24,
          maxWidth: 440,
          width: '100%',
          fontFamily: 'var(--font-sans)',
          boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.4))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 id="earn-xp-title" style={{ margin: 0, fontSize: 18, color: page.ink }}>
            How to earn ELO
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              lineHeight: 1,
              color: page.inkMuted,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {XP_ACTIVITIES.map((row) => (
            <li
              key={row.activity}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px solid ${page.border}`,
                fontSize: 14,
                color: page.inkSoft,
              }}
            >
              <span>{row.activity}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600,
                  color: brand.base,
                  whiteSpace: 'nowrap',
                }}
              >
                {row.points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
