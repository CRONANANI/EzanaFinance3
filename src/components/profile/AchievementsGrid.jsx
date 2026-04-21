'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Lock, X } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import './achievements-grid.css';

const CATEGORY_LABEL = {
  community: 'Community',
  learning: 'Learning',
  trading: 'Trading',
};

const TIER_TONE = {
  bronze: 'bronze',
  silver: 'silver',
  gold: 'gold',
  platinum: 'platinum',
  diamond: 'diamond',
};

function AchievementModal({ achievement, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!achievement) return null;
  if (typeof document === 'undefined') return null;

  const earned = Boolean(achievement.earnedAt);

  return createPortal(
    <div className="ag-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="ag-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="ag-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className={`ag-modal-icon tier-${TIER_TONE[achievement.tier] || 'bronze'} ${earned ? 'on' : 'off'}`}>
          {earned ? <Trophy size={22} /> : <Lock size={18} />}
        </div>
        <h3 className="ag-modal-title">{achievement.name}</h3>
        <div className="ag-modal-cat">{CATEGORY_LABEL[achievement.category] || achievement.category}</div>
        <p className="ag-modal-desc">{achievement.description}</p>
        <div className="ag-modal-crit">
          <span>How to earn:</span> {achievement.criteria}
        </div>
        {earned ? (
          <div className="ag-modal-ok">
            Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="ag-modal-prog">
            {achievement.progress ? `${achievement.progress}% progress` : 'Not started'}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function AchievementsGrid({ positions = [], totalReturnPct = 0 }) {
  const { achievements, earnedCount, totalCount, loading } = useAchievements({
    positions,
    totalReturnPct,
  });
  const [selectedId, setSelectedId] = useState(null);

  const sorted = useMemo(() => {
    const earned = achievements.filter((a) => a.earnedAt);
    const inProg = achievements
      .filter((a) => !a.earnedAt && (a.progress ?? 0) > 0)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    const locked = achievements.filter((a) => !a.earnedAt && !(a.progress > 0));
    return [...earned, ...inProg, ...locked];
  }, [achievements]);

  const pct = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
  const selected = sorted.find((a) => a.id === selectedId) || null;

  return (
    <div className="ag-card" data-profile-card="achievements">
      <div className="ag-head">
        <div className="ag-head-left">
          <Trophy size={14} className="ag-trophy-icon" />
          <h2 className="ag-title">Achievements</h2>
        </div>
        <span className="ag-count">
          {loading ? '—' : `${earnedCount} of ${totalCount} earned`}
        </span>
      </div>
      <div className="ag-progress">
        <div className="ag-progress-fill" style={{ width: `${pct}%` }} aria-hidden />
      </div>

      {loading ? (
        <div className="ag-empty">Loading achievements…</div>
      ) : sorted.length === 0 ? (
        <div className="ag-empty">No achievements yet — start trading or take a course.</div>
      ) : (
        <div className="ag-grid">
          {sorted.map((a) => {
            const earned = Boolean(a.earnedAt);
            const tier = TIER_TONE[a.tier] || 'bronze';
            const bi = a.icon && a.icon.startsWith('bi-') ? a.icon : null;
            return (
              <button
                key={a.id}
                type="button"
                className={`ag-tile ${earned ? 'on' : 'off'}`}
                onClick={() => setSelectedId(a.id)}
                title={a.description}
              >
                <div className="ag-tile-head">
                  <span className={`ag-tile-icon tier-${tier} ${earned ? 'on' : 'off'}`}>
                    {bi ? (
                      <i className={`bi ${bi}`} aria-hidden />
                    ) : earned ? (
                      <Trophy size={13} />
                    ) : (
                      <Lock size={12} />
                    )}
                  </span>
                  <span className="ag-tile-cat">{CATEGORY_LABEL[a.category] || a.category}</span>
                </div>
                <div className="ag-tile-name">{a.name}</div>
                <div className="ag-tile-meta">
                  {earned
                    ? `Earned ${new Date(a.earnedAt).toLocaleDateString()}`
                    : a.progress
                      ? `${a.progress}% progress`
                      : 'Locked'}
                </div>
                {!earned && a.progress > 0 && (
                  <div className="ag-tile-bar">
                    <div
                      className="ag-tile-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, a.progress))}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected && <AchievementModal achievement={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
