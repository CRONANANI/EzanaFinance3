'use client';

import Link from 'next/link';
import { ORG_SHORT } from '@/lib/orgMockData';

export function LcOrgAssigned() {
  return (
    <div
      className="lc-card"
      style={{ padding: '1rem 1.25rem', borderColor: 'rgba(129, 140, 248, 0.35)' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              color: 'var(--lc-indigo)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontSize: '0.7rem',
            }}
          >
            Assigned by your Portfolio Manager
          </div>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              marginTop: '0.35rem',
              color: 'var(--lc-ink)',
            }}
          >
            {ORG_SHORT} Learning Assignments
          </div>
          <p style={{ fontSize: '0.8rem', margin: '0.35rem 0 0', color: 'var(--lc-ink-2)' }}>
            Track what your council expects you to complete this week.
          </p>
        </div>
        <Link
          href="/org-team-hub"
          style={{
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--lc-accent)',
            whiteSpace: 'nowrap',
          }}
        >
          Team Hub →
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          marginTop: '1rem',
        }}
      >
        {[
          { title: 'Valuation Fundamentals', status: 'in progress', due: 'Apr 12' },
          { title: 'Pitch Deck Writing', status: 'assigned', due: 'Apr 14' },
          { title: 'Risk & Position Sizing', status: 'assigned', due: 'Apr 18' },
        ].map((a) => (
          <div
            key={a.title}
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--lc-line)',
              background: 'var(--lc-panel-hover)',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--lc-ink)' }}>
              {a.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--lc-ink-3)' }}>
                {a.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--lc-ink-3)' }}>Due {a.due}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
