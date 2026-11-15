'use client';

import { useMemo, useState } from 'react';
import { stripDemoLabel } from '@/lib/org-display';
import {
  ASSIGNMENT_TYPES,
  byDay,
  dayKey,
  fmtDay,
  fmtDayYear,
  monthCells,
  monthTitle,
  shiftMonth,
  todayOf,
  typeMeta,
  typeOf,
} from '@/lib/org-assignments-model';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dotType = (a) => (a.overdue ? 'overdue' : typeOf(a));
const titleOf = (a) => stripDemoLabel(a.title) || 'Untitled';

function Dot({ a }) {
  return <span className="oas-dot" data-type={dotType(a)} aria-hidden="true" />;
}

function MonthNav({ cursor, onCursor, withToday = false }) {
  const title = monthTitle(cursor);
  return (
    <div className="oas-monthnav">
      <button
        type="button"
        className="tcc-textbtn oas-iconbtn"
        onClick={() => onCursor(shiftMonth(cursor, -1))}
        aria-label="Previous month"
      >
        <i className="bi bi-chevron-left" aria-hidden="true" />
      </button>
      <span className="oas-monthnav__title" aria-live="polite">
        {title}
      </span>
      {withToday && (
        <button
          type="button"
          className="tcc-textbtn oas-action"
          onClick={() => onCursor(todayOf().cursor)}
        >
          Today
        </button>
      )}
      <button
        type="button"
        className="tcc-textbtn oas-iconbtn"
        onClick={() => onCursor(shiftMonth(cursor, 1))}
        aria-label="Next month"
      >
        <i className="bi bi-chevron-right" aria-hidden="true" />
      </button>
    </div>
  );
}

/** All eight entries, so the legend names every colour the calendar uses. */
export function Legend() {
  return (
    <ul className="oas-legend" aria-label="Legend">
      {ASSIGNMENT_TYPES.map((t) => (
        <li key={t}>
          <span className="oas-dot" data-type={t} aria-hidden="true" />
          {typeMeta(t).label}
        </li>
      ))}
      <li>
        <span className="oas-dot" data-type="overdue" aria-hidden="true" />
        Overdue
      </li>
    </ul>
  );
}

