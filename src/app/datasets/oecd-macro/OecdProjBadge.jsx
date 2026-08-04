'use client';

/**
 * Amber hatched "projection" badge — the single, reused treatment for any figure
 * or view showing OECD projected years (2024–25), per the design. Defined once
 * (CSS: .oecd-proj-badge) and imported everywhere a projection is surfaced so the
 * treatment never drifts.
 */
export default function OecdProjBadge({ year, label, className = '' }) {
  const text = label || (year ? `${year} · proj` : '2024–25 proj');
  return (
    <span className={`oecd-proj-badge ${className}`} title="OECD projection, not an actual">
      {text}
    </span>
  );
}
