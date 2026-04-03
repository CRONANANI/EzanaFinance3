'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRelativeTime, getInitials } from '@/lib/community-utils';

const FALLBACK_ITEMS = [
  {
    id: 'mock-1',
    name: 'Sarah Chen',
    role: 'Creator',
    avatarUrl: null,
    title: 'Advanced Options Strategies for Volatile Markets',
    typeLabel: 'Course',
    durationMinutes: 25,
    topic: 'Options Trading',
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    name: 'Ezana Research',
    role: 'Partner',
    avatarUrl: null,
    title: 'Crypto Portfolio Allocation Framework 2026',
    typeLabel: 'Course',
    durationMinutes: 30,
    topic: 'Crypto & Digital Assets',
    publishedAt: new Date(Date.now() - 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-3',
    name: 'Mike Torres',
    role: 'Creator',
    avatarUrl: null,
    title: 'Reading OPEC Reports Like a Pro',
    typeLabel: 'Course',
    durationMinutes: 20,
    topic: 'Commodities',
    publishedAt: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
  },
];

/** When `items` is omitted, fetches from `/api/learning/partner-content`. */
export function PartnerCreatorContentCard({ items: itemsProp }) {
  const [internalItems, setInternalItems] = useState([]);
  const controlled = itemsProp !== undefined;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/partner-content', { cache: 'no-store' });
      const json = await res.json();
      const list = json.items?.length ? json.items : FALLBACK_ITEMS;
      setInternalItems(list);
    } catch {
      setInternalItems(FALLBACK_ITEMS);
    }
  }, []);

  useEffect(() => {
    if (controlled) return;
    load();
  }, [controlled, load]);

  const items = controlled ? itemsProp : internalItems;

  return (
    <section className="db-card lc3-partner-section" aria-label="Partner and creator content" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.85rem', borderBottom: '1px solid rgba(16,185,129,0.05)', marginBottom: '.85rem' }}>
        <h3 style={{ fontSize: '.9375rem', fontWeight: 800, margin: 0, color: '#f0f6fc' }}>From Partners &amp; Creators</h3>
        <Link href="/ezana-echo" style={{ color: '#10b981', fontSize: '.6875rem', fontWeight: 600, textDecoration: 'none' }}>
          View All
        </Link>
      </div>
      <div>
        {items.map((row) => {
          const isCreator = row.role === 'Creator';
          return (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.75rem',
                padding: '.65rem .85rem',
                borderRadius: 10,
                background: 'rgba(16,185,129,0.03)',
                border: '1px solid rgba(16,185,129,0.05)',
                marginBottom: '.65rem',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: isCreator ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${isCreator ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCreator ? '#f59e0b' : '#10b981',
                  fontSize: '.7rem',
                  fontWeight: 700,
                }}
              >
                {row.avatarUrl ? (
                  <img src={row.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(row.name)
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '.8125rem', margin: 0 }}>
                  <span style={{ fontWeight: 700, color: '#f0f6fc' }}>{row.name}</span>{' '}
                  <span
                    style={{
                      padding: '.1rem .35rem',
                      borderRadius: 4,
                      fontSize: '.55rem',
                      fontWeight: 700,
                      background: isCreator ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: isCreator ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {String(row.role || '').toUpperCase()}
                  </span>{' '}
                  <span style={{ color: '#6b7280', fontSize: '.75rem' }}>published a new course</span>
                </p>
                <p style={{ color: '#e2e8f0', fontSize: '.8125rem', fontWeight: 600, marginTop: '.2rem' }}>
                  &quot;{row.title}&quot;
                </p>
                <p style={{ color: '#6b7280', fontSize: '.625rem', marginTop: '.15rem' }}>
                  {row.typeLabel} · {row.durationMinutes} min · {row.topic} · {formatRelativeTime(row.publishedAt) || 'recently'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
