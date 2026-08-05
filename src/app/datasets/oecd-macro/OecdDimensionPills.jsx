'use client';

/**
 * Page-level pill row for the empire-dimension matrix: `All` + the 18 Dalio power
 * dimensions (ordered by display_order), each with a 5px category dot. LIVE-ONLY
 * honesty: dimensions without live scores are visible (so the 18-framework is
 * legible) but disabled and carry a "data source pending" tooltip — they are
 * never selectable and never render mock data.
 */

/** Category → CSS dot token. */
function catToken(category) {
  switch (category) {
    case 'Economic':
      return 'var(--oecd-dim-cat-economic)';
    case 'Power Projection':
      return 'var(--oecd-dim-cat-power)';
    case 'Social':
      return 'var(--oecd-dim-cat-social)';
    default:
      return 'var(--oecd-dim-cat-other)';
  }
}

const PENDING_TIP = 'Data source pending — not yet scored from live sources.';

export default function OecdDimensionPills({ dimensions, dim, onDim }) {
  return (
    <nav className="oecd-dimpills" aria-label="Empire power dimension">
      <button
        type="button"
        className={`oecd-dimpill ${dim === 'all' ? 'is-active' : ''}`}
        aria-pressed={dim === 'all'}
        onClick={() => onDim('all')}
      >
        All
      </button>
      {dimensions.map((d) => {
        const disabled = !d.has_data;
        return (
          <button
            key={d.id}
            type="button"
            className={`oecd-dimpill ${dim === d.id ? 'is-active' : ''} ${
              disabled ? 'is-pending' : ''
            }`}
            aria-pressed={dim === d.id}
            aria-disabled={disabled || undefined}
            disabled={disabled}
            title={disabled ? PENDING_TIP : `${d.name} (${d.category || '—'})`}
            onClick={() => !disabled && onDim(d.id)}
          >
            <span
              className="oecd-dimpill-dot"
              style={{ background: catToken(d.category) }}
              aria-hidden="true"
            />
            {d.short || d.name}
          </button>
        );
      })}
    </nav>
  );
}
