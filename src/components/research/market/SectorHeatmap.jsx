'use client';

import { useMemo, useState } from 'react';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { useSectorPerformance } from '@/hooks/useSectorPerformance';
import { GICS_SECTORS } from '@/lib/stress-test';

const RANGES = ['1D', '1W', '1M', 'YTD'];

/**
 * Returns a subtle tile background — green for gains, red for losses. We cap
 * the intensity at ±3% so a single extreme outlier doesn't blow out the
 * visual scale on calm days.
 */
function tintFor(changePct) {
  const v = Number.isFinite(changePct) ? changePct : 0;
  const clamped = Math.max(-3, Math.min(3, v));
  const intensity = Math.abs(clamped) / 3;
  if (clamped >= 0) {
    return `rgba(16, 185, 129, ${0.12 + intensity * 0.45})`;
  }
  return `rgba(239, 68, 68, ${0.12 + intensity * 0.45})`;
}

function formatChange(value) {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function SectorHeatmap() {
  const [range, setRange] = useState('1D');
  const { sectors, isLoading, error } = useSectorPerformance(range);

  const tiles = useMemo(() => {
    const byName = new Map(
      (sectors || []).map((s) => [s.name, { ...s, changePct: Number(s.changePct) }]),
    );
    // Keep stable GICS ordering but fall back to whatever FMP returned for
    // sectors we didn't predeclare (e.g. 'Health' vs 'Health Care' naming).
    const merged = GICS_SECTORS.map((name) => {
      const match = byName.get(name);
      if (match) {
        byName.delete(name);
        return match;
      }
      return { name, changePct: null };
    });
    for (const extra of byName.values()) merged.push(extra);
    return merged.sort((a, b) => {
      if (a.changePct == null && b.changePct == null) return 0;
      if (a.changePct == null) return 1;
      if (b.changePct == null) return -1;
      return b.changePct - a.changePct;
    });
  }, [sectors]);

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
      description="How each S&P 500 sector is moving"
      actions={rangeControl}
    >
      {error && (
        <div className="shm-warning">
          <i className="bi bi-exclamation-triangle" />
          <span>{error}</span>
        </div>
      )}

      <div className="shm-grid" aria-live="polite">
        {isLoading
          ? GICS_SECTORS.map((name) => (
              <div key={name} className="shm-skeleton-tile" aria-label={`Loading ${name}`} />
            ))
          : tiles.map((s) => (
              <div
                key={s.name}
                className="shm-tile"
                style={{ backgroundColor: tintFor(s.changePct) }}
                title={s.name}
              >
                <div className="shm-tile-name">{s.name}</div>
                <div className="shm-tile-value">{formatChange(s.changePct)}</div>
              </div>
            ))}
      </div>
    </ModelCardShell>
  );
}

export default SectorHeatmap;
