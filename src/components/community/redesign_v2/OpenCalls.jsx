'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDirection } from '@/lib/creator-calls';
import { CreatorBadge } from './CreatorBadge';

/**
 * Community sidebar rail of open creator calls (prediction challenges).
 * A discovery surface that drives members to creators' track records.
 */
export function OpenCalls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/community/creator-calls')
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((d) => {
        if (active) setCalls(d.calls || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!loading && calls.length === 0) return null;

  return (
    <div className="ez-card ledger-card">
      <div className="cardhdr" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="bi bi-bullseye" style={{ fontSize: 14, color: 'var(--emerald)' }} />
        <span>Open creator calls</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>
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
          {calls.map((c) => {
            const dir = getDirection(c.direction);
            const creator = c.creator || {};
            const href = `/profile/${creator.username || c.creator_id}`;
            return (
              <li
                key={c.id}
                style={{
                  padding: 10,
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>
                    ${c.ticker}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      color: dir.color,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <i className={`bi ${dir.icon}`} /> {dir.label}
                  </span>
                  {c.target_price != null && (
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                      → ${Number(c.target_price).toFixed(2)}
                    </span>
                  )}
                </div>

                {c.thesis && (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 11.5,
                      lineHeight: 1.4,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {c.thesis.slice(0, 110)}
                    {c.thesis.length > 110 ? '…' : ''}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Link
                    href={href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      textDecoration: 'none',
                      color: 'inherit',
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {creator.display_name || 'Creator'}
                    </span>
                    {creator.creator_tier && (
                      <CreatorBadge tierKey={creator.creator_tier} showLabel={false} size={11} />
                    )}
                  </Link>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)' }}>
                    <i className="bi bi-hand-thumbs-up" /> {c.back_count || 0} ·{' '}
                    <i className="bi bi-hand-thumbs-down" /> {c.fade_count || 0}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
