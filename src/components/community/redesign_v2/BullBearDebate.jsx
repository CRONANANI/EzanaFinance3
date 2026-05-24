'use client';

import { Avatar } from './Atoms';

function TakeCard({ side, take, tone }) {
  const author = take?.author || {};
  return (
    <div
      className={`evo-bull-bear-card evo-bull-bear-card--${side}`}
      style={{
        flex: 1,
        padding: 16,
        background: 'var(--bg-tertiary)',
        border: `1px solid ${tone === 'bull' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
        borderRadius: 12,
        borderTopWidth: 3,
        borderTopColor: tone === 'bull' ? 'var(--positive)' : 'var(--negative)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: tone === 'bull' ? 'var(--positive)' : 'var(--negative)',
          marginBottom: 10,
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
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {take.content || take.summary || take.text}
          </p>
          {take.conviction != null && (
            <div
              className="ez-mono"
              style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}
            >
              Conviction: {take.conviction}%
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          Bull vs Bear — <span className="ez-mono">${data.ticker}</span>
        </h3>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <TakeCard side="bull" take={data.bull} tone="bull" />
        <TakeCard side="bear" take={data.bear} tone="bear" />
      </div>
    </div>
  );
}
