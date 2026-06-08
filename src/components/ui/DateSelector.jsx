'use client';

/**
 * DateSelector — unified, theme-aware date range selector.
 *
 * Props
 * - ranges:             string[]                          — labels to render
 * - value:              string                            — currently selected label
 * - onChange:           (range: string) => void
 * - size:               'xs' | 'sm' | 'md'               — defaults to 'sm'
 * - variant:            'default' | 'partner' | 'org'     — brand variant
 * - inactiveTextColor:  string                            — text color for non-selected pills
 * - className:          string                            — optional wrapper class
 * - style:              CSSProperties                     — optional wrapper style
 */
export function DateSelector({
  ranges,
  value,
  onChange,
  size = 'sm',
  variant = 'default',
  inactiveTextColor,
  className,
  style,
}) {
  const accentColor = variant === 'partner' ? '#d4a853' : '#10b981';
  const inactiveColor =
    inactiveTextColor || (variant === 'partner' ? '#a8956f' : 'var(--text-muted, #8b949e)');

  const sizeMap = {
    xs: { padding: '0.11rem 0.26rem', fontSize: '0.41rem' },
    sm: { padding: '0.15rem 0.30rem', fontSize: '0.43rem' },
    md: { padding: '0.18rem 0.35rem', fontSize: '0.48rem' },
  };
  const sizes = sizeMap[size] || sizeMap.sm;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.20rem',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {ranges.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={value === r}
          style={{
            padding: sizes.padding,
            borderRadius: 4,
            border: 'none',
            fontSize: sizes.fontSize,
            fontWeight: 700,
            cursor: 'pointer',
            background: value === r ? accentColor : 'rgba(107, 114, 128, 0.1)',
            color: value === r ? '#fff' : inactiveColor,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

export default DateSelector;
