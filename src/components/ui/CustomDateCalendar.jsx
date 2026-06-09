'use client';

import { useState } from 'react';

const BRAND = { default: '#10b981', partner: '#d4a853', org: '#10b981' };
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmt(d) {
  return d
    ? `${MONTHS[d.getMonth()].slice(0, 3)} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`
    : '';
}

/** Build the 6-week grid (Mon-first) for a given month */
function buildDays(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  // Monday-first offset
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function CustomDateCalendar({ variant = 'default', value, onChange, onClose }) {
  const brand = BRAND[variant] || BRAND.default;
  const [viewDate, setViewDate] = useState(value?.start || new Date());
  const [range, setRange] = useState({ start: value?.start || null, end: value?.end || null });
  const [hoverDate, setHoverDate] = useState(null);

  const days = buildDays(viewDate);
  const today = new Date();

  const handleDayClick = (day) => {
    if (!range.start || (range.start && range.end)) {
      setRange({ start: startOfDay(day), end: null });
    } else if (day >= range.start) {
      setRange({ start: range.start, end: endOfDay(day) });
    } else {
      setRange({ start: startOfDay(day), end: endOfDay(range.start) });
    }
  };

  const inRange = (day) => {
    if (!range.start) return false;
    const end = range.end || hoverDate;
    if (!end) return false;
    const lo = range.start < end ? range.start : end;
    const hi = range.start < end ? end : range.start;
    return day >= startOfDay(lo) && day <= endOfDay(hi);
  };

  const apply = () => {
    if (range.start && range.end) onChange(range);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '8vh',
        fontFamily: 'var(--font-sans, "Plus Jakarta Sans", system-ui)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-secondary, #0d1117)',
          border: '1px solid var(--border-primary, rgba(16,185,129,0.1))',
          borderRadius: 12,
          padding: 20,
          width: 340,
          maxWidth: '92vw',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <span
            style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f0f6fc)' }}
          >
            Custom Date Range
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              color: 'var(--text-muted, #8b949e)',
            }}
          >
            ×
          </button>
        </div>

        {/* Month nav */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <button
            onClick={() =>
              setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
            }
            aria-label="Previous month"
            style={navBtn}
          >
            ‹
          </button>
          <span
            style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary, #f0f6fc)' }}
          >
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            onClick={() =>
              setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
            }
            aria-label="Next month"
            style={navBtn}
          >
            ›
          </button>
        </div>

        {/* Day labels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            marginBottom: 6,
          }}
        >
          {DAY_LABELS.map((d, i) => (
            <div
              key={i}
              style={{
                textAlign: 'center',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-muted, #8b949e)',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === viewDate.getMonth();
            const isStart = isSameDay(day, range.start);
            const isEnd = isSameDay(day, range.end);
            const isEdge = isStart || isEnd;
            const within = inRange(day) && !isEdge;
            const isToday = isSameDay(day, today);
            return (
              <button
                key={i}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => range.start && !range.end && setHoverDate(day)}
                style={{
                  height: 32,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: isEdge ? 700 : 500,
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  background: isEdge ? brand : within ? `${brand}22` : 'transparent',
                  color: isEdge
                    ? '#fff'
                    : isCurrentMonth
                      ? 'var(--text-primary, #f0f6fc)'
                      : 'var(--text-ghost, #4b5563)',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  outline: isToday && !isEdge ? `1px solid ${brand}` : 'none',
                  transition: 'background 0.12s',
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        {/* Selected range readout */}
        <div
          style={{
            marginTop: 14,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'var(--bg-tertiary, #161b22)',
            fontSize: '0.72rem',
            color: 'var(--text-secondary, #e2e8f0)',
            textAlign: 'center',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          }}
        >
          {range.start ? fmt(range.start) : 'Start'} → {range.end ? fmt(range.end) : 'End'}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 6,
              border: '1px solid var(--border-primary, rgba(16,185,129,0.1))',
              background: 'transparent',
              color: 'var(--text-primary, #f0f6fc)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!range.start || !range.end}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 6,
              border: 'none',
              background: range.start && range.end ? brand : 'var(--text-ghost, #4b5563)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: range.start && range.end ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

const navBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.1rem',
  color: 'var(--text-primary, #f0f6fc)',
  padding: '2px 8px',
  borderRadius: 4,
  lineHeight: 1,
};

export default CustomDateCalendar;
