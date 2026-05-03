'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
import { useTheme } from '@/components/ThemeProvider';
import { EchoArticleEngagement } from '@/components/echo/EchoArticleEngagement';
import { EchoKeywordProvider, useKeywordPopup } from '@/components/echo/EchoKeywordContext';
import { EchoKeywordPopup } from '@/components/echo/EchoKeywordPopup';
import { parseKeywords } from '@/components/echo/parseKeywords';
import { formatPublishedDate, getAllArticles, getRelatedArticles } from '@/lib/ezana-echo-mock';
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

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../app-legacy/pages/home-dashboard.css';
import '../ezana-echo.css';

function getEraForYear(year) {
  return (
    SECTOR_ERAS.find((e) => year >= e.yearStart && year <= e.yearEnd) ?? SECTOR_ERAS[SECTOR_ERAS.length - 1]
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
            onClick={(e) => openKeyword(token.keywordId, e.currentTarget)}
            data-keyword-id={token.keywordId}
          >
            {token.display}
          </button>
        );
      })}
    </p>
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

    default:
      return null;
  }
}

function ArticleChart({ variant = 'line', title, caption, data, series = [], annotations = [], yLabel }) {
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
  return null;
}

function renderLineChart({ data, series, annotations, yLabel, W, H, PADDING, innerW, innerH, title, caption }) {
  if (!data?.length || !series?.length) return null;

  const allValues = data.flatMap((d) => series.map((s) => d[s.key])).filter((v) => typeof v === 'number');
  if (!allValues.length) return null;

  const yMin = Math.floor(Math.min(...allValues) / 10) * 10;
  const yMax = Math.ceil(Math.max(...allValues) / 10) * 10;
  const yScale = (v) => PADDING.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;
  const xMax = Math.max(1, data.length - 1);
  const xScale = (i) => PADDING.left + (i / xMax) * innerW;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / yTicks);
  const yPrefix = yLabel && /USD|barrel/i.test(yLabel) ? '$' : '';
  const xLabelStride = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      {caption && <div className="echo-chart-caption">{caption}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-chart-svg" role="img" aria-label={title || 'Chart'}>
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
            <text x={PADDING.left - 8} y={yScale(tv) + 4} textAnchor="end" className="echo-chart-tick">
              {yPrefix}
              {Math.round(tv)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          if (i % xLabelStride !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={xScale(i)} y={H - PADDING.bottom + 18} textAnchor="middle" className="echo-chart-tick">
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
              <text x={x} y={PADDING.top - 8} textAnchor="middle" className="echo-chart-annotation-label">
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
      <svg viewBox={`0 0 ${W} ${chartHeight}`} className="echo-chart-svg" role="img" aria-label={title || 'Chart'}>
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
      <svg viewBox={`0 0 ${W} ${H}`} className="echo-chart-svg" role="img" aria-label={title || 'Chart'}>
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
              <rect x={x} y={top} width={barWidth} height={Math.max(height, 1)} fill={color} rx="2" />
              <text x={x + barWidth / 2} y={top - 6} textAnchor="middle" className="echo-chart-bar-value">
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

function FredPpiChart({ title, caption, yLabel }) {
  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={FRED_PPI_DATA} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval={3}
            />
            <YAxis
              domain={[78, 102]}
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{
                value: yLabel || 'Index',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--echo-axis-tick, #6b7280)',
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1117',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8,
                color: '#f0f6fc',
                fontSize: '0.75rem',
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
  return (
    <figure className="echo-chart">
      {title && <div className="echo-chart-title">{title}</div>}
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={MARKET_FORECAST_DATA} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="year"
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis
              tick={{ fill: 'var(--echo-axis-tick, #8b949e)', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              label={{
                value: yLabel || 'USD Bn',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--echo-axis-tick, #6b7280)',
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1117',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 8,
                color: '#f0f6fc',
                fontSize: '0.7rem',
              }}
              formatter={(v, name) => [`$${Number(v).toFixed(1)}B`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '0.65rem', color: '#8b949e', paddingTop: 8 }}
              iconType="square"
              iconSize={10}
            />
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
      fetch(`/api/market-data/stock-candles?symbol=${sym}&range=1Y`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/market-data/stock-candles?symbol=${sym}&range=3Y`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([q, s, ytd, threeY]) => {
        if (cancelled) return;
        const up = (company.ticker || '').toUpperCase();
        const quoteObj =
          q?.quotes?.[0] || (up && q?.priceMap?.[up]) || (q?.price != null ? q : null);
        setQuote(quoteObj);
        setStats(s);
        setYtdChart((ytd?.candles || ytd?.data || []).map((c) => c.close ?? c.c).filter(Boolean));
        setThreeYChart((threeY?.candles || threeY?.data || []).map((c) => c.close ?? c.c).filter(Boolean));
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
    peRaw != null && peRaw !== '--' && !Number.isNaN(Number(peRaw)) ? Number(peRaw).toFixed(1) : null;
  const epsRaw = stats?.eps ?? null;
  const epsDisplay =
    epsRaw != null && epsRaw !== '--' && !Number.isNaN(Number(epsRaw)) ? `$${Number(epsRaw).toFixed(2)}` : null;
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
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
        <div style={{ padding: '1rem 0', textAlign: 'center', color: t.mutedColor, fontSize: '0.75rem' }}>
          <i className="bi bi-lock" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '0.4rem' }} />
          Private company — financial data not available.
        </div>
      )}

      {company.ticker && loading && (
        <div style={{ padding: '1.5rem 0', textAlign: 'center', color: t.mutedColor, fontSize: '0.75rem' }}>
          Loading {company.ticker} data…
        </div>
      )}

      {company.ticker && !loading && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
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
                  low52 && high52 ? `${Number(low52).toFixed(0)} – ${Number(high52).toFixed(0)}` : '—',
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
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 48 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill={`url(#${gradId})`} />
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

    /* Toggle buttons */
    btnBorderActive: '#6366f1',
    btnBorderInactive: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    btnBgActive: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    btnBgInactive: 'transparent',
    btnColorActive: isDark ? '#c7d2fe' : '#4338ca',
    btnColorInactive: isDark ? '#6b7280' : '#94a3b8',

    /* Industry button (same pattern but per-industry color) */
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
    (c) => activeContinents.has(c.continent) && activeIndustries.has(c.industry)
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
        {CONTINENTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggleContinent(c)}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: 4,
              border: activeContinents.has(c) ? `1px solid ${t.btnBorderActive}` : `1px solid ${t.btnBorderInactive}`,
              background: activeContinents.has(c) ? t.btnBgActive : t.btnBgInactive,
              color: activeContinents.has(c) ? t.btnColorActive : t.btnColorInactive,
              fontSize: '0.625rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            type="button"
            onClick={() => toggleIndustry(ind)}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: 4,
              border: activeIndustries.has(ind)
                ? `1px solid ${industryColor(ind)}`
                : `1px solid ${t.indBorderInactive}`,
              background: activeIndustries.has(ind) ? `${industryColor(ind)}22` : 'transparent',
              color: activeIndustries.has(ind) ? industryColor(ind) : t.indColorInactive,
              fontSize: '0.6rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 2,
                background: industryColor(ind),
                marginRight: 4,
              }}
            />
            {ind}
          </button>
        ))}
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
        <g fill={t.continentLabelFill} fontSize="9" fontFamily="sans-serif" fontWeight="600" letterSpacing="0.1em">
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
                <circle cx={x} cy={y} r={14} fill="none" stroke={t.highlightPulseStroke} strokeWidth={1} opacity={0.25}>
                  <animate attributeName="r" values="10;18;10" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.45;0.1;0.45" dur="2.5s" repeatCount="indefinite" />
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

        {hovered && (() => {
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
              <text x={tipX + 8} y={tipY + 28} fill={t.tooltipMetaFill} fontSize="7.5" fontFamily="sans-serif">
                {hovered.hq} · {hovered.industry}
              </text>
              <text x={tipX + 8} y={tipY + 40} fill={hc} fontSize="7.5" fontWeight="600" fontFamily="sans-serif">
                {hovered.ticker ? `${hovered.ticker}` : 'Private'}
              </text>
            </g>
          );
        })()}

        <text x={685} y={390} textAnchor="end" fill={t.counterFill} fontSize="8" fontFamily="sans-serif">
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
    <figure className="echo-chart echo-sector-chart-block" aria-label={yLabel ? `${title}. ${yLabel}` : title || 'Sector dominance chart'}>
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
                <linearGradient key={era.sector} id={`echo-grad-${era.sector}`} x1="0" y1="0" x2="0" y2="1">
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
              content={(tooltipProps) => <SectorDominanceTooltip {...tooltipProps} setHoverYear={setHoverYear} />}
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

export default function EchoArticleClient({ article }) {
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
    <EchoKeywordProvider>
      <div className="echo-article-page">
        <div className="echo-article-page-inset">
          <Link href="/ezana-echo" className="echo-back">
            <i className="bi bi-arrow-left" aria-hidden /> Back to Ezana Echo
          </Link>

          <article className="echo-article-shell">
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
            </header>

            <div className="echo-article-body">
              {Array.isArray(blocks) && blocks.length > 0
                ? blocks.map((block, i) => <ArticleBlock key={i} block={block} />)
                : paragraphs.map((p, i) => (
                    <ParagraphWithKeywords key={i} text={p} />
                  ))}
            </div>

            <div className="echo-article-footer">
              <EchoArticleEngagement articleId={article.id} />
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
                    <span className="echo-related-card-kicker">{(a.category || 'markets').toUpperCase()}</span>
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
