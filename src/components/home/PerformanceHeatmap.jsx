'use client';

/**
 * Home: "Top performers" heat map, under the My Portfolio figures (Nov 2026).
 *
 * The user's best positions as a treemap: each tile's area is the position's
 * value and its colour strength is its return (All time or Today), so the
 * strongest green is always the best performer. Tiles open the company in
 * Research. Layout and colour logic: src/lib/home/performance-heatmap.js.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  HEATMAP_METRICS,
  fmtSignedPct,
  heatmapTiles,
  mixPct,
  onStrong,
} from '@/lib/home/performance-heatmap';

export function PerformanceHeatmap({ status, positions, onAddPortfolio }) {
  const [metric, setMetric] = useState('total');
  const tiles = useMemo(() => heatmapTiles(positions, metric), [positions, metric]);
  const metricLabel = HEATMAP_METRICS.find((m) => m.id === metric)?.label || '';

  let body;
  if (status === 'loading') {
    body = <div className="bs-heat-map bs-heat-skel" aria-hidden="true" />;
  } else if (status === 'error') {
    body = (
      <p className="bs-heat-empty">Your holdings could not load. Refresh the page to try again.</p>
    );
  } else if (status === 'empty') {
    body = (
      <p className="bs-heat-empty">
        Your best performers show here once you hold something.{' '}
        {onAddPortfolio ? (
          <button type="button" className="bs-heat-link" onClick={onAddPortfolio}>
            Add a portfolio
          </button>
        ) : null}
      </p>
    );
  } else if (!tiles.length) {
    body = (
      <p className="bs-heat-empty">
        {metric === 'day'
          ? 'No price moves yet today.'
          : 'Returns appear once your positions have prices.'}
      </p>
    );
  } else {
    body = (
      <ul className="bs-heat-map" aria-label={`Top performers, ${metricLabel.toLowerCase()}`}>
        {tiles.map((t) => {
          const small = t.w < 14 || t.h < 30;
          const style = {
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: `${t.w}%`,
            height: `${t.h}%`,
            '--bs-heat-mix': `${mixPct(t.strength)}%`,
          };
          return (
            <li key={t.ticker} className="bs-heat-cell" style={style}>
              <Link
                href={`/company-research?ticker=${encodeURIComponent(t.ticker)}`}
                className={`bs-heat-tile is-${t.tone}${onStrong(t.strength) ? ' is-strong' : ''}${small ? ' is-small' : ''}`}
                title={`${t.ticker}${t.name ? ` · ${t.name}` : ''}: ${fmtSignedPct(t.pct)}`}
              >
                <span className="bs-heat-sym">{t.ticker}</span>
                <span className="bs-heat-pct">{fmtSignedPct(t.pct)}</span>
                <span className="bs-sr">{`, ${metricLabel.toLowerCase()} return. Open in Research.`}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="bs-heat">
      <div className="bs-heat-head">
        <div className="bs-heat-title">Top performers</div>
        <div className="bs-heat-seg" role="group" aria-label="Return period">
          {HEATMAP_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`bs-heat-seg-btn${m.id === metric ? ' is-on' : ''}`}
              aria-pressed={m.id === metric}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {body}
      {status === 'ready' && tiles.length ? (
        <p className="bs-heat-note">Tile size is position value; colour is return.</p>
      ) : null}
    </div>
  );
}
