'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatRelativeTime, getInitials } from '@/lib/community-utils';

/** Max cells in the Learning Center 3×3 partner grid. */
export const PARTNER_CREATOR_GRID_MAX = 9;

export const PARTNER_CREATOR_FALLBACK_ITEMS = [
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
  {
    id: 'mock-4',
    name: 'Alex Rivera',
    role: 'Partner',
    avatarUrl: null,
    title: 'Behavioral Biases That Cost Retail Traders Money',
    typeLabel: 'Course',
    durationMinutes: 18,
    topic: 'Risk & Psychology',
    publishedAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-5',
    name: 'Jordan Lee',
    role: 'Creator',
    avatarUrl: null,
    title: 'Prediction Markets: Reading Odds Like a Book',
    typeLabel: 'Course',
    durationMinutes: 22,
    topic: 'Betting Markets',
    publishedAt: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-6',
    name: 'Priya Shah',
    role: 'Partner',
    avatarUrl: null,
    title: 'Dividend Growth Screening for Long-Term Income',
    typeLabel: 'Course',
    durationMinutes: 28,
    topic: 'Stocks & Investing',
    publishedAt: new Date(Date.now() - 8 * 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-7',
    name: 'Marcus Webb',
    role: 'Creator',
    avatarUrl: null,
    title: 'Fed Dot Plots & Rates: What Actually Moves Stocks',
    typeLabel: 'Course',
    durationMinutes: 24,
    topic: 'Stocks & Investing',
    publishedAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-8',
    name: 'Elena Frost',
    role: 'Partner',
    avatarUrl: null,
    title: 'ESG Data Quality: Separating Signal From Marketing',
    typeLabel: 'Course',
    durationMinutes: 19,
    topic: 'Stocks & Investing',
    publishedAt: new Date(Date.now() - 12 * 86400 * 1000).toISOString(),
  },
  {
    id: 'mock-9',
    name: 'Daniel Okoye',
    role: 'Creator',
    avatarUrl: null,
    title: 'FX Majors: Carry, Sessions, and Macro Catalysts',
    typeLabel: 'Course',
    durationMinutes: 26,
    topic: 'Stocks & Investing',
    publishedAt: new Date(Date.now() - 14 * 86400 * 1000).toISOString(),
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
      const list = json.items?.length
        ? json.items.slice(0, PARTNER_CREATOR_GRID_MAX)
        : PARTNER_CREATOR_FALLBACK_ITEMS;
      setInternalItems(list);
    } catch {
      setInternalItems(PARTNER_CREATOR_FALLBACK_ITEMS);
    }
  }, []);

  useEffect(() => {
    if (controlled) return;
    load();
  }, [controlled, load]);

  const rawItems = controlled ? itemsProp : internalItems;

  const displayItems = useMemo(
    () => (rawItems || []).slice(0, PARTNER_CREATOR_GRID_MAX),
    [rawItems],
  );

  return (
    <section className="db-card lc3-partner-section" aria-label="Partner and creator content">
      <div className="lc3-partner-section-header">
        <h3 className="lc3-partner-section-title">From Partners &amp; Creators</h3>
        <Link href="/ezana-echo" className="lc3-partner-section-link">
          View All
        </Link>
      </div>
      <div className="lc3-partner-grid">
        {displayItems.map((row) => {
          const isCreator = row.role === 'Creator';
          return (
            <article key={row.id} className="lc3-partner-cell">
              <div className="lc3-partner-cell-top">
                <div
                  className="lc3-partner-cell-avatar"
                  style={{
                    background: isCreator ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                    border: `1px solid ${isCreator ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}`,
                    color: isCreator ? '#f59e0b' : '#10b981',
                  }}
                >
                  {row.avatarUrl ? (
                    <img src={row.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(row.name)
                  )}
                </div>
                <div className="lc3-partner-cell-head">
                  <p className="lc3-partner-cell-name">{row.name}</p>
                  <span
                    className="lc3-partner-cell-role"
                    style={{
                      background: isCreator ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: isCreator ? '#f59e0b' : '#10b981',
                    }}
                  >
                    {String(row.role || '').toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="lc3-partner-cell-title">&quot;{row.title}&quot;</p>
              <p className="lc3-partner-cell-meta">
                {row.typeLabel} · {row.durationMinutes} min · {row.topic} ·{' '}
                <span className="lc3-partner-cell-time">{formatRelativeTime(row.publishedAt) || 'recently'}</span>
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