/** Dated rows: a type dot, the day and the title. A row opens the assignment. */
export function DatedList({ rows, onOpen, empty }) {
  if (!rows.length) return <p className="oas-foot">{empty}</p>;
  return (
    <ul className="oas-dated">
      {rows.map((a) => (
        <li key={a.id}>
          <Dot a={a} />
          <span className="tcc-mono oas-dated__day">{fmtDay(a.due_date)}</span>
          <button
            type="button"
            className="oas-open oas-clip"
            onClick={() => onOpen(a)}
            title={`${typeMeta(typeOf(a)).label}: ${titleOf(a)}${a.overdue ? ' (overdue)' : ''}`}
          >
            {titleOf(a)}
            {a.overdue && <span className="tcc-sr"> (overdue)</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

const inMonth = (assignments, cursor) =>
  (assignments || [])
    .filter((a) => {
      const k = dayKey(a.due_date);
      return k && k.startsWith(`${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`);
    })
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

/**
 * The compact month beside the list: dots on days with work due, then the
 * month's dated work. Choosing a day narrows the rows under it to that day.
 */
export function MiniCalendar({ assignments, cursor, onCursor, onOpen }) {
  const [picked, setPicked] = useState(null);
  const days = useMemo(() => byDay(assignments), [assignments]);
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const today = todayOf().key;
  const month = inMonth(assignments, cursor);
  const pickedRows = picked ? days.get(picked) || [] : null;
  const rows = pickedRows || month;
  const cap = 6;

  return (
    <div className="oas-mini">
      <MonthNav
        cursor={cursor}
        onCursor={(c) => {
          setPicked(null);
          onCursor(c);
        }}
      />
      <div className="oas-mini__grid" role="grid" aria-label={monthTitle(cursor)}>
        <div role="row" className="oas-mini__week">
          {DOW.map((d) => (
            <span key={d} role="columnheader" className="oas-dow">
              {d}
            </span>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5]
          .filter((w) => cells.slice(w * 7, w * 7 + 7).some((c) => c.inMonth))
          .map((w) => (
            <div key={w} role="row" className="oas-mini__week">
              {cells.slice(w * 7, w * 7 + 7).map((c) => {
                const events = c.inMonth ? days.get(c.key) || [] : [];
                const cls = `oas-mini__day tcc-mono${c.key === today ? ' is-today' : ''}${
                  picked === c.key ? ' is-picked' : ''
                }${c.inMonth ? '' : ' is-outside'}`;
                return (
                  <span key={c.key} role="gridcell" className="oas-mini__cell">
                    {events.length > 0 ? (
                      <button
                        type="button"
                        className={cls}
                        aria-pressed={picked === c.key}
                        aria-label={`${fmtDayYear(c.key)}, ${events.length} due`}
                        onClick={() => setPicked((p) => (p === c.key ? null : c.key))}
                      >
                        {c.day}
                        <span className="oas-mini__dots">
                          {events.slice(0, 2).map((a) => (
                            <Dot key={a.id} a={a} />
                          ))}
                        </span>
                      </button>
                    ) : (
                      <span className={cls} aria-current={c.key === today ? 'date' : undefined}>
                        {c.inMonth ? c.day : ''}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          ))}
      </div>
      {picked && (
        <p className="oas-foot oas-picked">
          <span>
            Due <span className="tcc-mono">{fmtDay(picked)}</span>
          </span>
          <button type="button" className="tcc-textbtn oas-action" onClick={() => setPicked(null)}>
            Show the month
          </button>
        </p>
      )}
      <DatedList
        rows={rows.slice(0, picked ? rows.length : cap)}
        onOpen={onOpen}
        empty="Nothing with a due date in this month."
      />
      {!picked && month.length > cap && (
        <p className="oas-foot">
          <span className="tcc-mono">{month.length - cap}</span> more this month. Choose a day to
          see its work.
        </p>
      )}
      <Legend />
    </div>
  );
}

/**
 * The full month. Each day lists up to three pieces of work due that day;
 * "+N more" and the day number list everything due that day under the grid.
 * It shows the same rows as the open tab and search, so completed work only
 * appears under Archive, and undated work never appears.
 */
export function FullCalendar({ assignments, cursor, onCursor, onOpen }) {
  const [picked, setPicked] = useState(null);
  const days = useMemo(() => byDay(assignments), [assignments]);
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const today = todayOf().key;
  const undated = (assignments || []).filter((a) => !a.due_date).length;
  const pickedRows = picked ? days.get(picked) || [] : [];

  return (
    <div className="oas-cal">
      <MonthNav
        cursor={cursor}
        withToday
        onCursor={(c) => {
          setPicked(null);
          onCursor(c);
        }}
      />
      <div className="oas-cal__grid" role="grid" aria-label={`Work due in ${monthTitle(cursor)}`}>
        <div role="row" className="oas-cal__week oas-cal__week--head">
          {DOW.map((d) => (
            <span key={d} role="columnheader" className="oas-dow">
              {d}
            </span>
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((w) => (
          <div key={w} role="row" className="oas-cal__week">
            {cells.slice(w * 7, w * 7 + 7).map((c) => {
              const events = days.get(c.key) || [];
              const extra = events.length - 3;
              return (
                <div
                  key={c.key}
                  role="gridcell"
                  className={`oas-cal__cell${c.inMonth ? '' : ' is-outside'}`}
                >
                  {events.length > 0 ? (
                    <button
                      type="button"
                      className={`oas-cal__num tcc-mono${c.key === today ? ' is-today' : ''}${
                        picked === c.key ? ' is-picked' : ''
                      }`}
                      aria-pressed={picked === c.key}
                      aria-label={`${fmtDayYear(c.key)}, ${events.length} due. List them.`}
                      onClick={() => setPicked((p) => (p === c.key ? null : c.key))}
                    >
                      {c.day}
                      <span className="oas-cal__dots">
                        {events.slice(0, 3).map((a) => (
                          <Dot key={a.id} a={a} />
                        ))}
                      </span>
                    </button>
                  ) : (
                    <span
                      className={`oas-cal__num tcc-mono${c.key === today ? ' is-today' : ''}`}
                      aria-current={c.key === today ? 'date' : undefined}
                    >
                      {c.day}
                    </span>
                  )}
                  {events.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`oas-event${a.overdue ? ' is-overdue' : ''}`}
                      onClick={() => onOpen(a)}
                      title={`${typeMeta(typeOf(a)).label}: ${titleOf(a)}${a.overdue ? ' (overdue)' : ''}`}
                    >
                      <Dot a={a} />
                      <span className="oas-clip">{titleOf(a)}</span>
                      {a.overdue && <span className="tcc-sr"> (overdue)</span>}
                    </button>
                  ))}
                  {extra > 0 && (
                    <button
                      type="button"
                      className="tcc-textbtn tcc-textbtn--accent oas-more"
                      onClick={() => setPicked(c.key)}
                    >
                      +{extra} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {picked && (
        <div className="oas-cal__picked" aria-live="polite">
          <p className="oas-foot oas-picked">
            <span>
              Due <span className="tcc-mono">{fmtDayYear(picked)}</span> (
              <span className="tcc-mono">{pickedRows.length}</span>)
            </span>
            <button
              type="button"
              className="tcc-textbtn oas-action"
              onClick={() => setPicked(null)}
            >
              Hide
            </button>
          </p>
          <DatedList rows={pickedRows} onOpen={onOpen} empty="Nothing due that day." />
        </div>
      )}
      <Legend />
      {undated > 0 && (
        <p className="oas-foot">
          <span className="tcc-mono">{undated}</span> in this view {undated === 1 ? 'has' : 'have'}{' '}
          no due date and {undated === 1 ? 'is' : 'are'} only in the list.
        </p>
      )}
    </div>
  );
}
