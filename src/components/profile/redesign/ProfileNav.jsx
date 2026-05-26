'use client';

import Link from 'next/link';
import { page, shape, type as typeTokens } from './profile-design-tokens';

export function ProfileNav({ userName, onShare, onFollow, isFollowing, showActions = true }) {
  return (
    <header
      style={{
        background: page.surface,
        padding: '12px 28px',
        borderBottom: `1px solid ${page.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <nav
        aria-label="Breadcrumb"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontFamily: typeTokens.sans,
        }}
      >
        <Link
          href="/community"
          style={{ color: page.inkMuted, fontWeight: 500, textDecoration: 'none' }}
        >
          Community
        </Link>
        <span style={{ color: page.borderStrong }}>/</span>
        <Link
          href="/community"
          style={{ color: page.inkSoft, fontWeight: 500, textDecoration: 'none' }}
        >
          Traders
        </Link>
        <span style={{ color: page.borderStrong }}>/</span>
        <span style={{ color: page.ink, fontWeight: 600 }}>{userName}</span>
      </nav>

      {showActions && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onShare}
            style={{
              background: page.surface,
              border: `1px solid ${page.border}`,
              borderRadius: shape.radius.button,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: page.inkSoft,
              fontFamily: typeTokens.sans,
              cursor: 'pointer',
              boxShadow: shape.shadow.card,
            }}
          >
            Share
          </button>
          <button
            type="button"
            onClick={onFollow}
            style={{
              background: page.ink,
              border: 'none',
              borderRadius: shape.radius.button,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              fontFamily: typeTokens.sans,
              cursor: 'pointer',
              boxShadow: shape.shadow.button,
            }}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      )}
    </header>
  );
}
