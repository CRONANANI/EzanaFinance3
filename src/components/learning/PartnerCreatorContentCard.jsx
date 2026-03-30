'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/community-utils';

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

function initialsFromName(name) {
  const s = (name || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function PartnerCreatorContentCard() {
  const [items, setItems] = useState([]);
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/learning/partner-content', { cache: 'no-store' });
      const json = await res.json();
      const list = json.items?.length ? json.items : FALLBACK_ITEMS;
      setItems(list);
    } catch {
      setItems(FALLBACK_ITEMS);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="lc2-partner-card db-card" aria-label="Partner and creator content">
      <div className="lc2-sec-head">
        <h2 className="lc2-sec-title lc2-sec-title-with-bi">
          <i className="bi bi-fire" aria-hidden />
          From Partners &amp; Creators
        </h2>
      </div>
      <div className="lc2-partner-list">
        {items.map((row) => (
          <div key={row.id} className="lc2-partner-row">
            <div className="lc2-partner-avatar">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt="" />
              ) : (
                <span>{initialsFromName(row.name)}</span>
              )}
            </div>
            <div className="lc2-partner-body">
              <div className="lc2-partner-meta">
                <span className="lc2-partner-name">{row.name}</span>
                <span className="lc2-partner-role">({row.role})</span>
                <span className="lc2-partner-time">
                  Published {formatRelativeTime(row.publishedAt) || 'recently'}
                </span>
              </div>
              <div className="lc2-partner-title">&quot;{row.title}&quot;</div>
              <div className="lc2-partner-foot">
                {row.typeLabel} · {row.durationMinutes} min · {row.topic}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="lc2-partner-footer">
        <Link href="/ezana-echo" className="lc2-sec-link">
          View All Partner Content →
        </Link>
      </div>
    </section>
  );
}
