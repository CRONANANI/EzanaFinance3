'use client';

import { useState } from 'react';
import { CustomDateCalendar } from '@/components/ui/CustomDateCalendar';

function toISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function fmtDisplay(date) {
  return date
    ? date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : '';
}

/**
 * SingleDateField — a form-style single-date input that opens the unified
 * calendar. Emits/accepts an ISO 'YYYY-MM-DD' string so it drops in for a raw
 * <input type="date"> without changing the caller's stored format.
 */
function SingleDateField({
  value,
  onChange,
  variant = 'default',
  numberOfMonths = 1,
  showMonthYearDropdowns = true,
  disabled = false,
  placeholder = 'Select date',
  className,
  style,
}) {
  const [open, setOpen] = useState(false);
  const accentColor = variant === 'partner' ? '#d4a853' : '#10b981';
  const date = parseISO(value);
  return (
    <>
      <button
        type="button"
        className={`ezdp-field${className ? ` ${className}` : ''}`}
        style={{ '--brand': accentColor, ...style }}
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
      >
        <svg
          className="ezdp-field__icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
        >
          <path
            d="M5.5 0.5V2H10.5V0.5H12V2H14H15.5V3.5V13.5C15.5 14.88 14.38 16 13 16H3C1.62 16 0.5 14.88 0.5 13.5V3.5V2H2H4V0.5H5.5ZM2 7.5V13.5C2 14.05 2.45 14.5 3 14.5H13C13.55 14.5 14 14.05 14 13.5V7.5H2Z"
            fill="currentColor"
          />
        </svg>
        <span className={`ezdp-field__value${date ? '' : ' ezdp-field__value--placeholder'}`}>
          {date ? fmtDisplay(date) : placeholder}
        </span>
      </button>
      {open && (
        <CustomDateCalendar
          variant={variant}
          mode="single"
          numberOfMonths={numberOfMonths}
          showMonthYearDropdowns={showMonthYearDropdowns}
          value={date ? { start: date, end: date } : null}
          onChange={(d) => {
            onChange(toISO(d));
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * DateSelector — unified, theme-aware date selector. Single source of truth for
 * ALL date selection across the platform (regular user, partner, organization).
 *
 * Props
 * - mode:               'range' (default) | 'single'      — pill/range picker vs a single-date field
 * - ranges:             string[]                          — preset labels (range mode)
 * - value:              string                            — selected label (range) or ISO date (single)
 * - onChange:           (range: string) => void  |  (isoDate: string) => void
 * - size:               'xs' | 'sm' | 'md' | 'lg'         — defaults to 'sm' (range mode)
 * - variant:            'default' | 'partner' | 'org'     — brand variant (emerald/gold)
 * - inactiveTextColor:  string                            — text color for non-selected pills
 * - showCustomDateButton: boolean                         — show the custom range picker (default true)
 * - onCustomDateChange: (range: {start,end}|null) => void — fires when a custom range is applied
 * - numberOfMonths:     1 (default) | 2                   — months shown in the calendar
 * - showMonthYearDropdowns: boolean                       — month + year quick-nav in the calendar
 * - disabled, placeholder, className, style               — (single mode) field passthroughs
 */
export function DateSelector({
  mode = 'range',
  ranges,
  value,
  onChange,
  size = 'sm',
  variant = 'default',
  inactiveTextColor,
  showCustomDateButton = true,
  onCustomDateChange,
  numberOfMonths = 1,
  showMonthYearDropdowns = false,
  disabled = false,
  placeholder,
  className,
  style,
}) {
  const [showCalendar, setShowCalendar] = useState(false);

  const accentColor = variant === 'partner' ? '#d4a853' : '#10b981';

  if (mode === 'single') {
    return (
      <SingleDateField
        value={value}
        onChange={onChange}
        variant={variant}
        numberOfMonths={numberOfMonths}
        showMonthYearDropdowns={showMonthYearDropdowns}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        style={style}
      />
    );
  }

  const inactiveColor =
    inactiveTextColor || (variant === 'partner' ? '#a8956f' : 'var(--text-muted, #8b949e)');

  const sizeMap = {
    xs: { padding: '0.11rem 0.26rem', fontSize: '0.41rem' },
    sm: { padding: '0.15rem 0.30rem', fontSize: '0.43rem' },
    md: { padding: '0.18rem 0.35rem', fontSize: '0.48rem' },
    // 'lg' matches the dashboard "My Holdings" pill size (the platform reference size).
    lg: { padding: '0.3rem 0.625rem', fontSize: '0.625rem' },
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
          mode="range"
          numberOfMonths={numberOfMonths}
          showMonthYearDropdowns={showMonthYearDropdowns}
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
