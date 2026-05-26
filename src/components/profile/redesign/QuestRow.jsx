'use client';

import Link from 'next/link';
import { NumberText } from './NumberText';
import { page, brand, shape, categoryAccents, type as typeTokens } from './profile-design-tokens';

export function QuestRow({ quest, isFirst }) {
  const color = categoryAccents[quest.category] || page.inkMuted;
  const initial = quest.category.charAt(0);

  return (
    <div
      style={{
        padding: '12px 0',
        borderTop: isFirst ? 'none' : `1px solid ${page.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: shape.radius.chip,
          background: `${color}14`,
          color,
          border: `1px solid ${color}33`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
        aria-hidden
      >
        {initial}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: page.ink,
              letterSpacing: '-0.1px',
              lineHeight: 1.3,
            }}
          >
            {quest.title}
          </span>
          <NumberText size={11} weight={600} color={brand.dark}>
            {quest.xpRangeLabel}
          </NumberText>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: page.inkMuted, lineHeight: 1.4 }}>
          {quest.description}
        </p>
        <Link
          href={quest.ctaHref}
          style={{
            display: 'inline-block',
            marginTop: 5,
            fontSize: 11.5,
            fontWeight: 600,
            color: brand.dark,
            textDecoration: 'none',
          }}
        >
          {quest.ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
