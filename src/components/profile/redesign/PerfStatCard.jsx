'use client';

import { useEffect, useState } from 'react';
import { Caps } from './Caps';
import { NumberText } from './NumberText';
import { page, brand, status, shape, density, type as typeTokens } from './profile-design-tokens';

export function PerfStatCard({ stat }) {
  const [animBar, setAnimBar] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimBar(stat.barFill ?? 0));
    return () => cancelAnimationFrame(id);
  }, [stat.barFill]);

  const isPos = stat.vsAvgDirection === 'pos';
  const isNeg = stat.vsAvgDirection === 'neg';
  const barColor = stat.barFill >= 0.5 ? brand.base : status.danger;
  const valueColor = stat.muted ? page.inkMuted : page.ink;

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Caps>{stat.label}</Caps>
        {stat.topPercentile != null && (
          <span style={{ fontSize: 10, fontWeight: 500, color: page.inkMuted }}>
            Top {Math.max(1, 100 - Math.round(stat.topPercentile))}%
          </span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 10,
        }}
      >
        <NumberText size={26} weight={600} color={valueColor}>
          {stat.value}
        </NumberText>
        {stat.vsAvgLabel && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: isPos ? brand.dark : isNeg ? status.danger : page.inkMuted,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {isPos && '▲'}
            {isNeg && '▼'}
            {stat.vsAvgLabel}
          </span>
        )}
      </div>
      <div
        style={{
          height: 4,
          background: page.surfaceAlt,
          border: `1px solid ${page.border}`,
          borderRadius: shape.radius.pill,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${animBar * 100}%`,
            height: '100%',
            background: barColor,
            transition: 'width 400ms ease-out',
            borderRadius: shape.radius.pill,
          }}
        />
      </div>
    </div>
  );
}
