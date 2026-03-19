'use client';

import { useState, useEffect } from 'react';

const TIER_STYLES = {
  1: { border: '#cd7f32', bg: 'rgba(205,127,50,0.08)', glow: 'rgba(205,127,50,0.2)' },
  2: { border: '#c0c0c0', bg: 'rgba(192,192,192,0.08)', glow: 'rgba(192,192,192,0.2)' },
  3: { border: '#d4a853', bg: 'rgba(212,168,83,0.08)', glow: 'rgba(212,168,83,0.2)' },
  4: { border: '#e5e4e2', bg: 'rgba(229,228,226,0.08)', glow: 'rgba(229,228,226,0.25)' },
  5: { border: '#b9f2ff', bg: 'rgba(185,242,255,0.08)', glow: 'rgba(185,242,255,0.3)' },
};

export function BadgeRow({ badges = [] }) {
  if (!badges.length) return null;

  return (
    <div className="badge-row">
      {badges.slice(0, 6).map((b) => {
        const style = TIER_STYLES[b.tier] || TIER_STYLES[1];
        return (
          <div
            key={b.id}
            className="badge-mini"
            style={{ borderColor: style.border, background: style.bg }}
            title={`${b.badge_name} (${b.tier_name})`}
          >
            <i className={`bi ${b.badge_icon}`} style={{ color: b.tier_color }} />
          </div>
        );
      })}
      {badges.length > 6 && (
        <div className="badge-mini badge-more">+{badges.length - 6}</div>
      )}
    </div>
  );
}

export function BadgesModal({ isOpen, onClose, getToken }) {
  const [categories, setCategories] = useState({});
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (isOpen) fetchBadges();
  }, [isOpen]);

  const fetchBadges = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/partner/badges', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCategories(data.categories || {});
      setTotalEarned(data.totalEarned || 0);
      setTotalAvailable(data.totalAvailable || 0);
    } catch {}
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const categoryNames = ['All', ...Object.keys(categories)];
  const displayBadges = activeCategory === 'All'
    ? Object.values(categories).flat()
    : categories[activeCategory] || [];

  return (
    <div className="badges-overlay" onClick={onClose}>
      <div className="badges-modal" onClick={(e) => e.stopPropagation()}>
        <div className="badges-modal-header">
          <div>
            <h2>Badges & Achievements</h2>
            <p>{totalEarned} of {totalAvailable} earned</p>
          </div>
          <button className="badges-close" onClick={onClose} type="button"><i className="bi bi-x-lg" /></button>
        </div>

        <div className="badges-progress">
          <div className="badges-progress-bar">
            <div className="badges-progress-fill" style={{ width: `${totalAvailable ? (totalEarned / totalAvailable) * 100 : 0}%` }} />
          </div>
          <span className="badges-progress-pct">{totalAvailable ? Math.round((totalEarned / totalAvailable) * 100) : 0}%</span>
        </div>

        <div className="badges-legend">
          {[
            { name: 'Bronze', color: '#cd7f32' },
            { name: 'Silver', color: '#c0c0c0' },
            { name: 'Gold', color: '#d4a853' },
            { name: 'Platinum', color: '#e5e4e2' },
            { name: 'Diamond', color: '#b9f2ff' },
          ].map((t) => (
            <div key={t.name} className="badges-legend-item">
              <div className="badges-legend-dot" style={{ background: t.color }} />
              <span>{t.name}</span>
            </div>
          ))}
        </div>

        <div className="badges-tabs">
          {categoryNames.map((cat) => (
            <button key={cat} type="button" className={`badges-tab ${activeCategory === cat ? 'active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="badges-loading">Loading badges...</div>
        ) : (
          <div className="badges-grid">
            {displayBadges.map((badge) => {
              const style = TIER_STYLES[badge.tier] || TIER_STYLES[1];
              return (
                <div key={badge.id} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
                  <div className="badge-card-icon" style={{
                    borderColor: badge.earned ? style.border : 'rgba(107,114,128,0.2)',
                    background: badge.earned ? style.bg : 'rgba(107,114,128,0.04)',
                    boxShadow: badge.earned ? `0 0 16px ${style.glow}` : 'none',
                  }}>
                    <i className={`bi ${badge.badge_icon}`} style={{ color: badge.earned ? badge.tier_color : '#4b5563' }} />
                  </div>
                  <div className="badge-card-tier" style={{ color: badge.earned ? badge.tier_color : '#4b5563' }}>
                    {badge.tier_name}
                  </div>
                  <div className="badge-card-name">{badge.badge_name}</div>
                  <div className="badge-card-desc">{badge.badge_description}</div>
                  {badge.earned && badge.earnedAt && (
                    <div className="badge-card-date">Earned {new Date(badge.earnedAt).toLocaleDateString()}</div>
                  )}
                  {!badge.earned && (
                    <div className="badge-card-locked"><i className="bi bi-lock-fill" /> Locked</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
