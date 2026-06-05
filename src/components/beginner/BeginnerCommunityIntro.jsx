'use client';

import Link from 'next/link';
import { useBeginnerLevelOptional } from '@/contexts/BeginnerLevelContext';
import './beginner.css';

const SUGGESTED_MEMBERS = [
  {
    name: 'Legendary Takes',
    href: '/community',
    hint: 'Read high-conviction ideas from experienced members',
  },
  {
    name: 'Leaderboard',
    href: '/community',
    hint: 'See top performers and how conviction scores work',
  },
];

export function BeginnerCommunityIntro() {
  const beginner = useBeginnerLevelOptional();
  if (!beginner || beginner.band !== 'beginner') return null;
  if (beginner.hasPosted) return null;
  if (beginner.seen.has('community:intro-dismiss')) return null;

  return (
    <section className="beginner-community-intro" aria-label="New to the community">
      <h3>New to the community?</h3>
      <p>
        Conviction scores reflect how strongly members stand behind an idea, weighted by their track
        record. Start low-stakes: ask a question or introduce yourself — no need to post a trade
        thesis on day one.
      </p>
      <div className="beginner-edu-card__actions" style={{ marginBottom: 12 }}>
        <Link href="/community" className="beginner-edu-card__link">
          Ask a question
        </Link>
        <button
          type="button"
          className="beginner-edu-card__dismiss"
          onClick={() => beginner.markSeen('community:intro-dismiss')}
        >
          Got it
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', margin: '0 0 8px', color: 'var(--text-muted, #6b7588)' }}>
        Follow experienced members to learn:
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: '0.8rem',
          color: 'var(--text-secondary, #aeb7c5)',
        }}
      >
        {SUGGESTED_MEMBERS.map((m) => (
          <li key={m.name}>
            <Link href={m.href} className="beginner-edu-card__link">
              {m.name}
            </Link>
            {' — '}
            {m.hint}
          </li>
        ))}
      </ul>
    </section>
  );
}
