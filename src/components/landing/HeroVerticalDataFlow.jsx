'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SOURCES = [
  {
    id: 'congress',
    label: 'Congress',
    tagline: 'Political trading + legislative signals',
    color: '#10b981',
  },
  {
    id: '13f',
    label: '13F Filings',
    tagline: 'Quarterly institutional positions',
    color: '#10b981',
  },
  {
    id: 'institutional',
    label: 'Institutional Portfolios',
    tagline: 'Fund composition + manager behavior',
    color: '#10b981',
  },
  {
    id: 'analytics',
    label: 'Alternative Analytics',
    tagline: 'Markets, macro, prediction data',
    color: '#10b981',
  },
  {
    id: 'community',
    label: 'Community',
    tagline: 'Retail sentiment + platform activity',
    color: '#10b981',
  },
];

const PROVIDERS = {
  congress: [
    'Quiver Quantitative',
    'House Financial Disclosures',
    'Senate Disclosures',
    'OpenSecrets',
  ],
  '13f': ['SEC EDGAR', 'WhaleWisdom', 'Financial Modeling Prep'],
  institutional: ['Financial Modeling Prep', 'Morningstar API', 'SEC EDGAR'],
  analytics: [
    'Polymarket',
    'GDELT Project',
    'World Bank API',
    'IMF Data API',
    'Financial Modeling Prep',
  ],
  community: ['Ezana Platform'],
};

export function HeroVerticalDataFlow() {
  const [hovered, setHovered] = useState(null);

  const badgePositions = useMemo(
    () =>
      SOURCES.map((s, i) => ({
        ...s,
        y: 70 + i * 75,
        x: 25,
      })),
    [],
  );

  const hubX = 240;
  const hubY = 240;

  const pathFor = (badge) => {
    const startX = 120;
    const startY = badge.y;
    const midX = (startX + hubX) / 2;
    return `M ${startX} ${startY} Q ${midX} ${startY}, ${midX} ${(startY + hubY) / 2} T ${hubX} ${hubY}`;
  };

  return (
    <div className="hero-data-flow" aria-label="Ezana data sources">
      <svg
        className="hero-data-flow-svg"
        viewBox="0 0 480 480"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {badgePositions.map((b) => (
          <path
            key={`line-${b.id}`}
            d={pathFor(b)}
            stroke="rgba(16, 185, 129, 0.28)"
            strokeWidth={1.5}
            fill="none"
          />
        ))}

        {badgePositions.map((b) => {
          const isActive = hovered === b.id || hovered === null;
          if (!isActive) return null;
          return (
            <motion.circle
              key={`dot-${b.id}-${hovered || 'auto'}`}
              r={3.5}
              fill={b.color}
              filter="drop-shadow(0 0 4px #10b981)"
            >
              <animateMotion
                dur={hovered ? '1.2s' : '2.6s'}
                repeatCount="indefinite"
                path={pathFor(b)}
                begin={hovered ? '0s' : `${badgePositions.indexOf(b) * 0.4}s`}
              />
            </motion.circle>
          );
        })}

        <circle
          cx={hubX}
          cy={hubY}
          r={32}
          fill="rgba(16, 185, 129, 0.1)"
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth={2}
        />
        <text
          x={hubX}
          y={hubY + 4}
          textAnchor="middle"
          fill="#34d399"
          fontSize="11"
          fontWeight="700"
          letterSpacing="0.04em"
        >
          EZANA
        </text>

        <motion.path
          d={`M ${hubX + 32} ${hubY} L ${hubX + 110} ${hubY}`}
          stroke="rgba(16, 185, 129, 0.5)"
          strokeWidth={2}
          fill="none"
          strokeDasharray="4 4"
          animate={{ strokeDashoffset: [0, -16] }}
          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        />
      </svg>

      <div className="hero-data-flow-badges">
        {badgePositions.map((b) => (
          <button
            key={b.id}
            type="button"
            className={cn(
              'hero-data-flow-badge',
              hovered === b.id && 'hero-data-flow-badge--active',
            )}
            onMouseEnter={() => setHovered(b.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(b.id)}
            onBlur={() => setHovered(null)}
            style={{ top: `${(b.y / 480) * 100}%` }}
          >
            <span className="hero-data-flow-badge-label">{b.label}</span>
            <AnimatePresence>
              {hovered === b.id && (
                <motion.div
                  className="hero-data-flow-badge-tooltip"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="hero-data-flow-badge-tagline">{b.tagline}</div>
                  <ul className="hero-data-flow-badge-providers">
                    {PROVIDERS[b.id].map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      <div className="hero-data-flow-output">
        <div className="hero-data-flow-output-icon" aria-hidden>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <div className="hero-data-flow-output-text">
          <div className="hero-data-flow-output-title">Personalized Intelligence</div>
          <div className="hero-data-flow-output-sub">Dashboard</div>
        </div>
      </div>
    </div>
  );
}
