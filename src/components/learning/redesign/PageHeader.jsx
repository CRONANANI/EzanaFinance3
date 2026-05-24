'use client';

import Link from 'next/link';

export function PageHeader({ user, bookmarkCount = 0, badgeCount = 0, onScrollToBookmarks }) {
  return (
    <header className="lc-page-header">
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        <div className="lc-header-tile" aria-hidden>
          <i className="bi bi-mortarboard" />
        </div>
        <div>
          <div className="lc-eyebrow">Learning Center</div>
          <h1 className="lc-greeting">Hey, {user?.displayName || 'there'} 👋</h1>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          type="button"
          className="lc-btn lc-btn-secondary"
          onClick={onScrollToBookmarks}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <i className="bi bi-bookmark" />
          Saved {bookmarkCount > 0 ? `(${bookmarkCount})` : ''}
        </button>
        <Link href="/learning-center/badges" className="lc-btn lc-btn-secondary">
          <i className="bi bi-award" />
          Badges {badgeCount > 0 ? `(${badgeCount})` : ''}
        </Link>
      </div>
    </header>
  );
}
