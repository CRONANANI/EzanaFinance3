'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import '@/components/partner/badges.css';

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(156, 163, 175, ${alpha})`;
  }
  let h = hex.slice(1);
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(156, 163, 175, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function BadgeGlyph({ icon, color }) {
  const ic = icon || 'bi-award';
  if (ic.startsWith('bi-')) {
    return <i className={`bi ${ic}`} style={{ color }} />;
  }
  return <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{ic}</span>;
}

export function PartnerBadges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/partner/badges', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const earned = data.earned || [];
        const sorted = [...earned].sort(
          (a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0),
        );
        if (!cancelled) setBadges(sorted);
      } catch (e) {
        console.error('Failed to load badges:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (loading) return null;
  if (badges.length === 0) return null;

  const displayBadges = expanded ? badges : badges.slice(0, 9);
  const hasMore = badges.length > 9;

  return (
    <div
      className="partner-badges-root"
      onMouseEnter={() => hasMore && setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <p className="partner-badges-count">
        {badges.length} Badge{badges.length !== 1 ? 's' : ''} Earned
      </p>

      <div
        className={`partner-badges-grid${expanded && badges.length > 9 ? ' partner-badges-grid--scroll' : ''}`}
      >
        {displayBadges.map((badge) => {
          const c = badge.tier_color || '#9ca3af';
          return (
            <div
              key={badge.id}
              className="partner-badges-cell"
              title={`${badge.badge_name}: ${badge.badge_description || ''}`}
              style={{
                background: hexToRgba(c, 0.12),
                border: `1px solid ${hexToRgba(c, 0.25)}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = `0 0 12px ${hexToRgba(c, 0.35)}`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <BadgeGlyph icon={badge.badge_icon} color={c} />
              <span
                className="partner-badges-rarity-dot"
                style={{ background: c }}
              />
            </div>
          );
        })}
      </div>

      {hasMore && !expanded && (
        <p className="partner-badges-hint">
          Hover to see all
          {' '}
          {badges.length}
          {' '}
          badges
        </p>
      )}

      {expanded && (
        <div className="partner-badges-popover">
          <p className="partner-badges-popover-title">
            {`All Badges (${badges.length})`}
          </p>
          {badges.map((badge) => {
            const c = badge.tier_color || '#e2e8f0';
            return (
              <div key={badge.id} className="partner-badges-popover-row">
                <span className="partner-badges-popover-icon">
                  <BadgeGlyph icon={badge.badge_icon} color={c} />
                </span>
                <div>
                  <p className="partner-badges-popover-name" style={{ color: c }}>
                    {badge.badge_name}
                  </p>
                  <p className="partner-badges-popover-desc">{badge.badge_description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
