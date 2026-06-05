'use client';

import Link from 'next/link';
import { Avatar } from './Atoms';

export function LegendaryTakes({ takes = [] }) {
  if (!takes.length) return null;

  return (
    <div
      className="ez-card ledger-card evo-legendary-takes"
      style={{
        borderColor: 'var(--gold-border)',
        boxShadow: '0 0 0 1px var(--gold-border)',
      }}
    >
      <div
        className="cardhdr"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--gold)',
        }}
      >
        <i className="bi bi-stars" style={{ fontSize: 14 }} />
        <span>Legendary takes</span>
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {takes.map((take, i) => {
          const author = take.author || take.user || {};
          const profileHref = author.username
            ? `/community/profile/${author.username}`
            : author.id
              ? `/community/profile/${author.id}`
              : null;
          const inner = (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Avatar
                  author={{
                    display_name: author.display_name || author.name || 'Legend',
                    username: author.username,
                    avatar_url: author.avatar_url,
                  }}
                  size={24}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {author.display_name || author.name || 'Legend'}
                </span>
                {take.ticker && (
                  <span
                    className="ez-pill ez-pill--gold"
                    style={{ padding: '1px 6px', fontSize: 9 }}
                  >
                    <span className="ez-mono">${take.ticker}</span>
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: 'var(--text-muted)',
                }}
              >
                {take.content || take.summary || take.take}
              </p>
            </>
          );

          if (i === 0 && profileHref) {
            return (
              <li key={take.id || take.post_id || i}>
                <Link
                  href={profileHref}
                  data-task-target="legendary-investor-card"
                  style={{
                    display: 'block',
                    padding: 12,
                    background: 'var(--gold-bg)',
                    border: '1px solid var(--gold-border)',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {inner}
                </Link>
              </li>
            );
          }

          return (
            <li
              key={take.id || take.post_id || i}
              style={{
                padding: 12,
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-border)',
                borderRadius: 10,
              }}
            >
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
