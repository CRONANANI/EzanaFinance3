'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { SkillBadge } from './Atoms';

const SKILL_TIERS = ['Novice', 'Apprentice', 'Journeyman', 'Master', 'Oracle'];

function tierProgress(tier) {
  const idx = SKILL_TIERS.indexOf(tier);
  if (idx < 0) return 20;
  return Math.round(((idx + 1) / SKILL_TIERS.length) * 100);
}

export function YourCommunityCard({ skillTier, convictionWins, followers }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/learning/streak');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStreak(data.current_streak ?? 0);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tier = skillTier || user?.user_metadata?.skill_rating || 'Apprentice';
  const progress = tierProgress(tier);

  return (
    <div className="ez-card ledger-card evo-your-community" style={{ marginBottom: 14 }}>
      <div className="cardhdr">Your community</div>

      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Skill progress</span>
          <SkillBadge tier={tier} />
        </div>
        <div
          style={{
            height: 6,
            background: 'var(--bg-tertiary)',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            className="evo-skill-progress-bar"
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--emerald) 0%, var(--gold) 100%)',
              borderRadius: 999,
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {[
          { label: 'Streak', value: streak, suffix: 'd' },
          { label: 'Followers', value: followers ?? '—' },
          { label: 'Conviction wins', value: convictionWins ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '8px 6px',
              background: 'var(--bg-tertiary)',
              borderRadius: 8,
              textAlign: 'center',
              border: '1px solid var(--border-primary)',
            }}
          >
            <div
              className="ez-mono"
              style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
            >
              {stat.value}
              {stat.suffix || ''}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
