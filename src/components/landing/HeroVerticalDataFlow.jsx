'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const SOURCES = [
  { id: 'congress', label: 'Congress', tagline: 'Political trading and legislative signals' },
  { id: '13f', label: '13F Filings', tagline: 'Institutional positions disclosed quarterly' },
  {
    id: 'institutional',
    label: 'Institutional Portfolios',
    tagline: 'Fund composition and manager behavior',
  },
  {
    id: 'analytics',
    label: 'Alternative Analytics',
    tagline: 'Markets, macro, and prediction data',
  },
  { id: 'community', label: 'Community', tagline: 'Retail sentiment and platform activity' },
];

const PROVIDERS = {
  congress: [
    { name: 'Quiver Quantitative', description: 'Congressional trading disclosures' },
    { name: 'House Financial Disclosures', description: 'Official US House filings' },
    { name: 'Senate Financial Disclosures', description: 'Official US Senate filings' },
    { name: 'OpenSecrets', description: 'Campaign finance and lobbying context' },
  ],
  '13f': [
    { name: 'SEC EDGAR', description: '13F, 13D, and 13G filings direct from the source' },
    { name: 'WhaleWisdom', description: 'Institutional holder consolidation and change detection' },
    { name: 'Financial Modeling Prep', description: 'Normalized institutional holdings feed' },
  ],
  institutional: [
    { name: 'Financial Modeling Prep', description: 'Fund holdings and manager profiles' },
    { name: 'Morningstar API', description: 'Fund composition and performance' },
    { name: 'SEC EDGAR', description: 'Fund disclosures and prospectuses' },
  ],
  analytics: [
    { name: 'Polymarket', description: 'Prediction market odds and live bets' },
    { name: 'GDELT Project', description: 'Geolocated global news and event data' },
    { name: 'World Bank Open Data API', description: 'Macroeconomic indicators' },
    { name: 'IMF Data API', description: 'Fiscal and financial stability data' },
    {
      name: 'Financial Modeling Prep',
      description: 'Sector performance, earnings, dividends, IPOs, economic calendar',
    },
  ],
  community: [
    { name: 'Ezana Platform', description: 'User-generated watchlists, discussions, and posts' },
    { name: 'Reddit API', description: 'Relevant investing subreddit signals' },
  ],
};

function DatabaseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function HeroVerticalDataFlow() {
  const [hovered, setHovered] = useState(null);

  const VB_W = 800;
  const VB_H = 440;
  const BADGE_X_END = 240;
  const BADGE_Y = [50, 130, 210, 290, 370];
  const HUB_X = 420;
  const HUB_Y = 210;
  const HUB_R = 44;
  const OUT_X = 580;
  const OUT_Y = HUB_Y;

  const pathToHub = (yStart) => {
    const c1x = (BADGE_X_END + HUB_X) / 2;
    return `M ${BADGE_X_END} ${yStart} C ${c1x} ${yStart}, ${c1x} ${HUB_Y}, ${HUB_X - HUB_R} ${HUB_Y}`;
  };

  const arrowPath = `M ${HUB_X + HUB_R} ${HUB_Y} L ${OUT_X - 10} ${HUB_Y}`;

  return (
    <div className="hero-data-flow" aria-label="Ezana data sources">
      <svg
        className="hero-data-flow-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <filter id="hubGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="outputHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.5)" />
            <stop offset="40%" stopColor="rgba(16, 185, 129, 0.15)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.55)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0.85)" />
          </linearGradient>
        </defs>

        <ellipse cx={OUT_X + 110} cy={OUT_Y} rx={180} ry={70} fill="url(#outputHalo)" />

        {BADGE_Y.map((y, i) => (
          <path
            key={`line-${i}`}
            d={pathToHub(y)}
            stroke="url(#lineGrad)"
            strokeWidth={2}
            fill="none"
            opacity={hovered && hovered !== SOURCES[i].id ? 0.25 : 1}
            style={{ transition: 'opacity 0.18s ease' }}
          />
        ))}

        {BADGE_Y.map((y, i) => {
          const sourceId = SOURCES[i].id;
          const isActive = hovered === sourceId || hovered === null;
          if (!isActive) return null;
          return (
            <circle
              key={`dot-${sourceId}-${hovered || 'auto'}`}
              r={4}
              fill="#10b981"
              filter="drop-shadow(0 0 5px rgba(16, 185, 129, 0.9))"
            >
              <animateMotion
                dur={hovered ? '1.4s' : '2.8s'}
                repeatCount="indefinite"
                path={pathToHub(y)}
                begin={hovered ? '0s' : `${i * 0.5}s`}
              />
            </circle>
          );
        })}

        <circle
          cx={HUB_X}
          cy={HUB_Y}
          r={HUB_R + 14}
          fill="none"
          stroke="rgba(16, 185, 129, 0.18)"
          strokeWidth={1.2}
        >
          <animate
            attributeName="r"
            values={`${HUB_R + 14};${HUB_R + 24};${HUB_R + 14}`}
            dur="3s"
            repeatCount="indefinite"
          />
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle
          cx={HUB_X}
          cy={HUB_Y}
          r={HUB_R + 6}
          fill="none"
          stroke="rgba(16, 185, 129, 0.3)"
          strokeWidth={1.2}
        >
          <animate
            attributeName="r"
            values={`${HUB_R + 6};${HUB_R + 14};${HUB_R + 6}`}
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>

        <circle
          cx={HUB_X}
          cy={HUB_Y}
          r={HUB_R}
          fill="rgba(16, 185, 129, 0.08)"
          stroke="#10b981"
          strokeWidth={2}
          filter="url(#hubGlow)"
        />
        <text
          x={HUB_X}
          y={HUB_Y + 5}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="17"
          fontWeight="700"
          letterSpacing="-0.01em"
        >
          Ezana
        </text>

        <motion.path
          d={arrowPath}
          stroke="#10b981"
          strokeWidth={2}
          fill="none"
          strokeDasharray="5 5"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
        />

        <circle r={3.5} fill="#10b981" filter="drop-shadow(0 0 4px rgba(16, 185, 129, 0.9))">
          <animateMotion dur="1.4s" repeatCount="indefinite" path={arrowPath} />
        </circle>

        <polygon
          points={`${OUT_X - 12},${HUB_Y - 7} ${OUT_X - 2},${HUB_Y} ${OUT_X - 12},${HUB_Y + 7}`}
          fill="#10b981"
        />
      </svg>

      <div className="hero-data-flow-overlay">
        {SOURCES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={cn('hero-df-badge', hovered === s.id && 'hero-df-badge--active')}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.id)}
            onBlur={() => setHovered(null)}
            style={{
              top: `${(BADGE_Y[i] / VB_H) * 100}%`,
            }}
          >
            <span className="hero-df-badge-icon">
              <DatabaseIcon />
            </span>
            <span className="hero-df-badge-label">{s.label}</span>
            <AnimatePresence>
              {hovered === s.id && (
                <motion.div
                  className="hero-df-tooltip"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="hero-df-tooltip-tagline">{s.tagline}</div>
                  <ul className="hero-df-tooltip-providers">
                    {PROVIDERS[s.id].map((p) => (
                      <li key={p.name}>
                        <span className="hero-df-tooltip-provider-name">{p.name}</span>
                        <span className="hero-df-tooltip-provider-desc">{p.description}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}

        <div className="hero-df-output" style={{ top: `${(OUT_Y / VB_H) * 100}%` }}>
          <span className="hero-df-output-icon">
            <PersonIcon />
          </span>
          <span className="hero-df-output-text">
            <span className="hero-df-output-title">Personalized Intelligence</span>
            <span className="hero-df-output-sub">Dashboard</span>
          </span>
        </div>
      </div>
    </div>
  );
}
