'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ezana.evo.briefing.dismissed';

export function EveningBriefing({ pulse, postCount, onDismiss }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      setDismissed(stored === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const sentiment = pulse?.netSentiment ?? 0;
  const tone = sentiment > 20 ? 'bullish' : sentiment < -10 ? 'cautious' : 'mixed';

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className="ez-card evo-evening-briefing"
      style={{
        padding: 16,
        marginBottom: 16,
        background:
          'linear-gradient(135deg, var(--emerald-bg-subtle) 0%, var(--surface-card) 100%)',
        borderColor: 'var(--emerald-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--emerald)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 6,
            }}
          >
            Evening briefing
          </div>
          <h3
            style={{
              margin: '0 0 6px',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Markets feel {tone} today
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Community sentiment is at{' '}
            <span className="ez-mono" style={{ fontWeight: 700 }}>
              {sentiment > 0 ? '+' : ''}
              {sentiment}
            </span>
            . You have{' '}
            <span className="ez-mono" style={{ fontWeight: 700 }}>
              {postCount}
            </span>{' '}
            posts in your current lens — stake conviction on the strongest takes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="ez-btn ez-btn--ghost"
          style={{ padding: '4px 8px', fontSize: 12, flexShrink: 0 }}
          aria-label="Dismiss briefing"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
    </div>
  );
}
