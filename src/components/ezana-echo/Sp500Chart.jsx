'use client';

import { useState } from 'react';

const PRESIDENT_DATA = [
  {
    id: 'ghwb',
    name: 'George H.W. Bush',
    term: '1989-1993',
    midYear: 1991,
    return: 51,
    context: 'The early 1990s recession saw GDP contract in 1990-1991 while oil prices spiked during the Gulf War. The Fed cut rates aggressively from ~8% to near 3%, helping equities recover strongly after the 1990 downturn.',
    avatar: '/images/ezana-echo/george-hw-bush.png',
  },
  {
    id: 'clinton1',
    name: 'Bill Clinton',
    term: '1st term, 1993-1997',
    midYear: 1995,
    return: 79,
    context: 'Inflation declined toward ~2-3%, long-term Treasury yields fell, and deficit reduction helped fiscal credibility. Rapid technology adoption and corporate earnings powered one of the strongest mid-cycle market expansions of the 1990s.',
    avatar: '/images/ezana-echo/bill-clinton.png',
  },
  {
    id: 'clinton2',
    name: 'Bill Clinton',
    term: '2nd term, 1997-2001',
    midYear: 1999,
    return: 65,
    context: 'The late-stage dot-com expansion drove Nasdaq gains above 400% from 1995-2000. Federal budget surpluses emerged in 1998-2001, unemployment fell below 4%, and equity valuations expanded before the 2000 peak.',
    avatar: '/images/ezana-echo/bill-clinton.png',
  },
  {
    id: 'gwb1',
    name: 'George W. Bush',
    term: '1st term, 2001-2005',
    midYear: 2003,
    return: -12,
    context: 'The dot-com collapse erased roughly $5T in tech market value between 2000-2002, pushing the Nasdaq down nearly 78% from its peak. The 9/11 attacks further shocked markets, early equity losses left the term negative overall.',
    avatar: '/images/ezana-echo/george-w-bush.png',
  },
  {
    id: 'gwb2',
    name: 'George W. Bush',
    term: '2nd term, 2005-2009',
    midYear: 2007,
    return: -27,
    context: 'The housing bubble burst as subprime mortgage defaults surged, leading to the failure of Lehman Brothers and a global credit freeze in 2008. The S&P fell ~57% peak-to-trough, GDP contracted, and unemployment surged to 10%.',
    avatar: '/images/ezana-echo/george-w-bush.png',
  },
  {
    id: 'obama1',
    name: 'Barack Obama',
    term: '1st term, 2009-2013',
    midYear: 2011,
    return: 119,
    context: 'The term began with the S&P near 667 after a ~57% collapse during the financial crisis. The Fed launched QE1 and QE2 totaling trillions in asset purchases, triggering one of the strongest four-year equity rebounds on record.',
    avatar: '/images/ezana-echo/barack-obama.png',
  },
  {
    id: 'obama2',
    name: 'Barack Obama',
    term: '2nd term, 2013-2017',
    midYear: 2015,
    return: 61,
    context: 'Unemployment declined from ~8% in 2012 to 4.7% by 2016, inflation remained near 1-2%. Corporate profit margins reached record levels above 10%, and steady GDP growth around 2-2.5% supported consistent equity gains.',
    avatar: '/images/ezana-echo/barack-obama.png',
  },
  {
    id: 'trump1',
    name: 'Donald Trump',
    term: '1st term, 2017-2021',
    midYear: 2019,
    return: 66,
    context: 'The 2017 Tax Cuts and Jobs Act reduced corporate tax from 35% to 21%, boosting S&P EPS growth above 20% in 2018. The market fell ~34% during the COVID crash in early 2020 but rebounded sharply after the Fed cut rates to zero.',
    avatar: '/images/ezana-echo/donald-trump.png',
  },
  {
    id: 'biden',
    name: 'Joe Biden',
    term: '2021-2025',
    midYear: 2023,
    return: 56,
    context: 'The term began with ~$1.9T fiscal stimulus and 2021 GDP growth of 5.9%, the fastest since 1984. Inflation peaked above 9% in 2022, prompting the Fed to raise rates from 0% to 5.25-5.50%, yet mega-cap tech and AI-led earnings.',
    avatar: '/images/ezana-echo/joe-biden.png',
  },
  {
    id: 'trump2',
    name: 'Donald Trump',
    term: 'current term',
    midYear: 2025,
    return: 14,
    context: 'Markets entered 2025 near all-time highs after a ~24% gain in 2024, supported by AI-driven earnings growth above 15% YoY and inflation cooling toward ~3%. Rate-cut expectations, tariff rhetoric and regional conflicts increased volatility.',
    avatar: '/images/ezana-echo/donald-trump.png',
  },
];

