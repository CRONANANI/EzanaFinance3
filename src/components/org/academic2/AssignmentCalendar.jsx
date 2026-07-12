'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { typeMeta } from './AssignmentCard';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const LEGEND = [
  { type: 'pitch', label: 'Pitch' },
  { type: 'research', label: 'Research' },
  { type: 'coverage', label: 'Coverage' },
  { type: 'reading', label: 'Reading' },
  { type: 'model', label: 'Model' },
  { type: 'overdue', label: 'Overdue' },
];

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* Month calendar with type-colored event chips, red overdue, "+N" overflow. */
export function AssignmentCalendar({ assignments, onOpen }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const todayKey = ymd(new Date());

  const byDay = useMemo(() => {
    const map = new Map();
    for (const a of assignments || []) {
      if (!a.due_date) continue;
      const key = ymd(new Date(a.due_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return map;
  }, [assignments]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startOffset = first.getDay();
    const start = new Date(year, month, 1 - startOffset);
    const out = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      out.push({ date: d, key: ymd(d), inMonth: d.getMonth() === month });
    }
    return out;
  }, [cursor]);

  const monthTitle = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const go = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const today = () => {
    const n = new Date();
    setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
  };

  return (
    <div className="asg2-panel">
      <div className="asg2-cal-head">
        <h2 className="asg2-cal-month">{monthTitle}</h2>
        <div className="asg2-cal-nav">
          <button
            type="button"
            className="asg2-icon-btn"
            onClick={() => go(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="asg2-btn asg2-btn--sm" onClick={today}>
            Today
          </button>
          <button
            type="button"
            className="asg2-icon-btn"
            onClick={() => go(1)}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="asg2-cal-grid" role="grid" aria-label={`Assignments for ${monthTitle}`}>
        {DOW.map((d) => (
          <div key={d} className="asg2-cal-dow" role="columnheader">
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const events = byDay.get(c.key) || [];
          const shown = events.slice(0, 3);
          const extra = events.length - shown.length;
          const isToday = c.key === todayKey;
          return (
            <div
              key={c.key}
              className={`asg2-cal-cell${c.inMonth ? '' : ' is-outside'}${isToday ? ' is-today' : ''}`}
              role="gridcell"
            >
              <span className="asg2-cal-daynum">{c.date.getDate()}</span>
              {shown.map((a) => {
                const { label } = typeMeta(a.type || a.assignment_type);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`asg2-event${a.overdue ? ' is-overdue' : ''}`}
                    data-type={a.type || a.assignment_type}
                    onClick={() => onOpen?.(a)}
                    title={`${label}: ${a.title}`}
                  >
                    {a.title}
                  </button>
                );
              })}
              {extra > 0 && (
                <button
                  type="button"
                  className="asg2-event-more"
                  onClick={() => onOpen?.(events[0])}
                  title={`${extra} more`}
                >
                  +{extra} more
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="asg2-legend">
        {LEGEND.map((l) => (
          <span key={l.type} data-type={l.type}>
            <i aria-hidden="true" />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
