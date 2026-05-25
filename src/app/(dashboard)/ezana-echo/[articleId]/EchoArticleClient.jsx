'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { isAdminUserClient } from '@/lib/admin-helpers-client';
import { EchoArticleEngagement } from '@/components/echo/EchoArticleEngagement';
import { EchoKeywordProvider, useKeywordPopup } from '@/components/echo/EchoKeywordContext';
import { EchoKeywordPopup } from '@/components/echo/EchoKeywordPopup';
import { parseKeywords } from '@/components/echo/parseKeywords';
import { formatPublishedDate, getAllArticles, getRelatedArticles } from '@/lib/ezana-echo-mock';
import { createArticleTracker } from '@/lib/echo-article-tracker';
import { getTag } from '@/lib/echo-tag-taxonomy';
import { getKeywordById } from '@/lib/echo-keywords';
import { SECTOR_DOMINANCE_DATA, SECTOR_ERAS } from '@/lib/ezana-echo-article-sector-dominance';
import {
  FRED_PPI_DATA,
  MARKET_FORECAST_DATA,
  MARKET_FORECAST_KEYS,
  FIBER_OPTIC_COMPANIES,
  CONTINENTS,
  INDUSTRIES,
  INDUSTRY_COLORS,
} from '@/lib/ezana-echo-article-fiber-optic';
import { HANTAVIRUS_YEARLY_DATA, HANTAVIRUS_STATE_DATA } from '@/lib/ezana-echo-article-hantavirus';
import {
  US_SEMI_MARKET_CAP,
  SEMI_FINANCIALS,
  FOUNDRY_MARKET_SHARE,
} from '@/lib/ezana-echo-article-semiconductors';

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../app-legacy/pages/home-dashboard.css';
import '../ezana-echo.css';

function getEraForYear(year) {
  return (
    SECTOR_ERAS.find((e) => year >= e.yearStart && year <= e.yearEnd) ??
    SECTOR_ERAS[SECTOR_ERAS.length - 1]
  );
}

function ParagraphWithKeywords({ text }) {
  const tokens = parseKeywords(text);
  const { activeKeywordId, openKeyword } = useKeywordPopup();

  return (
    <p>
      {tokens.map((token, i) => {
        if (token.type === 'text') return <span key={i}>{token.content}</span>;
        const keyword = getKeywordById(token.keywordId);
        if (!keyword) return <span key={i}>{token.display}</span>;
        const isActive = activeKeywordId === token.keywordId;
        return (
          <button
            key={i}
            type="button"
            className={`ekp-keyword-span ${isActive ? 'is-active' : ''}`}
            onClick={(e) => openKeyword(token.keywordId, e.currentTarget, keyword.term)}
            data-keyword-id={token.keywordId}
          >
            {token.display}
          </button>
        );
      })}
    </p>
  );
}

function AfricaInteractiveMap({ title, subtitle }) {
  const [hovered, setHovered] = useState(null);

  const COUNTRIES = useMemo(
    () => ({
      'south-africa': {
        name: 'South Africa',
        count: 147,
        region: 'Southern Africa',
        color: '#1abc9c',
      },
      egypt: { name: 'Egypt', count: 33, region: 'Northern Africa', color: '#27ae60' },
      nigeria: { name: 'Nigeria', count: 23, region: 'Western Africa', color: '#f39c12' },
      morocco: { name: 'Morocco', count: 20, region: 'Northern Africa', color: '#27ae60' },
      algeria: { name: 'Algeria', count: 12, region: 'Northern Africa', color: '#27ae60' },
      angola: { name: 'Angola', count: 9, region: 'Southern Africa', color: '#1abc9c' },
      kenya: { name: 'Kenya', count: 6, region: 'Eastern Africa', color: '#3498db' },
      ethiopia: { name: 'Ethiopia', count: 4, region: 'Eastern Africa', color: '#3498db' },
      tunisia: { name: 'Tunisia', count: 4, region: 'Northern Africa', color: '#27ae60' },
      drc: { name: 'DR Congo', count: 4, region: 'Central Africa', color: '#9b59b6' },
      ghana: { name: 'Ghana', count: 2, region: 'Western Africa', color: '#f39c12' },
      'ivory-coast': {
        name: "Côte d'Ivoire",
        count: 2,
        region: 'Western Africa',
        color: '#f39c12',
      },
      senegal: { name: 'Senegal', count: 3, region: 'Western Africa', color: '#f39c12' },
      cameroon: { name: 'Cameroon', count: 2, region: 'Central Africa', color: '#9b59b6' },
      libya: { name: 'Libya', count: 2, region: 'Northern Africa', color: '#27ae60' },
      sudan: { name: 'Sudan', count: 1, region: 'Eastern Africa', color: '#3498db' },
      tanzania: { name: 'Tanzania', count: 1, region: 'Eastern Africa', color: '#3498db' },
      madagascar: { name: 'Madagascar', count: 1, region: 'Eastern Africa', color: '#3498db' },
      mauritius: { name: 'Mauritius', count: 3, region: 'Eastern Africa', color: '#3498db' },
      zambia: { name: 'Zambia', count: 2, region: 'Southern Africa', color: '#1abc9c' },
      botswana: { name: 'Botswana', count: 1, region: 'Southern Africa', color: '#1abc9c' },
      zimbabwe: { name: 'Zimbabwe', count: 1, region: 'Southern Africa', color: '#1abc9c' },
      mozambique: { name: 'Mozambique', count: 1, region: 'Southern Africa', color: '#1abc9c' },
      namibia: { name: 'Namibia', count: 1, region: 'Southern Africa', color: '#1abc9c' },
    }),
    [],
  );

  const PATHS = useMemo(
    () => ({
      morocco: 'M 100 80 L 180 70 L 195 110 L 165 130 L 130 135 L 105 115 Z',
      algeria: 'M 195 110 L 280 105 L 295 175 L 275 220 L 215 220 L 200 175 Z',
      tunisia: 'M 235 80 L 265 80 L 270 110 L 245 110 Z',
      libya: 'M 295 175 L 360 170 L 365 230 L 335 250 L 280 240 L 275 220 Z',
      egypt: 'M 365 170 L 425 175 L 430 235 L 395 260 L 365 230 Z',
      sudan: 'M 360 240 L 410 235 L 425 295 L 395 320 L 355 315 L 340 285 Z',
      ethiopia: 'M 395 300 L 440 295 L 445 345 L 420 365 L 390 350 Z',
      kenya: 'M 395 360 L 435 365 L 440 405 L 410 415 L 390 395 Z',
      tanzania: 'M 380 410 L 425 410 L 430 450 L 395 460 L 375 440 Z',
      somalia: 'M 440 330 L 475 320 L 480 380 L 450 380 Z',
      nigeria: 'M 230 270 L 285 265 L 290 310 L 260 325 L 230 315 Z',
      ghana: 'M 200 305 L 220 305 L 222 345 L 205 345 Z',
      'ivory-coast': 'M 175 305 L 198 305 L 200 345 L 180 345 Z',
      senegal: 'M 125 245 L 155 245 L 158 280 L 130 280 Z',
      mali: 'M 160 220 L 215 215 L 220 270 L 175 270 Z',
      mauritania: 'M 110 195 L 175 190 L 180 240 L 125 245 L 115 230 Z',
      cameroon: 'M 285 285 L 315 285 L 318 340 L 295 345 L 285 320 Z',
      drc: 'M 295 350 L 365 345 L 370 425 L 320 430 L 295 405 Z',
      angola: 'M 275 430 L 335 425 L 340 485 L 305 495 L 275 470 Z',
      zambia: 'M 335 445 L 380 445 L 385 480 L 345 485 Z',
      zimbabwe: 'M 350 485 L 385 485 L 388 515 L 355 515 Z',
      mozambique: 'M 390 470 L 415 465 L 420 540 L 395 545 Z',
      madagascar: 'M 445 460 L 470 470 L 475 530 L 455 535 Z',
      mauritius: 'M 488 525 L 498 525 L 498 535 L 488 535 Z',
      'south-africa': 'M 300 500 L 380 510 L 385 555 L 350 575 L 305 565 Z',
      namibia: 'M 270 480 L 305 485 L 310 540 L 280 545 Z',
      botswana: 'M 305 490 L 350 490 L 355 525 L 315 525 Z',
      chad: 'M 290 240 L 335 235 L 340 290 L 305 295 Z',
      niger: 'M 220 215 L 285 210 L 290 255 L 230 265 Z',
      'burkina-faso': 'M 195 270 L 230 270 L 232 295 L 200 295 Z',
      guinea: 'M 145 285 L 180 285 L 183 315 L 150 315 Z',
      liberia: 'M 160 320 L 180 320 L 182 345 L 165 345 Z',
      'central-african': 'M 305 295 L 340 295 L 345 335 L 310 340 Z',
      gabon: 'M 270 345 L 290 345 L 293 380 L 275 380 Z',
      congo: 'M 290 345 L 310 345 L 313 380 L 295 380 Z',
      rwanda: 'M 372 380 L 385 380 L 387 392 L 374 392 Z',
      burundi: 'M 372 393 L 385 393 L 387 405 L 374 405 Z',
      uganda: 'M 375 360 L 395 360 L 397 380 L 377 380 Z',
      eritrea: 'M 405 275 L 430 275 L 433 300 L 410 300 Z',
      djibouti: 'M 440 305 L 455 305 L 457 318 L 442 318 Z',
      malawi: 'M 388 460 L 400 460 L 403 495 L 390 495 Z',
      lesotho: 'M 340 545 L 358 545 L 360 560 L 345 560 Z',
      eswatini: 'M 372 540 L 383 540 L 385 552 L 374 552 Z',
      'western-sahara': 'M 90 130 L 130 135 L 135 175 L 95 175 Z',
      'sierra-leone': 'M 145 320 L 165 320 L 167 345 L 148 345 Z',
      'guinea-bissau': 'M 125 285 L 145 285 L 147 305 L 128 305 Z',
      gambia: 'M 125 275 L 145 275 L 147 282 L 128 282 Z',
      togo: 'M 222 305 L 230 305 L 232 345 L 224 345 Z',
      benin: 'M 232 305 L 245 305 L 247 345 L 234 345 Z',
      'equatorial-guinea': 'M 265 348 L 278 348 L 280 360 L 267 360 Z',
      'south-sudan': 'M 345 305 L 395 300 L 398 340 L 348 345 Z',
      comoros: 'M 440 445 L 448 445 L 450 453 L 442 453 Z',
    }),
    [],
  );

  const activeData = hovered ? COUNTRIES[hovered] : null;

  return (
    <div className="echo-africa-map">
      <div className="echo-africa-map-header">
        <h4 className="echo-africa-map-title">
          {title || 'Companies with $1B+ Revenue by Country'}
        </h4>
        <p className="echo-africa-map-subtitle">
          {subtitle ||
            'Hover any country to see how many billion-dollar companies are headquartered there'}
        </p>
      </div>

      <div className="echo-africa-map-stage">
        <svg
          className="echo-africa-svg"
          viewBox="0 0 500 600"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Interactive map of Africa"
        >
          {Object.entries(PATHS).map(([code, d]) => {
            const country = COUNTRIES[code];
            const fill = country?.color || '#374151';
            const isActive = hovered === code;
            return (
              <path
                key={code}
                d={d}
                fill={fill}
                opacity={country ? 1 : 0.4}
                className={`echo-africa-country${isActive ? ' active' : ''}`}
                onMouseEnter={() => country && setHovered(code)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => country && setHovered(code === hovered ? null : code)}
              >
                {country && <title>{`${country.name}: ${country.count} companies`}</title>}
              </path>
            );
          })}
        </svg>

        <div className="echo-africa-tooltip">
          {activeData ? (
            <>
              <p className="echo-africa-tooltip-country">{activeData.name}</p>
              <p className="echo-africa-tooltip-count">{activeData.count}</p>
              <p className="echo-africa-tooltip-label">
                {activeData.count === 1
                  ? 'Company with $1B+ revenue'
                  : 'Companies with $1B+ revenue'}
              </p>
              <p className="echo-africa-tooltip-region">{activeData.region}</p>
            </>
          ) : (
            <p className="echo-africa-tooltip-empty">
              Hover a country to see its billion-dollar company count
            </p>
          )}
        </div>
      </div>

      <div className="echo-africa-legend">
        <span className="echo-africa-legend-item">
          <span className="echo-africa-legend-swatch" style={{ background: '#27ae60' }} />
          Northern Africa (73)
        </span>
        <span className="echo-africa-legend-item">
          <span className="echo-africa-legend-swatch" style={{ background: '#f39c12' }} />
          Western Africa (35)
        </span>
        <span className="echo-africa-legend-item">
          <span className="echo-africa-legend-swatch" style={{ background: '#3498db' }} />
          Eastern Africa (16)
        </span>
        <span className="echo-africa-legend-item">
          <span className="echo-africa-legend-swatch" style={{ background: '#9b59b6' }} />
          Central Africa (7)
        </span>
        <span className="echo-africa-legend-item">
          <span className="echo-africa-legend-swatch" style={{ background: '#1abc9c' }} />
          Southern Africa (160)
        </span>
      </div>
    </div>
  );
}

