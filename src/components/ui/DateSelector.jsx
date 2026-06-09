'use client';

import { useState } from 'react';
import { CustomDateCalendar } from '@/components/ui/CustomDateCalendar';

/**
 * DateSelector — unified, theme-aware date range selector.
 * Single source of truth for ALL date selection across the platform
 * (regular user, partner, and organization versions).
 *
 * Props
 * - ranges:             string[]                          — preset labels to render
 * - value:              string                            — currently selected label
 * - onChange:           (range: string) => void
 * - size:               'xs' | 'sm' | 'md'               — defaults to 'sm'
 * - variant:            'default' | 'partner' | 'org'     — brand variant
 * - inactiveTextColor:  string                            — text color for non-selected pills
 * - showCustomDateButton: boolean                         — show the custom date range picker (default true)
 * - onCustomDateChange: (range: {start,end}|null) => void — fires when a custom range is applied
 * - className:          string
 * - style:              CSSProperties
 */
export function DateSelector({
  ranges,
  value,
  onChange,
  size = 'sm',
  variant = 'default',
  inactiveTextColor,
  showCustomDateButton = true,
  onCustomDateChange,
  className,
  style,
}) {
  const [showCalendar, setShowCalendar] = useState(false);

  const accentColor = variant === 'partner' ? '#d4a853' : '#10b981';
  const inactiveColor =
    inactiveTextColor || (variant === 'partner' ? '#a8956f' : 'var(--text-muted, #8b949e)');

  const sizeMap = {
    xs: { padding: '0.11rem 0.26rem', fontSize: '0.41rem' },
    sm: { padding: '0.15rem 0.30rem', fontSize: '0.43rem' },
    md: { padding: '0.18rem 0.35rem', fontSize: '0.48rem' },
  };
  const sizes = sizeMap[size] || sizeMap.sm;

  const isCustomActive = value === 'CUSTOM';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.20rem',
        flexWrap: 'wrap',
        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui)',
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
            fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui)',
            background: value === r ? accentColor : 'rgba(107, 114, 128, 0.1)',
            color: value === r ? '#fff' : inactiveColor,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
          }}
        >
          {r}
        </button>
      ))}

      {showCustomDateButton && (
        <button
          type="button"
          onClick={() => setShowCalendar(true)}
          aria-pressed={isCustomActive}
          title="Select a custom date range"
          style={{
            padding: sizes.padding,
            borderRadius: 4,
            border: `1px solid ${isCustomActive ? accentColor : 'var(--border-primary, rgba(107,114,128,0.25))'}`,
            fontSize: sizes.fontSize,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui)',
            background: isCustomActive ? accentColor : 'transparent',
            color: isCustomActive ? '#fff' : accentColor,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path
              d="M5.5 0.5V2H10.5V0.5H12V2H14H15.5V3.5V13.5C15.5 14.88 14.38 16 13 16H3C1.62 16 0.5 14.88 0.5 13.5V3.5V2H2H4V0.5H5.5ZM2 7.5V13.5C2 14.05 2.45 14.5 3 14.5H13C13.55 14.5 14 14.05 14 13.5V7.5H2Z"
              fill="currentColor"
            />
          </svg>
          Custom
        </button>
      )}

      {showCalendar && (
        <CustomDateCalendar
          variant={variant}
          value={null}
          onChange={(range) => {
            if (range && range.start && range.end) {
              onChange('CUSTOM');
              onCustomDateChange?.(range);
            }
            setShowCalendar(false);
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}

export default DateSelector;
