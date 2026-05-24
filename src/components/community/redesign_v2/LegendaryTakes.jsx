'use client';

import { Avatar } from './Atoms';

export function LegendaryTakes({ takes = [] }) {
  if (!takes.length) return null;

  return (
    <div
      className="ez-card evo-legendary-takes"
      style={{
        padding: 16,
        borderColor: 'var(--gold-border)',
        boxShadow: '0 0 0 1px var(--gold-border)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <i className="bi bi-stars" style={{ color: 'var(--gold)', fontSize: 14 }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>
          Legendary takes
        </h3>
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
          const author = take.author || {};
          return (
            <li
              key={take.id || i}
              style={{
                padding: 12,
                background: 'var(--gold-bg)',
                border: '1px solid var(--gold-border)',
                borderRadius: 10,
              }}
            >
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
                    ${take.ticker}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                }}
              >
                {take.content || take.summary}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
