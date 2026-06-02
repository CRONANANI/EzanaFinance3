'use client';

import { Avatar } from './Atoms';

function TakeCard({ side, take, tone }) {
  const author = take?.author || {};
  return (
    <div
      className={`ledger-card evo-bull-bear-card evo-bull-bear-card--${side}`}
      style={{
        flex: 1,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-primary)',
        borderRadius: 12,
        borderTopWidth: 3,
        borderTopColor: tone === 'bull' ? 'var(--emerald-ink)' : 'var(--negative)',
      }}
    >
      <div
        className="cardhdr"
        style={{
          color: tone === 'bull' ? 'var(--emerald-ink)' : 'var(--negative)',
        }}
      >
        {side === 'bull' ? 'Bull case' : 'Bear case'}
      </div>
      {take ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Avatar
              author={{
                display_name: author.display_name || author.name || 'Member',
                username: author.username,
                avatar_url: author.avatar_url,
                initials: author.initials,
                gradient: author.gradient,
              }}
              size={28}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {author.display_name || author.name || 'Member'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>
            {take.content || take.summary || take.text}
          </p>
          {take.conviction != null && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-faint)' }}>
              Conviction:{' '}
              <span className="ez-mono" style={{ color: 'var(--text-muted)' }}>
                {take.conviction}%
              </span>
            </div>
          )}
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
          No take yet for this side.
        </p>
      )}
    </div>
  );
}

export function BullBearDebate({ data }) {
  if (!data?.ticker) return null;

  return (
    <div className="evo-bull-bear" style={{ marginBottom: 16 }}>
      <div className="cardhdr" style={{ marginBottom: 10 }}>
        Bull vs Bear — <span className="ez-mono">${data.ticker}</span>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TakeCard side="bull" take={data.bull} tone="bull" />
        <TakeCard side="bear" take={data.bear} tone="bear" />
      </div>
    </div>
  );
}
