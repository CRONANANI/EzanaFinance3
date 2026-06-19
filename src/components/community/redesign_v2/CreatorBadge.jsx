'use client';

import { getCreatorTier } from '@/lib/creator-tiers';

function formatType(type) {
  if (!type) return '';
  return String(type)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Creator designation shown next to a partner's name across the community.
 * Renders a tier-colored verified mark, optionally followed by a label pill so
 * members can immediately tell an Ezana partner/creator apart from a regular
 * member. Pass either a resolved `tier` object or a `tierKey` string.
 */
export function CreatorBadge({ tierKey, tier, type, size = 13, showLabel = true }) {
  const t = tier || getCreatorTier(tierKey);
  if (!t) return null;
  const title = type ? `${t.label} · ${formatType(type)}` : t.label;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} title={title}>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          background: t.color,
          borderRadius: 999,
          color: '#fff',
          flexShrink: 0,
          boxShadow: '0 0 0 2px var(--surface-card, #0d1117)',
        }}
      >
        <i className={`bi ${t.icon}`} style={{ fontSize: size * 0.62, lineHeight: 1 }} />
      </span>
      {showLabel && (
        <span
          className="creator-badge-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 7px',
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: t.color,
            background: t.soft,
            border: `1px solid ${t.soft}`,
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {t.label}
        </span>
      )}
    </span>
  );
}

export default CreatorBadge;
