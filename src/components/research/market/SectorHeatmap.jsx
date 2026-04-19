'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { useSectorPerformance } from '@/hooks/useSectorPerformance';

const RANGES = ['1D', '1W', '1M', 'YTD'];

/**
 * Range-aware tint: a +2% day is impressive; a +2% YTD is unremarkable.
 * Scale the ceiling with the window so the green↔red gradient stays
 * meaningful instead of collapsing into washed-out pastel on longer ranges.
 */
function tintFor(changePct, range) {
  const v = Number.isFinite(changePct) ? changePct : 0;
  const ceiling = range === '1D' ? 3 : range === '1W' ? 6 : range === '1M' ? 12 : 25;
  const clamped = Math.max(-ceiling, Math.min(ceiling, v));
  const intensity = Math.abs(clamped) / ceiling;
  if (clamped >= 0) return `rgba(16, 185, 129, ${0.12 + intensity * 0.5})`;
  return `rgba(239, 68, 68, ${0.12 + intensity * 0.5})`;
}

function formatChange(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function describeRange(range, asOf) {
  const base = (() => {
    switch (range) {
      case '1D':
        return 'Most recent trading-day move by sector';
      case '1W':
        return '5-day cumulative return, compounded daily';
      case '1M':
        return '21-day cumulative return, compounded daily';
      case 'YTD':
      default:
        return 'Year to date, compounded daily';
    }
  })();
  return asOf ? `${base} · as of ${asOf}` : base;
}

export function SectorHeatmap() {
  const [range, setRange] = useState('1D');
  const { sectors, asOf, degraded, error, isLoading } = useSectorPerformance(range);

  const sorted = useMemo(() => {
    const rows = (sectors || []).map((s) => ({ ...s, changePct: Number(s.changePct) }));
    return rows.sort((a, b) => {
      const aNum = Number.isFinite(a.changePct);
      const bNum = Number.isFinite(b.changePct);
      if (!aNum && !bNum) return 0;
      if (!aNum) return 1;
      if (!bNum) return -1;
      return b.changePct - a.changePct;
    });
  }, [sectors]);

  const { best, worst } = useMemo(() => {
    const rows = sorted.filter((s) => Number.isFinite(s.changePct));
    if (rows.length === 0) return { best: null, worst: null };
    return { best: rows[0], worst: rows[rows.length - 1] };
  }, [sorted]);

  const rangeControl = (
    <div className="shm-range-group" role="tablist" aria-label="Time range">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={range === r}
          onClick={() => setRange(r)}
          className={`shm-range-btn ${range === r ? 'is-active' : ''}`}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <ModelCardShell
      icon="bi-grid-3x3-gap"
      title="Sector performance"
      description={describeRange(range, asOf)}
      actions={rangeControl}
    >
      {error && !isLoading && (
        <div className="shm-error" role="alert">
          <i className="bi bi-exclamation-triangle" />
          <div className="shm-error-body">
            <div className="shm-error-message">{error.message}</div>
            {error.detail && <div className="shm-error-detail">{error.detail}</div>}
          </div>
        </div>
      )}

      {degraded && !error && !isLoading && (
        <div className="shm-warning">
          <i className="bi bi-info-circle" />
          <span>{degraded.reason}</span>
        </div>
      )}

      <div className="shm-grid" aria-live="polite">
        {isLoading
          ? Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="shm-skeleton-tile" aria-label="Loading sector" />
            ))
          : sorted.map((s) => (
              <div
                key={s.sector || s.name}
                className="shm-tile"
                style={{ backgroundColor: tintFor(s.changePct, range) }}
                title={s.name}
              >
                <div className="shm-tile-name">{s.name}</div>
                <div className="shm-tile-value">{formatChange(s.changePct)}</div>
              </div>
            ))}
      </div>

      {!isLoading && !error && best && worst && best !== worst && (
        <div className="shm-summary">
          <span className="shm-summary-item">
            <span className="shm-summary-label">Top</span>
            <span className="shm-summary-name shm-summary-name--up">{best.name}</span>
            <span className="shm-summary-value shm-summary-value--up">
              {formatChange(best.changePct)}
            </span>
          </span>
          <span className="shm-summary-item">
            <span className="shm-summary-label">Bottom</span>
            <span className="shm-summary-name shm-summary-name--down">{worst.name}</span>
            <span className="shm-summary-value shm-summary-value--down">
              {formatChange(worst.changePct)}
            </span>
          </span>
        </div>
      )}
    </ModelCardShell>
  );
}

export default SectorHeatmap;
