'use client';

import { useState } from 'react';

import './custom-date-calendar.css';

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
function buildDays(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-first offset
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

/**
 * CustomDateCalendar — the unified Ezana calendar behind DateSelector.
 *
 * Props
 * - variant:              'default' | 'partner' | 'org'   — brand color (emerald/gold)
 * - value:                { start, end } | null           — current selection
 * - onChange:             range mode → (range:{start,end}); single mode → (date:Date)
 * - onClose:              () => void
 * - mode:                 'range' (default) | 'single'
 * - numberOfMonths:       1 (default) | 2                 — months shown side by side
 * - showMonthYearDropdowns: boolean                       — month + year quick-nav selects
 */
export function CustomDateCalendar({
  variant = 'default',
  value,
  onChange,
  onClose,
  mode = 'range',
  numberOfMonths = 1,
  showMonthYearDropdowns = false,
}) {
  const brand = BRAND[variant] || BRAND.default;
  const initial = value?.start || new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [range, setRange] = useState({ start: value?.start || null, end: value?.end || null });
  const [hoverDate, setHoverDate] = useState(null);

  const today = new Date();
  const months = Math.max(1, Math.min(2, numberOfMonths));
  const thisYear = today.getFullYear();
  const years = [];
  for (let y = thisYear - 5; y <= thisYear + 5; y++) years.push(y);

  const shiftView = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const handleDayClick = (day) => {
    if (mode === 'single') {
      onChange(startOfDay(day));
      return;
    }
    if (!range.start || (range.start && range.end)) {
      setRange({ start: startOfDay(day), end: null });
    } else if (day >= range.start) {
      setRange({ start: range.start, end: endOfDay(day) });
    } else {
      setRange({ start: startOfDay(day), end: endOfDay(range.start) });
    }
  };

  const inRange = (day) => {
    if (mode === 'single' || !range.start) return false;
    const end = range.end || hoverDate;
    if (!end) return false;
    const lo = range.start < end ? range.start : end;
    const hi = range.start < end ? end : range.start;
    return day >= startOfDay(lo) && day <= endOfDay(hi);
  };

  const apply = () => {
    if (range.start && range.end) onChange(range);
  };

  const selectedSingle = mode === 'single' ? value?.start || null : null;

  const renderMonth = (offset) => {
    const base = new Date(viewYear, viewMonth + offset, 1);
    const y = base.getFullYear();
    const m = base.getMonth();
    const days = buildDays(y, m);
    return (
      <div className="ezdp-month" key={offset}>
        <div className="ezdp-monthnav">
          <button
            type="button"
            className={`ezdp-navbtn${offset === 0 ? '' : ' ezdp-navbtn--ghost'}`}
            onClick={() => shiftView(-1)}
            aria-label="Previous month"
            aria-hidden={offset !== 0}
            tabIndex={offset === 0 ? 0 : -1}
          >
            ‹
          </button>
          <span className="ezdp-monthlabel">
            {MONTHS[m]} {y}
          </span>
          <button
            type="button"
            className={`ezdp-navbtn${offset === months - 1 ? '' : ' ezdp-navbtn--ghost'}`}
            onClick={() => shiftView(1)}
            aria-label="Next month"
            aria-hidden={offset !== months - 1}
            tabIndex={offset === months - 1 ? 0 : -1}
          >
            ›
          </button>
        </div>
        <div className="ezdp-weekdays">
          {DAY_LABELS.map((d, i) => (
            <div className="ezdp-weekday" key={i}>
              {d}
            </div>
          ))}
        </div>
        <div className="ezdp-grid">
          {days.map((day, i) => {
            const isCurrentMonth = day.getMonth() === m;
            const isStart = isSameDay(day, range.start);
            const isEnd = isSameDay(day, range.end);
            const isSingle = isSameDay(day, selectedSingle);
            const isEdge = isStart || isEnd || isSingle;
            const within = inRange(day) && !isEdge;
            const isToday = isSameDay(day, today);
            const cls = ['ezdp-day'];
            if (!isCurrentMonth) cls.push('ezdp-day--outside');
            if (within) cls.push('ezdp-day--in-range');
            if (isEdge) cls.push('ezdp-day--selected');
            if (isStart && range.end) cls.push('ezdp-day--range-start');
            if (isEnd) cls.push('ezdp-day--range-end');
            if (isToday) cls.push('ezdp-day--today');
            return (
              <button
                type="button"
                key={i}
                className={cls.join(' ')}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => mode === 'range' && range.start && !range.end && setHoverDate(day)}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="ezdp-overlay" onClick={onClose}>
      <div className="ezdp-panel" style={{ '--brand': brand }} onClick={(e) => e.stopPropagation()}>
        <div className="ezdp-head">
          <span className="ezdp-title">{mode === 'single' ? 'Select Date' : 'Custom Date Range'}</span>
          <button type="button" className="ezdp-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {showMonthYearDropdowns && (
          <div className="ezdp-nav-selects">
            <select
              className="ezdp-select"
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              aria-label="Month"
            >
              {MONTHS.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="ezdp-select"
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              aria-label="Year"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ezdp-months">
          {Array.from({ length: months }, (_, i) => renderMonth(i))}
        </div>

        {mode === 'range' && (
          <>
            <div className="ezdp-readout">
              {range.start ? fmt(range.start) : 'Start'} → {range.end ? fmt(range.end) : 'End'}
            </div>
            <div className="ezdp-actions">
              <button type="button" className="ezdp-btn ezdp-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="ezdp-btn ezdp-btn--apply"
                onClick={apply}
                disabled={!range.start || !range.end}
              >
                Apply
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CustomDateCalendar;
