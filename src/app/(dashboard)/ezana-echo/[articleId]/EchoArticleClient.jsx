'use client';

import Link from 'next/link';
import { EchoArticleEngagement } from '@/components/echo/EchoArticleEngagement';
import { formatPublishedDate, getAllArticles, getRelatedArticles } from '@/lib/ezana-echo-mock';

import '../../../../../app-legacy/assets/css/theme.css';
import '../../../../../app-legacy/assets/css/unified-component-cards.css';
import '../../../../../app-legacy/assets/css/pages-common.css';
import '../../../../../app-legacy/assets/css/light-mode-fixes.css';
import '../../../../../app-legacy/pages/home-dashboard.css';
import '../ezana-echo.css';

function ArticleBlock({ block }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.text}</p>;

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
                  <p key={i}>{p}</p>
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
  );
}
