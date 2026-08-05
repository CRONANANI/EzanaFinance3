'use client';

/**
 * The six OECD lens pills (All + Growth/Households/Inflation/Rates/Government/
 * External). Extracted from the client so it can serve two homes: the page-level
 * pill row (when the empire-dimension matrix payload is unavailable — the OECD
 * fallback) and, when the matrix shows empire dimensions, a compact local control
 * inside the radar card that drives the OECD radar axes + `ind` reset.
 */
import { OECD_LENSES } from '@/lib/oecd-curated';
import { lensLabel } from './oecd-explorer-model';

export const LENS_PILLS = [{ id: 'all', label: 'All' }, ...OECD_LENSES];

export default function OecdLensPills({ lens, onLens, showCaption = true, compact = false }) {
  return (
    <nav
      className={`oecd-lenses ${compact ? 'oecd-lenses--compact' : ''}`}
      aria-label="Indicator lens"
    >
      {LENS_PILLS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`oecd-lens-pill ${l.id === lens ? 'is-active' : ''}`}
          aria-pressed={l.id === lens}
          onClick={() => onLens(l.id)}
        >
          {l.label}
        </button>
      ))}
      {showCaption ? <span className="oecd-lens-caption">{lensLabel(lens)}</span> : null}
    </nav>
  );
}
