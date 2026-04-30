'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Lock, X, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAchievements } from '@/hooks/useAchievements';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import './badges-page.css';

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

const FILTER_TABS = ['All', 'Earned', 'In Progress', 'Locked'];

function AchievementModal({ achievement, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
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
    <div className="bp-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="bp-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="bp-modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className={`bp-modal-icon tier-${TIER_TONE[achievement.tier] || 'bronze'} ${earned ? 'on' : 'off'}`}>
          {earned ? <Trophy size={28} /> : <Lock size={22} />}
        </div>
        <h3 className="bp-modal-title">{achievement.name}</h3>
        <div className="bp-modal-cat">{CATEGORY_LABEL[achievement.category] || achievement.category}</div>
        <p className="bp-modal-desc">{achievement.description}</p>
        <div className="bp-modal-crit">
          <span>How to earn:</span> {achievement.criteria}
        </div>
        {earned ? (
          <div className="bp-modal-ok">Earned on {new Date(achievement.earnedAt).toLocaleDateString()}</div>
        ) : (
          <div className="bp-modal-prog">
            {achievement.progress ? `${achievement.progress}% progress` : 'Not started'}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function BadgesPageClient() {
  const router = useRouter();
  const mock = useMockPortfolio();
  const totalReturnPct = mock?.totalPnlPct || 0;
  const positions = mock?.enrichedPositions || [];

  const { achievements, earnedCount, totalCount, loading } = useAchievements({
    positions,
    totalReturnPct,
  });

  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const visibleAchievements = useMemo(() => {
    let list = achievements;

    // Status filter
    if (filter === 'Earned') list = list.filter((a) => a.earnedAt);
    else if (filter === 'In Progress') list = list.filter((a) => !a.earnedAt && (a.progress ?? 0) > 0);
    else if (filter === 'Locked') list = list.filter((a) => !a.earnedAt && !(a.progress > 0));

    // Category filter
    if (categoryFilter !== 'all') list = list.filter((a) => a.category === categoryFilter);

    // Search
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          a.description.toLowerCase().includes(s) ||
          a.criteria.toLowerCase().includes(s),
      );
    }

    // Sort: earned first, then in-progress (highest first), then locked
    return [...list].sort((a, b) => {
      const aEarned = Boolean(a.earnedAt);
      const bEarned = Boolean(b.earnedAt);
      if (aEarned !== bEarned) return aEarned ? -1 : 1;
      const aProg = a.progress ?? 0;
      const bProg = b.progress ?? 0;
      if (aProg !== bProg) return bProg - aProg;
      return a.name.localeCompare(b.name);
    });
  }, [achievements, filter, categoryFilter, search]);

  const categories = useMemo(() => {
    const catSet = new Set(achievements.map((a) => a.category).filter(Boolean));
    return ['all', ...Array.from(catSet)];
  }, [achievements]);

  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;
  const selected = visibleAchievements.find((a) => a.id === selectedId) || null;

  return (
    <div className="bp-container dashboard-page-inset">
      <header className="bp-header">
        <button type="button" onClick={() => router.back()} className="bp-back-btn">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="bp-header-titles">
          <h1 className="bp-title">All Achievements</h1>
          <p className="bp-subtitle">
            {loading ? '—' : `${earnedCount} of ${totalCount} earned · ${pct}% complete`}
          </p>
        </div>
      </header>

      <div className="bp-progress-wrap">
        <div className="bp-progress-bar">
          <div className="bp-progress-fill" style={{ width: `${pct}%` }} aria-hidden />
        </div>
      </div>

      <div className="bp-controls">
        <div className="bp-filter-row">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`bp-filter-pill ${filter === t ? 'is-active' : ''}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="bp-controls-right">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bp-category-select"
            aria-label="Filter by category"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All categories' : CATEGORY_LABEL[c] || c}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search achievements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bp-search"
          />
        </div>
      </div>

      {loading ? (
        <div className="bp-empty">Loading achievements…</div>
      ) : visibleAchievements.length === 0 ? (
        <div className="bp-empty">No achievements match these filters.</div>
      ) : (
        <div className="bp-grid">
          {visibleAchievements.map((a) => {
            const earned = Boolean(a.earnedAt);
            const tier = TIER_TONE[a.tier] || 'bronze';
            const bi = a.icon && a.icon.startsWith('bi-') ? a.icon : null;
            return (
              <button
                key={a.id}
                type="button"
                className={`bp-tile ${earned ? 'on' : 'off'}`}
                onClick={() => setSelectedId(a.id)}
                title={a.description}
              >
                <div className={`bp-tile-icon tier-${tier} ${earned ? 'on' : 'off'}`}>
                  {bi ? (
                    <i className={`bi ${bi}`} aria-hidden />
                  ) : earned ? (
                    <Trophy size={18} />
                  ) : (
                    <Lock size={16} />
                  )}
                </div>
                <div className="bp-tile-body">
                  <div className="bp-tile-cat">{CATEGORY_LABEL[a.category] || a.category}</div>
                  <div className="bp-tile-name">{a.name}</div>
                  <div className="bp-tile-desc">{a.description}</div>
                  <div className="bp-tile-meta">
                    {earned
                      ? `Earned ${new Date(a.earnedAt).toLocaleDateString()}`
                      : a.progress
                        ? `${a.progress}% progress`
                        : 'Locked'}
                  </div>
                  {!earned && a.progress > 0 && (
                    <div className="bp-tile-bar">
                      <div
                        className="bp-tile-bar-fill"
                        style={{ width: `${Math.min(100, Math.max(0, a.progress))}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && <AchievementModal achievement={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
