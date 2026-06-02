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
    <div className="briefing-strip evo-evening-briefing">
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div className="briefing-icon" aria-hidden>
          <i className="bi bi-lightbulb" style={{ fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow">Evening briefing</div>
          <h4
            style={{
              margin: '4px 0 6px',
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Markets feel {tone} today
          </h4>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            Community sentiment is at{' '}
            <span className="ez-mono" style={{ fontWeight: 700, color: 'var(--emerald-ink)' }}>
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
