'use client';

/**
 * StatCard — compact label + value card used across home dashboard,
 * for-the-quants, community KPIs, and portfolio stat rows.
 *
 * Props
 * - icon:         ReactNode | string                   — optional leading glyph
 * - label:        ReactNode                             — uppercased small caption
 * - value:        ReactNode                             — main numeric/text value
 * - sub:          ReactNode                             — optional secondary line (e.g. % change)
 * - accentColor:  string                                — color applied to `value`
 * - onClick:      () => void                            — if provided, renders as <button>
 * - className:    string                                — extra wrapper class
 * - style:        CSSProperties                         — extra wrapper style
 */
export function StatCard({
  icon,
  label,
  value,
  sub,
  accentColor,
  onClick,
  className = '',
  style,
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      className={`ui-stat-card ${className}`.trim()}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      style={{
        background: 'var(--surface-card, rgba(16,185,129,0.02))',
        border: '1px solid var(--border-primary, rgba(16,185,129,0.08))',
        borderRadius: 10,
        padding: '0.4rem 0.75rem',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {icon && <div style={{ fontSize: '0.7rem', marginBottom: '0.1rem' }}>{icon}</div>}
      <div
        style={{
          fontSize: '0.5rem',
          fontWeight: 600,
          color: 'var(--text-faint)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 800,
          color: accentColor || 'var(--text-primary)',
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
          {sub}
        </div>
      )}
    </Wrapper>
  );
}

export default StatCard;