const CHART_WIDTH = 900;
const CHART_HEIGHT = 480;
const PADDING = { top: 60, right: 60, bottom: 60, left: 70 };
const DOT_RADIUS = 12.5; /* 25% larger than 10 */
// Render images at 8x resolution for maximum quality on retina/high-DPI screens
const IMAGE_PIXELS = DOT_RADIUS * 8;
const Y_MIN = -40;
const Y_MAX = 140;
const X_MIN = 1989;
const X_MAX = 2026;

function getX(midYear) {
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  return PADDING.left + ((midYear - X_MIN) / (X_MAX - X_MIN)) * innerWidth;
}

function getY(returnVal) {
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const range = Y_MAX - Y_MIN;
  return PADDING.top + innerHeight - ((returnVal - Y_MIN) / range) * innerHeight;
}

export function Sp500Chart() {
  const [hoveredId, setHoveredId] = useState(null);
  const hovered = PRESIDENT_DATA.find((d) => d.id === hoveredId);

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const yTicks = [-40, -20, 0, 20, 40, 60, 80, 100, 120];
  const xTicks = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

  return (
    <div className="sp500-chart-wrapper">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="sp500-chart-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="dotClip" clipPathUnits="objectBoundingBox">
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
          <filter id="dotShadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Pulsating connecting line - path through all dots */}
        <path
          d={PRESIDENT_DATA.reduce((acc, d, i) => {
            const x = getX(d.midYear);
            const y = getY(d.return);
            return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
          }, '')}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
          className="sp500-connector-line"
        />
        <path
          d={PRESIDENT_DATA.reduce((acc, d, i) => {
            const x = getX(d.midYear);
            const y = getY(d.return);
            return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
          }, '')}
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="100"
          strokeDasharray="3 97"
          className="sp500-pulse-line"
        />

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              y1={getY(tick)}
              x2={CHART_WIDTH - PADDING.right}
              y2={getY(tick)}
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={getX(tick)}
              y1={PADDING.top}
              x2={getX(tick)}
              y2={CHART_HEIGHT - PADDING.bottom}
              stroke="rgba(16, 185, 129, 0.15)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={tick}
            x={PADDING.left - 12}
            y={getY(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#94a3b8"
            fontSize="12"
          >
            {tick}%
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick) => (
          <text
            key={tick}
            x={getX(tick)}
            y={CHART_HEIGHT - PADDING.bottom + 24}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="12"
          >
            {tick}
          </text>
        ))}

        {/* Axis lines */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="rgba(16, 185, 129, 0.4)"
          strokeWidth="1"
        />
        <line
          x1={PADDING.left}
          y1={CHART_HEIGHT - PADDING.bottom}
          x2={CHART_WIDTH - PADDING.right}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="rgba(16, 185, 129, 0.4)"
          strokeWidth="1"
        />

        {/* Zero line */}
        <line
          x1={PADDING.left}
          y1={getY(0)}
          x2={CHART_WIDTH - PADDING.right}
          y2={getY(0)}
          stroke="rgba(16, 185, 129, 0.25)"
          strokeWidth="1"
        />

        {/* Data points - dots filled with president faces */}
        {PRESIDENT_DATA.map((d) => {
          const cx = getX(d.midYear);
          const cy = getY(d.return);
          const isHovered = hoveredId === d.id;
          const hitRadius = DOT_RADIUS + 12;

          return (
            <g
              key={d.id}
              onMouseEnter={() => setHoveredId(d.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Green ring/border */}
              <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS + 3}
                fill="none"
                stroke="#10b981"
                strokeWidth={isHovered ? 4 : 2}
                filter="url(#dotShadow)"
                opacity={isHovered ? 1 : 0.9}
              />
              {/* Face image - rendered at 2x resolution for retina clarity, clipped to circle */}
              <g clipPath="url(#dotClip)">
                <image
                  href={d.avatar}
                  x={cx - IMAGE_PIXELS / 2}
                  y={cy - IMAGE_PIXELS / 2}
                  width={IMAGE_PIXELS}
                  height={IMAGE_PIXELS}
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
              {/* Invisible hit area on top - ensures hover works over entire dot */}
              <circle
                cx={cx}
                cy={cy}
                r={hitRadius}
                fill="transparent"
                style={{ pointerEvents: 'all' }}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="sp500-chart-tooltip"
          style={{
            left: `${Math.min(Math.max((getX(hovered.midYear) / CHART_WIDTH) * 100, 18), 72)}%`,
            top: `${Math.max((getY(hovered.return) / CHART_HEIGHT) * 100 - 22, 5)}%`,
            transform: 'translate(-50%, 0)',
          }}
        >
          <div className="sp500-tooltip-header">
            {hovered.name} ({hovered.term})
          </div>
          <div className="sp500-tooltip-return">
            {hovered.return >= 0 ? '~' : ''}{hovered.return}% RETURN{hovered.return !== 1 ? 'S' : ''}
          </div>
          <div className="sp500-tooltip-context">{hovered.context}</div>
        </div>
      )}
    </div>
  );
}