function ArticleBlock({ block }) {
  switch (block.type) {
    case 'paragraph':
      return <ParagraphWithKeywords text={block.text} />;

    case 'heading':
      return block.level === 3 ? (
        <h3 className="echo-article-h3">{block.text}</h3>
      ) : (
        <h2 className="echo-article-h2">{block.text}</h2>
      );

    case 'callout':
      return (
        <div className="echo-callout">
          <div className="echo-callout-label">{block.label}</div>
          <div className="echo-callout-value">{block.value}</div>
          {block.context && <div className="echo-callout-context">{block.context}</div>}
        </div>
      );

    case 'stat-grid':
      return (
        <div className="echo-stat-grid">
          {block.stats.map((s, i) => (
            <div key={i} className="echo-stat-tile">
              <div className="echo-stat-label">{s.label}</div>
              <div className="echo-stat-value">{s.value}</div>
              {s.change && <div className="echo-stat-change">{s.change}</div>}
            </div>
          ))}
        </div>
      );

    case 'chart':
      return <ArticleChart {...block} />;

    case 'quote':
      return (
        <blockquote className="echo-pullquote">
          <p>{block.text}</p>
          {block.source && <cite>— {block.source}</cite>}
        </blockquote>
      );

    case 'image':
      return (
        <figure className="echo-inline-image">
          <img
            src={block.src}
            alt={block.alt || ''}
            className="echo-inline-image-img"
            loading="lazy"
          />
          {block.caption && (
            <figcaption className="echo-inline-image-caption">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'africa-map':
      return <AfricaInteractiveMap title={block.title} subtitle={block.subtitle} />;

    default:
      return null;
  }
}

function ArticleChart({
  variant = 'line',
  title,
  caption,
  data,
  series = [],
  annotations = [],
  yLabel,
}) {
  const W = 720;
  const H = 320;
  const PADDING = { top: 30, right: 80, bottom: 40, left: 50 };
  const innerW = W - PADDING.left - PADDING.right;
  const innerH = H - PADDING.top - PADDING.bottom;

  if (variant === 'interactive-stacked-area') {
    return <SectorDominanceChart title={title} caption={caption} yLabel={yLabel} />;
  }
  if (variant === 'line') {
    return renderLineChart({
      data,
      series,
      annotations,
      yLabel,
      W,
      H,
      PADDING,
      innerW,
      innerH,
      title,
      caption,
    });
  }
  if (variant === 'horizontal-bar') {
    return renderHorizontalBarChart({ data, title, caption, W, H, PADDING });
  }
  if (variant === 'bar') {
    return renderBarChart({ data, title, caption, W, H, PADDING, innerW, innerH });
  }
  if (variant === 'fred-line') {
    return <FredPpiChart title={title} caption={caption} yLabel={yLabel} />;
  }
  if (variant === 'stacked-bar-forecast') {
    return <MarketForecastChart title={title} caption={caption} yLabel={yLabel} />;
  }
  if (variant === 'fiber-optic-world-map') {
    return <FiberOpticWorldMap title={title} caption={caption} />;
  }
  if (variant === 'hantavirus-yearly') {
    return <HantavirusYearlyChart title={title} caption={caption} />;
  }
  if (variant === 'hantavirus-state-map') {
    return <HantavirusStateMap title={title} caption={caption} />;
  }
  if (variant === 'semi-market-cap-ranking') {
    return <SemiMarketCapChart title={title} caption={caption} />;
  }
  if (variant === 'semi-financials-table') {
    return <SemiFinancialsTable title={title} caption={caption} />;
  }
  if (variant === 'foundry-market-share') {
    return <FoundryMarketShareChart title={title} caption={caption} />;
  }
  return null;
}

function renderLineChart({
  data,
  series,
  annotations,
  yLabel,
  W,
  H,
  PADDING,
  innerW,
  innerH,
  title,
  caption,
}) {
  if (!data?.length || !series?.length) return null;

  const allValues = data
    .flatMap((d) => series.map((s) => d[s.key]))
    .filter((v) => typeof v === 'number');
  if (!allValues.length) return null;

  const yMin = Math.floor(Math.min(...allValues) / 10) * 10;
  const yMax = Math.ceil(Math.max(...allValues) / 10) * 10;
  const yScale = (v) => PADDING.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  const xMax = Math.max(1, data.length - 1);
  const xScale = (i) => PADDING.left + (i / xMax) * innerW;

  const yTicks = 5;
  const yTickValues = Array.from(
    { length: yTicks + 1 },
    (_, i) => yMin + (i * (yMax - yMin)) / yTicks,
  );
  const yPrefix = yLabel && /USD|barrel/i.test(yLabel) ? '$' : '';
  const xLabelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      {caption && <div className="echo-chart-caption">{caption}</div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="echo-chart-svg"
        role="img"
        aria-label={title || 'Chart'}
      >
        {yTickValues.map((tv, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={yScale(tv)}
              y2={yScale(tv)}
              stroke="var(--echo-chart-grid, rgba(120, 120, 120, 0.15))"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={yScale(tv) + 4}
              textAnchor="end"
              className="echo-chart-tick"
            >
              {yPrefix}
              {Math.round(tv)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          if (i % xLabelStride !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={xScale(i)}
              y={H - PADDING.bottom + 18}
              textAnchor="middle"
              className="echo-chart-tick"
            >
              {d.x}
            </text>
          );
        })}

        {series.map((s, sIdx) => {
          const path = data
            .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d[s.key])}`)
            .join(' ');
          const last = data[data.length - 1];
          const lastY = yScale(last[s.key]);
          const collisions = series
            .slice(0, sIdx)
            .filter((other) => Math.abs(yScale(last[other.key]) - lastY) < 16);
          const labelYOffset = collisions.length * 18;

          return (
            <g key={s.key}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={xScale(data.length - 1)} cy={lastY} r="3.5" fill={s.color} />
              <text
                x={xScale(data.length - 1) + 8}
                y={lastY + 4 + labelYOffset}
                className="echo-chart-series-label"
                fill={s.color}
              >
                {s.label}
              </text>
              <text
                x={xScale(data.length - 1) + 8}
                y={lastY + 18 + labelYOffset}
                className="echo-chart-series-value"
              >
                {yPrefix}
                {last[s.key]}
              </text>
            </g>
          );
        })}

        {(annotations || []).map((a, i) => {
          const idx = data.findIndex((d) => d.x === a.x);
          if (idx < 0) return null;
          const x = xScale(idx);
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x}
                y1={PADDING.top}
                y2={H - PADDING.bottom}
                stroke="var(--echo-chart-annotation, rgba(120, 120, 120, 0.4))"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={x}
                y={PADDING.top - 8}
                textAnchor="middle"
                className="echo-chart-annotation-label"
              >
                {a.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function renderHorizontalBarChart({ data, title, caption, W, H, PADDING }) {
  if (!data?.length) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const rowHeight = 28;
  const gap = 4;
  const totalHeight = data.length * (rowHeight + gap) + PADDING.top + PADDING.bottom;
  const chartHeight = Math.max(H, totalHeight);
  const labelWidth = 160;
  const valueWidth = 80;
  const barTrackWidth = W - PADDING.left - PADDING.right - labelWidth - valueWidth;

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      {caption && <div className="echo-chart-caption">{caption}</div>}
      <svg
        viewBox={`0 0 ${W} ${chartHeight}`}
        className="echo-chart-svg"
        role="img"
        aria-label={title || 'Chart'}
      >
        {data.map((d, i) => {
          const y = PADDING.top + i * (rowHeight + gap);
          const barWidth = maxValue ? (d.value / maxValue) * barTrackWidth : 0;
          const intensity = maxValue ? d.value / maxValue : 0;
          const color = `rgba(${230 - intensity * 30}, ${130 - intensity * 80}, ${80 - intensity * 60}, ${0.35 + intensity * 0.55})`;

          return (
            <g key={i}>
              <text x={PADDING.left} y={y + rowHeight / 2 + 5} className="echo-chart-bar-label">
                {i + 1}. {d.label}
              </text>
              <rect
                x={PADDING.left + labelWidth}
                y={y}
                width={barTrackWidth}
                height={rowHeight}
                fill="var(--echo-chart-grid, rgba(120, 120, 120, 0.05))"
                rx="3"
              />
              <rect
                x={PADDING.left + labelWidth}
                y={y}
                width={barWidth}
                height={rowHeight}
                fill={color}
                rx="3"
              />
              <text
                x={PADDING.left + labelWidth + barTrackWidth + 10}
                y={y + rowHeight / 2 + 5}
                className="echo-chart-bar-value"
              >
                {d.value.toFixed(2)}%
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function renderBarChart({ data, title, caption, W, H, PADDING, innerW, innerH }) {
  if (!data?.length) return null;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 0);
  const range = maxV - minV || 1;
  const yAt = (v) => PADDING.top + innerH - ((v - minV) / range) * innerH;
  const zeroY = yAt(0);
  const slotW = innerW / data.length;
  const barWidth = slotW * 0.7;

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      {caption && <div className="echo-chart-caption">{caption}</div>}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="echo-chart-svg"
        role="img"
        aria-label={title || 'Chart'}
      >
        <line
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--echo-chart-grid, rgba(120, 120, 120, 0.25))"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const x = PADDING.left + i * slotW + (slotW - barWidth) / 2;
          const yEnd = yAt(d.value);
          const top = Math.min(zeroY, yEnd);
          const height = Math.abs(yEnd - zeroY);
          const isNegative = d.value < 0;
          const color = isNegative
            ? 'var(--echo-chart-red, #e85d4f)'
            : 'var(--echo-chart-green, #10b981)';
          return (
            <g key={i}>
              <rect
                x={x}
                y={top}
                width={barWidth}
                height={Math.max(height, 1)}
                fill={color}
                rx="2"
              />
              <text
                x={x + barWidth / 2}
                y={top - 6}
                textAnchor="middle"
                className="echo-chart-bar-value"
              >
                {d.value > 0 ? '+' : ''}
                {d.value}%
              </text>
              <text
                x={x + barWidth / 2}
                y={H - PADDING.bottom + 18}
                textAnchor="middle"
                className="echo-chart-tick"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function FredPpiChart({ title, caption }) {
  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      <div className="echo-chart-responsive-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={FRED_PPI_DATA} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval="preserveStartEnd"
              tickFormatter={(v) => {
                const year = v.split('-')[0];
                return year;
              }}
              minTickGap={30}
            />
            <YAxis
              domain={[78, 102]}
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--echo-tooltip-bg, #0d1117)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8,
                color: 'var(--echo-tooltip-text, #f0f6fc)',
                fontSize: '0.7rem',
              }}
              formatter={(v) => [`${Number(v).toFixed(1)}`, 'PPI']}
              labelFormatter={(l) => `${l}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: '#0d1117', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {caption && <figcaption className="echo-chart-caption">{caption}</figcaption>}
    </figure>
  );
}

function MarketForecastChart({ title, caption, yLabel }) {
  /* Compute 10-year CAGR for each segment: (end/start)^(1/n) - 1 */
  const startYear = MARKET_FORECAST_DATA[0];
  const endYear = MARKET_FORECAST_DATA[MARKET_FORECAST_DATA.length - 1];
  const n = endYear.year - startYear.year; /* 10 years */

  const cagrByKey = {};
  for (const k of MARKET_FORECAST_KEYS) {
    const startVal = startYear[k.key];
    const endVal = endYear[k.key];
    if (startVal > 0 && endVal > 0) {
      cagrByKey[k.key] = ((Math.pow(endVal / startVal, 1 / n) - 1) * 100).toFixed(1);
    } else {
      cagrByKey[k.key] = '—';
    }
  }

  const renderLegend = () => (
    <div className="echo-forecast-legend">
      {MARKET_FORECAST_KEYS.map((k) => (
        <div key={k.key} className="echo-forecast-legend-item">
          <span className="echo-forecast-legend-swatch" style={{ background: k.color }} />
          <div>
            <div className="echo-forecast-legend-name">{k.key}</div>
            <div className="echo-forecast-legend-cagr" style={{ color: k.color }}>
              CAGR {cagrByKey[k.key]}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      <div className="echo-chart-responsive-wrap echo-chart-responsive-wrap--tall">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={MARKET_FORECAST_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval={0}
              tickFormatter={(v) => `'${String(v).slice(2)}`}
            />
            <YAxis
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 9 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              width={30}
              label={{
                value: yLabel || 'USD Bn',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--echo-axis-tick, #6b7280)',
                fontSize: 8,
                offset: 5,
              }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--echo-tooltip-bg, #0d1117)',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8,
                color: 'var(--echo-tooltip-text, #f0f6fc)',
                fontSize: '0.7rem',
              }}
              formatter={(v, name) => [`$${Number(v).toFixed(1)}B`, name]}
            />
            <Legend content={renderLegend} />
            {MARKET_FORECAST_KEYS.map((k) => (
              <Bar
                key={k.key}
                dataKey={k.key}
                stackId="a"
                fill={k.color}
                radius={k.key === 'Others' ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {caption && <figcaption className="echo-chart-caption">{caption}</figcaption>}
    </figure>
  );
}

function FiberCompanyProfileCard({ company, isDark, onClose }) {
  const [quote, setQuote] = useState(null);
  const [stats, setStats] = useState(null);
  const [ytdChart, setYtdChart] = useState([]);
  const [threeYChart, setThreeYChart] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = {
    cardBg: isDark ? '#0d1117' : '#ffffff',
    cardBorder: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)',
    headingColor: isDark ? '#f0f6fc' : '#1e293b',
    bodyColor: isDark ? '#c9d1d9' : '#475569',
    mutedColor: isDark ? '#8b949e' : '#94a3b8',
    statBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    statBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    chartLineBg: isDark ? '#161b22' : '#f1f5f9',
  };

  useEffect(() => {
    if (!company?.ticker) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const sym = encodeURIComponent(company.ticker);

    Promise.all([
      fetch(`/api/fmp/quote?symbols=${sym}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/fmp/stock-stats?symbol=${sym}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/market-data/stock-candles?symbol=${sym}&range=1Y`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/market-data/stock-candles?symbol=${sym}&range=3Y`).then((r) =>
        r.ok ? r.json() : null,
      ),
    ])
      .then(([q, s, ytd, threeY]) => {
        if (cancelled) return;
        const up = (company.ticker || '').toUpperCase();
        const quoteObj =
          q?.quotes?.[0] || (up && q?.priceMap?.[up]) || (q?.price != null ? q : null);
        setQuote(quoteObj);
        setStats(s);
        setYtdChart((ytd?.candles || ytd?.data || []).map((c) => c.close ?? c.c).filter(Boolean));
        setThreeYChart(
          (threeY?.candles || threeY?.data || []).map((c) => c.close ?? c.c).filter(Boolean),
        );
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [company?.ticker]);

  const price = quote?.price ?? quote?.previousClose ?? null;
  const change = quote?.change ?? null;
  const changePct = quote?.changesPercentage ?? null;
  const isPositive = (change ?? 0) >= 0;

  const marketCapRaw = stats?.marketCap ?? stats?.mktCap ?? null;
  const marketCapDisplay =
    stats?.mcap && stats.mcap !== '--'
      ? stats.mcap
      : marketCapRaw != null
        ? fmtLargeNum(marketCapRaw)
        : null;
  const peRaw = stats?.pe ?? stats?.peRatio ?? null;
  const peDisplay =
    peRaw != null && peRaw !== '--' && !Number.isNaN(Number(peRaw))
      ? Number(peRaw).toFixed(1)
      : null;
  const epsRaw = stats?.eps ?? null;
  const epsDisplay =
    epsRaw != null && epsRaw !== '--' && !Number.isNaN(Number(epsRaw))
      ? `$${Number(epsRaw).toFixed(2)}`
      : null;
  const high52 = stats?.yearHigh ?? stats?.range?.split('-')?.[1] ?? null;
  const low52 = stats?.yearLow ?? stats?.range?.split('-')?.[0] ?? null;

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.cardBorder}`,
        borderRadius: 10,
        padding: '1rem 1.1rem',
        marginTop: '0.75rem',
        position: 'relative',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.08)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'transparent',
          border: 'none',
          color: t.mutedColor,
          fontSize: '0.9rem',
          cursor: 'pointer',
          padding: '0.25rem',
        }}
        aria-label="Close profile"
      >
        <i className="bi bi-x-lg" />
      </button>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: `${INDUSTRY_COLORS[company.industry] || '#6366f1'}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: INDUSTRY_COLORS[company.industry] || '#6366f1',
            fontSize: '0.9rem',
            fontWeight: 800,
          }}
        >
          {company.name.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: t.headingColor,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {company.name}
          </div>
          <div style={{ fontSize: '0.65rem', color: t.mutedColor }}>
            {company.ticker || 'Private'} · {company.hq}
          </div>
        </div>
        <span
          style={{
            padding: '0.2rem 0.5rem',
            borderRadius: 4,
            background: `${INDUSTRY_COLORS[company.industry] || '#6366f1'}18`,
            color: INDUSTRY_COLORS[company.industry] || '#6366f1',
            fontSize: '0.55rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {company.industry}
        </span>
      </div>

      {!company.ticker && (
        <div
          style={{
            padding: '1rem 0',
            textAlign: 'center',
            color: t.mutedColor,
            fontSize: '0.75rem',
          }}
        >
          <i
            className="bi bi-lock"
            style={{ fontSize: '1.25rem', display: 'block', marginBottom: '0.4rem' }}
          />
          Private company — financial data not available.
        </div>
      )}

      {company.ticker && loading && (
        <div
          style={{
            padding: '1.5rem 0',
            textAlign: 'center',
            color: t.mutedColor,
            fontSize: '0.75rem',
          }}
        >
          Loading {company.ticker} data…
        </div>
      )}

      {company.ticker && !loading && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: t.headingColor }}>
              {price != null ? `$${Number(price).toFixed(2)}` : '—'}
            </span>
            {change != null && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: isPositive ? '#10b981' : '#ef4444',
                }}
              >
                {isPositive ? '+' : ''}
                {Number(change).toFixed(2)} ({isPositive ? '+' : ''}
                {Number(changePct).toFixed(2)}%)
              </span>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.4rem',
              marginBottom: '0.75rem',
            }}
          >
            {[
              { label: 'Market Cap', value: marketCapDisplay ?? '—' },
              { label: 'P/E Ratio', value: peDisplay ?? '—' },
              { label: 'EPS', value: epsDisplay ?? '—' },
              {
                label: '52W Range',
                value:
                  low52 && high52
                    ? `${Number(low52).toFixed(0)} – ${Number(high52).toFixed(0)}`
                    : '—',
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  padding: '0.45rem 0.6rem',
                  background: t.statBg,
                  border: `1px solid ${t.statBorder}`,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    fontSize: '0.55rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: t.mutedColor,
                    marginBottom: '0.15rem',
                  }}
                >
                  {s.label}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: t.headingColor }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <MiniSparkChart data={ytdChart} label="YTD" isDark={isDark} bg={t.chartLineBg} />
            <MiniSparkChart data={threeYChart} label="3Y" isDark={isDark} bg={t.chartLineBg} />
          </div>
        </>
      )}
    </div>
  );
}

function MiniSparkChart({ data, label, isDark, bg }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ background: bg, borderRadius: 6, padding: '0.5rem', textAlign: 'center' }}>
        <div
          style={{
            fontSize: '0.55rem',
            fontWeight: 600,
            color: isDark ? '#8b949e' : '#94a3b8',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: '0.65rem', color: isDark ? '#6b7280' : '#cbd5e1' }}>No data</div>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const isUp = data[data.length - 1] >= data[0];
  const lineColor = isUp ? '#10b981' : '#ef4444';
  const pctChange = (((data[data.length - 1] - data[0]) / data[0]) * 100).toFixed(1);
  const gradId = `fiber-spark-${label.replace(/\s/g, '')}`;

  return (
    <div style={{ background: bg, borderRadius: 6, padding: '0.4rem 0.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.2rem',
        }}
      >
        <span
          style={{
            fontSize: '0.55rem',
            fontWeight: 600,
            color: isDark ? '#8b949e' : '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: lineColor }}>
          {isUp ? '+' : ''}
          {pctChange}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: 48 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`}
          fill={`url(#${gradId})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function fmtLargeNum(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(0)}M`;
  return `$${num.toLocaleString()}`;
}

/* ── Hantavirus Yearly Stacked Bar Chart ──────────────────── */
function HantavirusYearlyChart({ title, caption }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = {
    bg: isDark ? '#0d1117' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#4b5563',
    grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
  };

  return (
    <div
      style={{
        width: '100%',
        background: t.bg,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: '1rem',
      }}
    >
      <h4
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: isDark ? '#f0f6fc' : '#111827',
          margin: '0 0 0.75rem',
        }}
      >
        {title || 'U.S. Hantavirus Cases by Year (1993–2023)'}
      </h4>
      <div className="echo-chart-responsive-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={HANTAVIRUS_YEARLY_DATA} barCategoryGap="15%">
            <CartesianGrid strokeDasharray="3 3" stroke={t.grid} />
            <XAxis
              dataKey="year"
              tick={{ fill: t.text, fontSize: 9 }}
              interval={2}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: t.text, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#161b22' : '#fff',
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                fontSize: '0.75rem',
              }}
              labelStyle={{ color: isDark ? '#f0f6fc' : '#111', fontWeight: 700 }}
            />
            <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
            <Bar dataKey="died" stackId="cases" fill="#3b82f6" name="Died" radius={[0, 0, 0, 0]} />
            <Bar
              dataKey="lived"
              stackId="cases"
              fill="#86efac"
              name="Lived"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="unknown"
              stackId="cases"
              fill="#bfdbfe"
              name="Unknown Outcome"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: '0.6rem', color: t.text, marginTop: '0.5rem', opacity: 0.6 }}>
        {caption
          ? `Source: ${caption}. Cases met surveillance case definition at time of reporting.`
          : 'Source: CDC / NNDSS. Cases met surveillance case definition at time of reporting.'}
      </p>
    </div>
  );
}

/* ── Hantavirus State Map (Interactive Bubble Map) ──────────── */
function HantavirusStateMap({ title, caption }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [hoveredState, setHoveredState] = useState(null);

  const t = {
    bg: isDark ? '#0d1117' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#4b5563',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
  };

  const maxCases = Math.max(...HANTAVIRUS_STATE_DATA.map((s) => s.cases));

  const getColor = (cases) => {
    if (cases > 50) return isDark ? '#dc2626' : '#b91c1c';
    if (cases > 15) return isDark ? '#f97316' : '#ea580c';
    return isDark ? '#fbbf24' : '#d97706';
  };

  const getRadius = (cases) => {
    const minR = 6;
    const maxR = 28;
    return minR + (cases / maxCases) * (maxR - minR);
  };

  const projectX = (lng) => ((lng + 130) / 65) * 800;
  const projectY = (lat) => ((50 - lat) / 22) * 450;

  return (
    <div
      style={{
        width: '100%',
        background: t.bg,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: '1rem',
      }}
    >
      <h4
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: isDark ? '#f0f6fc' : '#111827',
          margin: '0 0 0.75rem',
        }}
      >
        {title || 'Cumulative Hantavirus Cases by State (1993–2023)'}
      </h4>
      <div className="echo-chart-responsive-wrap" style={{ position: 'relative' }}>
        <svg viewBox="0 0 800 450" style={{ width: '100%', height: 'auto' }}>
          <rect width="800" height="450" fill="transparent" />
          {HANTAVIRUS_STATE_DATA.map((s) => {
            const cx = projectX(s.lng);
            const cy = projectY(s.lat);
            const r = getRadius(s.cases);
            const isHovered = hoveredState === s.state;
            return (
              <g
                key={s.state}
                onMouseEnter={() => setHoveredState(s.state)}
                onMouseLeave={() => setHoveredState(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={getColor(s.cases)}
                  opacity={isHovered ? 0.95 : 0.7}
                  stroke={isHovered ? '#fff' : 'none'}
                  strokeWidth={isHovered ? 2 : 0}
                />
                <text
                  x={cx}
                  y={cy - r - 3}
                  textAnchor="middle"
                  fill={t.text}
                  fontSize={isHovered ? 11 : 9}
                  fontWeight={isHovered ? 700 : 600}
                >
                  {s.state}
                </text>
                {(s.cases > 20 || isHovered) && (
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={isHovered ? 11 : 8}
                    fontWeight={700}
                  >
                    {s.cases}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hoveredState &&
          (() => {
            const s = HANTAVIRUS_STATE_DATA.find((x) => x.state === hoveredState);
            if (!s) return null;
            return (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: isDark ? '#161b22' : '#fff',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.7rem',
                  color: isDark ? '#f0f6fc' : '#111',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ color: getColor(s.cases), fontWeight: 800, fontSize: '1rem' }}>
                  {s.cases} cases
                </div>
                <div style={{ fontSize: '0.6rem', color: t.text, opacity: 0.7 }}>
                  1993–2023 cumulative
                </div>
              </div>
            );
          })()}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.5rem',
          fontSize: '0.6rem',
          color: t.text,
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isDark ? '#fbbf24' : '#d97706',
              marginRight: 4,
            }}
          />
          1–15
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isDark ? '#f97316' : '#ea580c',
              marginRight: 4,
            }}
          />
          16–50
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: isDark ? '#dc2626' : '#b91c1c',
              marginRight: 4,
            }}
          />
          50+
        </span>
      </div>
      <p style={{ fontSize: '0.6rem', color: t.text, marginTop: '0.5rem', opacity: 0.6 }}>
        {caption
          ? `Source: ${caption}. All cases confirmed 1993–2023, meeting NNDSS surveillance case definition.`
          : 'Source: CDC. All cases confirmed 1993–2023, meeting NNDSS surveillance case definition.'}
      </p>
    </div>
  );
}

/* ── Top 10 US Semiconductors — Horizontal Bar Chart ──────── */
function SemiMarketCapChart({ title, caption }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = {
    bg: isDark ? '#0d1117' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#4b5563',
    heading: isDark ? '#f0f6fc' : '#111827',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    rowBg: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
    rowHover: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
  };
  const [hovered, setHovered] = useState(null);
  const maxCap = US_SEMI_MARKET_CAP[0].marketCap;

  return (
    <div
      style={{
        width: '100%',
        background: t.bg,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: '1rem',
        overflow: 'hidden',
      }}
    >
      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: t.heading, margin: '0 0 0.75rem' }}>
        {title || 'Who Dominates U.S. Semiconductors?'}
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 60px 1fr 90px',
            gap: 8,
            padding: '4px 8px',
            fontSize: '0.55rem',
            fontWeight: 700,
            color: t.text,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>#</span>
          <span>TICKER</span>
          <span>COMPANY</span>
          <span style={{ textAlign: 'right' }}>MARKET CAP</span>
        </div>
        {US_SEMI_MARKET_CAP.map((row) => {
          const barWidth = `${(row.marketCap / maxCap) * 100}%`;
          const isHov = hovered === row.ticker;
          return (
            <div
              key={row.ticker}
              role="presentation"
              onMouseEnter={() => setHovered(row.ticker)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '28px 60px 1fr 90px',
                gap: 8,
                alignItems: 'center',
                padding: '8px 8px',
                borderRadius: 8,
                background: isHov ? t.rowHover : row.rank % 2 === 0 ? t.rowBg : 'transparent',
                transition: 'background 0.15s',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: t.text }}>
                {row.rank}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: t.heading,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {row.ticker}
              </span>
              <div style={{ position: 'relative', minHeight: 24 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 2,
                    height: 20,
                    width: barWidth,
                    background: `${row.color}22`,
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    fontSize: '0.7rem',
                    color: t.text,
                    lineHeight: '24px',
                  }}
                >
                  {row.company}
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: t.heading,
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {row.marketCap >= 1000
                  ? `$${(row.marketCap / 1000).toFixed(2)}T`
                  : `$${row.marketCap.toFixed(1)}B`}
              </span>
            </div>
          );
        })}
      </div>
      {caption && (
        <p style={{ fontSize: '0.6rem', color: t.text, marginTop: '0.5rem', opacity: 0.6 }}>
          {caption}
        </p>
      )}
    </div>
  );
}

/* ── Semiconductor Financials Interactive Table ────────────── */
function SemiFinancialsTable({ title, caption }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortDir, setSortDir] = useState('desc');
  const t = {
    bg: isDark ? '#0d1117' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#4b5563',
    heading: isDark ? '#f0f6fc' : '#111827',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
    headerBg: isDark ? '#161b22' : '#1e293b',
    rowBg: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
  };

  const sorted = [...SEMI_FINANCIALS].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const cols = [
    { key: 'company', label: 'Company', align: 'left', format: (v) => v },
    { key: 'type', label: 'Type', align: 'left', format: (v) => v },
    { key: 'revenue', label: 'Revenue TTM', align: 'right', format: (v) => `$${v}B` },
    {
      key: 'netIncome',
      label: 'Net Income TTM',
      align: 'right',
      format: (v) => (v < 0 ? `-$${Math.abs(v)}B` : `$${v}B`),
    },
    {
      key: 'marketCap',
      label: 'Market Cap',
      align: 'right',
      format: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}T` : `$${v}B`),
    },
  ];

  const sortable = (key) => key === 'revenue' || key === 'netIncome' || key === 'marketCap';

  return (
    <div
      style={{
        width: '100%',
        background: t.bg,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '1rem 1rem 0.5rem' }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: t.heading, margin: 0 }}>
          {title || 'U.S. Semiconductor Financials (TTM)'}
        </h4>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ background: t.headerBg }}>
              {cols.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  onClick={() => sortable(c.key) && toggleSort(c.key)}
                  style={{
                    padding: '8px 12px',
                    textAlign: c.align,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: sortable(c.key) ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {c.label} {sortKey === c.key ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.ticker}
                style={{
                  background: i % 2 === 0 ? 'transparent' : t.rowBg,
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                {cols.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: '8px 12px',
                      textAlign: c.align,
                      color: c.key === 'netIncome' && row.netIncome < 0 ? '#ef4444' : t.heading,
                      fontWeight: c.key === 'company' ? 700 : 500,
                      whiteSpace: 'nowrap',
                      fontFamily: c.align === 'right' ? 'var(--font-mono, monospace)' : 'inherit',
                    }}
                  >
                    {c.format(row[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p style={{ fontSize: '0.6rem', color: t.text, padding: '0.5rem 1rem', opacity: 0.6 }}>
          {caption}
        </p>
      )}
    </div>
  );
}

/* ── Global Foundry Market Share — Donut Chart ────────────── */
function FoundryMarketShareChart({ title, caption }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [hovered, setHovered] = useState(null);
  const t = {
    bg: isDark ? '#0d1117' : '#ffffff',
    text: isDark ? '#c9d1d9' : '#4b5563',
    heading: isDark ? '#f0f6fc' : '#111827',
    border: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
  };

  const cx = 120;
  const cy = 120;
  const outerR = 100;
  const innerR = 60;
  let cumAngle = -90;

  const slices = FOUNDRY_MARKET_SHARE.map((d) => {
    const startAngle = cumAngle;
    const sweep = (d.share / 100) * 360;
    cumAngle += sweep;
    const endAngle = startAngle + sweep;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;
    const x1 = cx + outerR * Math.cos(startRad);
    const y1 = cy + outerR * Math.sin(startRad);
    const x2 = cx + outerR * Math.cos(endRad);
    const y2 = cy + outerR * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(endRad);
    const iy1 = cy + innerR * Math.sin(endRad);
    const ix2 = cx + innerR * Math.cos(startRad);
    const iy2 = cy + innerR * Math.sin(startRad);
    const path = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
    return { ...d, path };
  });

  const hoveredRow = hovered ? FOUNDRY_MARKET_SHARE.find((d) => d.company === hovered) : null;

  return (
    <div
      style={{
        width: '100%',
        background: t.bg,
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        padding: '1rem',
      }}
    >
      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: t.heading, margin: '0 0 0.75rem' }}>
        {title || 'Global Foundry Market Share'}
      </h4>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 240 240" style={{ width: 220, height: 220 }}>
          {slices.map((s) => (
            <path
              key={s.company}
              d={s.path}
              fill={s.color}
              opacity={hovered && hovered !== s.company ? 0.3 : 0.85}
              stroke={t.bg}
              strokeWidth={2}
              onMouseEnter={() => setHovered(s.company)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            />
          ))}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill={t.heading}
            fontSize={hovered ? 14 : 22}
            fontWeight={800}
          >
            {hoveredRow ? `${hoveredRow.share}%` : 'TSMC'}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={t.text} fontSize={hovered ? 10 : 11}>
            {hoveredRow ? hoveredRow.region : '62% share'}
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FOUNDRY_MARKET_SHARE.map((d) => (
            <div
              key={d.company}
              role="presentation"
              onMouseEnter={() => setHovered(d.company)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                opacity: hovered && hovered !== d.company ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  background: d.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{ fontSize: '0.7rem', fontWeight: 600, color: t.heading, minWidth: 110 }}
              >
                {d.company}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: t.text,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {d.share}%
              </span>
              <span style={{ fontSize: '0.6rem', color: t.text, opacity: 0.6 }}>{d.region}</span>
            </div>
          ))}
        </div>
      </div>
      {caption && (
        <p style={{ fontSize: '0.6rem', color: t.text, marginTop: '0.75rem', opacity: 0.6 }}>
          {caption}
        </p>
      )}
    </div>
  );
}

function FiberOpticWorldMap({ title, caption }) {
  const [activeContinents, setActiveContinents] = useState(() => new Set(CONTINENTS));
  const [activeIndustries, setActiveIndustries] = useState(() => new Set(INDUSTRIES));
  const [hovered, setHovered] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const handleDotClick = (company) => {
    setSelectedCompany((prev) => (prev?.name === company.name ? null : company));
  };

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* Theme-aware color tokens */
  const t = {
    /* SVG background */
    mapBg: isDark ? '#0a0e13' : '#f8fafc',
    mapBorder: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.2)',

    /* Continent outlines */
    continentStroke: isDark ? '#6366f1' : '#94a3b8',
    continentFill: isDark ? 'none' : 'rgba(148,163,184,0.06)',
    continentOpacity: isDark ? 0.15 : 0.5,

    /* Continent label text */
    continentLabelFill: isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.5)',

    /* Company dots */
    dotStroke: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    highlightStroke: isDark ? '#f0f6fc' : '#1e293b',
    highlightPulseStroke: isDark ? '#f0f6fc' : '#6366f1',

    /* Tooltip */
    tooltipBg: isDark ? '#0d1117' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)',
    tooltipNameFill: isDark ? '#f0f6fc' : '#1e293b',
    tooltipMetaFill: isDark ? '#8b949e' : '#64748b',

    /* Industry chip inactive (continent chips reuse these) */
    indBorderInactive: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    indColorInactive: isDark ? '#6b7280' : '#94a3b8',

    /* Counter text */
    counterFill: isDark ? '#4b5563' : '#94a3b8',
  };

  const toggleContinent = (c) => {
    setActiveContinents((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const toggleIndustry = (ind) => {
    setActiveIndustries((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  };

  const visible = FIBER_OPTIC_COMPANIES.filter(
    (c) => activeContinents.has(c.continent) && activeIndustries.has(c.industry),
  );

  const project = (lat, lng) => {
    const x = ((lng + 180) / 360) * 700;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  const industryColor = (ind) => INDUSTRY_COLORS[ind] || '#6366f1';

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}

      {/* Region filter row */}
      <div className="echo-map-filter-row">
        <span className="echo-map-filter-label">Region</span>
        <div className="echo-map-filter-chips">
          {CONTINENTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleContinent(c)}
              className={`echo-map-chip ${activeContinents.has(c) ? 'is-active' : ''}`}
              style={
                activeContinents.has(c)
                  ? {
                      borderColor: '#6366f1',
                      background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                      color: isDark ? '#c7d2fe' : '#4338ca',
                    }
                  : { borderColor: t.indBorderInactive, color: t.indColorInactive }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Industry filter row */}
      <div className="echo-map-filter-row">
        <span className="echo-map-filter-label">Industry</span>
        <div className="echo-map-filter-chips">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              type="button"
              onClick={() => toggleIndustry(ind)}
              className={`echo-map-chip ${activeIndustries.has(ind) ? 'is-active' : ''}`}
              style={
                activeIndustries.has(ind)
                  ? {
                      borderColor: industryColor(ind),
                      background: `${industryColor(ind)}22`,
                      color: industryColor(ind),
                    }
                  : { borderColor: t.indBorderInactive, color: t.indColorInactive }
              }
            >
              <span className="echo-map-chip-dot" style={{ background: industryColor(ind) }} />
              {ind}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 700 400"
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: 400,
          background: t.mapBg,
          borderRadius: 8,
          border: `1px solid ${t.mapBorder}`,
        }}
      >
        <g
          opacity={t.continentOpacity}
          fill={t.continentFill}
          stroke={t.continentStroke}
          strokeWidth={isDark ? 0.5 : 1}
        >
          <path d="M50,60 L160,40 L200,80 L190,130 L150,160 L120,200 L80,180 L60,120 Z" />
          <path d="M140,210 L180,200 L200,250 L190,320 L160,360 L130,340 L120,280 Z" />
          <path d="M310,50 L380,40 L390,80 L370,120 L340,110 L310,90 Z" />
          <path d="M330,150 L380,140 L400,200 L390,280 L350,310 L320,260 L310,200 Z" />
          <path d="M400,40 L560,30 L600,80 L580,150 L520,180 L450,160 L400,120 Z" />
          <path d="M560,250 L640,240 L660,280 L630,310 L570,300 Z" />
        </g>

        {/* Continent labels */}
        <g
          fill={t.continentLabelFill}
          fontSize="9"
          fontFamily="sans-serif"
          fontWeight="600"
          letterSpacing="0.1em"
        >
          <text x="120" y="110">
            N. AMERICA
          </text>
          <text x="150" y="290">
            S. AMERICA
          </text>
          <text x="340" y="80">
            EUROPE
          </text>
          <text x="345" y="220">
            AFRICA
          </text>
          <text x="490" y="90">
            ASIA
          </text>
          <text x="590" y="270">
            OCEANIA
          </text>
        </g>

        {visible.map((c) => {
          const { x, y } = project(c.lat, c.lng);
          const r = c.highlight ? 7 : 4.5;
          const fill = industryColor(c.industry);
          return (
            <g
              key={c.name}
              onMouseEnter={() => setHovered(c)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleDotClick(c)}
              style={{ cursor: 'pointer' }}
            >
              {c.highlight && (
                <circle
                  cx={x}
                  cy={y}
                  r={14}
                  fill="none"
                  stroke={t.highlightPulseStroke}
                  strokeWidth={1}
                  opacity={0.25}
                >
                  <animate
                    attributeName="r"
                    values="10;18;10"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.45;0.1;0.45"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              <circle
                cx={x}
                cy={y}
                r={selectedCompany?.name === c.name ? r + 2 : r}
                fill={fill}
                stroke={
                  selectedCompany?.name === c.name
                    ? isDark
                      ? '#f0f6fc'
                      : '#1e293b'
                    : c.highlight
                      ? t.highlightStroke
                      : t.dotStroke
                }
                strokeWidth={selectedCompany?.name === c.name ? 2.5 : c.highlight ? 2 : 0.5}
                opacity={0.9}
                style={{ cursor: 'pointer' }}
              />
            </g>
          );
        })}

        {hovered &&
          (() => {
            const { x, y } = project(hovered.lat, hovered.lng);
            const tipX = x > 500 ? x - 160 : x + 12;
            const tipY = y > 300 ? y - 60 : y + 8;
            const hc = industryColor(hovered.industry);
            return (
              <g>
                <rect
                  x={tipX}
                  y={tipY}
                  width={155}
                  height={52}
                  rx={6}
                  fill={t.tooltipBg}
                  stroke={t.tooltipBorder}
                  strokeWidth={1}
                />
                <text
                  x={tipX + 8}
                  y={tipY + 16}
                  fill={t.tooltipNameFill}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {hovered.name}
                </text>
                <text
                  x={tipX + 8}
                  y={tipY + 28}
                  fill={t.tooltipMetaFill}
                  fontSize="7.5"
                  fontFamily="sans-serif"
                >
                  {hovered.hq} · {hovered.industry}
                </text>
                <text
                  x={tipX + 8}
                  y={tipY + 40}
                  fill={hc}
                  fontSize="7.5"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {hovered.ticker ? `${hovered.ticker}` : 'Private'}
                </text>
              </g>
            );
          })()}

        <text
          x={685}
          y={390}
          textAnchor="end"
          fill={t.counterFill}
          fontSize="8"
          fontFamily="sans-serif"
        >
          {visible.length} companies shown
        </text>
      </svg>

      {selectedCompany && (
        <FiberCompanyProfileCard
          company={selectedCompany}
          isDark={isDark}
          onClose={() => setSelectedCompany(null)}
        />
      )}

      {caption && <figcaption className="echo-chart-caption">{caption}</figcaption>}
    </figure>
  );
}

/**
 * Interactive stacked-area chart showing sector dominance 1800–2025.
 * Hover any point on the timeline to see era-specific stats.
 */
function SectorDominanceTooltip({ active, payload, label, setHoverYear }) {
  useEffect(() => {
    if (active && label != null) setHoverYear(Number(label));
  }, [active, label, setHoverYear]);

  if (!active || !payload?.length) return null;
  const year = Number(label);
  const era = getEraForYear(year);
  const row = payload[0].payload;
  const dominantPct = row[era.sector];

  return (
    <div className="echo-sector-tooltip" role="status">
      <div className="echo-sector-tooltip-year">{year}</div>
      <div className="echo-sector-tooltip-era" style={{ color: era.color }}>
        {era.sectorLabel}
      </div>
      <div className="echo-sector-tooltip-share">{dominantPct}% of market</div>
      <div className="echo-sector-tooltip-row">
        <span className="echo-sector-tooltip-label">Era peak</span>
        <span>{era.peakShare}</span>
      </div>
      <div className="echo-sector-tooltip-row">
        <span className="echo-sector-tooltip-label">Driver</span>
        <span>{era.driver}</span>
      </div>
      <div className="echo-sector-tooltip-row">
        <span className="echo-sector-tooltip-label">Notable</span>
        <span>{era.notable}</span>
      </div>
    </div>
  );
}

function SectorDominanceChart({ title, caption, yLabel }) {
  const [hoverYear, setHoverYear] = useState(null);
  const activeEra = hoverYear != null ? getEraForYear(hoverYear) : null;

  return (
    <figure
      className="echo-chart echo-sector-chart-block"
      aria-label={yLabel ? `${title}. ${yLabel}` : title || 'Sector dominance chart'}
    >
      {title && <div className="echo-chart-title">{title}</div>}

      <div className="echo-sector-chart-wrap">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={SECTOR_DOMINANCE_DATA}
            margin={{ top: 20, right: 30, left: 10, bottom: 50 }}
            onMouseLeave={() => setHoverYear(null)}
          >
            <defs>
              {SECTOR_ERAS.map((era) => (
                <linearGradient
                  key={era.sector}
                  id={`echo-grad-${era.sector}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={era.color} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={era.color} stopOpacity={0.45} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} strokeDasharray="2 4" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              ticks={[1800, 1825, 1850, 1875, 1900, 1925, 1950, 1975, 2000, 2025]}
              type="number"
              domain={[1800, 2025]}
            />
            <YAxis
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={42}
            />
            <Tooltip
              content={(tooltipProps) => (
                <SectorDominanceTooltip {...tooltipProps} setHoverYear={setHoverYear} />
              )}
              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
            />

            <Area
              type="monotone"
              dataKey="finance"
              stackId="dominance"
              stroke={SECTOR_ERAS[0].color}
              fill="url(#echo-grad-finance)"
              strokeWidth={1.5}
              isAnimationActive={false}
              name="Finance & Real Estate"
            />
            <Area
              type="monotone"
              dataKey="transport"
              stackId="dominance"
              stroke={SECTOR_ERAS[1].color}
              fill="url(#echo-grad-transport)"
              strokeWidth={1.5}
              isAnimationActive={false}
              name="Transport"
            />
            <Area
              type="monotone"
              dataKey="energy"
              stackId="dominance"
              stroke={SECTOR_ERAS[2].color}
              fill="url(#echo-grad-energy)"
              strokeWidth={1.5}
              isAnimationActive={false}
              name="Energy & Materials"
            />
            <Area
              type="monotone"
              dataKey="tech"
              stackId="dominance"
              stroke={SECTOR_ERAS[3].color}
              fill="url(#echo-grad-tech)"
              strokeWidth={1.5}
              isAnimationActive={false}
              name="Information Technology & Communications"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="echo-sector-legend">
        {SECTOR_ERAS.map((era) => (
          <div
            key={era.sector}
            className={`echo-sector-legend-item ${activeEra?.sector === era.sector ? 'is-active' : ''}`}
          >
            <span className="echo-sector-legend-swatch" style={{ background: era.color }} />
            <div className="echo-sector-legend-text">
              <div className="echo-sector-legend-name">{era.sectorLabel}</div>
              <div className="echo-sector-legend-range">
                {era.yearStart}–{era.yearEnd}
              </div>
            </div>
          </div>
        ))}
      </div>

      {caption && <figcaption className="echo-chart-caption">{caption}</figcaption>}
    </figure>
  );
}

