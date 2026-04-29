'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import { useSectorPerformance } from '@/hooks/useSectorPerformance';
import { resolveSectorQuery } from '@/lib/fmp/sector-performance';
import { SectorDetailModal } from './SectorDetailModal';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const targetSectorName = searchParams.get('sector');
  const tileRefs = useRef({});
  const [highlightedSector, setHighlightedSector] = useState(null);

  const [range, setRange] = useState('1D');
  const { sectors, asOf, degraded, error, isLoading } = useSectorPerformance(range);

  const [modalSector, setModalSector] = useState(null);
  const [modalTitle, setModalTitle] = useState(null);

  useEffect(() => {
    const raw = targetSectorName?.trim();
    if (!raw) {
      setModalSector(null);
      setModalTitle(null);
      return;
    }
    const { canonical, display } = resolveSectorQuery(raw);
    if (canonical) {
      setModalSector(canonical);
      setModalTitle(display);
    }
  }, [targetSectorName]);

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

  const modalRow = useMemo(
    () => (modalSector ? sorted.find((s) => s.sector === modalSector) : null),
    [sorted, modalSector],
  );

  const modalHeader = useMemo(() => {
    if (!modalSector) return null;
    if (modalRow && Number.isFinite(modalRow.changePct)) {
      return { changePct: modalRow.changePct, range };
    }
    return { range };
  }, [modalSector, modalRow, range]);

  const handleTileClick = (row) => {
    setModalSector(row.sector);
    setModalTitle(row.name);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sector', row.sector);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleModalClose = () => {
    setModalSector(null);
    setModalTitle(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sector');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  useEffect(() => {
    const raw = targetSectorName?.trim();
    if (!raw) return undefined;

    let highlightClearTimer;

    const scrollTimer = setTimeout(() => {
      const { display } = resolveSectorQuery(raw);
      const label = display || raw;
      const normalized = label.toLowerCase();
      const node = tileRefs.current[normalized];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedSector(normalized);
        highlightClearTimer = setTimeout(() => setHighlightedSector(null), 4000);
      }
    }, 600);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(highlightClearTimer);
    };
  }, [targetSectorName, sectors?.length]);

  const { best, worst } = useMemo(() => {
    const rows = sorted.filter((s) => Number.isFinite(s.changePct));
    if (rows.length === 0) return { best: null, worst: null };
    return { best: rows[0], worst: rows[rows.length - 1] };
  }, [sorted]);

  const stripVariables = useMemo(
    () => [
      { label: 'Time window', value: range, format: undefined },
      { label: 'Sectors', value: sorted.length, format: 'number' },
      { label: 'As of', value: asOf || '—', format: undefined },
      { label: 'Top move', value: best ? formatChange(best.changePct) : '—', format: undefined },
      { label: 'Bottom move', value: worst ? formatChange(worst.changePct) : '—', format: undefined },
      { label: 'Data quality', value: degraded ? 'Partial' : 'Full', format: undefined },
    ],
    [range, sorted.length, asOf, best, worst, degraded],
  );

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
    <>
      <ModelCardShell
        icon="bi-grid-3x3-gap"
        title="Sector performance"
        description={describeRange(range, asOf)}
        actions={rangeControl}
      >
        <ModelVariableStrip variables={stripVariables} className="mb-1" />
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
            : sorted.map((s) => {
                const label = s.name || s.sector || '';
                const sectorKey = label.toLowerCase();
                const isHighlighted = highlightedSector === sectorKey;
                return (
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) tileRefs.current[sectorKey] = node;
                    }}
                    key={s.sector || s.name}
                    className={`shm-tile shm-tile--clickable ${isHighlighted ? 'shm-tile--highlighted' : ''}`}
                    style={{ backgroundColor: tintFor(s.changePct, range) }}
                    title={`Click to see ${s.name} details`}
                    onClick={() => handleTileClick(s)}
                    aria-label={`Open ${s.name} sector details`}
                  >
                    <div className="shm-tile-name">{s.name}</div>
                    <div className="shm-tile-value">{formatChange(s.changePct)}</div>
                  </button>
                );
              })}
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

      <SectorDetailModal
        sector={modalSector}
        displayName={modalTitle}
        changePct={modalHeader?.changePct}
        range={range}
        isOpen={Boolean(modalSector)}
        onClose={handleModalClose}
      />
    </>
  );
}

export default SectorHeatmap;
