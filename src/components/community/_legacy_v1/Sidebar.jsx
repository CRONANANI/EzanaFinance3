'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { formatRelativeTime } from '@/lib/community-utils';

export function SidebarTrendingDiscussions({ discussions = [] }) {
  const toneColor = { emerald: 'var(--emerald)', amber: 'var(--warning)', indigo: 'var(--info)' };
  return (
    <div className="ez-card" style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-fire" style={{ color: 'var(--warning)', fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Trending Discussions
          </span>
        </div>
      </div>
      {discussions.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No discussion threads with activity this week yet.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {discussions.map((d, i) => {
          const color = toneColor[d.tone] || toneColor.emerald;
          return (
            <button
              key={d.id || i}
              type="button"
              style={{
                display: 'flex',
                gap: 10,
                padding: 0,
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 6,
                  background: `color-mix(in oklab, ${color} 12%, transparent)`,
                  color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i className="bi bi-chat-square-quote-fill" style={{ fontSize: 12 }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    lineHeight: 1.35,
                    marginBottom: 3,
                  }}
                >
                  {d.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span>{d.author || '@member'}</span>
                  <span>·</span>
                  <i className="bi bi-chat-dots" style={{ fontSize: 10 }} />
                  <span className="ez-mono">{d.comments ?? 0}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SidebarTrendingTopics({ topics = [] }) {
  const PAGE_SIZE = 5;
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(topics.length / PAGE_SIZE));
  const visible = topics.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);
  const isLastPage = pageIndex >= totalPages - 1;

  return (
    <div className="ez-card" style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-hash" style={{ color: 'var(--info)', fontSize: 14 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Trending Topics
          </span>
        </div>
        {topics.length > PAGE_SIZE && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {pageIndex + 1} / {totalPages}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visible.map((t, i) => (
          <button
            key={t.tag}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              borderRadius: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-faint)',
                fontFamily: 'var(--font-mono)',
                width: 16,
              }}
            >
              {pageIndex * PAGE_SIZE + i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                #{t.tag}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }} className="ez-mono">
                {t.posts} posts
              </div>
            </div>
            {t.trend && (
              <span
                className={t.trend === 'up' ? 'ez-pill ez-pill--pos' : 'ez-pill ez-pill--neg'}
                style={{ padding: '1px 6px', fontSize: 10 }}
              >
                {t.trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </button>
        ))}
      </div>
      {topics.length > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => setPageIndex((p) => (isLastPage ? 0 : p + 1))}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '7px 10px',
            background: 'transparent',
            border: '1px solid var(--border-input)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isLastPage ? 'Show first 5 topics →' : 'Show next 5 topics →'}
        </button>
      )}
    </div>
  );
}

export function SidebarFriendsActivity({ activity = [] }) {
  return (
    <div className="ez-card" style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="bi bi-people-fill" style={{ color: 'var(--emerald)', fontSize: 13 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Friends Activity
          </span>
        </div>
      </div>
      {activity.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recent friend activity.</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activity.map((a, i) => {
          const author = {
            display_name: a.name || 'User',
            username: a.username || '',
            id: a.id,
          };
          const actionColor =
            a.action === 'bought' || a.direction === 'up'
              ? 'var(--positive)'
              : a.action === 'sold' || a.direction === 'down'
                ? 'var(--negative)'
                : 'var(--text-muted)';
          return (
            <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar author={author} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {(a.name || 'User').split(' ')[0]}
                  </strong>{' '}
                  <span style={{ color: actionColor, fontWeight: 600 }}>{a.action}</span>{' '}
                  {a.target && !String(a.target).startsWith('on ') ? (
                    <span className="ez-cashtag">${a.target}</span>
                  ) : (
                    a.target
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }} className="ez-mono">
                  {a.time || formatRelativeTime(a.created_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