export default function EchoArticleClient({ article, isArchived: initialArchived = false }) {
  const { user } = useAuth();
  const isAdmin = isAdminUserClient(user);
  const [isArchived, setIsArchived] = useState(initialArchived);
  const [busy, setBusy] = useState(false);
  const articleBodyRef = useRef(null);
  const [articleTracker, setArticleTracker] = useState(null);

  const articleTags = useMemo(
    () => (article.tags?.length ? article.tags : [article.category || 'markets']),
    [article.tags, article.category],
  );

  useEffect(() => {
    if (!user?.id || !article?.id) {
      setArticleTracker(null);
      return undefined;
    }
    const tracker = createArticleTracker({
      articleId: article.id,
      articleTitle: article.title,
      tags: articleTags,
      category: article.category,
      enabled: true,
    });
    setArticleTracker(tracker);
    return () => setArticleTracker(null);
  }, [article?.id, article.title, article.category, articleTags, user?.id]);

  useEffect(() => {
    if (!articleTracker || !articleBodyRef.current) return undefined;
    return articleTracker.attach(articleBodyRef.current);
  }, [articleTracker, article?.id]);

  async function handleArchive() {
    if (!confirm('Archive this article? It will be hidden from non-admin users.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setIsArchived(true);
    } catch (err) {
      alert(`Failed to archive: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleRepublish() {
    if (!confirm('Republish this article? It will reappear in the public Echo feed.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/echo/admin/archive', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setIsArchived(false);
    } catch (err) {
      alert(`Failed to republish: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const related = getRelatedArticles(article.category, article.id, 3);
  const fallback =
    related.length < 3
      ? getAllArticles()
          .filter((a) => a.id !== article.id && !related.some((r) => r.id === a.id))
          .slice(0, 3 - related.length)
      : [];
  const relatedCards = [...related, ...fallback].slice(0, 3);
  const tickers = article.tickers ?? [];
  const blocks = article.contentBlocks;
  const paragraphs = article.contentParagraphs ?? [];

  return (
    <EchoKeywordProvider articleTracker={articleTracker}>
      <div className="echo-article-page">
        <div className="echo-article-page-inset">
          <Link href="/ezana-echo" className="echo-back">
            <i className="bi bi-arrow-left" aria-hidden /> Back to Ezana Echo
          </Link>

          <article className="echo-article-shell">
            {isAdmin && (
              <div className="echo-article-admin-bar">
                {isArchived && (
                  <span className="echo-article-archived-badge">
                    <i className="bi bi-archive-fill" /> Archived (only admins can see this)
                  </span>
                )}
                <div className="echo-article-admin-actions">
                  {isArchived ? (
                    <button
                      type="button"
                      className="echo-article-republish-btn"
                      onClick={handleRepublish}
                      disabled={busy}
                    >
                      <i className="bi bi-arrow-counterclockwise" />
                      {busy ? 'Republishing…' : 'Republish'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="echo-article-archive-btn"
                      onClick={handleArchive}
                      disabled={busy}
                    >
                      <i className="bi bi-archive" />
                      {busy ? 'Archiving…' : 'Archive Article'}
                    </button>
                  )}
                </div>
              </div>
            )}
            <header className="echo-article-header">
              <div className="echo-article-kicker">
                <span className="echo-article-kicker-dot" aria-hidden />
                {(article.category || 'markets').toUpperCase()}
              </div>
              <h1 className="echo-article-h1">{article.title}</h1>
              {article.excerpt && <p className="echo-article-deck">{article.excerpt}</p>}
              <div className="echo-article-byline">
                <span className="echo-article-byline-author">
                  By <strong>{article.author}</strong>
                </span>
                <span className="echo-article-byline-divider" aria-hidden>
                  ·
                </span>
                <span>{formatPublishedDate(article.publishedAt)}</span>
                <span className="echo-article-byline-divider" aria-hidden>
                  ·
                </span>
                <span>{article.readTime} min read</span>
              </div>
              {article.tags && article.tags.length > 0 && (
                <div className="echo-detail-tags">
                  {article.tags.map((tagId) => {
                    const t = getTag(tagId);
                    return (
                      <Link
                        key={tagId}
                        href={`/ezana-echo?tag=${tagId}`}
                        className="echo-article-tag-chip"
                        style={{
                          background: t.color.bg,
                          color: t.color.fg,
                          border: `1px solid ${t.color.border}`,
                        }}
                      >
                        {t.label}
                      </Link>
                    );
                  })}
                </div>
              )}
              {tickers.length > 0 && (
                <div className="echo-ticker-row" role="list" aria-label="Related tickers">
                  {tickers.map((t) => (
                    <Link
                      key={t}
                      href={`/company-research?q=${encodeURIComponent(t)}`}
                      className="echo-ticker"
                      role="listitem"
                    >
                      <i className="bi bi-graph-up" aria-hidden />
                      <span>{t}</span>
                    </Link>
                  ))}
                </div>
              )}
              {article.heroImage && (
                <figure className="echo-hero-image">
                  <img
                    src={article.heroImage.src}
                    alt={article.heroImage.alt}
                    className={`echo-hero-image-img${article.heroImage.kind === 'infographic' ? ' echo-hero-image-img--infographic' : ''}`}
                    loading="eager"
                  />
                  {article.heroImage.caption && (
                    <figcaption className="echo-hero-image-caption">
                      {article.heroImage.caption}
                    </figcaption>
                  )}
                </figure>
              )}
            </header>

            <div className="echo-article-body" ref={articleBodyRef}>
              {Array.isArray(blocks) && blocks.length > 0
                ? blocks.map((block, i) => <ArticleBlock key={i} block={block} />)
                : paragraphs.map((p, i) => <ParagraphWithKeywords key={i} text={p} />)}
            </div>

            <div className="echo-article-footer">
              <EchoArticleEngagement
                articleId={article.id}
                articleTitle={article.title}
                articleTracker={articleTracker}
              />
            </div>

            <section className="echo-article-related">
              <div className="echo-article-related-header">
                <h2 className="echo-section-title">Related Articles</h2>
                <Link href="/ezana-echo" className="echo-article-related-link">
                  View all <i className="bi bi-arrow-right" aria-hidden />
                </Link>
              </div>
              <div className="echo-related-grid">
                {relatedCards.map((a) => (
                  <Link key={a.id} href={`/ezana-echo/${a.id}`} className="echo-related-card">
                    <span className="echo-related-card-kicker">
                      {(a.category || 'markets').toUpperCase()}
                    </span>
                    <p className="echo-related-title">{a.title}</p>
                    {a.excerpt && <p className="echo-related-excerpt">{a.excerpt}</p>}
                    <span className="echo-related-card-meta">{a.readTime} min read</span>
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </div>
      </div>
      <EchoKeywordPopup />
    </EchoKeywordProvider>
  );
}
