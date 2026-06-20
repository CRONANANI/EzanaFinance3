'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from './Atoms';
import { CreatorBadge } from './CreatorBadge';
import { getCreatorTier } from '@/lib/creator-tiers';

function formatType(type) {
  if (!type) return '';
  return String(type)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Discovery rail spotlighting Ezana creators/partners, ranked by standing tier.
 * Lives in the community sidebar so members can find and follow the people
 * publishing articles, courses, and high-conviction takes.
 */
export function FeaturedCreators() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/community/featured-creators')
      .then((r) => (r.ok ? r.json() : { creators: [] }))
      .then((d) => {
        if (active) setCreators(d.creators || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loading && creators.length === 0) return null;

  return (
    <div className="ez-card ledger-card">
      <div className="cardhdr" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="bi bi-patch-check-fill" style={{ fontSize: 14, color: 'var(--emerald)' }} />
        <span>Featured creators</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Loading…</div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {creators.map((c) => {
            const href = `/profile/${c.username || c.id}`;
            const tier = getCreatorTier(c.creator_tier);
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 8,
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'inherit',
                    border: '1px solid var(--border-secondary)',
                  }}
                >
                  <Avatar
                    author={{
                      display_name: c.display_name,
                      username: c.username,
                      avatar_url: c.avatar_url,
                    }}
                    size={36}
                    ring
                    ringColor={tier.ring}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.display_name}
                      </span>
                      <CreatorBadge tier={tier} showLabel={false} size={12} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {c.followers.toLocaleString()} {c.followers === 1 ? 'follower' : 'followers'}
                      {c.partner_type ? ` · ${formatType(c.partner_type)}` : ''}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
