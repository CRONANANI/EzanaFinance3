'use client';

import Link from 'next/link';
import { Avatar, VerifiedTick } from './Avatar';

export function KpiModal({ type, onClose, topPerformer, suggestedUsers = [] }) {
  const titles = {
    'top-performer': 'Top Performer This Week',
    'sector-momentum': 'Sector Momentum',
    'investors-to-follow': 'Investors to Follow',
  };
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        zIndex: 100,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="ez-card"
        style={{
          width: 560,
          maxWidth: '90%',
          background: 'var(--surface-elevated)',
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {titles[type]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            <i className="bi bi-x" />
          </button>
        </div>

        {type === 'top-performer' && <TopPerformerModalBody performer={topPerformer} />}
        {type === 'sector-momentum' && <SectorMomentumModalBody />}
        {type === 'investors-to-follow' && (
          <InvestorsToFollowModalBody suggestedUsers={suggestedUsers} />
        )}
      </div>
    </div>
  );
}

function TopPerformerModalBody({ performer }) {
  if (!performer) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        No leaderboard data available yet.
      </div>
    );
  }
  const author = {
    id: performer.id,
    display_name: performer.name || 'Member',
    username: performer.username || '',
  };
  const ret = performer.return ?? 0;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-secondary)',
        }}
      >
        <Avatar author={author} size={56} ring />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {performer.name}
            </span>
            <VerifiedTick />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            @{performer.username || 'member'} · Rank #{performer.rank ?? 1}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            7d return
          </div>
          <div
            className="ez-mono"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: ret >= 0 ? 'var(--positive)' : 'var(--negative)',
            }}
          >
            {ret >= 0 ? '+' : ''}
            {ret}%
          </div>
        </div>
      </div>
      {performer.id && (
        <Link
          href={`/community/profile/${performer.id}`}
          className="ez-btn ez-btn--primary"
          style={{
            width: '100%',
            display: 'inline-flex',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <i className="bi bi-arrow-right" style={{ fontSize: 13 }} />
          View profile
        </Link>
      )}
    </div>
  );
}

function SectorMomentumModalBody() {
  const sectors = [
    { name: 'Technology', return: 4.2, top: ['Top investors'] },
    { name: 'Energy', return: 2.8, top: ['Community leaders'] },
    { name: 'Financials', return: -0.7, top: ['Value investors'] },
    { name: 'Healthcare', return: 1.4, top: ['Growth investors'] },
    { name: 'Consumer Disc.', return: -1.2, top: ['Retail traders'] },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sectors.map((s) => (
        <div
          key={s.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: 12,
            background: 'var(--bg-tertiary)',
            borderRadius: 8,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {s.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Top: {s.top.join(', ')}
            </div>
          </div>
          <span
            className={s.return >= 0 ? 'ez-pill ez-pill--pos' : 'ez-pill ez-pill--neg'}
            style={{ fontSize: 12, padding: '3px 8px' }}
          >
            {s.return >= 0 ? '+' : ''}
            {s.return}%
          </span>
        </div>
      ))}
    </div>
  );
}

function InvestorsToFollowModalBody({ suggestedUsers }) {
  if (!suggestedUsers.length) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No suggested investors yet.</div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {suggestedUsers.slice(0, 8).map((s) => {
        const author = {
          id: s.id,
          display_name: s.name || 'Member',
          username: s.username || '',
        };
        const ret = s.return ?? 0;
        return (
          <div
            key={s.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
            }}
          >
            <Avatar author={author} size={42} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {s.name}
                </span>
                <VerifiedTick size={12} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
                Rank #{s.rank} · {s.trades ?? 0} trades
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                className="ez-mono"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: ret >= 0 ? 'var(--positive)' : 'var(--negative)',
                }}
              >
                {ret >= 0 ? '+' : ''}
                {ret}%
              </div>
              <Link
                href={`/community/profile/${s.id}`}
                className="ez-btn ez-btn--primary"
                style={{
                  padding: '4px 12px',
                  fontSize: 11,
                  marginTop: 4,
                  display: 'inline-block',
                  textDecoration: 'none',
                }}
              >
                View
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
