'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ModelCardShell } from '@/components/research/ModelCardShell';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';
import { useSectorPerformance } from '@/hooks/useSectorPerformance';
import { resolveSectorQuery } from '@/lib/fmp/sector-performance';
import { SectorDetailModal } from './SectorDetailModal';
import { DateSelector } from '@/components/ui/DateSelector';

const RANGES = ['1D', '1W', '1M', 'YTD'];

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

function SectorRow({ row, maxAbs, isHighlighted, onClick, rowRef }) {
  const pct = Number.isFinite(row.changePct) ? row.changePct : 0;
  const isPos = pct >= 0;
  const widthPct = maxAbs > 0 ? Math.min(50, (Math.abs(pct) / maxAbs) * 50) : 0;

  return (
    <button
      type="button"
      ref={rowRef}
      className={`shm-sector-row ${isHighlighted ? 'shm-sector-row--highlighted' : ''}`}
      onClick={() => onClick(row)}
      aria-label={`Open ${row.name} sector details`}
    >
      <span className={`shm-sector-dot ${isPos ? 'is-pos' : 'is-neg'}`} aria-hidden />
      <span className="shm-sector-name">{row.name}</span>
      <span className="sbar" aria-hidden>
        <span className="sbar-track">
          {widthPct > 0 && (
            <i
              className={`sbar-fill ${isPos ? 'is-pos' : 'is-neg'}`}
              style={isPos ? { width: `${widthPct}%` } : { width: `${widthPct}%` }}
            />
          )}
        </span>
      </span>
      <span className={`shm-sector-pct lf-mono ${isPos ? 'pos' : 'neg'}`}>{formatChange(pct)}</span>
    </button>
  );
}

export function SectorHeatmap() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const targetSectorName = searchParams.get('sector');
  const rowRefs = useRef({});
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

  const maxAbs = useMemo(() => {
    const vals = sorted.map((s) => Math.abs(s.changePct)).filter(Number.isFinite);
    return vals.length ? Math.max(...vals) : 0;
  }, [sorted]);

  const { leftCol, rightCol } = useMemo(() => {
    const left = sorted.slice(0, 6);
    const right = sorted.slice(6);
    return { leftCol: left, rightCol: right };
  }, [sorted]);

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

  const handleRowClick = (row) => {
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
      const node = rowRefs.current[normalized];
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
      { label: 'Window', value: range, format: undefined },
      { label: 'Sectors', value: sorted.length, format: 'number' },
      { label: 'As of', value: asOf || '—', format: undefined },
      {
        label: 'Top move',
        value: best ? formatChange(best.changePct) : '—',
        format: undefined,
        emphasis: true,
      },
      {
        label: 'Bottom move',
        value: worst ? formatChange(worst.changePct) : '—',
        format: undefined,
        emphasis: 'negative',
      },
      { label: 'Data quality', value: degraded ? 'Partial' : 'Full', format: undefined },
    ],
    [range, sorted.length, asOf, best, worst, degraded],
  );

  const rangeControl = <DateSelector ranges={RANGES} value={range} onChange={setRange} size="xs" />;

  const renderColumn = (rows) =>
    rows.map((s) => {
      const label = s.name || s.sector || '';
      const sectorKey = label.toLowerCase();
      const isHighlighted = highlightedSector === sectorKey;
      return (
        <SectorRow
          key={s.sector || s.name}
          row={s}
          maxAbs={maxAbs}
          isHighlighted={isHighlighted}
          onClick={handleRowClick}
          rowRef={(node) => {
            if (node) rowRefs.current[sectorKey] = node;
          }}
        />
      );
    });

  return (
    <>
      <ModelCardShell
        icon="bi-grid-3x3-gap"
        title="Sector Performance"
        description={describeRange(range, asOf)}
        actions={rangeControl}
      >
        <ModelVariableStrip variables={stripVariables} />
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

        <div className="shm-sector-list" aria-live="polite">
          {isLoading ? (
            <div className="shm-sector-list-skeleton" aria-label="Loading sectors">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="shm-skeleton-row" />
              ))}
            </div>
          ) : (
            <>
              <div className="shm-sector-col">{renderColumn(leftCol)}</div>
              <div className="shm-sector-col">{renderColumn(rightCol)}</div>
            </>
          )}
        </div>
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
